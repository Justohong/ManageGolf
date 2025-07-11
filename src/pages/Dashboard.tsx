import React, { useEffect, useState } from 'react';
import { useParticipantStore } from '../stores/participantStore';
import { usePaymentStore } from '../stores/paymentStore';
import type { Payment } from '../db';
import { Chart as ChartJS, ArcElement, BarElement, CategoryScale, LinearScale, PointElement, LineElement, Title, Tooltip, Legend } from 'chart.js';
import { Pie, Line } from 'react-chartjs-2';
import { FaUsers, FaMoneyBillWave, FaChartLine, FaExclamationTriangle } from 'react-icons/fa';
import DataBackupManager from '../components/DataBackupManager';

// ChartJS 컴포넌트 등록
ChartJS.register(
  ArcElement, 
  BarElement, 
  CategoryScale, 
  LinearScale, 
  PointElement, 
  LineElement, 
  Title, 
  Tooltip, 
  Legend
);

const Dashboard: React.FC = () => {
  const { participants, fetchParticipants } = useParticipantStore();
  const { payments, fetchPayments } = usePaymentStore();
  const [recentPayments, setRecentPayments] = useState<Payment[]>([]);
  const [monthlyIncome, setMonthlyIncome] = useState<number[]>([]);
  const [monthLabels, setMonthLabels] = useState<string[]>([]);

  useEffect(() => {
    fetchParticipants();
    fetchPayments();
  }, [fetchParticipants, fetchPayments]);

  useEffect(() => {
    // 최근 결제 내역 (최대 5개)
    const sortedPayments = [...payments].sort((a, b) => 
      new Date(b.paymentDate).getTime() - new Date(a.paymentDate).getTime()
    ).slice(0, 5);
    setRecentPayments(sortedPayments);

    // 최근 6개월 월별 수입 계산
    const today = new Date();
    const last6Months = Array.from({ length: 6 }, (_, i) => {
      const d = new Date();
      d.setMonth(today.getMonth() - i);
      return d;
    }).reverse();

    const labels = last6Months.map(date => `${date.getMonth() + 1}월`);
    setMonthLabels(labels);

    const monthlyData = last6Months.map(date => {
      const year = date.getFullYear();
      const month = date.getMonth();
      return payments.filter(payment => {
        const paymentDate = new Date(payment.paymentDate);
        return paymentDate.getFullYear() === year && paymentDate.getMonth() === month;
      }).reduce((sum, payment) => sum + payment.amount, 0);
    });
    setMonthlyIncome(monthlyData);
  }, [payments]);

  // 회원 상태별 통계
  const activeMembers = participants.filter(p => p.status === '활동중').length;
  const inactiveMembers = participants.filter(p => p.status === '휴회중').length;
  const expiredMembers = participants.filter(p => p.status === '만료').length;

  // 이번 달 수입 계산
  const currentMonth = new Date().getMonth();
  const currentYear = new Date().getFullYear();
  const currentMonthIncome = payments.filter(payment => {
    const paymentDate = new Date(payment.paymentDate);
    return paymentDate.getMonth() === currentMonth && paymentDate.getFullYear() === currentYear;
  }).reduce((sum, payment) => sum + payment.amount, 0);

  // 결제 수단별 통계
  const cardPayments = payments.filter(p => p.paymentMethod === 'card').reduce((sum, p) => sum + p.amount, 0);
  const cashPayments = payments.filter(p => p.paymentMethod === 'cash').reduce((sum, p) => sum + p.amount, 0);
  const transferPayments = payments.filter(p => p.paymentMethod === 'transfer').reduce((sum, p) => sum + p.amount, 0);

  // 차트 데이터
  const memberStatusData = {
    labels: ['활동중', '휴회중', '만료'],
    datasets: [
      {
        data: [activeMembers, inactiveMembers, expiredMembers],
        backgroundColor: ['rgba(72, 187, 120, 0.7)', 'rgba(237, 137, 54, 0.7)', 'rgba(229, 62, 62, 0.7)'],
        borderColor: ['rgb(72, 187, 120)', 'rgb(237, 137, 54)', 'rgb(229, 62, 62)'],
        borderWidth: 1,
      },
    ],
  };

  const paymentMethodData = {
    labels: ['카드', '현금', '계좌이체'],
    datasets: [
      {
        data: [cardPayments, cashPayments, transferPayments],
        backgroundColor: ['rgba(66, 153, 225, 0.7)', 'rgba(246, 173, 85, 0.7)', 'rgba(129, 140, 248, 0.7)'],
        borderColor: ['rgb(66, 153, 225)', 'rgb(246, 173, 85)', 'rgb(129, 140, 248)'],
        borderWidth: 1,
      },
    ],
  };

  const incomeChartData = {
    labels: monthLabels,
    datasets: [
      {
        label: '월별 수입',
        data: monthlyIncome,
        borderColor: 'rgb(99, 179, 237)',
        backgroundColor: 'rgba(99, 179, 237, 0.5)',
        tension: 0.3,
        fill: true,
      },
    ],
  };

  // 다음 결제일이 7일 이내인 회원 찾기
  const today = new Date();
  const nextWeek = new Date();
  nextWeek.setDate(today.getDate() + 7);
  
  const upcomingPayments = participants.filter(p => {
    if (!p.nextPaymentDate) return false;
    const paymentDate = new Date(p.nextPaymentDate);
    return paymentDate >= today && paymentDate <= nextWeek && p.status === '활동중';
  });

  return (
    <div className="p-6">
      <h1 className="text-3xl font-bold text-gray-800 mb-6">대시보드</h1>
      
      {/* 요약 카드 */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        <div className="bg-white rounded-xl shadow-md p-6 border-l-4 border-green-500 transition-transform hover:scale-105">
          <div className="flex justify-between items-center">
            <div>
              <p className="text-sm font-medium text-gray-500">총 회원 수</p>
              <p className="text-2xl font-bold text-gray-800">{participants.length}명</p>
            </div>
            <div className="bg-green-100 p-3 rounded-full">
              <FaUsers className="text-green-500 text-xl" />
            </div>
          </div>
          <div className="mt-4 text-sm text-gray-600">
            <span className="text-green-500 font-medium">{activeMembers}명</span> 활동중
          </div>
        </div>
        
        <div className="bg-white rounded-xl shadow-md p-6 border-l-4 border-blue-500 transition-transform hover:scale-105">
          <div className="flex justify-between items-center">
            <div>
              <p className="text-sm font-medium text-gray-500">이번 달 수입</p>
              <p className="text-2xl font-bold text-gray-800">{currentMonthIncome.toLocaleString()}원</p>
            </div>
            <div className="bg-blue-100 p-3 rounded-full">
              <FaMoneyBillWave className="text-blue-500 text-xl" />
            </div>
          </div>
          <div className="mt-4 text-sm text-gray-600">
            <span className="text-blue-500 font-medium">{recentPayments.length}</span> 최근 결제
          </div>
        </div>
        
        <div className="bg-white rounded-xl shadow-md p-6 border-l-4 border-purple-500 transition-transform hover:scale-105">
          <div className="flex justify-between items-center">
            <div>
              <p className="text-sm font-medium text-gray-500">평균 월 수입</p>
              <p className="text-2xl font-bold text-gray-800">
                {monthlyIncome.length > 0 
                  ? Math.round(monthlyIncome.reduce((a, b) => a + b, 0) / monthlyIncome.length).toLocaleString() 
                  : 0}원
              </p>
            </div>
            <div className="bg-purple-100 p-3 rounded-full">
              <FaChartLine className="text-purple-500 text-xl" />
            </div>
          </div>
          <div className="mt-4 text-sm text-gray-600">
            <span className="text-purple-500 font-medium">최근 6개월</span> 기준
          </div>
        </div>
        
        <div className="bg-white rounded-xl shadow-md p-6 border-l-4 border-yellow-500 transition-transform hover:scale-105">
          <div className="flex justify-between items-center">
            <div>
              <p className="text-sm font-medium text-gray-500">다가오는 결제</p>
              <p className="text-2xl font-bold text-gray-800">{upcomingPayments.length}건</p>
            </div>
            <div className="bg-yellow-100 p-3 rounded-full">
              <FaExclamationTriangle className="text-yellow-500 text-xl" />
            </div>
          </div>
          <div className="mt-4 text-sm text-gray-600">
            <span className="text-yellow-500 font-medium">7일 이내</span> 결제 예정
          </div>
        </div>
      </div>
      
      {/* 차트 */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
        <div className="bg-white p-6 rounded-xl shadow-md">
          <h2 className="text-lg font-semibold mb-4 text-gray-700">회원 현황</h2>
          <div className="h-64">
            <Pie data={memberStatusData} options={{ maintainAspectRatio: false }} />
          </div>
        </div>
        
        <div className="bg-white p-6 rounded-xl shadow-md">
          <h2 className="text-lg font-semibold mb-4 text-gray-700">결제 수단 비율</h2>
          <div className="h-64">
            <Pie data={paymentMethodData} options={{ maintainAspectRatio: false }} />
          </div>
        </div>
        
        <div className="bg-white p-6 rounded-xl shadow-md">
          <h2 className="text-lg font-semibold mb-4 text-gray-700">월별 수입 추이</h2>
          <div className="h-64">
            <Line 
              data={incomeChartData} 
              options={{ 
                maintainAspectRatio: false,
                scales: {
                  y: { beginAtZero: true }
                }
              }} 
            />
          </div>
        </div>
      </div>
      
      {/* 최근 결제 내역 & 다가오는 결제 */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white p-6 rounded-xl shadow-md">
          <h2 className="text-lg font-semibold mb-4 text-gray-700">최근 결제 내역</h2>
          <div className="overflow-x-auto">
            <table className="min-w-full">
              <thead>
                <tr className="bg-gray-50">
                  <th className="py-2 px-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">날짜</th>
                  <th className="py-2 px-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">회원</th>
                  <th className="py-2 px-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">금액</th>
                  <th className="py-2 px-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">결제수단</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {recentPayments.length > 0 ? (
                  recentPayments.map((payment, index) => {
                    const participant = participants.find(p => p.id === payment.participantId);
                    return (
                      <tr key={index} className="hover:bg-gray-50">
                        <td className="py-3 px-4 whitespace-nowrap text-sm text-gray-700">
                          {new Date(payment.paymentDate).toLocaleDateString()}
                        </td>
                        <td className="py-3 px-4 whitespace-nowrap text-sm text-gray-700">
                          {participant?.name || '알 수 없음'}
                        </td>
                        <td className="py-3 px-4 whitespace-nowrap text-sm font-medium text-gray-900">
                          {payment.amount.toLocaleString()}원
                        </td>
                        <td className="py-3 px-4 whitespace-nowrap text-sm text-gray-700">
                          <span className={`px-2 py-1 rounded-full text-xs font-medium
                            ${payment.paymentMethod === 'card' ? 'bg-blue-100 text-blue-800' :
                              payment.paymentMethod === 'cash' ? 'bg-yellow-100 text-yellow-800' :
                              'bg-purple-100 text-purple-800'}
                          `}>
                            {payment.paymentMethod === 'card' ? '카드' : 
                             payment.paymentMethod === 'cash' ? '현금' : '계좌이체'}
                          </span>
                        </td>
                      </tr>
                    );
                  })
                ) : (
                  <tr>
                    <td colSpan={4} className="py-4 text-center text-sm text-gray-500">
                      최근 결제 내역이 없습니다.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
        
        <div className="bg-white p-6 rounded-xl shadow-md">
          <h2 className="text-lg font-semibold mb-4 text-gray-700">다가오는 결제</h2>
          <div className="overflow-x-auto">
            <table className="min-w-full">
              <thead>
                <tr className="bg-gray-50">
                  <th className="py-2 px-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">회원</th>
                  <th className="py-2 px-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">연락처</th>
                  <th className="py-2 px-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">결제 예정일</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {upcomingPayments.length > 0 ? (
                  upcomingPayments.map((participant, index) => (
                    <tr key={index} className="hover:bg-gray-50">
                      <td className="py-3 px-4 whitespace-nowrap text-sm font-medium text-gray-900">
                        {participant.name}
                      </td>
                      <td className="py-3 px-4 whitespace-nowrap text-sm text-gray-700">
                        {participant.contact}
                      </td>
                      <td className="py-3 px-4 whitespace-nowrap text-sm text-gray-700">
                        {new Date(participant.nextPaymentDate).toLocaleDateString()}
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={3} className="py-4 text-center text-sm text-gray-500">
                      다가오는 결제 예정이 없습니다.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
      
      {/* 데이터 백업 관리 섹션 추가 */}
      <div className="mt-8">
        <DataBackupManager />
      </div>
    </div>
  );
};

export default Dashboard; 