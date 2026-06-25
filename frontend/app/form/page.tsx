'use client';

import { FormEvent, useEffect, useState, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';

type QuestionType = 'short-answer' | 'paragraph' | 'multiple-choice' | 'checkboxes' | 'dropdown' | 'scale' | 'date' | 'star-rating';
type QuestionField = 'fullName' | 'email' | 'company' | 'rating' | undefined;

type Question = {
  id: string;
  title: string;
  helpText: string;
  type: QuestionType;
  required: boolean;
  options: string[];
  scaleMax: number;
  fieldKey?: QuestionField;
  multiplyEnabled?: boolean;
  multiplyTriggerId?: string;
  pageNumber?: number;
};

type AnswerValue = string | string[];

const API_BASE = process.env.NEXT_PUBLIC_API_BASE_URL ?? 'http://localhost:8080';

const parseParticipantCount = (val: AnswerValue | undefined): number => {
  if (!val) return 1;
  const str = (typeof val === 'string' ? val : Array.isArray(val) ? val[0] : '').toLowerCase().trim();
  if (!str) return 1;

  if (str === 'solo' || str === '1' || str === 'one' || str === 'single') return 1;
  if (str === 'duo' || str === '2' || str === 'two' || str === 'double' || str === 'pair') return 2;
  if (str === 'trio' || str === '3' || str === 'three' || str === 'triple') return 3;
  if (str === 'quad' || str === '4' || str === 'four') return 4;
  if (str === 'quint' || str === '5' || str === 'five') return 5;

  const match = str.match(/\d+/);
  if (match) {
    const num = parseInt(match[0], 10);
    if (num > 0 && num <= 100) return num;
  }

  return 1;
};

const getYouTubeEmbedUrl = (url?: string) => {
  if (!url) return '';
  try {
    const regExp = /^.*(youtu.be\/|v\/|u\/\w\/|embed\/|watch\?v=|\&v=)([^#\&\?]*).*/;
    const match = url.match(regExp);
    if (match && match[2].length === 11) {
      return `https://www.youtube.com/embed/${match[2]}`;
    }
  } catch (e) {
    console.error("YouTube URL parsing error", e);
  }
  return url;
};

export default function PublicFormPage() {
  return (
    <Suspense fallback={<div style={{ padding: '100px', textAlign: 'center', color: 'var(--muted)' }}>Loading intake form...</div>}>
      <FormIntakeComponent />
    </Suspense>
  );
}

function FormIntakeComponent() {
  const searchParams = useSearchParams();
  const formId = searchParams.get('id') ?? '1';

  const [formConfig, setFormConfig] = useState<{
    title: string;
    description: string;
    workspaceName: string;
    theme: string;
    density: string;
    submissionMode: string;
    totalPages?: number;
    bannerUrl?: string;
    videoUrl?: string;
    questions: Question[];
  } | null>(null);

  const [answers, setAnswers] = useState<Record<string, AnswerValue>>({});
  const [loading, setLoading] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [currentPage, setCurrentPage] = useState(1);

  useEffect(() => {
    const loadFormConfig = async () => {
      try {
        const response = await fetch(`${API_BASE}/api/form-config/${formId}`, { cache: 'no-store' });
        if (response.ok) {
          const data = await response.json();
          const conf = data.config;
          if (conf) {
            let questions = [];
            try {
              questions = JSON.parse(conf.questionsJson || '[]');
            } catch (err) {
              console.error("Failed to parse questionsJson:", err);
            }
            const config = {
              title: conf.title || 'Orbit Intake',
              description: conf.description || '',
              workspaceName: conf.name || 'Nova Studio',
              theme: conf.themeMode || 'silver',
              density: conf.layoutDensity || 'comfortable',
              submissionMode: conf.submissionMode || 'standard',
              totalPages: conf.totalPages || 1,
              bannerUrl: conf.bannerUrl || '',
              videoUrl: conf.videoUrl || '',
              questions
            };
            setFormConfig(config);
            initAnswers(questions);
            applyThemeStyles(config.theme, config.density);
            return;
          }
        }
      } catch (err) {
        console.error("Failed to fetch form config from API", err);
      }

      // Try local storage
      const saved = localStorage.getItem('novaforms-published-form');
      if (saved) {
        try {
          const parsed = JSON.parse(saved);
          setFormConfig(parsed);
          initAnswers(parsed.questions);
          applyThemeStyles(parsed.theme, parsed.density);
          return;
        } catch (e) {
          console.error("Failed to parse local storage configuration", e);
        }
      }

      // Fallback defaults
      const defaultQuestions: Question[] = [
        { id: 'q-name', title: 'Full name', helpText: 'Required', type: 'short-answer', required: true, options: [], scaleMax: 5, fieldKey: 'fullName' },
        { id: 'q-email', title: 'Email address', helpText: 'Required', type: 'short-answer', required: true, options: [], scaleMax: 5, fieldKey: 'email' },
        { id: 'q-msg', title: 'Additional feedback', helpText: 'Optional', type: 'paragraph', required: false, options: [], scaleMax: 5 }
      ];
      const config = {
        title: 'Form Submission Intake',
        description: 'Please fill out this dynamic form response.',
        workspaceName: 'Nova Forms',
        theme: 'silver',
        density: 'comfortable',
        submissionMode: 'standard',
        questions: defaultQuestions
      };
      setFormConfig(config);
      initAnswers(defaultQuestions);
      applyThemeStyles('silver', 'comfortable');
    };

    void loadFormConfig();
  }, [formId]);

  const initAnswers = (questions: Question[]) => {
    const initial = questions.reduce<Record<string, AnswerValue>>((acc, q) => {
      if (q.type === 'checkboxes') {
        acc[q.id] = [];
      } else if (q.type === 'scale' || q.type === 'star-rating') {
        acc[q.id] = '5';
      } else {
        acc[q.id] = '';
      }
      return acc;
    }, {});
    setAnswers(initial);
  };

  const applyThemeStyles = (theme: string, density: string) => {
    document.documentElement.dataset.theme = theme;
    document.documentElement.dataset.density = density;
    
    // Load Customizations from localStorage if any
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
  };

  const setAnswer = (questionId: string, value: AnswerValue) => {
    setAnswers((current) => ({ ...current, [questionId]: value }));
  };

  const fieldAnswer = (field: Exclude<QuestionField, undefined>) => {
    if (!formConfig) return '';
    const question = formConfig.questions.find((item) => item.fieldKey === field);
    if (!question) return '';
    const value = answers[question.id];
    return typeof value === 'string' ? value : Array.isArray(value) ? value.join(', ') : '';
  };

  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!formConfig) return;
    setLoading(true);
    setErrorMsg('');

    // Locate mappings or guess values
    const fullNameVal = fieldAnswer('fullName') || (typeof answers[formConfig.questions.find(q => q.fieldKey === 'fullName')?.id ?? ''] === 'string' ? answers[formConfig.questions.find(q => q.fieldKey === 'fullName')?.id ?? ''] as string : '') || 'Guest User';
    const emailVal = fieldAnswer('email') || (typeof answers[formConfig.questions.find(q => q.fieldKey === 'email')?.id ?? ''] === 'string' ? answers[formConfig.questions.find(q => q.fieldKey === 'email')?.id ?? ''] as string : '') || 'guest@novaforms.io';
    const companyVal = fieldAnswer('company') || (typeof answers[formConfig.questions.find(q => q.fieldKey === 'company')?.id ?? ''] === 'string' ? answers[formConfig.questions.find(q => q.fieldKey === 'company')?.id ?? ''] as string : '') || '';
    const ratingVal = Number(fieldAnswer('rating') || answers[formConfig.questions.find(q => q.fieldKey === 'rating')?.id ?? ''] || 5);

    const payload = {
      formId: Number(formId),
      formTitle: formConfig.title,
      formDescription: formConfig.description,
      fullName: fullNameVal,
      email: emailVal,
      company: companyVal,
      rating: ratingVal,
      submissionMode: formConfig.submissionMode,
      themeMode: formConfig.theme,
      layoutDensity: formConfig.density,
      interests: formConfig.questions
        .filter((q) => q.type === 'checkboxes')
        .flatMap((q) => (Array.isArray(answers[q.id]) ? (answers[q.id] as string[]) : [])),
      questionsJson: JSON.stringify(formConfig.questions),
      answersJson: JSON.stringify(answers),
      message: formConfig.description
    };

    try {
      const response = await fetch(`${API_BASE}/api/submissions`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      if (!response.ok) {
        throw new Error('Submit failed');
      }
      setSubmitted(true);
    } catch {
      setErrorMsg('Could not submit response. Backend server might be offline.');
    } finally {
      setLoading(false);
    }
  };

  if (!formConfig) {
    return (
      <main className="shell">
        <div style={{ textAlign: 'center', padding: '100px 20px' }}>
          <p>Loading published form intake...</p>
        </div>
      </main>
    );
  }

  return (
    <main className="shell" style={{ maxWidth: '680px', padding: '60px 24px 100px' }}>
      {submitted ? (
        <section className="canvas" style={{ textAlign: 'center', padding: '48px 24px' }}>
          <div style={{ fontSize: '3rem', color: 'var(--success)' }}>✓</div>
          <h2 style={{ fontSize: '1.8rem', margin: '16px 0 8px', fontFamily: 'Orbitron, sans-serif' }}>Response Submitted!</h2>
          <p style={{ color: 'var(--muted)', marginBottom: '32px' }}>Your responses were successfully logged to the NovaForms vault.</p>
          <button type="button" className="submit-button" onClick={() => { setSubmitted(false); initAnswers(formConfig.questions); setCurrentPage(1); }}>
            Submit Another Response
          </button>
        </section>
      ) : (
        <form className="canvas" onSubmit={submit} style={{ gap: '24px' }}>
          {currentPage === 1 && (
            <div className="preview-card shell-card" style={{ borderTop: 'none', padding: formConfig.bannerUrl ? '0 0 24px 0' : '24px', overflow: 'hidden' }}>
              {formConfig.bannerUrl && (
                <div className="form-banner-container" style={{ borderRadius: '0' }}>
                  <img src={formConfig.bannerUrl} alt="Form Banner" className="form-banner-image" />
                </div>
              )}
              <div style={{ padding: formConfig.bannerUrl ? '24px 24px 0 24px' : '0' }}>
                <p className="preview-brand" style={{ fontSize: '0.72rem' }}>{formConfig.workspaceName || 'Nova Intake'}</p>
                <h1 style={{ fontSize: '2rem', margin: '4px 0 10px', fontFamily: 'Orbitron, sans-serif' }}>{formConfig.title}</h1>
                <p className="preview-lead" style={{ fontSize: '0.98rem' }}>{formConfig.description}</p>

                {formConfig.videoUrl && (
                  <div className="video-embed-wrapper">
                    <iframe
                      src={getYouTubeEmbedUrl(formConfig.videoUrl)}
                      title="Embedded Video"
                      allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                      allowFullScreen
                    />
                  </div>
                )}
              </div>
            </div>
          )}

          {errorMsg && (
            <div style={{ padding: '12px', border: '1px solid #ef4444', backgroundColor: 'rgba(239, 68, 68, 0.1)', color: '#ef4444', borderRadius: '12px', fontSize: '0.9rem' }}>
              {errorMsg}
            </div>
          )}

          <div className="question-stack" style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
            {formConfig.questions
              .filter((question) => (question.pageNumber || 1) === currentPage)
              .map((question) => {
                const value = answers[question.id];
              const getMultiplierCount = () => {
                if (!question.multiplyEnabled || !question.multiplyTriggerId) return 1;
                const triggerAnswer = answers[question.multiplyTriggerId];
                return parseParticipantCount(triggerAnswer);
              };
              const count = getMultiplierCount();
              return (
                <div key={question.id} className="preview-card" style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  <label className="preview-label" style={{ display: 'block', fontSize: '1rem', fontWeight: 600 }}>
                    {question.title} {question.required && <span style={{ color: 'var(--accent)' }}>*</span>}
                  </label>
                  {question.helpText && <span className="preview-help" style={{ display: 'block', fontSize: '0.8rem', color: 'var(--muted)' }}>{question.helpText}</span>}

                  {question.type === 'short-answer' && (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                      {Array.from({ length: count }).map((_, idx) => {
                        const val = Array.isArray(value) ? value[idx] || '' : idx === 0 ? (value as string || '') : '';
                        return (
                          <input
                            key={idx}
                            type="text"
                            placeholder={count > 1 ? `Participant ${idx + 1} answer` : ''}
                            required={question.required && idx === 0}
                            value={val}
                            onChange={(e) => {
                              if (count > 1) {
                                const next = Array.isArray(value) ? [...value] : [typeof value === 'string' ? value : ''];
                                while (next.length < count) next.push('');
                                next[idx] = e.target.value;
                                setAnswer(question.id, next);
                              } else {
                                setAnswer(question.id, e.target.value);
                              }
                            }}
                          />
                        );
                      })}
                    </div>
                  )}

                  {question.type === 'paragraph' && (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                      {Array.from({ length: count }).map((_, idx) => {
                        const val = Array.isArray(value) ? value[idx] || '' : idx === 0 ? (value as string || '') : '';
                        return (
                          <textarea
                            key={idx}
                            rows={4}
                            placeholder={count > 1 ? `Participant ${idx + 1} details` : ''}
                            required={question.required && idx === 0}
                            value={val}
                            onChange={(e) => {
                              if (count > 1) {
                                const next = Array.isArray(value) ? [...value] : [typeof value === 'string' ? value : ''];
                                while (next.length < count) next.push('');
                                next[idx] = e.target.value;
                                setAnswer(question.id, next);
                              } else {
                                setAnswer(question.id, e.target.value);
                              }
                            }}
                          />
                        );
                      })}
                    </div>
                  )}

                  {question.type === 'date' && (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                      {Array.from({ length: count }).map((_, idx) => {
                        const val = Array.isArray(value) ? value[idx] || '' : idx === 0 ? (value as string || '') : '';
                        return (
                          <input
                            key={idx}
                            type="date"
                            required={question.required && idx === 0}
                            value={val}
                            onChange={(e) => {
                              if (count > 1) {
                                const next = Array.isArray(value) ? [...value] : [typeof value === 'string' ? value : ''];
                                while (next.length < count) next.push('');
                                next[idx] = e.target.value;
                                setAnswer(question.id, next);
                              } else {
                                setAnswer(question.id, e.target.value);
                              }
                            }}
                          />
                        );
                      })}
                    </div>
                  )}

                  {question.type === 'dropdown' && (
                    <select
                      required={question.required}
                      value={typeof value === 'string' ? value : ''}
                      onChange={(e) => setAnswer(question.id, e.target.value)}
                    >
                      <option value="">Choose an option</option>
                      {question.options.map((opt) => (
                        <option key={opt} value={opt}>{opt}</option>
                      ))}
                    </select>
                  )}

                  {question.type === 'multiple-choice' && (
                    <div className="choice-stack" style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                      {question.options.map((opt) => (
                        <label key={opt} className="choice-item" style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer' }}>
                          <input
                            type="radio"
                            name={question.id}
                            required={question.required && !value}
                            value={opt}
                            checked={typeof value === 'string' && value === opt}
                            onChange={(e) => setAnswer(question.id, e.target.value)}
                          />
                          <span>{opt}</span>
                        </label>
                      ))}
                    </div>
                  )}

                  {question.type === 'checkboxes' && (
                    <div className="choice-stack" style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                      {question.options.map((opt) => {
                        const selected = Array.isArray(value) ? value : [];
                        return (
                          <label key={opt} className="choice-item" style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer' }}>
                            <input
                              type="checkbox"
                              checked={selected.includes(opt)}
                              onChange={(e) => {
                                const next = e.target.checked
                                  ? [...selected, opt]
                                  : selected.filter((item) => item !== opt);
                                setAnswer(question.id, next);
                              }}
                            />
                            <span>{opt}</span>
                          </label>
                        );
                      })}
                    </div>
                  )}

                  {question.type === 'scale' && (
                    <div className="scale-wrap" style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                      <input
                        type="range"
                        min="1"
                        max={String(question.scaleMax)}
                        value={typeof value === 'string' ? value : '5'}
                        onChange={(e) => setAnswer(question.id, e.target.value)}
                      />
                      <div className="scale-labels" style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.8rem', color: 'var(--muted)' }}>
                        <span>1</span>
                        <span>{typeof value === 'string' ? value : '5'}</span>
                        <span>{question.scaleMax}</span>
                      </div>
                    </div>
                  )}

                  {question.type === 'star-rating' && (
                    <div className="star-row" style={{ display: 'flex', gap: '8px' }}>
                      {[1, 2, 3, 4, 5].map((star) => {
                        const ratingVal = Number(value || '5');
                        return (
                          <button
                            key={star}
                            type="button"
                            className={star <= ratingVal ? 'star-btn active' : 'star-btn'}
                            onClick={() => setAnswer(question.id, String(star))}
                            style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: '1.8rem' }}
                          >
                            ★
                          </button>
                        );
                      })}
                    </div>
                  )}
                </div>
              );
            })}
          </div>

          {formConfig.totalPages && formConfig.totalPages > 1 && (
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', margin: '24px 0 12px', padding: '16px', background: 'rgba(255,255,255,0.01)', border: '1px solid var(--border)', borderRadius: '12px' }}>
              <span style={{ fontSize: '0.85rem', color: 'var(--muted)', fontWeight: 'bold' }}>Page {currentPage} of {formConfig.totalPages}</span>
              <div style={{ display: 'flex', gap: '8px' }}>
                <button
                  type="button"
                  className="ghost-button"
                  disabled={currentPage === 1}
                  onClick={() => setCurrentPage(prev => prev - 1)}
                >
                  Back
                </button>
                {currentPage < formConfig.totalPages && (
                  <button
                    type="button"
                    className="submit-button"
                    style={{ padding: '8px 16px', borderRadius: '8px' }}
                    onClick={() => {
                      // Validate required fields on current page
                      const pageQuestions = formConfig.questions.filter(q => (q.pageNumber || 1) === currentPage);
                      const invalid = pageQuestions.some(q => {
                        if (!q.required) return false;
                        const val = answers[q.id];
                        return !val || (typeof val === 'string' && val.trim() === '') || (Array.isArray(val) && val.length === 0);
                      });
                      if (invalid) {
                        alert("Please fill out all required fields on this page before proceeding.");
                      } else {
                        setCurrentPage(prev => prev + 1);
                      }
                    }}
                  >
                    Next Page
                  </button>
                )}
              </div>
            </div>
          )}

          {(!formConfig.totalPages || formConfig.totalPages === 1 || currentPage === formConfig.totalPages) && (
            <button className="submit-button" type="submit" disabled={loading} style={{ marginTop: '16px', width: '100%' }}>
              {loading ? 'Submitting response...' : 'Submit Response'}
            </button>
          )}
        </form>
      )}
    </main>
  );
}
