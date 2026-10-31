/**
 * Authentication Service for Business Expense Tracker
 * Secure 6-digit PIN management with salted SHA-256 hashing.
 * 100% offline-first storage in localStorage with session management.
 */

export interface AuthRecord {
  isConfigured: boolean;
  userName: string;
  pinHash: string;
  salt: string;
  securityQuestion?: string;
  securityAnswerHash?: string;
  securitySalt?: string;
  createdAt: string;
  lastLoginAt?: string;
}

const AUTH_STORAGE_KEY = 'bet_auth_record_v1';
const SESSION_STORAGE_KEY = 'bet_auth_session_active_v1';

/**
 * Pure TypeScript SHA-256 implementation as reliable fallback
 * in environments where window.crypto.subtle might be unavailable.
 */
function sha256Sync(ascii: string): string {
  function rightRotate(value: number, amount: number) {
    return (value >>> amount) | (value << (32 - amount));
  }

  const mathPow = Math.pow;
  const maxWord = mathPow(2, 32);
  let lengthProperty = 'length';
  let i = 0;
  let j = 0;
  let result = '';

  const words: number[] = [];
  const asciiBitLength = ascii[lengthProperty] * 8;

  let hash = [
    0x6a09e667, 0xbb67ae85, 0x3c6ef372, 0xa54ff53a,
    0x510e527f, 0x9b05688c, 0x1f83d9ab, 0x5be0cd19,
  ];

  const k = [
    0x428a2f98, 0x71374491, 0xb5c0fbcf, 0xe9b5dba5, 0x3956c25b, 0x59f111f1, 0x923f82a4, 0xab1c5ed5,
    0xd807aa98, 0x12835b01, 0x243185be, 0x550c7dc3, 0x72be5d74, 0x80deb1fe, 0x9bdc06a7, 0xc19bf174,
    0xe49b69c1, 0xefbe4786, 0x0fc19dc6, 0x240ca1cc, 0x2de92c6f, 0x4a7484aa, 0x5cb0a9dc, 0x76f988da,
    0x983e5152, 0xa831c66d, 0xb00327c8, 0xbf597fc7, 0xc6e00bf3, 0xd5a79147, 0x06ca6351, 0x14292967,
    0x27b70a85, 0x2e1b2138, 0x4d2c6dfc, 0x53380d13, 0x650a7354, 0x766a0abb, 0x81c2c92e, 0x92722c85,
    0xa2bfe8a1, 0xa81a664b, 0xc24b8b70, 0xc76c51a3, 0xd192e819, 0xd6990624, 0xf40e3585, 0x106aa070,
    0x19a4c116, 0x1e376c08, 0x2748774c, 0x34b0bcb5, 0x391c0cb3, 0x4ed8aa4a, 0x5b9cca4f, 0x682e6ff3,
    0x748f82ee, 0x78a5636f, 0x84c87814, 0x8cc70208, 0x90befffa, 0xa4506ceb, 0xbef9a3f7, 0xc67178f2,
  ];

  for (i = 0; i < ascii[lengthProperty]; i++) {
    j = ascii.charCodeAt(i);
    if (j >> 8) return ''; // ASCII only
    words[i >> 2] |= j << ((3 - (i % 4)) * 8);
  }

  words[asciiBitLength >> 5] |= 0x80 << (24 - (asciiBitLength % 32));
  words[(((asciiBitLength + 64) >> 9) << 4) + 15] = asciiBitLength;

  const w: number[] = [];

  for (i = 0; i < words[lengthProperty]; i += 16) {
    const oldHash = hash.slice(0);

    for (j = 0; j < 64; j++) {
      let w15: number, w2: number;
      if (j < 16) {
        w[j] = words[i + j] || 0;
      } else {
        w15 = w[j - 15];
        w2 = w[j - 2];
        const s0 = rightRotate(w15, 7) ^ rightRotate(w15, 18) ^ (w15 >>> 3);
        const s1 = rightRotate(w2, 17) ^ rightRotate(w2, 19) ^ (w2 >>> 10);
        w[j] = ((w[j - 16] + s0 + w[j - 7] + s1) | 0) >>> 0;
      }

      const s1 = rightRotate(hash[4], 6) ^ rightRotate(hash[4], 11) ^ rightRotate(hash[4], 25);
      const ch = (hash[4] & hash[5]) ^ (~hash[4] & hash[6]);
      const temp1 = ((hash[7] + s1 + ch + k[j] + w[j]) | 0) >>> 0;
      const s0 = rightRotate(hash[0], 2) ^ rightRotate(hash[0], 13) ^ rightRotate(hash[0], 22);
      const maj = (hash[0] & hash[1]) ^ (hash[0] & hash[2]) ^ (hash[1] & hash[2]);
      const temp2 = ((s0 + maj) | 0) >>> 0;

      hash[7] = hash[6];
      hash[6] = hash[5];
      hash[5] = hash[4];
      hash[4] = ((hash[3] + temp1) | 0) >>> 0;
      hash[3] = hash[2];
      hash[2] = hash[1];
      hash[1] = hash[0];
      hash[0] = ((temp1 + temp2) | 0) >>> 0;
    }

    for (j = 0; j < 8; j++) {
      hash[j] = ((hash[j] + oldHash[j]) | 0) >>> 0;
    }
  }

  for (i = 0; i < 8; i++) {
    for (j = 3; j >= 0; j--) {
      const b = (hash[i] >> (j * 8)) & 255;
      result += (b < 16 ? '0' : '') + b.toString(16);
    }
  }

  return result;
}

