import React, { useEffect, useState } from 'react';
import { useParticipantStore } from '../stores/participantStore';
import type { Participant } from '../db';
import * as XLSX from 'xlsx';

const ParticipantList: React.FC = () => {
  const { participants, fetchParticipants, updateParticipant, deleteParticipant } = useParticipantStore();
  const [filteredParticipants, setFilteredParticipants] = useState<Participant[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [sortField, setSortField] = useState<keyof Participant>('name');
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('asc');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [editingParticipant, setEditingParticipant] = useState<Participant | null>(null);

  useEffect(() => {
    fetchParticipants();
  }, [fetchParticipants]);

  useEffect(() => {
    // 필터링 및 정렬 로직
    let filtered = [...participants];
    
    // 상태 필터링
    if (statusFilter !== 'all') {
      filtered = filtered.filter(p => p.status === statusFilter);
    }
    
    // 검색어 필터링
    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      filtered = filtered.filter(
        p => p.name.toLowerCase().includes(term) || 
             p.contact.toLowerCase().includes(term) || 
             (p.memo && p.memo.toLowerCase().includes(term))
      );
    }
    
    // 정렬
    filtered.sort((a, b) => {
      const fieldA = a[sortField];
      const fieldB = b[sortField];
      
      if (fieldA === undefined || fieldB === undefined) return 0;
      
      const compareResult = 
        typeof fieldA === 'string' && typeof fieldB === 'string'
          ? fieldA.localeCompare(fieldB)
          : String(fieldA).localeCompare(String(fieldB));
      
      return sortDirection === 'asc' ? compareResult : -compareResult;
    });
    
    setFilteredParticipants(filtered);
  }, [participants, searchTerm, sortField, sortDirection, statusFilter]);

  const handleSort = (field: keyof Participant) => {
    if (field === sortField) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortDirection('asc');
    }
  };

  const handleDelete = async (id: number | undefined) => {
    if (id && window.confirm('정말 이 회원을 삭제하시겠습니까?')) {
      await deleteParticipant(id);
    }
  };

  const handleEdit = (participant: Participant) => {
    setEditingParticipant({...participant});
  };

  const handleEditChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    if (editingParticipant) {
      setEditingParticipant({
        ...editingParticipant,
        [e.target.name]: e.target.value
      });
    }
  };

  const handleEditSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (editingParticipant && editingParticipant.id) {
      await updateParticipant(editingParticipant.id, editingParticipant);
      setEditingParticipant(null);
    }
  };

  // 엑셀 파일 다운로드
  const handleExcelDownload = () => {
    // ID를 제외한 회원 데이터 추출
    const data = filteredParticipants.map(p => ({
      '이름': p.name,
      '성별': p.gender,
      '연락처': p.contact,
      '상태': p.status,
      '가입일': p.joinDate,
      '다음 결제일': p.nextPaymentDate,
      '메모': p.memo || '',
    }));

    // 워크시트 생성
    const worksheet = XLSX.utils.json_to_sheet(data);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, '회원목록');

    // 엑셀 파일 다운로드
    XLSX.writeFile(workbook, '회원목록.xlsx');
  };

  const getSortIcon = (field: keyof Participant) => {
    if (field !== sortField) return null;
    return sortDirection === 'asc' ? '↑' : '↓';
  };

  return (
    <div className="p-4">
      <h1 className="text-2xl font-bold mb-4">회원 목록</h1>
      
      <div className="mb-6 flex flex-wrap items-center gap-4">
        <div className="flex-grow">
          <input
            type="text"
            placeholder="이름, 연락처 또는 메모로 검색..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full p-2 border border-gray-300 rounded-md"
          />
        </div>
        <div>
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="p-2 border border-gray-300 rounded-md"
          >
            <option value="all">모든 상태</option>
            <option value="활동중">활동중</option>
            <option value="휴회중">휴회중</option>
            <option value="만료">만료</option>
          </select>
        </div>
        <button
          onClick={handleExcelDownload}
          className="px-4 py-2 bg-blue-600 text-white rounded-md shadow-sm hover:bg-blue-700"
        >
          엑셀 다운로드
        </button>
      </div>

      {/* 회원 정보 수정 모달 */}
      {editingParticipant && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white p-6 rounded-lg shadow-lg w-full max-w-2xl">
            <h2 className="text-xl font-semibold mb-4">회원 정보 수정</h2>
            <form onSubmit={handleEditSubmit}>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                <div>
                  <label htmlFor="edit-name" className="block text-sm font-medium text-gray-700">이름</label>
                  <input type="text" id="edit-name" name="name" value={editingParticipant.name} onChange={handleEditChange} className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm p-2" required />
                </div>
                <div>
                  <label htmlFor="edit-gender" className="block text-sm font-medium text-gray-700">성별</label>
                  <select id="edit-gender" name="gender" value={editingParticipant.gender} onChange={handleEditChange} className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm p-2">
                    <option value="남">남</option>
                    <option value="여">여</option>
                  </select>
                </div>
                <div>
                  <label htmlFor="edit-contact" className="block text-sm font-medium text-gray-700">연락처</label>
                  <input type="text" id="edit-contact" name="contact" value={editingParticipant.contact} onChange={handleEditChange} className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm p-2" required />
                </div>
                <div>
                  <label htmlFor="edit-status" className="block text-sm font-medium text-gray-700">회원 상태</label>
                  <select id="edit-status" name="status" value={editingParticipant.status} onChange={handleEditChange} className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm p-2">
                    <option value="활동중">활동중</option>
                    <option value="휴회중">휴회중</option>
                    <option value="만료">만료</option>
                  </select>
                </div>
                <div>
                  <label htmlFor="edit-joinDate" className="block text-sm font-medium text-gray-700">가입일</label>
                  <input type="date" id="edit-joinDate" name="joinDate" value={editingParticipant.joinDate} onChange={handleEditChange} className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm p-2" required />
                </div>
                <div>
                  <label htmlFor="edit-nextPaymentDate" className="block text-sm font-medium text-gray-700">다음 결제 예정일</label>
                  <input type="date" id="edit-nextPaymentDate" name="nextPaymentDate" value={editingParticipant.nextPaymentDate} onChange={handleEditChange} className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm p-2" required />
                </div>
              </div>
              <div>
                <label htmlFor="edit-memo" className="block text-sm font-medium text-gray-700">메모</label>
                <textarea id="edit-memo" name="memo" value={editingParticipant.memo || ''} onChange={handleEditChange} rows={3} className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm p-2"></textarea>
              </div>
              <div className="mt-4 flex justify-end space-x-2">
                <button type="button" onClick={() => setEditingParticipant(null)} className="px-4 py-2 bg-gray-300 text-gray-800 rounded-md hover:bg-gray-400">
                  취소
                </button>
                <button type="submit" className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700">
                  저장
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      <div className="overflow-x-auto">
        <table className="min-w-full bg-white border border-gray-200">
          <thead>
            <tr>
              <th 
                className="py-2 px-4 border-b cursor-pointer hover:bg-gray-50"
                onClick={() => handleSort('name')}
              >
                이름 {getSortIcon('name')}
              </th>
              <th 
                className="py-2 px-4 border-b cursor-pointer hover:bg-gray-50"
                onClick={() => handleSort('gender')}
              >
                성별 {getSortIcon('gender')}
              </th>
              <th 
                className="py-2 px-4 border-b cursor-pointer hover:bg-gray-50"
                onClick={() => handleSort('contact')}
              >
                연락처 {getSortIcon('contact')}
              </th>
              <th 
                className="py-2 px-4 border-b cursor-pointer hover:bg-gray-50"
                onClick={() => handleSort('status')}
              >
                상태 {getSortIcon('status')}
              </th>
              <th 
                className="py-2 px-4 border-b cursor-pointer hover:bg-gray-50"
                onClick={() => handleSort('joinDate')}
              >
                가입일 {getSortIcon('joinDate')}
              </th>
              <th 
                className="py-2 px-4 border-b cursor-pointer hover:bg-gray-50"
                onClick={() => handleSort('nextPaymentDate')}
              >
                다음 결제일 {getSortIcon('nextPaymentDate')}
              </th>
              <th className="py-2 px-4 border-b">메모</th>
              <th className="py-2 px-4 border-b">관리</th>
            </tr>
          </thead>
          <tbody>
            {filteredParticipants.length > 0 ? (
              filteredParticipants.map((participant) => (
                <tr key={participant.id} className="hover:bg-gray-50">
                  <td className="py-2 px-4 border-b">{participant.name}</td>
                  <td className="py-2 px-4 border-b">{participant.gender}</td>
                  <td className="py-2 px-4 border-b">{participant.contact}</td>
                  <td className="py-2 px-4 border-b">
                    <span className={`px-2 py-1 rounded-full text-xs font-semibold
                      ${participant.status === '활동중' ? 'bg-green-100 text-green-800' :
                        participant.status === '휴회중' ? 'bg-gray-100 text-gray-800' :
                        'bg-yellow-100 text-yellow-800'}
                    `}>
                      {participant.status}
                    </span>
                  </td>
                  <td className="py-2 px-4 border-b">{participant.joinDate}</td>
                  <td className="py-2 px-4 border-b">{participant.nextPaymentDate}</td>
                  <td className="py-2 px-4 border-b">{participant.memo}</td>
                  <td className="py-2 px-4 border-b">
                    <button onClick={() => handleEdit(participant)} className="text-blue-600 hover:text-blue-900 mr-2">수정</button>
                    <button onClick={() => handleDelete(participant.id)} className="text-red-600 hover:text-red-900">삭제</button>
                  </td>
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan={8} className="py-4 text-center text-gray-500">
                  {searchTerm || statusFilter !== 'all' ? '검색 결과가 없습니다.' : '등록된 회원이 없습니다.'}
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default ParticipantList; 