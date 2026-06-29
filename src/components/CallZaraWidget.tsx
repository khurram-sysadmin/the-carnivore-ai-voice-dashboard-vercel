import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Phone, PhoneOff, Sparkles, RefreshCw, CheckCircle2, AlertCircle, Volume2, VolumeX, Mic, MessageSquare, Send, Loader2 } from 'lucide-react';
import { useConversation } from '@elevenlabs/react';

interface CallZaraWidgetProps {
  onRecordCreated: (record?: any) => void;
  preSelectedAction?: string;
  onClearAction?: () => void;
}

interface CallState {
  status: 'idle' | 'connecting' | 'active' | 'completed' | 'failed';
  message: string;
}

const devanagariVowels: Record<string, string> = {
  'अ': 'a', 'आ': 'aa', 'इ': 'i', 'ई': 'ee', 'उ': 'u', 'ऊ': 'oo',
  'ऋ': 'ri', 'ए': 'e', 'ऐ': 'ai', 'ओ': 'o', 'औ': 'au'
};

const devanagariMatras: Record<string, string> = {
  'ा': 'aa', 'ि': 'i', 'ी': 'ee', 'ु': 'u', 'ू': 'oo', 'ृ': 'ri',
  'े': 'e', 'ै': 'ai', 'ो': 'o', 'ौ': 'au'
};

const devanagariConsonants: Record<string, string> = {
  'क': 'k', 'ख': 'kh', 'ग': 'g', 'घ': 'gh', 'ङ': 'ng',
  'च': 'ch', 'छ': 'chh', 'ज': 'j', 'झ': 'jh', 'ञ': 'ny',
  'ट': 't', 'ठ': 'th', 'ड': 'd', 'ढ': 'dh', 'ण': 'n',
  'त': 't', 'थ': 'th', 'द': 'd', 'ध': 'dh', 'न': 'n',
  'प': 'p', 'फ': 'ph', 'ब': 'b', 'भ': 'bh', 'म': 'm',
  'य': 'y', 'र': 'r', 'ल': 'l', 'व': 'v',
  'श': 'sh', 'ष': 'sh', 'स': 's', 'ह': 'h',
  'ड़': 'r', 'ढ़': 'rh', 'क़': 'q', 'ख़': 'kh', 'ग़': 'gh', 'ज़': 'z', 'फ़': 'f'
};

const romanizeTranscriptText = (text: string) => {
  if (!/[\u0900-\u097F]/.test(text)) return text;

  let output = '';
  for (let i = 0; i < text.length; i++) {
    const char = text[i];
    const next = text[i + 1];

    if (devanagariVowels[char]) {
      output += devanagariVowels[char];
      continue;
    }

    if (devanagariConsonants[char]) {
      output += devanagariConsonants[char];
      if (next === '्') {
        i++;
      } else if (devanagariMatras[next]) {
        output += devanagariMatras[next];
        i++;
      } else {
        output += 'a';
      }
      continue;
    }

    if (char === 'ं' || char === 'ँ') {
      output += 'n';
      continue;
    }

    if (char === 'ः') {
      output += 'h';
      continue;
    }

    if (char === '़') continue;
    output += devanagariMatras[char] ?? char;
  }

  return output.replace(/\s+/g, ' ').trim();
};

const cleanDevanagariVowels: Record<string, string> = {
  '\u0905': 'a', '\u0906': 'aa', '\u0907': 'i', '\u0908': 'ee', '\u0909': 'u',
  '\u090A': 'oo', '\u090B': 'ri', '\u090F': 'e', '\u0910': 'ai',
  '\u0913': 'o', '\u0914': 'au'
};

const cleanDevanagariMatras: Record<string, string> = {
  '\u093E': 'aa', '\u093F': 'i', '\u0940': 'ee', '\u0941': 'u', '\u0942': 'oo',
  '\u0943': 'ri', '\u0947': 'e', '\u0948': 'ai', '\u094B': 'o', '\u094C': 'au'
};

