import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AppProvider, useApp } from './context/AppContext';
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import FormBuilder from './pages/FormBuilder';
import FormFiller from './pages/FormFiller';
import ResponseViewer from './pages/ResponseViewer';
import Logs from './pages/Logs';
import History from './pages/History';
import ViewSubmission from './pages/ViewSubmission';
import Export from './pages/Export';
import Users from './pages/Users';
import CCRBDashboard from './pages/CCRBDashboard';
import ManageMetrics from './pages/ManageMetrics';
import PendingTracker from './pages/PendingTracker';
import Navbar from './components/Navbar';
import Sidebar from './components/Sidebar';

import Landing from './pages/Landing';

const ProtectedRoute = ({ children, adminOnly = false, oversightOnly = false }: { children: React.ReactNode, adminOnly?: boolean, oversightOnly?: boolean }) => {
  const { user } = useApp();
  if (!user) return <Navigate to="/login" />;
  if (adminOnly && user.role !== 'IQAC_ADMIN') return <Navigate to="/" />;
  if (oversightOnly && user.role !== 'IQAC_ADMIN' && user.role !== 'HOD') return <Navigate to="/" />;
  return <>{children}</>;
};

const AppContent = () => {
  const { user } = useApp();

  React.useEffect(() => {
    if (user) {
      if (user.role === 'IQAC_ADMIN') {
        document.title = 'IQAC Admin Page';
      } else if (user.role === 'HOD') {
        document.title = 'HOD Page';
      } else if (user.role === 'FACULTY') {
        document.title = 'Faculty Page';
      }
    } else {
      document.title = 'IQAC One Data Portal';
    }
  }, [user]);
  
  return (
    <Router>
      <div style={{ display: 'flex', flexDirection: 'column', minHeight: '100vh', background: 'var(--bg-primary)', color: 'var(--text-primary)' }}>
        {user && <Navbar />}
        <div style={{ display: 'flex', flex: 1, marginTop: user ? '64px' : '0' }}>
          {user && <Sidebar />}
          <main style={{ flex: 1, overflowY: 'auto', height: user ? 'calc(100vh - 64px)' : '100vh' }}>
            <Routes>
              <Route path="/login" element={<Login />} />
              
              <Route path="/admin" element={<ProtectedRoute oversightOnly><Dashboard /></ProtectedRoute>} />
              <Route path="/admin/create" element={<ProtectedRoute adminOnly><FormBuilder /></ProtectedRoute>} />
              <Route path="/admin/edit/:id" element={<ProtectedRoute adminOnly><FormBuilder /></ProtectedRoute>} />
              <Route path="/admin/responses/:id" element={<ProtectedRoute oversightOnly><ResponseViewer /></ProtectedRoute>} />
              <Route path="/admin/pending-tracker" element={<ProtectedRoute adminOnly><PendingTracker /></ProtectedRoute>} />
              <Route path="/admin/logs" element={<ProtectedRoute adminOnly><Logs /></ProtectedRoute>} />
              <Route path="/admin/export" element={<ProtectedRoute oversightOnly><Export /></ProtectedRoute>} />
              <Route path="/admin/users" element={<ProtectedRoute adminOnly><Users /></ProtectedRoute>} />
              <Route path="/admin/submission/:id" element={<ProtectedRoute oversightOnly><ViewSubmission /></ProtectedRoute>} />
              <Route path="/hod" element={<ProtectedRoute oversightOnly><CCRBDashboard /></ProtectedRoute>} />

              <Route path="/faculty" element={<ProtectedRoute><Dashboard /></ProtectedRoute>} />
              <Route path="/faculty/fill/:id" element={<ProtectedRoute><FormFiller /></ProtectedRoute>} />
              <Route path="/faculty/history" element={<ProtectedRoute><History /></ProtectedRoute>} />
              <Route path="/faculty/submission/:id" element={<ProtectedRoute><ViewSubmission /></ProtectedRoute>} />
              
              <Route path="/" element={<Landing />} />
            </Routes>
          </main>
        </div>
      </div>
    </Router>
  );
};

const App = () => (
  <AppProvider>
    <AppContent />
  </AppProvider>
);

export default App;