/**
 * Computes salted SHA-256 hash using Web Crypto API or fast fallback.
 */
export async function computeHash(text: string, salt: string): Promise<string> {
  const combined = `${salt}:${text}:expense_tracker_salt_2026`;
  try {
    if (typeof window !== 'undefined' && window.crypto && window.crypto.subtle) {
      const encoder = new TextEncoder();
      const data = encoder.encode(combined);
      const hashBuffer = await window.crypto.subtle.digest('SHA-256', data);
      const hashArray = Array.from(new Uint8Array(hashBuffer));
      return hashArray.map((b) => b.toString(16).padStart(2, '0')).join('');
    }
  } catch {
    // fallback
  }
  return sha256Sync(combined);
}

/**
 * Generates a random alphanumeric cryptographic salt.
 */
function generateSalt(): string {
  if (typeof window !== 'undefined' && window.crypto && window.crypto.getRandomValues) {
    const bytes = new Uint8Array(16);
    window.crypto.getRandomValues(bytes);
    return Array.from(bytes).map((b) => b.toString(16).padStart(2, '0')).join('');
  }
  return Math.random().toString(36).substring(2) + Date.now().toString(36);
}

/**
 * Retrieves the currently saved authentication record.
 */
export function getAuthRecord(): AuthRecord | null {
  if (typeof window === 'undefined') return null;
  try {
    const raw = localStorage.getItem(AUTH_STORAGE_KEY);
    if (!raw) return null;
    const record: AuthRecord = JSON.parse(raw);
    if (record && record.isConfigured && record.pinHash) {
      return record;
    }
    return null;
  } catch (err) {
    console.warn('Failed to parse auth record:', err);
    return null;
  }
}

/**
 * Saves or updates the authentication record in localStorage.
 */
export function saveAuthRecord(record: AuthRecord): void {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(AUTH_STORAGE_KEY, JSON.stringify(record));
  } catch (err) {
    console.error('Failed to save auth record:', err);
  }
}

/**
 * Registers a new user with a 6-digit PIN and optional recovery question.
 */
export async function setupCredentials(
  userName: string,
  pin: string,
  securityQuestion?: string,
  securityAnswer?: string
): Promise<{ success: boolean; error?: string }> {
  const cleanName = userName.trim();
  const cleanPin = pin.trim();

  if (!cleanName) {
    return { success: false, error: 'User name is required.' };
  }

  if (!/^\d{6}$/.test(cleanPin)) {
    return { success: false, error: 'PIN must consist of exactly 6 digits (0-9).' };
  }

  const salt = generateSalt();
  const pinHash = await computeHash(cleanPin, salt);

  let answerHash: string | undefined = undefined;
  let securitySalt: string | undefined = undefined;
  if (securityAnswer && securityAnswer.trim()) {
    securitySalt = generateSalt();
    answerHash = await computeHash(securityAnswer.trim().toLowerCase(), securitySalt);
  }

  const record: AuthRecord = {
    isConfigured: true,
    userName: cleanName,
    pinHash,
    salt,
    securityQuestion: securityQuestion?.trim() || undefined,
    securityAnswerHash: answerHash,
    securitySalt,
    createdAt: new Date().toISOString(),
    lastLoginAt: new Date().toISOString(),
  };

  saveAuthRecord(record);
  setSessionUnlocked(true);
  return { success: true };
}

