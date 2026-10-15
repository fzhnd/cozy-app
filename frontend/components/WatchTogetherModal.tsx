import React, { useState, useEffect, useRef, useCallback } from 'react';
import { 
  Search, X, Play, Pause, RotateCcw, RotateCw, LogOut, UserPlus, 
  ExternalLink, Maximize2, Minimize2, Users, Check, Film, Sparkles, RefreshCw
} from 'lucide-react';
import { subscribeRealtime, broadcastLocalSync } from '../lib/realtimeClient';

export interface WatchUser {
  name: string;
  avatar: string;
  status: 'pending' | 'joined';
  isHost?: boolean;
}

const sortWatchUsers = (users: WatchUser[], currentUserName?: string, isCurrentUserHost?: boolean): WatchUser[] => {
  const seen = new Set<string>();
  const uniqueUsers: WatchUser[] = [];
  users.forEach(u => {
    const key = (u.name || '').toLowerCase().trim();
    if (key && !seen.has(key)) {
      seen.add(key);
      uniqueUsers.push(u);
    }
  });

  const fixed = uniqueUsers.map(u => {
    if (currentUserName && isCurrentUserHost !== undefined) {
      if (u.name.toLowerCase().trim() === currentUserName.toLowerCase().trim()) {
        return { ...u, isHost: isCurrentUserHost };
      }
      return { ...u, isHost: !isCurrentUserHost };
    }
    return u;
  });

  const host = fixed.find(u => u.isHost);
  const guests = fixed.filter(u => !u.isHost);
  if (host) {
    return [host, ...guests];
  }
  return fixed;
};

const formatTime = (secs: number) => {
  if (isNaN(secs) || secs < 0) return '0:00';
  const m = Math.floor(secs / 60);
  const s = Math.floor(secs % 60);
  return `${m}:${s < 10 ? '0' : ''}${s}`;
};

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
  onConsumeInitialFriend?: () => void;
  onLeaveSession?: () => void;
}

