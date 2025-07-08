import Dexie, { type Table } from 'dexie';

export interface Participant {
  id?: number;
  name: string;
  gender: string;
  contact: string;
  status: '활동중' | '휴회중' | '만료';
  joinDate: string; // ISO 8601 format
  nextPaymentDate: string; // ISO 8601 format
  memo?: string;
}

export interface Payment {
  id?: number;
  participantId: number;
  paymentDate: string; // ISO 8601 format
  amount: number;
  paymentType: 'monthly_fee' | 'lesson_fee' | 'etc';
  paymentMethod: 'card' | 'cash' | 'transfer';
  settlementDate?: string; // ISO 8601 format
}

export class MySubClassedDexie extends Dexie {
  participants!: Table<Participant>;
  payments!: Table<Payment>;

  constructor() {
    super('MembershipDashboardDB');
    this.version(1).stores({
      participants: '++id, name, status, nextPaymentDate',
      payments: '++id, participantId, paymentDate',
    });
  }
}

export const db = new MySubClassedDexie();

// Seed data for demo purposes
export const initializeDemoData = async () => {
  // Check if we already have data
  const participantCount = await db.participants.count();
  
  if (participantCount === 0) {
    // Add sample participants
    const participants: Participant[] = [
      {
        name: '김철수',
        gender: '남',
        contact: '010-1234-5678',
        status: '활동중',
        joinDate: '2023-01-15',
        nextPaymentDate: '2023-06-15',
        memo: '매달 15일 결제'
      },
      {
        name: '이영희',
        gender: '여',
        contact: '010-2345-6789',
        status: '활동중',
        joinDate: '2023-02-20',
        nextPaymentDate: '2023-06-20',
        memo: '레슨 추가 신청 예정'
      },
      {
        name: '박민준',
        gender: '남',
        contact: '010-3456-7890',
        status: '휴회중',
        joinDate: '2023-03-05',
        nextPaymentDate: '2023-06-05',
        memo: '6월부터 휴회 예정'
      },
      {
        name: '정수아',
        gender: '여',
        contact: '010-4567-8901',
        status: '만료',
        joinDate: '2023-01-10',
        nextPaymentDate: '2023-05-10',
        memo: '미납 2회'
      },
      {
        name: '최준호',
        gender: '남',
        contact: '010-5678-9012',
        status: '활동중',
        joinDate: '2023-04-25',
        nextPaymentDate: '2023-06-25',
        memo: ''
      }
    ];

    // Add participants and collect their IDs
    const participantIds: number[] = [];
    for (const participant of participants) {
      const id = await db.participants.add(participant);
      participantIds.push(id);
    }

    // Add sample payments using the participant IDs
    const payments: Payment[] = [
      {
        participantId: participantIds[0],
        paymentDate: '2023-05-15',
        amount: 100000,
        paymentType: 'monthly_fee',
        paymentMethod: 'card',
        settlementDate: '2023-05-17'
      },
      {
        participantId: participantIds[1],
        paymentDate: '2023-05-20',
        amount: 150000,
        paymentType: 'monthly_fee',
        paymentMethod: 'cash',
        settlementDate: '2023-05-20'
      },
      {
        participantId: participantIds[1],
        paymentDate: '2023-05-20',
        amount: 50000,
        paymentType: 'lesson_fee',
        paymentMethod: 'cash',
        settlementDate: '2023-05-20'
      },
      {
        participantId: participantIds[2],
        paymentDate: '2023-05-05',
        amount: 100000,
        paymentType: 'monthly_fee',
        paymentMethod: 'transfer',
        settlementDate: '2023-05-05'
      },
      {
        participantId: participantIds[4],
        paymentDate: '2023-05-25',
        amount: 100000,
        paymentType: 'monthly_fee',
        paymentMethod: 'card',
        settlementDate: '2023-05-27'
      },
      {
        participantId: participantIds[4],
        paymentDate: '2023-05-25',
        amount: 30000,
        paymentType: 'etc',
        paymentMethod: 'cash',
        settlementDate: '2023-05-25'
      }
    ];

    // Add all payments
    await db.payments.bulkAdd(payments);
    
    console.log('Demo data initialized successfully');
    return true;
  }
  
  return false;
};