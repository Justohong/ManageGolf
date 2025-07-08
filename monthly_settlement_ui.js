import { getMonthlySettlementSummary } from './payment_logic.js';

// 상태 변수
let selectedYear = new Date().getFullYear();
let selectedMonth = new Date().getMonth() + 1;
let settlementData = null;

// 초기화 함수
export async function initMonthlySettlementView(viewId) {
    const view = document.getElementById(viewId);
    if (!view) return;
    
    try {
        // 헤더 변경
        const header = view.querySelector('h2');
        if (header) {
            header.textContent = '월말정산';
        }
        
        // 연도 및 월 선택 컨트롤 렌더링
        renderDateControls(view);
        
        // 이벤트 리스너 설정
        const yearSelect = view.querySelector('#settlement-year-select');
        const monthSelect = view.querySelector('#settlement-month-select');
        
        if (yearSelect) {
            yearSelect.addEventListener('change', async () => {
                selectedYear = parseInt(yearSelect.value);
                await loadSettlementData();
            });
        }
        
        if (monthSelect) {
            monthSelect.addEventListener('change', async () => {
                selectedMonth = parseInt(monthSelect.value);
                await loadSettlementData();
            });
        }
        
        // 정산 데이터 로드
        await loadSettlementData();
        
    } catch (error) {
        console.error('월말정산 초기화 오류:', error);
        alert(`월말정산 초기화 중 오류가 발생했습니다: ${error.message}`);
    }
}

// 연도 및 월 선택 컨트롤 렌더링
function renderDateControls(view) {
    const dateControlsContainer = view.querySelector('.date-controls');
    if (!dateControlsContainer) return;
    
    // 현재 연도
    const currentYear = new Date().getFullYear();
    
    dateControlsContainer.innerHTML = `
        <div class="flex space-x-4 mb-6">
            <div class="form-group">
                <label for="settlement-year-select" class="block text-sm font-medium text-gray-700 mb-1">연도</label>
                <select id="settlement-year-select" class="form-select rounded-md border-gray-300">
                    ${generateYearOptions(currentYear)}
                </select>
            </div>
            <div class="form-group">
                <label for="settlement-month-select" class="block text-sm font-medium text-gray-700 mb-1">월</label>
                <select id="settlement-month-select" class="form-select rounded-md border-gray-300">
                    ${generateMonthOptions()}
                </select>
            </div>
        </div>
    `;
    
    // 선택된 값 설정
    const yearSelect = dateControlsContainer.querySelector('#settlement-year-select');
    const monthSelect = dateControlsContainer.querySelector('#settlement-month-select');
    
    if (yearSelect) yearSelect.value = selectedYear;
    if (monthSelect) monthSelect.value = selectedMonth;
}

// 연도 옵션 생성
function generateYearOptions(currentYear) {
    let options = '';
    for (let year = currentYear - 2; year <= currentYear + 2; year++) {
        options += `<option value="${year}" ${year === selectedYear ? 'selected' : ''}>${year}년</option>`;
    }
    return options;
}

// 월 옵션 생성
function generateMonthOptions() {
    let options = '';
    for (let month = 1; month <= 12; month++) {
        options += `<option value="${month}" ${month === selectedMonth ? 'selected' : ''}>${month}월</option>`;
    }
    return options;
}

// 정산 데이터 로드
async function loadSettlementData() {
    try {
        // 월별 정산 데이터 계산
        settlementData = await getMonthlySettlementSummary(selectedYear, selectedMonth);
        
        // UI 업데이트
        renderSettlementData();
        
    } catch (error) {
        console.error('정산 데이터 로드 오류:', error);
        alert(`정산 데이터를 불러오는 중 오류가 발생했습니다: ${error.message}`);
    }
}

// 정산 데이터 렌더링
function renderSettlementData() {
    if (!settlementData) return;
    
    const view = document.getElementById('monthlySettlementView');
    if (!view) return;
    
    const contentContainer = view.querySelector('.monthly-settlement-content');
    if (!contentContainer) return;
    
    contentContainer.innerHTML = `
        <div class="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
            <div class="stat-card bg-white p-6 rounded-lg shadow">
                <div class="text-sm text-gray-500 mb-1">예상 총 수입</div>
                <div class="text-2xl font-bold text-blue-600">${settlementData.totalExpectedRevenue.toLocaleString()}원</div>
            </div>
            <div class="stat-card bg-white p-6 rounded-lg shadow">
                <div class="text-sm text-gray-500 mb-1">실제 결제된 총액</div>
                <div class="text-2xl font-bold text-green-600">${settlementData.totalActualPayment.toLocaleString()}원</div>
            </div>
            <div class="stat-card bg-white p-6 rounded-lg shadow">
                <div class="text-sm text-gray-500 mb-1">카드 정산 완료 총액</div>
                <div class="text-2xl font-bold text-purple-600">${settlementData.totalSettledAmount.toLocaleString()}원</div>
            </div>
            <div class="stat-card bg-white p-6 rounded-lg shadow">
                <div class="text-sm text-gray-500 mb-1">미납 총액</div>
                <div class="text-2xl font-bold text-red-600">${settlementData.totalLapsedAmount.toLocaleString()}원</div>
            </div>
        </div>
        
        <div class="bg-white p-6 rounded-lg shadow">
            <h3 class="text-lg font-bold mb-4">미납 회원 목록</h3>
            <div class="overflow-x-auto">
                <table class="min-w-full bg-white rounded-lg overflow-hidden shadow-sm">
                    <thead class="bg-gray-100">
                        <tr>
                            <th class="py-2 px-4 text-left">이름</th>
                            <th class="py-2 px-4 text-left">다음 결제 예정일</th>
                            <th class="py-2 px-4 text-left">상태</th>
                        </tr>
                    </thead>
                    <tbody>`;

    if (settlementData.lapsedParticipants.length === 0) {
        contentContainer.innerHTML += `
                        <tr>
                            <td colspan="3" class="text-center py-4">미납 회원이 없습니다.</td>
                        </tr>`;
    } else {
        contentContainer.innerHTML += settlementData.lapsedParticipants.map(p => `
                        <tr>
                            <td class="py-2 px-4">${p.name}</td>
                            <td class="py-2 px-4">${p.nextPaymentDate || '-'}</td>
                            <td class="py-2 px-4">${getStatusDisplay(p.status)}</td>
                        </tr>`).join('');
    }

    contentContainer.innerHTML += `
                    </tbody>
                </table>
            </div>
        </div>
    `;
    
    lucide.createIcons();
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
