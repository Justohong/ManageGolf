import * as db from './db.js';
import { addPaymentRecord, getPaymentsForParticipant } from './payment_logic.js';

let participantsCache = [];
let selectedParticipantId = null;

export async function initMemberPaymentsView(viewId) {
    const view = document.getElementById(viewId);
    if (!view) return;

    try {
        // 검색 입력 필드 이벤트 리스너
        const searchInput = view.querySelector('#member-search-input');
        if (searchInput) {
            searchInput.addEventListener('input', () => renderParticipantList(searchInput.value));
        }

        // 초기 회원 목록 로드 및 렌더링
        await loadAndRenderParticipantList();

    } catch (error) {
        console.error('회원별 현황 초기화 오류:', error);
        alert(`회원별 현황을 불러오는 중 오류가 발생했습니다: ${error.message}`);
    }
}

async function loadAndRenderParticipantList() {
    participantsCache = await db.getAllParticipants();
    renderParticipantList();
}

function renderParticipantList(searchTerm = '') {
    const view = document.getElementById('memberPaymentsView');
    if (!view) return;

    const participantListContainer = view.querySelector('.participant-list-container');
    if (!participantListContainer) return;

    const filteredParticipants = participantsCache.filter(p => 
        p.name.toLowerCase().includes(searchTerm.toLowerCase())
    );

    let listHtml = `
        <div class="bg-white p-4 rounded-lg shadow h-full flex flex-col">
            <h3 class="text-lg font-bold mb-3">회원 목록</h3>
            <input type="text" id="member-search-input" class="form-input mb-3" placeholder="이름 검색..." value="${searchTerm}">
            <div class="overflow-y-auto flex-grow">
                <ul class="space-y-2">`;

    if (filteredParticipants.length === 0) {
        listHtml += `<li class="text-gray-500">검색 결과가 없습니다.</li>`;
    } else {
        listHtml += filteredParticipants.map(p => `
                    <li class="p-2 rounded-md cursor-pointer hover:bg-blue-50 ${selectedParticipantId === p.id ? 'bg-blue-100' : ''}" data-participant-id="${p.id}">
                        ${p.name} <span class="text-sm text-gray-500">(${getStatusDisplay(p.status)})</span>
                    </li>`).join('');
    }

    listHtml += `
                </ul>
            </div>
        </div>`;

    participantListContainer.innerHTML = listHtml;

    // 이벤트 리스너 재등록
    participantListContainer.querySelectorAll('li[data-participant-id]').forEach(item => {
        item.addEventListener('click', (event) => {
            const participantId = parseInt(event.currentTarget.dataset.participantId);
            selectedParticipantId = participantId;
            renderParticipantList(searchTerm); // 선택 상태 업데이트를 위해 다시 렌더링
            renderMemberPaymentDetails(participantId);
        });
    });

    // 검색 입력 필드 재설정 (이벤트 리스너가 새로 추가되었으므로)
    const newSearchInput = view.querySelector('#member-search-input');
    if (newSearchInput) {
        newSearchInput.value = searchTerm;
        newSearchInput.addEventListener('input', () => renderParticipantList(newSearchInput.value));
    }
}

