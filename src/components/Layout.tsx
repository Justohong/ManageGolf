import React from 'react';
import { Link, useLocation } from 'react-router-dom';

interface LayoutProps {
  children: React.ReactNode;
}

const Layout: React.FC<LayoutProps> = ({ children }) => {
  const location = useLocation();
  
  const isActive = (path: string) => {
    return location.pathname === path ? 'bg-blue-700' : '';
  };

  return (
    <div className="flex h-screen bg-gray-100">
      {/* 사이드바 */}
      <div className="w-64 bg-blue-800 text-white">
        <div className="p-4">
          <h2 className="text-2xl font-semibold">골프 관리</h2>
        </div>
        <nav className="mt-8">
          <ul>
            <li>
              <Link to="/" className={`flex items-center px-4 py-3 hover:bg-blue-700 ${isActive('/')}`}>
                <span>대시보드</span>
              </Link>
            </li>
            <li>
              <Link to="/participants" className={`flex items-center px-4 py-3 hover:bg-blue-700 ${isActive('/participants')}`}>
                <span>회원 등록</span>
              </Link>
            </li>
            <li>
              <Link to="/participants/list" className={`flex items-center px-4 py-3 hover:bg-blue-700 ${isActive('/participants/list')}`}>
                <span>회원 목록</span>
              </Link>
            </li>
            <li>
              <Link to="/payments" className={`flex items-center px-4 py-3 hover:bg-blue-700 ${isActive('/payments')}`}>
                <span>결제 관리</span>
              </Link>
            </li>
            <li>
              <Link to="/settlement" className={`flex items-center px-4 py-3 hover:bg-blue-700 ${isActive('/settlement')}`}>
                <span>월별 정산</span>
              </Link>
            </li>
          </ul>
        </nav>
      </div>
      
      {/* 메인 콘텐츠 */}
      <div className="flex-1 overflow-auto">
        <main className="p-4">
          {children}
        </main>
      </div>
    </div>
  );
};

export default Layout;