import React, { useState, useEffect, useRef, useCallback } from 'react';
import { 
  Search, X, Play, LogOut, UserPlus, 
  ExternalLink, Maximize2, Minimize2, Users, Check, Film, Sparkles, RefreshCw
} from 'lucide-react';

export interface WatchUser {
  name: string;
  avatar: string;
  status: 'pending' | 'joined';
}

export interface WatchVideo {
  id: string;
  videoId: string;
  title: string;
  channel: string;
  views: string;
  timeAgo: string;
  duration: string;
  thumbnail: string;
}

const DEFAULT_VIDEOS: WatchVideo[] = [
  {
    id: 'yt-1',
    videoId: 'M7lc1UVf-VE',
    title: "MEOVV(미야오) - 'GO HARD' M/V",
    channel: 'THEBLACKLABEL',
    views: '6M views',
    timeAgo: '18 hours ago',
    duration: '3:12',
    thumbnail: 'https://images.unsplash.com/photo-1514525253161-7a46d19cd819?w=640&auto=format&fit=crop&q=80'
  },
  {
    id: 'yt-2',
    videoId: 'kJQP7kiw5Fk',
    title: 'River | Official Trailer',
    channel: 'Universal Pictures',
    views: '981K views',
    timeAgo: '12 hours ago',
    duration: '1:53',
    thumbnail: 'https://images.unsplash.com/photo-1536440136628-849c177e76a1?w=640&auto=format&fit=crop&q=80'
  },
  {
    id: 'yt-3',
    videoId: 'fJ9rUzIMcZQ',
    title: 'We tried NEW Backrooms games...',
    channel: 'SMii7Y',
    views: '2.2M views',
    timeAgo: '1 day ago',
    duration: '36:26',
    thumbnail: 'https://images.unsplash.com/photo-1542751371-adc38448a05e?w=640&auto=format&fit=crop&q=80'
  },
  {
    id: 'yt-4',
    videoId: 'JGwWNGJdvx8',
    title: 'Riley Green, Peyton Manning - Alabama Vs. Tennessee (Official Video)',
    channel: 'RileyGreenVEVO',
    views: '138K views',
    timeAgo: '13 hours ago',
    duration: '4:03',
    thumbnail: 'https://images.unsplash.com/photo-1511671782779-c97d3d27a1d4?w=640&auto=format&fit=crop&q=80'
  },
  {
    id: 'yt-5',
    videoId: '9bZkp7q19f0',
    title: 'Disney Hexed | Official Teaser Trailer',
    channel: 'Disney',
    views: '1.4M views',
    timeAgo: '2 days ago',
    duration: '2:15',
    thumbnail: 'https://images.unsplash.com/photo-1518709268805-4e9042af9f23?w=640&auto=format&fit=crop&q=80'
  },
  {
    id: 'yt-6',
    videoId: 'jfKfPfyJRdk',
    title: 'Lofi Hip Hop Radio - Beats to Relax/Study to',
    channel: 'Lofi Girl',
    views: '68M views',
    timeAgo: 'Live Now',
    duration: 'LIVE',
    thumbnail: 'https://images.unsplash.com/photo-1501386761578-eac5c94b800a?w=640&auto=format&fit=crop&q=80'
  },
  {
    id: 'yt-7',
    videoId: 'L_LUpnjgPso',
    title: 'Lethal Company - Terrifying Escapes with Friends',
    channel: 'Mob Entertainment',
    views: '3.1M views',
    timeAgo: '3 days ago',
    duration: '14:20',
    thumbnail: 'https://images.unsplash.com/photo-1550745165-9bc0b252726f?w=640&auto=format&fit=crop&q=80'
  },
  {
    id: 'yt-8',
    videoId: 'r7zJ8srWWgk',
    title: 'Godzilla Minus Zero | Official Trailer 2',
    channel: 'Toho Movie',
    views: '5.8M views',
    timeAgo: '4 days ago',
    duration: '2:04',
    thumbnail: 'https://images.unsplash.com/photo-1579783902614-a3fb3927b675?w=640&auto=format&fit=crop&q=80'
  }
];

