# Storefront group-only catalog

Catalog, category pages, featured products and recommendations list only main products with assigned individual items. Search is the exception: it shows matching individual products and groups. Colors remain independent purchasable products inside their group pages.

There are currently four configured groups: OLO Brush (160 items), Copic Acrea (24), Acrea Sets (4) and Ciao (180). Other individual products appear in search, but are excluded from category browsing until their group is set up.

## Add a new group to the store

1. Set up its individual-products collection and link it using the main product's **Products collection** field.
2. On that collection, set **Product group page** to the main product. Search shows each item's own title and photo; clicking it opens this main product, scrolls to that exact item and pulses its background using the product section's Accent color. The background keeps pulsing while matched, without an extra border or outline. Reduced-motion customers receive a steady tint.
3. Add the **main product only** to [Storefront product groups](https://admin.shopify.com/store/c5p0rn-q5/collections/490573692998).
4. Add the main product to its brand collection if appropriate.

The main product must be Active and available to Online Store. It appears only while it has assigned products. Add new colors only to the group's individual-products collection; never add those colors to Storefront product groups. Removing the main product from Storefront product groups removes it from catalog browsing without deleting it.

Manage colors as before in OLO Brush colors. The promotion collection and discount eligibility remain separate.

## Why the catalog stays fast

Listings read the small Storefront product groups collection instead of downloading or scanning the store's individual products. Each candidate is checked for assignments before rendering. The current catalog therefore renders four cards directly. Group pages keep their existing lazy loading, full-group search and independent-SKU cart behavior.

Theme settings > Storefront catalog lets you select another main-products collection if needed. Leaving it blank uses Storefront product groups. Templates retain their existing product-card block IDs and styling settings.

Individual product URLs and cart lines remain available for item details and purchasing. The rule controls storefront listings; it is not an access-control or search-engine deindexing feature.

## Search behavior

Keep searchable items **Active** and published to **Online Store**. Shopify excludes Unlisted, Draft and Archived products from native search. The 208 existing COPIC items previously marked Unlisted were changed to Active for this setup.

An item without a group opens its own product page. Grouped results open the group with an `acla_item` product ID in the URL. This works for the collection assignment setup and the existing COPIC product-reference lists. Typing another search clears the old highlight; clicking a new result highlights its own item. The in-group search also highlights its best match and clears the highlight when emptied.
