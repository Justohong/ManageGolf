import { create } from 'zustand';
import type { Payment } from '../db';
import { paymentService } from '../services/paymentService';

interface PaymentState {
  payments: Payment[];
  fetchPayments: () => Promise<void>;
  addPayment: (payment: Payment) => Promise<void>;
  updatePayment: (id: number, updates: Partial<Payment>) => Promise<void>;
  deletePayment: (id: number) => Promise<void>;
}

export const usePaymentStore = create<PaymentState>((set, get) => ({
  payments: [],
  fetchPayments: async () => {
    const payments = await paymentService.getAllPayments();
    set({ payments });
  },
  addPayment: async (payment) => {
    await paymentService.addPayment(payment);
    get().fetchPayments(); // Refresh list
  },
  updatePayment: async (id, updates) => {
    await paymentService.updatePayment(id, updates);
    get().fetchPayments(); // Refresh list
  },
  deletePayment: async (id) => {
    await paymentService.deletePayment(id);
    get().fetchPayments(); // Refresh list
  },
}));