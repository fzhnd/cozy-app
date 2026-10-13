"use client";

import React, { useState, useRef } from 'react';
import { 
  Search, MessageSquare, Users, User, LogOut, 
  Bell, Home, Activity, PlayCircle, MoreHorizontal, Plus, Music, Gamepad2, Check, X,
  Radio, Volume2, ChevronUp, ChevronDown, ChevronLeft, Trash2,
  Play, Pause, Shuffle, Repeat, Repeat1, SkipBack, SkipForward, ArrowRight, ArrowLeft, Clock, Camera
} from 'lucide-react';
import { useSession, signOut } from 'next-auth/react';
import ProfileModal from '../components/ProfileModal';
import AuthModal from '../components/AuthModal';
import AddFriendModal from '../components/AddFriendModal';
import FriendProfileModal from '../components/FriendProfileModal';
import ChatView from '../components/ChatView';
import MusicView from '../components/MusicView';
import GroupView, { GroupData, GroupChannel, renderChannelIcon, getChannelIcon } from '../components/GroupView';
import CreateGroupModal from '../components/CreateGroupModal';
import WatchTogetherModal from '../components/WatchTogetherModal';
import PhotoboothView from '../components/PhotoboothView';

const HOME_TRACKS = [
  { id: 1, title: 'Midnight City', artist: 'M83', duration: 244, durationStr: '4:04' },
  { id: 2, title: 'Starboy', artist: 'The Weeknd', duration: 230, durationStr: '3:50' },
  { id: 3, title: 'Get Lucky', artist: 'Daft Punk', duration: 248, durationStr: '4:08' },
  { id: 4, title: 'Nightcall', artist: 'Kavinsky', duration: 259, durationStr: '4:19' },
  { id: 5, title: 'Resonance', artist: 'HOME', duration: 212, durationStr: '3:32' },
];

const STATS_ROOM_CHANNELS = [
  {
    id: 'ch-1',
    name: 'Lounge Lobby',
    groupName: 'Cozy Lounge',
    icon: '🔊',
    totalHours: '1,840h',
    percent: 40,
    barColor: 'bg-yellow-400'
  },
  {
    id: 'ch-2',
    name: 'Gaming Room',
    groupName: 'Cozy Lounge',
    icon: '🎮',
    totalHours: '1,220h',
    percent: 27,
    barColor: 'bg-yellow-400/90'
  },
  {
    id: 'ch-3',
    name: 'Lofi Chill Room',
    groupName: 'Chill & Study',
    icon: '🎧',
    totalHours: '960h',
    percent: 21,
    barColor: 'bg-yellow-400/80'
  },
  {
    id: 'ch-4',
    name: 'Anime & Movie Night',
    groupName: 'Otaku Club',
    icon: '✨',
    totalHours: '380h',
    percent: 8,
    barColor: 'bg-yellow-400/70'
  },
  {
    id: 'ch-5',
    name: 'Late Night Talk',
    groupName: 'Night Owls',
    icon: '🌙',
    totalHours: '180h',
    percent: 4,
    barColor: 'bg-yellow-400/60'
  }
];

const STATS_GAMES_PLAYED = [
  { name: 'Elden Ring', genre: 'Action RPG', seed: 'nature', colors: 'from-green-900 to-teal-800', hours: '840h', percent: 36 },
  { name: 'Uncharted 4', genre: 'Action Adventure', seed: 'adventure', colors: 'from-gray-800 to-gray-600', hours: '520h', percent: 22 },
  { name: 'Dishonored', genre: 'Stealth Action', seed: 'fire', colors: 'from-red-900 to-orange-800', hours: '410h', percent: 18 },
  { name: 'God of War', genre: 'Action Adventure', seed: 'war', colors: 'from-blue-900 to-indigo-800', hours: '330h', percent: 14 },
  { name: 'Persona 5', genre: 'JRPG', seed: 'city', colors: 'from-red-600 to-red-800', hours: '240h', percent: 10 }
];

const STATS_TOP_TRACKS = [
  { title: 'Midnight City', artist: 'M83', hours: '1,480h' },
  { title: 'Starboy', artist: 'The Weeknd', hours: '1,250h' },
  { title: 'Resonance', artist: 'HOME', hours: '1,020h' },
  { title: 'After Hours', artist: 'The Weeknd', hours: '920h' },
  { title: 'Get Lucky', artist: 'Daft Punk', hours: '750h' },
];

