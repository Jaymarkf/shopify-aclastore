# Manage OLO Brush products

You manage the products in one normal Shopify collection. No coding, JSON or split product lists are needed.

## Add or remove a color

1. Open [Products > Collections > OLO Brush colors](https://admin.shopify.com/store/c5p0rn-q5/collections/490563403846).
2. In its Products section, use the product search or Browse/Add products to select existing colors. Remove a color from this collection to stop showing it on the group page. Do not delete the product.
3. Save, then refresh the [OLO Brush product page](https://c5p0rn-q5.myshopify.com/products/olo-premium-markers-brush).

The group currently contains **160 real individual products**. To reorder them, choose Manual sorting in the collection and drag products into place.

Each color must be **Active** and available to the **Online Store**. Edit its own product to change the name, SKU, image, price or stock. A new color must be created/imported before you add it to the collection. Keep the main “OLO Premium Markers - Brush” product out of this colors collection.

## What the two OLO collections do

- **OLO Brush colors:** the individual colors inside the product page. This is the collection you edit for assignments.
- **OLO:** the brand listing in the navigation. It contains the main group page, so shoppers see one OLO Brush card.

**OLO Brush promotion** controls the existing discount separately. Adding a color to the colors collection does not automatically give it the promotion.

## Set up another product group

1. Create a collection containing that group's individual products. Use Active products available to Online Store.
2. Create/open its main product and select the **product-family** theme template.
3. On the main product, set **Products collection** to the collection from step 1.
4. On that collection, set **Product group page** to the main product. This connects the group's “In cart” badge.
5. Add only the main product to **Storefront product groups**, then to its brand collection, such as OLO or COPIC.

The main product is a display page, not an extra item to sell. Give it tracked stock of zero with “Continue selling when out of stock” off. Its own title, description and images form the top of the page. Its listing price should match the lowest individual price.

## Large groups and spreadsheet work

The same collection can hold thousands of products. There is no 128/256-product picker limit in this workflow. Shoppers scroll without page buttons; nearby rows and small photos load as needed. Search covers the whole group's names and SKUs after its compact index has loaded. Shopify platform limits still apply.

For large assignments, ask your AI to use this prompt with a spreadsheet of exact SKUs:

> Add the existing products matching these exact SKUs to the Shopify collection “OLO Brush colors” on c5p0rn-q5.myshopify.com. Keep existing collection members and their order, append new matches, and report missing or ambiguous SKUs. Do not create variants, change prices, inventory or discounts, or edit JSON assignment fields. Verify the final collection membership. For removal, remove only the specified collection memberships; never delete the products.

A spreadsheet is optional. Everyday changes can all be made in the collection's normal Shopify screen. Shopify's standard product CSV importer is for product data; this SKU assignment sheet is for the connected AI, not a custom Shopify import format.

Category browsing, featured products and recommendations show only group pages with assigned products. Search shows individual products too. A grouped search result opens its group, scrolls to that item and highlights it; a standalone result opens its own product page. Keep searchable items Active and published to Online Store. A group with no assigned products is hidden from category browsing.
