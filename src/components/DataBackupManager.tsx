import React, { useState, useRef } from 'react';
import { useParticipantStore } from '../stores/participantStore';
import { usePaymentStore } from '../stores/paymentStore';
import { FaDownload, FaUpload, FaDatabase, FaTrash } from 'react-icons/fa';

const DataBackupManager: React.FC = () => {
  const { exportParticipantsToJSON, importParticipantsFromJSON } = useParticipantStore();
  const { exportPaymentsToJSON, importPaymentsFromJSON } = usePaymentStore();
  const [isLoading, setIsLoading] = useState(false);
  const [message, setMessage] = useState<{ text: string; type: 'success' | 'error' | 'info' } | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [showConfirmDialog, setShowConfirmDialog] = useState(false);

  // 모든 데이터 내보내기
  const handleExportAllData = async () => {
    try {
      setIsLoading(true);
      setMessage({ text: '데이터 내보내기 중...', type: 'info' });

      // 회원 및 결제 데이터 가져오기
      const participantsJSON = await exportParticipantsToJSON();
      const paymentsJSON = await exportPaymentsToJSON();

      // 전체 데이터 객체 생성
      const allData = {
        participants: JSON.parse(participantsJSON),
        payments: JSON.parse(paymentsJSON),
        exportDate: new Date().toISOString(),
        version: '1.0'
      };

      // JSON 파일로 변환
      const jsonString = JSON.stringify(allData, null, 2);
      const blob = new Blob([jsonString], { type: 'application/json' });
      const url = URL.createObjectURL(blob);

      // 다운로드 링크 생성 및 클릭
      const downloadLink = document.createElement('a');
      const date = new Date().toISOString().split('T')[0];
      downloadLink.href = url;
      downloadLink.download = `golf-management-backup-${date}.json`;
      document.body.appendChild(downloadLink);
      downloadLink.click();
      document.body.removeChild(downloadLink);

      setMessage({ text: '데이터가 성공적으로 내보내졌습니다.', type: 'success' });
    } catch (error) {
      console.error('데이터 내보내기 오류:', error);
      setMessage({ text: '데이터 내보내기 중 오류가 발생했습니다.', type: 'error' });
    } finally {
      setIsLoading(false);
      setTimeout(() => setMessage(null), 5000); // 5초 후 메시지 제거
    }
  };

  // 파일 선택 트리거
  const triggerFileInput = () => {
    fileInputRef.current?.click();
  };

  // 데이터 가져오기
  const handleImportData = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      setIsLoading(true);
      setMessage({ text: '데이터 가져오기 중...', type: 'info' });

      const reader = new FileReader();
      reader.onload = async (event) => {
        try {
          const jsonData = event.target?.result as string;
          const allData = JSON.parse(jsonData);

          // 데이터 형식 확인
          if (!allData.participants || !allData.payments) {
            throw new Error('유효하지 않은 데이터 형식입니다.');
          }

          // 회원 및 결제 데이터 가져오기
          await importParticipantsFromJSON(JSON.stringify(allData.participants));
          await importPaymentsFromJSON(JSON.stringify(allData.payments));

          setMessage({ text: '데이터가 성공적으로 가져와졌습니다.', type: 'success' });
        } catch (error) {
          console.error('JSON 파싱 오류:', error);
          setMessage({ text: '유효하지 않은 백업 파일입니다.', type: 'error' });
        } finally {
          setIsLoading(false);
          // 파일 입력 초기화
          if (fileInputRef.current) {
            fileInputRef.current.value = '';
          }
        }
      };

      reader.onerror = () => {
        setMessage({ text: '파일 읽기 오류가 발생했습니다.', type: 'error' });
        setIsLoading(false);
      };

      reader.readAsText(file);
    } catch (error) {
      console.error('데이터 가져오기 오류:', error);
      setMessage({ text: '데이터 가져오기 중 오류가 발생했습니다.', type: 'error' });
      setIsLoading(false);
    }
    
    setTimeout(() => setMessage(null), 5000); // 5초 후 메시지 제거
  };

  // 모든 데이터 삭제 확인 다이얼로그 표시
  const handleShowDeleteConfirm = () => {
    setShowConfirmDialog(true);
  };

  // 모든 데이터 삭제
  const handleDeleteAllData = async () => {
    try {
      setIsLoading(true);
      setMessage({ text: '모든 데이터 삭제 중...', type: 'info' });

      // IndexedDB 데이터베이스 삭제
      await window.indexedDB.deleteDatabase('MembershipDashboardDB');

      setMessage({ text: '모든 데이터가 삭제되었습니다. 페이지를 새로고침하세요.', type: 'success' });
      setShowConfirmDialog(false);
    } catch (error) {
      console.error('데이터 삭제 오류:', error);
      setMessage({ text: '데이터 삭제 중 오류가 발생했습니다.', type: 'error' });
    } finally {
      setIsLoading(false);
      setTimeout(() => setMessage(null), 10000); // 10초 후 메시지 제거
    }
  };

  return (
    <div className="bg-white rounded-xl shadow-md p-6">
      <div className="flex items-center mb-4">
        <FaDatabase className="text-blue-600 mr-2 text-xl" />
        <h2 className="text-xl font-semibold text-gray-800">데이터 백업 관리</h2>
      </div>
      
      <p className="text-gray-600 mb-6">
        회원 및 결제 데이터를 JSON 파일로 내보내거나 가져올 수 있습니다. 
        다른 PC에서 데이터를 사용하려면 먼저 데이터를 내보낸 후, 해당 PC에서 가져오기를 실행하세요.
      </p>
      
      <div className="flex flex-wrap gap-3">
        <button
          onClick={handleExportAllData}
          disabled={isLoading}
          className="flex items-center px-4 py-2 bg-green-600 text-white rounded-lg shadow-sm hover:bg-green-700 transition-colors disabled:opacity-50"
        >
          <FaDownload className="mr-2" />
          데이터 내보내기 (백업)
        </button>
        
        <button
          onClick={triggerFileInput}
          disabled={isLoading}
          className="flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg shadow-sm hover:bg-blue-700 transition-colors disabled:opacity-50"
        >
          <FaUpload className="mr-2" />
          데이터 가져오기 (복원)
        </button>

        <button
          onClick={handleShowDeleteConfirm}
          disabled={isLoading}
          className="flex items-center px-4 py-2 bg-red-600 text-white rounded-lg shadow-sm hover:bg-red-700 transition-colors disabled:opacity-50"
        >
          <FaTrash className="mr-2" />
          기존 데이터 삭제
        </button>
        
        <input
          ref={fileInputRef}
          type="file"
          accept=".json"
          onChange={handleImportData}
          className="hidden"
        />
      </div>
      
      {message && (
        <div className={`mt-4 p-3 rounded-lg ${
          message.type === 'success' ? 'bg-green-100 text-green-800' :
          message.type === 'error' ? 'bg-red-100 text-red-800' :
          'bg-blue-100 text-blue-800'
        }`}>
          {message.text}
        </div>
      )}
      
      <div className="mt-6 text-sm text-gray-500">
        <p>※ 주의사항</p>
        <ul className="list-disc pl-5 mt-1">
          <li>데이터 가져오기는 기존 데이터에 추가됩니다.</li>
          <li>백업 파일은 안전한 곳에 보관하세요.</li>
          <li>대용량 데이터의 경우 가져오기/내보내기에 시간이 걸릴 수 있습니다.</li>
        </ul>
      </div>

      {/* 삭제 확인 다이얼로그 */}
      {showConfirmDialog && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-md w-full">
            <h3 className="text-xl font-bold text-red-600 mb-4">데이터 삭제 확인</h3>
            <p className="text-gray-700 mb-4">
              모든 회원 및 결제 데이터가 영구적으로 삭제됩니다. 이 작업은 취소할 수 없으며, 삭제된 데이터는 복구할 수 없습니다.
            </p>
            <p className="text-gray-700 mb-6">
              계속하시겠습니까?
            </p>
            <div className="flex justify-end gap-3">
              <button 
                onClick={() => setShowConfirmDialog(false)}
                className="px-4 py-2 bg-gray-300 text-gray-800 rounded hover:bg-gray-400"
              >
                취소
              </button>
              <button 
                onClick={handleDeleteAllData}
                className="px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700"
              >
                삭제
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default DataBackupManager; 