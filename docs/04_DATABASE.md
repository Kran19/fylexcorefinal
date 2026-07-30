# 04 — DATABASE ARCHITECTURE

## Database Type
PostgreSQL 16 (Alpine) — Managed via Prisma ORM 6.19.3

## Connection
DATABASE_URL=postgresql://fylex_user:...@localhost:5432/fylex_db
Docker mapped: host port 5444 -> container 5432

## ORM
Prisma Client JS — schema at nest_/prisma/schema.prisma (2370 lines, 106KB)
Migrations: nest_/prisma/migrations/

---

## ALL DATABASE TABLES

### Infrastructure / Queue Tables
| Table | Purpose |
|---|---|
| cache | Key-value cache store |
| cache_locks | Distributed lock management |
| jobs | Background job queue |
| job_batches | Job batch tracking |
| failed_jobs | Failed job records |
| migrations | Migration history (Laravel-style) |
| sessions | User session storage |
| visitors | Unique visitor tracking by IP + date |

### Authentication Tables
| Table | Columns | Notes |
|---|---|---|
| users | id, name, email, emailVerifiedAt, password, rememberToken, createdAt, updatedAt | Generic user table — distinct from customers |
| admins | id, name, email, password, role, status, passwordChangedAt, lastLoginAt, lastLoginIp, deletedAt | Admin users with soft delete |
| customers | id, name, email, mobile, password, status, isBlock, blockedAt, blockReason, emailVerifiedAt, mobileVerifiedAt, dob, gender, city, address, deletedAt | Customer accounts with blocking |
| personal_access_tokens | id, tokenableType, tokenableId, name, token, abilities, lastUsedAt, expiresAt | Sanctum-style tokens |
| password_histories | id, userType, userId, passwordHash, createdAt | Password reuse prevention |
| password_reset_tokens | email (PK), token, createdAt | Password reset flow |

### Product Tables
| Table | Columns | Notes |
|---|---|---|
| products | id, brandId, taxClassId, mainCategoryId, name, slug, sku, productCode, productType, subtitle, tagline, heroImage, heritageText, bgColor, accentColor, textColor, gradient, mistColor, description, shortDescription, price, specialPrice, specialPriceStart, specialPriceEnd, sellingPrice, manageStock, qty, inStock, codAvailable, status, isFeatured, isNew, isBestseller, weight, length, width, height, viewed, metaTitle, metaDescription, metaKeywords, images, videoUrl, theme, discoverHeroBgImage, createdAt, updatedAt, deletedAt | Soft deleted, per-product theme |
| product_variants | id, productId, sku, price, comparePrice, costPrice, specialPrice, specialPriceStart/End, sellingPrice, manageStock, qty (stock_quantity), reservedQuantity, inStock, stockStatus, isActive, isDefault, isSoldConfiguration, fakeSoldCount, combinationHash, weight, dimensions, deletedAt | Core sellable unit |
| product_media | id, productId, mediaId, type (GALLERY), sortOrder | Product-level media |
| variant_images | id, variantId, mediaId, isPrimary, sortOrder, type (GALLERY) | Variant-level images |
| variant_attributes | id, variantId, attributeId, attributeValueId | Links variant to its attribute values |
| product_specifications | id, productId, variantId, specificationId, specificationValueId, value | Product specs |
| product_tags | productId, tagId | Many-to-many |
| category_product | productId, categoryId | Many-to-many |
| related_products | productId, relatedProductId | Self-referencing |
| cross_sell_products | productId, crossSellProductId | Cross-sell links |
| upsell_products | productId, upSellProductId | Upsell links |
| page_themes | id, productId, pageName, themeJson | Per-product per-page theme (TEXT column) |
| product_care_steps | id, productId, stepNumber, title, description, imageUrl | Watch care guide steps |
| product_belts | productId, beltId | Many-to-many: which belts compatible with product |
| product_boxes | productId, boxId | Many-to-many: which boxes available for product |

### Attribute / Specification Tables
| Table | Columns |
|---|---|
| attributes | id, name, code, type, isVariant, isFilterable, isRequired, status, sortOrder |
| attribute_values | id, attributeId, value, label, code, colorCode, imageId, status, sortOrder |
| specifications | id, name, code, type, sortOrder, isActive, isFilterable, isRequired |
| specification_groups | id, name, sortOrder |
| spec_group_specs | specificationGroupId, specificationId, sortOrder |
| specification_values | id, specificationId, value, sortOrder, status |
| category_attributes | id, categoryId, attributeId, isRequired, isFilterable, sortOrder |
| category_spec_groups | categoryId, specificationGroupId |
| category_hierarchies | id, ancestorId, descendantId, depth |

