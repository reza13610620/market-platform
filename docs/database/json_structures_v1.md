# JSON Structures v1 – Market Platform

**Date:** 2026-11-13  
**Status:** Updated  
**Decision Owner:** Grok (Architecture Lead)

---

## 1. benefits_json (for subscription_plans table)

```json
{
  "schema_version": "1.0",
  "limits": {
    "max_active_requests": 15,
    "max_monthly_offers": 50,
    "max_active_offers": 10,
    "max_products_in_supply": 100,
    "max_images_per_product": 6,
    "max_support_tickets_monthly": 5,
    "contact_view_quota_monthly": 10
  },
  "features": {
    "priority_support": false,
    "advanced_analytics": false,
    "bulk_request": false,
    "featured_profile": false,
    "priority_in_pool": "normal",
    "api_access": false
  },
  "discounts": {
    "commission_percent": 0,
    "featured_listing_percent": 0
  }
}
```

### Rules
- `null` = unlimited
- `0` = disabled / not allowed
- `contact_view_quota_monthly` = تعداد دفعاتی که کاربر می‌تواند در ماه اطلاعات طرف مقابل را ببیند
- Same structure is used for all 4 plans (free / silver / gold / special). Only values change.
- `anonymous_trading` is **NOT** a plan feature. It is a system-wide permanent rule.

---

## 2. attributes_json (for products table)

```json
{
  "schema_version": "1.0",
  "attributes": {
    "brand": "سامسونگ",
    "model": "Galaxy S24",
    "condition": "new",
    "origin_country": "کره جنوبی",
    "warranty": "۱۸ ماه"
  },
  "specs": [
    {
      "key": "ram",
      "label": "رم",
      "value": 12,
      "unit": "GB",
      "filterable": true
    },
    {
      "key": "storage",
      "label": "حافظه",
      "value": 256,
      "unit": "GB",
      "filterable": true
    },
    {
      "key": "color",
      "label": "رنگ",
      "value": "مشکی",
      "unit": null,
      "filterable": true
    }
  ],
  "tags": ["گوشی", "پرچمدار", "۵جی"]
}
```

### Design Decisions
- `attributes`: free key-value for general info
- `specs`: structured array for filterable/searchable technical specs
- `tags`: simple array for search and discovery
- Flexible enough for any product category
- Ready for future indexing and advanced filters

---

## Notes for Future (schema_v2+)
- Consider adding `product_specs` table for high-performance filtering
- Consider adding `subscription_usage` table for accurate limit tracking (especially contact_view_quota)
- Category-based attribute templates can be added later
