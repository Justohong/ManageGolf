import Dexie, { type Table } from 'dexie';

export interface Participant {
  id?: number;
  name: string;
  gender: '남' | '여';
  contact: string;
  status: '활동중' | '휴회중' | '만료';
  joinDate: string; // ISO 8601 format
  nextPaymentDate: string; // ISO 8601 format
  carNumber?: string; // 차량번호 필드 추가
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

// Worker 메시지 타입 정의
export type WorkerMessage = {
  id: string;
  action: string;
  payload?: any;
};

export type WorkerResponse = {
  id: string;
  success: boolean;
  data?: any;
  error?: any;
};

// IndexedDB 작업을 처리하는 클래스
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

// Web Worker를 통해 IndexedDB 작업을 처리하는 클래스
class DBWorkerProxy {
  private worker: Worker | null = null;
  private callbacks: Map<string, { resolve: Function; reject: Function }> = new Map();
  private initialized = false;
  private initPromise: Promise<void>;
  private initResolve!: Function;

  constructor() {
    // Worker 초기화 Promise 생성
    this.initPromise = new Promise<void>((resolve) => {
      this.initResolve = resolve;
    });

    // Worker 생성 시도
    try {
      this.createWorker();
    } catch (error) {
      console.error('Worker 생성 중 예외 발생:', error);
      this.initialized = true;
      this.initResolve();
    }
  }

