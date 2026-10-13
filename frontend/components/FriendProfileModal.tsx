import React from 'react';
import { X, MessageSquare, Phone, Video, UserCheck, UserPlus } from 'lucide-react';

export default function FriendProfileModal({ 
  isOpen, 
  onClose, 
  friend,
  onUnfriend,
  onMessage,
  onCall
}: { 
  isOpen: boolean; 
  onClose: () => void; 
  friend: any;
  onUnfriend?: (f: any) => void;
  onMessage?: (f: any) => void;
  onCall?: (f: any, isVideo: boolean) => void;
}) {
  if (!isOpen || !friend) return null;

  return (
    <div 
      className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4"
      onClick={onClose}
    >
      <div 
        className="bg-[#150A35] border border-white/10 rounded-3xl w-full max-w-xs overflow-hidden shadow-[0_0_40px_rgba(0,0,0,0.8)] relative p-8 flex flex-col items-center"
        onClick={(e) => e.stopPropagation()}
      >
        
        {/* Top Right Action */}
        <div className="absolute top-5 right-5 flex items-center gap-2">
          <button 
            onClick={() => onUnfriend && onUnfriend(friend)}
            className="w-8 h-8 rounded-full bg-white/5 flex items-center justify-center text-gray-400 hover:text-white hover:bg-white/10 transition-colors" title="Unfriend">
            <UserCheck size={16} className="text-green-400" />
          </button>
          <button onClick={onClose} className="w-8 h-8 rounded-full bg-white/5 flex items-center justify-center text-gray-400 hover:text-white hover:bg-white/10 transition-colors">
            <X size={16} />
          </button>
        </div>

        {/* Avatar */}
        <div className="w-24 h-24 rounded-full p-1 bg-gradient-to-b from-[#A577FF] to-transparent shadow-[0_0_20px_rgba(165,119,255,0.3)] mb-4 mt-2">
          <img src={`https://api.dicebear.com/7.x/adventurer/svg?seed=${friend.seed}&backgroundColor=${friend.color}`} alt={friend.seed} className="w-full h-full rounded-full object-cover border-4 border-[#150A35]" />
        </div>

        {/* Username */}
        <h3 className="text-2xl font-bold text-white mb-1">{friend.seed}</h3>
        <p className="text-xs text-gray-400 mb-8">
          {friend.status === 'bg-red-500' || friend.label === 'In Game'
            ? (friend.gameName || 'Elden Ring')
            : friend.status === 'bg-yellow-500'
              ? (friend.channelName || 'Lobby')
              : (friend.label || 'Online')}
        </p>

        {/* Action Buttons */}
        <div className="flex items-center gap-3 w-full justify-center">
          <button onClick={() => onMessage && onMessage(friend)} className="flex-1 flex flex-col items-center justify-center gap-2 bg-white/5 hover:bg-white/10 border border-white/5 rounded-2xl py-3 transition-colors group">
            <MessageSquare size={18} className="text-gray-400 group-hover:text-[#A577FF]" />
            <span className="text-[10px] font-bold text-gray-400 group-hover:text-white">Message</span>
          </button>
          <button onClick={() => onCall && onCall(friend, false)} className="flex-1 flex flex-col items-center justify-center gap-2 bg-white/5 hover:bg-white/10 border border-white/5 rounded-2xl py-3 transition-colors group">
            <Phone size={18} className="text-gray-400 group-hover:text-green-400" />
            <span className="text-[10px] font-bold text-gray-400 group-hover:text-white">Call</span>
          </button>
          <button onClick={() => onCall && onCall(friend, true)} className="flex-1 flex flex-col items-center justify-center gap-2 bg-white/5 hover:bg-white/10 border border-white/5 rounded-2xl py-3 transition-colors group">
            <Video size={18} className="text-gray-400 group-hover:text-blue-400" />
            <span className="text-[10px] font-bold text-gray-400 group-hover:text-white">Video</span>
          </button>
        </div>

      </div>
    </div>
  );
}
