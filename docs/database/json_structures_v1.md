# JSON Structures v1.1 – Market Platform

**Date:** 2026-11-16  
**Status:** Finalized  
**Decision Owner:** Grok (Architecture Lead)  
**User confirmation:** 2026-11-16

---

## 1. benefits_json (for subscription_plans table)

```json
{
  "schema_version": "1.1",
  "limits": {
    "max_active_requests": 15,
    "max_monthly_offers": 50,
    "max_active_offers": 10,
    "max_products_in_supply": 100,
    "max_images_per_product": 6,
    "max_support_tickets_monthly": 5,
    "contact_view_quota_monthly": 5,
    "max_bulk_requests_monthly": 3
  },
  "features": {
    "priority_support": false,
    "advanced_analytics": false,
    "bulk_request": false,
    "featured_profile": false,
    "priority_in_pool": "normal",
    "api_access": false,
    "auto_offer_on_new_request": false
  },
  "discounts": {
    "commission_percent": 0,
    "featured_listing_percent": 0
  }
}
```

### قوانین ساده
- `null` = نامحدود
- `0` = غیرفعال / غیرمجاز
- `contact_view_quota_monthly` = تعداد دفعاتی که کاربر در ماه می‌تواند اطلاعات تماس طرف مقابل را ببیند
- این ساختار برای همه پلن‌ها یکسان است. فقط اعداد و true/false تغییر می‌کند.
- ناشناس بودن معاملات قانون کلی سیستم است و به پلن وابسته نیست.

### نکته مهم برای سوپر ادمین
مقادیر عددی پلن‌ها (مثل تعداد دفعات مشاهده تماس) بعداً از طریق پنل ادمین قابل تغییر خواهد بود. فعلاً برای پلن رایگان مقدار ۵ در نظر گرفته شده است.

---

## 2. attributes_json (for products table)

```json
{
  "schema_version": "1.1",
  "attributes": {
    "brand": "سامسونگ",
    "model": "Galaxy S24",
    "condition": "new",
    "origin_country": "کره جنوبی",
    "warranty": "۱۸ ماه",
    "expiry_date": null
  },
  "specs": [
    {
      "key": "ram",
      "label": "رم",
      "value": 12,
      "unit": "GB",
      "filterable": true,
      "searchable": true
    },
    {
      "key": "storage",
      "label": "حافظه",
      "value": 256,
      "unit": "GB",
      "filterable": true,
      "searchable": true
    },
    {
      "key": "color",
      "label": "رنگ",
      "value": "مشکی",
      "unit": null,
      "filterable": true,
      "searchable": true
    }
  ],
  "tags": ["گوشی", "پرچمدار", "۵جی"],
  "meta": {
    "suggested_by_user": false,
    "ai_verified": true
  }
}
```

### قوانین ساده
- `attributes`: اطلاعات کلی کالا (برند، مدل، وضعیت، کشور، گارانتی، تاریخ انقضا)
- `condition` فقط می‌تواند یکی از این‌ها باشد: new | used | refurbished | other
- `expiry_date`: برای کالاهایی که تاریخ مصرف دارند (مثلاً مواد غذایی). اگر ندارد null بگذارید.
- `specs`: مشخصات فنی که قابل فیلتر و جستجو هستند
- `tags`: کلمات کلیدی برای جستجو
- `meta`: اطلاعات سیستمی (مثلاً آیا کاربر پیشنهاد داده یا هوش مصنوعی تأیید کرده)

---

## یادداشت برای آینده
- بعداً می‌توان جدول جداگانه‌ای برای مشخصات فنی ساخت تا فیلتر سریع‌تر شود.
- مقادیر دقیق پلن‌ها توسط سوپر ادمین قابل تنظیم خواهد بود.
