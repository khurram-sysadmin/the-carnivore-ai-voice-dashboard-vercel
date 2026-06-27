import React from 'react';
import { Calendar, Users, Clock, MessageSquare, Edit3, Trash2 } from 'lucide-react';
import { Reservation } from '../types';
import StatusBadge from './StatusBadge';

import { formatReservationDate } from '../utils/date';

interface ReservationCardProps {
  key?: React.Key;
  reservation: Reservation;
  onViewDetails: (reservation: Reservation) => void;
  onModify?: (reservation: Reservation) => void;
  onCancel?: (reservation: Reservation) => void;
}

export default function ReservationCard({ reservation, onViewDetails, onModify, onCancel }: ReservationCardProps) {
  const formattedDate = formatReservationDate(reservation.reservation_date);

  const canEdit = reservation.status === 'CONFIRMED' || reservation.status === 'MODIFIED';

  return (
    <div
      id={`reservation-card-${reservation.reservation_number}`}
      className="bg-white border border-zinc-200 rounded-xl p-4 shadow-sm hover:shadow-md transition-shadow flex flex-col justify-between h-full"
    >
      <div>
        <div className="flex items-center justify-between mb-3">
          <span className="font-mono text-sm font-bold text-zinc-900 bg-zinc-50 border border-zinc-100 px-2 py-0.5 rounded">
            {reservation.reservation_number}
          </span>
          <StatusBadge status={reservation.status} />
        </div>

        <div className="space-y-2 mb-4">
          <div className="flex items-center gap-1.5 text-sm font-semibold text-zinc-800">
            <Users className="w-4 h-4 text-zinc-400" />
            <span>Table for {reservation.party_size} guests</span>
          </div>

          <div className="grid grid-cols-2 gap-2 mt-2">
            <div className="flex items-center gap-1 text-xs text-zinc-500">
              <Calendar className="w-3.5 h-3.5 text-zinc-400" />
              <span>{formattedDate}</span>
            </div>
            <div className="flex items-center gap-1 text-xs text-zinc-500">
              <Clock className="w-3.5 h-3.5 text-zinc-400" />
              <span>{reservation.reservation_time}</span>
            </div>
          </div>

          {reservation.special_requests && (
            <div className="flex items-start gap-1 text-xs text-zinc-400 mt-2 bg-zinc-50 p-2 rounded border border-zinc-100">
              <MessageSquare className="w-3.5 h-3.5 text-zinc-400 mt-0.5 flex-shrink-0" />
              <span className="line-clamp-2 italic">"{reservation.special_requests}"</span>
            </div>
          )}
        </div>
      </div>

      <div className="border-t border-zinc-100 pt-3 flex items-center justify-between gap-2 mt-auto">
        <span className="text-xs text-zinc-400 font-medium">
          By: {reservation.customer_name}
        </span>

        <div className="flex items-center gap-1.5">
          <button
            onClick={() => onViewDetails(reservation)}
            className="text-xs bg-zinc-100 hover:bg-zinc-200 text-zinc-700 px-3 py-1.5 rounded-lg font-medium transition-colors cursor-pointer"
          >
            Details
          </button>
          
          {canEdit && (onModify || onCancel) && (
            <div className="flex items-center gap-1">
              {onModify && (
                <button
                  onClick={() => onModify(reservation)}
                  className="p-1.5 text-zinc-500 hover:text-red-600 hover:bg-red-50 rounded-md transition-colors cursor-pointer"
                  title="Modify Booking"
                >
                  <Edit3 className="w-3.5 h-3.5" />
                </button>
              )}
              {onCancel && (
                <button
                  onClick={() => onCancel(reservation)}
                  className="p-1.5 text-zinc-500 hover:text-rose-600 hover:bg-rose-50 rounded-md transition-colors cursor-pointer"
                  title="Cancel Booking"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
