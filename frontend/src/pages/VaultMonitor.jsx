import React, { useState, useEffect } from 'react';
import { Activity, Shield } from 'lucide-react';

const API = "http://127.0.0.1:8000";

export default function VaultMonitor() {
  const [logs, setLogs] = useState([]);

  useEffect(() => {
    fetchLogs();
    const interval = setInterval(fetchLogs, 5000);
    return () => clearInterval(interval);
  }, []);

  const fetchLogs = async () => {
    try {
      const res = await fetch(`${API}/audit_logs`);
      const data = await res.json();
      if (data.logs) setLogs(data.logs);
    } catch (e) {
      console.error(e);
    }
  };

  return (
    <div style={{ padding: '40px', maxWidth: '1200px', margin: '0 auto' }} className="animate-fade-in">
      <div className="flex-between" style={{ marginBottom: '40px' }}>
        <div>
          <h1>
            System Audit Monitor
          </h1>
          <p>Immutable ledger of all cryptographic operations and threat mitigations.</p>
        </div>
        <div style={{ background: 'rgba(168, 85, 247, 0.08)', padding: '10px 18px', borderRadius: '10px', border: '1px solid rgba(168, 85, 247, 0.15)', display: 'flex', alignItems: 'center', gap: '10px' }}>
          <div style={{ width: '6px', height: '6px', borderRadius: '50%', background: '#a855f7', animation: 'pulse-glow 2s infinite' }} />
          <span style={{ color: '#a855f7', fontSize: '13px', fontWeight: '600' }}>Live</span>
        </div>
      </div>

      <div className="glass-panel" style={{ padding: 0, overflow: 'hidden' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '14px' }}>
          <thead>
            <tr style={{ background: 'rgba(255,255,255,0.05)', textAlign: 'left' }}>
              <th style={{ padding: '16px' }}>Timestamp</th>
              <th style={{ padding: '16px' }}>Event</th>
              <th style={{ padding: '16px' }}>Actor</th>
              <th style={{ padding: '16px' }}>Target</th>
              <th style={{ padding: '16px' }}>Details</th>
            </tr>
          </thead>
          <tbody>
            {logs.length === 0 ? (
              <tr>
                <td colSpan="5" style={{ padding: '40px', textAlign: 'center', color: 'var(--text-muted)' }}>
                  No audit logs found.
                </td>
              </tr>
            ) : (
              logs.map(log => (
                <tr key={log.id} style={{ borderBottom: '1px solid var(--panel-border)' }}>
                  <td style={{ padding: '16px', color: 'var(--text-muted)' }}>
                    {new Date(log.timestamp).toLocaleTimeString()}
                  </td>
                  <td style={{ padding: '16px' }}>
                    <span className={`badge ${log.event.includes('THREAT') || log.event.includes('REVOKE') ? 'revoked' : log.event.includes('APPROVE') ? 'active' : 'pending'}`}>
                      {log.event.replace(/_/g, ' ')}
                    </span>
                  </td>
                  <td style={{ padding: '16px', fontFamily: 'monospace', color: '#a5b4fc' }}>{log.actor}</td>
                  <td style={{ padding: '16px', fontFamily: 'monospace' }}>{log.target}</td>
                  <td style={{ padding: '16px', color: 'var(--text-muted)', maxWidth: '300px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {log.detail}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
