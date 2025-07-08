import React, { useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { FaHome, FaUserPlus, FaUsers, FaCreditCard, FaChartBar, FaBars, FaTimes } from 'react-icons/fa';

interface LayoutProps {
  children: React.ReactNode;
}

const Layout: React.FC<LayoutProps> = ({ children }) => {
  const location = useLocation();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  
  const isActive = (path: string) => {
    return location.pathname === path;
  };

  const toggleMobileMenu = () => {
    setIsMobileMenuOpen(!isMobileMenuOpen);
  };

  const navItems = [
    { path: '/', label: '대시보드', icon: <FaHome className="mr-3" /> },
    { path: '/participants', label: '회원 등록', icon: <FaUserPlus className="mr-3" /> },
    { path: '/participants/list', label: '회원 목록', icon: <FaUsers className="mr-3" /> },
    { path: '/payments', label: '결제 관리', icon: <FaCreditCard className="mr-3" /> },
    { path: '/settlement', label: '월별 정산', icon: <FaChartBar className="mr-3" /> },
  ];

  return (
    <div className="flex h-screen bg-gray-50">
      {/* 모바일 메뉴 토글 버튼 */}
      <div className="lg:hidden fixed top-4 left-4 z-30">
        <button 
          onClick={toggleMobileMenu} 
          className="p-2 rounded-md bg-blue-600 text-white shadow-lg focus:outline-none"
        >
          {isMobileMenuOpen ? <FaTimes /> : <FaBars />}
        </button>
      </div>
      
      {/* 사이드바 - 데스크톱 */}
      <div className="hidden lg:block w-64 bg-white shadow-lg">
        <div className="h-full flex flex-col">
          <div className="p-6 border-b border-gray-100">
            <h2 className="text-2xl font-bold text-blue-600">골프 관리</h2>
            <p className="text-sm text-gray-500 mt-1">회원 및 결제 관리 시스템</p>
          </div>
          
          <nav className="flex-grow py-6">
            <ul className="space-y-1">
              {navItems.map((item) => (
                <li key={item.path}>
                  <Link 
                    to={item.path} 
                    className={`flex items-center px-6 py-3 text-gray-700 hover:bg-blue-50 hover:text-blue-700 transition-colors duration-200
                      ${isActive(item.path) ? 'bg-blue-50 text-blue-700 border-r-4 border-blue-600 font-medium' : ''}
                    `}
                  >
                    {item.icon}
                    <span>{item.label}</span>
                  </Link>
                </li>
              ))}
            </ul>
          </nav>
          
          <div className="p-4 border-t border-gray-100">
            <p className="text-xs text-gray-500 text-center">
              © 2023 골프 관리 시스템
            </p>
          </div>
        </div>
      </div>
      
      {/* 사이드바 - 모바일 */}
      <div className={`lg:hidden fixed inset-0 z-20 transition-transform transform duration-300 ease-in-out ${isMobileMenuOpen ? 'translate-x-0' : '-translate-x-full'}`}>
        <div className="h-full w-64 bg-white shadow-lg">
          <div className="p-6 border-b border-gray-100 flex justify-between items-center">
            <h2 className="text-xl font-bold text-blue-600">골프 관리</h2>
            <button onClick={toggleMobileMenu} className="text-gray-500 hover:text-gray-700">
              <FaTimes />
            </button>
          </div>
          
          <nav className="py-6">
            <ul className="space-y-1">
              {navItems.map((item) => (
                <li key={item.path}>
                  <Link 
                    to={item.path} 
                    className={`flex items-center px-6 py-3 text-gray-700 hover:bg-blue-50 hover:text-blue-700
                      ${isActive(item.path) ? 'bg-blue-50 text-blue-700 border-r-4 border-blue-600 font-medium' : ''}
                    `}
                    onClick={toggleMobileMenu}
                  >
                    {item.icon}
                    <span>{item.label}</span>
                  </Link>
                </li>
              ))}
            </ul>
          </nav>
        </div>
        {/* 배경 오버레이 */}
        <div 
          className="absolute inset-0 bg-gray-800 bg-opacity-50 -z-10"
          onClick={toggleMobileMenu}
        ></div>
      </div>
      
      {/* 메인 콘텐츠 */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* 상단 헤더 */}
        <header className="bg-white shadow-sm lg:hidden">
          <div className="px-4 py-4">
            <h1 className="text-xl font-semibold text-gray-800 text-center">골프 관리</h1>
          </div>
        </header>
        
        {/* 메인 콘텐츠 영역 */}
        <main className="flex-1 overflow-auto bg-gray-50">
          <div className="container mx-auto py-6 px-4 sm:px-6 lg:px-8">
            {children}
          </div>
        </main>
      </div>
    </div>
  );
};

export default Layout;