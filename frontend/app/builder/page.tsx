'use client';

import { FormEvent, useEffect, useMemo, useState, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import { useAuth } from '../AuthProvider';

type ThemeMode = 'silver' | 'graphite' | 'onyx' | 'cyberpunk';
type DensityMode = 'compact' | 'comfortable' | 'spacious';
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

type BuilderState = {
  formTitle: string;
  formDescription: string;
  workspaceName: string;
  themeMode: ThemeMode;
  densityMode: DensityMode;
  submissionMode: 'standard' | 'urgent' | 'branch' | 'approval';
  totalPages: number;
  bannerUrl: string;
  videoUrl: string;
};

type AnswerValue = string | string[];

const API_BASE = process.env.NEXT_PUBLIC_API_BASE_URL ?? 'http://localhost:8080';

const themeChoices: Array<{ value: ThemeMode; label: string; hint: string }> = [
  { value: 'silver', label: 'Silver', hint: 'Bright steel' },
  { value: 'graphite', label: 'Graphite', hint: 'Balanced gray' },
  { value: 'onyx', label: 'Onyx', hint: 'Pure black' },
  { value: 'cyberpunk', label: 'Cyberpunk', hint: 'Amber & gold' }
];

const densityChoices: Array<{ value: DensityMode; label: string; hint: string }> = [
  { value: 'compact', label: 'Compact', hint: 'Dense layout' },
  { value: 'comfortable', label: 'Comfortable', hint: 'Balanced spacing' },
  { value: 'spacious', label: 'Spacious', hint: 'More separation' }
];

const questionPalette: Array<{ type: QuestionType; label: string; description: string }> = [
  { type: 'short-answer', label: 'Short answer', description: 'Single line' },
  { type: 'paragraph', label: 'Paragraph', description: 'Long form' },
  { type: 'multiple-choice', label: 'Multiple choice', description: 'One option' },
  { type: 'checkboxes', label: 'Checkboxes', description: 'Multiple options' },
  { type: 'dropdown', label: 'Dropdown', description: 'Compact select' },
  { type: 'scale', label: 'Linear scale', description: '1 to 10' },
  { type: 'date', label: 'Date picker', description: 'Calendar date' },
  { type: 'star-rating', label: 'Star rating', description: '1 to 5 stars' }
];

const starterQuestions: Question[] = [
  {
    id: 'q-full-name',
    title: 'Full name',
    helpText: 'Required field.',
    type: 'short-answer',
    required: true,
    options: [],
    scaleMax: 5,
    fieldKey: 'fullName',
    pageNumber: 1
  },
  {
    id: 'q-email',
    title: 'Email address',
    helpText: 'Delivery email.',
    type: 'short-answer',
    required: true,
    options: [],
    scaleMax: 5,
    fieldKey: 'email',
    pageNumber: 1
  },
  {
    id: 'q-company',
    title: 'Company / team',
    helpText: 'Optional company label.',
    type: 'short-answer',
    required: false,
    options: [],
    scaleMax: 5,
    fieldKey: 'company',
    pageNumber: 1
  },
  {
    id: 'q-rating',
    title: 'How polished should this form feel?',
    helpText: 'Priority score.',
    type: 'scale',
    required: true,
    options: [],
    scaleMax: 10,
    fieldKey: 'rating',
    pageNumber: 1
  }
];

const createQuestion = (type: QuestionType): Question => ({
  id: `q-${crypto.randomUUID()}`,
  title:
    type === 'short-answer'
      ? 'Untitled short answer'
      : type === 'paragraph'
        ? 'Untitled paragraph'
        : type === 'multiple-choice'
          ? 'Untitled multiple choice'
          : type === 'checkboxes'
            ? 'Untitled checkbox set'
            : type === 'dropdown'
              ? 'Untitled dropdown'
              : type === 'scale'
                ? 'Untitled scale'
                : type === 'date'
                  ? 'Untitled date'
                  : 'Untitled star rating',
  helpText: 'Add a short helper line.',
  type,
  required: false,
  options:
    type === 'multiple-choice'
      ? ['Option 1', 'Option 2', 'Option 3']
      : type === 'checkboxes'
        ? ['Choice 1', 'Choice 2', 'Choice 3']
        : type === 'dropdown'
          ? ['Option A', 'Option B', 'Option C']
          : [],
  scaleMax: type === 'scale' ? 10 : 5,
  pageNumber: 1
});

const buildInitialAnswers = (questions: Question[]) =>
  questions.reduce<Record<string, AnswerValue>>((result, question) => {
    if (question.type === 'checkboxes') {
      result[question.id] = [];
    } else if (question.type === 'scale' || question.type === 'star-rating') {
      result[question.id] = '5';
    } else {
      result[question.id] = '';
    }
    return result;
  }, {});

const isChoiceQuestion = (type: QuestionType) =>
  type === 'multiple-choice' || type === 'checkboxes' || type === 'dropdown';

const stringifyList = (value?: string) => {
  if (!value) {
    return [] as unknown[];
  }

  try {
    const parsed = JSON.parse(value);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
};

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

export default function BuilderPage() {
  return (
    <Suspense fallback={<div style={{ padding: '100px', textAlign: 'center', color: 'var(--muted)' }}>Loading Form Builder Studio...</div>}>
      <BuilderComponent />
    </Suspense>
  );
}

function BuilderComponent() {
  const searchParams = useSearchParams();
  const formId = searchParams.get('id') ?? '1';
  const { user: authUser } = useAuth();
  const currentUser = authUser?.email ?? 'owner@novaforms.com';

  const [builder, setBuilder] = useState<BuilderState>(() => {
    if (typeof window !== 'undefined') {
      const savedTheme = localStorage.getItem('novaforms-theme') as ThemeMode | null;
      const savedDensity = localStorage.getItem('novaforms-density') as DensityMode | null;
      return {
        formTitle: 'Orbit Intake',
        formDescription: 'Dark enterprise form builder with live preview.',
        workspaceName: 'Nova Studio',
        themeMode: savedTheme ?? 'silver',
        densityMode: savedDensity ?? 'comfortable',
        submissionMode: 'standard',
        totalPages: 1,
        bannerUrl: '',
        videoUrl: ''
      };
    }
    return {
      formTitle: 'Orbit Intake',
      formDescription: 'Dark enterprise form builder with live preview.',
      workspaceName: 'Nova Studio',
      themeMode: 'silver',
      densityMode: 'comfortable',
      submissionMode: 'standard',
      totalPages: 1,
      bannerUrl: '',
      videoUrl: ''
    };
  });

  const [collaborators, setCollaborators] = useState<any[]>([]);
  const [activeTransfer, setActiveTransfer] = useState<any>(null);

  // Input fields state for collaborator manager
  const [newColEmail, setNewColEmail] = useState('');
  const [newColRole, setNewColRole] = useState<'OWNER' | 'EDITOR' | 'VIEWER'>('EDITOR');
  const [transferTargetEmail, setTransferTargetEmail] = useState('');
  const [transferDemotedRole, setTransferDemotedRole] = useState<'EDITOR' | 'VIEWER'>('EDITOR');
  const [questions, setQuestions] = useState<Question[]>(starterQuestions);
  const [answers, setAnswers] = useState<Record<string, AnswerValue>>(() => buildInitialAnswers(starterQuestions));
  const [submissions, setSubmissions] = useState<Submission[]>([]);
  const [status, setStatus] = useState('Ready');
  const [loading, setLoading] = useState(false);
  const [activeTab, setActiveTab] = useState<'editor' | 'preview'>('editor');
  const [showPublishSuccess, setShowPublishSuccess] = useState(false);
  const [copied, setCopied] = useState(false);
  const [previewPage, setPreviewPage] = useState(1);

  const [accentColor, setAccentColor] = useState<string>(() => {
    if (typeof window !== 'undefined') {
      return localStorage.getItem('novaforms-accent') ?? 'default';
    }
    return 'default';
  });
  const [borderRadius, setBorderRadius] = useState<string>(() => {
    if (typeof window !== 'undefined') {
      return localStorage.getItem('novaforms-radius') ?? '16px';
    }
    return '16px';
  });
  const [gridOpacity, setGridOpacity] = useState<number>(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('novaforms-grid');
      return saved !== null ? Number(saved) : 0.03;
    }
    return 0.03;
  });
  const [enableBlur, setEnableBlur] = useState<boolean>(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('novaforms-enable-blur');
      return saved !== null ? saved === 'true' : false;
    }
    return false;
  });

  useEffect(() => {
    document.documentElement.dataset.theme = builder.themeMode;
    document.documentElement.dataset.density = builder.densityMode;
    localStorage.setItem('novaforms-theme', builder.themeMode);
    localStorage.setItem('novaforms-density', builder.densityMode);
  }, [builder.densityMode, builder.themeMode]);

  useEffect(() => {
    const root = document.documentElement;
    root.style.setProperty('--card-radius', borderRadius);
    root.style.setProperty('--grid-opacity', String(gridOpacity));
    root.dataset.perf = enableBlur ? 'high' : 'eco';
    
    if (accentColor === 'default') {
      root.style.removeProperty('--accent');
      root.style.removeProperty('--accent-glow');
    } else {
      root.style.setProperty('--accent', accentColor);
      root.style.setProperty('--accent-glow', `${accentColor}25`);
    }

    localStorage.setItem('novaforms-accent', accentColor);
    localStorage.setItem('novaforms-radius', borderRadius);
    localStorage.setItem('novaforms-grid', String(gridOpacity));
    localStorage.setItem('novaforms-enable-blur', String(enableBlur));
  }, [borderRadius, gridOpacity, accentColor, enableBlur]);

  const currentUserRole = useMemo(() => {
    const col = collaborators.find(c => c.email.toLowerCase() === currentUser.toLowerCase());
    return col ? col.role : 'VIEWER'; // default to VIEWER if not registered
  }, [collaborators, currentUser]);

  const loadConfig = async () => {
    try {
      const res = await fetch(`${API_BASE}/api/form-config/${formId}`);
      if (res.ok) {
        const data = await res.json();
        const conf = data.config;
        if (conf) {
          setBuilder({
            formTitle: conf.title || 'Orbit Intake',
            formDescription: conf.description || '',
            workspaceName: conf.name || 'Nova Studio',
            themeMode: (conf.themeMode as ThemeMode) || 'silver',
            densityMode: (conf.layoutDensity as DensityMode) || 'comfortable',
            submissionMode: conf.submissionMode || 'standard',
            totalPages: conf.totalPages || 1,
            bannerUrl: conf.bannerUrl || '',
            videoUrl: conf.videoUrl || ''
          });
          if (conf.questionsJson) {
            try {
              const q = JSON.parse(conf.questionsJson);
              if (Array.isArray(q) && q.length > 0) {
                setQuestions(q);
              }
            } catch (e) {
              console.error("Failed to parse questionsJson", e);
            }
          }
        }
        setCollaborators(data.collaborators || []);
        setActiveTransfer(data.activeTransfer || null);
      }
    } catch (err) {
      console.error("Failed to load config", err);
    }
  };

  useEffect(() => {
    void loadConfig();

    const loadSubmissions = async () => {
      try {
        const response = await fetch(`${API_BASE}/api/submissions?formId=${formId}`, { cache: 'no-store' });
        if (response.ok) {
          setSubmissions((await response.json()) as Submission[]);
        }
      } catch {
        setStatus('Backend offline');
      }
    };
    void loadSubmissions();

    const handleTransferUpdate = () => {
      void loadConfig();
    };

    if (typeof window !== 'undefined') {
      window.addEventListener('novaforms-transfer-updated', handleTransferUpdate);
    }

    return () => {
      if (typeof window !== 'undefined') {
        window.removeEventListener('novaforms-transfer-updated', handleTransferUpdate);
      }
    };
  }, [formId, currentUser]);

  const statistics = useMemo(
    () => [
      { label: 'Questions', value: questions.length },
      { label: 'Required', value: questions.filter((question) => question.required).length },
      { label: 'Submissions', value: submissions.length },
      { label: 'Theme', value: builder.themeMode.toUpperCase() }
    ],
    [builder.themeMode, questions, submissions.length]
  );

  const [uploading, setUploading] = useState(false);

  const handleImageUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setUploading(true);
    const formData = new FormData();
    formData.append('file', file);

    try {
      const res = await fetch(`${API_BASE}/api/storage/upload`, {
        method: 'POST',
        body: formData,
      });

      if (res.ok) {
        const data = await res.json();
        setBuilder((prev) => ({ ...prev, bannerUrl: data.url }));
        setStatus('Uploaded banner successfully');
      } else {
        const errData = await res.json().catch(() => ({}));
        alert(errData.error || 'Failed to upload image');
      }
    } catch (err) {
      console.error(err);
      alert('Network error uploading image');
    } finally {
      setUploading(false);
    }
  };

  const handleAddCollaborator = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newColEmail.trim()) return;
    try {
      const res = await fetch(`${API_BASE}/api/form-config/${formId}/collaborators`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: newColEmail.trim(), role: newColRole })
      });
      if (res.ok) {
        setNewColEmail('');
        void loadConfig();
      }
    } catch (err) {
      alert("Failed to add collaborator");
    }
  };

  const handleDeleteCollaborator = async (id: number) => {
    try {
      const res = await fetch(`${API_BASE}/api/form-config/collaborators/${id}`, {
        method: 'DELETE'
      });
      if (res.ok) {
        void loadConfig();
      }
    } catch (err) {
      alert("Failed to delete collaborator");
    }
  };

  const handleInitiateTransfer = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!transferTargetEmail.trim()) return;
    try {
      const res = await fetch(`${API_BASE}/api/form-config/${formId}/transfer/initiate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          fromEmail: currentUser,
          toEmail: transferTargetEmail.trim(),
          proposedNewRole: transferDemotedRole
        })
      });
      if (res.ok) {
        setTransferTargetEmail('');
        void loadConfig();
      }
    } catch (err) {
      alert("Failed to initiate transfer");
    }
  };

  const handleCancelTransfer = async () => {
    try {
      const res = await fetch(`${API_BASE}/api/form-config/${formId}/transfer/cancel`, {
        method: 'POST'
      });
      if (res.ok) {
        void loadConfig();
      }
    } catch (err) {
      alert("Failed to cancel transfer");
    }
  };

  const updateQuestion = (questionId: string, updater: (question: Question) => Question) => {
    setQuestions((current) => current.map((question) => (question.id === questionId ? updater(question) : question)));
  };

  const setAnswer = (questionId: string, value: AnswerValue) => {
    setAnswers((current) => ({ ...current, [questionId]: value }));
  };

  const addQuestion = (type: QuestionType) => {
    const question = createQuestion(type);
    setQuestions((current) => [...current, question]);
    setAnswers((current) => ({
      ...current,
      [question.id]: type === 'checkboxes' ? [] : (type === 'scale' || type === 'star-rating') ? '5' : ''
    }));
  };

  const duplicateQuestion = (questionId: string) => {
    const source = questions.find((question) => question.id === questionId);

    if (!source) {
      return;
    }

    const duplicate = {
      ...source,
      id: `q-${crypto.randomUUID()}`,
      title: `${source.title} copy`,
      fieldKey: undefined
    };

    setQuestions((current) => [...current, duplicate]);
    setAnswers((current) => ({
      ...current,
      [duplicate.id]: duplicate.type === 'checkboxes' ? [] : (duplicate.type === 'scale' || duplicate.type === 'star-rating') ? '5' : ''
    }));
  };

  const deleteQuestion = (questionId: string) => {
    setQuestions((current) => current.filter((question) => question.id !== questionId));
    setAnswers((current) => {
      const next = { ...current };
      delete next[questionId];
      return next;
    });
  };

  const moveQuestion = (index: number, direction: 'up' | 'down') => {
    const nextIndex = direction === 'up' ? index - 1 : index + 1;
    if (nextIndex < 0 || nextIndex >= questions.length) {
      return;
    }
    setQuestions((current) => {
      const next = [...current];
      const temp = next[index];
      next[index] = next[nextIndex];
      next[nextIndex] = temp;
      return next;
    });
  };

  const changeQuestionType = (questionId: string, nextType: QuestionType) => {
    updateQuestion(questionId, (question) => ({
      ...question,
      type: nextType,
      options: isChoiceQuestion(nextType) ? question.options.length ? question.options : createQuestion(nextType).options : [],
      scaleMax: nextType === 'scale' ? Math.max(question.scaleMax, 5) : question.scaleMax,
      fieldKey: question.fieldKey && ['short-answer', 'scale'].includes(nextType) ? question.fieldKey : undefined
    }));

    setAnswer(questionId, nextType === 'checkboxes' ? [] : (nextType === 'scale' || nextType === 'star-rating') ? '5' : '');
  };

  const addOption = (questionId: string) => {
    updateQuestion(questionId, (question) => ({
      ...question,
      options: [...question.options, `Option ${question.options.length + 1}`]
    }));
  };

  const updateOption = (questionId: string, optionIndex: number, value: string) => {
    updateQuestion(questionId, (question) => {
      const nextOptions = [...question.options];
      nextOptions[optionIndex] = value;
      return { ...question, options: nextOptions };
    });
  };

  const removeOption = (questionId: string, optionIndex: number) => {
    updateQuestion(questionId, (question) => ({
      ...question,
      options: question.options.filter((_, index) => index !== optionIndex)
    }));
  };


  const renderBuilderQuestion = (question: Question) => {
    const index = questions.findIndex((q) => q.id === question.id);
    return (
      <article key={question.id} className="question-card">
        <div className="question-head">
          <div>
            <p className="question-kind" style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
              <span>{question.type.replace('-', ' ')}</span>
              {builder.totalPages > 1 && (
                <span style={{
                  background: 'rgba(255, 255, 255, 0.08)',
                  color: 'var(--accent)',
                  padding: '2px 6px',
                  borderRadius: '4px',
                  fontSize: '0.7rem',
                  fontWeight: 'bold',
                  border: '1px solid var(--border)'
                }}>
                  Page {question.pageNumber ?? 1}
                </span>
              )}
            </p>
            <h3>{question.title}</h3>
          </div>
          <div className="question-actions">
            <button
              type="button"
              className="ghost-button"
              disabled={index === 0}
              onClick={() => moveQuestion(index, 'up')}
              title="Move Up"
            >
              ▲
            </button>
            <button
              type="button"
              className="ghost-button"
              disabled={index === questions.length - 1}
              onClick={() => moveQuestion(index, 'down')}
              title="Move Down"
            >
              ▼
            </button>
            <button type="button" className="ghost-button" onClick={() => duplicateQuestion(question.id)}>
              Duplicate
            </button>
            <button type="button" className="ghost-button danger" onClick={() => deleteQuestion(question.id)}>
              Remove
            </button>
          </div>
        </div>

      <div className="grid two">
        <label>
          Question title
          <input
            value={question.title}
            onChange={(event) => updateQuestion(question.id, (current) => ({ ...current, title: event.target.value }))}
          />
        </label>
        <label>
          Type
          <select value={question.type} onChange={(event) => changeQuestionType(question.id, event.target.value as QuestionType)}>
            {questionPalette.map((entry) => (
              <option key={entry.type} value={entry.type}>
                {entry.label}
              </option>
            ))}
          </select>
        </label>
      </div>

      <label>
        Help text
        <input
          value={question.helpText}
          onChange={(event) => updateQuestion(question.id, (current) => ({ ...current, helpText: event.target.value }))}
        />
      </label>

      <div className="question-meta" style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '16px', alignItems: 'center' }}>
        <label className="toggle-row">
          <input
            type="checkbox"
            checked={question.required}
            onChange={(event) => updateQuestion(question.id, (current) => ({ ...current, required: event.target.checked }))}
          />
          <span>Required</span>
        </label>
        <label>
          Field mapping
          <select
            value={question.fieldKey ?? ''}
            onChange={(event) =>
              updateQuestion(question.id, (current) => ({
                ...current,
                fieldKey: (event.target.value || undefined) as QuestionField
              }))
            }
          >
            <option value="">None</option>
            <option value="fullName">Full name</option>
            <option value="email">Email</option>
            <option value="company">Company</option>
            <option value="rating">Rating</option>
          </select>
        </label>
        <label>
          Assign to Page
          <select
            value={question.pageNumber ?? 1}
            onChange={(event) =>
              updateQuestion(question.id, (current) => ({
                ...current,
                pageNumber: Number(event.target.value)
              }))
            }
          >
            {Array.from({ length: builder.totalPages }).map((_, idx) => (
              <option key={idx + 1} value={idx + 1}>
                Page {idx + 1}
              </option>
            ))}
          </select>
        </label>
      </div>

      <div style={{ borderTop: '1px solid var(--border)', paddingTop: '16px', marginTop: '8px', display: 'flex', flexDirection: 'column', gap: '12px' }}>
        <label className="toggle-row">
          <input
            type="checkbox"
            checked={question.multiplyEnabled || false}
            onChange={(event) =>
              updateQuestion(question.id, (current) => ({
                ...current,
                multiplyEnabled: event.target.checked
              }))
            }
          />
          <span>Multiply dynamically based on another question's response</span>
        </label>

        {question.multiplyEnabled && (
          <label style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
            <span>Select trigger question</span>
            <select
              value={question.multiplyTriggerId ?? ''}
              onChange={(event) =>
                updateQuestion(question.id, (current) => ({
                  ...current,
                  multiplyTriggerId: event.target.value || undefined
                }))
              }
            >
              <option value="">Choose a question</option>
              {questions
                .filter((q) => q.id !== question.id && ['dropdown', 'multiple-choice', 'scale'].includes(q.type))
                .map((q) => (
                  <option key={q.id} value={q.id}>
                    {q.title || `Untitled ${q.type}`}
                  </option>
                ))}
            </select>
          </label>
        )}
      </div>

      {isChoiceQuestion(question.type) ? (
        <div className="option-block">
          <div className="question-head mini">
            <p className="question-kind">Options</p>
            <button type="button" className="ghost-button" onClick={() => addOption(question.id)}>
              Add option
            </button>
          </div>
          <div className="option-list">
            {question.options.map((option, index) => (
              <div key={`${question.id}-${index}`} className="option-row">
                <input
                  value={option}
                  placeholder={`Option ${index + 1}`}
                  title={`Option ${index + 1}`}
                  onChange={(event) => updateOption(question.id, index, event.target.value)}
                />
                <button type="button" className="icon-button" onClick={() => removeOption(question.id, index)}>
                  −
                </button>
              </div>
            ))}
          </div>
        </div>
      ) : null}

      {question.type === 'scale' ? (
        <label>
          Scale maximum
          <input
            type="range"
            min="5"
            max="10"
            value={String(question.scaleMax)}
            onChange={(event) => updateQuestion(question.id, (current) => ({ ...current, scaleMax: Number(event.target.value) }))}
          />
          <span className="helper">Preview max: {question.scaleMax}</span>
        </label>
      ) : null}
    </article>
  ); };

  const renderPreviewQuestion = (question: Question) => {
    const value = answers[question.id];

    const getMultiplierCount = () => {
      if (!question.multiplyEnabled || !question.multiplyTriggerId) return 1;
      const triggerAnswer = answers[question.multiplyTriggerId];
      return parseParticipantCount(triggerAnswer);
    };
    const count = getMultiplierCount();

    if (question.type === 'date') {
      return (
        <div key={question.id} className="preview-card">
          <span className="preview-label">{question.title}</span>
          <span className="preview-help">{question.helpText}</span>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginTop: '4px' }}>
            {Array.from({ length: count }).map((_, idx) => {
              const val = Array.isArray(value) ? value[idx] || '' : idx === 0 ? (value as string || '') : '';
              return (
                <input
                  key={idx}
                  type="date"
                  value={val}
                  onChange={(event) => {
                    if (count > 1) {
                      const next = Array.isArray(value) ? [...value] : [typeof value === 'string' ? value : ''];
                      while (next.length < count) next.push('');
                      next[idx] = event.target.value;
                      setAnswer(question.id, next);
                    } else {
                      setAnswer(question.id, event.target.value);
                    }
                  }}
                />
              );
            })}
          </div>
        </div>
      );
    }

    if (question.type === 'star-rating') {
      const ratingVal = Number(value || '5');
      return (
        <div key={question.id} className="preview-card">
          <span className="preview-label">{question.title}</span>
          <span className="preview-help">{question.helpText}</span>
          <div className="star-row">
            {[1, 2, 3, 4, 5].map((star) => (
              <button
                key={star}
                type="button"
                className={star <= ratingVal ? 'star-btn active' : 'star-btn'}
                onClick={() => setAnswer(question.id, String(star))}
              >
                ★
              </button>
            ))}
          </div>
        </div>
      );
    }

    if (question.type === 'paragraph') {
      return (
        <div key={question.id} className="preview-card">
          <span className="preview-label">{question.title}</span>
          <span className="preview-help">{question.helpText}</span>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginTop: '4px' }}>
            {Array.from({ length: count }).map((_, idx) => {
              const val = Array.isArray(value) ? value[idx] || '' : idx === 0 ? (value as string || '') : '';
              return (
                <textarea
                  key={idx}
                  rows={4}
                  placeholder={count > 1 ? `Participant ${idx + 1} details` : ''}
                  value={val}
                  onChange={(event) => {
                    if (count > 1) {
                      const next = Array.isArray(value) ? [...value] : [typeof value === 'string' ? value : ''];
                      while (next.length < count) next.push('');
                      next[idx] = event.target.value;
                      setAnswer(question.id, next);
                    } else {
                      setAnswer(question.id, event.target.value);
                    }
                  }}
                />
              );
            })}
          </div>
        </div>
      );
    }

    if (question.type === 'short-answer') {
      return (
        <div key={question.id} className="preview-card">
          <span className="preview-label">{question.title}</span>
          <span className="preview-help">{question.helpText}</span>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginTop: '4px' }}>
            {Array.from({ length: count }).map((_, idx) => {
              const val = Array.isArray(value) ? value[idx] || '' : idx === 0 ? (value as string || '') : '';
              return (
                <input
                  key={idx}
                  type="text"
                  placeholder={count > 1 ? `Participant ${idx + 1} answer` : ''}
                  value={val}
                  onChange={(event) => {
                    if (count > 1) {
                      const next = Array.isArray(value) ? [...value] : [typeof value === 'string' ? value : ''];
                      while (next.length < count) next.push('');
                      next[idx] = event.target.value;
                      setAnswer(question.id, next);
                    } else {
                      setAnswer(question.id, event.target.value);
                    }
                  }}
                />
              );
            })}
          </div>
        </div>
      );
    }

    if (question.type === 'dropdown') {
      return (
        <label key={question.id} className="preview-card">
          <span className="preview-label">{question.title}</span>
          <span className="preview-help">{question.helpText}</span>
          <select value={typeof value === 'string' ? value : ''} onChange={(event) => setAnswer(question.id, event.target.value)}>
            <option value="">Choose an option</option>
            {question.options.map((option) => (
              <option key={option} value={option}>
                {option}
              </option>
            ))}
          </select>
        </label>
      );
    }

    if (question.type === 'multiple-choice') {
      return (
        <fieldset key={question.id} className="preview-card">
          <legend className="preview-label">{question.title}</legend>
          <span className="preview-help">{question.helpText}</span>
          <div className="choice-stack">
            {question.options.map((option) => (
              <label key={option} className="choice-item">
                <input
                  type="radio"
                  name={question.id}
                  value={option}
                  checked={typeof value === 'string' && value === option}
                  onChange={(event) => setAnswer(question.id, event.target.value)}
                />
                <span>{option}</span>
              </label>
            ))}
          </div>
        </fieldset>
      );
    }

    if (question.type === 'checkboxes') {
      const selected = Array.isArray(value) ? value : [];

      return (
        <fieldset key={question.id} className="preview-card">
          <legend className="preview-label">{question.title}</legend>
          <span className="preview-help">{question.helpText}</span>
          <div className="choice-stack">
            {question.options.map((option) => (
              <label key={option} className="choice-item">
                <input
                  type="checkbox"
                  checked={selected.includes(option)}
                  onChange={(event) => {
                    const next = event.target.checked ? [...selected, option] : selected.filter((item) => item !== option);
                    setAnswer(question.id, next);
                  }}
                />
                <span>{option}</span>
              </label>
            ))}
          </div>
        </fieldset>
      );
    }

    return (
      <label key={question.id} className="preview-card">
        <span className="preview-label">{question.title}</span>
        <span className="preview-help">{question.helpText}</span>
        <div className="scale-wrap">
          <input type="range" min="1" max={String(question.scaleMax)} value={typeof value === 'string' ? value : '5'} onChange={(event) => setAnswer(question.id, event.target.value)} />
          <div className="scale-labels">
            <span>1</span>
            <span>{typeof value === 'string' ? value : '5'}</span>
            <span>{question.scaleMax}</span>
          </div>
        </div>
      </label>
    );
  };

  const fieldAnswer = (field: Exclude<QuestionField, undefined>) => {
    const question = questions.find((item) => item.fieldKey === field);

    if (!question) {
      return '';
    }

    const value = answers[question.id];
    return typeof value === 'string' ? value : Array.isArray(value) ? value.join(', ') : '';
  };

  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (currentUserRole === 'VIEWER') {
      alert("Role Error: Viewers are not permitted to publish form configurations.");
      return;
    }
    setLoading(true);
    setStatus('Publishing...');

    const payload = {
      formTitle: builder.formTitle,
      formDescription: builder.formDescription,
      fullName: fieldAnswer('fullName'),
      email: fieldAnswer('email'),
      company: fieldAnswer('company'),
      rating: Number(fieldAnswer('rating') || 0),
      submissionMode: builder.submissionMode,
      themeMode: builder.themeMode,
      layoutDensity: builder.densityMode,
      interests: questions
        .filter((question) => question.type === 'checkboxes')
        .flatMap((question) => (Array.isArray(answers[question.id]) ? (answers[question.id] as string[]) : [])),
      questionsJson: JSON.stringify(questions),
      answersJson: JSON.stringify(answers),
      message: builder.formDescription
    };

    try {
      const response = await fetch(`${API_BASE}/api/submissions`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      // Save form configuration to backend DB
      const configPayload = {
        name: builder.workspaceName,
        title: builder.formTitle,
        description: builder.formDescription,
        bannerUrl: builder.bannerUrl,
        videoUrl: builder.videoUrl,
        questionsJson: JSON.stringify(questions),
        themeMode: builder.themeMode,
        layoutDensity: builder.densityMode,
        submissionMode: builder.submissionMode,
        totalPages: builder.totalPages
      };
      await fetch(`${API_BASE}/api/form-config/${formId}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(configPayload)
      });

      // Local storage backup
      const formConfig = {
        title: builder.formTitle,
        description: builder.formDescription,
        workspaceName: builder.workspaceName,
        theme: builder.themeMode,
        density: builder.densityMode,
        submissionMode: builder.submissionMode,
        totalPages: builder.totalPages,
        bannerUrl: builder.bannerUrl,
        videoUrl: builder.videoUrl,
        questions: questions
      };
      localStorage.setItem('novaforms-published-form', JSON.stringify(formConfig));

      const saved = (await response.json()) as Submission;
      setSubmissions((current) => [saved, ...current].slice(0, 8));
      setStatus('Saved');
      setShowPublishSuccess(true);
    } catch {
      setStatus('API unavailable');
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="shell forms-app">
      <section className="hero">
        <div className="hero-copy">
          <p className="eyebrow">Enterprise forms</p>
          <h1>Dark intake builder.</h1>
          <p className="lede">Clean forms, live preview, and response storage.</p>
          <div className="tag-row">
            {['Live preview', 'Theme presets', 'Question palette', 'Response vault'].map((tag) => (
              <span key={tag} className="tag">
                {tag}
              </span>
            ))}
          </div>
        </div>

        <div className="hero-panel">
          {statistics.map((stat) => (
            <div key={stat.label} className="stat-card">
              <span>{stat.label}</span>
              <strong>{stat.value}</strong>
            </div>
          ))}
          <div className="hero-note">
            <p className="section-label">Status</p>
            <strong>{status}</strong>
            <span>Each publish sends the full form snapshot to the Java backend.</span>
          </div>
        </div>
      </section>

      <section className="workspace">
        <aside className={`rail ${currentUserRole === 'VIEWER' ? 'viewer-disabled-overlay' : ''}`}>
          {currentUserRole === 'VIEWER' && (
            <div className="viewer-readonly-badge">
              READ ONLY MODE (VIEWER)
            </div>
          )}

          {/* Collaborators & Access Block */}
          <div className="rail-block">
            <p className="section-label">Collaborators & Access</p>
            
            {/* List collaborators */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginBottom: '12px' }}>
              {collaborators.map((c) => (
                <div key={c.id} className="collaborator-item">
                  <span className="collaborator-email" title={c.email}>{c.email}</span>
                  <div className="collaborator-controls">
                    {currentUserRole === 'OWNER' && c.email.toLowerCase() !== currentUser.toLowerCase() ? (
                      <>
                        <select
                          value={c.role}
                          onChange={async (e) => {
                            try {
                              await fetch(`${API_BASE}/api/form-config/${formId}/collaborators`, {
                                method: 'POST',
                                headers: { 'Content-Type': 'application/json' },
                                body: JSON.stringify({ email: c.email, role: e.target.value })
                              });
                              void loadConfig();
                            } catch (err) {
                              alert("Failed to update role");
                            }
                          }}
                          className="collaborator-role-select"
                        >
                          <option value="OWNER">Owner</option>
                          <option value="EDITOR">Editor</option>
                          <option value="VIEWER">Viewer</option>
                        </select>
                        <button
                          type="button"
                          onClick={() => handleDeleteCollaborator(c.id)}
                          className="collaborator-delete-btn"
                          title="Remove collaborator"
                        >
                          &times;
                        </button>
                      </>
                    ) : (
                      <span className={`role-badge ${c.role.toLowerCase()}`} style={{ fontSize: '0.6rem' }}>{c.role}</span>
                    )}
                  </div>
                </div>
              ))}
            </div>

            {/* Add Collaborator form (Owner only) */}
            {currentUserRole === 'OWNER' && (
              <form onSubmit={handleAddCollaborator} style={{ display: 'flex', flexDirection: 'column', gap: '8px', borderTop: '1px solid var(--border)', paddingTop: '12px', marginBottom: '12px' }}>
                <span style={{ fontSize: '0.72rem', color: 'var(--muted)', fontWeight: 'bold' }}>Add Collaborator</span>
                <input
                  type="email"
                  required
                  placeholder="Collaborator email"
                  value={newColEmail}
                  onChange={(e) => setNewColEmail(e.target.value)}
                  style={{ fontSize: '0.8rem', padding: '6px' }}
                />
                <div style={{ display: 'flex', gap: '6px' }}>
                  <select
                    value={newColRole}
                    onChange={(e) => setNewColRole(e.target.value as any)}
                    style={{ flex: 1, fontSize: '0.8rem', padding: '6px' }}
                  >
                    <option value="EDITOR">Editor</option>
                    <option value="VIEWER">Viewer</option>
                    <option value="OWNER">Owner</option>
                  </select>
                  <button type="submit" className="submit-button" style={{ padding: '6px 12px', fontSize: '0.8rem', borderRadius: '6px' }}>Add</button>
                </div>
              </form>
            )}

            {/* Ownership Transfer form (Owner only) */}
            {currentUserRole === 'OWNER' && (
              <div style={{ borderTop: '1px solid var(--border)', paddingTop: '12px' }}>
                <span style={{ fontSize: '0.72rem', color: 'var(--muted)', fontWeight: 'bold', display: 'block', marginBottom: '6px' }}>Transfer Ownership</span>
                {activeTransfer ? (
                  <div style={{ background: 'rgba(255,255,255,0.02)', padding: '8px', borderRadius: '6px', border: '1px dashed var(--border)' }}>
                    <p style={{ fontSize: '0.72rem', margin: '0 0 6px' }}>
                      Transfer to: <strong>{activeTransfer.toEmail}</strong> ({activeTransfer.status})
                    </p>
                    <button
                      type="button"
                      onClick={handleCancelTransfer}
                      className="ghost-button danger"
                      style={{ padding: '4px 8px', fontSize: '0.7rem', width: '100%' }}
                    >
                      Cancel Transfer Request
                    </button>
                  </div>
                ) : (
                  <form onSubmit={handleInitiateTransfer} style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                    <input
                      type="email"
                      required
                      placeholder="Target Owner's email"
                      value={transferTargetEmail}
                      onChange={(e) => setTransferTargetEmail(e.target.value)}
                      style={{ fontSize: '0.8rem', padding: '6px' }}
                    />
                    <div style={{ display: 'flex', gap: '6px', alignItems: 'center' }}>
                      <span style={{ fontSize: '0.72rem', color: 'var(--muted)', flexShrink: 0 }}>My new role:</span>
                      <select
                        value={transferDemotedRole}
                        onChange={(e) => setTransferDemotedRole(e.target.value as any)}
                        style={{ flex: 1, fontSize: '0.8rem', padding: '6px' }}
                      >
                        <option value="EDITOR">Editor</option>
                        <option value="VIEWER">Viewer</option>
                      </select>
                    </div>
                    <button type="submit" className="submit-button" style={{ padding: '6px 12px', fontSize: '0.8rem', borderRadius: '6px', background: 'linear-gradient(135deg, #ffaa00, #ff5500)', color: '#000' }}>
                      Initiate Transfer
                    </button>
                  </form>
                )}
              </div>
            )}
          </div>

          <div className="rail-block">
            <p className="section-label">Theme</p>
            <div className="theme-grid">
              {themeChoices.map((choice) => (
                <button
                  key={choice.value}
                  type="button"
                  className={builder.themeMode === choice.value ? 'theme-chip active' : 'theme-chip'}
                  onClick={() => setBuilder((current) => ({ ...current, themeMode: choice.value }))}
                >
                  <strong>{choice.label}</strong>
                  <span>{choice.hint}</span>
                </button>
              ))}
            </div>
          </div>

          <div className="rail-block">
            <p className="section-label">Density</p>
            <div className="theme-grid">
              {densityChoices.map((choice) => (
                <button
                  key={choice.value}
                  type="button"
                  className={builder.densityMode === choice.value ? 'theme-chip active' : 'theme-chip'}
                  onClick={() => setBuilder((current) => ({ ...current, densityMode: choice.value }))}
                >
                  <strong>{choice.label}</strong>
                  <span>{choice.hint}</span>
                </button>
              ))}
            </div>
          </div>

          <div className="rail-block">
            <p className="section-label">Customization</p>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              <label style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                <span>Accent color</span>
                <div style={{ display: 'flex', gap: '8px', marginTop: '4px', flexWrap: 'wrap' }}>
                  {[
                    { value: 'default', color: 'var(--accent)', label: 'Auto' },
                    { value: '#00f0ff', color: '#00f0ff', label: 'Cyan' },
                    { value: '#ff007f', color: '#ff007f', label: 'Pink' },
                    { value: '#39ff14', color: '#39ff14', label: 'Green' },
                    { value: '#ffaa00', color: '#ffaa00', label: 'Amber' },
                    { value: '#9d00ff', color: '#9d00ff', label: 'Purple' }
                  ].map((preset) => (
                    <button
                      key={preset.value}
                      type="button"
                      onClick={() => setAccentColor(preset.value)}
                      title={preset.label}
                      style={{
                        width: '24px',
                        height: '24px',
                        borderRadius: '50%',
                        backgroundColor: preset.value === 'default' ? '#333' : preset.color,
                        border: accentColor === preset.value ? '2px solid #fff' : '1px solid var(--border)',
                        boxShadow: accentColor === preset.value ? `0 0 8px ${preset.color}` : 'none',
                        cursor: 'pointer',
                        padding: 0
                      }}
                    />
                  ))}
                </div>
              </label>

              <label style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                <span>Border style</span>
                <select value={borderRadius} onChange={(e) => setBorderRadius(e.target.value)}>
                  <option value="12px">Sleek (12px)</option>
                  <option value="24px">Gamer (24px)</option>
                  <option value="0px">Sharp (0px)</option>
                </select>
              </label>

              <label style={{ display: 'flex', alignContent: 'center', justifyContent: 'space-between', flexDirection: 'row', cursor: 'pointer', marginTop: '4px' }}>
                <span>Background Grid</span>
                <input
                  type="checkbox"
                  checked={gridOpacity > 0}
                  onChange={(e) => setGridOpacity(e.target.checked ? 0.03 : 0)}
                  style={{ width: '16px', height: '16px', accentColor: 'var(--accent)', margin: 0 }}
                />
              </label>

              <label style={{ display: 'flex', alignContent: 'center', justifyContent: 'space-between', flexDirection: 'row', cursor: 'pointer', marginTop: '4px' }}>
                <span>Glassmorphic blurs</span>
                <input
                  type="checkbox"
                  checked={enableBlur}
                  onChange={(e) => setEnableBlur(e.target.checked)}
                  style={{ width: '16px', height: '16px', accentColor: 'var(--accent)', margin: 0 }}
                />
              </label>
            </div>
          </div>

          <div className="rail-block">
            <p className="section-label">Form Pages</p>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <button
                type="button"
                className="ghost-button"
                style={{ padding: '8px 12px', minWidth: '40px' }}
                onClick={() => {
                  const val = Math.max(1, builder.totalPages - 1);
                  setBuilder(prev => ({ ...prev, totalPages: val }));
                  setQuestions(prev => prev.map(q => ({
                    ...q,
                    pageNumber: Math.min(q.pageNumber || 1, val)
                  })));
                  setPreviewPage(prev => Math.min(prev, val));
                }}
              >
                -
              </button>
              <span style={{ fontSize: '1.2rem', fontWeight: 'bold', width: '32px', textAlign: 'center' }}>
                {builder.totalPages}
              </span>
              <button
                type="button"
                className="ghost-button"
                style={{ padding: '8px 12px', minWidth: '40px' }}
                onClick={() => setBuilder(prev => ({ ...prev, totalPages: Math.min(10, builder.totalPages + 1) }))}
              >
                +
              </button>
            </div>
          </div>

          <div className="rail-block">
            <p className="section-label">Add question</p>
            <div className="palette-grid">
              {questionPalette.map((entry) => (
                <button key={entry.type} type="button" className="palette-button" onClick={() => addQuestion(entry.type)}>
                  <strong>{entry.label}</strong>
                  <span>{entry.description}</span>
                </button>
              ))}
            </div>
          </div>
        </aside>

        <form className="canvas" onSubmit={submit}>
          <div className="tab-control">
            <button
              type="button"
              className={activeTab === 'editor' ? 'tab-btn active' : 'tab-btn'}
              onClick={() => setActiveTab('editor')}
            >
              Form Builder
            </button>
            <button
              type="button"
              className={activeTab === 'preview' ? 'tab-btn active' : 'tab-btn'}
              onClick={() => setActiveTab('preview')}
            >
              Live Preview
            </button>
          </div>

          {activeTab === 'editor' ? (
            <div className={currentUserRole === 'VIEWER' ? 'viewer-disabled-overlay' : ''} style={{ display: 'flex', flexDirection: 'column', gap: 'var(--spacing-base)' }}>
              <div className="canvas-head">
                <div>
                  <p className="section-label">Form builder</p>
                  <h2>Design the live form</h2>
                </div>
                <span className="status-pill">{builder.submissionMode}</span>
              </div>

              <div className="grid two">
                <label>
                  Form title
                  <input
                    value={builder.formTitle}
                    onChange={(event) => setBuilder((current) => ({ ...current, formTitle: event.target.value }))}
                    required
                    disabled={currentUserRole === 'VIEWER'}
                  />
                </label>
                <label>
                  Workspace / brand name
                  <input
                    value={builder.workspaceName}
                    onChange={(event) => setBuilder((current) => ({ ...current, workspaceName: event.target.value }))}
                    disabled={currentUserRole === 'VIEWER'}
                  />
                </label>
              </div>

              <div className="grid two">
                <label>
                  Banner image URL
                  <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                    <input
                      value={builder.bannerUrl}
                      placeholder="Enter image URL or select preset below"
                      onChange={(event) => setBuilder((current) => ({ ...current, bannerUrl: event.target.value }))}
                      disabled={currentUserRole === 'VIEWER'}
                      style={{ flex: 1 }}
                    />
                    <label 
                      className={`submit-button ${uploading ? 'disabled' : ''}`}
                      style={{
                        cursor: uploading || currentUserRole === 'VIEWER' ? 'not-allowed' : 'pointer',
                        display: 'inline-flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: '6px',
                        padding: '10px 16px',
                        fontSize: '0.8rem',
                        borderRadius: '12px',
                        background: 'rgba(255, 255, 255, 0.05)',
                        border: '1px solid var(--border)',
                        color: 'var(--text)',
                        whiteSpace: 'nowrap',
                        margin: 0,
                        height: '42px',
                        boxShadow: 'none',
                        transition: 'all 0.2s ease'
                      }}
                    >
                      {uploading ? (
                        <>
                          <span className="spinner" style={{
                            display: 'inline-block',
                            width: '12px',
                            height: '12px',
                            border: '2px solid rgba(255,255,255,0.3)',
                            borderTopColor: '#fff',
                            borderRadius: '50%',
                            animation: 'spin 1s linear infinite'
                          }}></span>
                          <span>Uploading...</span>
                        </>
                      ) : (
                        <>
                          <span>✦</span>
                          <span>Upload Banner</span>
                        </>
                      )}
                      <input
                        type="file"
                        accept="image/*"
                        onChange={handleImageUpload}
                        disabled={uploading || currentUserRole === 'VIEWER'}
                        style={{ display: 'none' }}
                      />
                    </label>
                  </div>
                  <div className="banner-presets-row">
                    {[
                      { name: 'Neon Grid', url: 'https://images.unsplash.com/photo-1509198397868-475647b2a1e5?q=80&w=1200&auto=format&fit=crop' },
                      { name: 'Tech Circuit', url: 'https://images.unsplash.com/photo-1518770660439-4636190af475?q=80&w=1200&auto=format&fit=crop' },
                      { name: 'Retro Space', url: 'https://images.unsplash.com/photo-1550745165-9bc0b252726f?q=80&w=1200&auto=format&fit=crop' }
                    ].map((preset) => (
                      <button
                        key={preset.name}
                        type="button"
                        className="banner-preset-btn"
                        disabled={currentUserRole === 'VIEWER'}
                        onClick={() => setBuilder((current) => ({ ...current, bannerUrl: preset.url }))}
                      >
                        {preset.name}
                      </button>
                    ))}
                    {builder.bannerUrl && (
                      <button
                        type="button"
                        className="banner-preset-btn"
                        style={{ color: '#ff3333' }}
                        disabled={currentUserRole === 'VIEWER'}
                        onClick={() => setBuilder((current) => ({ ...current, bannerUrl: '' }))}
                      >
                        Remove Banner
                      </button>
                    )}
                  </div>
                </label>

                <label>
                  Video URL (YouTube)
                  <input
                    value={builder.videoUrl}
                    placeholder="e.g. https://www.youtube.com/watch?v=dQw4w9WgXcQ"
                    onChange={(event) => setBuilder((current) => ({ ...current, videoUrl: event.target.value }))}
                    disabled={currentUserRole === 'VIEWER'}
                  />
                </label>
              </div>

              <label>
                Form description
                <textarea
                  rows={4}
                  value={builder.formDescription}
                  onChange={(event) => setBuilder((current) => ({ ...current, formDescription: event.target.value }))}
                  disabled={currentUserRole === 'VIEWER'}
                />
              </label>

              <div className="grid two">
                <label>
                  Submission mode
                  <select
                    value={builder.submissionMode}
                    disabled={currentUserRole === 'VIEWER'}
                    onChange={(event) =>
                      setBuilder((current) => ({
                        ...current,
                        submissionMode: event.target.value as BuilderState['submissionMode']
                      }))
                    }
                  >
                    <option value="standard">Standard</option>
                    <option value="urgent">Urgent</option>
                    <option value="branch">Branching</option>
                    <option value="approval">Approval required</option>
                  </select>
                </label>
                <label>
                  Backend source
                  <input readOnly value={API_BASE} />
                </label>
              </div>

              <div className="question-stack">{questions.map((question) => renderBuilderQuestion(question))}</div>
            </div>
          ) : (
            <section className="preview-wrap" style={{ borderTop: 'none', marginTop: 0, paddingTop: 0 }}>
              <div className="canvas-head compact">
                <div>
                  <p className="section-label">Live preview</p>
                  <h2>Live view</h2>
                </div>
                <span className="helper">Preview mirrors the current state</span>
              </div>

              {previewPage === 1 && (
                <div className="preview-card shell-card" style={{ padding: builder.bannerUrl ? '0 0 24px 0' : '24px', overflow: 'hidden' }}>
                  {builder.bannerUrl && (
                    <div className="form-banner-container" style={{ borderRadius: '0' }}>
                      <img src={builder.bannerUrl} alt="Form Banner" className="form-banner-image" />
                    </div>
                  )}
                  <div style={{ padding: builder.bannerUrl ? '24px 24px 0 24px' : '0' }}>
                    <p className="preview-brand">{builder.workspaceName}</p>
                    <h3>{builder.formTitle}</h3>
                    <p className="preview-lead">{builder.formDescription}</p>

                    {builder.videoUrl && (
                      <div className="video-embed-wrapper">
                        <iframe
                          src={getYouTubeEmbedUrl(builder.videoUrl)}
                          title="Embedded Video"
                          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                          allowFullScreen
                        />
                      </div>
                    )}
                  </div>
                </div>
              )}

              <div className="question-stack">
                {questions
                  .filter((question) => (question.pageNumber || 1) === previewPage)
                  .map((question) => renderPreviewQuestion(question))}
              </div>

              {builder.totalPages > 1 && (
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', margin: '24px 0 12px', padding: '16px', background: 'rgba(255,255,255,0.01)', border: '1px solid var(--border)', borderRadius: '12px' }}>
                  <span style={{ fontSize: '0.85rem', color: 'var(--muted)', fontWeight: 'bold' }}>Page {previewPage} of {builder.totalPages}</span>
                  <div style={{ display: 'flex', gap: '8px' }}>
                    <button
                      type="button"
                      className="ghost-button"
                      disabled={previewPage === 1}
                      onClick={() => setPreviewPage(prev => prev - 1)}
                    >
                      Back
                    </button>
                    {previewPage < builder.totalPages && (
                      <button
                        type="button"
                        className="submit-button"
                        style={{ padding: '8px 16px', borderRadius: '8px' }}
                        onClick={() => {
                          // Validate required fields on current page
                          const pageQuestions = questions.filter(q => (q.pageNumber || 1) === previewPage);
                          const invalid = pageQuestions.some(q => {
                            if (!q.required) return false;
                            const val = answers[q.id];
                            return !val || (typeof val === 'string' && val.trim() === '') || (Array.isArray(val) && val.length === 0);
                          });
                          if (invalid) {
                            alert("Please fill out all required fields on this page before proceeding.");
                          } else {
                            setPreviewPage(prev => prev + 1);
                          }
                        }}
                      >
                        Next Page
                      </button>
                    )}
                  </div>
                </div>
              )}

              {(builder.totalPages === 1 || previewPage === builder.totalPages) && (
                <button className="submit-button" type="submit" disabled={loading} style={{ marginTop: 'var(--spacing-base)', width: '100%' }}>
                  {loading ? 'Publishing...' : 'Publish and save response'}
                </button>
              )}
            </section>
          )}
        </form>

        <aside className="vault">
          <div className="vault-head">
            <div>
              <p className="section-label">Response vault</p>
              <h2>Recent</h2>
            </div>
            <span className="status-pill">API</span>
          </div>

          {submissions.length === 0 ? (
            <div className="empty-state">
              <strong>No submissions yet</strong>
              <p>Publish a response to populate the vault.</p>
            </div>
          ) : (
            <div className="submission-list">
              {submissions.map((submission) => (
                <article key={submission.id} className="submission-card">
                  <div className="submission-top">
                    <div>
                      <strong>{submission.fullName}</strong>
                      <span>{submission.formTitle}</span>
                    </div>
                    <span className="pill muted">{submission.themeMode ?? 'silver'}</span>
                  </div>
                  <p>{submission.company || 'Independent creator'}</p>
                  <div className="submission-meta">
                    <span>{submission.submissionMode}</span>
                    <span>{submission.layoutDensity ?? 'comfortable'}</span>
                    <span>{stringifyList(submission.questionsJson).length} questions</span>
                  </div>
                  <footer>
                    <span>{submission.email}</span>
                    <span>{submission.rating ? `${submission.rating}/10` : 'No score'}</span>
                  </footer>
                  <small className="submission-note">{stringifyList(submission.answersJson).length} answer groups</small>
                </article>
              ))}
            </div>
          )}
        </aside>
      </section>

      {showPublishSuccess && (
        <div className="modal-overlay">
          <div className="modal-container">
            <div className="modal-header">
              <div className="modal-icon">✦</div>
              <h3>Form Published!</h3>
            </div>
            <p className="modal-desc">
              Your configuration has been saved and your public form is now live. Share the URL below with your users.
            </p>
            
            <div className="modal-url-box">
              <input
                type="text"
                readOnly
                value={typeof window !== 'undefined' ? `${window.location.origin}/form` : 'http://localhost:3000/form'}
                className="modal-url-input"
              />
              <button
                type="button"
                className="modal-copy-btn"
                onClick={() => {
                  const url = typeof window !== 'undefined' ? `${window.location.origin}/form` : 'http://localhost:3000/form';
                  void navigator.clipboard.writeText(url);
                  setCopied(true);
                  setTimeout(() => setCopied(false), 2000);
                }}
              >
                {copied ? 'Copied!' : 'Copy'}
              </button>
            </div>

            <div className="modal-actions">
              <a
                href="/form"
                target="_blank"
                rel="noopener noreferrer"
                className="modal-btn primary"
              >
                Open Public Form
              </a>
              <button
                type="button"
                className="modal-btn secondary"
                onClick={() => setShowPublishSuccess(false)}
              >
                Done
              </button>
            </div>
          </div>
        </div>
      )}
    </main>
  );
}