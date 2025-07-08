import { getPaymentsByDate } from './payment_logic.js';
import * as db from './db.js';

// 상태 변수
let selectedYear = new Date().getFullYear();
let selectedMonth = new Date().getMonth() + 1;
let selectedDay = new Date().getDate();

// 초기화 함수
export async function initDailyPaymentsView(viewId) {
    const view = document.getElementById(viewId);
    if (!view) return;
    
    try {
        const yearSelect = view.querySelector('#daily-payment-year-select');
        const monthSelect = view.querySelector('#daily-payment-month-select');
        const daySelect = view.querySelector('#daily-payment-day-select');
        
        if (!yearSelect || !monthSelect || !daySelect) {
            throw new Error('일자별 현황 UI 요소를 찾을 수 없습니다.');
        }
        
        // 연도 선택 옵션 설정
        const currentYear = new Date().getFullYear();
        yearSelect.innerHTML = '';
        for (let year = currentYear - 2; year <= currentYear + 2; year++) {
            const option = document.createElement('option');
            option.value = year;
            option.textContent = `${year}년`;
            option.selected = year === selectedYear;
            yearSelect.appendChild(option);
        }
        
        // 월 선택 옵션 설정
        monthSelect.innerHTML = '';
        for (let month = 1; month <= 12; month++) {
            const option = document.createElement('option');
            option.value = month;
            option.textContent = `${month}월`;
            option.selected = month === selectedMonth;
            monthSelect.appendChild(option);
        }
        
        // 이벤트 리스너 설정
        yearSelect.addEventListener('change', () => {
            selectedYear = parseInt(yearSelect.value);
            populateDaySelect(daySelect, selectedYear, selectedMonth);
            loadAndRenderDailyPayments();
        });
        
        monthSelect.addEventListener('change', () => {
            selectedMonth = parseInt(monthSelect.value);
            populateDaySelect(daySelect, selectedYear, selectedMonth);
            loadAndRenderDailyPayments();
        });
        
        daySelect.addEventListener('change', () => {
            selectedDay = parseInt(daySelect.value);
            loadAndRenderDailyPayments();
        });
        
        // 일 선택 옵션 초기화
        populateDaySelect(daySelect, selectedYear, selectedMonth);
        
        // 결제 내역 로드
        await loadAndRenderDailyPayments();
        
    } catch (error) {
        console.error('일자별 현황 초기화 오류:', error);
        alert(`일자별 현황을 불러오는 중 오류가 발생했습니다: ${error.message}`);
    }
}

// 일자 선택 옵션 설정
function populateDaySelect(daySelect, year, month) {
    const daysInMonth = new Date(year, month, 0).getDate();
    daySelect.innerHTML = '';
    
    for (let day = 1; day <= daysInMonth; day++) {
        const option = document.createElement('option');
        option.value = day;
        option.textContent = `${day}일`;
        option.selected = day === selectedDay;
        daySelect.appendChild(option);
    }

    // 선택된 일자가 해당 월의 일자 범위를 초과하는 경우 조정
    if (selectedDay > daysInMonth) {
        selectedDay = daysInMonth;
    }
}

// 결제 데이터 로드 및 렌더링
async function loadAndRenderDailyPayments() {
    try {
        const dateString = `${selectedYear}-${selectedMonth.toString().padStart(2, '0')}-${selectedDay.toString().padStart(2, '0')}`;
        const { paidParticipants, unpaidParticipants } = await getPaymentsByDate(dateString);
        
        renderDailyPaymentView(paidParticipants, unpaidParticipants);
    } catch (error) {
        console.error('일자별 결제 데이터 로드 오류:', error);
        alert(`일자별 결제 데이터를 불러오는 중 오류가 발생했습니다: ${error.message}`);
    }
}

// 일자별 결제 내역 렌더링
function renderDailyPaymentView(paidParticipants, unpaidParticipants) {
    const view = document.getElementById('dailyPaymentsView');
    if (!view) return;
    
    const contentArea = view.querySelector('.daily-payment-content');
    if (!contentArea) return;
    
    let html = `
        <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div class="bg-white p-4 rounded-lg shadow">
                <h3 class="text-lg font-bold mb-3 text-green-700">결제 완료 회원 (${paidParticipants.length}명)</h3>
                <div class="overflow-x-auto">
                    <table class="min-w-full bg-white rounded-lg overflow-hidden shadow-sm">
                        <thead class="bg-gray-100">
                            <tr>
                                <th class="py-2 px-4 text-left">이름</th>
                                <th class="py-2 px-4 text-left">결제 금액</th>
                                <th class="py-2 px-4 text-left">결제 유형</th>
                            </tr>
                        </thead>
                        <tbody>`;

    if (paidParticipants.length === 0) {
        html += `
                            <tr>
                                <td colspan="3" class="text-center py-4">해당 일자에 결제 완료된 회원이 없습니다.</td>
                            </tr>`;
    } else {
        html += paidParticipants.map(p => `
                            <tr>
                                <td class="py-2 px-4">${p.name}</td>
                                <td class="py-2 px-4">${p.amount ? p.amount.toLocaleString() + '원' : '-'}</td>
                                <td class="py-2 px-4">${p.paymentType ? getPaymentTypeDisplay(p.paymentType) : '-'}</td>
                            </tr>`).join('');
    }

    html += `
                        </tbody>
                    </table>
                </div>
            </div>
            
            <div class="bg-white p-4 rounded-lg shadow">
                <h3 class="text-lg font-bold mb-3 text-red-700">결제 예정/미납 회원 (${unpaidParticipants.length}명)</h3>
                <div class="overflow-x-auto">
                    <table class="min-w-full bg-white rounded-lg overflow-hidden shadow-sm">
                        <thead class="bg-gray-100">
                            <tr>
                                <th class="py-2 px-4 text-left">이름</th>
                                <th class="py-2 px-4 text-left">상태</th>
                                <th class="py-2 px-4 text-left">다음 결제일</th>
                            </tr>
                        </thead>
                        <tbody>`;

    if (unpaidParticipants.length === 0) {
        html += `
                            <tr>
                                <td colspan="3" class="text-center py-4">해당 일자에 결제 예정/미납 회원이 없습니다.</td>
                            </tr>`;
    } else {
        html += unpaidParticipants.map(p => `
                            <tr>
                                <td class="py-2 px-4">${p.name}</td>
                                <td class="py-2 px-4">${getStatusDisplay(p.status)}</td>
                                <td class="py-2 px-4">${p.nextPaymentDate || '-'}</td>
                            </tr>`).join('');
    }

    html += `
                        </tbody>
                    </table>
                </div>
            </div>
        </div>`;
    
    contentArea.innerHTML = html;
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

// 결제 유형 표시 텍스트 변환
function getPaymentTypeDisplay(type) {
    const typeMap = {
        'monthly_fee': '월 회비',
        'lesson_fee': '레슨비',
        'other': '기타'
    };
    return typeMap[type] || type;
}
