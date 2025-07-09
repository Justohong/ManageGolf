import React, { useEffect, useState } from 'react';
import { usePaymentStore } from '../stores/paymentStore';
import { useParticipantStore } from '../stores/participantStore';
import type { Payment } from '../db';
import { FaEdit, FaTrash } from 'react-icons/fa';

const PaymentManagement: React.FC = () => {
  const { payments, fetchPayments, addPayment, updatePayment, deletePayment } = usePaymentStore();
  const { participants, fetchParticipants } = useParticipantStore();
  const [newPayment, setNewPayment] = useState<Partial<Payment>>({
    participantId: 0,
    amount: 0,
    paymentDate: new Date().toISOString().split('T')[0],
    paymentType: 'monthly_fee',
    paymentMethod: 'card',
    settlementDate: '',
  });
  const [editingPaymentId, setEditingPaymentId] = useState<number | null>(null);

  useEffect(() => {
    fetchPayments();
    fetchParticipants();
  }, [fetchPayments, fetchParticipants]);

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

  const handleDelete = async (id: number | undefined) => {
    if (id && window.confirm('정말 이 결제 정보를 삭제하시겠습니까?')) {
      await deletePayment(id);
    }
  };

  // 회원 이름 가져오기 함수
  const getParticipantName = (participantId: number) => {
    const participant = participants.find(p => p.id === participantId);
    return participant ? `${participant.name} (${participant.contact})` : '알 수 없음';
  };

  // 결제 방법에 따른 배지 스타일 클래스
  const getPaymentMethodBadgeClass = (method: string) => {
    switch(method) {
      case 'cash':
        return 'bg-green-100 text-green-800 border-green-200';
      case 'card':
        return 'bg-blue-100 text-blue-800 border-blue-200';
      case 'transfer':
        return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  // 결제 종류에 따른 표시 텍스트
  const getPaymentTypeText = (type: string) => {
    switch(type) {
      case 'monthly_fee':
        return '월 회비';
      case 'lesson_fee':
        return '레슨비';
      case 'etc':
        return '기타';
      default:
        return type;
    }
  };

  // 결제 방법에 따른 표시 텍스트
  const getPaymentMethodText = (method: string) => {
    switch(method) {
      case 'cash':
        return '현금';
      case 'card':
        return '카드';
      case 'transfer':
        return '계좌이체';
      default:
        return method;
    }
  };

  return (
    <div className="p-6">
      <div className="flex flex-col sm:flex-row justify-between items-center mb-6">
        <h1 className="text-3xl font-bold text-gray-800 mb-4 sm:mb-0">결제 관리</h1>
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
                value={newPayment.amount || 0}
                onChange={handleChange}
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
                  <td colSpan={7} className="px-6 py-10 text-center text-gray-500">
                    등록된 결제 정보가 없습니다.
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