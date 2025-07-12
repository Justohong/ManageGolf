import React, { useEffect, useState } from 'react';
import { usePaymentStore } from '../stores/paymentStore';
import { useParticipantStore } from '../stores/participantStore';
import type { Payment, Participant } from '../db';
import { FaEdit, FaTrash, FaCalendarAlt, FaCheck } from 'react-icons/fa';

const PaymentManagement: React.FC = () => {
  const { payments, fetchPayments, addPayment, updatePayment, deletePayment } = usePaymentStore();
  const { participants, fetchParticipants, updateParticipant } = useParticipantStore();
  const [newPayment, setNewPayment] = useState<Partial<Payment>>({
    participantId: 0,
    amount: 0,
    paymentDate: new Date().toISOString().split('T')[0],
    paymentType: 'monthly_fee',
    paymentMethod: 'card',
    settlementDate: '',
  });
  const [editingPaymentId, setEditingPaymentId] = useState<number | null>(null);
  const [startDate, setStartDate] = useState<string>(new Date().toISOString().split('T')[0]);
  const [endDate, setEndDate] = useState<string>(new Date().toISOString().split('T')[0]);
  const [selectedParticipants, setSelectedParticipants] = useState<number[]>([]);
  const [filteredParticipants, setFilteredParticipants] = useState<Participant[]>([]);

  useEffect(() => {
    fetchPayments();
    fetchParticipants();
  }, [fetchPayments, fetchParticipants]);

  useEffect(() => {
    // 활동중인 회원 중 결제일이 다가오는 순으로 필터링
    const activeParticipants = participants.filter(p => p.status === '활동중');
    
    // 결제일 기준으로 정렬
    const sorted = [...activeParticipants].sort((a, b) => {
      const dateA = new Date(a.nextPaymentDate).getTime();
      const dateB = new Date(b.nextPaymentDate).getTime();
      return dateA - dateB;
    });
    
    // 날짜 범위로 필터링
    const filtered = sorted.filter(p => {
      const paymentDate = new Date(p.nextPaymentDate);
      const start = new Date(startDate);
      const end = new Date(endDate);
      
      // 시간 제거하고 날짜만 비교
      start.setHours(0, 0, 0, 0);
      end.setHours(23, 59, 59, 999);
      paymentDate.setHours(12, 0, 0, 0);
      
      return paymentDate >= start && paymentDate <= end;
    });
    
    setFilteredParticipants(filtered);
  }, [participants, startDate, endDate]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const value = e.target.name === 'amount' || e.target.name === 'participantId' 
      ? Number(e.target.value) 
      : e.target.value;
    
    setNewPayment({ ...newPayment, [e.target.name]: value });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (editingPaymentId) {
      await updatePayment(editingPaymentId, newPayment);
      setEditingPaymentId(null);
    } else {
      await addPayment(newPayment as Payment);
    }
    setNewPayment({
      participantId: 0,
      amount: 0,
      paymentDate: new Date().toISOString().split('T')[0],
      paymentType: 'monthly_fee',
      paymentMethod: 'card',
      settlementDate: '',
    });
  };

  const handleEdit = (payment: Payment) => {
    setNewPayment(payment);
    setEditingPaymentId(payment.id || null);
  };

  const handleDelete = async (id?: number) => {
    if (id && window.confirm('이 결제 내역을 삭제하시겠습니까?')) {
      await deletePayment(id);
    }
  };

  const getParticipantName = (id: number) => {
    const participant = participants.find(p => p.id === id);
    return participant ? participant.name : '알 수 없음';
  };

  const getPaymentTypeText = (type: string) => {
    switch (type) {
      case 'monthly_fee': return '월 회비';
      case 'lesson_fee': return '레슨비';
      case 'etc': return '기타';
      default: return type;
    }
  };

  const getPaymentMethodText = (method: string) => {
    switch (method) {
      case 'card': return '카드';
      case 'cash': return '현금';
      case 'transfer': return '계좌이체';
      default: return method;
    }
  };

  const getPaymentMethodBadgeClass = (method: string) => {
    switch (method) {
      case 'card': return 'border-blue-500 text-blue-500 bg-blue-50';
      case 'cash': return 'border-yellow-500 text-yellow-500 bg-yellow-50';
      case 'transfer': return 'border-purple-500 text-purple-500 bg-purple-50';
      default: return 'border-gray-500 text-gray-500 bg-gray-50';
    }
  };

  // 날짜 조정 함수
  const adjustDate = (days: number) => {
    const today = new Date();
    today.setDate(today.getDate() + days);
    
    const adjustedDate = today.toISOString().split('T')[0];
    
    if (days < 0) {
      setStartDate(adjustedDate);
      setEndDate(new Date().toISOString().split('T')[0]);
    } else {
      setStartDate(new Date().toISOString().split('T')[0]);
      setEndDate(adjustedDate);
    }
  };

  // 참가자 선택 토글
  const toggleParticipantSelection = (id: number) => {
    if (selectedParticipants.includes(id)) {
      setSelectedParticipants(selectedParticipants.filter(p => p !== id));
    } else {
      setSelectedParticipants([...selectedParticipants, id]);
    }
  };

  // 선택한 회원 결제 처리
  const processSelectedPayments = async () => {
    if (selectedParticipants.length === 0) {
      alert('결제 처리할 회원을 선택해주세요.');
      return;
    }

    if (!window.confirm(`선택한 ${selectedParticipants.length}명의 회원에 대해 결제 처리하시겠습니까?`)) {
      return;
    }

    const today = new Date().toISOString().split('T')[0];
    const paymentAmount = 210000; // 기본 결제 금액 (21만원)
    let successCount = 0;

    try {
      for (const participantId of selectedParticipants) {
        // 결제 추가
        await addPayment({
          participantId,
          amount: paymentAmount,
          paymentDate: today,
          paymentType: 'monthly_fee',
          paymentMethod: 'card', // 기본값
          settlementDate: '',
        });

        // 참가자의 다음 결제일 업데이트 (한 달 뒤로)
        const participant = participants.find(p => p.id === participantId);
        if (participant) {
          const nextDate = new Date(participant.nextPaymentDate);
          nextDate.setMonth(nextDate.getMonth() + 1);
          await updateParticipant(participantId, {
            nextPaymentDate: nextDate.toISOString().split('T')[0]
          });
        }
        
        successCount++;
      }

      alert(`${successCount}명의 회원 결제가 처리되었습니다.`);
      setSelectedParticipants([]);
      fetchParticipants(); // 참가자 정보 갱신
    } catch (error) {
      console.error('결제 처리 중 오류 발생:', error);
      alert(`결제 처리 중 오류가 발생했습니다: ${error}`);
    }
  };

  return (
    <div className="p-6">
      <div className="flex flex-col sm:flex-row justify-between items-center mb-6">
        <h1 className="text-3xl font-bold text-gray-800 mb-4 sm:mb-0">결제 관리</h1>
      </div>

      {/* 날짜 필터 및 빠른 선택 버튼 */}
      <div className="bg-white rounded-xl shadow-md p-6 mb-6">
        <h2 className="text-xl font-semibold mb-4">결제 예정 회원 조회</h2>
        
        <div className="flex flex-wrap items-center gap-4 mb-4">
          <div className="flex items-center">
            <label htmlFor="startDate" className="block text-sm font-medium text-gray-700 mr-2">시작일</label>
            <input
              type="date"
              id="startDate"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              className="border border-gray-300 rounded-lg shadow-sm p-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            />
          </div>
          <div className="flex items-center">
            <label htmlFor="endDate" className="block text-sm font-medium text-gray-700 mr-2">종료일</label>
            <input
              type="date"
              id="endDate"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              className="border border-gray-300 rounded-lg shadow-sm p-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            />
          </div>
        </div>
        
        <div className="flex flex-wrap gap-2 mb-4">
          <button 
            onClick={() => adjustDate(-1)} 
            className="px-3 py-1 bg-blue-100 text-blue-700 rounded-md hover:bg-blue-200 transition-colors"
          >
            오늘 -1일
          </button>
          <button 
            onClick={() => adjustDate(-3)} 
            className="px-3 py-1 bg-blue-100 text-blue-700 rounded-md hover:bg-blue-200 transition-colors"
          >
            오늘 -3일
          </button>
          <button 
            onClick={() => adjustDate(-7)} 
            className="px-3 py-1 bg-blue-100 text-blue-700 rounded-md hover:bg-blue-200 transition-colors"
          >
            오늘 -7일
          </button>
          <button 
            onClick={() => {
              const today = new Date().toISOString().split('T')[0];
              setStartDate(today);
              setEndDate(today);
            }} 
            className="px-3 py-1 bg-green-100 text-green-700 rounded-md hover:bg-green-200 transition-colors"
          >
            오늘
          </button>
          <button 
            onClick={() => adjustDate(1)} 
            className="px-3 py-1 bg-purple-100 text-purple-700 rounded-md hover:bg-purple-200 transition-colors"
          >
            오늘 +1일
          </button>
          <button 
            onClick={() => adjustDate(3)} 
            className="px-3 py-1 bg-purple-100 text-purple-700 rounded-md hover:bg-purple-200 transition-colors"
          >
            오늘 +3일
          </button>
          <button 
            onClick={() => adjustDate(7)} 
            className="px-3 py-1 bg-purple-100 text-purple-700 rounded-md hover:bg-purple-200 transition-colors"
          >
            오늘 +7일
          </button>
        </div>
        
        {/* 결제 예정 회원 목록 */}
        {filteredParticipants.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider w-10">
                    <input 
                      type="checkbox" 
                      checked={selectedParticipants.length === filteredParticipants.length && filteredParticipants.length > 0}
                      onChange={() => {
                        if (selectedParticipants.length === filteredParticipants.length) {
                          setSelectedParticipants([]);
                        } else {
                          setSelectedParticipants(filteredParticipants.map(p => p.id!));
                        }
                      }}
                      className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                    />
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">회원명</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">연락처</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">결제 예정일</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">메모</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {filteredParticipants.map((participant) => (
                  <tr 
                    key={participant.id} 
                    className={`hover:bg-gray-50 transition-colors ${
                      new Date(participant.nextPaymentDate) < new Date() ? 'bg-red-50' : ''
                    }`}
                  >
                    <td className="px-6 py-4 whitespace-nowrap">
                      <input 
                        type="checkbox" 
                        checked={selectedParticipants.includes(participant.id!)}
                        onChange={() => toggleParticipantSelection(participant.id!)}
                        className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                      />
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">{participant.name}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{participant.contact}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      <span className={new Date(participant.nextPaymentDate) < new Date() ? 'text-red-600 font-medium' : ''}>
                        {participant.nextPaymentDate}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{participant.memo || '-'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="text-center py-4 text-gray-500">
            선택한 기간에 결제 예정인 회원이 없습니다.
          </div>
        )}
        
        {filteredParticipants.length > 0 && (
          <div className="mt-4 flex justify-end">
            <button 
              onClick={processSelectedPayments}
              disabled={selectedParticipants.length === 0}
              className={`flex items-center px-4 py-2 rounded-lg ${
                selectedParticipants.length > 0 
                ? 'bg-blue-600 text-white hover:bg-blue-700' 
                : 'bg-gray-300 text-gray-500 cursor-not-allowed'
              } transition-colors`}
            >
              <FaCheck className="mr-2" />
              선택 회원 결제 처리 ({selectedParticipants.length}명)
            </button>
          </div>
        )}
      </div>

      <div className="bg-white rounded-xl shadow-md p-6 mb-6">
        <h2 className="text-xl font-semibold mb-4">{editingPaymentId ? '결제 정보 수정' : '새 결제 추가'}</h2>
        <form onSubmit={handleSubmit}>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
            <div>
              <label htmlFor="participantId" className="block text-sm font-medium text-gray-700 mb-1">회원 선택</label>
              <select
                id="participantId"
                name="participantId"
                value={newPayment.participantId || 0}
                onChange={handleChange}
                className="w-full border border-gray-300 rounded-lg shadow-sm p-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                required
              >
                <option value={0} disabled>회원을 선택하세요</option>
                {participants.map((participant) => (
                  <option key={participant.id} value={participant.id}>
                    {participant.name} ({participant.contact})
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label htmlFor="amount" className="block text-sm font-medium text-gray-700 mb-1">금액</label>
              <input
                type="number"
                id="amount"
                name="amount"
                value={newPayment.amount || ''}
                onChange={handleChange}
                onFocus={(e) => {
                  if (Number(e.target.value) === 0) {
                    e.target.value = '';
                    setNewPayment({ ...newPayment, amount: undefined });
                  }
                }}
                className="w-full border border-gray-300 rounded-lg shadow-sm p-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                required
              />
            </div>
            <div>
              <label htmlFor="paymentDate" className="block text-sm font-medium text-gray-700 mb-1">결제일</label>
              <input
                type="date"
                id="paymentDate"
                name="paymentDate"
                value={newPayment.paymentDate || ''}
                onChange={handleChange}
                className="w-full border border-gray-300 rounded-lg shadow-sm p-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                required
              />
            </div>
            <div>
              <label htmlFor="paymentType" className="block text-sm font-medium text-gray-700 mb-1">결제 종류</label>
              <select
                id="paymentType"
                name="paymentType"
                value={newPayment.paymentType || 'monthly_fee'}
                onChange={handleChange}
                className="w-full border border-gray-300 rounded-lg shadow-sm p-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              >
                <option value="monthly_fee">월 회비</option>
                <option value="lesson_fee">레슨비</option>
                <option value="etc">기타</option>
              </select>
            </div>
            <div>
              <label htmlFor="paymentMethod" className="block text-sm font-medium text-gray-700 mb-1">결제 방법</label>
              <select
                id="paymentMethod"
                name="paymentMethod"
                value={newPayment.paymentMethod || 'card'}
                onChange={handleChange}
                className="w-full border border-gray-300 rounded-lg shadow-sm p-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              >
                <option value="cash">현금</option>
                <option value="card">카드</option>
                <option value="transfer">계좌이체</option>
              </select>
            </div>
            <div>
              <label htmlFor="settlementDate" className="block text-sm font-medium text-gray-700 mb-1">정산 완료일 (선택)</label>
              <input
                type="date"
                id="settlementDate"
                name="settlementDate"
                value={newPayment.settlementDate || ''}
                onChange={handleChange}
                className="w-full border border-gray-300 rounded-lg shadow-sm p-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />
            </div>
          </div>
          <div className="mt-6 flex justify-end space-x-3">
            {editingPaymentId && (
              <button
                type="button"
                onClick={() => {
                  setEditingPaymentId(null);
                  setNewPayment({
                    participantId: 0,
                    amount: 0,
                    paymentDate: new Date().toISOString().split('T')[0],
                    paymentType: 'monthly_fee',
                    paymentMethod: 'card',
                    settlementDate: '',
                  });
                }}
                className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors"
              >
                취소
              </button>
            )}
            <button 
              type="submit" 
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
            >
              {editingPaymentId ? '결제 정보 수정' : '새 결제 추가'}
            </button>
          </div>
        </form>
      </div>

      <div className="bg-white rounded-xl shadow-md overflow-hidden">
        <h2 className="text-xl font-semibold p-6 pb-3">결제 내역</h2>
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">회원</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">금액</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">결제일</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">결제 종류</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">결제 방법</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">정산 완료일</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">관리</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {payments.length > 0 ? (
                payments.map((payment) => (
                  <tr key={payment.id} className="hover:bg-gray-50 transition-colors">
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">{getParticipantName(payment.participantId)}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{payment.amount.toLocaleString()}원</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{payment.paymentDate}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {getPaymentTypeText(payment.paymentType)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`px-3 py-1 rounded-full text-xs font-medium border ${getPaymentMethodBadgeClass(payment.paymentMethod)}`}>
                        {getPaymentMethodText(payment.paymentMethod)}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{payment.settlementDate || '-'}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                      <button 
                        onClick={() => handleEdit(payment)} 
                        className="text-blue-600 hover:text-blue-900 mr-3 transition-colors"
                        title="수정"
                      >
                        <FaEdit />
                      </button>
                      <button 
                        onClick={() => handleDelete(payment.id)} 
                        className="text-red-600 hover:text-red-900 transition-colors"
                        title="삭제"
                      >
                        <FaTrash />
                      </button>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={7} className="px-6 py-4 text-center text-gray-500">
                    결제 내역이 없습니다.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default PaymentManagement; 