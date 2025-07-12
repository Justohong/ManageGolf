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
      console.log('participantStore: addParticipant 호출됨', participant);
      
      // 필수 필드 검증
      if (!participant.name) {
        throw new Error('이름은 필수 입력 항목입니다.');
      }
      
      if (!participant.contact) {
        throw new Error('연락처는 필수 입력 항목입니다.');
      }
      
      // 기본값 설정
      const participantWithDefaults = {
        ...participant,
        gender: participant.gender || '남',
        status: participant.status || '활동중',
        joinDate: participant.joinDate || new Date().toISOString().split('T')[0],
        nextPaymentDate: participant.nextPaymentDate || new Date().toISOString().split('T')[0],
      };
      
      const id = await db.participants.add(participantWithDefaults);
      console.log('participantStore: 참가자 추가 성공', id);
      await get().fetchParticipants();
      return id;
    } catch (error) {
      console.error('participantStore: 참가자 추가 오류', error);
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