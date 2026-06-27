import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Phone, PhoneOff, Sparkles, RefreshCw, CheckCircle2, AlertCircle, Info, Volume2, VolumeX, Mic, MessageSquare, Send, Loader2 } from 'lucide-react';
import { useConversation } from '@elevenlabs/react';

interface CallZaraWidgetProps {
  onRecordCreated: () => void;
  preSelectedAction?: string;
  onClearAction?: () => void;
}

interface CallState {
  status: 'idle' | 'connecting' | 'active' | 'completed' | 'failed';
  message: string;
}

export default function CallZaraWidget({ onRecordCreated, preSelectedAction, onClearAction }: CallZaraWidgetProps) {
  const [callState, setCallState] = useState<CallState>({ status: 'idle', message: 'Click to call Zara' });
  const [transcript, setTranscript] = useState<{ speaker: 'Zara' | 'You'; text: string }[]>([]);
  const [isMuted, setIsMuted] = useState(false);
  const [audioNodes, setAudioNodes] = useState<number[]>([15, 15, 15, 15, 15, 15, 15, 15, 15, 15, 15, 15, 15, 15, 15]);
  
  // Chat States
  const [activeMode, setActiveMode] = useState<'voice' | 'chat'>('voice');
  const [chatInput, setChatInput] = useState('');
  const [chatMessages, setChatMessages] = useState<{ role: 'zara' | 'customer'; content: string }[]>([
    { role: 'zara', content: 'Hi, thanks for calling The Carnivore. How can I help you today?' }
  ]);
  const [chatLoading, setChatLoading] = useState(false);
  const chatBottomRef = useRef<HTMLDivElement | null>(null);
  
  const waveInterval = useRef<NodeJS.Timeout | null>(null);
  const callStartTime = useRef<number | null>(null);
  const isCallLogSaved = useRef<boolean>(false);
  const transcriptRef = useRef<{ speaker: 'Zara' | 'You'; text: string }[]>([]);

  // Web Audio API refs for real-time mic reactive wave animation
  const audioContextRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const dataArrayRef = useRef<Uint8Array | null>(null);
  const micStreamRef = useRef<MediaStream | null>(null);
  const animationFrameRef = useRef<number | null>(null);

  // Clean up all audio/stream resources when conversation ends or unmounts
  const cleanupAudioVisualizer = () => {
    if (animationFrameRef.current) {
      cancelAnimationFrame(animationFrameRef.current);
      animationFrameRef.current = null;
    }
    if (audioContextRef.current) {
      if (audioContextRef.current.state !== 'closed') {
        audioContextRef.current.close().catch(e => console.error("Error closing AudioContext:", e));
      }
      audioContextRef.current = null;
    }
    analyserRef.current = null;
    dataArrayRef.current = null;
    if (micStreamRef.current) {
      try {
        micStreamRef.current.getTracks().forEach(track => track.stop());
      } catch (err) {
        console.error("Error stopping microphone tracks:", err);
      }
      micStreamRef.current = null;
    }
  };

  // Clean up on component unmount
  useEffect(() => {
    return () => {
      cleanupAudioVisualizer();
    };
  }, []);

  // Keep transcriptRef in sync with transcript state
  useEffect(() => {
    transcriptRef.current = transcript;
  }, [transcript]);

  // Initialize ElevenLabs Conversational AI
  const conversation = useConversation({
    onConnect: () => {
      console.log("ElevenLabs Connected successfully!");
      callStartTime.current = Date.now();
      isCallLogSaved.current = false;
      setCallState({ status: 'active', message: 'Connected to Voice Agent Zara' });
    },
    onDisconnect: () => {
      console.log("ElevenLabs Disconnected.");
      setCallState({ status: 'completed', message: 'Voice Call Completed' });
      if (onClearAction) onClearAction();
      cleanupAudioVisualizer();
      
      // Save Call Log if not already saved (e.g., via escalation)
      if (!isCallLogSaved.current && transcriptRef.current.length > 0) {
        isCallLogSaved.current = true;
        const duration = callStartTime.current ? Math.round((Date.now() - callStartTime.current) / 1000) : 0;
        fetch('/api/call-logs', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            customer_name: 'Voice Caller',
            customer_phone: 'Active Live Session',
            duration_seconds: duration,
            transcript: transcriptRef.current.map(t => `${t.speaker}: ${t.text}`).join('\n'),
            status: 'COMPLETED'
          })
        })
        .then(() => {
          console.log("Call log saved successfully.");
          onRecordCreated();
        })
        .catch(err => {
          console.error("Failed to save call log:", err);
          onRecordCreated();
        });
      } else {
        onRecordCreated();
      }
    },
    onError: (error: any) => {
      console.error("ElevenLabs Session Error:", error);
      setCallState({ status: 'failed', message: error.message || 'Connection or microphone error' });
    },
    onMessage: (msg: any) => {
      console.log("Transcript message:", msg);
      if (msg.message && msg.source) {
        setTranscript(prev => {
          // Prevent duplicate consecutive entries with identical text
          const last = prev[prev.length - 1];
          const speaker = msg.source === 'user' ? 'You' : 'Zara';
          if (last && last.speaker === speaker && last.text === msg.message) {
            return prev;
          }
          return [...prev, { speaker, text: msg.message }];
        });
      }
    }
  });

  // Handle pre-selected trigger actions from outer buttons (e.g. "Place Order", "Book Table")
  useEffect(() => {
    if (preSelectedAction) {
      handleStartCall();
    }
  }, [preSelectedAction]);

  // Synchronize internal state with hook status
  useEffect(() => {
    if (conversation.status === 'connecting') {
      setCallState({ status: 'connecting', message: 'Initializing ElevenLabs Session...' });
    } else if (conversation.status === 'connected') {
      setCallState({ status: 'active', message: 'Call Active with Zara' });
    }
  }, [conversation.status]);

  // Drive Waveform Animations using ElevenLabs' actual voice levels/states and Web Audio Analyser
  useEffect(() => {
    if (conversation.status === 'connected') {
      const updateWaves = () => {
        const isZaraSpeaking = conversation.isSpeaking;
        
        if (isZaraSpeaking) {
          // If Zara is speaking, show beautiful sweeping AI waves
          const time = Date.now() * 0.015;
          setAudioNodes(prev => prev.map((prevVal, i) => {
            const base = Math.sin(time + i * 0.5) * 25 + 30;
            const noise = Math.random() * 12;
            const target = Math.max(8, Math.min(65, base + noise));
            return prevVal * 0.65 + target * 0.35;
          }));
        } else if (analyserRef.current && dataArrayRef.current) {
          // If customer is speaking, analyze microphone input in real-time
          analyserRef.current.getByteFrequencyData(dataArrayRef.current);
          
          const frequencies = dataArrayRef.current;
          const length = frequencies.length;
          
          setAudioNodes(prev => prev.map((prevVal, i) => {
            // Map the 15 bars to the available voice frequency bins
            const binIdx = Math.floor((i / prev.length) * (length * 0.6));
            const rawVal = frequencies[binIdx] || 0;
            // Scale and map to comfortable pixel heights (between 8px and 65px)
            const mappedVal = (rawVal / 255) * 55 + 8;
            // Add a tiny bit of ambient dynamic vibration even on silence to show active stream
            const noise = Math.sin(Date.now() * 0.008 + i) * 1.5 + 3;
            const target = Math.max(8, Math.min(65, mappedVal + noise));
            return prevVal * 0.65 + target * 0.35;
          }));
        } else {
          // Idle breathing pulse when nobody is speaking
          const time = Date.now() * 0.003;
          setAudioNodes(prev => prev.map((prevVal, i) => {
            const height = Math.sin(time + i * 0.4) * 3 + 12;
            const target = Math.max(8, height);
            return prevVal * 0.75 + target * 0.25;
          }));
        }
        
        animationFrameRef.current = requestAnimationFrame(updateWaves);
      };
      
      animationFrameRef.current = requestAnimationFrame(updateWaves);
    } else {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
      setAudioNodes([15, 15, 15, 15, 15, 15, 15, 15, 15, 15, 15, 15, 15, 15, 15]);
    }

    return () => {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
    };
  }, [conversation.status, conversation.isSpeaking]);

  // Start the voice call
  const handleStartCall = async () => {
    setCallState({ status: 'connecting', message: 'Requesting microphone access...' });
    setTranscript([]);
    callStartTime.current = null;
    isCallLogSaved.current = false;

    try {
      // 1. Explicitly request microphone access first
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      micStreamRef.current = stream;

      // Initialize real-time Web Audio API Analyser for voice visualization
      try {
        const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
        const audioCtx = new AudioContextClass();
        const analyser = audioCtx.createAnalyser();
        analyser.fftSize = 64; // Generates 32 frequency bins, ideal for our 15 visualization nodes
        analyser.smoothingTimeConstant = 0.6; // Slightly smooth out high-frequency transients
        
        const source = audioCtx.createMediaStreamSource(stream);
        source.connect(analyser); // Analyser only. Do NOT connect to audioCtx.destination to prevent speaker feedback echo.
        
        const bufferLength = analyser.frequencyBinCount;
        const dataArray = new Uint8Array(bufferLength);
        
        audioContextRef.current = audioCtx;
        analyserRef.current = analyser;
        dataArrayRef.current = dataArray;
      } catch (ae) {
        console.error("Failed to initialize Web Audio Analyser:", ae);
      }

      // 2. Fetch signed URL or public Agent ID from our secure backend endpoint
      const res = await fetch('/api/elevenlabs/session');
      if (!res.ok) {
        throw new Error("ElevenLabs is not configured. Please add ELEVENLABS_AGENT_ID and ELEVENLABS_API_KEY in the backend environment.");
      }
      const data = await res.json();

      if (data.error || (!data.agentId && !data.signedUrl)) {
        throw new Error("ElevenLabs is not configured. Please add ELEVENLABS_AGENT_ID and ELEVENLABS_API_KEY in the backend environment.");
      }

      console.log("ElevenLabs session configurations retrieved successfully:", data);

      // 3. Initiate conversational session
      if (data.signedUrl) {
        // Authenticated flow using secure signed URL
        await conversation.startSession({
          signedUrl: data.signedUrl
        });
      } else {
        // Public flow using agentId
        await conversation.startSession({
          agentId: data.agentId
        });
      }
    } catch (error: any) {
      console.error("Failed to start ElevenLabs session:", error);
      cleanupAudioVisualizer();
      setCallState({
        status: 'failed',
        message: error.message || 'ElevenLabs is not configured. Please add ELEVENLABS_AGENT_ID and ELEVENLABS_API_KEY in the backend environment.'
      });
    }
  };

  // Terminate the voice call
  const handleEndCall = async () => {
    try {
      await conversation.endSession();
    } catch (err) {
      console.error("Error ending session:", err);
    }
    cleanupAudioVisualizer();
    setCallState({ status: 'idle', message: 'Click to call Zara' });
    if (onClearAction) onClearAction();
  };

  // Mute microphone
  const toggleMute = async () => {
    try {
      // Toggle microphone input using conversation.setVolume or custom logic if available,
      // or fall back to custom toggle indicator
      setIsMuted(!isMuted);
      // useConversation handles local mute state or volume natively
    } catch (err) {
      console.error("Error muting session:", err);
    }
  };

  // Human escalation trigger
  const handleHumanEscalation = () => {
    const currentTranscript = transcriptRef.current;
    const duration = callStartTime.current ? Math.round((Date.now() - callStartTime.current) / 1000) : 0;
    
    isCallLogSaved.current = true; // prevent standard onDisconnect saving again

    // Notify server of escalation
    fetch('/api/escalations', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        customer_name: 'Voice caller',
        customer_phone: 'Active Live Session',
        customer_email: 'live-call@thecarnivore.com',
        reason: 'Customer requested human manager during ElevenLabs call',
        transcript: currentTranscript.map(t => `${t.speaker}: ${t.text}`).join('\n')
      })
    })
    .then(() => {
      console.log("Escalation logged.");
      
      // Also save call log with status 'ESCALATED'
      return fetch('/api/call-logs', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          customer_name: 'Voice Caller',
          customer_phone: 'Active Live Session',
          duration_seconds: duration,
          transcript: currentTranscript.map(t => `${t.speaker}: ${t.text}`).join('\n'),
          status: 'ESCALATED'
        })
      });
    })
    .then(() => {
      console.log("Escalated call log saved.");
      handleEndCall();
      onRecordCreated();
    })
    .catch(err => {
      console.error("Failed to log escalation:", err);
      handleEndCall();
    });
  };

  // Auto-scroll chat to bottom
  useEffect(() => {
    if (chatBottomRef.current) {
      chatBottomRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [chatMessages, chatLoading]);

  const handleSendChatMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    const query = chatInput.trim();
    if (!query || chatLoading) return;

    setChatInput('');
    const newMessages = [...chatMessages, { role: 'customer' as const, content: query }];
    setChatMessages(newMessages);
    setChatLoading(true);

    try {
      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ messages: newMessages })
      });
      const data = await response.json();
      
      if (response.ok && data.text) {
        setChatMessages(prev => [...prev, { role: 'zara', content: data.text }]);
        if (data.n8nResult && data.n8nResult.success) {
          // If a successful action was completed (e.g. placed order, booked table), notify parent
          setTimeout(onRecordCreated, 1500);
        }
      } else {
        setChatMessages(prev => [...prev, { role: 'zara', content: data.error || 'Sorry, I encountered an issue processing your request.' }]);
      }
    } catch (err) {
      console.error(err);
      setChatMessages(prev => [...prev, { role: 'zara', content: 'Network error. Please try again.' }]);
    } finally {
      setChatLoading(false);
    }
  };
