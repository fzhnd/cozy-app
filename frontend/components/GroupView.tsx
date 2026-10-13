import React, { useState, useRef, useEffect } from 'react';
import { 
  Volume2, Plus, Trash2, Crown, UserPlus, LogOut, PhoneOff, 
  Mic, MicOff, Gamepad2, Headphones, Coffee, Users, Send, Paperclip, Smile, 
  Image, Film, FileText, Music, Link as LinkIcon, 
  ChevronDown, ChevronUp, Check, X, AlertTriangle, Sparkles, MessageSquare, Moon,
  Search, ShieldAlert, Radio, MoreVertical, Globe, Lock, Shield, UserMinus,
  Camera, Upload, Settings
} from 'lucide-react';
import WatchTogetherModal from './WatchTogetherModal';

export const renderChannelIcon = (icon?: string, size = 18) => {
  if (!icon || icon === '🔊' || icon === 'volume') {
    return <Volume2 size={size} />;
  }
  if (icon === '🎮' || icon === 'console' || icon === 'gamepad') {
    return <Gamepad2 size={size} />;
  }
  if (icon === '🎧' || icon === 'headphones') {
    return <Headphones size={size} />;
  }
  if (icon === '☕' || icon === 'coffee') {
    return <Coffee size={size} />;
  }
  if (icon === '🌙' || icon === 'moon') {
    return <Moon size={size} />;
  }
  if (icon === '💬' || icon === 'chat' || icon === 'message') {
    return <Moon size={size} />;
  }
  if (icon === '✨' || icon === 'sparkles') {
    return <Sparkles size={size} />;
  }
  return (
    <span 
      className="inline-flex items-center justify-center leading-none text-center select-none" 
      style={{ fontSize: `${size}px` }}
    >
      {icon}
    </span>
  );
};

export const getChannelIcon = (c?: { name?: string; icon?: string } | null | string): string => {
  if (!c) return '🔊';
  if (typeof c === 'string') {
    if (c !== '🔊' && c !== 'volume') return c;
    return '🔊';
  }
  if (c.icon && c.icon !== '🔊' && c.icon !== 'volume') return c.icon;
  const nameLower = (c.name || '').toLowerCase();
  if (nameLower.includes('rank') || nameLower.includes('game') || nameLower.includes('mabar') || nameLower.includes('play') || nameLower.includes('custom') || nameLower.includes('lejen') || nameLower.includes('mlbb')) {
    return '🎮';
  }
  if (nameLower.includes('music') || nameLower.includes('musik') || nameLower.includes('chill') || nameLower.includes('lofi') || nameLower.includes('song') || nameLower.includes('lagu') || nameLower.includes('dengar')) {
    return '🎧';
  }
  if (nameLower.includes('coffee') || nameLower.includes('kopi') || nameLower.includes('nongkrong') || nameLower.includes('cafe')) {
    return '☕';
  }
  if (nameLower.includes('chat') || nameLower.includes('obrolan') || nameLower.includes('talk') || nameLower.includes('diskusi') || nameLower.includes('curhat') || nameLower.includes('night') || nameLower.includes('moon')) {
    return '🌙';
  }
  if (nameLower.includes('vip') || nameLower.includes('sparkle') || nameLower.includes('star') || nameLower.includes('bintang')) {
    return '✨';
  }
  return c.icon || '🔊';
};

export interface GroupChannel {
  id: string;
  name: string;
  icon?: string;
  activeUsers?: number;
  isPublic?: boolean;
}

export interface GroupMember {
  id: string;
  name: string;
  role: 'owner' | 'admin' | 'member';
  avatar: string;
  status: string;
}

export interface GroupData {
  id: string;
  name: string;
  icon: string;
  description?: string;
  isCreator: boolean;
  creatorName: string;
  channels: GroupChannel[];
  members: GroupMember[];
  messages: Array<{
    id: string;
    sender: string;
    avatar: string;
    text: string;
    time: string;
    isUser?: boolean;
    attachment?: {
      type: 'image' | 'video' | 'doc' | 'audio';
      name: string;
      url?: string;
      size?: string;
    };
  }>;
}

interface GroupViewProps {
  group: GroupData;
  userName: string;
  userImage: string;
  friendsList: Array<{ name: string; seed: string; color: string; status: string; label?: string }>;
  initialChannelId?: string | null;
  onUpdateGroupName: (groupId: string, newName: string) => void;
  onDeleteGroup: (groupId: string) => void;
  onAddChannel: (groupId: string, channelName: string, icon?: string, isPublic?: boolean) => void;
  onDeleteChannel?: (groupId: string, channelId: string) => void;
  onToggleChannelPublic?: (groupId: string, channelId: string, isPublic: boolean) => void;
  onRenameChannel?: (groupId: string, channelId: string, newName: string, newIcon?: string) => void;
  onUpdateGroupIcon?: (groupId: string, newIcon: string) => void;
  onGoHome?: () => void;
  onLeaveChannel?: () => void;
  onChannelActiveChange?: (channel: GroupChannel | null) => void;
  onInsideVoiceRoomChange?: (isInside: boolean) => void;
}

