# Product family pages

The OLO sample is already configured with 40 independently stocked products, including Zero.

- [View the parent in admin](https://admin.shopify.com/store/c5p0rn-q5/products/10258252136518)
- [Preview the page in the theme editor](https://admin.shopify.com/store/c5p0rn-q5/themes/167142293574/editor?previewPath=%2Fproducts%2Folo-premium-markers-brush)
- [Storefront page](https://c5p0rn-q5.myshopify.com/products/olo-premium-markers-brush)

## Change the products in a group

1. Open the parent product in Shopify admin.
2. Scroll to **Metafields → Products in this group**.
3. Select, remove, or reorder the individual products, then save. A group supports up to 50 products.
4. Make sure the selected products are active and available on the **Online Store** sales channel.

Each item keeps its existing SKU, price, inventory, and normal product page. Products are added to the cart individually. The grouping field does not merge products or create color variants.

## Create another parent page

1. Create a product with the group name, description, and main product images.
2. Select **product-family** under **Theme template**.
3. Set the parent's price to the lowest item price so collection cards display a useful starting price.
4. Enable inventory tracking for the parent, leave its available inventory at zero, and leave **Continue selling when out of stock** off. This prevents shoppers from buying the display-only parent itself.
5. Select the individual items in **Products in this group**.
6. Make the parent active and publish it to **Online Store**. The template displays the selected items' live prices and stock status, with a color-count badge on the parent's catalog card.

## Show only groups in a brand collection

This is already enabled on [OLO Brush promotion](https://c5p0rn-q5.myshopify.com/collections/olo-brush-promotion). It displays the OLO Brush parent while keeping all 41 collection members eligible for the existing discount.

1. Open a collection under **Products → Collections**.
2. Select **product-groups** under **Theme template**, then save.
3. Add the parent products you want to display, such as **OLO Premium Markers - Brush**, to the collection.
4. On each parent, assign its individual products under **Products in this group** and use the **product-family** product template.

The collection now shows only products with assigned group items. Individual colors can remain members for automatic-discount eligibility without becoming separate cards on this collection page. Other collections using the default template keep their normal listings.

When creating another group, add the parent to the collection and assign its items. The collection reads those assignments automatically; there is no list of product names in the theme code and no app to install. Clear all assignments to stop showing that parent. Sorting works on the collection's configured order; **Show more product groups** checks subsequent product pages when needed. The count describes the groups currently shown.

For a future **OLO** navigation item, link it to a collection using **product-groups**. Navigation is managed separately under **Content → Menus**.

## Optional color previews

On an individual product, use **Color swatch** for its grid color and **Color preview image** for a public image URL used in its expanded preview. Leave the image URL blank to use the normal product image. The sample uses colors sampled from OLO's official swatch artwork and OLO's corresponding marker images; screen colors are approximate.

## Page design

In the theme editor, open **Products → product-family → Product family**. You can change the accent color, initial grid/list view, spacing, and question blocks. Review app blocks can be added here; reviews and ratings are only shown when actual data or an app is present.

Edit the parent product's **Description** in Shopify admin to update the formatted text below its price. Long descriptions have a **Read more / Show less** control; short descriptions display in full. There is no separate Product details tab. Successful cart additions animate the selected products toward the cart, with reduced-motion preferences respected.

The normal product template continues to serve individual product pages. No theme setting automatically groups products by title.

See [Promotion badges and cart status](promotions-and-cart-status.md) for the OLO automatic 50% discount, editable price badge, and persistent in-cart indicators across the theme.

## Verification

The theme changes were validated using Shopify's theme validator. Browser checks covered searching, sorting, quantities, multi-item cart requests, stock limits, error handling, image previews, and mobile overflow. Temporary test scripts, reports, and screenshots were removed during cleanup. The Admin product mapping remains in `product-import/product-family/admin-setup-result.json`.

The storefront password remains enabled. The theme-editor preview is available to the store owner without changing that setting.
