import React, { useState, useEffect } from 'react';
import { ShieldCheck, Fingerprint, Activity, Clock, ArrowUpRight } from 'lucide-react';
import { Link } from 'react-router-dom';

const API = "http://127.0.0.1:8000";

export default function Dashboard() {
  const [stats, setStats] = useState({
    active_credentials: 0,
    total_consents: 0,
    total_users: 0
  });
  const [recentLogs, setRecentLogs] = useState([]);

  useEffect(() => {
    fetch(`${API}/metrics`)
      .then(res => res.json())
      .then(data => {
        if(data.system) setStats(data.system);
      })
      .catch(err => console.log(err));

    fetch(`${API}/audit_logs`)
      .then(res => res.json())
      .then(data => {
        if(data.logs) setRecentLogs(data.logs.slice(0, 6));
      })
      .catch(err => console.log(err));
  }, []);

  return (
    <div style={{ padding: '60px 40px', maxWidth: '1100px', margin: '0 auto' }} className="animate-fade-in">
      
      {/* Hero */}
      <div style={{ marginBottom: '80px', paddingTop: '40px' }}>
        <p style={{ color: '#a855f7', fontSize: '13px', fontWeight: '600', letterSpacing: '0.1em', textTransform: 'uppercase', marginBottom: '16px' }}>
          Privacy-First Identity Network
        </p>
        <h1 style={{ fontSize: '56px', lineHeight: '1.1', marginBottom: '20px', maxWidth: '700px' }}>
          Prove who you are. <br/>
          <span className="text-gradient">Share nothing else.</span>
        </h1>
        <p style={{ fontSize: '17px', maxWidth: '550px', color: '#71717a', lineHeight: '1.7' }}>
          Zero-knowledge credential verification powered by W3C standards, Ed25519 signatures, and HMAC-commitment proofs.
        </p>
      </div>

      {/* Stats */}
      <div className="grid-3" style={{ marginBottom: '64px' }}>
        {[
          { label: 'Active Credentials', value: stats.active_credentials, icon: ShieldCheck, color: '#22c55e' },
          { label: 'Registered DIDs', value: stats.total_users, icon: Fingerprint, color: '#a855f7' },
          { label: 'Verified Consents', value: stats.total_consents, icon: Activity, color: '#eab308' },
        ].map(({ label, value, icon: Icon, color }) => (
          <div key={label} className="glass-panel" style={{ padding: '28px' }}>
            <div className="flex-between" style={{ marginBottom: '24px' }}>
              <Icon size={20} color={color} />
              <span style={{ fontSize: '11px', color: '#52525b', fontWeight: '500', textTransform: 'uppercase', letterSpacing: '0.08em' }}>{label}</span>
            </div>
            <h2 style={{ fontSize: '36px', fontWeight: '700', marginBottom: '0' }}>{value}</h2>
          </div>
        ))}
      </div>

      {/* Two-column: Activity + Quick Links */}
      <div className="grid-2" style={{ gap: '32px' }}>
        
        {/* Activity */}
        <div>
          <div className="flex-between" style={{ marginBottom: '20px' }}>
            <h2 style={{ marginBottom: '0', fontSize: '16px', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <Clock size={16} color="#71717a" /> Recent Activity
            </h2>
            <Link to="/vault" style={{ color: '#71717a', fontSize: '13px', textDecoration: 'none' }}>
              View all →
            </Link>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1px', background: 'rgba(255,255,255,0.04)', borderRadius: '16px', overflow: 'hidden', border: '1px solid rgba(255,255,255,0.06)' }}>
            {recentLogs.length === 0 ? (
              <div style={{ padding: '40px', textAlign: 'center', color: '#52525b', fontSize: '14px' }}>
                No activity yet.
              </div>
            ) : recentLogs.map((log, i) => (
              <div key={i} style={{ padding: '14px 20px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: '#0a0a0a' }}>
                <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
                  <div style={{ width: '6px', height: '6px', borderRadius: '50%', background: log.event.includes('THREAT') ? '#ef4444' : log.event.includes('APPROVE') ? '#22c55e' : '#3f3f46', flexShrink: 0 }} />
                  <span style={{ fontSize: '13px', color: '#d4d4d8' }}>{log.event.replace(/_/g, ' ')}</span>
                </div>
                <span style={{ fontSize: '11px', color: '#52525b', flexShrink: 0 }}>{new Date(log.timestamp).toLocaleTimeString()}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Quick Links */}
        <div>
          <h2 style={{ marginBottom: '20px', fontSize: '16px' }}>Quick Access</h2>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            {[
              { to: '/wallet', label: 'Identity Wallet', desc: 'Upload documents, manage credentials', color: '#a855f7' },
              { to: '/bank', label: 'Relying Party', desc: 'Request & verify ZK proofs', color: '#ec4899' },
              { to: '/admin', label: 'Gov Administration', desc: 'Issue credentials, manage CRL', color: '#22c55e' },
              { to: '/research', label: 'Architecture', desc: 'Threat models & performance data', color: '#eab308' },
            ].map(({ to, label, desc, color }) => (
              <Link key={to} to={to} style={{ textDecoration: 'none' }}>
                <div className="glass-panel" style={{ padding: '20px 24px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
                    <div style={{ width: '8px', height: '8px', borderRadius: '2px', background: color }} />
                    <div>
                      <p style={{ fontSize: '14px', color: '#fff', fontWeight: '500', marginBottom: '2px' }}>{label}</p>
                      <p style={{ fontSize: '12px', color: '#52525b', margin: 0 }}>{desc}</p>
                    </div>
                  </div>
                  <ArrowUpRight size={16} color="#3f3f46" />
                </div>
              </Link>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
