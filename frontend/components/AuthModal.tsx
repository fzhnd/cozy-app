"use client";

import React, { useState, useEffect } from 'react';
import { X, Sparkles, ShieldCheck, AlertCircle, CheckCircle2 } from 'lucide-react';
import { signIn } from 'next-auth/react';

export default function AuthModal({ 
  isOpen, 
  initialMode = 'login',
  promptMessage,
  onClose, 
  onLoginSuccess 
}: { 
  isOpen: boolean; 
  initialMode?: 'login' | 'signup' | 'reset';
  promptMessage?: string | null;
  onClose: () => void; 
  onLoginSuccess: () => void; 
}) {
  // Modes: 'login' | 'signup' | 'reset'
  const [authMode, setAuthMode] = useState<'login' | 'signup' | 'reset'>(initialMode);
  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState('');
  const [successMessage, setSuccessMessage] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    setAuthMode(initialMode);
    setError('');
    setSuccessMessage('');
  }, [initialMode, isOpen]);

  // Handle ESC key to close modal
  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  // Password strength calculator
  const getPasswordStrength = (pass: string) => {
    if (!pass) return { score: 0, label: '', color: '', percent: 0 };
    let score = 0;
    if (pass.length >= 8) score += 1;
    if (pass.length >= 10) score += 1;
    if (/[A-Z]/.test(pass) && /[a-z]/.test(pass)) score += 1;
    if (/[0-9]/.test(pass)) score += 1;
    if (/[^A-Za-z0-9]/.test(pass)) score += 1;

    if (score <= 2) {
      return { score, label: 'Weak', barColor: 'bg-red-500', textColor: 'text-red-400', percent: 30 };
    } else if (score <= 4) {
      return { score, label: 'Moderate', barColor: 'bg-amber-500', textColor: 'text-amber-400', percent: 65 };
    } else {
      return { score, label: 'Strong', barColor: 'bg-emerald-500', textColor: 'text-emerald-400', percent: 100 };
    }
  };

  const strength = getPasswordStrength(password);

  // Form submit handler
  const handleManualAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccessMessage('');

    // Client-side validations for Sign Up and Reset Password
    if (authMode === 'signup' || authMode === 'reset') {
      if (password.length < 8) {
        setError('Password must be at least 8 characters long.');
        return;
      }
    }

    if (authMode === 'reset') {
      if (password !== confirmPassword) {
        setError('New passwords do not match. Please re-enter.');
        return;
      }
    }

    setLoading(true);

    const cleanEmail = email.trim();
    const cleanUsername = username.trim();

    try {
      if (authMode === 'login') {
        // Mode Login
        const res = await signIn('credentials', {
          redirect: false,
          email: cleanEmail,
          password
        });
        
        if (res?.error) {
          setError(res.error);
        } else {
          onLoginSuccess();
          onClose();
        }
      } else if (authMode === 'signup') {
        // Mode Sign Up
        const res = await fetch('/api/auth/register', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ name: cleanUsername, email: cleanEmail, password })
        });
        
        const data = await res.json();
        
        if (!res.ok) {
          setError(data.error ? `${data.message}: ${data.error}` : data.message || 'Failed to sign up');
        } else {
          // Auto login after successful sign up
          const signInRes = await signIn('credentials', {
            redirect: false,
            email: cleanEmail,
            password
          });
          
          if (!signInRes?.error) {
            onLoginSuccess();
            onClose();
          }
        }
      } else if (authMode === 'reset') {
        // Mode Reset Password
        const res = await fetch('/api/auth/reset-password', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ email: cleanEmail, newPassword: password })
        });

        const data = await res.json();

        if (!res.ok) {
          setError(data.message || 'Failed to reset password.');
        } else {
          setSuccessMessage(data.message || 'Password successfully updated in Supabase database!');
          setPassword('');
          setConfirmPassword('');
          // Switch to login mode after 1.8 seconds
          setTimeout(() => {
            setAuthMode('login');
            setSuccessMessage('Password updated! Please log in with your new password.');
          }, 1800);
        }
      }
    } catch (err) {
      setError('An unexpected error occurred. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  // Google Login Handler via NextAuth
  const handleGoogleAuth = async () => {
    try {
      await signIn('google', { callbackUrl: '/' });
    } catch (error) {
      console.error("Failed to login with Google:", error);
    }
  };

  return (
    <div 
      onClick={onClose}
      style={{ backdropFilter: 'blur(16px)', WebkitBackdropFilter: 'blur(16px)' }}
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-xl transition-all p-4 animate-in fade-in duration-200 cursor-pointer overflow-y-auto"
    >
      <div 
        onClick={(e) => e.stopPropagation()}
        className="bg-[#150A35] border border-white/10 p-8 pt-9 sm:p-9 sm:pt-10 rounded-[36px] shadow-[0_0_50px_rgba(0,0,0,0.9),0_0_30px_rgba(165,119,255,0.15)] w-full max-w-[440px] relative cursor-default my-auto"
      >
        {/* Close Button (Diposisikan di pojok kanan atas agar tidak bertabrakan) */}
        <button 
          onClick={onClose} 
          className="absolute top-4 right-5 w-8 h-8 rounded-full bg-white/5 hover:bg-white/15 border border-white/10 flex items-center justify-center text-gray-400 hover:text-white transition-all cursor-pointer z-30 active:scale-95"
          title="Close (Esc)"
        >
          <X size={18} />
        </button>
        
        {/* Prompt Message Banner (Ketika fitur diklik sebelum login) */}
        {promptMessage && authMode === 'login' && (
          <div className="mb-5 mt-1 mr-8 px-3.5 py-2.5 rounded-2xl bg-[#A577FF]/15 border border-[#A577FF]/30 text-[#D8C2FF] text-xs font-semibold flex items-center gap-2.5 animate-in fade-in slide-in-from-top-1">
            <Sparkles size={16} className="text-[#A577FF] shrink-0" />
            <span className="leading-snug">{promptMessage}</span>
          </div>
        )}

        {/* Title & Subtitle */}
        <h3 className="text-2xl sm:text-3xl font-bold text-[#F5F7FC] mb-1.5">
          {authMode === 'login' && 'Welcome Back'}
          {authMode === 'signup' && 'Create Account'}
          {authMode === 'reset' && 'Reset Password'}
        </h3>
        <p className="text-gray-400 text-sm mb-6">
          {authMode === 'login' && 'Please log in or sign up to continue.'}
          {authMode === 'signup' && 'Sign up to access and enjoy all features.'}
          {authMode === 'reset' && 'Enter your registered email and choose a strong new password.'}
        </p>

        {/* Input Form */}
        <form onSubmit={handleManualAuth} className="space-y-4">
          {/* Error Alert Box */}
          {error && (
            <div className="bg-red-500/10 text-red-400 text-xs sm:text-sm p-3.5 rounded-2xl border border-red-500/20 flex flex-col gap-1.5 animate-in fade-in">
              <div className="flex items-start gap-2">
                <AlertCircle size={16} className="shrink-0 mt-0.5 text-red-400" />
                <span>{error}</span>
              </div>
              {/* Shortcut to Reset Password if password was wrong */}
              {authMode === 'login' && (error.toLowerCase().includes('password') || error.toLowerCase().includes('incorrect')) && (
                <button
                  type="button"
                  onClick={() => {
                    setAuthMode('reset');
                    setError('');
                  }}
                  className="text-xs text-[#D8C2FF] hover:underline font-bold text-left ml-6 cursor-pointer"
                >
                  Forgot your password? Click here to reset it
                </button>
              )}
            </div>
          )}

          {/* Success Alert Box */}
          {successMessage && (
            <div className="bg-emerald-500/15 text-emerald-300 text-xs sm:text-sm p-3.5 rounded-2xl border border-emerald-500/30 flex items-start gap-2 animate-in fade-in">
              <CheckCircle2 size={16} className="shrink-0 mt-0.5 text-emerald-400" />
              <span>{successMessage}</span>
            </div>
          )}

          {/* Username Field (Sign Up Only) */}
          {authMode === 'signup' && (
            <div>
              <label className="block text-sm font-bold text-gray-300 mb-1.5">
                Username
              </label>
              <input 
                type="text" 
                required 
                placeholder="e.g. cozyuser"
                value={username} 
                onChange={(e) => setUsername(e.target.value)} 
                className="w-full px-5 py-3.5 bg-[#0D0524] text-white font-medium rounded-2xl border border-white/5 focus:outline-none focus:ring-2 focus:ring-[#A577FF] focus:border-transparent text-sm transition-all" 
              />
            </div>
          )}

          {/* Email Field */}
          <div>
            <label className="block text-sm font-bold text-gray-300 mb-1.5">
              Email
            </label>
            <input 
              type="email" 
              required 
              placeholder="name@example.com"
              value={email} 
              onChange={(e) => setEmail(e.target.value)} 
              className="w-full px-5 py-3.5 bg-[#0D0524] text-white font-medium rounded-2xl border border-white/5 focus:outline-none focus:ring-2 focus:ring-[#A577FF] focus:border-transparent text-sm transition-all" 
            />
          </div>

          {/* Password Field */}
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="block text-sm font-bold text-gray-300">
                {authMode === 'reset' ? 'New Password' : 'Password'}
              </label>
              {authMode === 'login' && (
                <button
                  type="button"
                  onClick={() => {
                    setAuthMode('reset');
                    setError('');
                    setSuccessMessage('');
                  }}
                  className="text-xs text-[#A577FF] hover:text-[#C7A9FF] hover:underline font-semibold cursor-pointer"
                >
                  Forgot password?
                </button>
              )}
            </div>
            <input 
              type="password" 
              required 
              placeholder={authMode === 'login' ? '••••••••' : 'At least 8 characters'}
              value={password} 
              onChange={(e) => setPassword(e.target.value)} 
              className="w-full px-5 py-3.5 bg-[#0D0524] text-white font-medium rounded-2xl border border-white/5 focus:outline-none focus:ring-2 focus:ring-[#A577FF] focus:border-transparent text-sm transition-all" 
            />

            {/* Real-time Password Strength Meter (Sign Up & Reset Password) */}
            {(authMode === 'signup' || authMode === 'reset') && password.length > 0 && (
              <div className="mt-2 space-y-1.5 animate-in fade-in duration-150">
                <div className="flex items-center justify-between text-[11px] font-semibold">
                  <span className="text-gray-400">Password strength:</span>
                  <span className={strength.textColor}>{strength.label}</span>
                </div>
                <div className="w-full h-1.5 bg-white/10 rounded-full overflow-hidden">
                  <div 
                    className={`h-full transition-all duration-300 ${strength.barColor}`}
                    style={{ width: `${strength.percent}%` }}
                  />
                </div>
              </div>
            )}

            {/* Password Requirements Guide (in English) */}
            {(authMode === 'signup' || authMode === 'reset') && (
              <div className="mt-2.5 p-3 rounded-2xl bg-white/5 border border-white/5 text-[11px] text-gray-400 space-y-1.5">
                <div className="font-semibold text-gray-300 flex items-center gap-1.5">
                  <ShieldCheck size={14} className="text-[#A577FF]" />
                  <span>Password Requirements:</span>
                </div>
                <ul className="grid grid-cols-2 gap-x-2 gap-y-1 text-[10px] pl-1 font-medium">
                  <li className={`flex items-center gap-1.5 transition-colors ${password.length >= 8 ? 'text-emerald-400' : 'text-gray-500'}`}>
                    <span>{password.length >= 8 ? '✓' : '•'} At least 8 characters</span>
                  </li>
                  <li className={`flex items-center gap-1.5 transition-colors ${/[A-Z]/.test(password) && /[a-z]/.test(password) ? 'text-emerald-400' : 'text-gray-500'}`}>
                    <span>{/[A-Z]/.test(password) && /[a-z]/.test(password) ? '✓' : '•'} Letters (A-Z, a-z)</span>
                  </li>
                  <li className={`flex items-center gap-1.5 transition-colors ${/[0-9]/.test(password) ? 'text-emerald-400' : 'text-gray-500'}`}>
                    <span>{/[0-9]/.test(password) ? '✓' : '•'} At least 1 number</span>
                  </li>
                  <li className={`flex items-center gap-1.5 transition-colors ${/[^A-Za-z0-9]/.test(password) ? 'text-emerald-400' : 'text-gray-500'}`}>
                    <span>{/[^A-Za-z0-9]/.test(password) ? '✓' : '•'} Symbol (!, @, #, $)</span>
                  </li>
                </ul>
              </div>
            )}
          </div>

          {/* Confirm Password Field (Reset Mode Only) */}
          {authMode === 'reset' && (
            <div>
              <label className="block text-sm font-bold text-gray-300 mb-1.5">
                Confirm New Password
              </label>
              <input 
                type="password" 
                required 
                placeholder="Re-enter new password"
                value={confirmPassword} 
                onChange={(e) => setConfirmPassword(e.target.value)} 
                className="w-full px-5 py-3.5 bg-[#0D0524] text-white font-medium rounded-2xl border border-white/5 focus:outline-none focus:ring-2 focus:ring-[#A577FF] focus:border-transparent text-sm transition-all" 
              />
            </div>
          )}

          {/* Submit Button */}
          <button 
            type="submit" 
            disabled={loading}
            className="w-full bg-[#A577FF] hover:bg-[#9161eb] disabled:opacity-70 text-white font-bold py-3.5 rounded-2xl transition-all shadow-[0_4px_14px_rgba(165,119,255,0.3)] mt-2 cursor-pointer text-sm"
          >
            {loading ? 'Processing...' : (
              authMode === 'login' ? 'Log In' : 
              authMode === 'signup' ? 'Sign Up' : 'Update Password'
            )}
          </button>
        </form>

        {/* Continue with Google (Login & Signup modes) */}
        {authMode !== 'reset' && (
          <button 
            type="button"
            onClick={handleGoogleAuth}
            className="w-full flex items-center justify-center gap-3 border border-white/10 bg-white/5 hover:bg-white/10 text-white font-bold py-3.5 rounded-2xl transition-colors mt-4 cursor-pointer text-sm"
          >
            <svg className="w-5 h-5 shrink-0" viewBox="0 0 24 24">
              <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
              <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
              <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
              <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
            </svg>
            Continue with Google
          </button>
        )}

        {/* Mode Switchers */}
        <div className="text-center text-xs text-gray-400 mt-6">
          {authMode === 'login' && (
            <p>
              Don't have an account?{' '}
              <button 
                type="button"
                onClick={() => {
                  setAuthMode('signup');
                  setError('');
                  setSuccessMessage('');
                }} 
                className="text-[#A577FF] font-bold hover:underline cursor-pointer ml-1"
              >
                Sign up
              </button>
            </p>
          )}

          {authMode === 'signup' && (
            <p>
              Already have an account?{' '}
              <button 
                type="button"
                onClick={() => {
                  setAuthMode('login');
                  setError('');
                  setSuccessMessage('');
                }} 
                className="text-[#A577FF] font-bold hover:underline cursor-pointer ml-1"
              >
                Log in
              </button>
            </p>
          )}

          {authMode === 'reset' && (
            <p>
              Remember your password?{' '}
              <button 
                type="button"
                onClick={() => {
                  setAuthMode('login');
                  setError('');
                  setSuccessMessage('');
                }} 
                className="text-[#A577FF] font-bold hover:underline cursor-pointer ml-1"
              >
                Back to Log In
              </button>
            </p>
          )}
        </div>

      </div>
    </div>
  );
}