const cleanDevanagariConsonants: Record<string, string> = {
  '\u0915': 'k', '\u0916': 'kh', '\u0917': 'g', '\u0918': 'gh', '\u0919': 'ng',
  '\u091A': 'ch', '\u091B': 'chh', '\u091C': 'j', '\u091D': 'jh', '\u091E': 'ny',
  '\u091F': 't', '\u0920': 'th', '\u0921': 'd', '\u0922': 'dh', '\u0923': 'n',
  '\u0924': 't', '\u0925': 'th', '\u0926': 'd', '\u0927': 'dh', '\u0928': 'n',
  '\u092A': 'p', '\u092B': 'ph', '\u092C': 'b', '\u092D': 'bh', '\u092E': 'm',
  '\u092F': 'y', '\u0930': 'r', '\u0932': 'l', '\u0935': 'v', '\u0936': 'sh',
  '\u0937': 'sh', '\u0938': 's', '\u0939': 'h', '\u095C': 'r', '\u095D': 'rh',
  '\u0958': 'q', '\u0959': 'kh', '\u095A': 'gh', '\u095B': 'z', '\u095E': 'f'
};

const hinglishWordMap: Record<string, string> = {
  '\u092E\u0947\u0930\u093E': 'mera',
  '\u092E\u0947\u0930\u0940': 'meri',
  '\u092E\u0947\u0930\u0947': 'mere',
  '\u0928\u093E\u092E': 'naam',
  '\u0939\u0948': 'hai',
  '\u0939\u0948\u0902': 'hain',
  '\u0915\u094D\u092F\u093E': 'kya',
  '\u092E\u0941\u091D\u0947': 'mujhe',
  '\u0906\u092A': 'aap',
  '\u0906\u092A\u0915\u093E': 'aapka',
  '\u092B\u094B\u0928': 'phone',
  '\u0928\u0902\u092C\u0930': 'number',
  '\u0908\u092E\u0947\u0932': 'email',
  '\u0928\u0940\u091A\u0947': 'neeche',
  '\u092D\u0930\u0947\u0902': 'bharen',
  '\u092D\u0930\u094B': 'bharo',
  '\u092D\u0930': 'bhar',
  '\u0932\u093F\u0916\u0947\u0902': 'likhen',
  '\u0932\u093F\u0916\u094B': 'likho',
  '\u092E\u094B\u0939\u092E\u094D\u092E\u0926': 'muhammad',
  '\u092E\u0941\u0939\u092E\u094D\u092E\u0926': 'muhammad',
  '\u0916\u0941\u0930\u094D\u0930\u092E': 'khurram',
  '\u092B\u0930\u0939\u093E\u0928': 'farhan'
};

const transliterateDevanagariWord = (word: string) => {
  if (hinglishWordMap[word]) return hinglishWordMap[word];

  let output = '';
  for (let i = 0; i < word.length; i++) {
    const char = word[i];
    const next = word[i + 1];

    if (cleanDevanagariVowels[char]) {
      output += cleanDevanagariVowels[char];
      continue;
    }

    if (cleanDevanagariConsonants[char]) {
      output += cleanDevanagariConsonants[char];
      if (next === '\u094D') {
        i++;
      } else if (cleanDevanagariMatras[next]) {
        output += cleanDevanagariMatras[next];
        i++;
      } else {
        output += 'a';
      }
      continue;
    }

    if (char === '\u0902' || char === '\u0901') {
      output += 'n';
      continue;
    }

    if (char === '\u0903') {
      output += 'h';
      continue;
    }

    if (char === '\u093C') continue;
    output += cleanDevanagariMatras[char] ?? char;
  }

  return output
    .replace(/aa\b/g, 'a')
    .replace(/([a-z]{4,})a\b/g, '$1');
};

