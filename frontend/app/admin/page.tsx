'use client';

import { useEffect, useState, useMemo, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import { useAuth } from '../AuthProvider';

type Submission = {
  id: number;
  formTitle: string;
  formDescription?: string;
  fullName: string;
  email: string;
  company?: string;
  rating?: number;
  submissionMode: string;
  themeMode?: string;
  layoutDensity?: string;
  interests: string[];
  questionsJson?: string;
  answersJson?: string;
  message?: string;
  createdAt: string;
};

type AIInsights = {
  sentimentScore: number;
  sentimentSummary: string;
  topInsights: string[];
  positiveTrends: string[];
  negativeTrends: string[];
  commonIssues: string[];
  suggestedImprovements: string[];
};

type FormAnalytics = {
  totalViews: number;
  totalResponses: number;
  conversionRate: number;
  averageCompletionTimeSeconds: number;
  completionPercentage: number;
};

const API_BASE = process.env.NEXT_PUBLIC_API_BASE_URL ?? 'http://localhost:8080';

const safeJsonParse = (str: string | undefined, fallback: any) => {
  if (!str) return fallback;
  try {
    return JSON.parse(str);
  } catch (e) {
    console.error("Failed to parse JSON:", e);
    return fallback;
  }
};

export default function AdminPage() {
  return (
    <Suspense fallback={<div style={{ padding: '100px', textAlign: 'center', color: 'var(--muted)', fontFamily: 'monospace' }}>Loading Submissions Vault...</div>}>
      <AdminDashboardComponent />
    </Suspense>
  );
}

function AdminDashboardComponent() {
  const searchParams = useSearchParams();
  const formId = searchParams.get('id') ?? '1';
  const { user: authUser } = useAuth();
  const currentUser = authUser?.email ?? 'owner@novaforms.com';

  const [submissions, setSubmissions] = useState<Submission[]>([]);
  const [formConfig, setFormConfig] = useState<any>(null);
  const [analytics, setAnalytics] = useState<FormAnalytics | null>(null);
  const [aiInsights, setAiInsights] = useState<AIInsights | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadingInsights, setLoadingInsights] = useState(false);
  const [status, setStatus] = useState('Loading...');
  const [searchTerm, setSearchTerm] = useState('');
  const [filterMode, setFilterMode] = useState('');
  const [filterTheme, setFilterTheme] = useState('');
  const [selectedSub, setSelectedSub] = useState<Submission | null>(null);
  const [timeRemaining, setTimeRemaining] = useState<string>('');
  
  // Real-time pulse state
  const [livePulse, setLivePulse] = useState(false);
  const [pulseCount, setPulseCount] = useState(0);

  // Selected IDs for Bulk Actions
  const [selectedSubIds, setSelectedSubIds] = useState<number[]>([]);

  // Export Settings
  const [exportFormat, setExportFormat] = useState<'csv' | 'excel' | 'pdf' | 'zip'>('excel');
  const [exportStartDate, setExportStartDate] = useState('');
  const [exportEndDate, setExportEndDate] = useState('');

  const fetchSubmissions = async () => {
    try {
      const response = await fetch(`${API_BASE}/api/submissions?formId=${formId}`, { cache: 'no-store' });
      if (response.ok) {
        const resData = await response.json();
        const data = resData.data !== undefined ? resData.data : resData;
        setSubmissions(data as Submission[]);
      }
    } catch (e) {
      console.error("Failed to load submissions", e);
    }
  };

  const fetchAnalytics = async () => {
    try {
      const response = await fetch(`${API_BASE}/api/form-config/${formId}/analytics`, { cache: 'no-store' });
      if (response.ok) {
        const resData = await response.json();
        const data = resData.data !== undefined ? resData.data : resData;
        setAnalytics(data as FormAnalytics);
      }
    } catch (e) {
      console.error("Failed to load analytics", e);
    }
  };

  const fetchFormConfig = async () => {
    try {
      const configRes = await fetch(`${API_BASE}/api/form-config/${formId}?email=${encodeURIComponent(currentUser)}`, { cache: 'no-store' });
      if (configRes.ok) {
        const resData = await configRes.json();
        const configData = resData.data !== undefined ? resData.data : resData;
        setFormConfig(configData);
        setStatus('Connected');
      } else {
        setStatus('Access denied');
      }
    } catch {
      setStatus('Backend offline');
    }
  };

  const loadAllData = async () => {
    setLoading(true);
    await Promise.all([
      fetchFormConfig(),
      fetchSubmissions(),
      fetchAnalytics()
    ]);
    setLoading(false);
  };

  useEffect(() => {
    void loadAllData();
  }, [formId, currentUser]);

  // Connect to SSE event emitter
  useEffect(() => {
    if (!formId) return;

    const sse = new EventSource(`${API_BASE}/api/live/submissions?formId=${formId}`);
    
    const handleSubmissionCreated = (event: MessageEvent) => {
      setLivePulse(true);
      setPulseCount(prev => prev + 1);
      setTimeout(() => setLivePulse(false), 2000);
      void fetchSubmissions();
      void fetchAnalytics();
    };

    const handleViewCreated = (event: MessageEvent) => {
      setLivePulse(true);
      setTimeout(() => setLivePulse(false), 1500);
      void fetchAnalytics();
    };

    sse.addEventListener('SUBMISSION_CREATED', handleSubmissionCreated);
    sse.addEventListener('VIEW_CREATED', handleViewCreated);
    
    sse.onmessage = (event) => {
      console.log("SSE Message:", event.data);
    };

    sse.onerror = (err) => {
      console.warn("SSE connection interrupted. Reconnecting...", err);
    };

    return () => {
      sse.removeEventListener('SUBMISSION_CREATED', handleSubmissionCreated);
      sse.removeEventListener('VIEW_CREATED', handleViewCreated);
      sse.close();
    };
  }, [formId]);

  // Availability Timer
  useEffect(() => {
    if (!formConfig) return;
    const dynamicStatus = formConfig.dynamicStatus;
    const openAt = formConfig.config.openAt;
    const closeAt = formConfig.config.closeAt;
    
    let targetTime = 0;
    if (dynamicStatus === 'SCHEDULED' && openAt) {
      targetTime = new Date(openAt).getTime();
    } else if (dynamicStatus === 'OPEN' && closeAt) {
      targetTime = new Date(closeAt).getTime();
    }

    if (targetTime > 0) {
      const updateTimer = () => {
        const diff = targetTime - Date.now();
        if (diff <= 0) {
          setTimeRemaining('Expired');
        } else {
          const secs = Math.floor(diff / 1000);
          const mins = Math.floor(secs / 60);
          const hours = Math.floor(mins / 60);
          const days = Math.floor(hours / 24);
          const dStr = days > 0 ? `${days}d ` : '';
          const hStr = (hours % 24) > 0 || days > 0 ? `${hours % 24}h ` : '';
          const mStr = (mins % 60) > 0 || hours > 0 ? `${mins % 60}m ` : '';
          const sStr = `${secs % 60}s`;
          setTimeRemaining(`${dStr}${hStr}${mStr}${sStr}`);
        }
      };
      updateTimer();
      const timer = setInterval(updateTimer, 1000);
      return () => clearInterval(timer);
    } else {
      setTimeRemaining('-');
    }
  }, [formConfig]);

  const deleteSubmission = async (id: number) => {
    if (!confirm('Are you sure you want to delete this submission?')) {
      return;
    }

    try {
      const response = await fetch(`${API_BASE}/api/submissions/${id}`, {
        method: 'DELETE'
      });

      if (!response.ok) {
        throw new Error('Delete failed');
      }

      setSubmissions((current) => current.filter((item) => item.id !== id));
      setSelectedSubIds(prev => prev.filter(item => item !== id));
      if (selectedSub?.id === id) {
        setSelectedSub(null);
      }
      void fetchAnalytics();
    } catch {
      alert('Could not delete submission. Backend might be unreachable.');
    }
  };

  const handleBulkDelete = async () => {
    if (selectedSubIds.length === 0) return;
    if (!confirm(`Are you sure you want to delete all ${selectedSubIds.length} selected responses? This cannot be undone.`)) {
      return;
    }

    try {
      setLoading(true);
      await Promise.all(
        selectedSubIds.map(id => 
          fetch(`${API_BASE}/api/submissions/${id}`, { method: 'DELETE' })
        )
      );
      setSubmissions((current) => current.filter(item => !selectedSubIds.includes(item.id)));
      setSelectedSubIds([]);
      setSelectedSub(null);
      await fetchAnalytics();
      alert('Bulk deletion completed.');
    } catch (err) {
      console.error(err);
      alert('Error during bulk deletion.');
    } finally {
      setLoading(false);
    }
  };

  const handleTriggerAIInsights = async () => {
    try {
      setLoadingInsights(true);
      const res = await fetch(`${API_BASE}/api/ai/insights?formId=${formId}`);
      if (res.ok) {
        const json = await res.json();
        const content = json.data !== undefined ? json.data : json;
        const parsed = JSON.parse(content) as AIInsights;
        setAiInsights(parsed);
      } else {
        alert("Failed to analyze responses with Gemini AI.");
      }
    } catch (e) {
      console.error(e);
      alert("Network error calling AI insights service.");
    } finally {
      setLoadingInsights(false);
    }
  };

  const triggerExport = () => {
    let url = `${API_BASE}/api/submissions/export?formId=${formId}&format=${exportFormat}`;
    if (exportStartDate) {
      url += `&startDate=${new Date(exportStartDate).toISOString()}`;
    }
    if (exportEndDate) {
      url += `&endDate=${new Date(exportEndDate).toISOString()}`;
    }
    if (selectedSubIds.length > 0) {
      url += `&ids=${selectedSubIds.join(',')}`;
    }
    window.open(url, '_blank');
  };

  const filteredSubmissions = useMemo(() => {
    return submissions.filter((sub) => {
      const matchesSearch =
        sub.fullName.toLowerCase().includes(searchTerm.toLowerCase()) ||
        sub.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
        sub.formTitle.toLowerCase().includes(searchTerm.toLowerCase());

      const matchesMode = filterMode === '' || sub.submissionMode === filterMode;
      const matchesTheme = filterTheme === '' || sub.themeMode === filterTheme;

      return matchesSearch && matchesMode && matchesTheme;
    });
  }, [submissions, searchTerm, filterMode, filterTheme]);

  const stats = useMemo(() => {
    const total = filteredSubmissions.length;
    if (total === 0) {
      return {
        avgRating: '0.0',
        modes: {} as Record<string, number>,
        themes: {} as Record<string, number>
      };
    }

    const sumRating = filteredSubmissions.reduce((sum, item) => sum + (item.rating ?? 0), 0);
    const avgRating = (sumRating / total).toFixed(1);

    const modes = filteredSubmissions.reduce<Record<string, number>>((acc, item) => {
      const mode = item.submissionMode || 'standard';
      acc[mode] = (acc[mode] || 0) + 1;
      return acc;
      }, {});

    const themes = filteredSubmissions.reduce<Record<string, number>>((acc, item) => {
      const theme = item.themeMode || 'silver';
      acc[theme] = (acc[theme] || 0) + 1;
      return acc;
    }, {});

    return { avgRating, modes, themes };
  }, [filteredSubmissions]);

  return (
    <main className="shell admin-dashboard">
      {/* Live SSE Pulse Indicator */}
      {livePulse && (
        <div style={{
          position: 'fixed',
          top: '16px',
          right: '16px',
          background: 'var(--accent, #00f0ff)',
          color: '#000',
          padding: '6px 12px',
          borderRadius: '4px',
          fontSize: '0.75rem',
          zIndex: 1000,
          fontWeight: 'bold',
          fontFamily: 'monospace',
          boxShadow: '0 0 10px var(--accent, #00f0ff)',
          animation: 'pulse 1s infinite alternate'
        }}>
          ⚡ LIVE SUBMISSION RECEIVED ({pulseCount})
        </div>
      )}

      <section className="hero">
        <div className="hero-copy">
          <p className="eyebrow">Administration</p>
          <h1>Response Center.</h1>
          <p className="lede">Access form database snapshots, export spreadsheets, and analyze submissions.</p>
        </div>

        <div className="hero-panel" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 'var(--spacing-base)' }}>
          <div className="stat-card">
            <span>Form Status</span>
            <strong style={{
              fontSize: '1.25rem',
              color: 
                formConfig?.dynamicStatus === 'OPEN' ? '#22c55e' :
                formConfig?.dynamicStatus === 'PAUSED' ? '#eab308' :
                formConfig?.dynamicStatus === 'CLOSED' || formConfig?.dynamicStatus === 'LIMIT_REACHED' ? '#ef4444' :
                formConfig?.dynamicStatus === 'ARCHIVED' ? '#9ca3af' : '#eab308',
              fontFamily: 'Orbitron, sans-serif'
            }}>
              {formConfig?.dynamicStatus === 'OPEN' ? '🟢 Open' :
               formConfig?.dynamicStatus === 'PAUSED' ? '⏸ Paused' :
               formConfig?.dynamicStatus === 'CLOSED' ? '🔴 Closed' :
               formConfig?.dynamicStatus === 'LIMIT_REACHED' ? '🔴 Limit Reached' :
               formConfig?.dynamicStatus === 'SCHEDULED' ? '⏳ Scheduled' :
               formConfig?.dynamicStatus === 'ARCHIVED' ? '📦 Archived' : '🟡 Draft'}
            </strong>
          </div>
          <div className="stat-card">
            <span>Views & Conversion</span>
            <strong style={{ fontSize: '1.2rem' }}>
              👁️ {analytics?.totalViews ?? '-'} / 🎯 {analytics?.conversionRate !== undefined ? (analytics.conversionRate * 100).toFixed(0) + '%' : '-'}
            </strong>
          </div>
          <div className="stat-card">
            <span>Responses Capacity</span>
            <strong style={{ fontSize: '1.25rem' }}>
              {formConfig?.submissionCount ?? 0} / {formConfig?.config?.maxResponses > 0 ? formConfig.config.maxResponses : '∞'}
            </strong>
          </div>
          {formConfig?.dynamicStatus === 'SCHEDULED' && (
            <div className="stat-card">
              <span>Opening In</span>
              <strong style={{ fontSize: '1.2rem', color: 'var(--accent)', fontFamily: 'Orbitron, sans-serif' }}>{timeRemaining}</strong>
            </div>
          )}
          {formConfig?.dynamicStatus === 'OPEN' && formConfig?.config?.closeAt && (
            <div className="stat-card">
              <span>Time Remaining</span>
              <strong style={{ fontSize: '1.2rem', color: 'var(--accent)', fontFamily: 'Orbitron, sans-serif' }}>{timeRemaining}</strong>
            </div>
          )}
          <div className="stat-card">
            <span>Filtered Vault</span>
            <strong style={{ fontSize: '1.25rem' }}>{filteredSubmissions.length}</strong>
          </div>
          <div className="hero-note" style={{ gridColumn: '1 / -1' }}>
            <p className="section-label" style={{ margin: '0 0 6px 0' }}>Availability & Access Control</p>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '16px', fontSize: '0.8rem', color: 'var(--muted)' }}>
              <span>📅 <strong>Scheduled Open:</strong> {formConfig?.config?.openAt ? new Date(formConfig.config.openAt).toLocaleString() : 'Manual'}</span>
              <span>📅 <strong>Scheduled Close:</strong> {formConfig?.config?.closeAt ? new Date(formConfig.config.closeAt).toLocaleString() : 'Manual'}</span>
              <span>🛡️ <strong>Access mode:</strong> {formConfig?.config?.accessMode || 'PUBLIC'}</span>
            </div>
          </div>
        </div>
      </section>

      {/* AI Insights Section */}
      {aiInsights && (
        <section className="snapshot-inspector" style={{ border: '1px solid var(--accent, #00f0ff)', margin: '20px 0', padding: '16px', background: 'rgba(0, 240, 255, 0.02)', borderRadius: '8px' }}>
          <div className="inspector-head" style={{ marginBottom: '12px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <h3 style={{ fontFamily: 'Orbitron, sans-serif', color: 'var(--accent, #00f0ff)', fontSize: '1.1rem', margin: 0 }}>🤖 Gemini Response Insights</h3>
            <button type="button" className="ghost-button" onClick={() => setAiInsights(null)} style={{ padding: '4px 10px', fontSize: '0.75rem' }}>Clear</button>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '20px', fontSize: '0.85rem' }}>
            <div>
              <div style={{ marginBottom: '12px', padding: '10px', border: '1px solid var(--border)', borderRadius: '6px', background: 'rgba(0,0,0,0.3)', display: 'inline-block' }}>
                <strong>Sentiment Score:</strong>{' '}
                <span style={{ color: aiInsights.sentimentScore >= 0.7 ? '#22c55e' : aiInsights.sentimentScore >= 0.4 ? '#eab308' : '#ef4444', fontWeight: 'bold', fontSize: '1rem' }}>
                  {(aiInsights.sentimentScore * 100).toFixed(0)}%
                </span>
              </div>
              <p style={{ lineHeight: '1.4' }}><strong>Summary:</strong> {aiInsights.sentimentSummary}</p>
              
              <div style={{ marginTop: '12px' }}>
                <strong style={{ color: 'var(--accent, #00f0ff)' }}>🔑 Top Insights:</strong>
                <ul style={{ paddingLeft: '16px', marginTop: '4px', lineHeight: '1.4' }}>
                  {aiInsights.topInsights.map((ins, i) => <li key={i}>{ins}</li>)}
                </ul>
              </div>
            </div>
            <div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                <div>
                  <strong style={{ color: '#22c55e' }}>👍 Positive Trends</strong>
                  <ul style={{ paddingLeft: '16px', marginTop: '4px', lineHeight: '1.4' }}>
                    {aiInsights.positiveTrends.map((t, i) => <li key={i}>{t}</li>)}
                  </ul>
                </div>
                <div>
                  <strong style={{ color: '#ef4444' }}>👎 Negative Trends</strong>
                  <ul style={{ paddingLeft: '16px', marginTop: '4px', lineHeight: '1.4' }}>
                    {aiInsights.negativeTrends.map((t, i) => <li key={i}>{t}</li>)}
                  </ul>
                </div>
              </div>
              <div style={{ marginTop: '12px' }}>
                <strong style={{ color: '#eab308' }}>💡 Suggested Improvements:</strong>
                <ul style={{ paddingLeft: '16px', marginTop: '4px', lineHeight: '1.4' }}>
                  {aiInsights.suggestedImprovements.map((imp, i) => <li key={i}>{imp}</li>)}
                </ul>
              </div>
            </div>
          </div>
        </section>
      )}

      {/* Analytics Summary */}
      {filteredSubmissions.length > 0 && (
        <section className="analytics-summary">
          <div className="analytics-card">
            <p className="section-label">Submission Modes</p>
            <div className="charts-stack">
              {['standard', 'urgent', 'branch', 'approval'].map((mode) => {
                const count = stats.modes[mode] ?? 0;
                const percentage = ((count / filteredSubmissions.length) * 100).toFixed(0);
                return (
                  <div key={mode} className="chart-bar-row">
                    <span className="chart-label">{mode}</span>
                    <div className="chart-bar-outer">
                      <div className="chart-bar-inner" style={{ width: `${percentage}%` }} />
                    </div>
                    <span className="chart-value">{count} ({percentage}%)</span>
                  </div>
                );
              })}
            </div>
          </div>

          <div className="analytics-card">
            <p className="section-label">Selected Themes</p>
            <div className="charts-stack">
              {['silver', 'graphite', 'onyx', 'cyberpunk'].map((theme) => {
                const count = stats.themes[theme] ?? 0;
                const percentage = ((count / filteredSubmissions.length) * 100).toFixed(0);
                return (
                  <div key={theme} className="chart-bar-row">
                    <span className="chart-label">{theme}</span>
                    <div className="chart-bar-outer">
                      <div className="chart-bar-inner" style={{ width: `${percentage}%` }} />
                    </div>
                    <span className="chart-value">{count} ({percentage}%)</span>
                  </div>
                );
              })}
            </div>
          </div>
        </section>
      )}

      {/* Spreadsheet Control Panel */}
      <section className="spreadsheet-container">
        <div className="control-bar" style={{ display: 'flex', flexDirection: 'column', gap: '12px', padding: '16px' }}>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '12px', width: '100%' }}>
            <div className="search-box" style={{ flex: 1, minWidth: '240px' }}>
              <input
                type="text"
                placeholder="Search by name, email, or title..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                style={{ width: '100%' }}
              />
            </div>

            <div className="filter-dropdowns" style={{ display: 'flex', flexWrap: 'wrap', gap: '8px', alignItems: 'center' }}>
              <select value={filterMode} onChange={(e) => setFilterMode(e.target.value)}>
                <option value="">All Modes</option>
                <option value="standard">Standard</option>
                <option value="urgent">Urgent</option>
                <option value="branch">Branching</option>
                <option value="approval">Approval required</option>
              </select>

              <select value={filterTheme} onChange={(e) => setFilterTheme(e.target.value)}>
                <option value="">All Themes</option>
                <option value="silver">Silver</option>
                <option value="graphite">Graphite</option>
                <option value="onyx">Onyx</option>
                <option value="cyberpunk">Cyberpunk</option>
              </select>

              <button
                type="button"
                className="submit-button"
                onClick={handleTriggerAIInsights}
                disabled={loadingInsights || filteredSubmissions.length === 0}
              >
                {loadingInsights ? '🔮 Analyzing...' : '🔮 Gemini AI Insights'}
              </button>

              {selectedSubIds.length > 0 && (
                <button
                  type="button"
                  className="submit-button"
                  onClick={handleBulkDelete}
                  style={{ background: '#ff4444', color: '#fff', border: '1px solid #ff4444' }}
                >
                  🗑️ Delete Selected ({selectedSubIds.length})
                </button>
              )}
            </div>
          </div>

          {/* Advanced Export Panel */}
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '12px', borderTop: '1px solid var(--border)', paddingTop: '12px', alignItems: 'center' }}>
            <span style={{ fontSize: '0.8rem', color: 'var(--muted)', fontWeight: 'bold' }}>Advanced Export:</span>
            
            <label style={{ display: 'flex', alignItems: 'center', gap: '4px', fontSize: '0.75rem', color: 'var(--text)' }}>
              Format:
              <select value={exportFormat} onChange={(e) => setExportFormat(e.target.value as any)} style={{ fontSize: '0.75rem', padding: '4px' }}>
                <option value="excel">Excel (.xlsx)</option>
                <option value="pdf">PDF Report</option>
                <option value="csv">Standard CSV</option>
                <option value="zip">ZIP Bundle</option>
              </select>
            </label>

            <label style={{ display: 'flex', alignItems: 'center', gap: '4px', fontSize: '0.75rem', color: 'var(--text)' }}>
              From:
              <input
                type="date"
                value={exportStartDate}
                onChange={(e) => setExportStartDate(e.target.value)}
                style={{ fontSize: '0.75rem', padding: '2px 4px', background: 'rgba(0,0,0,0.2)', border: '1px solid var(--border)', color: 'var(--text)' }}
              />
            </label>

            <label style={{ display: 'flex', alignItems: 'center', gap: '4px', fontSize: '0.75rem', color: 'var(--text)' }}>
              To:
              <input
                type="date"
                value={exportEndDate}
                onChange={(e) => setExportEndDate(e.target.value)}
                style={{ fontSize: '0.75rem', padding: '2px 4px', background: 'rgba(0,0,0,0.2)', border: '1px solid var(--border)', color: 'var(--text)' }}
              />
            </label>

            <button
              type="button"
              className="submit-button"
              onClick={triggerExport}
              disabled={filteredSubmissions.length === 0}
              style={{ padding: '4px 12px', fontSize: '0.75rem' }}
            >
              📥 Export Data
            </button>
          </div>
        </div>

        {/* Spreadsheet Data Grid */}
        <div className="grid-scroller">
          <table className="spreadsheet-grid">
            <thead>
              <tr>
                <th style={{ width: '30px', textAlign: 'center' }}>
                  <input
                    type="checkbox"
                    checked={filteredSubmissions.length > 0 && selectedSubIds.length === filteredSubmissions.length}
                    onChange={(e) => {
                      if (e.target.checked) {
                        setSelectedSubIds(filteredSubmissions.map(s => s.id));
                      } else {
                        setSelectedSubIds([]);
                      }
                    }}
                  />
                </th>
                <th>ID</th>
                <th>Form Title</th>
                <th>Full Name</th>
                <th>Email</th>
                <th>Company</th>
                <th>Rating</th>
                <th>Mode</th>
                <th>Theme</th>
                <th>Date Submitted</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={11} className="grid-placeholder">Loading submissions from backend...</td>
                </tr>
              ) : filteredSubmissions.length === 0 ? (
                <tr>
                  <td colSpan={11} className="grid-placeholder">No records match the current filters.</td>
                </tr>
              ) : (
                filteredSubmissions.map((sub) => (
                  <tr key={sub.id} className={selectedSub?.id === sub.id ? 'active-row' : ''}>
                    <td className="center">
                      <input
                        type="checkbox"
                        checked={selectedSubIds.includes(sub.id)}
                        onChange={(e) => {
                          if (e.target.checked) {
                            setSelectedSubIds(prev => [...prev, sub.id]);
                          } else {
                            setSelectedSubIds(prev => prev.filter(id => id !== sub.id));
                          }
                        }}
                      />
                    </td>
                    <td className="center monospace">{sub.id}</td>
                    <td>{sub.formTitle}</td>
                    <td><strong>{sub.fullName}</strong></td>
                    <td className="monospace">{sub.email}</td>
                    <td>{sub.company || '-'}</td>
                    <td className="center monospace">{sub.rating ? `${sub.rating}/10` : '-'}</td>
                    <td className="center"><span className="status-pill">{sub.submissionMode}</span></td>
                    <td className="center"><span className="status-pill">{sub.themeMode ?? 'silver'}</span></td>
                    <td className="monospace">{new Date(sub.createdAt).toLocaleString()}</td>
                    <td>
                      <div className="grid-actions">
                        <button
                          type="button"
                          className="ghost-button"
                          onClick={() => setSelectedSub(selectedSub?.id === sub.id ? null : sub)}
                        >
                          {selectedSub?.id === sub.id ? 'Hide' : 'Inspect'}
                        </button>
                        <button
                          type="button"
                          className="ghost-button danger"
                          onClick={() => void deleteSubmission(sub.id)}
                        >
                          Delete
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </section>

      {/* Snapshot inspector */}
      {selectedSub && (
        <section className="snapshot-inspector">
          <div className="inspector-head">
            <h3>Submission Inspector (ID: {selectedSub.id})</h3>
            <button type="button" className="ghost-button" onClick={() => setSelectedSub(null)}>Close</button>
          </div>
          <div className="inspector-content">
            <div className="info-block">
              <p><strong>Form Description:</strong> {selectedSub.formDescription || 'None'}</p>
              <p><strong>Interests/Accents:</strong> {selectedSub.interests?.join(', ') || 'None'}</p>
              <p><strong>Additional Message:</strong> {selectedSub.message || 'None'}</p>
            </div>
            <div className="json-grids">
              <div className="json-block">
                <p className="section-label">Questions Structure (JSON)</p>
                <pre>{JSON.stringify(safeJsonParse(selectedSub.questionsJson, []), null, 2)}</pre>
              </div>
              <div className="json-block">
                <p className="section-label">Form Answers (JSON)</p>
                <pre>{JSON.stringify(safeJsonParse(selectedSub.answersJson, {}), null, 2)}</pre>
              </div>
            </div>
          </div>
        </section>
      )}
    </main>
  );
}
