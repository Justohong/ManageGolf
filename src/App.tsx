import React from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import Layout from './components/Layout';
import Dashboard from './pages/Dashboard';
import ParticipantManagement from './pages/ParticipantManagement';
import ParticipantList from './pages/ParticipantList';
import PaymentManagement from './pages/PaymentManagement';
import MonthlySettlement from './pages/MonthlySettlement';

function App() {
  return (
    <Router>
      <Layout>
        <Routes>
          <Route path="/participants" element={<ParticipantManagement />} />
          <Route path="/participants/list" element={<ParticipantList />} />
          <Route path="/payments" element={<PaymentManagement />} />
          <Route path="/settlement" element={<MonthlySettlement />} />
          <Route path="/" element={<Dashboard />} />
        </Routes>
      </Layout>
    </Router>
  );
}

export default App;