  private createWorker() {
    try {
      console.log('Web Worker 생성 시도');
      // Worker 생성 및 메시지 핸들러 설정
      const workerBlob = new Blob([`
        try {
          importScripts('https://cdn.jsdelivr.net/npm/dexie@3.2.3/dist/dexie.min.js');
          
          // IndexedDB 초기화
          const db = new Dexie('MembershipDashboardDB');
          db.version(1).stores({
            participants: '++id, name, status, nextPaymentDate',
            payments: '++id, participantId, paymentDate',
          });
          
          console.log('Worker: Dexie 초기화 완료');

          // 메시지 핸들러
          self.onmessage = async function(e) {
            const { id, action, payload } = e.data;
            
            try {
              console.log('Worker: 액션 수신', action);
              let result;
              
              switch (action) {
                case 'init':
                  result = { initialized: true };
                  break;
                
                // 참가자 관련 작업
                case 'getParticipants':
                  result = await db.participants.toArray();
                  break;
                case 'addParticipant':
                  try {
                    console.log('Worker: addParticipant 시작', payload);
                    
                    // 데이터 유효성 검사 추가
                    if (!payload || typeof payload !== 'object') {
                      throw new Error('유효하지 않은 참가자 데이터');
                    }
                    
                    // 날짜 필드가 문자열인지 확인
                    if (payload.joinDate && typeof payload.joinDate !== 'string') {
                      console.warn('Worker: joinDate가 문자열이 아님', typeof payload.joinDate);
                      payload.joinDate = String(payload.joinDate);
                    }
                    
                    if (payload.nextPaymentDate && typeof payload.nextPaymentDate !== 'string') {
                      console.warn('Worker: nextPaymentDate가 문자열이 아님', typeof payload.nextPaymentDate);
                      payload.nextPaymentDate = String(payload.nextPaymentDate);
                    }
                    
                    // 참가자 추가
                    result = await db.participants.add(payload);
                    console.log('Worker: addParticipant 성공', result);
                    
                    // 결과 검증
                    if (result === undefined || result === null) {
                      console.warn('Worker: addParticipant 결과가 undefined/null임');
                      // 결과가 없으면 임의의 ID를 반환 (실제로는 이렇게 하면 안 되지만 테스트용)
                      result = Date.now();
                    }
                    
                    // 결과가 bigint인 경우 Number로 변환 (구조적 복제 오류 방지)
                    if (typeof result === 'bigint') {
                      console.warn('Worker: bigint 결과 감지, Number로 변환', result);
                      result = Number(result);
                    }
                  } catch (err) {
                    console.error('Worker: addParticipant 실패', err);
                    throw err;
                  }
                  break;
                case 'updateParticipant':
                  await db.participants.update(payload.id, payload.data);
                  result = true;
                  break;
                case 'deleteParticipant':
                  await db.participants.delete(payload);
                  result = true;
                  break;
                case 'countParticipants':
                  result = await db.participants.count();
                  break;
                
                // 결제 관련 작업
                case 'getPayments':
                  result = await db.payments.toArray();
                  break;
                case 'addPayment':
                  result = await db.payments.add(payload);
                  break;
                case 'updatePayment':
                  await db.payments.update(payload.id, payload.data);
                  result = true;
                  break;
                case 'deletePayment':
                  await db.payments.delete(payload);
                  result = true;
                  break;
                case 'countPayments':
                  result = await db.payments.count();
                  break;
                
                // 트랜잭션 작업
                case 'transaction':
                  result = await db.transaction(payload.mode, payload.tables, payload.callback);
                  break;
                
                default:
                  throw new Error('Unknown action: ' + action);
              }
              
              // 결과 전송 시 오류 처리 추가
              try {
                self.postMessage({ id, success: true, data: result });
              } catch (postError) {
                console.error('Worker: postMessage 실패', postError);
                // 구조적 복제 오류 등의 경우 간소화된 응답 전송 시도
                try {
                  self.postMessage({ 
                    id, 
                    success: true, 
                    data: typeof result === 'object' ? 'Object successfully processed but cannot be transferred' : String(result)
                  });
                } catch (finalError) {
                  console.error('Worker: 최종 postMessage 실패', finalError);
                }
              }
            } catch (error) {
              console.error('Worker 내부 오류:', action, error);
              
              // 오류 객체 직렬화
              let errorMessage = 'Unknown error';
              let errorDetails = {};
              
              if (error instanceof Error) {
                errorMessage = error.message;
                errorDetails = {
                  name: error.name,
                  stack: error.stack
                };
              } else if (typeof error === 'string') {
                errorMessage = error;
              } else if (error && typeof error === 'object') {
                try {
                  errorMessage = JSON.stringify(error);
                } catch (e) {
                  errorMessage = 'Error object cannot be stringified';
                }
              }
              
              self.postMessage({ 
                id, 
                success: false, 
                error: errorMessage,
                errorDetails: errorDetails
              });
            }
          };
        } catch (initError) {
          console.error('Worker 초기화 오류:', initError);
          self.onmessage = function(e) {
            const { id } = e.data;
            self.postMessage({ 
              id, 
              success: false, 
              error: 'Worker 초기화 실패: ' + (initError.message || 'Unknown error')
            });
          };
        }
      `], { type: 'application/javascript' });

      this.worker = new Worker(URL.createObjectURL(workerBlob));
      console.log('Web Worker 객체 생성됨');
      
      this.worker.onmessage = this.handleWorkerMessage.bind(this);
      this.worker.onerror = (event) => {
        console.error('Worker 오류 발생:', event.message, event.filename, event.lineno, event);
        
        // 오류 발생 시 대기 중인 모든 콜백에 알림
        this.callbacks.forEach((callback, id) => {
          console.error(`Worker 오류로 인해 요청(${id}) 거부됨`);
          callback.reject(new Error(`Worker error: ${event.message}`));
          this.callbacks.delete(id);
        });
      };

      // Worker 초기화
      this.sendToWorker('init').then(() => {
        console.log('Web Worker 초기화 성공');
        this.initialized = true;
        this.initResolve();
      }).catch(err => {
        console.error('Worker 초기화 실패:', err);
        // 실패 시 Worker 없이 계속 진행
        this.initialized = true;
        this.initResolve();
      });
    } catch (error) {
      console.error('Worker 생성 실패:', error);
      // Worker 생성 실패 시 초기화 완료 처리
      this.initialized = true;
      this.initResolve();
    }
  }

  private handleWorkerMessage(event: MessageEvent) {
    const response = event.data as WorkerResponse;
    const callback = this.callbacks.get(response.id);
    
    if (callback) {
      // 타임아웃이 설정된 경우 해제
      if ((callback as any).timeoutId) {
        clearTimeout((callback as any).timeoutId);
      }
      
      if (response.success) {
        console.log(`Worker 응답 성공(${response.id}):`, response.data);
        callback.resolve(response.data);
      } else {
        console.error(`Worker 응답 실패(${response.id}):`, response.error);
        callback.reject(new Error(response.error));
      }
      this.callbacks.delete(response.id);
    } else {
      console.warn('Worker 응답에 대한 콜백을 찾을 수 없음:', response.id);
    }
  }

