import React, { useState } from 'react';
import { ShieldAlert, CheckCircle2 } from 'lucide-react';

const API = "http://127.0.0.1:8000";

export default function ConsentPortal() {
  const [requestId, setRequestId] = useState("");
  const [code, setCode] = useState("");
  const [status, setStatus] = useState(null);

  const handleApprove = async () => {
    try {
      const res = await fetch(`${API}/approve_request`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ request_id: requestId, code })
      });
      const data = await res.json();
      setStatus(data);
    } catch (e) {
      console.error(e);
    }
  };

  const handleDeny = async () => {
    try {
      const res = await fetch(`${API}/consent/deny`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ consent_id: requestId })
      });
      const data = await res.json();
      setStatus(data);
    } catch (e) {
      console.error(e);
    }
  };

  return (
    <div style={{ padding: '60px', maxWidth: '600px', margin: '0 auto' }} className="animate-fade-in">
      <div className="glass-panel" style={{ textAlign: 'center' }}>
        <ShieldAlert size={48} color="#f59e0b" style={{ margin: '0 auto 20px' }} />
        <h1 style={{ fontSize: '32px' }}>Independent Consent</h1>
        <p style={{ marginBottom: '30px' }}>Approve or deny a verification request using your OTP.</p>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          <input 
            type="text" 
            placeholder="Consent Request ID" 
            value={requestId}
            onChange={(e) => setRequestId(e.target.value)}
          />
          <input 
            type="text" 
            placeholder="6-Digit OTP" 
            value={code}
            onChange={(e) => setCode(e.target.value)}
          />
          
          <div style={{ display: 'flex', gap: '16px', marginTop: '10px' }}>
            <button className="btn-success" style={{ flex: 1 }} onClick={handleApprove}>
              Approve
            </button>
            <button className="btn-danger" style={{ flex: 1 }} onClick={handleDeny}>
              Deny
            </button>
          </div>
        </div>

        {status && (
          <div style={{ marginTop: '30px', padding: '16px', borderRadius: '12px', background: status.approved ? 'rgba(34,197,94,0.1)' : 'rgba(239,68,68,0.1)' }}>
            <h3 style={{ color: status.approved ? '#4ade80' : '#f87171' }}>
              {status.approved ? '✓ Request Approved' : '✗ ' + (status.reason || 'Request Denied')}
            </h3>
          </div>
        )}
      </div>
    </div>
  );
}
