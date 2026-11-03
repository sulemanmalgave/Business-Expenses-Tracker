# Free Plan 5-Client Directory Expansion

Expand the Free tier client directory quota from 3 to 5 clients, populate the starter client directory with 5 complete business profiles, and align all subscription metadata, quota checks, and test suites.

> [!IMPORTANT]
> - Free plan users will now be able to maintain up to 5 full client profiles in their directory before reaching the Pro upgrade boundary (adding a 6th client prompts the upgrade modal).
> - All existing client data, custom notes, invoices, and transaction links remain 100% preserved.

---

## 1. Overview & Core Concept

Small business owners and freelancers tracking their income and expenses often manage 4–5 core recurring clients before needing an unlimited enterprise client book. Expanding the Free plan's client directory allowance to **5 clients**:
- Gives Free users sufficient headroom to organize and track their primary clients.
- Pre-populates the default directory with 5 realistic client records for instant out-of-the-box exploration.
- Maintains strict, verified Pro entitlement boundaries when a user attempts to add a 6th client.

---

## 2. User Experience & Visual Design

- **Client Directory Overview (`ClientsView.tsx`)**:
  - Top usage indicator displays `X / 5 clients used` in the Free plan quota card.
  - Adding a client when count is `< 5` opens the client creation dialog normally.
  - Adding a client when count is `≥ 5` opens the professional upgrade modal explaining: *"Free plan is limited to 5 client profiles. Upgrade to Pro for unlimited clients and full profitability analytics."*
- **Subscription Management View (`SubscriptionView.tsx`)**:
  - Plan card lists *"Client directory management (up to 5 clients)"*.
  - Usage progress bar shows active clients out of 5 with an accurate percentage bar.
- **Starter Client Dataset (`clientUtils.ts`)**:
  - Fresh workspaces and demo resets populate with 5 diverse, professional client profiles:
    1. **Zenith Digital Corp** (Digital Media / Retainer)
    2. **Starlight Media & Design** (Creative Agency / Milestone)
    3. **Nexus Global Solutions** (Enterprise Cloud / Advisory)
    4. **Stellar Labs** (BioTech & AI / Consulting)
    5. **Helios FinTech Systems** (FinTech Systems / Development)

---

## 3. Key Product Decisions & Trade-Offs

- **Limit Setting (`FREE_LIMITS.clients = 5`)**:
  - *Decision*: Centralize the client limit constant in `src/utils/subscriptionService.ts` so all views, quota warnings, server verifications, and modals automatically reflect the exact same value.
  - *Why*: Eliminates hardcoded magic numbers across components.
- **Backwards Compatibility**:
  - Existing users with 0–3 clients immediately gain the ability to add up to 5 without interruption.
  - Existing users with 4+ clients (e.g. from prior Pro periods or custom imports) retain read-only and editing access to all their records without data truncation.

---

## 4. Technical Architecture & Component Mapping

```
┌────────────────────────────────────────────────────────┐
│                   App State Store                      │
│        (clients: Client[], profile: UserProfile)        │
└───────────────┬────────────────────────┬───────────────┘
                │                        │
                ▼                        ▼
     ┌───────────────────────┐ ┌──────────────────────┐
     │    ClientsView.tsx    │ │ SubscriptionView.tsx │
     │  - Up to 5 allowed    │ │  - Quota: 5 clients  │
     │  - Upgrade trigger    │ │  - Feature checklist│
     │    on 6th client      │ └──────────────────────┘
     └──────────┬────────────┘
                │
                ▼
     ┌──────────────────────────────────────────────────┐
     │    subscriptionService.ts: FREE_LIMITS.clients    │
     │            (Single Source of Truth = 5)          │
     └──────────────────────────────────────────────────┘
```

### Files to Update Upon Approval:
1. `src/utils/subscriptionService.ts`: Update `FREE_LIMITS.clients = 5` and `PLAN_METADATA.free.features`.
2. `src/utils/clientUtils.ts`: Expand `getStarterClients()` to include 5 realistic starter client profiles.
3. `src/components/SubscriptionView.tsx`: Ensure quota labels and feature list reflect 5 clients.
4. `tests/runAllTests.ts`: Update entitlement test suites (Suite 28, Suite 29) to assert `FREE_LIMITS.clients === 5` and test limit transitions at 4 -> 5 -> 6.

---

## 5. Verification Plan
- Run `npm run lint` (`tsc --noEmit`) to verify strict TypeScript adherence.
- Run `npx tsx tests/runAllTests.ts` to verify all test suites pass with the 5-client limit.
- Run `compile_applet` (`npm run build`) to ensure production build succeeds.
