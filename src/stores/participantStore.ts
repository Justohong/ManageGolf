import { create } from 'zustand';
import { db, type Participant } from '../db';

interface ParticipantStore {
  participants: Participant[];
  fetchParticipants: () => Promise<void>;
  addParticipant: (participant: Participant) => Promise<number>;
  updateParticipant: (id: number, participant: Partial<Participant>) => Promise<void>;
  deleteParticipant: (id: number) => Promise<void>;
  exportParticipantsToJSON: () => Promise<string>;
  importParticipantsFromJSON: (jsonData: string) => Promise<void>;
}

export const useParticipantStore = create<ParticipantStore>((set, get) => ({
  participants: [],
  
  fetchParticipants: async () => {
    try {
      const participants = await db.participants.toArray();
      set({ participants });
    } catch (error) {
      console.error('Error fetching participants:', error);
    }
  },
  
  addParticipant: async (participant: Participant) => {
    try {
      const id = await db.participants.add(participant);
      await get().fetchParticipants();
      return id;
    } catch (error) {
      console.error('Error adding participant:', error);
      throw error;
    }
  },
  
  updateParticipant: async (id: number, participant: Partial<Participant>) => {
    try {
      await db.participants.update(id, participant);
      await get().fetchParticipants();
    } catch (error) {
      console.error('Error updating participant:', error);
      throw error;
    }
  },
  
  deleteParticipant: async (id: number) => {
    try {
      await db.participants.delete(id);
      await get().fetchParticipants();
    } catch (error) {
      console.error('Error deleting participant:', error);
      throw error;
    }
  },

  // JSON으로 내보내기 기능
  exportParticipantsToJSON: async () => {
    try {
      const participants = await db.participants.toArray();
      return JSON.stringify(participants, null, 2);
    } catch (error) {
      console.error('Error exporting participants to JSON:', error);
      throw error;
    }
  },

  // JSON에서 가져오기 기능
  importParticipantsFromJSON: async (jsonData: string) => {
    try {
      const participants = JSON.parse(jsonData) as Participant[];
      
      // 기존 ID와 충돌을 방지하기 위해 ID 제거
      const participantsWithoutIds = participants.map(({ id, ...rest }) => rest);
      
      // 트랜잭션으로 일괄 처리
      await db.transaction('rw', db.participants, async () => {
        for (const participant of participantsWithoutIds) {
          await db.participants.add(participant as Participant);
        }
      });
      
      await get().fetchParticipants();
    } catch (error) {
      console.error('Error importing participants from JSON:', error);
      throw error;
    }
  }
}));