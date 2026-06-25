'use client';

import { useEffect, useState, useMemo } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useAuth } from './AuthProvider';

interface FormSummary {
  id: number;
  name: string;
  title: string;
  description: string;
  role: 'OWNER' | 'EDITOR' | 'VIEWER';
  bannerUrl: string;
}

const API_BASE = process.env.NEXT_PUBLIC_API_BASE_URL ?? 'http://localhost:8080';

export default function WorkspaceDashboard() {
  const router = useRouter();
  const { user: authUser, isClerkEnabled, simulatedUser, changeSimulatedUser } = useAuth();
  const currentUser = authUser?.email ?? 'owner@novaforms.com';

  const [forms, setForms] = useState<FormSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [status, setStatus] = useState('Loading...');
  const [showCreateModal, setShowCreateModal] = useState(false);

  // New form fields
  const [formName, setFormName] = useState('');
  const [formTitle, setFormTitle] = useState('');
  const [formDesc, setFormDesc] = useState('');
  const [createError, setCreateError] = useState('');
  const [creating, setCreating] = useState(false);

  // Search filter
  const [searchQuery, setSearchQuery] = useState('');

  const fetchFormsList = async () => {
    try {
      setLoading(true);
      const res = await fetch(`${API_BASE}/api/form-config/list?email=${encodeURIComponent(currentUser)}`);
      if (res.ok) {
        const data = await res.json();
        setForms(data);
        setStatus('Connected');
      } else {
        throw new Error('Failed to load projects');
      }
    } catch (err) {
      console.error(err);
      setStatus('Backend offline');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void fetchFormsList();
  }, [currentUser]);

  // Separate owned forms and collaborating forms
  const ownedForms = useMemo(() => {
    return forms.filter(f => f.role === 'OWNER' && f.name.toLowerCase().includes(searchQuery.toLowerCase()));
  }, [forms, searchQuery]);

  const sharedForms = useMemo(() => {
    return forms.filter(f => f.role !== 'OWNER' && f.name.toLowerCase().includes(searchQuery.toLowerCase()));
  }, [forms, searchQuery]);

  const handleCreateForm = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formName.trim() || !formTitle.trim()) {
      setCreateError('Form Name and Form Title are required.');
      return;
    }

    try {
      setCreating(true);
      setCreateError('');
      const res = await fetch(`${API_BASE}/api/form-config/create`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: formName.trim(),
          title: formTitle.trim(),
          description: formDesc.trim(),
          ownerEmail: currentUser
        })
      });

      if (res.ok) {
        const newForm = await res.json();
        setShowCreateModal(false);
        setFormName('');
        setFormTitle('');
        setFormDesc('');
        // Redirect to form builder with new ID
        router.push(`/builder?id=${newForm.id}`);
      } else {
        throw new Error('Could not create form');
      }
    } catch (err) {
      setCreateError('Failed to create form config. Check connection.');
    } finally {
      setCreating(false);
    }
  };

  // Switch persona helper for local developer experience
  const switchSimulatedPersona = (email: string) => {
    changeSimulatedUser(email);
  };

  return (
    <main className="shell forms-app" style={{ minHeight: 'calc(100vh - 72px)', paddingTop: '40px' }}>
      {/* Top Banner section */}
      <section className="hero" style={{ marginBottom: '32px' }}>
        <div className="hero-copy">
          <p className="eyebrow">Enterprise Workspaces</p>
          <h1>Nova Projects Dashboard.</h1>
          <p className="lede">Manage your dynamic forms, preview customizations, and monitor user responses.</p>
          
          {/* Quick Info & Persona Switcher */}
          {!isClerkEnabled && (
            <div className="tag-row" style={{ marginTop: '16px', display: 'flex', gap: '8px', alignItems: 'center' }}>
              <span className="tag" style={{ border: '1px dashed var(--accent)', color: 'var(--accent)' }}>Local Dev Mode</span>
              <span style={{ fontSize: '0.82rem', color: 'var(--muted)' }}>Quick switch simulated persona:</span>
              <button onClick={() => switchSimulatedPersona('owner@novaforms.com')} className="ghost-button mini" style={{ color: currentUser === 'owner@novaforms.com' ? 'var(--text)' : 'var(--muted)', background: currentUser === 'owner@novaforms.com' ? 'rgba(255,255,255,0.06)' : 'transparent' }}>Owner</button>
              <button onClick={() => switchSimulatedPersona('editor@novaforms.com')} className="ghost-button mini" style={{ color: currentUser === 'editor@novaforms.com' ? 'var(--text)' : 'var(--muted)', background: currentUser === 'editor@novaforms.com' ? 'rgba(255,255,255,0.06)' : 'transparent' }}>Editor</button>
              <button onClick={() => switchSimulatedPersona('viewer@novaforms.com')} className="ghost-button mini" style={{ color: currentUser === 'viewer@novaforms.com' ? 'var(--text)' : 'var(--muted)', background: currentUser === 'viewer@novaforms.com' ? 'rgba(255,255,255,0.06)' : 'transparent' }}>Viewer</button>
            </div>
          )}
        </div>

        {/* Dashboard Overview Cards */}
        <div className="hero-panel" style={{ gridTemplateColumns: 'repeat(2, 1fr)' }}>
          <div className="stat-card">
            <span>Your Owned Forms</span>
            <strong>{forms.filter(f => f.role === 'OWNER').length}</strong>
          </div>
          <div className="stat-card">
            <span>Collaborator Access</span>
            <strong>{forms.filter(f => f.role !== 'OWNER').length}</strong>
          </div>
          <div className="hero-note" style={{ gridColumn: 'span 2' }}>
            <p className="section-label">Server Connection</p>
            <strong>{status}</strong>
            <span style={{ color: 'var(--muted)', fontSize: '0.78rem' }}>LoggedIn user email: <strong>{currentUser}</strong></span>
          </div>
        </div>
      </section>

      {/* Main Workspace Workspace area */}
      <section className="workspace" style={{ display: 'flex', flexDirection: 'column', gap: '32px' }}>
        
        {/* Actions Bar */}
        <div className="toolbar" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '16px', borderBottom: '1px solid var(--border)', paddingBottom: '16px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flex: 1, maxWidth: '400px' }}>
            <input
              type="text"
              placeholder="Search workspaces by name..."
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              style={{ width: '100%', padding: '10px 14px', borderRadius: '8px', border: '1px solid var(--border)', background: 'var(--bg-soft)', color: 'var(--text)', outline: 'none' }}
            />
          </div>
          <button onClick={() => setShowCreateModal(true)} className="submit-button" style={{ width: 'auto', padding: '10px 24px' }}>
            Create New Form
          </button>
        </div>

        {loading ? (
          <div style={{ textAlign: 'center', padding: '60px 0', color: 'var(--muted)' }}>
            <div className="loading-spinner" style={{ marginBottom: '16px' }}></div>
            <p>Retrieving your workspaces config...</p>
          </div>
        ) : (
          <>
            {/* Owned Forms Grid */}
            <div className="dashboard-section">
              <h2 style={{ fontSize: '1.25rem', marginBottom: '16px', letterSpacing: '0.05em', color: 'var(--text)' }}>
                YOUR WORKSPACES <span style={{ color: 'var(--muted)', fontSize: '0.85rem' }}>({ownedForms.length})</span>
              </h2>
              {ownedForms.length === 0 ? (
                <div style={{ padding: '32px', textAlign: 'center', background: 'var(--panel)', border: '1px dashed var(--border)', borderRadius: '12px', color: 'var(--muted)' }}>
                  No workspaces owned by you. Click "Create New Form" to get started!
                </div>
              ) : (
                <div className="workspace-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: '20px' }}>
                  {ownedForms.map(form => (
                    <div key={form.id} className="card-panel hover-glow" style={{ padding: '24px', borderRadius: '12px', background: 'var(--panel)', border: '1px solid var(--border)', display: 'flex', flexDirection: 'column', gap: '16px', transition: 'all 0.3s ease' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                        <div>
                          <span style={{ fontSize: '0.72rem', color: 'var(--muted)' }}>FORM ID: #{form.id}</span>
                          <h3 style={{ fontSize: '1.1rem', fontWeight: 600, margin: '4px 0 0 0', color: 'var(--text)' }}>{form.name}</h3>
                        </div>
                        <span className="role-badge owner">OWNER</span>
                      </div>
                      
                      <p style={{ fontSize: '0.88rem', color: 'var(--muted)', minHeight: '40px', margin: 0, overflow: 'hidden', textOverflow: 'ellipsis', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical' }}>
                        {form.description || 'No description provided.'}
                      </p>

                      <div style={{ borderTop: '1px solid var(--border)', paddingTop: '16px', display: 'flex', gap: '12px', justifyContent: 'flex-end', marginTop: 'auto' }}>
                        <Link href={`/builder?id=${form.id}`} className="ghost-button mini" style={{ color: 'var(--text)' }}>
                          Builder Studio
                        </Link>
                        <Link href={`/admin?id=${form.id}`} className="ghost-button mini" style={{ color: 'var(--text)' }}>
                          Submissions
                        </Link>
                        <a href={`/form?id=${form.id}`} target="_blank" rel="noopener noreferrer" className="ghost-button mini active" style={{ color: 'var(--accent)' }}>
                          Live Link ↗
                        </a>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Shared Forms Grid */}
            <div className="dashboard-section" style={{ marginTop: '16px' }}>
              <h2 style={{ fontSize: '1.25rem', marginBottom: '16px', letterSpacing: '0.05em', color: 'var(--text)' }}>
                SHARED WORKSPACES <span style={{ color: 'var(--muted)', fontSize: '0.85rem' }}>({sharedForms.length})</span>
              </h2>
              {sharedForms.length === 0 ? (
                <div style={{ padding: '32px', textAlign: 'center', background: 'var(--panel)', border: '1px dashed var(--border)', borderRadius: '12px', color: 'var(--muted)' }}>
                  No shared workspaces found for this email address.
                </div>
              ) : (
                <div className="workspace-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: '20px' }}>
                  {sharedForms.map(form => (
                    <div key={form.id} className="card-panel hover-glow" style={{ padding: '24px', borderRadius: '12px', background: 'var(--panel)', border: '1px solid var(--border)', display: 'flex', flexDirection: 'column', gap: '16px', transition: 'all 0.3s ease' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                        <div>
                          <span style={{ fontSize: '0.72rem', color: 'var(--muted)' }}>FORM ID: #{form.id}</span>
                          <h3 style={{ fontSize: '1.1rem', fontWeight: 600, margin: '4px 0 0 0', color: 'var(--text)' }}>{form.name}</h3>
                        </div>
                        <span className={`role-badge ${form.role.toLowerCase()}`}>{form.role}</span>
                      </div>
                      
                      <p style={{ fontSize: '0.88rem', color: 'var(--muted)', minHeight: '40px', margin: 0, overflow: 'hidden', textOverflow: 'ellipsis', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical' }}>
                        {form.description || 'No description provided.'}
                      </p>

                      <div style={{ borderTop: '1px solid var(--border)', paddingTop: '16px', display: 'flex', gap: '12px', justifyContent: 'flex-end', marginTop: 'auto' }}>
                        {form.role === 'EDITOR' ? (
                          <Link href={`/builder?id=${form.id}`} className="ghost-button mini" style={{ color: 'var(--text)' }}>
                            Builder Studio
                          </Link>
                        ) : (
                          <Link href={`/builder?id=${form.id}`} className="ghost-button mini" style={{ color: 'var(--muted)', pointerEvents: 'none', opacity: 0.5 }}>
                            View Config
                          </Link>
                        )}
                        <Link href={`/admin?id=${form.id}`} className="ghost-button mini" style={{ color: 'var(--text)' }}>
                          Submissions
                        </Link>
                        <a href={`/form?id=${form.id}`} target="_blank" rel="noopener noreferrer" className="ghost-button mini active" style={{ color: 'var(--accent)' }}>
                          Live Link ↗
                        </a>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </>
        )}
      </section>

      {/* Create Form Modal Dialog */}
      {showCreateModal && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.72)', backdropFilter: 'blur(8px)', display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 1000, padding: '16px' }}>
          <form onSubmit={handleCreateForm} className="card-panel" style={{ width: '100%', maxWidth: '500px', padding: '32px', borderRadius: '16px', border: '1px solid var(--border)', display: 'flex', flexDirection: 'column', gap: '20px', background: 'var(--panel-strong)' }}>
            <div>
              <h2 style={{ margin: '0 0 4px 0', fontSize: '1.4rem' }}>Create Workspace Form</h2>
              <p style={{ color: 'var(--muted)', fontSize: '0.85rem', margin: 0 }}>Initialize a brand-new customizable template</p>
            </div>

            {createError && (
              <div style={{ padding: '10px 14px', borderRadius: '6px', background: 'rgba(239, 68, 68, 0.1)', border: '1px solid rgba(239, 68, 68, 0.3)', color: '#f87171', fontSize: '0.85rem' }}>
                {createError}
              </div>
            )}

            <label style={{ display: 'flex', flexDirection: 'column', gap: '8px', color: 'var(--text)', fontSize: '0.88rem' }}>
              Form Name (internal title)
              <input
                type="text"
                required
                placeholder="e.g. Customer Satisfaction Survey"
                value={formName}
                onChange={e => setFormName(e.target.value)}
                style={{ padding: '10px 12px', borderRadius: '6px', border: '1px solid var(--border)', background: 'var(--bg)', color: 'var(--text)', outline: 'none' }}
              />
            </label>

            <label style={{ display: 'flex', flexDirection: 'column', gap: '8px', color: 'var(--text)', fontSize: '0.88rem' }}>
              Intake Title (displayed to participants)
              <input
                type="text"
                required
                placeholder="e.g. We value your feedback!"
                value={formTitle}
                onChange={e => setFormTitle(e.target.value)}
                style={{ padding: '10px 12px', borderRadius: '6px', border: '1px solid var(--border)', background: 'var(--bg)', color: 'var(--text)', outline: 'none' }}
              />
            </label>

            <label style={{ display: 'flex', flexDirection: 'column', gap: '8px', color: 'var(--text)', fontSize: '0.88rem' }}>
              Description
              <textarea
                placeholder="Brief summary of form scope..."
                value={formDesc}
                onChange={e => setFormDesc(e.target.value)}
                rows={3}
                style={{ padding: '10px 12px', borderRadius: '6px', border: '1px solid var(--border)', background: 'var(--bg)', color: 'var(--text)', outline: 'none', resize: 'vertical' }}
              />
            </label>

            <div style={{ display: 'flex', gap: '16px', marginTop: '12px' }}>
              <button type="button" onClick={() => setShowCreateModal(false)} className="ghost-button" style={{ flex: 1 }}>
                Cancel
              </button>
              <button type="submit" disabled={creating} className="submit-button" style={{ flex: 1, width: 'auto' }}>
                {creating ? 'Creating...' : 'Initialize Form'}
              </button>
            </div>
          </form>
        </div>
      )}
    </main>
  );
}