const MOCK_FRIENDS = [
  { name: 'Luna', seed: 'Luna', color: 'F9EBD8', avatar: 'https://api.dicebear.com/7.x/adventurer/svg?seed=Luna&backgroundColor=F9EBD8' },
  { name: 'Jasper', seed: 'Jasper', color: 'F9EBD8', avatar: 'https://api.dicebear.com/7.x/adventurer/svg?seed=Jasper&backgroundColor=F9EBD8' },
  { name: 'Mimi', seed: 'Mimi', color: '8CC6C5', avatar: 'https://api.dicebear.com/7.x/adventurer/svg?seed=Mimi&backgroundColor=8CC6C5' },
  { name: 'Felix', seed: 'Felix', color: 'F2C8F7', avatar: 'https://api.dicebear.com/7.x/adventurer/svg?seed=Felix&backgroundColor=F2C8F7' },
  { name: 'Oscar', seed: 'Oscar', color: 'A577FF', avatar: 'https://api.dicebear.com/7.x/adventurer/svg?seed=Oscar&backgroundColor=A577FF' },
  { name: 'Aneka', seed: 'Aneka', color: '8CC6C5', avatar: 'https://api.dicebear.com/7.x/adventurer/svg?seed=Aneka&backgroundColor=8CC6C5' },
  { name: 'Chloe', seed: 'Chloe', color: 'F9EBD8', avatar: 'https://api.dicebear.com/7.x/adventurer/svg?seed=Chloe&backgroundColor=F9EBD8' },
  { name: 'Ryan', seed: 'Ryan', color: '8CC6C5', avatar: 'https://api.dicebear.com/7.x/adventurer/svg?seed=Ryan&backgroundColor=8CC6C5' },
];

interface WatchTogetherModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentUser?: { name: string; avatar: string };
  roomMembers?: Array<{ name: string; avatar: string; isHost?: boolean }>;
  friendsList?: any[];
  initialFriend?: any;
  onLeaveSession?: () => void;
}

