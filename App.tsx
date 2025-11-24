import React from 'react';
import { HashRouter, Routes, Route, Navigate } from 'react-router-dom';
import { QueueProvider } from './services/QueueContext';
import { ThemeProvider } from './services/ThemeContext';
import { ToastProvider } from './services/ToastContext';
import { SettingsProvider } from './services/SettingsContext';
import { AuthProvider } from './services/AuthContext';
import ProtectedRoute from './components/ProtectedRoute';
import Layout from './components/Layout';
import Login from './pages/Login';
import Reception from './pages/Reception';
import Attendant from './pages/Attendant';
import TVPanel from './pages/TVPanel';
import Dashboard from './pages/Dashboard';
import Reports from './pages/Reports';
import Profile from './pages/Profile';
import Admin from './pages/Admin';

const App: React.FC = () => {
  return (
    <ThemeProvider>
      <SettingsProvider>
        <AuthProvider>
          <ToastProvider>
            <QueueProvider>
              <HashRouter>
                <Routes>
                  <Route path="/" element={<Login />} />

                  <Route path="/reception" element={
                    <ProtectedRoute allowedRoles={['RECEPTION', 'MANAGER']}>
                      <Layout>
                        <Reception />
                      </Layout>
                    </ProtectedRoute>
                  } />

                  <Route path="/attendant" element={
                    <ProtectedRoute allowedRoles={['ATTENDANT', 'MANAGER']}>
                      <Layout>
                        <Attendant />
                      </Layout>
                    </ProtectedRoute>
                  } />

                  <Route path="/profile" element={
                    <ProtectedRoute>
                      <Layout>
                        <Profile />
                      </Layout>
                    </ProtectedRoute>
                  } />

                  <Route path="/dashboard" element={
                    <ProtectedRoute>
                      <Layout>
                        <Dashboard />
                      </Layout>
                    </ProtectedRoute>
                  } />

                  <Route path="/reports" element={
                    <ProtectedRoute>
                      <Layout>
                        <Reports />
                      </Layout>
                    </ProtectedRoute>
                  } />

                  {/* TV Panel has no layout/sidebar but should be protected */}
                  <Route path="/tv-panel" element={
                    <ProtectedRoute>
                      <TVPanel />
                    </ProtectedRoute>
                  } />

                  <Route path="/admin" element={
                    <ProtectedRoute>
                      <Admin />
                    </ProtectedRoute>
                  } />

                  <Route path="*" element={<Navigate to="/" replace />} />
                </Routes>
              </HashRouter>
            </QueueProvider>
          </ToastProvider>
        </AuthProvider>
      </SettingsProvider>
    </ThemeProvider>
  );
};

export default App;