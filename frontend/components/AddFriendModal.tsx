import React, { useState } from 'react';
import { X, Check } from 'lucide-react';

export default function AddFriendModal({ 
  isOpen, 
  onClose,
  onAcceptFriend
}: { 
  isOpen: boolean, 
  onClose: () => void,
  onAcceptFriend?: (friend: any) => void
}) {
  const [username, setUsername] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [loading, setLoading] = useState(false);

  const [friendRequests, setFriendRequests] = useState([
    { name: 'pocha', seed: 'Pocha', color: 'F9EBD8' },
    { name: 'leci', seed: 'Leci', color: 'F2C8F7' }
  ]);

  // Dummy registered users for mockup fallback
  const REGISTERED_USERS = ['luna', 'jasper', 'mimi', 'pocha', 'leci'];

  const handleAddFriend = async () => {
    const trimmed = username.trim();
    if (!trimmed) return;
    setLoading(true);
    setError('');
    setSuccess('');

    try {
      const res = await fetch(`/api/user/search?query=${encodeURIComponent(trimmed)}`);
      const data = await res.json();

      if (!res.ok || !data.found) {
        setError(data.message || 'Username is not registered!');
        setSuccess('');
      } else {
        setError('');
        const targetName = data.user.name || trimmed;
        setSuccess(`Friend request sent to ${targetName}!`);
        setTimeout(() => {
          setSuccess('');
          setUsername('');
          onClose();
        }, 1500);
      }
    } catch (err) {
      if (REGISTERED_USERS.includes(trimmed.toLowerCase())) {
        setError('');
        setSuccess(`Friend request sent to ${trimmed}!`);
        setTimeout(() => {
          setSuccess('');
          setUsername('');
          onClose();
        }, 1500);
      } else {
        setError('Username is not registered!');
      }
    } finally {
      setLoading(false);
    }
  };

  const handleAccept = (req: any) => {
    setFriendRequests(prev => prev.filter(r => r.name !== req.name));
    if (onAcceptFriend) {
      onAcceptFriend(req);
    }
  };

  const handleReject = (req: any) => {
    setFriendRequests(prev => prev.filter(r => r.name !== req.name));
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
          <button onClick={() => { onClose(); setError(''); setSuccess(''); setUsername(''); }} className="absolute top-4 right-4 text-gray-400 hover:text-white transition-colors">
            <X size={20} />
          </button>
          
          <div className="flex justify-between items-start mb-6">
            <div>
              <h2 className="text-xl font-bold text-white mb-2 uppercase tracking-wide">Add Friend</h2>
              <p className="text-sm text-gray-400">You can add friends with their Cozy username.</p>
            </div>
            {/* Mascot Placeholder */}
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
              {loading ? 'Searching...' : 'Send Friend Request'}
            </button>
          </div>
          {error && <p className="text-red-400 text-xs mt-2 font-medium px-2">{error}</p>}
          {success && <p className="text-green-400 text-xs mt-2 font-medium px-2">{success}</p>}

          {/* Friend Requests List */}
          {friendRequests.length > 0 && (
            <div className="mt-8 pt-6 border-t border-white/10">
              <h3 className="text-gray-400 text-xs font-bold uppercase tracking-wider mb-4">Friend Requests — {friendRequests.length}</h3>
              <div className="space-y-2 max-h-[40vh] overflow-y-auto custom-scrollbar pr-2 overscroll-contain">
                {friendRequests.map((req, idx) => (
                  <div key={idx} className="flex items-center justify-between p-3 bg-white/5 hover:bg-white/10 rounded-xl transition-colors border border-white/5">
                    <div className="flex items-center gap-3">
                      <img src={`https://api.dicebear.com/7.x/adventurer/svg?seed=${req.seed}&backgroundColor=${req.color}`} alt={req.name} className="w-10 h-10 rounded-full object-cover border-2 border-[#150A35]" />
                      <span className="text-white font-bold text-sm">{req.name}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <button onClick={() => handleAccept(req)} className="w-8 h-8 rounded-full bg-white/5 hover:bg-green-500/20 text-gray-400 hover:text-green-400 flex items-center justify-center transition-colors">
                        <Check size={16} />
                      </button>
                      <button onClick={() => handleReject(req)} className="w-8 h-8 rounded-full bg-white/5 hover:bg-red-500/20 text-gray-400 hover:text-red-400 flex items-center justify-center transition-colors">
                        <X size={16} />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
