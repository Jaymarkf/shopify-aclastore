param(
  [string]$SourcePath = 'C:\Users\MY PC\Downloads\ACLA_Shopify_Standalone_Products.csv',
  [string]$OutputDirectory = $PSScriptRoot
)

$ErrorActionPreference = 'Stop'
Add-Type -AssemblyName Microsoft.VisualBasic
$utf8 = New-Object Text.UTF8Encoding($false, $true)
$culture = [Globalization.CultureInfo]::InvariantCulture

function Read-StrictCsv([string]$Path) {
  $parser = New-Object Microsoft.VisualBasic.FileIO.TextFieldParser($Path, $utf8, $true)
  $parser.TextFieldType = [Microsoft.VisualBasic.FileIO.FieldType]::Delimited
  $parser.SetDelimiters(',')
  $parser.HasFieldsEnclosedInQuotes = $true
  $parser.TrimWhiteSpace = $false
  try {
    $headers = $parser.ReadFields()
    if (@($headers | Select-Object -Unique).Count -ne $headers.Count) { throw 'Duplicate headers.' }
    $records = New-Object 'Collections.Generic.List[object]'
    while (-not $parser.EndOfData) {
      $fields = $parser.ReadFields()
      if ($fields.Count -ne $headers.Count) { throw "Incorrect field count at CSV record $($records.Count + 2)." }
      $record = [ordered]@{}
      for ($i = 0; $i -lt $headers.Count; $i++) { $record[$headers[$i]] = $fields[$i] }
      $records.Add([pscustomobject]$record)
    }
    return [pscustomobject]@{ Headers = $headers; Rows = $records.ToArray() }
  } finally { $parser.Close() }
}

function Write-CsvLf([string]$Path, [object[]]$Records) {
  $lines = @($Records | ConvertTo-Csv -NoTypeInformation)
  $text = ($lines -join "`n").Replace("`r`n", "`n").Replace("`r", "`n") + "`n"
  [IO.File]::WriteAllText($Path, $text, $utf8)
}

$sourceHash = (Get-FileHash -LiteralPath $SourcePath -Algorithm SHA256).Hash
$source = Read-StrictCsv $SourcePath
$products = @($source.Rows | Where-Object { $_.Title -ne '' })
$groups = @($source.Rows | Group-Object 'URL handle')
foreach ($group in $groups) {
  if ($group.Name -notmatch '^[a-z0-9]+(?:-[a-z0-9]+)*$') { throw "Invalid handle: $($group.Name)" }
  if (@($group.Group | Where-Object { $_.Title -ne '' }).Count -ne 1) { throw "Handle must have exactly one product: $($group.Name)" }
  if ($group.Group[0].Title -eq '') { throw "Image row precedes product: $($group.Name)" }
}

$renames = @{
  'Variant Barcodes' = 'Barcodes'
  'Google Shopping / Manufacturer part number (MPN)' = 'Google Shopping / MPN'
}
$forced = @('Option1 name', 'Option1 value', 'Continue selling when out of stock', 'Fulfillment service')
$kept = @($source.Headers | Where-Object {
  $column = $_
  $forced -contains $column -or @($source.Rows | Where-Object { $_.$column -ne '' }).Count -gt 0
})
$removed = @($source.Headers | Where-Object { $kept -notcontains $_ })
$outputHeaders = @($kept | ForEach-Object { if ($renames.ContainsKey($_)) { $renames[$_] } else { $_ } })
$changes = New-Object 'Collections.Generic.List[object]'
$review = New-Object 'Collections.Generic.List[object]'
$output = New-Object 'Collections.Generic.List[object]'

function Add-Review($Row, [string]$Issue, [string]$Field, [string]$Value, [string]$Action) {
  $review.Add([pscustomobject][ordered]@{
    Issue = $Issue; 'URL handle' = $Row.'URL handle'; Title = $Row.Title; SKU = $Row.SKU
    Field = $Field; Value = $Value; 'Action or explanation' = $Action
  })
}

