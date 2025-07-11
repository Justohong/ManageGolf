import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import './index.css';
import { initializeDemoData } from './db';

// 앱 시작 시 데모 데이터 초기화
initializeDemoData().then((initialized) => {
  if (initialized) {
    console.log('데모 데이터가 초기화되었습니다.');
  } else {
    console.log('기존 데이터가 있어 데모 데이터를 초기화하지 않았습니다.');
  }
});

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
