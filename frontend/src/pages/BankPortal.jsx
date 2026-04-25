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
        <h1 style={{ background: 'linear-gradient(to right, #f59e0b, #ef4444)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
          Relying Party (ABC Bank)
        </h1>
        <p>Request selective disclosure proofs without accessing raw identity data.</p>
      </div>

      <div className="grid-2">
        <div className="glass-panel" style={{ borderTop: '4px solid #f59e0b' }}>
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
            
            <button className="btn-primary" style={{ background: '#f59e0b', color: '#78350f' }} onClick={handleRequest}>
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
                  <p>Consent ID: {requestResult.request_id}</p>
                  <p>Status: Waiting for user approval...</p>
                </div>
              )}
            </div>
          )}
        </div>

        <div className="glass-panel" style={{ borderTop: '4px solid #38bdf8' }}>
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
            <div style={{ background: 'rgba(0,0,0,0.3)', padding: '20px', borderRadius: '12px', border: `1px solid ${proofResult.verified ? 'rgba(34,197,94,0.3)' : 'rgba(239,68,68,0.3)'}` }}>
              {(proofResult.reason || proofResult.error) ? (
                <div style={{ color: '#ef4444' }}>
                  <ShieldAlert size={24} style={{ marginBottom: '12px' }} />
                  <h3>Access Denied / Error</h3>
                  <p>{proofResult.reason || proofResult.error}</p>
                </div>
              ) : (
                <div>
                  <div className="flex-between" style={{ marginBottom: '16px' }}>
                    <h3 style={{ color: proofResult.verified ? '#4ade80' : '#ef4444', display: 'flex', alignItems: 'center', gap: '8px' }}>
                      {proofResult.verified ? <ShieldCheck size={20} /> : <XOctagon size={20} />}
                      {proofResult.verified ? 'Proof Validated' : 'Condition Not Met'}
                    </h3>
                  </div>
                  
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', fontSize: '14px' }}>
                    <div className="flex-between">
                      <span style={{ color: 'var(--text-muted)' }}>Claim:</span>
                      <strong>{proofResult.proof.claim}</strong>
                    </div>
                    <div className="flex-between">
                      <span style={{ color: 'var(--text-muted)' }}>VC Signature:</span>
                      <span style={{ color: proofResult.vc_signature_valid?.valid ? '#4ade80' : '#ef4444' }}>
                        {proofResult.vc_signature_valid?.valid ? 'Valid (Ed25519)' : 'Invalid'}
                      </span>
                    </div>
                    <div className="flex-between">
                      <span style={{ color: 'var(--text-muted)' }}>ZK Proof Type:</span>
                      <span>{proofResult.proof.proof_type}</span>
                    </div>
                    <div className="flex-between">
                      <span style={{ color: 'var(--text-muted)' }}>Privacy Leakage:</span>
                      <strong style={{ color: '#4ade80' }}>{proofResult.proof.disclosure}</strong>
                    </div>
                  </div>

                  <pre style={{ marginTop: '20px', maxHeight: '150px' }}>
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
