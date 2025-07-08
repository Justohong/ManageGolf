import { db } from '../db';
import type { Payment } from '../db';

export const paymentService = {
  async getAllPayments(): Promise<Payment[]> {
    return db.payments.toArray();
  },

  async addPayment(payment: Payment): Promise<number> {
    return db.payments.add(payment);
  },

  async updatePayment(id: number, updates: Partial<Payment>): Promise<number> {
    return db.payments.update(id, updates);
  },

  async deletePayment(id: number): Promise<void> {
    return db.payments.delete(id);
  },
};