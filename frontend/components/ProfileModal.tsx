"use client";

import React, { useState, useEffect } from 'react';
import { X, ChevronLeft, ChevronRight } from 'lucide-react';
import { signOut, useSession } from "next-auth/react";

export default function ProfileModal({ 
  isOpen, 
  onClose, 
  user, 
  setUser,
  onSaveProfile
}: { 
  isOpen: boolean; 
  onClose: () => void; 
  user?: any; 
  setUser?: (user: any) => void;
  onSaveProfile?: (profile: { name: string; image: string }) => void;
}) {
  const { data: session, update } = useSession();
  const [editName, setEditName] = useState('');
  const [selectedAvatar, setSelectedAvatar] = useState('');
  const [startIndex, setStartIndex] = useState(0);

  const avatars = [
    // 10 Laki-laki
    "https://api.dicebear.com/7.x/adventurer/svg?seed=Leo&backgroundColor=F9EBD8",
    "https://api.dicebear.com/7.x/adventurer/svg?seed=Felix&backgroundColor=8CC6C5",
    "https://api.dicebear.com/7.x/adventurer/svg?seed=Jasper&backgroundColor=7973D3",
    "https://api.dicebear.com/7.x/adventurer/svg?seed=Oscar&backgroundColor=577F9C",
    "https://api.dicebear.com/7.x/adventurer/svg?seed=Milo&backgroundColor=F2C8F7",
    "https://api.dicebear.com/7.x/adventurer/svg?seed=Max&backgroundColor=F9EBD8",
    "https://api.dicebear.com/7.x/adventurer/svg?seed=Sam&backgroundColor=8CC6C5",
    "https://api.dicebear.com/7.x/adventurer/svg?seed=Toby&backgroundColor=7973D3",
    "https://api.dicebear.com/7.x/adventurer/svg?seed=Finn&backgroundColor=577F9C",
    "https://api.dicebear.com/7.x/adventurer/svg?seed=Jack&backgroundColor=F2C8F7",
    // 10 Perempuan
    "https://api.dicebear.com/7.x/adventurer/svg?seed=Aneka&backgroundColor=F2C8F7",
    "https://api.dicebear.com/7.x/adventurer/svg?seed=Mimi&backgroundColor=F9EBD8",
    "https://api.dicebear.com/7.x/adventurer/svg?seed=Lily&backgroundColor=8CC6C5",
    "https://api.dicebear.com/7.x/adventurer/svg?seed=Luna&backgroundColor=7973D3",
    "https://api.dicebear.com/7.x/adventurer/svg?seed=Cleo&backgroundColor=577F9C",
    "https://api.dicebear.com/7.x/adventurer/svg?seed=Ruby&backgroundColor=F2C8F7",
    "https://api.dicebear.com/7.x/adventurer/svg?seed=Coco&backgroundColor=F9EBD8",
    "https://api.dicebear.com/7.x/adventurer/svg?seed=Lola&backgroundColor=8CC6C5",
    "https://api.dicebear.com/7.x/adventurer/svg?seed=Mia&backgroundColor=7973D3",
    "https://api.dicebear.com/7.x/adventurer/svg?seed=Zoe&backgroundColor=577F9C",
  ];

  const currentUser = user || session?.user;
  const currentEmail = user?.email || session?.user?.email || '';
  const currentName = user?.displayName || user?.name || session?.user?.name || '';
  const currentAvatar = user?.photoURL || user?.image || session?.user?.image || avatars[0];

  useEffect(() => {
    if (isOpen) {
      setEditName(currentName);
      setSelectedAvatar(currentAvatar);
    }
  }, [isOpen, currentName, currentAvatar]);

  const [isSaving, setIsSaving] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [error, setError] = useState('');

  // Dummy registered users for mockup
  const REGISTERED_USERS = ['luna', 'jasper', 'mimi', 'pocha', 'leci'];

  if (!isOpen) return null;

  const saveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    if (REGISTERED_USERS.includes(editName.toLowerCase().trim()) && editName.toLowerCase().trim() !== currentName.toLowerCase().trim()) {
      setError(`Username '${editName}' is already taken!`);
      return;
    }
    setError('');
    setIsSaving(true);
    try {
      if (session) {
        // Update to DB if user is logged in
        const res = await fetch('/api/user/profile', {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ name: editName, image: selectedAvatar })
        });
        
        if (!res.ok) {
          const data = await res.json();
          alert(`Failed to update profile: ${data.message || 'Unknown error'}`);
          return;
        }

        // Memaksa NextAuth memperbarui data sesi di klien
        await update({
          name: editName,
          image: selectedAvatar,
        });
      }

      if (onSaveProfile) {
        onSaveProfile({ name: editName, image: selectedAvatar });
      }
      if (setUser) {
        setUser({ ...currentUser, displayName: editName, photoURL: selectedAvatar });
      }
      onClose();
    } catch (error) {
      console.error(error);
      alert('An error occurred while saving profile');
    } finally {
      setIsSaving(false);
    }
  };

  const handleDeleteAccount = async () => {
    if (window.confirm("WARNING: Are you sure you want to permanently delete your account? All your data will be lost.")) {
      setIsDeleting(true);
      try {
        if (session) {
          const res = await fetch('/api/user/profile', { method: 'DELETE' });
          if (!res.ok) {
            const data = await res.json();
            alert(`Failed to delete account: ${data.message}`);
            return;
          }
        }
        await signOut({ callbackUrl: '/' });
        if (setUser) setUser(null);
        onClose();
      } catch (error) {
        console.error(error);
        alert('An error occurred while deleting account');
      } finally {
        setIsDeleting(false);
      }
    }
  };

  const handleLogout = async () => {
    await signOut({ callbackUrl: '/' });
    if (setUser) setUser(null);
    onClose();
  };

  return (
    <div 
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm transition-all p-4"
      onClick={onClose}
    >
      <div 
        className="bg-[#150A35] border border-white/10 p-8 sm:p-9 rounded-[36px] shadow-[0_0_40px_rgba(0,0,0,0.8)] w-full max-w-[480px] relative"
        onClick={(e) => e.stopPropagation()}
      >
        <button 
          onClick={onClose} 
          className="absolute top-6 right-6 text-gray-400 hover:text-white transition-colors p-1"
        >
          <X size={22} />
        </button>
        
        <h3 className="text-2xl font-bold text-[#F5F7FC] mb-6">Edit Profile</h3>
        
        <form onSubmit={saveProfile} className="space-y-5">
          {/* Section: Pilih Icon Profile */}
          <div>
            <label className="block text-sm font-bold text-gray-300 mb-3">Choose Profile Icon</label>
            
            <div className="flex items-center justify-between gap-2">
              <button 
                type="button" 
                onClick={() => setStartIndex(Math.max(0, startIndex - 5))} 
                disabled={startIndex === 0}
                className="shrink-0 w-8 h-8 rounded-full bg-white/5 hover:bg-white/10 disabled:opacity-30 transition-all flex items-center justify-center cursor-pointer"
              >
                <ChevronLeft size={18} className="text-gray-400" />
              </button>

              <div className="flex gap-2.5 justify-center items-center flex-1">
                {avatars.slice(startIndex, startIndex + 5).map((avatar, idx) => {
                  const isSelected = selectedAvatar === avatar;
                  return (
                    <img 
                      key={idx} 
                      src={avatar} 
                      alt="Avatar"
                      onClick={() => setSelectedAvatar(avatar)}
                      className={`w-13 h-13 shrink-0 rounded-full cursor-pointer transition-all object-cover ${
                        isSelected 
                          ? 'border-4 border-[#A577FF] scale-110 shadow-[0_0_15px_rgba(165,119,255,0.4)]' 
                          : 'border-2 border-transparent hover:scale-105 opacity-60 hover:opacity-100 bg-[#0D0524]'
                      }`}
                    />
                  );
                })}
              </div>

              <button 
                type="button" 
                onClick={() => setStartIndex(Math.min(avatars.length - 5, startIndex + 5))} 
                disabled={startIndex + 5 >= avatars.length}
                className="shrink-0 w-8 h-8 rounded-full bg-white/5 hover:bg-white/10 disabled:opacity-30 transition-all flex items-center justify-center cursor-pointer"
              >
                <ChevronRight size={18} className="text-gray-400" />
              </button>
            </div>
            
            {/* Pagination Dots */}
            <div className="flex justify-center items-center gap-1.5 mt-4">
              {[0, 1, 2, 3].map((pageIndex) => (
                <div 
                  key={pageIndex} 
                  className={`h-1.5 rounded-full transition-all duration-200 ${
                    startIndex === pageIndex * 5 ? 'w-4.5 bg-[#A577FF]' : 'w-1.5 bg-white/10'
                  }`}
                />
              ))}
            </div>
          </div>

          {/* Email Anda */}
          <div>
            <label className="block text-sm font-bold text-gray-300 mb-1.5">Your Email</label>
            <input 
              type="email" 
              value={currentEmail} 
              disabled 
              className="w-full px-5 py-3.5 bg-[#0D0524] text-gray-500 font-medium rounded-2xl cursor-not-allowed border-none text-sm" 
            />
          </div>

          {/* Ubah Username */}
          <div>
            <label className="block text-sm font-bold text-gray-300 mb-1.5">Change Username</label>
            <input 
              type="text" 
              required 
              value={editName} 
              onChange={(e) => { setEditName(e.target.value); setError(''); }} 
              placeholder="Your username..."
              className="w-full px-5 py-3.5 bg-[#0D0524] text-white font-semibold rounded-2xl focus:outline-none focus:ring-2 focus:ring-[#A577FF] border border-transparent focus:border-transparent text-sm transition-all" 
            />
            {error && <p className="text-red-400 text-xs mt-2 font-medium px-2">{error}</p>}
          </div>

          {/* Simpan Perubahan Button */}
          <button 
            type="submit" 
            disabled={isSaving}
            className="w-full bg-[#A577FF] hover:bg-[#9161eb] disabled:opacity-70 text-white font-bold py-3.5 rounded-2xl transition-all shadow-[0_4px_14px_rgba(165,119,255,0.3)] mt-2 cursor-pointer text-sm"
          >
            {isSaving ? 'Saving...' : 'Save Changes'}
          </button>
        </form>

        {/* Delete account | Log out */}
        <div className="mt-8 pt-4 border-t border-white/10 flex justify-end items-center gap-3">
          <button 
            type="button"
            onClick={handleDeleteAccount} 
            disabled={isDeleting}
            className="text-xs font-bold text-red-400 hover:text-red-300 hover:underline disabled:opacity-50 transition-colors cursor-pointer"
          >
            {isDeleting ? 'Deleting...' : 'Delete account'}
          </button>
          <span className="text-gray-600 text-xs">|</span>
          <button 
            type="button"
            onClick={handleLogout} 
            className="text-xs font-bold text-gray-400 hover:text-white transition-colors cursor-pointer"
          >
            Log out
          </button>
        </div>
      </div>
    </div>
  );
}