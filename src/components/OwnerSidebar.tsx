import React from 'react';
import { LayoutGrid, ShoppingBag, Calendar, ListCollapse, AlertTriangle, Sparkles, Database, Webhook, LogOut, PhoneCall, TrendingUp } from 'lucide-react';
import CarnivoreLogo from './CarnivoreLogo';

interface OwnerSidebarProps {
  currentTab: string;
  onTabChange: (tab: string) => void;
  config: {
    isSupabaseConfigured: boolean;
    hasN8nWebhook: boolean;
    elevenlabsAgentId: string;
  };
  onLogOut: () => void;
}

export default function OwnerSidebar({ currentTab, onTabChange, config, onLogOut }: OwnerSidebarProps) {
  const navItems = [
    { id: 'overview', name: 'Overview & Stats', icon: LayoutGrid },
    { id: 'orders', name: 'All Orders', icon: ShoppingBag },
    { id: 'reservations', name: 'All Reservations', icon: Calendar },
    { id: 'menu', name: 'Manage Menu', icon: ListCollapse },
    { id: 'call_logs', name: 'Call Logs', icon: PhoneCall },
    { id: 'escalations', name: 'Escalations & Feedback', icon: AlertTriangle },
    { id: 'revenue', name: 'Revenue Analytics', icon: TrendingUp },
  ];

  return (
    <div className="hidden md:flex w-64 bg-zinc-950 text-white flex-col h-screen fixed top-0 left-0 border-r border-zinc-850 z-20">
      
      {/* Brand Header */}
      <div className="px-6 py-5 border-b border-zinc-900">
        <div className="flex items-center gap-3">
          <CarnivoreLogo className="w-10 h-10" />
          <div>
            <h1 className="font-black text-sm tracking-tight leading-none text-zinc-100">THE CARNIVORE</h1>
            <p className="text-[10px] text-zinc-500 font-bold tracking-wider mt-1 uppercase">Operations Portal</p>
          </div>
        </div>
      </div>

      {/* Nav List */}
      <nav className="flex-1 px-4 py-6 space-y-1.5 overflow-y-auto">
        {navItems.map(item => {
          const Icon = item.icon;
          const isActive = currentTab === item.id;

          return (
            <button
              key={item.id}
              onClick={() => onTabChange(item.id)}
              className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-semibold transition-all cursor-pointer ${
                isActive
                  ? 'bg-red-600 text-white shadow-lg shadow-red-650/15'
                  : 'text-zinc-400 hover:text-white hover:bg-zinc-900'
              }`}
            >
              <Icon className="w-4 h-4 flex-shrink-0" />
              <span>{item.name}</span>
            </button>
          );
        })}
      </nav>

      {/* Bottom Integration Statuses */}
      <div className="p-4 border-t border-zinc-900 bg-zinc-950">
        <div className="space-y-2.5 p-3 bg-zinc-900 rounded-xl border border-zinc-850">
          <span className="text-[9px] uppercase font-black text-zinc-500 tracking-wider block">
            System Integrations
          </span>

          <div className="flex items-center justify-between text-xs text-zinc-400">
            <span className="flex items-center gap-1.5">
              <Database className="w-3.5 h-3.5 text-zinc-500" />
              Supabase
            </span>
            <span className={`w-2 h-2 rounded-full ${config.isSupabaseConfigured ? 'bg-emerald-500' : 'bg-amber-500'}`} title={config.isSupabaseConfigured ? 'Connected' : 'Fallback Mode'} />
          </div>

          <div className="flex items-center justify-between text-xs text-zinc-400">
            <span className="flex items-center gap-1.5">
              <Webhook className="w-3.5 h-3.5 text-zinc-500" />
              n8n Webhook
            </span>
            <span className={`w-2 h-2 rounded-full ${config.hasN8nWebhook ? 'bg-emerald-500' : 'bg-zinc-600'}`} />
          </div>

          <div className="flex items-center justify-between text-xs text-zinc-400">
            <span className="flex items-center gap-1.5">
              <Sparkles className="w-3.5 h-3.5 text-zinc-500" />
              Voice agent (Zara)
            </span>
            <span className="text-[10px] font-mono text-zinc-500 uppercase">Live</span>
          </div>
        </div>

        {/* Logout */}
        <button
          onClick={onLogOut}
          className="w-full flex items-center gap-2 justify-center mt-4 text-xs font-semibold text-zinc-400 hover:text-red-500 py-2 rounded-lg hover:bg-red-950/20 transition-colors border border-transparent hover:border-red-950/40 cursor-pointer"
        >
          <LogOut className="w-3.5 h-3.5" />
          Log Out Admin
        </button>
      </div>

    </div>
  );
}