export default function WatchTogetherModal({
  isOpen,
  onClose,
  currentUser = { name: 'You', avatar: '' },
  roomMembers = [],
  friendsList = [],
  initialFriend,
  onConsumeInitialFriend,
  onLeaveSession
}: WatchTogetherModalProps) {
  const currentUserName = currentUser?.name || 'You';
  const currentUserAvatar = currentUser?.avatar || `https://api.dicebear.com/7.x/adventurer/svg?seed=${currentUserName}&backgroundColor=A577FF`;

  const [searchQuery, setSearchQuery] = useState('');
  const [activeVideo, setActiveVideo] = useState<WatchVideo | null>(null);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [videoList, setVideoList] = useState<WatchVideo[]>(DEFAULT_VIDEOS);

  // Synced Playback State
  const [isPlaying, setIsPlaying] = useState(true);
  const [currentTime, setCurrentTime] = useState(0);
  const [totalDuration, setTotalDuration] = useState(180);
  const iframeRef = useRef<HTMLIFrameElement | null>(null);
  const departedPartnerNamesRef = useRef<Set<string>>(new Set());
  const activeVideoRef = useRef<WatchVideo | null>(null);
  activeVideoRef.current = activeVideo;
  const isPlayingRef = useRef<boolean>(true);
  isPlayingRef.current = isPlaying;
  const currentTimeRef = useRef<number>(0);
  currentTimeRef.current = currentTime;

  // Turn-based / Host-aware Joined Users State
  const isHostRef = useRef<boolean>(!initialFriend);
  const [joinedUsers, setJoinedUsers] = useState<WatchUser[]>(() => {
    if (initialFriend) {
      const friend = friendsList?.find((f: any) => f.name.toLowerCase() === initialFriend.name.toLowerCase());
      const partnerAvatar = initialFriend.avatar || friend?.avatar || `https://api.dicebear.com/7.x/adventurer/svg?seed=${initialFriend.name}&backgroundColor=A577FF`;
      return [
        { name: initialFriend.name, avatar: partnerAvatar, status: 'joined', isHost: true },
        { name: currentUserName, avatar: currentUserAvatar, status: 'joined', isHost: false }
      ];
    }
    return [{ name: currentUserName, avatar: currentUserAvatar, status: 'joined', isHost: true }];
  });
  const [isInviteOpen, setIsInviteOpen] = useState(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const toastTimerRef = useRef<NodeJS.Timeout | null>(null);
  const lastLeaveToastTimeRef = useRef<number>(0);
  const lastLeaveToastMsgRef = useRef<string>('');
  const broadcastChannelRef = useRef<BroadcastChannel | null>(null);
  const syncSessionRef = useRef<(() => void) | null>(null);
  const lastPartnerNameRef = useRef<string | null>(null);

  // Keep host/user entry synchronized with current logged-in user without overwriting guest status
  useEffect(() => {
    if (!currentUserName) return;
    const resolvedAvatar = currentUser?.avatar || `https://api.dicebear.com/7.x/adventurer/svg?seed=${currentUserName}&backgroundColor=A577FF`;
    setJoinedUsers(prev => {
      const isHost = isHostRef.current;
      const myLower = currentUserName.toLowerCase().trim();
      const others = prev.filter(u => {
        const uLower = (u.name || '').toLowerCase().trim();
        return uLower !== myLower && uLower !== 'you' && uLower !== 'user';
      });
      const myEntry: WatchUser = {
        name: currentUserName,
        avatar: resolvedAvatar,
        status: 'joined',
        isHost
      };
      return sortWatchUsers([myEntry, ...others], currentUserName, isHost);
    });
  }, [isOpen, currentUserName, currentUser?.avatar]);

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
    if (now - lastLeaveToastTimeRef.current < 5000 && lastLeaveToastMsgRef.current === msg) return;
    lastLeaveToastTimeRef.current = now;
    lastLeaveToastMsgRef.current = msg;
    showToast(msg, 3500);
  }, [showToast]);

  const broadcastSync = useCallback((type: string, payload?: any) => {
    try {
      broadcastLocalSync({ type, sender: currentUserName, ...payload });
    } catch (e) {}
  }, [currentUserName]);

  // YouTube IFrame PostMessage API command sender
  const sendIframeCommand = useCallback((func: string, args: any[] = []) => {
    try {
      iframeRef.current?.contentWindow?.postMessage(
        JSON.stringify({ event: 'command', func, args }),
        '*'
      );
    } catch (e) {}
  }, []);

  // Synchronized user actions
  const handleSelectVideo = useCallback((video: WatchVideo | null) => {
    setActiveVideo(video);
    setIsPlaying(true);
    setCurrentTime(0);
    broadcastSync('WATCH_VIDEO_SELECT', {
      video,
      isPlaying: true,
      currentTime: 0,
      senderName: currentUserName
    });
  }, [broadcastSync, currentUserName]);

  const handleTogglePlay = useCallback(() => {
    const nextPlaying = !isPlaying;
    setIsPlaying(nextPlaying);
    sendIframeCommand(nextPlaying ? 'playVideo' : 'pauseVideo');
    broadcastSync(nextPlaying ? 'WATCH_PLAY' : 'WATCH_PAUSE', {
      time: currentTime,
      senderName: currentUserName
    });
  }, [isPlaying, currentTime, sendIframeCommand, broadcastSync, currentUserName]);

  const handleSeek = useCallback((newTime: number) => {
    const clamped = Math.max(0, Math.min(newTime, totalDuration > 0 ? totalDuration : 99999));
    setCurrentTime(clamped);
    sendIframeCommand('seekTo', [clamped, true]);
    broadcastSync('WATCH_SEEK', {
      time: clamped,
      senderName: currentUserName
    });
  }, [totalDuration, sendIframeCommand, broadcastSync, currentUserName]);

  // Listen to postMessage from YouTube IFrame
  useEffect(() => {
    const handleMessage = (e: MessageEvent) => {
      try {
        const data = typeof e.data === 'string' ? JSON.parse(e.data) : e.data;
        if (data?.event === 'infoDelivery' && data?.info) {
          if (typeof data.info.currentTime === 'number') {
            setCurrentTime(Math.floor(data.info.currentTime));
          }
          if (typeof data.info.duration === 'number' && data.info.duration > 0) {
            setTotalDuration(Math.floor(data.info.duration));
          }
          if (typeof data.info.playerState === 'number') {
            setIsPlaying(data.info.playerState === 1);
          }
        }
      } catch (err) {}
    };
    window.addEventListener('message', handleMessage);
    return () => window.removeEventListener('message', handleMessage);
  }, []);

  // Tick playback timer smoothly when playing
  useEffect(() => {
    if (!isPlaying || !activeVideo) return;
    const timer = setInterval(() => {
      setCurrentTime(prev => {
        if (totalDuration > 0 && prev >= totalDuration) return prev;
        return prev + 1;
      });
    }, 1000);
    return () => clearInterval(timer);
  }, [isPlaying, activeVideo, totalDuration]);

  // Query partner's active video on open
  useEffect(() => {
    if (isOpen) {
      hasExitedRef.current = false;
      broadcastSync('WATCH_QUERY_STATE', { senderName: currentUserName });
    }
  }, [isOpen, broadcastSync, currentUserName]);

  // Setup SSE and cross-window sync for instant Watch Together session events (<10ms)
  useEffect(() => {
    if (!isOpen) return;

    const unsubscribe = subscribeRealtime((data: any) => {
      if (!data) return;

      const current = (currentUserName || '').toLowerCase().trim();

      // 1. Friend joined Watch Together (<10ms)
      if (data.type === 'SESSION_JOINED' && (data.target?.toLowerCase() === 'watch together' || data.type === 'watch together')) {
        const isMeSender = (data.senderName || '').toLowerCase().trim() === current;
        const partnerName = isMeSender ? data.partnerName : (data.senderName || data.userName);
        if (partnerName && partnerName.toLowerCase() !== current) {
          const friend = friendsList?.find((f: any) => f.name.toLowerCase() === partnerName.toLowerCase());
          const partnerAvatarFromEvent = isMeSender ? data.partnerAvatar : data.senderAvatar;
          const resolvedAvatar = partnerAvatarFromEvent 
            || friend?.avatar 
            || (friend?.seed ? `https://api.dicebear.com/7.x/adventurer/svg?seed=${friend.seed}&backgroundColor=A577FF` : null)
            || `https://api.dicebear.com/7.x/adventurer/svg?seed=${partnerName}&backgroundColor=A577FF`;

          lastPartnerNameRef.current = partnerName;
          hasExitedRef.current = false;
          departedPartnerNamesRef.current.delete(partnerName.toLowerCase().trim());
          setJoinedUsers(prev => {
            const partnerIsHost = !isHostRef.current;
            const exists = prev.find(u => u.name.toLowerCase() === partnerName.toLowerCase());
            let updated: WatchUser[];
            if (!exists) {
              showToast(`${partnerName} joined Watch Together!`, 3000);
              updated = [...prev, { name: partnerName, avatar: resolvedAvatar, status: 'joined', isHost: partnerIsHost }];
            } else {
              if (exists.status !== 'joined') {
                showToast(`${partnerName} accepted! Joined Watch Together`, 3000);
              }
              updated = prev.map(u => u.name.toLowerCase() === partnerName.toLowerCase()
                ? { ...u, avatar: resolvedAvatar, status: 'joined', isHost: partnerIsHost }
                : u
              );
            }
            return sortWatchUsers(updated, currentUserName, isHostRef.current);
          });

          // Share ongoing video state immediately with the friend who just joined!
          if (activeVideoRef.current) {
            broadcastSync('WATCH_STATE_SYNC', {
              video: activeVideoRef.current,
              isPlaying: isPlayingRef.current,
              currentTime: currentTimeRef.current,
              senderName: currentUserName
            });
          }
        }
      }

      // 2. Video Select / Change Sync (<10ms)
      if (data.type === 'WATCH_VIDEO_SELECT') {
        const isMe = (data.senderName || data.sender || '').toLowerCase().trim() === current;
        if (!isMe) {
          setActiveVideo(data.video);
          setIsPlaying(data.isPlaying ?? true);
          setCurrentTime(data.currentTime || 0);
          if (data.video) {
            showToast(`${data.senderName || 'Partner'} played: ${data.video.title}`, 3000);
          } else {
            showToast(`${data.senderName || 'Partner'} returned to video grid`, 2500);
          }
        }
      }

      // 3. Play Sync (<10ms)
      if (data.type === 'WATCH_PLAY') {
        const isMe = (data.senderName || data.sender || '').toLowerCase().trim() === current;
        if (!isMe) {
          setIsPlaying(true);
          if (typeof data.time === 'number') {
            setCurrentTime(data.time);
            sendIframeCommand('seekTo', [data.time, true]);
          }
          sendIframeCommand('playVideo');
          showToast(`${data.senderName || 'Partner'} played the video`, 2000);
        }
      }

      // 4. Pause Sync (<10ms)
      if (data.type === 'WATCH_PAUSE') {
        const isMe = (data.senderName || data.sender || '').toLowerCase().trim() === current;
        if (!isMe) {
          setIsPlaying(false);
          if (typeof data.time === 'number') {
            setCurrentTime(data.time);
            sendIframeCommand('seekTo', [data.time, true]);
          }
          sendIframeCommand('pauseVideo');
          showToast(`${data.senderName || 'Partner'} paused the video`, 2000);
        }
      }

      // 5. Seek Sync (<10ms)
      if (data.type === 'WATCH_SEEK') {
        const isMe = (data.senderName || data.sender || '').toLowerCase().trim() === current;
        if (!isMe && typeof data.time === 'number') {
          setCurrentTime(data.time);
          sendIframeCommand('seekTo', [data.time, true]);
        }
      }

      // 6. State Query & Response
      if (data.type === 'WATCH_QUERY_STATE') {
        const isMe = (data.senderName || data.sender || '').toLowerCase().trim() === current;
        if (!isMe && activeVideoRef.current) {
          broadcastSync('WATCH_STATE_SYNC', {
            video: activeVideoRef.current,
            isPlaying: isPlayingRef.current,
            currentTime: currentTimeRef.current,
            senderName: currentUserName
          });
        }
      }

      if (data.type === 'WATCH_STATE_SYNC') {
        const isMe = (data.senderName || data.sender || '').toLowerCase().trim() === current;
        if (!isMe && data.video) {
          setActiveVideo(data.video);
          setIsPlaying(data.isPlaying ?? true);
          if (typeof data.currentTime === 'number') {
            setCurrentTime(data.currentTime);
            setTimeout(() => {
              sendIframeCommand('seekTo', [data.currentTime, true]);
              if (data.isPlaying) sendIframeCommand('playVideo');
              else sendIframeCommand('pauseVideo');
            }, 600);
          }
        }
      }

      // 7. Friend left or Host ended Watch Together (<10ms)
      const isWatchEvent = (
        data.type === 'SESSION_LEFT' && (
          data.target?.toLowerCase() === 'watch together' || 
          data.targetName?.toLowerCase() === 'watch together' ||
          data.activity?.toLowerCase() === 'watch together' ||
          data.type === 'watch together'
        )
      );

      if (isWatchEvent) {
        const leaver = (data.userName || data.senderName || data.sender || '').toLowerCase().trim();
        const eventPartner = (data.partnerName || '').toLowerCase().trim();
        lastPartnerLeaveTimeRef.current = Date.now();

        if (leaver) departedPartnerNamesRef.current.add(leaver);
        if (eventPartner) departedPartnerNamesRef.current.add(eventPartner);

        if (data.action === 'end') {
          showLeaveToastOnce('Watch Together session ended by host');
          hasExitedRef.current = true;
          setJoinedUsers(prev => prev.filter(u => u.name.toLowerCase().trim() === current));
          setActiveVideo(null);
        } else {
          const leaverDisplayName = data.userName || data.senderName || data.sender || 'Partner';
          if (leaver && leaver !== current) {
            showLeaveToastOnce(`${leaverDisplayName} left Watch Together`);
          } else {
            showLeaveToastOnce('Partner left Watch Together');
          }
          setJoinedUsers(prev => prev.filter(u => {
            const uName = u.name.toLowerCase().trim();
            if (uName === current) return true;
            if (leaver && uName === leaver) return false;
            if (eventPartner && uName === eventPartner) return false;
            if (u.status === 'joined') return false;
            return true;
          }));
        }
      }

      // Fallback DB sync
      syncSessionRef.current?.();
    });

    return () => {
      unsubscribe();
    };
  }, [isOpen, currentUserName, friendsList, showToast, showLeaveToastOnce, broadcastSync, sendIframeCommand]);

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

  const currentUserNameRef = useRef(currentUserName);
  currentUserNameRef.current = currentUserName;
  const broadcastSyncRef = useRef(broadcastSync);
  broadcastSyncRef.current = broadcastSync;
  const hasExitedRef = useRef(false);
  const justJoinedTimeRef = useRef<number>(0);
  const justInvitedTimeRef = useRef<number>(0);
  const lastPartnerLeaveTimeRef = useRef<number>(0);

  // If the modal is closed by ANY path (not only the exit button), still leave/end the session
  const wasOpenRef = useRef(false);
  useEffect(() => {
    if (isOpen) {
      wasOpenRef.current = true;
      return;
    }
    if (!wasOpenRef.current) return;
    wasOpenRef.current = false;
    if (hasExitedRef.current) return;
    const others = joinedUsers.filter(u => u.name !== currentUserNameRef.current);
    const partnerName = others[0]?.name || lastPartnerNameRef.current;
    if (!partnerName) return;
    hasExitedRef.current = true;
    lastPartnerLeaveTimeRef.current = Date.now();
    const actionType = isHostRef.current ? 'end' : 'leave';
    fetch('/api/invitations', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        action: actionType,
        partnerName,
        senderName: currentUserNameRef.current,
        type: 'activity',
        targetName: 'Watch Together'
      }),
      keepalive: true
    }).catch(() => {});
    try {
      broadcastSyncRef.current('SESSION_LEFT', { 
        partnerName, 
        target: 'Watch Together', 
        action: actionType,
        userName: currentUserNameRef.current,
        senderName: currentUserNameRef.current
      });
    } catch (e) {}
    setJoinedUsers(prev => prev.filter(u => u.name === currentUserNameRef.current));
  }, [isOpen]);

  // Cleanup on unmount: ensure session leave/end is broadcast and updated in DB
  useEffect(() => {
    return () => {
      if (!hasExitedRef.current) {
        hasExitedRef.current = true;
        const isHost = isHostRef.current;
        const actionType = isHost ? 'end' : 'leave';
        const partnerName = lastPartnerNameRef.current;
        try {
          fetch('/api/invitations', {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              action: actionType,
              partnerName: partnerName || undefined,
              senderName: currentUserNameRef.current,
              type: 'activity',
              targetName: 'Watch Together'
            }),
            keepalive: true
          }).catch(() => {});
        } catch (e) {}

        try {
          broadcastSyncRef.current('SESSION_LEFT', { 
            partnerName: partnerName || undefined, 
            target: 'Watch Together', 
            action: actionType,
            userName: currentUserNameRef.current,
            senderName: currentUserNameRef.current
          });
        } catch (e) {}
      }
    };
  }, []);

  // Sync initialFriend if opening from invitation notification
  useEffect(() => {
    if (initialFriend) {
      isHostRef.current = false;
      hasExitedRef.current = false;
      justJoinedTimeRef.current = Date.now();
      lastPartnerNameRef.current = initialFriend.name;
      departedPartnerNamesRef.current.delete(initialFriend.name.toLowerCase().trim());
      const friend = friendsList?.find((f: any) => f.name.toLowerCase() === initialFriend.name.toLowerCase());
      const resolvedAvatar = initialFriend.avatar 
        || friend?.avatar 
        || (friend?.seed ? `https://api.dicebear.com/7.x/adventurer/svg?seed=${friend.seed}&backgroundColor=A577FF` : null)
        || `https://api.dicebear.com/7.x/adventurer/svg?seed=${initialFriend.name}&backgroundColor=A577FF`;

      setJoinedUsers(prev => {
        let updated: WatchUser[];
        if (!prev.some(u => u.name.toLowerCase() === initialFriend.name.toLowerCase())) {
          updated = [...prev, { name: initialFriend.name, avatar: resolvedAvatar, status: 'joined', isHost: true }];
        } else {
          updated = prev.map(u => u.name.toLowerCase() === initialFriend.name.toLowerCase()
            ? { ...u, avatar: resolvedAvatar, status: 'joined', isHost: true }
            : u
          );
        }
        return sortWatchUsers(updated, currentUserName, false);
      });
      showToast(`Joined Watch Together with ${initialFriend.name}`, 3000);
      broadcastSync('WATCH_QUERY_STATE', { senderName: currentUserName });

      if (onConsumeInitialFriend) {
        onConsumeInitialFriend();
      }
    }
  }, [initialFriend, friendsList, showToast, onConsumeInitialFriend, currentUserName, broadcastSync]);

  // Active Watch Together session sync (handles join, partner leave, host session end in real-time)
  useEffect(() => {
    if (!isOpen) return;

    const syncSession = () => {
      if (hasExitedRef.current) return;
      if (Date.now() - lastPartnerLeaveTimeRef.current < 5000) return;
      fetch(`/api/invitations?username=${encodeURIComponent(currentUserName)}`)
        .then(res => res.json())
        .then(res => {
          if (!res.success || hasExitedRef.current) return;
          if (Date.now() - lastPartnerLeaveTimeRef.current < 5000) return;

          const session = res.activeWatchSession;

          if (session) {
            isHostRef.current = !!session.isHost;

            if (session.status === 'accepted') {
              // Both users connected!
              lastPartnerNameRef.current = session.partnerName;
              departedPartnerNamesRef.current.delete(session.partnerName.toLowerCase().trim());
              setJoinedUsers(prev => {
                const friend = friendsList?.find((f: any) => f.name.toLowerCase() === session.partnerName.toLowerCase());
                const resolvedAvatar = session.partnerImage 
                  || friend?.avatar 
                  || (friend?.seed ? `https://api.dicebear.com/7.x/adventurer/svg?seed=${friend.seed}&backgroundColor=A577FF` : null)
                  || `https://api.dicebear.com/7.x/adventurer/svg?seed=${session.partnerName}&backgroundColor=A577FF`;

                const exists = prev.find(u => u.name.toLowerCase() === session.partnerName.toLowerCase());
                let updated: WatchUser[];
                const partnerIsHost = !isHostRef.current;
                if (!exists) {
                  showToast(`${session.partnerName} joined Watch Together!`, 3000);
                  updated = [...prev, {
                    name: session.partnerName,
                    avatar: resolvedAvatar,
                    status: 'joined',
                    isHost: partnerIsHost
                  }];
                } else {
                  if (exists.status !== 'joined') {
                    showToast(`${session.partnerName} accepted! Joined Watch Together`, 3000);
                  }
                  updated = prev.map(u => u.name.toLowerCase() === session.partnerName.toLowerCase() 
                    ? { ...u, avatar: resolvedAvatar, status: 'joined', isHost: partnerIsHost } 
                    : u
                  );
                }
                return sortWatchUsers(updated, currentUserName, isHostRef.current);
              });
            } else if (session.status === 'active') {
              // Host is still in room, partner hasn't joined or has left
              const partner = session.partnerName ? session.partnerName.toLowerCase().trim() : null;
              if (partner && departedPartnerNamesRef.current.has(partner)) {
                setJoinedUsers(prev => {
                  const myLower = (currentUserName || '').toLowerCase().trim();
                  return prev.filter(u => u.name.toLowerCase().trim() === myLower || u.status === 'pending');
                });
              }
            }
          } else {
            // No active session in DB: only clean up if partner explicitly left
            if (departedPartnerNamesRef.current.size > 0) {
              setJoinedUsers(prev => {
                const myLower = (currentUserName || '').toLowerCase().trim();
                return prev.filter(u => {
                  const uName = u.name.toLowerCase().trim();
                  if (uName === myLower) return true;
                  return !departedPartnerNamesRef.current.has(uName);
                });
              });
            }
          }
        })
        .catch(err => console.error("Error syncing watch session:", err));
    };

    syncSessionRef.current = syncSession;
    syncSession();
    const interval = setInterval(syncSession, 800);
    return () => clearInterval(interval);
  }, [isOpen, currentUserName, currentUserAvatar, friendsList, showToast, showLeaveToastOnce]);

  // Combine real friends, room members & mock friends for invite list
  const availableFriends = React.useMemo(() => {
    const list: Array<{ name: string; avatar: string; email?: string }> = [];
    if (friendsList && friendsList.length > 0) {
      friendsList.forEach(f => {
        if (f.name?.toLowerCase() !== currentUser.name?.toLowerCase() && !list.some(item => item.name.toLowerCase() === f.name.toLowerCase())) {
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
    setIsInviteOpen(false);
    
    isHostRef.current = true;
    hasExitedRef.current = false;
    justInvitedTimeRef.current = Date.now();
    lastPartnerNameRef.current = friend.name;
    // 1. Add friend with status 'pending' (blinking/pulsing like Listening Together)
    setJoinedUsers(prev => [...prev, { name: friend.name, avatar: friend.avatar, status: 'pending' }]);

    const tempInviteId = `watch_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
    const invitePayload = {
      id: tempInviteId,
      receiverName: friend.name,
      receiverEmail: friend.email,
      senderName: currentUserName,
      senderAvatar: currentUserAvatar,
      target: 'Watch Together',
      targetName: 'Watch Together',
      activity: 'Watch Together',
      type: 'activity',
      timestamp: Date.now()
    };

    // Instant optimistic broadcast (<10ms)
    broadcastSync('INVITE_SENT', {
      ...invitePayload,
      invitation: invitePayload
    });

    // Send persistent invitation to Supabase PostgreSQL in background
    fetch('/api/invitations', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        id: tempInviteId,
        receiverName: friend.name,
        receiverEmail: friend.email,
        senderName: currentUserName,
        senderImage: currentUserAvatar,
        type: 'activity',
        targetName: 'Watch Together'
      })
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
    hasExitedRef.current = true;
    const partner = joinedUsers.find(u => u.name.toLowerCase() !== (currentUserName || '').toLowerCase());
    const partnerName = partner?.name || lastPartnerNameRef.current;
    const isHost = isHostRef.current;
    lastLeaveToastTimeRef.current = Date.now();
    lastPartnerLeaveTimeRef.current = Date.now();
    showToast("Left Watch Together", 3000);

    // Stop and clear video locally
    setActiveVideo(null);
    setIsPlaying(false);

    // 1. Broadcast immediately (<1ms) synchronously BEFORE fetch/unmount
    broadcastSync('SESSION_LEFT', { 
      partnerName: partnerName || undefined, 
      target: 'Watch Together', 
      targetName: 'Watch Together',
      activity: 'Watch Together',
      action: isHost ? 'end' : 'leave',
      userName: currentUserName,
      senderName: currentUserName
    });

    // 2. Remove partner locally immediately
    setJoinedUsers(prev => prev.filter(u => u.name.toLowerCase().trim() === (currentUserName || '').toLowerCase().trim()));

    // 3. Persist to DB with keepalive
    fetch('/api/invitations', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        action: isHost ? 'end' : 'leave',
        partnerName: partnerName || undefined,
        senderName: currentUserName,
        type: 'activity',
        targetName: 'Watch Together'
      }),
      keepalive: true
    }).catch(e => {});

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
      handleSelectVideo(newVid);
      return;
    }

    // Real YouTube Search: fetch results and show in grid like the YouTube website!
    setIsLoadingSearch(true);
    handleSelectVideo(null); // Return to grid so search results are presented
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
                onClick={() => handleSelectVideo(null)}
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
                  ref={iframeRef}
                  id="cozy-youtube-player"
                  src={
                    activeVideo.videoId.startsWith('__search__:')
                      ? `https://www.youtube-nocookie.com/embed?listType=search&list=${encodeURIComponent(activeVideo.videoId.replace('__search__:', ''))}&autoplay=1&enablejsapi=1&rel=0&modestbranding=1${typeof window !== 'undefined' ? `&origin=${encodeURIComponent(window.location.origin)}` : ''}`
                      : `https://www.youtube-nocookie.com/embed/${activeVideo.videoId}?autoplay=1&enablejsapi=1&rel=0&modestbranding=1${typeof window !== 'undefined' ? `&origin=${encodeURIComponent(window.location.origin)}` : ''}`
                  }
                  title={activeVideo.title}
                  allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
                  allowFullScreen
                  className="w-full h-full border-0"
                />
              </div>

              {/* Live Synchronized Playback Control Bar */}
              <div className="p-3.5 px-4 rounded-2xl bg-[#161616] border border-white/10 flex flex-col gap-2.5 shadow-lg select-none">
                {/* Time Slider */}
                <div className="flex items-center gap-3 w-full">
                  <span className="text-[11px] font-mono text-gray-400 w-10 text-right">
                    {formatTime(currentTime)}
                  </span>
                  <input
                    type="range"
                    min={0}
                    max={totalDuration > 0 ? totalDuration : 100}
                    value={currentTime}
                    onChange={(e) => handleSeek(Number(e.target.value))}
                    className="flex-1 h-1.5 bg-white/20 rounded-lg appearance-none cursor-pointer accent-[#A577FF] hover:bg-white/30 transition-all"
                  />
                  <span className="text-[11px] font-mono text-gray-400 w-10">
                    {totalDuration > 0 ? formatTime(totalDuration) : '--:--'}
                  </span>
                </div>

                {/* Control Buttons & Sync Status */}
                <div className="flex items-center justify-between gap-3">
                  <div className="flex items-center gap-2">
                    {/* Rewind 10s */}
                    <button
                      onClick={() => handleSeek(Math.max(0, currentTime - 10))}
                      className="p-2 rounded-xl bg-white/5 hover:bg-white/15 text-gray-300 hover:text-white transition-all active:scale-95 cursor-pointer"
                      title="Rewind 10s (Both)"
                    >
                      <RotateCcw size={16} />
                    </button>

                    {/* Play / Pause Toggle */}
                    <button
                      onClick={handleTogglePlay}
                      className="flex items-center gap-2 px-4 py-2 rounded-xl bg-[#A577FF] hover:bg-[#9161eb] text-white font-bold text-xs shadow-md transition-all active:scale-95 cursor-pointer"
                      title="Play / Pause for everyone in room"
                    >
                      {isPlaying ? (
                        <>
                          <Pause size={15} fill="white" />
                          <span>Pause Together</span>
                        </>
                      ) : (
                        <>
                          <Play size={15} fill="white" />
                          <span>Play Together</span>
                        </>
                      )}
                    </button>

                    {/* Forward 10s */}
                    <button
                      onClick={() => handleSeek(currentTime + 10)}
                      className="p-2 rounded-xl bg-white/5 hover:bg-white/15 text-gray-300 hover:text-white transition-all active:scale-95 cursor-pointer"
                      title="Forward 10s (Both)"
                    >
                      <RotateCw size={16} />
                    </button>
                  </div>

                  {/* Sync status badge */}
                  <div className="flex items-center gap-2">
                    {(() => {
                      const partner = joinedUsers.find(
                        u => (u.name || '').toLowerCase().trim() !== (currentUserName || '').toLowerCase().trim() && u.status === 'joined'
                      );
                      if (partner) {
                        return (
                          <div className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-500/15 border border-emerald-500/30 text-emerald-400 text-xs font-semibold">
                            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                            <span>Synced with {partner.name}</span>
                          </div>
                        );
                      }
                      return (
                        <div className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-white/5 text-gray-400 text-xs font-medium">
                          <span>Solo Mode</span>
                        </div>
                      );
                    })()}
                  </div>
                </div>
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
                    onClick={() => handleSelectVideo(null)}
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
                      onClick={() => handleSelectVideo(v)}
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
                      onClick={() => handleSelectVideo(video)}
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
