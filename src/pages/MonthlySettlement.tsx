import React, { useState, useEffect } from 'react';
import { usePaymentStore } from '../stores/paymentStore';
import { useParticipantStore } from '../stores/participantStore';
import type { Payment } from '../db';
import { Chart as ChartJS, ArcElement, BarElement, CategoryScale, LinearScale, Title, Tooltip, Legend } from 'chart.js';
import { Pie, Bar } from 'react-chartjs-2';
import { FaCalendarAlt, FaChartPie, FaMoneyBillWave, FaCreditCard, FaMoneyBill, FaExchangeAlt } from 'react-icons/fa';

// Register ChartJS components
ChartJS.register(ArcElement, BarElement, CategoryScale, LinearScale, Title, Tooltip, Legend);

const MonthlySettlement: React.FC = () => {
  const { payments, fetchPayments } = usePaymentStore();
  const { participants, fetchParticipants } = useParticipantStore();
  const [selectedYear, setSelectedYear] = useState<number>(new Date().getFullYear());
  const [selectedMonth, setSelectedMonth] = useState<number>(new Date().getMonth() + 1);
  const [filteredPayments, setFilteredPayments] = useState<Payment[]>([]);
  
  // Generate years for dropdown (current year and 5 years back)
  const years = Array.from({ length: 6 }, (_, i) => new Date().getFullYear() - i);
  const months = Array.from({ length: 12 }, (_, i) => i + 1);

  useEffect(() => {
    fetchPayments();
    fetchParticipants();
  }, [fetchPayments, fetchParticipants]);

  useEffect(() => {
    // Filter payments for selected year and month
    const filtered = payments.filter(payment => {
      const paymentDate = new Date(payment.paymentDate);
      return paymentDate.getFullYear() === selectedYear && paymentDate.getMonth() + 1 === selectedMonth;
    });
    setFilteredPayments(filtered);
  }, [payments, selectedYear, selectedMonth]);

  // Calculate summary data
  const totalIncome = filteredPayments.reduce((sum, payment) => sum + payment.amount, 0);
  const cardPayments = filteredPayments.filter(p => p.paymentMethod === 'card');
  const cashPayments = filteredPayments.filter(p => p.paymentMethod === 'cash');
  const transferPayments = filteredPayments.filter(p => p.paymentMethod === 'transfer');
  
  const totalCardAmount = cardPayments.reduce((sum, p) => sum + p.amount, 0);
  const totalCashAmount = cashPayments.reduce((sum, p) => sum + p.amount, 0);
  const totalTransferAmount = transferPayments.reduce((sum, p) => sum + p.amount, 0);

  const monthlyFeePayments = filteredPayments.filter(p => p.paymentType === 'monthly_fee');
  const lessonFeePayments = filteredPayments.filter(p => p.paymentType === 'lesson_fee');
  const etcPayments = filteredPayments.filter(p => p.paymentType === 'etc');
  
  const totalMonthlyFeeAmount = monthlyFeePayments.reduce((sum, p) => sum + p.amount, 0);
  const totalLessonFeeAmount = lessonFeePayments.reduce((sum, p) => sum + p.amount, 0);
  const totalEtcAmount = etcPayments.reduce((sum, p) => sum + p.amount, 0);

  // Chart data
  const paymentMethodChartData = {
    labels: ['카드', '현금', '계좌이체'],
    datasets: [
      {
        data: [totalCardAmount, totalCashAmount, totalTransferAmount],
        backgroundColor: ['rgba(66, 153, 225, 0.7)', 'rgba(246, 173, 85, 0.7)', 'rgba(129, 140, 248, 0.7)'],
        borderColor: ['rgb(66, 153, 225)', 'rgb(246, 173, 85)', 'rgb(129, 140, 248)'],
        borderWidth: 1,
      },
    ],
  };

  const paymentTypeChartData = {
    labels: ['월 회비', '레슨비', '기타'],
    datasets: [
      {
        label: '금액 (원)',
        data: [totalMonthlyFeeAmount, totalLessonFeeAmount, totalEtcAmount],
        backgroundColor: ['rgba(72, 187, 120, 0.7)', 'rgba(237, 137, 54, 0.7)', 'rgba(229, 62, 62, 0.7)'],
        borderColor: ['rgb(72, 187, 120)', 'rgb(237, 137, 54)', 'rgb(229, 62, 62)'],
        borderWidth: 1,
      },
    ],
  };

  // Calculate expected vs actual income
  const activeParticipants = participants.filter(p => p.status === '활동중').length;
  const expectedMonthlyIncome = activeParticipants * 100000; // 가정: 월 회비 10만원
  const incomeRatio = totalIncome > 0 ? Math.round((totalIncome / expectedMonthlyIncome) * 100) : 0;
  
  return (
    <div className="p-6">
      <h1 className="text-3xl font-bold mb-8 text-gray-800">월별 정산</h1>
      
      <div className="bg-white rounded-xl shadow-md p-6 mb-8">
        <div className="flex flex-col md:flex-row md:items-end gap-6">
          <div>
            <label htmlFor="year" className="block text-sm font-medium text-gray-700 mb-2">년도</label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <FaCalendarAlt className="text-gray-400" />
              </div>
              <select
                id="year"
                value={selectedYear}
                onChange={(e) => setSelectedYear(Number(e.target.value))}
                className="pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 w-full"
              >
                {years.map(year => (
                  <option key={year} value={year}>{year}년</option>
                ))}
              </select>
            </div>
          </div>
          <div>
            <label htmlFor="month" className="block text-sm font-medium text-gray-700 mb-2">월</label>
            <select
              id="month"
              value={selectedMonth}
              onChange={(e) => setSelectedMonth(Number(e.target.value))}
              className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 w-full"
            >
              {months.map(month => (
                <option key={month} value={month}>{month}월</option>
              ))}
            </select>
          </div>
          <div className="md:ml-auto">
            <div className="flex items-center">
              <div className="text-sm text-gray-500">
                <span className="font-medium">수입 달성률:</span>
              </div>
              <div className="ml-2 w-48 bg-gray-200 rounded-full h-2.5">
                <div 
                  className="bg-blue-600 h-2.5 rounded-full" 
                  style={{ width: `${Math.min(incomeRatio, 100)}%` }}
                ></div>
              </div>
              <span className="ml-2 text-sm font-medium text-gray-700">{incomeRatio}%</span>
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-6 mb-8">
        <div className="bg-white rounded-xl shadow-md p-6 border-l-4 border-green-500 transition-transform hover:scale-105">
          <div className="flex justify-between items-center">
            <div>
              <p className="text-sm font-medium text-gray-500">총 예상 수입</p>
              <p className="text-2xl font-bold text-gray-800">{expectedMonthlyIncome.toLocaleString()}원</p>
            </div>
            <div className="bg-green-100 p-3 rounded-full">
              <FaChartPie className="text-green-500 text-xl" />
            </div>
          </div>
          <div className="mt-4 text-sm text-gray-600">
            <span className="text-green-500 font-medium">{activeParticipants}명</span> 활동중 회원
          </div>
        </div>
        
        <div className="bg-white rounded-xl shadow-md p-6 border-l-4 border-blue-500 transition-transform hover:scale-105">
          <div className="flex justify-between items-center">
            <div>
              <p className="text-sm font-medium text-gray-500">총 실제 수입</p>
              <p className="text-2xl font-bold text-gray-800">{totalIncome.toLocaleString()}원</p>
            </div>
            <div className="bg-blue-100 p-3 rounded-full">
              <FaMoneyBillWave className="text-blue-500 text-xl" />
            </div>
          </div>
          <div className="mt-4 text-sm text-gray-600">
            <span className="text-blue-500 font-medium">{filteredPayments.length}건</span> 결제 완료
          </div>
        </div>
        
        <div className="bg-white rounded-xl shadow-md p-6 border-l-4 border-indigo-500 transition-transform hover:scale-105">
          <div className="flex justify-between items-center">
            <div>
              <p className="text-sm font-medium text-gray-500">카드 결제 총액</p>
              <p className="text-2xl font-bold text-gray-800">{totalCardAmount.toLocaleString()}원</p>
            </div>
            <div className="bg-indigo-100 p-3 rounded-full">
              <FaCreditCard className="text-indigo-500 text-xl" />
            </div>
          </div>
          <div className="mt-4 text-sm text-gray-600">
            <span className="text-indigo-500 font-medium">{cardPayments.length}건</span> 카드 결제
          </div>
        </div>
        
        <div className="bg-white rounded-xl shadow-md p-6 border-l-4 border-yellow-500 transition-transform hover:scale-105">
          <div className="flex justify-between items-center">
            <div>
              <p className="text-sm font-medium text-gray-500">현금 결제 총액</p>
              <p className="text-2xl font-bold text-gray-800">{totalCashAmount.toLocaleString()}원</p>
            </div>
            <div className="bg-yellow-100 p-3 rounded-full">
              <FaMoneyBill className="text-yellow-500 text-xl" />
            </div>
          </div>
          <div className="mt-4 text-sm text-gray-600">
            <span className="text-yellow-500 font-medium">{cashPayments.length}건</span> 현금 결제
          </div>
        </div>
        
        <div className="bg-white rounded-xl shadow-md p-6 border-l-4 border-purple-500 transition-transform hover:scale-105">
          <div className="flex justify-between items-center">
            <div>
              <p className="text-sm font-medium text-gray-500">계좌이체 총액</p>
              <p className="text-2xl font-bold text-gray-800">{totalTransferAmount.toLocaleString()}원</p>
            </div>
            <div className="bg-purple-100 p-3 rounded-full">
              <FaExchangeAlt className="text-purple-500 text-xl" />
            </div>
          </div>
          <div className="mt-4 text-sm text-gray-600">
            <span className="text-purple-500 font-medium">{transferPayments.length}건</span> 계좌이체
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-8">
        <div className="bg-white rounded-xl shadow-md p-6">
          <h3 className="text-lg font-semibold mb-6 text-gray-700">결제 수단 비율</h3>
          <div className="h-64">
            <Pie data={paymentMethodChartData} options={{ 
              maintainAspectRatio: false,
              plugins: {
                legend: {
                  position: 'bottom',
                  labels: {
                    usePointStyle: true,
                    padding: 20
                  }
                }
              }
            }} />
          </div>
        </div>
        
        <div className="bg-white rounded-xl shadow-md p-6">
          <h3 className="text-lg font-semibold mb-6 text-gray-700">수입 항목 비교</h3>
          <div className="h-64">
            <Bar 
              data={paymentTypeChartData} 
              options={{ 
                maintainAspectRatio: false,
                plugins: {
                  legend: {
                    display: false
                  }
                },
                scales: {
                  y: {
                    beginAtZero: true,
                    ticks: {
                      callback: function(value) {
                        return value.toLocaleString() + '원';
                      }
                    }
                  }
                }
              }} 
            />
          </div>
        </div>
      </div>

      <div className="bg-white rounded-xl shadow-md p-6 mb-8">
        <h3 className="text-lg font-semibold mb-6 text-gray-700">미납 회원 목록</h3>
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">회원 ID</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">이름</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">연락처</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">미납 금액</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {/* 미납 회원 목록은 실제 데이터가 있을 때 구현 */}
              <tr>
                <td colSpan={4} className="px-6 py-10 text-center text-gray-500">
                  미납 회원 데이터가 없습니다.
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default MonthlySettlement; 