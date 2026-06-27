import React from 'react';
import { Eye, Calendar, Users, AlertCircle } from 'lucide-react';
import { Reservation, ReservationStatus } from '../types';
import StatusBadge from './StatusBadge';

interface ReservationTableProps {
  reservations: Reservation[];
  onViewDetails: (res: Reservation) => void;
  onStatusChange: (resId: string, newStatus: ReservationStatus) => void;
}

import { formatReservationDate } from '../utils/date';

const RESERVATION_STATUSES: ReservationStatus[] = ['CONFIRMED', 'MODIFIED', 'CANCELLED', 'COMPLETED', 'NO_SHOW'];

export default function ReservationTable({ reservations, onViewDetails, onStatusChange }: ReservationTableProps) {
  if (reservations.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-12 text-center bg-white border border-zinc-200 rounded-xl">
        <AlertCircle className="w-10 h-10 text-zinc-300 mb-3" />
        <h4 className="font-semibold text-zinc-700">No Reservations Found</h4>
        <p className="text-xs text-zinc-400 mt-1">Try adjusting your filters or search terms.</p>
      </div>
    );
  }

  return (
    <div className="bg-white border border-zinc-200 rounded-xl overflow-hidden shadow-sm">
      <div className="overflow-x-auto">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="bg-zinc-50 border-b border-zinc-200 text-zinc-600 text-xs font-semibold uppercase tracking-wider">
              <th className="px-6 py-4">Booking ID</th>
              <th className="px-6 py-4">Customer</th>
              <th className="px-6 py-4">Date & Time</th>
              <th className="px-6 py-4">Party Size</th>
              <th className="px-6 py-4">Special Requests</th>
              <th className="px-6 py-4">Status</th>
              <th className="px-6 py-4 text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-zinc-150 text-sm text-zinc-800">
            {reservations.map(res => {
              const formattedDate = formatReservationDate(res.reservation_date);

              return (
                <tr key={res.id} className="hover:bg-zinc-50/50 transition-colors">
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className="font-mono font-bold text-zinc-900 bg-zinc-100 border border-zinc-200 px-2 py-0.5 rounded text-xs">
                      {res.reservation_number}
                    </span>
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex flex-col">
                      <span className="font-semibold text-zinc-900">{res.customer_name}</span>
                      <span className="text-xs text-zinc-500 font-mono">{res.customer_phone}</span>
                      <span className="text-xs text-zinc-400">{res.customer_email}</span>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex flex-col">
                      <span className="font-medium text-zinc-800">{formattedDate}</span>
                      <span className="text-xs text-zinc-500 font-medium mt-0.5">{res.reservation_time}</span>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex items-center gap-1 font-semibold text-zinc-800">
                      <Users className="w-4 h-4 text-zinc-400" />
                      <span>{res.party_size} {res.party_size === 1 ? 'person' : 'guests'}</span>
                    </div>
                  </td>
                  <td className="px-6 py-4 max-w-xs">
                    {res.special_requests ? (
                      <p className="italic text-zinc-600 line-clamp-2">"{res.special_requests}"</p>
                    ) : (
                      <span className="text-zinc-400 text-xs">None</span>
                    )}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex items-center gap-2">
                      <select
                        value={res.status}
                        onChange={e => onStatusChange(res.id, e.target.value as ReservationStatus)}
                        className="bg-white border border-zinc-300 text-xs rounded-lg px-2 py-1 focus:outline-none focus:ring-1 focus:ring-red-500 cursor-pointer"
                      >
                        {RESERVATION_STATUSES.map(status => (
                          <option key={status} value={status}>
                            {status.replace(/_/g, ' ')}
                          </option>
                        ))}
                      </select>
                    </div>
                  </td>
                  <td className="px-6 py-4 text-right whitespace-nowrap">
                    <button
                      onClick={() => onViewDetails(res)}
                      className="p-1.5 text-zinc-600 hover:text-red-600 hover:bg-zinc-100 rounded-lg transition-colors cursor-pointer inline-flex items-center gap-1 text-xs font-semibold"
                    >
                      <Eye className="w-4 h-4" />
                      View
                    </button>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
