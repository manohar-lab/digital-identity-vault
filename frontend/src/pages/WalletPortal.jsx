import React, { useState, useEffect } from 'react';
import { Upload, Bell, Shield, Clock, XCircle, CheckCircle2 } from 'lucide-react';

const API = "http://127.0.0.1:8000";

// Hardcoded for demo purposes
const USER_ID = "u1"; 

const CredentialCard = ({ c }) => {
  const [isExpanded, setIsExpanded] = useState(false);
  return (
    <div 
      onClick={() => setIsExpanded(!isExpanded)}
      style={{ 
        background: 'rgba(15, 23, 42, 0.4)', 
        padding: '24px', 
        borderRadius: '20px', 
        border: '1px solid var(--panel-border)',
        cursor: 'pointer',
        transition: 'all 0.3s ease'
      }}
      className="hover-glow"
    >
      <div className="flex-between" style={{ marginBottom: isExpanded ? '20px' : '0' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <div style={{ background: c.status === 'active' ? 'rgba(16, 185, 129, 0.1)' : 'rgba(245, 158, 11, 0.1)', padding: '10px', borderRadius: '12px' }}>
            <Shield size={20} color={c.status === 'active' ? '#10b981' : '#f59e0b'} />
          </div>
          <div>
            <h3 style={{ fontSize: '16px', margin: 0 }}>Identity Credential</h3>
            <p style={{ fontSize: '12px', margin: 0 }}>{c.id.substring(0, 18)}...</p>
          </div>
        </div>
        <span className={`badge ${c.status}`}>{c.status.toUpperCase()}</span>
      </div>

      {isExpanded && (
        <div style={{ marginTop: '20px', borderTop: '1px solid rgba(255,255,255,0.05)', paddingTop: '20px' }} className="animate-fade-in">
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginBottom: '20px', fontSize: '13px' }}>
            <div>
              <p style={{ fontSize: '11px', textTransform: 'uppercase', letterSpacing: '1px' }}>Issuer</p>
              <strong style={{ color: 'white' }}>{c.issuer || 'Government Authority'}</strong>
            </div>
            <div>
              <p style={{ fontSize: '11px', textTransform: 'uppercase', letterSpacing: '1px' }}>Issued On</p>
              <strong style={{ color: 'white' }}>{c.issued_at ? new Date(c.issued_at).toLocaleDateString() : 'Pending'}</strong>
            </div>
          </div>
          
          <p style={{ fontSize: '11px', textTransform: 'uppercase', letterSpacing: '1px', marginBottom: '8px' }}>Verifiable Credential (JSON)</p>
          <pre style={{ maxHeight: '200px', fontSize: '11px' }}>
            {JSON.stringify(c.vc_json, null, 2)}
          </pre>
        </div>
      )}
    </div>
  );
};