for ($index = 0; $index -lt $source.Rows.Count; $index++) {
  $row = $source.Rows[$index]
  $record = [ordered]@{}
  foreach ($column in $kept) {
    $target = if ($renames.ContainsKey($column)) { $renames[$column] } else { $column }
    $record[$target] = $row.$column
  }
  if ($row.Title -ne '') {
    $record['Option1 name'] = 'Title'
    $record['Option1 value'] = 'Default Title'
    $record['Continue selling when out of stock'] = 'deny'
    $record['Fulfillment service'] = 'manual'
    foreach ($column in @('Published on online store', 'Requires shipping')) {
      if ($record[$column] -ne '') { $record[$column] = $record[$column].ToLowerInvariant() }
    }
    foreach ($column in @('Price', 'Compare-at price', 'Cost per item')) {
      if ($record[$column] -ne '') {
        $amount = [decimal]::Parse($record[$column], $culture)
        if ($amount -lt 0) { throw "Negative $column on $($row.'URL handle')." }
        if ([decimal]::Round($amount, 2) -ne $amount) { throw "Price precision requires review: $($row.'URL handle')." }
        $record[$column] = $amount.ToString('0.00', $culture)
      }
    }
    if ($row.Price -eq '') {
      $record['Status'] = 'draft'
      $record['Published on online store'] = 'false'
      Add-Review $row 'Missing selling price' 'Price' '' 'Included as an unpublished draft. Enter the real selling price before activating; Shopify imports an empty price as zero.'
    }
    if ($row.'SEO title'.Length -gt 70) {
      # Retain the existing words and meaning while removing redundant spacing/punctuation.
      $shortTitle = [regex]::Replace($row.'SEO title', '\s+', ' ')
      $shortTitle = $shortTitle.Replace(' - Store pickup only', ': Store pickup only').Replace(' / Local school Delivery', '/Local school Delivery')
      if ($shortTitle.Length -gt 70) { throw "SEO title needs editorial review: $($row.'URL handle')." }
      $record['SEO title'] = $shortTitle
    }
    if ($row.SKU -eq '') { Add-Review $row 'Missing SKU' 'SKU' '' 'Optional for manual fulfillment; retained blank. Add your real SKU if needed.' }
    if ($row.'Product image URL' -eq '') { Add-Review $row 'Missing product image' 'Product image URL' '' 'No image was supplied; upload the correct image later.' }
    if ($row.Description -eq '') { Add-Review $row 'Missing description' 'Description' '' 'No description was supplied; retained blank.' }
    if ($row.Price -ne '' -and $row.'Compare-at price' -ne '') {
      if ([decimal]::Parse($row.'Compare-at price', $culture) -le [decimal]::Parse($row.Price, $culture)) {
        Add-Review $row 'Compare-at price does not exceed price' 'Compare-at price' $row.'Compare-at price' 'Original amount preserved. A sale display requires a compare-at price higher than the selling price; review or clear it if appropriate.'
      }
    }
    if ($row.Description -like '*%%GLOBAL_*') {
      Add-Review $row 'Legacy BigCommerce link placeholder' 'Description' '' 'Original HTML preserved. Replace %%GLOBAL_ShopPathSSL%% links with the correct Shopify product or collection URLs.'
    }
    if ($row.'Inventory tracker' -eq '' -and [int]$row.'Inventory quantity' -gt 0) {
      Add-Review $row 'Stock quantity without inventory tracking' 'Inventory tracker' '' 'Source setting preserved. Enable Shopify inventory tracking if this item should have stock limits.'
    }
  } else {
    # Extra image rows must never receive default options or other variant data.
    foreach ($column in $kept) {
      if ($column -notin @('URL handle', 'Product image URL', 'Image position', 'Image alt text')) {
        if ($row.$column -ne '') { throw "Unexpected product data on an image-only row: $($row.'URL handle')." }
      }
    }
  }
  foreach ($column in $kept) {
    $target = if ($renames.ContainsKey($column)) { $renames[$column] } else { $column }
    if ($row.$column -cne $record[$target]) {
      $changes.Add([pscustomobject][ordered]@{
        'CSV record' = $index + 2; 'URL handle' = $row.'URL handle'; Field = $target
        Before = $row.$column; After = $record[$target]
      })
    }
  }
  $output.Add([pscustomobject]$record)
}

$duplicateBarcodes = @($products | Where-Object { $_.'Variant Barcodes' -ne '' } | Group-Object 'Variant Barcodes' | Where-Object Count -gt 1)
foreach ($group in $duplicateBarcodes) {
  foreach ($row in $group.Group) { Add-Review $row 'Barcode shared by multiple products' 'Barcodes' $group.Name "Barcode preserved; shared by $($group.Count) products. Confirm against your product labels." }
}
$duplicateTitles = @($products | Group-Object Title | Where-Object Count -gt 1)
foreach ($group in $duplicateTitles) {
  foreach ($row in $group.Group) { Add-Review $row 'Title shared by distinct products' 'Title' $row.Title 'Distinct handles and SKUs preserved. Add a distinguishing label if these products should look different in your catalog.' }
}

[IO.Directory]::CreateDirectory($OutputDirectory) | Out-Null
$csvPath = Join-Path $OutputDirectory 'ACLA_Shopify_Standalone_Products_CORRECTED.csv'
Write-CsvLf $csvPath $output.ToArray()
Write-CsvLf (Join-Path $OutputDirectory 'ACLA_Product_Review.csv') $review.ToArray()
Write-CsvLf (Join-Path $OutputDirectory 'ACLA_Format_Changes.csv') $changes.ToArray()

