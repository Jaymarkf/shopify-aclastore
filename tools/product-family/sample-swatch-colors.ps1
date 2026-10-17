$ErrorActionPreference = 'Stop'
Add-Type -AssemblyName System.Drawing
$manifestPath = Join-Path $PSScriptRoot '..\..\product-import\product-family\sample-products.json'
$rows = Get-Content -LiteralPath $manifestPath -Raw -Encoding UTF8 | ConvertFrom-Json
foreach ($row in $rows) {
  $bitmap = New-Object Drawing.Bitmap -ArgumentList ([string]$row.swatchFile)
  try {
    $red = 0; $green = 0; $blue = 0; $count = 0
    for ($x = 10; $x -le 30; $x += 2) {
      for ($y = 10; $y -le 30; $y += 2) {
        $pixel = $bitmap.GetPixel([int]($bitmap.Width * $x / 100), [int]($bitmap.Height * $y / 100))
        $red += $pixel.R; $green += $pixel.G; $blue += $pixel.B; $count++
      }
    }
    $hex = '#{0:x2}{1:x2}{2:x2}' -f [int]($red / $count),[int]($green / $count),[int]($blue / $count)
    $row | Add-Member -NotePropertyName swatchColor -NotePropertyValue $hex -Force
  } finally { $bitmap.Dispose() }
}
$utf8 = New-Object Text.UTF8Encoding($false)
[IO.File]::WriteAllText([IO.Path]::GetFullPath($manifestPath), ($rows | ConvertTo-Json -Depth 5), $utf8)
$rows | Select-Object -First 8 code,label,swatchColor | ConvertTo-Json
