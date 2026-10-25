# Product family setup

The current OLO Brush setup uses the normal **OLO Brush colors** collection with 160 independent products. Follow [the product manager guide](product-manager-product-groups.md) to add, remove or reorder products in Shopify Admin.

The display parent uses `product-family`; its **Products collection** picker references the source collection. The source collection's **Product group page** picker references the parent for cart grouping. There is no custom catalog JSON to edit or regenerate.

Individual source products are Active and published to Online Store. Brand collections contain display parents. Discounts use their own configured collection and are independent of assignment changes.

COPIC Acrea (24), Acrea Sets (4) and Ciao (180) retain their existing legacy product-reference assignments. Their data has been preserved, and the legacy fields remain available under View all. New groups should use the collection workflow above; they do not inherit the legacy reference-list cap.

## Theme loading

The parent renders 24 products initially. A compact current collection index is fetched in pages of 250 for full-group names/SKU search and sorting. Purchase details and responsive lazy thumbnails are fetched in pages of 20 only around visible rows. At most three detail requests run concurrently; scrolling cancels superseded work. Selected quantities and keyboard focus survive row recycling.

Alternate collection views: `family-index` and `family-records`. The `family-options` product view supplies ordinary paginated links when JavaScript is unavailable. Cart group quantities use memberships of products already in the cart, rather than shipping every assigned ID with every group card.

No app, external service, assignment snapshots or background sync are required. Changes take effect on a fresh storefront load, subject to Shopify publication and caching. An already-open page is not a live Admin subscription.

Storefront listings are now group-only. Register each new main product in **Storefront product groups** as well as its brand collection. Only entries with assigned products are rendered. See [the storefront catalog guide](storefront-group-catalog.md).
