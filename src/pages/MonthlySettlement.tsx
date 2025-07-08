import React, { useState, useEffect } from 'react';
import { usePaymentStore } from '../stores/paymentStore';
import { useParticipantStore } from '../stores/participantStore';
import type { Payment } from '../db';
import { Chart as ChartJS, ArcElement, BarElement, CategoryScale, LinearScale, Title, Tooltip, Legend } from 'chart.js';
import { Pie, Bar } from 'react-chartjs-2';

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
        backgroundColor: ['rgba(54, 162, 235, 0.6)', 'rgba(255, 206, 86, 0.6)', 'rgba(75, 192, 192, 0.6)'],
        borderColor: ['rgba(54, 162, 235, 1)', 'rgba(255, 206, 86, 1)', 'rgba(75, 192, 192, 1)'],
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
        backgroundColor: ['rgba(255, 99, 132, 0.6)', 'rgba(153, 102, 255, 0.6)', 'rgba(255, 159, 64, 0.6)'],
      },
    ],
  };

  // Calculate expected vs actual income
  const activeParticipants = participants.filter(p => p.status === '활동중').length;
  const expectedMonthlyIncome = activeParticipants * 100000; // 가정: 월 회비 10만원
  
  return (
    <div className="p-4">
      <h1 className="text-2xl font-bold mb-4">월별 정산</h1>
      
      <div className="mb-6 flex items-center">
        <div className="mr-4">
          <label htmlFor="year" className="block text-sm font-medium text-gray-700">년도</label>
          <select
            id="year"
            value={selectedYear}
            onChange={(e) => setSelectedYear(Number(e.target.value))}
            className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm p-2"
          >
            {years.map(year => (
              <option key={year} value={year}>{year}년</option>
            ))}
          </select>
        </div>
        <div>
          <label htmlFor="month" className="block text-sm font-medium text-gray-700">월</label>
          <select
            id="month"
            value={selectedMonth}
            onChange={(e) => setSelectedMonth(Number(e.target.value))}
            className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm p-2"
          >
            {months.map(month => (
              <option key={month} value={month}>{month}월</option>
            ))}
          </select>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4 mb-8">
        <div className="bg-white p-4 rounded shadow-sm">
          <h3 className="text-sm font-medium text-gray-500">총 예상 수입</h3>
          <p className="text-2xl font-bold">{expectedMonthlyIncome.toLocaleString()}원</p>
        </div>
        <div className="bg-white p-4 rounded shadow-sm">
          <h3 className="text-sm font-medium text-gray-500">총 실제 수입</h3>
          <p className="text-2xl font-bold">{totalIncome.toLocaleString()}원</p>
        </div>
        <div className="bg-white p-4 rounded shadow-sm">
          <h3 className="text-sm font-medium text-gray-500">카드 결제 총액</h3>
          <p className="text-2xl font-bold">{totalCardAmount.toLocaleString()}원</p>
        </div>
        <div className="bg-white p-4 rounded shadow-sm">
          <h3 className="text-sm font-medium text-gray-500">현금 결제 총액</h3>
          <p className="text-2xl font-bold">{totalCashAmount.toLocaleString()}원</p>
        </div>
        <div className="bg-white p-4 rounded shadow-sm">
          <h3 className="text-sm font-medium text-gray-500">계좌이체 총액</h3>
          <p className="text-2xl font-bold">{totalTransferAmount.toLocaleString()}원</p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-8">
        <div className="bg-white p-4 rounded shadow-sm">
          <h3 className="text-lg font-semibold mb-4">결제 수단 비율</h3>
          <div className="h-64">
            <Pie data={paymentMethodChartData} options={{ maintainAspectRatio: false }} />
          </div>
        </div>
        <div className="bg-white p-4 rounded shadow-sm">
          <h3 className="text-lg font-semibold mb-4">수입 항목 비교</h3>
          <div className="h-64">
            <Bar 
              data={paymentTypeChartData} 
              options={{ 
                maintainAspectRatio: false,
                scales: {
                  y: {
                    beginAtZero: true
                  }
                }
              }} 
            />
          </div>
        </div>
      </div>

      <div className="bg-white p-4 rounded shadow-sm mb-8">
        <h3 className="text-lg font-semibold mb-4">미납 회원 목록</h3>
        <div className="overflow-x-auto">
          <table className="min-w-full bg-white border border-gray-200">
            <thead>
              <tr>
                <th className="py-2 px-4 border-b">회원 ID</th>
                <th className="py-2 px-4 border-b">이름</th>
                <th className="py-2 px-4 border-b">연락처</th>
                <th className="py-2 px-4 border-b">미납 금액</th>
              </tr>
            </thead>
            <tbody>
              {/* 미납 회원 목록은 실제 데이터가 있을 때 구현 */}
              <tr>
                <td colSpan={4} className="py-4 text-center text-gray-500">
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