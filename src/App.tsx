import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Sparkles, Phone, ShoppingBag, Calendar, ListCollapse, AlertTriangle, ShieldCheck, 
  Search, Filter, Plus, Check, RefreshCw, Star, MessageSquare, AlertCircle, Eye, 
  ArrowRight, LogIn, LogOut, ChevronRight, CheckCircle2, TrendingUp, DollarSign, Users, 
  Clock, X, ChevronDown, UserCircle, LayoutGrid, PhoneCall, Play, Pause, Volume2, Cpu, Zap, ThumbsUp, Info
} from 'lucide-react';

import { Order, Reservation, MenuItem, ActivityEvent, FeedbackItem, EscalationItem, OrderStatus, ReservationStatus, CallLog } from './types';
import CallZaraWidget from './components/CallZaraWidget';
import StatusBadge from './components/StatusBadge';
import OrderCard from './components/OrderCard';
import ReservationCard from './components/ReservationCard';
import OrderTable from './components/OrderTable';
import ReservationTable from './components/ReservationTable';
import StatsCard from './components/StatsCard';
import ActivityTimeline from './components/ActivityTimeline';
import RecordDetailDrawer from './components/RecordDetailDrawer';
import MenuManagement from './components/MenuManagement';
import OwnerSidebar from './components/OwnerSidebar';
import MobileNav from './components/MobileNav';
import CarnivoreLogo from './components/CarnivoreLogo';
import { formatReservationDate } from './utils/date';

const containerVariants = {
  hidden: { opacity: 0 },
  show: {
    opacity: 1,
    transition: {
      staggerChildren: 0.05
    }
  }
};

const itemVariants = {
  hidden: { opacity: 0, y: 15 },
  show: { 
    opacity: 1, 
    y: 0, 
    transition: { 
      type: "spring", 
      stiffness: 300, 
      damping: 24 
    } 
  }
};

const getCallInsights = (transcript: string, status: string) => {
  const text = transcript.toLowerCase();
  let intent = "General Inquiry";
  let sentiment = "Neutral";
  let sentimentColor = "bg-zinc-100 text-zinc-700 border-zinc-200";
  let entities: string[] = [];

  if (status === 'ESCALATED') {
    intent = "Manager Escalation";
    sentiment = "Anxious/Urgent";
    sentimentColor = "bg-red-50 text-red-600 border-red-150";
  } else if (text.includes('reserve') || text.includes('table') || text.includes('booking')) {
    intent = "Table Reservation";
    sentiment = "Friendly / Satisfied";
    sentimentColor = "bg-emerald-50 text-emerald-700 border-emerald-150";
  } else if (text.includes('order') || text.includes('shank') || text.includes('meat') || text.includes('buy') || text.includes('price')) {
    intent = "Order Placement";
    sentiment = "Satisfied";
    sentimentColor = "bg-blue-50 text-blue-700 border-blue-150";
  } else if (text.includes('allergy') || text.includes('allergic') || text.includes('severe')) {
    intent = "Allergen Support";
    sentiment = "Concerned";
    sentimentColor = "bg-amber-50 text-amber-700 border-amber-150";
  }

  // Extract entities
  if (text.includes('shank') || text.includes('lamb')) entities.push("🍖 Lamb Shank");
  if (text.includes('rib') || text.includes('wagyu')) entities.push("🥩 Wagyu Ribs");
  if (text.includes('tonight') || text.includes('today')) entities.push("📅 Same-Day");
  if (text.includes('8 pm') || text.includes('8pm') || text.includes('20:00')) entities.push("⏰ 8:00 PM");
  if (text.includes('4 people') || text.includes('four') || text.includes('4 guests')) entities.push("👥 4 Guests");
  if (text.includes('camel') || text.includes('meat')) entities.push("🐫 Camel Ribs");
  if (entities.length === 0) {
    entities = ["🤖 AI Conversational Flow", "📞 Voice Line"];
  }

  return { intent, sentiment, sentimentColor, entities };
};

