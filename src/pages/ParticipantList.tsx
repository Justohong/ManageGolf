import React, { useEffect, useState } from 'react';
import { useParticipantStore } from '../stores/participantStore';
import type { Participant } from '../db';
import * as XLSX from 'xlsx';
import { FaSearch, FaFileExcel, FaFilter, FaEdit, FaTrash, FaSortAlphaDown, FaSortAlphaUp } from 'react-icons/fa';

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
             (p.carNumber && p.carNumber.toLowerCase().includes(term)) ||
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
      '차량번호': p.carNumber || '',
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
    return sortDirection === 'asc' ? <FaSortAlphaDown className="inline ml-1" /> : <FaSortAlphaUp className="inline ml-1" />;
  };

  const getStatusBadgeClass = (status: string) => {
    switch(status) {
      case '활동중':
        return 'bg-green-100 text-green-800 border-green-200';
      case '휴회중':
        return 'bg-gray-100 text-gray-800 border-gray-200';
      case '만료':
        return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  return (
    <div className="p-6">
      <div className="flex flex-col sm:flex-row justify-between items-center mb-6">
        <h1 className="text-3xl font-bold text-gray-800 mb-4 sm:mb-0">회원 목록</h1>
        <button
          onClick={handleExcelDownload}
          className="flex items-center px-4 py-2 bg-green-600 text-white rounded-lg shadow-sm hover:bg-green-700 transition-colors"
        >
          <FaFileExcel className="mr-2" />
          엑셀 다운로드
        </button>
      </div>
      
      <div className="bg-white rounded-xl shadow-md p-6 mb-6">
        <div className="flex flex-col md:flex-row md:items-center gap-4">
          <div className="relative flex-grow">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <FaSearch className="text-gray-400" />
            </div>
            <input
              type="text"
              placeholder="이름, 연락처, 차량번호 또는 메모로 검색..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            />
          </div>
          <div className="flex items-center">
            <div className="flex items-center mr-2">
              <FaFilter className="text-gray-500 mr-2" />
              <span className="text-sm text-gray-600 mr-2">상태:</span>
            </div>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            >
              <option value="all">모든 상태</option>
              <option value="활동중">활동중</option>
              <option value="휴회중">휴회중</option>
              <option value="만료">만료</option>
            </select>
          </div>
        </div>
      </div>

      {/* 회원 정보 수정 모달 */}
      {editingParticipant && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-2xl overflow-hidden">
            <div className="px-6 py-4 border-b border-gray-200 flex justify-between items-center">
              <h2 className="text-xl font-semibold text-gray-800">회원 정보 수정</h2>
              <button 
                onClick={() => setEditingParticipant(null)}
                className="text-gray-500 hover:text-gray-700 focus:outline-none"
              >
                <svg className="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12"></path>
                </svg>
              </button>
            </div>
            <form onSubmit={handleEditSubmit} className="p-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
                <div>
                  <label htmlFor="edit-name" className="block text-sm font-medium text-gray-700 mb-1">이름</label>
                  <input type="text" id="edit-name" name="name" value={editingParticipant.name} onChange={handleEditChange} className="w-full border border-gray-300 rounded-lg shadow-sm p-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500" required />
                </div>
                <div>
                  <label htmlFor="edit-gender" className="block text-sm font-medium text-gray-700 mb-1">성별</label>
                  <select id="edit-gender" name="gender" value={editingParticipant.gender} onChange={handleEditChange} className="w-full border border-gray-300 rounded-lg shadow-sm p-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500">
                    <option value="남">남</option>
                    <option value="여">여</option>
                  </select>
                </div>
                <div>
                  <label htmlFor="edit-contact" className="block text-sm font-medium text-gray-700 mb-1">연락처</label>
                  <input type="text" id="edit-contact" name="contact" value={editingParticipant.contact} onChange={handleEditChange} className="w-full border border-gray-300 rounded-lg shadow-sm p-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500" required />
                </div>
                <div>
                  <label htmlFor="edit-carNumber" className="block text-sm font-medium text-gray-700 mb-1">차량번호</label>
                  <input type="text" id="edit-carNumber" name="carNumber" value={editingParticipant.carNumber || ''} onChange={handleEditChange} className="w-full border border-gray-300 rounded-lg shadow-sm p-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500" />
                </div>
                <div>
                  <label htmlFor="edit-status" className="block text-sm font-medium text-gray-700 mb-1">회원 상태</label>
                  <select id="edit-status" name="status" value={editingParticipant.status} onChange={handleEditChange} className="w-full border border-gray-300 rounded-lg shadow-sm p-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500">
                    <option value="활동중">활동중</option>
                    <option value="휴회중">휴회중</option>
                    <option value="만료">만료</option>
                  </select>
                </div>
                <div>
                  <label htmlFor="edit-joinDate" className="block text-sm font-medium text-gray-700 mb-1">가입일</label>
                  <input type="date" id="edit-joinDate" name="joinDate" value={editingParticipant.joinDate} onChange={handleEditChange} className="w-full border border-gray-300 rounded-lg shadow-sm p-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500" required />
                </div>
                <div>
                  <label htmlFor="edit-nextPaymentDate" className="block text-sm font-medium text-gray-700 mb-1">다음 결제 예정일</label>
                  <input type="date" id="edit-nextPaymentDate" name="nextPaymentDate" value={editingParticipant.nextPaymentDate} onChange={handleEditChange} className="w-full border border-gray-300 rounded-lg shadow-sm p-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500" required />
                </div>
              </div>
              <div>
                <label htmlFor="edit-memo" className="block text-sm font-medium text-gray-700 mb-1">메모</label>
                <textarea id="edit-memo" name="memo" value={editingParticipant.memo || ''} onChange={handleEditChange} rows={3} className="w-full border border-gray-300 rounded-lg shadow-sm p-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"></textarea>
              </div>
              <div className="mt-6 flex justify-end space-x-3">
                <button type="button" onClick={() => setEditingParticipant(null)} className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors">
                  취소
                </button>
                <button type="submit" className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors">
                  저장
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      <div className="bg-white rounded-xl shadow-md overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th 
                  className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
                  onClick={() => handleSort('name')}
                >
                  <div className="flex items-center">
                    이름 {getSortIcon('name')}
                  </div>
                </th>
                <th 
                  className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
                  onClick={() => handleSort('gender')}
                >
                  <div className="flex items-center">
                    성별 {getSortIcon('gender')}
                  </div>
                </th>
                <th 
                  className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
                  onClick={() => handleSort('contact')}
                >
                  <div className="flex items-center">
                    연락처 {getSortIcon('contact')}
                  </div>
                </th>
                <th 
                  className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
                  onClick={() => handleSort('carNumber')}
                >
                  <div className="flex items-center">
                    차량번호 {getSortIcon('carNumber')}
                  </div>
                </th>
                <th 
                  className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
                  onClick={() => handleSort('status')}
                >
                  <div className="flex items-center">
                    상태 {getSortIcon('status')}
                  </div>
                </th>
                <th 
                  className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
                  onClick={() => handleSort('joinDate')}
                >
                  <div className="flex items-center">
                    가입일 {getSortIcon('joinDate')}
                  </div>
                </th>
                <th 
                  className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
                  onClick={() => handleSort('nextPaymentDate')}
                >
                  <div className="flex items-center">
                    다음 결제일 {getSortIcon('nextPaymentDate')}
                  </div>
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  메모
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  관리
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {filteredParticipants.length > 0 ? (
                filteredParticipants.map((participant) => (
                  <tr key={participant.id} className="hover:bg-gray-50 transition-colors">
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">{participant.name}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{participant.gender}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{participant.contact}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{participant.carNumber}</td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`px-3 py-1 rounded-full text-xs font-medium border ${getStatusBadgeClass(participant.status)}`}>
                        {participant.status}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{participant.joinDate}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{participant.nextPaymentDate}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 max-w-xs truncate">{participant.memo}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                      <button 
                        onClick={() => handleEdit(participant)} 
                        className="text-blue-600 hover:text-blue-900 mr-3 transition-colors"
                        title="수정"
                      >
                        <FaEdit />
                      </button>
                      <button 
                        onClick={() => handleDelete(participant.id)} 
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
                  <td colSpan={8} className="px-6 py-10 text-center text-gray-500">
                    {searchTerm || statusFilter !== 'all' ? '검색 결과가 없습니다.' : '등록된 회원이 없습니다.'}
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

export default ParticipantList; 