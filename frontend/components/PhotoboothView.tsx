import React, { useState, useEffect, useRef, useCallback } from 'react';
import { 
  Camera, Upload, ChevronDown, RefreshCw, Download, 
  Sparkles, Layout, Palette, Check, X, AlertCircle, Eye,
  LogOut, UserPlus, Users, ArrowUpDown, ArrowUp, ArrowDown
} from 'lucide-react';

interface PhotoboothPhoto {
  src: string;
  hasFlash?: boolean;
  taker: {
    name: string;
    avatar: string;
  };
}

interface PhotoboothViewProps {
  onGoHome: () => void;
  userName?: string;
  userImage?: string;
  friendsList?: Array<{ name: string; avatar?: string; seed?: string; color?: string; email?: string }>;
  initialFriend?: any;
  onLeaveSession?: () => void;
  onConsumeInitialFriend?: () => void;
}

// Collage Layout Options
interface CollageLayout {
  id: string;
  name: string;
  cuts: number; // Number of photos required
  gridCols: number;
  gridRows: number;
  aspect: string;
  desc: string;
}

const COLLAGE_LAYOUTS: CollageLayout[] = [
  { id: 'strip-3', name: '3-Cut Strip', cuts: 3, gridCols: 1, gridRows: 3, aspect: 'aspect-[1/3]', desc: 'Classic Vertical 3 Cuts' },
  { id: 'strip-4', name: '4-Cut Strip', cuts: 4, gridCols: 1, gridRows: 4, aspect: 'aspect-[1/4]', desc: 'Korean 4 Cuts Life' },
  { id: 'grid-2x2', name: '2x2 Grid', cuts: 4, gridCols: 2, gridRows: 2, aspect: 'aspect-[1/1]', desc: 'Quad Grid 4 Cuts' },
  { id: 'grid-2x3', name: '6-Cut Grid', cuts: 6, gridCols: 2, gridRows: 3, aspect: 'aspect-[2/3]', desc: 'Party 6 Cuts' },
  { id: 'single', name: 'Single Cut', cuts: 1, gridCols: 1, gridRows: 1, aspect: 'aspect-[4/3]', desc: 'Polaroid Single Cut' },
];

// Color Frame Options for Photo Strip Output
const FRAME_COLORS = [
  { id: 'pink', name: 'Pastel Pink', bg: 'bg-[#FFD1DC]', hex: '#FFD1DC', text: 'text-gray-800' },
  { id: 'white', name: 'Pure White', bg: 'bg-white', hex: '#FFFFFF', text: 'text-gray-800' },
  { id: 'purple', name: 'Cozy Lavender', bg: 'bg-[#E8D7FF]', hex: '#E8D7FF', text: 'text-[#4A2D82]' },
  { id: 'cream', name: 'Warm Cream', bg: 'bg-[#FFF6E5]', hex: '#FFF6E5', text: 'text-gray-800' },
  { id: 'black', name: 'Noir Dark', bg: 'bg-[#18181B]', hex: '#18181B', text: 'text-white' },
  { id: 'blue', name: 'Sky Baby', bg: 'bg-[#D6EEFF]', hex: '#D6EEFF', text: 'text-gray-800' },
  { id: 'mint', name: 'Pastel Mint', bg: 'bg-[#D2F9E8]', hex: '#D2F9E8', text: 'text-gray-800' },
  { id: 'dark-cozy', name: 'Cozy Dark', bg: 'bg-[#150A35]', hex: '#150A35', text: 'text-white' },
];

// Photo Effects & Filters
interface FilterEffect {
  id: string;
  name: string;
  filter: string; // CSS filter string
  tag: string;
}

const FILTER_EFFECTS: FilterEffect[] = [
  { id: 'normal', name: 'Normal', filter: 'none', tag: 'Original' },
  { id: 'blush', name: 'Blush Pink', filter: 'brightness(1.06) contrast(1.03) saturate(1.15) hue-rotate(-5deg)', tag: 'K-Beauty' },
  { id: 'vintage', name: '90s Vintage', filter: 'sepia(0.35) contrast(1.1) brightness(0.95) saturate(1.1)', tag: 'Analog' },
  { id: 'bw', name: 'Monochrome', filter: 'grayscale(1) contrast(1.25) brightness(1.05)', tag: 'B&W' },
  { id: 'warm', name: 'Golden Hour', filter: 'sepia(0.2) saturate(1.3) brightness(1.05)', tag: 'Warm' },
  { id: 'cyber', name: 'Cyber Neon', filter: 'contrast(1.2) hue-rotate(180deg) saturate(1.3)', tag: 'Vibrant' },
  { id: 'retro', name: 'Retro Film', filter: 'contrast(1.15) brightness(1.08) saturate(0.85)', tag: 'Film' },
  { id: 'dream', name: 'Soft Dream', filter: 'brightness(1.12) contrast(0.95) saturate(1.05)', tag: 'Glow' },
];

interface PhotoboothUser {
  name: string;
  avatar: string;
  status: 'pending' | 'joined';
}