const formatTranscriptText = (text: string) => {
  if (!/[\u0900-\u097F]/.test(text)) return text;

  return text
    .replace(/[\u0900-\u097F]+/g, token => transliterateDevanagariWord(token))
    .replace(/\s+/g, ' ')
    .trim();
};

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
  const [chatSessionState, setChatSessionState] = useState<'idle' | 'connecting' | 'connected' | 'failed'>('idle');
  const [typedDetails, setTypedDetails] = useState({
    name: '',
    phone: '',
    email: ''
  });
  const [detailsFormVisible, setDetailsFormVisible] = useState(false);
  const [detailsFormMode, setDetailsFormMode] = useState<'contact' | 'callback'>('contact');
  const [detailsSent, setDetailsSent] = useState(false);
  const chatBottomRef = useRef<HTMLDivElement | null>(null);
  
  const callStartTime = useRef<number | null>(null);
  const isCallLogSaved = useRef<boolean>(false);
  const transcriptRef = useRef<{ speaker: 'Zara' | 'You'; text: string }[]>([]);
  const voiceConversationRef = useRef<any>(null);
  const sessionModeRef = useRef<'voice' | 'chat' | null>(null);
  const pendingChatMessageRef = useRef<string | null>(null);
  const conversationIdRef = useRef<string>('');
  const sessionAgentIdRef = useRef<string>('');

  const animationFrameRef = useRef<number | null>(null);

  // Clean up UI animation resources when conversation ends or unmounts.
  const cleanupAudioVisualizer = () => {
    if (animationFrameRef.current) {
      cancelAnimationFrame(animationFrameRef.current);
      animationFrameRef.current = null;
    }
  };

  // Keep transcriptRef in sync with transcript state
  useEffect(() => {
    transcriptRef.current = transcript;
  }, [transcript]);

  // Initialize ElevenLabs Conversational AI
  const conversation = useConversation({
    onConnect: (event?: { conversationId?: string }) => {
      console.log("ElevenLabs Connected successfully!", sessionModeRef.current, event?.conversationId);
      if (event?.conversationId) {
        conversationIdRef.current = event.conversationId;
      }

      if (sessionModeRef.current === 'chat') {
        setChatSessionState('connected');
        const pendingMessage = pendingChatMessageRef.current;
        if (pendingMessage) {
          pendingChatMessageRef.current = null;
          window.setTimeout(() => {
            try {
              voiceConversationRef.current?.sendUserMessage(pendingMessage);
            } catch (err) {
              console.error("Failed to send pending chat message:", err);
              setChatLoading(false);
              setChatMessages(prev => [
                ...prev,
                { role: 'zara', content: 'I connected to Zara chat, but could not send your message. Please try again.' }
              ]);
            }
          }, 0);
        }
        return;
      }

      sessionModeRef.current = 'voice';
      callStartTime.current = Date.now();
      isCallLogSaved.current = false;
      setDetailsFormVisible(false);
      setDetailsSent(false);
      setCallState({ status: 'active', message: 'Connected to Voice Agent Zara' });
    },
    onDisconnect: () => {
      console.log("ElevenLabs Disconnected.", sessionModeRef.current);

      if (sessionModeRef.current === 'chat') {
        setChatSessionState('idle');
        setChatLoading(false);
        sessionModeRef.current = null;
        pendingChatMessageRef.current = null;
        return;
      }

      setCallState({ status: 'completed', message: 'Voice Call Completed' });
      setDetailsFormVisible(false);
      if (onClearAction) onClearAction();
      cleanupAudioVisualizer();
      
      // Save Call Log if not already saved (e.g., via escalation)
      if (!isCallLogSaved.current && (transcriptRef.current.length > 0 || conversationIdRef.current)) {
        isCallLogSaved.current = true;
        const duration = callStartTime.current ? Math.round((Date.now() - callStartTime.current) / 1000) : 0;
        fetch('/api/call-logs', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            customer_name: typedDetails.name.trim() || 'Voice Caller',
            customer_phone: typedDetails.phone.trim() || 'Active Live Session',
            customer_email: typedDetails.email.trim(),
            duration_seconds: duration,
            transcript: transcriptRef.current.map(t => `${t.speaker}: ${t.text}`).join('\n'),
            status: 'COMPLETED',
            conversation_id: conversationIdRef.current,
            agent_id: sessionAgentIdRef.current,
            source: 'dashboard'
          })
        })
        .then(r => r.json())
        .then((savedLog) => {
          console.log("Call log saved successfully.");
          onRecordCreated({
            ...savedLog,
            customer_name: typedDetails.name.trim(),
            customer_phone: typedDetails.phone.trim(),
            customer_email: typedDetails.email.trim(),
            conversation_id: conversationIdRef.current
          });
        })
        .catch(err => {
          console.error("Failed to save call log:", err);
          onRecordCreated({
            customer_name: typedDetails.name.trim(),
            customer_phone: typedDetails.phone.trim(),
            customer_email: typedDetails.email.trim(),
            conversation_id: conversationIdRef.current
          });
        });
      } else {
        onRecordCreated({
          customer_name: typedDetails.name.trim(),
          customer_phone: typedDetails.phone.trim(),
          customer_email: typedDetails.email.trim(),
          conversation_id: conversationIdRef.current
        });
      }

      sessionModeRef.current = null;
    },
    onError: (error: any) => {
      console.error("ElevenLabs Session Error:", error);

      if (sessionModeRef.current === 'chat') {
        setChatSessionState('failed');
        setChatLoading(false);
        pendingChatMessageRef.current = null;
        const message = typeof error === 'string' ? error : error?.message;
        setChatMessages(prev => [
          ...prev,
          { role: 'zara', content: message || 'Sorry, I could not connect to Zara chat. Please try again.' }
        ]);
        sessionModeRef.current = null;
        return;
      }

      setCallState({ status: 'failed', message: error.message || 'Connection or microphone error' });
    },
    onMessage: (msg: any) => {
      if (sessionModeRef.current === 'chat') return;

      console.log("Transcript message:", msg);
      if (msg.message && msg.source) {
        setTranscript(prev => {
          // Prevent duplicate consecutive entries with identical text
          const last = prev[prev.length - 1];
          const speaker = msg.source === 'user' ? 'You' : 'Zara';
          const text = formatTranscriptText(msg.message);
          const lowerText = text.toLowerCase();
          const isEscalationContext =
            lowerText.includes('manager') ||
            lowerText.includes('callback') ||
            lowerText.includes('human') ||
            lowerText.includes('escalation') ||
            lowerText.includes('complaint') ||
            lowerText.includes('refund') ||
            lowerText.includes('payment issue');
          const callbackFormRequest =
            lowerText.includes('fill your name and phone number below') ||
            lowerText.includes('fill the name and phone number below') ||
            lowerText.includes('fill name and phone number below') ||
            lowerText.includes('type your name and phone number below') ||
            lowerText.includes('type the name and phone number below') ||
            (
              isEscalationContext &&
              (lowerText.includes('phone number') || lowerText.includes('contact number') || lowerText.includes('mobile number')) &&
              !lowerText.includes('email') &&
              !lowerText.includes('mail')
            );
          const explicitContactFormRequest =
            lowerText.includes('fill the details below') ||
            lowerText.includes('details below') ||
            lowerText.includes('fill the phone number') ||
            lowerText.includes('fill your phone number') ||
            lowerText.includes('fill phone number') ||
            lowerText.includes('type your email') ||
            lowerText.includes('type the email') ||
            lowerText.includes('type your phone') ||
            lowerText.includes('type the phone') ||
            lowerText.includes('fill the phone') ||
            lowerText.includes('fill the email') ||
            lowerText.includes('phone number and email below') ||
            lowerText.includes('phone and email below') ||
            lowerText.includes('phone/email') ||
            lowerText.includes('email below') ||
            lowerText.includes('phone below') ||
            (
              (lowerText.includes('phone') || lowerText.includes('number')) &&
              (lowerText.includes('email') || lowerText.includes('mail')) &&
              (lowerText.includes('below') || lowerText.includes('neeche') || lowerText.includes('niche') || lowerText.includes('bhar') || lowerText.includes('likh') || lowerText.includes('send'))
            );
          const contactQuestion =
            (
              lowerText.includes('phone number') ||
              lowerText.includes('mobile number') ||
              lowerText.includes('contact number') ||
              lowerText.includes('email address') ||
              lowerText.includes('phone aur email') ||
              lowerText.includes('number aur email') ||
              lowerText.includes('mail address')
            ) &&
            (
              lowerText.includes('please') ||
              lowerText.includes('could you') ||
              lowerText.includes('can you') ||
              lowerText.includes('provide') ||
              lowerText.includes('share') ||
              lowerText.includes('need') ||
              lowerText.includes('what is') ||
              lowerText.endsWith('?')
            );
          const asksForContact =
            speaker === 'Zara' &&
            (callbackFormRequest || explicitContactFormRequest || contactQuestion);

          if (asksForContact && (!detailsSent || explicitContactFormRequest || callbackFormRequest)) {
            setDetailsFormMode(callbackFormRequest ? 'callback' : 'contact');
            setDetailsFormVisible(true);
          }

          if (last && last.speaker === speaker && last.text === text) {
            return prev;
          }
          return [...prev, { speaker, text }];
        });
      }
    },
    onAgentTyping: () => {
      if (sessionModeRef.current === 'chat') {
        setChatLoading(true);
      }
    },
    onAgentChatResponsePart: (part: any) => {
      if (sessionModeRef.current !== 'chat') return;

      if (part.type === 'start') {
        setChatLoading(true);
        if (part.text) {
          setChatMessages(prev => [...prev, { role: 'zara', content: part.text }]);
        }
        return;
      }

      if (part.type === 'delta') {
        setChatMessages(prev => {
          const next = [...prev];
          const last = next[next.length - 1];

          if (last?.role === 'zara') {
            next[next.length - 1] = {
              ...last,
              content: `${last.content}${part.text || ''}`
            };
            return next;
          }

          return [...next, { role: 'zara', content: part.text || '' }];
        });
        return;
      }

      if (part.type === 'stop') {
        setChatLoading(false);
        window.setTimeout(() => onRecordCreated({ source: 'chat' }), 1000);
      }
    }
  });

  useEffect(() => {
    voiceConversationRef.current = conversation;
  }, [conversation]);

  // Clean up ElevenLabs session and local audio resources only when this widget unmounts.
  useEffect(() => {
    return () => {
      cleanupAudioVisualizer();
      try {
        voiceConversationRef.current?.endSession();
      } catch (err) {
        console.error("Error ending ElevenLabs session on unmount:", err);
      }
    };
  }, []);

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

  // Drive waveform from ElevenLabs SDK levels instead of opening a second mic stream.
  useEffect(() => {
    if (conversation.status === 'connected') {
      let lastTime = 0;
      const interval = 1000 / 24;

      const updateWaves = (timestamp: number) => {
        if (!lastTime) lastTime = timestamp;
        const elapsed = timestamp - lastTime;

        if (elapsed >= interval) {
          lastTime = timestamp - (elapsed % interval);

          // Respect prefers-reduced-motion - bypass animation state updates entirely
          if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
            setAudioNodes([15, 15, 15, 15, 15, 15, 15, 15, 15, 15, 15, 15, 15, 15, 15]);
            animationFrameRef.current = requestAnimationFrame(updateWaves);
            return;
          }

          const outputVolume = Number(conversation.getOutputVolume?.() ?? 0);
          const inputVolume = Number(conversation.getInputVolume?.() ?? 0);
          const activeVolume = Math.max(outputVolume, inputVolume);
          const speakerBias = conversation.isSpeaking ? outputVolume : inputVolume;
          const time = Date.now() * 0.006;

          setAudioNodes(prev => prev.map((prevVal, i) => {
            const centerDistance = Math.abs(i - (prev.length - 1) / 2) / ((prev.length - 1) / 2);
            const shape = 1 - centerDistance * 0.55;
            const breath = Math.sin(time + i * 0.45) * 2;
            const target = Math.max(
              8,
              Math.min(65, 10 + activeVolume * 58 * shape + speakerBias * 14 + breath)
            );
            return prevVal * 0.78 + target * 0.22;
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
    if (callState.status === 'connecting' || callState.status === 'active') {
      console.warn("Call start bypassed: session already connecting or active.");
      return;
    }
    sessionModeRef.current = 'voice';
    setCallState({ status: 'connecting', message: 'Preparing Zara voice session...' });
    setTranscript([]);
    setDetailsSent(false);
    setDetailsFormVisible(false);
    setDetailsFormMode('contact');
    setTypedDetails({ name: '', phone: '', email: '' });
    conversationIdRef.current = '';
    sessionAgentIdRef.current = '';
    callStartTime.current = null;
    isCallLogSaved.current = false;

    try {
      // 1. Fetch signed URL or public Agent ID from our secure backend endpoint.
      const res = await fetch('/api/elevenlabs/session');
      if (!res.ok) {
        throw new Error("ElevenLabs is not configured. Please add ELEVENLABS_AGENT_ID and ELEVENLABS_API_KEY in the backend environment.");
      }
      const data = await res.json();

      if (data.error || (!data.agentId && !data.signedUrl)) {
        throw new Error("ElevenLabs is not configured. Please add ELEVENLABS_AGENT_ID and ELEVENLABS_API_KEY in the backend environment.");
      }

      console.log("ElevenLabs session configurations retrieved successfully:", data);
      sessionAgentIdRef.current = data.agentId || '';

      // 2. Initiate the conversational session. The ElevenLabs SDK owns microphone capture.
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
      sessionModeRef.current = null;
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
    if (conversation.status !== 'connected' || sessionModeRef.current !== 'voice') return;

    const requestText = 'I want to speak to a manager.';
    try {
      conversation.sendUserMessage(requestText);
      setTranscript(prev => [...prev, { speaker: 'You', text: requestText }]);
    } catch (err) {
      console.error("Failed to send escalation request to Zara:", err);
    }
  };

  const handleTypedDetailsSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (conversation.status !== 'connected' || sessionModeRef.current !== 'voice') return;

    const entries = [
      ...(detailsFormMode === 'callback' ? [['Name', typedDetails.name.trim()]] : []),
      ['Phone', typedDetails.phone.trim()],
      ...(detailsFormMode === 'contact' ? [['Email', typedDetails.email.trim()]] : [])
    ].filter(([, value]) => value);

    if (entries.length === 0) return;

    const detailText = entries.map(([label, value]) => `${label}: ${value}`).join('\n');
    const message = detailsFormMode === 'callback'
      ? `The customer filled the manager callback form below in the dashboard. Use these typed values exactly. Do not ask for email or address for this escalation.\n${detailText}`
      : `The customer filled the phone/email form below in the dashboard. Use these typed values exactly. Do not ask the customer to spell them by voice. Read them back and confirm only if needed.\n${detailText}`;

    try {
      conversation.sendUserMessage(message);
      const transcriptEntry = formatTranscriptText(`Typed details sent:\n${detailText}`);
      setTranscript(prev => [...prev, { speaker: 'You', text: transcriptEntry }]);
      setDetailsSent(true);
      setDetailsFormVisible(false);

      if (detailsFormMode === 'callback') {
        const currentTranscript = [...transcript, { speaker: 'You' as const, text: transcriptEntry }]
          .map(t => `${t.speaker}: ${t.text}`)
          .join('\n');

        fetch('/api/escalations', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            customer_name: typedDetails.name.trim() || 'Voice Caller',
            customer_phone: typedDetails.phone.trim() || 'Active Live Session',
            customer_email: typedDetails.email.trim() || 'unknown@thecarnivore.local',
            reason: 'Manager callback requested via voice widget form',
            transcript: currentTranscript
          })
        })
        .then(res => {
          if (!res.ok) throw new Error(`HTTP error ${res.status}`);
          return res.json();
        })
        .then(data => {
          console.log("Escalation logged successfully from form:", data);
        })
        .catch(err => {
          console.error("Failed to log escalation from form:", err);
        });
      }
    } catch (err) {
      console.error("Failed to send typed details to Zara:", err);
      setDetailsSent(false);
    }
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
    setChatMessages(prev => [...prev, { role: 'customer' as const, content: query }]);
    setChatLoading(true);
    pendingChatMessageRef.current = query;

    try {
      if (conversation.status === 'connected' && sessionModeRef.current === 'chat') {
        pendingChatMessageRef.current = null;
        conversation.sendUserMessage(query);
        return;
      }

      if (conversation.status === 'connecting' && sessionModeRef.current === 'chat') {
        return;
      }

      sessionModeRef.current = 'chat';
      setChatSessionState('connecting');

      const response = await fetch('/api/elevenlabs/session');
      const data = await response.json().catch(() => ({}));

      if (!response.ok || data.error || (!data.agentId && !data.signedUrl)) {
        throw new Error(data.error || 'ElevenLabs Zara chat is not configured on the server.');
      }

      if (data.signedUrl) {
        conversation.startSession({
          signedUrl: data.signedUrl,
          textOnly: true,
          connectionType: 'websocket'
        });
      } else {
        conversation.startSession({
          agentId: data.agentId,
          textOnly: true,
          connectionType: 'websocket'
        });
      }
    } catch (err: any) {
      console.error(err);
      pendingChatMessageRef.current = null;
      sessionModeRef.current = null;
      setChatSessionState('failed');
      setChatLoading(false);
      setChatMessages(prev => [
        ...prev,
        { role: 'zara', content: err.message || 'Sorry, I could not connect to Zara chat. Please try again.' }
      ]);
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
            if (callState.status === 'active' || sessionModeRef.current === 'chat') {
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
            if (callState.status === 'active' || callState.status === 'connecting') {
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
                  <span>FPS: 24</span>
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

              {/* Typed phone/email handoff appears only when Zara asks for contact details. */}
              {detailsFormVisible && (
                <form onSubmit={handleTypedDetailsSubmit} className="bg-zinc-950/80 border border-red-900/60 rounded-xl p-3 shadow-lg shadow-red-950/20">
                  <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-1.5 mb-2">
                    <div>
                      <p className="text-xs font-bold text-zinc-200">
                        {detailsFormMode === 'callback' ? 'Fill callback details below' : 'Fill details below'}
                      </p>
                      <p className="text-[10px] text-zinc-500">
                        {detailsFormMode === 'callback'
                          ? 'Use this for exact manager callback name and number.'
                          : 'Use this for exact phone number and email address.'}
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={() => setDetailsFormVisible(false)}
                      className="text-[10px] font-bold text-zinc-500 hover:text-zinc-300"
                    >
                      Hide
                    </button>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    {detailsFormMode === 'callback' && (
                      <input
                        value={typedDetails.name}
                        onChange={e => {
                          setDetailsSent(false);
                          setTypedDetails(prev => ({ ...prev, name: e.target.value }));
                        }}
                        placeholder="Your name"
                        className="bg-zinc-900 border border-zinc-800 rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:ring-1 focus:ring-red-500"
                      />
                    )}
                    <input
                      value={typedDetails.phone}
                      onChange={e => {
                        setDetailsSent(false);
                        setTypedDetails(prev => ({ ...prev, phone: e.target.value }));
                      }}
                      placeholder="Phone number"
                      inputMode="tel"
                      className="bg-zinc-900 border border-zinc-800 rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:ring-1 focus:ring-red-500"
                    />
                    {detailsFormMode === 'contact' && (
                      <input
                        value={typedDetails.email}
                        onChange={e => {
                          setDetailsSent(false);
                          setTypedDetails(prev => ({ ...prev, email: e.target.value }));
                        }}
                        placeholder="Email address"
                        type="email"
                        inputMode="email"
                        className="bg-zinc-900 border border-zinc-800 rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:ring-1 focus:ring-red-500"
                      />
                    )}
                  </div>

                  <button
                    type="submit"
                    className="mt-2 w-full bg-red-600 hover:bg-red-700 text-white px-3 py-2 rounded-lg text-xs font-bold flex items-center justify-center gap-1.5"
                  >
                    <Send className="w-3.5 h-3.5" />
                    Send to Zara
                  </button>
                </form>
              )}

              {!detailsFormVisible && detailsSent && (
                <p className="text-[10px] font-bold text-emerald-400 text-center">
                  {detailsFormMode === 'callback' ? 'Callback details sent to Zara.' : 'Phone/email sent to Zara.'}
                </p>
              )}

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
                  <AlertCircle className="w-3.5 h-3.5 animate-pulse text-red-500" />
                  Request Manager Callback
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
                  <span>{chatSessionState === 'connecting' ? 'Connecting to Zara...' : 'Zara is typing...'}</span>
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
              placeholder={chatSessionState === 'failed' ? 'Try Zara chat again...' : 'Type a message to Zara...'}
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
