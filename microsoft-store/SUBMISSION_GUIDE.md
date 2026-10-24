# Microsoft Partner Center Submission Guide

This guide details the exact steps to submit **Business Expense Tracker – Small Business** to the Microsoft Store.

---

## Method 1: PWABuilder (Recommended by Microsoft)

Microsoft's official tool for publishing PWAs to the Microsoft Store is **PWABuilder**:

1. **Deploy Production Web App**:
   Ensure the production build is hosted on your public HTTPS domain (e.g., `https://com.businessexpensetracker.app/` or your staging domain).
   The app includes:
   - Valid `manifest.webmanifest` with all required fields.
   - Active Service Worker (`/sw.js`) for offline caching.
   - 192x192 and 512x512 icons (`any` and `maskable`).

2. **Generate the Windows Package (MSIX)**:
   - Navigate to [PWABuilder](https://www.pwabuilder.com/).
   - Enter your app URL and click **Start**.
   - PWABuilder will audit the PWA (Manifest, Service Worker, Security) and grant an installability score.
   - Click **Package for Stores** -> **Windows**.
   - Enter your **Partner Center Package Identity Details** (from your Microsoft Partner Center reservation):
     - **Package ID / Name**: (e.g. `YourCompany.BusinessExpenseTracker`)
     - **Publisher ID**: (e.g. `CN=XXXXXXXX-XXXX-XXXX-XXXX-XXXXXXXXXXXX`)
     - **Publisher Display Name**: (e.g. `Your Registered Publisher Name`)
     - **Package Version**: `1.1.0.0`
   - Download the generated `.msixbundle` / `.zip` package.

3. **Submit to Microsoft Partner Center**:
   - Log into [Microsoft Partner Center](https://partner.microsoft.com/dashboard).
   - Under **Apps & Games**, click **Create a new app** and reserve the name **Business Expense Tracker – Small Business**.
   - Fill in **Product details**:
     - Copy contents from `microsoft-store/STORE_LISTING.md`.
     - Upload the 6 recommended screenshots.
     - Provide the Privacy Policy link (`/privacy`).
   - Under **Packages**, upload the `.msixbundle` downloaded from PWABuilder.
   - Set **Pricing and availability** (Free base with optional in-app products, or standard pricing).
   - Complete the **Age ratings** questionnaire (Category: Business, Rating: Everyone/3+).
   - Click **Submit to the Store**.

---

## Method 2: Direct PWA Submission in Partner Center

In recent updates to Microsoft Partner Center, Microsoft allows submitting a PWA by directly providing the PWA URL:
1. In Partner Center, select **New app** -> **Progressive Web App**.
2. Enter the hosted URL.
3. Microsoft Partner Center will validate the manifest and service worker directly from your server.
4. Fill in listing details and submit.

---

## Verification Checklist Before Final Submission

- [x] Service Worker correctly caches root and index.html without 404 errors.
- [x] Manifest includes standalone display, icons, and <= 12 char short_name.
- [x] All 76 automated test cases pass with 0 failures.
- [x] Zero `window.alert` / `window.confirm` calls.
- [x] No API keys, passwords, or secrets in bundle.
- [x] Production build passes with 0 compilation errors.
- [x] Privacy policy and offline storage disclosures match implementation.
