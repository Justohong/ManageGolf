// For testing purposes
let MOCK_PARTICIPANTS = null;

export function __setMockData(participants) {
    console.log("Setting mock DB data for test.");
    MOCK_PARTICIPANTS = participants ? JSON.parse(JSON.stringify(participants)) : null;
}

export function __clearMockData() {
    console.log("Clearing mock DB data.");
    MOCK_PARTICIPANTS = null;
}

const DB_NAME = 'SchedulePWA_DB';
const DB_VERSION = 8; // DB 버전 증가
const PARTICIPANTS_STORE_NAME = 'participants';
const PAYMENTS_STORE_NAME = 'payments'; // 새로운 결제 저장소 추가

let db;

export function openDB() {
    return new Promise((resolve, reject) => {
        if (db) {
            resolve(db);
            return;
        }
        const request = indexedDB.open(DB_NAME, DB_VERSION);
        request.onerror = (event) => {
            console.error('Database error:', event.target.error);
            reject('Database error: ' + event.target.error);
        };
        request.onsuccess = (event) => {
            db = event.target.result;
            resolve(db);
        };
        request.onupgradeneeded = (event) => {
            const tempDb = event.target.result;
            
            // 기존 participants 저장소 보존 및 수정
            if (!tempDb.objectStoreNames.contains(PARTICIPANTS_STORE_NAME)) {
                const store = tempDb.createObjectStore(PARTICIPANTS_STORE_NAME, { keyPath: 'id', autoIncrement: true });
                store.createIndex('name', 'name', { unique: false });
                store.createIndex('type', 'type', { unique: false });
            } else {
                // 기존 저장소가 있으면 인덱스 추가 (status, nextPaymentDate 검색용)
                const transaction = event.target.transaction;
                const store = transaction.objectStore(PARTICIPANTS_STORE_NAME);
                
                // 필요한 인덱스가 없으면 추가
                if (!store.indexNames.contains('status')) {
                    store.createIndex('status', 'status', { unique: false });
                }
                if (!store.indexNames.contains('nextPaymentDate')) {
                    store.createIndex('nextPaymentDate', 'nextPaymentDate', { unique: false });
                }
            }
            
            // payments 저장소 생성
            if (!tempDb.objectStoreNames.contains(PAYMENTS_STORE_NAME)) {
                const store = tempDb.createObjectStore(PAYMENTS_STORE_NAME, { keyPath: 'paymentId', autoIncrement: true });
                store.createIndex('participantId', 'participantId', { unique: false });
                store.createIndex('paymentDate', 'paymentDate', { unique: false });
                store.createIndex('paymentType', 'paymentType', { unique: false });
                store.createIndex('paymentMethod', 'paymentMethod', { unique: false });
                store.createIndex('settlementDate', 'settlementDate', { unique: false });
                store.createIndex('yearMonth', ['year', 'month'], { unique: false });
            }
            
            // 불필요한 저장소 삭제
            const storeNamesToDelete = [
                'schedules', 
                'scheduleConfirmations', 
                'attendanceLog', 
                'scheduleState', 
                'monthlyAssignmentCounts'
            ];
            
            storeNamesToDelete.forEach(storeName => {
                if (tempDb.objectStoreNames.contains(storeName)) {
                    tempDb.deleteObjectStore(storeName);
                    console.log(`[db.js] Deleted obsolete store: ${storeName}`);
                }
            });
        };
    });
}

// participants 저장소 관련 함수 (기존)
export async function addParticipant(participant) {
    // status 필드가 없으면 기본값으로 'active' 추가
    if (!participant.status) {
        participant.status = 'active';
    }
    
    const db = await openDB();
    return new Promise((resolve, reject) => {
        const transaction = db.transaction([PARTICIPANTS_STORE_NAME], 'readwrite');
        const store = transaction.objectStore(PARTICIPANTS_STORE_NAME);
        const request = store.add(participant);
        request.onsuccess = () => resolve(request.result);
        request.onerror = (event) => reject(event.target.error);
    });
}

export async function getAllParticipants() {
    if (MOCK_PARTICIPANTS) {
        console.log("DB MOCK: getAllParticipants called");
        return Promise.resolve(JSON.parse(JSON.stringify(MOCK_PARTICIPANTS))); // Deep copy
    }
    const db = await openDB();
    return new Promise((resolve, reject) => {
        const transaction = db.transaction([PARTICIPANTS_STORE_NAME], 'readonly');
        const store = transaction.objectStore(PARTICIPANTS_STORE_NAME);
        const request = store.getAll();
        request.onsuccess = () => resolve(request.result || []);
        request.onerror = (event) => reject(event.target.error);
    });
}

