import React, { useState, useRef } from 'react';
import { X, Users, Sparkles, Upload, Image as ImageIcon } from 'lucide-react';

interface CreateGroupModalProps {
  isOpen: boolean;
  onClose: () => void;
  onCreateGroup: (groupData: { name: string; icon: string; description: string }) => void;
  creatorName: string;
}

export default function CreateGroupModal({
  isOpen,
  onClose,
  onCreateGroup,
  creatorName
}: CreateGroupModalProps) {
  const [groupName, setGroupName] = useState('');
  const [description, setDescription] = useState('');
  const [selectedIcon, setSelectedIcon] = useState('#3');
  const [uploadedImage, setUploadedImage] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const ICON_OPTIONS = ['#1', '#2', '#3', '🎮', '🎧', '☕', '✨', '🔥', '👾'];

  if (!isOpen) return null;

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = () => {
        setUploadedImage(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!groupName.trim()) return;

    onCreateGroup({
      name: groupName.trim(),
      icon: uploadedImage || selectedIcon,
      description: description.trim() || 'Welcome to our cozy group community!'
    });

    setGroupName('');
    setDescription('');
    setSelectedIcon('#3');
    setUploadedImage(null);
    onClose();
  };

  return (
    <div 
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-md animate-in fade-in duration-200"
      onClick={onClose}
    >
      <div 
        className="w-full max-w-md bg-[#150A35] border border-white/10 rounded-3xl p-6 shadow-2xl relative animate-in zoom-in-95 duration-200"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Close Button */}
        <button 
          onClick={onClose}
          className="absolute top-5 right-5 w-8 h-8 rounded-full bg-white/5 hover:bg-white/10 flex items-center justify-center text-gray-400 hover:text-white transition-colors"
        >
          <X size={18} />
        </button>

        {/* Header */}
        <div className="flex items-center gap-3 mb-6">
          <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-[#A577FF] to-[#7065D4] flex items-center justify-center text-white shadow-[0_0_20px_rgba(165,119,255,0.4)]">
            <Users size={24} />
          </div>
          <div>
            <h2 className="text-xl font-bold text-white">Create New Group</h2>
            <p className="text-xs text-gray-400">Create chat rooms and voice channels with friends</p>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Group Icon / Upload Photo */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="text-xs font-semibold text-gray-300">Group Icon / Profile Photo</label>
              <button 
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="text-xs text-[#A577FF] hover:underline flex items-center gap-1 font-bold cursor-pointer"
              >
                <Upload size={12} /> Upload Photo
              </button>
              <input 
                ref={fileInputRef}
                type="file" 
                accept="image/*" 
                className="hidden" 
                onChange={handleFileChange}
              />
            </div>

            {uploadedImage ? (
              <div className="flex items-center gap-3 p-2 bg-white/5 rounded-2xl border border-white/10 mb-2">
                <img src={uploadedImage} alt="Uploaded" className="w-12 h-12 rounded-xl object-cover border border-[#A577FF]" />
                <div className="flex-1 min-w-0">
                  <span className="text-xs font-bold text-white block">Selected Photo</span>
                  <span className="text-[10px] text-gray-400">Will be used as group profile</span>
                </div>
                <button 
                  type="button" 
                  onClick={() => setUploadedImage(null)}
                  className="text-xs text-red-400 hover:text-red-300 px-2 py-1 bg-red-500/10 rounded-lg font-bold cursor-pointer"
                >
                  Remove
                </button>
              </div>
            ) : (
              <div className="flex items-center gap-1.5 justify-between">
                {ICON_OPTIONS.map((icon) => (
                  <button
                    key={icon}
                    type="button"
                    onClick={() => {
                      setSelectedIcon(icon);
                      setUploadedImage(null);
                    }}
                    className={`w-9 h-9 rounded-xl flex items-center justify-center text-xs font-bold transition-all shrink-0 cursor-pointer ${
                      selectedIcon === icon && !uploadedImage
                        ? 'bg-[#A577FF] text-white shadow-[0_0_12px_rgba(165,119,255,0.5)] scale-105' 
                        : 'bg-white/5 text-gray-400 hover:text-white hover:bg-white/10'
                    }`}
                  >
                    {icon}
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Group Name */}
          <div>
            <label className="block text-xs font-semibold text-gray-300 mb-1.5">Group Name</label>
            <input 
              type="text" 
              placeholder="e.g. Gaming Room, Chill Hangout..."
              value={groupName}
              onChange={(e) => setGroupName(e.target.value)}
              required
              autoFocus
              className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-2.5 text-sm text-white placeholder-gray-500 focus:outline-none focus:border-[#A577FF] focus:ring-1 focus:ring-[#A577FF] transition-all"
            />
          </div>

          {/* Group Description */}
          <div>
            <label className="block text-xs font-semibold text-gray-300 mb-1.5">Description (Optional)</label>
            <textarea 
              placeholder="Write a description or topic for this group..."
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={3}
              className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-2 text-sm text-white placeholder-gray-500 focus:outline-none focus:border-[#A577FF] focus:ring-1 focus:ring-[#A577FF] transition-all resize-none"
            />
          </div>

          {/* Info Creator */}
          <div className="bg-white/[0.02] border border-white/5 rounded-xl p-3 flex items-center justify-between text-xs text-gray-400">
            <span>Group Creator:</span>
            <span className="font-bold text-[#A577FF] flex items-center gap-1">
              <Sparkles size={12} /> {creatorName}
            </span>
          </div>

          {/* Action Buttons */}
          <div className="flex items-center justify-end gap-3 pt-2">
            <button 
              type="button" 
              onClick={onClose}
              className="px-4 py-2.5 rounded-xl text-xs font-bold text-gray-400 hover:text-white hover:bg-white/5 transition-colors cursor-pointer"
            >
              Cancel
            </button>
            <button 
              type="submit" 
              disabled={!groupName.trim()}
              className="px-5 py-2.5 rounded-xl text-xs font-bold bg-gradient-to-r from-[#A577FF] to-[#7065D4] text-white hover:opacity-90 disabled:opacity-50 disabled:cursor-not-allowed shadow-[0_4px_14px_rgba(165,119,255,0.4)] transition-all flex items-center gap-2 cursor-pointer"
            >
              Create Group
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
