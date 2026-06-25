'use client';

import Link from 'next/link';
import { usePathname, useSearchParams } from 'next/navigation';
import { useEffect, useState } from 'react';
import { useAuth } from './AuthProvider';
import { UserButton } from '@clerk/nextjs';

const API_BASE = process.env.NEXT_PUBLIC_API_BASE_URL ?? 'http://localhost:8080';

export default function Header() {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const formId = searchParams.get('id');

  const { user: authUser, isClerkEnabled, simulatedUser, changeSimulatedUser } = useAuth();
  const currentUser = authUser?.email ?? 'owner@novaforms.com';

  const [activeTransfer, setActiveTransfer] = useState<any>(null);
  const [collaborators, setCollaborators] = useState<any[]>([]);
  const [showCustomInput, setShowCustomInput] = useState(false);
  const [customEmail, setCustomEmail] = useState('');

  // Hide the global header on the public intake form page
  const isPublicForm = pathname === '/form';

  // Poll for active transfers and collaborators
  useEffect(() => {
    if (isPublicForm || !formId) {
      setActiveTransfer(null);
      setCollaborators([]);
      return;
    }

    const checkTransfer = async () => {
      try {
        const res = await fetch(`${API_BASE}/api/form-config/${formId}`);
        if (res.ok) {
          const data = await res.json();
          setActiveTransfer(data.activeTransfer);
          setCollaborators(data.collaborators);
        }
      } catch (err) {
        console.error('Failed to check active transfers', err);
      }
    };

    void checkTransfer();
    const interval = setInterval(checkTransfer, 4000);
    return () => clearInterval(interval);
  }, [isPublicForm, formId, currentUser]);

  if (isPublicForm) {
    return null;
  }

  const handleCustomEmailSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (customEmail.trim()) {
      changeSimulatedUser(customEmail.trim());
      setShowCustomInput(false);
      setCustomEmail('');
    }
  };

  // Check roles from collaborator list
  const userRole = collaborators.find(c => c.email.toLowerCase() === currentUser.toLowerCase())?.role ?? 'VIEWER';

  // Action handlers for transfer
  const handleAccept = async () => {
    if (!formId) return;
    try {
      const res = await fetch(`${API_BASE}/api/form-config/${formId}/transfer/accept`, { method: 'POST' });
      if (res.ok) {
        const tr = await res.json();
        setActiveTransfer(tr);
        window.dispatchEvent(new Event('novaforms-transfer-updated'));
      }
    } catch (err) {
      alert('Failed to accept transfer');
    }
  };

  const handleConfirm = async () => {
    if (!formId) return;
    try {
      const res = await fetch(`${API_BASE}/api/form-config/${formId}/transfer/confirm`, { method: 'POST' });
      if (res.ok) {
        const tr = await res.json();
        setActiveTransfer(null);
        window.dispatchEvent(new Event('novaforms-transfer-updated'));
        window.dispatchEvent(new Event('novaforms-user-changed'));
      }
    } catch (err) {
      alert('Failed to finalize transfer');
    }
  };

  const handleCancel = async () => {
    if (!formId) return;
    try {
      const res = await fetch(`${API_BASE}/api/form-config/${formId}/transfer/cancel`, { method: 'POST' });
      if (res.ok) {
        setActiveTransfer(null);
        window.dispatchEvent(new Event('novaforms-transfer-updated'));
      }
    } catch (err) {
      alert('Failed to cancel transfer');
    }
  };

  return (
    <>
      {/* Transfer Alert Banner */}
      {activeTransfer && (
        <div className="transfer-banner">
          <div className="banner-content">
            {activeTransfer.status === 'PENDING' && activeTransfer.toEmail.toLowerCase() === currentUser.toLowerCase() && (
              <>
                <span className="banner-badge">TRANSFER PENDING</span>
                <span className="banner-text">
                  <strong>{activeTransfer.fromEmail}</strong> wishes to transfer ownership to you (proposed demotion to: {activeTransfer.proposedNewRole}).
                </span>
                <div className="banner-actions">
                  <button onClick={handleAccept} className="banner-btn accept">Accept Transfer</button>
                  <button onClick={handleCancel} className="banner-btn reject">Reject</button>
                </div>
              </>
            )}

            {activeTransfer.status === 'ACCEPTED' && activeTransfer.fromEmail.toLowerCase() === currentUser.toLowerCase() && (
              <>
                <span className="banner-badge warning">TRANSFER ACCEPTED</span>
                <span className="banner-text">
                  <strong>{activeTransfer.toEmail}</strong> has accepted the transfer. Confirm to finalize role swaps.
                </span>
                <div className="banner-actions">
                  <button onClick={handleConfirm} className="banner-btn confirm">Yes, Finalize Transfer</button>
                  <button onClick={handleCancel} className="banner-btn reject">Cancel</button>
                </div>
              </>
            )}

            {activeTransfer.status === 'PENDING' && activeTransfer.fromEmail.toLowerCase() === currentUser.toLowerCase() && (
              <>
                <span className="banner-badge info">OUTGOING REQUEST</span>
                <span className="banner-text">
                  Waiting for <strong>{activeTransfer.toEmail}</strong> to accept ownership transfer.
                </span>
                <button onClick={handleCancel} className="banner-btn reject mini">Cancel</button>
              </>
            )}

            {activeTransfer.status === 'ACCEPTED' && activeTransfer.toEmail.toLowerCase() === currentUser.toLowerCase() && (
              <>
                <span className="banner-badge info">ACCEPTED</span>
                <span className="banner-text">
                  Accepted. Waiting for <strong>{activeTransfer.fromEmail}</strong> to finalize the transfer.
                </span>
              </>
            )}
          </div>
        </div>
      )}

      <header className="global-header">
        <div className="header-container">
          <Link href="/" className="header-logo">
            NOVA<span>FORMS</span>
          </Link>
          <nav className="header-nav">
            <Link href="/" className={`nav-link ${pathname === '/' ? 'active' : ''}`}>
              Projects
            </Link>
            {formId && (
              <>
                <Link href={`/builder?id=${formId}`} className={`nav-link ${pathname === '/builder' ? 'active' : ''}`}>
                  Form Studio
                </Link>
                <Link href={`/admin?id=${formId}`} className={`nav-link ${pathname === '/admin' ? 'active' : ''}`}>
                  Admin Dashboard
                </Link>
              </>
            )}
          </nav>

          {/* Identity Switcher or Clerk User Area */}
          {isClerkEnabled ? (
            <div className="identity-switcher" style={{ border: 'none', background: 'transparent', display: 'flex', alignItems: 'center', gap: '12px' }}>
              <span className="user-email" style={{ fontSize: '0.85rem', color: 'var(--muted)' }}>{currentUser}</span>
              <UserButton />
            </div>
          ) : (
            <div className="identity-switcher">
              <div className="switcher-label">
                <span>Simulated Persona:</span>
                <span className={`role-badge ${userRole.toLowerCase()}`}>{userRole}</span>
              </div>
              <select
                value={showCustomInput ? 'custom' : currentUser}
                onChange={(e) => {
                  if (e.target.value === 'custom') {
                    setShowCustomInput(true);
                  } else {
                    setShowCustomInput(false);
                    changeSimulatedUser(e.target.value);
                  }
                }}
                className="switcher-select"
              >
                <option value="owner@novaforms.com">owner@novaforms.com (Owner)</option>
                <option value="editor@novaforms.com">editor@novaforms.com (Editor)</option>
                <option value="viewer@novaforms.com">viewer@novaforms.com (Viewer)</option>
                <option value="custom">-- Custom Email --</option>
              </select>

              {showCustomInput && (
                <form onSubmit={handleCustomEmailSubmit} className="custom-email-form">
                  <input
                    type="email"
                    required
                    placeholder="Enter email"
                    value={customEmail}
                    onChange={(e) => setCustomEmail(e.target.value)}
                    className="custom-email-input"
                  />
                  <button type="submit" className="custom-email-btn">Go</button>
                  <button type="button" onClick={() => setShowCustomInput(false)} className="custom-email-btn cancel">X</button>
                </form>
              )}
            </div>
          )}
        </div>
      </header>
    </>
  );
}