export async function getParticipant(id) {
    const db = await openDB();
    return new Promise((resolve, reject) => {
        const transaction = db.transaction([PARTICIPANTS_STORE_NAME], 'readonly');
        const store = transaction.objectStore(PARTICIPANTS_STORE_NAME);
        const request = store.get(id);
        request.onsuccess = () => resolve(request.result);
        request.onerror = (event) => reject(event.target.error);
    });
}

// getParticipantById 함수 추가 - getParticipant와 동일한 기능 수행
export async function getParticipantById(id) {
    return getParticipant(id);
}

export async function updateParticipant(participant) {
    const db = await openDB();
    return new Promise((resolve, reject) => {
        const transaction = db.transaction([PARTICIPANTS_STORE_NAME], 'readwrite');
        const store = transaction.objectStore(PARTICIPANTS_STORE_NAME);
        const request = store.put(participant);
        request.onsuccess = () => resolve(request.result);
        request.onerror = (event) => reject(event.target.error);
    });
}

export async function deleteParticipant(id) {
    const db = await openDB();
    return new Promise((resolve, reject) => {
        const transaction = db.transaction([PARTICIPANTS_STORE_NAME], 'readwrite');
        const store = transaction.objectStore(PARTICIPANTS_STORE_NAME);
        const request = store.delete(id);
        request.onsuccess = () => resolve();
        request.onerror = (event) => reject(event.target.error);
    });
}

export async function deleteMultipleParticipants(ids) {
    const db = await openDB();
    return new Promise((resolve, reject) => {
        const transaction = db.transaction([PARTICIPANTS_STORE_NAME], 'readwrite');
        const store = transaction.objectStore(PARTICIPANTS_STORE_NAME);
        let deleteCount = 0;
        if (ids.length === 0) {
            resolve();
            return;
        }
        ids.forEach(id => {
            const request = store.delete(id);
            request.onsuccess = () => {
                deleteCount++;
                if (deleteCount === ids.length) resolve();
            };
            request.onerror = (event) => reject(event.target.error);
        });
        transaction.oncomplete = () => resolve();
        transaction.onerror = (event) => reject(event.target.error);
    });
}

export async function deleteAllParticipants() {
    const db = await openDB();
    return new Promise((resolve, reject) => {
        const transaction = db.transaction([PARTICIPANTS_STORE_NAME], 'readwrite');
        const store = transaction.objectStore(PARTICIPANTS_STORE_NAME);
        const request = store.clear();
        request.onsuccess = () => {
            console.log('All participants deleted successfully.');
            resolve();
        };
        request.onerror = (event) => {
            console.error('Error deleting all participants:', event.target.error);
            reject(event.target.error);
        };
    });
}

// 회원 상태로 필터링하는 새로운 함수
export async function getParticipantsByStatus(status) {
    const db = await openDB();
    return new Promise((resolve, reject) => {
        const transaction = db.transaction([PARTICIPANTS_STORE_NAME], 'readonly');
        const store = transaction.objectStore(PARTICIPANTS_STORE_NAME);
        const index = store.index('status');
        const request = index.getAll(status);
        request.onsuccess = () => resolve(request.result || []);
        request.onerror = (event) => reject(event.target.error);
    });
}

// 지난 결제일 회원 찾기 함수
export async function getParticipantsWithOverduePayment(currentDate) {
    const db = await openDB();
    return new Promise((resolve, reject) => {
        const transaction = db.transaction([PARTICIPANTS_STORE_NAME], 'readonly');
        const store = transaction.objectStore(PARTICIPANTS_STORE_NAME);
        const request = store.getAll();
        
        request.onsuccess = () => {
            const participants = request.result || [];
            const overdueParticipants = participants.filter(participant => {
                if (!participant.nextPaymentDate) return false;
                return new Date(participant.nextPaymentDate) < new Date(currentDate);
            });
            resolve(overdueParticipants);
        };
        request.onerror = (event) => reject(event.target.error);
    });
}

