import React, { useState, useEffect } from 'react';
import { ShieldAlert, CheckCircle, XOctagon } from 'lucide-react';

const API = "http://127.0.0.1:8000";

export default function AdminPortal() {
  const [revocationList, setRevocationList] = useState([]);
  const [credentialId, setCredentialId] = useState("");
  const [reason, setReason] = useState("COMPROMISED");
  
  const [approveStatus, setApproveStatus] = useState(null);

  const [pendingCredentials, setPendingCredentials] = useState([]);

  useEffect(() => {
    fetchRevocations();
    fetchPendingCredentials();
  }, []);

  const fetchPendingCredentials = async () => {
    try {
      const res = await fetch(`${API}/admin/pending_credentials`);
      const data = await res.json();
      if (data.pending) setPendingCredentials(data.pending);
    } catch (e) {
      console.error(e);
    }
  };

  const fetchRevocations = async () => {
    try {
      const res = await fetch(`${API}/revocation/list`);
      const data = await res.json();
      if (data.registry) setRevocationList(data.registry);
    } catch (e) {
      console.error(e);
    }
  };

  const handleApprove = async (credId, userId) => {
    try {
      const res = await fetch(`${API}/admin/approve`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ user_id: userId, credential_id: credId, officer_id: "gov001" })
      });
      const data = await res.json();
      setApproveStatus(data);
      fetchPendingCredentials();
    } catch (e) {
      console.error(e);
    }
  };

  const handleReject = async (credId) => {
    const reason = prompt("Enter rejection reason:", "Data mismatch");
    if (!reason) return;
    try {
      const res = await fetch(`${API}/admin/reject`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ credential_id: credId, reason, officer_id: "gov001" })
      });
      const data = await res.json();
      setApproveStatus({ rejected: true, data });
      fetchPendingCredentials();
    } catch (e) {
      console.error(e);
    }
  };

  const handleRevoke = async () => {
    if (!credentialId) return;
    
    try {
      await fetch(`${API}/admin/revoke_credential`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ credential_id: credentialId, reason, officer_id: "gov001" })
      });
      setCredentialId("");
      fetchRevocations();
    } catch (e) {
      console.error(e);
    }
  };

  return (
    <div style={{ padding: '40px', maxWidth: '1200px', margin: '0 auto' }} className="animate-fade-in">
      <div style={{ marginBottom: '40px' }}>
        <h1 style={{ background: 'linear-gradient(to right, #4ade80, #38bdf8)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
          Government Administration
        </h1>
        <p>Issue W3C Verifiable Credentials and manage the Revocation Registry.</p>
      </div>

      <div className="grid-2">
        <div className="glass-panel" style={{ borderTop: '4px solid #4ade80' }}>
          <h2>Credential Issuance</h2>
          <p style={{ marginBottom: '20px' }}>Approve or reject pending validations.</p>
          
          {pendingCredentials.length === 0 ? (
            <p style={{ color: 'var(--text-muted)' }}>No pending credentials in queue.</p>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              {pendingCredentials.map(cred => (
                <div key={cred.id} style={{ background: 'rgba(0,0,0,0.3)', padding: '16px', borderRadius: '12px', border: '1px solid rgba(255,255,255,0.05)' }}>
                  <div className="flex-between" style={{ marginBottom: '8px' }}>
                    <strong>{cred.user_name}</strong> <span className="badge pending">PENDING</span>
                  </div>
                  <div style={{ fontSize: '13px', color: 'var(--text-muted)', marginBottom: '12px' }}>
                    User ID: {cred.user_id} <br/>
                    Source: {cred.source} <br/>
                    Age &gt; 18: {cred.attributes?.age_over_18 ? 'Yes' : 'No'} | Addr: {cred.attributes?.address_verified ? 'Yes' : 'No'}
                  </div>
                  <div style={{ display: 'flex', gap: '8px' }}>
                    <button className="btn-success" style={{ padding: '8px 16px', fontSize: '13px' }} onClick={() => handleApprove(cred.id, cred.user_id)}>
                      Approve (Ed25519)
                    </button>
                    <button className="btn-danger" style={{ padding: '8px 16px', fontSize: '13px' }} onClick={() => handleReject(cred.id)}>
                      Reject
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}

          {approveStatus && (
            <div style={{ marginTop: '24px', background: 'rgba(0,0,0,0.3)', padding: '16px', borderRadius: '12px' }}>
              {approveStatus.error ? (
                <p style={{ color: '#ef4444' }}>{approveStatus.error}</p>
              ) : approveStatus.rejected ? (
                <>
                  <h3 style={{ color: '#ef4444', marginBottom: '8px' }}>✗ Credential Rejected</h3>
                  <p style={{ fontSize: '13px', color: 'var(--text-muted)' }}>Reason: {approveStatus.data.reason}</p>
                </>
              ) : (
                <>
                  <h3 style={{ color: '#4ade80', marginBottom: '8px' }}>✓ VC Issued Successfully</h3>
                  <p style={{ fontSize: '12px', color: 'var(--text-muted)' }}>ID: {approveStatus.credential_id}</p>
                  <pre style={{ marginTop: '12px', maxHeight: '200px', overflowY: 'auto' }}>
                    {JSON.stringify(approveStatus.vc, null, 2)}
                  </pre>
                </>
              )}
            </div>
          )}
        </div>

        <div className="glass-panel" style={{ borderTop: '4px solid #ef4444' }}>
          <h2>Revocation Registry (CRL)</h2>
          <p style={{ marginBottom: '20px' }}>Revoke compromised credentials to prevent verification.</p>
          
          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', marginBottom: '24px' }}>
            <input 
              type="text" 
              placeholder="Credential ID" 
              value={credentialId}
              onChange={(e) => setCredentialId(e.target.value)}
            />
            <select value={reason} onChange={(e) => setReason(e.target.value)}>
              <option value="COMPROMISED">Compromised</option>
              <option value="EXPIRED">Expired</option>
              <option value="USER_REQUEST">User Request</option>
            </select>
            <button className="btn-danger" onClick={handleRevoke}>
              <XOctagon size={18} style={{ display: 'inline', marginRight: '8px', verticalAlign: 'text-bottom' }} />
              Revoke Credential
            </button>
          </div>

          <h3 style={{ fontSize: '16px', marginBottom: '12px' }}>Registry Entries</h3>
          {revocationList.length === 0 ? (
            <p style={{ fontSize: '14px', color: 'var(--text-muted)' }}>No revoked credentials.</p>
          ) : (
            <div style={{ maxHeight: '250px', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '8px' }}>
              {revocationList.map(r => (
                <div key={r.credential_id} style={{ background: 'rgba(239,68,68,0.1)', padding: '12px', borderRadius: '8px', border: '1px solid rgba(239,68,68,0.3)', fontSize: '13px' }}>
                  <div className="flex-between">
                    <strong style={{ color: '#f87171' }}>{r.credential_id.substring(0, 8)}...</strong>
                    <span className="badge revoked">{r.reason}</span>
                  </div>
                  <div style={{ marginTop: '4px', color: 'var(--text-muted)' }}>
                    By: {r.revoked_by} | {new Date(r.revoked_at).toLocaleDateString()}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
