"use client";

import React, { useState, useEffect } from 'react';
import { X, Check, Users } from 'lucide-react';

export default function AddFriendModal({ 
  isOpen, 
  onClose,
  onAcceptFriend,
  currentUserName
}: { 
  isOpen: boolean, 
  onClose: () => void,
  onAcceptFriend?: (friend: any) => void,
  currentUserName?: string
}) {
  const [username, setUsername] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [loading, setLoading] = useState(false);
  const [friendRequests, setFriendRequests] = useState<any[]>([]);

  // Fetch pending friend requests from Supabase PostgreSQL when modal opens
  const fetchPendingRequests = () => {
    const url = currentUserName 
      ? `/api/friends?username=${encodeURIComponent(currentUserName)}`
      : '/api/friends';
    fetch(url)
      .then(res => res.json())
      .then(data => {
        if (data.pendingRequests && Array.isArray(data.pendingRequests)) {
          setFriendRequests(data.pendingRequests);
        }
      })
      .catch(err => console.error("Error loading pending requests:", err));
  };

  useEffect(() => {
    if (isOpen) {
      fetchPendingRequests();
      setError('');
      setSuccess('');
    }
  }, [isOpen, currentUserName]);

  // Send a real friend request to another user
  const handleAddFriend = async () => {
    const trimmed = username.trim();
    if (!trimmed) return;
    setLoading(true);
    setError('');
    setSuccess('');

    try {
      const res = await fetch('/api/friends', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ targetUsername: trimmed, senderName: currentUserName })
      });
      const data = await res.json();

      if (!res.ok || !data.success) {
        setError(data.error ? `${data.message} (${data.error})` : (data.message || 'Failed to send friend request.'));
      } else {
        setSuccess(data.message || `Friend request sent to ${trimmed}!`);
        setUsername('');
      }
    } catch (err: any) {
      setError(err?.message || 'Error connecting to server.');
    } finally {
      setLoading(false);
    }
  };

  // Accept a friend request
  const handleAccept = async (req: any) => {
    try {
      if (req.id && !req.id.startsWith('dummy_')) {
        const res = await fetch('/api/friends/respond', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ requestId: req.id, action: 'accept', username: currentUserName })
        });
        const data = await res.json();
        if (data.success) {
          setFriendRequests(prev => prev.filter(r => r.id !== req.id));
          if (onAcceptFriend) {
            onAcceptFriend(data.friend || req);
          }
          return;
        }
      }

      // Local fallback
      setFriendRequests(prev => prev.filter(r => r.name !== req.name));
      if (onAcceptFriend) {
        onAcceptFriend(req);
      }
    } catch (err) {
      console.error("Accept friend error:", err);
    }
  };

  // Reject a friend request
  const handleReject = async (req: any) => {
    try {
      if (req.id && !req.id.startsWith('dummy_')) {
        await fetch('/api/friends/respond', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ requestId: req.id, action: 'reject' })
        });
      }
      setFriendRequests(prev => prev.filter(r => (r.id ? r.id !== req.id : r.name !== req.name)));
    } catch (err) {
      console.error("Reject friend error:", err);
    }
  };

  if (!isOpen) return null;

  return (
    <div 
      className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4"
      onClick={() => { onClose(); setError(''); setSuccess(''); setUsername(''); }}
    >
      <div 
        className="bg-[#150A35] border border-white/10 rounded-2xl w-full max-w-lg overflow-hidden shadow-[0_0_40px_rgba(0,0,0,0.8)] relative"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="p-8">
          <button onClick={() => { onClose(); setError(''); setSuccess(''); setUsername(''); }} className="absolute top-4 right-4 text-gray-400 hover:text-white transition-colors cursor-pointer">
            <X size={20} />
          </button>
          
          <div className="flex justify-between items-start mb-6">
            <div>
              <h2 className="text-xl font-bold text-white mb-2 uppercase tracking-wide">Add Friend</h2>
              <p className="text-sm text-gray-400">You can add friends with their Cozy username.</p>
            </div>
            {/* Mascot Icon */}
            <div className="w-16 h-16 bg-[url('https://api.dicebear.com/7.x/bottts/svg?seed=cozy&backgroundColor=transparent')] bg-cover opacity-80" />
          </div>

          <div className="bg-[#0D0524] rounded-xl p-2 flex items-center border border-white/5 focus-within:border-[#A577FF] transition-colors relative">
            <input 
              type="text" 
              value={username}
              onChange={(e) => { setUsername(e.target.value); setError(''); setSuccess(''); }}
              onKeyDown={(e) => { if (e.key === 'Enter') handleAddFriend(); }}
              placeholder="Enter a username" 
              className="flex-1 bg-transparent border-none text-white px-4 py-2 focus:outline-none text-sm placeholder-gray-600" 
            />
            <button 
              onClick={handleAddFriend} 
              disabled={loading}
              className="bg-[#A577FF] hover:bg-[#9161eb] disabled:opacity-60 text-white text-sm font-bold py-2.5 px-5 rounded-lg transition-colors shrink-0 shadow-lg cursor-pointer"
            >
              {loading ? 'Sending...' : 'Send Friend Request'}
            </button>
          </div>
          {error && <p className="text-red-400 text-xs mt-2 font-medium px-2 animate-in fade-in">{error}</p>}
          {success && <p className="text-emerald-400 text-xs mt-2 font-medium px-2 animate-in fade-in">{success}</p>}

          {/* Friend Requests List */}
          <div className="mt-8 pt-6 border-t border-white/10">
            <h3 className="text-gray-400 text-xs font-bold uppercase tracking-wider mb-4">
              Friend Requests — {friendRequests.length}
            </h3>
            
            {friendRequests.length === 0 ? (
              <div className="text-center py-6 text-gray-500 text-xs">
                No pending friend requests.
              </div>
            ) : (
              <div className="space-y-2 max-h-[40vh] overflow-y-auto custom-scrollbar pr-2 overscroll-contain">
                {friendRequests.map((req, idx) => (
                  <div key={req.id || idx} className="flex items-center justify-between p-3 bg-white/5 hover:bg-white/10 rounded-xl transition-colors border border-white/5">
                    <div className="flex items-center gap-3">
                      <img 
                        src={req.avatar || `https://api.dicebear.com/7.x/adventurer/svg?seed=${req.name}&backgroundColor=F9EBD8`} 
                        alt={req.name} 
                        className="w-10 h-10 rounded-full object-cover border-2 border-[#150A35]" 
                      />
                      <div className="flex flex-col">
                        <span className="text-white font-bold text-sm">{req.name}</span>
                        {req.email && <span className="text-[10px] text-gray-500">{req.email}</span>}
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <button 
                        onClick={() => handleAccept(req)} 
                        title="Accept friend request"
                        className="w-8 h-8 rounded-full bg-white/5 hover:bg-green-500/20 text-gray-400 hover:text-green-400 flex items-center justify-center transition-colors cursor-pointer"
                      >
                        <Check size={16} />
                      </button>
                      <button 
                        onClick={() => handleReject(req)} 
                        title="Decline friend request"
                        className="w-8 h-8 rounded-full bg-white/5 hover:bg-red-500/20 text-gray-400 hover:text-red-400 flex items-center justify-center transition-colors cursor-pointer"
                      >
                        <X size={16} />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
