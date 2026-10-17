# Promotion badges and cart status

The OLO Brush offer uses Shopify's native automatic discount, with a standard Shopify collection for eligible products and a shared storefront badge. No app or color variants are needed.

## Manage the real discount

Open [Discounts → OLO Brush Save 50%](https://admin.shopify.com/store/c5p0rn-q5/discounts/1618906742854). It is a real **50% amount off products** automatic discount, active now for all customers, with no minimum purchase, no end date, and no combinations with other discounts. It applies to the **OLO Brush promotion** collection, containing the 40 individually purchasable colors linked to the parent page and the display-only parent.

Edit the percentage, schedule, or eligibility here, or deactivate the discount. The original $4.10 product price remains unchanged; Shopify applies the 50% reduction automatically in the cart and checkout, making a qualifying marker $2.05. No discount code is needed.

## Edit the OLO promotion

1. Open [Products → Collections → OLO Brush promotion](https://admin.shopify.com/store/c5p0rn-q5/collections/490398875718).
2. At the bottom, under **Metafields**, change **Promotion badge text**. It currently says **OLO Brush Save 50%**.
3. Turn **Show promotion badge** on or off, then save. It is currently on, as requested.
4. Under **Products**, browse and add products to assign this message. Remove products to stop showing it for them.

The collection contains **OLO Premium Markers - Brush** plus its 40 linked individual colors. The message appears beside their prices and on catalog/search cards where a price is displayed. Adding/removing products in this collection changes both native discount eligibility and badge assignment.

The badge is display text. Shopify does not expose the automatic-discount configuration to product-page Liquid, so editing or deactivating the discount does not automatically change this badge. When changing the offer, update **Promotion badge text** to match; when stopping the offer, switch **Show promotion badge** off. Native discount calculations come from the Discounts configuration above.

## Create another promotion

Create a manual collection under **Products → Collections**, add the products, and make the collection available on **Online Store**. Under **Discounts**, create an automatic **Amount off products** discount and choose that collection under **Applies to → Specific collections**. Fill in the collection's two badge metafields, then save. You can also use an existing collection. Keep each product in only one enabled promotion collection when you want a single predictable message; the theme displays the first enabled message it finds.

The definitions are under **Settings → Custom data → Collections**: **Promotion badge text** and **Show promotion badge**. Badge text supports up to 255 characters and wraps on small screens.

No additional app installation is required. The hosted title-sync service was disabled and its Shopify credentials removed; no background sync schedule was created. The native discount title is shown automatically on discounted cart lines and at checkout. The product-price badge is edited separately using the fields above.

## In-cart quantities

Product cards, product pages, and search cards show a check icon and **In cart · quantity** using the current shopper's Shopify cart. The OLO parent totals the quantities of its linked individual products. Each color shows its own quantity, and its check mark stays after the add-selection input resets.

The indicators update after theme cart actions, additions, quantity changes, and removals. They also reconcile on page load, browser history restore, returning to a tab, and changes from another tab on the same storefront origin. Newly loaded collection/search cards use the same current cart snapshot. Nothing is stored as a permanent product metafield because each customer's cart is different.
