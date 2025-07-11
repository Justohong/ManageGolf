import React from 'react';
import DataBackupManager from '../components/DataBackupManager';

const DataManagement: React.FC = () => {
  return (
    <div className="p-6">
      <h1 className="text-3xl font-bold text-gray-800 mb-6">데이터 관리</h1>
      
      <p className="text-gray-600 mb-6">
        이 페이지에서는 골프 회원 관리 앱의 모든 데이터를 백업하고 복원할 수 있습니다. 
        다른 PC나 브라우저에서 데이터를 사용하려면 먼저 데이터를 내보낸 후, 해당 환경에서 가져오기를 실행하세요.
      </p>
      
      <DataBackupManager />
    </div>
  );
};

export default DataManagement; 