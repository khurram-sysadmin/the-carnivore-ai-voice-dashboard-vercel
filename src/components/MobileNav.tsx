import React from 'react';
import { Phone, ShoppingBag, Calendar, LayoutGrid, ListCollapse, AlertTriangle, User, TrendingUp } from 'lucide-react';

interface MobileNavProps {
  currentTab: string;
  onTabChange: (tab: string) => void;
  role: 'customer' | 'owner';
  unreadCount?: number;
}

export default function MobileNav({ currentTab, onTabChange, role, unreadCount = 0 }: MobileNavProps) {
  const customerTabs = [
    { id: 'call', name: 'Zara AI', icon: Phone },
    { id: 'menu', name: 'Menu', icon: ListCollapse },
    { id: 'orders', name: 'My Orders', icon: ShoppingBag },
    { id: 'reservations', name: 'Reservations', icon: Calendar },
  ];

  const ownerTabs = [
    { id: 'overview', name: 'Overview', icon: LayoutGrid },
    { id: 'orders', name: 'Orders', icon: ShoppingBag },
    { id: 'reservations', name: 'Bookings', icon: Calendar },
    { id: 'menu', name: 'Menu', icon: ListCollapse },
    { id: 'escalations', name: 'Alerts', icon: AlertTriangle },
    { id: 'revenue', name: 'Revenue', icon: TrendingUp },
  ];

  const tabs = role === 'customer' ? customerTabs : ownerTabs;

  return (
    <div
      id="mobile-bottom-nav"
      className="md:hidden fixed bottom-0 left-0 right-0 bg-white border-t border-zinc-200 z-40 px-2 py-1.5 shadow-[0_-4px_12px_rgba(0,0,0,0.05)] flex items-center justify-around"
    >
      {tabs.map(tab => {
        const Icon = tab.icon;
        const isActive = currentTab === tab.id;

        return (
          <button
            key={tab.id}
            onClick={() => onTabChange(tab.id)}
            className={`flex flex-col items-center justify-center flex-1 py-1 px-2 rounded-xl transition-all cursor-pointer relative ${
              isActive 
                ? 'text-red-600 font-bold' 
                : 'text-zinc-400 hover:text-zinc-600'
            }`}
          >
            <div className={`p-1.5 rounded-lg transition-colors ${isActive ? 'bg-red-50 text-red-600' : ''}`}>
              <Icon className="w-5 h-5 flex-shrink-0" />
            </div>
            <span className="text-[10px] mt-0.5 tracking-tight font-semibold">
              {tab.name}
            </span>

            {/* Notification Badge if applicable */}
            {tab.id === 'escalations' && unreadCount > 0 && (
              <span className="absolute top-1 right-4 flex h-2.5 w-2.5">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-red-500"></span>
              </span>
            )}
          </button>
        );
      })}
    </div>
  );
}
