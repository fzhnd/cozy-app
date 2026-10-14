import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useSession } from 'next-auth/react';
import { 
  Search, Heart, Plus, PlayCircle, Pause, SkipBack, 
  SkipForward, Shuffle, Repeat, Repeat1, Volume2, UserPlus, 
  MoreHorizontal, MoreVertical, Play, PauseCircle, Music2, Maximize2,
  ChevronLeft, ChevronDown, ChevronUp, ListPlus, Clock, X, Check, Trash2, LogOut,
  Camera, Edit2, Upload
} from 'lucide-react';

interface MusicViewProps {
  userImage: string;
  userName?: string;
  onGoHome?: () => void;
  friendsList?: any[];
  initialListeningWith?: any;
  onConsumeInitialFriend?: () => void;
  onLeaveSession?: () => void;
}

export default function MusicView({ 
  userImage, 
  userName, 
  onGoHome, 
  friendsList = [], 
  initialListeningWith, 
  onConsumeInitialFriend,
  onLeaveSession 
}: MusicViewProps) {
  const [isPlaying, setIsPlaying] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  
  // Carousel State
  const [carouselIndex, setCarouselIndex] = useState(0);

  // Player State
  const [currentTrack, setCurrentTrack] = useState({ id: 6, title: 'Midnight City', artist: 'M83', album: 'Hurry Up, We\'re Dreaming', time: '4:04' });
  const [isShuffle, setIsShuffle] = useState(false);
  const [repeatState, setRepeatState] = useState<'none' | 'all' | 'one'>('none');

  // Middle View State
  const [middleView, setMiddleView] = useState<'main' | 'recently_played' | 'liked_songs' | 'explore_albums' | 'explore_playlists' | 'explore_artists' | 'playlist_detail' | 'trending_now'>('main');
  const [expandedRecents, setExpandedRecents] = useState<string[]>([]);
  const [activePlaylistId, setActivePlaylistId] = useState<string | null>(null);

  // Playlist Unified Edit State
  const [isPlaylistMenuOpen, setIsPlaylistMenuOpen] = useState(false);
  const [editPlaylistName, setEditPlaylistName] = useState('');
  const [editPlaylistPhoto, setEditPlaylistPhoto] = useState<string | null>(null);
  const editPlaylistPhotoInputRef = useRef<HTMLInputElement>(null);

  // Create Playlist Modal State
  const [isCreatePlaylistModalOpen, setIsCreatePlaylistModalOpen] = useState(false);
  const [newPlaylistName, setNewPlaylistName] = useState('');
  const [newPlaylistPhoto, setNewPlaylistPhoto] = useState<string | null>(null);
  const createPlaylistPhotoInputRef = useRef<HTMLInputElement>(null);

  // Right Sidebar State
  const [friendState, setFriendState] = useState<'none' | 'selecting' | 'waiting' | 'joined'>('none');
  
  // Dynamic Popup State
  const [addMusicType, setAddMusicType] = useState<'none' | 'queue' | 'playlist'>('none');
  const [searchPopupQuery, setSearchPopupQuery] = useState('');
  
  // Track specific playlist popup
  const [trackPlaylistPopupId, setTrackPlaylistPopupId] = useState<number | null>(null);

  // Player Progress State
  const [progressSec, setProgressSec] = useState(83); // 1:23
  const totalSec = 244; // 4:04
  const [isPlaylistPopupOpen, setIsPlaylistPopupOpen] = useState(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const toastTimerRef = useRef<NodeJS.Timeout | null>(null);
  const lastLeaveToastTimeRef = useRef<number>(0);
  const lastLeaveToastMsgRef = useRef<string>('');

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
    // Ignore duplicate leave or ended toasts within 5 seconds
    if (now - lastLeaveToastTimeRef.current < 5000 && lastLeaveToastMsgRef.current === msg) return;
    lastLeaveToastTimeRef.current = now;
    lastLeaveToastMsgRef.current = msg;
    showToast(msg, 3500);
  }, [showToast]);

  const { data: session } = useSession();
  const userEmail = session?.user?.email?.toLowerCase() || null;
  const currentUserName = userName || session?.user?.name || userEmail?.split('@')[0] || 'User';

  // Cross-tab real-time sync via BroadcastChannel
  const broadcastChannelRef = useRef<BroadcastChannel | null>(null);
  const broadcastSync = useCallback((type: string, payload?: any) => {
    try {
      broadcastChannelRef.current?.postMessage({ type, sender: currentUserName, ...payload });
    } catch (e) {}
  }, [currentUserName]);

  // Dynamic Data States (LocalStorage & DB Sync)
  const [likedSongs, setLikedSongs] = useState<any[]>([]);
  const [trendingTracks, setTrendingTracks] = useState<any[]>([]);
  const [playlists, setPlaylists] = useState<any[]>([]);

  // Initial Load from LocalStorage & DB Sync
  useEffect(() => {
    const likedKey = userEmail ? `cozy_liked_${userEmail}` : 'cozy_liked';
    const trendingKey = userEmail ? `cozy_trending_${userEmail}` : 'cozy_trending';
    const playlistsKey = userEmail ? `cozy_playlists_${userEmail}` : 'cozy_playlists';

    const savedLiked = localStorage.getItem(likedKey) || localStorage.getItem('cozy_liked');
    const savedTrending = localStorage.getItem(trendingKey) || localStorage.getItem('cozy_trending');
    const savedPlaylists = localStorage.getItem(playlistsKey) || localStorage.getItem('cozy_playlists');

    if (savedLiked) setLikedSongs(JSON.parse(savedLiked));
    else setLikedSongs([
      { id: 2, title: 'Calm Down', artist: 'Rema, Selena Gomez', album: 'Calm Down (Remix)', time: '3:59', liked: true },
      { id: 4, title: 'Die For You', artist: 'The Weeknd', album: 'Starboy', time: '4:20', liked: true },
      { id: 6, title: 'Midnight City', artist: 'M83', album: 'Hurry Up, We\'re Dreaming', time: '4:04', liked: true },
    ]);

    if (savedTrending) setTrendingTracks(JSON.parse(savedTrending));
    else setTrendingTracks([
      { id: 1, title: 'Flowers', artist: 'Miley Cyrus', album: 'Endless Summer Vacation', time: '3:21', liked: false },
      { id: 2, title: 'Calm Down', artist: 'Rema, Selena Gomez', album: 'Calm Down (Remix)', time: '3:59', liked: true },
      { id: 3, title: 'Anti-Hero', artist: 'Taylor Swift', album: 'Midnights', time: '3:20', liked: false },
      { id: 4, title: 'Die For You', artist: 'The Weeknd', album: 'Starboy', time: '4:20', liked: true },
    ]);

    if (savedPlaylists) setPlaylists(JSON.parse(savedPlaylists));
    else setPlaylists([
      { id: 'pl-1', name: 'Chill Vibes', color: '8CC6C5', tracks: [{ id: 1, title: 'Flowers', artist: 'Miley Cyrus', album: 'Endless Summer Vacation', time: '3:21' }] },
      { id: 'pl-2', name: 'Workout Hits', color: 'F9EBD8', tracks: [] },
      { id: 'pl-3', name: 'Focus Mode', color: 'F2C8F7', tracks: [] },
      { id: 'pl-4', name: 'Roadtrip', color: 'A577FF', tracks: [] },
    ]);

    // Fetch from Database for logged-in user
    if (userEmail) {
      fetch('/api/user/sync')
        .then(res => res.json())
        .then(res => {
          if (res.success && res.data) {
            if (res.data.playlists && Array.isArray(res.data.playlists) && res.data.playlists.length > 0) {
              setPlaylists(res.data.playlists);
              localStorage.setItem(playlistsKey, JSON.stringify(res.data.playlists));
            }
            if (res.data.likedSongs && Array.isArray(res.data.likedSongs)) {
              setLikedSongs(res.data.likedSongs);
              localStorage.setItem(likedKey, JSON.stringify(res.data.likedSongs));
            }
          }
        })
        .catch(err => console.error("Error loading music sync data:", err));
    }
  }, [userEmail]);

  // Save to LocalStorage & Sync to Database
  useEffect(() => {
    const likedKey = userEmail ? `cozy_liked_${userEmail}` : 'cozy_liked';
    const trendingKey = userEmail ? `cozy_trending_${userEmail}` : 'cozy_trending';
    const playlistsKey = userEmail ? `cozy_playlists_${userEmail}` : 'cozy_playlists';

    if (likedSongs.length > 0) localStorage.setItem(likedKey, JSON.stringify(likedSongs));
    if (trendingTracks.length > 0) localStorage.setItem(trendingKey, JSON.stringify(trendingTracks));
    if (playlists.length > 0) localStorage.setItem(playlistsKey, JSON.stringify(playlists));

    if (userEmail && (playlists.length > 0 || likedSongs.length > 0)) {
      fetch('/api/user/sync', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ data: { playlists, likedSongs } })
      }).catch(err => console.error("Error syncing music data:", err));
    }
  }, [likedSongs, trendingTracks, playlists, userEmail]);

  // Auto-slide carousel
  useEffect(() => {
    if (middleView === 'main') {
      const timer = setInterval(() => {
        setCarouselIndex(prev => (prev + 1) % 3);
      }, 3000);
      return () => clearInterval(timer);
    }
  }, [middleView]);

  const [activeFriend, setActiveFriend] = useState<any>(null);
  const friendStateRef = useRef(friendState);
  friendStateRef.current = friendState;
  const activeFriendRef = useRef(activeFriend);
  activeFriendRef.current = activeFriend;
  const isHostRef = useRef<boolean>(false);
  const syncSessionRef = useRef<(() => void) | null>(null);

  // Setup BroadcastChannel listener for instant cross-tab sync
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

  // Auto-connect if initialListeningWith is provided from notification
  useEffect(() => {
    if (initialListeningWith) {
      isHostRef.current = false;
      setActiveFriend(initialListeningWith);
      setFriendState('joined');
      showToast(`Connected: Listening together with ${initialListeningWith.name}`, 3500);

      // Immediately update session status to accepted in backend
      fetch('/api/invitations', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          action: 'join', 
          partnerName: initialListeningWith.name, 
          senderName: currentUserName,
          type: 'activity',
          targetName: 'Listening Together',
          status: 'accepted'
        })
      })
      .then(() => {
        broadcastSync('SESSION_JOINED', { partnerName: initialListeningWith.name, target: 'Listening Together' });
      })
      if (onConsumeInitialFriend) {
        onConsumeInitialFriend();
      }
    }
  }, [initialListeningWith, currentUserName, showToast, broadcastSync, onConsumeInitialFriend]);
  
  const handleAddFriendClick = (friend: any) => {
    isHostRef.current = true;
    setActiveFriend(friend);
    setFriendState('waiting');

    // Send persistent invitation to Supabase PostgreSQL
    fetch('/api/invitations', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        receiverName: friend.name,
        receiverEmail: friend.email,
        senderName: currentUserName,
        type: 'activity',
        targetName: 'Listening Together'
      })
    })
    .then(() => {
      broadcastSync('INVITE_SENT', { receiverName: friend.name, target: 'Listening Together' });
    })
    .catch(err => console.error("Error sending listening invite:", err));
  };

  // Active listening session sync (handles join, partner leave, host session end in real-time)
  useEffect(() => {
    if (!userEmail) return;

    // For built-in mock bots that aren't real users
    if (friendStateRef.current === 'waiting' && activeFriendRef.current && !activeFriendRef.current.isRealFriend && ['Luna', 'Jasper', 'Mimi', 'Felix', 'Oscar', 'Aneka'].includes(activeFriendRef.current.name)) {
      const t = setTimeout(() => {
        setFriendState('joined');
        showToast(`Started listening with ${activeFriendRef.current?.name}`, 3000);
      }, 4000);
      return () => clearTimeout(t);
    }

    const syncSession = () => {
      fetch(`/api/invitations?username=${encodeURIComponent(currentUserName)}`)
        .then(res => res.json())
        .then(res => {
          if (!res.success) return;

          const session = res.activeListeningSession;

          // Case 1: Active listening session exists in Supabase
          if (session) {
            isHostRef.current = !!session.isHost;

            if (session.status === 'accepted') {
              // Both users are joined!
              if (friendStateRef.current !== 'joined') {
                const partnerObj = friendsList.find(f => f.name.toLowerCase() === session.partnerName.toLowerCase()) || {
                  name: session.partnerName,
                  avatar: session.partnerImage || `https://api.dicebear.com/7.x/adventurer/svg?seed=${session.partnerName}&backgroundColor=A577FF`
                };
                setActiveFriend(partnerObj);
                setFriendState('joined');
                showToast(`${session.partnerName} joined! Listening together`, 3000);
              }
            } else if (session.status === 'active') {
              // Session is active (host is in room, but partner has left or not joined yet)
              if (session.isHost) {
                const partnerObj = friendsList.find(f => f.name.toLowerCase() === session.partnerName.toLowerCase()) || {
                  name: session.partnerName,
                  avatar: session.partnerImage || `https://api.dicebear.com/7.x/adventurer/svg?seed=${session.partnerName}&backgroundColor=A577FF`
                };
                if (friendStateRef.current === 'joined') {
                  // Partner left! Transition back to waiting (pulsing ring), keep leave button visible!
                  const prevName = activeFriendRef.current?.name || session.partnerName;
                  setActiveFriend(partnerObj);
                  setFriendState('waiting');
                  showLeaveToastOnce(`${prevName} left the listening session`);
                } else if (friendStateRef.current === 'none') {
                  setActiveFriend(partnerObj);
                  setFriendState('waiting');
                }
              }
            }
          } else {
            // Case 2: No active session (host ended the session)
            if (friendStateRef.current === 'joined' || friendStateRef.current === 'waiting') {
              const prevName = activeFriendRef.current?.name;
              setFriendState('none');
              setActiveFriend(null);
              if (onLeaveSession) onLeaveSession();
              if (prevName) {
                showLeaveToastOnce(`${prevName} ended the listening session`);
              }
            }
          }
        })
        .catch(err => console.error("Error syncing listening session:", err));
    };

    syncSessionRef.current = syncSession;
    syncSession();
    const interval = setInterval(syncSession, 800);
    return () => clearInterval(interval);
  }, [userEmail, currentUserName, friendsList, onLeaveSession, showToast, showLeaveToastOnce]);

  // Player progress
  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (isPlaying) {
      interval = setInterval(() => {
        setProgressSec(prev => {
          if (prev >= totalSec) {
            if (repeatState === 'one') {
              return 0;
            } else if (repeatState === 'all') {
              return 0;
            } else {
              setIsPlaying(false);
              return totalSec;
            }
          }
          return prev + 1;
        });
      }, 1000);
    }
    return () => clearInterval(interval);
  }, [isPlaying, totalSec, repeatState]);

  const formatTime = (sec: number) => {
    const m = Math.floor(sec / 60);
    const s = Math.floor(sec % 60);
    return `${m}:${s.toString().padStart(2, '0')}`;
  };

  const toggleRepeat = () => {
    setRepeatState(prev => {
      if (prev === 'none') return 'all';
      if (prev === 'all') return 'one';
      return 'none';
    });
  };

  const handleNextTrack = () => {
    if (trendingTracks.length === 0) return;
    if (isShuffle) {
      const randomIdx = Math.floor(Math.random() * trendingTracks.length);
      setCurrentTrack(trendingTracks[randomIdx]);
    } else {
      const currentIndex = trendingTracks.findIndex(t => t.id === currentTrack.id);
      const nextIndex = (currentIndex + 1) % trendingTracks.length;
      setCurrentTrack(trendingTracks[nextIndex]);
    }
    setProgressSec(0);
  };

  const handlePrevTrack = () => {
    if (progressSec > 3) {
      setProgressSec(0);
      return;
    }
    if (trendingTracks.length === 0) return;
    const currentIndex = trendingTracks.findIndex(t => t.id === currentTrack.id);
    const prevIndex = (currentIndex - 1 + trendingTracks.length) % trendingTracks.length;
    setCurrentTrack(trendingTracks[prevIndex]);
    setProgressSec(0);
  };

  const playTrack = (title: string, artist: string = 'Unknown Artist') => {
    setCurrentTrack({ id: Date.now(), title, artist, album: 'Unknown', time: '3:00' });
    setProgressSec(0);
    setIsPlaying(true);
  };

  const handleToggleLike = (e: React.MouseEvent, track: any) => {
    e.stopPropagation();
    const isLiked = likedSongs.some(s => s.id === track.id);
    if (isLiked) {
      setLikedSongs(prev => prev.filter(s => s.id !== track.id));
      setTrendingTracks(prev => prev.map(t => t.id === track.id ? { ...t, liked: false } : t));
    } else {
      const newTrack = { ...track, liked: true };
      setLikedSongs(prev => [...prev, newTrack]);
      setTrendingTracks(prev => prev.map(t => t.id === track.id ? { ...t, liked: true } : t));
      setToastMessage('Added to Liked Songs.');
      setTimeout(() => setToastMessage(null), 3000);
    }
  };

  const handleOpenCreatePlaylist = () => {
    setNewPlaylistName('');
    setNewPlaylistPhoto(null);
    setIsCreatePlaylistModalOpen(true);
  };

  const handleCreatePlaylist = handleOpenCreatePlaylist;

  const handleCreatePlaylistSubmit = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    const colors = ['8CC6C5', 'F9EBD8', 'F2C8F7', 'A577FF', 'FF7777', '77FF88'];
    const randomColor = colors[Math.floor(Math.random() * colors.length)];
    const finalName = newPlaylistName.trim() || `Playlist #${playlists.length + 1}`;
    const newPl = {
      id: `pl-${Date.now()}`,
      name: finalName,
      color: randomColor,
      photo: newPlaylistPhoto || undefined,
      tracks: []
    };
    // Urutan paling atas
    setPlaylists([newPl, ...playlists]);
    setActivePlaylistId(newPl.id);
    setMiddleView('playlist_detail');
    setIsCreatePlaylistModalOpen(false);
    setNewPlaylistName('');
    setNewPlaylistPhoto(null);
    setToastMessage(`Playlist "${finalName}" created successfully.`);
    setTimeout(() => setToastMessage(null), 3000);
  };

  const handleEditPhotoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (event) => {
        setEditPlaylistPhoto(event.target?.result as string);
      };
      reader.readAsDataURL(file);
    }
    e.target.value = '';
  };

  const handleSavePlaylistEdits = () => {
    if (activePlaylistId) {
      const current = playlists.find(p => p.id === activePlaylistId);
      const finalName = editPlaylistName.trim() || current?.name || 'Playlist';
      setPlaylists(prev => prev.map(pl => {
        if (pl.id === activePlaylistId) {
          return {
            ...pl,
            name: finalName,
            photo: editPlaylistPhoto || undefined
          };
        }
        return pl;
      }));
      setToastMessage(`Playlist "${finalName}" updated successfully.`);
      setTimeout(() => setToastMessage(null), 3000);
    }
    setIsPlaylistMenuOpen(false);
  };

  const handleCreatePhotoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (event) => {
        setNewPlaylistPhoto(event.target?.result as string);
      };
      reader.readAsDataURL(file);
    }
    e.target.value = '';
  };

  const handleDeletePlaylist = () => {
    setPlaylists(prev => prev.filter(pl => pl.id !== activePlaylistId));
    setMiddleView('main');
    setActivePlaylistId(null);
    setToastMessage('Playlist deleted.');
    setTimeout(() => setToastMessage(null), 3000);
  };

  const handleRemoveTrackFromPlaylist = (e: React.MouseEvent, trackId: number) => {
    e.stopPropagation();
    setPlaylists(prev => prev.map(pl => {
      if (pl.id === activePlaylistId) {
        return { ...pl, tracks: pl.tracks.filter((t: any) => t.id !== trackId) };
      }
      return pl;
    }));
    setToastMessage('Song removed from playlist.');
    setTimeout(() => setToastMessage(null), 3000);
  };

  const handleSearchPick = (track: any) => {
    if (addMusicType === 'playlist' && activePlaylistId) {
      setPlaylists(prev => prev.map(pl => {
        if (pl.id === activePlaylistId && !pl.tracks.some((t: any) => t.id === track.id)) {
          return { ...pl, tracks: [...pl.tracks, track] };
        }
        return pl;
      }));
      setToastMessage('Added to playlist.');
    } else if (addMusicType === 'queue') {
      setToastMessage('Added to queue.');
    }
    setTimeout(() => setToastMessage(null), 3000);
    setAddMusicType('none');
    setSearchPopupQuery('');
  };

  const MOCK_SEARCH = [
    { id: 101, title: 'Cruel Summer', artist: 'Taylor Swift', album: 'Lover', time: '2:58' },
    { id: 102, title: 'Starboy', artist: 'The Weeknd', album: 'Starboy', time: '3:50' },
    { id: 103, title: 'Blank Space', artist: 'Taylor Swift', album: '1989', time: '3:51' },
  ];

  const MOCK_FRIENDS = [
    { name: 'Luna', seed: 'Luna', color: 'F9EBD8' },
    { name: 'Leo', seed: 'Leo', color: 'A577FF' },
    { name: 'Mimi', seed: 'Mimi', color: 'F9EBD8' },
    { name: 'Aneka', seed: 'Aneka', color: '8CC6C5' },
    { name: 'Lily', seed: 'Lily', color: 'F2C8F7' },
    { name: 'Jasper', seed: 'Jasper', color: 'F9EBD8' },
    { name: 'Oscar', seed: 'Oscar', color: 'A577FF' },
  ];

  const CAROUSEL_ITEMS = [
    { type: 'Playlist of the day', title: 'Chill Vibes ✨', desc: 'Relax and unwind with these handpicked chill tracks.', color: 'from-[#2B1B54] to-[#7065D4]', btn: 'Explore Playlists' },
    { type: 'Artist Spotlight', title: 'The Weeknd', desc: 'Listen to the top tracks from The Weeknd.', color: 'from-[#541B1B] to-[#D46565]', btn: 'Explore Artists' },
    { type: 'Featured Album', title: 'Midnights', desc: 'Taylor Swift - The complete album experience.', color: 'from-[#1B4B54] to-[#65A7D4]', btn: 'Explore Albums' },
  ];

  const RECENTLY_PLAYED = [
    { name: 'Night Drive', desc: 'The Midnight', seed: 'car' },
    { name: 'Blinding Lights', desc: 'The Weeknd', seed: 'lights' },
    { name: 'Sunflower', desc: 'Post Malone', seed: 'sun' },
    { name: 'Peaches', desc: 'Justin Bieber', seed: 'peach' },
    { name: 'Moth To A Flame', desc: 'Swedish House Mafia', seed: 'moth' },
  ];

  const PLAY_QUEUE = [
    { title: 'Save Your Tears', artist: 'The Weeknd', time: '3:35' },
    { title: 'Heat Waves', artist: 'Glass Animals', time: '3:58' },
    { title: 'Enemy', artist: 'Imagine Dragons', time: '2:53' },
    { title: 'Bad Habit', artist: 'Steve Lacy', time: '3:52' },
  ];

  const toggleExpanded = (id: string) => {
    setExpandedRecents(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]);
  };

  const handleAddToPlaylist = (playlistId: string, playlistName: string) => {
    setIsPlaylistPopupOpen(false);
    
    // Add currentTrack to selected playlist if not already there
    setPlaylists(prev => prev.map(pl => {
      if (pl.id === playlistId) {
        if (!pl.tracks.some((t: any) => t.id === currentTrack.id)) {
          return { ...pl, tracks: [...pl.tracks, currentTrack] };
        }
      }
      return pl;
    }));

    setToastMessage(`Added to ${playlistName}.`);
    setTimeout(() => setToastMessage(null), 3000);
  };



  const activePlaylist = playlists.find(p => p.id === activePlaylistId);

  return (
    <div className="flex flex-col h-full bg-[#150A35] text-[#F5F7FC] relative overflow-hidden animate-in fade-in duration-300">
      
      {/* Toast Notification */}
      {toastMessage && (
        <div className="absolute bottom-[110px] left-1/2 -translate-x-1/2 bg-white rounded-xl shadow-[0_10px_40px_rgba(0,0,0,0.5)] p-3 flex items-center gap-3 animate-in fade-in slide-in-from-bottom-4 z-50 text-[#150A35]">
          <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-[#A577FF] to-[#7065D4] flex items-center justify-center">
            <Music2 size={16} className="text-white" />
          </div>
          <span className="text-sm font-bold pr-2">{toastMessage}</span>
        </div>
      )}

      {/* Add Music Popup */}
      {addMusicType !== 'none' && (
        <>
          <div className="fixed inset-0 z-40 bg-black/50 backdrop-blur-sm" onClick={() => setAddMusicType('none')} />
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[400px] bg-[#150A35] border border-white/10 rounded-2xl shadow-2xl p-6 z-50 animate-in fade-in slide-in-from-bottom-4">
            <div className="flex justify-between items-center mb-6">
              <h3 className="font-bold text-lg">
                {addMusicType === 'playlist' ? 'Add Music to Playlist' : 'Add Music to Queue'}
              </h3>
              <button onClick={() => setAddMusicType('none')} className="text-gray-400 hover:text-white"><X size={20}/></button>
            </div>
            <div className="relative mb-6">
              <Search className="absolute left-4 top-3 text-gray-400" size={16} />
              <input 
                type="text" 
                placeholder="Search songs, artists, albums..." 
                value={searchPopupQuery}
                onChange={(e) => setSearchPopupQuery(e.target.value)}
                className="w-full bg-white/5 border border-white/10 rounded-xl py-2.5 pl-11 pr-4 text-sm focus:outline-none focus:border-[#A577FF]" 
              />
            </div>
            <div className="flex flex-col gap-2 max-h-48 overflow-y-auto custom-scrollbar pr-2">
              {searchPopupQuery.length > 0 ? (
                MOCK_SEARCH.map(track => (
                  <div key={track.id} onClick={() => handleSearchPick(track)} className="flex items-center gap-3 p-2 rounded-xl hover:bg-white/10 transition-colors cursor-pointer group">
                    <img src={`https://api.dicebear.com/7.x/identicon/svg?seed=${track.title}&backgroundColor=0D0524`} className="w-10 h-10 rounded-md" alt="art" />
                    <div className="flex-1 min-w-0">
                      <h4 className="font-bold text-sm text-gray-200 group-hover:text-white truncate">{track.title}</h4>
                      <p className="text-xs text-gray-400 truncate">{track.artist}</p>
                    </div>
                    <Plus size={16} className="text-gray-400 group-hover:text-white" />
                  </div>
                ))
              ) : (
                <div className="text-xs text-gray-500 text-center py-4">Search for a track to add...</div>
              )}
            </div>
          </div>
        </>
      )}

      <div className="flex flex-1 overflow-hidden min-h-0">
        
        {/* === LEFT COLUMN === */}
        <div className="w-64 flex flex-col p-6 border-r border-white/5 shrink-0 bg-white/[0.01]">
          <div className="relative mb-8">
            <Search className="absolute left-3 top-2.5 text-gray-400" size={16} />
            <input 
              type="text" 
              placeholder="Search songs, artists..." 
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-white/5 border border-white/10 rounded-xl py-2 pl-10 pr-4 text-sm focus:outline-none focus:ring-1 focus:ring-[#A577FF] placeholder-gray-500 transition-all"
            />
          </div>

          <div className="flex flex-col gap-2 mb-8">
            <div 
              onClick={() => setMiddleView('liked_songs')}
              className={`flex items-center gap-3 px-3 py-2 rounded-xl cursor-pointer transition-colors group ${middleView === 'liked_songs' ? 'bg-white/10 text-white' : 'hover:bg-white/5 text-gray-300 hover:text-white'}`}
            >
              <Heart size={18} className={`${middleView === 'liked_songs' ? 'text-pink-500 fill-pink-500' : 'text-gray-400 group-hover:text-pink-500'} transition-colors`} />
              <span className="text-sm font-bold">Liked Songs</span>
            </div>
          </div>

          <div className="flex flex-col flex-1 min-h-0">
            <div className="flex items-center justify-between px-2 mb-4">
              <h3 className="text-[10px] font-bold text-gray-500 uppercase tracking-wider">Playlists</h3>
              <button onClick={handleOpenCreatePlaylist} className="text-gray-400 hover:text-white transition-colors" title="Create New Playlist"><Plus size={16} /></button>
            </div>
            <div className="flex-1 overflow-y-auto custom-scrollbar flex flex-col gap-2">
              {playlists.map((pl) => (
                <div 
                  key={pl.id} 
                  onClick={() => { setActivePlaylistId(pl.id); setMiddleView('playlist_detail'); }}
                  className={`flex items-center gap-3 p-2 rounded-xl cursor-pointer transition-colors group ${activePlaylistId === pl.id && middleView === 'playlist_detail' ? 'bg-white/10' : 'hover:bg-white/5'}`}
                >
                  <div className={`w-10 h-10 rounded-lg ${pl.photo ? 'bg-transparent' : `bg-[#${pl.color}]/20`} flex items-center justify-center shrink-0 border border-white/5 group-hover:border-white/20 transition-all overflow-hidden`}>
                    {pl.photo ? (
                      <img src={pl.photo} alt={pl.name} className="w-full h-full object-cover" />
                    ) : (
                      <Music2 size={16} className={`text-[#${pl.color}]`} />
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <h4 className={`text-sm font-bold truncate transition-colors ${activePlaylistId === pl.id && middleView === 'playlist_detail' ? 'text-white' : 'text-gray-300 group-hover:text-white'}`}>{pl.name}</h4>
                    <p className="text-[10px] text-gray-500">{pl.tracks.length} songs</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* === MIDDLE COLUMN === */}
        <div key={middleView} className="flex-1 flex flex-col min-w-0 overflow-y-auto custom-scrollbar p-8">
          
          {middleView === 'main' ? (
            <>
              {/* Top Carousel */}
              <div className="w-full shrink-0 min-h-[220px] rounded-[32px] overflow-hidden relative shadow-lg mb-8 group border border-white/5">
                <div 
                  className="flex h-full transition-transform duration-700 ease-in-out cursor-pointer"
                  style={{ transform: `translateX(-${carouselIndex * 100}%)` }}
                  onClick={() => {
                    if (carouselIndex === 0) setMiddleView('explore_playlists');
                    else if (carouselIndex === 1) setMiddleView('explore_artists');
                    else if (carouselIndex === 2) setMiddleView('explore_albums');
                  }}
                >
                  {CAROUSEL_ITEMS.map((item, i) => (
                    <div key={i} className={`min-w-full h-full bg-gradient-to-r ${item.color} p-8 relative flex flex-col justify-center`}>
                      <div className="absolute right-0 top-0 w-1/2 h-full bg-[url('https://api.dicebear.com/7.x/shapes/svg?seed=chill&backgroundColor=transparent')] bg-no-repeat bg-right-bottom opacity-20 mix-blend-overlay group-hover:scale-105 transition-transform duration-700"></div>
                      <div className="absolute right-10 top-1/2 -translate-y-1/2 w-48 h-48 bg-white/10 rounded-full blur-3xl"></div>
                      
                      <div className="relative z-10 max-w-md">
                        <span className="text-[10px] font-bold uppercase tracking-wider text-white/70 mb-2 block">{item.type}</span>
                        <h1 className="text-4xl font-black text-white mb-2 tracking-tight">{item.title}</h1>
                        <p className="text-white/80 text-sm mb-6 leading-relaxed">{item.desc}</p>
                        <button 
                          onClick={(e) => { 
                            e.stopPropagation(); 
                            if (i === 0) setMiddleView('explore_playlists');
                            else if (i === 1) setMiddleView('explore_artists');
                            else if (i === 2) setMiddleView('explore_albums');
                          }} 
                          className="bg-[#A577FF] hover:bg-[#9161eb] text-white font-bold text-sm px-6 py-2.5 rounded-full transition-colors flex items-center shadow-[0_4px_14px_rgba(165,119,255,0.4)]"
                        >
                          {item.btn}
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
                
                {/* Carousel Indicators */}
                <div className="absolute bottom-4 left-1/2 -translate-x-1/2 flex items-center gap-2 z-20">
                  {CAROUSEL_ITEMS.map((_, i) => (
                    <div 
                      key={i} 
                      onClick={(e) => { e.stopPropagation(); setCarouselIndex(i); }}
                      className={`h-1.5 rounded-full transition-all duration-300 cursor-pointer ${i === carouselIndex ? 'w-6 bg-white' : 'w-1.5 bg-white/40 hover:bg-white/60'}`} 
                    />
                  ))}
                </div>
              </div>

              {/* Recently Played */}
              <div className="mb-8">
                <div className="flex items-center justify-between mb-4">
                  <h2 className="text-lg font-bold">Recently Played</h2>
                  <span onClick={() => setMiddleView('recently_played')} className="text-xs text-[#A577FF] font-bold hover:underline cursor-pointer">View All</span>
                </div>
                <div className="flex gap-4 overflow-x-auto custom-scrollbar pb-4 -mx-2 px-2">
                  {RECENTLY_PLAYED.map((rp, i) => (
                    <div key={i} onClick={() => playTrack(rp.name, rp.desc)} className="min-w-[140px] flex flex-col group cursor-pointer">
                      <div className="w-full aspect-square rounded-2xl bg-white/5 mb-3 overflow-hidden relative shadow-md">
                        <img src={`https://api.dicebear.com/7.x/identicon/svg?seed=${rp.seed}&backgroundColor=150A35`} className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500 opacity-80" alt={rp.name} />
                        <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                          <div className="w-12 h-12 bg-[#A577FF] rounded-full flex items-center justify-center shadow-lg transform translate-y-4 group-hover:translate-y-0 transition-all duration-300">
                            <Play size={20} fill="currentColor" className="text-white ml-1" />
                          </div>
                        </div>
                      </div>
                      <h4 className="font-bold text-sm text-gray-200 group-hover:text-white truncate">{rp.name}</h4>
                      <p className="text-[11px] text-gray-500 truncate mt-0.5">{rp.desc}</p>
                    </div>
                  ))}
                </div>
              </div>

              {/* Trending Now */}
              <div>
                <div className="flex items-center justify-between mb-4">
                  <h2 className="text-lg font-bold">Trending Now</h2>
                  <span onClick={() => setMiddleView('trending_now')} className="text-xs text-[#A577FF] font-bold hover:underline cursor-pointer">View All</span>
                </div>
                <div className="w-full flex flex-col">
                  <div className="flex px-4 py-2 text-[10px] font-bold text-gray-500 uppercase tracking-wider border-b border-white/5 mb-2">
                    <div className="w-8 text-center">#</div>
                    <div className="flex-1">Title</div>
                    <div className="w-1/4 hidden md:block">Artist</div>
                    <div className="w-1/4 hidden lg:block">Album</div>
                    <div className="w-20 text-right pr-12">Time</div>
                  </div>
                  
                  {trendingTracks.map((track, i) => (
                    <div key={track.id} className="flex items-center px-4 py-3 rounded-xl hover:bg-white/5 transition-colors cursor-pointer group">
                      <div className="w-8 text-center text-xs text-gray-500 font-medium group-hover:text-white">
                        <span className="group-hover:hidden">{i + 1}</span>
                        <Play size={12} fill="currentColor" className="hidden group-hover:inline-block text-[#A577FF]" />
                      </div>
                      <div className="flex-1 flex items-center gap-3 pr-4 min-w-0">
                        <img src={`https://api.dicebear.com/7.x/identicon/svg?seed=${track.title}&backgroundColor=0D0524`} className="w-10 h-10 rounded-md" alt="art" />
                        <h4 className="font-bold text-sm text-gray-200 group-hover:text-white truncate">{track.title}</h4>
                      </div>
                      <div className="w-1/4 hidden md:block text-xs text-gray-400 truncate pr-4">{track.artist}</div>
                      <div className="w-1/4 hidden lg:block text-xs text-gray-400 truncate pr-4">{track.album}</div>
                      <div className="w-20 flex items-center justify-end gap-4">
                        <Heart 
                          size={14} 
                          onClick={(e) => handleToggleLike(e, track)}
                          className={`${track.liked ? 'text-pink-500 fill-pink-500' : 'text-gray-500 hover:text-pink-500'} transition-transform hover:scale-110`} 
                        />
                        <span className="text-xs text-gray-400">{track.time}</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </>
          ) : middleView === 'recently_played' ? (
            // RECENTLY PLAYED FULL VIEW
            <div className="flex flex-col h-full animate-in fade-in slide-in-from-right-4">
              <div className="flex items-center gap-4 mb-8 sticky top-0 bg-[#150A35]/90 backdrop-blur z-10 py-2">
                <button onClick={() => setMiddleView('main')} className="w-8 h-8 rounded-full bg-white/5 flex items-center justify-center hover:bg-white/10 transition-colors">
                  <ChevronLeft size={20} />
                </button>
                <h2 className="text-3xl font-bold">Recently Played</h2>
              </div>
              <div className="flex flex-col pb-10 max-w-3xl">
                {[
                  { section: 'Today', items: [
                    { id: 't1', title: 'Liked Songs', desc: '2 songs added', type: 'liked', tracks: [{t: 'Flowers', a: 'Miley Cyrus'}, {t: 'Calm Down', a: 'Rema'}] },
                    { id: 't4', title: '(2)', desc: '1 song added', type: 'purple', tracks: [{t: 'Anti-Hero', a: 'Taylor Swift'}] },
                    { id: 't5', title: 'bye Radio', desc: '9 songs played • Playlist • Spotify', type: 'playlist', tracks: [{t: 'Save Your Tears', a: 'The Weeknd'}, {t: 'Enemy', a: 'Imagine Dragons'}] },
                    { id: 't6', title: 'Chill Mix', desc: '24 songs played • Playlist • Spotify', type: 'playlist', tracks: [{t: 'Bad Habit', a: 'Steve Lacy'}, {t: 'Heat Waves', a: 'Glass Animals'}] },
                    { id: 't7', title: '3 songs played', desc: '', type: 'multi', tracks: [{t: 'Late Night Confessions', a: 'Reed Wonder, Aurora Olivas'}, {t: 'Biutyful', a: 'Coldplay'}, {t: 'Yellow', a: 'Coldplay'}] },
                  ]},
                  { section: 'Yesterday', items: [
                    { id: 'y1', title: 'The Weeknd', desc: 'Artist • 3 songs played', type: 'artist', tracks: [{t: 'Die For You', a: 'The Weeknd'}, {t: 'Starboy', a: 'The Weeknd'}, {t: 'Blinding Lights', a: 'The Weeknd'}] }
                  ]}
                ].map((group, gIdx) => (
                  <div key={gIdx} className="mb-8">
                    <h3 className="text-2xl font-bold text-white mb-4 px-2">{group.section}</h3>
                    <div className="flex flex-col gap-1">
                      {group.items.map((item, i) => {
                        const isExpanded = expandedRecents.includes(item.id);
                        return (
                          <div key={i} className="flex flex-col">
                            <div 
                              onClick={() => playTrack(item.title, item.type === 'artist' ? item.title : 'Various Artists')}
                              className="flex items-center justify-between p-3 rounded-xl hover:bg-white/5 transition-colors cursor-pointer group/item"
                            >
                              <div className="flex items-center gap-4">
                                <div className={`w-14 h-14 shrink-0 flex items-center justify-center overflow-hidden shadow-md ${item.type === 'artist' ? 'rounded-full' : 'rounded-lg'} ${item.type === 'liked' ? 'bg-gradient-to-br from-indigo-600 to-blue-400' : item.type === 'purple' ? 'bg-[#A577FF]' : 'bg-white/10'}`}>
                                  {item.type === 'liked' ? (
                                    <Heart size={24} fill="white" className="text-white" />
                                  ) : item.type === 'purple' ? (
                                    <Music2 size={24} className="text-white" />
                                  ) : item.type === 'multi' ? (
                                    <div className="grid grid-cols-2 gap-0.5 w-full h-full">
                                      <div className="bg-white/20"></div><div className="bg-white/30"></div>
                                      <div className="bg-white/10"></div><div className="bg-white/40"></div>
                                    </div>
                                  ) : (
                                    <img src={`https://api.dicebear.com/7.x/identicon/svg?seed=${item.title}&backgroundColor=150A35`} className="w-full h-full object-cover" alt="art" />
                                  )}
                                </div>
                                <div className="flex flex-col justify-center">
                                  <h4 className="text-base font-bold text-white group-hover/item:text-[#A577FF] transition-colors">{item.title}</h4>
                                  {item.desc && (
                                    <div className="flex items-center gap-1.5 mt-1">
                                      {(item.type === 'liked' || item.type === 'purple') && (
                                        <div className="w-3.5 h-3.5 rounded-full bg-green-500 flex items-center justify-center">
                                          <Check size={10} className="text-[#150A35]" />
                                        </div>
                                      )}
                                      <p className="text-xs text-gray-400">{item.desc}</p>
                                    </div>
                                  )}
                                </div>
                              </div>
                              <button 
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setExpandedRecents(prev => prev.includes(item.id) ? prev.filter(id => id !== item.id) : [...prev, item.id]);
                                }}
                                className="w-8 h-8 flex items-center justify-center rounded-full text-gray-500 hover:text-white hover:bg-white/10 transition-colors"
                              >
                                {item.tracks.length === 0 ? <MoreHorizontal size={20} /> : isExpanded ? <ChevronUp size={20} /> : <ChevronDown size={20} />}
                              </button>
                            </div>
                            
                            {/* Dropdown Tracks */}
                            {isExpanded && item.tracks.length > 0 && (
                              <div className="flex flex-col gap-1 pl-20 pr-4 py-2 animate-in fade-in slide-in-from-top-2">
                                {item.tracks.map((trk, tIdx) => (
                                  <div 
                                    key={tIdx} 
                                    onClick={() => playTrack(trk.t, trk.a)}
                                    className="flex items-center gap-3 p-2 rounded-lg hover:bg-white/5 cursor-pointer group/trk"
                                  >
                                    <img src={`https://api.dicebear.com/7.x/identicon/svg?seed=${trk.t}&backgroundColor=0D0524`} className="w-8 h-8 rounded" alt="art" />
                                    <div>
                                      <h5 className="text-sm font-bold text-gray-300 group-hover/trk:text-white">{trk.t}</h5>
                                      <p className="text-[10px] text-gray-500">{trk.a}</p>
                                    </div>
                                    <div className="ml-auto opacity-0 group-hover/trk:opacity-100 transition-opacity text-[#A577FF]">
                                      <Play size={16} fill="currentColor" />
                                    </div>
                                  </div>
                                ))}
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ) : middleView === 'trending_now' ? (
            // TRENDING NOW TOP 100 VIEW
            <div className="flex flex-col h-full animate-in fade-in slide-in-from-right-4">
              <div className="flex items-center gap-4 mb-8 sticky top-0 bg-[#150A35]/90 backdrop-blur z-10 py-2">
                <button onClick={() => setMiddleView('main')} className="w-8 h-8 rounded-full bg-white/5 flex items-center justify-center hover:bg-white/10 transition-colors">
                  <ChevronLeft size={20} />
                </button>
                <h2 className="text-3xl font-bold">Trending Top 100</h2>
              </div>
              <div className="w-full flex flex-col pb-10">
                <div className="flex px-4 py-2 text-[10px] font-bold text-gray-500 uppercase tracking-wider border-b border-white/5 mb-4 sticky top-16 bg-[#150A35]/90 backdrop-blur z-10">
                  <div className="w-8 text-center">#</div>
                  <div className="flex-1">Title</div>
                  <div className="w-1/4 hidden md:block">Artist</div>
                  <div className="w-1/4 hidden lg:block">Album</div>
                  <div className="w-20 text-right pr-4">Time</div>
                </div>
                {Array.from({ length: 100 }).map((_, i) => {
                  const track = trendingTracks[i % trendingTracks.length];
                  return (
                    <div key={i} onClick={() => playTrack(track.title, track.artist)} className="flex items-center px-4 py-3 rounded-xl hover:bg-white/5 transition-colors cursor-pointer group">
                      <div className="w-8 text-center text-xs text-gray-500 font-medium group-hover:text-white">
                        <span className="group-hover:hidden">{i + 1}</span>
                        <Play size={12} fill="currentColor" className="hidden group-hover:inline-block text-[#A577FF]" />
                      </div>
                      <div className="flex-1 flex items-center gap-3 pr-4 min-w-0">
                        <img src={`https://api.dicebear.com/7.x/identicon/svg?seed=${track.title}&backgroundColor=0D0524`} className="w-10 h-10 rounded-md" alt="art" />
                        <h4 className="font-bold text-sm text-gray-200 group-hover:text-white truncate">{track.title}</h4>
                      </div>
                      <div className="w-1/4 hidden md:block text-xs text-gray-400 truncate pr-4">{track.artist}</div>
                      <div className="w-1/4 hidden lg:block text-xs text-gray-400 truncate pr-4">{track.album}</div>
                      <div className="w-20 flex items-center justify-end gap-4">
                        <Heart 
                          size={14} 
                          onClick={(e) => handleToggleLike(e, track)}
                          className={`${track.liked ? 'text-pink-500 fill-pink-500' : 'text-gray-500 hover:text-pink-500'} transition-transform hover:scale-110`} 
                        />
                        <span className="text-xs text-gray-400">{track.time}</span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          ) : middleView === 'liked_songs' ? (
            // LIKED SONGS FULL VIEW
            <div className="flex flex-col h-full animate-in fade-in slide-in-from-right-4">
              <div className="flex items-center gap-4 mb-8 sticky top-0 bg-[#150A35]/90 backdrop-blur z-10 py-2">
                <button onClick={() => setMiddleView('main')} className="w-8 h-8 rounded-full bg-white/5 flex items-center justify-center hover:bg-white/10 transition-colors">
                  <ChevronLeft size={20} />
                </button>
                <h2 className="text-3xl font-bold">Liked Songs</h2>
              </div>
              <div className="w-full flex flex-col">
                <div className="flex px-4 py-2 text-[10px] font-bold text-gray-500 uppercase tracking-wider border-b border-white/5 mb-4">
                  <div className="w-8 text-center">#</div>
                  <div className="flex-1">Title</div>
                  <div className="w-1/4 hidden md:block">Artist</div>
                  <div className="w-1/4 hidden lg:block">Album</div>
                  <div className="w-20 text-right pr-4">Time</div>
                </div>
                {likedSongs.length === 0 && (
                  <div className="text-center text-gray-500 py-10">No liked songs yet.</div>
                )}
                {likedSongs.map((track, i) => (
                  <div key={track.id} onClick={() => playTrack(track.title, track.artist)} className="flex items-center px-4 py-3 rounded-xl hover:bg-white/5 transition-colors cursor-pointer group">
                    <div className="w-8 text-center text-xs text-gray-500 font-medium group-hover:text-white">
                      <span className="group-hover:hidden">{i + 1}</span>
                      <Play size={12} fill="currentColor" className="hidden group-hover:inline-block text-[#A577FF]" />
                    </div>
                    <div className="flex-1 flex items-center gap-3 pr-4 min-w-0">
                      <img src={`https://api.dicebear.com/7.x/identicon/svg?seed=${track.title}&backgroundColor=0D0524`} className="w-10 h-10 rounded-md" alt="art" />
                      <h4 className="font-bold text-sm text-gray-200 group-hover:text-white truncate">{track.title}</h4>
                    </div>
                    <div className="w-1/4 hidden md:block text-xs text-gray-400 truncate pr-4">{track.artist}</div>
                    <div className="w-1/4 hidden lg:block text-xs text-gray-400 truncate pr-4">{track.album}</div>
                    <div className="w-20 flex items-center justify-end gap-4">
                      <Heart 
                        size={14} 
                        className="text-pink-500 fill-pink-500 cursor-pointer hover:scale-110 transition-transform" 
                        onClick={(e) => handleToggleLike(e, track)}
                      />
                      <span className="text-xs text-gray-400">{track.time}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ) : middleView.startsWith('explore_') ? (
            // EXPLORE ALBUMS / PLAYLISTS / ARTISTS VIEW
            <div className="flex flex-col h-full animate-in fade-in slide-in-from-bottom-4">
              <div className="flex items-center gap-4 mb-8 sticky top-0 bg-[#150A35]/90 backdrop-blur z-10 py-2">
                <button onClick={() => setMiddleView('main')} className="w-8 h-8 rounded-full bg-white/5 flex items-center justify-center hover:bg-white/10 transition-colors">
                  <ChevronLeft size={20} />
                </button>
                <h2 className="text-3xl font-bold capitalize">
                  {middleView === 'explore_playlists' ? 'Playlists' : middleView === 'explore_artists' ? 'Artists' : 'Albums'}
                </h2>
              </div>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-6 pb-10">
                {middleView === 'explore_playlists' && [
                  { name: 'Discover Weekly', desc: 'Your shortcut to hidden gems...', color: 'bg-gradient-to-br from-pink-500 to-orange-400' },
                  { name: 'Daily Mix 1', desc: 'BiSH, VK Blanka, LONGMAN', color: 'bg-gradient-to-br from-cyan-400 to-blue-500' },
                  { name: 'Chill Vibes', desc: 'Relaxing tracks for you', color: 'bg-gradient-to-br from-purple-500 to-indigo-500' },
                  { name: 'Workout', desc: 'Pump up your day', color: 'bg-gradient-to-br from-red-500 to-pink-600' },
                ].map((item, i) => (
                  <div key={i} onClick={() => playTrack(item.name)} className="flex flex-col group cursor-pointer">
                    <div className={`w-full aspect-square rounded-xl ${item.color} mb-3 p-4 relative overflow-hidden shadow-md`}>
                      <div className="absolute inset-0 bg-black/10 mix-blend-overlay"></div>
                      <h3 className="text-2xl font-black text-white absolute bottom-4 left-4 w-3/4 leading-tight">{item.name}</h3>
                      <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                        <div className="w-14 h-14 bg-[#A577FF] rounded-full flex items-center justify-center shadow-lg transform translate-y-4 group-hover:translate-y-0 transition-all duration-300">
                          <Play size={24} fill="currentColor" className="text-white ml-1" />
                        </div>
                      </div>
                    </div>
                    <p className="text-xs text-gray-400 leading-snug">{item.desc}</p>
                  </div>
                ))}

                {middleView === 'explore_artists' && [
                  { name: 'The Weeknd', desc: 'Artist', image: 'weeknd' },
                  { name: 'Taylor Swift', desc: 'Artist', image: 'taylor' },
                  { name: 'M83', desc: 'Artist', image: 'm83' },
                  { name: 'Post Malone', desc: 'Artist', image: 'post' },
                ].map((item, i) => (
                  <div key={i} onClick={() => playTrack(item.name, item.name)} className="flex flex-col items-center text-center group cursor-pointer">
                    <div className="w-full aspect-square rounded-full bg-white/5 mb-3 relative overflow-hidden shadow-md border-2 border-transparent group-hover:border-[#A577FF] transition-colors">
                      <img src={`https://api.dicebear.com/7.x/identicon/svg?seed=${item.image}&backgroundColor=150A35`} className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500" alt={item.name} />
                      <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                        <div className="w-14 h-14 bg-[#A577FF] rounded-full flex items-center justify-center shadow-lg transform translate-y-4 group-hover:translate-y-0 transition-all duration-300">
                          <Play size={24} fill="currentColor" className="text-white ml-1" />
                        </div>
                      </div>
                    </div>
                    <h3 className="font-bold text-gray-200 group-hover:text-white transition-colors">{item.name}</h3>
                    <p className="text-xs text-gray-500">{item.desc}</p>
                  </div>
                ))}

                {middleView === 'explore_albums' && [
                  { name: 'Midnights', desc: 'Taylor Swift', color: 'bg-gradient-to-br from-[#1B4B54] to-[#65A7D4]' },
                  { name: 'Starboy', desc: 'The Weeknd', color: 'bg-gradient-to-br from-[#541B1B] to-[#D46565]' },
                  { name: 'After Hours', desc: 'The Weeknd', color: 'bg-gradient-to-br from-orange-600 to-red-800' },
                  { name: 'Lover', desc: 'Taylor Swift', color: 'bg-gradient-to-br from-pink-300 to-purple-300' },
                ].map((item, i) => (
                  <div key={i} onClick={() => playTrack(item.name, item.desc)} className="flex flex-col group cursor-pointer">
                    <div className={`w-full aspect-square rounded-md ${item.color} mb-3 relative overflow-hidden shadow-md`}>
                      <div className="absolute inset-0 bg-black/10 mix-blend-overlay"></div>
                      <div className="absolute inset-0 flex items-center justify-center opacity-30 group-hover:opacity-10 transition-opacity">
                         <Music2 size={48} className="text-white" />
                      </div>
                      <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                        <div className="w-14 h-14 bg-[#A577FF] rounded-full flex items-center justify-center shadow-lg transform translate-y-4 group-hover:translate-y-0 transition-all duration-300">
                          <Play size={24} fill="currentColor" className="text-white ml-1" />
                        </div>
                      </div>
                    </div>
                    <h3 className="font-bold text-gray-200 group-hover:text-white transition-colors">{item.name}</h3>
                    <p className="text-xs text-gray-500 leading-snug">{item.desc}</p>
                  </div>
                ))}
              </div>
            </div>
          ) : middleView === 'playlist_detail' && activePlaylist ? (
            // CUSTOM PLAYLIST DETAIL VIEW
            <div className="flex flex-col h-full animate-in fade-in slide-in-from-right-4">
              <div className="flex items-center justify-between mb-8 sticky top-0 bg-[#150A35]/90 backdrop-blur z-10 py-2">
                <div className="flex items-center gap-4">
                  <button onClick={() => setMiddleView('main')} className="w-8 h-8 rounded-full bg-white/5 flex items-center justify-center hover:bg-white/10 transition-colors">
                    <ChevronLeft size={20} />
                  </button>

                  {/* Photo square round beside title */}
                  <div className="w-14 h-14 rounded-2xl bg-white/5 border border-white/10 overflow-hidden flex items-center justify-center shrink-0 shadow-lg select-none">
                    {activePlaylist.photo ? (
                      <img src={activePlaylist.photo} alt={activePlaylist.name} className="w-full h-full object-cover" />
                    ) : (
                      <div className={`w-full h-full flex items-center justify-center bg-[#${activePlaylist.color || 'A577FF'}]/20`}>
                        <Music2 size={26} className={`text-[#${activePlaylist.color || 'A577FF'}]`} />
                      </div>
                    )}
                  </div>

                  <div className="flex flex-col">
                    <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Playlist</span>
                    <h2 className="text-2xl md:text-3xl font-bold text-white tracking-tight select-none">
                      {activePlaylist.name}
                    </h2>
                    <p className="text-xs text-gray-400 mt-0.5">{activePlaylist.tracks.length} songs</p>
                  </div>
                </div>

                <div className="flex items-center gap-3">
                  <button 
                    onClick={() => setAddMusicType('playlist')}
                    className="flex items-center gap-1.5 bg-[#A577FF]/20 text-[#A577FF] hover:bg-[#A577FF]/30 font-bold px-4 py-2 rounded-full text-sm transition-colors"
                  >
                    <Plus size={16} /> Add Music
                  </button>

                  {/* Three dots button with unified Edit Playlist Popover */}
                  <div className="relative">
                    <button 
                      onClick={() => {
                        if (!isPlaylistMenuOpen && activePlaylist) {
                          setEditPlaylistName(activePlaylist.name);
                          setEditPlaylistPhoto(activePlaylist.photo || null);
                        }
                        setIsPlaylistMenuOpen(!isPlaylistMenuOpen);
                      }}
                      className={`w-9 h-9 rounded-full bg-white/5 hover:bg-white/10 text-gray-300 hover:text-white flex items-center justify-center transition-colors cursor-pointer ${isPlaylistMenuOpen ? 'bg-[#A577FF]/20 text-[#A577FF]' : ''}`}
                      title="Edit Playlist"
                    >
                      <MoreVertical size={18} />
                    </button>

                    {isPlaylistMenuOpen && (
                      <>
                        <div 
                          className="fixed inset-0 z-40" 
                          onClick={() => setIsPlaylistMenuOpen(false)} 
                        />
                        <div 
                          className="absolute top-11 right-0 w-72 bg-[#251A45] border border-white/10 rounded-2xl shadow-[0_10px_40px_rgba(0,0,0,0.8)] p-4 z-50 animate-in fade-in zoom-in-95 origin-top-right select-none space-y-3"
                          onClick={(e) => e.stopPropagation()}
                        >
                          <div className="flex items-center justify-between pb-1.5 border-b border-white/5">
                            <span className="text-xs font-bold text-white flex items-center gap-1.5">
                              <span>Edit Playlist</span>
                            </span>
                            <button onClick={() => setIsPlaylistMenuOpen(false)} className="text-gray-400 hover:text-white cursor-pointer">
                              <X size={14} />
                            </button>
                          </div>

                          {/* Foto Playlist */}
                          <div>
                            <input 
                              type="file" 
                              ref={editPlaylistPhotoInputRef} 
                              accept="image/*" 
                              className="hidden" 
                              onChange={handleEditPhotoUpload} 
                            />
                            <label className="text-[10px] text-gray-400 font-semibold block mb-1">Playlist Photo</label>
                            <div className="flex items-center gap-3 p-2 bg-white/5 rounded-xl border border-white/5">
                              <div 
                                onClick={() => editPlaylistPhotoInputRef.current?.click()}
                                className="w-14 h-14 rounded-xl bg-white/5 border border-dashed border-white/20 hover:border-[#A577FF] flex items-center justify-center cursor-pointer relative overflow-hidden group shrink-0 transition-all shadow-inner"
                                title="Click to upload photo"
                              >
                                {editPlaylistPhoto ? (
                                  <>
                                    <img src={editPlaylistPhoto} alt="Preview" className="w-full h-full object-cover" />
                                    <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center text-white">
                                      <Camera size={14} />
                                    </div>
                                    <button 
                                      type="button" 
                                      onClick={(e) => { e.stopPropagation(); setEditPlaylistPhoto(null); }}
                                      className="absolute top-0.5 right-0.5 w-4 h-4 rounded-full bg-black/70 text-white flex items-center justify-center hover:bg-red-500 transition-colors"
                                      title="Remove photo"
                                    >
                                      <X size={9} />
                                    </button>
                                  </>
                                ) : (
                                  <div className="flex flex-col items-center">
                                    <Camera size={16} className="text-[#A577FF] mb-0.5 group-hover:scale-110 transition-transform" />
                                    <span className="text-[8px] text-gray-400">Choose Photo</span>
                                  </div>
                                )}
                              </div>
                              <div className="flex-1 min-w-0">
                                <span className="text-xs font-bold text-white block">Playlist Cover</span>
                                <span className="text-[10px] text-gray-400 block truncate">
                                  {editPlaylistPhoto ? 'Photo selected (Click to change)' : 'Default music icon'}
                                </span>
                              </div>
                            </div>
                          </div>

                          {/* Playlist Name Input */}
                          <div>
                            <label className="text-[10px] text-gray-400 font-semibold block mb-1">Playlist Name</label>
                            <input 
                              type="text" 
                              value={editPlaylistName} 
                              onChange={(e) => setEditPlaylistName(e.target.value)}
                              onKeyDown={(e) => e.key === 'Enter' && handleSavePlaylistEdits()}
                              className="w-full bg-[#150A35] border border-white/10 rounded-xl px-2.5 py-1.5 text-xs text-white placeholder-gray-500 focus:outline-none focus:border-[#A577FF] transition-all"
                              placeholder="Playlist name..."
                              autoFocus
                            />
                          </div>

                          {/* Bottom Action Row: Delete next to Cancel */}
                          <div className="flex items-center justify-between pt-2 border-t border-white/5">
                            <button 
                              type="button" 
                              onClick={() => {
                                setIsPlaylistMenuOpen(false);
                                handleDeletePlaylist();
                              }}
                              className="px-2.5 py-1.5 rounded-lg text-[10px] font-bold bg-red-500/15 hover:bg-red-500/25 text-red-400 hover:text-red-300 border border-red-500/20 flex items-center gap-1 transition-all cursor-pointer"
                              title="Delete Playlist"
                            >
                              <Trash2 size={12} /> Delete
                            </button>
                            <div className="flex items-center gap-1.5">
                              <button 
                                type="button" 
                                onClick={() => setIsPlaylistMenuOpen(false)}
                                className="px-2.5 py-1.5 rounded-lg text-[10px] font-bold text-gray-400 hover:text-white transition-colors cursor-pointer"
                              >
                                Cancel
                              </button>
                              <button 
                                type="button" 
                                onClick={handleSavePlaylistEdits}
                                className="px-3.5 py-1.5 rounded-lg text-[10px] font-bold bg-[#A577FF] hover:bg-[#9161eb] text-white shadow-md cursor-pointer transition-all"
                              >
                                Save
                              </button>
                            </div>
                          </div>
                        </div>
                      </>
                    )}
                  </div>
                </div>
              </div>
              <div className="w-full flex flex-col">
                <div className="flex px-4 py-2 text-[10px] font-bold text-gray-500 uppercase tracking-wider border-b border-white/5 mb-4">
                  <div className="w-8 text-center">#</div>
                  <div className="flex-1">Title</div>
                  <div className="w-1/4 hidden md:block">Artist</div>
                  <div className="w-1/4 hidden lg:block">Album</div>
                  <div className="w-24 text-right pr-4">Time</div>
                </div>
                {activePlaylist.tracks.length === 0 && (
                  <div className="text-center text-gray-500 py-10 flex flex-col items-center">
                    <Music2 size={32} className="mb-2 opacity-50" />
                    <p>No songs in this playlist yet.</p>
                    <p className="text-xs mt-1">Click "Add Music" to start building your collection.</p>
                  </div>
                )}
                {activePlaylist.tracks.map((track: any, i: number) => (
                  <div key={track.id} onClick={() => playTrack(track.title, track.artist)} className="flex items-center px-4 py-3 rounded-xl hover:bg-white/5 transition-colors cursor-pointer group">
                    <div className="w-8 text-center text-xs text-gray-500 font-medium group-hover:text-white">
                      <span className="group-hover:hidden">{i + 1}</span>
                      <Play size={12} fill="currentColor" className="hidden group-hover:inline-block text-[#A577FF]" />
                    </div>
                    <div className="flex-1 flex items-center gap-3 pr-4 min-w-0">
                      <img src={`https://api.dicebear.com/7.x/identicon/svg?seed=${track.title}&backgroundColor=0D0524`} className="w-10 h-10 rounded-md" alt="art" />
                      <h4 className="font-bold text-sm text-gray-200 group-hover:text-white truncate">{track.title}</h4>
                    </div>
                    <div className="w-1/4 hidden md:block text-xs text-gray-400 truncate pr-4">{track.artist}</div>
                    <div className="w-1/4 hidden lg:block text-xs text-gray-400 truncate pr-4">{track.album}</div>
                    <div className="w-24 flex items-center justify-end gap-3">
                      <span title="Love" className="inline-flex items-center">
                        <Heart 
                          size={14} 
                          className={`cursor-pointer hover:scale-110 transition-transform ${likedSongs.some(s => s.id === track.id) ? 'text-pink-500 fill-pink-500' : 'text-gray-500 hover:text-pink-500'}`} 
                          onClick={(e) => handleToggleLike(e, track)}
                        />
                      </span>
                      <div className="relative">
                        <span title="Add to Playlist" className="inline-flex items-center">
                          <ListPlus 
                            size={14} 
                            className="text-gray-500 hover:text-white cursor-pointer opacity-0 group-hover:opacity-100 transition-all"
                            onClick={(e) => { e.stopPropagation(); setCurrentTrack(track); setTrackPlaylistPopupId(track.id); }}
                          />
                        </span>
                        {trackPlaylistPopupId === track.id && (
                          <>
                            <div className="fixed inset-0 z-40" onClick={(e) => { e.stopPropagation(); setTrackPlaylistPopupId(null); }} />
                            <div className="absolute top-6 right-0 w-48 bg-[#251A45] rounded-xl shadow-[0_10px_40px_rgba(0,0,0,0.8)] border border-white/10 p-2 z-50 animate-in fade-in zoom-in-95 origin-top-right">
                              <div onClick={(e) => { e.stopPropagation(); handleCreatePlaylist(); setTrackPlaylistPopupId(null); }} className="flex items-center gap-3 p-2.5 hover:bg-white/5 rounded-lg cursor-pointer text-[#A577FF] mb-1 transition-colors">
                                <Plus size={14} /> <span className="text-xs font-bold">New playlist</span>
                              </div>
                              <div className="w-full h-px bg-white/10 my-1"></div>
                              {playlists.map((pl) => (
                                <div key={pl.id} onClick={(e) => { e.stopPropagation(); handleAddToPlaylist(pl.id, pl.name); setTrackPlaylistPopupId(null); }} className="p-2.5 hover:bg-white/5 rounded-lg cursor-pointer flex flex-col gap-1 transition-colors">
                                  <span className="text-xs font-bold text-gray-200 truncate">{pl.name}</span>
                                  <span className="text-[10px] text-gray-500 flex items-center gap-1.5">
                                    <div className={`w-1.5 h-1.5 rounded-full bg-[#${pl.color}]`}></div> 
                                    ({pl.tracks.length})
                                  </span>
                                </div>
                              ))}
                            </div>
                          </>
                        )}
                      </div>
                      <span title="Remove from this playlist" className="inline-flex items-center">
                        <Trash2 
                          size={14} 
                          className="text-gray-500 hover:text-red-500 cursor-pointer opacity-0 group-hover:opacity-100 transition-all"
                          onClick={(e) => handleRemoveTrackFromPlaylist(e, track.id)}
                        />
                      </span>
                      <span className="text-xs text-gray-400 w-8 text-right">{track.time}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ) : null}
        </div>

        {/* === RIGHT COLUMN === */}
        <div className="w-80 flex flex-col border-l border-white/5 bg-white/[0.02] shrink-0">
          <div className="p-6 flex items-center justify-between border-b border-white/5 relative h-[89px]">
            {(friendState === 'joined' || friendState === 'waiting') ? (
              <button 
                onClick={() => { 
                  const leavingPartner = activeFriend?.name;
                  const wasWaiting = friendState === 'waiting';
                  const isHost = isHostRef.current || wasWaiting;
                  setFriendState('none'); 
                  setActiveFriend(null);
                  if (onLeaveSession) onLeaveSession();
                  lastLeaveToastTimeRef.current = Date.now();
                  showToast(wasWaiting ? "Invitation cancelled" : "Left the listening session", 3000);
                  fetch('/api/invitations', {
                    method: 'PATCH',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ 
                      action: isHost ? 'end' : 'leave', 
                      partnerName: leavingPartner, 
                      senderName: currentUserName,
                      type: 'activity',
                      targetName: 'Listening Together'
                    })
                  })
                  .then(() => {
                    broadcastSync('SESSION_LEFT', { partnerName: leavingPartner, target: 'Listening Together' });
                  })
                  .catch(e => {});
                }}
                className="w-8 h-8 rounded-full bg-white/5 flex items-center justify-center text-gray-400 hover:text-red-400 hover:bg-red-500/20 transition-colors cursor-pointer"
                title={friendState === 'waiting' ? "Cancel Invitation" : "Leave Listening Session"}
              >
                <LogOut size={16} />
              </button>
            ) : (
              <div></div>
            )}
            
            <div className="flex items-center">
              {friendState === 'none' && (
                <button 
                  onClick={() => setFriendState('selecting')}
                  className="w-10 h-10 rounded-full bg-white/5 flex items-center justify-center text-gray-400 hover:text-white hover:bg-white/10 transition-colors mr-3"
                >
                  <UserPlus size={18} />
                </button>
              )}

            {friendState === 'selecting' && (
              <>
                <div className="fixed inset-0 z-40" onClick={() => setFriendState('none')} />
                <div className="absolute top-16 right-16 w-64 bg-[#251A45] rounded-xl shadow-[0_10px_40px_rgba(0,0,0,0.8)] border border-white/10 z-50 p-2 animate-in fade-in slide-in-from-top-2">
                  <div className="text-xs font-bold text-gray-400 mb-2 px-2 pt-1">List Friends</div>
                  <div className="max-h-[210px] overflow-y-auto custom-scrollbar pr-1">
                    {(friendsList && friendsList.length > 0 ? friendsList : MOCK_FRIENDS).map((friend: any, i: number) => {
                      const avatarSrc = friend.avatar || `https://api.dicebear.com/7.x/adventurer/svg?seed=${friend.seed || friend.name}&backgroundColor=${friend.color || 'A577FF'}`;
                      return (
                        <div key={i} className="flex items-center justify-between p-2 hover:bg-white/5 rounded-lg cursor-pointer group">
                          <div className="flex items-center gap-3">
                            <img src={avatarSrc} className="w-8 h-8 rounded-full border border-white/10 object-cover" alt={friend.name} />
                            <span className="text-sm font-bold text-gray-200 group-hover:text-white truncate max-w-[90px]">{friend.name}</span>
                          </div>
                          <button 
                            onClick={(e) => { e.stopPropagation(); handleAddFriendClick({ ...friend, avatar: avatarSrc }); }}
                            className="text-[10px] bg-[#A577FF] hover:bg-[#9161eb] text-white px-3 py-1.5 rounded-full font-bold transition-colors shrink-0"
                          >
                            Add
                          </button>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </>
            )}

            <div className="flex items-center -space-x-3">
              {(friendState === 'waiting' || friendState === 'joined') && activeFriend && (
                <div className="relative">
                  <img 
                    src={activeFriend.avatar || `https://api.dicebear.com/7.x/adventurer/svg?seed=${activeFriend.seed || activeFriend.name}&backgroundColor=${activeFriend.color || 'A577FF'}`} 
                    className={`w-10 h-10 rounded-full border-2 transition-all relative z-0 ${
                      friendState === 'waiting' 
                        ? 'animate-pulse opacity-70 ring-2 ring-yellow-400/80 border-yellow-400' 
                        : 'border-[#150A35] opacity-100 ring-0'
                    }`} 
                    alt={activeFriend.name} 
                  />
                  {friendState === 'waiting' && (
                    <span className="absolute -top-1 -right-1 w-3 h-3 bg-yellow-400 border-2 border-[#150A35] rounded-full animate-ping z-20 pointer-events-none" />
                  )}
                </div>
              )}
              <img src={userImage} className="w-10 h-10 rounded-full border-2 border-[#150A35] relative z-10" alt="Me" />
            </div>
            </div>
          </div>
          
          <div className="p-6 flex flex-col flex-1 min-h-0">
            {(friendState === 'joined' || friendState === 'waiting') ? (
              // Listening Together Queue
              <>
                <div className="flex items-center justify-between mb-6">
                  <div>
                    <h3 className="text-lg font-bold text-white">Next Play</h3>
                    {friendState === 'waiting' ? (
                      <p className="text-[10px] text-yellow-400 font-bold flex items-center gap-1.5 animate-pulse">
                        <span className="w-1.5 h-1.5 rounded-full bg-yellow-400"></span>
                        Waiting for {activeFriend?.name}...
                      </p>
                    ) : (
                      <p className="text-[10px] text-[#A577FF] font-bold">Listening with {activeFriend?.name}</p>
                    )}
                  </div>
                  <button 
                    onClick={() => setAddMusicType('queue')}
                    className="flex items-center gap-1.5 bg-[#A577FF]/20 text-[#A577FF] hover:bg-[#A577FF]/30 font-bold px-3 py-1.5 rounded-full text-xs transition-colors"
                  >
                    <Plus size={14} /> Add Music
                  </button>
                </div>
                
                <div className="flex-1 overflow-y-auto custom-scrollbar flex flex-col items-center justify-center opacity-50">
                  <Music2 size={32} className="mb-2 text-gray-500" />
                  <p className="text-xs text-gray-400">Queue is empty</p>
                </div>
              </>
            ) : (
              // Default Queue
              <>
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-lg font-bold">Play Queue</h3>
                </div>
                
                <div className="flex-1 overflow-y-auto custom-scrollbar flex flex-col gap-1 pr-2">
                  <h4 className="text-[10px] font-bold text-gray-500 uppercase tracking-wider mb-2">Now Playing</h4>
                  <div className="flex items-center gap-3 p-2 rounded-xl bg-white/10 border border-white/5 mb-3 group cursor-pointer relative overflow-hidden">
                    <div className="absolute left-0 top-0 bottom-0 w-1 bg-[#A577FF] rounded-l-xl"></div>
                    <img src="https://api.dicebear.com/7.x/identicon/svg?seed=city&backgroundColor=0D0524" className="w-10 h-10 rounded-lg ml-1" alt="art" />
                    <div className="flex-1 min-w-0">
                      <h4 className="text-xs font-bold text-[#A577FF] truncate">{currentTrack.title}</h4>
                      <p className="text-[10px] text-gray-400 truncate">{currentTrack.artist}</p>
                    </div>
                    {isPlaying && (
                      <div className="flex items-center gap-1">
                        <div className="w-1 h-3 bg-[#A577FF] animate-[pulse_1s_ease-in-out_infinite]"></div>
                        <div className="w-1 h-4 bg-[#A577FF] animate-[pulse_1.2s_ease-in-out_infinite_0.2s]"></div>
                        <div className="w-1 h-2 bg-[#A577FF] animate-[pulse_0.8s_ease-in-out_infinite_0.4s]"></div>
                      </div>
                    )}
                  </div>

                  <h4 className="text-[10px] font-bold text-gray-500 uppercase tracking-wider mb-2 mt-2">Next Play</h4>
                  {PLAY_QUEUE.map((q, i) => (
                    <div key={i} className="flex items-center gap-3 p-2 rounded-xl hover:bg-white/5 transition-colors cursor-pointer group">
                      <img src={`https://api.dicebear.com/7.x/identicon/svg?seed=${q.title}&backgroundColor=150A35`} className="w-10 h-10 rounded-lg opacity-80 group-hover:opacity-100" alt="art" />
                      <div className="flex-1 min-w-0">
                        <h4 className="text-xs font-bold text-gray-300 group-hover:text-white truncate">{q.title}</h4>
                        <p className="text-[10px] text-gray-500 truncate">{q.artist}</p>
                      </div>
                      <span className="text-[10px] text-gray-500">{q.time}</span>
                    </div>
                  ))}
                </div>
              </>
            )}
          </div>
        </div>
      </div>

      {/* === BOTTOM PLAYER === */}
      <div className="h-[90px] bg-[#110826] border-t border-white/5 shrink-0 flex items-center justify-between px-6 z-20 relative shadow-[0_-10px_30px_rgba(0,0,0,0.5)]">
        <div className="absolute left-1/2 bottom-0 -translate-x-1/2 w-1/3 h-10 bg-[#A577FF]/20 blur-3xl rounded-full"></div>
        
        {/* Left */}
        <div className="flex items-center gap-4 w-[250px] shrink-0">
          <div className="relative w-14 h-14 shrink-0">
            <div className={`absolute inset-0 bg-gray-900 rounded-full shadow-[0_0_15px_rgba(0,0,0,0.8)] border-[4px] border-gray-800 flex items-center justify-center ${isPlaying ? 'animate-[spin_4s_linear_infinite]' : ''}`}>
              <div className="w-4 h-4 rounded-full bg-[#A577FF]/20 border border-[#A577FF]/50 flex items-center justify-center">
                 <div className="w-1.5 h-1.5 bg-[#150A35] rounded-full"></div>
              </div>
            </div>
          </div>
          <div className="min-w-0">
            <h4 className="text-[#F5F7FC] font-bold text-sm truncate">{currentTrack.title}</h4>
            <p className="text-[10px] text-[#A577FF] font-medium mt-0.5 truncate">{currentTrack.artist}</p>
          </div>
        </div>
        
        {/* Center */}
        <div className="flex-1 max-w-2xl flex flex-col items-center justify-center px-8 relative z-10">
          <div className="flex items-center gap-6 mb-2">
            <button 
              onClick={() => setIsShuffle(!isShuffle)} 
              className={`w-8 h-8 rounded-xl flex items-center justify-center transition-all cursor-pointer ${
                isShuffle 
                  ? 'bg-[#A577FF]/20 text-[#A577FF] border border-[#A577FF]/30 shadow-[0_0_12px_rgba(165,119,255,0.4)]' 
                  : 'text-gray-400 hover:text-white hover:bg-white/5'
              }`}
              title={isShuffle ? 'Shuffle Active' : 'Shuffle'}
            >
              <Shuffle size={16} />
            </button>
            <button 
              onClick={handlePrevTrack} 
              className="text-gray-400 hover:text-white transition-colors cursor-pointer p-1 active:scale-90"
              title="Previous Track"
            >
              <SkipBack size={18} fill="currentColor" />
            </button>
            <button 
              onClick={() => setIsPlaying(!isPlaying)}
              className="w-10 h-10 rounded-full bg-[#A577FF] hover:bg-[#9161eb] text-white flex items-center justify-center hover:scale-105 active:scale-95 transition-all shadow-[0_0_15px_rgba(165,119,255,0.4)] cursor-pointer"
              title={isPlaying ? 'Pause' : 'Play'}
            >
              {isPlaying ? <Pause size={18} fill="white" /> : <Play size={18} fill="white" className="ml-0.5" />}
            </button>
            <button 
              onClick={handleNextTrack} 
              className="text-gray-400 hover:text-white transition-colors cursor-pointer p-1 active:scale-90"
              title="Next Track"
            >
              <SkipForward size={18} fill="currentColor" />
            </button>
            <button 
              onClick={toggleRepeat} 
              className={`w-8 h-8 rounded-xl flex items-center justify-center transition-all cursor-pointer ${
                repeatState !== 'none' 
                  ? 'bg-[#A577FF]/20 text-[#A577FF] border border-[#A577FF]/30 shadow-[0_0_12px_rgba(165,119,255,0.4)]' 
                  : 'text-gray-400 hover:text-white hover:bg-white/5'
              }`}
              title={
                repeatState === 'one' 
                  ? 'Repeat One' 
                  : repeatState === 'all' 
                    ? 'Repeat All' 
                    : 'Repeat Off'
              }
            >
              {repeatState === 'one' ? <Repeat1 size={17} /> : <Repeat size={17} />}
            </button>
          </div>
          <div className="w-full flex items-center gap-3">
            <span className="text-[10px] font-bold text-gray-500 w-8 text-right">{formatTime(progressSec)}</span>
            <div className="flex-1 h-1.5 bg-white/10 rounded-full overflow-hidden cursor-pointer group relative">
              <div 
                className="h-full bg-[#A577FF] group-hover:bg-[#b58fff] rounded-full relative transition-all duration-1000 ease-linear"
                style={{ width: `${(progressSec / totalSec) * 100}%` }}
              >
                <div className="absolute right-0 top-1/2 -translate-y-1/2 w-2.5 h-2.5 bg-white rounded-full shadow-md opacity-0 group-hover:opacity-100 transition-opacity"></div>
              </div>
            </div>
            <span className="text-[10px] font-bold text-gray-500 w-8">{formatTime(totalSec)}</span>
          </div>
        </div>

        {/* Right */}
        <div className="flex items-center justify-end gap-5 w-[250px] shrink-0 relative">
          <div className="flex items-center gap-2">
            <Volume2 size={16} className="text-gray-400" />
            <div className="w-20 h-1.5 bg-white/10 rounded-full overflow-hidden cursor-pointer group relative">
              <div className="w-2/3 h-full bg-gray-400 group-hover:bg-[#A577FF] rounded-full relative transition-colors"></div>
            </div>
          </div>
          
          <button 
            onClick={(e) => handleToggleLike(e, currentTrack)}
            className={`transition-colors hover:scale-110 ${likedSongs.some(s => s.id === currentTrack.id) ? 'text-pink-500 fill-pink-500' : 'text-gray-400 hover:text-pink-500'}`}
          >
            <Heart size={18} className={likedSongs.some(s => s.id === currentTrack.id) ? 'fill-pink-500' : ''} />
          </button>
          
          <div className="relative">
            <button 
              onClick={() => setIsPlaylistPopupOpen(!isPlaylistPopupOpen)} 
              className={`text-gray-400 hover:text-white transition-colors ${isPlaylistPopupOpen ? 'text-white' : ''}`}
            >
              <ListPlus size={18} />
            </button>
            
            {isPlaylistPopupOpen && (
              <>
                <div className="fixed inset-0 z-40" onClick={() => setIsPlaylistPopupOpen(false)} />
                <div className="absolute bottom-10 right-0 w-56 bg-[#251A45] rounded-xl shadow-[0_10px_40px_rgba(0,0,0,0.8)] border border-white/10 p-2 z-50 animate-in fade-in slide-in-from-bottom-2">
                  <div onClick={() => { handleCreatePlaylist(); setIsPlaylistPopupOpen(false); }} className="flex items-center gap-3 p-2.5 hover:bg-white/5 rounded-lg cursor-pointer text-[#A577FF] mb-1 transition-colors">
                    <Plus size={16} /> <span className="text-xs font-bold">New playlist</span>
                  </div>
                  <div className="w-full h-px bg-white/10 my-1"></div>
                  {playlists.map((pl) => (
                    <div key={pl.id} onClick={() => handleAddToPlaylist(pl.id, pl.name)} className="p-2.5 hover:bg-white/5 rounded-lg cursor-pointer flex flex-col gap-1 transition-colors">
                      <span className="text-xs font-bold text-gray-200">{pl.name}</span>
                      <span className="text-[10px] text-gray-500 flex items-center gap-1.5">
                        <div className={`w-2 h-2 rounded-full bg-[#${pl.color}]`}></div> 
                        ({pl.tracks.length})
                      </span>
                    </div>
                  ))}
                </div>
              </>
            )}
          </div>
        </div>
      </div>
      

      {/* Create Playlist Modal */}
      {isCreatePlaylistModalOpen && (
        <div 
          className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-in fade-in duration-200"
          onClick={() => setIsCreatePlaylistModalOpen(false)}
        >
          <div 
            className="bg-[#1E123F] border border-white/10 rounded-2xl w-full max-w-sm p-6 shadow-2xl relative animate-in zoom-in-95 duration-200"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between mb-5">
              <h3 className="text-lg font-bold text-white">Create New Playlist</h3>
              <button 
                onClick={() => setIsCreatePlaylistModalOpen(false)}
                className="w-8 h-8 rounded-full bg-white/5 hover:bg-white/10 text-gray-400 hover:text-white flex items-center justify-center transition-colors"
              >
                <X size={16} />
              </button>
            </div>

            <form onSubmit={handleCreatePlaylistSubmit} className="flex flex-col gap-4">
              {/* Photo Upload Box */}
              <div className="flex flex-col items-center">
                <input 
                  type="file" 
                  ref={createPlaylistPhotoInputRef} 
                  accept="image/*" 
                  className="hidden" 
                  onChange={handleCreatePhotoUpload} 
                />
                <div 
                  onClick={() => createPlaylistPhotoInputRef.current?.click()}
                  className="w-24 h-24 rounded-2xl bg-white/5 border-2 border-dashed border-white/20 hover:border-[#A577FF]/70 flex flex-col items-center justify-center cursor-pointer group relative overflow-hidden transition-all shadow-inner"
                  title="Upload Playlist Cover"
                >
                  {newPlaylistPhoto ? (
                    <>
                      <img src={newPlaylistPhoto} alt="Playlist Cover" className="w-full h-full object-cover" />
                      <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center text-white">
                        <Camera size={20} />
                      </div>
                      <button 
                        type="button" 
                        onClick={(e) => { e.stopPropagation(); setNewPlaylistPhoto(null); }}
                        className="absolute top-1 right-1 w-5 h-5 rounded-full bg-black/70 text-white flex items-center justify-center hover:bg-red-500 transition-colors"
                        title="Remove photo"
                      >
                        <X size={10} />
                      </button>
                    </>
                  ) : (
                    <>
                      <div className="w-10 h-10 rounded-xl bg-[#A577FF]/15 flex items-center justify-center mb-1 group-hover:scale-110 transition-transform">
                        <Music2 size={20} className="text-[#A577FF]" />
                      </div>
                      <span className="text-[10px] font-semibold text-gray-300">Upload Photo</span>
                      <span className="text-[8px] text-gray-500">(Optional)</span>
                    </>
                  )}
                </div>
                <span className="text-[11px] text-gray-400 mt-2">
                  {newPlaylistPhoto ? 'Click photo to change' : 'Default music icon will be used without photo'}
                </span>
              </div>

              {/* Playlist Name Input */}
              <div>
                <label className="block text-xs font-semibold text-gray-300 mb-1.5">Playlist Name</label>
                <input 
                  type="text" 
                  value={newPlaylistName}
                  onChange={(e) => setNewPlaylistName(e.target.value)}
                  placeholder={`Playlist #${playlists.length + 1}`}
                  autoFocus
                  className="w-full bg-white/5 border border-white/10 focus:border-[#A577FF] rounded-xl px-4 py-2.5 text-sm text-white placeholder-gray-500 focus:outline-none transition-colors"
                />
              </div>

              {/* Action Buttons */}
              <div className="flex gap-2.5 mt-2">
                <button 
                  type="button" 
                  onClick={() => setIsCreatePlaylistModalOpen(false)}
                  className="flex-1 py-2.5 rounded-xl bg-white/5 hover:bg-white/10 text-gray-300 font-semibold text-xs transition-colors"
                >
                  Cancel
                </button>
                <button 
                  type="submit"
                  className="flex-1 py-2.5 rounded-xl bg-gradient-to-r from-[#A577FF] to-[#7065D4] hover:opacity-90 text-white font-bold text-xs shadow-lg shadow-[#A577FF]/25 transition-all"
                >
                  Create Playlist
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