### Category / Brand / Tag Tables
| Table | Columns |
|---|---|
| categories | id, parentId, name, slug, imageUrl, imageId, description, status, featured, showInNav, sortOrder, metaTitle, metaDescription, metaKeywords |
| brands | id, name, slug, logoId, description, isActive, isFeatured, sortOrder, metaTitle, metaDescription, metaKeywords |
| tags | id, name, slug, isActive, isFeatured, description, color, icon |

### Belt and Box Tables
| Table | Columns |
|---|---|
| belts | id, name, price, stock, isActive, imageId |
| boxes | id, name, isActive, imageId |

### Cart Tables
| Table | Columns |
|---|---|
| carts | id, customerId, sessionId, currencyId, status, subtotal, taxTotal, shippingTotal, discountTotal, grandTotal, offerId, shippingAddressId, billingAddressId, abandonedAt |
| cart_items | id, cartId, productVariantId, beltId, quantity, unitPrice, total, discountAmount, offerId, attributes, productId |

### Order Tables
| Table | Columns |
|---|---|
| orders | id, customerId, orderNumber (unique), status, paymentStatus, shippingStatus, subtotal, taxTotal, shippingTotal, discountTotal, grandTotal, customerFirstName, customerLastName, customerMobile, shippingMethodId, paymentMethod, offerId, loyaltyPointsUsed, loyaltyPointsEarned, couponCode, customerNote, adminNote, cancellationReason, cancelledAt, confirmedAt, processingAt, shippedAt, deliveredAt, deletedAt, customerDob |
| order_items | id, orderId, productId, productVariantId, beltId, productName, sku, quantity, unitPrice, comparePrice, subtotal, taxAmount, discountAmount, total, attributes, offerId, loyaltyPoints |
| order_addresses | id, orderId, type, firstName, lastName, email, phone, address1, address2, city, state, postcode, country |
| order_status_history | id, orderId, status, notes, adminId |
| order_sequences | id, prefix, year, month, lastNumber | Sequential order numbers |
| shipments | id, orderId, trackingNumber (unique), carrier, carrierService, status, weight, dimensions, shippingLabel, trackingUrl, shippedAt, estimatedDelivery, deliveredAt, deliveryNotes, deliveredTo |
| shipment_items | id, shipmentId, orderItemId, quantity |
| returns | id, returnNumber (unique), orderId, customerId, status, type, reason, notes, refundAmount, refundPaymentId, requestedAt, approvedAt, receivedAt, processedAt, completedAt |
| return_items | id, returnId, orderItemId, quantity, condition, reason, refundAmount |

### Payment Tables
| Table | Columns |
|---|---|
| payments | id, orderId, currencyId, paymentMethod, paymentGateway, transactionId, amount, status, failureReason, response, paidAt |
| payment_attempts | id, orderId, currencyId, paymentMethod, attemptId, amount, status, gatewayResponse, failureReason |
| payment_methods | id, name, code, isActive |

### Inventory Tables
| Table | Columns |
|---|---|
| warehouses | id, name, code, address, city, state, country, pincode, contactPerson, contactNumber, isDefault, isActive |
| warehouse_stocks | id, warehouseId, productVariantId, quantity, reservedQuantity |
| inventory_transfers | id, transferNumber, fromWarehouseId, toWarehouseId, status, notes, createdBy, approvedBy |
| inventory_transfer_items | id, inventoryTransferId, productVariantId, quantity, receivedQuantity |
| stock_history | id, productVariantId, changeType, quantity, oldQuantity, newQuantity, reason, sourceType, sourceId, adminId, customerId, notes |
| price_histories | id, productVariantId, oldPrice, newPrice, oldComparePrice, newComparePrice, changedBy, changeReason, effectiveFrom, effectiveTo |
| tier_prices | id, productVariantId, minQuantity, maxQuantity, price, customerGroup, customerSegmentId, startsAt, endsAt |

### Shipping / Tax Tables
| Table | Columns |
|---|---|
| shipping_zones | id, name, countries, states, zipCodes, isActive |
| shipping_methods | id, name, code, description, config (JSON), isActive, sortOrder |
| shipping_charges | id, shippingZoneId, shippingMethodId, minWeight, maxWeight, minPrice, maxPrice, charge, freeShippingThreshold, isActive |
| tax_classes | id, name, code, description, isDefault |
| tax_rates | id, name, countryCode, stateCode, zipCode, rate, isActive, priority, code, description, isCompound, sortOrder, type |
| countries | id, code, name, isActive |
| states | id, countryId, code, name, isActive |

