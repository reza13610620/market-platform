# Database Schema Changelog

## v2 – 2026-11-13

### Changes from v1

**user_profiles**
- Added `reputation_score` (INTEGER, default 80)
- Added `badges_json` (TEXT, default '[]')

**penalties** (major upgrade)
- Added `order_id`
- Added `reason_code`
- Added `severity` (light | medium | heavy | critical)
- Added `reputation_deduction`
- Added `restriction_hours`
- Added `block_requests`
- Added `is_active`
- Added `applied_by` and `admin_id` + `admin_note`

**users.status**
- Documented new values: active | restricted | suspended | banned

**product_review_queue.status**
- Added `needs_edit` status

**orders.status**
- Added `refunded` status

**New Indexes**
- idx_penalties_user
- idx_penalties_restriction
- idx_user_profiles_reputation

### Notes
- All previous tables and columns remain intact.
- Schema is still fully idempotent.
- JSON structures are documented in `json_structures_v1.md`.
- Design documents for each system are in the `/docs` folder.