return (
    <div id="zara-call-widget" className="bg-zinc-900 border border-zinc-800 text-white rounded-2xl p-6 shadow-xl relative overflow-hidden">
      
      {/* Background ambient pulse when active */}
      {activeMode === 'voice' && callState.status === 'active' && (
        <div className="absolute inset-0 bg-red-950/10 animate-pulse pointer-events-none" />
      )}

      {/* Header */}
      <div className="flex items-center justify-between border-b border-zinc-800 pb-4 mb-4">
        <div className="flex items-center gap-3">
          <div className="relative">
            <span className="absolute -bottom-0.5 -right-0.5 flex h-3.5 w-3.5">
              <span className={`animate-ping absolute inline-flex h-full w-full rounded-full opacity-75 ${activeMode === 'chat' ? 'bg-red-400' : callState.status === 'active' ? 'bg-red-400' : 'bg-emerald-400'}`}></span>
              <span className={`relative inline-flex rounded-full h-3.5 w-3.5 border border-zinc-900 ${activeMode === 'chat' ? 'bg-red-500' : callState.status === 'active' ? 'bg-red-500' : 'bg-emerald-500'}`}></span>
            </span>
            <div className="w-10 h-10 rounded-full bg-red-600/10 flex items-center justify-center border border-red-500/30">
              <Sparkles className="w-5 h-5 text-red-500" />
            </div>
          </div>
          <div>
            <h3 className="font-bold text-lg leading-tight">Interact with Zara</h3>
            <p className="text-xs text-zinc-400">Zara is our active AI concierge agent</p>
          </div>
        </div>

        {activeMode === 'voice' && callState.status === 'active' && (
          <button
            onClick={toggleMute}
            className={`p-2 rounded-lg transition-colors border ${isMuted ? 'bg-red-500/20 text-red-500 border-red-500/40' : 'bg-zinc-800 text-zinc-400 border-zinc-700 hover:bg-zinc-700'}`}
            title={isMuted ? 'Unmute microphone' : 'Mute microphone'}
          >
            {isMuted ? <VolumeX className="w-4 h-4" /> : <Volume2 className="w-4 h-4" />}
          </button>
        )}
      </div>

      {/* Mode Selector */}
      <div className="flex gap-2 p-1 bg-zinc-950 rounded-xl mb-5 border border-zinc-800">
        <button
          onClick={() => {
            if (callState.status === 'active') {
              handleEndCall();
            }
            setActiveMode('voice');
          }}
          className={`flex-1 py-2 text-xs font-bold rounded-lg cursor-pointer transition-all flex items-center justify-center gap-1.5 ${
            activeMode === 'voice' ? 'bg-zinc-850 text-white shadow-sm border border-zinc-700' : 'text-zinc-400 hover:text-zinc-200 border border-transparent'
          }`}
        >
          <Volume2 className="w-3.5 h-3.5" />
          Voice Call
        </button>
        <button
          onClick={() => {
            if (callState.status === 'active') {
              handleEndCall();
            }
            setActiveMode('chat');
          }}
          className={`flex-1 py-2 text-xs font-bold rounded-lg cursor-pointer transition-all flex items-center justify-center gap-1.5 ${
            activeMode === 'chat' ? 'bg-zinc-850 text-white shadow-sm border border-zinc-700' : 'text-zinc-400 hover:text-zinc-200 border border-transparent'
          }`}
        >
          <MessageSquare className="w-3.5 h-3.5" />
          Text Chat
        </button>
      </div>

      {/* Content State Engine */}
      {activeMode === 'voice' ? (
        <div className="min-h-[160px] flex flex-col justify-between">
          
          {/* State: IDLE */}
          {callState.status === 'idle' && (
            <div className="flex flex-col items-center justify-center py-6 text-center">
              <p className="text-sm text-zinc-400 max-w-[280px] mb-5">
                Initiate a live phone conversation with Zara to place premium meat orders, reserve tables, or cancel details in real-time.
              </p>
              <div className="relative flex items-center justify-center">
                <span className="absolute inline-flex h-12 w-44 rounded-xl bg-red-600/20 animate-ping pointer-events-none"></span>
                <motion.button
                  whileHover={{ scale: 1.05, boxShadow: '0 0 20px rgba(220, 38, 38, 0.4)' }}
                  whileTap={{ scale: 0.95 }}
                  onClick={handleStartCall}
                  id="btn-call-zara"
                  className="relative flex items-center gap-3 bg-red-600 hover:bg-red-500 text-white font-bold px-7 py-4 rounded-xl shadow-lg transition-all cursor-pointer z-10"
                >
                  <Phone className="w-5 h-5 animate-pulse" />
                  Start Voice Call
                </motion.button>
              </div>
            </div>
          )}

          {/* State: CONNECTING */}
          {callState.status === 'connecting' && (
            <div className="flex flex-col items-center justify-center py-8 text-center">
              <RefreshCw className="w-8 h-8 text-red-500 animate-spin mb-4" />
              <h4 className="font-semibold text-zinc-200">{callState.message}</h4>
              <p className="text-xs text-zinc-500 mt-1 font-mono">Status: {conversation.status}</p>
            </div>
          )}

          {/* State: ACTIVE CALL */}
          {callState.status === 'active' && (
            <div className="flex flex-col gap-4">
              
              {/* Super Technical Dynamic Audio Wave representation */}
              <div className="relative flex flex-col items-center justify-center py-5 bg-gradient-to-b from-zinc-950/90 to-zinc-900/90 rounded-2xl border border-zinc-800 shadow-[0_0_25px_rgba(239,68,68,0.08)] h-28 overflow-hidden select-none">
                
                {/* Backing Sci-Fi grid lines */}
                <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,transparent_50%,rgba(0,0,0,0.8))] pointer-events-none z-0" />
                <div className="absolute inset-y-0 left-0 right-0 h-[1px] bg-red-500/10 top-1/2 -translate-y-1/2 pointer-events-none z-0" />
                <div className="absolute inset-y-0 left-0 right-0 h-[1px] bg-red-500/5 top-1/4 pointer-events-none z-0" />
                <div className="absolute inset-y-0 left-0 right-0 h-[1px] bg-red-500/5 top-3/4 pointer-events-none z-0" />

                {/* Status indicator tag */}
                <div className="absolute top-2.5 left-3.5 flex items-center gap-1.5 z-10">
                  <span className="flex h-1.5 w-1.5 relative">
                    <span className={`animate-ping absolute inline-flex h-full w-full rounded-full opacity-75 ${
                      conversation.isSpeaking 
                        ? 'bg-red-500' 
                        : (audioNodes.reduce((a, b) => a + b, 0) / audioNodes.length > 15) 
                          ? 'bg-emerald-500' 
                          : 'bg-zinc-500'
                    }`}></span>
                    <span className={`relative inline-flex rounded-full h-1.5 w-1.5 ${
                      conversation.isSpeaking 
                        ? 'bg-red-500' 
                        : (audioNodes.reduce((a, b) => a + b, 0) / audioNodes.length > 15)
                          ? 'bg-emerald-500' 
                          : 'bg-zinc-500'
                    }`}></span>
                  </span>
                  <span className="text-[9px] uppercase font-mono tracking-widest font-black text-zinc-400">
                    {conversation.isSpeaking ? (
                      <span className="text-red-400 animate-pulse font-black">AI AGENT SPEAKING</span>
                    ) : (audioNodes.reduce((a, b) => a + b, 0) / audioNodes.length > 15) ? (
                      <span className="text-emerald-400 font-black">MIC INPUT ACTIVE</span>
                    ) : (
                      <span>VOICE CHANNEL IDLE</span>
                    )}
                  </span>
                </div>

                {/* Real-time spectrum stats right aligned */}
                <div className="absolute top-2.5 right-3.5 text-[9px] font-mono text-zinc-500 font-bold z-10 flex items-center gap-2">
                  <span>FPS: 60</span>
                  <span>•</span>
                  <span>FFT: 64</span>
                  <span>•</span>
                  <span>GAIN: AUTO</span>
                </div>

                {/* Waveform Bars Container */}
                <div className="flex items-end justify-center gap-1.5 h-12 w-full px-4 z-10">
                  {audioNodes.map((h, i) => {
                    // Determine coloring based on active speaker state
                    let barGradient = "from-red-600 via-orange-500 to-amber-400";
                    if (!conversation.isSpeaking && (audioNodes.reduce((a, b) => a + b, 0) / audioNodes.length > 15)) {
                      // Greenish / teal glow for user speaking
                      barGradient = "from-emerald-600 via-teal-500 to-cyan-400";
                    } else if (!conversation.isSpeaking) {
                      // Soft zinc/slate for silence breathing state
                      barGradient = "from-zinc-700 via-zinc-600 to-zinc-500";
                    }

                    return (
                      <div
                        key={i}
                        className={`w-1.5 rounded-full bg-gradient-to-t ${barGradient} transition-all duration-75`}
                        style={{ 
                          height: `${h}px`,
                          opacity: h > 10 ? 1 : 0.65
                        }}
                      />
                    );
                  })}
                </div>

                {/* Audio wave dynamic reflections reflection/glow under the waves */}
                <div className="absolute bottom-1 w-full flex justify-center opacity-25 filter blur-sm pointer-events-none scale-y-[-0.6] z-0">
                  <div className="flex items-end gap-1.5 h-12">
                    {audioNodes.map((h, i) => (
                      <div
                        key={i}
                        className="w-1.5 rounded-full bg-red-500"
                        style={{ height: `${h}px` }}
                      />
                    ))}
                  </div>
                </div>

              </div>

              {/* Conversation Log preview */}
              <div className="h-44 overflow-y-auto bg-zinc-950/80 rounded-xl p-4 border border-zinc-800 text-sm space-y-3 flex flex-col justify-end">
                {transcript.length === 0 ? (
                  <p className="text-zinc-600 italic text-center py-4">Live voice session established. Talk to Zara...</p>
                ) : (
                  <div className="space-y-3 overflow-y-auto max-h-full pr-1">
                    {transcript.slice(-4).map((entry, idx) => (
                      <div key={idx} className={`flex flex-col ${entry.speaker === 'Zara' ? 'items-start' : 'items-end'}`}>
                        <span className={`text-[10px] font-bold uppercase tracking-wider mb-0.5 ${entry.speaker === 'Zara' ? 'text-red-400' : 'text-zinc-400'}`}>
                          {entry.speaker}
                        </span>
                        <p className={`px-3 py-2 rounded-xl max-w-[85%] leading-relaxed ${entry.speaker === 'Zara' ? 'bg-zinc-800 text-zinc-100 rounded-tl-none' : 'bg-red-600 text-white rounded-tr-none'}`}>
                          {entry.text}
                        </p>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Muted alert */}
              {isMuted && (
                <p className="text-xs text-red-400 font-medium text-center italic">Your microphone is currently muted.</p>
              )}

              {/* End Call controls */}
              <div className="flex items-center justify-between mt-2 pt-2 border-t border-zinc-800">
                <button
                  onClick={handleHumanEscalation}
                  className="text-xs text-red-400 hover:text-red-300 font-medium flex items-center gap-1"
                >
                  <Mic className="w-3.5 h-3.5 animate-pulse text-red-500" />
                  Transfer to Manager
                </button>
                
                <button
                  onClick={handleEndCall}
                  className="flex items-center gap-1.5 bg-red-600 hover:bg-red-700 text-white text-xs font-bold px-4 py-2 rounded-lg cursor-pointer transition-colors"
                >
                  <PhoneOff className="w-3.5 h-3.5" />
                  End Call
                </button>
              </div>

            </div>
          )}

          {/* State: COMPLETED */}
          {callState.status === 'completed' && (
            <div className="flex flex-col items-center justify-center py-6 text-center">
              <div className="w-12 h-12 rounded-full bg-emerald-500/10 flex items-center justify-center border border-emerald-500/30 mb-4 animate-bounce">
                <CheckCircle2 className="w-6 h-6 text-emerald-500" />
              </div>
              <h4 className="font-bold text-emerald-400">Voice Session Finished!</h4>
              <p className="text-xs text-zinc-400 mt-2 max-w-[280px]">
                Zara has collected and processed your restaurant request. If an order/reservation was placed, it will synchronize and appear on the dashboard in seconds.
              </p>
              <button
                onClick={() => setCallState({ status: 'idle', message: 'Click to call Zara' })}
                className="mt-5 bg-zinc-800 hover:bg-zinc-700 text-zinc-200 text-xs font-bold px-4 py-2 rounded-lg cursor-pointer border border-zinc-700"
              >
                Back to Dialer
              </button>
            </div>
          )}

          {/* State: FAILED */}
          {callState.status === 'failed' && (
            <div className="flex flex-col items-center justify-center py-6 text-center">
              <div className="w-12 h-12 rounded-full bg-red-500/10 flex items-center justify-center border border-red-500/30 mb-4">
                <AlertCircle className="w-6 h-6 text-red-500" />
              </div>
              <h4 className="font-bold text-red-400">Failed to connect</h4>
              <p className="text-xs text-zinc-400 mt-2 max-w-[280px]">
                {callState.message}
              </p>
              <button
                onClick={() => setCallState({ status: 'idle', message: 'Click to call Zara' })}
                className="mt-5 bg-zinc-800 hover:bg-zinc-700 text-zinc-200 text-xs font-bold px-4 py-2 rounded-lg cursor-pointer border border-zinc-700"
              >
                Retry Call
              </button>
            </div>
          )}

        </div>
      ) : (
        /* Text Chat UI Mode */
        <div className="min-h-[300px] flex flex-col justify-between gap-4">
          
          {/* Chat Messages viewport */}
          <div className="flex-1 min-h-[220px] max-h-[300px] overflow-y-auto bg-zinc-950/80 rounded-xl p-4 border border-zinc-800 text-sm space-y-3 scrollbar-thin">
            {chatMessages.map((msg, idx) => {
              const isZara = msg.role === 'zara';
              return (
                <div key={idx} className={`flex flex-col ${isZara ? 'items-start' : 'items-end'}`}>
                  <span className={`text-[9px] font-bold uppercase tracking-wider mb-0.5 ${isZara ? 'text-red-400' : 'text-zinc-400'}`}>
                    {isZara ? 'Zara (AI)' : 'You'}
                  </span>
                  <p className={`px-3 py-2 rounded-xl max-w-[85%] leading-relaxed text-xs ${isZara ? 'bg-zinc-800 text-zinc-100 rounded-tl-none border border-zinc-700/50' : 'bg-red-600 text-white rounded-tr-none border border-red-700'}`}>
                    {msg.content}
                  </p>
                </div>
              );
            })}
            
            {chatLoading && (
              <div className="flex flex-col items-start">
                <span className="text-[9px] font-bold uppercase tracking-wider mb-0.5 text-red-400">Zara (AI)</span>
                <div className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-zinc-800 text-zinc-400 text-xs rounded-tl-none border border-zinc-700/50 animate-pulse">
                  <Loader2 className="w-3 h-3 animate-spin text-red-500" />
                  <span>Zara is processing...</span>
                </div>
              </div>
            )}
            <div ref={chatBottomRef} />
          </div>

          {/* Chat input box */}
          <form onSubmit={handleSendChatMessage} className="flex gap-2 border-t border-zinc-800/80 pt-3">
            <input
              type="text"
              value={chatInput}
              onChange={e => setChatInput(e.target.value)}
              placeholder="Type a message to Zara..."
              disabled={chatLoading}
              className="flex-1 bg-zinc-950 border border-zinc-800 rounded-xl px-4 py-2.5 text-xs text-white focus:outline-none focus:ring-1 focus:ring-red-500 placeholder-zinc-500"
            />
            <button
              type="submit"
              disabled={chatLoading || !chatInput.trim()}
              className="bg-red-600 hover:bg-red-500 disabled:bg-zinc-850 disabled:text-zinc-500 text-white font-bold px-4 py-2.5 rounded-xl text-xs cursor-pointer flex items-center gap-1.5 transition-colors border border-red-700/50 disabled:border-transparent"
            >
              <Send className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Send</span>
            </button>
          </form>
          
        </div>
      )}
    </div>
  );
}
