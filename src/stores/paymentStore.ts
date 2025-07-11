import { create } from 'zustand';
import { db, type Payment } from '../db';

interface PaymentStore {
  payments: Payment[];
  fetchPayments: () => Promise<void>;
  addPayment: (payment: Payment) => Promise<number>;
  updatePayment: (id: number, payment: Partial<Payment>) => Promise<void>;
  deletePayment: (id: number) => Promise<void>;
  exportPaymentsToJSON: () => Promise<string>;
  importPaymentsFromJSON: (jsonData: string) => Promise<void>;
}

export const usePaymentStore = create<PaymentStore>((set, get) => ({
  payments: [],
  
  fetchPayments: async () => {
    try {
      const payments = await db.payments.toArray();
      set({ payments });
    } catch (error) {
      console.error('Error fetching payments:', error);
    }
  },
  
  addPayment: async (payment: Payment) => {
    try {
      const id = await db.payments.add(payment);
      await get().fetchPayments();
      return id;
    } catch (error) {
      console.error('Error adding payment:', error);
      throw error;
    }
  },
  
  updatePayment: async (id: number, payment: Partial<Payment>) => {
    try {
      await db.payments.update(id, payment);
      await get().fetchPayments();
    } catch (error) {
      console.error('Error updating payment:', error);
      throw error;
    }
  },
  
  deletePayment: async (id: number) => {
    try {
      await db.payments.delete(id);
      await get().fetchPayments();
    } catch (error) {
      console.error('Error deleting payment:', error);
      throw error;
    }
  },

  // JSON으로 내보내기 기능
  exportPaymentsToJSON: async () => {
    try {
      const payments = await db.payments.toArray();
      return JSON.stringify(payments, null, 2);
    } catch (error) {
      console.error('Error exporting payments to JSON:', error);
      throw error;
    }
  },

  // JSON에서 가져오기 기능
  importPaymentsFromJSON: async (jsonData: string) => {
    try {
      const payments = JSON.parse(jsonData) as Payment[];
      
      // 기존 ID와 충돌을 방지하기 위해 ID 제거
      const paymentsWithoutIds = payments.map(({ id, ...rest }) => rest);
      
      // 트랜잭션으로 일괄 처리
      await db.transaction('rw', db.payments, async () => {
        for (const payment of paymentsWithoutIds) {
          await db.payments.add(payment as Payment);
        }
      });
      
      await get().fetchPayments();
    } catch (error) {
      console.error('Error importing payments from JSON:', error);
      throw error;
    }
  }
}));