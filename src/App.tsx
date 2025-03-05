
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { TradingProvider } from './providers/TradingProvider';
import { AuthProvider } from './contexts/AuthContext';
import Dashboard from './components/Dashboard';
import AuthPage from './components/auth/AuthPage';
import ResetPasswordPage from './components/auth/ResetPasswordPage';
import { Toaster } from './components/ui/sonner';
import ProtectedRoute from './components/auth/ProtectedRoute';

const App = () => {
  return (
    <BrowserRouter>
      <AuthProvider>
        <TradingProvider>
          <Routes>
            <Route path="/" element={<Navigate to="/dashboard" replace />} />
            <Route path="/auth" element={<AuthPage />} />
            <Route path="/reset-password" element={<ResetPasswordPage />} />
            <Route path="/dashboard" element={
              <ProtectedRoute>
                <Dashboard />
              </ProtectedRoute>
            } />
          </Routes>
          <Toaster />
        </TradingProvider>
      </AuthProvider>
    </BrowserRouter>
  );
};

export default App;