export default function WatchTogetherModal({
  isOpen,
  onClose,
  currentUser = { name: 'You', avatar: 'https://api.dicebear.com/7.x/adventurer/svg?seed=Leo' },
  roomMembers = [],
  friendsList = [],
  initialFriend,
  onLeaveSession
}: WatchTogetherModalProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [activeVideo, setActiveVideo] = useState<WatchVideo | null>(null);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [videoList, setVideoList] = useState<WatchVideo[]>(DEFAULT_VIDEOS);

  // Listening Together style: User Avatars with pending/joined status & Invite Dropdown
  const [joinedUsers, setJoinedUsers] = useState<WatchUser[]>([
    { ...currentUser, status: 'joined' }
  ]);
  const [isInviteOpen, setIsInviteOpen] = useState(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const toastTimerRef = useRef<NodeJS.Timeout | null>(null);
  const lastLeaveToastTimeRef = useRef<number>(0);
  const broadcastChannelRef = useRef<BroadcastChannel | null>(null);
  const syncSessionRef = useRef<(() => void) | null>(null);

  const showToast = useCallback((msg: string, duration = 3000) => {
    if (toastTimerRef.current) clearTimeout(toastTimerRef.current);
    setToastMessage(msg);
    toastTimerRef.current = setTimeout(() => {
      setToastMessage(null);
      toastTimerRef.current = null;
    }, duration);
  }, []);

  const showLeaveToastOnce = useCallback((msg: string) => {
    const now = Date.now();
    if (now - lastLeaveToastTimeRef.current < 4000) return;
    lastLeaveToastTimeRef.current = now;
    showToast(msg, 3500);
  }, [showToast]);

  const broadcastSync = useCallback((type: string, payload?: any) => {
    try {
      broadcastChannelRef.current?.postMessage({ type, sender: currentUser.name, ...payload });
    } catch (e) {}
  }, [currentUser.name]);

  // Setup BroadcastChannel for instant cross-tab sync
  useEffect(() => {
    if (typeof window !== 'undefined' && 'BroadcastChannel' in window) {
      const bc = new BroadcastChannel('cozy_realtime_sync');
      broadcastChannelRef.current = bc;
      bc.onmessage = (event) => {
        const data = event.data;
        if (!data) return;
        if (
          data.type === 'INVITE_SENT' || 
          data.type === 'SESSION_JOINED' || 
          data.type === 'SESSION_LEFT'
        ) {
          syncSessionRef.current?.();
        }
      };
      return () => {
        bc.close();
        broadcastChannelRef.current = null;
      };
    }
  }, []);

  const [isLoadingSearch, setIsLoadingSearch] = useState(false);
  const [searchHeading, setSearchHeading] = useState<string>('Trending & Popular on YouTube');

  // Sync initial room members if available
  useEffect(() => {
    if (roomMembers && roomMembers.length > 0) {
      setJoinedUsers(prev => {
        const updated = [...prev];
        roomMembers.forEach(m => {
          if (!updated.some(u => u.name === m.name)) {
            updated.push({ name: m.name, avatar: m.avatar, status: 'joined' });
          }
        });
        return updated;
      });
    }
  }, [roomMembers]);

  // Sync initialFriend if opening from invitation notification
  useEffect(() => {
    if (initialFriend) {
      setJoinedUsers(prev => {
        if (!prev.some(u => u.name.toLowerCase() === initialFriend.name.toLowerCase())) {
          return [...prev, { name: initialFriend.name, avatar: initialFriend.avatar, status: 'joined' }];
        }
        return prev;
      });
      showToast(`Joined Watch Together with ${initialFriend.name}`, 3000);

      // Immediately inform database that we joined Watch Together
      fetch('/api/invitations', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          action: 'join', 
          partnerName: initialFriend.name, 
          senderName: currentUser.name,
          type: 'activity', 
          targetName: 'Watch Together',
          status: 'accepted'
        })
      })
      .then(() => {
        broadcastSync('SESSION_JOINED', { partnerName: initialFriend.name, target: 'Watch Together' });
      })
      .catch(e => {});
    }
  }, [initialFriend, currentUser.name, showToast, broadcastSync]);

  // Active Watch Together session sync (handles join, partner leave, host session end in real-time)
  useEffect(() => {
    if (!isOpen) return;

    const syncSession = () => {
      fetch(`/api/invitations?username=${encodeURIComponent(currentUser.name)}`)
        .then(res => res.json())
        .then(res => {
          if (!res.success) return;

          const session = res.activeWatchSession;

          if (session) {
            if (session.status === 'accepted') {
              // Both users connected!
              setJoinedUsers(prev => {
                const exists = prev.find(u => u.name.toLowerCase() === session.partnerName.toLowerCase());
                if (!exists) {
                  showToast(`${session.partnerName} joined Watch Together!`, 3000);
                  return [...prev, {
                    name: session.partnerName,
                    avatar: session.partnerImage || `https://api.dicebear.com/7.x/adventurer/svg?seed=${session.partnerName}&backgroundColor=A577FF`,
                    status: 'joined'
                  }];
                } else if (exists.status !== 'joined') {
                  showToast(`${session.partnerName} accepted! Joined Watch Together`, 3000);
                  return prev.map(u => u.name.toLowerCase() === session.partnerName.toLowerCase() ? { ...u, status: 'joined' } : u);
                }
                return prev;
              });
            } else if (session.status === 'active') {
              // Host is still in room, but guest left
              setJoinedUsers(prev => {
                const partnerUser = prev.find(u => u.name.toLowerCase() === session.partnerName.toLowerCase());
                if (partnerUser && partnerUser.status === 'joined') {
                  showLeaveToastOnce(`${session.partnerName} left Watch Together`);
                  return prev.filter(u => u.name.toLowerCase() !== session.partnerName.toLowerCase());
                }
                return prev;
              });
            }
          } else {
            // Session expired or host ended
            setJoinedUsers(prev => {
              const otherUsers = prev.filter(u => u.name !== currentUser.name);
              if (otherUsers.length > 0) {
                showLeaveToastOnce(`Watch Together session ended`);
                return prev.filter(u => u.name === currentUser.name);
              }
              return prev;
            });
          }
        })
        .catch(err => console.error("Error syncing watch session:", err));
    };

    syncSessionRef.current = syncSession;
    syncSession();
    const interval = setInterval(syncSession, 800);
    return () => clearInterval(interval);
  }, [isOpen, currentUser.name, showToast, showLeaveToastOnce]);

  // Combine real friends, room members & mock friends for invite list
  const availableFriends = React.useMemo(() => {
    const list: Array<{ name: string; avatar: string; email?: string }> = [];
    if (friendsList && friendsList.length > 0) {
      friendsList.forEach(f => {
        if (f.name !== currentUser.name && !list.some(item => item.name.toLowerCase() === f.name.toLowerCase())) {
          list.push({
            name: f.name,
            email: (f as any).email,
            avatar: f.avatar || `https://api.dicebear.com/7.x/adventurer/svg?seed=${f.seed || f.name}&backgroundColor=${f.color || 'A577FF'}`
          });
        }
      });
    }
    if (roomMembers && roomMembers.length > 0) {
      roomMembers.forEach(m => {
        if (m.name !== currentUser.name && !list.some(f => f.name.toLowerCase() === m.name.toLowerCase())) {
          list.push({ name: m.name, avatar: m.avatar });
        }
      });
    }
    MOCK_FRIENDS.forEach(m => {
      if (m.name !== currentUser.name && !list.some(f => f.name.toLowerCase() === m.name.toLowerCase())) {
        list.push({ name: m.name, avatar: m.avatar });
      }
    });
    return list;
  }, [friendsList, roomMembers, currentUser.name]);

  const handleInviteFriend = (friend: { name: string; avatar: string; email?: string }) => {
    if (joinedUsers.some(u => u.name.toLowerCase() === friend.name.toLowerCase())) return;
    
    // 1. Add friend with status 'pending' (blinking/pulsing like Listening Together)
    setJoinedUsers(prev => [...prev, { name: friend.name, avatar: friend.avatar, status: 'pending' }]);

    // Send persistent invitation to Supabase PostgreSQL
    fetch('/api/invitations', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        receiverName: friend.name,
        receiverEmail: friend.email,
        senderName: currentUser.name,
        type: 'activity',
        targetName: 'Watch Together'
      })
    })
    .then(() => {
      broadcastSync('INVITE_SENT', { receiverName: friend.name, target: 'Watch Together' });
    })
    .catch(err => console.error("Error sending watch invitation:", err));

    // For built-in mock bots only (not real friends)
    const isMockBot = ['Luna', 'Jasper', 'Mimi', 'Felix', 'Oscar', 'Aneka'].includes(friend.name) && !friendsList.some(f => f.name.toLowerCase() === friend.name.toLowerCase() && (f as any).isRealFriend);
    if (isMockBot) {
      setTimeout(() => {
        setJoinedUsers(prev => prev.map(u => u.name === friend.name ? { ...u, status: 'joined' } : u));
      }, 3500);
    }
  };

  const handleCloseModal = () => {
    const partner = joinedUsers.find(u => u.name !== currentUser.name);
    lastLeaveToastTimeRef.current = Date.now();
    showToast("Left Watch Together", 3000);

    fetch('/api/invitations', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        action: 'leave',
        partnerName: partner?.name,
        senderName: currentUser.name,
        type: 'activity',
        targetName: 'Watch Together'
      })
    })
    .then(() => {
      broadcastSync('SESSION_LEFT', { partnerName: partner?.name, target: 'Watch Together' });
    })
    .catch(e => {});

    if (onLeaveSession) onLeaveSession();
    onClose();
  };

  // Helper to extract YouTube video ID from various URL formats
  const extractYouTubeId = (urlOrQuery: string): string | null => {
    const trimmed = urlOrQuery.trim();
    if (/^[a-zA-Z0-9_-]{11}$/.test(trimmed)) {
      return trimmed;
    }
    const watchMatch = trimmed.match(/(?:youtube\.com\/(?:[^\/]+\/.+\/|(?:v|e(?:mbed)?)\/|.*[?&]v=)|youtu\.be\/)([^"&?\/\s]{11})/i);
    if (watchMatch && watchMatch[1]) {
      return watchMatch[1];
    }
    return null;
  };

  const handleSearchOrPlay = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    const query = searchQuery.trim();
    if (!query) return;

    const extractedId = extractYouTubeId(query);
    if (extractedId) {
      // User pasted a YouTube URL or direct Video ID!
      const newVid: WatchVideo = {
        id: `yt-custom-${Date.now()}`,
        videoId: extractedId,
        title: query.includes('http') ? 'Custom YouTube Video' : query,
        channel: 'YouTube Video',
        views: 'Live Sync',
        timeAgo: 'Just now',
        duration: 'Playing',
        thumbnail: `https://i.ytimg.com/vi/${extractedId}/hqdefault.jpg`
      };
      setActiveVideo(newVid);
      return;
    }

    // Real YouTube Search: fetch results and show in grid like the YouTube website!
    setIsLoadingSearch(true);
    setActiveVideo(null); // Return to grid so search results are presented
    setSearchHeading(`Search results for "${query}"`);

    try {
      const res = await fetch(`/api/youtube/search?q=${encodeURIComponent(query)}`);
      if (res.ok) {
        const data = await res.json();
        if (data.videos && Array.isArray(data.videos) && data.videos.length > 0) {
          setVideoList(data.videos);
          setIsLoadingSearch(false);
          return;
        }
      }
    } catch (err) {
      console.warn('YouTube search API error:', err);
    }

    // Fallback if search API is unreachable: filter or provide direct search card
    const qLower = query.toLowerCase();
    const localFiltered = DEFAULT_VIDEOS.filter(v => 
      v.title.toLowerCase().includes(qLower) || 
      v.channel.toLowerCase().includes(qLower)
    );

    if (localFiltered.length > 0) {
      setVideoList(localFiltered);
    } else {
      setVideoList([
        {
          id: `yt-search-${Date.now()}`,
          videoId: `__search__:${query}`,
          title: `${query} (Play Top Match on YouTube)`,
          channel: 'YouTube Search Result',
          views: 'Direct Search',
          timeAgo: 'Now',
          duration: 'Video',
          thumbnail: 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=640&auto=format&fit=crop&q=80'
        }
      ]);
    }

    setIsLoadingSearch(false);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 md:p-6 bg-black/80 backdrop-blur-md animate-in fade-in duration-200">
      <div 
        className={`bg-[#0F0F0F] border border-white/10 text-white rounded-3xl shadow-[0_20px_60px_rgba(0,0,0,0.9)] flex flex-col overflow-hidden transition-all duration-300 relative ${
          isFullscreen 
            ? 'w-full h-full rounded-none' 
            : 'w-full max-w-5xl h-[85vh] max-h-[780px]'
        }`}
        onClick={() => setIsInviteOpen(false)}
      >
        {/* Toast Notification */}
        {toastMessage && (
          <div className="absolute top-20 left-1/2 -translate-x-1/2 bg-white text-[#150A35] px-4 py-2 rounded-2xl shadow-2xl flex items-center gap-2 z-50 animate-in slide-in-from-top-3 font-bold text-xs">
            <Sparkles size={15} className="text-[#A577FF]" />
            <span>{toastMessage}</span>
          </div>
        )}

        {/* ================= 1. TOP BAR ================= */}
        <div 
          className="h-16 px-5 border-b border-white/10 bg-[#161616] flex items-center justify-between gap-4 shrink-0 relative z-30 select-none"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Left: Listening Together Style: User Avatars & Invite Button */}
          <div className="flex items-center gap-3 relative shrink-0">
            {/* Overlapping User Avatars */}
            <div className="flex items-center -space-x-2.5">
              {joinedUsers.slice(0, 4).map((user, idx) => {
                const isPending = user.status === 'pending';
                return (
                  <div 
                    key={idx} 
                    className="relative group/user" 
                    title={`${user.name} ${isPending ? '(Invited - waiting to connect...)' : '(Joined)'}`}
                  >
                    <img 
                      src={user.avatar} 
                      alt={user.name} 
                      className={`w-8 h-8 rounded-full border-2 transition-all object-cover relative z-0 ${
                        isPending 
                          ? 'animate-pulse opacity-70 ring-2 ring-yellow-400/80 border-yellow-400' 
                          : 'border-[#161616] opacity-100 ring-0 hover:scale-105'
                      }`}
                    />
                    {isPending && (
                      <span className="absolute -top-1 -right-1 w-3 h-3 bg-yellow-400 border-2 border-[#161616] rounded-full animate-ping z-20 pointer-events-none" />
                    )}
                  </div>
                );
              })}
              {joinedUsers.length > 4 && (
                <div 
                  className="w-8 h-8 rounded-full bg-[#251A45] border-2 border-[#161616] flex items-center justify-center text-[10px] font-bold text-gray-300 shadow-md"
                  title={`${joinedUsers.length - 4} more participants`}
                >
                  +{joinedUsers.length - 4}
                </div>
              )}
            </div>

            {/* Invite Button */}
            <button
              onClick={() => setIsInviteOpen(!isInviteOpen)}
              className="flex items-center gap-1.5 bg-white/10 hover:bg-[#A577FF]/20 border border-white/10 hover:border-[#A577FF]/40 text-gray-200 hover:text-white px-3 py-1.5 rounded-full text-xs font-bold transition-all shadow-sm active:scale-95 cursor-pointer"
              title="Invite friends to watch together"
            >
              <UserPlus size={14} className="text-[#A577FF]" />
              <span>Invite</span>
            </button>

            {/* Friends Invite Popup Dropdown */}
            {isInviteOpen && (
              <>
                <div className="fixed inset-0 z-40" onClick={() => setIsInviteOpen(false)} />
                <div 
                  className="absolute top-11 left-0 w-72 bg-[#1E123F] border border-white/10 rounded-2xl p-3.5 shadow-2xl z-50 animate-in fade-in zoom-in-95 space-y-2.5 select-none"
                  onClick={(e) => e.stopPropagation()}
                >
                  <div className="flex items-center justify-between pb-2 border-b border-white/10">
                    <span className="text-xs font-bold text-white flex items-center gap-1.5">
                      <Users size={14} className="text-[#A577FF]" />
                      <span>Invite Friends</span>
                    </span>
                    <span className="text-[10px] font-semibold text-gray-400">All can edit</span>
                  </div>

                  <div className="max-h-56 overflow-y-auto custom-scrollbar space-y-1 pr-1">
                    {availableFriends.map((f, i) => {
                      const userInRoom = joinedUsers.find(u => u.name === f.name);
                      const isPending = userInRoom?.status === 'pending';
                      const isJoined = userInRoom?.status === 'joined';
                      return (
                        <div key={i} className="flex items-center justify-between p-2 hover:bg-white/5 rounded-xl transition-colors">
                          <div className="flex items-center gap-2.5 min-w-0">
                            <img src={f.avatar} alt={f.name} className="w-7 h-7 rounded-full border border-white/10 object-cover shrink-0" />
                            <span className="text-xs font-semibold text-gray-200 truncate">{f.name}</span>
                          </div>
                          <button
                            disabled={isPending || isJoined}
                            onClick={() => handleInviteFriend(f)}
                            className={`text-[10px] px-3 py-1 rounded-full font-bold transition-all shrink-0 ${
                              isJoined 
                                ? 'bg-green-500/20 text-green-400 cursor-default flex items-center gap-1' 
                                : isPending
                                ? 'bg-yellow-500/20 text-yellow-400 cursor-default flex items-center gap-1 animate-pulse'
                                : 'bg-[#A577FF] hover:bg-[#9161eb] text-white cursor-pointer shadow-sm active:scale-95'
                            }`}
                          >
                            {isJoined ? (
                              <>
                                <Check size={11} strokeWidth={3} /> Joined
                              </>
                            ) : isPending ? (
                              <>
                                <RefreshCw size={10} className="animate-spin" /> Waiting...
                              </>
                            ) : (
                              'Invite'
                            )}
                          </button>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </>
            )}
          </div>

          {/* Middle: Search or paste YouTube URL */}
          <form 
            onSubmit={handleSearchOrPlay}
            className="flex-1 max-w-md relative"
          >
            <div className="flex items-center w-full bg-[#0F0F0F] border border-white/15 hover:border-[#A577FF]/50 focus-within:border-[#A577FF] focus-within:shadow-[0_0_15px_rgba(165,119,255,0.25)] rounded-full pl-4 pr-1.5 py-1 transition-all">
              <input 
                type="text"
                placeholder="Search or paste YouTube URL"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full bg-transparent text-xs text-white placeholder-gray-500 focus:outline-none"
              />
              {searchQuery && (
                <button 
                  type="button"
                  onClick={() => { 
                    setSearchQuery(''); 
                    setVideoList(DEFAULT_VIDEOS);
                    setSearchHeading('Trending & Popular on YouTube');
                  }}
                  className="text-gray-400 hover:text-white p-1 mr-1"
                >
                  <X size={13} />
                </button>
              )}
              <button 
                type="submit"
                disabled={isLoadingSearch}
                className="w-7 h-7 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center text-gray-300 hover:text-white transition-colors cursor-pointer shrink-0"
                title="Search or load YouTube URL"
              >
                {isLoadingSearch ? (
                  <RefreshCw size={13} className="animate-spin text-[#A577FF]" />
                ) : (
                  <Search size={14} />
                )}
              </button>
            </div>
          </form>

          {/* Right: Window Controls */}
          <div className="flex items-center gap-2">
            {activeVideo && (
              <button 
                onClick={() => setActiveVideo(null)}
                className="text-xs bg-white/10 hover:bg-white/15 px-3 py-1.5 rounded-full text-gray-300 hover:text-white flex items-center gap-1.5 transition-colors cursor-pointer font-medium"
              >
                <Film size={13} />
                <span>Browse Grid</span>
              </button>
            )}

            <button 
              onClick={() => setIsFullscreen(!isFullscreen)}
              className="w-8 h-8 rounded-full bg-white/5 hover:bg-white/10 flex items-center justify-center text-gray-400 hover:text-white transition-colors cursor-pointer"
              title={isFullscreen ? "Exit Fullscreen" : "Fullscreen"}
            >
              {isFullscreen ? <Minimize2 size={15} /> : <Maximize2 size={15} />}
            </button>

            {/* Exit Button (LogOut icon replacing X) */}
            <button 
              onClick={handleCloseModal}
              className="w-8 h-8 rounded-full bg-red-500/15 hover:bg-red-500 text-red-400 hover:text-white flex items-center justify-center transition-all cursor-pointer group/exit border border-red-500/20"
              title="Leave Watch Together"
            >
              <LogOut size={15} className="group-hover/exit:scale-110 transition-transform" />
            </button>
          </div>
        </div>

        {/* ================= 2. MAIN CONTENT ================= */}
        <div className="flex-1 overflow-y-auto custom-scrollbar p-5 sm:p-6 bg-[#0F0F0F]">
          {activeVideo ? (
            /* ACTIVE YOUTUBE PLAYER VIEW */
            <div className="flex flex-col h-full gap-4 max-w-4xl mx-auto animate-in fade-in duration-300">
              {/* Responsive 16:9 YouTube Embed Player */}
              <div className="relative w-full aspect-video bg-black rounded-2xl overflow-hidden shadow-2xl border border-white/10">
                <iframe
                  src={
                    activeVideo.videoId.startsWith('__search__:')
                      ? `https://www.youtube-nocookie.com/embed?listType=search&list=${encodeURIComponent(activeVideo.videoId.replace('__search__:', ''))}&autoplay=1&enablejsapi=1&rel=0&modestbranding=1`
                      : `https://www.youtube-nocookie.com/embed/${activeVideo.videoId}?autoplay=1&enablejsapi=1&rel=0&modestbranding=1`
                  }
                  title={activeVideo.title}
                  allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
                  allowFullScreen
                  className="w-full h-full border-0"
                />
              </div>

              {/* Video Info Bar */}
              <div className="flex items-start justify-between gap-4 p-4 rounded-2xl bg-[#181818] border border-white/10">
                <div className="min-w-0">
                  <h2 className="text-base sm:text-lg font-bold text-white truncate">
                    {activeVideo.title}
                  </h2>
                  <div className="flex items-center gap-2 mt-1 text-xs text-gray-400">
                    <span className="font-semibold text-gray-200">{activeVideo.channel}</span>
                    <span>•</span>
                    <span>{activeVideo.views}</span>
                    <span>•</span>
                    <span>{activeVideo.timeAgo}</span>
                  </div>
                </div>

                <div className="flex items-center gap-2 shrink-0">
                  <button 
                    onClick={() => setActiveVideo(null)}
                    className="bg-[#A577FF] hover:bg-[#9161eb] text-white font-bold text-xs px-4 py-2 rounded-xl transition-all shadow-md cursor-pointer flex items-center gap-1.5 active:scale-95"
                  >
                    <span>Change Video</span>
                  </button>
                  <a 
                    href={
                      activeVideo.videoId.startsWith('__search__:')
                        ? `https://www.youtube.com/results?search_query=${encodeURIComponent(activeVideo.videoId.replace('__search__:', ''))}`
                        : `https://www.youtube.com/watch?v=${activeVideo.videoId}`
                    }
                    target="_blank"
                    rel="noreferrer"
                    className="p-2 rounded-xl bg-white/5 hover:bg-white/10 text-gray-400 hover:text-white transition-colors"
                    title="Open on YouTube"
                  >
                    <ExternalLink size={16} />
                  </a>
                </div>
              </div>

              {/* Up Next Recommendations */}
              <div className="mt-2">
                <h3 className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-3">Up Next in Watch Together</h3>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                  {DEFAULT_VIDEOS.filter(v => v.videoId !== activeVideo.videoId).slice(0, 4).map((v) => (
                    <div 
                      key={v.id}
                      onClick={() => setActiveVideo(v)}
                      className="cursor-pointer group bg-[#181818] hover:bg-[#222222] p-2.5 rounded-xl border border-white/5 transition-all"
                    >
                      <div className="relative aspect-video rounded-lg overflow-hidden mb-2 bg-gray-900">
                        <img src={v.thumbnail} alt={v.title} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300" />
                        <span className="absolute bottom-1 right-1 bg-black/80 text-[10px] font-bold px-1.5 py-0.5 rounded text-white">
                          {v.duration}
                        </span>
                      </div>
                      <h4 className="text-xs font-bold text-gray-200 group-hover:text-[#C4A6FF] truncate mb-1 transition-colors">
                        {v.title}
                      </h4>
                      <p className="text-[10px] text-gray-400 truncate">{v.channel}</p>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          ) : (
            <div>
              {/* Category / Search Results Header */}
              <div className="flex items-center justify-between pb-3.5 mb-4 border-b border-white/5">
                <div className="flex items-center gap-2">
                  <h2 className="text-sm font-bold text-white tracking-wide">{searchHeading}</h2>
                  <span className="text-[11px] text-gray-400 font-medium">({videoList.length} videos)</span>
                </div>

                {searchHeading !== 'Trending & Popular on YouTube' && (
                  <button 
                    onClick={() => {
                      setSearchQuery('');
                      setVideoList(DEFAULT_VIDEOS);
                      setSearchHeading('Trending & Popular on YouTube');
                    }}
                    className="text-xs text-[#A577FF] hover:text-[#C4A6FF] hover:underline cursor-pointer flex items-center gap-1 font-semibold transition-colors"
                  >
                    <span>← Back to Trending</span>
                  </button>
                )}
              </div>

              {isLoadingSearch ? (
                /* Loading Skeleton Grid (Like YouTube Web App) */
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-5">
                  {Array.from({ length: 8 }).map((_, i) => (
                    <div key={i} className="flex flex-col gap-2.5 animate-pulse">
                      <div className="aspect-video bg-white/10 rounded-2xl" />
                      <div className="h-4 bg-white/10 rounded-md w-3/4 mt-1" />
                      <div className="h-3 bg-white/5 rounded-md w-1/2" />
                    </div>
                  ))}
                </div>
              ) : videoList.length === 0 ? (
                /* Empty Search Results */
                <div className="flex flex-col items-center justify-center p-14 text-center">
                  <Search size={38} className="text-gray-600 mb-3" />
                  <h3 className="text-sm font-bold text-gray-200">No videos found</h3>
                  <p className="text-xs text-gray-400 mt-1 mb-4 max-w-sm">
                    No results matched your search query. Try another keyword or paste a direct YouTube video URL.
                  </p>
                  <button 
                    onClick={() => {
                      setSearchQuery('');
                      setVideoList(DEFAULT_VIDEOS);
                      setSearchHeading('Trending & Popular on YouTube');
                    }}
                    className="bg-white/10 hover:bg-white/20 text-white text-xs font-bold px-4 py-2 rounded-xl transition-colors cursor-pointer"
                  >
                    Return to Trending
                  </button>
                </div>
              ) : (
                /* YOUTUBE TOGETHER BROWSE GRID (EXACT SCREENSHOT LAYOUT) */
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-5">
                  {videoList.map((video) => (
                    <div
                      key={video.id}
                      onClick={() => setActiveVideo(video)}
                      className="cursor-pointer group flex flex-col transition-transform hover:-translate-y-1 duration-200"
                    >
                      {/* Thumbnail Container (16:9 ratio) */}
                      <div className="relative aspect-video rounded-2xl overflow-hidden bg-[#181818] border border-white/5 group-hover:border-[#A577FF]/60 group-hover:shadow-[0_0_15px_rgba(165,119,255,0.25)] transition-all shadow-md">
                        <img 
                          src={video.thumbnail} 
                          alt={video.title} 
                          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300" 
                        />
                        
                        {/* Hover Play Button Overlay */}
                        <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity">
                          <div className="w-12 h-12 rounded-full bg-red-600/90 text-white flex items-center justify-center shadow-lg group-hover:scale-110 transition-transform">
                            <Play size={20} fill="white" className="ml-1" />
                          </div>
                        </div>

                        {/* Duration Badge Bottom Right */}
                        {video.duration && (
                          <span className="absolute bottom-2 right-2 bg-black/80 text-white text-[11px] font-bold px-1.5 py-0.5 rounded-md backdrop-blur-sm">
                            {video.duration}
                          </span>
                        )}
                      </div>

                      {/* Video Meta Info */}
                      <div className="mt-2.5 px-0.5">
                        <h3 className="text-xs font-bold text-white group-hover:text-[#C4A6FF] transition-colors line-clamp-2 leading-snug mb-1">
                          {video.title}
                        </h3>
                        <p className="text-[11px] text-gray-400 truncate font-medium">
                          {video.channel}
                        </p>
                        <p className="text-[11px] text-gray-500 truncate mt-0.5">
                          {video.views} {video.timeAgo ? `• ${video.timeAgo}` : ''}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>

        {/* ================= 3. BOTTOM FOOTER ================= */}
        <div className="h-9 px-5 bg-[#0C0C0C] border-t border-white/5 flex items-center justify-between text-[10px] text-gray-500 shrink-0 select-none">
          <span>YouTube Terms and Privacy</span>
          <span>Build Version: 126</span>
          <span>Open Font License</span>
        </div>
      </div>
    </div>
  );
}