# Reparse the artifact and verify identities, relationships and numeric values independently.
$parsed = Read-StrictCsv $csvPath
if ($parsed.Rows.Count -ne $source.Rows.Count) { throw 'Record count changed.' }
if (($parsed.Headers -join '|') -cne ($outputHeaders -join '|')) { throw 'Header mismatch.' }
$resultProducts = @($parsed.Rows | Where-Object { $_.Title -ne '' })
if ($resultProducts.Count -ne $products.Count) { throw 'Product count changed.' }
foreach ($group in @($parsed.Rows | Group-Object 'URL handle')) {
  if (@($group.Group | Where-Object { $_.'Option1 value' -ne '' }).Count -ne 1) { throw "Extra variant found for $($group.Name)." }
}
$activeHandle = ''
$seenHandles = New-Object 'Collections.Generic.HashSet[string]'
for ($i = 0; $i -lt $source.Rows.Count; $i++) {
  $before = $source.Rows[$i]
  $after = $parsed.Rows[$i]
  foreach ($column in @('Title', 'URL handle', 'Description', 'Tags', 'SKU', 'Inventory tracker', 'Inventory quantity', 'Product image URL', 'Image position', 'Image alt text', 'Variant image URL', 'SEO description', 'Google Shopping / Condition')) {
    if ($before.$column -cne $after.$column) { throw "Preserved data changed: record $($i + 2), $column." }
  }
  if ($before.'Variant Barcodes' -cne $after.Barcodes) { throw 'Barcode changed.' }
  if ($before.'Google Shopping / Manufacturer part number (MPN)' -cne $after.'Google Shopping / MPN') { throw 'MPN changed.' }
  foreach ($column in @('Price', 'Compare-at price', 'Cost per item')) {
    if ($before.$column -eq '') {
      if ($after.$column -ne '') { throw "Invented $column." }
    } elseif ([decimal]::Parse($before.$column, $culture) -ne [decimal]::Parse($after.$column, $culture)) { throw "Amount changed: $column." }
  }
  if ($after.Title -ne '') {
    if (-not $seenHandles.Add($after.'URL handle')) { throw 'Non-contiguous product group.' }
    $activeHandle = $after.'URL handle'
    if ($after.'Option1 name' -cne 'Title' -or $after.'Option1 value' -cne 'Default Title') { throw 'Incorrect default option.' }
    if ($after.Status -cnotmatch '^(active|draft|archived)$') { throw 'Invalid status.' }
    if ($after.'Published on online store' -cnotmatch '^(true|false)$') { throw 'Invalid publication flag.' }
    if ($after.'Inventory quantity' -notmatch '^-?\d+$') { throw 'Noninteger stock quantity.' }
    if ($after.'SEO title'.Length -gt 70 -or $after.'SEO description'.Length -gt 320) { throw 'SEO limit exceeded.' }
    if ($after.Price -eq '' -and ($after.Status -ne 'draft' -or $after.'Published on online store' -ne 'false')) { throw 'Missing-price product is published.' }
    if ($before.Price -ne '' -and $before.Status -cne $after.Status) { throw 'Priced product status changed.' }
  } elseif ($after.'URL handle' -cne $activeHandle) { throw 'Orphaned image row.' }
  foreach ($column in @('Product image URL', 'Variant image URL')) {
    if ($after.$column -ne '' -and $after.$column -notmatch '^https?://[^\s]+$') { throw "Invalid image URL in $column." }
  }
  if ($after.'Product image URL' -ne '' -and $after.'Image position' -notmatch '^[1-9]\d*$') { throw 'Invalid image position.' }
  if ($after.'Image alt text'.Length -gt 512) { throw 'Image alt text too long.' }
}
$bytes = [IO.File]::ReadAllBytes($csvPath)
$text = $utf8.GetString($bytes)
if ($text.Contains("`r")) { throw 'Non-LF line ending found.' }
if ($bytes[0] -eq 239 -and $bytes[1] -eq 187 -and $bytes[2] -eq 191) { throw 'Unexpected UTF-8 BOM.' }
if ((Get-FileHash -LiteralPath $SourcePath -Algorithm SHA256).Hash -cne $sourceHash) { throw 'Source file changed.' }

