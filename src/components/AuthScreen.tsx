import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Lock, 
  Unlock, 
  ShieldCheck, 
  User, 
  Eye, 
  EyeOff, 
  KeyRound, 
  AlertCircle, 
  CheckCircle2, 
  HelpCircle, 
  ArrowRight,
  Delete,
  RotateCcw
} from 'lucide-react';
import { 
  AuthRecord, 
  getAuthRecord, 
  setupCredentials, 
  verifyPin, 
  recoverPinWithAnswer 
} from '../utils/authService';

interface AuthScreenProps {
  onAuthenticated: (userName: string) => void;
  initialUserName?: string;
}

export const AuthScreen: React.FC<AuthScreenProps> = ({ 
  onAuthenticated,
  initialUserName = ''
}) => {
  const [authRecord, setAuthRecord] = useState<AuthRecord | null>(null);
  const [isNewUser, setIsNewUser] = useState<boolean>(true);
  
  // Registration form state
  const [regName, setRegName] = useState<string>(initialUserName);
  const [regPin, setRegPin] = useState<string>('');
  const [regConfirmPin, setRegConfirmPin] = useState<string>('');
  const [regQuestion, setRegQuestion] = useState<string>('What is your first school or hometown?');
  const [regAnswer, setRegAnswer] = useState<string>('');
  const [showRegPin, setShowRegPin] = useState<boolean>(false);

  // Login form state
  const [loginPin, setLoginPin] = useState<string>('');
  const [isVerifying, setIsVerifying] = useState<boolean>(false);
  const [errorMessage, setErrorMessage] = useState<string>('');
  const [shakeError, setShakeError] = useState<boolean>(false);
  const [failedAttempts, setFailedAttempts] = useState<number>(0);

  // Recovery modal state
  const [showRecovery, setShowRecovery] = useState<boolean>(false);
  const [recoveryAnswer, setRecoveryAnswer] = useState<string>('');
  const [newRecoveryPin, setNewRecoveryPin] = useState<string>('');
  const [confirmRecoveryPin, setConfirmRecoveryPin] = useState<string>('');
  const [recoveryError, setRecoveryError] = useState<string>('');
  const [recoverySuccess, setRecoverySuccess] = useState<boolean>(false);

  // Load existing credentials on mount
  useEffect(() => {
    const record = getAuthRecord();
    if (record && record.isConfigured) {
      setAuthRecord(record);
      setIsNewUser(false);
    } else {
      setIsNewUser(true);
      if (initialUserName) {
        setRegName(initialUserName);
      }
    }
  }, [initialUserName]);

  // Handle hardware keyboard events when on login screen
  useEffect(() => {
    if (isNewUser || showRecovery) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      // Ignore if typing in another input element
      if (['INPUT', 'TEXTAREA'].includes((e.target as HTMLElement)?.tagName)) {
        return;
      }

      if (e.key >= '0' && e.key <= '9') {
        e.preventDefault();
        handleAppendDigit(e.key);
      } else if (e.key === 'Backspace') {
        e.preventDefault();
        handleDeleteDigit();
      } else if (e.key === 'Escape') {
        setLoginPin('');
        setErrorMessage('');
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isNewUser, showRecovery, loginPin]);

  // Auto-submit login PIN when 6 digits are entered
  useEffect(() => {
    if (!isNewUser && loginPin.length === 6 && !isVerifying) {
      submitLoginPin(loginPin);
    }
  }, [loginPin, isNewUser]);

  // Handle digit append in login mode
  const handleAppendDigit = (digit: string) => {
    if (loginPin.length >= 6) return;
    setErrorMessage('');
    setLoginPin((prev) => prev + digit);
  };

  // Handle digit backspace in login mode
  const handleDeleteDigit = () => {
    setErrorMessage('');
    setLoginPin((prev) => prev.slice(0, -1));
  };

  // Verify PIN submission
  const submitLoginPin = async (pinToVerify: string) => {
    try {
      setIsVerifying(true);
      setErrorMessage('');
      const valid = await verifyPin(pinToVerify);
      if (valid) {
        const record = getAuthRecord();
        onAuthenticated(record?.userName || 'User');
      } else {
        setShakeError(true);
        setTimeout(() => setShakeError(false), 500);
        setErrorMessage('Incorrect PIN. Please try again.');
        setFailedAttempts((prev) => prev + 1);
        setLoginPin('');
      }
    } catch (err: any) {
      setErrorMessage(err.message || 'Error verifying PIN');
      setLoginPin('');
    } finally {
      setIsVerifying(false);
    }
  };

  // Handle registration submission
  const handleRegisterSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage('');

    if (!regName.trim()) {
      setErrorMessage('Please enter your user name.');
      return;
    }

    if (regPin.length !== 6 || !/^\d{6}$/.test(regPin)) {
      setErrorMessage('PIN must be exactly 6 numeric digits.');
      return;
    }

    if (regPin !== regConfirmPin) {
      setErrorMessage('Create PIN and Confirm PIN do not match.');
      return;
    }

    try {
      setIsVerifying(true);
      const res = await setupCredentials(
        regName.trim(),
        regPin,
        regQuestion,
        regAnswer.trim()
      );

      if (res.success) {
        onAuthenticated(regName.trim());
      } else {
        setErrorMessage(res.error || 'Failed to set up credentials.');
      }
    } catch (err: any) {
      setErrorMessage(err.message || 'Unexpected error setting up PIN.');
    } finally {
      setIsVerifying(false);
    }
  };

  // Handle recovery submission
  const handleRecoverySubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setRecoveryError('');

    if (!recoveryAnswer.trim()) {
      setRecoveryError('Please enter your recovery answer.');
      return;
    }

    if (newRecoveryPin.length !== 6 || !/^\d{6}$/.test(newRecoveryPin)) {
      setRecoveryError('New PIN must be exactly 6 digits.');
      return;
    }

    if (newRecoveryPin !== confirmRecoveryPin) {
      setRecoveryError('New PIN and confirmation PIN do not match.');
      return;
    }

    try {
      setIsVerifying(true);
      const res = await recoverPinWithAnswer(
        recoveryAnswer.trim(),
        newRecoveryPin,
        confirmRecoveryPin
      );

      if (res.success) {
        setRecoverySuccess(true);
        setTimeout(() => {
          setShowRecovery(false);
          const record = getAuthRecord();
          onAuthenticated(record?.userName || 'User');
        }, 1200);
      } else {
        setRecoveryError(res.error || 'Could not reset PIN.');
      }
    } catch (err: any) {
      setRecoveryError(err.message || 'Recovery failed.');
    } finally {
      setIsVerifying(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950 text-slate-100 select-none overflow-y-auto">
      {/* Background ambient lighting */}
      <div className="fixed inset-0 pointer-events-none opacity-40">
        <div className="absolute top-1/4 left-1/3 w-96 h-96 bg-blue-600/20 rounded-full blur-3xl"></div>
        <div className="absolute bottom-1/4 right-1/3 w-96 h-96 bg-indigo-600/10 rounded-full blur-3xl"></div>
      </div>

      <motion.div 
        initial={{ opacity: 0, scale: 0.96, y: 10 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        transition={{ duration: 0.2 }}
        className="w-full max-w-md my-auto relative z-10 bg-slate-900/90 backdrop-blur-xl border border-slate-800 rounded-3xl p-6 sm:p-8 shadow-2xl"
      >
        {/* Brand identity header */}
        <div className="text-center space-y-2 mb-6">
          <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-blue-600/10 border border-blue-500/20 text-blue-400 mb-1">
            <Lock className="w-7 h-7" />
          </div>
          <h1 className="text-2xl font-black tracking-tight text-white">
            Business Expense Tracker
          </h1>
          <p className="text-xs text-slate-400">
            Secure 6-Digit PIN Workspace Protection
          </p>
        </div>

        {/* ======================================================== */}
        {/* MODE 1: NEW USER SETUP (CREATE USERNAME & 6-DIGIT PIN)   */}
        {/* ======================================================== */}
        {isNewUser ? (
          <form onSubmit={handleRegisterSubmit} className="space-y-4">
            <div className="text-center pb-2 border-b border-slate-800">
              <h2 className="text-sm font-bold text-slate-200">New User Setup</h2>
              <p className="text-xs text-slate-400">Create your user profile and choose a 6-digit security PIN</p>
            </div>

            {/* User name input */}
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-slate-300 flex items-center gap-1.5">
                <User className="w-3.5 h-3.5 text-blue-400" />
                <span>User Name</span>
              </label>
              <input
                type="text"
                required
                autoFocus
                placeholder="e.g. John Doe or Business Owner"
                value={regName}
                onChange={(e) => setRegName(e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-xl bg-slate-800/80 border border-slate-700 text-white placeholder-slate-500 text-sm focus:outline-hidden focus:border-blue-500 transition-colors"
              />
            </div>

            {/* Create 6-Digit PIN */}
            <div className="space-y-1.5">
              <div className="flex justify-between items-center">
                <label className="text-xs font-semibold text-slate-300 flex items-center gap-1.5">
                  <KeyRound className="w-3.5 h-3.5 text-blue-400" />
                  <span>Create 6-Digit PIN</span>
                </label>
                <button
                  type="button"
                  onClick={() => setShowRegPin(!showRegPin)}
                  className="text-[11px] text-slate-400 hover:text-slate-200 flex items-center gap-1 transition-colors"
                >
                  {showRegPin ? <EyeOff className="w-3 h-3" /> : <Eye className="w-3 h-3" />}
                  <span>{showRegPin ? 'Hide' : 'Show'}</span>
                </button>
              </div>
              <input
                type={showRegPin ? 'text' : 'password'}
                inputMode="numeric"
                pattern="[0-9]*"
                maxLength={6}
                required
                placeholder="Enter 6 numbers"
                value={regPin}
                onChange={(e) => {
                  const val = e.target.value.replace(/\D/g, '').slice(0, 6);
                  setRegPin(val);
                }}
                className="w-full px-3.5 py-2.5 rounded-xl bg-slate-800/80 border border-slate-700 text-white placeholder-slate-500 text-sm tracking-widest font-mono text-center focus:outline-hidden focus:border-blue-500 transition-colors"
              />
              <div className="flex justify-center gap-1.5 pt-1">
                {[0, 1, 2, 3, 4, 5].map((idx) => (
                  <span
                    key={idx}
                    className={`w-2.5 h-2.5 rounded-full transition-all ${
                      regPin.length > idx
                        ? 'bg-blue-500 scale-110 shadow-sm shadow-blue-500/50'
                        : 'bg-slate-700'
                    }`}
                  />
                ))}
              </div>
            </div>

            {/* Confirm 6-Digit PIN */}
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-slate-300 flex items-center gap-1.5">
                <ShieldCheck className="w-3.5 h-3.5 text-blue-400" />
                <span>Confirm 6-Digit PIN</span>
              </label>
              <input
                type={showRegPin ? 'text' : 'password'}
                inputMode="numeric"
                pattern="[0-9]*"
                maxLength={6}
                required
                placeholder="Re-enter 6 numbers"
                value={regConfirmPin}
                onChange={(e) => {
                  const val = e.target.value.replace(/\D/g, '').slice(0, 6);
                  setRegConfirmPin(val);
                }}
                className="w-full px-3.5 py-2.5 rounded-xl bg-slate-800/80 border border-slate-700 text-white placeholder-slate-500 text-sm tracking-widest font-mono text-center focus:outline-hidden focus:border-blue-500 transition-colors"
              />
              {regConfirmPin && (
                <div className="text-[11px] flex items-center justify-center gap-1">
                  {regPin === regConfirmPin ? (
                    <span className="text-emerald-400 flex items-center gap-1">
                      <CheckCircle2 className="w-3.5 h-3.5" /> PINs match
                    </span>
                  ) : (
                    <span className="text-amber-400 flex items-center gap-1">
                      <AlertCircle className="w-3.5 h-3.5" /> PINs do not match yet
                    </span>
                  )}
                </div>
              )}
            </div>

            {/* Optional Security Recovery Question */}
            <div className="pt-2 border-t border-slate-800 space-y-2">
              <div className="flex items-center gap-1 text-[11px] text-slate-400">
                <HelpCircle className="w-3 h-3 text-slate-400" />
                <span>Recovery Question (Optional):</span>
              </div>
              <input
                type="text"
                placeholder="Security question (e.g. Favorite city or school)"
                value={regQuestion}
                onChange={(e) => setRegQuestion(e.target.value)}
                className="w-full px-3 py-1.5 rounded-lg bg-slate-800/60 border border-slate-700 text-xs text-slate-300 focus:outline-hidden focus:border-blue-500"
              />
              <input
                type="text"
                placeholder="Secret answer for recovery"
                value={regAnswer}
                onChange={(e) => setRegAnswer(e.target.value)}
                className="w-full px-3 py-1.5 rounded-lg bg-slate-800/60 border border-slate-700 text-xs text-slate-300 focus:outline-hidden focus:border-blue-500"
              />
            </div>

            {/* Error banner */}
            {errorMessage && (
              <div className="p-2.5 rounded-xl bg-rose-950/60 border border-rose-800 text-rose-300 text-xs flex items-center gap-2">
                <AlertCircle className="w-4 h-4 shrink-0 text-rose-400" />
                <span>{errorMessage}</span>
              </div>
            )}

            {/* Submit button */}
            <button
              type="submit"
              disabled={isVerifying || regPin.length !== 6 || regPin !== regConfirmPin}
              className="w-full py-3.5 px-4 rounded-xl bg-blue-600 hover:bg-blue-500 active:bg-blue-700 disabled:opacity-50 text-white font-bold text-sm shadow-lg shadow-blue-600/30 transition-all flex items-center justify-center gap-2 pointer-events-auto cursor-pointer"
            >
              <span>Create PIN & Access Workspace</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </form>
        ) : (
          /* ======================================================== */
          /* MODE 2: RETURNING USER LOGIN (ENTER 6-DIGIT PIN)         */
          /* ======================================================== */
          <div className="space-y-6">
            {/* User Greeting */}
            <div className="text-center space-y-1">
              <div className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-blue-600/20 text-blue-400 font-bold text-lg mb-1 border border-blue-500/30">
                {authRecord?.userName ? authRecord.userName.charAt(0).toUpperCase() : 'U'}
              </div>
              <h2 className="text-lg font-bold text-white">
                Welcome back, {authRecord?.userName || 'User'}
              </h2>
              <p className="text-xs text-slate-400">
                Enter your 6-digit PIN to unlock your workspace
              </p>
            </div>

            {/* 6-Digit PIN Visual Display */}
            <motion.div 
              animate={shakeError ? { x: [-12, 12, -8, 8, -4, 4, 0] } : {}}
              transition={{ duration: 0.4 }}
              className="flex justify-center items-center gap-3 py-2"
            >
              {[0, 1, 2, 3, 4, 5].map((index) => {
                const isFilled = loginPin.length > index;
                const isCurrent = loginPin.length === index;
                return (
                  <div
                    key={index}
                    className={`w-4 h-4 rounded-full border-2 transition-all duration-150 ${
                      isFilled
                        ? 'bg-blue-500 border-blue-400 scale-125 shadow-md shadow-blue-500/50'
                        : isCurrent
                        ? 'border-blue-400 bg-blue-950/40 animate-pulse'
                        : 'border-slate-700 bg-slate-800/80'
                    }`}
                  />
                );
              })}
            </motion.div>

            {/* Error notice */}
            {errorMessage && (
              <div className="p-2.5 rounded-xl bg-rose-950/60 border border-rose-800 text-rose-300 text-xs flex items-center justify-center gap-1.5 text-center">
                <AlertCircle className="w-4 h-4 shrink-0 text-rose-400" />
                <span>{errorMessage}</span>
              </div>
            )}

            {/* On-Screen Numeric Keypad */}
            <div className="grid grid-cols-3 gap-2.5 max-w-xs mx-auto">
              {['1', '2', '3', '4', '5', '6', '7', '8', '9'].map((digit) => (
                <button
                  key={digit}
                  type="button"
                  onClick={() => handleAppendDigit(digit)}
                  className="h-13 rounded-2xl bg-slate-800/80 hover:bg-slate-700/80 active:bg-blue-600 active:text-white border border-slate-700/60 text-white font-semibold text-xl transition-all shadow-sm flex items-center justify-center pointer-events-auto cursor-pointer"
                >
                  {digit}
                </button>
              ))}

              {/* Clear button */}
              <button
                type="button"
                onClick={() => {
                  setLoginPin('');
                  setErrorMessage('');
                }}
                className="h-13 rounded-2xl bg-slate-800/40 hover:bg-slate-800 text-slate-400 hover:text-slate-200 border border-slate-800 text-xs font-semibold transition-all flex items-center justify-center pointer-events-auto cursor-pointer"
              >
                Clear
              </button>

              {/* Digit 0 */}
              <button
                type="button"
                onClick={() => handleAppendDigit('0')}
                className="h-13 rounded-2xl bg-slate-800/80 hover:bg-slate-700/80 active:bg-blue-600 active:text-white border border-slate-700/60 text-white font-semibold text-xl transition-all shadow-sm flex items-center justify-center pointer-events-auto cursor-pointer"
              >
                0
              </button>

              {/* Backspace button */}
              <button
                type="button"
                onClick={handleDeleteDigit}
                className="h-13 rounded-2xl bg-slate-800/40 hover:bg-slate-800 text-slate-400 hover:text-slate-200 border border-slate-800 text-sm transition-all flex items-center justify-center pointer-events-auto cursor-pointer"
                title="Backspace"
              >
                <Delete className="w-5 h-5" />
              </button>
            </div>

            {/* Keyboard hint */}
            <p className="text-[11px] text-center text-slate-500">
              You can also use your keyboard numpad (0-9, Backspace)
            </p>

            {/* Helper actions: Forgot PIN and Change User */}
            <div className="pt-2 border-t border-slate-800 flex justify-between items-center text-xs text-slate-400">
              <button
                type="button"
                onClick={() => {
                  setShowRecovery(true);
                  setRecoveryError('');
                  setRecoveryAnswer('');
                  setNewRecoveryPin('');
                  setConfirmRecoveryPin('');
                }}
                className="hover:text-blue-400 transition-colors pointer-events-auto cursor-pointer"
              >
                Forgot PIN?
              </button>

              <button
                type="button"
                onClick={() => setIsNewUser(true)}
                className="hover:text-slate-200 transition-colors pointer-events-auto cursor-pointer text-slate-500"
              >
                New User / Reset
              </button>
            </div>
          </div>
        )}
      </motion.div>

      {/* ======================================================== */}
      {/* RECOVERY MODAL (WHEN FORGOT PIN IS CLICKED)               */}
      {/* ======================================================== */}
      <AnimatePresence>
        {showRecovery && (
          <div className="fixed inset-0 z-60 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-xs select-none">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="w-full max-w-sm bg-slate-900 border border-slate-800 rounded-3xl p-6 shadow-2xl space-y-4"
            >
              <div className="flex items-center gap-2.5">
                <div className="w-10 h-10 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-400 flex items-center justify-center">
                  <KeyRound className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-bold text-white text-base">Reset 6-Digit PIN</h3>
                  <p className="text-xs text-slate-400">Security verification</p>
                </div>
              </div>

              {authRecord?.securityQuestion ? (
                <form onSubmit={handleRecoverySubmit} className="space-y-3.5">
                  <div className="p-3 rounded-xl bg-slate-800/60 border border-slate-700/80 text-xs text-slate-300">
                    <span className="text-slate-400 block mb-0.5">Security Question:</span>
                    <span className="font-semibold text-white">{authRecord.securityQuestion}</span>
                  </div>

                  <div className="space-y-1">
                    <label className="text-xs font-semibold text-slate-300">Your Answer</label>
                    <input
                      type="text"
                      required
                      placeholder="Enter the secret answer"
                      value={recoveryAnswer}
                      onChange={(e) => setRecoveryAnswer(e.target.value)}
                      className="w-full px-3 py-2 rounded-xl bg-slate-800 border border-slate-700 text-white text-xs focus:outline-hidden focus:border-blue-500"
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="text-xs font-semibold text-slate-300">New 6-Digit PIN</label>
                    <input
                      type="password"
                      inputMode="numeric"
                      maxLength={6}
                      required
                      placeholder="6 numbers"
                      value={newRecoveryPin}
                      onChange={(e) => setNewRecoveryPin(e.target.value.replace(/\D/g, '').slice(0, 6))}
                      className="w-full px-3 py-2 rounded-xl bg-slate-800 border border-slate-700 text-white text-xs font-mono tracking-widest text-center focus:outline-hidden focus:border-blue-500"
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="text-xs font-semibold text-slate-300">Confirm New PIN</label>
                    <input
                      type="password"
                      inputMode="numeric"
                      maxLength={6}
                      required
                      placeholder="Re-enter 6 numbers"
                      value={confirmRecoveryPin}
                      onChange={(e) => setConfirmRecoveryPin(e.target.value.replace(/\D/g, '').slice(0, 6))}
                      className="w-full px-3 py-2 rounded-xl bg-slate-800 border border-slate-700 text-white text-xs font-mono tracking-widest text-center focus:outline-hidden focus:border-blue-500"
                    />
                  </div>

                  {recoveryError && (
                    <div className="p-2 rounded-lg bg-rose-950/60 border border-rose-800 text-rose-300 text-xs">
                      {recoveryError}
                    </div>
                  )}

                  {recoverySuccess && (
                    <div className="p-2 rounded-lg bg-emerald-950/60 border border-emerald-800 text-emerald-300 text-xs flex items-center gap-1.5">
                      <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                      <span>PIN reset successfully! Unlocking...</span>
                    </div>
                  )}

                  <div className="flex gap-2 pt-1">
                    <button
                      type="button"
                      onClick={() => setShowRecovery(false)}
                      className="flex-1 py-2.5 rounded-xl border border-slate-700 text-slate-300 hover:bg-slate-800 text-xs font-semibold transition-colors pointer-events-auto cursor-pointer"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      disabled={isVerifying || newRecoveryPin.length !== 6 || newRecoveryPin !== confirmRecoveryPin}
                      className="flex-1 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-white text-xs font-bold transition-colors pointer-events-auto cursor-pointer"
                    >
                      Set New PIN
                    </button>
                  </div>
                </form>
              ) : (
                <div className="space-y-3 text-xs text-slate-300">
                  <p>
                    No security recovery question was configured for this profile.
                  </p>
                  <p className="text-slate-400 text-[11px]">
                    To access your workspace if you have forgotten your PIN, you can re-register your profile with a new PIN below.
                  </p>
                  <div className="flex gap-2 pt-2">
                    <button
                      type="button"
                      onClick={() => setShowRecovery(false)}
                      className="flex-1 py-2.5 rounded-xl border border-slate-700 text-slate-300 hover:bg-slate-800 text-xs font-semibold transition-colors pointer-events-auto cursor-pointer"
                    >
                      Cancel
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setShowRecovery(false);
                        setIsNewUser(true);
                      }}
                      className="flex-1 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold transition-colors pointer-events-auto cursor-pointer"
                    >
                      Create New PIN
                    </button>
                  </div>
                </div>
              )}
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};
