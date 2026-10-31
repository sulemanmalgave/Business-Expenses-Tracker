# 6-Digit PIN Authentication & User Login System

Deliver a secure, frictionless authentication experience that requires users to establish their identity and a 6-digit PIN before accessing financial records, while preserving all existing transaction history, client ledgers, and Pro subscription entitlements.

---

### User Review & Critical Decisions

> [!IMPORTANT]
> The clarifying questions were completed with recommended security and usability defaults:
> - **Authentication Scope**: Workspace access on this device is protected via a salted SHA-256 hashed 6-digit PIN with session management.
> - **Lock Trigger**: Authentication required on first app visit, tab launch/refresh, and via an instant one-click "Lock Workspace" header control.
> - **Recovery Safety**: Setup includes an optional security recovery question to prevent accidental permanent lockouts while keeping financial data 100% offline-first.

---

### 1. Overview & Core Concept

- **What It Does**: Gates application access behind a dedicated login and registration gateway. New users create their username and establish a verified 6-digit PIN (with confirmation check). Returning users enter their 6-digit PIN using a responsive keyboard or on-screen numeric keypad.
- **Target Audience**: Small business owners, freelancers, and finance managers who need quick daily access without complex passwords, but require privacy against unauthorized local device access.
- **Key Value**: Protects sensitive financial income, expense, and tax records with zero cloud dependency or credential transmission to third parties.

---

### 2. User Experience & Visual Design

#### A. Key User Flows

```
┌────────────────────────────────────────────────────────┐
│                   App Launch Check                     │
└──────────────────────────┬─────────────────────────────┘
                           │
             Is PIN Registered & Configured?
             ┌─────────────┴─────────────┐
             ▼ NO                        ▼ YES
┌─────────────────────────┐   ┌──────────────────────────┐
│  New User Setup Screen  │   │  Returning User Login    │
│  - User / Owner Name    │   │  - Avatar & Welcome Back │
│  - Create 6-Digit PIN   │   │  - 6-Dot PIN Display     │
│  - Confirm 6-Digit PIN  │   │  - Numeric Keypad + HW   │
│  - Recovery Question    │   │  - Forgot PIN / Reset    │
└────────────┬────────────┘   └────────────┬─────────────┘
             │ Verified                    │ Valid PIN
             └─────────────┬───────────────┘
                           ▼
┌────────────────────────────────────────────────────────┐
│            Unlocked Workspace (Main App)               │
│   - Header shows User Badge & "Lock App" button        │
│   - Settings tab allows PIN change & security update   │
└────────────────────────────────────────────────────────┘
```

#### B. Visual Identity & Theme
- **Layout Presence**: Centered, distraction-free modal card on a dark slate canvas (`bg-slate-950/95` dark or `bg-slate-50` light) with subtle hairline border.
- **6-Digit PIN Input**: Six distinct digit boxes with smooth focus highlights, subtle scale animations on digit entry, masked dot representation, and instant error shake feedback.
- **Numeric Keypad**: Tactile 3x4 numeric keypad with clean numbers (1-9, 0, backspace, clear) alongside full physical keyboard / numpad support.
- **Color Discipline**: 60% neutral backdrop, 30% structural card surfaces (`bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800`), 10% high-intent blue accent (`#2563eb`) for action triggers.

---

### 3. Key Product Decisions & Trade-Offs

- **Cryptographic Hashing vs Plaintext Storage**:
  - *Chosen Approach*: Store PIN as a cryptographic SHA-256 hash with an app-specific salt in `localStorage`.
  - *Why*: Ensures that even if someone inspects the browser's storage, the plaintext 6-digit PIN cannot be read.
  - *Alternatives Considered*: Storing PIN in plaintext was rejected as unsafe for financial software.
- **Session Lifespan & Seamless Recovery**:
  - *Chosen Approach*: Active session token stored in `sessionStorage` so refreshing the active page does not badger the user unnecessarily, while closing the browser or clicking "Lock App" requires the PIN.
  - *Why*: Balances security against user fatigue.
- **Data Protection Guarantee**:
  - *Chosen Approach*: Authentication acts as a protective gate in front of the existing application state without wiping any transactions, categories, invoices, or subscriptions.

---

### 4. Technical Architecture & Data Strategy

```
┌────────────────────────────────────────────────────────┐
│                    src/App.tsx                         │
│  - authState: { isConfigured, isAuthenticated, user }  │
│  - Gated view: LoginScreen vs Main Dashboard Layout    │
└────────────┬─────────────────────────────┬─────────────┘
             │                             │
             ▼                             ▼
┌──────────────────────────┐  ┌──────────────────────────┐
│  src/components/         │  │  src/utils/              │
│  AuthScreen.tsx          │  │  authService.ts          │
│  - Register View         │  │  - hashPin(pin, salt)    │
│  - Login View            │  │  - verifyPin(pin)        │
│  - Numeric Keypad        │  │  - setupAuthCredentials  │
│  - Recovery View         │  │  - changePin()           │
└──────────────────────────┘  │  - lockSession()         │
                              └──────────────────────────┘
```

#### Key Implementation Steps:
1. **`src/utils/authService.ts`**:
   - `getAuthRecord()`: Reads stored auth configuration (`userName`, `pinHash`, `salt`, `securityQuestion`, `securityAnswerHash`).
   - `setupCredentials(userName, pin, question, answer)`: Salts and hashes the PIN using Web Crypto API (`crypto.subtle.digest('SHA-256', ...)`).
   - `verifyPin(pin)`: Compares computed hash against stored hash.
   - `recoverPinWithAnswer(answer, newPin)`: Allows reset if security question matches.
   - `isSessionUnlocked()` / `setSessionUnlocked(boolean)`: Manages session lock state.
2. **`src/components/AuthScreen.tsx`**:
   - Clean, accessible dual-mode interface: Registration (New User) and Unlock (Returning User).
   - Auto-focusing 6-digit PIN inputs with keyboard & touch keypad support.
   - Validation for matching PIN and confirmation PIN.
3. **`src/App.tsx` Integration**:
   - Gates app render: if not authenticated, renders `<AuthScreen>` full-screen.
   - Header Lock Action: Adds a quick "Lock" button in the top navigation bar.
   - Profile sync: Synchronizes username with `profile.ownerName` and `profile.businessName`.
4. **Settings / Security Tab in `ProfileModal.tsx`**:
   - Allows users to change their 6-digit PIN by entering their current PIN followed by a new confirmed PIN.