async function renderMemberPaymentDetails(participantId) {
    const view = document.getElementById('memberPaymentsView');
    if (!view) return;

    const paymentDetailsContainer = view.querySelector('.payment-details-content');
    if (!paymentDetailsContainer) return;

    const participant = participantsCache.find(p => p.id === participantId);
    if (!participant) {
        paymentDetailsContainer.innerHTML = '<p class="text-red-500">회원 정보를 찾을 수 없습니다.</p>';
        return;
    }

    const payments = await getPaymentsForParticipant(participantId);

    let detailsHtml = `
        <div class="bg-white p-4 rounded-lg shadow h-full flex flex-col">
            <h3 class="text-lg font-bold mb-3">${participant.name}님의 결제 현황</h3>
            <div class="mb-4">
                <p><strong>상태:</strong> ${getStatusDisplay(participant.status)}</p>
                <p><strong>다음 결제 예정일:</strong> ${participant.nextPaymentDate || '미정'}</p>
                <p><strong>메모:</strong> ${participant.memo || '없음'}</p>
            </div>
            <div class="flex justify-between items-center mb-3">
                <h4 class="text-md font-bold">결제 내역</h4>
                <button id="add-payment-for-member-btn" class="btn btn-primary btn-sm" data-participant-id="${participant.id}">
                    <i data-lucide="plus" class="w-4 h-4 mr-1"></i>결제 기록
                </button>
            </div>
            <div class="overflow-x-auto flex-grow">
                <table class="min-w-full bg-white rounded-lg overflow-hidden shadow-sm">
                    <thead class="bg-gray-100">
                        <tr>
                            <th class="py-2 px-4 text-left">결제일</th>
                            <th class="py-2 px-4 text-left">금액</th>
                            <th class="py-2 px-4 text-left">유형</th>
                            <th class="py-2 px-4 text-left">수단</th>
                            <th class="py-2 px-4 text-left">정산 여부</th>
                        </tr>
                    </thead>
                    <tbody>`;

    if (payments.length === 0) {
        detailsHtml += `
                        <tr>
                            <td colspan="5" class="text-center py-4">결제 내역이 없습니다.</td>
                        </tr>`;
    } else {
        detailsHtml += payments.map(p => `
                        <tr>
                            <td class="py-2 px-4">${new Date(p.paymentDate).toLocaleDateString()}</td>
                            <td class="py-2 px-4">${p.amount.toLocaleString()}원</td>
                            <td class="py-2 px-4">${getPaymentTypeDisplay(p.paymentType)}</td>
                            <td class="py-2 px-4">${getPaymentMethodDisplay(p.paymentMethod)}</td>
                            <td class="py-2 px-4">${p.settlementDate ? '완료' : '미완료'}</td>
                        </tr>`).join('');
    }

    detailsHtml += `
                    </tbody>
                </table>
            </div>
        </div>`;

    paymentDetailsContainer.innerHTML = detailsHtml;
    lucide.createIcons();

    // 결제 기록 버튼 이벤트 리스너
    const addPaymentBtn = paymentDetailsContainer.querySelector('#add-payment-for-member-btn');
    if (addPaymentBtn) {
        addPaymentBtn.addEventListener('click', (event) => {
            const pId = parseInt(event.currentTarget.dataset.participantId);
            showAddPaymentModal(pId);
        });
    }
}

// 상태 표시 텍스트 변환
function getStatusDisplay(status) {
    const statusMap = {
        'active': '활성',
        'inactive': '비활성',
        'lapsed': '미납'
    };
    return statusMap[status] || status;
}

// 결제 유형 표시 텍스트 변환
function getPaymentTypeDisplay(type) {
    const typeMap = {
        'monthly_fee': '월 회비',
        'lesson_fee': '레슨비',
        'other': '기타'
    };
    return typeMap[type] || type;
}

// 결제 수단 표시 텍스트 변환
function getPaymentMethodDisplay(method) {
    const methodMap = {
        'card': '카드',
        'cash': '현금',
        'transfer': '계좌이체',
        'other': '기타'
    };
    return methodMap[method] || method;
}

