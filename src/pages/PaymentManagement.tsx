import React, { useEffect, useState } from 'react';
import { usePaymentStore } from '../stores/paymentStore';
import { useParticipantStore } from '../stores/participantStore';
import type { Payment } from '../db';
import type { Participant } from '../db';

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
    if (id) {
      await deletePayment(id);
    }
  };

  // 회원 이름 가져오기 함수
  const getParticipantName = (participantId: number) => {
    const participant = participants.find(p => p.id === participantId);
    return participant ? `${participant.name} (${participant.contact})` : '알 수 없음';
  };

  return (
    <div className="p-4">
      <h1 className="text-2xl font-bold mb-4">결제 관리</h1>

      <form onSubmit={handleSubmit} className="mb-8 p-4 border rounded shadow-sm">
        <h2 className="text-xl font-semibold mb-4">{editingPaymentId ? '결제 정보 수정' : '새 결제 추가'}</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
          <div>
            <label htmlFor="participantId" className="block text-sm font-medium text-gray-700">회원 선택</label>
            <select
              id="participantId"
              name="participantId"
              value={newPayment.participantId || 0}
              onChange={handleChange}
              className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm p-2"
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
            <label htmlFor="amount" className="block text-sm font-medium text-gray-700">금액</label>
            <input
              type="number"
              id="amount"
              name="amount"
              value={newPayment.amount || 0}
              onChange={handleChange}
              className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm p-2"
              required
            />
          </div>
          <div>
            <label htmlFor="paymentDate" className="block text-sm font-medium text-gray-700">결제일</label>
            <input
              type="date"
              id="paymentDate"
              name="paymentDate"
              value={newPayment.paymentDate || ''}
              onChange={handleChange}
              className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm p-2"
              required
            />
          </div>
          <div>
            <label htmlFor="paymentType" className="block text-sm font-medium text-gray-700">결제 종류</label>
            <select
              id="paymentType"
              name="paymentType"
              value={newPayment.paymentType || 'monthly_fee'}
              onChange={handleChange}
              className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm p-2"
            >
              <option value="monthly_fee">월 회비</option>
              <option value="lesson_fee">레슨비</option>
              <option value="etc">기타</option>
            </select>
          </div>
          <div>
            <label htmlFor="paymentMethod" className="block text-sm font-medium text-gray-700">결제 방법</label>
            <select
              id="paymentMethod"
              name="paymentMethod"
              value={newPayment.paymentMethod || 'card'}
              onChange={handleChange}
              className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm p-2"
            >
              <option value="cash">현금</option>
              <option value="card">카드</option>
              <option value="transfer">계좌이체</option>
            </select>
          </div>
          <div>
            <label htmlFor="settlementDate" className="block text-sm font-medium text-gray-700">정산 완료일 (선택)</label>
            <input
              type="date"
              id="settlementDate"
              name="settlementDate"
              value={newPayment.settlementDate || ''}
              onChange={handleChange}
              className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm p-2"
            />
          </div>
        </div>
        <button type="submit" className="mt-4 px-4 py-2 bg-blue-600 text-white rounded-md shadow-sm hover:bg-blue-700">
          {editingPaymentId ? '결제 정보 수정' : '새 결제 추가'}
        </button>
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
            className="ml-2 px-4 py-2 bg-gray-300 text-gray-800 rounded-md shadow-sm hover:bg-gray-400"
          >
            취소
          </button>
        )}
      </form>

      <div className="overflow-x-auto">
        <table className="min-w-full bg-white border border-gray-200">
          <thead>
            <tr>
              <th className="py-2 px-4 border-b">회원</th>
              <th className="py-2 px-4 border-b">금액</th>
              <th className="py-2 px-4 border-b">결제일</th>
              <th className="py-2 px-4 border-b">결제 종류</th>
              <th className="py-2 px-4 border-b">결제 방법</th>
              <th className="py-2 px-4 border-b">정산 완료일</th>
              <th className="py-2 px-4 border-b">관리</th>
            </tr>
          </thead>
          <tbody>
            {payments.map((payment) => (
              <tr key={payment.id} className="hover:bg-gray-50">
                <td className="py-2 px-4 border-b">{getParticipantName(payment.participantId)}</td>
                <td className="py-2 px-4 border-b">{payment.amount.toLocaleString()}원</td>
                <td className="py-2 px-4 border-b">{payment.paymentDate}</td>
                <td className="py-2 px-4 border-b">
                  {payment.paymentType === 'monthly_fee' ? '월 회비' : 
                   payment.paymentType === 'lesson_fee' ? '레슨비' : '기타'}
                </td>
                <td className="py-2 px-4 border-b">
                  <span className={`px-2 py-1 rounded-full text-xs font-semibold
                    ${payment.paymentMethod === 'cash' ? 'bg-green-100 text-green-800' :
                      payment.paymentMethod === 'card' ? 'bg-blue-100 text-blue-800' :
                      'bg-yellow-100 text-yellow-800'}
                  `}>
                    {payment.paymentMethod === 'cash' ? '현금' : 
                     payment.paymentMethod === 'card' ? '카드' : '계좌이체'}
                  </span>
                </td>
                <td className="py-2 px-4 border-b">{payment.settlementDate || '-'}</td>
                <td className="py-2 px-4 border-b">
                  <button onClick={() => handleEdit(payment)} className="text-blue-600 hover:text-blue-900 mr-2">수정</button>
                  <button onClick={() => handleDelete(payment.id)} className="text-red-600 hover:text-red-900">삭제</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default PaymentManagement; 