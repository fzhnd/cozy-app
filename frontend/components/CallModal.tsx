import React, { useState, useEffect, useRef } from 'react';
import { Mic, MicOff, Video, VideoOff, PhoneOff, X, Smile, MonitorUp, Minimize2, Maximize2 } from 'lucide-react';

interface CallModalProps {
  isOpen: boolean;
  onClose: () => void;
  onCallEnd?: (duration: number, answered: boolean) => void;
  contactName: string;
  contactImage: string;
  initialVideoCall?: boolean;
}

export default function CallModal({ isOpen, onClose, onCallEnd, contactName, contactImage, initialVideoCall = false }: CallModalProps) {
  const [callState, setCallState] = useState<'ringing' | 'active' | 'ended'>('ringing');
  const [isMinimized, setIsMinimized] = useState(false);
  const [timer, setTimer] = useState(0);

  const [isVideoCall, setIsVideoCall] = useState(initialVideoCall);
  const [isMicMuted, setIsMicMuted] = useState(false);
  const [activeSticker, setActiveSticker] = useState<string | null>(null);
  const [isStickerMenuOpen, setIsStickerMenuOpen] = useState(false);

  // Dragging state
  const [pos, setPos] = useState({ x: 20, y: 20 });
  const [isDragging, setIsDragging] = useState(false);
  const dragStart = useRef({ x: 0, y: 0 });
  const posStart = useRef({ x: 0, y: 0 });

  // Add keyframes
  useEffect(() => {
    if (!document.getElementById('flyup-style')) {
      const style = document.createElement('style');
      style.id = 'flyup-style';
      style.innerHTML = `
        @keyframes flyUp {
          0% { transform: translate(-50%, 0) scale(0.5); opacity: 0; }
          20% { transform: translate(-50%, -20px) scale(1.2); opacity: 1; }
          80% { transform: translate(-50%, -100px) scale(1); opacity: 1; }
          100% { transform: translate(-50%, -150px) scale(1); opacity: 0; }
        }
      `;
      document.head.appendChild(style);
    }
  }, []);

  // Auto transition from ringing to ended (no answer mock)
  useEffect(() => {
    if (!isOpen) return;

    setCallState('ringing');
    setIsMinimized(false);
    setTimer(0);
    setIsVideoCall(initialVideoCall);

    const ringTimeout = setTimeout(() => {
      // Mockup: penerima menjawab setelah 3 detik
      setCallState('active');
    }, 3000);

    return () => clearTimeout(ringTimeout);
  }, [isOpen, initialVideoCall, onClose, onCallEnd]);

  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (callState === 'active') {
      interval = setInterval(() => {
        setTimer((prev) => prev + 1);
      }, 1000);
    }
    return () => clearInterval(interval);
  }, [callState]);

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (!isDragging) return;
      setPos({
        x: posStart.current.x + (e.clientX - dragStart.current.x),
        y: posStart.current.y + (e.clientY - dragStart.current.y)
      });
    };
    const handleMouseUp = () => {
      setIsDragging(false);
    };

    if (isDragging) {
      window.addEventListener('mousemove', handleMouseMove);
      window.addEventListener('mouseup', handleMouseUp);
    }
    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    };
  }, [isDragging]);

  const handlePointerDown = (e: React.PointerEvent) => {
    // Only drag if left click
    if (e.button !== 0) return;
    setIsDragging(true);
    dragStart.current = { x: e.clientX, y: e.clientY };
    posStart.current = { ...pos };
    e.currentTarget.setPointerCapture(e.pointerId);
  };

  const handleEndCall = () => {
    const answered = callState === 'active';
    setCallState('ended');
    setTimeout(() => {
      onClose();
      if (onCallEnd) onCallEnd(timer, answered);
    }, 2000); // Close after showing 'Call ended' for 2 seconds
  };

  const handleScreenShare = async () => {
    try {
      const stream = await navigator.mediaDevices.getDisplayMedia({ video: true });
      alert('Screen sharing active!');
      // Stop the stream instantly for mockup purposes
      stream.getTracks().forEach(track => track.stop());
    } catch (err) {
      alert('Screen share permission denied or cancelled.');
    }
  };

  const triggerSticker = (emoji: string) => {
    setActiveSticker(emoji);
    setIsStickerMenuOpen(false);
    setTimeout(() => setActiveSticker(null), 2000);
  };

  if (!isOpen) return null;

  const formatTime = (seconds: number) => {
    const m = Math.floor(seconds / 60).toString().padStart(2, '0');
    const s = (seconds % 60).toString().padStart(2, '0');
    return `${m}:${s}`;
  };

  // Minimized View
  if (isMinimized) {
    return (
      <div 
        className="fixed w-64 bg-[#150A35] rounded-2xl shadow-[0_10px_40px_rgba(0,0,0,0.5)] z-50 border border-white/10 overflow-hidden cursor-move hover:bg-[#1f104d] transition-colors" 
        style={{ top: pos.y, left: pos.x }}
        onPointerDown={handlePointerDown}
      >
        <div 
          className="absolute top-3 right-3 text-gray-400 hover:text-white transition-colors cursor-pointer z-10" 
          onPointerDown={(e) => e.stopPropagation()}
          onClick={(e) => { e.stopPropagation(); setIsMinimized(false); }}
        >
          <Maximize2 size={14} />
        </div>
        <div className="p-5 flex flex-col items-center pointer-events-none">
          <img src={contactImage} alt={contactName} className={`w-16 h-16 rounded-full object-cover mb-3 shadow-md border-2 border-[#150A35] ${callState === 'ringing' ? 'animate-pulse' : ''}`} />
          <h3 className="text-white text-lg font-medium">{contactName}</h3>
          <p className={callState === 'active' ? "text-green-500 text-sm mt-1" : "text-gray-400 text-sm mt-1"}>
            {callState === 'ringing' ? 'Ringing...' : callState === 'active' ? formatTime(timer) : 'Call ended'}
          </p>
        </div>
        <button 
          onPointerDown={(e) => e.stopPropagation()}
          onClick={(e) => { e.stopPropagation(); setIsMicMuted(!isMicMuted); }}
          className={`absolute bottom-4 left-4 w-8 h-8 rounded-lg flex items-center justify-center transition-colors z-10 ${isMicMuted ? 'bg-red-500/20 text-red-500 hover:bg-red-500/30' : 'bg-white/10 text-gray-300 hover:text-white hover:bg-white/20'}`}
        >
          {isMicMuted ? <MicOff size={14} /> : <Mic size={14} />}
        </button>
      </div>
    );
  }

  // Full View
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-8 bg-black/50 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="w-full max-w-4xl h-[80vh] bg-[#150A35] rounded-2xl border border-white/10 flex flex-col relative shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200">
        
        {/* Top Bar */}
        <div className="h-12 flex items-center justify-between px-4 shrink-0 absolute top-0 left-0 w-full z-10 bg-gradient-to-b from-black/40 to-transparent">
           <div className="flex items-center gap-2 text-gray-300 text-sm font-medium">
           </div>
           <div className="flex items-center gap-4 text-gray-400">
             <button onClick={() => setIsMinimized(true)} className="hover:text-white transition-colors">
               <Minimize2 size={20} />
             </button>
           </div>
        </div>

        {/* Center Content */}
        <div className="flex-1 flex flex-col items-center justify-center relative overflow-hidden">
           {/* Sticker Animation */}
           {activeSticker && (
             <div className="absolute z-20 text-6xl pointer-events-none animate-[flyUp_2s_ease-out_forwards] left-1/2 -translate-x-1/2 bottom-20">
               {activeSticker}
             </div>
           )}

           {isVideoCall ? (
             <div className="absolute inset-0 flex items-center justify-center bg-[#0D0524] p-4 gap-4">
               {/* Receiver (Main) */}
               <div className="w-1/2 h-full bg-gray-800 rounded-2xl flex items-center justify-center relative overflow-hidden border border-white/10">
                 <img src={contactImage} className="absolute inset-0 w-full h-full object-cover opacity-50 blur-md" alt="bg"/>
                 <img src={contactImage} className={`w-32 h-32 rounded-full object-cover z-10 border-4 border-white/20 ${callState === 'ringing' ? 'animate-pulse' : ''}`} alt={contactName} />
                 <div className="absolute bottom-4 left-4 bg-black/50 px-3 py-1 rounded-lg text-white text-sm z-10 backdrop-blur-sm">{contactName}</div>
               </div>
               {/* Sender (Self PIP) */}
               <div className="w-1/2 h-full bg-gray-900 rounded-2xl flex items-center justify-center relative overflow-hidden border border-white/10">
                 <div className="absolute inset-0 bg-gradient-to-br from-[#A577FF]/20 to-[#150A35]/50"></div>
                 <div className="w-32 h-32 rounded-full bg-gray-800 border-4 border-white/20 flex items-center justify-center z-10">
                   <span className="text-gray-400">You</span>
                 </div>
                 <div className="absolute bottom-4 left-4 bg-black/50 px-3 py-1 rounded-lg text-white text-sm z-10 backdrop-blur-sm">You</div>
               </div>
             </div>
           ) : (
             <div className="flex flex-col items-center">
               <img src={contactImage} alt={contactName} className={`w-40 h-40 rounded-full object-cover shadow-lg border-2 border-transparent hover:border-white/10 transition-colors ${callState === 'ringing' ? 'animate-pulse' : ''}`} />
               <h2 className="text-white text-3xl font-medium mt-6">{contactName}</h2>
               
               <div className="mt-4 h-6">
                 {callState === 'ringing' && (
                   <p className="text-gray-400 text-lg">Ringing...</p>
                 )}
                 {callState === 'active' && (
                   <p className="text-gray-400 text-lg flex flex-col items-center gap-2">
                     <span className="w-24 border-b-2 border-green-500 border-dotted opacity-50 block mb-1"></span>
                     {formatTime(timer)}
                   </p>
                 )}
                 {callState === 'ended' && (
                   <p className="text-red-400 font-medium text-lg">Call ended</p>
                 )}
               </div>
             </div>
           )}
        </div>

        {/* Bottom Controls */}
        <div className="h-24 px-8 flex items-center justify-between shrink-0 bg-[#0D0524] border-t border-white/5 relative z-10">
          {/* Left Controls */}
          <div className="flex items-center gap-3">
             <button 
               onClick={() => setIsVideoCall(!isVideoCall)} 
               className={`w-12 h-12 rounded-full flex items-center justify-center transition-colors ${isVideoCall ? 'bg-white/20 text-white' : 'bg-white text-gray-900 hover:bg-gray-100'}`}
             >
               {isVideoCall ? <Video size={20} /> : <VideoOff size={20} />}
             </button>
             <button 
               onClick={() => setIsMicMuted(!isMicMuted)}
               className={`w-12 h-12 rounded-full flex items-center justify-center transition-colors ${isMicMuted ? 'bg-red-500 text-white' : 'bg-white/10 text-white hover:bg-white/20'}`}
             >
               {isMicMuted ? <MicOff size={20} /> : <Mic size={20} />}
             </button>
          </div>

          {/* Center Controls */}
          {callState !== 'ended' && (
            <div className="flex items-center gap-6 relative">
              <div className="relative">
                <button onClick={() => setIsStickerMenuOpen(!isStickerMenuOpen)} className={`transition-colors p-2 rounded-full ${isStickerMenuOpen ? 'bg-white/10 text-white' : 'text-gray-400 hover:text-white hover:bg-white/5'}`}>
                  <Smile size={24} />
                </button>
                {isStickerMenuOpen && (
                  <div className="absolute bottom-14 left-1/2 -translate-x-1/2 bg-[#251A45] border border-white/10 rounded-2xl p-2 shadow-2xl z-20 flex flex-wrap justify-center gap-1 w-48 animate-in fade-in slide-in-from-bottom-2">
                    {['👍', '❤️', '😊', '😂', '😮', '😭', '😡', '🙏', '🎉'].map(emoji => (
                      <button key={emoji} onClick={() => triggerSticker(emoji)} className="text-2xl p-2 hover:bg-white/10 rounded-xl transition-colors">
                        {emoji}
                      </button>
                    ))}
                  </div>
                )}
              </div>
              <button onClick={handleScreenShare} className="text-gray-400 hover:text-[#A577FF] hover:bg-white/5 transition-colors p-2 rounded-full"><MonitorUp size={24} /></button>
            </div>
          )}

          {/* Right Controls */}
          <div className="flex items-center gap-4">
             {callState !== 'ended' && (
               <button onClick={handleEndCall} className="w-20 h-12 rounded-full bg-red-500 hover:bg-red-600 flex items-center justify-center text-white shadow-lg transition-colors">
                 <PhoneOff size={24} />
               </button>
             )}
          </div>
        </div>

      </div>
    </div>
  );
}