export default function PhotoboothView({ 
  onGoHome, 
  userName = 'You', 
  userImage,
  friendsList = [],
  initialFriend,
  onLeaveSession,
  onConsumeInitialFriend
}: PhotoboothViewProps) {
  // Camera & Stream State
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const [cameraStream, setCameraStream] = useState<MediaStream | null>(null);
  const [cameraStatus, setCameraStatus] = useState<'idle' | 'requesting' | 'ready' | 'error' | 'denied'>('idle');
  const [cameraErrorMsg, setCameraErrorMsg] = useState('');
  const [cameraDevices, setCameraDevices] = useState<MediaDeviceInfo[]>([]);
  const [selectedDeviceId, setSelectedDeviceId] = useState<string>('');

  // Photobooth Controls State (Flash defaults to OFF)
  const [isMirror, setIsMirror] = useState(false);
  const [isFlashOn, setIsFlashOn] = useState(false);
  const isMirrorRef = useRef(false);
  const isFlashOnRef = useRef(false);

  // Synchronize refs with state so async capture timer immediately sees user changes
  useEffect(() => {
    isMirrorRef.current = isMirror;
  }, [isMirror]);

  useEffect(() => {
    isFlashOnRef.current = isFlashOn;
  }, [isFlashOn]);

  const toggleMirror = () => {
    setIsMirror(prev => {
      const next = !prev;
      isMirrorRef.current = next;
      return next;
    });
  };

  const toggleFlash = () => {
    setIsFlashOn(prev => {
      const next = !prev;
      isFlashOnRef.current = next;
      return next;
    });
  };

  const [timerDuration, setTimerDuration] = useState<number>(3); // 3s, 5s, 10s
  const [countdown, setCountdown] = useState<number | null>(null);
  const [isCapturingSequence, setIsCapturingSequence] = useState(false);
  const [showFlashOverlay, setShowFlashOverlay] = useState(false);
  const [showShutterBlink, setShowShutterBlink] = useState(false);

  // Photos & Collage State
  const [selectedLayout, setSelectedLayout] = useState<CollageLayout>(COLLAGE_LAYOUTS[0]); // Default 3-cut
  const [selectedFrame, setSelectedFrame] = useState(FRAME_COLORS[0]); // Default Pastel Pink
  const [selectedFilter, setSelectedFilter] = useState<FilterEffect>(FILTER_EFFECTS[0]); // Default normal
  const [capturedPhotos, setCapturedPhotos] = useState<PhotoboothPhoto[]>([]);
  const [isPreviewStripModalOpen, setIsPreviewStripModalOpen] = useState(false);
  const [photoboothDate, setPhotoboothDate] = useState(() => {
    const d = new Date();
    return `${d.getFullYear()}.${String(d.getMonth() + 1).padStart(2, '0')}.${String(d.getDate()).padStart(2, '0')}`;
  });

  // Photo Reorder State (Click-to-swap, arrows, drag-and-drop)
  const [selectedPhotoIndex, setSelectedPhotoIndex] = useState<number | null>(null);
  const [draggedPhotoIndex, setDraggedPhotoIndex] = useState<number | null>(null);

  // Swap two photos in capturedPhotos
  const handleSwapPhotos = (fromIdx: number, toIdx: number) => {
    setCapturedPhotos(prev => {
      const next = [...prev];
      const temp = next[fromIdx];
      next[fromIdx] = next[toIdx];
      next[toIdx] = temp;
      return next;
    });
    setSelectedPhotoIndex(null);
  };

  // Move photo up or down 1 slot
  const handleMovePhoto = (index: number, direction: -1 | 1, e?: React.MouseEvent) => {
    e?.stopPropagation();
    const targetIndex = index + direction;
    if (targetIndex < 0 || targetIndex >= capturedPhotos.length) return;
    handleSwapPhotos(index, targetIndex);
  };

  // Click handler for photo cards in the right sidebar
  const handlePhotoCardClick = (index: number) => {
    if (selectedPhotoIndex === null) {
      setSelectedPhotoIndex(index);
    } else if (selectedPhotoIndex === index) {
      setSelectedPhotoIndex(null);
    } else {
      handleSwapPhotos(selectedPhotoIndex, index);
    }
  };

  // Drag-and-drop handlers for photo cards
  const handleDragStart = (e: React.DragEvent, index: number) => {
    setDraggedPhotoIndex(index);
    e.dataTransfer.effectAllowed = 'move';
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
  };

  const handleDrop = (e: React.DragEvent, targetIndex: number) => {
    e.preventDefault();
    if (draggedPhotoIndex === null || draggedPhotoIndex === targetIndex) {
      setDraggedPhotoIndex(null);
      return;
    }
    setCapturedPhotos(prev => {
      const next = [...prev];
      const movedItem = next.splice(draggedPhotoIndex, 1)[0];
      next.splice(targetIndex, 0, movedItem);
      return next;
    });
    setDraggedPhotoIndex(null);
    setSelectedPhotoIndex(null);
  };

  // Turn-Based Joined Users Queue State
  const currentUserAvatar = userImage || `https://api.dicebear.com/7.x/adventurer/svg?seed=${userName}&backgroundColor=F9EBD8`;
  const [joinedUsers, setJoinedUsers] = useState<PhotoboothUser[]>([
    { name: userName, avatar: currentUserAvatar, status: 'joined' }
  ]);
  const [isInviteOpen, setIsInviteOpen] = useState(false);
  const [activeShotIndex, setActiveShotIndex] = useState<number | null>(null);
  const isHostRef = useRef<boolean>(true);

  // Keep creator's entry synchronized with logged-in user profile
  useEffect(() => {
    if (!userName) return;
    const currentAvatar = userImage || `https://api.dicebear.com/7.x/adventurer/svg?seed=${userName}&backgroundColor=F9EBD8`;
    setJoinedUsers(prev => {
      const others = prev.filter(u => u.name !== userName && u.name !== 'User' && u.name !== 'You');
      const myEntry: PhotoboothUser = {
        name: userName,
        avatar: currentAvatar,
        status: 'joined'
      };
      return [myEntry, ...others];
    });
  }, [userName, userImage]);

  // Available Friends for Invitation
  const availableFriends = React.useMemo(() => {
    const list: Array<{ name: string; avatar: string; email?: string }> = [];
    friendsList.forEach(f => {
      if (f.name?.toLowerCase() !== userName?.toLowerCase() && !list.some(item => item.name.toLowerCase() === f.name.toLowerCase())) {
        list.push({
          name: f.name,
          email: (f as any).email,
          avatar: f.avatar || `https://api.dicebear.com/7.x/adventurer/svg?seed=${f.seed || f.name}&backgroundColor=${f.color || 'A577FF'}`
        });
      }
    });

    // Default mock friends if list is empty
    if (list.length === 0) {
      list.push(
        { name: 'Luna', avatar: 'https://api.dicebear.com/7.x/adventurer/svg?seed=Luna&backgroundColor=F9EBD8' },
        { name: 'Jasper', avatar: 'https://api.dicebear.com/7.x/adventurer/svg?seed=Jasper&backgroundColor=F9EBD8' },
        { name: 'Mimi', avatar: 'https://api.dicebear.com/7.x/adventurer/svg?seed=Mimi&backgroundColor=8CC6C5' },
        { name: 'Felix', avatar: 'https://api.dicebear.com/7.x/adventurer/svg?seed=Felix&backgroundColor=F2C8F7' }
      );
    }
    return list;
  }, [friendsList, userName]);

  // Turn calculation: next taker rotates based on ready (joined) users!
  const readyUsers = joinedUsers.filter(u => u.status === 'joined');
  const activeUsers = readyUsers.length > 0 ? readyUsers : joinedUsers;

  const currentTurnIndex = activeShotIndex !== null 
    ? (activeShotIndex % activeUsers.length)
    : (capturedPhotos.length % activeUsers.length);
  const currentTurnUser = activeUsers[currentTurnIndex] || activeUsers[0];
  const nextTurnUser = activeUsers[(currentTurnIndex + 1) % activeUsers.length] || activeUsers[0];
  const isMyTurn = currentTurnUser.name === userName;

  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const toastTimerRef = useRef<NodeJS.Timeout | null>(null);
  const lastLeaveToastTimeRef = useRef<number>(0);
  const lastLeaveToastMsgRef = useRef<string>('');
  const broadcastChannelRef = useRef<BroadcastChannel | null>(null);
  const syncSessionRef = useRef<(() => void) | null>(null);
  const lastPartnerNameRef = useRef<string | null>(null);

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
      broadcastChannelRef.current?.postMessage({ type, sender: userName, ...payload });
    } catch (e) {}
  }, [userName]);

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

  const userNameRef = useRef(userName);
  userNameRef.current = userName;
  const broadcastSyncRef = useRef(broadcastSync);
  broadcastSyncRef.current = broadcastSync;

  // Cleanup on unmount: if host, ensure the session is marked ended in the database
  useEffect(() => {
    return () => {
      if (isHostRef.current) {
        const partnerName = lastPartnerNameRef.current;
        try {
          fetch('/api/invitations', {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              action: 'end',
              partnerName: partnerName || undefined,
              senderName: userNameRef.current,
              type: 'photobooth',
              targetName: 'Photobooth'
            }),
            keepalive: true
          }).catch(() => {});
        } catch (e) {}

        try {
          broadcastSyncRef.current('SESSION_LEFT', { partnerName: partnerName || undefined, target: 'Photobooth' });
        } catch (e) {}
      }
    };
  }, []);

  // Sync initialFriend if joining from notification
  useEffect(() => {
    if (initialFriend) {
      isHostRef.current = false;
      lastPartnerNameRef.current = initialFriend.name;
      const friend = friendsList?.find(f => f.name.toLowerCase() === initialFriend.name.toLowerCase());
      const resolvedAvatar = initialFriend.avatar 
        || friend?.avatar 
        || (friend?.seed ? `https://api.dicebear.com/7.x/adventurer/svg?seed=${friend.seed}&backgroundColor=A577FF` : null)
        || `https://api.dicebear.com/7.x/adventurer/svg?seed=${initialFriend.name}&backgroundColor=A577FF`;

      setJoinedUsers(prev => {
        if (!prev.some(u => u.name.toLowerCase() === initialFriend.name.toLowerCase())) {
          return [...prev, {
            name: initialFriend.name,
            avatar: resolvedAvatar,
            status: 'joined'
          }];
        }
        return prev.map(u => u.name.toLowerCase() === initialFriend.name.toLowerCase()
          ? { ...u, avatar: resolvedAvatar, status: 'joined' }
          : u
        );
      });
      showToast(`Joined Photobooth with ${initialFriend.name}`, 3000);

      // Immediately inform database that we joined Photobooth
      fetch('/api/invitations', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          action: 'join', 
          partnerName: initialFriend.name, 
          senderName: userName, 
          type: 'photobooth', 
          targetName: 'Photobooth',
          status: 'accepted'
        }),
        keepalive: true
      })
      .then(() => {
        broadcastSync('SESSION_JOINED', { partnerName: initialFriend.name, target: 'Photobooth' });
      })
      .catch(e => {});

      if (onConsumeInitialFriend) {
        onConsumeInitialFriend();
      }
    }
  }, [initialFriend, userName, friendsList, onConsumeInitialFriend, showToast, broadcastSync]);

  // Active Photobooth session sync (handles join, partner leave, host session end in real-time)
  useEffect(() => {
    const syncSession = () => {
      fetch(`/api/invitations?username=${encodeURIComponent(userName || '')}`)
        .then(res => res.json())
        .then(res => {
          if (!res.success) return;

          const session = res.activePhotoboothSession;

          if (session) {
            isHostRef.current = !!session.isHost;

            if (session.status === 'accepted') {
              // Both users are joined!
              lastPartnerNameRef.current = session.partnerName;
              setJoinedUsers(prev => {
                const friend = friendsList?.find(f => f.name.toLowerCase() === session.partnerName.toLowerCase());
                const resolvedAvatar = session.partnerImage 
                  || friend?.avatar 
                  || (friend?.seed ? `https://api.dicebear.com/7.x/adventurer/svg?seed=${friend.seed}&backgroundColor=A577FF` : null)
                  || `https://api.dicebear.com/7.x/adventurer/svg?seed=${session.partnerName}&backgroundColor=A577FF`;

                const exists = prev.find(u => u.name.toLowerCase() === session.partnerName.toLowerCase());
                if (!exists) {
                  showToast(`${session.partnerName} joined Photobooth!`, 3000);
                  return [...prev, {
                    name: session.partnerName,
                    avatar: resolvedAvatar,
                    status: 'joined'
                  }];
                } else if (exists.status !== 'joined' || exists.avatar !== resolvedAvatar) {
                  if (exists.status !== 'joined') {
                    showToast(`${session.partnerName} accepted! Joined Photobooth`, 3000);
                  }
                  return prev.map(u => u.name.toLowerCase() === session.partnerName.toLowerCase() 
                    ? { ...u, avatar: resolvedAvatar, status: 'joined' } 
                    : u
                  );
                }
                return prev;
              });
            } else if (session.status === 'active') {
              // Host is in session, but partner left
              setJoinedUsers(prev => {
                const partnerUser = prev.find(u => u.name.toLowerCase() === session.partnerName.toLowerCase());
                if (partnerUser) {
                  if (partnerUser.status === 'joined') {
                    showLeaveToastOnce(`${session.partnerName} left Photobooth`);
                  }
                  // Remove partner completely from joinedUsers so partner's avatar does not remain
                  return prev.filter(u => u.name.toLowerCase() !== session.partnerName.toLowerCase());
                }
                return prev;
              });
            }
          } else {
            // Session expired or host ended
            setJoinedUsers(prev => {
              const otherUsers = prev.filter(u => u.name !== userName);
              if (otherUsers.length > 0) {
                showLeaveToastOnce(`Photobooth session ended`);
                return prev.filter(u => u.name === userName);
              }
              return prev;
            });
          }
        })
        .catch(err => console.error("Error syncing photobooth session:", err));
    };

    syncSessionRef.current = syncSession;
    syncSession();
    const interval = setInterval(syncSession, 800);
    return () => clearInterval(interval);
  }, [userName, friendsList, showToast, showLeaveToastOnce]);

  const handleInviteFriend = (friend: { name: string; avatar: string; email?: string }) => {
    if (joinedUsers.some(u => u.name.toLowerCase() === friend.name.toLowerCase())) return;
    setIsInviteOpen(false);

    isHostRef.current = true;
    lastPartnerNameRef.current = friend.name;
    // 1. Add friend with status 'pending' (blinking/pulsing like Listening Together)
    setJoinedUsers(prev => [...prev, { name: friend.name, avatar: friend.avatar, status: 'pending' }]);

    // Send persistent invitation to Supabase PostgreSQL
    fetch('/api/invitations', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        receiverName: friend.name,
        receiverEmail: friend.email,
        senderName: userName,
        type: 'photobooth',
        targetName: 'Photobooth'
      })
    })
    .then(() => {
      broadcastSync('INVITE_SENT', { receiverName: friend.name, target: 'Photobooth' });
    })
    .catch(err => console.error("Error sending photobooth invitation:", err));

    // For built-in mock bots only
    const isMockBot = ['Luna', 'Jasper', 'Mimi', 'Felix', 'Oscar', 'Aneka'].includes(friend.name) && !friendsList.some(f => f.name.toLowerCase() === friend.name.toLowerCase() && (f as any).isRealFriend);
    if (isMockBot) {
      setTimeout(() => {
        setJoinedUsers(prev => prev.map(u => u.name === friend.name ? { ...u, status: 'joined' } : u));
      }, 3500);
    }
  };

  const handleExitPhotobooth = () => {
    const partner = joinedUsers.find(u => u.name !== userName);
    const partnerName = partner?.name || lastPartnerNameRef.current;
    const isHost = isHostRef.current;
    lastLeaveToastTimeRef.current = Date.now();
    showToast("Left Photobooth", 3000);

    fetch('/api/invitations', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        action: isHost ? 'end' : 'leave',
        partnerName: partnerName || undefined,
        senderName: userName,
        type: 'photobooth',
        targetName: 'Photobooth'
      }),
      keepalive: true
    })
    .then(() => {
      broadcastSync('SESSION_LEFT', { partnerName: partnerName || undefined, target: 'Photobooth' });
    })
    .catch(e => {});

    if (onLeaveSession) onLeaveSession();
    onGoHome();
  };

  // Request Camera Access on Mount
  useEffect(() => {
    startCamera();

    return () => {
      stopCamera();
    };
  }, []);

  // Ensure camera stream is attached and playing whenever stream becomes available
  useEffect(() => {
    if (videoRef.current && cameraStream) {
      videoRef.current.srcObject = cameraStream;
      videoRef.current.play().catch(() => {});
    }
  }, [cameraStream]);

  const stopCamera = () => {
    if (cameraStream) {
      cameraStream.getTracks().forEach(track => track.stop());
      setCameraStream(null);
    }
  };

  const startCamera = async (deviceId?: string) => {
    stopCamera();
    setCameraStatus('requesting');
    setCameraErrorMsg('');

    try {
      const constraints: MediaStreamConstraints = {
        video: deviceId 
          ? { deviceId: { exact: deviceId } } 
          : { facingMode: 'user', width: { ideal: 1280 }, height: { ideal: 720 } },
        audio: false
      };

      const stream = await navigator.mediaDevices.getUserMedia(constraints);
      setCameraStream(stream);
      setCameraStatus('ready');

      if (videoRef.current) {
        videoRef.current.srcObject = stream;
      }

      // Enumerate camera devices
      const devices = await navigator.mediaDevices.enumerateDevices();
      const videoDevs = devices.filter(d => d.kind === 'videoinput');
      setCameraDevices(videoDevs);
      if (videoDevs.length > 0 && !deviceId) {
        setSelectedDeviceId(videoDevs[0].deviceId);
      }
    } catch (err: any) {
      console.error('Camera access error:', err);
      if (err.name === 'NotAllowedError' || err.name === 'PermissionDeniedError') {
        setCameraStatus('denied');
        setCameraErrorMsg('Camera access was blocked. Please allow camera permissions in your browser address bar.');
      } else {
        setCameraStatus('error');
        setCameraErrorMsg('Unable to access webcam. Please check device connection or upload photos directly.');
      }
    }
  };

  // Change camera device
  const handleDeviceChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const devId = e.target.value;
    setSelectedDeviceId(devId);
    startCamera(devId);
  };

  // Handle uploading photos manually
  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    Array.from(files).forEach((file) => {
      const reader = new FileReader();
      reader.onload = (event) => {
        if (event.target?.result) {
          setCapturedPhotos(prev => {
            if (prev.length < selectedLayout.cuts) {
              const taker = joinedUsers[prev.length % joinedUsers.length] || joinedUsers[0];
              return [...prev, { src: event.target!.result as string, taker }];
            }
            return prev;
          });
        }
      };
      reader.readAsDataURL(file);
    });
  };

  // Capture single photo from user's live video stream (with distinct Flash On/Off lighting)
  const snapSinglePhoto = (): string | null => {
    if (!videoRef.current) return null;
    const video = videoRef.current;

    // Safety validation: Ensure video stream has active frames and dimensions
    if (!video.videoWidth || !video.videoHeight || video.readyState < 2) {
      return null;
    }

    const canvas = document.createElement('canvas');
    canvas.width = video.videoWidth || 1280;
    canvas.height = video.videoHeight || 720;
    const ctx = canvas.getContext('2d');
    if (!ctx) return null;

    // Apply Mirror (reads isMirrorRef.current for instantaneous response)
    if (isMirrorRef.current) {
      ctx.translate(canvas.width, 0);
      ctx.scale(-1, 1);
    }

    // Apply Filter & Flash difference (reads isFlashOnRef.current for instantaneous response)
    const activeFlash = isFlashOnRef.current;
    if (activeFlash) {
      // FLASH ON: Bright studio lighting exposure + pop contrast + slight saturation
      const baseFilter = selectedFilter.id !== 'normal' ? selectedFilter.filter : '';
      const flashFilter = 'brightness(1.22) contrast(1.15) saturate(1.08)';
      ctx.filter = baseFilter ? `${baseFilter} ${flashFilter}` : flashFilter;
    } else {
      // FLASH OFF: Natural ambient room lighting (authentic softer tone)
      if (selectedFilter.id !== 'normal') {
        ctx.filter = selectedFilter.filter;
      } else {
        ctx.filter = 'none';
      }
    }

    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
    ctx.filter = 'none';

    // When FLASH IS ON: Apply realistic strobe flash center highlight!
    if (activeFlash) {
      ctx.save();
      const radialGrad = ctx.createRadialGradient(
        canvas.width / 2, canvas.height * 0.45, 60,
        canvas.width / 2, canvas.height * 0.45, canvas.width * 0.75
      );
      radialGrad.addColorStop(0, 'rgba(255, 255, 255, 0.28)');
      radialGrad.addColorStop(0.4, 'rgba(255, 255, 255, 0.12)');
      radialGrad.addColorStop(0.8, 'rgba(255, 255, 255, 0.02)');
      radialGrad.addColorStop(1, 'rgba(0, 0, 0, 0.12)');
      ctx.globalCompositeOperation = 'screen';
      ctx.fillStyle = radialGrad;
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      ctx.restore();

      // Trigger Bright White Flash Animation on screen
      setShowFlashOverlay(true);
      setTimeout(() => setShowFlashOverlay(false), 260);
    } else {
      // When FLASH IS OFF: Subtle dark shutter blink, no white flash!
      setShowShutterBlink(true);
      setTimeout(() => setShowShutterBlink(false), 80);
    }

    return canvas.toDataURL('image/jpeg', 0.95);
  };

  // Generate camera snapshot for friend's turn ("hasil jepretan orang berikutnya")
  const generateFriendPhoto = (
    friend: { name: string; avatar: string },
    filter: FilterEffect,
    withFlash: boolean
  ): Promise<string> => {
    return new Promise((resolve) => {
      const canvas = document.createElement('canvas');
      canvas.width = 1280;
      canvas.height = 720;
      const ctx = canvas.getContext('2d');
      if (!ctx) return resolve(friend.avatar);

      // 1. Cozy backdrop gradient
      const bgGrad = ctx.createLinearGradient(0, 0, canvas.width, canvas.height);
      bgGrad.addColorStop(0, '#261642');
      bgGrad.addColorStop(0.5, '#1B0E33');
      bgGrad.addColorStop(1, '#110722');
      ctx.fillStyle = bgGrad;
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      // Atmospheric soft lighting
      const drawGlow = (x: number, y: number, r: number, color: string) => {
        ctx.save();
        const g = ctx.createRadialGradient(x, y, 0, x, y, r);
        g.addColorStop(0, color);
        g.addColorStop(1, 'transparent');
        ctx.fillStyle = g;
        ctx.beginPath();
        ctx.arc(x, y, r, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
      };
      drawGlow(320, 200, 250, 'rgba(165, 119, 255, 0.25)');
      drawGlow(960, 220, 280, 'rgba(255, 150, 180, 0.2)');
      drawGlow(640, 520, 300, 'rgba(112, 101, 212, 0.2)');

      // 2. Load friend's avatar image
      const img = new Image();
      img.crossOrigin = 'anonymous';
      img.onload = () => {
        const size = 380;
        const x = (canvas.width - size) / 2;
        const y = (canvas.height - size) / 2 - 25;

        // Draw portrait circle glow
        ctx.save();
        ctx.shadowColor = 'rgba(165, 119, 255, 0.5)';
        ctx.shadowBlur = 35;
        ctx.beginPath();
        ctx.arc(canvas.width / 2, y + size / 2, size / 2, 0, Math.PI * 2);
        ctx.fillStyle = 'rgba(255, 255, 255, 0.1)';
        ctx.fill();
        ctx.restore();

        // Clip & Draw avatar
        ctx.save();
        ctx.beginPath();
        ctx.arc(canvas.width / 2, y + size / 2, size / 2 - 6, 0, Math.PI * 2);
        ctx.clip();
        ctx.drawImage(img, x + 6, y + 6, size - 12, size - 12);
        ctx.restore();

        // White border ring
        ctx.save();
        ctx.lineWidth = 10;
        ctx.strokeStyle = '#FFFFFF';
        ctx.beginPath();
        ctx.arc(canvas.width / 2, y + size / 2, size / 2 - 6, 0, Math.PI * 2);
        ctx.stroke();
        ctx.restore();

        // Friend's Name Tag
        ctx.save();
        ctx.font = 'bold 36px sans-serif';
        ctx.fillStyle = '#FFFFFF';
        ctx.textAlign = 'center';
        ctx.shadowColor = 'rgba(0, 0, 0, 0.7)';
        ctx.shadowBlur = 12;
        ctx.fillText(`✨ ${friend.name}'s Pose ✨`, canvas.width / 2, y + size + 70);
        ctx.restore();

        // 3. Apply Filter if any
        if (filter.id !== 'normal') {
          const tempCanvas = document.createElement('canvas');
          tempCanvas.width = canvas.width;
          tempCanvas.height = canvas.height;
          const tempCtx = tempCanvas.getContext('2d');
          if (tempCtx) {
            tempCtx.drawImage(canvas, 0, 0);
            ctx.clearRect(0, 0, canvas.width, canvas.height);
            ctx.filter = filter.filter;
            ctx.drawImage(tempCanvas, 0, 0);
            ctx.filter = 'none';
          }
        }

        // 4. Apply Flash if On
        if (withFlash) {
          ctx.save();
          const flashGrad = ctx.createRadialGradient(
            canvas.width / 2, canvas.height / 2, 80,
            canvas.width / 2, canvas.height / 2, canvas.width * 0.75
          );
          flashGrad.addColorStop(0, 'rgba(255, 255, 255, 0.35)');
          flashGrad.addColorStop(0.5, 'rgba(255, 255, 255, 0.15)');
          flashGrad.addColorStop(1, 'rgba(0, 0, 0, 0.1)');
          ctx.globalCompositeOperation = 'screen';
          ctx.fillStyle = flashGrad;
          ctx.fillRect(0, 0, canvas.width, canvas.height);
          ctx.restore();
        }

        resolve(canvas.toDataURL('image/jpeg', 0.95));
      };

      img.onerror = () => {
        resolve(friend.avatar);
      };

      img.src = friend.avatar;
    });
  };

  // Start Multi-shot Capture Sequence
  // Turn rotation: joinedUsers[shotIndex % joinedUsers.length]
  // E.g., for 2 users [User, Jasper] and 4 cuts:
  // Shot 1 (index 0) -> User
  // Shot 2 (index 1) -> Jasper
  // Shot 3 (index 2) -> User (rotates back to the 1st person on 3rd shot!)
  // Shot 4 (index 3) -> Jasper
  const handleStartCaptureSequence = async () => {
    if (isCapturingSequence) return;
    setIsCapturingSequence(true);

    const neededPhotos = selectedLayout.cuts;
    const currentPhotos = [...capturedPhotos];

    for (let shotIndex = currentPhotos.length; shotIndex < neededPhotos; shotIndex++) {
      setActiveShotIndex(shotIndex);

      const taker = activeUsers[shotIndex % activeUsers.length] || activeUsers[0];
      const isTakerMyself = taker.name === userName;

      // Run countdown timer for this shot
      for (let sec = timerDuration; sec > 0; sec--) {
        setCountdown(sec);
        await new Promise(resolve => setTimeout(resolve, 1000));
      }
      setCountdown(null);

      // Snap the photo using the current live flash setting (reads isFlashOnRef.current)
      const liveFlash = isFlashOnRef.current;
      let photoData: string | null = null;

      if (isTakerMyself) {
        // Flash overlay or shutter blink for user
        if (liveFlash) {
          setShowFlashOverlay(true);
          setTimeout(() => setShowFlashOverlay(false), 260);
        } else {
          setShowShutterBlink(true);
          setTimeout(() => setShowShutterBlink(false), 80);
        }

        // Attempt live camera capture if webcam is ready
        if (cameraStatus === 'ready') {
          photoData = snapSinglePhoto();
        }

        // Graceful fallback to styled avatar pose if camera not available or returned blank
        if (!photoData) {
          photoData = await generateFriendPhoto(
            { name: userName, avatar: currentUserAvatar },
            selectedFilter,
            liveFlash
          );
        }
      } else {
        // Friend's turn: Flash / Shutter
        if (liveFlash) {
          setShowFlashOverlay(true);
          setTimeout(() => setShowFlashOverlay(false), 260);
        } else {
          setShowShutterBlink(true);
          setTimeout(() => setShowShutterBlink(false), 80);
        }

        photoData = await generateFriendPhoto(taker, selectedFilter, liveFlash);
      }

      if (photoData) {
        currentPhotos.push({ src: photoData, taker, hasFlash: liveFlash });
        setCapturedPhotos([...currentPhotos]);
      }

      // Small pause between shots if more shots remain
      if (shotIndex + 1 < neededPhotos) {
        await new Promise(resolve => setTimeout(resolve, 1200));
      }
    }

    setActiveShotIndex(null);
    setIsCapturingSequence(false);
  };

  // Retake all photos
  const handleRetakeAll = () => {
    setCapturedPhotos([]);
    setActiveShotIndex(null);
    setCountdown(null);
    setIsCapturingSequence(false);
    setSelectedPhotoIndex(null);
  };

  // Delete individual photo
  const handleDeletePhoto = (index: number) => {
    setCapturedPhotos(prev => prev.filter((_, i) => i !== index));
    if (selectedPhotoIndex === index) {
      setSelectedPhotoIndex(null);
    } else if (selectedPhotoIndex !== null && selectedPhotoIndex > index) {
      setSelectedPhotoIndex(selectedPhotoIndex - 1);
    }
  };

  // Export & Download Completed Photobooth Strip Canvas
  const handleDownloadStrip = () => {
    if (capturedPhotos.length === 0) return;

    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Dimensions for classic photo strip
    const stripWidth = 800;
    const padding = 36;
    const photoGap = 20;
    const footerHeight = 150;

    const availableWidth = stripWidth - padding * 2;
    const cols = selectedLayout.gridCols;
    const rows = Math.ceil(selectedLayout.cuts / cols);
    const photoWidth = (availableWidth - (cols - 1) * photoGap) / cols;
    const photoHeight = photoWidth * 0.75; // 4:3 ratio

    const totalHeight = padding * 2 + rows * photoHeight + (rows - 1) * photoGap + footerHeight;

    canvas.width = stripWidth;
    canvas.height = totalHeight;

    // Fill Frame Background
    ctx.fillStyle = selectedFrame.hex;
    ctx.fillRect(0, 0, stripWidth, totalHeight);

    // Draw Photos
    const imagesToLoad = capturedPhotos;
    let loadedCount = 0;
    const finalizeDownload = () => {
      // Draw Footer Watermark / Date / Title
      ctx.fillStyle = selectedFrame.id === 'black' || selectedFrame.id === 'dark-cozy' ? '#FFFFFF' : '#2D1B4E';
      ctx.textAlign = 'center';

      // Title
      ctx.font = 'bold 30px sans-serif';
      ctx.fillText('COZY PHOTOBOOTH', stripWidth / 2, totalHeight - 80);

      // Subtitle & Participants Date
      const participantNames = Array.from(new Set(capturedPhotos.map(p => p.taker.name))).join(' • ');
      ctx.font = '500 17px sans-serif';
      ctx.fillStyle = selectedFrame.id === 'black' || selectedFrame.id === 'dark-cozy' ? '#A1A1AA' : '#6B5782';
      ctx.fillText(`✨ ${participantNames || userName} | ${photoboothDate} ✨`, stripWidth / 2, totalHeight - 48);

      // Trigger download
      const link = document.createElement('a');
      link.download = `cozy-photobooth-${Date.now()}.png`;
      link.href = canvas.toDataURL('image/png');
      link.click();
    };

    imagesToLoad.forEach((item, idx) => {
      const img = new Image();
      img.crossOrigin = 'anonymous';
      img.onload = () => {
        const col = idx % cols;
        const row = Math.floor(idx / cols);
        const x = padding + col * (photoWidth + photoGap);
        const y = padding + row * (photoHeight + photoGap);

        // Draw photo with rounded corners clip
        ctx.save();
        ctx.beginPath();
        const r = 16;
        ctx.moveTo(x + r, y);
        ctx.arcTo(x + photoWidth, y, x + photoWidth, y + photoHeight, r);
        ctx.arcTo(x + photoWidth, y + photoHeight, x, y + photoHeight, r);
        ctx.arcTo(x, y + photoHeight, x, y, r);
        ctx.arcTo(x, y, x + photoWidth, y, r);
        ctx.closePath();
        ctx.clip();

        ctx.drawImage(img, x, y, photoWidth, photoHeight);
        ctx.restore();

        loadedCount++;
        if (loadedCount === imagesToLoad.length) {
          finalizeDownload();
        }
      };

      img.onerror = () => {
        loadedCount++;
        if (loadedCount === imagesToLoad.length) {
          finalizeDownload();
        }
      };
      img.src = item.src;
    });
  };

  return (
    <div className="flex flex-col h-full bg-[#0D0524] text-[#F5F7FC] relative overflow-hidden select-none animate-in fade-in duration-300">
      
      {/* ================= TOP NAVIGATION BAR (COZY THEME) ================= */}
      <div className="h-16 px-6 bg-[#150A35]/95 backdrop-blur-xl border-b border-white/5 flex items-center justify-between z-30 shrink-0">
        {/* Left: Title without '<' icon */}
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-[#A577FF] to-[#7065D4] flex items-center justify-center shadow-[0_0_15px_rgba(165,119,255,0.4)] shrink-0">
            <Camera size={19} className="text-white" />
          </div>
          <div>
            <h1 className="text-base font-bold text-[#F5F7FC] tracking-tight flex items-center gap-2">
              <span>Photobooth</span>
            </h1>
            <p className="text-[11px] text-gray-400 font-medium">Capture, filter & create aesthetic photo strips</p>
          </div>
        </div>

        {/* Right: User Icons, Invite Button & Exit Icon Button */}
        <div className="flex items-center gap-4 relative">
          
          {/* Listening Together Style: Overlapping User Avatars */}
          <div className="flex items-center gap-2.5">
            <div className="flex items-center -space-x-2">
              {joinedUsers.slice(0, 4).map((user, idx) => {
                const isPending = user.status === 'pending';
                const isCurrentTurn = isCapturingSequence && idx === currentTurnIndex;
                return (
                  <div 
                    key={idx} 
                    className="relative group/avatar" 
                    title={`${user.name} ${isPending ? '(Inviting...)' : `(Turn #${idx + 1})`}${idx === 0 ? ' • Creator' : ''}`}
                  >
                    <img 
                      src={user.avatar} 
                      alt={user.name} 
                      className={`w-9 h-9 rounded-full border-2 transition-all object-cover relative z-0 ${
                        isPending
                          ? 'animate-pulse opacity-70 ring-2 ring-yellow-400/80 border-yellow-400'
                          : isCurrentTurn
                          ? 'ring-2 ring-[#A577FF] scale-105 z-10 opacity-100 border-[#150A35]'
                          : 'opacity-100 border-[#150A35]'
                      }`}
                    />
                    {isPending ? (
                      <span className="absolute -top-1 -right-1 w-3 h-3 bg-yellow-400 border-2 border-[#150A35] rounded-full animate-ping z-20 pointer-events-none" />
                    ) : (
                      <span className="absolute -bottom-1 -right-1 text-[8px] font-black px-1 rounded-full border border-white/10 bg-[#1E123F] text-[#C4A6FF]">
                        #{idx + 1}
                      </span>
                    )}
                  </div>
                );
              })}
              {joinedUsers.length > 4 && (
                <div 
                  className="w-8 h-8 rounded-full bg-[#251A45] border-2 border-[#150A35] flex items-center justify-center text-[10px] font-bold text-gray-300 shadow-md"
                  title={`${joinedUsers.length - 4} more`}
                >
                  +{joinedUsers.length - 4}
                </div>
              )}
            </div>

            {/* Invite Button */}
            <div className="relative">
              <button
                onClick={() => setIsInviteOpen(!isInviteOpen)}
                className="flex items-center gap-1.5 bg-white/5 hover:bg-[#A577FF]/20 border border-white/10 hover:border-[#A577FF]/40 text-gray-200 hover:text-white px-3 py-1.5 rounded-full text-xs font-bold transition-all shadow-sm active:scale-95 cursor-pointer"
                title="Invite friends to Photobooth session"
              >
                <UserPlus size={13} className="text-[#A577FF]" />
                <span>Invite</span>
              </button>

              {/* Friends Invite Dropdown Popup */}
              {isInviteOpen && (
                <>
                  <div className="fixed inset-0 z-40" onClick={() => setIsInviteOpen(false)} />
                  <div 
                    className="absolute top-11 right-0 w-72 bg-[#1B0F38] border border-white/10 rounded-2xl p-3.5 shadow-[0_10px_40px_rgba(0,0,0,0.8)] z-50 animate-in fade-in zoom-in-95 space-y-2.5 select-none"
                    onClick={(e) => e.stopPropagation()}
                  >
                    <div className="flex items-center justify-between pb-2 border-b border-white/10">
                      <span className="text-xs font-bold text-white flex items-center gap-1.5">
                        <Users size={14} className="text-[#A577FF]" />
                        <span>Invite Friends</span>
                      </span>
                      <span className="text-[10px] font-semibold text-[#C4A6FF]">
                        Next Turn: #{joinedUsers.length + 1}
                      </span>
                    </div>

                    <div className="max-h-56 overflow-y-auto custom-scrollbar space-y-1 pr-1">
                      {availableFriends.map((f, i) => {
                        const isJoined = joinedUsers.some(u => u.name === f.name);
                        return (
                          <div key={i} className="flex items-center justify-between p-2 hover:bg-white/5 rounded-xl transition-colors">
                            <div className="flex items-center gap-2.5 min-w-0">
                              <img src={f.avatar} alt={f.name} className="w-7 h-7 rounded-full border border-white/10 object-cover shrink-0" />
                              <span className="text-xs font-semibold text-gray-200 truncate">{f.name}</span>
                            </div>
                            <button
                              disabled={isJoined}
                              onClick={() => handleInviteFriend(f)}
                              className={`text-[10px] px-3 py-1 rounded-full font-bold transition-all shrink-0 ${
                                isJoined 
                                  ? 'bg-green-500/20 text-green-400 cursor-default flex items-center gap-1' 
                                  : 'bg-gradient-to-r from-[#A577FF] to-[#7065D4] hover:from-[#B58FFF] hover:to-[#857AE6] text-white cursor-pointer shadow-sm active:scale-95'
                              }`}
                            >
                              {isJoined ? (
                                <>
                                  <Check size={11} strokeWidth={3} /> Joined
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
          </div>

          {/* Exit Icon Button (Replaces Text "Exit") */}
          <button 
            onClick={handleExitPhotobooth}
            className="w-9 h-9 rounded-xl bg-red-500/10 hover:bg-red-500 text-red-400 hover:text-white flex items-center justify-center border border-red-500/20 transition-all cursor-pointer group/exit shadow-sm shrink-0"
            title="Exit Photobooth"
          >
            <LogOut size={16} className="group-hover/exit:-translate-x-0.5 transition-transform" />
          </button>
        </div>
      </div>

      {/* ================= 4-COLUMN MAIN LAYOUT (COZY THEME) ================= */}
      <div className="flex-1 flex overflow-hidden min-h-0 bg-[#0D0524]">
        
        {/* ================= 1. LEFT COLUMN: COLLAGE LAYOUT ================= */}
        <div className="w-64 bg-[#150A35] border-r border-white/5 p-5 flex flex-col gap-5 overflow-y-auto custom-scrollbar shrink-0 shadow-sm">
          <div>
            <div className="flex items-center gap-2 text-xs font-bold text-[#F5F7FC] uppercase tracking-wider mb-3">
              <Layout size={15} className="text-[#A577FF]" />
              <span>Collage Layout</span>
            </div>
            <p className="text-[11px] text-gray-400 mb-3">Select photo strip format:</p>

            <div className="space-y-2">
              {COLLAGE_LAYOUTS.map((layout) => (
                <div 
                  key={layout.id}
                  onClick={() => {
                    setSelectedLayout(layout);
                    if (capturedPhotos.length > layout.cuts) {
                      setCapturedPhotos(prev => prev.slice(0, layout.cuts));
                    }
                  }}
                  className={`p-3 rounded-2xl border transition-all cursor-pointer flex items-center justify-between ${
                    selectedLayout.id === layout.id 
                      ? 'border-[#A577FF] bg-[#A577FF]/15 shadow-[0_0_15px_rgba(165,119,255,0.2)] text-white' 
                      : 'border-white/5 bg-white/[0.03] hover:border-white/15 hover:bg-white/[0.06] text-gray-300'
                  }`}
                >
                  <div>
                    <h4 className="text-xs font-bold">{layout.name}</h4>
                    <span className="text-[10px] text-gray-400">{layout.desc}</span>
                  </div>
                  <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                    selectedLayout.id === layout.id 
                      ? 'bg-[#A577FF] text-white shadow-xs' 
                      : 'bg-white/10 text-gray-400'
                  }`}>
                    {layout.cuts} Cuts
                  </span>
                </div>
              ))}
            </div>
          </div>

          {/* Frame Color Selection */}
          <div className="pt-4 border-t border-white/5">
            <div className="flex items-center gap-2 text-xs font-bold text-[#F5F7FC] uppercase tracking-wider mb-2.5">
              <Palette size={15} className="text-[#A577FF]" />
              <span>Frame Color</span>
            </div>
            <div className="grid grid-cols-4 gap-2">
              {FRAME_COLORS.map((frame) => (
                <div 
                  key={frame.id}
                  onClick={() => setSelectedFrame(frame)}
                  className={`aspect-square rounded-xl ${frame.bg} border cursor-pointer transition-all flex items-center justify-center shadow-xs ${
                    selectedFrame.id === frame.id 
                      ? 'ring-2 ring-[#A577FF] scale-105 border-transparent shadow-[0_0_12px_rgba(165,119,255,0.4)]' 
                      : 'border-white/10 hover:scale-102'
                  }`}
                  title={frame.name}
                >
                  {selectedFrame.id === frame.id && (
                    <Check size={14} className={frame.id === 'black' || frame.id === 'dark-cozy' ? 'text-white' : 'text-[#150A35]'} strokeWidth={3} />
                  )}
                </div>
              ))}
            </div>
          </div>

          {/* Date Label on Frame */}
          <div className="pt-4 border-t border-white/5">
            <label className="text-[11px] font-bold text-gray-400 block mb-1.5">Date / Strip Text</label>
            <input 
              type="text"
              value={photoboothDate}
              onChange={(e) => setPhotoboothDate(e.target.value)}
              className="w-full bg-white/5 border border-white/10 rounded-xl px-3 py-2 text-xs text-white placeholder-gray-500 focus:outline-none focus:border-[#A577FF] transition-colors"
              placeholder="e.g. 2026.10.13"
            />
          </div>
        </div>

        {/* ================= 2. SECOND COLUMN: FILTER EFFECTS ================= */}
        <div className="w-56 bg-[#150A35] border-r border-white/5 p-5 flex flex-col gap-3 overflow-y-auto custom-scrollbar shrink-0 shadow-sm">
          <div className="flex items-center gap-2 text-xs font-bold text-[#F5F7FC] uppercase tracking-wider mb-1">
            <Sparkles size={15} className="text-[#A577FF]" />
            <span>Filter Effects</span>
          </div>
          <p className="text-[11px] text-gray-400 mb-2">Live camera filters:</p>

          <div className="space-y-2">
            {FILTER_EFFECTS.map((effect) => (
              <div 
                key={effect.id}
                onClick={() => setSelectedFilter(effect)}
                className={`p-2.5 rounded-2xl border transition-all cursor-pointer flex items-center justify-between group ${
                  selectedFilter.id === effect.id 
                    ? 'border-[#A577FF] bg-[#A577FF]/15 shadow-[0_0_15px_rgba(165,119,255,0.2)] text-white' 
                    : 'border-white/5 bg-white/[0.03] hover:border-white/15 hover:bg-white/[0.06] text-gray-300'
                }`}
              >
                <div className="flex items-center gap-2.5 min-w-0">
                  <div 
                    className="w-7 h-7 rounded-lg bg-gradient-to-tr from-[#A577FF] to-pink-400 border border-white/20 shadow-xs shrink-0" 
                    style={{ filter: effect.filter }}
                  />
                  <div className="min-w-0">
                    <h5 className="text-xs font-bold truncate">{effect.name}</h5>
                    <span className="text-[10px] text-gray-400 block">{effect.tag}</span>
                  </div>
                </div>

                {selectedFilter.id === effect.id && (
                  <Check size={14} className="text-[#A577FF] shrink-0" strokeWidth={3} />
                )}
              </div>
            ))}
          </div>
        </div>

        {/* ================= 3. SISI TENGAH (VIEWPORT & KONTROL COZY STYLE) ================= */}
        <div className="flex-1 flex flex-col items-center justify-between py-6 px-4 bg-[#0D0524] overflow-y-auto custom-scrollbar min-h-0 relative">
          
          {/* Turn Order Header Indicator */}
          <div className="flex items-center gap-3 mb-2 shrink-0 flex-wrap justify-center">
            {/* Photo 1/3 Pill Indicator */}
            <div className="flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-[#1B0F38] border border-[#A577FF]/30 shadow-[0_0_15px_rgba(165,119,255,0.15)]">
              {capturedPhotos.length >= selectedLayout.cuts ? (
                <span className="text-xs font-bold text-green-400 flex items-center gap-1.5">
                  <Check size={13} strokeWidth={3} />
                  <span>All Photos Taken ({capturedPhotos.length}/{selectedLayout.cuts})</span>
                </span>
              ) : (
                <>
                  <span className="text-[11px] font-medium text-gray-400">
                    Photo {(isCapturingSequence && activeShotIndex !== null ? activeShotIndex : capturedPhotos.length) + 1}/{selectedLayout.cuts} • Turn:
                  </span>
                  <div className="flex items-center gap-1.5">
                    <img 
                      src={currentTurnUser.avatar} 
                      alt={currentTurnUser.name} 
                      className="w-5 h-5 rounded-full object-cover ring-2 ring-[#A577FF]" 
                    />
                    <span className="text-xs font-bold text-white">{currentTurnUser.name}</span>
                    <span className="text-[9px] bg-[#A577FF]/25 text-[#C4A6FF] px-1.5 py-0.2 rounded-full font-bold">
                      #{currentTurnIndex + 1}
                    </span>
                  </div>
                </>
              )}
            </div>

            {/* Next turn cue if multiple people joined & sequence in progress */}
            {activeUsers.length > 1 && capturedPhotos.length < selectedLayout.cuts && (
              <div className="hidden sm:flex items-center gap-1.5 text-[10px] text-gray-400 bg-white/5 border border-white/5 px-2.5 py-1 rounded-full">
                <span>Next:</span>
                <img src={nextTurnUser.avatar} className="w-3.5 h-3.5 rounded-full object-cover" />
                <span className="text-gray-200 font-semibold">{nextTurnUser.name}</span>
              </div>
            )}
          </div>

          {/* Top Control Bar: Camera Dropdown, Upload Image, Timer Dropdown */}
          <div className="flex items-center gap-2.5 mb-3 shrink-0 flex-wrap justify-center">
            {/* Camera Select Dropdown */}
            <div className="relative">
              <select 
                value={selectedDeviceId}
                onChange={handleDeviceChange}
                className="bg-[#1B0F38] border border-white/10 text-gray-200 text-[11px] font-medium rounded-xl px-3 py-1.5 pr-7 focus:outline-none focus:border-[#A577FF] shadow-sm appearance-none cursor-pointer"
              >
                {cameraDevices.length > 0 ? (
                  cameraDevices.map((dev, i) => (
                    <option key={dev.deviceId || i} value={dev.deviceId} className="bg-[#1B0F38] text-white">
                      {dev.label || `Camera ${i + 1}`}
                    </option>
                  ))
                ) : (
                  <option value="" className="bg-[#1B0F38] text-white">USB2.0 HD UVC WebCam</option>
                )}
              </select>
              <ChevronDown size={13} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
            </div>

            {/* Upload Image Button */}
            <input 
              type="file"
              ref={fileInputRef}
              accept="image/*"
              multiple
              className="hidden"
              onChange={handleFileUpload}
            />
            <button 
              onClick={() => fileInputRef.current?.click()}
              className="flex items-center gap-1.5 bg-[#1B0F38] hover:bg-[#251A45] border border-white/10 text-gray-200 text-[11px] font-medium px-3 py-1.5 rounded-xl shadow-sm transition-all cursor-pointer"
            >
              <Upload size={12} className="text-[#A577FF]" />
              <span>Upload Image</span>
            </button>

            {/* Timer Dropdown */}
            <div className="relative">
              <select 
                value={timerDuration}
                onChange={(e) => setTimerDuration(Number(e.target.value))}
                className="bg-[#1B0F38] border border-white/10 text-gray-200 text-[11px] font-medium rounded-xl px-2.5 py-1.5 pr-6 focus:outline-none focus:border-[#A577FF] shadow-sm appearance-none cursor-pointer"
              >
                <option value={3} className="bg-[#1B0F38] text-white">3s</option>
                <option value={5} className="bg-[#1B0F38] text-white">5s</option>
                <option value={10} className="bg-[#1B0F38] text-white">10s</option>
              </select>
              <ChevronDown size={13} className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
            </div>
          </div>

          {/* Camera Frame Viewport (No fullscreen toggle) */}
          <div 
            className="relative rounded-[28px] overflow-hidden border-2 border-white/10 bg-black shadow-[0_10px_35px_rgba(0,0,0,0.8),0_0_25px_rgba(165,119,255,0.15)] flex items-center justify-center transition-all w-full max-w-[560px] aspect-[4/3] max-h-[440px]"
          >
            {/* Live Camera Video Feed (Permanently mounted to maintain continuous hardware stream) */}
            <video 
              ref={videoRef}
              autoPlay 
              playsInline 
              muted
              style={{
                transform: isMirror ? 'scaleX(-1)' : 'none',
                filter: selectedFilter.filter
              }}
              className={`absolute inset-0 w-full h-full object-cover transition-opacity duration-200 ${
                (!isCapturingSequence || isMyTurn) && cameraStatus === 'ready' 
                  ? 'opacity-100' 
                  : 'opacity-0 pointer-events-none'
              }`}
            />

            {/* Dark Viewport for Other User's Turn - ONLY actively shown while capturing sequence is running! */}
            {isCapturingSequence && !isMyTurn && (
              <div className="absolute inset-0 bg-[#070212] flex flex-col items-center justify-center p-6 text-center z-15 select-none">
                {/* Subtle ambient violet glow */}
                <div className="absolute w-72 h-72 rounded-full bg-[#A577FF]/10 blur-3xl pointer-events-none" />

                <div className="relative flex flex-col items-center z-20">
                  {/* Friend's Avatar with Glowing Ring and Timer Overlay */}
                  <div className="relative mb-4">
                    <img 
                      src={currentTurnUser.avatar} 
                      alt={currentTurnUser.name} 
                      className="w-24 h-24 rounded-full border-4 border-[#A577FF] object-cover shadow-[0_0_35px_rgba(165,119,255,0.5)] animate-pulse" 
                    />
                    {countdown !== null && (
                      <div className="absolute inset-0 rounded-full bg-[#150A35]/90 backdrop-blur-xs flex items-center justify-center border-2 border-white shadow-xl">
                        <span className="text-white text-4xl font-black">{countdown}</span>
                      </div>
                    )}
                  </div>

                  <div className="flex items-center gap-2 mb-1.5">
                    <span className="w-2.5 h-2.5 rounded-full bg-green-400 animate-ping" />
                    <h3 className="text-base font-bold text-white tracking-wide">
                      {currentTurnUser.name}'s Turn
                    </h3>
                  </div>

                  <p className="text-xs text-[#C4A6FF] font-medium max-w-xs mb-3">
                    {countdown !== null 
                      ? `${currentTurnUser.name} is posing at their camera (${countdown}s)...` 
                      : `Camera active on ${currentTurnUser.name}'s device`}
                  </p>

                  <div className="flex items-center gap-2 bg-white/5 border border-white/10 px-3.5 py-1.5 rounded-full text-[11px] text-gray-300">
                    <span>Private camera feed active on {currentTurnUser.name}'s device</span>
                  </div>
                </div>
              </div>
            )}

            {/* Camera Requesting Fallback - Centered */}
            {cameraStatus === 'requesting' && (
              <div className="absolute inset-0 flex flex-col items-center justify-center text-white p-6 text-center z-20">
                <RefreshCw size={32} className="text-[#A577FF] animate-spin mb-3" />
                <h4 className="font-bold text-sm">Connecting to Camera...</h4>
                <p className="text-xs text-gray-400 mt-1">Please allow camera access in your browser</p>
              </div>
            )}

            {/* Camera Access Required Fallback - DEAD CENTER */}
            {(cameraStatus === 'error' || cameraStatus === 'denied') && (
              <div className="absolute inset-0 flex flex-col items-center justify-center text-white p-6 text-center z-20">
                <div className="flex flex-col items-center justify-center max-w-sm">
                  <AlertCircle size={32} className="text-[#A577FF] mb-3" />
                  <h4 className="font-bold text-sm">Camera Access Required</h4>
                  <p className="text-xs text-gray-400 mt-1 mb-4">{cameraErrorMsg || 'Allow camera permissions to take live photos'}</p>
                  <div className="flex items-center gap-2">
                    <button 
                      onClick={() => startCamera()}
                      className="bg-gradient-to-r from-[#A577FF] to-[#7065D4] hover:from-[#B58FFF] hover:to-[#857AE6] text-white text-xs font-bold px-4 py-2 rounded-xl transition-all shadow-md cursor-pointer"
                    >
                      Grant Permission
                    </button>
                    <button 
                      onClick={() => fileInputRef.current?.click()}
                      className="bg-white/10 hover:bg-white/20 text-white text-xs font-bold px-4 py-2 rounded-xl transition-all cursor-pointer"
                    >
                      Upload Photo
                    </button>
                  </div>
                </div>
              </div>
            )}

            {/* Countdown Overlay for MY Turn */}
            {isMyTurn && countdown !== null && (
              <div className="absolute inset-0 flex items-center justify-center bg-black/40 z-20 pointer-events-none">
                <div className="w-24 h-24 rounded-full bg-[#150A35]/90 backdrop-blur-md border-2 border-[#A577FF] flex flex-col items-center justify-center shadow-[0_0_30px_rgba(165,119,255,0.6)] animate-in zoom-in-95">
                  <span className="text-white text-4xl font-black leading-none">{countdown}</span>
                  <div className="flex items-center gap-1 mt-1">
                    <img src={currentTurnUser.avatar} className="w-3.5 h-3.5 rounded-full object-cover" />
                    <span className="text-[9px] text-[#C4A6FF] font-bold truncate max-w-[65px]">{currentTurnUser.name}</span>
                  </div>
                </div>
              </div>
            )}

            {/* White Screen Flash Effect (When Flash is ON) */}
            {showFlashOverlay && (
              <div className="absolute inset-0 bg-white z-30 transition-opacity duration-200 pointer-events-none" />
            )}

            {/* Shutter Blink (When Flash is OFF) */}
            {showShutterBlink && (
              <div className="absolute inset-0 bg-black/60 z-30 transition-opacity duration-100 pointer-events-none" />
            )}
          </div>

          {/* Bottom Controls Bar (Mirror, START / Capturing... / Retake + DONE, Flash) */}
          <div className="flex items-center gap-3 mt-3 shrink-0">
            {/* Mirror Toggle Button */}
            <button 
              onClick={toggleMirror}
              className="bg-[#1B0F38] hover:bg-[#251A45] border border-white/10 text-gray-200 text-xs font-semibold px-5 py-2 rounded-full shadow-sm transition-all cursor-pointer active:scale-95"
            >
              Mirror: {isMirror ? 'On' : 'Off'}
            </button>

            {/* Main Action Buttons */}
            {capturedPhotos.length >= selectedLayout.cuts ? (
              // All photos taken -> Retake & DONE
              <div className="flex items-center gap-2">
                <button 
                  onClick={handleRetakeAll}
                  className="bg-white/10 hover:bg-white/15 border border-white/15 text-gray-200 text-xs font-bold px-6 py-2.5 rounded-full shadow-sm transition-all cursor-pointer active:scale-95"
                >
                  Retake
                </button>
                <button 
                  onClick={() => setIsPreviewStripModalOpen(true)}
                  className="bg-gradient-to-r from-[#A577FF] to-[#7065D4] hover:from-[#B58FFF] hover:to-[#857AE6] text-white text-xs font-bold px-7 py-2.5 rounded-full shadow-[0_0_20px_rgba(165,119,255,0.5)] transition-all cursor-pointer active:scale-95"
                >
                  DONE
                </button>
              </div>
            ) : isCapturingSequence ? (
              // Capturing in progress
              <button 
                disabled
                className="bg-white/15 text-gray-400 text-xs font-bold px-8 py-2.5 rounded-full shadow-xs cursor-not-allowed"
              >
                Capturing...
              </button>
            ) : (
              // Ready to Start
              <button 
                onClick={handleStartCaptureSequence}
                className="bg-gradient-to-r from-[#A577FF] to-[#7065D4] hover:from-[#B58FFF] hover:to-[#857AE6] text-white text-xs font-black tracking-wider uppercase px-9 py-2.5 rounded-full shadow-[0_0_20px_rgba(165,119,255,0.5)] transition-all cursor-pointer active:scale-95 flex items-center gap-2"
              >
                <span>START</span>
              </button>
            )}

            {/* Flash Toggle Button */}
            <button 
              onClick={toggleFlash}
              className={`text-xs font-semibold px-5 py-2 rounded-full shadow-sm transition-all cursor-pointer active:scale-95 ${
                isFlashOn 
                  ? 'bg-[#A577FF]/20 border border-[#A577FF]/50 text-[#C4A6FF] shadow-[0_0_12px_rgba(165,119,255,0.3)]' 
                  : 'bg-[#1B0F38] border border-white/10 text-gray-400'
              }`}
            >
              Flash: {isFlashOn ? 'On' : 'Off'}
            </button>
          </div>
        </div>

        {/* ================= 4. RIGHT COLUMN (PHOTO RESULTS WITH REORDERING & TAKER BADGE) ================= */}
        <div className="w-48 md:w-56 bg-[#150A35] border-l border-white/5 p-4 flex flex-col gap-3 overflow-y-auto custom-scrollbar shrink-0 select-none items-center">
          <div className="flex items-center justify-between w-full pb-2 border-b border-white/5">
            <span className="text-xs font-bold text-[#F5F7FC] uppercase tracking-wider">Photo Results</span>
            <span className="text-[11px] font-bold text-[#C4A6FF]">{capturedPhotos.length}/{selectedLayout.cuts}</span>
          </div>

          {/* Reordering helper hint */}
          {capturedPhotos.length > 1 && (
            <div className="w-full flex items-center justify-between text-[10px] bg-[#1B0F38] border border-[#A577FF]/20 px-2 py-1 rounded-lg text-[#C4A6FF]">
              <div className="flex items-center gap-1">
                <ArrowUpDown size={11} className="text-[#A577FF] shrink-0" />
                <span>Tap or drag to reorder</span>
              </div>
              {selectedPhotoIndex !== null && (
                <button 
                  onClick={() => setSelectedPhotoIndex(null)}
                  className="text-[9px] text-gray-400 hover:text-white underline cursor-pointer"
                >
                  Cancel
                </button>
              )}
            </div>
          )}

          {/* Active selection banner */}
          {selectedPhotoIndex !== null && (
            <div className="w-full text-center text-[10px] bg-[#A577FF]/20 border border-[#A577FF]/50 text-white font-semibold py-1 px-2 rounded-lg animate-pulse">
              Tap another photo to swap with #{selectedPhotoIndex + 1}
            </div>
          )}

          {/* Vertical Stack of Taken Photos */}
          <div className="flex flex-col gap-2.5 w-full items-center flex-1 overflow-y-auto custom-scrollbar">
            {capturedPhotos.length === 0 ? (
              <div className="flex-1 flex flex-col items-center justify-center text-center p-4 border-2 border-dashed border-white/10 rounded-2xl text-gray-400 w-full my-auto">
                <Camera size={26} className="text-[#A577FF]/60 mb-2" />
                <p className="text-xs font-semibold">No photos yet</p>
                <p className="text-[10px] text-gray-500 mt-1">Click START to take {selectedLayout.cuts} photos in turn</p>
              </div>
            ) : (
              capturedPhotos.map((item, index) => {
                const isSelected = selectedPhotoIndex === index;
                return (
                  <div 
                    key={index}
                    draggable
                    onDragStart={(e) => handleDragStart(e, index)}
                    onDragOver={handleDragOver}
                    onDrop={(e) => handleDrop(e, index)}
                    onClick={() => handlePhotoCardClick(index)}
                    className={`relative group w-40 aspect-[4/3] rounded-[18px] overflow-hidden border-2 bg-black shadow-lg shrink-0 transition-all cursor-pointer ${
                      isSelected 
                        ? 'border-[#A577FF] ring-4 ring-[#A577FF]/40 scale-102 shadow-[0_0_20px_rgba(165,119,255,0.5)]' 
                        : 'border-white/10 hover:border-[#A577FF]/60 hover:scale-101'
                    }`}
                    title={isSelected ? 'Selected - click another photo to swap' : 'Click to select and reorder'}
                  >
                    <img src={item.src} alt={`Snap ${index + 1}`} className="w-full h-full object-cover" />

                    {/* Order index badge */}
                    <div className="absolute top-1.5 left-1.5 bg-[#150A35]/90 backdrop-blur-xs border border-[#A577FF]/40 px-1.5 py-0.5 rounded-md flex items-center gap-1 text-[9px] font-black text-white shadow-md">
                      <span>#{index + 1}</span>
                    </div>

                    {/* Move Up & Move Down Arrow buttons */}
                    {capturedPhotos.length > 1 && (
                      <div className="absolute top-1.5 right-8 flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity z-10">
                        {index > 0 && (
                          <button 
                            onClick={(e) => handleMovePhoto(index, -1, e)}
                            className="w-5 h-5 rounded-md bg-[#251A45]/90 hover:bg-[#A577FF] text-white flex items-center justify-center transition-all cursor-pointer shadow-md"
                            title="Move photo up"
                          >
                            <ArrowUp size={10} />
                          </button>
                        )}
                        {index < capturedPhotos.length - 1 && (
                          <button 
                            onClick={(e) => handleMovePhoto(index, 1, e)}
                            className="w-5 h-5 rounded-md bg-[#251A45]/90 hover:bg-[#A577FF] text-white flex items-center justify-center transition-all cursor-pointer shadow-md"
                            title="Move photo down"
                          >
                            <ArrowDown size={10} />
                          </button>
                        )}
                      </div>
                    )}

                    {/* Taker badge indicating who took this shot */}
                    <div className="absolute bottom-1.5 left-1.5 bg-[#150A35]/85 backdrop-blur-xs border border-white/10 px-1.5 py-0.5 rounded-md flex items-center gap-1 text-[8px] font-bold text-white shadow-md">
                      <img src={item.taker.avatar} className="w-3 h-3 rounded-full object-cover" />
                      <span className="truncate max-w-[50px]">{item.taker.name}</span>
                    </div>

                    {/* Flash on/off badge */}
                    <div className="absolute bottom-1.5 right-1.5 bg-[#150A35]/85 backdrop-blur-xs border border-white/10 px-1.5 py-0.5 rounded-md text-[8px] font-bold shadow-md">
                      {item.hasFlash ? (
                        <span className="text-yellow-300 flex items-center gap-0.5">⚡ Flash</span>
                      ) : (
                        <span className="text-gray-300 flex items-center gap-0.5">🌙 Natural</span>
                      )}
                    </div>

                    {/* Selected Overlay label */}
                    {isSelected && (
                      <div className="absolute inset-0 bg-[#A577FF]/20 flex items-center justify-center pointer-events-none">
                        <span className="bg-[#150A35]/90 text-[#C4A6FF] text-[9px] font-bold px-2 py-0.5 rounded-full border border-[#A577FF] shadow-md animate-pulse">
                          Swap Selected
                        </span>
                      </div>
                    )}

                    {/* Delete button */}
                    <button 
                      onClick={(e) => {
                        e.stopPropagation();
                        handleDeletePhoto(index);
                      }}
                      className="absolute top-1.5 right-1.5 w-5 h-5 rounded-full bg-red-500/80 hover:bg-red-500 text-white flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity shadow-md cursor-pointer hover:scale-110 z-10"
                      title="Delete photo"
                    >
                      <X size={10} />
                    </button>
                  </div>
                );
              })
            )}
          </div>

          {/* Quick Action Buttons on Right Side */}
          {capturedPhotos.length > 0 && (
            <div className="w-full flex flex-col gap-2 mt-auto pt-2 border-t border-white/5">
              <button 
                onClick={() => setIsPreviewStripModalOpen(true)}
                className="w-full bg-gradient-to-r from-[#A577FF] to-[#7065D4] hover:from-[#B58FFF] hover:to-[#857AE6] text-white text-xs font-bold py-2.5 px-3 rounded-xl flex items-center justify-center gap-1.5 shadow-[0_0_15px_rgba(165,119,255,0.3)] transition-all cursor-pointer active:scale-95"
              >
                <Eye size={13} />
                <span>View Collage</span>
              </button>

              <button 
                onClick={handleDownloadStrip}
                className="w-full bg-white/5 hover:bg-white/10 border border-white/10 text-gray-200 text-xs font-bold py-2 px-3 rounded-xl flex items-center justify-center gap-1.5 transition-all cursor-pointer active:scale-95"
              >
                <Download size={13} />
                <span>Download</span>
              </button>
            </div>
          )}
        </div>

      </div>

      {/* ================= MODAL PREVIEW STRIP & DOWNLOAD (FITS 1 PAGE WITHOUT SCROLL) ================= */}
      {isPreviewStripModalOpen && (
        <div 
          className="fixed inset-0 z-50 flex items-center justify-center p-3 md:p-4 bg-black/80 backdrop-blur-md animate-in fade-in duration-200"
          onClick={() => setIsPreviewStripModalOpen(false)}
        >
          <div 
            className="bg-[#1B0F38] border border-white/10 text-white rounded-3xl p-5 shadow-2xl max-w-sm md:max-w-md w-full max-h-[92vh] flex flex-col items-center justify-between animate-in zoom-in-95 select-none relative overflow-hidden"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Modal Header */}
            <div className="w-full flex items-center justify-between pb-2.5 border-b border-white/10 shrink-0 mb-2">
              <h3 className="font-bold text-white text-sm flex items-center gap-2">
                <span className="text-[#A577FF]">📸</span>
                <span>Cozy Photobooth Strip</span>
              </h3>
              <button 
                onClick={() => setIsPreviewStripModalOpen(false)}
                className="text-gray-400 hover:text-white transition-colors cursor-pointer"
                title="Close"
              >
                <X size={18} />
              </button>
            </div>

            {/* Generated Photobooth Strip Preview - Formatted to fit 1 page without vertical scrolling */}
            <div className="flex-1 min-h-0 flex items-center justify-center w-full py-1 overflow-hidden">
              <div 
                className={`rounded-2xl shadow-2xl flex flex-col items-center border border-white/20 transition-all ${selectedFrame.bg} ${selectedFrame.text} ${
                  selectedLayout.gridCols > 1 ? 'px-3 py-2.5 max-w-[300px]' : 'px-3 py-2 max-w-[200px]'
                } w-full`}
                style={{ maxHeight: 'calc(86vh - 130px)' }}
              >
                {/* Photo Grid with Proportional Heights */}
                <div className={`w-full grid gap-1.5 ${selectedLayout.gridCols > 1 ? 'grid-cols-2' : 'grid-cols-1'}`}>
                  {capturedPhotos.slice(0, selectedLayout.cuts).map((item, i) => (
                    <div 
                      key={i} 
                      className={`w-full rounded-lg overflow-hidden border border-black/10 bg-black/5 shadow-inner relative flex items-center justify-center ${
                        selectedLayout.cuts === 1 
                          ? 'h-[36vh] max-h-[260px] aspect-[4/3]' 
                          : selectedLayout.cuts === 3
                          ? 'h-[14vh] max-h-[110px] aspect-[4/3]'
                          : selectedLayout.cuts === 4 && selectedLayout.gridCols === 1
                          ? 'h-[10.5vh] max-h-[82px] aspect-[4/3]'
                          : selectedLayout.cuts === 4 && selectedLayout.gridCols === 2
                          ? 'h-[15vh] max-h-[115px] aspect-[4/3]'
                          : 'h-[10.5vh] max-h-[82px] aspect-[4/3]'
                      }`}
                    >
                      <img src={item.src} alt={`Snap ${i + 1}`} className="w-full h-full object-cover" />
                    </div>
                  ))}
                </div>

                {/* Strip Footer */}
                <div className="text-center pt-2 pb-0.5 shrink-0">
                  <span className="font-black text-[11px] tracking-wider block">COZY PHOTOBOOTH</span>
                  <span className="text-[8px] opacity-75 font-semibold block mt-0.5 truncate max-w-[190px]">
                    ✨ {Array.from(new Set(capturedPhotos.map(p => p.taker.name))).join(' • ') || userName} • {photoboothDate} ✨
                  </span>
                </div>
              </div>
            </div>

            {/* Modal Action Buttons */}
            <div className="w-full flex items-center gap-2 pt-2.5 border-t border-white/10 shrink-0 mt-2">
              <button 
                onClick={handleDownloadStrip}
                className="flex-1 bg-gradient-to-r from-[#A577FF] to-[#7065D4] hover:from-[#B58FFF] hover:to-[#857AE6] text-white text-xs font-bold py-2.5 rounded-xl flex items-center justify-center gap-2 transition-all shadow-[0_0_20px_rgba(165,119,255,0.4)] cursor-pointer active:scale-95"
              >
                <Download size={14} />
                <span>Save / Download Strip</span>
              </button>
              <button 
                onClick={() => setIsPreviewStripModalOpen(false)}
                className="px-4 py-2.5 rounded-xl bg-white/10 hover:bg-white/15 text-gray-200 text-xs font-bold transition-colors cursor-pointer"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
