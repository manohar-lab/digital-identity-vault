import React from 'react';
import { BrowserRouter, Routes, Route, Link, useLocation } from 'react-router-dom';
import { Layers, Shield, Building2, UserCircle, Activity, BookOpen } from 'lucide-react';

import Dashboard from './pages/Dashboard';
import WalletPortal from './pages/WalletPortal';
import AdminPortal from './pages/AdminPortal';
import BankPortal from './pages/BankPortal';
import ConsentPortal from './pages/ConsentPortal';
import VaultMonitor from './pages/VaultMonitor';
import ResearchPage from './pages/ResearchPage';

function NavBar() {
  const location = useLocation();
  
  return (
    <nav style={{
      background: 'rgba(2, 6, 23, 0.8)',
      backdropFilter: 'blur(12px)',
      borderBottom: '1px solid rgba(255,255,255,0.1)',
      padding: '16px 40px',
      display: 'flex',
      justifyContent: 'space-between',
      alignItems: 'center',
      position: 'sticky',
      top: 0,
      zIndex: 100
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
        <Shield size={28} color="#38bdf8" />
        <span style={{ fontSize: '20px', fontWeight: 'bold', letterSpacing: '-0.5px' }}>
          Identity Vault
        </span>
      </div>

      <div style={{ display: 'flex', gap: '8px' }}>
        <Link to="/" className={`nav-link ${location.pathname === '/' ? 'active' : ''}`}>
          <Layers size={18} style={{ display: 'inline', marginRight: '6px', verticalAlign: 'text-bottom' }}/> Home
        </Link>
        <Link to="/wallet" className={`nav-link ${location.pathname === '/wallet' ? 'active' : ''}`}>
          <UserCircle size={18} style={{ display: 'inline', marginRight: '6px', verticalAlign: 'text-bottom' }}/> Wallet
        </Link>
        <Link to="/admin" className={`nav-link ${location.pathname === '/admin' ? 'active' : ''}`}>
          <Building2 size={18} style={{ display: 'inline', marginRight: '6px', verticalAlign: 'text-bottom' }}/> Gov Admin
        </Link>
        <Link to="/bank" className={`nav-link ${location.pathname === '/bank' ? 'active' : ''}`}>
          <Activity size={18} style={{ display: 'inline', marginRight: '6px', verticalAlign: 'text-bottom' }}/> Bank
        </Link>
        <Link to="/research" className={`nav-link ${location.pathname === '/research' ? 'active' : ''}`}>
          <BookOpen size={18} style={{ display: 'inline', marginRight: '6px', verticalAlign: 'text-bottom' }}/> Research
        </Link>
      </div>
    </nav>
  );
}

export default function App() {
  return (
    <BrowserRouter>
      <NavBar />
      <Routes>
        <Route path="/" element={<Dashboard />} />
        <Route path="/wallet" element={<WalletPortal />} />
        <Route path="/admin" element={<AdminPortal />} />
        <Route path="/bank" element={<BankPortal />} />
        <Route path="/consent" element={<ConsentPortal />} />
        <Route path="/vault" element={<VaultMonitor />} />
        <Route path="/research" element={<ResearchPage />} />
      </Routes>
    </BrowserRouter>
  );
}