export default function WalletPortal() {
  const [activeTab, setActiveTab] = useState('credentials');
  
  const [file, setFile] = useState(null);
  const [uploadResult, setUploadResult] = useState(null);
  const [isUploading, setIsUploading] = useState(false);

  const [credentials, setCredentials] = useState([]);
  const [pendingRequests, setPendingRequests] = useState([]);
  const [history, setHistory] = useState([]);

  useEffect(() => {
    fetchData();
    const interval = setInterval(fetchData, 5000); // Poll for new requests
    return () => clearInterval(interval);
  }, []);

  const fetchData = async () => {
    try {
      // Fetch credentials
      const credRes = await fetch(`${API}/credentials/${USER_ID}`);
      const credData = await credRes.json();
      if (credData.credentials) setCredentials(credData.credentials);

      // Fetch pending requests
      const reqRes = await fetch(`${API}/consent/pending/${USER_ID}`);
      const reqData = await reqRes.json();
      if (reqData.pending) setPendingRequests(reqData.pending);

      // Fetch history
      const histRes = await fetch(`${API}/access_history/${USER_ID}`);
      const histData = await histRes.json();
      if (histData.history) setHistory(histData.history);
    } catch (e) {
      console.error(e);
    }
  };

  const handleUpload = async () => {
    if (!file) return;
    setIsUploading(true);
    
    const formData = new FormData();
    formData.append("file", file);

    try {
      const res = await fetch(`${API}/upload_aadhaar?user_id=${USER_ID}`, {
        method: "POST",
        body: formData
      });
      const data = await res.json();
      setUploadResult(data);
      fetchData();
    } catch (e) {
      console.error(e);
    } finally {
      setIsUploading(false);
    }
  };

  const handleConsent = async (id, action, code = "123456") => {
    try {
      if (action === 'approve') {
        const otp = prompt("Enter the OTP sent to your phone (or console):", "");
        if(!otp) return;
        
        await fetch(`${API}/approve_request`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ request_id: id, code: otp })
        });
      } else {
        await fetch(`${API}/consent/deny`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ consent_id: id })
        });
      }
      fetchData();
    } catch (e) {
      console.error(e);
    }
  };

  return (
    <div style={{ padding: '40px', maxWidth: '1200px', margin: '0 auto' }} className="animate-fade-in">
      <div className="flex-between" style={{ marginBottom: '40px' }}>
        <div>
          <h1>Identity Wallet</h1>
          <p>Manage your verifiable credentials and privacy settings</p>
        </div>
        <div style={{ display: 'flex', gap: '16px', background: 'rgba(255,255,255,0.05)', padding: '6px', borderRadius: '16px' }}>
          <button 
            className={`btn-primary`} 
            style={{ background: activeTab === 'credentials' ? 'var(--primary-glow)' : 'transparent', color: 'white', boxShadow: 'none' }}
            onClick={() => setActiveTab('credentials')}
          >
            Credentials
          </button>
          <button 
            className={`btn-primary`} 
            style={{ background: activeTab === 'requests' ? 'var(--primary-glow)' : 'transparent', color: 'white', boxShadow: 'none', position: 'relative' }}
            onClick={() => setActiveTab('requests')}
          >
            Requests
            {pendingRequests.length > 0 && (
              <span style={{ position: 'absolute', top: '-5px', right: '-5px', background: '#ef4444', width: '20px', height: '20px', borderRadius: '50%', fontSize: '12px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                {pendingRequests.length}
              </span>
            )}
          </button>
          <button 
            className={`btn-primary`} 
            style={{ background: activeTab === 'history' ? 'var(--primary-glow)' : 'transparent', color: 'white', boxShadow: 'none' }}
            onClick={() => setActiveTab('history')}
          >
            History
          </button>
        </div>
      </div>

      {activeTab === 'credentials' && (
        <div className="grid-2">
          <div>
            <div className="glass-panel" style={{ marginBottom: '24px', background: 'linear-gradient(135deg, rgba(168, 85, 247, 0.06) 0%, rgba(10, 10, 10, 0.8) 100%)', border: '1px solid rgba(168, 85, 247, 0.15)' }}>
              <div className="flex-between" style={{ marginBottom: '32px' }}>
                <Shield size={28} color="#a855f7" />
                <span style={{ fontSize: '11px', fontWeight: '600', letterSpacing: '0.1em', color: '#52525b' }}>DID: {USER_ID.toUpperCase()}</span>
              </div>
              <div style={{ display: 'flex', gap: '24px', alignItems: 'center' }}>
                <div style={{ background: '#fff', padding: '8px', borderRadius: '12px', width: '120px', height: '120px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <img src={`https://api.qrserver.com/v1/create-qr-code/?size=100x100&data=did:vault:${USER_ID}&color=020617`} alt="DID QR" style={{ width: '100px', height: '100px' }} />
                </div>
                <div>
                  <h2 style={{ marginBottom: '4px', fontSize: '22px' }}>Digital Resident</h2>
                  <p style={{ color: '#a855f7', fontWeight: '600', fontSize: '12px', marginBottom: '12px', letterSpacing: '0.1em' }}>VERIFIED IDENTITY</p>
                  <div style={{ display: 'flex', gap: '8px' }}>
                    <span className="badge active">Level 3</span>
                    <span className="badge active">ZKP Ready</span>
                  </div>
                </div>
              </div>
            </div>

            <div className="glass-panel">
              <h2>Add Credential</h2>
              <div style={{ border: '2px dashed var(--panel-border)', borderRadius: '16px', padding: '40px', textAlign: 'center' }}>
                <Upload size={48} color="var(--text-muted)" style={{ marginBottom: '20px' }} />
                <h3 style={{ marginBottom: '10px' }}>Upload Aadhaar (Image/QR)</h3>
                <p style={{ marginBottom: '20px', fontSize: '14px' }}>Our engine decodes Secure QR first, then falls back to OCR.</p>
                <input type="file" onChange={(e) => setFile(e.target.files[0])} style={{ marginBottom: '20px' }} />
                <button className="btn-primary" onClick={handleUpload} disabled={isUploading || !file}>
                  {isUploading ? 'Processing...' : 'Upload & Verify'}
                </button>
              </div>

              {uploadResult && (
                <div style={{ marginTop: '20px', background: 'rgba(34,197,94,0.1)', padding: '20px', borderRadius: '12px', border: '1px solid rgba(34,197,94,0.3)' }}>
                  <h4 style={{ color: '#4ade80', marginBottom: '10px' }}>✓ Extraction Successful</h4>
                  <p>Name: {uploadResult.extracted.name}</p>
                  <p>Source: {uploadResult.extracted.source}</p>
                  <p>Status: Pending Government Approval</p>
                </div>
              )}
            </div>
          </div>

          <div className="glass-panel">
            <h2>My Vault</h2>
            {credentials.length === 0 ? (
              <p>No credentials found. Upload a document to begin.</p>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                {credentials.map(c => <CredentialCard key={c.id} c={c} />)}
              </div>
            )}
          </div>
        </div>
      )}

      {activeTab === 'requests' && (
        <div className="glass-panel">
          <h2>Pending Consent Requests</h2>
          {pendingRequests.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '60px 0', color: 'var(--text-muted)' }}>
              <Bell size={48} style={{ opacity: 0.5, marginBottom: '20px' }} />
              <p>No pending requests.</p>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              {pendingRequests.map(r => (
                <div key={r.id} style={{ background: 'rgba(0,0,0,0.3)', padding: '24px', borderRadius: '16px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div>
                    <h3 style={{ marginBottom: '8px' }}>{r.bank}</h3>
                    <p>Requests verification of: <strong style={{ color: 'white' }}>{r.attribute}</strong></p>
                    <div style={{ marginTop: '12px', display: 'inline-block', background: 'rgba(168, 85, 247, 0.08)', padding: '6px 14px', borderRadius: '8px', border: '1px solid rgba(168, 85, 247, 0.15)' }}>
                      <span style={{ fontSize: '11px', color: '#71717a', marginRight: '8px' }}>CODE:</span>
                      <strong style={{ letterSpacing: '3px', color: '#a855f7', fontFamily: 'JetBrains Mono, monospace' }}>{r.approval_code}</strong>
                    </div>
                    <p style={{ fontSize: '11px', marginTop: '12px', opacity: 0.6 }}>Expires: {new Date(r.expires_at).toLocaleTimeString()}</p>
                  </div>
                  <div style={{ display: 'flex', gap: '12px' }}>
                    <button className="btn-success" onClick={() => handleConsent(r.id, 'approve')}>
                      <CheckCircle2 size={16} style={{ display: 'inline', marginRight: '6px', verticalAlign: 'text-bottom' }} /> Approve
                    </button>
                    <button className="btn-danger" onClick={() => handleConsent(r.id, 'deny')}>
                      <XCircle size={16} style={{ display: 'inline', marginRight: '6px', verticalAlign: 'text-bottom' }} /> Deny
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {activeTab === 'history' && (
        <div className="glass-panel">
          <h2>Access History</h2>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            {history.map((h, i) => (
              <div key={i} style={{ display: 'flex', alignItems: 'center', gap: '16px', padding: '16px', background: 'rgba(0,0,0,0.2)', borderRadius: '12px' }}>
                <Clock size={20} color="var(--text-muted)" />
                <div style={{ flex: 1 }}>
                  <strong>{h.actor}</strong> {h.event.replace(/_/g, ' ')}
                  <p style={{ fontSize: '13px', color: 'var(--text-muted)', marginTop: '4px' }}>{h.detail}</p>
                </div>
                <div style={{ fontSize: '12px', color: 'var(--text-muted)' }}>
                  {new Date(h.timestamp).toLocaleString()}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
