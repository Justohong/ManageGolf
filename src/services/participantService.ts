import { db } from '../db';
import type { Participant } from '../db';

export const participantService = {
  async getAllParticipants(): Promise<Participant[]> {
    return db.participants.toArray();
  },

  async addParticipant(participant: Participant): Promise<number> {
    return db.participants.add(participant);
  },

  async updateParticipant(id: number, updates: Partial<Participant>): Promise<number> {
    return db.participants.update(id, updates);
  },

  async deleteParticipant(id: number): Promise<void> {
    return db.participants.delete(id);
  },
};