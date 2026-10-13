"use client";

import React, { useState, useEffect } from 'react';
import { X, Sparkles } from 'lucide-react';
import { signIn } from 'next-auth/react';

export default function AuthModal({ 
  isOpen, 
  initialMode = 'login',
  promptMessage,
  onClose, 
  onLoginSuccess 
}: { 
  isOpen: boolean; 
  initialMode?: 'login' | 'signup';
  promptMessage?: string | null;
  onClose: () => void;
  onLoginSuccess: () => void;
}) {
  // State untuk berganti antara mode Login (Welcome Back) dan Sign Up (Create Account)
  const [isLoginMode, setIsLoginMode] = useState(initialMode === 'login');

  useEffect(() => {
    setIsLoginMode(initialMode === 'login');
  }, [initialMode, isOpen]);

  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);
  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  if (!isOpen) return null;

  // Handler submit manual
  const handleManualAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      if (isLoginMode) {
        // Mode Login
        const res = await signIn('credentials', {
          redirect: false,
          email,
          password
        });
        
        if (res?.error) {
          setError(res.error);
        } else {
          onLoginSuccess();
          onClose();
        }
      } else {
        // Mode Sign Up
        const res = await fetch('/api/auth/register', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ name: username, email, password })
        });
        
        const data = await res.json();
        
        if (!res.ok) {
          setError(data.error ? `${data.message}: ${data.error}` : data.message || 'Failed to sign up');
        } else {
          // Auto login after successful sign up
          const signInRes = await signIn('credentials', {
            redirect: false,
            email,
            password
          });
          
          if (!signInRes?.error) {
            onLoginSuccess();
            onClose();
          }
        }
      }
    } catch (err) {
      setError('An unexpected error occurred');
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
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-xl transition-all p-4 animate-in fade-in duration-200 cursor-pointer"
    >
      <div 
        onClick={(e) => e.stopPropagation()}
        className="bg-[#150A35] border border-white/10 p-8 pt-9 sm:p-9 sm:pt-10 rounded-[36px] shadow-[0_0_50px_rgba(0,0,0,0.9),0_0_30px_rgba(165,119,255,0.15)] w-full max-w-[440px] relative cursor-default"
      >
        {/* Close Button (Lebih ke atas & di pojok kanan agar tidak menumpuk dengan banner) */}
        <button 
          onClick={onClose} 
          className="absolute top-4 right-5 w-8 h-8 rounded-full bg-white/5 hover:bg-white/15 border border-white/10 flex items-center justify-center text-gray-400 hover:text-white transition-all cursor-pointer z-30 active:scale-95"
          title="Close (Esc)"
        >
          <X size={18} />
        </button>
        
        {/* Prompt Message Banner (Ketika fitur diklik sebelum login) */}
        {promptMessage && (
          <div className="mb-5 mt-1 mr-8 px-3.5 py-2.5 rounded-2xl bg-[#A577FF]/15 border border-[#A577FF]/30 text-[#D8C2FF] text-xs font-semibold flex items-center gap-2.5 animate-in fade-in slide-in-from-top-1">
            <Sparkles size={16} className="text-[#A577FF] shrink-0" />
            <span className="leading-snug">{promptMessage}</span>
          </div>
        )}

        {/* Title & Subtitle */}
        <h3 className="text-2xl sm:text-3xl font-bold text-[#F5F7FC] mb-1.5">
          {isLoginMode ? 'Welcome Back' : 'Create Account'}
        </h3>
        <p className="text-gray-400 text-sm mb-6">
          {isLoginMode 
            ? 'Please log in or sign up to continue.' 
            : 'Sign up to access and enjoy all features.'}
        </p>

        {/* Input Form */}
        <form onSubmit={handleManualAuth} className="space-y-4">
          {error && (
            <div className="bg-red-500/10 text-red-400 text-sm p-3 rounded-xl border border-red-500/20">
              {error}
            </div>
          )}
          {!isLoginMode && (
            <div>
              <label className="block text-sm font-bold text-gray-300 mb-1.5">
                Username
              </label>
              <input 
                type="text" 
                required={!isLoginMode} 
                value={username} 
                onChange={(e) => setUsername(e.target.value)} 
                className="w-full px-5 py-3.5 bg-[#0D0524] text-white font-medium rounded-2xl border border-transparent focus:outline-none focus:ring-2 focus:ring-[#A577FF] focus:border-transparent text-sm transition-all" 
              />
            </div>
          )}

          <div>
            <label className="block text-sm font-bold text-gray-300 mb-1.5">
              Email
            </label>
            <input 
              type="email" 
              required 
              value={email} 
              onChange={(e) => setEmail(e.target.value)} 
              className="w-full px-5 py-3.5 bg-[#0D0524] text-white font-medium rounded-2xl border border-transparent focus:outline-none focus:ring-2 focus:ring-[#A577FF] focus:border-transparent text-sm transition-all" 
            />
          </div>

          <div>
            <label className="block text-sm font-bold text-gray-300 mb-1.5">
              Password
            </label>
            <input 
              type="password" 
              required 
              value={password} 
              onChange={(e) => setPassword(e.target.value)} 
              className="w-full px-5 py-3.5 bg-[#0D0524] text-white font-medium rounded-2xl border border-transparent focus:outline-none focus:ring-2 focus:ring-[#A577FF] focus:border-transparent text-sm transition-all" 
            />
          </div>

          {/* Submit Button */}
          <button 
            type="submit" 
            disabled={loading}
            className="w-full bg-[#A577FF] hover:bg-[#9161eb] disabled:opacity-70 text-white font-bold py-3.5 rounded-2xl transition-all shadow-[0_4px_14px_rgba(165,119,255,0.3)] mt-2 cursor-pointer text-sm"
          >
            {loading ? 'Processing...' : (isLoginMode ? 'Log In' : 'Sign Up')}
          </button>
        </form>

        {/* Continue with Google */}
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

        {/* Toggle Login / Register */}
        <p className="text-center text-xs text-gray-400 mt-6">
          {isLoginMode ? "Don't have an account? " : "Already have an account? "}
          <button 
            type="button"
            onClick={() => {
              setIsLoginMode(!isLoginMode);
              setError('');
              setUsername('');
              setEmail('');
              setPassword('');
            }} 
            className="text-[#A577FF] font-bold hover:underline cursor-pointer ml-1"
          >
            {isLoginMode ? 'Sign up' : 'Log in'}
          </button>
        </p>

      </div>
    </div>
  );
}