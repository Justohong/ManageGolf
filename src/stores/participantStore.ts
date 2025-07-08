import { create } from 'zustand';
import type { Participant } from '../db';
import { participantService } from '../services/participantService';

interface ParticipantState {
  participants: Participant[];
  fetchParticipants: () => Promise<void>;
  addParticipant: (participant: Participant) => Promise<void>;
  updateParticipant: (id: number, updates: Partial<Participant>) => Promise<void>;
  deleteParticipant: (id: number) => Promise<void>;
}

export const useParticipantStore = create<ParticipantState>((set, get) => ({
  participants: [],
  fetchParticipants: async () => {
    const participants = await participantService.getAllParticipants();
    set({ participants });
  },
  addParticipant: async (participant) => {
    const id = await participantService.addParticipant(participant);
    get().fetchParticipants(); // Refresh list
  },
  updateParticipant: async (id, updates) => {
    await participantService.updateParticipant(id, updates);
    get().fetchParticipants(); // Refresh list
  },
  deleteParticipant: async (id) => {
    await participantService.deleteParticipant(id);
    get().fetchParticipants(); // Refresh list
  },
}));