$counts = [ordered]@{
  sourceRecords = $source.Rows.Count; standaloneProducts = $products.Count
  additionalImageRows = $source.Rows.Count - $products.Count
  outputColumns = $parsed.Headers.Count; omittedEmptyColumns = $removed.Count
  activeProducts = @($resultProducts | Where-Object Status -eq 'active').Count
  draftProducts = @($resultProducts | Where-Object Status -eq 'draft').Count
  missingPriceProducts = @($products | Where-Object Price -eq '').Count
  correctedSeoTitles = @($changes | Where-Object Field -eq 'SEO title').Count
  reviewIssues = $review.Count; changedCells = $changes.Count
  sourceSha256 = $sourceHash; correctedSha256 = (Get-FileHash -LiteralPath $csvPath -Algorithm SHA256).Hash
  validation = 'PASS: strict CSV parsing, single default variant per handle, image grouping, preserved data, prices, UTF-8/LF, original file unchanged'
}
[IO.File]::WriteAllText((Join-Path $OutputDirectory 'validation.json'), ($counts | ConvertTo-Json) + "`n", $utf8)
$issueCounts = @($review | Group-Object Issue | Sort-Object Name | ForEach-Object { '- ' + $_.Name + ': ' + $_.Count }) -join "`n"
$removedColumns = @($removed | ForEach-Object { '- ' + $_ }) -join "`n"
$report = @"
ACLA product CSV review
Prepared: 2026-10-17

Main file: ACLA_Shopify_Standalone_Products_CORRECTED.csv
Source: $SourcePath
Source SHA-256: $sourceHash

RESULT
$($products.Count) separate products, each with one Shopify default variant (Title / Default Title).
$($counts.additionalImageRows) additional image rows remain attached to their original products.
$($counts.activeProducts) products are active; $($counts.draftProducts) are drafts.
No products were uploaded or changed in Shopify.

CORRECTIONS
- Set default option fields on all product rows; left image-only rows free of variant data.
- Standardized the barcode header to Barcodes and the manufacturer-part-number header to Google Shopping / MPN, following the current help article. The downloadable Shopify sample still uses the older header names; they were not treated as evidence of lost barcode data.
- Explicitly set manual fulfillment and deny overselling, Shopify's documented defaults for the previously blank fields.
- Standardized existing boolean flags to lowercase and monetary values to two decimals, preserving their numeric values.
- Shortened 8 overlong SEO titles through spacing/punctuation changes; all original words remain.
- Omitted $($removed.Count) entirely empty optional columns, including the unused second/third options and linked metafield columns.
- Wrote UTF-8 without BOM, comma delimiters, properly quoted multiline fields and LF-only line endings.
- Kept 33 missing prices blank and moved those products to unpublished drafts, so they cannot accidentally be offered free. Set a real price before activating them.
- Preserved all supplied product handles, titles, SKUs, barcodes (including leading zeros), descriptions, image URLs and stock quantities. Existing compare-at prices were preserved for your review.

REVIEW ITEMS (details in ACLA_Product_Review.csv)
$issueCounts

ADDITIONAL LIMITATIONS
- No shipping weights were supplied for any of the 2534 products. Set accurate weights where needed before using weight-based carrier rates.
- No vendor, standard category or product type was supplied. These optional details were not invented.
- Image URLs were checked for HTTP/HTTPS format, not downloaded individually or confirmed reachable. The BigCommerce CDN must remain public during the Shopify import.
- Inventory quantity in a product CSV applies to a single-location store. If you have multiple locations, use Shopify's separate inventory CSV for location-level quantities.
- The 23 legacy BigCommerce description placeholders need their real Shopify destinations; they were preserved rather than replaced with guessed URLs.
- The 1106 compare-at prices that are not higher than the selling price do not create a sale display; confirm or clear them as appropriate. They are review items, not claimed import-format errors.

IMPORT
1. In Shopify admin, go to Products > Import and select ONLY the CORRECTED product CSV.
2. Review the preview: expect 2534 separate products, not 2547 products. The extra 13 records are images.
3. Leave Overwrite products with matching handles unchecked when adding new products. If these handles already exist, export a backup first and deliberately choose whether to overwrite; changing existing options can replace variant IDs.
4. Confirm the import result. Local validation does not replace Shopify's importer validation.
5. Set prices for the 33 drafts listed under Missing selling price before publishing them. The source already contained 398 other draft products, which remain drafts.

FILES
- ACLA_Shopify_Standalone_Products_CORRECTED.csv: product import file.
- ACLA_Product_Review.csv: review checklist; do not import as products.
- ACLA_Format_Changes.csv: cell-by-cell before/after audit; do not import as products.
- validation.json: validation counts and source/output hashes.
- prepare-products.ps1: reproducible local preparation and validation script.

OMITTED EMPTY OPTIONAL COLUMNS
$removedColumns

REFERENCES
https://help.shopify.com/en/manual/products/import-export/using-csv
https://help.shopify.com/en/manual/products/details/product-pricing/sale-pricing
https://shopify.dev/docs/api/admin-rest/2026-07/resources/product
"@
[IO.File]::WriteAllText((Join-Path $OutputDirectory 'READ_ME.txt'), $report.Replace("`r`n", "`n") + "`n", $utf8)
$counts | ConvertTo-Json
