# Item pricing: Admin and storefront

Use the existing Shopify fields on each individual product:

| Business value | Shopify Admin / CSV field | Storefront |
| --- | --- | --- |
| MSRP / List price | Compare-at price | Shown as MSRP, even when equal to Price. Crossed out only when higher than Price. |
| Selling price | Price | Shown as Selling price, before checkout discounts. |
| Your purchase cost | Cost per item | Internal only; never sent to storefront HTML, JSON or scripts. |

Edit these in Products ? open an individual product ? Pricing, or use the Products bulk editor and add Price, Compare-at price and Cost per item columns. The display-only family parent is separate from the individual SKUs that customers buy. Family headers show the range of recorded MSRP values and the lowest selling price; each item shows its own values.

The storefront reads these native fields directly. A missing or zero Compare-at price shows **Not listed** rather than inventing an MSRP. Existing prices, checkout offers and product assignments are preserved.

## Complete missing Admin data

Open **product-import/Pricing_review_REQUIRED_VALUES.csv** in Excel. This is a review sheet, not a file to import directly into Shopify.

1. Match each row using SKU and Handle. RecordType distinguishes an actual Item from a Display parent.
2. Fill only the ConfirmedMSRP, ConfirmedSellingPrice and ConfirmedCost cells that you want updated, using your supplier price list or approved amounts. Blank confirmed cells mean leave the current field unchanged.
3. Check zero values. Zero can be intentional; it must not be replaced with a guessed amount.
4. Return the sheet for applying and verifying the approved updates. Do not change SKU or Handle.

The sheet includes private costs. Keep it for staff; do not upload it as a public theme asset.

Live audit on October 21, 2026: 2,534 actual items plus 4 display parents. Actual items have 15 missing MSRP values, 9 zero MSRP values, 34 zero selling prices, 3 missing costs, and 2,005 zero costs. Your original CSV has no positive source amounts that can safely fill the currently missing fields. No Admin amounts were changed during this audit.
