import React, { useEffect } from 'react';
import { BrowserRouter, Routes, Route, Link, useLocation } from 'react-router-dom';
import { Layers, Shield, Building2, UserCircle, Activity, BookOpen } from 'lucide-react';

import Dashboard from './pages/Dashboard';
import WalletPortal from './pages/WalletPortal';
import AdminPortal from './pages/AdminPortal';
import BankPortal from './pages/BankPortal';
import ConsentPortal from './pages/ConsentPortal';
import VaultMonitor from './pages/VaultMonitor';
import ResearchPage from './pages/ResearchPage';

// Toast System
export const ToastContext = React.createContext();

function Toast({ message, type, onClose }) {
  useEffect(() => {
    const timer = setTimeout(onClose, 4000);
    return () => clearTimeout(timer);
  }, [onClose]);

  return (
    <div style={{
      position: 'fixed',
      bottom: '24px',
      right: '24px',
      background: '#18181b',
      color: '#fff',
      padding: '14px 20px',
      borderRadius: '12px',
      boxShadow: '0 16px 48px rgba(0,0,0,0.5)',
      zIndex: 1000,
      display: 'flex',
      alignItems: 'center',
      gap: '10px',
      border: '1px solid rgba(255,255,255,0.08)',
      animation: 'fadeIn 0.3s ease-out',
      fontSize: '14px'
    }}>
      <div style={{ width: '6px', height: '6px', borderRadius: '50%', background: type === 'success' ? '#22c55e' : '#ef4444' }} />
      <span style={{ fontWeight: '500' }}>{message}</span>
    </div>
  );
}

function NavBar() {
  const location = useLocation();
  
  return (
    <nav style={{
      background: 'rgba(0, 0, 0, 0.8)',
      backdropFilter: 'blur(20px)',
      borderBottom: '1px solid rgba(255,255,255,0.06)',
      padding: '0 40px',
      height: '56px',
      display: 'flex',
      justifyContent: 'space-between',
      alignItems: 'center',
      position: 'sticky',
      top: 0,
      zIndex: 100
    }}>
      <Link to="/" style={{ display: 'flex', alignItems: 'center', gap: '10px', textDecoration: 'none', color: '#fff' }}>
        <Shield size={22} color="#a855f7" />
        <span style={{ fontSize: '16px', fontWeight: '600', letterSpacing: '-0.3px' }}>
          Identity Vault
        </span>
      </Link>

      <div style={{ display: 'flex', gap: '2px' }}>
        {[
          { to: '/', icon: Layers, label: 'Home' },
          { to: '/wallet', icon: UserCircle, label: 'Wallet' },
          { to: '/admin', icon: Building2, label: 'Admin' },
          { to: '/bank', icon: Activity, label: 'Bank' },
          { to: '/research', icon: BookOpen, label: 'Research' },
        ].map(({ to, icon: Icon, label }) => (
          <Link key={to} to={to} className={`nav-link ${location.pathname === to ? 'active' : ''}`}>
            <Icon size={15} style={{ display: 'inline', marginRight: '6px', verticalAlign: 'text-bottom' }}/> {label}
          </Link>
        ))}
      </div>
    </nav>
  );
}

export default function App() {
  const [toast, setToast] = React.useState(null);

  const showToast = (message, type = 'success') => {
    setToast({ message, type });
  };

  return (
    <ToastContext.Provider value={{ showToast }}>
      <BrowserRouter>
        <div style={{ display: 'flex', flexDirection: 'column', minHeight: '100vh' }}>
          <NavBar />
          <main style={{ flex: 1 }}>
            <Routes>
              <Route path="/" element={<Dashboard />} />
              <Route path="/wallet" element={<WalletPortal />} />
              <Route path="/admin" element={<AdminPortal />} />
              <Route path="/bank" element={<BankPortal />} />
              <Route path="/consent" element={<ConsentPortal />} />
              <Route path="/vault" element={<VaultMonitor />} />
              <Route path="/research" element={<ResearchPage />} />
            </Routes>
          </main>
          
          {toast && (
            <Toast 
              message={toast.message} 
              type={toast.type} 
              onClose={() => setToast(null)} 
            />
          )}

          <footer style={{ 
            padding: '48px 40px', 
            borderTop: '1px solid rgba(255,255,255,0.04)', 
            textAlign: 'center',
            marginTop: '80px'
          }}>
            <p style={{ fontSize: '13px', color: '#52525b' }}>
              Digital Identity Vault · Privacy-Preserving Credential Network
            </p>
            <p style={{ fontSize: '11px', color: '#3f3f46', marginTop: '8px' }}>
              Built with W3C VCs, Ed25519 Signatures & Zero-Knowledge Proofs
            </p>
          </footer>
        </div>
      </BrowserRouter>
    </ToastContext.Provider>
  );
}