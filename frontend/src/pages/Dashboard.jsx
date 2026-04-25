import React, { useState, useEffect } from 'react';
import { ArrowRight, ShieldCheck, Fingerprint, Activity, Clock } from 'lucide-react';
import { Link } from 'react-router-dom';

const API = "http://127.0.0.1:8000";

export default function Dashboard() {
  const [stats, setStats] = useState({
    active_credentials: 0,
    total_consents: 0,
    total_users: 0
  });

  useEffect(() => {
    fetch(`${API}/metrics`)
      .then(res => res.json())
      .then(data => {
        if(data.system) {
          setStats(data.system);
        }
      })
      .catch(err => console.log(err));
  }, []);

  return (
    <div style={{ padding: '60px 40px', maxWidth: '1200px', margin: '0 auto' }} className="animate-fade-in">
      
      <div style={{ textAlign: 'center', marginBottom: '60px' }}>
        <h1 style={{ fontSize: '64px', marginBottom: '24px' }}>
          The Future of <span className="text-gradient">Digital Identity</span>
        </h1>
        <p style={{ fontSize: '20px', maxWidth: '700px', margin: '0 auto', opacity: 0.8 }}>
          A privacy-preserving, zero-knowledge credential network. 
          Share proofs, not your raw data. Protected against replay attacks and unauthorized access.
        </p>
      </div>

      <div className="grid-3">
        <div className="glass-panel" style={{ textAlign: 'center' }}>
          <ShieldCheck size={48} color="#4ade80" style={{ marginBottom: '20px' }}/>
          <h2>{stats.active_credentials}</h2>
          <p>Active Credentials</p>
        </div>

        <div className="glass-panel" style={{ textAlign: 'center' }}>
          <Fingerprint size={48} color="#38bdf8" style={{ marginBottom: '20px' }}/>
          <h2>{stats.total_users}</h2>
          <p>Registered Identities</p>
        </div>

        <div className="glass-panel" style={{ textAlign: 'center' }}>
          <Activity size={48} color="#f59e0b" style={{ marginBottom: '20px' }}/>
          <h2>{stats.total_consents}</h2>
          <p>Verified Consents</p>
        </div>
      </div>

      <div style={{ marginTop: '60px' }}>
        <h2 style={{ marginBottom: '30px' }}>Explore the Network</h2>
        
        <div className="grid-2">
          <Link to="/wallet" style={{ textDecoration: 'none' }}>
            <div className="glass-panel">
              <h3 style={{ fontSize: '20px', color: 'white', marginBottom: '12px', display: 'flex', alignItems: 'center', gap: '10px' }}>
                <UserCircle color="#818cf8"/> User Wallet
              </h3>
              <p>Upload your Aadhaar, view your credentials, and manage consent requests.</p>
            </div>
          </Link>

          <Link to="/admin" style={{ textDecoration: 'none' }}>
            <div className="glass-panel">
              <h3 style={{ fontSize: '20px', color: 'white', marginBottom: '12px', display: 'flex', alignItems: 'center', gap: '10px' }}>
                <Building2 color="#f87171"/> Gov Admin
              </h3>
              <p>Approve credentials and manage the revocation registry.</p>
            </div>
          </Link>

          <Link to="/bank" style={{ textDecoration: 'none' }}>
            <div className="glass-panel">
              <h3 style={{ fontSize: '20px', color: 'white', marginBottom: '12px', display: 'flex', alignItems: 'center', gap: '10px' }}>
                <BuildingLibrary color="#fbbf24"/> Relying Party (Bank)
              </h3>
              <p>Request selective disclosure proofs and verify signatures.</p>
            </div>
          </Link>

          <Link to="/research" style={{ textDecoration: 'none' }}>
            <div className="glass-panel">
              <h3 style={{ fontSize: '20px', color: 'white', marginBottom: '12px', display: 'flex', alignItems: 'center', gap: '10px' }}>
                <BookOpen color="#34d399"/> Architecture & Research
              </h3>
              <p>View ZK concepts, sequence diagrams, and threat models.</p>
            </div>
          </Link>
        </div>
      </div>
    </div>
  );
}

// Temporary icon fallbacks for dashboard
const UserCircle = ({color}) => <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M19 21v-2a4 4 0 0 0-4-4H9a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>
const Building2 = ({color}) => <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M6 22V4a2 2 0 0 1 2-2h8a2 2 0 0 1 2 2v18Z"/><path d="M6 12H4a2 2 0 0 0-2 2v6a2 2 0 0 0 2 2h2"/><path d="M18 9h2a2 2 0 0 1 2 2v9a2 2 0 0 1-2 2h-2"/><path d="M10 6h4"/><path d="M10 10h4"/><path d="M10 14h4"/><path d="M10 18h4"/></svg>
const BuildingLibrary = ({color}) => <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 21h18"/><path d="M3 7v1a3 3 0 0 0 3 3h12a3 3 0 0 0 3-3V7"/><path d="m3 7 9-4 9 4"/><path d="M8 11v10"/><path d="M16 11v10"/></svg>
const BookOpen = ({color}) => <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2z"/><path d="M22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z"/></svg>
