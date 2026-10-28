# CarpeDiem logo and header

## Replace or resize the logo

1. Open **Online Store → Themes → Customize (Edit theme)**.
2. Expand **Header**, then select **Logo**.
3. Use **Header logo image** to select or upload an image. A transparent PNG works well.
4. Set **Logo width on desktop** and **Logo width on mobile**, then **Save**.

With no uploaded image selected, **Use included CarpeDiem logo when no image is
selected** shows the generated artwork. Turn this off to use the global logo from
Theme settings. **Logo accessible name** describes the logo for screen readers.

The original transparent PNG is `assets/carpediemmarkers-logo.png`: 2172 × 724 pixels,
599,532 bytes. It retains the original generated pixels. The header frames the
included file's transparent margins for display; uploaded logos use their own
proportions. Responsive WebP copies (900 and 1800 pixels wide) reduce downloads.
The original PNG remains the fallback and the file to download or reuse.

## Header layout

In **Header**, leave **Branded store header** on. Navigation runs from left to
right beneath the address, branding and store hours. The native Search, Account
and Cart controls stay at the upper right on desktop.

- **Center promotional image**: upload/select an image to move the logo to the
  upper left and put the promotion in the center. Set its optional link and
  description. The complete image is shown without cropping.
- Remove that image to center the main logo again automatically.
- **Show transparent Copic promotion** displays the included PNG when the image
  picker is empty. Turn it off to return to a centered logo with no promotion.
  Selecting your own image takes priority over the included PNG.
- **Upper-left logo width** controls the smaller logo while a promotion is present.
- **Promotional image maximum width** and **Branding row minimum height on desktop**
  adjust the promotion's size and the space around it.
- **Left text** edits the address and phone. **Right text** edits store hours.
- **Cart and Home button background/text** control their accent colors.

On mobile the logo stays centered, the optional promotion appears underneath,
and the menu/search/account/cart controls stay easy to tap. The address and store
hours are also available inside the mobile menu. Image changes preview before
saving; **Save** publishes them.

## Navigation

Open **Content → Menus → CarpeDiem header navigation** in Shopify Admin.
Change labels, drag items into order, add links and nest items there. In the theme
editor, **Header → Menu** selects which native menu the header uses.

The installed menu follows the draft: Home, See all manufacturers, Cutting Tools,
Color Markers, Color Pencils, Paints, Brushes. Manufacturer and marker submenus
link to the existing COPIC, OLO and POSCA collections and product groups. Cutting
Tools, Color Pencils, Paints and Brushes currently use Shopify search links because
those category collections do not exist. Replace each search link with its
collection when ready. The original Main menu remains available.

