# Hattha UX research synthesis

## Research scope
Public UX and operations research across Talabat, Uber Eats, Deliveroo, Careem Food, HungerStation, and Mrsool. Research focused on location-first discovery, search, menus, fees, ETA/status communication, merchant operations, courier task flows, and recovery states.

## High-confidence principles

1. **Address and serviceability first.** Confirm city/neighborhood/landmark and serviceability before deep browsing; preserve an easy address switcher.
2. **Truthful marketplace data.** Never invent stores, products, prices, offers, ratings, ETAs, courier locations, or payment capabilities. Label unknown/stale values.
3. **Canonical order state machine.** Customer, merchant, courier, support, and admin should share plain-language milestones and timestamps.
4. **Transparent totals and timing.** Show subtotal, delivery/service fees, discount scope, payment method, and final total before confirmation. Use ETA ranges only when supported.
5. **Progressive disclosure.** Make the next action obvious while keeping secondary detail available; avoid dense dashboards and card clutter.
6. **Recovery is part of the product.** Empty, no-result, closed, unavailable, network, delay, cancellation, payment, and support states need explanations and next actions.
7. **Fast operational queues.** Merchant and courier surfaces should be task-first with one clear primary action per state.
8. **Original Hattha identity.** Adapt behavioral patterns, never competitor branding, wording, layouts, proprietary algorithms, or unverified promises.
9. **RTL as behavior.** Test Arabic hierarchy, back/forward direction, mixed Arabic/Latin data, EGP formatting, addresses, timestamps, focus order, and touch targets.
10. **Real-data retention.** Favorites and reorder should revalidate availability, price, branch, and current serviceability before acting.

## Hattha-specific decisions

- Keep the existing real backend and COD-only limitation visible; do not add fake payments, ratings, maps, subscriptions, coupons, chat, or analytics.
- Redesign the customer home around: delivery area/address context, search, real categories, real stores, real popular orders, and intentional empty states.
- Use a restrained warm sand / deep green / coral accent system derived from the current Hattha identity, with consistent buttons, surfaces, status chips, inputs, and cards.
- Use a sticky mobile bottom navigation and compact desktop header; reserve large visual emphasis for the primary action and real operational state.
- Make the merchant dashboard a queue for attention-now orders, with direct state actions and real counts.
- Make the courier dashboard a focused availability + current-job surface with large state-specific actions and no unsupported map promises.

## Sources

- Talabat: https://www.talabat.com/egypt, https://www.talabat.com/egypt/faq, https://integration.talabat.com/en/documentation, https://tech.deliveryhero.com/blog/from-streets-to-screens-redesigning-the-rider-app/
- Uber Eats: https://www.ubereats.com/, https://help.uber.com/en/ubereats/restaurants/article/my-order-is-taking-longer-than-expected?nodeId=eec94190-9897-481c-8f4b-dfaa1c0e47ca, https://www.uber.com/us/en/blog/introducing-menu-maker/, https://www.uber.com/us/en/deliver/driver-app/
- Deliveroo: https://deliveroo.co.uk/, https://deliveroo.co.uk/faq, https://deliveroo.co.uk/menu/london/tufnell-park/et-house, https://help.deliveroo.com/en/articles/2012200-what-are-scheduled-orders-and-how-do-they-work
- Careem Food: https://help.careem.com/hc/en-us/articles/4403216329747-How-to-place-a-food-order, https://help.careem.com/hc/en-us/articles/4403216481427-Tracking-an-order, https://help.careem.com/hc/en-us/articles/4403223146899-My-order-is-delayed, https://www.careem.com/en-AE/food-partner-faqs/
- HungerStation: https://hungerstation.com/sa-en/faqs, https://hungerstation.com/sa-ar, https://hungerstation.com/sa-en/terms-of-use, https://developer.hungerstation.com/api-specifications
- Mrsool: https://help.sa.mrsool.co/en/articles/8345145-what-is-mrsool, https://help.sa.mrsool.co/en/articles/8345168-how-to-deliver-orders-with-mrsool, https://help.sa.mrsool.co/en/articles/8345224-what-should-i-do-if-the-customer-orders-from-many-stores, https://mrsool.co/partnership/
