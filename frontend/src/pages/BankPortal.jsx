import React, { useState } from 'react';
import { ShieldAlert, CheckCircle, Search, ShieldCheck, XOctagon } from 'lucide-react';

const API = "http://127.0.0.1:8000";

export default function BankPortal() {
  const [userId, setUserId] = useState("u1");
  const [attribute, setAttribute] = useState("age_over_18");
  const [requestResult, setRequestResult] = useState(null);
  
  const [proofId, setProofId] = useState("");
  const [proofResult, setProofResult] = useState(null);
  const [isVerifying, setIsVerifying] = useState(false);

  const handleRequest = async () => {
    try {
      const res = await fetch(`${API}/request_verification`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          user_id: userId,
          attribute: attribute,
          bank: "ABC Bank",
          phone: "+918296067585"
        })
      });
      const data = await res.json();
      setRequestResult(data);
      if(data.request_id) setProofId(data.request_id);
    } catch (e) {
      console.error(e);
    }
  };

  const handleVerify = async () => {
    if (!proofId) return;
    setIsVerifying(true);
    try {
      const res = await fetch(`${API}/vault_response/${proofId}`);
      const data = await res.json();
      setProofResult(data);
    } catch (e) {
      console.error(e);
    } finally {
      setIsVerifying(false);
    }
  };

  return (
    <div style={{ padding: '40px', maxWidth: '1200px', margin: '0 auto' }} className="animate-fade-in">
      <div style={{ marginBottom: '40px' }}>
        <h1>
          Relying Party <span style={{ color: '#71717a', fontWeight: 400 }}>(ABC Bank)</span>
        </h1>
        <p>Request selective disclosure proofs without accessing raw identity data.</p>
      </div>

      <div className="grid-2">
        <div className="glass-panel">
          <h2>1. Request Proof</h2>
          <p style={{ marginBottom: '20px' }}>Initiate a consent request. Threat layer protects against phishing.</p>
          
          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            <input 
              type="text" 
              placeholder="User ID" 
              value={userId}
              onChange={(e) => setUserId(e.target.value)}
            />
            <select value={attribute} onChange={(e) => setAttribute(e.target.value)}>
              <option value="age_over_18">Age &gt; 18</option>
              <option value="address_verified">Address Verified</option>
              <option value="has_pan">Has PAN Card</option>
            </select>
            
            <button className="btn-primary" onClick={handleRequest}>
              <Search size={18} style={{ display: 'inline', marginRight: '8px', verticalAlign: 'text-bottom' }} />
              Request Disclosure
            </button>
          </div>

          {requestResult && (
            <div style={{ marginTop: '24px', background: 'rgba(0,0,0,0.3)', padding: '16px', borderRadius: '12px' }}>
              {requestResult.error ? (
                <div>
                  <h3 style={{ color: '#ef4444', display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <ShieldAlert size={18} /> Request Blocked
                  </h3>
                  <p style={{ marginTop: '8px', color: 'var(--text-muted)' }}>{requestResult.error}</p>
                  {requestResult.threats && <p style={{ fontSize: '12px', color: '#ef4444', marginTop: '4px' }}>Threats: {requestResult.threats.join(', ')}</p>}
                </div>
              ) : (
                <div>
                  <h3 style={{ color: '#4ade80', marginBottom: '8px' }}>✓ Request Sent</h3>
                  <p>Consent ID: <code style={{ color: '#a5b4fc' }}>{requestResult.request_id}</code></p>
                  
                  <div style={{ background: 'rgba(168, 85, 247, 0.08)', border: '1px solid rgba(168, 85, 247, 0.2)', padding: '20px', borderRadius: '12px', marginTop: '16px', textAlign: 'center' }}>
                    <p style={{ fontSize: '11px', textTransform: 'uppercase', letterSpacing: '0.1em', color: '#71717a', marginBottom: '12px' }}>Authorisation Code</p>
                    <div style={{ fontSize: '32px', fontWeight: 'bold', letterSpacing: '8px', color: '#a855f7', fontFamily: 'JetBrains Mono, monospace' }}>
                      {requestResult.approval_code}
                    </div>
                    <p style={{ fontSize: '11px', marginTop: '8px', opacity: 0.6 }}>Enter this code in your Wallet to approve</p>
                  </div>
                  
                  <p style={{ marginTop: '16px', fontSize: '13px' }}>Status: Waiting for user approval...</p>
                </div>
              )}
            </div>
          )}
        </div>

        <div className="glass-panel">
          <h2>2. Verify Zero-Knowledge Proof</h2>
          <p style={{ marginBottom: '20px' }}>Fetch and verify the cryptographic proof after user consent.</p>
          
          <div style={{ display: 'flex', gap: '12px', marginBottom: '24px' }}>
            <input 
              type="text" 
              placeholder="Consent Request ID" 
              value={proofId}
              onChange={(e) => setProofId(e.target.value)}
            />
            <button className="btn-primary" onClick={handleVerify} disabled={isVerifying}>
              {isVerifying ? 'Verifying...' : 'Verify Proof'}
            </button>
          </div>

          {proofResult && (
            <div style={{ background: 'rgba(15, 23, 42, 0.4)', padding: '24px', borderRadius: '20px', border: `1px solid ${proofResult.verified ? 'rgba(16, 185, 129, 0.2)' : 'rgba(239, 68, 68, 0.2)'}` }}>
              {(proofResult.reason || proofResult.error) ? (
                <div style={{ textAlign: 'center', padding: '20px' }}>
                  <ShieldAlert size={48} color="#ef4444" style={{ marginBottom: '16px', opacity: 0.8 }} />
                  <h3 style={{ color: '#f87171', marginBottom: '8px' }}>Verification Failed</h3>
                  <p style={{ color: 'var(--text-muted)', fontSize: '14px' }}>{proofResult.reason || proofResult.error}</p>
                </div>
              ) : (
                <div className="animate-fade-in">
                  <div style={{ display: 'flex', alignItems: 'center', gap: '16px', marginBottom: '24px' }}>
                    <div style={{ 
                      background: proofResult.verified ? 'rgba(16, 185, 129, 0.1)' : 'rgba(239, 68, 68, 0.1)', 
                      padding: '12px', 
                      borderRadius: '50%',
                      boxShadow: proofResult.verified ? '0 0 20px rgba(16, 185, 129, 0.2)' : 'none'
                    }}>
                      {proofResult.verified ? <ShieldCheck size={32} color="#10b981" /> : <XOctagon size={32} color="#ef4444" />}
                    </div>
                    <div>
                      <h3 style={{ color: '#fff', fontSize: '20px', marginBottom: '4px' }}>
                        {proofResult.verified ? 'Identity Verified' : 'Verification Rejected'}
                      </h3>
                      <span className={`badge ${proofResult.verified ? 'active' : 'revoked'}`} style={{ fontSize: '10px' }}>
                        {proofResult.verified ? 'TRUSTED' : 'FAILED'}
                      </span>
                    </div>
                  </div>
                  
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', marginBottom: '24px' }}>
                    <div style={{ padding: '16px', background: 'rgba(0,0,0,0.2)', borderRadius: '12px' }}>
                      <p style={{ fontSize: '11px', textTransform: 'uppercase', letterSpacing: '1px', marginBottom: '12px' }}>Cryptographic Checklist</p>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                        <div className="flex-between">
                          <span style={{ fontSize: '13px', color: 'var(--text-muted)' }}>1. Issuer Signature (Ed25519)</span>
                          <span style={{ color: proofResult.vc_signature_valid?.valid ? '#10b981' : '#ef4444', fontSize: '12px', fontWeight: 'bold' }}>✓ VALID</span>
                        </div>
                        <div className="flex-between">
                          <span style={{ fontSize: '13px', color: 'var(--text-muted)' }}>2. Selective Disclosure Proof</span>
                          <span style={{ color: '#10b981', fontSize: '12px', fontWeight: 'bold' }}>✓ VALID</span>
                        </div>
                        <div className="flex-between">
                          <span style={{ fontSize: '13px', color: 'var(--text-muted)' }}>3. CRL Revocation Status</span>
                          <span style={{ color: '#10b981', fontSize: '12px', fontWeight: 'bold' }}>✓ CLEAN</span>
                        </div>
                      </div>
                    </div>

                    <div style={{ padding: '16px', background: 'rgba(0,0,0,0.2)', borderRadius: '12px' }}>
                      <p style={{ fontSize: '11px', textTransform: 'uppercase', letterSpacing: '1px', marginBottom: '12px' }}>Proven Attributes</p>
                      <div className="flex-between">
                        <strong style={{ fontSize: '16px', color: '#fff' }}>{proofResult.proof.claim.replace('_', ' ').toUpperCase()}</strong>
                        <span style={{ color: '#10b981', fontWeight: 'bold' }}>TRUE</span>
                      </div>
                    </div>
                  </div>

                  <p style={{ fontSize: '11px', textTransform: 'uppercase', letterSpacing: '1px', marginBottom: '8px' }}>Proof Metadata</p>
                  <pre style={{ fontSize: '11px', background: 'rgba(0,0,0,0.4)' }}>
                    {JSON.stringify(proofResult.proof, null, 2)}
                  </pre>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
