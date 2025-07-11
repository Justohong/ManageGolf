import React, { useEffect, useState, useRef } from 'react';
import { useParticipantStore } from '../stores/participantStore';
import type { Participant } from '../db';
import * as XLSX from 'xlsx';
import { FaFileExcel, FaUpload } from 'react-icons/fa';

const ParticipantManagement: React.FC = () => {
  const { fetchParticipants, addParticipant, updateParticipant } = useParticipantStore();
  const [newParticipant, setNewParticipant] = useState<Partial<Participant>>({
    name: '',
    gender: '남',
    contact: '',
    status: '활동중',
    joinDate: new Date().toISOString().split('T')[0],
    nextPaymentDate: new Date().toISOString().split('T')[0],
    carNumber: '',
    memo: '',
  });
  const [editingParticipantId, setEditingParticipantId] = useState<number | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [excelTemplateUrl, setExcelTemplateUrl] = useState<string>('');

  useEffect(() => {
    fetchParticipants();
    createExcelTemplate();
  }, [fetchParticipants]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    setNewParticipant({ ...newParticipant, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (editingParticipantId) {
      await updateParticipant(editingParticipantId, newParticipant);
      setEditingParticipantId(null);
    } else {
      await addParticipant(newParticipant as Participant);
    }
    setNewParticipant({
      name: '',
      gender: '남',
      contact: '',
      status: '활동중',
      joinDate: new Date().toISOString().split('T')[0],
      nextPaymentDate: new Date().toISOString().split('T')[0],
      carNumber: '',
      memo: '',
    });
  };

  // 엑셀 템플릿 생성
  const createExcelTemplate = () => {
    // 엑셀 템플릿 데이터 생성
    const templateData = [
      {
        '이름': '홍길동',
        '성별': '남',
        '연락처': '010-1234-5678',
        '차량번호': '12가3456',
        '상태': '활동중',
        '가입일': '2023-01-01',
        '다음 결제일': '2023-06-01',
        '메모': '예시 데이터입니다'
      },
      {
        '이름': '',
        '성별': '',
        '연락처': '',
        '차량번호': '',
        '상태': '',
        '가입일': '',
        '다음 결제일': '',
        '메모': ''
      }
    ];

    // 워크시트 생성
    const worksheet = XLSX.utils.json_to_sheet(templateData);
    
    // 상태 열에 데이터 유효성 검사 추가 (엑셀에서 드롭다운 목록으로 표시)
    const validationRange = { s: { c: 4, r: 1 }, e: { c: 4, r: 100 } }; // 상태 열의 범위
    const validationFormula = '"활동중,휴회중,만료"';
    
    if (!worksheet['!dataValidation']) {
      worksheet['!dataValidation'] = [];
    }
    
    worksheet['!dataValidation'].push({
      sqref: XLSX.utils.encode_range(validationRange),
      type: 'list',
      formula1: validationFormula
    });

    // 성별 열에 데이터 유효성 검사 추가
    const genderValidationRange = { s: { c: 1, r: 1 }, e: { c: 1, r: 100 } }; // 성별 열의 범위
    const genderValidationFormula = '"남,여"';
    
    worksheet['!dataValidation'].push({
      sqref: XLSX.utils.encode_range(genderValidationRange),
      type: 'list',
      formula1: genderValidationFormula
    });

    // 워크북 생성
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, '회원등록양식');

    // 엑셀 파일 생성 및 다운로드 URL 설정
    const excelBuffer = XLSX.write(workbook, { bookType: 'xlsx', type: 'array' });
    const blob = new Blob([excelBuffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
    const url = URL.createObjectURL(blob);
    setExcelTemplateUrl(url);
  };

  // 엑셀 파일 업로드 처리
  const handleExcelUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) {
      alert('파일이 선택되지 않았습니다.');
      return;
    }

    console.log('엑셀 파일 업로드 시작:', file.name);
    
    const reader = new FileReader();
    
    reader.onload = async (event) => {
      try {
        console.log('파일 읽기 완료');
        const data = new Uint8Array(event.target?.result as ArrayBuffer);
        
        console.log('XLSX 파싱 시작');
        const workbook = XLSX.read(data, { type: 'array' });
        
        if (!workbook.SheetNames || workbook.SheetNames.length === 0) {
          alert('엑셀 파일에 시트가 없습니다.');
          return;
        }
        
        const sheetName = workbook.SheetNames[0];
        console.log('시트 이름:', sheetName);
        
        const worksheet = workbook.Sheets[sheetName];
        const jsonData = XLSX.utils.sheet_to_json<any>(worksheet);
        
        console.log('파싱된 데이터:', jsonData);
        
        if (jsonData.length === 0) {
          alert('엑셀 파일에 데이터가 없습니다.');
          return;
        }

        // 필수 열 확인
        const firstRow = jsonData[0];
        const requiredColumns = ['이름', '성별', '연락처', '상태'];
        const missingColumns = requiredColumns.filter(col => !(col in firstRow));
        
        if (missingColumns.length > 0) {
          alert(`필수 열이 누락되었습니다: ${missingColumns.join(', ')}\n엑셀 양식을 다운로드하여 형식을 확인해주세요.`);
          return;
        }

        // 엑셀 데이터를 Participant 형식으로 변환
        const participants = jsonData.map((row: any) => ({
          name: row['이름'] || '',
          gender: row['성별'] || '남',
          contact: row['연락처'] || '',
          carNumber: row['차량번호'] || '',
          status: row['상태'] || '활동중',
          joinDate: row['가입일'] || new Date().toISOString().split('T')[0],
          nextPaymentDate: row['다음 결제일'] || new Date().toISOString().split('T')[0],
          memo: row['메모'] || '',
        }));

        console.log('변환된 참가자 데이터:', participants);

        // 회원 데이터 일괄 추가
        let successCount = 0;
        let errorCount = 0;
        
        for (let i = 0; i < participants.length; i++) {
          try {
            const participant = participants[i];
            console.log(`참가자 ${i+1} 추가 시도:`, participant.name);
            await addParticipant(participant as Participant);
            successCount++;
          } catch (error) {
            console.error(`참가자 ${i+1} 추가 실패:`, error);
            errorCount++;
          }
        }

        if (errorCount > 0) {
          alert(`${successCount}명의 회원 데이터가 업로드되었습니다.\n${errorCount}명의 데이터는 오류로 인해 업로드되지 않았습니다.\n자세한 내용은 개발자 도구의 콘솔을 확인하세요.`);
        } else {
          alert(`${successCount}명의 회원 데이터가 성공적으로 업로드되었습니다.`);
        }
        
        // 파일 입력 초기화
        if (fileInputRef.current) {
          fileInputRef.current.value = '';
        }
      } catch (error) {
        console.error('엑셀 파일 처리 중 오류 발생:', error);
        alert(`엑셀 파일 처리 중 오류가 발생했습니다: ${error instanceof Error ? error.message : '알 수 없는 오류'}\n파일 형식을 확인해주세요.`);
        
        // 파일 입력 초기화
        if (fileInputRef.current) {
          fileInputRef.current.value = '';
        }
      }
    };
    
    reader.onerror = (error) => {
      console.error('파일 읽기 오류:', error);
      alert('파일 읽기 중 오류가 발생했습니다.');
    };

    console.log('파일 읽기 시작');
    reader.readAsArrayBuffer(file);
  };

  // 엑셀 업로드 버튼 클릭 핸들러
  const triggerFileInput = () => {
    fileInputRef.current?.click();
  };

  return (
    <div className="p-6">
      <div className="flex flex-col sm:flex-row justify-between items-center mb-6">
        <h1 className="text-3xl font-bold text-gray-800 mb-4 sm:mb-0">회원 등록</h1>
      </div>

      <div className="bg-white rounded-xl shadow-md p-6 mb-6">
        <div className="flex flex-wrap gap-3">
          <a 
            href={excelTemplateUrl} 
            download="회원등록양식.xlsx" 
            className="flex items-center px-4 py-2 bg-green-600 text-white rounded-lg shadow-sm hover:bg-green-700 transition-colors"
          >
            <FaFileExcel className="mr-2" />
            엑셀 등록양식 다운로드
          </a>
          <button 
            onClick={triggerFileInput} 
            className="flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg shadow-sm hover:bg-blue-700 transition-colors"
          >
            <FaUpload className="mr-2" />
            엑셀 업로드
          </button>
          <input 
            ref={fileInputRef}
            type="file" 
            accept=".xlsx, .xls" 
            onChange={handleExcelUpload} 
            className="hidden" 
          />
        </div>
      </div>

      <div className="bg-white rounded-xl shadow-md p-6">
        <h2 className="text-xl font-semibold mb-4">{editingParticipantId ? '회원 수정' : '새 회원 추가'}</h2>
        <form onSubmit={handleSubmit}>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
            <div>
              <label htmlFor="name" className="block text-sm font-medium text-gray-700 mb-1">이름</label>
              <input 
                type="text" 
                id="name" 
                name="name" 
                value={newParticipant.name || ''} 
                onChange={handleChange} 
                className="w-full border border-gray-300 rounded-lg shadow-sm p-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500" 
                required 
              />
            </div>
            <div>
              <label htmlFor="gender" className="block text-sm font-medium text-gray-700 mb-1">성별</label>
              <select 
                id="gender" 
                name="gender" 
                value={newParticipant.gender || '남'} 
                onChange={handleChange} 
                className="w-full border border-gray-300 rounded-lg shadow-sm p-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              >
                <option value="남">남</option>
                <option value="여">여</option>
              </select>
            </div>
            <div>
              <label htmlFor="contact" className="block text-sm font-medium text-gray-700 mb-1">연락처</label>
              <input 
                type="text" 
                id="contact" 
                name="contact" 
                value={newParticipant.contact || ''} 
                onChange={handleChange} 
                className="w-full border border-gray-300 rounded-lg shadow-sm p-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500" 
                required 
              />
            </div>
            <div>
              <label htmlFor="carNumber" className="block text-sm font-medium text-gray-700 mb-1">차량번호</label>
              <input 
                type="text" 
                id="carNumber" 
                name="carNumber" 
                value={newParticipant.carNumber || ''} 
                onChange={handleChange} 
                className="w-full border border-gray-300 rounded-lg shadow-sm p-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500" 
              />
            </div>
            <div>
              <label htmlFor="status" className="block text-sm font-medium text-gray-700 mb-1">회원 상태</label>
              <select 
                id="status" 
                name="status" 
                value={newParticipant.status || '활동중'} 
                onChange={handleChange} 
                className="w-full border border-gray-300 rounded-lg shadow-sm p-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              >
                <option value="활동중">활동중</option>
                <option value="휴회중">휴회중</option>
                <option value="만료">만료</option>
              </select>
            </div>
            <div>
              <label htmlFor="joinDate" className="block text-sm font-medium text-gray-700 mb-1">가입일</label>
              <input 
                type="date" 
                id="joinDate" 
                name="joinDate" 
                value={newParticipant.joinDate || ''} 
                onChange={handleChange} 
                className="w-full border border-gray-300 rounded-lg shadow-sm p-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500" 
                required 
              />
            </div>
            <div>
              <label htmlFor="nextPaymentDate" className="block text-sm font-medium text-gray-700 mb-1">다음 결제 예정일</label>
              <input 
                type="date" 
                id="nextPaymentDate" 
                name="nextPaymentDate" 
                value={newParticipant.nextPaymentDate || ''} 
                onChange={handleChange} 
                className="w-full border border-gray-300 rounded-lg shadow-sm p-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500" 
                required 
              />
            </div>
          </div>
          <div>
            <label htmlFor="memo" className="block text-sm font-medium text-gray-700 mb-1">메모</label>
            <textarea 
              id="memo" 
              name="memo" 
              value={newParticipant.memo || ''} 
              onChange={handleChange} 
              rows={3} 
              className="w-full border border-gray-300 rounded-lg shadow-sm p-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            ></textarea>
          </div>
          <div className="mt-6 flex justify-end space-x-3">
            {editingParticipantId && (
              <button 
                type="button" 
                onClick={() => {
                  setEditingParticipantId(null);
                  setNewParticipant({
                    name: '',
                    gender: '남',
                    contact: '',
                    status: '활동중',
                    joinDate: new Date().toISOString().split('T')[0],
                    nextPaymentDate: new Date().toISOString().split('T')[0],
                    carNumber: '',
                    memo: '',
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
              {editingParticipantId ? '회원 정보 수정' : '새 회원 추가'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default ParticipantManagement;