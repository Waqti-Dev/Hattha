# Hattha Real Merchant Pilot Handoff

**Date:** 2026-10-03
**Repository:** `https://github.com/Waqti-Dev/Hattha`
**Branch:** `main`
**Current commit:** `61fe22921c9f2a0e48c6a0c90a6908a2ee27aaca`
**Commit message:** `Convert Hattha to real merchant pilot`

## Completed

### Demo-data cleanup

The previously identified demo business records were deleted from the live Supabase project `kuuwrrwpjmsyxyiipuud`:

- Demo store `متجر هاتها التجريبي`
- Its three demo products
- Their inventory rows
- Their `store_products` relationships
- The associated `MERCHANT` role
- The associated `store_staff` relationship
- The associated public profile

Post-delete verification:

- Stores: `0`
- Products: `0`
- Inventory: `0`
- Store-product relationships: `0`
- Orders: `0`
- Order items: `0`
- Payments: `0`

The associated `auth.users` identity still exists because no Auth-admin deletion was performed. It has no public profile, role, staff relationship, store, product, inventory, order, or payment data. Delete that Auth identity only through an authorized Supabase Auth-admin workflow if it is required.

No replacement fake/demo data was inserted.

### Authentication and onboarding

The application now uses one Supabase Auth identity system with:

- Email/password registration and login
- Google OAuth login entry point
- Phone + OTP login entry point
- Role-based registration entry point in Arabic:
  - Customer
  - Merchant/store
  - Courier

Registration routes:

- `/register`
- `/register/customer`
- `/register/merchant`
- `/register/courier`

Merchant registration creates a **PENDING** merchant application. It does not automatically grant `MERCHANT` access. Courier registration creates a **PENDING_VERIFICATION** courier record. Customer registration receives the existing `CUSTOMER` role through the user trigger.

### Merchant self-service

Authorized merchants can manage only stores connected through `store_staff` and the database authorization helpers:

- Store settings and category
- Products
- Product category and description
- Prices
- Availability
- Inventory quantity/status
- Product deactivation
- Offers and discounts
- Percentage or fixed discounts
- Start/end dates
- Optional maximum quantity

Merchant routes:

- `/merchant`
- `/merchant/store/:storeId`
- `/merchant/products/:storeId`
- `/merchant/offers/:storeId`

All product and store writes use ownership-checked RPCs. Offer writes use store-scoped RLS policies and server-side validation.

### Customer pricing and ordering

Active offers are displayed to customers with original and effective prices. The existing customer order RPC was updated so the database recalculates effective prices and order-item snapshots server-side. Client-submitted totals are not trusted.

## Database migrations applied

The following migrations are recorded in the live Supabase project:

- `onboarding_merchant_management`
- `courier_onboarding_policy`
- `authoritative_offer_pricing`
- `store_category`
- `harden_offer_price_privileges`

The internal effective-price helper is no longer executable by `public`, `anon`, or `authenticated`; it is callable only by database owners/internal secure execution.

## Security/RLS status

Verified live policies include:

- Merchant applications: applicant self-read/insert and admin management
- Couriers: self insert only as `PENDING_VERIFICATION`, self read/update, admin management
- Stores, store products, inventory: public read where appropriate and merchant/admin isolation
- Offers and offer products: public active-offer read and store-staff/admin management

Merchant management and order RPCs are `SECURITY DEFINER` with server-side role/store checks. Supabase advisors still report the existing guarded security-definer functions as warnings because authenticated callers can invoke protected RPC entry points; the functions enforce authorization internally. The new price helper privilege warning was removed.

## Validation

All local checks passed on commit `61fe229`:

- Tests: **36 passed** across 8 test files
- TypeScript: **PASS**
- ESLint: **PASS**
- Production build: **PASS**
- `git diff --check`: **PASS**

## Deployment

Vercel production deployment for commit `61fe229` is READY:

- Deployment URL: `https://hattha-lc32wbfjh-hatha3.vercel.app/`
- Project alias: `https://hattha.vercel.app/`
- Deployment state: `READY`

A connector runtime fetch was denied with HTTP `403` because Vercel deployment protection/connector authorization still blocks the protected deployment. No application or database workaround was made for this.

## Manual provider configuration required

The live Supabase Auth settings currently report:

- Email: enabled
- GitHub: enabled, but removed from the normal Hattha login UI
- Google: disabled
- Phone: disabled
- Email confirmation: enabled (`mailer_autoconfirm` false)

To enable the advertised production methods, configure manually in Supabase Auth:

1. Enable Google provider and add the Google client ID/secret.
2. Enable Phone provider and configure an SMS provider.
3. Keep the production Site URL and redirect allow-list pointed at the Hattha Vercel domain, including:
   - `https://hattha.vercel.app/auth/callback`
   - the exact production deployment callback if testing a deployment hostname
4. Confirm email delivery/SMTP settings for production registration.

Do not place provider secrets, service-role keys, passwords, or OTP codes in the repository or client environment.

## Pilot verification status

The authenticated two-device flow was **not completed** in this run because the execution browser could not use the user’s authenticated mobile session and Vercel protection blocked connector access:

Customer registration/login → browse real merchant store → COD order → merchant accept → preparing → ready for pickup → customer sees updated backend status.

Therefore the Hattha Merchant Pilot is **not yet 100% VERIFIED**. The live database currently contains no store or product, so a real merchant must register, be approved, create the store, and add real products before the two-device test can run.

## Next recommended sequence

1. Configure Google and Phone/OTP in Supabase Auth manually.
2. Configure/confirm production email delivery.
3. Create a real merchant account through `/register/merchant`.
4. Approve its pending application through an authorized admin workflow using `approve_merchant_application`.
5. Add real products and prices through the merchant dashboard.
6. Register a separate real customer account.
7. Run the two-phone COD order transition test.
8. Record the actual backend status transition and only then declare the pilot 100% verified.