export default function GroupView({
  group,
  userName,
  userImage,
  friendsList,
  initialChannelId,
  onUpdateGroupName,
  onDeleteGroup,
  onAddChannel,
  onDeleteChannel,
  onToggleChannelPublic,
  onRenameChannel,
  onUpdateGroupIcon,
  onGoHome,
  onLeaveChannel,
  onChannelActiveChange,
  onInsideVoiceRoomChange
}: GroupViewProps) {
  // Navigation & Sub-views
  const [activeChannel, setActiveChannel] = useState<GroupChannel | null>(null);

  // Sync inside voice room state with parent
  useEffect(() => {
    if (onInsideVoiceRoomChange) {
      onInsideVoiceRoomChange(activeChannel !== null);
    }
  }, [activeChannel, onInsideVoiceRoomChange]);

  useEffect(() => {
    return () => {
      if (onInsideVoiceRoomChange) {
        onInsideVoiceRoomChange(false);
      }
    };
  }, [onInsideVoiceRoomChange]);

  // Group Settings Modal (Menggantikan Icon Sampah & Klik 2x)
  const [isGroupSettingsOpen, setIsGroupSettingsOpen] = useState(false);
  const [settingsName, setSettingsName] = useState(group.name);
  const [settingsIcon, setSettingsIcon] = useState(group.icon);
  const settingsPhotoInputRef = useRef<HTMLInputElement | null>(null);

  // Delete Group Warning Modal
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);

  // Create Channel Modal
  const [isCreateChannelOpen, setIsCreateChannelOpen] = useState(false);
  const [newChannelName, setNewChannelName] = useState('');
  const [newChannelIcon, setNewChannelIcon] = useState('🔊');
  const [newChannelIsPublic, setNewChannelIsPublic] = useState(false);

  // Channel Context Menu (Anchored to Three Dots Button & Floating into Chat Area)
  const [channelMenuOpenId, setChannelMenuOpenId] = useState<string | null>(null);
  const [menuAnchorRect, setMenuAnchorRect] = useState<DOMRect | null>(null);
  const [editingChannelName, setEditingChannelName] = useState('');
  const [editingChannelIcon, setEditingChannelIcon] = useState('🔊');

  // Chat Message Search & Jump
  const [isChatSearchOpen, setIsChatSearchOpen] = useState(false);
  const [chatSearchQuery, setChatSearchQuery] = useState('');

  // Shared Files Expandable Preview Category
  const [expandedSharedCat, setExpandedSharedCat] = useState<string | null>(null);

  // Members List State (13+ Members for Smooth Scrolling)
  const [membersList, setMembersList] = useState<GroupMember[]>(() => {
    const base = [
      { id: 'm-0', name: userName, role: 'owner' as const, avatar: userImage, status: 'bg-green-500' },
      { id: 'm-1', name: 'Luna', role: 'admin' as const, avatar: 'https://api.dicebear.com/7.x/adventurer/svg?seed=Luna&backgroundColor=F9EBD8', status: 'bg-red-500' },
      { id: 'm-2', name: 'Jasper', role: 'admin' as const, avatar: 'https://api.dicebear.com/7.x/adventurer/svg?seed=Jasper&backgroundColor=F9EBD8', status: 'bg-green-500' },
      { id: 'm-3', name: 'Mimi', role: 'member' as const, avatar: 'https://api.dicebear.com/7.x/adventurer/svg?seed=Mimi&backgroundColor=8CC6C5', status: 'bg-yellow-500' },
      { id: 'm-4', name: 'Felix', role: 'member' as const, avatar: 'https://api.dicebear.com/7.x/adventurer/svg?seed=Felix&backgroundColor=F2C8F7', status: 'bg-gray-500' },
      { id: 'm-5', name: 'Oscar', role: 'member' as const, avatar: 'https://api.dicebear.com/7.x/adventurer/svg?seed=Oscar&backgroundColor=A577FF', status: 'bg-green-500' },
      { id: 'm-6', name: 'Aneka', role: 'member' as const, avatar: 'https://api.dicebear.com/7.x/adventurer/svg?seed=Aneka&backgroundColor=A577FF', status: 'bg-red-500' },
      { id: 'm-7', name: 'Chloe', role: 'member' as const, avatar: 'https://api.dicebear.com/7.x/adventurer/svg?seed=Chloe&backgroundColor=F9EBD8', status: 'bg-green-500' },
      { id: 'm-8', name: 'Ryan', role: 'member' as const, avatar: 'https://api.dicebear.com/7.x/adventurer/svg?seed=Ryan&backgroundColor=8CC6C5', status: 'bg-yellow-500' },
      { id: 'm-9', name: 'Sarah', role: 'member' as const, avatar: 'https://api.dicebear.com/7.x/adventurer/svg?seed=Sarah&backgroundColor=F2C8F7', status: 'bg-green-500' },
      { id: 'm-10', name: 'David', role: 'member' as const, avatar: 'https://api.dicebear.com/7.x/adventurer/svg?seed=David&backgroundColor=A577FF', status: 'bg-gray-500' },
      { id: 'm-11', name: 'Kina', role: 'member' as const, avatar: 'https://api.dicebear.com/7.x/adventurer/svg?seed=Kina&backgroundColor=F9EBD8', status: 'bg-green-500' },
      { id: 'm-12', name: 'Bush', role: 'member' as const, avatar: 'https://api.dicebear.com/7.x/adventurer/svg?seed=Bush&backgroundColor=8CC6C5', status: 'bg-red-500' },
    ];
    return base;
  });

  // Selected Member Action Modal (from Members List)
  const [selectedListMember, setSelectedListMember] = useState<GroupMember | null>(null);

  // Invite Members Modal
  const [isInviteModalOpen, setIsInviteModalOpen] = useState(false);
  const [invitedFriends, setInvitedFriends] = useState<string[]>([]);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  // Normal Chat State
  const [chatMessages, setChatMessages] = useState(group.messages);
  const [inputText, setInputText] = useState('');
  const [isAttachmentOpen, setIsAttachmentOpen] = useState(false);
  const [isEmojiOpen, setIsEmojiOpen] = useState(false);
  const [emojiSearchText, setEmojiSearchText] = useState('');
  const chatAttachmentInputRef = useRef<HTMLInputElement | null>(null);
  const [attachmentType, setAttachmentType] = useState<'image' | 'video' | 'doc' | 'audio'>('image');

  // 16 Kursi (4x4 Grid)
  const [seats, setSeats] = useState<Array<{
    id: number;
    user: { name: string; avatar: string; isSelf?: boolean; role?: 'owner' | 'admin' | 'member'; isSpeaking?: boolean } | null;
  }>>(() => {
    return Array.from({ length: 16 }, (_, i) => ({ id: i + 1, user: null as any }));
  });

  const [isMuted, setIsMuted] = useState(false);
  const [isGamePickerOpen, setIsGamePickerOpen] = useState(false);
  const [activeGame, setActiveGame] = useState<string | null>(null);
  const [isWatchTogetherOpen, setIsWatchTogetherOpen] = useState(false);

  // Member Action Modal (Stage Seats)
  const [memberActionTarget, setMemberActionTarget] = useState<{
    seatId: number;
    user: { name: string; avatar: string; role?: 'owner' | 'admin' | 'member'; isSelf?: boolean };
  } | null>(null);

  // Audience State
  const [isAudienceModalOpen, setIsAudienceModalOpen] = useState(false);
  const [audienceList, setAudienceList] = useState([
    { name: 'Felix', seed: 'Felix', color: 'F2C8F7', status: 'Listening' },
    { name: 'Oscar', seed: 'Oscar', color: 'A577FF', status: 'Listening' },
    { name: 'Aneka', seed: 'Aneka', color: 'A577FF', status: 'Listening' },
  ]);

  // Voice Channel Chat & Emoji Picker
  const [channelChatMessages, setChannelChatMessages] = useState([
    { id: 'c1', sender: 'Luna', avatar: 'https://api.dicebear.com/7.x/adventurer/svg?seed=Luna&backgroundColor=F9EBD8', text: 'Hello everyone! Can you hear me clearly?', time: '19:40' },
    { id: 'c2', sender: 'Jasper', avatar: 'https://api.dicebear.com/7.x/adventurer/svg?seed=Jasper&backgroundColor=F9EBD8', text: 'Loud and clear! Ready to play?', time: '19:41' },
    { id: 'c3', sender: 'Felix', avatar: 'https://api.dicebear.com/7.x/adventurer/svg?seed=Felix&backgroundColor=F2C8F7', text: 'I am listening while keeping an eye on the chat 🙌', time: '19:42' },
  ]);
  const [channelInputText, setChannelInputText] = useState('');
  const [isChannelEmojiOpen, setIsChannelEmojiOpen] = useState(false);

  // User Permissions
  const isCurrentUserOwner = group.isCreator;
  const isCurrentUserAdmin = isCurrentUserOwner || membersList.find(m => m.name === userName)?.role === 'admin';

  // Initial Channel Handler
  useEffect(() => {
    if (initialChannelId) {
      const found = group.channels.find(c => c.id === initialChannelId);
      if (found) {
        handleEnterChannel(found);
      }
    }
  }, [initialChannelId, group]);

  // Place Owner automatically at Kursi #1 upon entering channel
  const handleEnterChannel = (chan: GroupChannel) => {
    setActiveChannel(chan);
    if (onChannelActiveChange) {
      onChannelActiveChange(chan);
    }
    const newSeats = Array.from({ length: 16 }, (_, i) => ({ id: i + 1, user: null as any }));

    if (group.isCreator) {
      newSeats[0] = {
        id: 1,
        user: { name: userName, avatar: userImage, isSelf: true, role: 'owner', isSpeaking: !isMuted }
      };
    } else {
      newSeats[0] = {
        id: 1,
        user: { name: group.creatorName, avatar: `https://api.dicebear.com/7.x/adventurer/svg?seed=${group.creatorName}&backgroundColor=A577FF`, isSelf: false, role: 'owner', isSpeaking: true }
      };
    }

    newSeats[1] = {
      id: 2,
      user: { name: 'Luna', avatar: 'https://api.dicebear.com/7.x/adventurer/svg?seed=Luna&backgroundColor=F9EBD8', role: 'admin', isSpeaking: true }
    };
    newSeats[2] = {
      id: 3,
      user: { name: 'Jasper', avatar: 'https://api.dicebear.com/7.x/adventurer/svg?seed=Jasper&backgroundColor=F9EBD8', role: 'admin', isSpeaking: false }
    };
    newSeats[3] = {
      id: 4,
      user: { name: 'Mimi', avatar: 'https://api.dicebear.com/7.x/adventurer/svg?seed=Mimi&backgroundColor=8CC6C5', role: 'member', isSpeaking: false }
    };

    setSeats(newSeats);
  };

  useEffect(() => {
    setSettingsName(group.name);
    setSettingsIcon(group.icon);
    setChatMessages(group.messages);
  }, [group]);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3000);
  };

  const handleSaveGroupSettings = () => {
    if (settingsName.trim() && settingsName !== group.name) {
      onUpdateGroupName(group.id, settingsName.trim());
    }
    if (settingsIcon !== group.icon && onUpdateGroupIcon) {
      onUpdateGroupIcon(group.id, settingsIcon);
    }
    showToast('Group settings saved successfully!');
    setIsGroupSettingsOpen(false);
  };

  const handleSettingsPhotoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = () => {
        setSettingsIcon(reader.result as string);
        showToast('Group profile photo selected!');
      };
      reader.readAsDataURL(file);
    }
  };

  const handleCreateChannelSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newChannelName.trim()) return;
    onAddChannel(group.id, newChannelName.trim(), newChannelIcon, newChannelIsPublic);
    setNewChannelName('');
    setNewChannelIcon('🔊');
    setNewChannelIsPublic(false);
    setIsCreateChannelOpen(false);
    showToast('New voice channel created successfully!');
  };

  const handleSaveChannelInline = (chanId: string) => {
    if (onRenameChannel && editingChannelName.trim()) {
      const cleanName = editingChannelName.replace(/^[^\w\s\u00C0-\u024F\u1E00-\u1EFF]+\s*/, '').trim();
      onRenameChannel(group.id, chanId, cleanName, editingChannelIcon);
      showToast('Channel updated successfully!');
    }
    setChannelMenuOpenId(null);
    setMenuAnchorRect(null);
  };

  const handleSendTextMessage = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!inputText.trim()) return;

    const newMsg = {
      id: Date.now().toString(),
      sender: userName,
      avatar: userImage,
      text: inputText.trim(),
      time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      isUser: true
    };
    setChatMessages(prev => [...prev, newMsg]);
    setInputText('');
  };

  const handleSendFileAttachment = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = () => {
        const newMsg = {
          id: Date.now().toString(),
          sender: userName,
          avatar: userImage,
          text: `Sent ${attachmentType}: ${file.name}`,
          time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
          isUser: true,
          attachment: {
            type: attachmentType,
            name: file.name,
            url: reader.result as string,
            size: `${(file.size / (1024 * 1024)).toFixed(1)} MB`
          }
        };
        setChatMessages(prev => [...prev, newMsg]);
        showToast(`File ${file.name} sent successfully!`);
        setIsAttachmentOpen(false);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleSendChannelMessage = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!channelInputText.trim()) return;

    const newMsg = {
      id: Date.now().toString(),
      sender: userName,
      avatar: userImage,
      text: channelInputText.trim(),
      time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      isUser: true
    };
    setChannelChatMessages(prev => [...prev, newMsg]);
    setChannelInputText('');
  };

  // Seat Click (Sit down, stand up, or action)
  const handleSeatClick = (seat: typeof seats[0]) => {
    if (!seat.user) {
      setSeats(prev => prev.map(s => {
        if (s.user?.isSelf) return { ...s, user: null };
        if (s.id === seat.id) {
          return {
            ...s,
            user: {
              name: userName,
              avatar: userImage,
              isSelf: true,
              role: isCurrentUserOwner ? 'owner' : 'member',
              isSpeaking: !isMuted
            }
          };
        }
        return s;
      }));
      showToast(`You took Seat #${seat.id}`);
      return;
    }

    if (seat.user?.isSelf) {
      setSeats(prev => prev.map(s => s.id === seat.id ? { ...s, user: null } : s));
      showToast('You left the seat');
      return;
    }

    if (isCurrentUserOwner || isCurrentUserAdmin) {
      setMemberActionTarget({
        seatId: seat.id,
        user: seat.user
      });
    } else {
      showToast(`Seat occupied by ${seat.user.name}`);
    }
  };

  // Member Management from Members List
  const handleToggleAdminListMember = (targetName: string) => {
    setMembersList(prev => prev.map(m => {
      if (m.name === targetName) {
        const nextRole = m.role === 'admin' ? 'member' : 'admin';
        showToast(nextRole === 'admin' ? `${targetName} is now an Admin!` : `Admin status removed for ${targetName}`);
        return { ...m, role: nextRole };
      }
      return m;
    }));
    setSelectedListMember(null);
  };

  const handleKickFromGroup = (targetName: string) => {
    setMembersList(prev => prev.filter(m => m.name !== targetName));
    setSelectedListMember(null);
    showToast(`${targetName} removed from group`);
  };

  const handleInviteFriend = (friendName: string) => {
    setInvitedFriends(prev => [...prev, friendName]);
    showToast(activeChannel ? `Invitation to channel #${activeChannel.name} sent to ${friendName}!` : `Invitation sent to ${friendName}!`);
  };

  // Full Emoji Set for Emoticon Picker
  const EMOJI_CATEGORIES = [
    { title: 'Recent', emojis: ['🫶', '❤️', '🔥', '😂', '😭', '✨', '🎮', '👍', '🎉', '☕'] },
    { title: 'Smileys & People', emojis: ['😀','😃','😄','😁','😆','😅','🤣','😂','🙂','🙃','😉','😊','😇','🥰','😍','🤩','😘','😗','😋','😛','😜','🤪','😝','🤗','🤭','🤫','🤔','🤐','🤨','😐','😑','😶','😏','😒','🙄','😬','😌','😔','😪','😴','😷','🤒','🤕','🤢','🤮','🤠','🥳','😎','🤓','🧐','😕','😟','🙁','☹️','😮','😯','😲','😳','🥺','😦','😧','😨','😰','😥','😢','😭','😱','😖','😣','😞','😓','😩','😫','🥱','😤','😡','😠','😈','👿','💀','☠️','💩','🤡','👻','👽','👾','🤖'] },
    { title: 'Animals & Nature', emojis: ['🐶','🐱','🐭','🐹','🐰','🦊','🐻','🐼','🐨','🐯','🦁','🐮','🐷','🐸','🐵','🐔','🐧','🐦','🐤','🦆','🦅','🦉','🦇','🐺','🐗','🐴','🦄','🐝','🐛','🦋','🐌','🐞','🐜','🐢','🐍','🦎','🐙','🦑','🦐','🦞','🦀','🐡','🐠','🐟','🐬','🐳','🦈','🐊','🐅','🐆','🦓','🦍','🐘','🦛','🦏','🐪','🐫','🦒','🦘'] },
    { title: 'Food & Drink', emojis: ['🍏','🍎','🍐','🍊','🍋','🍌','🍉','🍇','🍓','🫐','🍈','🍒','🍑','🥭','🍍','🥥','🥝','🍅','🥑','🥦','🌽','🥕','🥐','🍞','🥖','🥨','🧀','🥞','🧇','🥓','🍗','🍔','🍟','🍕','🌮','🌯','🍜','🍝','🍣','🍱','🍦','🍧','🍨','🍩','🍪','🎂','🍰','🧁','🍫','🍬','🍿','☕️','🍵','🧃','🥤','🧋','🍺','🍻','🍷','🥂'] },
    { title: 'Activities & Gaming', emojis: ['🎮','🕹','🎲','♟','🎯','🎳','🎰','🧩','⚽️','🏀','🏈','⚾️','🎾','🏐','🏓','🏸','🏒','🥊','🥋','🛹','🛼','🏆','🥇','🥈','🥉','🏅','🎪','🎨','🎬','🎤','🎧','🎼','🎹','🥁','🎷','🎺','🎸'] },
  ];

  // ==========================================
  // VIEW MODE 1: VOICE CHANNEL STAGE (2 SISI)
  // ==========================================
  if (activeChannel) {
    return (
      <div className="flex h-full w-full bg-[#150A35] text-[#F5F7FC] relative overflow-hidden animate-in fade-in duration-300">
        
        {/* Toast Notification */}
        {toastMessage && (
          <div className="absolute top-5 left-1/2 -translate-x-1/2 bg-white text-[#150A35] px-4 py-2.5 rounded-2xl shadow-2xl flex items-center gap-2.5 z-50 animate-in slide-in-from-top-4 font-bold text-xs">
            <Sparkles size={16} className="text-[#A577FF]" />
            <span>{toastMessage}</span>
          </div>
        )}

        {/* ================= SISI KIRI (VOICE STAGE & 16 KURSI) ================= */}
        <div className="w-7/12 flex flex-col border-r border-white/5 bg-[#12082E] relative p-6 justify-between">
          
          {/* Top: Channel Name & Status */}
          <div className="flex items-center justify-between pb-4 border-b border-white/5">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-2xl bg-[#A577FF]/20 text-[#A577FF] flex items-center justify-center shadow-[0_0_15px_rgba(165,119,255,0.2)] shrink-0">
                {renderChannelIcon(getChannelIcon(activeChannel), 20)}
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h2 className="text-xl font-black text-white tracking-wide">
                    {activeChannel.name.replace(/^[^\w\s\u00C0-\u024F\u1E00-\u1EFF]+\s*/, '')}
                  </h2>
                  <span className="flex items-center gap-1 bg-green-500/20 text-green-400 text-[10px] font-bold px-2 py-0.5 rounded-full border border-green-500/30">
                    <Radio size={10} className="animate-pulse" /> Live Voice
                  </span>
                  {activeChannel.isPublic && (
                    <span className="flex items-center gap-1 bg-blue-500/20 text-blue-400 text-[10px] font-bold px-2 py-0.5 rounded-full border border-blue-500/30">
                      <Globe size={10} /> Public ✓
                    </span>
                  )}
                </div>
                <p className="text-xs text-gray-400">
                  Group: <span className="text-gray-300 font-semibold">{group.name}</span> • 16 Seats Available
                </p>
              </div>
            </div>

            {/* Active game banner if any */}
            {activeGame && (
              <div 
                onClick={() => {
                  if (activeGame.includes('Watch Party') || activeGame.includes('YouTube')) {
                    setIsWatchTogetherOpen(true);
                  }
                }}
                className={`flex items-center gap-2 bg-[#A577FF]/20 border border-[#A577FF]/40 text-[#A577FF] px-3 py-1.5 rounded-xl text-xs font-bold animate-in fade-in ${
                  activeGame.includes('Watch Party') || activeGame.includes('YouTube') ? 'cursor-pointer hover:bg-[#A577FF]/30 hover:border-[#A577FF]' : ''
                }`}
                title={activeGame.includes('Watch Party') || activeGame.includes('YouTube') ? "Click to open YouTube Watch Together window" : undefined}
              >
                <Gamepad2 size={16} /> Playing: {activeGame}
                {isCurrentUserAdmin && (
                  <button 
                    onClick={(e) => {
                      e.stopPropagation();
                      setActiveGame(null);
                    }} 
                    className="ml-1 text-gray-400 hover:text-white"
                  >
                    <X size={14}/>
                  </button>
                )}
              </div>
            )}
          </div>

          {/* Center: 16 Circular Seats Grid (4x4) */}
          <div className="flex-1 flex flex-col items-center justify-center my-3 overflow-y-auto custom-scrollbar px-2">
            <div className="text-center mb-4">
              <p className="text-xs text-gray-400 font-medium">
                Seat #1 occupied by Owner • Click <span className="text-[#A577FF] font-bold">+</span> to take a seat
              </p>
            </div>

            {/* Grid 4 columns x 4 rows = 16 Seats */}
            <div className="grid grid-cols-4 gap-4 md:gap-6 w-full max-w-lg justify-items-center">
              {seats.map((seat) => {
                const isOccupied = !!seat.user;
                const isSelf = seat.user?.isSelf;
                const isSpeaking = isSelf ? (!isMuted && seat.user?.isSpeaking) : seat.user?.isSpeaking;
                const isOwner = seat.user?.role === 'owner';
                const isAdmin = seat.user?.role === 'admin';

                return (
                  <div 
                    key={seat.id} 
                    onClick={() => handleSeatClick(seat)}
                    className="flex flex-col items-center group cursor-pointer relative"
                  >
                    <div 
                      className={`w-14 h-14 md:w-16 md:h-16 rounded-full flex items-center justify-center relative transition-all duration-300 shadow-lg ${
                        isOccupied 
                          ? isSelf
                            ? 'ring-4 ring-[#A577FF] ring-offset-2 ring-offset-[#12082E] scale-105'
                            : 'border-2 border-white/20'
                          : 'border-2 border-dashed border-white/20 bg-white/5 hover:border-[#A577FF] hover:bg-[#A577FF]/15 hover:scale-110'
                      }`}
                    >
                      {/* Pulsing Wave Animation When Speaking */}
                      {isOccupied && isSpeaking && (
                        <>
                          <span className="absolute -inset-2 rounded-full bg-green-500/30 animate-ping pointer-events-none" />
                          <span className="absolute -inset-1 rounded-full border-2 border-green-400 ring-2 ring-green-400/50 animate-pulse pointer-events-none" />
                        </>
                      )}

                      {isOccupied ? (
                        <>
                          <img 
                            src={seat.user!.avatar} 
                            alt={seat.user!.name} 
                            className="w-full h-full rounded-full object-cover relative z-10"
                          />
                          
                          {/* Role Badge */}
                          {isOwner && (
                            <div className="absolute -top-1 -right-1 w-5 h-5 rounded-full bg-yellow-500 text-white flex items-center justify-center text-[10px] border-2 border-[#12082E] z-20 shadow-md">
                              <Crown size={10} className="fill-white" />
                            </div>
                          )}
                          {!isOwner && isAdmin && (
                            <div className="absolute -top-1 -right-1 w-5 h-5 rounded-full bg-[#A577FF] text-white flex items-center justify-center text-[10px] border-2 border-[#12082E] z-20 shadow-md">
                              <Shield size={10} className="fill-white" />
                            </div>
                          )}

                          {/* Mic indicator */}
                          <div className={`absolute -bottom-1 -right-1 w-5 h-5 rounded-full flex items-center justify-center text-[10px] border-2 border-[#12082E] z-20 ${
                            isSelf && isMuted 
                              ? 'bg-red-500 text-white' 
                              : isSpeaking 
                                ? 'bg-green-500 text-white shadow-[0_0_10px_rgba(34,197,94,0.8)]' 
                                : 'bg-gray-700 text-gray-300'
                          }`}>
                            {isSelf && isMuted ? <MicOff size={10} /> : <Mic size={10} />}
                          </div>
                        </>
                      ) : (
                        <Plus 
                          size={20} 
                          className="text-gray-400 group-hover:text-[#A577FF] group-hover:scale-125 transition-all" 
                        />
                      )}
                    </div>

                    <span className="text-[11px] font-semibold mt-1.5 truncate max-w-[70px] text-center text-gray-300 group-hover:text-white transition-colors flex items-center gap-0.5 justify-center">
                      {isOccupied ? (isSelf ? 'You (Me)' : seat.user!.name) : `Seat ${seat.id}`}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Bottom Bar: Leave & +Game / Mute */}
          <div className="pt-4 border-t border-white/5 flex items-center justify-between">
            <button 
              onClick={() => {
                setActiveChannel(null);
                if (onChannelActiveChange) {
                  onChannelActiveChange(null);
                }
                if (onLeaveChannel) {
                  onLeaveChannel();
                }
              }}
              className="flex items-center gap-2 bg-red-500/15 hover:bg-red-500 text-red-400 hover:text-white px-5 py-2.5 rounded-full font-bold text-xs transition-all shadow-md group cursor-pointer"
            >
              <LogOut size={16} className="group-hover:-translate-x-1 transition-transform" />
              <span>Leave Channel</span>
            </button>

            <div className="flex items-center gap-3">
              {isCurrentUserAdmin && (
                <div className="relative">
                  <button 
                    onClick={() => setIsGamePickerOpen(!isGamePickerOpen)}
                    className="flex items-center gap-2 bg-gradient-to-r from-[#A577FF] to-[#7065D4] hover:opacity-95 text-white px-4 py-2.5 rounded-full font-bold text-xs transition-all shadow-[0_4px_14px_rgba(165,119,255,0.4)]"
                  >
                    <Gamepad2 size={16} />
                    <span>+ Game</span>
                  </button>

                  {isGamePickerOpen && (
                    <>
                      <div className="fixed inset-0 z-40" onClick={() => setIsGamePickerOpen(false)} />
                      <div className="absolute bottom-12 right-0 w-64 bg-[#251A45] border border-white/10 rounded-2xl shadow-2xl p-3 z-50 animate-in fade-in zoom-in-95">
                        <div className="text-xs font-bold text-gray-300 mb-2 px-2 flex items-center justify-between">
                          <span>Start Game Together</span>
                          <span className="text-[10px] text-[#A577FF]">Admin</span>
                        </div>
                        <div className="space-y-1">
                          {[
                            { name: 'Gartic Showdown', icon: '🎨', players: '2-16' },
                            { name: 'Cozy Chess Battle', icon: '♟️', players: '2' },
                            { name: 'Watch Party / YouTube', icon: '🍿', players: 'All' },
                            { name: 'Trivia / Draw', icon: '🎯', players: '2-20' },
                          ].map((game, i) => (
                            <div 
                              key={i}
                              onClick={() => {
                                setActiveGame(game.name);
                                setIsGamePickerOpen(false);
                                if (game.name.includes('Watch Party') || game.name.includes('YouTube')) {
                                  setIsWatchTogetherOpen(true);
                                }
                                showToast(`Game ${game.name} started in the room!`);
                              }}
                              className="flex items-center justify-between p-2 hover:bg-white/5 rounded-xl cursor-pointer transition-colors"
                            >
                              <div className="flex items-center gap-2.5">
                                <span className="text-lg">{game.icon}</span>
                                <div>
                                  <h4 className="text-xs font-bold text-white">{game.name}</h4>
                                  <p className="text-[10px] text-gray-400">{game.players} Players</p>
                                </div>
                              </div>
                              <Plus size={14} className="text-[#A577FF]" />
                            </div>
                          ))}
                        </div>
                      </div>
                    </>
                  )}
                </div>
              )}

              <button 
                onClick={() => {
                  const newMuted = !isMuted;
                  setIsMuted(newMuted);
                  setSeats(prev => prev.map(s => {
                    if (s.user?.isSelf) {
                      return {
                        ...s,
                        user: {
                          ...s.user,
                          isSpeaking: !newMuted
                        }
                      };
                    }
                    return s;
                  }));
                  showToast(newMuted ? 'Microphone muted' : 'Microphone unmuted');
                }}
                className={`flex items-center gap-2 px-4 py-2.5 rounded-full font-bold text-xs transition-all cursor-pointer ${
                  isMuted 
                    ? 'bg-red-500/20 text-red-400 border border-red-500/30 hover:bg-red-500/30' 
                    : 'bg-green-500/20 text-green-400 border border-green-500/30 hover:bg-green-500/30'
                }`}
                title={isMuted ? 'Unmute microphone' : 'Mute microphone'}
              >
                {isMuted ? <MicOff size={16} /> : <Mic size={16} />}
                <span>{isMuted ? 'Unmute' : 'Mute'}</span>
              </button>
            </div>
          </div>
        </div>

        {/* ================= SISI KANAN (CHATS & AUDIENCE INFO) ================= */}
        <div className="w-5/12 flex flex-col bg-[#150A35] relative">
          
          {/* Header Right Side: Participant Info & Invite Button */}
          <div className="p-4 border-b border-white/5 flex items-center justify-between bg-white/[0.01]">
            <div className="relative">
              <button 
                onClick={() => setIsAudienceModalOpen(!isAudienceModalOpen)}
                className="flex items-center gap-2 bg-white/5 hover:bg-white/10 text-gray-300 hover:text-white px-3 py-1.5 rounded-xl text-xs font-semibold transition-colors border border-white/5"
              >
                <Users size={15} className="text-[#A577FF]" />
                <span>{seats.filter(s => s.user).length + audienceList.length} in Channel</span>
                <ChevronDown size={14} className="text-gray-400" />
              </button>

              {isAudienceModalOpen && (
                <>
                  <div className="fixed inset-0 z-40" onClick={() => setIsAudienceModalOpen(false)} />
                  <div className="absolute top-10 left-0 w-72 bg-[#251A45] border border-white/10 rounded-2xl shadow-2xl p-4 z-50 animate-in fade-in slide-in-from-top-2">
                    <div className="flex items-center justify-between pb-2 mb-3 border-b border-white/10">
                      <h4 className="text-xs font-bold text-white">Voice Channel Participants</h4>
                      <button onClick={() => setIsAudienceModalOpen(false)} className="text-gray-400 hover:text-white"><X size={14} /></button>
                    </div>

                    <div className="mb-3">
                      <span className="text-[10px] font-bold text-[#A577FF] uppercase tracking-wider block mb-1.5">
                        🎙️ On Stage / Seated ({seats.filter(s => s.user).length})
                      </span>
                      <div className="space-y-1.5">
                        {seats.filter(s => s.user).map((seat) => (
                          <div key={seat.id} className="flex items-center justify-between text-xs p-1.5 rounded-lg hover:bg-white/5">
                            <div className="flex items-center gap-2">
                              <img src={seat.user!.avatar} className="w-6 h-6 rounded-full" alt="avatar" />
                              <span className="text-gray-200 font-medium">{seat.user!.name}</span>
                            </div>
                            <span className="text-[10px] text-green-400 font-bold bg-green-500/10 px-1.5 py-0.5 rounded">Seat #{seat.id}</span>
                          </div>
                        ))}
                      </div>
                    </div>

                    <div>
                      <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider block mb-1.5">
                        👥 Audience ({audienceList.length})
                      </span>
                      <div className="space-y-1.5 max-h-36 overflow-y-auto custom-scrollbar">
                        {audienceList.map((aud, i) => (
                          <div key={i} className="flex items-center justify-between text-xs p-1.5 rounded-lg hover:bg-white/5">
                            <div className="flex items-center gap-2">
                              <img src={`https://api.dicebear.com/7.x/adventurer/svg?seed=${aud.seed}&backgroundColor=${aud.color}`} className="w-6 h-6 rounded-full" alt="avatar" />
                              <span className="text-gray-300">{aud.name}</span>
                            </div>
                            <span className="text-[10px] text-gray-500">Listening</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                </>
              )}
            </div>

            <button 
              onClick={() => setIsInviteModalOpen(true)}
              className="flex items-center gap-1.5 bg-[#A577FF] hover:bg-[#9161eb] text-white px-3.5 py-1.5 rounded-full text-xs font-bold transition-all shadow-[0_2px_10px_rgba(165,119,255,0.3)] cursor-pointer"
              title="Invite friends to this channel"
            >
              <UserPlus size={14} />
              <span>Invite</span>
            </button>
          </div>

          {/* Channel Chat Column */}
          <div className="flex-1 overflow-y-auto custom-scrollbar p-4 space-y-3">
            <div className="text-center py-2">
              <span className="text-[10px] bg-white/5 text-gray-400 px-3 py-1 rounded-full border border-white/5">
                Channel Chat #{activeChannel.name}
              </span>
            </div>

            {channelChatMessages.map((msg) => (
              <div key={msg.id} className="flex items-start gap-2.5">
                <img src={msg.avatar} alt={msg.sender} className="w-8 h-8 rounded-full shrink-0 border border-white/10" />
                <div className="flex-1 min-w-0">
                  <div className="flex items-baseline gap-2 mb-0.5">
                    <span className="text-xs font-bold text-gray-200">{msg.sender}</span>
                    <span className="text-[9px] text-gray-500">{msg.time}</span>
                  </div>
                  <div className="bg-white/5 border border-white/5 rounded-2xl rounded-tl-sm px-3 py-2 text-xs text-gray-300 leading-relaxed inline-block max-w-[90%] break-words">
                    {msg.text}
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* Channel Chat Input */}
          <div className="p-3 border-t border-white/5 bg-[#12082E]/80 relative">
            {isChannelEmojiOpen && (
              <>
                <div className="fixed inset-0 z-40" onClick={() => setIsChannelEmojiOpen(false)} />
                <div className="absolute bottom-14 right-2 w-72 bg-[#251A45] border border-white/10 rounded-2xl p-3 shadow-2xl z-50 animate-in fade-in zoom-in-95 max-h-60 overflow-y-auto custom-scrollbar">
                  {EMOJI_CATEGORIES.map((cat, idx) => (
                    <div key={idx} className="mb-2">
                      <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider block mb-1">{cat.title}</span>
                      <div className="grid grid-cols-7 gap-1 text-xl">
                        {cat.emojis.map((emoji) => (
                          <button 
                            key={emoji}
                            type="button"
                            onClick={() => {
                              setChannelInputText(prev => prev + emoji);
                              setIsChannelEmojiOpen(false);
                            }}
                            className="hover:scale-125 transition-transform p-1 rounded hover:bg-white/5"
                          >
                            {emoji}
                          </button>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              </>
            )}

            <form onSubmit={handleSendChannelMessage} className="flex items-center gap-2">
              <input 
                type="text" 
                placeholder={`Message in ${activeChannel.name}...`}
                value={channelInputText}
                onChange={(e) => setChannelInputText(e.target.value)}
                className="flex-1 bg-white/5 border border-white/10 rounded-full px-4 py-2 text-xs text-white placeholder-gray-500 focus:outline-none focus:border-[#A577FF] transition-all"
              />
              
              <button 
                type="button" 
                onClick={() => setIsChannelEmojiOpen(!isChannelEmojiOpen)}
                className="text-gray-400 hover:text-white transition-colors p-1"
                title="Choose Emoji"
              >
                <Smile size={18} />
              </button>

              <button 
                type="submit"
                disabled={!channelInputText.trim()}
                className="w-8 h-8 rounded-full bg-[#A577FF] hover:bg-[#9161eb] disabled:opacity-40 text-white flex items-center justify-center transition-all shrink-0"
              >
                <Send size={14} />
              </button>
            </form>
          </div>
        </div>

        {/* Modal Action Member Seat */}
        {memberActionTarget && (
          <div 
            className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-md animate-in fade-in duration-200"
            onClick={() => setMemberActionTarget(null)}
          >
            <div 
              className="w-full max-w-xs bg-[#150A35] border border-white/10 rounded-3xl p-5 shadow-2xl relative animate-in zoom-in-95 duration-200 text-center"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex flex-col items-center mb-4">
                <img src={memberActionTarget.user.avatar} className="w-14 h-14 rounded-full border-2 border-[#A577FF] mb-2" alt="avatar" />
                <h3 className="font-bold text-sm text-white">{memberActionTarget.user.name}</h3>
                <span className="text-[10px] text-gray-400">Seat #{memberActionTarget.seatId} • Role: {memberActionTarget.user.role || 'Member'}</span>
              </div>

              <div className="space-y-1.5">
                {isCurrentUserOwner && (
                  <button 
                    onClick={() => {
                      const isAdm = memberActionTarget.user.role === 'admin';
                      setSeats(prev => prev.map(s => s.user?.name === memberActionTarget.user.name ? { ...s, user: { ...s.user!, role: isAdm ? 'member' : 'admin' } } : s));
                      setMemberActionTarget(null);
                      showToast(isAdm ? `Admin status removed for ${memberActionTarget.user.name}` : `${memberActionTarget.user.name} is now an Admin!`);
                    }}
                    className="w-full flex items-center justify-center gap-2 py-2 px-3 rounded-xl bg-white/5 hover:bg-[#A577FF]/20 text-xs font-bold text-gray-200 hover:text-[#A577FF] transition-colors"
                  >
                    <Shield size={14} />
                    <span>{memberActionTarget.user.role === 'admin' ? 'Remove Admin Status' : 'Make Admin'}</span>
                  </button>
                )}

                <button 
                  onClick={() => {
                    setAudienceList(prev => [...prev, { name: memberActionTarget.user.name, seed: memberActionTarget.user.name, color: '8CC6C5', status: 'Listening' }]);
                    setSeats(prev => prev.map(s => s.id === memberActionTarget.seatId ? { ...s, user: null } : s));
                    setMemberActionTarget(null);
                    showToast(`${memberActionTarget.user.name} moved off stage`);
                  }}
                  className="w-full flex items-center justify-center gap-2 py-2 px-3 rounded-xl bg-white/5 hover:bg-yellow-500/20 text-xs font-bold text-gray-200 hover:text-yellow-400 transition-colors"
                >
                  <ChevronDown size={14} />
                  <span>Move Off Stage</span>
                </button>

                <button 
                  onClick={() => {
                    setSeats(prev => prev.map(s => s.id === memberActionTarget.seatId ? { ...s, user: null } : s));
                    setAudienceList(prev => prev.filter(a => a.name !== memberActionTarget.user.name));
                    setMemberActionTarget(null);
                    showToast(`${memberActionTarget.user.name} removed from channel`);
                  }}
                  className="w-full flex items-center justify-center gap-2 py-2 px-3 rounded-xl bg-white/5 hover:bg-red-500/20 text-xs font-bold text-gray-200 hover:text-red-400 transition-colors"
                >
                  <UserMinus size={14} />
                  <span>Remove from Channel</span>
                </button>

                <button 
                  onClick={() => {
                    setMemberActionTarget(null);
                    showToast(`Group invitation sent to ${memberActionTarget.user.name}!`);
                  }}
                  className="w-full flex items-center justify-center gap-2 py-2 px-3 rounded-xl bg-[#A577FF]/20 hover:bg-[#A577FF] text-xs font-bold text-[#A577FF] hover:text-white transition-colors"
                >
                  <UserPlus size={14} />
                  <span>Invite to Group</span>
                </button>
              </div>

              <button 
                onClick={() => setMemberActionTarget(null)}
                className="mt-4 text-xs text-gray-500 hover:text-white transition-colors font-medium cursor-pointer"
              >
                Close
              </button>
            </div>
          </div>
        )}

        {renderInviteModal()}

        <WatchTogetherModal 
          isOpen={isWatchTogetherOpen}
          onClose={() => setIsWatchTogetherOpen(false)}
          currentUser={{ name: userName, avatar: userImage }}
          roomMembers={membersList}
        />
      </div>
    );
  }

  // ==========================================
  // VIEW MODE 2: STANDARD 3-COLUMN GROUP VIEW
  // ==========================================
  const isImageGroupIcon = group.icon && (group.icon.startsWith('http') || group.icon.startsWith('data:'));

  return (
    <div className="flex h-full w-full bg-[#150A35] text-[#F5F7FC] relative overflow-hidden animate-in fade-in duration-300">
      
      {/* Toast Notification */}
      {toastMessage && (
        <div className="absolute top-5 left-1/2 -translate-x-1/2 bg-white text-[#150A35] px-4 py-2.5 rounded-2xl shadow-2xl flex items-center gap-2.5 z-50 animate-in slide-in-from-top-4 font-bold text-xs">
          <Sparkles size={16} className="text-[#A577FF]" />
          <span>{toastMessage}</span>
        </div>
      )}

      {/* Hidden File Input for Chat Attachments */}
      <input 
        ref={chatAttachmentInputRef} 
        type="file" 
        className="hidden" 
        onChange={handleSendFileAttachment}
      />

      {/* ================= 1. SISI KIRI (VOICE CHANNELS & GROUP ACTIONS) ================= */}
      <div className="w-64 flex flex-col border-r border-white/5 bg-white/[0.01] shrink-0 p-5">
        
        {/* Header Nama Grup + Settings */}
        <div className="pb-4 mb-4 border-b border-white/5">
          <div className="flex items-center justify-between gap-2.5">
            
            {/* Kotak Foto / Icon Grup */}
            <div 
              title={group.name}
              className="w-10 h-10 rounded-2xl bg-[#A577FF]/20 text-[#A577FF] font-bold text-xs flex items-center justify-center shrink-0 overflow-hidden border border-white/10 shadow-md"
            >
              {isImageGroupIcon ? (
                <img src={group.icon} alt={group.name} className="w-full h-full object-cover" />
              ) : (
                <span className="text-sm font-black">{group.icon}</span>
              )}
            </div>

            {/* Nama Grup */}
            <div className="min-w-0 flex-1">
              <h2 
                title={group.name}
                className="font-black text-base text-white truncate"
              >
                {group.name}
              </h2>
            </div>

            {/* Settings & Delete Group Icon */}
            <button 
              onClick={() => {
                setSettingsName(group.name);
                setSettingsIcon(group.icon);
                setIsGroupSettingsOpen(true);
              }}
              title="Group Settings & Delete"
              className="w-8 h-8 rounded-xl bg-white/5 hover:bg-[#A577FF]/20 text-gray-400 hover:text-[#A577FF] flex items-center justify-center transition-colors shrink-0 cursor-pointer"
            >
              <Settings size={16} />
            </button>
          </div>
        </div>

        {/* Section Voice Channels */}
        <div className="flex-1 flex flex-col min-h-0">
          <div className="flex items-center justify-between mb-3 px-1">
            <span className="text-[11px] font-bold uppercase tracking-wider text-gray-400 flex items-center gap-1.5">
              <Volume2 size={13} className="text-[#A577FF]" /> Voice Channels
            </span>
            <span className="text-[10px] text-gray-500 font-bold">{group.channels.length}</span>
          </div>

          {/* List Channels with Popup Menu */}
          <div className="space-y-1.5 flex-1 overflow-y-auto custom-scrollbar pr-1">
            {group.channels.map((chan) => {
              const emojiMatch = chan.name.match(/^([^\w\s\u00C0-\u024F\u1E00-\u1EFF]+)\s*(.*)$/);
              const chanIcon = getChannelIcon(chan);
              const chanCleanName = emojiMatch ? emojiMatch[2].trim() : chan.name;

              return (
                <div 
                  key={chan.id}
                  className="relative flex items-center justify-between p-2.5 rounded-xl hover:bg-white/5 cursor-pointer group transition-all"
                  onClick={() => handleEnterChannel({ ...chan, icon: chanIcon, name: chanCleanName })}
                >
                  <div className="flex items-center gap-2.5 min-w-0 flex-1">
                    <div className="w-7 h-7 rounded-lg bg-white/5 flex items-center justify-center text-[#A577FF] shrink-0">
                      {renderChannelIcon(chanIcon, 15)}
                    </div>
                    <div className="min-w-0 flex-1 flex items-center gap-1.5">
                      <span className="text-xs font-bold text-gray-300 group-hover:text-white truncate">
                        {chanCleanName}
                      </span>
                      {chan.isPublic && (
                        <span className="text-[9px] bg-blue-500/20 text-blue-400 font-bold px-1.5 py-0.2 rounded border border-blue-500/30 shrink-0">
                          Public ✓
                        </span>
                      )}
                    </div>
                  </div>

                  <div className="flex items-center gap-1.5 shrink-0" onClick={(e) => e.stopPropagation()}>
                    {chan.activeUsers && chan.activeUsers > 0 && (
                      <span className="text-[10px] bg-green-500/20 text-green-400 font-bold px-1.5 py-0.5 rounded-full border border-green-500/30">
                        {chan.activeUsers}
                      </span>
                    )}

                    {/* Three Dots for Admin & Owner */}
                    {isCurrentUserAdmin && (
                      <button 
                        onClick={(e) => {
                          e.stopPropagation();
                          if (channelMenuOpenId === chan.id) {
                            setChannelMenuOpenId(null);
                            setMenuAnchorRect(null);
                          } else {
                            const rect = e.currentTarget.getBoundingClientRect();
                            setMenuAnchorRect(rect);
                            setChannelMenuOpenId(chan.id);
                            setEditingChannelName(chanCleanName);
                            setEditingChannelIcon(chanIcon);
                          }
                        }}
                        className="w-6 h-6 rounded-md flex items-center justify-center text-gray-400 hover:text-white hover:bg-white/10 transition-colors cursor-pointer"
                        title="Channel Options"
                      >
                        <MoreVertical size={14} />
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>

          {/* Create Channel Button for Admin & Owner */}
          {isCurrentUserAdmin && (
            <div className="pt-3 border-t border-white/5 mt-auto">
              <button 
                onClick={() => setIsCreateChannelOpen(true)}
                className="w-full flex items-center justify-center gap-2 bg-white/5 hover:bg-[#A577FF]/20 text-gray-300 hover:text-[#A577FF] border border-white/5 hover:border-[#A577FF]/30 py-2.5 rounded-xl text-xs font-bold transition-all"
              >
                <Plus size={15} />
                <span>Create Channel</span>
              </button>
            </div>
          )}
        </div>
      </div>

      {/* ================= 2. SISI TENGAH (CHAT AREA) ================= */}
      <div className="flex-1 flex flex-col min-w-0 bg-[#12082E]/50 relative">
        
        {/* Header Chat: Search & Channel Name */}
        <div className="h-16 px-6 border-b border-white/5 flex items-center justify-between shrink-0 bg-[#150A35]/80 backdrop-blur-md">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-white/5 flex items-center justify-center text-white border border-white/5">
              <MessageSquare size={18} className="text-[#A577FF]" />
            </div>
            <div>
              <h3 className="font-bold text-sm text-white flex items-center gap-2">
                # General Chat
              </h3>
              <p className="text-[10px] text-gray-400">
                {membersList.length} members • Group chat room
              </p>
            </div>
          </div>

          {/* Search Messages Button & Dropdown */}
          <div className="relative">
            <button 
              onClick={() => setIsChatSearchOpen(!isChatSearchOpen)}
              className={`w-9 h-9 rounded-xl flex items-center justify-center transition-colors cursor-pointer ${
                isChatSearchOpen ? 'bg-white/10 text-white' : 'bg-white/5 hover:bg-white/10 text-gray-400 hover:text-white'
              }`}
              title="Search Messages"
            >
              <Search size={16} />
            </button>

            {isChatSearchOpen && (
              <>
                <div className="fixed inset-0 z-40" onClick={() => setIsChatSearchOpen(false)} />
                <div className="absolute top-12 right-0 w-80 bg-[#251A45] border border-white/10 rounded-2xl shadow-2xl z-50 animate-in fade-in slide-in-from-top-2 overflow-hidden flex flex-col">
                  <div className="p-3 border-b border-white/5">
                    <input 
                      type="text" 
                      autoFocus
                      placeholder="Search messages..." 
                      value={chatSearchQuery}
                      onChange={(e) => setChatSearchQuery(e.target.value)}
                      className="w-full bg-[#150A35] border border-white/10 text-white placeholder-gray-500 px-3 py-2 rounded-xl focus:outline-none focus:ring-1 focus:ring-[#A577FF] text-xs" 
                    />
                  </div>
                  <div className="max-h-64 overflow-y-auto custom-scrollbar p-2 space-y-1">
                    {chatSearchQuery.trim() === '' ? (
                      <div className="p-4 text-center text-xs text-gray-500">Type keywords to search messages...</div>
                    ) : (() => {
                      const results = chatMessages.filter(m => (m.text || '').toLowerCase().includes(chatSearchQuery.toLowerCase()));
                      if (results.length === 0) return <div className="p-4 text-center text-xs text-gray-500">No messages found.</div>;
                      return results.map(m => (
                        <div 
                          key={m.id} 
                          onClick={() => {
                            const el = document.getElementById(`group-msg-${m.id}`);
                            if (el) {
                              el.scrollIntoView({ behavior: 'smooth', block: 'center' });
                              el.style.transition = 'all 0.4s';
                              el.style.backgroundColor = 'rgba(165, 119, 255, 0.25)';
                              el.style.borderRadius = '1rem';
                              setTimeout(() => {
                                el.style.backgroundColor = 'transparent';
                              }, 1800);
                            }
                            setIsChatSearchOpen(false);
                          }}
                          className="p-2 rounded-xl hover:bg-white/5 cursor-pointer transition-colors"
                        >
                          <div className="flex justify-between items-baseline mb-0.5">
                            <span className="text-xs font-bold text-white">{m.sender}</span>
                            <span className="text-[10px] text-gray-500">{m.time}</span>
                          </div>
                          <p className="text-xs text-gray-300 line-clamp-2">{m.text}</p>
                        </div>
                      ));
                    })()}
                  </div>
                </div>
              </>
            )}
          </div>
        </div>

        {/* Message Stream */}
        <div className="flex-1 overflow-y-auto custom-scrollbar p-6 space-y-4">
          <div className="text-center py-4">
            <div className="w-12 h-12 rounded-2xl bg-[#A577FF]/10 text-[#A577FF] flex items-center justify-center mx-auto mb-2">
              <Sparkles size={24} />
            </div>
            <h4 className="font-bold text-sm text-white">Welcome to #{group.name}!</h4>
            <p className="text-xs text-gray-400 mt-0.5">This is the start of this group chat.</p>
          </div>

          {chatMessages.map((msg) => (
            <div key={msg.id} id={`group-msg-${msg.id}`} className="flex items-start gap-3 group p-1 transition-all rounded-2xl">
              <img src={msg.avatar} alt={msg.sender} className="w-9 h-9 rounded-full shrink-0 border border-white/10" />
              <div className="flex-1 min-w-0">
                <div className="flex items-baseline gap-2 mb-1">
                  <span className="text-xs font-bold text-white group-hover:text-[#A577FF] transition-colors">{msg.sender}</span>
                  <span className="text-[10px] text-gray-500">{msg.time}</span>
                </div>
                <div className="bg-white/5 border border-white/5 rounded-2xl rounded-tl-sm px-4 py-2.5 text-xs text-gray-200 leading-relaxed inline-block max-w-[85%] break-words">
                  {msg.text}

                  {/* Attachment Preview */}
                  {msg.attachment && (
                    <div className="mt-2 p-2 bg-black/20 rounded-xl border border-white/10 flex items-center gap-3">
                      {msg.attachment.type === 'image' && msg.attachment.url && (
                        <img src={msg.attachment.url} alt="Attachment" className="w-24 h-24 object-cover rounded-lg border border-white/10" />
                      )}
                      <div>
                        <span className="text-xs font-bold text-white block">{msg.attachment.name}</span>
                        <span className="text-[10px] text-gray-400">{msg.attachment.size || 'Attachment file'}</span>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Input Bar */}
        <div className="p-4 border-t border-white/5 bg-[#150A35]/90 relative">
          
          {/* File Attachment Popup */}
          {isAttachmentOpen && (
            <>
              <div className="fixed inset-0 z-40" onClick={() => setIsAttachmentOpen(false)} />
              <div className="absolute bottom-16 left-4 bg-[#251A45] border border-white/10 rounded-2xl p-2.5 shadow-2xl z-50 flex flex-col gap-1 min-w-[200px] animate-in fade-in slide-in-from-bottom-2">
                <button 
                  type="button"
                  onClick={() => {
                    setAttachmentType('image');
                    chatAttachmentInputRef.current?.setAttribute('accept', 'image/*');
                    chatAttachmentInputRef.current?.click();
                  }}
                  className="flex items-center gap-3 p-2 rounded-xl hover:bg-white/10 transition-colors text-white text-xs font-medium cursor-pointer"
                >
                  <Image size={16} className="text-blue-400" />
                  <span>Send Photo</span>
                </button>
                <button 
                  type="button"
                  onClick={() => {
                    setAttachmentType('video');
                    chatAttachmentInputRef.current?.setAttribute('accept', 'video/*');
                    chatAttachmentInputRef.current?.click();
                  }}
                  className="flex items-center gap-3 p-2 rounded-xl hover:bg-white/10 transition-colors text-white text-xs font-medium cursor-pointer"
                >
                  <Film size={16} className="text-purple-400" />
                  <span>Send Video</span>
                </button>
                <button 
                  type="button"
                  onClick={() => {
                    setAttachmentType('doc');
                    chatAttachmentInputRef.current?.setAttribute('accept', '.pdf,.doc,.docx,.txt');
                    chatAttachmentInputRef.current?.click();
                  }}
                  className="flex items-center gap-3 p-2 rounded-xl hover:bg-white/10 transition-colors text-white text-xs font-medium cursor-pointer"
                >
                  <FileText size={16} className="text-yellow-400" />
                  <span>Send Document</span>
                </button>
                <button 
                  type="button"
                  onClick={() => {
                    setAttachmentType('audio');
                    chatAttachmentInputRef.current?.setAttribute('accept', 'audio/*');
                    chatAttachmentInputRef.current?.click();
                  }}
                  className="flex items-center gap-3 p-2 rounded-xl hover:bg-white/10 transition-colors text-white text-xs font-medium cursor-pointer"
                >
                  <Music size={16} className="text-green-400" />
                  <span>Send Audio</span>
                </button>
              </div>
            </>
          )}

          {/* Emoji Picker */}
          {isEmojiOpen && (
            <>
              <div className="fixed inset-0 z-40" onClick={() => setIsEmojiOpen(false)} />
              <div className="absolute bottom-16 right-16 w-80 bg-[#251A45] border border-white/10 rounded-2xl p-4 shadow-2xl z-50 animate-in fade-in zoom-in-95 max-h-72 flex flex-col">
                <div className="flex items-center gap-2 bg-white/5 border border-white/10 rounded-xl px-3 py-1.5 mb-3">
                  <Search size={14} className="text-gray-400" />
                  <input 
                    type="text" 
                    placeholder="Search emoji..." 
                    value={emojiSearchText}
                    onChange={(e) => setEmojiSearchText(e.target.value)}
                    className="bg-transparent border-none text-xs text-white placeholder-gray-500 focus:outline-none w-full"
                  />
                </div>

                <div className="flex-1 overflow-y-auto custom-scrollbar space-y-3 pr-1">
                  {EMOJI_CATEGORIES.map((cat, idx) => (
                    <div key={idx}>
                      <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider block mb-1">{cat.title}</span>
                      <div className="grid grid-cols-7 gap-1 text-2xl">
                        {cat.emojis
                          .filter(e => !emojiSearchText || e.includes(emojiSearchText))
                          .map((emoji) => (
                            <button 
                              key={emoji}
                              type="button"
                              onClick={() => setInputText(prev => prev + emoji)}
                              className="hover:scale-125 transition-transform p-1 rounded hover:bg-white/5 flex items-center justify-center"
                            >
                              {emoji}
                            </button>
                          ))}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </>
          )}

          <form onSubmit={handleSendTextMessage} className="flex items-center gap-3">
            {/* Attachment Button */}
            <button 
              type="button" 
              onClick={() => setIsAttachmentOpen(!isAttachmentOpen)}
              className="text-gray-400 hover:text-white transition-colors p-1"
              title="Send Attachment"
            >
              <Paperclip size={18} className={isAttachmentOpen ? 'text-[#A577FF] rotate-45 transition-transform' : 'transition-transform'} />
            </button>

            <input 
              type="text" 
              placeholder={`Message #${group.name}...`}
              value={inputText}
              onChange={(e) => setInputText(e.target.value)}
              className="flex-1 bg-white/5 border border-white/10 rounded-full px-5 py-2.5 text-xs text-white placeholder-gray-500 focus:outline-none focus:border-[#A577FF] transition-all"
            />

            {/* Emoji Button */}
            <button 
              type="button" 
              onClick={() => setIsEmojiOpen(!isEmojiOpen)}
              className="text-gray-400 hover:text-white transition-colors p-1"
              title="Choose Emoji"
            >
              <Smile size={18} className={isEmojiOpen ? 'text-[#A577FF]' : ''} />
            </button>

            <button 
              type="submit"
              disabled={!inputText.trim()}
              className="w-9 h-9 rounded-full bg-[#A577FF] hover:bg-[#9161eb] disabled:opacity-40 text-white flex items-center justify-center transition-all shadow-[0_2px_10px_rgba(165,119,255,0.4)]"
            >
              <Send size={15} />
            </button>
          </form>
        </div>
      </div>

      {/* ================= 3. SISI KANAN (GROUP INFO & MEMBERS LIST) ================= */}
      <div className="w-72 flex flex-col border-l border-white/5 bg-white/[0.01] shrink-0">
        
        {/* Atas: Group Info (Preview File Dropdown, Tanpa Voice Notes) */}
        <div className="p-5 border-b border-white/5 overflow-y-auto max-h-[48%] custom-scrollbar">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-bold text-sm text-white">Group Info</h3>
            <span className="text-[10px] text-[#A577FF] font-semibold">Shared Files</span>
          </div>

          <div className="space-y-2">
            {[
              { 
                id: 'photos', 
                icon: Image, 
                label: 'Photos', 
                count: '142 photos', 
                color: 'text-blue-400',
                preview: (
                  <div className="grid grid-cols-3 gap-1.5 p-2 bg-white/5 rounded-xl border border-white/5 mt-1">
                    {['1', '2', '3', '4', '5', '6'].map(i => (
                      <img key={i} src={`https://api.dicebear.com/7.x/shapes/svg?seed=photo${i}&backgroundColor=251A45`} className="w-full h-12 object-cover rounded-lg border border-white/10" alt="thumb" />
                    ))}
                  </div>
                )
              },
              { 
                id: 'videos', 
                icon: Film, 
                label: 'Videos', 
                count: '18 videos', 
                color: 'text-purple-400',
                preview: (
                  <div className="space-y-1.5 p-2 bg-white/5 rounded-xl border border-white/5 mt-1 text-[11px]">
                    <div className="flex justify-between items-center text-gray-300">
                      <span className="truncate max-w-[130px]">🎬 match_highlight.mp4</span>
                      <span className="text-[10px] text-gray-500">14 MB</span>
                    </div>
                    <div className="flex justify-between items-center text-gray-300">
                      <span className="truncate max-w-[130px]">🎬 stream_clip.mp4</span>
                      <span className="text-[10px] text-gray-500">32 MB</span>
                    </div>
                  </div>
                )
              },
              { 
                id: 'documents', 
                icon: FileText, 
                label: 'Documents', 
                count: '54 files', 
                color: 'text-yellow-400',
                preview: (
                  <div className="space-y-1.5 p-2 bg-white/5 rounded-xl border border-white/5 mt-1 text-[11px]">
                    <div className="flex justify-between items-center text-gray-300">
                      <span className="truncate max-w-[130px]">📄 Rules_Group.pdf</span>
                      <span className="text-[10px] text-gray-500">420 KB</span>
                    </div>
                    <div className="flex justify-between items-center text-gray-300">
                      <span className="truncate max-w-[130px]">📄 Jadwal_Mabar.docx</span>
                      <span className="text-[10px] text-gray-500">1.2 MB</span>
                    </div>
                  </div>
                )
              },
              { 
                id: 'audio', 
                icon: Music, 
                label: 'Audio', 
                count: '29 audio files', 
                color: 'text-green-400',
                preview: (
                  <div className="space-y-1.5 p-2 bg-white/5 rounded-xl border border-white/5 mt-1 text-[11px]">
                    <div className="flex justify-between items-center text-gray-300">
                      <span className="truncate max-w-[130px]">🎵 cozy_lofi_mix.mp3</span>
                      <span className="text-[10px] text-gray-500">3:42</span>
                    </div>
                    <div className="flex justify-between items-center text-gray-300">
                      <span className="truncate max-w-[130px]">🎵 gaming_theme.mp3</span>
                      <span className="text-[10px] text-gray-500">2:18</span>
                    </div>
                  </div>
                )
              },
              { 
                id: 'links', 
                icon: LinkIcon, 
                label: 'Shared Links', 
                count: '31 links', 
                color: 'text-pink-400',
                preview: (
                  <div className="space-y-1.5 p-2 bg-white/5 rounded-xl border border-white/5 mt-1 text-[11px]">
                    <div className="truncate text-blue-400 hover:underline cursor-pointer">🔗 discord.gg/cozy-hangout</div>
                    <div className="truncate text-blue-400 hover:underline cursor-pointer">🔗 youtube.com/watch?v=cozy</div>
                  </div>
                )
              },
            ].map((cat) => {
              const isExpanded = expandedSharedCat === cat.id;

              return (
                <div key={cat.id} className="flex flex-col">
                  <div 
                    onClick={() => setExpandedSharedCat(isExpanded ? null : cat.id)}
                    className="flex items-center justify-between p-2 rounded-xl hover:bg-white/5 transition-colors cursor-pointer group"
                  >
                    <div className="flex items-center gap-3">
                      <div className={`w-7 h-7 rounded-lg bg-white/5 flex items-center justify-center ${cat.color}`}>
                        <cat.icon size={15} />
                      </div>
                      <div>
                        <h5 className="text-xs font-semibold text-gray-200 group-hover:text-white">{cat.label}</h5>
                        <p className="text-[10px] text-gray-500">{cat.count}</p>
                      </div>
                    </div>
                    {isExpanded ? (
                      <ChevronUp size={14} className="text-[#A577FF]" />
                    ) : (
                      <ChevronDown size={14} className="text-gray-500 group-hover:text-white" />
                    )}
                  </div>

                  {/* Preview File Dropdown Dekat Tombol */}
                  {isExpanded && cat.preview}
                </div>
              );
            })}
          </div>
        </div>

        {/* Bawah: List Member (Banyak Anggota & Scrollable) */}
        <div className="flex-1 flex flex-col p-5 overflow-hidden">
          
          {/* Members Header + Invite Button for Admin & Owner */}
          <div className="flex items-center justify-between mb-3 pb-2 border-b border-white/5 shrink-0">
            <span className="text-xs font-bold text-white flex items-center gap-1.5">
              Group Members ({membersList.length})
            </span>

            {isCurrentUserAdmin && (
              <button 
                onClick={() => setIsInviteModalOpen(true)}
                title="Invite Members to Group"
                className="flex items-center gap-1.5 bg-[#A577FF]/20 hover:bg-[#A577FF] text-[#A577FF] hover:text-white px-2.5 py-1 rounded-full text-[10px] font-bold transition-all"
              >
                <UserPlus size={12} />
                <span>Invite</span>
              </button>
            )}
          </div>

          {/* Members List */}
          <div className="flex-1 min-h-0 overflow-y-auto custom-scrollbar space-y-1.5 pr-1">
            {membersList.map((member) => {
              const isOwner = member.role === 'owner';
              const isSelf = member.name === userName;

              return (
                <div 
                  key={member.id} 
                  onClick={() => {
                    if (isCurrentUserOwner && !isSelf) {
                      setSelectedListMember(member);
                    }
                  }}
                  className={`flex items-center justify-between p-2 rounded-xl transition-colors group ${
                    isCurrentUserOwner && !isSelf ? 'hover:bg-white/10 cursor-pointer' : 'hover:bg-white/5'
                  }`}
                  title={isCurrentUserOwner && !isSelf ? `Click to manage ${member.name}` : member.name}
                >
                  <div className="flex items-center gap-2.5 min-w-0">
                    <div className="relative shrink-0">
                      <img src={member.avatar} alt={member.name} className="w-8 h-8 rounded-full border border-white/10" />
                      <div className={`absolute bottom-0 right-0 w-2 h-2 rounded-full border border-[#150A35] ${member.status}`} />
                    </div>
                    <div className="min-w-0 flex items-center gap-1.5">
                      <span className="text-xs font-bold text-gray-200 group-hover:text-white truncate">
                        {member.name}
                      </span>
                      {isOwner && (
                        <span title="Group Owner" className="inline-flex items-center">
                          <Crown 
                            size={13} 
                            className="text-yellow-400 fill-yellow-400 shrink-0" 
                          />
                        </span>
                      )}
                    </div>
                  </div>

                  <span className={`text-[10px] font-semibold px-1.5 py-0.5 rounded ${
                    isOwner 
                      ? 'bg-yellow-400/10 text-yellow-400' 
                      : member.role === 'admin' 
                        ? 'bg-[#A577FF]/10 text-[#A577FF]' 
                        : 'text-gray-500'
                  }`}>
                    {member.role}
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* ================= MODALS & POPUPS ================= */}

      {/* Modal Kelola Member dari List (Khusus Owner) */}
      {selectedListMember && (
        <div 
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-md animate-in fade-in duration-200"
          onClick={() => setSelectedListMember(null)}
        >
          <div 
            className="w-full max-w-xs bg-[#150A35] border border-white/10 rounded-3xl p-5 shadow-2xl relative animate-in zoom-in-95 duration-200 text-center"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex flex-col items-center mb-4">
              <img src={selectedListMember.avatar} className="w-14 h-14 rounded-full border-2 border-[#A577FF] mb-2" alt="avatar" />
              <h3 className="font-bold text-sm text-white">{selectedListMember.name}</h3>
              <span className="text-[10px] text-gray-400">Current Role: {selectedListMember.role}</span>
            </div>

            <div className="space-y-2">
              <button 
                onClick={() => handleToggleAdminListMember(selectedListMember.name)}
                className="w-full flex items-center justify-center gap-2 py-2.5 px-3 rounded-xl bg-white/5 hover:bg-[#A577FF]/20 text-xs font-bold text-gray-200 hover:text-[#A577FF] transition-colors"
              >
                <Shield size={14} />
                <span>{selectedListMember.role === 'admin' ? 'Remove Admin Status' : 'Make Admin'}</span>
              </button>

              <button 
                onClick={() => handleKickFromGroup(selectedListMember.name)}
                className="w-full flex items-center justify-center gap-2 py-2.5 px-3 rounded-xl bg-red-500/10 hover:bg-red-500/20 text-xs font-bold text-red-400 hover:text-red-300 transition-colors"
              >
                <UserMinus size={14} />
                <span>Remove from Group</span>
              </button>
            </div>

            <button 
              onClick={() => setSelectedListMember(null)}
              className="mt-4 text-xs text-gray-500 hover:text-white transition-colors font-medium cursor-pointer"
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      {/* Delete Group Warning Modal */}
      {isDeleteModalOpen && (
        <div 
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-md animate-in fade-in duration-200"
          onClick={() => setIsDeleteModalOpen(false)}
        >
          <div 
            className="w-full max-w-sm bg-[#150A35] border border-red-500/30 rounded-3xl p-6 shadow-2xl relative animate-in zoom-in-95 duration-200"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="w-12 h-12 rounded-2xl bg-red-500/20 text-red-400 flex items-center justify-center mb-4 border border-red-500/30">
              <AlertTriangle size={24} />
            </div>

            <h3 className="text-lg font-bold text-white mb-2">Delete Group "{group.name}"?</h3>
            <p className="text-xs text-gray-400 mb-6 leading-relaxed">
              Warning: This action is permanent and cannot be undone. All voice channels, messages, and group data will be deleted permanently.
            </p>

            <div className="flex items-center justify-end gap-3">
              <button 
                onClick={() => setIsDeleteModalOpen(false)}
                className="px-4 py-2 rounded-xl text-xs font-bold text-gray-400 hover:text-white hover:bg-white/5 transition-colors cursor-pointer"
              >
                Cancel
              </button>
              <button 
                onClick={() => {
                  setIsDeleteModalOpen(false);
                  onDeleteGroup(group.id);
                }}
                className="px-4 py-2 rounded-xl text-xs font-bold bg-red-500 hover:bg-red-600 text-white transition-colors shadow-lg shadow-red-500/30 cursor-pointer"
              >
                Yes, Delete Group
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Create New Channel Modal */}
      {isCreateChannelOpen && (
        <div 
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-md animate-in fade-in duration-200"
          onClick={() => setIsCreateChannelOpen(false)}
        >
          <div 
            className="w-full max-w-sm bg-[#150A35] border border-white/10 rounded-3xl p-6 shadow-2xl relative animate-in zoom-in-95 duration-200"
            onClick={(e) => e.stopPropagation()}
          >
            <button 
              onClick={() => setIsCreateChannelOpen(false)} 
              className="absolute top-5 right-5 text-gray-400 hover:text-white"
            >
              <X size={18} />
            </button>

            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 rounded-xl bg-[#A577FF]/20 text-[#A577FF] flex items-center justify-center">
                <Volume2 size={20} />
              </div>
              <div>
                <h3 className="text-base font-bold text-white">Create Voice Channel</h3>
                <p className="text-[10px] text-gray-400">Add a voice chat channel to the group</p>
              </div>
            </div>

            <form onSubmit={handleCreateChannelSubmit} className="space-y-4">
              {/* Choose Icon */}
              <div>
                <label className="block text-xs font-semibold text-gray-300 mb-1.5">Choose Icon</label>
                <div className="flex gap-2">
                  {['🔊', '🎮', '☕', '🌙', '🎧', '✨'].map(icon => (
                    <button 
                      key={icon}
                      type="button"
                      onClick={() => setNewChannelIcon(icon)}
                      className={`w-9 h-9 rounded-xl text-base flex items-center justify-center transition-all cursor-pointer ${
                        newChannelIcon === icon 
                          ? 'bg-[#A577FF] scale-105 shadow-[0_0_15px_rgba(165,119,255,0.4)] text-white' 
                          : 'bg-white/5 text-gray-300 hover:bg-white/10'
                      }`}
                    >
                      {renderChannelIcon(icon, 18)}
                    </button>
                  ))}
                </div>
              </div>

              {/* Channel Name */}
              <div>
                <label className="block text-xs font-semibold text-gray-300 mb-1.5">Channel Name</label>
                <input 
                  type="text" 
                  placeholder="e.g. Gaming Room, Lobby, Chill 2..."
                  value={newChannelName}
                  onChange={(e) => setNewChannelName(e.target.value)}
                  autoFocus
                  required
                  className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-2.5 text-xs text-white placeholder-gray-500 focus:outline-none focus:border-[#A577FF] transition-all"
                />
              </div>

              {/* Make Public Option */}
              <div 
                onClick={() => setNewChannelIsPublic(!newChannelIsPublic)}
                className="flex items-center justify-between p-3 rounded-xl bg-white/5 hover:bg-white/10 text-xs text-gray-200 cursor-pointer font-medium border border-white/5 transition-colors"
              >
                <div className="flex items-center gap-2.5">
                  <Globe size={15} className="text-blue-400" />
                  <div>
                    <span className="block font-bold">Make Public</span>
                    <span className="text-[10px] text-gray-400">Visible in public voice channels dashboard</span>
                  </div>
                </div>
                {newChannelIsPublic && (
                  <div className="w-5 h-5 rounded-md bg-blue-500/20 border border-blue-500/40 flex items-center justify-center text-blue-400">
                    <Check size={14} />
                  </div>
                )}
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button 
                  type="button" 
                  onClick={() => setIsCreateChannelOpen(false)}
                  className="px-4 py-2 rounded-xl text-xs font-bold text-gray-400 hover:text-white cursor-pointer"
                >
                  Cancel
                </button>
                <button 
                  type="submit" 
                  disabled={!newChannelName.trim()}
                  className="px-4 py-2 rounded-xl text-xs font-bold bg-[#A577FF] hover:bg-[#9161eb] disabled:opacity-50 text-white transition-all shadow-md cursor-pointer"
                >
                  Create Channel
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal Pengaturan Grup (Ganti Profil, Nama, & Hapus Grup) */}
      {isGroupSettingsOpen && (
        <div 
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-md animate-in fade-in duration-200"
          onClick={() => setIsGroupSettingsOpen(false)}
        >
          <div 
            className="w-full max-w-md bg-[#150A35] border border-white/10 rounded-3xl p-6 shadow-2xl relative animate-in zoom-in-95 duration-200"
            onClick={(e) => e.stopPropagation()}
          >
            <button 
              onClick={() => setIsGroupSettingsOpen(false)} 
              className="absolute top-5 right-5 text-gray-400 hover:text-white"
            >
              <X size={18} />
            </button>

            <div className="flex items-center gap-3 mb-5">
              <div className="w-10 h-10 rounded-xl bg-[#A577FF]/20 text-[#A577FF] flex items-center justify-center">
                <Settings size={20} />
              </div>
              <div>
                <h3 className="text-base font-bold text-white">Group Settings</h3>
                <p className="text-[10px] text-gray-400">Change profile, name, or manage your group</p>
              </div>
            </div>

            <div className="space-y-4">
              {/* Profile / Group Icon */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <label className="text-xs font-semibold text-gray-300">Group Icon / Profile Photo</label>
                  <button 
                    type="button"
                    onClick={() => settingsPhotoInputRef.current?.click()}
                    className="text-xs text-[#A577FF] hover:underline flex items-center gap-1 font-bold cursor-pointer"
                  >
                    <Upload size={12} /> Upload Photo
                  </button>
                  <input 
                    ref={settingsPhotoInputRef}
                    type="file" 
                    accept="image/*" 
                    className="hidden" 
                    onChange={handleSettingsPhotoUpload}
                  />
                </div>

                {/* Current Avatar Preview */}
                <div className="flex items-center gap-3 p-3 bg-white/5 rounded-2xl border border-white/5 mb-2.5">
                  <div className="w-12 h-12 rounded-2xl bg-[#A577FF]/20 text-[#A577FF] flex items-center justify-center overflow-hidden border border-white/10 shrink-0 font-black text-sm">
                    {settingsIcon && (settingsIcon.startsWith('http') || settingsIcon.startsWith('data:')) ? (
                      <img src={settingsIcon} alt="Preview" className="w-full h-full object-cover" />
                    ) : (
                      settingsIcon
                    )}
                  </div>
                  <div className="flex-1">
                    <span className="text-xs font-bold text-white block">Group Icon Preview</span>
                    <span className="text-[10px] text-gray-400">Choose from icons below or upload your own photo</span>
                  </div>
                </div>

                <div className="flex items-center gap-1.5 justify-between">
                  {['#1', '#2', '#3', '🎮', '🎧', '☕', '✨', '🔥', '👾'].map(icon => (
                    <button 
                      key={icon}
                      type="button"
                      onClick={() => setSettingsIcon(icon)}
                      className={`w-9 h-9 rounded-xl text-xs font-bold flex items-center justify-center transition-all cursor-pointer shrink-0 ${
                        settingsIcon === icon 
                          ? 'bg-[#A577FF] text-white scale-105 shadow-[0_0_15px_rgba(165,119,255,0.4)]' 
                          : 'bg-white/5 text-gray-300 hover:bg-white/10'
                      }`}
                    >
                      {icon}
                    </button>
                  ))}
                </div>
              </div>

              {/* Group Name */}
              <div>
                <label className="block text-xs font-semibold text-gray-300 mb-1.5">Group Name</label>
                <input 
                  type="text" 
                  value={settingsName}
                  onChange={(e) => setSettingsName(e.target.value)}
                  className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-2.5 text-xs text-white placeholder-gray-500 focus:outline-none focus:border-[#A577FF] transition-all"
                  placeholder="Enter group name..."
                />
              </div>

              {/* Save Changes Button */}
              <div className="pt-2">
                <button 
                  type="button"
                  onClick={handleSaveGroupSettings}
                  disabled={!settingsName.trim()}
                  className="w-full py-2.5 rounded-xl text-xs font-bold bg-[#A577FF] hover:bg-[#9161eb] disabled:opacity-50 text-white transition-all shadow-md cursor-pointer"
                >
                  Save Changes
                </button>
              </div>

              {/* Danger Zone: Delete Group */}
              <div className="pt-4 border-t border-red-500/20">
                <div className="p-3 bg-red-500/10 border border-red-500/20 rounded-2xl flex items-center justify-between">
                  <div>
                    <span className="text-xs font-bold text-red-300 block">Delete Group</span>
                    <span className="text-[10px] text-gray-400">Permanently delete group and all channels</span>
                  </div>
                  <button 
                    type="button"
                    onClick={() => {
                      setIsGroupSettingsOpen(false);
                      setIsDeleteModalOpen(true);
                    }}
                    className="px-3.5 py-1.5 rounded-xl text-xs font-bold bg-red-500/20 hover:bg-red-500 text-red-300 hover:text-white transition-all border border-red-500/30 flex items-center gap-1.5 cursor-pointer"
                  >
                    <Trash2 size={13} /> Delete
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Floating Channel Edit Popover */}
      {channelMenuOpenId && menuAnchorRect && (() => {
        const targetChan = group.channels.find(c => c.id === channelMenuOpenId);
        if (!targetChan) return null;
        const topPos = Math.min(Math.max(20, menuAnchorRect.top - 10), window.innerHeight - 340);
        const leftPos = Math.min(menuAnchorRect.right + 12, window.innerWidth - 280);

        return (
          <>
            <div className="fixed inset-0 z-[100]" onClick={() => { setChannelMenuOpenId(null); setMenuAnchorRect(null); }} />
            <div 
              style={{ 
                position: 'fixed', 
                top: `${topPos}px`, 
                left: `${leftPos}px` 
              }}
              className="w-64 bg-[#251A45] border border-white/10 rounded-2xl shadow-[0_10px_40px_rgba(0,0,0,0.8)] p-3.5 z-[101] animate-in fade-in zoom-in-95 space-y-3 select-none"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex items-center justify-between pb-1.5 border-b border-white/5">
                <span className="text-xs font-bold text-white flex items-center gap-1.5">
                  <span>Edit Channel</span>
                </span>
                <button onClick={() => { setChannelMenuOpenId(null); setMenuAnchorRect(null); }} className="text-gray-400 hover:text-white">
                  <X size={14} />
                </button>
              </div>

              {/* Choose Channel Icon */}
              <div>
                <label className="text-[10px] text-gray-400 font-semibold block mb-1">Choose Icon</label>
                <div className="flex gap-1.5">
                  {['🔊', '🎮', '☕', '🌙', '🎧', '✨'].map(icon => (
                    <button 
                      key={icon}
                      type="button"
                      onClick={() => setEditingChannelIcon(icon)}
                      className={`w-7 h-7 rounded-lg text-sm flex items-center justify-center transition-all cursor-pointer ${
                        editingChannelIcon === icon ? 'bg-[#A577FF] scale-105 shadow-md text-white' : 'bg-white/5 hover:bg-white/10'
                      }`}
                    >
                      {renderChannelIcon(icon, 14)}
                    </button>
                  ))}
                </div>
              </div>

              {/* Channel Name Input */}
              <div>
                <label className="text-[10px] text-gray-400 font-semibold block mb-1">Channel Name</label>
                <input 
                  type="text" 
                  value={editingChannelName}
                  onChange={(e) => setEditingChannelName(e.target.value)}
                  className="w-full bg-[#150A35] border border-white/10 rounded-xl px-2.5 py-1.5 text-xs text-white placeholder-gray-500 focus:outline-none focus:border-[#A577FF]"
                  placeholder="Channel name..."
                  autoFocus
                />
              </div>

              {/* Make Public Option */}
              <div 
                onClick={() => {
                  const newStatus = !targetChan.isPublic;
                  if (onToggleChannelPublic) {
                    onToggleChannelPublic(group.id, targetChan.id, newStatus);
                  }
                  showToast(newStatus ? 'Channel is now Public ✓' : 'Channel is now Private');
                }}
                className="flex items-center justify-between p-2.5 rounded-xl bg-white/5 hover:bg-white/10 text-xs text-gray-200 cursor-pointer font-medium border border-white/5"
              >
                <div className="flex items-center gap-2">
                  <Globe size={14} className="text-blue-400" />
                  <span>Make Public</span>
                </div>
                {targetChan.isPublic && (
                  <Check size={14} className="text-green-400 font-bold" />
                )}
              </div>

              {/* Save & Delete Buttons */}
              <div className="flex items-center justify-between pt-1">
                <button 
                  type="button" 
                  onClick={() => {
                    if (onDeleteChannel) {
                      onDeleteChannel(group.id, targetChan.id);
                    }
                    if ((activeChannel as any)?.id === targetChan.id) {
                      setActiveChannel(null);
                    }
                    setChannelMenuOpenId(null);
                    setMenuAnchorRect(null);
                    showToast(`Channel "${targetChan.name}" deleted successfully.`);
                  }}
                  className="px-2.5 py-1.5 rounded-lg text-[10px] font-bold bg-red-500/15 hover:bg-red-500/25 text-red-400 hover:text-red-300 border border-red-500/20 flex items-center gap-1 transition-all cursor-pointer"
                  title="Delete Channel"
                >
                  <Trash2 size={12} />
                  <span>Delete</span>
                </button>
                <div className="flex items-center gap-1.5">
                  <button 
                    type="button" 
                    onClick={() => { setChannelMenuOpenId(null); setMenuAnchorRect(null); }}
                    className="px-2.5 py-1.5 rounded-lg text-[10px] font-bold text-gray-400 hover:text-white transition-colors cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button 
                    type="button" 
                    onClick={() => {
                      handleSaveChannelInline(targetChan.id);
                      setMenuAnchorRect(null);
                    }}
                    className="px-3.5 py-1.5 rounded-lg text-[10px] font-bold bg-[#A577FF] hover:bg-[#9161eb] text-white shadow-md cursor-pointer transition-all"
                  >
                    Save
                  </button>
                </div>
              </div>
            </div>
          </>
        );
      })()}

      {/* Invite Modal */}
      {renderInviteModal()}

      <WatchTogetherModal 
        isOpen={isWatchTogetherOpen}
        onClose={() => setIsWatchTogetherOpen(false)}
        currentUser={{ name: userName, avatar: userImage }}
        roomMembers={membersList}
      />
    </div>
  );

  function renderInviteModal() {
    if (!isInviteModalOpen) return null;

    return (
      <div 
        className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-md animate-in fade-in duration-200"
        onClick={() => setIsInviteModalOpen(false)}
      >
        <div 
          className="w-full max-w-md bg-[#150A35] border border-white/10 rounded-3xl p-6 shadow-2xl relative animate-in zoom-in-95 duration-200"
          onClick={(e) => e.stopPropagation()}
        >
          <button 
            onClick={() => setIsInviteModalOpen(false)}
            className="absolute top-5 right-5 text-gray-400 hover:text-white"
          >
            <X size={18} />
          </button>

          <div className="flex items-center gap-3 mb-4">
            <div className="w-10 h-10 rounded-xl bg-[#A577FF]/20 text-[#A577FF] flex items-center justify-center">
              <UserPlus size={20} />
            </div>
            <div>
              <h3 className="text-base font-bold text-white">
                {activeChannel ? `Invite Friends to Channel #${activeChannel.name}` : `Invite Friends to Group`}
              </h3>
              <p className="text-[10px] text-gray-400">
                {activeChannel ? `Send an invitation to join voice chat #${activeChannel.name}` : 'Send an invite message to your friends'}
              </p>
            </div>
          </div>

          <div className="space-y-2 max-h-60 overflow-y-auto custom-scrollbar my-4 pr-1">
            {friendsList.map((friend, idx) => {
              const alreadyInvited = invitedFriends.includes(friend.name);

              return (
                <div key={idx} className="flex items-center justify-between p-2.5 rounded-xl hover:bg-white/5 border border-white/5 transition-colors">
                  <div className="flex items-center gap-3">
                    <img 
                      src={`https://api.dicebear.com/7.x/adventurer/svg?seed=${friend.seed}&backgroundColor=${friend.color}`} 
                      className="w-9 h-9 rounded-full border border-white/10 object-cover" 
                      alt={friend.name} 
                    />
                    <div>
                      <h5 className="text-xs font-bold text-white">{friend.name}</h5>
                      <span className="text-[10px] text-gray-400">{friend.label || 'Friend'}</span>
                    </div>
                  </div>

                  <button 
                    disabled={alreadyInvited}
                    onClick={() => handleInviteFriend(friend.name)}
                    className={`px-3 py-1.5 rounded-full text-xs font-bold transition-all ${
                      alreadyInvited 
                        ? 'bg-green-500/20 text-green-400 cursor-default flex items-center gap-1' 
                        : 'bg-[#A577FF] hover:bg-[#9161eb] text-white shadow-md'
                    }`}
                  >
                    {alreadyInvited ? (
                      <>
                        <Check size={12} /> Sent
                      </>
                    ) : (
                      'Invite'
                    )}
                  </button>
                </div>
              );
            })}
          </div>

          <div className="pt-2 border-t border-white/5 flex justify-end">
            <button 
              onClick={() => setIsInviteModalOpen(false)}
              className="px-4 py-2 rounded-xl text-xs font-bold bg-white/10 hover:bg-white/15 text-white transition-colors cursor-pointer"
            >
              Close
            </button>
          </div>
        </div>
      </div>
    );
  }
}