// payments 저장소 관련 함수 (신규)
export async function addPayment(payment) {
    // 년, 월 정보 추출
    const paymentDate = new Date(payment.paymentDate);
    payment.year = paymentDate.getFullYear();
    payment.month = paymentDate.getMonth() + 1; // JavaScript는 0-기반 월
    
    const db = await openDB();
    return new Promise((resolve, reject) => {
        const transaction = db.transaction([PAYMENTS_STORE_NAME], 'readwrite');
        const store = transaction.objectStore(PAYMENTS_STORE_NAME);
        const request = store.add(payment);
        request.onsuccess = () => resolve(request.result);
        request.onerror = (event) => reject(event.target.error);
    });
}

export async function getAllPayments() {
    const db = await openDB();
    return new Promise((resolve, reject) => {
        const transaction = db.transaction([PAYMENTS_STORE_NAME], 'readonly');
        const store = transaction.objectStore(PAYMENTS_STORE_NAME);
        const request = store.getAll();
        request.onsuccess = () => resolve(request.result || []);
        request.onerror = (event) => reject(event.target.error);
    });
}

export async function getPaymentsForParticipant(participantId) {
    const db = await openDB();
    return new Promise((resolve, reject) => {
        const transaction = db.transaction([PAYMENTS_STORE_NAME], 'readonly');
        const store = transaction.objectStore(PAYMENTS_STORE_NAME);
        const index = store.index('participantId');
        const request = index.getAll(participantId);
        request.onsuccess = () => resolve(request.result || []);
        request.onerror = (event) => reject(event.target.error);
    });
}

export async function getPaymentsByDate(date) {
    const db = await openDB();
    return new Promise((resolve, reject) => {
        const transaction = db.transaction([PAYMENTS_STORE_NAME], 'readonly');
        const store = transaction.objectStore(PAYMENTS_STORE_NAME);
        const index = store.index('paymentDate');
        const request = index.getAll(date);
        request.onsuccess = () => resolve(request.result || []);
        request.onerror = (event) => reject(event.target.error);
    });
}

export async function getPaymentsByMonth(year, month) {
    const db = await openDB();
    return new Promise((resolve, reject) => {
        const transaction = db.transaction([PAYMENTS_STORE_NAME], 'readonly');
        const store = transaction.objectStore(PAYMENTS_STORE_NAME);
        const index = store.index('yearMonth');
        const request = index.getAll([year, month]);
        request.onsuccess = () => resolve(request.result || []);
        request.onerror = (event) => reject(event.target.error);
    });
}

export async function updatePayment(payment) {
    const db = await openDB();
    return new Promise((resolve, reject) => {
        const transaction = db.transaction([PAYMENTS_STORE_NAME], 'readwrite');
        const store = transaction.objectStore(PAYMENTS_STORE_NAME);
        const request = store.put(payment);
        request.onsuccess = () => resolve(request.result);
        request.onerror = (event) => reject(event.target.error);
    });
}

export async function deletePayment(paymentId) {
    const db = await openDB();
    return new Promise((resolve, reject) => {
        const transaction = db.transaction([PAYMENTS_STORE_NAME], 'readwrite');
        const store = transaction.objectStore(PAYMENTS_STORE_NAME);
        const request = store.delete(paymentId);
        request.onsuccess = () => resolve();
        request.onerror = (event) => reject(event.target.error);
    });
}

export async function bulkPutStoreData(storeName, itemsArray) {
    const db = await openDB();
    return new Promise((resolve, reject) => {
        const transaction = db.transaction([storeName], 'readwrite');
        const store = transaction.objectStore(storeName);
        let successCount = 0;
        let errorCount = 0;
        
        itemsArray.forEach(item => {
            const request = store.put(item);
            request.onsuccess = () => {
                successCount++;
                if (successCount + errorCount === itemsArray.length) {
                    resolve({
                        success: true,
                        successCount,
                        errorCount
                    });
                }
            };
            request.onerror = (event) => {
                console.error('Error in bulkPut:', event.target.error);
                errorCount++;
                if (successCount + errorCount === itemsArray.length) {
                    resolve({
                        success: errorCount === 0,
                        successCount,
                        errorCount
                    });
                }
            };
        });
        
        transaction.oncomplete = () => {
            console.log(`bulkPutStoreData completed for ${storeName}. Success: ${successCount}, Errors: ${errorCount}`);
        };
        
        transaction.onerror = (event) => {
            console.error('Transaction error in bulkPut:', event.target.error);
            reject(event.target.error);
        };
    });
}
