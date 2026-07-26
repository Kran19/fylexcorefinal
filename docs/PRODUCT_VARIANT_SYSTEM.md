# Product Variant System

## 1. System Overview
The FYLEX watch catalog relies heavily on variations. Watches (Products) act as parent containers, while the actual purchasable SKUs are Product Variants.
- **Parent Product (`products`):** Defines the base model, generic description, and base styling (e.g., `bgColor`, `gradient`).
- **Product Variant (`product_variants`):** Defines the exact combination of a Watch Dial, Bracelet, and Case. Contains its own price, stock, and SKU.

## 2. Image Logic Hierarchy

### 2.1 Universal Images
These are images stored in `product_media` (associated directly with the parent `Product`). They represent generic lifestyle shots, technical diagrams, or packaging that apply to *all* variants of that watch model.

### 2.2 Variant Images
These are images stored in `variant_images` (associated directly with a `ProductVariant`). 
When a user selects a specific configuration (e.g., "Rose Gold Dial" + "Leather Strap"), the gallery should swap out the universal images and load the specific variant images.

### 2.3 Primary vs. Gallery
- `isPrimary`: A boolean/integer flag determining the main thumbnail for the variant in the cart or product listing.
- `type`: Categorizes the image (e.g., `GALLERY`, `TECHNICAL`, `LIFESTYLE`).

## 3. Why Wrong Images Appear (Bug Detection)
Based on the schema structure and the requirement analysis, the "wrong image appearing" bug stems from the following logical flaws:

1. **Fallback Logic Failure:** When a specific variant does not have a comprehensive gallery, the frontend fails to gracefully merge the Universal `product_media` with the existing `variant_images`. It either shows a blank gallery or exclusively shows the parent images, overriding the specific dial/bracelet combination.
2. **Attribute Mapping:** The `VariantAttribute` mapping (which links a variant to its Dial/Bracelet attributes) isn't correctly resolving the image tied specifically to the *Attribute Value* (e.g., `AttributeValue.imageId`). If a user selects a "Steel Bracelet", the system should ideally pull the `media` associated with that specific bracelet attribute if a full variant image isn't available.
3. **Sorting Ignored:** The `sortOrder` column in both `variant_images` and `product_media` is likely being ignored in the API response or frontend state, causing images to render in random database insertion order rather than the admin-defined sequence.

## 4. Admin Workflow for Variants
1. Admin creates Parent Product.
2. Admin defines Attributes (Dial Color, Bracelet Material).
3. Admin generates Variants (combinations of attributes).
4. Admin uploads media and manually links them to either the Parent (Universal) or the Variant (Specific). This manual linking is prone to human error if bulk-upload logic isn't strictly mapping filenames to SKUs.