### Customer Tables
| Table | Columns |
|---|---|
| customer_addresses | id, customerId, type, name, mobile, address, city, state, country, pincode, latitude, longitude, isDefault |
| customer_segments | id, name, code, isActive |
| customer_segment_members | id, customerId, customerSegmentId, addedAt |
| customer_loyalty | id, customerId, loyaltyProgramId, totalPoints, availablePoints, usedPoints, expiredPoints, tierLevel |
| loyalty_programs | id, name, slug, description, pointsPerCurrency, signupBonus, firstPurchaseBonus, minRedeemablePoints, pointValue, status, startsAt, endsAt |
| loyalty_transactions | id, customerLoyaltyId, customerId, type, points, balance, referenceType, referenceId, notes |
| wishlists | id, customerId, name, isPublic, sessionId |
| wishlist_items | id, wishlistId, productVariantId |
| item_collections | id, customerId, name, isPublic |
| item_collection_items | id, itemCollectionId, productId, productVariantId |
| newsletter_subscribers | id, email, isActive |

### CMS Tables
| Table | Columns |
|---|---|
| pages | id, title, slug (unique), content, metaTitle, metaDescription, isActive |
| banners | id, name, title, subtitle, content, image, link, ctaText, ctaLink, textColor, type, position, isActive, sortOrder, startsAt, endsAt |
| home_sections | id, title, type, content, isActive, sortOrder |
| home_page_sections | id, name, title, content, type, data, displayRules, sortOrder, status |
| popups | id, name, title, content, image, link, type, trigger, delaySeconds, isActive, displayRules, targetingRules, startsAt, endsAt, impressions, conversions |
| popup_stats | id, popupId, sessionId, customerId, action, ipAddress, userAgent, pageData |
| testimonials | id, name, designation, message, rating, image, isActive, sortOrder |
| community_images | id, title, image, sortOrder, isActive |
| faqs | id, question, answer (TEXT), sortOrder, isActive |
| waitlist | id, email (unique), name, type |

### Marketing / Offers Tables
| Table | Columns |
|---|---|
| offers | id, name, code, description, status, offerType, couponType, discountValue, buyQty, getQty, minCartAmount, maxCartAmount, maxDiscount, maxUses, usesPerCustomer, usedCount, startsAt, endsAt, banner, bannerButtonText, bannerButtonLink, showAtStart, isAutoApply, isStackable, isExclusive, customerSegmentId |
| offer_categories | id, offerId, categoryId |
| offer_variants | id, offerId, productVariantId |
| offer_rewards | id, offerId, rewardProductId, rewardVariantId, rewardQty, sameAsBuyProduct |
| offer_usages | id, offerId, customerId, orderId, discountAmount, usedAt |
| gift_cards | id, code (unique), initialValue, currentValue, currencyId, isActive, status, purchasedBy, recipientId, recipientEmail, recipientName, message, expiresAt |
| gift_card_transactions | id, giftCardId, customerId, amount, balanceBefore, balanceAfter, referenceType, referenceId, notes |
| promotions | id, name, description, isActive, startDate, endDate |
| promotion_rewards | id, promotionId, rewardId |
| rewards | id, name, description, pointsRequired, isActive, startDate, endDate |
| reward_usages | id, rewardId, customerId, usedAt |
| loyalty_transactions | (see Customer section) |

### Review / Feedback Tables
| Table | Columns |
|---|---|
| reviews | id, productId, userName, userIcon, rating, review, status | Simple CMS-style reviews |
| product_reviews | id, productId, productVariantId, customerId, adminId, orderItemId, rating, title, comment, status, isVerified, isFeatured, isAdminReview, helpfulCount, notHelpfulCount | Full review system |
| review_votes | id, productReviewId, customerId, sessionId, vote |
| review_images | id, productReviewId, mediaId, sortOrder |

### Settings / System Tables
| Table | Columns |
|---|---|
| settings | id, group, key, value, type, options, label, description, isEncrypted, isPublic, sortOrder | Unique constraint: (group, key) |
| currencies | id, code, name, symbol, exchangeRate, FloatPlaces, isDefault, isActive |
| url_redirects | id, sourceUrl (unique), targetUrl, redirectType, isActive, hitCount |
| seo_metadata | id, entityType, entityId, title, description, keywords, ogTitle, ogDescription, ogImage, ogType, twitterCard, twitterTitle, twitterDescription, twitterImage, canonicalUrl, robots, isNoindex, isNofollow, structuredData |

