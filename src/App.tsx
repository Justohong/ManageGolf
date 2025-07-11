import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import Layout from './components/Layout';

import Dashboard from './pages/Dashboard';
import ParticipantManagement from './pages/ParticipantManagement';
import ParticipantList from './pages/ParticipantList';
import PaymentManagement from './pages/PaymentManagement';
import MonthlySettlement from './pages/MonthlySettlement';
import DataManagement from './pages/DataManagement';

function App() {
  return (
    <Router basename="/ManageGolf">
      <Layout>
        <Routes>
          <Route path="/participants/manage" element={<ParticipantManagement />} />
          <Route path="/participants/list" element={<ParticipantList />} />
          <Route path="/payments" element={<PaymentManagement />} />
          <Route path="/settlement" element={<MonthlySettlement />} />
          <Route path="/data-management" element={<DataManagement />} />
          <Route path="/" element={<Dashboard />} />
        </Routes>
      </Layout>
    </Router>
  );
}

export default App;