/**
 * Verifies a 6-digit PIN against the stored hash.
 */
export async function verifyPin(pin: string): Promise<boolean> {
  const record = getAuthRecord();
  if (!record || !record.pinHash || !record.salt) {
    return false;
  }

  const cleanPin = pin.trim();
  if (!/^\d{6}$/.test(cleanPin)) {
    return false;
  }

  const computed = await computeHash(cleanPin, record.salt);
  const isValid = computed === record.pinHash;

  if (isValid) {
    record.lastLoginAt = new Date().toISOString();
    saveAuthRecord(record);
    setSessionUnlocked(true);
  }

  return isValid;
}

/**
 * Checks whether the current browser session has already been unlocked.
 */
export function isSessionUnlocked(): boolean {
  if (typeof window === 'undefined') return false;
  try {
    return sessionStorage.getItem(SESSION_STORAGE_KEY) === 'unlocked';
  } catch {
    return false;
  }
}

/**
 * Updates session lock state.
 */
export function setSessionUnlocked(unlocked: boolean): void {
  if (typeof window === 'undefined') return;
  try {
    if (unlocked) {
      sessionStorage.setItem(SESSION_STORAGE_KEY, 'unlocked');
    } else {
      sessionStorage.removeItem(SESSION_STORAGE_KEY);
    }
  } catch {
    // Ignore session storage errors
  }
}

/**
 * Explicitly locks the current session.
 */
export function lockSession(): void {
  setSessionUnlocked(false);
}

/**
 * Changes the current PIN by validating the existing PIN first.
 */
export async function changePin(
  currentPin: string,
  newPin: string,
  confirmNewPin: string
): Promise<{ success: boolean; error?: string }> {
  const record = getAuthRecord();
  if (!record) {
    return { success: false, error: 'No user account found.' };
  }

  if (newPin !== confirmNewPin) {
    return { success: false, error: 'New PIN and confirm PIN do not match.' };
  }

  if (!/^\d{6}$/.test(newPin)) {
    return { success: false, error: 'New PIN must be exactly 6 digits.' };
  }

  const isValidCurrent = await verifyPin(currentPin);
  if (!isValidCurrent) {
    return { success: false, error: 'Current PIN is incorrect.' };
  }

  const newSalt = generateSalt();
  const newPinHash = await computeHash(newPin, newSalt);

  record.salt = newSalt;
  record.pinHash = newPinHash;
  saveAuthRecord(record);

  return { success: true };
}

/**
 * Recovers and sets a new PIN using the security question answer.
 */
export async function recoverPinWithAnswer(
  answer: string,
  newPin: string,
  confirmNewPin: string
): Promise<{ success: boolean; error?: string }> {
  const record = getAuthRecord();
  if (!record || !record.securityAnswerHash) {
    return { success: false, error: 'No security recovery question is set up on this account.' };
  }

  if (newPin !== confirmNewPin) {
    return { success: false, error: 'New PIN and confirmation PIN do not match.' };
  }

  if (!/^\d{6}$/.test(newPin)) {
    return { success: false, error: 'New PIN must be exactly 6 digits.' };
  }

  const cleanAnswer = answer.trim().toLowerCase();
  const secSalt = record.securitySalt || record.salt;
  const computedAnswerHash = await computeHash(cleanAnswer, secSalt);

  if (computedAnswerHash !== record.securityAnswerHash) {
    return { success: false, error: 'Incorrect recovery answer. Please try again.' };
  }

  const newSalt = generateSalt();
  const newPinHash = await computeHash(newPin, newSalt);

  record.salt = newSalt;
  record.pinHash = newPinHash;
  saveAuthRecord(record);
  setSessionUnlocked(true);

  return { success: true };
}

/**
 * Resets authentication data (used if user explicitly requests wiping account access).
 */
export function resetAuthData(): void {
  if (typeof window === 'undefined') return;
  try {
    localStorage.removeItem(AUTH_STORAGE_KEY);
    sessionStorage.removeItem(SESSION_STORAGE_KEY);
  } catch {
    // Ignore storage errors
  }
}
