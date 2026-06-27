import React from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { X, Calendar, Users, Clock, ShoppingBag, CreditCard, MapPin, CheckCircle2, AlertCircle, Edit, Trash2 } from 'lucide-react';
import { Order, Reservation } from '../types';
import StatusBadge from './StatusBadge';

import { formatReservationDate } from '../utils/date';

interface RecordDetailDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  record: Order | Reservation | null;
  type: 'order' | 'reservation' | null;
  onCancelRecord?: (id: string, type: 'order' | 'reservation') => void;
  onModifyRecord?: (record: any, type: 'order' | 'reservation') => void;
}

export default function RecordDetailDrawer({
  isOpen,
  onClose,
  record,
  type,
  onCancelRecord,
  onModifyRecord
}: RecordDetailDrawerProps) {
  if (!isOpen || !record) return null;

  const isOrder = type === 'order' && 'order_number' in record;
  const isReservation = type === 'reservation' && 'reservation_number' in record;

  const handleCancel = () => {
    if (onCancelRecord) {
      onCancelRecord(record.id, type as 'order' | 'reservation');
      onClose();
    }
  };

  const handleModify = () => {
    if (onModifyRecord) {
      onModifyRecord(record, type as 'order' | 'reservation');
      onClose();
    }
  };

  const isCancellable = record.status === 'RECEIVED' || record.status === 'PREPARING' || record.status === 'CONFIRMED' || record.status === 'MODIFIED';

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 overflow-hidden" id="detail-drawer-container">
        {/* Backdrop blur */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={onClose}
          className="absolute inset-0 bg-zinc-950/40 backdrop-blur-sm transition-opacity"
        />

        <div className="absolute inset-y-0 right-0 max-w-full flex pl-10">
          <motion.div
            initial={{ x: '100%' }}
            animate={{ x: 0 }}
            exit={{ x: '100%' }}
            transition={{ type: 'spring', damping: 25, stiffness: 220 }}
            className="w-screen max-w-md bg-white shadow-2xl flex flex-col"
          >
            {/* Drawer Header */}
            <div className="px-6 py-5 bg-zinc-50 border-b border-zinc-200 flex items-center justify-between">
              <div>
                <span className="text-[10px] uppercase font-bold tracking-wider text-zinc-400">
                  {isOrder ? 'Order Information' : 'Reservation Information'}
                </span>
                <h2 className="text-lg font-bold text-zinc-900 mt-1 flex items-center gap-2">
                  {isOrder ? (
                    <>
                      <ShoppingBag className="w-5 h-5 text-red-600" />
                      {(record as Order).order_number}
                    </>
                  ) : (
                    <>
                      <Calendar className="w-5 h-5 text-red-600" />
                      {(record as Reservation).reservation_number}
                    </>
                  )}
                </h2>
              </div>
              <button
                onClick={onClose}
                className="p-2 text-zinc-400 hover:text-zinc-600 hover:bg-zinc-100 rounded-lg transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Drawer Body */}
            <div className="flex-1 overflow-y-auto p-6 space-y-6">
              
              {/* Status Section */}
              <div className="bg-zinc-50 border border-zinc-200 rounded-xl p-4 flex items-center justify-between">
                <span className="text-sm font-semibold text-zinc-700">Status</span>
                <StatusBadge status={record.status} />
              </div>

              {/* Order Specific Details */}
              {isOrder && (
                <div className="space-y-6">
                  {/* Items List */}
                  <div>
                    <h3 className="text-xs font-bold uppercase text-zinc-400 tracking-wider mb-3">Ordered Items</h3>
                    <div className="border border-zinc-150 rounded-xl overflow-hidden divide-y divide-zinc-100 bg-zinc-50/50">
                      {(record as Order).items?.map((item, idx) => {
                        const qty = item.quantity || 1;
                        const weight = item.weight_grams || 0;
                        const isPerGram = weight > 0;
                        
                        // Determine unit price
                        let unitPrice = 0;
                        if (item.unit_price !== undefined && item.unit_price !== null) {
                          unitPrice = item.unit_price;
                        } else if (item.price !== undefined && item.price !== null) {
                          const rawPrice = item.price;
                          if (isPerGram) {
                            unitPrice = rawPrice < 50 ? rawPrice : (rawPrice / weight);
                          } else {
                            unitPrice = rawPrice;
                          }
                        }
                        
                        // Determine line total
                        let lineTotal = 0;
                        if (item.line_total !== undefined && item.line_total !== null) {
                          lineTotal = item.line_total;
                        } else {
                          if (isPerGram) {
                            lineTotal = unitPrice * weight * qty;
                          } else {
                            lineTotal = unitPrice * qty;
                          }
                        }
                        
                        return (
                          <div key={idx} className="p-3.5 space-y-1.5 text-xs border-b border-zinc-150 bg-white">
                            <div className="flex justify-between items-baseline">
                              <p className="font-bold text-sm text-zinc-900">
                                {qty} x {item.item_name} {isPerGram ? `(${weight}g)` : ''}
                              </p>
                              <span className="font-extrabold text-sm text-zinc-900">
                                PKR {lineTotal.toLocaleString(undefined, { maximumFractionDigits: 0 })}
                              </span>
                            </div>
                            <div className="flex justify-between text-[11px] text-zinc-500 font-medium">
                              <div>
                                <span className="text-zinc-400 mr-1 font-semibold">Rate:</span>
                                <span>{isPerGram ? `PKR ${unitPrice.toFixed(2)}/g` : `PKR ${unitPrice.toLocaleString()}`}</span>
                              </div>
                              <div>
                                <span className="text-zinc-400 mr-1 font-semibold">Line total:</span>
                                <span className="font-bold text-zinc-700">PKR {lineTotal.toLocaleString(undefined, { maximumFractionDigits: 0 })}</span>
                              </div>
                            </div>
                          </div>
                        );
                      })}
                      
                      <div className="p-4 bg-zinc-50 flex justify-between items-center border-t border-zinc-200">
                        <span className="font-bold text-zinc-700">Grand Total</span>
                        <span className="text-lg font-black text-red-600">
                          PKR {parseFloat((record as Order).total_amount.toString()).toLocaleString()}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Order Specs */}
                  <div className="space-y-4">
                    <h3 className="text-xs font-bold uppercase text-zinc-400 tracking-wider">Specifications</h3>
                    
                    <div className="grid grid-cols-2 gap-4">
                      <div className="bg-zinc-50 border border-zinc-150 rounded-xl p-3">
                        <span className="text-[10px] uppercase text-zinc-400 block font-bold">Order Type</span>
                        <span className="text-sm font-bold text-zinc-800 mt-1 block uppercase">
                          {(record as Order).order_type.replace('_', ' ')}
                        </span>
                      </div>

                      <div className="bg-zinc-50 border border-zinc-150 rounded-xl p-3">
                        <span className="text-[10px] uppercase text-zinc-400 block font-bold">Payment Method</span>
                        <span className="text-sm font-bold text-zinc-800 mt-1 block uppercase">
                          {(record as Order).payment_method}
                        </span>
                      </div>
                    </div>

                    {(record as Order).delivery_address && (
                      <div className="bg-zinc-50 border border-zinc-150 rounded-xl p-3 flex items-start gap-2">
                        <MapPin className="w-4 h-4 text-zinc-400 mt-0.5 flex-shrink-0" />
                        <div>
                          <span className="text-[10px] uppercase text-zinc-400 block font-bold">Delivery Address</span>
                          <span className="text-sm text-zinc-700 font-medium mt-1 block">
                            {(record as Order).delivery_address}
                          </span>
                        </div>
                      </div>
                    )}

                    {(record as Order).eta && (
                      <div className="bg-emerald-50/50 border border-emerald-100 rounded-xl p-3 flex items-start gap-2">
                        <Clock className="w-4 h-4 text-emerald-600 mt-0.5 flex-shrink-0" />
                        <div>
                          <span className="text-[10px] uppercase text-emerald-600 block font-bold">Estimated Arrival</span>
                          <span className="text-sm font-bold text-emerald-800 mt-0.5 block">
                            {new Date((record as Order).eta!).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                          </span>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Reservation Specific Details */}
              {isReservation && (
                <div className="space-y-6">
                  {/* Reservation Specs */}
                  <div>
                    <h3 className="text-xs font-bold uppercase text-zinc-400 tracking-wider mb-3">Booking Details</h3>
                    
                    <div className="space-y-3.5">
                      <div className="bg-zinc-50 border border-zinc-150 rounded-xl p-4 flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <Users className="w-4 h-4 text-zinc-400" />
                          <span className="text-sm text-zinc-600 font-medium">Party Size</span>
                        </div>
                        <span className="text-sm font-bold text-zinc-900">
                          {(record as Reservation).party_size} guests
                        </span>
                      </div>

                      <div className="bg-zinc-50 border border-zinc-150 rounded-xl p-4 flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <Calendar className="w-4 h-4 text-zinc-400" />
                          <span className="text-sm text-zinc-600 font-medium">Date</span>
                        </div>
                        <span className="text-sm font-bold text-zinc-900">
                          {formatReservationDate((record as Reservation).reservation_date)}
                        </span>
                      </div>

                      <div className="bg-zinc-50 border border-zinc-150 rounded-xl p-4 flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <Clock className="w-4 h-4 text-zinc-400" />
                          <span className="text-sm text-zinc-600 font-medium">Time</span>
                        </div>
                        <span className="text-sm font-bold text-zinc-900">
                          {(record as Reservation).reservation_time}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Special Requests */}
                  <div>
                    <h3 className="text-xs font-bold uppercase text-zinc-400 tracking-wider mb-3">Special Requests</h3>
                    <div className="bg-zinc-50 border border-zinc-150 rounded-xl p-4 italic text-sm text-zinc-700">
                      {(record as Reservation).special_requests || 'No special requests provided.'}
                    </div>
                  </div>
                </div>
              )}

              {/* Customer Contact Details (Admin visible context) */}
              <div className="pt-4 border-t border-zinc-200">
                <h3 className="text-xs font-bold uppercase text-zinc-400 tracking-wider mb-3">Contact Information</h3>
                <div className="bg-zinc-50 border border-zinc-150 rounded-xl p-4 space-y-2 text-sm text-zinc-700">
                  <div className="flex justify-between">
                    <span className="text-zinc-400">Name:</span>
                    <span className="font-semibold text-zinc-800">{record.customer_name}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-zinc-400">Phone:</span>
                    <span className="font-mono font-medium text-zinc-800">{record.customer_phone}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-zinc-400">Email:</span>
                    <span className="text-zinc-800">{record.customer_email}</span>
                  </div>
                </div>
              </div>

            </div>

            {/* Drawer Footer Actions */}
            {isCancellable && (
              <div className="px-6 py-5 bg-zinc-50 border-t border-zinc-200 flex items-center gap-3">
                <button
                  onClick={handleModify}
                  className="flex-1 bg-white hover:bg-zinc-50 text-zinc-800 border border-zinc-300 font-semibold py-3 px-4 rounded-xl text-sm transition-colors cursor-pointer flex items-center justify-center gap-2 shadow-sm"
                >
                  <Edit className="w-4 h-4" />
                  Modify
                </button>
                <button
                  onClick={handleCancel}
                  className="flex-1 bg-red-600 hover:bg-red-700 text-white font-semibold py-3 px-4 rounded-xl text-sm transition-colors cursor-pointer flex items-center justify-center gap-2 shadow-md"
                >
                  <Trash2 className="w-4 h-4" />
                  Cancel
                </button>
              </div>
            )}
          </motion.div>
        </div>
      </div>
    </AnimatePresence>
  );
}
