# Savings badges and checkout offers

## What shoppers see

The main product-family price shows **Save up to XX% off List**, calculated from the highest savings among all assigned items. The lowest-to-highest range is available on hover; no extra line appears below the badge. Each individual item shows its own **Save XX% off List**. Groups without any savings have no calculated savings badge.

List/reference price uses the item's **Compare-at price** when it is higher than Price. Otherwise it uses its regular **Price**. Percentages are rounded to whole numbers. Savings include the additional checkout percentage only for products in the collection selected below. Displayed product prices and selection subtotals stay before checkout discounts; Shopify calculates the actual cart/checkout totals.

For the current OLO setup (256 items):

- 160 items: $4.10 regular price, less 50% at checkout = $2.05, **50% savings**.
- 96 items: $4.50 Compare-at, $3.25 Price, then another 50% at checkout = approximately $1.63, **64% total savings** after rounding.
- Main badge: **Save up to 64% off List**; hover range **50%–64%**. The checkout offer remains included in the calculation without an extra visible note.

Sale savings and checkout percentages are applied sequentially, not added together. Actual checkout rounding can depend on quantities.

## Change product prices

In **Products**, edit each individual item's **Price** and **Compare-at price**, or use Shopify's bulk editor/CSV. Refresh the storefront to see updated savings. The main badge reads the complete assigned group, including items beyond the initially visible rows. Images and purchase details still load near the viewport.

## Manage the checkout offer

1. Manage the real offer under [Discounts](https://admin.shopify.com/store/c5p0rn-q5/discounts/1618906742854). Ensure the actual individual products belong to its eligible collections. Selecting a display-only parent does not make its assigned products eligible.
2. Open **Online Store → Themes → Customize → Theme settings → Checkout savings badge**.
3. Switch **Include checkout offer in savings** on, select **Eligible products collection**, and enter **Checkout discount percentage**. Current setting: **OLO Brush colors**, **50%**.
4. Save. When the real offer changes, update this percentage/collection too. When it ends, turn the display setting off. Product sale savings from Compare-at prices continue to display.

These theme controls are **display only**. They do not create or edit the Shopify discount. Without an app/background sync, the theme cannot read or synchronize native discount settings or their titles. No app, service, or new metafield was added for this feature. Only use an unconditional percentage offer with matching eligibility; customer-specific, minimum-spend, quantity, or scheduled conditions require an appropriate display setup.

The current native 50% automatic offer covers seven collections, including OLO Brush colors. COPIC's display parents are selected in some of those collections, but their individually purchasable children are not thereby eligible. The theme does not apply the OLO checkout percentage to those children.

Existing collection **Promotion badge text** / **Show promotion badge** fields remain a fallback for unrelated individual products without calculated savings. Product families and products with calculated savings use the calculated labels instead of that static message.

## In-cart quantities

Product cards, product pages, and search cards show a check icon and **In cart · quantity** using the current shopper's Shopify cart. The OLO parent totals the quantities of its linked individual products. Each color shows its own quantity, and its check mark stays after the add-selection input resets.

The indicators update after theme cart actions, additions, quantity changes, and removals. They also reconcile on page load, browser history restore, returning to a tab, and changes from another tab on the same storefront origin. Newly loaded collection/search cards use the same current cart snapshot. Nothing is stored as a permanent product metafield because each customer's cart is different.