### Media Tables
| Table | Columns |
|---|---|
| media | id, disk, filePath, fileName, originalFilename, mimeType, fileType, extension, fileSize, width, height, thumbnails, altText, title, description, uploadedBy, uploaderType, metadata, folderPath, deletedAt, serveMode, primaryVariantId, isOptimized, optimizationSavedBytes |
| media_variants | id, mediaId, format (webp/avif/jpeg/png/mp4), preset (lossless/balanced/max_compression/custom), quality (1-100), width, height, filePath, fileSize, compressionRatio |
| media_optimization_logs | id, mediaId, adminId, originalSize, optimizedSize, bytesSaved, compressionRatio, algorithm, qualitySetting, durationMs, status, errorMessage |

### Logging / Audit Tables
| Table | Columns |
|---|---|
| activity_logs | id, adminId, customerId, action, entityType, entityId, oldData, newData, ipAddress, userAgent, additionalData |
| audit_trails | id, auditableType, auditableId, adminId, customerId, event, oldValues, newValues, ipAddress, userAgent, url, tags |
| email_logs | id, messageId, from, to, subject, status, metadata, sentAt, deliveredAt, openedAt |
| sms_logs | id, messageId, from, to, message, status, metadata, sentAt, deliveredAt |
| notification_logs | id, customerId, type, subject, content, isRead, readAt |
| notifications | id, templateId, notifiableType, notifiableId, subject, content, type, status, data, sentAt, readAt |
| notification_templates | id, name, code (unique), subject, content, type, triggerEvent, variables, isActive, isFeatured |

---

## Key Relationships

Product -> ProductVariant (1:many, cascade delete)
ProductVariant -> VariantImage -> Media (variant has media via pivot)
Product -> ProductMedia -> Media (product has media via pivot)
Product -> ProductBelt -> Belt (many-to-many)
Product -> ProductBox -> Box (many-to-many)
Product -> PageTheme (1:many, per page name)
Product -> ProductCareStep (1:many)
ProductVariant -> VariantAttribute -> AttributeValue -> Attribute
Cart -> CartItem -> ProductVariant + Belt (cart can include belts)
Order -> OrderItem -> ProductVariant + Belt (orders can include belts)
Order -> Payment, PaymentAttempt (1:many payments per order)
Order -> OrderShipment -> OrderShipmentItem -> OrderItem
Order -> OrderReturn -> OrderReturnItem
Customer -> Cart, Order, Wishlist, CustomerAddress, CustomerLoyalty
Admin -> ActivityLog, AuditTrail
Offer -> OfferCategory, OfferVariant, OfferReward (targeting)
Offer -> Cart (applied offer), Order (used offer)
Media -> MediaVariant (optimized variants), MediaOptimizationLog
Belt -> CartItem (direct belt in cart), OrderItem (belt in order)
Offer -> Customer (via OfferUsage)

---

## Soft Deletes

Tables with deletedAt field (soft deleted via Prisma):
  admins, customers, products, product_variants, categories, brands,
  attributes, attribute_values, tax_classes, shipping_methods,
  gift_cards, banners, popups, media, product_reviews, offers

---

## Cascade Rules

product_variants -> ON DELETE CASCADE from products
variant_images -> ON DELETE CASCADE from variants and media
product_media -> ON DELETE CASCADE from products and media
category_product -> ON DELETE CASCADE
product_tags -> ON DELETE CASCADE
cart_items -> ON DELETE CASCADE from carts and variants
order_items -> ON DELETE CASCADE from orders
order_addresses, order_status_history -> ON DELETE CASCADE from orders
shipments, shipment_items -> ON DELETE CASCADE
returns, return_items -> ON DELETE CASCADE
wishlist_items -> ON DELETE CASCADE from wishlists and variants
media_variants, media_optimization_logs -> ON DELETE CASCADE from media

---

## Indexes (Key)

products: status, brandId, taxClassId, mainCategoryId
product_variants: productId, isActive
categories: status, parentId, featured, showInNav, slug
media: disk, mimeType, fileType, uploadedBy
orders: (no explicit index listed, uses orderNumber unique)
activity_logs: entityType+entityId, createdAt, adminId, customerId
sessions: userId, lastActivity
customers: status, emailVerifiedAt, mobileVerifiedAt
settings: group, sortOrder
page_themes: productId (unique productId+pageName)

---

## ER Summary (Business Entities)

Core entities and their domain:
  Product (watch) — the central business entity
  ProductVariant — the actual sellable SKU
  Belt — watch strap add-on
  Box — packaging add-on
  Category — product classification
  Customer — buyer
  Order — purchase record
  Cart — pre-purchase basket
  Offer — discount/coupon rule
  Media — image/video file
  Setting — configurable key-value store
  PageTheme — per-product visual customisation
  CommunityImage — social proof gallery
  Testimonial — customer testimonials
  Banner — promotional banners
  Faq — FAQ content

---

*Document 04 of 20 — FYLEX Enterprise Documentation Suite*
