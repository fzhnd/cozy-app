"use client";

import React, { useState, useEffect } from 'react';
import { X } from 'lucide-react';
import { signIn } from 'next-auth/react';

export default function AuthModal({ 
  isOpen, 
  initialMode = 'login',
  onClose, 
  onLoginSuccess 
}: { 
  isOpen: boolean; 
  initialMode?: 'login' | 'signup';
  onClose: () => void;
  onLoginSuccess: () => void;
}) {
  // State untuk berganti antara mode Login (Welcome Back) dan Sign Up (Create Account)
  const [isLoginMode, setIsLoginMode] = useState(initialMode === 'login');

  useEffect(() => {
    setIsLoginMode(initialMode === 'login');
  }, [initialMode, isOpen]);
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
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm transition-all p-4">
      <div className="bg-[#150A35] border border-white/10 p-8 sm:p-9 rounded-[36px] shadow-[0_0_40px_rgba(0,0,0,0.8)] w-full max-w-[440px] relative">
        {/* Close Button */}
        <button 
          onClick={onClose} 
          className="absolute top-6 right-6 text-gray-400 hover:text-white transition-colors p-1"
        >
          <X size={22} />
        </button>
        
        {/* Title & Subtitle */}
        <h3 className="text-2xl sm:text-3xl font-bold text-[#F5F7FC] mb-1.5">
          {isLoginMode ? 'Welcome Back' : 'Create Account'}
        </h3>
        <p className="text-gray-400 text-sm mb-6">
          {isLoginMode 
            ? 'Please sign in to your account.' 
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