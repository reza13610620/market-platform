# Market Platform – Project Vision, Rules & Architecture Decisions

**Last Updated:** 2026-11-13
**Owner:** Reza
**Status:** Early Design Phase

This document is the single source of truth. Any AI working on this project must read it first.

## 1. Project Overview

Large-scale general marketplace (website + mobile app). Not limited to cafe equipment. Any buyable/sellable product is allowed.

Evolution of the previous Foo Telegram bot, but a completely new product.

Core principles:
- Designed for very high user volume from day one
- Security is critical
- Strong statistics and full history everywhere
- Quality over speed
- **Anonymous until payment is completed**

## 2. Business Model

Revenue:
1. Subscription – 4 levels (monthly + yearly)
2. Commission – percentage from both sides (details later)
3. Wallet – deposit yes, withdrawal no for now. Only spending from wallet.

Roles: Every user can be both buyer and seller.

## 3. Core Transaction Flow

### Product Discovery
- Precise categorization
- Search + Category + Barcode support

### Cart & Anonymous Request
- Select product + quantity → cart
- Change city + publish options (together or separate)
- After confirmation → published anonymously into Request Pools
- No contact info shared

### Request Pools (Heart of the system)
Virtual filters on a main requests table:
- Per-product pool (individual requests only)
- Daily pool (today + open previous days, viewable separately)
- Bulk requests pool (completely separate)
- Location filters: my city / nearby / all

Sellers can add products to their profile as "I can supply this".
They receive notifications and can filter + submit offers.

### Offer Rules
- Buyer can keep multiple offers
- Seller cannot freely edit/cancel after submission
- Seller can cancel with penalty (reputation + temporary restriction on offering/receiving requests)
- Offers have time limits

### Anonymity Rule (Critical)
- The entire request and offer (pricing) process remains fully anonymous.
- Parties see each other's information **only after the buyer pays** and the offer is accepted.
- No name, phone, or contact details are revealed before successful payment.

### After Acceptance
Wallet payment → Escrow → Shipping → Buyer confirmation → Commission deducted → Money to seller → Ratings

## 4. Product Submission
No product goes directly to live database.
AI reviews first → result goes to Admin Review Queue → Admin approves → live.

## 5. Security & Trust
- Auth: Mobile + SMS code
- Rating, money-back guarantee, manual review, strong reporting, insurance
- Extremely strong logging mandatory
- Seller collateral: not required for now

## 6. Other Modules
- Admin panel with roles
- Internal tickets + AI assistant from day one
- Notifications: SMS + Telegram + in-app (user choice)
- Web + PWA + Native app from start
- Telegram bot becomes interface only (shared DB)

## 7. Technical
- Scalable & secure infrastructure (flexible)
- Strong logging non-negotiable
- Future: multi-language + crypto + international infra

## 8. Working Method & Documentation Rule (Permanent)
- Grok currently leads architecture & requirements.
- Free models (Gemini, ChatGPT, etc.) are used for draft design work.
- **Every important decision, structure, or step must be immediately documented and pushed to this repository.**
- No architecture decision should remain only in chat.

## 9. Finalized JSON Structures (2026-11-13)

See detailed file: `docs/database/json_structures_v1.md`