export default function CozyApp() {
  const [activeTab, setActiveTab] = useState('home');
  const [gameCarouselIndex, setGameCarouselIndex] = useState(0);

  // Mini Player State (Home View)
  const [miniPlayerTrackIndex, setMiniPlayerTrackIndex] = useState(0);
  const [isMiniPlayerPlaying, setIsMiniPlayerPlaying] = useState(false);
  const [miniPlayerCurrentTime, setMiniPlayerCurrentTime] = useState(0);
  const [isMiniPlayerShuffle, setIsMiniPlayerShuffle] = useState(false);
  const [miniPlayerRepeatState, setMiniPlayerRepeatState] = useState<'none' | 'all' | 'one'>('none');

  // Timer for Mini Player on Home
  React.useEffect(() => {
    if (!isMiniPlayerPlaying) return;
    const timer = setInterval(() => {
      setMiniPlayerCurrentTime(prev => {
        const curTrack = HOME_TRACKS[miniPlayerTrackIndex] || HOME_TRACKS[0];
        if (prev >= curTrack.duration) {
          if (miniPlayerRepeatState === 'one') {
            return 0;
          } else if (miniPlayerRepeatState === 'all') {
            setMiniPlayerTrackIndex(idx => (idx + 1) % HOME_TRACKS.length);
            return 0;
          } else {
            if (miniPlayerTrackIndex === HOME_TRACKS.length - 1) {
              setIsMiniPlayerPlaying(false);
              return curTrack.duration;
            } else {
              setMiniPlayerTrackIndex(idx => idx + 1);
              return 0;
            }
          }
        }
        return prev + 1;
      });
    }, 1000);
    return () => clearInterval(timer);
  }, [isMiniPlayerPlaying, miniPlayerTrackIndex, miniPlayerRepeatState]);

  const formatMiniPlayerTime = (sec: number) => {
    const m = Math.floor(sec / 60);
    const s = Math.floor(sec % 60);
    return `${m}:${s < 10 ? '0' : ''}${s}`;
  };

  const { data: session, status } = useSession();
  const isLoggedIn = status === 'authenticated';

  // Active Voice Channel Session State (Floating Popup in Bottom-Right)
  const [activeVoiceSession, setActiveVoiceSession] = useState<{ group: GroupData; channel: GroupChannel } | null>(null);
  const [isInsideVoiceRoom, setIsInsideVoiceRoom] = useState(false);

  // Public Voice Channels View State
  const [isPublicChannelsView, setIsPublicChannelsView] = useState(false);
  const [publicChannelSearch, setPublicChannelSearch] = useState('');
  const [enteredFromPublicChannels, setEnteredFromPublicChannels] = useState(false);

  // Your Statistic Detail View State
  const [isStatisticView, setIsStatisticView] = useState(false);

  // Watch Together YouTube Window State
  const [isWatchTogetherOpen, setIsWatchTogetherOpen] = useState(false);

  // Group Reordering State (Long-press & Drag to Reorder)
  const [reorderingGroupId, setReorderingGroupId] = useState<string | null>(null);
  const [draggedGroupIndex, setDraggedGroupIndex] = useState<number | null>(null);
  const [dragOverGroupIndex, setDragOverGroupIndex] = useState<number | null>(null);
  const longPressTimerRef = useRef<NodeJS.Timeout | null>(null);
  const isLongPressTriggeredRef = useRef<boolean>(false);
  
  const [customProfile, setCustomProfile] = useState<{ name?: string; image?: string } | null>(null);
  const userName = customProfile?.name || session?.user?.name || 'User';
  const userImage = customProfile?.image || session?.user?.image || 'https://api.dicebear.com/7.x/adventurer/svg?seed=Leo';

  const [isProfileModalOpen, setIsProfileModalOpen] = useState(false);
  const [authModalMode, setAuthModalMode] = useState<'login' | 'signup' | null>(null);

  const [isAddFriendModalOpen, setIsAddFriendModalOpen] = useState(false);
  const [selectedFriend, setSelectedFriend] = useState<any>(null);
  const [isNotifOpen, setIsNotifOpen] = useState(false);
  const notifRef = useRef<HTMLDivElement>(null);

  const [homeSearchQuery, setHomeSearchQuery] = useState('');
  const [isHomeSearchOpen, setIsHomeSearchOpen] = useState(false);
  const homeSearchRef = useRef<HTMLDivElement>(null);

  // Close notifications or search popup on click outside
  React.useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (notifRef.current && !notifRef.current.contains(e.target as Node)) {
        setIsNotifOpen(false);
      }
      if (homeSearchRef.current && !homeSearchRef.current.contains(e.target as Node)) {
        setIsHomeSearchOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);
  
  const [globalUnreadCount, setGlobalUnreadCount] = useState(3);
  
  // Groups State
  const [isCreateGroupModalOpen, setIsCreateGroupModalOpen] = useState(false);
  const [activeGroupId, setActiveGroupId] = useState('grp-1');
  const [groups, setGroups] = useState<GroupData[]>([
    {
      id: 'grp-1',
      name: 'Cozy Hangout',
      icon: '#1',
      description: 'Relaxed hangouts and cozy community chats',
      isCreator: true,
      creatorName: userName,
      channels: [
        { id: 'vc-1', name: 'Lobby', icon: '🔊', activeUsers: 4, isPublic: true },
        { id: 'vc-2', name: 'Gaming Room', icon: '🎮', activeUsers: 0, isPublic: false },
        { id: 'vc-3', name: 'Chill & Music', icon: '🎧', activeUsers: 0, isPublic: false },
      ],
      members: [
        { id: 'm-0', name: userName, role: 'owner', avatar: userImage, status: 'bg-green-500' },
        { id: 'm-1', name: 'Luna', role: 'admin', avatar: 'https://api.dicebear.com/7.x/adventurer/svg?seed=Luna&backgroundColor=F9EBD8', status: 'bg-red-500' },
        { id: 'm-2', name: 'Jasper', role: 'member', avatar: 'https://api.dicebear.com/7.x/adventurer/svg?seed=Jasper&backgroundColor=F9EBD8', status: 'bg-green-500' },
        { id: 'm-3', name: 'Mimi', role: 'member', avatar: 'https://api.dicebear.com/7.x/adventurer/svg?seed=Mimi&backgroundColor=8CC6C5', status: 'bg-yellow-500' },
        { id: 'm-4', name: 'Felix', role: 'member', avatar: 'https://api.dicebear.com/7.x/adventurer/svg?seed=Felix&backgroundColor=F2C8F7', status: 'bg-gray-500' },
      ],
      messages: [
        { id: 'gmsg-1', sender: 'Luna', avatar: 'https://api.dicebear.com/7.x/adventurer/svg?seed=Luna&backgroundColor=F9EBD8', text: 'Hello everyone! Anyone up to play together today?', time: '14:20' },
        { id: 'gmsg-2', sender: 'Jasper', avatar: 'https://api.dicebear.com/7.x/adventurer/svg?seed=Jasper&backgroundColor=F9EBD8', text: "Let's go! Join the Lobby voice channel", time: '14:25' }
      ]
    }
  ]);

  const [targetChannelId, setTargetChannelId] = useState<string | null>(null);

  // Helper to persist user data to localStorage and Supabase PostgreSQL per user account
  const syncUserData = (data: { groups?: GroupData[]; friendsList?: any[]; notifications?: any[] }) => {
    if (!session?.user?.email) return;
    const email = session.user.email.toLowerCase();

    try {
      if (data.groups) localStorage.setItem(`cozy_groups_${email}`, JSON.stringify(data.groups));
      if (data.friendsList) localStorage.setItem(`cozy_friends_${email}`, JSON.stringify(data.friendsList));
      if (data.notifications) localStorage.setItem(`cozy_notifs_${email}`, JSON.stringify(data.notifications));
    } catch (e) {}

    fetch('/api/user/sync', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ data })
    }).catch(err => console.error('Database sync error:', err));
  };

  // Sync across devices when user is authenticated
  React.useEffect(() => {
    if (!session?.user?.email) return;
    const email = session.user.email.toLowerCase();

    // 1. Immediately read from account-specific cache
    const cachedGroups = localStorage.getItem(`cozy_groups_${email}`);
    if (cachedGroups) {
      try {
        const parsed = JSON.parse(cachedGroups);
        if (Array.isArray(parsed) && parsed.length > 0) setGroups(parsed);
      } catch (e) {}
    }
    const cachedFriends = localStorage.getItem(`cozy_friends_${email}`);
    if (cachedFriends) {
      try {
        const parsed = JSON.parse(cachedFriends);
        if (Array.isArray(parsed) && parsed.length > 0) setFriendsList(parsed);
      } catch (e) {}
    }
    const cachedNotifs = localStorage.getItem(`cozy_notifs_${email}`);
    if (cachedNotifs) {
      try {
        const parsed = JSON.parse(cachedNotifs);
        if (Array.isArray(parsed) && parsed.length > 0) setNotifications(parsed);
      } catch (e) {}
    }

    // 2. Fetch latest synced data from database
    fetch('/api/user/sync')
      .then(res => res.json())
      .then(res => {
        if (res.success && res.data) {
          if (res.data.groups && Array.isArray(res.data.groups) && res.data.groups.length > 0) {
            setGroups(res.data.groups);
            try { localStorage.setItem(`cozy_groups_${email}`, JSON.stringify(res.data.groups)); } catch (e) {}
          }
          if (res.data.friendsList && Array.isArray(res.data.friendsList) && res.data.friendsList.length > 0) {
            setFriendsList(res.data.friendsList);
            try { localStorage.setItem(`cozy_friends_${email}`, JSON.stringify(res.data.friendsList)); } catch (e) {}
          }
          if (res.data.notifications && Array.isArray(res.data.notifications) && res.data.notifications.length > 0) {
            setNotifications(res.data.notifications);
            try { localStorage.setItem(`cozy_notifs_${email}`, JSON.stringify(res.data.notifications)); } catch (e) {}
          }
        }
      })
      .catch(err => console.error("Error fetching user sync data:", err));
  }, [session?.user?.email]);

  // Read initial unread count & fallback saved groups
  React.useEffect(() => {
    try {
      const savedChats = localStorage.getItem('cozyChatsV2');
      if (savedChats) {
        const chats = JSON.parse(savedChats);
        const total = chats.reduce((acc: number, chat: any) => acc + (chat.name !== 'Luna' && chat.unreadCount ? chat.unreadCount : 0), 0);
        setGlobalUnreadCount(total);
      }
      const savedGroups = localStorage.getItem('cozy_groups_data_v1');
      if (savedGroups && !session?.user?.email) {
        const parsed = JSON.parse(savedGroups);
        const filteredParsed = parsed.filter((g: any) => g.id !== 'grp-2' && g.name !== 'Mobel Lejen Squad');
        const sanitized = filteredParsed.map((g: any) => ({
          ...g,
          channels: (g.channels || []).map((c: any) => {
            const match = c.name?.match(/^([^\w\s\u00C0-\u024F\u1E00-\u1EFF]+)\s*(.*)$/);
            const pub = c.isPublic !== undefined ? c.isPublic : (c.id === 'vc-1');
            const resolvedIcon = getChannelIcon(c);
            if (match) {
              return {
                ...c,
                icon: resolvedIcon,
                name: match[2].trim() || c.name,
                isPublic: pub
              };
            }
            return {
              ...c,
              icon: resolvedIcon,
              isPublic: pub
            };
          })
        }));
        if (sanitized.length > 0) {
          setGroups(sanitized);
        }
      }
    } catch (e) {}
  }, []);

  const handleCreateGroup = (groupData: { name: string; icon: string; description: string }) => {
    const newGroup: GroupData = {
      id: 'grp-' + Date.now(),
      name: groupData.name,
      icon: groupData.icon,
      description: groupData.description,
      isCreator: true,
      creatorName: userName,
      channels: [
        { id: 'vc-' + Date.now() + '-1', name: 'Lobby', icon: '🔊', activeUsers: 0, isPublic: true },
        { id: 'vc-' + Date.now() + '-2', name: 'Gaming Room', icon: '🎮', activeUsers: 0, isPublic: false }
      ],
      members: [
        { id: 'm-self', name: userName, role: 'owner', avatar: userImage, status: 'bg-green-500' }
      ],
      messages: [
        { 
          id: 'm-init', 
          sender: userName, 
          avatar: userImage, 
          text: `Group ${groupData.name} has just been created. Welcome everyone! 🎉`, 
          time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }), 
          isUser: true 
        }
      ]
    };

    setGroups(prev => {
      const updated = [newGroup, ...prev];
      try { localStorage.setItem('cozy_groups_data_v1', JSON.stringify(updated)); } catch (e) {}
      syncUserData({ groups: updated });
      return updated;
    });

    setActiveTab('group');
    setActiveGroupId(newGroup.id);
  };

  const handleUpdateGroupName = (groupId: string, newName: string) => {
    setGroups(prev => {
      const updated = prev.map(g => g.id === groupId ? { ...g, name: newName } : g);
      try { localStorage.setItem('cozy_groups_data_v1', JSON.stringify(updated)); } catch (e) {}
      syncUserData({ groups: updated });
      return updated;
    });
  };

  const handleDeleteGroup = (groupId: string) => {
    setGroups(prev => {
      const updated = prev.filter(g => g.id !== groupId);
      try { localStorage.setItem('cozy_groups_data_v1', JSON.stringify(updated)); } catch (e) {}
      syncUserData({ groups: updated });
      return updated;
    });
    if (activeGroupId === groupId) {
      setActiveTab('home');
    }
  };

  const handleAddChannel = (groupId: string, channelName: string, icon: string = '🔊', isPublic: boolean = false) => {
    setGroups(prev => {
      const updated = prev.map(g => {
        if (g.id === groupId) {
          const newChan = { id: 'vc-' + Date.now(), name: channelName, icon, activeUsers: 0, isPublic };
          return { ...g, channels: [newChan, ...g.channels] };
        }
        return g;
      });
      try { localStorage.setItem('cozy_groups_data_v1', JSON.stringify(updated)); } catch (e) {}
      syncUserData({ groups: updated });
      return updated;
    });
  };

  const reorderGroups = (fromIndex: number, toIndex: number) => {
    if (fromIndex === toIndex) return;
    setGroups(prev => {
      const updated = [...prev];
      const [moved] = updated.splice(fromIndex, 1);
      updated.splice(toIndex, 0, moved);
      try { localStorage.setItem('cozy_groups_data_v1', JSON.stringify(updated)); } catch (e) {}
      syncUserData({ groups: updated });
      return updated;
    });
  };

  const handleToggleChannelPublic = (groupId: string, channelId: string, isPublic: boolean) => {
    setGroups(prev => {
      const updated = prev.map(g => {
        if (g.id === groupId) {
          return {
            ...g,
            channels: g.channels.map(c => c.id === channelId ? { ...c, isPublic } : c)
          };
        }
        return g;
      });
      try { localStorage.setItem('cozy_groups_data_v1', JSON.stringify(updated)); } catch (e) {}
      syncUserData({ groups: updated });
      return updated;
    });
  };

  const handleDeleteChannel = (groupId: string, channelId: string) => {
    setGroups(prev => {
      const updated = prev.map(g => {
        if (g.id === groupId) {
          return {
            ...g,
            channels: g.channels.filter(c => c.id !== channelId)
          };
        }
        return g;
      });
      try { localStorage.setItem('cozy_groups_data_v1', JSON.stringify(updated)); } catch (e) {}
      syncUserData({ groups: updated });
      return updated;
    });
  };

  const handleRenameChannel = (groupId: string, channelId: string, newName: string, newIcon?: string) => {
    setGroups(prev => {
      const updated = prev.map(g => {
        if (g.id === groupId) {
          return {
            ...g,
            channels: g.channels.map(c => {
              if (c.id === channelId) {
                const match = newName.match(/^([^\w\s\u00C0-\u024F\u1E00-\u1EFF]+)\s*(.*)$/);
                const finalIcon = newIcon || (match ? match[1] : c.icon || '🔊');
                const cleanName = match ? match[2].trim() : newName.trim();
                return {
                  ...c,
                  name: cleanName,
                  icon: finalIcon
                };
              }
              return c;
            })
          };
        }
        return g;
      });
      try { localStorage.setItem('cozy_groups_data_v1', JSON.stringify(updated)); } catch (e) {}
      syncUserData({ groups: updated });
      return updated;
    });
  };

  const handleUpdateGroupIcon = (groupId: string, newIcon: string) => {
    setGroups(prev => {
      const updated = prev.map(g => g.id === groupId ? { ...g, icon: newIcon } : g);
      try { localStorage.setItem('cozy_groups_data_v1', JSON.stringify(updated)); } catch (e) {}
      syncUserData({ groups: updated });
      return updated;
    });
  };

  const currentGroup = groups.find(g => g.id === activeGroupId) || groups[0];
  
  // Public Channels for Dashboard
  const publicChannels = groups.flatMap(g => 
    g.channels.filter(c => c.isPublic).map(c => ({
      ...c,
      group: g
    }))
  );

  const filteredPublicChannels = publicChannels.filter(c => 
    c.name.toLowerCase().includes(publicChannelSearch.toLowerCase()) ||
    c.group.name.toLowerCase().includes(publicChannelSearch.toLowerCase())
  );

  const handleJoinPublicChannel = (channel: any) => {
    setActiveVoiceSession({ group: channel.group, channel });
    setEnteredFromPublicChannels(true);
    setActiveGroupId(channel.group.id);
    setTargetChannelId(channel.id);
    setActiveTab('group');
    setIsPublicChannelsView(false);
  };

  const handleReturnToVoiceChannel = () => {
    if (!activeVoiceSession) return;
    setEnteredFromPublicChannels(false);
    const targetId = activeVoiceSession.channel.id;
    const targetGrpId = activeVoiceSession.group.id;
    setActiveGroupId(targetGrpId);
    setActiveTab('group');
    setIsPublicChannelsView(false);
    setTargetChannelId(null);
    setTimeout(() => {
      setTargetChannelId(targetId);
    }, 10);
  };

  const handleLeaveVoiceSession = () => {
    setActiveVoiceSession(null);
    setTargetChannelId(null);
    setIsInsideVoiceRoom(false);
  };

  const handleChannelActiveChange = (channel: GroupChannel | null) => {
    if (!channel) {
      setActiveVoiceSession(null);
    } else {
      if (currentGroup) {
        setActiveVoiceSession({ group: currentGroup, channel });
      }
    }
  };


  const HOME_SEARCH_DATA = [
    { type: 'game', name: 'Uncharted 4', desc: 'Game' },
    { type: 'game', name: 'Dishonored', desc: 'Game' },
    { type: 'game', name: 'Elden Ring', desc: 'Game' },
    { type: 'activity', name: 'Photobooth', desc: 'Activity' },
    { type: 'activity', name: 'Watch Together', desc: 'Activity' },
    { type: 'activity', name: 'Listening Together', desc: 'Activity' },
    { type: 'contact', name: 'Luna', desc: 'Friend' },
    { type: 'contact', name: 'Jasper', desc: 'Friend' },
    { type: 'contact', name: 'Mimi', desc: 'Friend' },
  ];

  const [friendsList, setFriendsList] = useState([
    { name: 'Aneka', seed: 'Aneka', color: 'A577FF', status: 'bg-red-500', label: 'In Game', gameName: 'Uncharted 4' },
    { name: 'Jasper', seed: 'Jasper', color: 'F9EBD8', status: 'bg-green-500', label: 'Online' },
    { name: 'Mimi', seed: 'Mimi', color: '8CC6C5', status: 'bg-yellow-500', label: 'In Channel', channelName: 'Lobby' },
    { name: 'Felix', seed: 'Felix', color: 'F2C8F7', status: 'bg-gray-500', label: 'Offline' },
    { name: 'Oscar', seed: 'Oscar', color: 'A577FF', status: 'bg-green-500', label: 'Online' },
    { name: 'Luna', seed: 'Luna', color: 'F9EBD8', status: 'bg-red-500', label: 'In Game', gameName: 'Elden Ring' },
  ]);

  const [notifications, setNotifications] = useState([
    { id: 1, type: 'game_invite', name: 'Luna', seed: 'Luna', game: 'Elden Ring', text: 'invited you to play', time: '15m ago', read: false },
    { id: 2, type: 'activity', name: 'Jasper', seed: 'Jasper', activity: 'Watch Together', text: 'started a', time: '1h ago', read: false },
    { id: 3, type: 'game_invite', name: 'Oscar', seed: 'Oscar', game: 'Dishonored', text: 'invited you to play', time: '2h ago', read: false },
    { id: 4, type: 'game_invite', name: 'Aneka', seed: 'Aneka', game: 'Uncharted 4', text: 'invited you to play', time: '3h ago', read: false },
    { id: 5, type: 'photobooth', name: 'Mimi', seed: 'Mimi', activity: 'Photobooth', text: 'created a new', time: '5h ago', read: true },
    { id: 6, type: 'activity', name: 'Felix', seed: 'Felix', activity: 'Listening Together', text: 'started a', time: '7h ago', read: true },
    { id: 7, type: 'photobooth', name: 'Oscar', seed: 'Oscar', activity: 'Photobooth', text: 'created a new', time: 'Yesterday', read: true },
    { id: 8, type: 'game_invite', name: 'Luna', seed: 'Luna', game: 'Persona 5', text: 'invited you to play', time: 'Yesterday', read: true },
    { id: 9, type: 'activity', name: 'Jasper', seed: 'Jasper', activity: 'Watch Together', text: 'started a', time: '2 days ago', read: true },
    { id: 10, type: 'photobooth', name: 'Aneka', seed: 'Aneka', activity: 'Photobooth', text: 'created a new', time: '3 days ago', read: true },
  ]);

  const unreadNotifsCount = notifications.filter(n => !n.read).length;

  const [targetChatName, setTargetChatName] = useState<string | undefined>();
  const [triggerCall, setTriggerCall] = useState<'audio' | 'video' | false>(false);

  const markNotificationAsRead = (id: number) => {
    setNotifications(prev => {
      const updated = prev.map(x => x.id === id ? { ...x, read: true } : x);
      syncUserData({ notifications: updated });
      return updated;
    });
  };

  const handleMarkAllRead = (e?: React.MouseEvent) => {
    if (e) {
      e.preventDefault();
      e.stopPropagation();
    }
    setNotifications(prev => {
      const updated = prev.map(n => ({ ...n, read: true }));
      syncUserData({ notifications: updated });
      return updated;
    });
  };

  const handleAcceptFriendRequest = (friend: any) => {
    setFriendsList(prev => {
      const updated = [...prev, { name: friend.name, seed: friend.seed, color: friend.color, status: 'bg-green-500', label: 'Online' }];
      syncUserData({ friendsList: updated });
      return updated;
    });
  };

  const handleUnfriend = (friend: any) => {
    setFriendsList(prev => {
      const updated = prev.filter(f => f.name !== friend.name);
      syncUserData({ friendsList: updated });
      return updated;
    });
    setSelectedFriend(null);
  };

  const handleMessageFriend = (friend: any) => {
    setTargetChatName(friend.name);
    setActiveTab('chat');
    setSelectedFriend(null);
  };

  const handleCallFriend = (friend: any, isVideo: boolean = false) => {
    setTargetChatName(friend.name);
    setTriggerCall(isVideo ? 'video' : 'audio');
    setActiveTab('chat');
    setSelectedFriend(null);
    // Reset trigger so it can be triggered again later
    setTimeout(() => setTriggerCall(false), 500);
  };

  return (
    <div className="flex h-screen bg-[#0D0524] p-4 md:p-6 gap-6 font-sans text-[#F5F7FC] selection:bg-[#A577FF] selection:text-white overflow-hidden">
      


      {/* === 1. LEFT SIDEBAR === */}
      <div className="w-[85px] h-full bg-[#150A35] border border-white/5 rounded-[32px] flex flex-col items-center py-6 shadow-2xl z-20 shrink-0 select-none">
        {/* Top: Logo & Main Nav */}
        <div className="flex flex-col items-center gap-4 shrink-0 w-full">
          {/* Logo */}
          <div className="w-12 h-12 bg-gradient-to-tr from-[#A577FF] to-[#7065D4] rounded-2xl flex items-center justify-center mb-1 shadow-[0_0_20px_rgba(165,119,255,0.3)]">
            <span className="text-white font-black text-2xl">C</span>
          </div>

          {/* Nav Icons */}
          <div onClick={() => { setActiveTab('home'); setIsPublicChannelsView(false); setEnteredFromPublicChannels(false); setIsStatisticView(false); }} className={`relative group cursor-pointer flex flex-col items-center transition-all ${activeTab === 'home' ? 'text-white' : 'text-gray-500 hover:text-white'}`}>
            <div className={`p-3 rounded-xl transition-all ${activeTab === 'home' ? 'bg-[#A577FF]/20 text-[#A577FF]' : ''}`}>
              <Home size={22} />
            </div>
          </div>
          
          {isLoggedIn && (
            <>
              <div onClick={() => { setActiveTab('music'); setIsStatisticView(false); }} className={`relative group cursor-pointer flex flex-col items-center transition-all ${activeTab === 'music' ? 'text-white' : 'text-gray-500 hover:text-white'}`}>
                <div className={`p-3 rounded-xl transition-all ${activeTab === 'music' ? 'bg-[#A577FF]/20 text-[#A577FF]' : 'hover:bg-white/5'}`}>
                  <Music size={22} />
                </div>
              </div>
              <div onClick={() => { setActiveTab('chat'); setIsStatisticView(false); }} className={`relative group cursor-pointer flex flex-col items-center transition-all ${activeTab === 'chat' ? 'text-white' : 'text-gray-500 hover:text-white'}`}>
                <div className={`p-3 rounded-xl transition-all ${activeTab === 'chat' ? 'bg-[#A577FF]/20 text-[#A577FF]' : 'hover:bg-white/5'}`}>
                  <MessageSquare size={22} />
                </div>
                {globalUnreadCount > 0 && (
                  <span className="absolute top-1 right-1 bg-[#A577FF] text-white text-[10px] font-bold px-1.5 py-0.5 rounded-full border-2 border-[#150A35]">{globalUnreadCount}</span>
                )}
              </div>
              <div onClick={() => { setActiveTab('photobooth'); setIsStatisticView(false); }} className={`relative group cursor-pointer flex flex-col items-center transition-all ${activeTab === 'photobooth' ? 'text-white' : 'text-gray-500 hover:text-white'}`} title="Photobooth">
                <div className={`p-3 rounded-xl transition-all ${activeTab === 'photobooth' ? 'bg-[#A577FF]/20 text-[#A577FF]' : 'hover:bg-white/5'}`}>
                  <Camera size={22} />
                </div>
              </div>
            </>
          )}
        </div>

        {isLoggedIn && (
          <>
            {/* Top Border Line Groups */}
            <div className="w-8 h-[1px] bg-white/10 mt-3 mb-1 shrink-0"></div>
            
            {/* Groups List (Scrollable, drag & long-press reorder) */}
            <div className="flex-1 min-h-0 w-full flex flex-col gap-3 items-center overflow-y-auto custom-scrollbar px-2 pt-3.5 pb-3 relative">
              {/* Overlay when reorder mode active */}
              {reorderingGroupId && (
                <div 
                  className="fixed inset-0 z-30" 
                  onClick={() => setReorderingGroupId(null)} 
                />
              )}

              {groups.map((grp, index) => {
                const isActive = activeTab === 'group' && activeGroupId === grp.id;
                const isReorderingThis = reorderingGroupId === grp.id;
                const isDragOver = dragOverGroupIndex === index && draggedGroupIndex !== index;
                const isImg = grp.icon && (grp.icon.startsWith('http') || grp.icon.startsWith('data:'));

                return (
                  <div key={grp.id} className="relative group/grp flex items-center shrink-0">
                    <div 
                      draggable
                      onDragStart={(e) => {
                        setDraggedGroupIndex(index);
                        e.dataTransfer.effectAllowed = 'move';
                      }}
                      onDragOver={(e) => {
                        e.preventDefault();
                        e.dataTransfer.dropEffect = 'move';
                        setDragOverGroupIndex(index);
                      }}
                      onDragLeave={() => {
                        if (dragOverGroupIndex === index) setDragOverGroupIndex(null);
                      }}
                      onDrop={(e) => {
                        e.preventDefault();
                        if (draggedGroupIndex !== null && draggedGroupIndex !== index) {
                          reorderGroups(draggedGroupIndex, index);
                        }
                        setDraggedGroupIndex(null);
                        setDragOverGroupIndex(null);
                        setReorderingGroupId(null);
                      }}
                      onDragEnd={() => {
                        setDraggedGroupIndex(null);
                        setDragOverGroupIndex(null);
                      }}
                      onPointerDown={() => {
                        isLongPressTriggeredRef.current = false;
                        longPressTimerRef.current = setTimeout(() => {
                          isLongPressTriggeredRef.current = true;
                          setReorderingGroupId(grp.id);
                        }, 350);
                      }}
                      onPointerUp={() => {
                        if (longPressTimerRef.current) {
                          clearTimeout(longPressTimerRef.current);
                          longPressTimerRef.current = null;
                        }
                      }}
                      onPointerLeave={() => {
                        if (longPressTimerRef.current) {
                          clearTimeout(longPressTimerRef.current);
                          longPressTimerRef.current = null;
                        }
                      }}
                      onClick={(e) => {
                        if (isLongPressTriggeredRef.current) {
                          e.preventDefault();
                          e.stopPropagation();
                          isLongPressTriggeredRef.current = false;
                          return;
                        }
                        if (reorderingGroupId) {
                          setReorderingGroupId(null);
                        }
                        setActiveTab('group');
                        setActiveGroupId(grp.id);
                        setTargetChannelId(null);
                        setEnteredFromPublicChannels(false);
                        setIsStatisticView(false);
                      }}
                      title={`${grp.name} (Long-press to reorder)`}
                      className={`w-11 h-11 rounded-2xl shrink-0 flex items-center justify-center cursor-pointer transition-all overflow-hidden relative select-none ${
                        isReorderingThis
                          ? 'ring-4 ring-[#A577FF] border-2 border-white scale-110 shadow-[0_0_20px_rgba(165,119,255,0.9)] z-40 bg-[#A577FF]/40'
                          : isActive 
                            ? 'bg-[#A577FF] text-white border-2 border-[#A577FF] shadow-[0_0_15px_rgba(165,119,255,0.6)] scale-105' 
                            : 'bg-white/5 border border-white/10 text-gray-400 hover:text-white hover:bg-white/15 hover:border-white/20'
                      } ${isDragOver ? 'ring-2 ring-white border-dashed scale-105 opacity-80' : ''}`}
                    >
                      {isImg ? (
                        <img src={grp.icon} alt={grp.name} className="w-full h-full object-cover pointer-events-none" />
                      ) : (
                        <span className="text-xs font-bold pointer-events-none">{grp.icon}</span>
                      )}
                    </div>

                    {/* Floating Up / Down Quick Reorder Controls */}
                    {isReorderingThis && (
                      <div className="fixed left-[90px] z-50 flex items-center gap-1 bg-[#251A45] border border-[#A577FF]/60 p-1.5 rounded-xl shadow-2xl animate-in fade-in slide-in-from-left-2 whitespace-nowrap">
                        <button 
                          disabled={index === 0}
                          onClick={(e) => {
                            e.stopPropagation();
                            reorderGroups(index, index - 1);
                          }}
                          className="w-7 h-7 rounded-lg bg-white/5 hover:bg-[#A577FF] text-white disabled:opacity-25 disabled:hover:bg-white/5 flex items-center justify-center transition-all cursor-pointer"
                          title="Move up"
                        >
                          <ChevronUp size={14} />
                        </button>
                        <button 
                          disabled={index === groups.length - 1}
                          onClick={(e) => {
                            e.stopPropagation();
                            reorderGroups(index, index + 1);
                          }}
                          className="w-7 h-7 rounded-lg bg-white/5 hover:bg-[#A577FF] text-white disabled:opacity-25 disabled:hover:bg-white/5 flex items-center justify-center transition-all cursor-pointer"
                          title="Move down"
                        >
                          <ChevronDown size={14} />
                        </button>
                        <button 
                          onClick={(e) => {
                            e.stopPropagation();
                            if (window.confirm(`Delete group "${grp.name}"?`)) {
                              handleDeleteGroup(grp.id);
                              setReorderingGroupId(null);
                            }
                          }}
                          className="w-7 h-7 rounded-lg bg-red-500/20 hover:bg-red-500 text-red-300 hover:text-white flex items-center justify-center transition-all cursor-pointer"
                          title="Delete this group"
                        >
                          <Trash2 size={13} />
                        </button>
                        <button 
                          onClick={(e) => {
                            e.stopPropagation();
                            setReorderingGroupId(null);
                          }}
                          className="w-7 h-7 rounded-lg bg-white/10 hover:bg-white/20 text-green-400 flex items-center justify-center transition-all cursor-pointer"
                          title="Done"
                        >
                          <Check size={14} />
                        </button>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>

            {/* Bottom Border Line Before + Button */}
            <div className="w-8 h-[1px] bg-white/10 mt-1 mb-3 shrink-0"></div>

            {/* Create Group Button */}
            <div className="shrink-0 flex flex-col items-center">
              <div 
                onClick={() => setIsCreateGroupModalOpen(true)}
                title="Create New Group"
                className="w-10 h-10 rounded-xl bg-white/5 border border-white/10 flex items-center justify-center text-gray-400 hover:text-white hover:bg-[#A577FF] hover:border-[#A577FF] hover:shadow-[0_0_15px_rgba(165,119,255,0.4)] cursor-pointer transition-all group"
              >
                <Plus size={22} className="group-hover:scale-110 transition-transform" />
              </div>
            </div>
          </>
        )}
      </div>

      <div className="flex-1 flex flex-col min-w-0 bg-[#150A35] border border-white/5 rounded-[40px] overflow-hidden shadow-2xl relative">
        
        {/* HEADER */}
        {activeTab === 'home' && !isPublicChannelsView && !isStatisticView && (
          <div className="h-20 px-8 md:px-10 flex justify-between items-center bg-[#150A35]/90 backdrop-blur-xl z-30 border-b border-white/5 shrink-0">
            <div>
              <h1 className="text-xl font-medium text-gray-400">
                {isLoggedIn ? (
                  <>Good evening, <span className="font-bold text-[#F5F7FC]">{userName}</span></>
                ) : 'Welcome to Cozy!'}
              </h1>
            </div>
            
            <div className="flex items-center gap-6">
              <div className="relative hidden md:block" ref={homeSearchRef}>
                <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" size={16} />
                <input 
                  type="text" 
                  placeholder="Search" 
                  value={homeSearchQuery}
                  onChange={(e) => {
                    setHomeSearchQuery(e.target.value);
                    setIsHomeSearchOpen(true);
                  }}
                  onFocus={() => setIsHomeSearchOpen(true)}
                  className="w-64 bg-white/5 border border-white/10 text-[#F5F7FC] placeholder-gray-500 pl-11 pr-4 py-2 rounded-full focus:outline-none focus:ring-1 focus:ring-[#A577FF] focus:bg-white/10 transition-all text-sm" 
                />
                
                {isHomeSearchOpen && homeSearchQuery.trim() !== '' && (
                  <div 
                    onClick={(e) => e.stopPropagation()}
                    onMouseDown={(e) => e.stopPropagation()}
                    className="absolute top-12 left-0 w-64 bg-[#251A45] border border-white/10 rounded-2xl shadow-[0_10px_40px_rgba(0,0,0,0.8)] overflow-hidden z-50 animate-in fade-in slide-in-from-top-2"
                  >
                    <div className="max-h-64 overflow-y-auto custom-scrollbar p-2 space-y-1">
                      {(() => {
                        const results = HOME_SEARCH_DATA.filter(item => item.name.toLowerCase().includes(homeSearchQuery.toLowerCase()));
                        if (results.length === 0) return <div className="p-3 text-center text-xs text-gray-500">No results found.</div>;
                        return results.map((item, idx) => (
                          <div 
                            key={idx}
                            onClick={() => {
                              setIsHomeSearchOpen(false);
                              setHomeSearchQuery('');
                              if (item.type === 'contact') setActiveTab('chat');
                            }}
                            className="flex items-center justify-between p-2 rounded-xl hover:bg-white/5 cursor-pointer transition-colors"
                          >
                            <span className="text-xs font-bold text-white">{item.name}</span>
                            <span className="text-[10px] text-gray-500 px-2 py-0.5 bg-white/5 rounded-md border border-white/5">{item.desc}</span>
                          </div>
                        ));
                      })()}
                    </div>
                  </div>
                )}
              </div>
              
              {isLoggedIn ? (
                <div className="relative" ref={notifRef}>
                  <div 
                    onClick={() => setIsNotifOpen(!isNotifOpen)}
                    className="w-10 h-10 rounded-full bg-white/5 border border-white/10 flex items-center justify-center text-gray-400 hover:text-[#A577FF] cursor-pointer transition-colors relative"
                  >
                    <Bell size={18} />
                    {unreadNotifsCount > 0 && (
                      <span className="absolute top-2 right-2.5 w-2 h-2 bg-[#A577FF] rounded-full border-2 border-[#150A35]"></span>
                    )}
                  </div>

                  {/* Notif Dropdown */}
                  {isNotifOpen && (
                    <div 
                      onMouseDown={(e) => e.stopPropagation()}
                      onClick={(e) => e.stopPropagation()}
                      onWheel={(e) => e.stopPropagation()}
                      className="absolute right-0 top-14 w-80 bg-[#150A35] border border-white/10 rounded-2xl shadow-[0_10px_40px_rgba(0,0,0,0.8)] overflow-hidden z-50 animate-in fade-in slide-in-from-top-2"
                    >
                      <div className="p-4 border-b border-white/5 flex justify-between items-center">
                        <h3 className="text-white font-bold text-sm">Notifications</h3>
                        <button 
                          type="button"
                          onMouseDown={(e) => e.stopPropagation()}
                          onClick={(e) => {
                            e.preventDefault();
                            e.stopPropagation();
                            handleMarkAllRead(e);
                          }} 
                          className="text-[#A577FF] hover:text-white text-[11px] font-bold cursor-pointer transition-colors py-1 px-2.5 rounded-lg hover:bg-white/10 select-none"
                        >
                          Mark all read
                        </button>
                      </div>
                      <div className="max-h-[360px] overflow-y-auto custom-scrollbar overscroll-contain pr-1">
                        {notifications.length === 0 && <div className="p-4 text-center text-xs text-gray-400">No new notifications</div>}
                        {notifications.map((n) => (
                          <div 
                            key={n.id} 
                            onClick={() => markNotificationAsRead(n.id)}
                            className={`p-4 border-b border-white/5 transition-colors relative cursor-pointer ${
                              n.read ? 'bg-transparent hover:bg-white/5' : 'bg-white/10 hover:bg-white/15'
                            }`}
                          >
                            {!n.read && <div className="absolute top-4 right-4 w-2 h-2 bg-[#A577FF] rounded-full shadow-[0_0_8px_rgba(165,119,255,0.8)]"></div>}
                            <div className="flex items-start gap-3">
                              <img src={`https://api.dicebear.com/7.x/adventurer/svg?seed=${n.seed}`} className="w-9 h-9 rounded-full border border-[#150A35] object-cover bg-[#0D0524]" alt="avatar"/>
                              <div className="flex-1 min-w-0 pr-4">
                                <p className="text-xs text-gray-300">
                                  <span className="font-bold text-white">{n.name}</span> {n.text} 
                                  {n.game && <span className="font-bold text-[#A577FF]"> {n.game}</span>}
                                  {n.activity && <span className="font-bold text-[#A577FF]"> {n.activity}</span>}
                                </p>
                                <span className="text-[10px] text-gray-500 mt-0.5 block">{n.time}</span>
                                {n.type === 'game_invite' && (
                                  <button onClick={(e) => { e.stopPropagation(); markNotificationAsRead(n.id); }} className="w-full mt-2.5 bg-[#A577FF] hover:bg-[#9161eb] text-white text-[10px] font-bold py-1.5 rounded-lg transition-colors shadow-lg cursor-pointer">Join Game</button>
                                )}
                                {n.type === 'activity' && (
                                  <button onClick={(e) => { e.stopPropagation(); markNotificationAsRead(n.id); }} className="w-full mt-2.5 bg-white/5 hover:bg-white/10 text-white text-[10px] font-bold py-1.5 rounded-lg transition-colors border border-white/5 cursor-pointer">Join Activity</button>
                                )}
                                {n.type === 'photobooth' && (
                                  <button onClick={(e) => { e.stopPropagation(); markNotificationAsRead(n.id); }} className="w-full mt-2.5 bg-white/5 hover:bg-white/10 text-white text-[10px] font-bold py-1.5 rounded-lg transition-colors border border-white/5 cursor-pointer">Join Photobooth</button>
                                )}
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              ) : (
                <div className="flex items-center gap-4">
                  <button onClick={() => setAuthModalMode('login')} className="text-gray-300 font-bold text-sm hover:text-[#A577FF] transition-colors cursor-pointer">
                    Log in
                  </button>
                  <button onClick={() => setAuthModalMode('signup')} className="bg-[#A577FF] text-white font-bold text-sm px-6 py-2 rounded-full hover:bg-opacity-90 transition-all shadow-[0_4px_14px_rgba(165,119,255,0.3)] cursor-pointer">
                    Sign up
                  </button>
                </div>
              )}
            </div>
          </div>
        )}


        {/* VIEW VOICE CHANNELS (PUBLIC) */}
        {activeTab === 'home' && isPublicChannelsView && (
          <div className="flex-1 flex flex-col min-h-0 overflow-hidden">
            {/* Header: < Voice Channels (Public) & Search Bar */}
            <div className="h-20 px-8 md:px-10 flex justify-between items-center bg-[#150A35]/95 backdrop-blur-xl z-30 border-b border-white/5 shrink-0">
              <div className="flex items-center gap-3">
                <button 
                  onClick={() => setIsPublicChannelsView(false)}
                  className="w-10 h-10 rounded-full bg-white/5 hover:bg-[#A577FF]/20 border border-white/10 hover:border-[#A577FF]/40 text-gray-300 hover:text-white flex items-center justify-center transition-all cursor-pointer shadow-sm active:scale-95 group/back"
                  title="Back to Dashboard"
                >
                  <ChevronLeft size={20} className="group-hover/back:-translate-x-0.5 transition-transform" />
                </button>
                <div className="flex items-center gap-3">
                  <h1 className="text-xl font-bold text-white tracking-tight flex items-center gap-2">
                    <span>Voice Channels</span>
                  </h1>
                  <span className="bg-blue-500/15 text-blue-400 border border-blue-500/25 text-[10px] font-bold px-2.5 py-0.5 rounded-full">
                    {filteredPublicChannels.length} Available
                  </span>
                </div>
              </div>

              {/* Search Channel Name in Top Right */}
              <div className="relative w-64 md:w-80">
                <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" size={16} />
                <input 
                  type="text" 
                  placeholder="Search channel name..." 
                  value={publicChannelSearch}
                  onChange={(e) => setPublicChannelSearch(e.target.value)}
                  className="w-full bg-white/5 border border-white/10 text-[#F5F7FC] placeholder-gray-400 pl-11 pr-10 py-2 rounded-full focus:outline-none focus:ring-1 focus:ring-[#A577FF] focus:bg-white/10 transition-all text-sm" 
                />
                {publicChannelSearch && (
                  <button 
                    onClick={() => setPublicChannelSearch('')}
                    className="absolute right-3.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-white transition-colors cursor-pointer"
                  >
                    <X size={14} />
                  </button>
                )}
              </div>
            </div>

            {/* Channel Cards Grid */}
            <div className="flex-1 p-6 md:p-8 overflow-y-auto custom-scrollbar min-h-0">
              {filteredPublicChannels.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-full text-center py-16">
                  <div className="w-16 h-16 rounded-3xl bg-white/5 border border-white/10 flex items-center justify-center text-gray-500 mb-4 shadow-inner">
                    <Radio size={28} />
                  </div>
                  <h3 className="text-white font-bold text-base mb-1">
                    {publicChannelSearch ? 'No Channels Found' : 'No Public Voice Channels Yet'}
                  </h3>
                  <p className="text-gray-400 text-xs max-w-sm">
                    {publicChannelSearch 
                      ? `No public channel found matching "${publicChannelSearch}". Try another keyword.`
                      : 'All members can create or set channels to Public in group channel settings.'
                    }
                  </p>
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                  {filteredPublicChannels.map((channel) => (
                    <div 
                      key={`${channel.group.id}-${channel.id}`}
                      onClick={() => handleJoinPublicChannel(channel)}
                      className="bg-gradient-to-br from-[#1C113E]/90 to-[#140A30]/95 hover:from-[#261754] hover:to-[#1C1042] border border-white/10 hover:border-[#A577FF]/50 rounded-[24px] p-5 cursor-pointer transition-all duration-200 hover:-translate-y-1 hover:shadow-[0_12px_28px_rgba(165,119,255,0.25)] flex flex-col justify-between group relative overflow-hidden"
                    >
                      {/* Ambient Glow */}
                      <div className="absolute -right-8 -top-8 w-24 h-24 bg-[#A577FF]/10 blur-2xl rounded-full group-hover:bg-[#A577FF]/30 transition-all pointer-events-none"></div>

                      <div>
                        {/* Top Row: Icon + Badges */}
                        <div className="flex items-start justify-between gap-3 mb-4 relative z-10">
                          <div className="w-12 h-12 rounded-2xl bg-[#A577FF]/15 border border-[#A577FF]/30 flex items-center justify-center text-[#A577FF] group-hover:scale-105 group-hover:text-white transition-all shadow-inner shrink-0">
                            {renderChannelIcon(getChannelIcon(channel), 22)}
                          </div>
                          <div className="flex flex-col items-end gap-1.5 shrink-0">
                            <span className="bg-blue-500/15 text-blue-400 border border-blue-500/25 text-[9px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wider flex items-center gap-1">
                              <span>Public</span>
                              <Check size={10} strokeWidth={3} />
                            </span>
                            <div className="flex items-center gap-1.5 text-[11px] font-semibold text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 px-2 py-0.5 rounded-full">
                              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse"></span>
                              <span>{channel.activeUsers || 0} Listening</span>
                            </div>
                          </div>
                        </div>

                        {/* Middle: Name & Group info */}
                        <div className="relative z-10 mb-5 min-w-0">
                          <h3 className="text-white font-bold text-base truncate group-hover:text-[#A577FF] transition-colors mb-1">
                            {channel.name}
                          </h3>
                          <div className="flex items-center gap-1.5 text-xs text-gray-400 truncate">
                            <span className="w-4 h-4 rounded-md bg-white/10 flex items-center justify-center text-[10px] font-bold text-gray-300 shrink-0">
                              {channel.group.icon || '#'}
                            </span>
                            <span className="truncate">{channel.group.name}</span>
                          </div>
                        </div>
                      </div>

                      {/* Bottom Button */}
                      <div className="relative z-10 pt-3 border-t border-white/5">
                        <button 
                          className="w-full bg-[#A577FF]/15 group-hover:bg-[#A577FF] border border-[#A577FF]/30 group-hover:border-transparent text-[#A577FF] group-hover:text-white text-xs font-bold py-2 px-3 rounded-xl flex items-center justify-center gap-2 transition-all shadow-sm cursor-pointer"
                        >
                          <Volume2 size={14} />
                          <span>Join Room</span>
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

        {/* HOME CONTENT */}
        {activeTab === 'home' && !isPublicChannelsView && !isStatisticView && (
          <div className="flex-1 flex flex-col p-6 md:p-8 gap-6 overflow-hidden min-h-0">
            
            {/* ROW 1: Hero Banner & List Games */}
            <div className="grid grid-cols-3 gap-6 h-[180px] shrink-0">
              
              {/* Hero Banner */}
              <div className="col-span-2 bg-gradient-to-br from-[#A577FF] to-[#7065D4] rounded-[32px] p-6 relative overflow-hidden group shadow-lg flex flex-col justify-between min-w-0">
                <div className="absolute -right-10 -top-10 w-64 h-64 bg-white/20 blur-3xl rounded-full group-hover:scale-110 transition-transform duration-700"></div>
                <div className="absolute -left-10 -bottom-10 w-48 h-48 bg-[#150A35]/30 blur-2xl rounded-full"></div>
                <div className="absolute right-0 bottom-0 w-2/3 h-full bg-[url('https://api.dicebear.com/7.x/shapes/svg?seed=cozy&backgroundColor=transparent')] bg-no-repeat bg-right-bottom opacity-50 mix-blend-overlay group-hover:scale-105 transition-transform duration-500"></div>

                <div className="relative z-10 flex gap-2 items-center">
                  <span className="bg-white/20 text-white text-[10px] font-bold px-3 py-1 rounded-full flex items-center gap-1.5 backdrop-blur-md shadow-sm border border-white/10 uppercase tracking-wider">
                    🔥 Popular
                  </span>
                </div>
                <div className="relative z-10">
                  <h2 className="text-3xl font-black text-white mb-1 drop-shadow-md tracking-tight">Cozy Lounge</h2>
                  <p className="text-white/90 text-xs max-w-sm mb-3 leading-relaxed font-medium line-clamp-2">
                    Join the most popular voice channels right now. Hang out and play mini-games with friends in real-time.
                  </p>
                  <div className="flex items-center gap-4">
                    <div className="flex -space-x-3">
                      {['Leo', 'Mimi', 'Felix'].map((seed, i) => (
                        <img key={i} src={`https://api.dicebear.com/7.x/adventurer/svg?seed=${seed}&backgroundColor=${i===0?'F9EBD8':i===1?'8CC6C5':'F2C8F7'}`} className="w-8 h-8 rounded-full border-2 border-[#7065D4] shadow-md" alt="avatar" />
                      ))}
                    </div>
                    <button 
                      onClick={() => setIsPublicChannelsView(true)} 
                      className="bg-white text-[#150A35] hover:bg-[#F0EEFF] font-bold text-xs px-4 py-2 rounded-full transition-all shadow-lg hover:shadow-xl flex items-center gap-2 cursor-pointer hover:scale-105 active:scale-95 group/btn"
                    >
                      <Volume2 size={15} className="text-[#A577FF] group-hover/btn:scale-110 transition-transform" />
                      <span>Join Channel</span>
                    </button>
                  </div>
                </div>
              </div>

              {/* List Games */}
              <div className="col-span-1 flex flex-col gap-3 min-w-0">
                {[
                  { name: 'Photobooth', desc: 'Capture Memories', seed: 'Camera', color: '8CC6C5' },
                  { name: 'Watch Together', desc: 'Sharing Youtube', seed: 'YT', color: 'F9EBD8' },
                  { name: 'Listening Together', desc: 'Music Session', seed: 'Music', color: 'F2C8F7' }
                ].map((game, i) => (
                  <div 
                    key={i} 
                    onClick={() => {
                      if (game.name === 'Listening Together') setActiveTab('music');
                      if (game.name === 'Watch Together') setIsWatchTogetherOpen(true);
                      if (game.name === 'Photobooth') setActiveTab('photobooth');
                    }}
                    className="bg-white/5 hover:bg-white/10 border border-white/5 p-2 px-3 rounded-[24px] flex items-center gap-3 cursor-pointer transition-all group flex-1 min-h-0"
                  >
                    <img src={`https://api.dicebear.com/7.x/shapes/svg?seed=${game.seed}&backgroundColor=${game.color}`} className="w-10 h-10 rounded-[14px] object-cover shadow-sm group-hover:scale-105 transition-transform shrink-0" alt={game.name} />
                    <div className="flex-1 min-w-0">
                      <h4 className="text-sm font-bold text-[#F5F7FC] group-hover:text-[#A577FF] transition-colors truncate">{game.name}</h4>
                      <p className="text-[10px] text-gray-400 mt-0.5 truncate">{game.desc}</p>
                    </div>
                    <div className="w-6 h-6 shrink-0 rounded-full flex items-center justify-center text-gray-500 group-hover:text-white transition-colors">
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="9 18 15 12 9 6"></polyline></svg>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* ROW 2 & 3: Combined (Games/Music on left, Stats on right) */}
            <div className="grid grid-cols-3 gap-6 flex-1 min-h-0">
              
              {/* LEFT: New Games & Listening Activity */}
              <div className="col-span-2 flex flex-col gap-6 min-w-0 min-h-0">
                
                {/* Games (Carousel) */}
                <div className="flex-1 flex flex-col min-h-0">
                  <div className="flex justify-between items-center mb-3 shrink-0">
                    <h3 className="text-lg font-bold text-[#F5F7FC]">Games</h3>
                    <div className="flex items-center gap-4">
                      <div className="flex items-center gap-1.5">
                        <button onClick={() => setGameCarouselIndex(Math.max(0, gameCarouselIndex - 1))} className="w-7 h-7 rounded-full bg-white/5 border border-white/10 flex items-center justify-center text-gray-400 hover:bg-white/10 hover:text-white transition-colors">
                          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="15 18 9 12 15 6"></polyline></svg>
                        </button>
                        <button onClick={() => setGameCarouselIndex(Math.min(2, gameCarouselIndex + 1))} className="w-7 h-7 rounded-full bg-white/5 border border-white/10 flex items-center justify-center text-gray-400 hover:bg-white/10 hover:text-white transition-colors">
                          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="9 18 15 12 9 6"></polyline></svg>
                        </button>
                      </div>
                    </div>
                  </div>
                  
                  {/* Games List Wrapper */}
                  <div className="flex-1 min-h-0 overflow-hidden relative">
                    <div 
                      className="flex gap-4 h-full transition-transform duration-300 ease-in-out"
                      style={{ transform: `translateX(calc(-${gameCarouselIndex * (100 / 3)}% - ${gameCarouselIndex * 16}px))` }}
                    >
                      {[
                        { name: 'Uncharted 4', seed: 'adventure', colors: 'from-gray-800 to-gray-600' },
                        { name: 'Dishonored', seed: 'fire', colors: 'from-red-900 to-orange-800' },
                        { name: 'Elden Ring', seed: 'nature', colors: 'from-green-900 to-teal-800' },
                        { name: 'God of War', seed: 'war', colors: 'from-blue-900 to-indigo-800' },
                        { name: 'Persona 5', seed: 'city', colors: 'from-red-600 to-red-800' },
                      ].map((game, i) => (
                        <div key={i} className="min-w-[calc(33.333%-11px)] max-w-[calc(33.333%-11px)] bg-white/5 border border-white/5 rounded-[24px] p-4 group cursor-pointer hover:bg-white/10 transition-all relative overflow-hidden flex flex-col justify-between min-h-0">
                          <div className="absolute top-6 left-6 bg-white/20 backdrop-blur-md p-2 rounded-full opacity-0 group-hover:opacity-100 group-hover:scale-110 transition-all shadow-lg z-10">
                            <PlayCircle size={16} fill="white" className="text-white/20" />
                          </div>
                          <div className={`flex-1 rounded-xl bg-gradient-to-tr ${game.colors} mb-3 overflow-hidden relative min-h-0`}>
                            <img src={`https://api.dicebear.com/7.x/identicon/svg?seed=${game.seed}&backgroundColor=150A35`} className="w-full h-full object-cover opacity-60 group-hover:scale-110 group-hover:opacity-80 transition-all duration-700 mix-blend-screen" alt={game.name} />
                          </div>
                          <div className="shrink-0">
                            <h4 className="font-bold text-[#F5F7FC] mb-1 text-xs">{game.name}</h4>
                            <p className="text-[9px] text-[#A577FF] font-bold uppercase tracking-wider">Coming soon</p>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>

                {/* Listening Activity (Home Mini Player) */}
                <div 
                  className="h-[80px] shrink-0 bg-gradient-to-r from-white/5 to-transparent rounded-[24px] px-6 flex items-center justify-between border border-white/5 shadow-md transition-colors select-none"
                >
                  {/* Left: Album art & Info */}
                  <div className="flex items-center gap-4 w-auto">
                    <div 
                      onClick={(e) => {
                        e.stopPropagation();
                        setActiveTab('music');
                      }} 
                      className="relative w-12 h-12 shrink-0 cursor-pointer group/art"
                      title="Click to open Music View"
                    >
                      {/* Spinning Vinyl Effect (pauses when stopped) */}
                      <div className={`absolute inset-0 bg-gray-900 rounded-full shadow-[0_0_15px_rgba(0,0,0,0.5)] border-[4px] border-gray-800 flex items-center justify-center transition-transform ${
                        isMiniPlayerPlaying ? 'animate-[spin_4s_linear_infinite]' : ''
                      }`}>
                        <div className="w-4 h-4 rounded-full bg-[#A577FF]/20 border border-[#A577FF]/50 flex items-center justify-center">
                           <div className="w-1.5 h-1.5 bg-[#150A35] rounded-full"></div>
                        </div>
                      </div>
                    </div>
                    <div>
                      <h4 
                        onClick={(e) => {
                          e.stopPropagation();
                          setActiveTab('music');
                        }}
                        className="text-[#F5F7FC] font-bold text-sm cursor-pointer hover:text-[#A577FF] transition-colors"
                        title="Open music view"
                      >
                        {HOME_TRACKS[miniPlayerTrackIndex]?.title || 'Midnight City'}
                      </h4>
                      <p className="text-[10px] text-[#A577FF] font-medium mt-0.5">
                        {HOME_TRACKS[miniPlayerTrackIndex]?.artist || 'M83'}
                      </p>
                    </div>
                  </div>
                  
                  {/* Center: Controls */}
                  <div className="flex items-center gap-5">
                    {/* Shuffle */}
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        setIsMiniPlayerShuffle(!isMiniPlayerShuffle);
                      }}
                      className={`w-8 h-8 rounded-xl flex items-center justify-center transition-all cursor-pointer ${
                        isMiniPlayerShuffle 
                          ? 'bg-[#A577FF]/20 text-[#A577FF] border border-[#A577FF]/30 shadow-[0_0_12px_rgba(165,119,255,0.4)]' 
                          : 'text-gray-400 hover:text-white hover:bg-white/5'
                      }`}
                      title={isMiniPlayerShuffle ? 'Shuffle Active' : 'Shuffle'}
                    >
                      <Shuffle size={16} />
                    </button>

                    {/* Prev */}
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        if (miniPlayerCurrentTime > 3) {
                          setMiniPlayerCurrentTime(0);
                        } else {
                          setMiniPlayerTrackIndex((miniPlayerTrackIndex - 1 + HOME_TRACKS.length) % HOME_TRACKS.length);
                          setMiniPlayerCurrentTime(0);
                        }
                      }}
                      className="text-gray-400 hover:text-white transition-colors cursor-pointer p-1 rounded-lg active:scale-90"
                      title="Previous Song"
                    >
                      <SkipBack size={18} />
                    </button>
                    
                    {/* Play / Pause Toggle Button */}
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        setIsMiniPlayerPlaying(!isMiniPlayerPlaying);
                      }}
                      className="w-10 h-10 bg-[#A577FF] rounded-full flex items-center justify-center cursor-pointer hover:scale-105 hover:bg-[#9161eb] active:scale-95 transition-all shadow-[0_0_15px_rgba(165,119,255,0.4)] text-white"
                      title={isMiniPlayerPlaying ? 'Pause' : 'Play'}
                    >
                      {isMiniPlayerPlaying ? (
                        <Pause size={16} fill="white" />
                      ) : (
                        <Play size={16} fill="white" className="ml-0.5" />
                      )}
                    </button>
                    
                    {/* Next */}
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        if (isMiniPlayerShuffle) {
                          const nextIdx = Math.floor(Math.random() * HOME_TRACKS.length);
                          setMiniPlayerTrackIndex(nextIdx);
                        } else {
                          setMiniPlayerTrackIndex((miniPlayerTrackIndex + 1) % HOME_TRACKS.length);
                        }
                        setMiniPlayerCurrentTime(0);
                      }}
                      className="text-gray-400 hover:text-white transition-colors cursor-pointer p-1 rounded-lg active:scale-90"
                      title="Next Song"
                    >
                      <SkipForward size={18} />
                    </button>

                    {/* Repeat */}
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        setMiniPlayerRepeatState(prev => {
                          if (prev === 'none') return 'all';
                          if (prev === 'all') return 'one';
                          return 'none';
                        });
                      }}
                      className={`w-8 h-8 rounded-xl flex items-center justify-center transition-all cursor-pointer ${
                        miniPlayerRepeatState !== 'none'
                          ? 'bg-[#A577FF]/20 text-[#A577FF] border border-[#A577FF]/30 shadow-[0_0_12px_rgba(165,119,255,0.4)]'
                          : 'text-gray-400 hover:text-white hover:bg-white/5'
                      }`}
                      title={
                        miniPlayerRepeatState === 'one'
                          ? 'Repeat One'
                          : miniPlayerRepeatState === 'all'
                            ? 'Repeat All'
                            : 'Repeat Off'
                      }
                    >
                      {miniPlayerRepeatState === 'one' ? <Repeat1 size={17} /> : <Repeat size={17} />}
                    </button>
                  </div>

                  {/* Right: Progress & Seek */}
                  <div className="flex items-center gap-3 w-32 md:w-48">
                    <span className="text-[9px] font-bold text-gray-500 min-w-[24px]">
                      {formatMiniPlayerTime(miniPlayerCurrentTime)}
                    </span>
                    <div 
                      onClick={(e) => {
                        e.stopPropagation();
                        const rect = e.currentTarget.getBoundingClientRect();
                        const clickX = e.clientX - rect.left;
                        const ratio = Math.max(0, Math.min(1, clickX / rect.width));
                        const curTrack = HOME_TRACKS[miniPlayerTrackIndex] || HOME_TRACKS[0];
                        setMiniPlayerCurrentTime(Math.floor(ratio * curTrack.duration));
                      }}
                      className="flex-1 h-1.5 bg-white/10 rounded-full overflow-hidden cursor-pointer group/progress relative"
                      title="Click to seek"
                    >
                      <div 
                        className="h-full bg-[#A577FF] group-hover/progress:bg-[#b58fff] rounded-full relative transition-all"
                        style={{
                          width: `${Math.min(100, Math.max(0, (miniPlayerCurrentTime / (HOME_TRACKS[miniPlayerTrackIndex]?.duration || 244)) * 100))}%`
                        }}
                      >
                        <div className="absolute right-0 top-1/2 -translate-y-1/2 w-1.5 h-1.5 bg-white rounded-full shadow opacity-0 group-hover/progress:opacity-100 transition-opacity"></div>
                      </div>
                    </div>
                    <span className="text-[9px] font-bold text-gray-500 min-w-[24px]">
                      {HOME_TRACKS[miniPlayerTrackIndex]?.durationStr || '4:04'}
                    </span>
                  </div>
                </div>

              </div>

              {/* RIGHT: Your Statistic (Full Height) */}
              <div className="col-span-1 flex flex-col min-w-0 min-h-0">
                <div className="flex justify-between items-center mb-3 shrink-0">
                  <h3 
                    onClick={() => setIsStatisticView(true)}
                    className="text-lg font-bold text-[#F5F7FC] cursor-pointer hover:text-[#A577FF] transition-colors"
                  >
                    Your Statistic
                  </h3>
                  <button 
                    onClick={() => setIsStatisticView(true)}
                    className="w-8 h-8 rounded-xl bg-white/5 hover:bg-[#A577FF]/20 text-gray-400 hover:text-white flex items-center justify-center transition-all cursor-pointer border border-transparent hover:border-[#A577FF]/30 group"
                    title="View Detailed Statistics"
                  >
                    <ArrowRight size={16} className="group-hover:translate-x-0.5 transition-transform" />
                  </button>
                </div>
                <div 
                  onClick={() => setIsStatisticView(true)}
                  className="bg-gradient-to-b from-white/5 to-transparent hover:from-white/10 rounded-[32px] border border-white/5 hover:border-[#A577FF]/30 p-6 flex-1 flex flex-col items-center justify-between relative overflow-hidden shadow-inner min-h-0 cursor-pointer transition-all group/statcard"
                >
                  
                  {/* Glowing Fluid Shape Animation */}
                  <div className="relative flex-1 w-full flex items-center justify-center min-h-[160px]">
                    {/* Fluid Blob 1 */}
                    <div className="absolute w-44 h-44 bg-gradient-to-tr from-[#A577FF] to-[#150A35] rounded-full mix-blend-screen filter blur-[20px] opacity-70 animate-[spin_8s_linear_infinite]" style={{ borderRadius: '40% 60% 70% 30% / 40% 50% 60% 50%' }}></div>
                    {/* Fluid Blob 2 */}
                    <div className="absolute w-36 h-36 bg-gradient-to-bl from-pink-500 to-[#150A35] rounded-full mix-blend-screen filter blur-[15px] opacity-80 animate-[spin_12s_linear_infinite_reverse]" style={{ borderRadius: '60% 40% 30% 70% / 60% 30% 70% 40%' }}></div>
                    
                    {/* Center Data Circle */}
                    <div className="relative z-10 bg-[#150A35] w-28 h-28 rounded-full border border-white/10 flex flex-col items-center justify-center shadow-[0_0_30px_rgba(0,0,0,0.6)]">
                      <span className="text-[10px] text-gray-400 mb-0.5 font-semibold">Total hours</span>
                      <span className="text-xl font-black text-[#F5F7FC]">{isLoggedIn ? '12,340h' : '0h'}</span>
                    </div>
                  </div>
                  
                  {/* Stats Icons Bottom */}
                  <div className="flex justify-between w-full px-2 shrink-0">
                    <div className="flex flex-col items-center gap-1.5">
                       <div className="w-10 h-10 rounded-full bg-red-500/10 flex items-center justify-center text-red-400"><Gamepad2 size={16} /></div>
                       <span className="text-[10px] font-bold text-gray-300">2,340h</span>
                    </div>
                    <div className="flex flex-col items-center gap-1.5">
                       <div className="w-10 h-10 rounded-full bg-[#A577FF]/10 flex items-center justify-center text-[#A577FF]"><Music size={16} /></div>
                       <span className="text-[10px] font-bold text-gray-300">5,420h</span>
                    </div>
                    <div className="flex flex-col items-center gap-1.5">
                       <div className="w-10 h-10 rounded-full bg-yellow-500/10 flex items-center justify-center text-yellow-400"><Users size={16} /></div>
                       <span className="text-[10px] font-bold text-gray-300">4,580h</span>
                    </div>
                  </div>
                </div>
              </div>

            </div>
            
          </div>
        )}

        {/* VIEW YOUR STATISTIC DETAIL */}
        {activeTab === 'home' && !isPublicChannelsView && isStatisticView && (
          <div className="flex-1 flex flex-col min-h-0 overflow-hidden">
            {/* Header: < Your Statistic */}
            <div className="h-20 px-8 md:px-10 flex justify-between items-center bg-[#150A35]/95 backdrop-blur-xl z-30 border-b border-white/5 shrink-0">
              <div className="flex items-center gap-3">
                <button 
                  onClick={() => setIsStatisticView(false)}
                  className="w-10 h-10 rounded-full bg-white/5 hover:bg-[#A577FF]/20 border border-white/10 hover:border-[#A577FF]/40 text-gray-300 hover:text-white flex items-center justify-center transition-all cursor-pointer shadow-sm active:scale-95 group/back"
                  title="Back to Dashboard"
                >
                  <ChevronLeft size={20} className="group-hover/back:-translate-x-0.5 transition-transform" />
                </button>
                <div className="flex items-center gap-3">
                  <h1 
                    onClick={() => setIsStatisticView(false)}
                    className="text-xl font-bold text-white tracking-tight flex items-center gap-2 cursor-pointer hover:text-[#c4a6ff] transition-colors"
                  >
                    <span>Your Statistic</span>
                  </h1>
                  <span className="bg-[#A577FF]/15 text-[#c4a6ff] border border-[#A577FF]/30 text-[10px] font-bold px-2.5 py-0.5 rounded-full flex items-center gap-1.5">
                    <span className="w-1.5 h-1.5 rounded-full bg-[#A577FF] animate-pulse"></span>
                    <span>12,340h Total Active</span>
                  </span>
                </div>
              </div>

              <div className="flex items-center gap-3">
                <div className="hidden sm:flex items-center gap-2 bg-white/5 border border-white/10 px-3.5 py-1.5 rounded-full text-xs text-gray-300">
                  <Clock size={13} className="text-[#A577FF]" />
                  <span>All-Time Statistics</span>
                </div>
              </div>
            </div>

            {/* Content Grid */}
            <div className="flex-1 p-6 md:p-8 overflow-y-auto custom-scrollbar min-h-0">
              <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 min-h-full">
                
                {/* LEFT: List of Room Channels entered & total hours (lg:col-span-7) */}
                <div className="lg:col-span-7 flex flex-col bg-gradient-to-b from-white/5 to-transparent border border-white/5 rounded-[32px] p-6 min-h-0 shadow-lg">
                  {/* Header of Room Channels */}
                  <div className="flex items-center justify-between pb-5 border-b border-white/5 shrink-0">
                    <div className="flex items-center gap-3">
                      <div className="w-11 h-11 rounded-2xl bg-yellow-500/15 border border-yellow-500/30 flex items-center justify-center text-yellow-400 shadow-inner">
                        <Users size={20} />
                      </div>
                      <div>
                        <h3 className="text-base font-bold text-white flex items-center gap-2">
                          <span>Voice Channels</span>
                        </h3>
                        <p className="text-xs text-gray-400">Voice channels and lounges you entered</p>
                      </div>
                    </div>
                    
                    <div className="text-right">
                      <span className="text-2xl font-black text-yellow-400 tracking-tight">4,580h</span>
                      <p className="text-[10px] text-gray-400 uppercase font-bold tracking-wider">Total Voice</p>
                    </div>
                  </div>

                  {/* List of Channels */}
                  <div className="flex-1 overflow-y-auto custom-scrollbar py-4 space-y-3 pr-1 min-h-[320px]">
                    {STATS_ROOM_CHANNELS.map((channel) => (
                      <div 
                        key={channel.id}
                        className="p-4 rounded-2xl bg-white/5 hover:bg-white/10 border border-white/5 hover:border-yellow-500/30 transition-all duration-200 group"
                      >
                        <div className="flex items-center justify-between gap-3">
                          <div className="flex items-center gap-3.5 min-w-0">
                            <div className="w-11 h-11 rounded-xl bg-yellow-500/10 border border-yellow-500/20 flex items-center justify-center text-yellow-400 text-lg shadow-sm group-hover:scale-105 transition-transform shrink-0">
                              {renderChannelIcon(channel.icon, 20)}
                            </div>
                            <div className="min-w-0">
                              <h4 className="text-sm font-bold text-white group-hover:text-yellow-300 transition-colors truncate">
                                {channel.name}
                              </h4>
                              <span className="text-xs text-gray-400 truncate block mt-0.5">
                                {channel.groupName}
                              </span>
                            </div>
                          </div>

                          <div className="text-right shrink-0">
                            <span className="text-sm font-black text-white group-hover:text-yellow-300 transition-colors">
                              {channel.totalHours}
                            </span>
                            <span className="text-[10px] text-gray-400 block font-medium">
                              {channel.percent}% of voice
                            </span>
                          </div>
                        </div>

                        {/* Progress Bar */}
                        <div className="w-full bg-white/5 h-1.5 rounded-full mt-3 overflow-hidden">
                          <div 
                            className={`h-full ${channel.barColor} rounded-full transition-all duration-500`} 
                            style={{ width: `${channel.percent}%` }}
                          ></div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* RIGHT: Music (Top) & Games (Bottom) (lg:col-span-5) */}
                <div className="lg:col-span-5 flex flex-col gap-6 min-h-0">
                  
                  {/* TOP RIGHT: Total Hours Music */}
                  <div className="bg-gradient-to-br from-[#A577FF]/10 via-white/5 to-transparent border border-[#A577FF]/20 rounded-[32px] p-6 shadow-lg shrink-0">
                    <div className="flex items-start justify-between mb-4">
                      <div className="flex items-center gap-3">
                        <div className="w-11 h-11 rounded-2xl bg-[#A577FF]/15 border border-[#A577FF]/30 flex items-center justify-center text-[#A577FF] shadow-inner">
                          <Music size={20} />
                        </div>
                        <div>
                          <h3 className="text-base font-bold text-white">Music Activity</h3>
                          <p className="text-xs text-gray-400">Total listening & stream time</p>
                        </div>
                      </div>
                      <button 
                        onClick={() => { setIsStatisticView(false); setActiveTab('music'); }}
                        className="text-[11px] font-bold text-[#c4a6ff] hover:text-white bg-[#A577FF]/10 hover:bg-[#A577FF]/20 border border-[#A577FF]/30 px-3 py-1.5 rounded-xl transition-all cursor-pointer flex items-center gap-1.5 active:scale-95"
                      >
                        <span>Open Music</span>
                        <ArrowRight size={12} />
                      </button>
                    </div>

                    {/* Big Stat Highlight */}
                    <div className="flex items-center justify-between bg-black/20 border border-white/5 rounded-2xl p-4 mb-4">
                      <div>
                        <span className="text-[10px] font-bold text-[#c4a6ff]/80 uppercase tracking-wider block mb-0.5">Total Hours Music</span>
                        <span className="text-3xl font-black text-[#c4a6ff] tracking-tight">5,420h</span>
                      </div>
                      {/* Animated Music Equalizer Bars */}
                      <div className="flex items-end gap-1.5 h-8 pr-2">
                        <span className="w-1 bg-[#A577FF]/80 rounded-full animate-[pulse_1s_ease-in-out_infinite] h-4"></span>
                        <span className="w-1 bg-[#A577FF] rounded-full animate-[pulse_0.7s_ease-in-out_infinite] h-8"></span>
                        <span className="w-1 bg-[#c4a6ff]/90 rounded-full animate-[pulse_1.2s_ease-in-out_infinite] h-5"></span>
                        <span className="w-1 bg-[#A577FF]/70 rounded-full animate-[pulse_0.9s_ease-in-out_infinite] h-7"></span>
                        <span className="w-1 bg-[#c4a6ff]/85 rounded-full animate-[pulse_1.4s_ease-in-out_infinite] h-3"></span>
                      </div>
                    </div>

                    {/* Top Tracks Breakdown */}
                    <div>
                      <span className="text-[11px] font-bold text-gray-400 uppercase tracking-wider block mb-2">Most Listened Tracks</span>
                      <div className="space-y-2">
                        {STATS_TOP_TRACKS.map((track, i) => (
                          <div key={i} className="flex items-center justify-between text-xs py-1.5 px-3 rounded-xl bg-white/5 border border-white/5 hover:bg-white/10 transition-colors">
                            <div className="flex items-center gap-2.5 truncate">
                              <span className="text-gray-500 font-mono text-[10px] w-3">{i + 1}</span>
                              <span className="font-bold text-[#F5F7FC] truncate">{track.title}</span>
                              <span className="text-gray-400 text-[11px] truncate">— {track.artist}</span>
                            </div>
                            <span className="text-[11px] font-bold text-[#c4a6ff] shrink-0 ml-2">{track.hours}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>

                  {/* BOTTOM RIGHT: List Game yang Dimainkan & Total Hours */}
                  <div className="flex-1 bg-gradient-to-b from-white/5 to-transparent border border-white/5 rounded-[32px] p-6 flex flex-col min-h-0 shadow-lg">
                    <div className="flex items-center justify-between pb-4 border-b border-white/5 shrink-0">
                      <div className="flex items-center gap-3">
                        <div className="w-11 h-11 rounded-2xl bg-red-500/15 border border-red-500/30 flex items-center justify-center text-red-400 shadow-inner">
                          <Gamepad2 size={20} />
                        </div>
                        <div>
                          <h3 className="text-base font-bold text-white">Games Played</h3>
                          <p className="text-xs text-gray-400">Total gameplay hours & activity</p>
                        </div>
                      </div>
                      <div className="text-right">
                        <span className="text-2xl font-black text-red-400 tracking-tight">2,340h</span>
                        <p className="text-[10px] text-gray-400 uppercase font-bold tracking-wider">Total Games</p>
                      </div>
                    </div>

                    {/* List of Games */}
                    <div className="flex-1 overflow-y-auto custom-scrollbar py-3 space-y-2.5 min-h-0">
                      {STATS_GAMES_PLAYED.map((game, i) => (
                        <div key={i} className="p-3 rounded-2xl bg-white/5 hover:bg-white/10 border border-white/5 transition-all group">
                          <div className="flex items-center justify-between gap-3">
                            <div className="flex items-center gap-3 min-w-0">
                              <div className={`w-9 h-9 rounded-xl bg-gradient-to-tr ${game.colors} flex items-center justify-center overflow-hidden shrink-0 shadow-sm group-hover:scale-105 transition-transform`}>
                                <img src={`https://api.dicebear.com/7.x/identicon/svg?seed=${game.seed}&backgroundColor=150A35`} className="w-full h-full object-cover opacity-80" alt={game.name} />
                              </div>
                              <div className="min-w-0">
                                <h4 className="text-xs font-bold text-white group-hover:text-red-400 transition-colors truncate">{game.name}</h4>
                                <span className="text-[10px] text-gray-400 truncate block">{game.genre}</span>
                              </div>
                            </div>
                            <div className="text-right shrink-0">
                              <span className="text-xs font-black text-red-400">{game.hours}</span>
                              <span className="text-[10px] text-gray-400 block font-medium">{game.percent}%</span>
                            </div>
                          </div>
                          <div className="w-full bg-white/5 h-1.5 rounded-full mt-2.5 overflow-hidden">
                            <div className="h-full bg-red-500 rounded-full transition-all duration-500" style={{ width: `${game.percent}%` }}></div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>

                </div>

              </div>
            </div>
          </div>
        )}
        
        {/* VIEW CHAT */}
        {activeTab === 'chat' && <ChatView onUnreadCountChange={setGlobalUnreadCount} initialActiveChat={targetChatName} initialCallOpen={triggerCall} />}

        {/* VIEW MUSIC */}
        {activeTab === 'music' && <MusicView userImage={userImage} onGoHome={() => setActiveTab('home')} />}

        {/* VIEW PHOTOBOOTH */}
        {activeTab === 'photobooth' && (
          <PhotoboothView 
            onGoHome={() => setActiveTab('home')} 
            userName={userName} 
            userImage={userImage} 
            friendsList={friendsList}
          />
        )}

        {/* VIEW GROUP */}
        {activeTab === 'group' && currentGroup && (
          <GroupView 
            group={currentGroup}
            userName={userName}
            userImage={userImage}
            friendsList={friendsList}
            initialChannelId={targetChannelId}
            onUpdateGroupName={handleUpdateGroupName}
            onDeleteGroup={handleDeleteGroup}
            onAddChannel={handleAddChannel}
            onDeleteChannel={handleDeleteChannel}
            onToggleChannelPublic={handleToggleChannelPublic}
            onRenameChannel={handleRenameChannel}
            onUpdateGroupIcon={handleUpdateGroupIcon}
            onChannelActiveChange={handleChannelActiveChange}
            onInsideVoiceRoomChange={setIsInsideVoiceRoom}
            onGoHome={() => { 
              if (enteredFromPublicChannels) {
                setEnteredFromPublicChannels(false);
                setIsPublicChannelsView(true);
              } else {
                setIsPublicChannelsView(false);
              }
              setActiveTab('home'); 
              setTargetChannelId(null); 
            }}
            onLeaveChannel={() => {
              if (enteredFromPublicChannels) {
                setEnteredFromPublicChannels(false);
                setActiveTab('home');
                setIsPublicChannelsView(true);
                setTargetChannelId(null);
              }
            }}
          />
        )}

        {/* Floating Voice Channel Widget (Bottom Right) */}
        {activeVoiceSession && (!isInsideVoiceRoom || activeTab !== 'group' || currentGroup?.id !== activeVoiceSession.group.id) && (
          <div 
            onClick={handleReturnToVoiceChannel}
            className="absolute bottom-6 right-6 z-50 bg-[#1B0F38]/95 hover:bg-[#231548] border border-[#A577FF]/40 hover:border-[#A577FF] rounded-2xl p-3.5 pr-4 shadow-[0_10px_35px_rgba(0,0,0,0.7),0_0_20px_rgba(165,119,255,0.25)] flex items-center gap-3.5 cursor-pointer transition-all hover:scale-[1.02] group backdrop-blur-xl animate-in fade-in slide-in-from-bottom-3 duration-200"
            title="Click to return to Voice Channel"
          >
            {/* Icon Channel with Live Indicator */}
            <div className="relative shrink-0">
              <div className="w-11 h-11 rounded-xl bg-[#A577FF]/20 border border-[#A577FF]/30 flex items-center justify-center text-[#A577FF] group-hover:bg-[#A577FF]/30 transition-colors">
                {renderChannelIcon(activeVoiceSession.channel.icon || '🔊', 20)}
              </div>
              <span className="absolute -top-1 -right-1 w-3.5 h-3.5 bg-green-500 rounded-full border-2 border-[#150A35] flex items-center justify-center">
                <span className="w-1.5 h-1.5 bg-white rounded-full animate-ping"></span>
              </span>
            </div>

            {/* Info: Channel Name, Group Name, Status */}
            <div className="flex flex-col min-w-0 max-w-[160px] md:max-w-[190px]">
              <div className="flex items-center gap-1.5 mb-0.5">
                <span className="text-[10px] font-bold text-green-400 uppercase tracking-wider flex items-center gap-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-green-400 inline-block animate-pulse"></span>
                  Voice Connected
                </span>
              </div>
              <span className="text-xs font-black text-white truncate group-hover:text-[#c4a6ff] transition-colors">
                {activeVoiceSession.channel.name.replace(/^[^\w\s\u00C0-\u024F\u1E00-\u1EFF]+\s*/, '')}
              </span>
              <span className="text-[10px] text-gray-400 truncate">
                {activeVoiceSession.group.name}
              </span>
            </div>

            {/* Disconnect Button (LogOut) */}
            <button
              onClick={(e) => {
                e.stopPropagation();
                handleLeaveVoiceSession();
              }}
              className="ml-2 w-9 h-9 rounded-xl bg-red-500/15 hover:bg-red-500 text-red-400 hover:text-white flex items-center justify-center transition-all cursor-pointer border border-red-500/20 shrink-0 group/leave"
              title="Disconnect Voice Channel"
            >
              <LogOut size={16} className="group-hover/leave:scale-110 transition-transform" />
            </button>
          </div>
        )}

      </div>

      {/* === 3. RIGHT SIDEBAR === */}
      {isLoggedIn && activeTab === 'home' && (
        <div className="w-[85px] bg-[#150A35] border border-white/5 rounded-[32px] flex flex-col items-center py-8 z-40 shadow-2xl transition-all h-full shrink-0">
          
          {/* User Profile */}
          <div onClick={() => setIsProfileModalOpen(true)} className="relative group cursor-pointer mb-6">
            <div className="w-12 h-12 rounded-full p-0.5 bg-gradient-to-b from-[#A577FF] to-transparent shadow-[0_0_15px_rgba(165,119,255,0.2)]">
              <img src={userImage} alt={userName} className="w-full h-full rounded-full object-cover border-2 border-[#150A35]" />
            </div>
            <span className="absolute right-14 top-2 bg-[#F5F7FC] text-[#150A35] text-[10px] font-bold px-2.5 py-1.5 rounded-lg opacity-0 group-hover:opacity-100 transition-opacity shadow-[0_4px_14px_rgba(0,0,0,0.8)] whitespace-nowrap pointer-events-none">
              Edit Profile
            </span>
          </div>

          <div className="flex-1 w-full overflow-y-auto flex flex-col items-center gap-5 custom-scrollbar py-2 overscroll-contain">
            {/* Online Friends */}
            {friendsList.map((friend, i) => (
              <div 
                key={i} 
                className="relative cursor-pointer group hover:-translate-y-1 transition-transform"
                onClick={() => setSelectedFriend({ ...friend, isAdded: i % 2 === 0 })}
              >
                <img src={`https://api.dicebear.com/7.x/adventurer/svg?seed=${friend.seed}&backgroundColor=${friend.color}`} alt="Friend" className="w-11 h-11 rounded-full border-2 border-transparent group-hover:border-[#A577FF] transition-colors object-cover" />
                <div className={`absolute bottom-0 right-0 w-3 h-3 rounded-full border-2 border-[#150A35] ${friend.status}`}></div>
                {friend.label === 'In Game' && (
                  <div className="absolute -bottom-4 left-1/2 -translate-x-1/2 bg-red-500/20 text-red-400 text-[8px] font-bold px-1.5 py-0.5 rounded-sm whitespace-nowrap">
                    {friend.label}
                  </div>
                )}
                {friend.status === 'bg-yellow-500' && (
                  <div className="absolute -bottom-4 left-1/2 -translate-x-1/2 bg-yellow-500/20 text-yellow-400 border border-yellow-500/30 text-[8px] font-bold px-1.5 py-0.5 rounded-sm whitespace-nowrap">
                    In Channel
                  </div>
                )}
              </div>
            ))}
          </div>

          <div className="mt-6 pt-6 border-t border-white/10 flex flex-col items-center gap-6 w-full">
            <div className="relative group cursor-pointer" onClick={() => setIsAddFriendModalOpen(true)}>
              <div className="w-11 h-11 rounded-full bg-white/5 border border-white/5 flex items-center justify-center text-gray-400 group-hover:text-white group-hover:bg-white/10 transition-colors">
                <Users size={18} />
              </div>
              <span className="absolute -top-1 -right-1 w-2.5 h-2.5 bg-red-500 rounded-full border-2 border-[#150A35]"></span>
            </div>
          </div>
        </div>
      )}

      {/* MODALS */}
      <ProfileModal 
        isOpen={isProfileModalOpen} 
        onClose={() => setIsProfileModalOpen(false)} 
        onSaveProfile={(updated) => setCustomProfile(updated)}
      />

      <AuthModal 
        isOpen={authModalMode !== null} 
        initialMode={authModalMode || 'login'}
        onClose={() => setAuthModalMode(null)} 
        onLoginSuccess={() => setAuthModalMode(null)} 
      />

      <AddFriendModal 
        isOpen={isAddFriendModalOpen} 
        onClose={() => setIsAddFriendModalOpen(false)} 
        onAcceptFriend={handleAcceptFriendRequest}
      />
      
      <FriendProfileModal 
        isOpen={selectedFriend !== null} 
        onClose={() => setSelectedFriend(null)} 
        friend={selectedFriend} 
        onUnfriend={handleUnfriend}
        onMessage={handleMessageFriend}
        onCall={handleCallFriend}
      />

      <CreateGroupModal 
        isOpen={isCreateGroupModalOpen}
        onClose={() => setIsCreateGroupModalOpen(false)}
        onCreateGroup={handleCreateGroup}
        creatorName={userName}
      />

      <WatchTogetherModal 
        isOpen={isWatchTogetherOpen}
        onClose={() => setIsWatchTogetherOpen(false)}
        currentUser={{ name: userName, avatar: userImage }}
        roomMembers={friendsList.map(f => ({ name: f.name, avatar: `https://api.dicebear.com/7.x/adventurer/svg?seed=${f.seed}&backgroundColor=${f.color}` }))}
      />
    </div>
  );
}