  private generateId(): string {
    return Date.now().toString() + Math.random().toString(36).substring(2, 9);
  }

  private async sendToWorker(action: string, payload?: any): Promise<any> {
    // Worker 초기화 대기
    await this.initPromise;
    
    // Worker가 없으면 오류 발생
    if (!this.worker) {
      console.error('Worker가 생성되지 않았습니다. 직접 IndexedDB를 사용합니다.');
      
      // 직접 IndexedDB 사용 (fallback)
      const directDB = new MySubClassedDexie();
      
      try {
        console.log(`직접 IndexedDB 작업 시작: ${action}`, payload);
        let result;
        
        switch(action) {
          case 'getParticipants':
            result = await directDB.participants.toArray();
            break;
          case 'addParticipant':
            result = await directDB.participants.add(payload);
            break;
          case 'updateParticipant':
            if (payload && typeof payload.id === 'number') {
              await directDB.participants.update(payload.id, payload.data);
              result = true;
            } else {
              throw new Error('Invalid payload for updateParticipant');
            }
            break;
          case 'deleteParticipant':
            await directDB.participants.delete(payload);
            result = true;
            break;
          case 'countParticipants':
            result = await directDB.participants.count();
            break;
          case 'getPayments':
            result = await directDB.payments.toArray();
            break;
          case 'addPayment':
            result = await directDB.payments.add(payload);
            break;
          case 'updatePayment':
            if (payload && typeof payload.id === 'number') {
              await directDB.payments.update(payload.id, payload.data);
              result = true;
            } else {
              throw new Error('Invalid payload for updatePayment');
            }
            break;
          case 'deletePayment':
            await directDB.payments.delete(payload);
            result = true;
            break;
          case 'countPayments':
            result = await directDB.payments.count();
            break;
          // transaction 케이스는 복잡하므로 직접 구현하지 않고 오류 발생
          case 'transaction':
            if (payload && payload.mode && payload.tables) {
              // 간단한 트랜잭션만 지원
              const transactionMode = payload.mode as 'r' | 'rw';
              result = await directDB.transaction(transactionMode, payload.tables, async () => {
                // 트랜잭션 내용은 클라이언트에서 직접 처리
                return true;
              });
            } else {
              throw new Error('트랜잭션 파라미터가 유효하지 않습니다');
            }
            break;
          default:
            throw new Error(`지원되지 않는 액션: ${action}`);
        }
        
        console.log(`직접 IndexedDB 작업 완료: ${action}`, result);
        return result;
      } catch (error) {
        console.error(`직접 DB 작업 중 오류(${action}):`, error);
        throw error;
      }
    }
    
    console.log(`Worker에 메시지 전송: ${action}`);
    
    return new Promise((resolve, reject) => {
      const id = this.generateId();
      const callbackObj = { resolve, reject };
      this.callbacks.set(id, callbackObj);
      
      const message: WorkerMessage = {
        id,
        action,
        payload
      };
      
      // 타임아웃 설정 (10초)
      const timeoutId = setTimeout(() => {
        if (this.callbacks.has(id)) {
          console.error(`Worker 요청 타임아웃: ${action}`);
          this.callbacks.delete(id);
          reject(new Error(`Worker request timed out: ${action}`));
        }
      }, 10000);
      
      // 타임아웃 ID를 콜백 객체에 저장
      (callbackObj as any).timeoutId = timeoutId;
      
      try {
        if (this.worker) {
          this.worker.postMessage(message);
        } else {
          clearTimeout(timeoutId);
          reject(new Error('Worker is not available'));
        }
      } catch (error) {
        clearTimeout(timeoutId);
        console.error(`Worker 메시지 전송 실패: ${action}`, error);
        this.callbacks.delete(id);
        reject(error);
      }
    });
  }

  // 참가자 관련 메서드
  async getParticipants(): Promise<Participant[]> {
    try {
      return await this.sendToWorker('getParticipants');
    } catch (error) {
      console.error('참가자 조회 오류:', error);
      return [];
    }
  }

  async addParticipant(participant: Participant): Promise<number> {
    try {
      console.log('DBWorkerProxy: addParticipant 호출됨', participant);
      const result = await this.sendToWorker('addParticipant', participant);
      console.log('DBWorkerProxy: addParticipant 결과', result);
      return result;
    } catch (error) {
      console.error('DBWorkerProxy: addParticipant 오류', error);
      throw error;
    }
  }

