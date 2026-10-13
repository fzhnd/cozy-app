import React, { useState, useRef, useEffect } from 'react';
import { 
  Search, Phone, Pin, Paperclip, Camera, Image, Video, FileText, Headphones, 
  Link as LinkIcon, Trash2, XCircle, Send, Mic, Smile, MessageSquarePlus, 
  Play, Pause, Film, Music, ChevronDown, ChevronUp 
} from 'lucide-react';
import CallModal from './CallModal';

export default function ChatView({ 
  onUnreadCountChange, 
  initialActiveChat,
  initialCallOpen
}: { 
  onUnreadCountChange?: (count: number) => void;
  initialActiveChat?: string;
  initialCallOpen?: 'audio' | 'video' | false;
}) {
  const [isAttachmentOpen, setIsAttachmentOpen] = useState(false);
  const [isEmojiOpen, setIsEmojiOpen] = useState(false);
  const [inputText, setInputText] = useState('');
  const [isCallOpen, setIsCallOpen] = useState(!!initialCallOpen);
  const [initialVideoMode, setInitialVideoMode] = useState(initialCallOpen === 'video');
  const [isNewChatOpen, setIsNewChatOpen] = useState(false);
  const [expandedSharedCat, setExpandedSharedCat] = useState<string | null>(null);
  
  useEffect(() => {
    if (initialCallOpen) {
      setIsCallOpen(true);
      setInitialVideoMode(initialCallOpen === 'video');
    }
  }, [initialCallOpen]);
  
  const [voiceState, setVoiceState] = useState<'none' | 'recording' | 'paused'>('none');
  const [recordingTime, setRecordingTime] = useState(0);
  const [playingMessageId, setPlayingMessageId] = useState<number | null>(null);
  const [playbackProgress, setPlaybackProgress] = useState(0);
  const [previewProgress, setPreviewProgress] = useState(0);
  const animationRef = useRef<number | null>(null);

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<BlobPart[]>([]);
  const [recordedAudioUrl, setRecordedAudioUrl] = useState<string | null>(null);
  const currentAudioRef = useRef<HTMLAudioElement | null>(null);
  const [isPreviewPlaying, setIsPreviewPlaying] = useState(false);
  const previewAudioRef = useRef<HTMLAudioElement | null>(null);

  const requestMicrophone = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mediaRecorder = new MediaRecorder(stream);
      mediaRecorderRef.current = mediaRecorder;
      audioChunksRef.current = [];

      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          audioChunksRef.current.push(event.data);
        }
      };

      mediaRecorder.onstop = () => {
        const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
        const audioUrl = URL.createObjectURL(audioBlob);
        setRecordedAudioUrl(audioUrl);
        stream.getTracks().forEach(track => track.stop());
      };

      mediaRecorder.start();
      setVoiceState('recording');
      setRecordingTime(0);
    } catch (err) {
      alert('Microphone permission is required to record voice messages.');
    }
  };

  const handlePauseRecording = () => {
    setVoiceState('paused');
    if (mediaRecorderRef.current && mediaRecorderRef.current.state === 'recording') {
      mediaRecorderRef.current.stop();
    }
  };

  const handleCancelRecording = () => {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state === 'recording') {
      mediaRecorderRef.current.stop();
    }
    setVoiceState('none');
    setRecordingTime(0);
    setRecordedAudioUrl(null);
    setIsPreviewPlaying(false);
    previewAudioRef.current?.pause();
  };

  const startProgressLoop = (audio: HTMLAudioElement, setProgress: (p: number) => void, fallbackDuration: number) => {
    stopProgressLoop();
    animationRef.current = setInterval(() => {
      let dur = audio.duration;
      if (!dur || dur === Infinity || isNaN(dur)) dur = fallbackDuration;
      setProgress(Math.min(100, (audio.currentTime / (dur || 1)) * 100));
    }, 30) as any;
  };
  
  const stopProgressLoop = () => {
    if (animationRef.current) clearInterval(animationRef.current);
  };

  const togglePreviewPlay = () => {
    if (isPreviewPlaying) {
      previewAudioRef.current?.pause();
      setIsPreviewPlaying(false);
      stopProgressLoop();
    } else {
      if (!recordedAudioUrl) return;
      stopProgressLoop();
      const audio = new Audio(recordedAudioUrl);
      previewAudioRef.current = audio;
      setIsPreviewPlaying(true);
      setPreviewProgress(0);
      
      audio.onpause = stopProgressLoop;
      audio.onended = () => {
        setIsPreviewPlaying(false);
        setPreviewProgress(0);
        stopProgressLoop();
      };
      startProgressLoop(audio, setPreviewProgress, recordingTime);
      audio.play().catch(e => console.error(e));
    }
  };

  const togglePlayMessage = (m: any) => {
    if (playingMessageId === m.id) {
      currentAudioRef.current?.pause();
      setPlayingMessageId(null);
      stopProgressLoop();
      return;
    }
    if (currentAudioRef.current) {
      currentAudioRef.current.pause();
    }
    stopProgressLoop();
    
    if (!m.audioUrl) {
      setPlayingMessageId(m.id);
      return;
    }
    const audio = new Audio(m.audioUrl);
    currentAudioRef.current = audio;
    setPlayingMessageId(m.id);
    setPlaybackProgress(0);

    audio.onpause = stopProgressLoop;
    audio.onended = () => {
      setPlayingMessageId(null);
      setPlaybackProgress(0);
      stopProgressLoop();
    };
    startProgressLoop(audio, setPlaybackProgress, m.duration);
    audio.play().catch(e => {
      console.error(e);
      setPlayingMessageId(null);
    });
  };

  const requestCamera = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: true });
      stream.getTracks().forEach(track => track.stop());
      setIsAttachmentOpen(false);
      alert('Camera access granted! (Mockup)');
    } catch (err) {
      alert('Camera permission is required.');
    }
  };

  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (voiceState === 'recording') {
      interval = setInterval(() => {
        setRecordingTime(prev => prev + 1);
      }, 1000);
    }
    return () => clearInterval(interval);
  }, [voiceState]);

  useEffect(() => {
    return () => {
      stopProgressLoop();
      if (currentAudioRef.current) currentAudioRef.current.pause();
      if (previewAudioRef.current) previewAudioRef.current.pause();
    };
  }, []);

  const formatTime = (seconds: number) => {
    const m = Math.floor(seconds / 60).toString();
    const s = (seconds % 60).toString().padStart(2, '0');
    return `${m}:${s}`;
  };
  
  const [messagesByChat, setMessagesByChat] = useState<Record<string, any[]>>({
    'Luna': [
      { id: 1, text: 'Hey! Are you ready for the game tonight?', time: '12:28', isSelf: false },
      { id: 2, text: 'Sure, see you later!', time: '12:30', isSelf: true }
    ],
    'Jasper': [
      { id: 3, text: 'Are we still on for tonight?', time: '10:15', isSelf: false }
    ],
    'Mimi': [
      { id: 4, text: 'Sent an attachment', time: 'Yesterday', isSelf: false }
    ]
  });

  const [chats, setChats] = useState([
    { name: 'Luna', msg: 'Sure, see you later!', time: '12:30', seed: 'Luna', color: 'F9EBD8', pinned: false, lastUpdated: Date.now() - 1000, unreadCount: 0 },
    { name: 'Jasper', msg: 'Are we still on for tonight?', time: '10:15', seed: 'Jasper', color: '8CC6C5', pinned: false, lastUpdated: Date.now() - 2000, unreadCount: 1 },
    { name: 'Mimi', msg: 'Sent an attachment', time: 'Yesterday', seed: 'Mimi', color: 'F2C8F7', pinned: false, lastUpdated: Date.now() - 3000, unreadCount: 1 },
    { name: 'Felix', msg: 'Started a new chat', time: 'Just now', seed: 'Felix', color: 'A577FF', pinned: false, lastUpdated: Date.now() - 4000, unreadCount: 1 },
  ]);

  const [isLoaded, setIsLoaded] = useState(false);

  useEffect(() => {
    const savedMsgs = localStorage.getItem('cozyMessagesV2');
    if (savedMsgs) {
      try { setMessagesByChat(JSON.parse(savedMsgs)); } catch (e) {}
    }
    const savedChats = localStorage.getItem('cozyChatsV2');
    if (savedChats) {
      try { setChats(JSON.parse(savedChats)); } catch (e) {}
    }
    setIsLoaded(true);
  }, []);

  useEffect(() => {
    if (isLoaded) localStorage.setItem('cozyMessagesV2', JSON.stringify(messagesByChat));
  }, [messagesByChat, isLoaded]);

  const [activeChatName, setActiveChatName] = useState(initialActiveChat || 'Luna');
  
  useEffect(() => {
    if (initialActiveChat) setActiveChatName(initialActiveChat);
  }, [initialActiveChat]);
  const [emojiSearchText, setEmojiSearchText] = useState('');
  
  const [isChatSearchOpen, setIsChatSearchOpen] = useState(false);
  const [chatSearchQuery, setChatSearchQuery] = useState('');

  useEffect(() => {
    if (isLoaded) localStorage.setItem('cozyChatsV2', JSON.stringify(chats));
    
    // Notify parent about total unread count
    if (onUnreadCountChange) {
      const total = chats.reduce((acc, chat) => acc + (chat.name !== activeChatName && chat.unreadCount ? chat.unreadCount : 0), 0);
      onUnreadCountChange(total);
    }
  }, [chats, isLoaded, activeChatName, onUnreadCountChange]);

  const activeChat = chats.find(c => c.name === activeChatName) || chats[0];
  const activeMessages = messagesByChat[activeChat?.name] || [];

  const togglePin = () => {
    setChats(prev => prev.map(c => c.name === activeChatName ? { ...c, pinned: !c.pinned } : c));
  };

  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [activeMessages]);

  const updateChatInfo = (chatName: string, msg: string, time: string, isIncoming: boolean = false) => {
    setChats(prev => prev.map(c => {
      if (c.name === chatName) {
        return { 
          ...c, 
          msg, 
          time, 
          lastUpdated: Date.now(),
          unreadCount: (isIncoming && chatName !== activeChatName) ? (c.unreadCount || 0) + 1 : (c.unreadCount || 0)
        };
      }
      return c;
    }));
  };

  const handleCallEnd = (duration: number, answered: boolean) => {
    const timeStr = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    const logText = answered ? `Call ended (${formatTime(duration)})` : 'Missed call';
    
    const newMsg = {
      id: Date.now(),
      type: 'call_log',
      text: logText,
      duration,
      answered,
      time: timeStr,
      isSelf: true
    };

    setMessagesByChat(prev => ({
      ...prev,
      [activeChatName]: [...(prev[activeChatName] || []), newMsg]
    }));
    updateChatInfo(activeChatName, logText, timeStr);
  };

  const handleSendMessage = () => {
    if (voiceState !== 'none') {
      const finishAndSend = (url: string | null) => {
        const newMsg = {
          id: Date.now(),
          text: 'Voice message',
          type: 'voice',
          duration: recordingTime,
          audioUrl: url,
          time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
          isSelf: true
        };
        setMessagesByChat(prev => ({
          ...prev,
          [activeChatName]: [...(prev[activeChatName] || []), newMsg]
        }));
        updateChatInfo(activeChatName, 'Voice message', newMsg.time);
        setVoiceState('none');
        setRecordingTime(0);
        setRecordedAudioUrl(null);
        setIsPreviewPlaying(false);
      };

      const sendAsBase64 = () => {
        if (audioChunksRef.current.length === 0) {
          finishAndSend(null);
          return;
        }
        const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
        const reader = new FileReader();
        reader.readAsDataURL(audioBlob);
        reader.onloadend = () => {
          finishAndSend(reader.result as string);
        };
      };

      if (mediaRecorderRef.current && mediaRecorderRef.current.state === 'recording') {
        mediaRecorderRef.current.onstop = () => {
          mediaRecorderRef.current?.stream.getTracks().forEach(track => track.stop());
          sendAsBase64();
        };
        mediaRecorderRef.current.stop();
      } else {
        sendAsBase64();
      }
      return;
    }
    
    if (inputText.trim() !== '') {
      const sentText = inputText;
      const newMsg = {
        id: Date.now(),
        text: sentText,
        type: 'text',
        time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        isSelf: true
      };
      setMessagesByChat(prev => ({
        ...prev,
        [activeChatName]: [...(prev[activeChatName] || []), newMsg]
      }));
      updateChatInfo(activeChatName, sentText, newMsg.time);
      setInputText('');
      
      // Auto-reply to simulate incoming message
      setTimeout(() => {
        const replyTime = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
        const replyMsg = {
          id: Date.now() + 1,
          text: `Auto-reply for: "${sentText}"`,
          type: 'text',
          time: replyTime,
          isSelf: false
        };
        
        setMessagesByChat(prev => ({
          ...prev,
          [activeChatName]: [...(prev[activeChatName] || []), replyMsg]
        }));
        
        updateChatInfo(activeChatName, replyMsg.text, replyTime, true);
      }, 2000);
    }
  };

  const handleClearChat = () => {
    setMessagesByChat(prev => ({
      ...prev,
      [activeChatName]: []
    }));
  };
  
  const handleDeleteChat = () => {
    handleClearChat();
    setChats(prev => prev.filter(c => c.name !== activeChatName));
    const remaining = chats.filter(c => c.name !== activeChatName);
    if (remaining.length > 0) setActiveChatName(remaining[0].name);
  };

  const startNewChat = (friend: { name: string, seed: string, color: string }) => {
    setIsNewChatOpen(false);
    if (!chats.find(c => c.name === friend.name)) {
      setChats([{ name: friend.name, msg: 'Started a new chat', time: 'Just now', seed: friend.seed, color: friend.color, pinned: false, lastUpdated: Date.now(), unreadCount: 0 }, ...chats]);
    } else {
      setChats(prev => prev.map(c => c.name === friend.name ? { ...c, unreadCount: 0 } : c));
    }
    setActiveChatName(friend.name);
  };

  const handleChatClick = (chatName: string) => {
    setActiveChatName(chatName);
    setChats(prev => prev.map(c => c.name === chatName ? { ...c, unreadCount: 0 } : c));
  };

  return (
    <div className="flex-1 flex h-full overflow-hidden bg-[#150A35] rounded-b-[40px] relative">
      {(isEmojiOpen || isAttachmentOpen || isNewChatOpen || isChatSearchOpen) && (
        <div 
          className="fixed inset-0 z-[60]" 
          onClick={() => {
            setIsEmojiOpen(false);
            setIsAttachmentOpen(false);
            setIsNewChatOpen(false);
            setIsChatSearchOpen(false);
          }}
        />
      )}
      
      {/* 1. Chat List (Kiri) */}
      <div className="w-80 border-r border-white/5 flex flex-col h-full bg-[#0D0524]/30 shrink-0 relative">
         {/* Search Bar & New Chat */}
         <div className="p-6 border-b border-white/5 flex items-center gap-3">
           <div className="relative flex-1">
             <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" size={16} />
             <input type="text" placeholder="Search chats..." className="w-full bg-white/5 border border-white/10 text-white placeholder-gray-500 pl-11 pr-4 py-2.5 rounded-xl focus:outline-none focus:ring-1 focus:ring-[#A577FF] text-sm" />
           </div>
           <div className="relative">
             <button onClick={() => setIsNewChatOpen(!isNewChatOpen)} className={`w-10 h-10 rounded-xl flex items-center justify-center transition-colors shrink-0 ${isNewChatOpen ? 'bg-white/10 text-white' : 'bg-white/5 border border-white/10 hover:bg-white/10 text-gray-400 hover:text-white'}`}>
               <MessageSquarePlus size={18} />
             </button>
             
             {isNewChatOpen && (
               <div className="absolute top-12 right-0 w-64 bg-[#251A45] border border-white/10 rounded-2xl shadow-2xl z-[70] animate-in fade-in slide-in-from-top-2 overflow-hidden">
                 <div className="p-3 border-b border-white/5">
                   <h4 className="text-white text-xs font-bold uppercase tracking-wider">Start New Chat</h4>
                 </div>
                 <div className="max-h-64 overflow-y-auto custom-scrollbar p-2 space-y-1">
                   {[
                     { name: 'Aneka', seed: 'Aneka', color: 'A577FF' },
                     { name: 'Felix', seed: 'Felix', color: 'F2C8F7' },
                     { name: 'Oscar', seed: 'Oscar', color: 'A577FF' },
                     { name: 'Sasha', seed: 'Sasha', color: '8CC6C5' }
                   ].map((f, i) => (
                     <div key={i} onClick={() => startNewChat(f)} className="flex items-center gap-3 p-2 rounded-xl hover:bg-white/5 cursor-pointer transition-colors">
                       <img src={`https://api.dicebear.com/7.x/adventurer/svg?seed=${f.seed}&backgroundColor=${f.color}`} className="w-8 h-8 rounded-full border border-[#150A35] object-cover" alt={f.name}/>
                       <span className="text-sm font-medium text-gray-200">{f.name}</span>
                     </div>
                   ))}
                 </div>
               </div>
             )}
           </div>
         </div>
         {/* Chat Items */}
         <div className="flex-1 overflow-y-auto custom-scrollbar p-3 space-y-2">
            {[...chats].sort((a, b) => {
              if (a.pinned !== b.pinned) return a.pinned ? -1 : 1;
              return (b.lastUpdated || 0) - (a.lastUpdated || 0);
            }).map((c, i) => (
              <div key={i} onClick={() => handleChatClick(c.name)} className={`flex items-center gap-4 p-3 rounded-2xl cursor-pointer transition-colors ${activeChatName === c.name ? 'bg-[#A577FF]/20 border border-[#A577FF]/30' : 'hover:bg-white/5 border border-transparent'}`}>
                <div className="relative">
                  <img src={`https://api.dicebear.com/7.x/adventurer/svg?seed=${c.seed}&backgroundColor=${c.color}`} className="w-12 h-12 rounded-full object-cover shadow-md border border-[#150A35]" alt={c.name} />
                  {(c.unreadCount || 0) > 0 && activeChatName !== c.name && (
                    <span className="absolute -bottom-0.5 -right-0.5 w-3.5 h-3.5 bg-[#A577FF] border-2 border-[#150A35] rounded-full shadow-md"></span>
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex justify-between items-baseline mb-1">
                    <h4 className={`text-sm font-bold truncate ${activeChatName === c.name ? 'text-white' : 'text-gray-200'}`}>{c.name}</h4>
                    <span className="text-[10px] text-gray-500 flex items-center gap-1">
                      {c.pinned && <Pin size={10} className="text-[#A577FF] fill-current" />}
                      {c.time}
                    </span>
                  </div>
                  <p className={`text-xs truncate ${activeChatName === c.name ? 'text-gray-300' : 'text-gray-500'}`}>{c.msg}</p>
                </div>
              </div>
            ))}
         </div>
      </div>

      {/* 2. Ruang Chat (Tengah) */}
      <div className="flex-1 flex flex-col h-full bg-[#150A35] relative min-w-0">
         {/* Header Chat */}
         <div className="h-20 border-b border-white/5 flex items-center justify-between px-8 shrink-0 bg-[#150A35]/80 backdrop-blur-md z-10">
            <div className="flex items-center gap-4">
               <img src={`https://api.dicebear.com/7.x/adventurer/svg?seed=${activeChat.seed}&backgroundColor=${activeChat.color}`} className="w-10 h-10 rounded-full object-cover border-2 border-[#150A35]" alt={activeChat.name} />
               <div>
                 <h2 className="text-white font-bold text-lg leading-tight">{activeChat.name}</h2>
                 <span className="text-green-400 text-xs font-medium">Online</span>
               </div>
            </div>
            <div className="flex items-center gap-4">
               <div className="relative">
                 <button onClick={() => setIsChatSearchOpen(!isChatSearchOpen)} className={`w-10 h-10 rounded-full flex items-center justify-center transition-colors ${isChatSearchOpen ? 'bg-white/10 text-white' : 'bg-white/5 hover:bg-white/10 text-gray-400 hover:text-white'}`}>
                   <Search size={18} />
                 </button>
                 {isChatSearchOpen && (
                   <div className="absolute top-12 right-0 w-72 bg-[#251A45] border border-white/10 rounded-2xl shadow-2xl z-[70] animate-in fade-in slide-in-from-top-2 overflow-hidden flex flex-col">
                     <div className="p-3 border-b border-white/5">
                       <input 
                         type="text" 
                         autoFocus
                         placeholder="Search messages..." 
                         value={chatSearchQuery}
                         onChange={(e) => setChatSearchQuery(e.target.value)}
                         className="w-full bg-[#150A35] border border-white/10 text-white placeholder-gray-500 px-3 py-2 rounded-xl focus:outline-none focus:ring-1 focus:ring-[#A577FF] text-sm" 
                       />
                     </div>
                     <div className="max-h-64 overflow-y-auto custom-scrollbar p-2 space-y-1">
                       {chatSearchQuery.trim() === '' ? (
                         <div className="p-4 text-center text-xs text-gray-500">Type to search messages in this chat...</div>
                       ) : (() => {
                         const results = activeMessages.filter(m => (m.text || '').toLowerCase().includes(chatSearchQuery.toLowerCase()));
                         if (results.length === 0) return <div className="p-4 text-center text-xs text-gray-500">No results found.</div>;
                         return results.map(m => (
                           <div 
                             key={m.id} 
                             onClick={() => {
                               const el = document.getElementById(`message-${m.id}`);
                               if (el) {
                                 el.scrollIntoView({ behavior: 'smooth', block: 'center' });
                                 // Highlight effect
                                 el.style.transition = 'background-color 0.5s';
                                 el.style.backgroundColor = 'rgba(165, 119, 255, 0.2)';
                                 setTimeout(() => el.style.backgroundColor = 'transparent', 1500);
                               }
                               setIsChatSearchOpen(false);
                             }}
                             className="p-2 rounded-xl hover:bg-white/5 cursor-pointer transition-colors"
                           >
                             <div className="flex justify-between items-baseline mb-1">
                               <span className="text-xs font-bold text-white">{m.isSelf ? 'You' : activeChatName}</span>
                               <span className="text-[10px] text-gray-500">{m.time}</span>
                             </div>
                             <p className="text-xs text-gray-400 line-clamp-2">{m.text}</p>
                           </div>
                         ));
                       })()}
                     </div>
                   </div>
                 )}
               </div>
               <button onClick={() => setIsCallOpen(true)} className="w-10 h-10 rounded-full bg-white/5 hover:bg-white/10 flex items-center justify-center text-gray-400 hover:text-green-400 transition-colors">
                 <Phone size={18} />
               </button>
               <button onClick={togglePin} className={`w-10 h-10 rounded-full flex items-center justify-center transition-colors ${activeChat?.pinned ? 'bg-[#A577FF]/20 text-[#A577FF]' : 'bg-white/5 hover:bg-white/10 text-gray-400 hover:text-white'}`}>
                 <Pin size={18} fill={activeChat?.pinned ? 'currentColor' : 'none'} />
               </button>
            </div>
         </div>

         {/* Chat Messages */}
         <div className="flex-1 overflow-y-auto p-8 flex flex-col gap-6 custom-scrollbar">
            {activeMessages.map((m) => {
              if (m.type === 'call_log') {
                return (
                  <div key={m.id} id={`message-${m.id}`} className="w-full flex justify-center my-2 animate-in fade-in slide-in-from-bottom-2">
                     <div className="bg-white/5 border border-white/10 px-4 py-2 rounded-full flex items-center gap-2 text-xs text-gray-400 shadow-sm">
                       <Phone size={12} className={m.answered ? "text-green-400" : "text-red-400"} />
                       <span>{m.text}</span>
                       <span className="text-[10px] ml-2 text-gray-500">{m.time}</span>
                     </div>
                  </div>
                );
              }
              return m.isSelf ? (
                <div key={m.id} id={`message-${m.id}`} className="flex items-end gap-3 w-3/4 self-end flex-row-reverse animate-in fade-in slide-in-from-right-2">
                   <div className={`rounded-2xl rounded-br-none p-4 text-sm shadow-lg ${m.type === 'voice' ? 'bg-[#1D1238] border border-white/10' : 'bg-[#A577FF] text-white break-words'}`}>
                     {m.type === 'voice' ? (
                       <div className="flex items-center gap-3 text-white">
                         <button onClick={() => togglePlayMessage(m)} className="w-8 h-8 rounded-full bg-[#3B2D59] flex items-center justify-center text-white hover:bg-[#4D3B73] transition-colors shrink-0">
                           {playingMessageId === m.id ? <Pause size={14} fill="currentColor" /> : <Play size={14} fill="currentColor" />}
                         </button>
                         <div className="flex-1 relative flex items-center h-8 min-w-[120px] overflow-hidden px-1">
                           <div 
                             className="w-3 h-3 rounded-full bg-blue-400 absolute z-10 transition-all duration-100 ease-linear shadow-sm"
                             style={{ left: playingMessageId === m.id ? `calc(${playbackProgress}% - 6px)` : '0%' }}
                           ></div>
                           <div className="flex gap-[2px] items-center w-full">
                             {[...Array(20)].map((_, i) => (
                               <div key={i} className={`flex-1 rounded-full ${playingMessageId === m.id ? 'bg-blue-400' : 'bg-gray-500 opacity-50'}`} style={{ height: `${Math.max(3, 6 + Math.sin(i)*4 + Math.cos(i*1.2)*2)}px` }}></div>
                             ))}
                           </div>
                         </div>
                         <span className="text-xs font-medium pl-2">{formatTime(m.duration || 0)}</span>
                       </div>
                     ) : (
                       m.text
                     )}
                   </div>
                   <span className="text-[10px] text-gray-600 mb-1 shrink-0">{m.time}</span>
                </div>
              ) : (
                <div key={m.id} id={`message-${m.id}`} className="flex items-end gap-3 w-3/4 animate-in fade-in slide-in-from-left-2">
                   <img src={`https://api.dicebear.com/7.x/adventurer/svg?seed=${activeChat.seed}&backgroundColor=${activeChat.color}`} className="w-8 h-8 rounded-full mb-1 border border-[#150A35]" alt={activeChat.name} />
                   <div className="bg-white/5 border border-white/10 rounded-2xl rounded-bl-none p-4 text-sm text-gray-300 break-words">
                     {m.text}
                   </div>
                   <span className="text-[10px] text-gray-600 mb-1 shrink-0">{m.time}</span>
                </div>
              );
            })}
            {activeMessages.length === 0 && (
               <div className="flex-1 flex items-center justify-center text-gray-500 text-sm">
                 No messages yet. Send a message to start the chat!
               </div>
            )}
            <div ref={messagesEndRef} />
         </div>

         {/* Chat Input */}
         <div className="p-6 pt-2 shrink-0">
            <div className="relative flex items-center bg-[#0D0524] border border-white/10 rounded-2xl p-2 pr-4 focus-within:border-[#A577FF]/50 transition-colors shadow-inner">
               
               {/* Attachment Menu Popup */}
               {isAttachmentOpen && (
                 <div className="absolute bottom-16 left-2 bg-[#251A45] border border-white/10 rounded-2xl p-3 shadow-2xl z-[70] flex flex-col gap-1 min-w-[200px] animate-in fade-in slide-in-from-bottom-2">
                   <label className="flex items-center gap-3 p-2 rounded-xl hover:bg-white/10 transition-colors text-white text-sm font-medium cursor-pointer">
                     <Image size={18} className="text-blue-400" /> Photos
                     <input type="file" className="hidden" accept="image/*" />
                   </label>
                   <label className="flex items-center gap-3 p-2 rounded-xl hover:bg-white/10 transition-colors text-white text-sm font-medium cursor-pointer">
                     <Film size={18} className="text-purple-400" /> Videos
                     <input type="file" className="hidden" accept="video/*" />
                   </label>
                   <label className="flex items-center gap-3 p-2 rounded-xl hover:bg-white/10 transition-colors text-white text-sm font-medium cursor-pointer">
                     <FileText size={18} className="text-yellow-400" /> Document
                     <input type="file" className="hidden" accept=".pdf,.doc,.docx,.txt" />
                   </label>
                   <label className="flex items-center gap-3 p-2 rounded-xl hover:bg-white/10 transition-colors text-white text-sm font-medium cursor-pointer">
                     <Music size={18} className="text-green-400" /> Audio
                     <input type="file" className="hidden" accept="audio/*" />
                   </label>
                   
                    <button onClick={requestCamera} className="flex items-center gap-3 p-2 rounded-xl hover:bg-white/10 transition-colors text-white text-sm font-medium cursor-pointer text-left w-full">
                     <Camera size={18} className="text-pink-400" /> Camera
                   </button>
                 </div>
               )}

               {/* Emoji Picker Popup */}
               {isEmojiOpen && (
                 <div className="absolute bottom-16 left-12 w-72 bg-[#251A45] border border-white/10 rounded-2xl shadow-2xl z-[70] animate-in fade-in slide-in-from-bottom-2 overflow-hidden flex flex-col">
                   <div className="p-3 border-b border-white/5 flex items-center gap-4 text-gray-400">
                     <Search size={16} />
                     <input 
                       type="text" 
                       placeholder="Search emoji" 
                       value={emojiSearchText}
                       onChange={(e) => setEmojiSearchText(e.target.value)}
                       className="bg-transparent border-none focus:outline-none text-sm text-white w-full placeholder-gray-500" 
                     />
                   </div>
                   <div className="p-3 h-48 overflow-y-auto custom-scrollbar">
                     {!emojiSearchText ? (
                       <>
                         <div className="text-xs font-bold text-gray-500 mb-2 uppercase">Recent</div>
                         <div className="grid grid-cols-6 gap-2 mb-4 text-xl">
                           {['🫶', '❤️‍🩹', '💔', '😭', '💖'].map(e => (
                             <button key={e} onClick={() => setInputText(prev => prev + e)} className="hover:bg-white/10 rounded p-1 transition-colors flex items-center justify-center">{e}</button>
                           ))}
                         </div>
                       
                         <div className="text-xs font-bold text-gray-500 mb-2 uppercase tracking-wider">Smileys & People</div>
                         <div className="grid grid-cols-7 gap-1 mb-5 text-2xl">
                           {['😀','😃','😄','😁','😆','😅','🤣','😂','🙂','🙃','😉','😊','😇','🥰','😍','🤩','😘','😗','☺️','😚','😙','🥲','😋','😛','😜','🤪','😝','🤑','🤗','🤭','🤫','🤔','🤐','🤨','😐','😑','😶','😏','😒','🙄','😬','🤥','😌','😔','😪','🤤','😴','😷','🤒','🤕','🤢','🤮','🤧','🥵','🥶','🥴','😵','🤯','🤠','🥳','🥸','😎','🤓','🧐','😕','😟','🙁','☹️','😮','😯','😲','😳','🥺','😦','😧','😨','😰','😥','😢','😭','😱','😖','😣','😞','😓','😩','😫','🥱','😤','😡','😠','🤬','😈','👿','💀','☠️','💩','🤡','👹','👺','👻','👽','👾','🤖','😺','😸','😹','😻','😼','😽','🙀','😿','😾','🙈','🙉','🙊'].map(e => (
                             <button key={e} onClick={() => setInputText(prev => prev + e)} className="hover:bg-white/10 rounded-xl p-1.5 transition-colors flex items-center justify-center">{e}</button>
                           ))}
                         </div>

                         <div className="text-xs font-bold text-gray-500 mb-2 uppercase tracking-wider">Animals & Nature</div>
                         <div className="grid grid-cols-7 gap-1 mb-5 text-2xl">
                           {['🐶','🐱','🐭','🐹','🐰','🦊','🐻','🐼','🐻‍❄️','🐨','🐯','🦁','🐮','🐷','🐸','🐵','🐔','🐧','🐦','🐤','🦆','🦅','🦉','🦇','🐺','🐗','🐴','🦄','🐝','🪱','🐛','🦋','🐌','🐞','🐜','🪰','🪲','🪳','🦟','🦗','🕷','🕸','🦂','🐢','🐍','🦎','🦖','🦕','🐙','🦑','🦐','🦞','🦀','🐡','🐠','🐟','🐬','🐳','🐋','🦈','🦭','🐊','🐅','🐆','🦓','🦍','🦧','🦣','🐘','🦛','🦏','🐪','🐫','🦒','🦘','🦬','🐃','🐂','🐄','🐎','🐖','🐏','🐑','🦙','🐐','🦌','🐕','🐩','🦮','🐕‍🦺','🐈','🐈‍⬛','🪶','🐓','🦃','🦤','🦚','🦜','🦢','🦩','🕊','🐇','🦝','🦨','🦡','🦫','🦦','🦥','🐁','🐀','🐿','🦔'].map(e => (
                             <button key={e} onClick={() => setInputText(prev => prev + e)} className="hover:bg-white/10 rounded-xl p-1.5 transition-colors flex items-center justify-center">{e}</button>
                           ))}
                         </div>
 
                         <div className="text-xs font-bold text-gray-500 mb-2 uppercase tracking-wider">Food & Drink</div>
                         <div className="grid grid-cols-7 gap-1 mb-5 text-2xl">
                           {['🍏','🍎','🍐','🍊','🍋','🍌','🍉','🍇','🍓','🫐','🍈','🍒','🍑','🥭','🍍','🥥','🥝','🍅','🍆','🥑','🥦','🥬','🥒','🌶','🫑','🌽','🥕','🫒','🧄','🧅','🥔','🍠','🥐','🥯','🍞','🥖','🥨','🧀','🥚','🍳','🧈','🥞','🧇','🥓','🥩','🍗','🍖','🌭','🍔','🍟','🍕','🫓','🥪','🥙','🧆','🌮','🌯','🫔','🥗','🥘','🫕','🥫','🍝','🍜','🍲','🍛','🍣','🍱','🥟','🦪','🍤','🍙','🍚','🍘','🍥','🥠','🥮','🍢','🍡','🍧','🍨','🍦','🥧','🧁','🍰','🎂','🍮','🍭','🍬','🍫','🍿','🍩','🍪','🌰','🥜','🍯','🥛','🍼','🫖','☕️','🍵','🧃','🥤','🧋','🍶','🍺','🍻','🥂','🍷','🥃','🍸','🍹','🧉','🍾','🧊','🥄','🍴','🍽','🥣','🥡','🥢','🧂'].map(e => (
                             <button key={e} onClick={() => setInputText(prev => prev + e)} className="hover:bg-white/10 rounded-xl p-1.5 transition-colors flex items-center justify-center">{e}</button>
                           ))}
                         </div>
                          <div className="text-xs font-bold text-gray-500 mb-2 uppercase tracking-wider">Activity</div>
                          <div className="grid grid-cols-7 gap-1 mb-5 text-2xl">
                            {['⚽️','🏀','🏈','⚾️','🥎','🎾','🏐','🏉','🥏','🎱','🪀','🏓','🏸','🏒','🏑','🥍','🏏','🪃','🥅','⛳️','🪁','🏹','🎣','🤿','🥊','🥋','🎽','🛹','🛼','🛷','⛸','🥌','🎿','⛷','🏂','🪂','🏋️','🤼','🤸‍♀️','⛹️','🤺','🤾','🏌️','🏇','🧘','🏄','🏊','🤽','🚣','🧗','🚵','🚴','🏆','🥇','🥈','🥉','🏅','🎖','🏵','🎗','🎫','🎟','🎪','🤹','🎭','🩰','🎨','🎬','🎤','🎧','🎼','🎹','🥁','🪘','🎷','🎺','🪗','🎸','🪕','🎻','🎲','♟','🎯','🎳','🎮','🎰','🧩'].map(e => (
                              <button key={e} onClick={() => setInputText(prev => prev + e)} className="hover:bg-white/10 rounded-xl p-1.5 transition-colors flex items-center justify-center">{e}</button>
                            ))}
                          </div>
                          
                          <div className="text-xs font-bold text-gray-500 mb-2 uppercase tracking-wider">Travel & Places</div>
                          <div className="grid grid-cols-7 gap-1 mb-5 text-2xl">
                            {['🚗','🚕','🚙','🚌','🚎','🏎','🚓','🚑','🚒','🚐','🛻','🚚','🚛','🚜','🦯','🦽','🦼','🛴','🚲','🛵','🏍','🛺','🚨','🚔','🚍','🚘','🚖','🚡','🚠','🚟','🚃','🚋','🚞','🚝','🚄','🚅','🚈','🚂','🚆','🚇','🚊','🚉','✈️','🛫','🛬','🛩','💺','🛰','🚀','🛸','🚁','🛶','⛵️','🚤','🛥','🛳','⛴','🚢','⚓️','🪝','⛽️','🚧','🚦','🚥','🚏','🗺','🗿','🗽','🗼','🏰','🏯','🏟','🎡','🎢','🎠','⛲️','⛱','🏖','🏝','🏜','🌋','⛰','🏔','🗻','🏕','⛺️','🛖','🏠','🏡','🏘','🏚','🏗','🏭','🏢','🏬','🏣','🏤','🏥','🏦','🏨','🏪','🏫','🏩','💒','🏛','⛪️','🕌','🕍','🛕','🕋','⛩','🛤','🛣','🗾','🎑','🏞','🌅','🌄','🌠','🎇','🎆','🌇','🌆','🏙','🌃','🌌','🌉','🌁'].map(e => (
                              <button key={e} onClick={() => setInputText(prev => prev + e)} className="hover:bg-white/10 rounded-xl p-1.5 transition-colors flex items-center justify-center">{e}</button>
                            ))}
                          </div>

                          <div className="text-xs font-bold text-gray-500 mb-2 uppercase tracking-wider">Objects</div>
                          <div className="grid grid-cols-7 gap-1 mb-5 text-2xl">
                            {['⌚️','📱','📲','💻','⌨️','🖥','🖨','🖱','🖲','🕹','🗜','💽','💾','💿','📀','📼','📷','📸','📹','🎥','📽','🎞','📞','☎️','📟','📠','📺','📻','🎙','🎚','🎛','🧭','⏱','⏲','⏰','🕰','⌛️','⏳','📡','🔋','🔌','💡','🔦','🕯','🪔','🧯','🛢','💸','💵','💴','💶','💷','🪙','💰','💳','💎','⚖️','🪜','🧰','🪛','🔧','🔨','⚒','🛠','⛏','🪚','🔩','⚙️','🪤','🧱','⛓','🧲','🔫','💣','🧨','🪓','🔪','🗡','⚔️','🛡','🚬','⚰️','🪦','⚱️','🏺','🔮','📿','🧿','💈','⚗️','🔭','🔬','🕳','🩹','🩺','💊','💉','🩸','🧬','🦠','🧫','🧪','🌡','🧹','🪠','🧺','🧻','🚽','🚰','🚿','🛁','🛀','🧼','🪥','🪒','🧽','🪣','🧴','🛎','🔑','🗝','🚪','🪑','🛋','🛏','🛌','🧸','🪆','🖼','🪞','🪟','🛍','🛒','🎁','🎈','🎏','🎀','🪄','🪅','🎊','🎉','🎎','🏮','🎐','🧧','✉️','📩','📨','📧','💌','📥','📤','📦','🏷','🪧','📪','📫','📬','📭','📮','📯','📜','📃','📄','📑','🧾','📊','📈','📉','🗒','🗓','📆','📅','🗑','📇','🗃','🗳','🗄','📋','📁','📂','🗂','🗞','📰','📓','📔','📒','📕','📗','📘','📙','📚','📖','🔖','🧷','🔗','📎','🖇','📐','📏','🧮','📌','📍','✂️','🖊','🖋','✒️','🖌','🖍','📝','✏️','🔍','🔎','🔏','🔐','🔒','🔓'].map(e => (
                              <button key={e} onClick={() => setInputText(prev => prev + e)} className="hover:bg-white/10 rounded-xl p-1.5 transition-colors flex items-center justify-center">{e}</button>
                            ))}
                          </div>

                          <div className="text-xs font-bold text-gray-500 mb-2 uppercase tracking-wider">Symbols</div>
                          <div className="grid grid-cols-7 gap-1 mb-5 text-2xl">
                            {['❤️','🧡','💛','💚','💙','💜','🖤','🤍','🤎','💔','❣️','💕','💞','💓','💗','💖','💘','💝','💟','☮️','✝️','☪️','🕉','☸️','✡️','🔯','🕎','☯️','☦️','🛐','⛎','♈️','♉️','♊️','♋️','♌️','♍️','♎️','♏️','♐️','♑️','♒️','♓️','🆔','⚛️','🉑','☢️','☣️','📴','📳','🈶','🈚️','🈸','🈺','🈷️','✴️','🆚','💮','🉐','㊙️','㊗️','🈴','🈵','🈹','🈲','🅰️','🅱️','🆎','🆑','🅾️','🆘','❌','⭕️','🛑','⛔️','📛','🚫','💯','💢','♨️','🚷','🚯','🚳','🚱','🔞','📵','🚭','❗️','❕','❓','❔','‼️','⁉️','🔅','🔆','〽️','⚠️','🚸','🔱','⚜️','🔰','♻️','✅','🈯️','💹','❇️','✳️','❎','🌐','💠','Ⓜ️','🌀','💤','🏧','🚾','♿️','🅿️','🛗','🈳','🈂️','🛂','🛃','🛄','🛅','🚹','🚺','🚼','⚧','🚻','🚮','🎦','📶','🈁','🔣','ℹ️','🔤','🔡','🔠','🆖','🆗','🆙','🆒','🆕','🆓','0️⃣','1️⃣','2️⃣','3️⃣','4️⃣','5️⃣','6️⃣','7️⃣','8️⃣','9️⃣','🔟','🔢','#️⃣','*️⃣','⏏️','▶️','⏸','⏯','⏹','⏺','⏭','⏮','⏩','⏪','⏫','⏬','◀️','🔼','🔽','➡️','⬅️','⬆️','⬇️','↗️','↘️','↙️','↖️','↕️','↔️','↪️','↩️','⤴️','⤵️','🔀','🔁','🔂','🔄','🔃','🎵','🎶','➕','➖','➗','✖️','♾','💲','💱','™️','©️','®️','〰️','➰','➿','🔚','🔙','🔛','🔝','🔜','✔️','☑️','🔘','🔴','🟠','🟡','🟢','🔵','🟣','⚫️','⚪️','🟤','🔺','🔻','🔸','🔹','🔶','🔷','🔳','🔲','▪️','▫️','◾️','◽️','◼️','◻️','🟥','🟧','🟨','🟩','🟦','🟪','⬛️','⬜️','🟫','🔈','🔇','🔉','🔊','🔔','🔕','📣','📢','👁‍🗨','💬','💭','🗯','♠️','♣️','♥️','♦️','🃏','🎴','🀄️','🕐','🕑','🕒','🕓','🕔','🕕','🕖','🕗','🕘','🕙','🕚','🕛','🕜','🕝','🕞','🕟','🕠','🕡','🕢','🕣','🕤','🕥','🕦','🕧'].map(e => (
                              <button key={e} onClick={() => setInputText(prev => prev + e)} className="hover:bg-white/10 rounded-xl p-1.5 transition-colors flex items-center justify-center">{e}</button>
                            ))}
                          </div>


                       </>
                     ) : (
                       <>
                     <div className="text-xs font-bold text-gray-500 mb-2 uppercase">{emojiSearchText ? 'Search Results' : 'Smileys & People'}</div>
                     <div className="grid grid-cols-6 gap-2 text-xl">
                       {[
                         { char: '😀', name: 'smile happy' }, { char: '😃', name: 'smile happy' }, { char: '😄', name: 'smile happy' }, 
                         { char: '😂', name: 'laugh cry tears' }, { char: '😭', name: 'cry sad tears' }, { char: '🥲', name: 'smile cry tears' },
                         { char: '😡', name: 'angry mad red' }, { char: '🤬', name: 'angry mad curse' }, { char: '🤯', name: 'mind blown shock' },
                         { char: '😎', name: 'cool glasses' }, { char: '🥺', name: 'plead sad cute' }, { char: '🤔', name: 'think hmm' },
                         { char: '😍', name: 'heart love eyes' }, { char: '🥰', name: 'heart love face' }, { char: '😘', name: 'kiss heart' },
                         { char: '🫶', name: 'heart love hands' }, { char: '❤️', name: 'heart love red' }, { char: '💔', name: 'heart broken sad' },
                         { char: '😴', name: 'sleep zzz' }, { char: '🤒', name: 'sick ill' }, { char: '🤢', name: 'sick puke' },
                         { char: '🤡', name: 'clown joke' }, { char: '💩', name: 'poop joke' }, { char: '👻', name: 'ghost scary boo' },
                         // default fallback set
                         { char: '😁', name: 'smile' }, { char: '😆', name: 'laugh' }, { char: '😅', name: 'sweat smile' }, { char: '🤣', name: 'rofl laugh' }, { char: '☺️', name: 'smile' }, { char: '😊', name: 'smile blush' }, { char: '😇', name: 'angel halo' }, { char: '🙂', name: 'smile' }, { char: '🙃', name: 'upside down' }, { char: '😉', name: 'wink' }, { char: '😌', name: 'relieved' }, { char: '😗', name: 'kiss' }, { char: '😙', name: 'kiss' }, { char: '😚', name: 'kiss' }, { char: '😋', name: 'yum' }, { char: '😛', name: 'tongue' }, { char: '😝', name: 'tongue' }, { char: '😜', name: 'wink tongue' }, { char: '🤪', name: 'crazy' }, { char: '🤨', name: 'sus' }, { char: '🧐', name: 'monocle' }, { char: '🤓', name: 'nerd' }, { char: '🥸', name: 'disguise' }, { char: '🤩', name: 'star eyes' }, { char: '🥳', name: 'party' }, { char: '😏', name: 'smirk' }, { char: '😒', name: 'unamused' }, { char: '😞', name: 'disappointed' }, { char: '😔', name: 'pensive' }, { char: '😟', name: 'worried' }, { char: '😕', name: 'confused' }, { char: '🙁', name: 'frown' }, { char: '☹️', name: 'frown' }, { char: '😣', name: 'persevere' }, { char: '😖', name: 'confounded' }, { char: '😫', name: 'tired' }, { char: '😩', name: 'weary' }, { char: '😢', name: 'cry' }, { char: '😤', name: 'triumph' }, { char: '😳', name: 'flushed' }, { char: '🥵', name: 'hot' }, { char: '🥶', name: 'cold' }, { char: '😱', name: 'scream' }, { char: '😨', name: 'fearful' }, { char: '😰', name: 'cold sweat' }, { char: '😥', name: 'sad but relieved' }, { char: '😓', name: 'sweat' }, { char: '🤗', name: 'hug' }, { char: '🤭', name: 'hand over mouth' }, { char: '🤫', name: 'shushing' }, { char: '🤥', name: 'lying' }, { char: '😶', name: 'no mouth' }, { char: '😐', name: 'neutral' }, { char: '😑', name: 'expressionless' }, { char: '😬', name: 'grimacing' }, { char: '🙄', name: 'roll eyes' }, { char: '😯', name: 'hushed' }, { char: '😦', name: 'frowning' }, { char: '😧', name: 'anguished' }, { char: '😮', name: 'open mouth' }, { char: '😲', name: 'astonished' }, { char: '🥱', name: 'yawning' }, { char: '🤤', name: 'drooling' }, { char: '😪', name: 'sleepy' }, { char: '😵', name: 'dizzy' }, { char: '🤐', name: 'zipper mouth' }, { char: '🥴', name: 'woozy' }, { char: '🤮', name: 'vomiting' }, { char: '🤧', name: 'sneezing' }, { char: '😷', name: 'mask' }, { char: '🤕', name: 'head bandage' }, { char: '🤑', name: 'money mouth' }, { char: '🤠', name: 'cowboy' }, { char: '😈', name: 'smiling horns' }, { char: '👿', name: 'angry horns' }, { char: '👹', name: 'ogre' }, { char: '👺', name: 'goblin' }, { char: '💀', name: 'skull' }, { char: '☠️', name: 'skull crossbones' }, { char: '👽', name: 'alien' }, { char: '👾', name: 'alien monster' }, { char: '🤖', name: 'robot' }, { char: '🎃', name: 'jack o lantern' }, { char: '😺', name: 'grinning cat' }, { char: '😸', name: 'grinning cat eyes' }, { char: '😹', name: 'cat tears' }, { char: '😻', name: 'heart eyes cat' }, { char: '😼', name: 'wry smile cat' }, { char: '😽', name: 'kissing cat' }, { char: '🙀', name: 'weary cat' }, { char: '😿', name: 'crying cat' }, { char: '😾', name: 'pouting cat' }
                       ].filter(e => e.name.includes(emojiSearchText.toLowerCase())).map((e, i) => (
                         <button key={i} onClick={() => setInputText(prev => prev + e.char)} className="hover:bg-white/10 rounded p-1 transition-colors flex items-center justify-center">{e.char}</button>
                       ))}
                                           </div>
                      </>
                     )}
                   </div>
                 </div>
               )}

               {voiceState !== 'none' ? (
                 <div className="flex-1 flex items-center justify-between pl-2 animate-in fade-in zoom-in-95 duration-200">
                    <button onClick={handleCancelRecording} className="text-gray-400 hover:text-white transition-colors p-2">
                      <Trash2 size={20} />
                    </button>
                    <div className="flex items-center gap-3">
                      {voiceState === 'recording' ? (
                        <div className="w-2.5 h-2.5 rounded-full bg-red-400 animate-pulse shadow-[0_0_8px_rgba(248,113,113,0.8)]"></div>
                      ) : (
                        <button onClick={togglePreviewPlay} className={`transition-colors p-1 ${isPreviewPlaying ? 'text-white' : 'text-gray-400 hover:text-white'}`}>
                          {isPreviewPlaying ? <Pause size={16} fill="currentColor" /> : <Play size={16} fill="currentColor" />}
                        </button> 
                      )}
                      <span className="text-sm font-medium text-white w-10 text-center">{formatTime(recordingTime)}</span>
                                             <div className="flex-1 relative flex items-center h-8 min-w-[120px] overflow-hidden px-1 mr-2">
                         <div 
                           className="w-3 h-3 rounded-full bg-[#A577FF] absolute z-10 transition-all duration-100 ease-linear shadow-sm"
                           style={{ left: isPreviewPlaying ? `calc(${previewProgress}% - 6px)` : (voiceState === 'paused' ? '0%' : '100%'), display: voiceState === 'recording' ? 'none' : 'block' }}
                         ></div>
                         <div className="flex gap-[2px] items-center w-full">
                         {[...Array(30)].map((_, i) => (
                           <div key={i} className={`w-1 rounded-full ${voiceState === 'recording' || isPreviewPlaying ? 'bg-[#A577FF] animate-pulse' : 'bg-gray-500'}`} style={{ height: `${Math.max(4, 12 + Math.sin(i)*8 + Math.cos(i*1.2)*6)}px`, animationDelay: `${i * 0.05}s` }}></div>
                         ))}
                         </div>
                       </div>
                    </div>
                    {voiceState === 'recording' ? (
                      <button onClick={handlePauseRecording} className="text-red-400 hover:text-red-300 transition-colors p-2 mr-2">
                        <Pause size={20} fill="currentColor" />
                      </button>
                    ) : (
                      <button onClick={() => setVoiceState('recording')} className="text-red-400 hover:text-red-300 transition-colors p-2 mr-2">
                        <Mic size={20} />
                      </button>
                    )}
                 </div>
               ) : (
                 <>
                   <button 
                     onClick={() => setIsAttachmentOpen(!isAttachmentOpen)}
                     className={`w-10 h-10 rounded-2xl flex items-center justify-center transition-colors shrink-0 bg-[#251A45] text-white hover:bg-[#32235D]`}
                   >
                     <Paperclip size={20} className={isAttachmentOpen ? 'rotate-45 transition-transform' : 'transition-transform'} />
                   </button>

                   <button 
                     onClick={() => setIsEmojiOpen(!isEmojiOpen)}
                     className={`w-10 h-10 rounded-xl flex items-center justify-center transition-colors mr-2 shrink-0 ${isEmojiOpen ? 'bg-white/10 text-white' : 'text-gray-400 hover:text-white'}`}
                   >
                     <Smile size={20} />
                   </button>
                   
                   <input 
                     type="text" 
                     placeholder="Type a message..." 
                     className="flex-1 bg-transparent border-none text-white focus:outline-none text-sm placeholder-gray-500 min-w-0"
                     value={inputText || ''}
                     onChange={(e) => setInputText(e.target.value)}
                     onKeyDown={(e) => {
                       if (e.key === 'Enter') handleSendMessage();
                     }}
                   />
                   
                   <button 
                     onClick={requestMicrophone}
                     className="w-10 h-10 rounded-xl flex items-center justify-center text-gray-400 hover:text-white transition-colors ml-1 shrink-0"
                   >
                     <Mic size={20} />
                   </button>
                 </>
               )}
               
               <button 
                 onClick={handleSendMessage}
                 className={`w-10 h-10 rounded-xl ${voiceState !== 'none' || inputText.trim() !== '' ? 'bg-[#A577FF] hover:bg-[#9161eb] text-white shadow-lg' : 'bg-white/5 text-gray-500'} flex items-center justify-center transition-colors ml-1 shrink-0`}
               >
                 <Send size={16} className="relative -left-[1px] top-[1px]" />
               </button>
            </div>
         </div>
      </div>

      {/* 3. Contact Info (Kanan) */}
      <div className="w-72 border-l border-white/5 bg-[#0D0524]/30 shrink-0 flex flex-col h-full overflow-hidden">
         {/* Profile */}
         <div className="p-6 flex flex-col items-center border-b border-white/5 shrink-0">
           <img src={`https://api.dicebear.com/7.x/adventurer/svg?seed=${activeChat.seed}&backgroundColor=${activeChat.color}`} className="w-20 h-20 rounded-full object-cover mb-3 shadow-lg border-4 border-[#150A35]" alt={activeChat.name} />
           <h3 className="text-lg font-bold text-white">{activeChat.name}</h3>
         </div>

         {/* Files List */}
         <div className="p-5 border-b border-white/5 flex-1 min-h-0 overflow-y-auto custom-scrollbar">
            <h4 className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-3">Shared Files</h4>
            <div className="space-y-2">
              {[
                { 
                  id: 'photos', 
                  icon: Image, 
                  label: 'Photos', 
                  count: '142 photos', 
                  color: 'text-blue-400',
                  preview: (
                    <div className="grid grid-cols-3 gap-1.5 p-2 bg-white/5 rounded-xl border border-white/5 mt-1 animate-in fade-in zoom-in-95 duration-150">
                      {['1', '2', '3', '4', '5', '6'].map(i => (
                        <img 
                          key={i} 
                          src={`https://api.dicebear.com/7.x/shapes/svg?seed=chat_photo${i}&backgroundColor=251A45`} 
                          className="w-full h-12 object-cover rounded-lg border border-white/10 hover:opacity-80 transition-opacity cursor-pointer" 
                          alt="thumb" 
                        />
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
                    <div className="space-y-1.5 p-2 bg-white/5 rounded-xl border border-white/5 mt-1 text-[11px] animate-in fade-in zoom-in-95 duration-150">
                      <div className="flex justify-between items-center text-gray-300 hover:text-white cursor-pointer">
                        <span className="truncate max-w-[130px]">🎬 match_highlight.mp4</span>
                        <span className="text-[10px] text-gray-500">14 MB</span>
                      </div>
                      <div className="flex justify-between items-center text-gray-300 hover:text-white cursor-pointer">
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
                    <div className="space-y-1.5 p-2 bg-white/5 rounded-xl border border-white/5 mt-1 text-[11px] animate-in fade-in zoom-in-95 duration-150">
                      <div className="flex justify-between items-center text-gray-300 hover:text-white cursor-pointer">
                        <span className="truncate max-w-[130px]">📄 Project_Notes.pdf</span>
                        <span className="text-[10px] text-gray-500">420 KB</span>
                      </div>
                      <div className="flex justify-between items-center text-gray-300 hover:text-white cursor-pointer">
                        <span className="truncate max-w-[130px]">📄 Resume_Shared.docx</span>
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
                    <div className="space-y-1.5 p-2 bg-white/5 rounded-xl border border-white/5 mt-1 text-[11px] animate-in fade-in zoom-in-95 duration-150">
                      <div className="flex justify-between items-center text-gray-300 hover:text-white cursor-pointer">
                        <span className="truncate max-w-[130px]">🎵 cozy_lofi_mix.mp3</span>
                        <span className="text-[10px] text-gray-500">3:42</span>
                      </div>
                      <div className="flex justify-between items-center text-gray-300 hover:text-white cursor-pointer">
                        <span className="truncate max-w-[130px]">🎵 voice_recording.mp3</span>
                        <span className="text-[10px] text-gray-500">2:18</span>
                      </div>
                    </div>
                  )
                },
                { 
                  id: 'voice', 
                  icon: Mic, 
                  label: 'Voice', 
                  count: '18 voice notes', 
                  color: 'text-orange-400',
                  preview: (
                    <div className="space-y-1.5 p-2 bg-white/5 rounded-xl border border-white/5 mt-1 text-[11px] animate-in fade-in zoom-in-95 duration-150">
                      <div 
                        onClick={() => {
                          const voiceMsg = activeMessages.find(m => m.type === 'voice');
                          if (voiceMsg) {
                            togglePlayMessage(voiceMsg);
                          } else {
                            togglePlayMessage({ id: 991, duration: 45 });
                          }
                        }}
                        className="flex items-center justify-between p-2 rounded-xl bg-white/5 hover:bg-white/10 transition-colors cursor-pointer group/vn"
                      >
                        <div className="flex items-center gap-2.5 min-w-0">
                          <div className="w-7 h-7 rounded-full bg-orange-500/20 text-orange-400 flex items-center justify-center shrink-0 group-hover/vn:scale-105 transition-transform">
                            {playingMessageId === 991 ? <Pause size={12} fill="currentColor" /> : <Play size={12} fill="currentColor" />}
                          </div>
                          <div className="min-w-0">
                            <span className="text-xs font-semibold text-gray-200 group-hover/vn:text-white block truncate">Voice Note #1</span>
                            <span className="text-[10px] text-gray-400">0:45 • {activeChat.name}</span>
                          </div>
                        </div>
                        <span className="text-[10px] text-gray-500 shrink-0">12:28</span>
                      </div>
                      <div 
                        onClick={() => togglePlayMessage({ id: 992, duration: 72 })}
                        className="flex items-center justify-between p-2 rounded-xl bg-white/5 hover:bg-white/10 transition-colors cursor-pointer group/vn"
                      >
                        <div className="flex items-center gap-2.5 min-w-0">
                          <div className="w-7 h-7 rounded-full bg-orange-500/20 text-orange-400 flex items-center justify-center shrink-0 group-hover/vn:scale-105 transition-transform">
                            {playingMessageId === 992 ? <Pause size={12} fill="currentColor" /> : <Play size={12} fill="currentColor" />}
                          </div>
                          <div className="min-w-0">
                            <span className="text-xs font-semibold text-gray-200 group-hover/vn:text-white block truncate">Voice Note #2</span>
                            <span className="text-[10px] text-gray-400">1:12 • You</span>
                          </div>
                        </div>
                        <span className="text-[10px] text-gray-500 shrink-0">Yesterday</span>
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
                    <div className="space-y-1.5 p-2 bg-white/5 rounded-xl border border-white/5 mt-1 text-[11px] animate-in fade-in zoom-in-95 duration-150">
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
                        <div className={`w-8 h-8 rounded-xl bg-white/5 flex items-center justify-center ${cat.color}`}>
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
                        <ChevronDown size={14} className="text-gray-500 group-hover:text-gray-300" />
                      )}
                    </div>
                    {isExpanded && cat.preview}
                  </div>
                );
              })}
            </div>
         </div>

         {/* Actions */}
         <div className="p-5 space-y-1 shrink-0">
            <button onClick={handleClearChat} className="w-full flex items-center gap-3 p-2.5 rounded-xl hover:bg-white/5 transition-colors text-gray-300">
               <Trash2 size={16} className="text-gray-400" />
               <span className="text-xs font-medium">Clear Chat</span>
            </button>
            <button onClick={handleDeleteChat} className="w-full flex items-center gap-3 p-2.5 rounded-xl hover:bg-red-500/10 transition-colors text-red-400">
               <XCircle size={16} />
               <span className="text-xs font-medium">Delete Chat</span>
            </button>
         </div>
      </div>

      {(isAttachmentOpen || isEmojiOpen || isNewChatOpen || isChatSearchOpen) && (
        <div 
          className="fixed inset-0 z-[15]" 
          onPointerDown={() => {
            setIsAttachmentOpen(false);
            setIsEmojiOpen(false);
            setIsNewChatOpen(false);
            setIsChatSearchOpen(false);
          }} 
        />
      )}

      <CallModal 
        isOpen={isCallOpen} 
        onClose={() => setIsCallOpen(false)} 
        onCallEnd={handleCallEnd}
        contactName={activeChat.name} 
        contactImage={`https://api.dicebear.com/7.x/adventurer/svg?seed=${activeChat.seed}&backgroundColor=${activeChat.color}`} 
        initialVideoCall={initialVideoMode}
      />
    </div>
  );
}
