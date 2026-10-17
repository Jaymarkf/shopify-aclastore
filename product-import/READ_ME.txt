ACLA product CSV review
Prepared: 2026-10-17

Main file: ACLA_Shopify_Standalone_Products_CORRECTED.csv
Source: C:\Users\MY PC\Downloads\ACLA_Shopify_Standalone_Products.csv
Source SHA-256: 72E77714D107F79AB0AB2F11D0E7B084FF204842D051A69B98FD7E3F362CA503

RESULT
2534 separate products, each with one Shopify default variant (Title / Default Title).
13 additional image rows remain attached to their original products.
2103 products are active; 431 are drafts.
No products were uploaded or changed in Shopify.

CORRECTIONS
- Set default option fields on all product rows; left image-only rows free of variant data.
- Standardized the barcode header to Barcodes and the manufacturer-part-number header to Google Shopping / MPN, following the current help article. The downloadable Shopify sample still uses the older header names; they were not treated as evidence of lost barcode data.
- Explicitly set manual fulfillment and deny overselling, Shopify's documented defaults for the previously blank fields.
- Standardized existing boolean flags to lowercase and monetary values to two decimals, preserving their numeric values.
- Shortened 8 overlong SEO titles through spacing/punctuation changes; all original words remain.
- Omitted 31 entirely empty optional columns, including the unused second/third options and linked metafield columns.
- Wrote UTF-8 without BOM, comma delimiters, properly quoted multiline fields and LF-only line endings.
- Kept 33 missing prices blank and moved those products to unpublished drafts, so they cannot accidentally be offered free. Set a real price before activating them.
- Preserved all supplied product handles, titles, SKUs, barcodes (including leading zeros), descriptions, image URLs and stock quantities. Existing compare-at prices were preserved for your review.

REVIEW ITEMS (details in ACLA_Product_Review.csv)
- Barcode shared by multiple products: 151
- Compare-at price does not exceed price: 1106
- Legacy BigCommerce link placeholder: 23
- Missing description: 230
- Missing product image: 149
- Missing selling price: 33
- Missing SKU: 9
- Stock quantity without inventory tracking: 1
- Title shared by distinct products: 5

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
- Vendor
- Product category
- Type
- Option1 Linked To
- Option2 name
- Option2 value
- Option2 Linked To
- Option3 name
- Option3 value
- Option3 Linked To
- Charge tax
- Tax code
- Unit price total measure
- Unit price total measure unit
- Unit price base measure
- Unit price base measure unit
- Weight value (grams)
- Weight unit for display
- Gift card
- Color (product.metafields.shopify.color-pattern)
- Google Shopping / Google product category
- Google Shopping / Gender
- Google Shopping / Age group
- Google Shopping / Ad group name
- Google Shopping / Ads labels
- Google Shopping / Custom product
- Google Shopping / Custom label 0
- Google Shopping / Custom label 1
- Google Shopping / Custom label 2
- Google Shopping / Custom label 3
- Google Shopping / Custom label 4

REFERENCES
https://help.shopify.com/en/manual/products/import-export/using-csv
https://help.shopify.com/en/manual/products/details/product-pricing/sale-pricing
https://shopify.dev/docs/api/admin-rest/2026-07/resources/product