// 결제 등록 모달 표시 (회원 선택된 상태로)
async function showAddPaymentModal(participantId) {
    const modal = document.createElement('div');
    modal.className = 'modal fixed inset-0 flex items-center justify-center z-50';
    modal.innerHTML = `
        <div class="modal-backdrop fixed inset-0 bg-black opacity-50"></div>
        <div class="modal-content bg-white w-full max-w-md mx-auto rounded-lg shadow-lg p-6 z-10">
            <div class="flex justify-between items-center mb-4">
                <h3 class="text-lg font-bold">새 결제 등록</h3>
                <button class="close-modal-btn text-gray-400 hover:text-gray-600">
                    <i data-lucide="x" class="w-5 h-5"></i>
                </button>
            </div>
            <form id="add-payment-form" class="space-y-4">
                <div class="form-group">
                    <label for="participant-id" class="block text-sm font-medium text-gray-700 mb-1">회원 ID</label>
                    <input type="text" id="participant-id" class="form-input w-full rounded-md border-gray-300 bg-gray-100" value="${participantId}" readonly>
                </div>
                
                <div class="form-group">
                    <label for="payment-date" class="block text-sm font-medium text-gray-700 mb-1">결제일</label>
                    <input type="date" id="payment-date" class="form-input w-full rounded-md border-gray-300" value="${new Date().toISOString().split('T')[0]}" required>
                </div>
                
                <div class="form-group">
                    <label for="payment-amount" class="block text-sm font-medium text-gray-700 mb-1">결제 금액</label>
                    <input type="number" id="payment-amount" class="form-input w-full rounded-md border-gray-300" placeholder="결제 금액" required>
                </div>
                
                <div class="form-group">
                    <label for="payment-type" class="block text-sm font-medium text-gray-700 mb-1">결제 유형</label>
                    <select id="payment-type" class="form-select w-full rounded-md border-gray-300" required>
                        <option value="monthly_fee">월 회비</option>
                        <option value="lesson_fee">레슨비</option>
                        <option value="other">기타</option>
                    </select>
                </div>
                
                <div class="form-group">
                    <label for="payment-method" class="block text-sm font-medium text-gray-700 mb-1">결제 수단</label>
                    <select id="payment-method" class="form-select w-full rounded-md border-gray-300" required>
                        <option value="cash">현금</option>
                        <option value="card">카드</option>
                        <option value="transfer">계좌이체</option>
                        <option value="other">기타</option>
                    </select>
                </div>
                
                <div class="form-group">
                    <label for="settlement-date" class="block text-sm font-medium text-gray-700 mb-1">정산일 (선택사항)</label>
                    <input type="date" id="settlement-date" class="form-input w-full rounded-md border-gray-300">
                </div>
                
                <div class="flex justify-end space-x-2 pt-4">
                    <button type="button" class="cancel-btn btn btn-outline px-4 py-2">취소</button>
                    <button type="submit" class="btn btn-primary px-4 py-2">등록</button>
                </div>
            </form>
        </div>
    `;
    
    document.body.appendChild(modal);
    lucide.createIcons();
    
    // 모달 닫기 이벤트
    modal.querySelector('.close-modal-btn').addEventListener('click', () => {
        document.body.removeChild(modal);
    });
    
    modal.querySelector('.cancel-btn').addEventListener('click', () => {
        document.body.removeChild(modal);
    });
    
    // 배경 클릭 시 모달 닫기
    modal.querySelector('.modal-backdrop').addEventListener('click', () => {
        document.body.removeChild(modal);
    });
    
    // 폼 제출 처리
    modal.querySelector('#add-payment-form').addEventListener('submit', async (event) => {
        event.preventDefault();
        
        const pId = parseInt(modal.querySelector('#participant-id').value);
        const paymentDate = modal.querySelector('#payment-date').value;
        const amount = parseInt(modal.querySelector('#payment-amount').value);
        const paymentType = modal.querySelector('#payment-type').value;
        const paymentMethod = modal.querySelector('#payment-method').value;
        const settlementDate = modal.querySelector('#settlement-date').value || null;
        
        try {
            await addPaymentRecord({
                participantId: pId,
                paymentDate,
                amount,
                paymentType,
                paymentMethod,
                settlementDate
            });
            document.body.removeChild(modal);
            await loadAndRenderParticipantList(); // 회원 목록 및 상세 정보 새로고침
            if (selectedParticipantId) {
                renderMemberPaymentDetails(selectedParticipantId);
            }
        } catch (error) {
            console.error('결제 등록 오류:', error);
            alert(`결제 등록 중 오류가 발생했습니다: ${error.message}`);
        }
    });
}