The red announcement strip uses the existing editable marquee. Select
**Announcement bar → Announcement** to change its message. The email, address
and hours were copied from the supplied draft; contact details were checked
against [CarpeDiem's existing site](https://carpediemstore.com/).

The existing announcement marquee, shared background image, expanded navigation,
and full-height mobile drawer retain their own controls. No app is needed.

## Click navigation

Click a category label (for example **Color Markers**) to open its horizontal
subcategory row. Click **COPIC**, **OLO** or **POSCA** to show its product-group
links in a wrapping grid underneath. Clicking the same label again closes it.
Hover changes styling only; it does not open or close a menu.

**View all …** links open the category or brand collection. Product-group links
open their product pages. The menu labels and hierarchy still come from the
native Admin menu; adding or rearranging menu entries needs no code changes.

Click outside to close the navigation. Keyboard users can open with Enter/Space,
move through links with Tab, open the next row with Arrow Down and close one level
at a time with Escape. On phones, the existing tap-operated drawer remains in use.

## Readability over the header artwork

Navigation text sits on a light reading surface instead of directly on the image.
Dropdowns and mobile menu lists use a 97% opaque surface; the navigation strip,
contact details and utility controls use a 90% surface. Colors follow the active
theme background/foreground pair, so the same treatment supports dark palettes.
The artwork remains visible around the panels. No extra image requests or blur
effects are used. Selected categories have a shaded background and underline;
keyboard focus keeps its visible outline.

## Artwork generation

The center promotion's transparent PNG is
`assets/copic-octoberfest-transparent.png` (2170 × 725). Created with the built-in
image-generation tool using the existing Copic artwork as an edit target. Prompt:
remove the green/cream rectangle, paper texture, watercolor and botanical decoration;
preserve the exact red headline, two clinking mugs, black Copic lettering and orange
Octoberfest sale lettering/underline; output a tightly framed PNG with genuine alpha
transparency around and between the lettering and objects. The original opaque
promotion remains available in Shopify; the theme uses this separate transparent file.

Exact final edit prompt:

> Use case: background-extraction. Edit target: the attached existing Copic Octoberfest promotional artwork. Create a high-quality transparent PNG cutout for a website header. Preserve the exact red headline text "What’s Octoberfest without a Copic sale ?", the two clinking golden beer mugs with white foam, the bold black "copic-" lettering over the mugs, and orange brush-script "toberfest sale !" continuing on the same horizontal line, with its orange underline. Preserve their layout, colors and readable typography. REMOVE the entire pale green/cream rectangular background, paper texture, watercolor wash, grain, wheat, hops, leaves and peripheral botanical decoration. Background must be genuinely alpha transparent, including every space around and between the letters and objects, with crisp clean anti-aliased edges and no colored matte, no backdrop rectangle, no checkerboard pixels. Keep the mugs' white foam and white lettering outlines opaque. Output only the headline, mugs and lettering/underline as one tightly framed wide transparent PNG, high resolution, with a small clear margin and no cropped text or mug edges. Do not add any new copy or objects.

Created with the built-in image-generation tool. The logo is separate from the
watercolor background. Initial generation prompt:

> Recreate the attached close-up wordmark as a clean, sharp, high-resolution transparent PNG logo. The first attached image is the PRIMARY logo reference; the second is a header layout reference only. Render only the logo lettering and tagline, absolutely no watercolor background, no paper texture, no colored rectangle, no header UI, no other objects. Genuine alpha transparency around and between every letter. Main wordmark exact spelling: 'CarpeDiemMarkers.com'. Match the expressive connected hand-lettered brush/cursive calligraphy of the primary reference, with 'CarpeDiem' in rich medium blue, 'Markers' in deep warm red, and '.com' in muted dark gold/olive with crisp dark edging as in the reference. Keep the main name on a single horizontal line, visually readable and carefully kerned. Below the right-hand half, exact black tagline: 'The Best Marker Store!' in a clean bold italic typeface. Preserve the reference's proportions and friendly art-store identity, but redraw with smooth, high quality polished edges instead of photograph blur. Wide horizontal canvas, tightly cropped around the wordmark and tagline with a small even transparent margin, suitable for a premium storefront header. Target at least 2400 pixels wide if possible; no mockup, no shadows cast on a surface, no watermark. The transparent areas must be fully transparent, not a checkerboard illustration.

Final refinement prompt:

> Edit the most recent generated transparent CarpeDiemMarkers.com logo ONLY to improve its canvas framing for a website header. Preserve the exact logo lettering, blue/red/gold colors, black tagline, spelling, and existing visual design. The wordmark must still read 'CarpeDiemMarkers.com' and tagline 'The Best Marker Store!'. Remove the excessive empty transparent canvas above and below the logo: output a tightly framed, ultra-wide horizontal PNG, roughly 6:1 aspect ratio, at high resolution ideally 2400 pixels wide or more, with only a tiny even transparent margin around the outermost strokes and tagline. Make the lettering fill nearly the whole image height and width without cutting any strokes or any of the tagline. No background, no watercolor, no mockup, no white rectangle, no checkerboard artwork. Genuine alpha transparency. The task is tighter logo framing, not a new design.
