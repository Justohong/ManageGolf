import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.tsx'
import { initializeDemoData } from './db.ts'

// Initialize demo data
initializeDemoData().then(initialized => {
  if (initialized) {
    console.log('Demo data loaded successfully!');
  } else {
    console.log('Using existing data from IndexedDB');
  }
});

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