export default function App() {
  // Roles & View states
  const [role, setRole] = useState<'customer' | 'owner'>('customer');
  const [isOwnerAuthenticated, setIsOwnerAuthenticated] = useState(false);
  const [activeTab, setActiveTab] = useState('call'); // For customer: 'call' | 'orders' | 'reservations'
  
  // Admin Login Form
  const [adminEmail, setAdminEmail] = useState('');
  const [adminPassword, setAdminPassword] = useState('');
  const [loginError, setLoginError] = useState('');
  const [authenticatedEmail, setAuthenticatedEmail] = useState('owner@thecarnivore.com');

  // Config
  const [config, setConfig] = useState({
    isSupabaseConfigured: false,
    hasN8nWebhook: false,
    elevenlabsAgentId: ''
  });

  // Data Lists
  const [orders, setOrders] = useState<Order[]>([]);
  const [reservations, setReservations] = useState<Reservation[]>([]);
  const [menuItems, setMenuItems] = useState<MenuItem[]>([]);
  const [activityEvents, setActivityEvents] = useState<ActivityEvent[]>([]);
  const [feedback, setFeedback] = useState<FeedbackItem[]>([]);
  const [escalations, setEscalations] = useState<EscalationItem[]>([]);
  const [callLogs, setCallLogs] = useState<CallLog[]>([]);

  // Search & Filter
  const [customerSearch, setCustomerSearch] = useState('');
  const [customerSearchLoading, setCustomerSearchLoading] = useState(false);
  const [ownerSearch, setOwnerSearch] = useState('');
  const [callLogSearch, setCallLogSearch] = useState('');
  const [logStatusFilter, setLogStatusFilter] = useState<'ALL' | 'COMPLETED' | 'ESCALATED'>('ALL');
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [dateFilter, setDateFilter] = useState('');
  const [customerPhoneFilter, setCustomerPhoneFilter] = useState('');
  const [customerEmailFilter, setCustomerEmailFilter] = useState('');
  const [isFiltersExpanded, setIsFiltersExpanded] = useState(false);

  // Selected details drawer
  const [selectedRecord, setSelectedRecord] = useState<any>(null);
  const [selectedRecordType, setSelectedRecordType] = useState<'order' | 'reservation' | null>(null);
  const [selectedCallLog, setSelectedCallLog] = useState<CallLog | null>(null);
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);

  // Playback States
  const [isCallPlaying, setIsCallPlaying] = useState(false);
  const [callProgress, setCallProgress] = useState(0);
  const [playbackSpeed, setPlaybackSpeed] = useState<number>(1);

  // Voice Interaction Helpers
  const [selectedVoiceAction, setSelectedVoiceAction] = useState<string>('');

  // Notifications
  const [toast, setToast] = useState<{ show: boolean; msg: string; type: 'success' | 'error' }>({ show: false, msg: '', type: 'success' });

  // Feedback form state
  const [fbName, setFbName] = useState('');
  const [fbPhone, setFbPhone] = useState('');
  const [fbEmail, setFbEmail] = useState('');
  const [fbRating, setFbRating] = useState(5);
  const [fbComment, setFbComment] = useState('');
  const [fbSuccess, setFbSuccess] = useState(false);
  const [showElevenLabsChecklist, setShowElevenLabsChecklist] = useState(false);

  // Revenue filters state
  const [revDateFilter, setRevDateFilter] = useState('');
  const [revMonthFilter, setRevMonthFilter] = useState('ALL');
  const [revTimeFilter, setRevTimeFilter] = useState('ALL');
  const [revTypeFilter, setRevTypeFilter] = useState<'ALL' | 'ORDERS' | 'RESERVATIONS'>('ALL');

  const showToast = (msg: string, type: 'success' | 'error' = 'success') => {
    setToast({ show: true, msg, type });
    setTimeout(() => {
      setToast(prev => ({ ...prev, show: false }));
    }, 4000);
  };

  // Initial Configuration Fetch
  useEffect(() => {
    fetch('/api/config')
      .then(r => r.json())
      .then(setConfig)
      .catch(e => console.error("Error fetching config:", e));
  }, []);

  // Fetch Core Data (Owner gets everything, Customer loads Menu only)
  const loadData = () => {
    // Menu items are always loaded for customer view or owner management view
    fetch('/api/menu')
      .then(r => r.json())
      .then(setMenuItems)
      .catch(e => console.error("Error loading menu:", e));

    if (isOwnerAuthenticated) {
      // Orders
      fetch('/api/orders')
        .then(r => r.json())
        .then(setOrders)
        .catch(e => console.error("Error loading orders:", e));

      // Reservations
      fetch('/api/reservations')
        .then(r => r.json())
        .then(setReservations)
        .catch(e => console.error("Error loading reservations:", e));

      // Activity Timeline
      fetch('/api/activity')
        .then(r => r.json())
        .then(setActivityEvents)
        .catch(e => console.error("Error loading activity logs:", e));

      // Feedback
      fetch('/api/feedback')
        .then(r => r.json())
        .then(setFeedback)
        .catch(e => console.error("Error loading feedback logs:", e));

      // Escalations
      fetch('/api/escalations')
        .then(r => r.json())
        .then(setEscalations)
        .catch(e => console.error("Error loading escalations:", e));

      // Call Logs
      fetch('/api/call-logs')
        .then(r => r.json())
        .then(setCallLogs)
        .catch(e => console.error("Error loading call logs:", e));
    }
  };

  useEffect(() => {
    loadData();
    // Poll updates every 10 seconds for real-time dashboard feel
    const interval = setInterval(loadData, 10000);
    return () => clearInterval(interval);
  }, [isOwnerAuthenticated]);

  // Auto-select first call log if none is selected
  useEffect(() => {
    if (callLogs.length > 0 && !selectedCallLog) {
      setSelectedCallLog(callLogs[0]);
    }
  }, [callLogs, selectedCallLog]);

  // Reset and handle playing simulation
  useEffect(() => {
    setIsCallPlaying(false);
    setCallProgress(0);
  }, [selectedCallLog]);

  useEffect(() => {
    let interval: NodeJS.Timeout | null = null;
    if (isCallPlaying && selectedCallLog) {
      const totalSeconds = selectedCallLog.duration_seconds || 60;
      const stepMs = 100; // update 10 times a second for super smooth progress
      const progressPerStep = (stepMs / (totalSeconds * 1000)) * 100 * playbackSpeed;
      
      interval = setInterval(() => {
        setCallProgress(prev => {
          if (prev >= 100) {
            setIsCallPlaying(false);
            return 100;
          }
          return Math.min(prev + progressPerStep, 100);
        });
      }, stepMs);
    }
    return () => {
      if (interval) clearInterval(interval);
    };
  }, [isCallPlaying, selectedCallLog, playbackSpeed]);

  // Check auth status on mount
  useEffect(() => {
    fetch('/api/auth/owner/me')
      .then(r => r.json())
      .then(data => {
        if (data.authenticated) {
          setIsOwnerAuthenticated(true);
          setAuthenticatedEmail(data.email || 'owner@thecarnivore.com');
          setRole('owner');
        }
      })
      .catch(e => console.warn("Not authenticated on start:", e));
  }, []);

  // Filter call logs based on search term and status
  const filteredCallLogs = callLogs.filter(log => {
    if (logStatusFilter !== 'ALL' && log.status !== logStatusFilter) return false;
    if (!callLogSearch) return true;
    const q = callLogSearch.toLowerCase();
    return (
      log.customer_name.toLowerCase().includes(q) ||
      log.customer_phone.toLowerCase().includes(q) ||
      (log.transcript && log.transcript.toLowerCase().includes(q))
    );
  });

  // Admin login trigger
  const handleAdminLogin = (e: React.FormEvent) => {
    e.preventDefault();
    setLoginError('');
    
    fetch('/api/auth/owner/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: adminEmail, password: adminPassword })
    })
    .then(async r => {
      const data = await r.json();
      if (r.ok && data.success) {
        setIsOwnerAuthenticated(true);
        setAuthenticatedEmail(adminEmail || 'owner@thecarnivore.com');
        setActiveTab('overview');
        setLoginError('');
        showToast("Authenticated as Owner");
      } else {
        setLoginError(data.error || "Invalid owner credentials.");
      }
    })
    .catch(err => {
      console.error(err);
      setLoginError("Login failed. Check server connection.");
    });
  };

  const handleAdminLogOut = () => {
    fetch('/api/auth/owner/logout', { method: 'POST' })
    .finally(() => {
      setIsOwnerAuthenticated(false);
      setRole('customer');
      setActiveTab('call');
      setAuthenticatedEmail('owner@thecarnivore.com');
      showToast("Signed out of Owner Portal");
    });
  };

  // Record Search by ID, Email, or Phone (Data Privacy Compliant)
  const handleCustomerQuerySearch = (e: React.FormEvent) => {
    e.preventDefault();
    const query = customerSearch.trim();
    if (!query) return;

    setCustomerSearchLoading(true);
    
    // Clear previous lists first so we only display user's searched data
    setOrders([]);
    setReservations([]);

    const uppercaseQuery = query.toUpperCase();

    if (uppercaseQuery.startsWith('ORD-')) {
      // Lookup specific order via secure customer route
      fetch(`/api/customer/orders?order_number=${encodeURIComponent(uppercaseQuery)}`)
        .then(r => r.json())
        .then(data => {
          setCustomerSearchLoading(false);
          if (data && data.length > 0) {
            setOrders(data);
            setSelectedRecord(data[0]);
            setSelectedRecordType('order');
            setIsDrawerOpen(true);
            setActiveTab('orders');
            showToast(`Order ${uppercaseQuery} loaded successfully.`);
          } else {
            showToast(`Order ${uppercaseQuery} not found.`, 'error');
          }
        })
        .catch(err => {
          setCustomerSearchLoading(false);
          console.error(err);
          showToast("Error searching for order.", "error");
        });
    } else if (uppercaseQuery.startsWith('RES-')) {
      // Lookup specific reservation via secure customer route
      fetch(`/api/customer/reservations?reservation_number=${encodeURIComponent(uppercaseQuery)}`)
        .then(r => r.json())
        .then(data => {
          setCustomerSearchLoading(false);
          if (data && data.length > 0) {
            setReservations(data);
            setSelectedRecord(data[0]);
            setSelectedRecordType('reservation');
            setIsDrawerOpen(true);
            setActiveTab('reservations');
            showToast(`Reservation ${uppercaseQuery} loaded successfully.`);
          } else {
            showToast(`Reservation ${uppercaseQuery} not found.`, 'error');
          }
        })
        .catch(err => {
          setCustomerSearchLoading(false);
          console.error(err);
          showToast("Error searching for reservation.", "error");
        });
    } else if (query.includes('@')) {
      // Lookup by email via secure customer routes
      Promise.all([
        fetch(`/api/customer/orders?email=${encodeURIComponent(query.toLowerCase())}`).then(r => r.json()),
        fetch(`/api/customer/reservations?email=${encodeURIComponent(query.toLowerCase())}`).then(r => r.json())
      ])
      .then(([ordersData, reservationsData]) => {
        setCustomerSearchLoading(false);
        setOrders(ordersData);
        setReservations(reservationsData);
        if (ordersData.length > 0 || reservationsData.length > 0) {
          showToast(`Loaded ${ordersData.length} orders and ${reservationsData.length} reservations.`);
          if (ordersData.length > 0) setActiveTab('orders');
          else setActiveTab('reservations');
        } else {
          showToast(`No records found for email ${query}`, 'error');
        }
      })
      .catch(err => {
        setCustomerSearchLoading(false);
        setAdminPassword('');
        console.error(err);
        showToast("Error searching by email.", "error");
      });
    } else {
      // Lookup by phone via secure customer routes
      fetch(`/api/customer/orders?phone=${encodeURIComponent(query)}`)
        .then(r => r.json())
        .then(ordersData => {
          return fetch(`/api/customer/reservations?phone=${encodeURIComponent(query)}`)
            .then(r => r.json())
            .then(reservationsData => {
              setCustomerSearchLoading(false);
              setOrders(ordersData);
              setReservations(reservationsData);
              if (ordersData.length > 0 || reservationsData.length > 0) {
                showToast(`Loaded ${ordersData.length} orders and ${reservationsData.length} reservations.`);
                if (ordersData.length > 0) setActiveTab('orders');
                else setActiveTab('reservations');
              } else {
                showToast(`No records found for phone ${query}`, 'error');
              }
            });
        })
        .catch(err => {
          setCustomerSearchLoading(false);
          console.error(err);
          showToast("Error searching by phone.", "error");
        });
    }
  };

  // Status changers
  const handleOrderStatusChange = (orderId: string, newStatus: OrderStatus) => {
    fetch(`/api/orders/${orderId}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status: newStatus })
    })
    .then(r => r.json())
    .then(() => {
      showToast(`Order status updated to ${newStatus}`);
      loadData();
    })
    .catch(() => showToast("Failed to update order status", "error"));
  };

  const handleResStatusChange = (resId: string, newStatus: ReservationStatus) => {
    fetch(`/api/reservations/${resId}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status: newStatus })
    })
    .then(r => r.json())
    .then(() => {
      showToast(`Reservation status updated to ${newStatus}`);
      loadData();
    })
    .catch(() => showToast("Failed to update reservation status", "error"));
  };

  // Submit web feedback
  const handleFeedbackSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!fbName || !fbComment) return;

    fetch('/api/feedback', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        customer_name: fbName,
        customer_phone: fbPhone || '+15550001111',
        customer_email: fbEmail || 'feedback@thecarnivore.com',
        rating: fbRating,
        comment: fbComment
      })
    })
    .then(() => {
      setFbSuccess(true);
      showToast("Thank you for your valuable feedback!");
      setFbName('');
      setFbComment('');
      loadData();
    });
  };

  // Pre-load Voice context
  const triggerVoiceAction = (action: string) => {
    setSelectedVoiceAction(action);
    setActiveTab('call');
    // Auto-scroll on mobile to make the call widget clearly visible
    const element = document.getElementById('zara-call-widget');
    if (element) {
      element.scrollIntoView({ behavior: 'smooth' });
    }
  };

  // Cancel orders or reservations from drawer/actions
  const handleCancelRecord = (id: string, recordType: 'order' | 'reservation') => {
    const url = recordType === 'order' ? `/api/orders/${id}` : `/api/reservations/${id}`;
    fetch(url, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status: 'CANCELLED' })
    })
    .then(() => {
      showToast(`${recordType === 'order' ? 'Order' : 'Reservation'} cancelled successfully.`);
      loadData();
    })
    .catch(() => showToast("Cancellation failed", "error"));
  };

  const handleModifyRecord = (rec: any, recordType: 'order' | 'reservation') => {
    // Open voice assistant with specific modify context
    triggerVoiceAction(recordType === 'order' ? 'cancel_order' : 'cancel_res');
  };

  // Analytics helper formulas
  const totalOrdersToday = orders.filter(o => o.status !== 'CANCELLED' && new Date(o.created_at).toDateString() === new Date().toDateString()).length;
  
  const totalRevenueToday = orders
    .filter(o => o.status !== 'CANCELLED' && new Date(o.created_at).toDateString() === new Date().toDateString())
    .reduce((sum, o) => sum + Number(o.total_amount), 0);

  const pendingOrders = orders.filter(o => o.status === 'RECEIVED' || o.status === 'PREPARING').length;
  const resToday = reservations.filter(r => r.status !== 'CANCELLED' && new Date(r.reservation_date).toDateString() === new Date().toDateString()).length;
  const cancellationsToday = orders.filter(o => o.status === 'CANCELLED' && new Date(o.created_at).toDateString() === new Date().toDateString()).length +
                             reservations.filter(r => r.status === 'CANCELLED' && new Date(r.created_at).toDateString() === new Date().toDateString()).length;

  // Filter Owner records
  const filteredOrders = orders.filter(o => {
    const matchesSearch = String(o.order_number || '').toLowerCase().includes(ownerSearch.toLowerCase()) || 
                          String(o.customer_name || '').toLowerCase().includes(ownerSearch.toLowerCase()) ||
                          String(o.customer_phone || '').includes(ownerSearch);
    const matchesStatus = statusFilter === 'ALL' || o.status === statusFilter;
    const matchesDate = !dateFilter || String(o.created_at || '').startsWith(dateFilter);
    const matchesPhone = !customerPhoneFilter || String(o.customer_phone || '').includes(customerPhoneFilter);
    const matchesEmail = !customerEmailFilter || String(o.customer_email || '').toLowerCase().includes(customerEmailFilter.toLowerCase());
    return matchesSearch && matchesStatus && matchesDate && matchesPhone && matchesEmail;
  });

  const filteredReservations = reservations.filter(r => {
    const matchesSearch = String(r.reservation_number || '').toLowerCase().includes(ownerSearch.toLowerCase()) || 
                          String(r.customer_name || '').toLowerCase().includes(ownerSearch.toLowerCase()) ||
                          String(r.customer_phone || '').includes(ownerSearch);
    const matchesStatus = statusFilter === 'ALL' || r.status === statusFilter;
    const matchesDate = !dateFilter || r.reservation_date === dateFilter;
    const matchesPhone = !customerPhoneFilter || String(r.customer_phone || '').includes(customerPhoneFilter);
    const matchesEmail = !customerEmailFilter || String(r.customer_email || '').toLowerCase().includes(customerEmailFilter.toLowerCase());
    return matchesSearch && matchesStatus && matchesDate && matchesPhone && matchesEmail;
  });

  // Filter completed orders and reservations for revenue analytics
  const completedOrders = orders.filter(o => o.status === 'COMPLETED');
  const completedReservations = reservations.filter(r => r.status === 'COMPLETED');

  // Filter completed orders based on selection
  const filteredRevOrders = completedOrders.filter(o => {
    if (revDateFilter) {
      const orderDate = new Date(o.created_at).toISOString().split('T')[0];
      if (orderDate !== revDateFilter) return false;
    }
    if (revMonthFilter !== 'ALL') {
      const orderMonth = new Date(o.created_at).getMonth();
      if (orderMonth !== Number(revMonthFilter)) return false;
    }
    if (revTimeFilter !== 'ALL') {
      const hour = new Date(o.created_at).getHours();
      if (revTimeFilter === 'MORNING' && (hour < 6 || hour >= 12)) return false;
      if (revTimeFilter === 'AFTERNOON' && (hour < 12 || hour >= 18)) return false;
      if (revTimeFilter === 'EVENING' && (hour < 18 || hour >= 23)) return false;
      if (revTimeFilter === 'NIGHT' && (hour >= 23 || hour < 6)) return false;
    }
    return true;
  });

  // Filter completed reservations based on selection
  const filteredRevReservations = completedReservations.filter(r => {
    if (revDateFilter) {
      if (r.reservation_date !== revDateFilter) return false;
    }
    if (revMonthFilter !== 'ALL') {
      const dateParts = r.reservation_date.split('-');
      const resMonth = dateParts[1] ? Number(dateParts[1]) - 1 : -1;
      if (resMonth !== Number(revMonthFilter)) return false;
    }
    if (revTimeFilter !== 'ALL') {
      let hour = 12;
      const timeStr = r.reservation_time.toLowerCase();
      const match = timeStr.match(/^(\d+):(\d+)\s*(pm|am)?/);
      if (match) {
        let h = Number(match[1]);
        const isPm = match[3] === 'pm';
        const isAm = match[3] === 'am';
        if (isPm && h < 12) h += 12;
        if (isAm && h === 12) h = 0;
        hour = h;
      } else {
        const parts = timeStr.split(':');
        if (parts[0]) hour = Number(parts[0]);
      }
      if (revTimeFilter === 'MORNING' && (hour < 6 || hour >= 12)) return false;
      if (revTimeFilter === 'AFTERNOON' && (hour < 12 || hour >= 18)) return false;
      if (revTimeFilter === 'EVENING' && (hour < 18 || hour >= 23)) return false;
      if (revTimeFilter === 'NIGHT' && (hour >= 23 || hour < 6)) return false;
    }
    return true;
  });

  const completedRevOrdersRevenue = filteredRevOrders.reduce((sum, o) => sum + Number(o.total_amount || 0), 0);
  const completedRevReservationsGuests = filteredRevReservations.reduce((sum, r) => sum + Number(r.party_size || 0), 0);

  const combinedRevItems = [
    ...filteredRevOrders.map(o => ({
      id: o.id,
      number: o.order_number ? `ORD-${o.order_number}` : 'ORD-NEW',
      type: 'Order' as const,
      customer: o.customer_name,
      date: new Date(o.created_at).toISOString().split('T')[0],
      time: new Date(o.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      details: o.items?.map((item: any) => `${item.quantity}x ${item.item_name}`).join(', ') || 'Custom order',
      amount: Number(o.total_amount || 0),
      raw_date: o.created_at
    })),
    ...filteredRevReservations.map(r => ({
      id: r.id,
      number: r.reservation_number ? `RES-${r.reservation_number}` : 'RES-NEW',
      type: 'Reservation' as const,
      customer: r.customer_name,
      date: r.reservation_date,
      time: r.reservation_time,
      details: `Table for ${r.party_size} guests`,
      amount: 0,
      raw_date: `${r.reservation_date}T${r.reservation_time.includes(':') ? (r.reservation_time.split(' ')[0]?.includes(':') ? r.reservation_time.split(' ')[0] : '00:00') : '00:00'}`
    }))
  ].filter(item => {
    if (revTypeFilter === 'ORDERS') return item.type === 'Order';
    if (revTypeFilter === 'RESERVATIONS') return item.type === 'Reservation';
    return true;
  }).sort((a, b) => new Date(b.raw_date).getTime() - new Date(a.raw_date).getTime());

  return (
    <div id="app-root-container" className="min-h-screen bg-zinc-50 flex flex-col justify-between">
      
      {/* 1. Global Status / Toast notifications */}
      <AnimatePresence>
        {toast.show && (
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="fixed top-5 left-1/2 -translate-x-1/2 z-50 flex items-center gap-2 bg-zinc-900 border border-zinc-800 text-white px-5 py-3 rounded-2xl shadow-2xl"
          >
            {toast.type === 'success' ? (
              <CheckCircle2 className="w-5 h-5 text-emerald-400 flex-shrink-0" />
            ) : (
              <AlertCircle className="w-5 h-5 text-rose-400 flex-shrink-0" />
            )}
            <span className="text-sm font-semibold tracking-tight">{toast.msg}</span>
          </motion.div>
        )}
      </AnimatePresence>

      {/* 2. CUSTOMER VIEW MODULE */}
      {role === 'customer' && (
        <div className="flex-1 flex flex-col pb-24 md:pb-10">
          
          {/* Main Top Header */}
          <header className="bg-white border-b border-zinc-200 py-3 px-4 sm:px-6 sticky top-0 z-30">
            <div className="max-w-7xl mx-auto flex items-center justify-between">
              <div className="flex items-center gap-3">
                <CarnivoreLogo className="w-10 h-10" />
                <div>
                  <h1 className="font-black text-sm tracking-tight leading-none text-zinc-900">THE CARNIVORE</h1>
                  <p className="text-[10px] text-zinc-400 font-bold mt-0.5 tracking-wider uppercase">AI voice concierge</p>
                </div>
              </div>

              {/* Header Right toggles */}
              <div className="flex items-center gap-3">
                <button
                  onClick={() => setRole('owner')}
                  className="flex items-center gap-1.5 bg-zinc-100 hover:bg-zinc-200 text-zinc-700 text-xs font-bold px-2.5 sm:px-3.5 py-2 rounded-xl transition-colors cursor-pointer border border-zinc-200/50"
                >
                  <LogIn className="w-3.5 h-3.5" />
                  <span className="hidden sm:inline">Admin Portal</span>
                  <span className="inline sm:hidden">Admin</span>
                </button>
              </div>
            </div>
          </header>

          {/* Customer Container Grid */}
          <main className="flex-1 max-w-7xl w-full mx-auto px-4 md:px-6 py-6 grid grid-cols-1 lg:grid-cols-12 gap-6">
            
            {/* Left/Middle Column (8-col width on desktop) */}
            <div className="lg:col-span-8 space-y-6">
              
               {/* Query Lookup search */}
              <div className="bg-white border border-zinc-200 rounded-2xl p-5 shadow-sm">
                <h2 className="text-base font-bold text-zinc-950 flex items-center gap-2 mb-1">
                  <Search className="w-5 h-5 text-zinc-500" />
                  Quick Booking & Order Tracker
                </h2>
                <p className="text-xs text-zinc-500 mb-3 leading-relaxed">
                  To protect your data privacy, your bookings are not loaded publicly. Search using your <strong>Order Number (ORD-####)</strong>, <strong>Reservation ID (RES-####)</strong>, <strong>Email</strong>, or <strong>Phone Number</strong> to securely access and track your records.
                </p>
                <form onSubmit={handleCustomerQuerySearch} className="flex flex-col sm:flex-row gap-2">
                  <input
                    type="text"
                    value={customerSearch}
                    onChange={e => setCustomerSearch(e.target.value)}
                    placeholder="Search ORD-1001, RES-1001, email, or phone..."
                    className="w-full sm:flex-1 bg-zinc-50 border border-zinc-200 rounded-xl px-4 py-2.5 text-sm text-zinc-800 placeholder-zinc-400 focus:outline-none focus:ring-1 focus:ring-red-500 focus:bg-white"
                  />
                  <button
                    type="submit"
                    disabled={customerSearchLoading}
                    className="w-full sm:w-auto bg-zinc-900 hover:bg-zinc-800 disabled:bg-zinc-400 text-white font-bold px-5 py-2.5 rounded-xl text-xs cursor-pointer shadow-sm flex items-center gap-1.5 min-w-[85px] justify-center transition-colors"
                  >
                    {customerSearchLoading ? (
                      <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                    ) : (
                      <>
                        <span>Track</span>
                        <ArrowRight className="w-3.5 h-3.5" />
                      </>
                    )}
                  </button>
                </form>
              </div>

              {/* Dynamic Customer Tabs navigation (Always visible and scrollable) */}
              <div className="flex border-b border-zinc-200 overflow-x-auto scrollbar-none sticky top-[65px] bg-zinc-50/95 backdrop-blur-sm z-25 py-1 -mx-4 px-4 sm:mx-0 sm:px-0">
                <button
                  onClick={() => setActiveTab('call')}
                  className={`px-4 sm:px-5 py-2.5 sm:py-3 text-xs sm:text-sm font-bold border-b-2 transition-all cursor-pointer flex items-center gap-1.5 sm:gap-2 whitespace-nowrap ${
                    activeTab === 'call' ? 'border-red-600 text-red-600' : 'border-transparent text-zinc-500 hover:text-zinc-800'
                  }`}
                >
                  <Phone className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                  Talk to Zara
                </button>
                <button
                  onClick={() => setActiveTab('menu')}
                  className={`px-4 sm:px-5 py-2.5 sm:py-3 text-xs sm:text-sm font-bold border-b-2 transition-all cursor-pointer flex items-center gap-1.5 sm:gap-2 whitespace-nowrap ${
                    activeTab === 'menu' ? 'border-red-600 text-red-600' : 'border-transparent text-zinc-500 hover:text-zinc-800'
                  }`}
                >
                  <ListCollapse className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                  Signature Menu
                </button>
                <button
                  onClick={() => setActiveTab('orders')}
                  className={`px-4 sm:px-5 py-2.5 sm:py-3 text-xs sm:text-sm font-bold border-b-2 transition-all cursor-pointer flex items-center gap-1.5 sm:gap-2 whitespace-nowrap ${
                    activeTab === 'orders' ? 'border-red-600 text-red-600' : 'border-transparent text-zinc-500 hover:text-zinc-800'
                  }`}
                >
                  <ShoppingBag className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                  My Orders
                </button>
                <button
                  onClick={() => setActiveTab('reservations')}
                  className={`px-4 sm:px-5 py-2.5 sm:py-3 text-xs sm:text-sm font-bold border-b-2 transition-all cursor-pointer flex items-center gap-1.5 sm:gap-2 whitespace-nowrap ${
                    activeTab === 'reservations' ? 'border-red-600 text-red-600' : 'border-transparent text-zinc-500 hover:text-zinc-800'
                  }`}
                >
                  <Calendar className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                  Reservations
                </button>
              </div>

              {/* Tab Display Modules */}
              <AnimatePresence mode="wait">
                
                {/* 1. Voice Agent Zara Module */}
                {activeTab === 'call' && (
                  <motion.div
                    key="call-tab"
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -10 }}
                    className="space-y-6"
                  >
                    {/* The voice controller */}
                    <CallZaraWidget 
                      onRecordCreated={loadData} 
                      preSelectedAction={selectedVoiceAction}
                      onClearAction={() => setSelectedVoiceAction('')}
                    />

                    {/* Quick Trigger context panels */}
                    <div>
                      <h3 className="text-xs font-bold uppercase tracking-wider text-zinc-400 mb-3">Quick commands for Zara</h3>
                      <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                        {[
                          { action: 'order', label: 'Order Food', desc: 'Place a meat order', icon: ShoppingBag },
                          { action: 'reservation', label: 'Book a Table', desc: 'Table reservation', icon: Calendar },
                          { action: 'eta', label: 'Check ETA', desc: 'Driver status & timeline', icon: Clock },
                          { action: 'cancel_order', label: 'Cancel Order', desc: 'Request ORD cancellation', icon: X },
                          { action: 'cancel_res', label: 'Cancel Reservation', desc: 'Request table cancellation', icon: X },
                        ].map((btn, i) => {
                          const Icon = btn.icon;
                          return (
                            <button
                              key={i}
                              onClick={() => triggerVoiceAction(btn.action)}
                              className="bg-white hover:bg-zinc-50 border border-zinc-200 rounded-xl p-3.5 text-left transition-colors cursor-pointer flex flex-col justify-between h-full hover:border-red-500/40"
                            >
                              <div className="p-2 bg-red-50 rounded-lg text-red-600 w-max mb-3 border border-red-100">
                                <Icon className="w-4 h-4" />
                              </div>
                              <div>
                                <span className="font-bold text-sm text-zinc-900 block leading-tight">{btn.label}</span>
                                <span className="text-[10px] text-zinc-400 block mt-1">{btn.desc}</span>
                              </div>
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  </motion.div>
                )}

                {/* 2. Customer Orders list */}
                {activeTab === 'orders' && (
                  <motion.div
                    key="orders-tab"
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -10 }}
                    className="space-y-4"
                  >
                    <div className="flex items-center justify-between">
                      <h3 className="font-bold text-zinc-900 text-base">Your Active Orders</h3>
                      <span className="text-xs font-mono font-bold text-zinc-400 bg-zinc-100 border border-zinc-200 px-2 py-0.5 rounded">
                        {orders.length} total
                      </span>
                    </div>

                    {orders.length === 0 ? (
                      <div className="flex flex-col items-center justify-center py-12 text-center bg-white border border-zinc-200 rounded-2xl">
                        <ShoppingBag className="w-10 h-10 text-zinc-300 mb-2" />
                        <p className="text-sm text-zinc-500 font-medium">No order history available</p>
                        <p className="text-xs text-zinc-400 mt-1">Talk to Zara to place your first meat order!</p>
                      </div>
                    ) : (
                      <motion.div
                        variants={containerVariants}
                        initial="hidden"
                        animate="show"
                        className="grid grid-cols-1 md:grid-cols-2 gap-4"
                      >
                        {orders.map(order => (
                          <motion.div key={order.id} variants={itemVariants}>
                            <OrderCard
                              order={order}
                              onViewDetails={(ord) => {
                                setSelectedRecord(ord);
                                setSelectedRecordType('order');
                                setIsDrawerOpen(true);
                              }}
                              onModify={(ord) => handleModifyRecord(ord, 'order')}
                              onCancel={(ord) => handleCancelRecord(ord.id, 'order')}
                            />
                          </motion.div>
                        ))}
                      </motion.div>
                    )}
                  </motion.div>
                )}

                {/* 3. Customer Reservations list */}
                {activeTab === 'reservations' && (
                  <motion.div
                    key="reservations-tab"
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -10 }}
                    className="space-y-4"
                  >
                    <div className="flex items-center justify-between">
                      <h3 className="font-bold text-zinc-900 text-base">Your Table Reservations</h3>
                      <span className="text-xs font-mono font-bold text-zinc-400 bg-zinc-100 border border-zinc-200 px-2 py-0.5 rounded">
                        {reservations.length} total
                      </span>
                    </div>

                    {reservations.length === 0 ? (
                      <div className="flex flex-col items-center justify-center py-12 text-center bg-white border border-zinc-200 rounded-2xl">
                        <Calendar className="w-10 h-10 text-zinc-300 mb-2" />
                        <p className="text-sm text-zinc-500 font-medium">No table reservations booked</p>
                        <p className="text-xs text-zinc-400 mt-1">Speak with Zara to secure a premium window table!</p>
                      </div>
                    ) : (
                      <motion.div
                        variants={containerVariants}
                        initial="hidden"
                        animate="show"
                        className="grid grid-cols-1 md:grid-cols-2 gap-4"
                      >
                        {reservations.map(res => (
                          <motion.div key={res.id} variants={itemVariants}>
                            <ReservationCard
                              reservation={res}
                              onViewDetails={(r) => {
                                setSelectedRecord(r);
                                setSelectedRecordType('reservation');
                                setIsDrawerOpen(true);
                              }}
                              onModify={(r) => handleModifyRecord(r, 'reservation')}
                              onCancel={(r) => handleCancelRecord(r.id, 'reservation')}
                            />
                          </motion.div>
                        ))}
                      </motion.div>
                    )}
                  </motion.div>
                )}

                {/* 4. Customer Signature Menu Section */}
                {activeTab === 'menu' && (
                  <motion.div
                    key="menu-tab"
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -10 }}
                    className="space-y-6"
                  >
                    <div className="bg-gradient-to-r from-red-950 via-zinc-900 to-red-950 text-white rounded-2xl p-6 md:p-8 shadow-md relative overflow-hidden">
                      <div className="absolute right-0 bottom-0 opacity-15 translate-y-6 translate-x-6 pointer-events-none">
                        <CarnivoreLogo className="w-56 h-56" />
                      </div>
                      <div className="relative z-10 max-w-xl space-y-2">
                        <span className="bg-red-500/20 text-red-400 border border-red-500/30 text-[10px] font-bold uppercase tracking-wider px-2.5 py-1 rounded-full">Carnivore's Selection</span>
                        <h2 className="text-xl md:text-2xl font-black tracking-tight">Carnivore's Signature Gourmet Menu</h2>
                        <p className="text-xs text-zinc-300 leading-relaxed font-medium">
                          Indulge in premium cuts of Lamb, slow-roasted Beef, lean Camel meats, and crispy Baked Chicken. 
                          Our meats are cooked using traditional techniques with precision and passion. 
                          Connect with <strong>Zara</strong>, our AI Voice Concierge, to order right away.
                        </p>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      {menuItems.filter(item => item.active).length === 0 ? (
                        <div className="col-span-full flex flex-col items-center justify-center py-12 text-center bg-white border border-zinc-200 rounded-2xl">
                          <ListCollapse className="w-10 h-10 text-zinc-300 mb-2" />
                          <p className="text-sm text-zinc-500 font-medium">No dishes are active on the menu today.</p>
                          <p className="text-xs text-zinc-400 mt-1">Check back later or speak with Zara for the daily specials.</p>
                        </div>
                      ) : (
                        Object.entries(
                          menuItems.filter(item => item.active).reduce((groups, item) => {
                            const cat = item.category || 'Other';
                            if (!groups[cat]) groups[cat] = [];
                            groups[cat].push(item);
                            return groups;
                          }, {} as { [key: string]: MenuItem[] })
                        ).sort((a, b) => {
                          const order = ['Lamb', 'Beef', 'Camel', 'Chicken', 'Beverages', 'Desserts'];
                          const idxA = order.indexOf(a[0]);
                          const idxB = order.indexOf(b[0]);
                          if (idxA !== -1 && idxB !== -1) return idxA - idxB;
                          if (idxA !== -1) return -1;
                          if (idxB !== -1) return 1;
                          return a[0].localeCompare(b[0]);
                        }).map(([category, rawItems]) => {
                          const items = rawItems as MenuItem[];
                          return (
                            <div key={category} className="bg-white border border-zinc-200 rounded-2xl p-5 shadow-sm space-y-4">
                              <div className="flex items-center gap-2 pb-2.5 border-b border-zinc-100">
                                <span className="w-2.5 h-2.5 bg-red-600 rounded-full"></span>
                                <h3 className="font-extrabold text-sm text-zinc-950 uppercase tracking-wider">{category}</h3>
                              </div>
                              <div className="space-y-4">
                                {[...items].sort((a, b) => (a.display_order || 99) - (b.display_order || 99)).map((dish) => {
                                const isPerGram = dish.pricing_type === 'per_gram';
                                return (
                                  <div key={dish.id} className="group flex flex-col gap-1.5 pb-3 border-b border-zinc-100 last:border-0 last:pb-0">
                                    <div className="flex justify-between items-start gap-3">
                                      <h4 className="font-bold text-sm text-zinc-900 group-hover:text-red-600 transition-colors">{dish.item_name}</h4>
                                      <span className="font-mono font-extrabold text-xs text-red-600 whitespace-nowrap bg-red-50 border border-red-100 px-2.5 py-0.5 rounded-full">
                                        {isPerGram 
                                          ? `PKR ${dish.price_per_gram?.toFixed(2)}/g` 
                                          : `PKR ${dish.fixed_price?.toLocaleString()}${dish.unit_label ? ` / ${dish.unit_label}` : ''}`}
                                      </span>
                                    </div>
                                    {dish.description && (
                                      <p className="text-xs text-zinc-500 font-medium leading-relaxed">{dish.description}</p>
                                    )}
                                    {isPerGram && (
                                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1 text-[10px] bg-zinc-50 border border-zinc-150 rounded-xl p-2 font-medium text-zinc-500">
                                        <span>Recommended portion: {dish.recommended_weight_min || 400}g - {dish.recommended_weight_max || 500}g</span>
                                        <span className="font-bold text-red-600">Avg Serving (500g): PKR {((dish.price_per_gram || 0) * 500).toLocaleString(undefined, { maximumFractionDigits: 0 })}</span>
                                      </div>
                                    )}
                                  </div>
                                );
                              })}
                            </div>
                          </div>
                        );
                      })
                      )}
                    </div>
                  </motion.div>
                )}

              </AnimatePresence>
            </div>

            {/* Right Column - Static info sidebar / menu list */}
            <div className="lg:col-span-4 space-y-6">

              {/* Quick feedback module */}
              <div className="bg-white border border-zinc-200 rounded-2xl p-5 shadow-sm">
                <h3 className="font-bold text-sm text-zinc-900 flex items-center gap-2 mb-3">
                  <Star className="w-5 h-5 text-amber-500" />
                  How was your call?
                </h3>
                
                {fbSuccess ? (
                  <div className="bg-emerald-50 border border-emerald-100 p-4 rounded-xl text-center space-y-2">
                    <CheckCircle2 className="w-6 h-6 text-emerald-500 mx-auto" />
                    <p className="text-xs font-bold text-emerald-800">Feedback Submitted!</p>
                    <p className="text-[10px] text-emerald-600">Zara is constantly learning to serve you better.</p>
                    <button onClick={() => setFbSuccess(false)} className="text-[10px] text-zinc-400 underline mt-2 block mx-auto">Write another</button>
                  </div>
                ) : (
                  <form onSubmit={handleFeedbackSubmit} className="space-y-3.5">
                    <div>
                      <label className="text-[10px] font-bold uppercase tracking-wider text-zinc-400 block mb-1">Your Name</label>
                      <input
                        type="text"
                        required
                        value={fbName}
                        onChange={e => setFbName(e.target.value)}
                        placeholder="Alex Mercer"
                        className="w-full bg-zinc-50 border border-zinc-200 rounded-xl px-3 py-2 text-xs text-zinc-800 focus:outline-none focus:bg-white"
                      />
                    </div>

                    <div>
                      <label className="text-[10px] font-bold uppercase tracking-wider text-zinc-400 block mb-1">Call Rating</label>
                      <div className="flex gap-1.5 mt-1">
                        {[1, 2, 3, 4, 5].map((star) => (
                          <button
                            key={star}
                            type="button"
                            onClick={() => setFbRating(star)}
                            className="focus:outline-none cursor-pointer"
                          >
                            <Star className={`w-5 h-5 ${fbRating >= star ? 'text-amber-500 fill-amber-500' : 'text-zinc-200'}`} />
                          </button>
                        ))}
                      </div>
                    </div>

                    <div>
                      <label className="text-[10px] font-bold uppercase tracking-wider text-zinc-400 block mb-1">Comments</label>
                      <textarea
                        required
                        value={fbComment}
                        onChange={e => setFbComment(e.target.value)}
                        placeholder="Zara was amazing! Loved the order reading confirmation..."
                        rows={3}
                        className="w-full bg-zinc-50 border border-zinc-200 rounded-xl px-3 py-2 text-xs text-zinc-800 focus:outline-none focus:bg-white resize-none"
                      />
                    </div>

                    <button
                      type="submit"
                      className="w-full bg-zinc-900 hover:bg-zinc-800 text-white font-bold py-2 rounded-xl text-xs cursor-pointer shadow-sm"
                    >
                      Send Review
                    </button>
                  </form>
                )}
              </div>

            </div>

          </main>

          {/* Bottom Native style bar for mobile customer navigation */}
          <MobileNav currentTab={activeTab} onTabChange={setActiveTab} role="customer" />

        </div>
      )}

      {/* 3. ADMIN PORTAL LOGIN / AUTH SCREEN */}
      {role === 'owner' && !isOwnerAuthenticated && (
        <div className="flex-1 flex flex-col items-center justify-center p-6 bg-zinc-50">
          
          <div className="w-full max-w-md bg-white border border-zinc-200 rounded-2xl p-8 shadow-xl space-y-6">
            <div className="flex flex-col items-center text-center">
              <CarnivoreLogo className="w-16 h-16 mb-4" />
              <h2 className="text-xl font-bold text-zinc-900 tracking-tight">The Carnivore Admin Portal</h2>
              <p className="text-xs text-zinc-400 mt-1 max-w-[280px]">Access real-time kitchen monitors, table reservation grids, and voice agent logs.</p>
            </div>

            <form onSubmit={handleAdminLogin} className="space-y-4">
              <div>
                <label className="text-xs font-bold text-zinc-500 block mb-1">Owner Email</label>
                <input
                  type="email"
                  required
                  value={adminEmail}
                  onChange={e => setAdminEmail(e.target.value)}
                  placeholder="owner@thecarnivore.com"
                  className="w-full bg-zinc-50 border border-zinc-200 rounded-xl px-4 py-2.5 text-sm text-zinc-800 focus:outline-none focus:bg-white"
                />
              </div>

              <div>
                <label className="text-xs font-bold text-zinc-500 block mb-1">Security PIN / Password</label>
                <input
                  type="password"
                  required
                  value={adminPassword}
                  onChange={e => setAdminPassword(e.target.value)}
                  placeholder="Password (type 'admin' to bypass)"
                  className="w-full bg-zinc-50 border border-zinc-200 rounded-xl px-4 py-2.5 text-sm text-zinc-800 focus:outline-none focus:bg-white"
                />
              </div>

              {loginError && (
                <div className="p-3 bg-rose-50 border border-rose-100 rounded-lg text-xs text-rose-700 font-medium flex items-center gap-1.5">
                  <AlertCircle className="w-4 h-4 text-rose-500 flex-shrink-0" />
                  <span>{loginError}</span>
                </div>
              )}

              <button
                type="submit"
                className="w-full bg-red-600 hover:bg-red-500 text-white font-bold py-3 rounded-xl text-sm transition-colors cursor-pointer shadow-lg shadow-red-600/15"
              >
                Sign In Administrator
              </button>
            </form>

            <button
              onClick={() => setRole('customer')}
              className="w-full text-center text-xs text-zinc-400 hover:text-zinc-600 font-medium cursor-pointer py-1 block"
            >
              Back to Customer Concierge
            </button>
          </div>

        </div>
      )}

      {/* 4. OWNER/ADMIN PORTAL INTEGRATED VIEW */}
      {role === 'owner' && isOwnerAuthenticated && (
        <div className="flex-1 flex flex-col md:pl-64 min-h-screen">
          
          {/* Desktop Sidebar Layout */}
          <OwnerSidebar 
            currentTab={activeTab} 
            onTabChange={setActiveTab} 
            config={config} 
            onLogOut={handleAdminLogOut}
          />

          {/* Top Admin Header Bar */}
          <header className="bg-white border-b border-zinc-200 py-4 px-4 md:px-6 sticky top-0 z-30 flex items-center justify-between">
            <div className="flex items-center gap-2 md:gap-0">
              {/* Logo block showing only on mobile admin */}
              <div className="flex md:hidden items-center gap-2">
                <CarnivoreLogo className="w-6 h-6" />
                <h1 className="font-black text-sm tracking-tight text-zinc-900 uppercase">Carnivore Ops</h1>
              </div>
              <h2 className="hidden md:block text-base font-black text-zinc-900 uppercase tracking-tight">
                {activeTab.replace(/_/g, ' ')} Panel
              </h2>
            </div>

            <div className="flex items-center gap-3">
              <button
                onClick={loadData}
                className="p-2 bg-zinc-50 hover:bg-zinc-100 border border-zinc-200 text-zinc-500 rounded-xl transition-colors cursor-pointer"
                title="Refresh logs"
              >
                <RefreshCw className="w-4 h-4" />
              </button>
              
              <button
                onClick={handleAdminLogOut}
                className="md:hidden p-2 bg-zinc-50 hover:bg-rose-50 border border-zinc-200 hover:border-rose-200 text-rose-600 rounded-xl transition-colors cursor-pointer flex items-center justify-center"
                title="Log Out Admin"
              >
                <LogOut className="w-4 h-4" />
              </button>
              
              <div className="flex items-center gap-2 px-2.5 py-1.5 md:px-3 bg-zinc-50 border border-zinc-200 rounded-xl max-w-[180px] sm:max-w-xs overflow-hidden">
                <UserCircle className="w-4 h-4 text-zinc-500 flex-shrink-0" />
                <span className="text-xs font-bold text-zinc-700 truncate" title={authenticatedEmail}>{authenticatedEmail}</span>
              </div>
            </div>
          </header>

          {/* Owner Dashboard Content wrapper */}
          <main className="flex-1 p-4 md:p-6 space-y-6 pb-24 md:pb-10">
            
            {/* Dynamic Owner Tabs navigation for mobile */}
            <div className="flex md:hidden border-b border-zinc-200 overflow-x-auto scrollbar-none sticky top-[65px] bg-zinc-50/95 backdrop-blur-sm z-25 py-1 -mx-4 px-4 mb-4">
              {[
                { id: 'overview', name: 'Overview', icon: LayoutGrid },
                { id: 'orders', name: 'Orders', icon: ShoppingBag },
                { id: 'reservations', name: 'Bookings', icon: Calendar },
                { id: 'menu', name: 'Menu', icon: ListCollapse },
                { id: 'call_logs', name: 'Call Logs', icon: PhoneCall },
                { id: 'escalations', name: 'Alerts', icon: AlertTriangle },
              ].map(tab => {
                const Icon = tab.icon;
                const isActive = activeTab === tab.id;
                return (
                  <button
                    key={tab.id}
                    onClick={() => setActiveTab(tab.id)}
                    className={`px-3 py-2.5 text-xs font-bold border-b-2 transition-all cursor-pointer flex items-center gap-1.5 whitespace-nowrap ${
                      isActive ? 'border-red-600 text-red-600' : 'border-transparent text-zinc-500 hover:text-zinc-800'
                    }`}
                  >
                    <Icon className="w-3.5 h-3.5" />
                    {tab.name}
                  </button>
                );
              })}
            </div>
            
            {/* Tab view routing: Overview */}
            {activeTab === 'overview' && (
              <div className="space-y-6">
                
                {/* Bento Grid Stats Cards */}
                <motion.div
                  variants={containerVariants}
                  initial="hidden"
                  animate="show"
                  className="grid grid-cols-2 lg:grid-cols-4 gap-4"
                >
                  <motion.div variants={itemVariants}>
                    <StatsCard 
                      title="Total Orders Today" 
                      value={totalOrdersToday} 
                      icon={ShoppingBag} 
                      trend={{ value: '+14.5%', isPositive: true }}
                      description="vs yesterday"
                      colorClass="text-amber-600 bg-amber-50 border-amber-100"
                    />
                  </motion.div>
                  <motion.div variants={itemVariants}>
                    <StatsCard 
                      title="Revenue Today" 
                      value={`PKR ${totalRevenueToday.toLocaleString()}`} 
                      icon={TrendingUp} 
                      trend={{ value: '+22.3%', isPositive: true }}
                      description="vs yesterday"
                      colorClass="text-red-600 bg-red-50 border-red-100"
                    />
                  </motion.div>
                  <motion.div variants={itemVariants}>
                    <StatsCard 
                      title="Pending Orders" 
                      value={pendingOrders} 
                      icon={Clock} 
                      description="Currently in kitchen"
                      colorClass="text-blue-600 bg-blue-50 border-blue-100"
                    />
                  </motion.div>
                  <motion.div variants={itemVariants}>
                    <StatsCard 
                      title="Reservations Today" 
                      value={resToday} 
                      icon={Users} 
                      description="Table covers booked"
                      colorClass="text-teal-600 bg-teal-50 border-teal-100"
                    />
                  </motion.div>
                </motion.div>
 
                {/* ElevenLabs Diagnostics & Setup Latency Checklist (Admin Only) */}
                <div className="bg-white border border-zinc-200 rounded-2xl p-5 shadow-sm">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2 mt-0.5">
                      <Cpu className="w-5 h-5 text-red-500" />
                      <div>
                        <h3 className="font-bold text-sm text-zinc-900 leading-none">Voice Agent Diagnostics & Latency Setup</h3>
                        <p className="text-[10px] text-zinc-400 mt-1.5">Configure your ElevenLabs Conversational Voice Agent for optimal latency & stability.</p>
                      </div>
                    </div>
                    <button
                      onClick={() => setShowElevenLabsChecklist(!showElevenLabsChecklist)}
                      className="px-3 py-1.5 bg-zinc-50 border hover:bg-zinc-100 border-zinc-200 text-zinc-650 rounded-xl text-xs font-bold transition-all cursor-pointer"
                    >
                      {showElevenLabsChecklist ? "Hide Panel" : "View Settings Checklist"}
                    </button>
                  </div>
 
                  {showElevenLabsChecklist && (
                    <div className="mt-4 border-t border-zinc-100 pt-4 grid grid-cols-1 md:grid-cols-2 gap-6 text-xs text-zinc-600 leading-relaxed">
                      <div className="space-y-3">
                        <h4 className="font-bold text-zinc-900 flex items-center gap-1.5">
                          <CheckCircle2 className="w-4 h-4 text-emerald-500" />
                          Recommended Console Settings
                        </h4>
                        <ul className="space-y-2 pl-4 list-disc">
                          <li><strong>Agent Model:</strong> Choose <code>gemini-2.5-flash</code> or similar low-latency LLMs on the ElevenLabs Agent Console.</li>
                          <li><strong>Voice Latency Mode:</strong> Select voice options optimized for low-latency WebRTC streams.</li>
                          <li><strong>Streaming Options:</strong> Ensure streaming is enabled in voice output configurations.</li>
                          <li><strong>Stable Mic:</strong> Check client device microphone sample rate matches standard 44.1kHz or 48kHz to avoid cutting.</li>
                        </ul>
                      </div>
                      <div className="space-y-3">
                        <h4 className="font-bold text-zinc-900 flex items-center gap-1.5">
                          <Info className="w-4 h-4 text-amber-500" />
                          Network & Production Precautions
                        </h4>
                        <ul className="space-y-2 pl-4 list-disc">
                          <li><strong>Production Webhook:</strong> Use static production endpoints for final confirmations. Avoid debugging tools/proxies in active setups which cause packet buffering delays.</li>
                          <li><strong>Network Jitter:</strong> Audio cutting is frequently due to local regional ISP latency or packet drops. WebRTC relies heavily on stable client-side network connections.</li>
                        </ul>
                      </div>
                    </div>
                  )}
                </div>
 
                {/* Main Dashboard section: orders/timeline divide */}
                <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
                  
                  {/* Left list block - Recent orders preview */}
                  <div className="lg:col-span-8 space-y-4">
                    <div className="flex items-center justify-between">
                      <h3 className="font-bold text-zinc-900 text-base">Active Orders Monitor</h3>
                      <button onClick={() => setActiveTab('orders')} className="text-xs font-bold text-red-600 flex items-center gap-0.5 hover:underline">
                        <span>All Orders</span>
                        <ChevronRight className="w-3.5 h-3.5" />
                      </button>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {orders.slice(0, 4).map(o => (
                        <div key={o.id} className="bg-white border border-zinc-200 rounded-2xl p-4 flex flex-col justify-between shadow-sm hover:shadow">
                          <div>
                            <div className="flex items-center justify-between">
                              <span className="font-mono text-xs font-bold bg-zinc-100 border px-1.5 py-0.5 rounded text-zinc-800">
                                {o.order_number}
                              </span>
                              <StatusBadge status={o.status} />
                            </div>
                            <p className="font-bold text-sm text-zinc-800 mt-3 line-clamp-1">{o.items_summary}</p>
                            <span className="text-[10px] text-zinc-400 block mt-1">{o.customer_name} • {o.customer_phone}</span>
                          </div>
                          
                          <div className="flex items-center justify-between border-t border-zinc-150 pt-3 mt-4">
                            <span className="text-base font-black text-red-600">PKR {parseFloat(o.total_amount.toString()).toLocaleString()}</span>
                            <button
                              onClick={() => {
                                setSelectedRecord(o);
                                setSelectedRecordType('order');
                                setIsDrawerOpen(true);
                              }}
                              className="text-xs bg-zinc-50 border hover:bg-zinc-100 text-zinc-600 px-2.5 py-1 rounded-lg font-semibold"
                            >
                              Manage
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Right list block - timeline log */}
                  <div className="lg:col-span-4">
                    <ActivityTimeline events={activityEvents.slice(0, 8)} />
                  </div>

                </div>

              </div>
            )}

            {/* Tab view routing: Orders (with full search/filters) */}
            {activeTab === 'orders' && (
              <div className="space-y-4">
                
                {/* Collapsible search/filter matrix */}
                <div className="bg-white border border-zinc-200 rounded-2xl p-4 shadow-sm space-y-3.5">
                  <div className="flex flex-col md:flex-row md:items-center gap-3">
                    <div className="flex-1 relative">
                      <Search className="w-4 h-4 text-zinc-400 absolute left-3 top-3.5" />
                      <input
                        type="text"
                        value={ownerSearch}
                        onChange={e => setOwnerSearch(e.target.value)}
                        placeholder="Search orders by number, name, phone..."
                        className="w-full bg-zinc-50 border border-zinc-200 rounded-xl pl-9 pr-4 py-2.5 text-sm focus:outline-none focus:bg-white"
                      />
                    </div>
                    
                    <div className="flex gap-2">
                      <select
                        value={statusFilter}
                        onChange={e => setStatusFilter(e.target.value)}
                        className="bg-zinc-50 border border-zinc-200 text-xs rounded-xl px-4 py-2.5 font-semibold focus:outline-none focus:bg-white cursor-pointer"
                      >
                        <option value="ALL">All Statuses</option>
                        <option value="RECEIVED">RECEIVED</option>
                        <option value="PREPARING">PREPARING</option>
                        <option value="READY">READY</option>
                        <option value="OUT_FOR_DELIVERY">OUT FOR DELIVERY</option>
                        <option value="COMPLETED">COMPLETED</option>
                        <option value="CANCELLED">CANCELLED</option>
                      </select>

                      <button
                        onClick={() => setIsFiltersExpanded(!isFiltersExpanded)}
                        className={`p-2.5 rounded-xl border flex items-center justify-center cursor-pointer transition-colors ${
                          isFiltersExpanded ? 'bg-red-50 border-red-200 text-red-600' : 'bg-zinc-50 border-zinc-200 text-zinc-500 hover:bg-zinc-100'
                        }`}
                      >
                        <Filter className="w-4.5 h-4.5" />
                      </button>
                    </div>
                  </div>

                  {/* Advanced expanded filters */}
                  {isFiltersExpanded && (
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-3.5 border-t border-zinc-100">
                      <div>
                        <label className="text-[10px] font-bold uppercase text-zinc-400 block mb-1">Created Date</label>
                        <input
                          type="date"
                          value={dateFilter}
                          onChange={e => setDateFilter(e.target.value)}
                          className="w-full bg-zinc-50 border border-zinc-200 rounded-xl px-3 py-2 text-xs focus:outline-none"
                        />
                      </div>
                      <div>
                        <label className="text-[10px] font-bold uppercase text-zinc-400 block mb-1">Specific Customer Phone</label>
                        <input
                          type="text"
                          value={customerPhoneFilter}
                          onChange={e => setCustomerPhoneFilter(e.target.value)}
                          placeholder="+15551234567"
                          className="w-full bg-zinc-50 border border-zinc-200 rounded-xl px-3 py-2 text-xs focus:outline-none"
                        />
                      </div>
                      <div>
                        <label className="text-[10px] font-bold uppercase text-zinc-400 block mb-1">Specific Customer Email</label>
                        <input
                          type="text"
                          value={customerEmailFilter}
                          onChange={e => setCustomerEmailFilter(e.target.value)}
                          placeholder="sarah@example.com"
                          className="w-full bg-zinc-50 border border-zinc-200 rounded-xl px-3 py-2 text-xs focus:outline-none"
                        />
                      </div>
                    </div>
                  )}
                </div>

                {/* Display desktop table list or mobile stacked list */}
                <div className="hidden md:block">
                  <OrderTable 
                    orders={filteredOrders} 
                    onViewDetails={(ord) => {
                      setSelectedRecord(ord);
                      setSelectedRecordType('order');
                      setIsDrawerOpen(true);
                    }}
                    onStatusChange={handleOrderStatusChange}
                  />
                </div>

                {/* Stacked cards for mobile owners */}
                <div className="block md:hidden space-y-3">
                  {filteredOrders.map(order => (
                    <div key={order.id} className="bg-white border border-zinc-200 rounded-xl p-4 shadow-sm space-y-3">
                      <div className="flex justify-between items-center">
                        <span className="font-mono text-xs font-bold bg-zinc-50 border px-1.5 py-0.5 rounded text-zinc-900">{order.order_number}</span>
                        <StatusBadge status={order.status} />
                      </div>
                      <div>
                        <p className="text-sm font-bold text-zinc-900">{order.items_summary}</p>
                        <span className="text-xs text-zinc-500 mt-1 block">{order.customer_name} • {order.customer_phone}</span>
                      </div>
                      <div className="flex justify-between items-center border-t border-zinc-100 pt-3">
                        <span className="font-bold text-red-600">PKR {parseFloat(order.total_amount.toString()).toLocaleString()}</span>
                        
                        <div className="flex items-center gap-1.5">
                          <select
                            value={order.status}
                            onChange={e => handleOrderStatusChange(order.id, e.target.value as OrderStatus)}
                            className="bg-zinc-50 border text-xs rounded px-2 py-1"
                          >
                            <option value="RECEIVED">RECEIVED</option>
                            <option value="PREPARING">PREPARING</option>
                            <option value="READY">READY</option>
                            <option value="OUT_FOR_DELIVERY">OUT FOR DELIVERY</option>
                            <option value="COMPLETED">COMPLETED</option>
                            <option value="CANCELLED">CANCELLED</option>
                          </select>
                          <button
                            onClick={() => {
                              setSelectedRecord(order);
                              setSelectedRecordType('order');
                              setIsDrawerOpen(true);
                            }}
                            className="p-1.5 bg-zinc-100 rounded text-zinc-600"
                          >
                            <Eye className="w-4 h-4" />
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>

              </div>
            )}

            {/* Tab view routing: Reservations (full list) */}
            {activeTab === 'reservations' && (
              <div className="space-y-4">
                
                {/* Search / Filter block */}
                <div className="bg-white border border-zinc-200 rounded-2xl p-4 shadow-sm space-y-3.5">
                  <div className="flex flex-col md:flex-row md:items-center gap-3">
                    <div className="flex-1 relative">
                      <Search className="w-4 h-4 text-zinc-400 absolute left-3 top-3.5" />
                      <input
                        type="text"
                        value={ownerSearch}
                        onChange={e => setOwnerSearch(e.target.value)}
                        placeholder="Search reservations by ID, name, phone..."
                        className="w-full bg-zinc-50 border border-zinc-200 rounded-xl pl-9 pr-4 py-2.5 text-sm focus:outline-none focus:bg-white"
                      />
                    </div>
                    
                    <div className="flex gap-2">
                      <select
                        value={statusFilter}
                        onChange={e => setStatusFilter(e.target.value)}
                        className="bg-zinc-50 border border-zinc-200 text-xs rounded-xl px-4 py-2.5 font-semibold focus:outline-none focus:bg-white cursor-pointer"
                      >
                        <option value="ALL">All Statuses</option>
                        <option value="CONFIRMED">CONFIRMED</option>
                        <option value="MODIFIED">MODIFIED</option>
                        <option value="CANCELLED">CANCELLED</option>
                        <option value="COMPLETED">COMPLETED</option>
                        <option value="NO_SHOW">NO SHOW</option>
                      </select>
                    </div>
                  </div>
                </div>

                <div className="hidden md:block">
                  <ReservationTable 
                    reservations={filteredReservations} 
                    onViewDetails={(r) => {
                      setSelectedRecord(r);
                      setSelectedRecordType('reservation');
                      setIsDrawerOpen(true);
                    }}
                    onStatusChange={handleResStatusChange}
                  />
                </div>

                {/* Mobile Reservation stacked cards */}
                <div className="block md:hidden space-y-3">
                  {filteredReservations.map(res => (
                    <div key={res.id} className="bg-white border border-zinc-200 rounded-xl p-4 shadow-sm space-y-3">
                      <div className="flex justify-between items-center">
                        <span className="font-mono text-xs font-bold bg-zinc-50 border px-1.5 py-0.5 rounded text-zinc-900">{res.reservation_number}</span>
                        <StatusBadge status={res.status} />
                      </div>
                      <div>
                        <p className="text-sm font-bold text-zinc-900">Table for {res.party_size} guests</p>
                        <p className="text-xs text-zinc-500 mt-1">{res.customer_name} • {formatReservationDate(res.reservation_date)} at {res.reservation_time}</p>
                      </div>
                      {res.special_requests && (
                        <p className="text-xs italic bg-zinc-50 p-2 rounded text-zinc-500">"{res.special_requests}"</p>
                      )}
                      <div className="flex justify-between items-center border-t border-zinc-100 pt-3">
                        <select
                          value={res.status}
                          onChange={e => handleResStatusChange(res.id, e.target.value as ReservationStatus)}
                          className="bg-zinc-50 border text-xs rounded px-2 py-1"
                        >
                          <option value="CONFIRMED">CONFIRMED</option>
                          <option value="MODIFIED">MODIFIED</option>
                          <option value="CANCELLED">CANCELLED</option>
                          <option value="COMPLETED">COMPLETED</option>
                          <option value="NO_SHOW">NO SHOW</option>
                        </select>
                        <button
                          onClick={() => {
                            setSelectedRecord(res);
                            setSelectedRecordType('reservation');
                            setIsDrawerOpen(true);
                          }}
                          className="p-1.5 bg-zinc-100 rounded text-zinc-600"
                        >
                          <Eye className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>

              </div>
            )}

            {/* Tab view routing: Menu Management */}
            {activeTab === 'menu' && (
              <MenuManagement onMenuChanged={() => {}} />
            )}

            {/* Tab view routing: Call Logs */}
            {activeTab === 'call_logs' && (
              <motion.div
                initial="hidden"
                animate="show"
                variants={containerVariants}
                className="grid grid-cols-1 xl:grid-cols-3 gap-6"
              >
                
                {/* Left Side: Call Stats & List of Calls */}
                <div className="xl:col-span-2 space-y-6">
                  
                  {/* Call Stats Grid */}
                  <motion.div 
                    variants={containerVariants}
                    className="grid grid-cols-2 sm:grid-cols-4 gap-4"
                  >
                    <motion.div 
                      variants={itemVariants}
                      whileHover={{ y: -3, transition: { duration: 0.2 } }}
                      className="bg-white border border-zinc-200 rounded-2xl p-4 shadow-sm hover:shadow-md hover:border-zinc-300 transition-all flex flex-col justify-between"
                    >
                      <span className="text-[10px] uppercase font-bold text-zinc-400 tracking-wider block">Total Calls</span>
                      <span className="text-2xl font-black text-zinc-900 mt-2 block">{callLogs.length}</span>
                    </motion.div>
                    
                    <motion.div 
                      variants={itemVariants}
                      whileHover={{ y: -3, transition: { duration: 0.2 } }}
                      className="bg-white border border-zinc-200 rounded-2xl p-4 shadow-sm hover:shadow-md hover:border-zinc-300 transition-all flex flex-col justify-between"
                    >
                      <span className="text-[10px] uppercase font-bold text-zinc-400 tracking-wider block">Avg Duration</span>
                      <span className="text-2xl font-black text-zinc-900 mt-2 block">
                        {callLogs.length > 0 
                          ? `${Math.round(callLogs.reduce((acc, c) => acc + c.duration_seconds, 0) / callLogs.length)}s`
                          : '0s'}
                      </span>
                    </motion.div>
                    
                    <motion.div 
                      variants={itemVariants}
                      whileHover={{ y: -3, transition: { duration: 0.2 } }}
                      className="bg-white border border-zinc-200 rounded-2xl p-4 shadow-sm hover:shadow-md hover:border-zinc-300 transition-all flex flex-col justify-between"
                    >
                      <span className="text-[10px] uppercase font-bold text-zinc-400 tracking-wider block">Completed</span>
                      <span className="text-2xl font-black text-emerald-600 mt-2 block">
                        {callLogs.length > 0 
                          ? `${Math.round((callLogs.filter(c => c.status === 'COMPLETED').length / callLogs.length) * 100)}%`
                          : '0%'}
                      </span>
                    </motion.div>
                    
                    <motion.div 
                      variants={itemVariants}
                      whileHover={{ y: -3, transition: { duration: 0.2 } }}
                      className="bg-white border border-zinc-200 rounded-2xl p-4 shadow-sm hover:shadow-md hover:border-zinc-300 transition-all flex flex-col justify-between"
                    >
                      <span className="text-[10px] uppercase font-bold text-zinc-400 tracking-wider block">Escalated</span>
                      <span className="text-2xl font-black text-red-600 mt-2 block">
                        {callLogs.filter(c => c.status === 'ESCALATED').length}
                      </span>
                    </motion.div>
                  </motion.div>

                  {/* Call Log List Card */}
                  <motion.div 
                    variants={itemVariants}
                    className="bg-white border border-zinc-200 rounded-2xl shadow-sm overflow-hidden"
                  >
                    <div className="p-5 border-b border-zinc-150 flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-zinc-50/50">
                      <div>
                        <h3 className="font-bold text-zinc-900 text-base">Zara Agent Transcripts</h3>
                        <p className="text-xs text-zinc-500">View and analyze recent real-time conversations with customers.</p>
                      </div>
                      
                      {/* Search Bar */}
                      <div className="relative">
                        <Search className="w-4 h-4 text-zinc-400 absolute left-3 top-1/2 -translate-y-1/2" />
                        <input
                          type="text"
                          placeholder="Search transcripts..."
                          className="pl-9 pr-4 py-1.5 text-xs border border-zinc-200 rounded-xl w-full sm:w-60 focus:outline-none focus:ring-2 focus:ring-red-500/25 focus:border-red-500 bg-white text-zinc-800 transition-all"
                          value={callLogSearch}
                          onChange={(e) => setCallLogSearch(e.target.value)}
                        />
                      </div>
                    </div>

                    {/* Filter Navigation Tabs */}
                    <div className="flex border-b border-zinc-150 px-4 bg-zinc-50/20">
                      {[
                        { id: 'ALL', name: 'All Sessions' },
                        { id: 'COMPLETED', name: 'Completed Only' },
                        { id: 'ESCALATED', name: 'Escalations' }
                      ].map(tab => (
                        <button
                          key={tab.id}
                          onClick={() => setLogStatusFilter(tab.id as any)}
                          className={`px-3 py-2.5 text-xs font-bold border-b-2 transition-all cursor-pointer ${
                            logStatusFilter === tab.id 
                              ? 'border-red-600 text-red-600 font-black' 
                              : 'border-transparent text-zinc-500 hover:text-zinc-800'
                          }`}
                        >
                          {tab.name}
                        </button>
                      ))}
                    </div>

                    {/* Table or list representation */}
                    <div className="divide-y divide-zinc-150 max-h-[500px] overflow-y-auto">
                      {filteredCallLogs.length === 0 ? (
                        <div className="p-16 text-center">
                          <PhoneCall className="w-10 h-10 text-zinc-300 mx-auto mb-3 animate-pulse" />
                          <p className="text-xs text-zinc-400 italic">No matching call logs found.</p>
                        </div>
                      ) : (
                        filteredCallLogs.map((log, idx) => {
                          const isSelected = selectedCallLog?.id === log.id;
                          const callInsights = getCallInsights(log.transcript || '', log.status);
                          
                          return (
                            <motion.div 
                              key={log.id} 
                              onClick={() => setSelectedCallLog(log)}
                              initial={{ opacity: 0, y: 10 }}
                              animate={{ opacity: 1, y: 0 }}
                              transition={{ delay: idx * 0.03 }}
                              className={`p-4 transition-all cursor-pointer flex items-center justify-between gap-4 hover:bg-zinc-50/80 ${
                                isSelected ? 'bg-red-50/40 border-l-4 border-red-600 pl-3 shadow-inner' : 'border-l-4 border-transparent'
                              }`}
                            >
                              <div className="min-w-0 flex-1">
                                <div className="flex items-center gap-2 flex-wrap">
                                  <span className="font-bold text-xs text-zinc-900 truncate">
                                    {log.customer_name}
                                  </span>
                                  <span className="text-[10px] text-zinc-400 font-mono">
                                    {log.customer_phone}
                                  </span>
                                  
                                  {/* Dynamic Intent Tag on list item */}
                                  <span className="text-[9px] font-bold px-1.5 py-0.5 rounded-md bg-zinc-100 text-zinc-600 border border-zinc-200">
                                    {callInsights.intent}
                                  </span>
                                </div>
                                <p className="text-xs text-zinc-500 truncate mt-1">
                                  {log.transcript ? log.transcript.replace(/Zara:|You:/g, '') : 'No transcript recorded.'}
                                </p>
                                <div className="flex items-center gap-3 mt-2 flex-wrap">
                                  <span className="text-[10px] text-zinc-400 flex items-center gap-1">
                                    <Clock className="w-3 h-3" />
                                    {log.duration_seconds} seconds
                                  </span>
                                  <span className="text-[10px] text-zinc-300">•</span>
                                  <span className="text-[10px] text-zinc-400">
                                    {new Date(log.created_at).toLocaleDateString()} at {new Date(log.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                  </span>
                                </div>
                              </div>
                              <div className="flex flex-col items-end gap-2 flex-shrink-0">
                                <span className={`px-2 py-0.5 text-[9px] font-black rounded-full uppercase tracking-wider ${
                                  log.status === 'COMPLETED' 
                                    ? 'bg-emerald-50 text-emerald-700 border border-emerald-150' 
                                    : log.status === 'ESCALATED'
                                    ? 'bg-amber-50 text-amber-700 border border-amber-150 shadow-[0_0_8px_rgba(245,158,11,0.15)]'
                                    : 'bg-red-50 text-red-700 border border-red-150'
                                }`}>
                                  {log.status}
                                </span>
                                <ChevronRight className={`w-4 h-4 text-zinc-400 transition-transform duration-300 ${isSelected ? 'translate-x-1 text-red-600' : ''}`} />
                              </div>
                            </motion.div>
                          );
                        })
                      )}
                    </div>
                  </motion.div>
                </div>

                {/* Right Side: Detailed Transcript Panel */}
                <div className="xl:col-span-1">
                  {selectedCallLog ? (
                    <motion.div 
                      key={selectedCallLog.id}
                      initial={{ opacity: 0, x: 15 }}
                      animate={{ opacity: 1, x: 0 }}
                      className="bg-white border border-zinc-200 rounded-2xl p-6 shadow-sm flex flex-col h-[750px]"
                    >
                      {/* Transcript Header */}
                      <div className="border-b border-zinc-150 pb-4 mb-4">
                        <div className="flex items-center justify-between">
                          <span className="text-[10px] font-black uppercase text-zinc-400 tracking-wider flex items-center gap-1">
                            <Cpu className="w-3.5 h-3.5 text-zinc-500" />
                            Conversation Insight
                          </span>
                          <span className={`px-2 py-0.5 text-[9px] font-black rounded-full uppercase tracking-wider ${
                            selectedCallLog.status === 'COMPLETED' 
                              ? 'bg-emerald-50 text-emerald-700 border border-emerald-150' 
                              : 'bg-amber-50 text-amber-700 border border-amber-150 shadow-[0_0_8px_rgba(245,158,11,0.15)]'
                          }`}>
                            {selectedCallLog.status}
                          </span>
                        </div>
                        <h4 className="font-bold text-zinc-900 mt-2 text-lg">{selectedCallLog.customer_name}</h4>
                        {selectedCallLog.conversation_id && (
                          <p className="text-[10px] text-zinc-400 mt-1 font-mono">
                            ElevenLabs conversation: {selectedCallLog.conversation_id}
                          </p>
                        )}
                        <p className="text-xs text-zinc-500 mt-0.5">{selectedCallLog.customer_phone} • {selectedCallLog.duration_seconds}s call duration</p>
                      </div>

                      {/* AI Intelligence Insights Dashboard */}
                      {(() => {
                        const insights = getCallInsights(selectedCallLog.transcript || '', selectedCallLog.status);
                        return (
                          <div className="mb-4 bg-zinc-50 rounded-xl p-3 border border-zinc-200 space-y-3">
                            <div className="flex items-center justify-between gap-2 flex-wrap">
                              <div className="flex flex-col">
                                <span className="text-[9px] uppercase font-bold text-zinc-400">Primary Intent</span>
                                <span className="text-xs font-bold text-zinc-800 flex items-center gap-1 mt-0.5">
                                  <Zap className="w-3.5 h-3.5 text-amber-500" />
                                  {insights.intent}
                                </span>
                              </div>
                              <div className="flex flex-col items-end">
                                <span className="text-[9px] uppercase font-bold text-zinc-400">Sentiment</span>
                                <span className={`text-[10px] font-black px-2 py-0.5 rounded-full border mt-0.5 ${insights.sentimentColor}`}>
                                  {insights.sentiment}
                                </span>
                              </div>
                            </div>

                            {/* Entity tags recognized by AI */}
                            <div className="border-t border-zinc-200 pt-2.5">
                              <span className="text-[9px] uppercase font-bold text-zinc-400 block mb-1.5">Identified Entities</span>
                              <div className="flex flex-wrap gap-1.5">
                                {insights.entities.map((tag, idx) => (
                                  <span key={idx} className="text-[10px] px-2 py-0.5 bg-white text-zinc-600 border border-zinc-200 rounded-md font-medium flex items-center gap-1">
                                    {tag}
                                  </span>
                                ))}
                              </div>
                            </div>
                          </div>
                        );
                      })()}

                      {/* Real ElevenLabs Recording */}
                      {selectedCallLog.audio_url && (
                        <div className="mb-4 bg-zinc-950 text-white rounded-2xl p-4 border border-zinc-800 shadow-lg space-y-2">
                          <div className="flex items-center justify-between gap-3">
                            <span className="text-[10px] font-black uppercase tracking-wider text-zinc-400 flex items-center gap-1">
                              <Volume2 className="w-3.5 h-3.5 text-red-500" />
                              ElevenLabs Recording
                            </span>
                            <span className="text-[9px] font-bold uppercase text-emerald-400">
                              Real Audio
                            </span>
                          </div>
                          <audio
                            controls
                            preload="none"
                            src={selectedCallLog.audio_url}
                            className="w-full h-10 rounded-lg"
                          >
                            Your browser does not support audio playback.
                          </audio>
                          <p className="text-[10px] text-zinc-500">
                            Playback is streamed securely from ElevenLabs for owner sessions.
                          </p>
                        </div>
                      )}
                      {/* Chat Messages */}
                      <div className="flex-1 overflow-y-auto space-y-4 pr-1 font-sans text-xs scrollbar-thin">
                        {selectedCallLog.transcript ? (() => {
                          const lines = selectedCallLog.transcript.split('\n').filter(line => line.trim());
                          return lines.map((line, idx) => {
                            const isZara = line.trim().startsWith('Zara:');
                            const messageText = line.replace(/^(Zara:|You:)/i, '').trim();
                            if (!messageText) return null;
                            
                            const isCurrentlyHighlighted = false;
                            const isPast = false;

                            return (
                              <motion.div 
                                key={idx} 
                                layout
                                className={`flex flex-col transition-all duration-300 ${isZara ? 'items-start' : 'items-end'}`}
                              >
                                <span className="text-[9px] text-zinc-400 font-bold mb-1 px-1 flex items-center gap-1">
                                  {isZara ? (
                                    <>
                                      <Cpu className="w-3 h-3 text-red-500" />
                                      Zara (AI Agent)
                                    </>
                                  ) : (
                                    <>
                                      <Users className="w-3 h-3 text-zinc-400" />
                                      Customer
                                    </>
                                  )}
                                </span>
                                
                                <div className={`max-w-[85%] rounded-2xl px-4 py-2.5 shadow-sm leading-relaxed transition-all duration-300 border ${
                                  isZara 
                                    ? isCurrentlyHighlighted
                                      ? 'bg-red-50 text-zinc-900 border-red-500 shadow-[0_0_12px_rgba(239,68,68,0.15)] ring-1 ring-red-500 font-medium'
                                      : 'bg-zinc-100 text-zinc-800 border-zinc-200'
                                    : isCurrentlyHighlighted
                                    ? 'bg-red-600 text-white border-red-400 shadow-[0_0_12px_rgba(239,68,68,0.3)] scale-[1.01]'
                                    : isPast
                                    ? 'bg-red-700/90 text-zinc-100 border-red-800 opacity-90'
                                    : 'bg-red-600 text-white border-red-700'
                                }`}>
                                  {messageText}
                                </div>
                              </motion.div>
                            );
                          });
                        })() : (
                          <div className="text-center py-16">
                            <MessageSquare className="w-8 h-8 text-zinc-300 mx-auto mb-2" />
                            <p className="text-xs text-zinc-400 italic">No transcription dialogue recorded.</p>
                          </div>
                        )}
                      </div>

                      <div className="border-t border-zinc-150 pt-3 mt-3 text-center flex items-center justify-between text-[10px] text-zinc-400">
                        <span className="font-mono">ID: {selectedCallLog.id.slice(0, 8)}</span>
                        <span>
                          Created {new Date(selectedCallLog.created_at).toLocaleString([], { dateStyle: 'short', timeStyle: 'short' })}
                        </span>
                      </div>
                    </motion.div>
                  ) : (
                    <div className="bg-white border border-zinc-200 rounded-2xl p-12 shadow-sm flex flex-col items-center justify-center text-center h-[700px] text-zinc-400">
                      <Phone className="w-12 h-12 text-zinc-200 mb-3 animate-bounce" />
                      <h4 className="font-bold text-zinc-700">No Transcript Selected</h4>
                      <p className="text-xs text-zinc-500 max-w-xs mt-1">Select any call record from the left list to view the full dialogue transcript.</p>
                    </div>
                  )}
                </div>

              </motion.div>
            )}

            {/* Tab view routing: Escalations & Feedback */}
            {activeTab === 'escalations' && (
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                
                {/* Voice Call Human Escalations */}
                <div className="bg-white border border-zinc-200 rounded-2xl p-6 shadow-sm">
                  <h3 className="font-bold text-zinc-900 text-base mb-4 flex items-center gap-2">
                    <AlertTriangle className="w-5 h-5 text-red-500" />
                    Human Agent Escalations
                  </h3>
                  
                  {escalations.length === 0 ? (
                    <p className="text-xs text-zinc-400 italic py-6 text-center">No active escalations logged.</p>
                  ) : (
                    <div className="space-y-4">
                      {escalations.map(esc => (
                        <div key={esc.id} className="border border-zinc-200 rounded-xl p-4 bg-zinc-50/50 space-y-3">
                          <div className="flex items-center justify-between">
                            <span className="font-bold text-xs text-zinc-800">{esc.customer_name}</span>
                            <StatusBadge status={esc.status} />
                          </div>
                          <p className="text-xs font-semibold text-rose-700">Reason: {esc.reason}</p>
                          {esc.transcript && (
                            <div className="p-3 bg-zinc-900 text-zinc-300 font-mono text-[10px] rounded-lg max-h-[140px] overflow-y-auto whitespace-pre-wrap">
                              {esc.transcript}
                            </div>
                          )}
                          <span className="text-[9px] text-zinc-400 block">{new Date(esc.created_at).toLocaleDateString()} at {new Date(esc.created_at).toLocaleTimeString()}</span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* Direct Customer Reviews */}
                <div className="bg-white border border-zinc-200 rounded-2xl p-6 shadow-sm">
                  <h3 className="font-bold text-zinc-900 text-base mb-4 flex items-center gap-2">
                    <Star className="w-5 h-5 text-amber-500" />
                    Customer Reviews Log
                  </h3>

                  <div className="space-y-4">
                    {feedback.map(fb => (
                      <div key={fb.id} className="border border-zinc-150 rounded-xl p-4 space-y-2">
                        <div className="flex items-center justify-between">
                          <span className="font-bold text-xs text-zinc-800">{fb.customer_name}</span>
                          <div className="flex gap-0.5">
                            {[1, 2, 3, 4, 5].map(s => (
                              <Star key={s} className={`w-3.5 h-3.5 ${fb.rating >= s ? 'text-amber-500 fill-amber-500' : 'text-zinc-200'}`} />
                            ))}
                          </div>
                        </div>
                        <p className="text-xs text-zinc-600 italic">"{fb.comment}"</p>
                        <span className="text-[9px] text-zinc-400 block">{new Date(fb.created_at).toLocaleDateString()}</span>
                      </div>
                    ))}
                  </div>
                </div>

              </div>
            )}

            {/* Tab view routing: Revenue Report */}
            {activeTab === 'revenue' && (
              <div className="space-y-6">
                <div>
                  <h3 className="font-bold text-zinc-900 text-base tracking-tight flex items-center gap-2">
                    <TrendingUp className="w-5 h-5 text-red-500" />
                    Revenue & Earnings Analytics
                  </h3>
                  <p className="text-xs text-zinc-400 mt-1">
                    Real-time transaction values of completed restaurant orders and guest covers.
                  </p>
                </div>

                {/* Filter Controls Card */}
                <div className="bg-white border border-zinc-200 rounded-2xl p-5 shadow-sm space-y-4">
                  <div className="flex items-center justify-between border-b border-zinc-100 pb-2.5">
                    <h4 className="text-xs font-black uppercase text-zinc-500 tracking-wider">Report Filters</h4>
                    {(revDateFilter || revMonthFilter !== 'ALL' || revTimeFilter !== 'ALL' || revTypeFilter !== 'ALL') && (
                      <button
                        onClick={() => {
                          setRevDateFilter('');
                          setRevMonthFilter('ALL');
                          setRevTimeFilter('ALL');
                          setRevTypeFilter('ALL');
                        }}
                        className="text-xs font-bold text-red-650 hover:text-red-500 transition-colors cursor-pointer"
                      >
                        Reset Filters
                      </button>
                    )}
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                    {/* 1. Type Selector */}
                    <div>
                      <label className="text-[10px] font-black uppercase text-zinc-400 block mb-1.5">Record Type</label>
                      <select
                        value={revTypeFilter}
                        onChange={e => setRevTypeFilter(e.target.value as any)}
                        className="w-full bg-zinc-50 border border-zinc-200 rounded-xl px-3 py-2 text-xs text-zinc-700 font-bold focus:outline-none focus:ring-1 focus:ring-red-500 cursor-pointer"
                      >
                        <option value="ALL">All Completed Actions</option>
                        <option value="ORDERS">Completed Orders Only</option>
                        <option value="RESERVATIONS">Completed Bookings Only</option>
                      </select>
                    </div>

                    {/* 2. Date selector */}
                    <div>
                      <label className="text-[10px] font-black uppercase text-zinc-400 block mb-1.5">Specific Date</label>
                      <input
                        type="date"
                        value={revDateFilter}
                        onChange={e => setRevDateFilter(e.target.value)}
                        className="w-full bg-zinc-50 border border-zinc-200 rounded-xl px-3 py-1.5 text-xs text-zinc-700 font-semibold focus:outline-none focus:ring-1 focus:ring-red-500 cursor-pointer"
                      />
                    </div>

                    {/* 3. Month selector */}
                    <div>
                      <label className="text-[10px] font-black uppercase text-zinc-400 block mb-1.5">Month of Year</label>
                      <select
                        value={revMonthFilter}
                        onChange={e => setRevMonthFilter(e.target.value)}
                        className="w-full bg-zinc-50 border border-zinc-200 rounded-xl px-3 py-2 text-xs text-zinc-700 font-bold focus:outline-none focus:ring-1 focus:ring-red-500 cursor-pointer"
                      >
                        <option value="ALL">All Months</option>
                        {['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'].map((m, idx) => (
                          <option key={idx} value={idx}>{m}</option>
                        ))}
                      </select>
                    </div>

                    {/* 4. Shift/Time filter */}
                    <div>
                      <label className="text-[10px] font-black uppercase text-zinc-400 block mb-1.5">Shift / Period</label>
                      <select
                        value={revTimeFilter}
                        onChange={e => setRevTimeFilter(e.target.value)}
                        className="w-full bg-zinc-50 border border-zinc-200 rounded-xl px-3 py-2 text-xs text-zinc-700 font-bold focus:outline-none focus:ring-1 focus:ring-red-500 cursor-pointer"
                      >
                        <option value="ALL">All Shifts (24 Hours)</option>
                        <option value="MORNING">Breakfast/Morning (6 AM - 12 PM)</option>
                        <option value="AFTERNOON">Lunch/Afternoon (12 PM - 6 PM)</option>
                        <option value="EVENING">Dinner/Evening (6 PM - 11 PM)</option>
                        <option value="NIGHT">Late Night (11 PM - 6 AM)</option>
                      </select>
                    </div>
                  </div>
                </div>

                {/* Metric Bento Cards */}
                <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                  <div className="bg-white border border-zinc-200 rounded-2xl p-5 shadow-sm flex flex-col justify-between">
                    <div>
                      <span className="text-[10px] uppercase font-bold text-zinc-400 tracking-wider">Completed Orders Revenue</span>
                      <h4 className="text-xl font-black text-red-600 mt-1.5">
                        PKR {completedRevOrdersRevenue.toLocaleString()}
                      </h4>
                    </div>
                    <p className="text-[10px] text-zinc-400 mt-3 font-semibold uppercase">Sum of completed bills</p>
                  </div>

                  <div className="bg-white border border-zinc-200 rounded-2xl p-5 shadow-sm flex flex-col justify-between">
                    <div>
                      <span className="text-[10px] uppercase font-bold text-zinc-400 tracking-wider">Completed Orders</span>
                      <h4 className="text-xl font-black text-zinc-800 mt-1.5">
                        {filteredRevOrders.length} orders
                      </h4>
                    </div>
                    <p className="text-[10px] text-zinc-400 mt-3 font-semibold uppercase">Total items delivered</p>
                  </div>

                  <div className="bg-white border border-zinc-200 rounded-2xl p-5 shadow-sm flex flex-col justify-between">
                    <div>
                      <span className="text-[10px] uppercase font-bold text-zinc-400 tracking-wider">Completed Bookings</span>
                      <h4 className="text-xl font-black text-zinc-800 mt-1.5">
                        {filteredRevReservations.length} tables
                      </h4>
                    </div>
                    <p className="text-[10px] text-zinc-400 mt-3 font-semibold uppercase">Total reservations seated</p>
                  </div>

                  <div className="bg-white border border-zinc-200 rounded-2xl p-5 shadow-sm flex flex-col justify-between">
                    <div>
                      <span className="text-[10px] uppercase font-bold text-zinc-400 tracking-wider">Completed Guest Covers</span>
                      <h4 className="text-xl font-black text-teal-650 mt-1.5">
                        {completedRevReservationsGuests} guests
                      </h4>
                    </div>
                    <p className="text-[10px] text-zinc-400 mt-3 font-semibold uppercase">Total seated party size</p>
                  </div>
                </div>

                {/* Unified Earnings Table */}
                <div className="bg-white border border-zinc-200 rounded-2xl overflow-hidden shadow-sm">
                  <div className="px-6 py-4 border-b border-zinc-150 bg-zinc-50 flex items-center justify-between">
                    <h4 className="text-xs font-black uppercase text-zinc-500 tracking-wider">Completed Transactions Log</h4>
                    <span className="text-[10px] font-mono font-bold text-zinc-450 bg-zinc-200 px-2 py-0.5 rounded">
                      {combinedRevItems.length} matching
                    </span>
                  </div>

                  <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse">
                      <thead>
                        <tr className="bg-zinc-50 border-b border-zinc-200 text-zinc-500 text-[10px] font-bold uppercase tracking-wider">
                          <th className="px-6 py-3">ID / Number</th>
                          <th className="px-6 py-3">Type</th>
                          <th className="px-6 py-3">Customer</th>
                          <th className="px-6 py-3">Date & Time</th>
                          <th className="px-6 py-3">Summary Details</th>
                          <th className="px-6 py-3 text-right">Revenue Value</th>
                          <th className="px-6 py-3 text-right">Actions</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-zinc-150 text-xs text-zinc-700">
                        {combinedRevItems.length === 0 ? (
                          <tr>
                            <td colSpan={7} className="px-6 py-12 text-center text-zinc-400 font-medium italic">
                              No completed records match the selected filter criteria.
                            </td>
                          </tr>
                        ) : (
                          combinedRevItems.map((item, idx) => (
                            <tr key={idx} className="hover:bg-zinc-50/50 transition-colors">
                              <td className="px-6 py-3.5 whitespace-nowrap">
                                <span className="font-mono font-bold text-zinc-800 bg-zinc-100 border px-1.5 py-0.5 rounded">
                                  {item.number}
                                </span>
                              </td>
                              <td className="px-6 py-3.5 whitespace-nowrap">
                                <span className={`px-2 py-0.5 rounded-full text-[9px] font-bold uppercase ${
                                  item.type === 'Order' ? 'bg-amber-50 text-amber-700 border border-amber-100' : 'bg-teal-50 text-teal-700 border border-teal-100'
                                }`}>
                                  {item.type}
                                </span>
                              </td>
                              <td className="px-6 py-3.5 whitespace-nowrap font-semibold text-zinc-800">
                                {item.customer}
                              </td>
                              <td className="px-6 py-3.5 whitespace-nowrap text-zinc-500 font-medium">
                                {item.date} at {item.time}
                              </td>
                              <td className="px-6 py-3.5 max-w-xs truncate text-zinc-650" title={item.details}>
                                {item.details}
                              </td>
                              <td className="px-6 py-3.5 text-right font-black text-zinc-900 whitespace-nowrap">
                                {item.type === 'Order' ? `PKR ${item.amount.toLocaleString()}` : '-'}
                              </td>
                              <td className="px-6 py-3.5 text-right whitespace-nowrap">
                                <button
                                  onClick={() => {
                                    const record = item.type === 'Order' 
                                      ? orders.find(o => o.id === item.id)
                                      : reservations.find(r => r.id === item.id);
                                    if (record) {
                                      setSelectedRecord(record);
                                      setSelectedRecordType(item.type === 'Order' ? 'order' : 'reservation');
                                      setIsDrawerOpen(true);
                                    }
                                  }}
                                  className="text-[10px] font-bold text-red-600 hover:text-red-500 transition-colors cursor-pointer border-none bg-transparent"
                                >
                                  View Details
                                </button>
                              </td>
                            </tr>
                          ))
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
            )}
          </main>

          {/* Mobile Admin navigation bar */}
          <MobileNav currentTab={activeTab} onTabChange={setActiveTab} role="owner" unreadCount={escalations.filter(e => e.status === 'PENDING').length} />

        </div>
      )}

      {/* 5. Record Slide-over Detail Drawer */}
      <RecordDetailDrawer
        isOpen={isDrawerOpen}
        onClose={() => {
          setIsDrawerOpen(false);
          setSelectedRecord(null);
          setSelectedRecordType(null);
        }}
        record={selectedRecord}
        type={selectedRecordType}
        onCancelRecord={handleCancelRecord}
        onModifyRecord={handleModifyRecord}
      />

    </div>
  );
}