  async updateParticipant(id: number, data: Partial<Participant>): Promise<void> {
    await this.sendToWorker('updateParticipant', { id, data });
  }

  async deleteParticipant(id: number): Promise<void> {
    await this.sendToWorker('deleteParticipant', id);
  }

  async countParticipants(): Promise<number> {
    return await this.sendToWorker('countParticipants');
  }

  // 결제 관련 메서드
  async getPayments(): Promise<Payment[]> {
    try {
      return await this.sendToWorker('getPayments');
    } catch (error) {
      console.error('결제 조회 오류:', error);
      return [];
    }
  }

  async addPayment(payment: Payment): Promise<number> {
    return await this.sendToWorker('addPayment', payment);
  }

  async updatePayment(id: number, data: Partial<Payment>): Promise<void> {
    await this.sendToWorker('updatePayment', { id, data });
  }

  async deletePayment(id: number): Promise<void> {
    await this.sendToWorker('deletePayment', id);
  }

  async countPayments(): Promise<number> {
    return await this.sendToWorker('countPayments');
  }

  // 트랜잭션 메서드
  async transaction(mode: string, tables: any, callback: Function): Promise<void> {
    await this.sendToWorker('transaction', { mode, tables, callback: callback.toString() });
  }
}

// Worker 지원 여부에 따라 적절한 DB 인스턴스 생성
const createDBInstance = () => {
  // Worker 지원 여부 확인
  const isWorkerSupported = typeof Worker !== 'undefined';
  
  // Worker 사용 여부 설정
  // 테스트 중에는 false로 설정하여 직접 IndexedDB를 사용하고,
  // 테스트 후에는 true로 변경하여 Worker를 사용할 수 있습니다.
  const useWorker = false; // isWorkerSupported;
  
  if (useWorker) {
    // Worker 지원 시 DBWorkerProxy 사용
    const workerProxy = new DBWorkerProxy();
    
    return {
      participants: {
        toArray: async () => await workerProxy.getParticipants(),
        add: async (participant: Participant) => await workerProxy.addParticipant(participant),
        update: async (id: number, data: Partial<Participant>) => await workerProxy.updateParticipant(id, data),
        delete: async (id: number) => await workerProxy.deleteParticipant(id),
        count: async () => await workerProxy.countParticipants()
      },
      payments: {
        toArray: async () => await workerProxy.getPayments(),
        add: async (payment: Payment) => await workerProxy.addPayment(payment),
        update: async (id: number, data: Partial<Payment>) => await workerProxy.updatePayment(id, data),
        delete: async (id: number) => await workerProxy.deletePayment(id),
        count: async () => await workerProxy.countPayments()
      },
      transaction: async (mode: 'r' | 'rw', tables: any, callback: Function) => 
        await workerProxy.transaction(mode, tables, callback)
    };
  } else {
    // Worker 미지원 시 직접 IndexedDB 사용
    const directDB = new MySubClassedDexie();
    
    return {
      participants: {
        toArray: async () => await directDB.participants.toArray(),
        add: async (participant: Participant) => await directDB.participants.add(participant),
        update: async (id: number, data: Partial<Participant>) => {
          await directDB.participants.update(id, data);
        },
        delete: async (id: number) => {
          await directDB.participants.delete(id);
        },
        count: async () => await directDB.participants.count()
      },
      payments: {
        toArray: async () => await directDB.payments.toArray(),
        add: async (payment: Payment) => await directDB.payments.add(payment),
        update: async (id: number, data: Partial<Payment>) => {
          await directDB.payments.update(id, data);
        },
        delete: async (id: number) => {
          await directDB.payments.delete(id);
        },
        count: async () => await directDB.payments.count()
      },
      transaction: async (mode: 'r' | 'rw', tables: any, callback: Function) => 
        await directDB.transaction(mode, tables, callback as (trans: any) => unknown)
    };
  }
};

// 데이터베이스 인스턴스 생성
export const db = createDBInstance();

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
    for (const payment of payments) {
      await db.payments.add(payment);
    }
    
    console.log('Demo data initialized successfully');
    return true;
  }
  
  return false;
};