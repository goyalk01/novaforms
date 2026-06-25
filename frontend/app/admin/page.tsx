'use client';

import { useEffect, useState, useMemo, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';

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
    <Suspense fallback={<div style={{ padding: '100px', textAlign: 'center', color: 'var(--muted)' }}>Loading Submissions Vault...</div>}>
      <AdminDashboardComponent />
    </Suspense>
  );
}

function AdminDashboardComponent() {
  const searchParams = useSearchParams();
  const formId = searchParams.get('id') ?? '1';

  const [submissions, setSubmissions] = useState<Submission[]>([]);
  const [loading, setLoading] = useState(true);
  const [status, setStatus] = useState('Loading...');
  const [searchTerm, setSearchTerm] = useState('');
  const [filterMode, setFilterMode] = useState('');
  const [filterTheme, setFilterTheme] = useState('');
  const [selectedSub, setSelectedSub] = useState<Submission | null>(null);

  const fetchSubmissions = async () => {
    try {
      setLoading(true);
      const response = await fetch(`${API_BASE}/api/submissions?formId=${formId}`, { cache: 'no-store' });
      if (!response.ok) {
        throw new Error('Failed to fetch data');
      }
      const data = (await response.json()) as Submission[];
      setSubmissions(data);
      setStatus('Connected');
    } catch {
      setStatus('Backend offline');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void fetchSubmissions();

    if (typeof window !== 'undefined') {
      const theme = localStorage.getItem('novaforms-theme') ?? 'silver';
      const density = localStorage.getItem('novaforms-density') ?? 'comfortable';
      document.documentElement.dataset.theme = theme;
      document.documentElement.dataset.density = density;
      
      const accent = localStorage.getItem('novaforms-accent') ?? 'default';
      const radius = localStorage.getItem('novaforms-radius') ?? '16px';
      const grid = localStorage.getItem('novaforms-grid') ?? '0.03';
      const enableBlur = localStorage.getItem('novaforms-enable-blur') === 'true';
      
      const root = document.documentElement;
      root.style.setProperty('--card-radius', radius);
      root.style.setProperty('--grid-opacity', grid);
      root.dataset.perf = enableBlur ? 'high' : 'eco';
      
      if (accent === 'default') {
        root.style.removeProperty('--accent');
        root.style.removeProperty('--accent-glow');
      } else {
        root.style.setProperty('--accent', accent);
        root.style.setProperty('--accent-glow', `${accent}25`);
      }
    }
  }, [formId]);

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
      if (selectedSub?.id === id) {
        setSelectedSub(null);
      }
    } catch {
      alert('Could not delete submission. Backend might be unreachable.');
    }
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

  // CSV Exporter
  const exportToCSV = () => {
    const headers = [
      'ID',
      'Form Title',
      'Form Description',
      'Full Name',
      'Email',
      'Company',
      'Rating',
      'Submission Mode',
      'Theme Mode',
      'Layout Density',
      'Interests',
      'Message',
      'Created At'
    ];

    const rows = filteredSubmissions.map((sub) => [
      sub.id,
      `"${(sub.formTitle || '').replace(/"/g, '""')}"`,
      `"${(sub.formDescription || '').replace(/"/g, '""')}"`,
      `"${(sub.fullName || '').replace(/"/g, '""')}"`,
      `"${(sub.email || '').replace(/"/g, '""')}"`,
      `"${(sub.company || '').replace(/"/g, '""')}"`,
      sub.rating ?? 0,
      sub.submissionMode || 'standard',
      sub.themeMode || 'silver',
      sub.layoutDensity || 'comfortable',
      `"${(sub.interests || []).join(', ').replace(/"/g, '""')}"`,
      `"${(sub.message || '').replace(/"/g, '""')}"`,
      sub.createdAt
    ]);

    const csvContent = [headers.join(','), ...rows.map((row) => row.join(','))].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', `novaforms_submissions_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Analytics helper calculations
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
      <section className="hero">
        <div className="hero-copy">
          <p className="eyebrow">Administration</p>
          <h1>Response Center.</h1>
          <p className="lede">Access form database snapshots, export spreadsheets, and analyze submissions.</p>
        </div>

        <div className="hero-panel">
          <div className="stat-card">
            <span>Filtered Total</span>
            <strong>{filteredSubmissions.length}</strong>
          </div>
          <div className="stat-card">
            <span>Avg Rating</span>
            <strong>{stats.avgRating}</strong>
          </div>
          <div className="hero-note">
            <p className="section-label">Database Status</p>
            <strong>{status}</strong>
            <span>Connected to backend at {API_BASE}.</span>
          </div>
        </div>
      </section>

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
        <div className="control-bar">
          <div className="search-box">
            <input
              type="text"
              placeholder="Search by name, email, or title..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>

          <div className="filter-dropdowns">
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
              onClick={exportToCSV}
              disabled={filteredSubmissions.length === 0}
            >
              Export CSV for Excel/Sheets
            </button>
          </div>
        </div>

        {/* Spreadsheet Data Grid */}
        <div className="grid-scroller">
          <table className="spreadsheet-grid">
            <thead>
              <tr>
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
                  <td colSpan={10} className="grid-placeholder">Loading submissions from backend...</td>
                </tr>
              ) : filteredSubmissions.length === 0 ? (
                <tr>
                  <td colSpan={10} className="grid-placeholder">No records match the current filters.</td>
                </tr>
              ) : (
                filteredSubmissions.map((sub) => (
                  <tr key={sub.id} className={selectedSub?.id === sub.id ? 'active-row' : ''}>
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
