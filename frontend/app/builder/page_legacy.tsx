'use client';

import { FormEvent, useEffect, useMemo, useState, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import { useAuth } from '../AuthProvider';

type ThemeMode = 'silver' | 'graphite' | 'onyx' | 'cyberpunk';
type DensityMode = 'compact' | 'comfortable' | 'spacious';
type QuestionType = 
  | 'short-answer'
  | 'paragraph'
  | 'multiple-choice'
  | 'checkboxes'
  | 'dropdown'
  | 'scale'
  | 'date'
  | 'star-rating'
  | 'email'
  | 'phone'
  | 'number'
  | 'url'
  | 'time'
  | 'datetime'
  | 'signature'
  | 'address'
  | 'slider'
  | 'emoji-rating'
  | 'nps'
  | 'ranking'
  | 'matrix'
  | 'checkbox-matrix'
  | 'file';

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

  // Linear scale settings
  scaleMin?: number;
  scaleLeftLabel?: string;
  scaleRightLabel?: string;

  // Media attachments
  mediaUrl?: string;
  mediaType?: 'image' | 'video' | 'audio' | 'pdf' | 'gif';
  mediaPosition?: 'above' | 'below';

  // Validation settings
  placeholder?: string;
  description?: string;
  minLength?: number;
  maxLength?: number;
  validationRegex?: string;
  validationMessage?: string;
  prefix?: string;
  suffix?: string;
  defaultValue?: string;

  // Slider settings
  sliderMin?: number;
  sliderMax?: number;
  sliderStep?: number;

  // File upload configuration
  maxFileSize?: number; // in MB
  allowedFileTypes?: string[]; // e.g. ['image/*', 'application/pdf']
  multipleFiles?: boolean;
  maxFiles?: number;

  // Matrix settings
  matrixRows?: string[];
  matrixCols?: string[];

  // Emoji settings
  emojiType?: 'stars' | 'emojis' | 'hearts';

  // Ranking items
  rankingItems?: string[];
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

type SubmissionSettings = {
  allowEdit: boolean;
  allowMultiple: boolean;
  showThankYou: boolean;
  redirectUrl: string;
  closeForm: boolean;
  maxResponses: number;
  showSubmissionId: boolean;
  successMessage: string;
  thankYouTitle: string;
  thankYouDescription: string;
  successIllustration: string;

  // Custom unavailable pages settings
  closedTitle?: string;
  closedDescription?: string;
  closedIllustration?: string;
  closedButtonLabel?: string;
  closedRedirectUrl?: string;

  pausedTitle?: string;
  pausedDescription?: string;
  pausedIllustration?: string;
  pausedButtonLabel?: string;
  pausedRedirectUrl?: string;

  scheduledTitle?: string;
  scheduledDescription?: string;
  scheduledIllustration?: string;
  scheduledButtonLabel?: string;
  scheduledRedirectUrl?: string;

  limitTitle?: string;
  limitDescription?: string;
  limitIllustration?: string;
  limitButtonLabel?: string;
  limitRedirectUrl?: string;
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
  settings: SubmissionSettings;

  status: string;
  published: boolean;
  openAt: string;
  closeAt: string;
  timezone: string;
  accessMode: string;
  password?: string;
  maxResponses: number;
  closedReason: string;
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
  { type: 'scale', label: 'Linear scale', description: 'Custom min/max' },
  { type: 'date', label: 'Date picker', description: 'Calendar date' },
  { type: 'star-rating', label: 'Star rating', description: '1 to 5 stars' },
  { type: 'email', label: 'Email input', description: 'Verified email format' },
  { type: 'phone', label: 'Phone input', description: 'Verified phone format' },
  { type: 'number', label: 'Number input', description: 'Numeric values' },
  { type: 'url', label: 'URL input', description: 'Web address' },
  { type: 'time', label: 'Time picker', description: 'Clock time' },
  { type: 'datetime', label: 'Date & Time picker', description: 'Date with clock' },
  { type: 'signature', label: 'Signature pad', description: 'Draw on canvas' },
  { type: 'address', label: 'Address block', description: 'Street, city, state, zip' },
  { type: 'slider', label: 'Slider', description: 'Numeric range slider' },
  { type: 'emoji-rating', label: 'Emoji rating', description: 'Hearts / stars / emojis' },
  { type: 'nps', label: 'NPS rating', description: '0 to 10 scale' },
  { type: 'ranking', label: 'Ranking list', description: 'Reorder options' },
  { type: 'matrix', label: 'Single-Choice Grid', description: 'Matrix table (radio)' },
  { type: 'checkbox-matrix', label: 'Multi-Choice Grid', description: 'Matrix table (checkbox)' },
  { type: 'file', label: 'File upload', description: 'Upload attachments' }
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
    type: 'email',
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
    scaleMin: 1,
    scaleMax: 10,
    scaleLeftLabel: 'Basic / MVP',
    scaleRightLabel: 'Stunning / Cyberpunk',
    fieldKey: 'rating',
    pageNumber: 1
  }
];

const createQuestion = (type: QuestionType): Question => {
  const base = {
    id: `q-${crypto.randomUUID()}`,
    title: `Untitled ${type.replace('-', ' ')}`,
    helpText: 'Add a short helper line.',
    type,
    required: false,
    options: [],
    scaleMax: 5,
    pageNumber: 1
  };

  switch (type) {
    case 'multiple-choice':
      return { ...base, options: ['Option 1', 'Option 2', 'Option 3'] };
    case 'checkboxes':
      return { ...base, options: ['Choice 1', 'Choice 2', 'Choice 3'] };
    case 'dropdown':
      return { ...base, options: ['Option A', 'Option B', 'Option C'] };
    case 'scale':
      return { ...base, scaleMin: 1, scaleMax: 10, scaleLeftLabel: 'Min', scaleRightLabel: 'Max' };
    case 'slider':
      return { ...base, sliderMin: 0, sliderMax: 100, sliderStep: 1 };
    case 'emoji-rating':
      return { ...base, emojiType: 'emojis' };
    case 'ranking':
      return { ...base, rankingItems: ['Rank Item 1', 'Rank Item 2', 'Rank Item 3'] };
    case 'matrix':
    case 'checkbox-matrix':
      return { 
        ...base, 
        matrixRows: ['Row 1', 'Row 2'], 
        matrixCols: ['Col 1', 'Col 2', 'Col 3'] 
      };
    case 'file':
      return { 
        ...base, 
        maxFileSize: 10, 
        allowedFileTypes: ['image/*', 'application/pdf'], 
        multipleFiles: false, 
        maxFiles: 1 
      };
    default:
      return base;
  }
};

const buildInitialAnswers = (questions: Question[]) =>
  questions.reduce<Record<string, AnswerValue>>((result, question) => {
    if (question.type === 'checkboxes') {
      result[question.id] = [];
    } else if (question.type === 'scale') {
      result[question.id] = String(question.scaleMin ?? 1);
    } else if (question.type === 'star-rating' || question.type === 'nps') {
      result[question.id] = '5';
    } else if (question.type === 'slider') {
      result[question.id] = String(question.sliderMin ?? 0);
    } else if (question.type === 'address') {
      result[question.id] = JSON.stringify({ street: '', city: '', state: '', zip: '' });
    } else if (question.type === 'matrix' || question.type === 'checkbox-matrix') {
      const initialGrid: Record<string, string[]> = {};
      question.matrixRows?.forEach(row => {
        initialGrid[row] = [];
      });
      result[question.id] = JSON.stringify(initialGrid);
    } else if (question.type === 'ranking') {
      result[question.id] = JSON.stringify(question.rankingItems ?? []);
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

const defaultSettings: SubmissionSettings = {
  allowEdit: false,
  allowMultiple: true,
  showThankYou: true,
  redirectUrl: '',
  closeForm: false,
  maxResponses: 0,
  showSubmissionId: false,
  successMessage: 'Your responses were successfully logged to the NovaForms vault.',
  thankYouTitle: 'Response Submitted!',
  thankYouDescription: '',
  successIllustration: '',

  closedTitle: 'Form Closed',
  closedDescription: 'This form has been closed by its owner to new responses.',
  closedIllustration: '≡ƒöÆ',
  closedButtonLabel: '',
  closedRedirectUrl: '',

  pausedTitle: 'Form Paused',
  pausedDescription: 'This form is temporarily paused. Check back later.',
  pausedIllustration: 'ΓÅ╕',
  pausedButtonLabel: '',
  pausedRedirectUrl: '',

  scheduledTitle: 'Not Open Yet',
  scheduledDescription: 'This form is not accepting responses yet.',
  scheduledIllustration: 'ΓÅ│',
  scheduledButtonLabel: '',
  scheduledRedirectUrl: '',

  limitTitle: 'Capacity Reached',
  limitDescription: 'This form has reached its maximum response capacity.',
  limitIllustration: '≡ƒÜ½',
  limitButtonLabel: '',
  limitRedirectUrl: ''
};

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
        videoUrl: '',
        settings: defaultSettings,
        status: 'DRAFT',
        published: false,
        openAt: '',
        closeAt: '',
        timezone: 'UTC',
        accessMode: 'PUBLIC',
        password: '',
        maxResponses: 0,
        closedReason: ''
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
      videoUrl: '',
      settings: defaultSettings,
      status: 'DRAFT',
      published: false,
      openAt: '',
      closeAt: '',
      timezone: 'UTC',
      accessMode: 'PUBLIC',
      password: '',
      maxResponses: 0,
      closedReason: ''
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
  const [saveStatus, setSaveStatus] = useState<'saved' | 'saving' | 'unsaved' | 'error'>('saved');
  const [isInitialLoad, setIsInitialLoad] = useState(true);
  const [expandedSection, setExpandedSection] = useState<string | null>('lifecycle');

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

  const updateSettings = (key: keyof SubmissionSettings, value: any) => {
    setBuilder((current) => ({
      ...current,
      settings: {
        ...current.settings,
        [key]: value
      }
    }));
  };

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
      const res = await fetch(`${API_BASE}/api/form-config/${formId}?email=${encodeURIComponent(currentUser)}`);
      if (res.ok) {
        const data = await res.json();
        const conf = data.config;
        if (conf) {
          let parsedSettings = defaultSettings;
          if (conf.settingsJson) {
            try {
              parsedSettings = { ...defaultSettings, ...JSON.parse(conf.settingsJson) };
            } catch (e) {
              console.error("Failed to parse settingsJson", e);
            }
          }
          setBuilder({
            formTitle: conf.title || 'Orbit Intake',
            formDescription: conf.description || '',
            workspaceName: conf.name || 'Nova Studio',
            themeMode: (conf.themeMode as ThemeMode) || 'silver',
            densityMode: (conf.layoutDensity as DensityMode) || 'comfortable',
            submissionMode: conf.submissionMode || 'standard',
            totalPages: conf.totalPages || 1,
            bannerUrl: conf.bannerUrl || '',
            videoUrl: conf.videoUrl || '',
            settings: parsedSettings,
            status: conf.status || 'DRAFT',
            published: conf.published ?? false,
            openAt: conf.openAt ? conf.openAt.substring(0, 16) : '',
            closeAt: conf.closeAt ? conf.closeAt.substring(0, 16) : '',
            timezone: conf.timezone || 'UTC',
            accessMode: conf.accessMode || 'PUBLIC',
            password: '',
            maxResponses: conf.maxResponses ?? 0,
            closedReason: conf.closedReason || ''
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
    } finally {
      setIsInitialLoad(false);
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

  useEffect(() => {
    if (isInitialLoad) return;

    setSaveStatus('unsaved');
    setStatus('Unsaved changes');

    const delayDebounce = setTimeout(async () => {
      setSaveStatus('saving');
      setStatus('Saving...');
      try {
        const configPayload = {
          name: builder.workspaceName,
          title: builder.formTitle,
          description: builder.formDescription,
          bannerUrl: builder.bannerUrl,
          videoUrl: builder.videoUrl,
          questionsJson: JSON.stringify(questions),
          settingsJson: JSON.stringify(builder.settings),
          themeMode: builder.themeMode,
          layoutDensity: builder.densityMode,
          submissionMode: builder.submissionMode,
          totalPages: builder.totalPages,
          status: builder.status,
          published: builder.published,
          openAt: builder.openAt ? new Date(builder.openAt).toISOString() : null,
          closeAt: builder.closeAt ? new Date(builder.closeAt).toISOString() : null,
          timezone: builder.timezone,
          accessMode: builder.accessMode,
          password: builder.password,
          maxResponses: builder.maxResponses,
          closedReason: builder.closedReason
        };
        const res = await fetch(`${API_BASE}/api/form-config/${formId}`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(configPayload)
        });
        if (res.ok) {
          setSaveStatus('saved');
          setStatus('All changes saved');
        } else {
          setSaveStatus('error');
          setStatus('Save error');
        }
      } catch (err) {
        console.error("Autosave failed", err);
        setSaveStatus('error');
        setStatus('Offline');
      }
    }, 1500);

    return () => clearTimeout(delayDebounce);
  }, [
    isInitialLoad,
    questions,
    builder.formTitle,
    builder.formDescription,
    builder.workspaceName,
    builder.bannerUrl,
    builder.videoUrl,
    builder.themeMode,
    builder.densityMode,
    builder.submissionMode,
    builder.totalPages,
    builder.settings,
    builder.status,
    builder.published,
    builder.openAt,
    builder.closeAt,
    builder.timezone,
    builder.accessMode,
    builder.password,
    builder.maxResponses,
    builder.closedReason,
    formId
  ]);

  useEffect(() => {
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      if (saveStatus === 'unsaved' || saveStatus === 'saving') {
        const msg = 'You have unsaved changes in your form builder. Are you sure you want to leave?';
        e.returnValue = msg;
        return msg;
      }
    };
    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, [saveStatus]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 's') {
        e.preventDefault();
        const formEl = document.querySelector('form.canvas') as HTMLFormElement | null;
        if (formEl) {
          formEl.requestSubmit();
        }
      } else if (e.key === 'Escape') {
        setShowPublishSuccess(false);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

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
    if (formId) {
      formData.append('formId', formId);
    }

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
              Γû▓
            </button>
            <button
              type="button"
              className="ghost-button"
              disabled={index === questions.length - 1}
              onClick={() => moveQuestion(index, 'down')}
              title="Move Down"
            >
              Γû╝
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
                  ΓêÆ
                </button>
              </div>
            ))}
          </div>
        </div>
      ) : null}

      {question.type === 'scale' ? (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', marginTop: '10px' }}>
          <div className="grid two" style={{ gap: '10px' }}>
            <label>
              Scale Minimum
              <select
                value={question.scaleMin !== undefined ? question.scaleMin : 1}
                onChange={(e) => updateQuestion(question.id, (q) => ({ ...q, scaleMin: Number(e.target.value) }))}
                style={{ fontSize: '0.8rem', padding: '6px' }}
              >
                <option value="0">0</option>
                <option value="1">1</option>
                <option value="5">5</option>
              </select>
            </label>
            <label>
              Scale Maximum
              <select
                value={question.scaleMax !== undefined ? question.scaleMax : 10}
                onChange={(e) => updateQuestion(question.id, (q) => ({ ...q, scaleMax: Number(e.target.value) }))}
                style={{ fontSize: '0.8rem', padding: '6px' }}
              >
                {[3,4,5,6,7,8,9,10,11,12,13,14,15,16,17,18,19,20].map(val => (
                  <option key={val} value={val}>{val}</option>
                ))}
              </select>
            </label>
          </div>
          <div className="grid two" style={{ gap: '10px' }}>
            <label>
              Left label (e.g. Worst)
              <input
                type="text"
                value={question.scaleLeftLabel || ''}
                onChange={(e) => updateQuestion(question.id, (q) => ({ ...q, scaleLeftLabel: e.target.value }))}
                style={{ fontSize: '0.8rem', padding: '6px' }}
              />
            </label>
            <label>
              Right label (e.g. Best)
              <input
                type="text"
                value={question.scaleRightLabel || ''}
                onChange={(e) => updateQuestion(question.id, (q) => ({ ...q, scaleRightLabel: e.target.value }))}
                style={{ fontSize: '0.8rem', padding: '6px' }}
              />
            </label>
          </div>
        </div>
      ) : null}

      {question.type === 'slider' ? (
        <div className="grid three" style={{ gap: '10px', marginTop: '10px' }}>
          <label>
            Slider Min Value
            <input
              type="number"
              value={question.sliderMin !== undefined ? question.sliderMin : 0}
              onChange={(e) => updateQuestion(question.id, (q) => ({ ...q, sliderMin: Number(e.target.value) }))}
              style={{ fontSize: '0.8rem', padding: '6px' }}
            />
          </label>
          <label>
            Slider Max Value
            <input
              type="number"
              value={question.sliderMax !== undefined ? question.sliderMax : 100}
              onChange={(e) => updateQuestion(question.id, (q) => ({ ...q, sliderMax: Number(e.target.value) }))}
              style={{ fontSize: '0.8rem', padding: '6px' }}
            />
          </label>
          <label>
            Slider Step
            <input
              type="number"
              value={question.sliderStep !== undefined ? question.sliderStep : 1}
              onChange={(e) => updateQuestion(question.id, (q) => ({ ...q, sliderStep: Number(e.target.value) }))}
              style={{ fontSize: '0.8rem', padding: '6px' }}
            />
          </label>
        </div>
      ) : null}

      {question.type === 'emoji-rating' ? (
        <label style={{ marginTop: '10px' }}>
          Rating Icon Type
          <select
            value={question.emojiType || 'emojis'}
            onChange={(e) => updateQuestion(question.id, (q) => ({ ...q, emojiType: e.target.value as any }))}
            style={{ fontSize: '0.8rem', padding: '6px' }}
          >
            <option value="stars">Stars Γ¡É</option>
            <option value="emojis">Emojis ≡ƒÿä</option>
            <option value="hearts">Hearts Γ¥ñ∩╕Å</option>
          </select>
        </label>
      ) : null}

      {question.type === 'ranking' ? (
        <div style={{ marginTop: '12px' }}>
          <div className="question-head mini">
            <span style={{ fontSize: '0.72rem', color: 'var(--muted)', fontWeight: 'bold' }}>Items to Rank</span>
            <button
              type="button"
              className="ghost-button"
              onClick={() => {
                const items = question.rankingItems || [];
                updateQuestion(question.id, (q) => ({
                  ...q,
                  rankingItems: [...items, `Rank Item ${items.length + 1}`]
                }));
              }}
            >
              Add Item
            </button>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', marginTop: '6px' }}>
            {(question.rankingItems || []).map((item, idx) => (
              <div key={idx} style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                <input
                  type="text"
                  value={item}
                  onChange={(e) => {
                    const next = [...(question.rankingItems || [])];
                    next[idx] = e.target.value;
                    updateQuestion(question.id, (q) => ({ ...q, rankingItems: next }));
                  }}
                  style={{ flex: 1, fontSize: '0.8rem', padding: '6px' }}
                />
                <button
                  type="button"
                  className="icon-button"
                  onClick={() => {
                    const next = (question.rankingItems || []).filter((_, i) => i !== idx);
                    updateQuestion(question.id, (q) => ({ ...q, rankingItems: next }));
                  }}
                >
                  ΓêÆ
                </button>
              </div>
            ))}
          </div>
        </div>
      ) : null}

      {(question.type === 'matrix' || question.type === 'checkbox-matrix') ? (
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginTop: '12px' }}>
          <div>
            <div className="question-head mini">
              <span style={{ fontSize: '0.72rem', color: 'var(--muted)', fontWeight: 'bold' }}>Rows (Statements)</span>
              <button
                type="button"
                className="ghost-button"
                onClick={() => {
                  const rows = question.matrixRows || [];
                  updateQuestion(question.id, (q) => ({
                    ...q,
                    matrixRows: [...rows, `Row ${rows.length + 1}`]
                  }));
                }}
              >
                Add Row
              </button>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', marginTop: '6px' }}>
              {(question.matrixRows || []).map((row, idx) => (
                <div key={idx} style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                  <input
                    type="text"
                    value={row}
                    onChange={(e) => {
                      const next = [...(question.matrixRows || [])];
                      next[idx] = e.target.value;
                      updateQuestion(question.id, (q) => ({ ...q, matrixRows: next }));
                    }}
                    style={{ flex: 1, fontSize: '0.8rem', padding: '6px' }}
                  />
                  <button
                    type="button"
                    className="icon-button"
                    onClick={() => {
                      const next = (question.matrixRows || []).filter((_, i) => i !== idx);
                      updateQuestion(question.id, (q) => ({ ...q, matrixRows: next }));
                    }}
                  >
                    ΓêÆ
                  </button>
                </div>
              ))}
            </div>
          </div>
          <div>
            <div className="question-head mini">
              <span style={{ fontSize: '0.72rem', color: 'var(--muted)', fontWeight: 'bold' }}>Columns (Choices)</span>
              <button
                type="button"
                className="ghost-button"
                onClick={() => {
                  const cols = question.matrixCols || [];
                  updateQuestion(question.id, (q) => ({
                    ...q,
                    matrixCols: [...cols, `Col ${cols.length + 1}`]
                  }));
                }}
              >
                Add Col
              </button>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', marginTop: '6px' }}>
              {(question.matrixCols || []).map((col, idx) => (
                <div key={idx} style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                  <input
                    type="text"
                    value={col}
                    onChange={(e) => {
                      const next = [...(question.matrixCols || [])];
                      next[idx] = e.target.value;
                      updateQuestion(question.id, (q) => ({ ...q, matrixCols: next }));
                    }}
                    style={{ flex: 1, fontSize: '0.8rem', padding: '6px' }}
                  />
                  <button
                    type="button"
                    className="icon-button"
                    onClick={() => {
                      const next = (question.matrixCols || []).filter((_, i) => i !== idx);
                      updateQuestion(question.id, (q) => ({ ...q, matrixCols: next }));
                    }}
                  >
                    ΓêÆ
                  </button>
                </div>
              ))}
            </div>
          </div>
        </div>
      ) : null}

      {question.type === 'file' ? (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', marginTop: '10px' }}>
          <div className="grid three" style={{ gap: '10px' }}>
            <label>
              Max File Size (MB)
              <input
                type="number"
                value={question.maxFileSize !== undefined ? question.maxFileSize : 10}
                onChange={(e) => updateQuestion(question.id, (q) => ({ ...q, maxFileSize: Number(e.target.value) }))}
                style={{ fontSize: '0.8rem', padding: '6px' }}
              />
            </label>
            <label style={{ display: 'flex', alignContent: 'center', justifyContent: 'center', flexDirection: 'column', cursor: 'pointer' }}>
              <span style={{ fontSize: '0.85rem' }}>Allow Multiple Files</span>
              <input
                type="checkbox"
                checked={question.multipleFiles || false}
                onChange={(e) => updateQuestion(question.id, (q) => ({ ...q, multipleFiles: e.target.checked }))}
                style={{ width: '16px', height: '16px', accentColor: 'var(--accent)', marginTop: '4px' }}
              />
            </label>
            {question.multipleFiles && (
              <label>
                Max Files Count
                <input
                  type="number"
                  min="1"
                  value={question.maxFiles !== undefined ? question.maxFiles : 5}
                  onChange={(e) => updateQuestion(question.id, (q) => ({ ...q, maxFiles: Number(e.target.value) }))}
                  style={{ fontSize: '0.8rem', padding: '6px' }}
                />
              </label>
            )}
          </div>
          <label style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
            <span>Allowed File Extensions (comma separated, e.g. .jpg, .png, .pdf)</span>
            <input
              type="text"
              placeholder=".jpg, .png, .pdf, .zip"
              value={(question.allowedFileTypes || []).join(', ')}
              onChange={(e) => {
                const types = e.target.value.split(',').map(s => s.trim()).filter(Boolean);
                updateQuestion(question.id, (q) => ({ ...q, allowedFileTypes: types }));
              }}
              style={{ fontSize: '0.8rem', padding: '6px' }}
            />
          </label>
        </div>
      ) : null}

      {/* Media Attachments Section */}
      <div style={{ borderTop: '1px solid var(--border)', paddingTop: '12px', marginTop: '12px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
        <h4 style={{ fontSize: '0.8rem', color: 'var(--accent)', margin: 0 }}>Question Media Block</h4>
        <div className="grid three" style={{ gap: '10px' }}>
          <label>
            Media URL
            <input
              type="text"
              placeholder="e.g. https://images.unsplash.com/..."
              value={question.mediaUrl || ''}
              onChange={(e) => updateQuestion(question.id, (q) => ({ ...q, mediaUrl: e.target.value }))}
              style={{ fontSize: '0.8rem', padding: '6px' }}
            />
          </label>
          <label>
            Media Type
            <select
              value={question.mediaType || 'image'}
              onChange={(e) => updateQuestion(question.id, (q) => ({ ...q, mediaType: e.target.value as any }))}
              style={{ fontSize: '0.8rem', padding: '6px' }}
            >
              <option value="image">Image</option>
              <option value="gif">GIF</option>
              <option value="video">Video</option>
              <option value="audio">Audio</option>
              <option value="pdf">PDF Document</option>
            </select>
          </label>
          <label>
            Position
            <select
              value={question.mediaPosition || 'above'}
              onChange={(e) => updateQuestion(question.id, (q) => ({ ...q, mediaPosition: e.target.value as any }))}
              style={{ fontSize: '0.8rem', padding: '6px' }}
            >
              <option value="above">Above Question Text</option>
              <option value="below">Below Question Text</option>
            </select>
          </label>
        </div>
      </div>

      {/* Advanced Validation Section */}
      <details style={{ marginTop: '12px', borderTop: '1px solid var(--border)', paddingTop: '12px', cursor: 'pointer' }}>
        <summary style={{ fontSize: '0.82rem', color: 'var(--accent)', fontWeight: 'bold', outline: 'none' }}>
          Advanced Validation & Constraints
        </summary>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', marginTop: '12px', cursor: 'default' }} onClick={(e) => e.stopPropagation()}>
          <div className="grid two" style={{ gap: '10px' }}>
            <label>
              Placeholder Text
              <input
                type="text"
                value={question.placeholder || ''}
                onChange={(e) => updateQuestion(question.id, (q) => ({ ...q, placeholder: e.target.value }))}
                style={{ fontSize: '0.8rem', padding: '6px' }}
              />
            </label>
            <label>
              Default Value
              <input
                type="text"
                value={question.defaultValue || ''}
                onChange={(e) => updateQuestion(question.id, (q) => ({ ...q, defaultValue: e.target.value }))}
                style={{ fontSize: '0.8rem', padding: '6px' }}
              />
            </label>
          </div>

          <div className="grid two" style={{ gap: '10px' }}>
            <label>
              Prefix Icon / Label
              <input
                type="text"
                placeholder="e.g. $"
                value={question.prefix || ''}
                onChange={(e) => updateQuestion(question.id, (q) => ({ ...q, prefix: e.target.value }))}
                style={{ fontSize: '0.8rem', padding: '6px' }}
              />
            </label>
            <label>
              Suffix Label
              <input
                type="text"
                placeholder="e.g. kg / hrs"
                value={question.suffix || ''}
                onChange={(e) => updateQuestion(question.id, (q) => ({ ...q, suffix: e.target.value }))}
                style={{ fontSize: '0.8rem', padding: '6px' }}
              />
            </label>
          </div>

          <div className="grid two" style={{ gap: '10px' }}>
            <label>
              Min Length / Min Value
              <input
                type="number"
                value={question.minLength !== undefined ? question.minLength : ''}
                onChange={(e) => updateQuestion(question.id, (q) => ({ ...q, minLength: e.target.value !== '' ? Number(e.target.value) : undefined }))}
                style={{ fontSize: '0.8rem', padding: '6px' }}
              />
            </label>
            <label>
              Max Length / Max Value
              <input
                type="number"
                value={question.maxLength !== undefined ? question.maxLength : ''}
                onChange={(e) => updateQuestion(question.id, (q) => ({ ...q, maxLength: e.target.value !== '' ? Number(e.target.value) : undefined }))}
                style={{ fontSize: '0.8rem', padding: '6px' }}
              />
            </label>
          </div>

          <div className="grid two" style={{ gap: '10px' }}>
            <label>
              Custom Regex Pattern
              <input
                type="text"
                placeholder="e.g. ^[0-9]{5}$"
                value={question.validationRegex || ''}
                onChange={(e) => updateQuestion(question.id, (q) => ({ ...q, validationRegex: e.target.value }))}
                style={{ fontSize: '0.8rem', padding: '6px' }}
              />
            </label>
            <label>
              Regex Validation Message
              <input
                type="text"
                placeholder="Invalid value error message"
                value={question.validationMessage || ''}
                onChange={(e) => updateQuestion(question.id, (q) => ({ ...q, validationMessage: e.target.value }))}
                style={{ fontSize: '0.8rem', padding: '6px' }}
              />
            </label>
          </div>
        </div>
      </details>
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

    const renderQuestionMedia = (q: Question) => {
      if (!q.mediaUrl) return null;
      const mediaStyle = {
        maxWidth: '100%',
        maxHeight: '260px',
        borderRadius: '8px',
        marginTop: '8px',
        marginBottom: '8px',
        border: '1px solid var(--border)',
        display: 'block'
      };
      switch (q.mediaType) {
        case 'image':
        case 'gif':
          return <img src={q.mediaUrl} alt={q.title} style={mediaStyle} />;
        case 'video':
          if (q.mediaUrl.includes('youtube.com') || q.mediaUrl.includes('youtu.be')) {
            return (
              <div className="video-embed-wrapper" style={{ marginTop: '8px', marginBottom: '8px', height: '220px' }}>
                <iframe
                  src={getYouTubeEmbedUrl(q.mediaUrl)}
                  title="Question video"
                  allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                  allowFullScreen
                  style={{ width: '100%', height: '100%', borderRadius: '8px', border: 'none' }}
                />
              </div>
            );
          }
          return <video src={q.mediaUrl} controls style={mediaStyle} />;
        case 'audio':
          return <audio src={q.mediaUrl} controls style={{ width: '100%', marginTop: '8px', marginBottom: '8px' }} />;
        case 'pdf':
          return (
            <div style={{ marginTop: '8px', marginBottom: '8px', display: 'flex', alignItems: 'center', gap: '8px', padding: '12px', background: 'rgba(255,255,255,0.03)', border: '1px solid var(--border)', borderRadius: '8px' }}>
              <span style={{ fontSize: '1.3rem' }}>≡ƒôä</span>
              <div style={{ display: 'flex', flexDirection: 'column' }}>
                <span style={{ fontSize: '0.85rem', fontWeight: 'bold' }}>PDF Document</span>
                <a href={q.mediaUrl} target="_blank" rel="noopener noreferrer" style={{ color: 'var(--accent)', fontSize: '0.75rem', textDecoration: 'underline' }}>
                  View PDF / File
                </a>
              </div>
            </div>
          );
        default:
          return null;
      }
    };

    const renderInputFields = (inputType: string) => {
      return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginTop: '4px' }}>
          {Array.from({ length: count }).map((_, idx) => {
            const val = Array.isArray(value) ? value[idx] || '' : idx === 0 ? (value as string || '') : '';
            const inputEl = (
              <input
                key={idx}
                type={inputType}
                placeholder={question.placeholder || (count > 1 ? `Participant ${idx + 1} answer` : '')}
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
            return (question.prefix || question.suffix) ? (
              <div key={idx} style={{ display: 'flex', alignItems: 'stretch', gap: '0', borderRadius: 'var(--card-radius)', overflow: 'hidden', border: '1px solid var(--border)', background: 'var(--bg-soft)' }}>
                {question.prefix && <span style={{ display: 'flex', alignItems: 'center', padding: '0 12px', background: 'rgba(255,255,255,0.05)', borderRight: '1px solid var(--border)', fontSize: '0.85rem', color: 'var(--muted)' }}>{question.prefix}</span>}
                <div style={{ flex: 1 }}>
                  <input
                    type={inputType}
                    placeholder={question.placeholder || ''}
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
                    style={{ border: 'none', borderRadius: 0, width: '100%', background: 'transparent' }}
                  />
                </div>
                {question.suffix && <span style={{ display: 'flex', alignItems: 'center', padding: '0 12px', background: 'rgba(255,255,255,0.05)', borderLeft: '1px solid var(--border)', fontSize: '0.85rem', color: 'var(--muted)' }}>{question.suffix}</span>}
              </div>
            ) : inputEl;
          })}
        </div>
      );
    };

    const renderMainInput = () => {
      switch (question.type) {
        case 'short-answer':
          return renderInputFields('text');
        case 'email':
          return renderInputFields('email');
        case 'phone':
          return renderInputFields('tel');
        case 'number':
          return renderInputFields('number');
        case 'url':
          return renderInputFields('url');
        case 'time':
          return renderInputFields('time');
        case 'datetime':
          return renderInputFields('datetime-local');
        case 'date':
          return renderInputFields('date');

        case 'paragraph':
          return (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginTop: '4px' }}>
              {Array.from({ length: count }).map((_, idx) => {
                const val = Array.isArray(value) ? value[idx] || '' : idx === 0 ? (value as string || '') : '';
                return (
                  <textarea
                    key={idx}
                    rows={4}
                    placeholder={question.placeholder || (count > 1 ? `Participant ${idx + 1} details` : '')}
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
          );

        case 'dropdown':
          return (
            <select value={typeof value === 'string' ? value : ''} onChange={(event) => setAnswer(question.id, event.target.value)} style={{ marginTop: '4px' }}>
              <option value="">Choose an option</option>
              {question.options.map((option) => (
                <option key={option} value={option}>
                  {option}
                </option>
              ))}
            </select>
          );

        case 'multiple-choice':
          return (
            <div className="choice-stack" style={{ marginTop: '6px' }}>
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
          );

        case 'checkboxes':
          const selected = Array.isArray(value) ? value : [];
          return (
            <div className="choice-stack" style={{ marginTop: '6px' }}>
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
          );

        case 'star-rating':
          const ratingVal = Number(value || '5');
          return (
            <div className="star-row" style={{ marginTop: '6px' }}>
              {[1, 2, 3, 4, 5].map((star) => (
                <button
                  key={star}
                  type="button"
                  className={star <= ratingVal ? 'star-btn active' : 'star-btn'}
                  onClick={() => setAnswer(question.id, String(star))}
                >
                  Γÿà
                </button>
              ))}
            </div>
          );

        case 'scale':
          const scaleMinVal = question.scaleMin !== undefined ? question.scaleMin : 1;
          const scaleMaxVal = question.scaleMax !== undefined ? question.scaleMax : 10;
          const scaleCurrent = value !== undefined ? Number(value) : scaleMinVal;
          return (
            <div className="scale-wrap" style={{ marginTop: '10px' }}>
              <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', justifyContent: 'space-between', marginBottom: '8px' }}>
                {Array.from({ length: scaleMaxVal - scaleMinVal + 1 }).map((_, idx) => {
                  const num = scaleMinVal + idx;
                  const isActive = scaleCurrent === num;
                  return (
                    <button
                      key={num}
                      type="button"
                      onClick={() => setAnswer(question.id, String(num))}
                      style={{
                        width: '36px',
                        height: '36px',
                        borderRadius: '50%',
                        border: isActive ? '2px solid var(--accent)' : '1px solid var(--border)',
                        background: isActive ? 'var(--accent-glow)' : 'rgba(255,255,255,0.02)',
                        color: isActive ? 'var(--accent)' : 'var(--text)',
                        fontWeight: 'bold',
                        cursor: 'pointer',
                        fontSize: '0.85rem'
                      }}
                    >
                      {num}
                    </button>
                  );
                })}
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.8rem', color: 'var(--muted)' }}>
                <span>{question.scaleLeftLabel || `${scaleMinVal}`}</span>
                <span>{question.scaleRightLabel || `${scaleMaxVal}`}</span>
              </div>
            </div>
          );

        case 'slider':
          const sMin = question.sliderMin !== undefined ? question.sliderMin : 0;
          const sMax = question.sliderMax !== undefined ? question.sliderMax : 100;
          const sStep = question.sliderStep !== undefined ? question.sliderStep : 1;
          const sVal = value !== undefined ? value : String(sMin);
          return (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginTop: '8px' }}>
              <input
                type="range"
                min={sMin}
                max={sMax}
                step={sStep}
                value={sVal}
                onChange={(e) => setAnswer(question.id, e.target.value)}
                style={{ width: '100%', accentColor: 'var(--accent)' }}
              />
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.8rem', color: 'var(--muted)' }}>
                <span>{sMin}</span>
                <span style={{ color: 'var(--accent)', fontWeight: 'bold' }}>{sVal}</span>
                <span>{sMax}</span>
              </div>
            </div>
          );

        case 'emoji-rating':
          const eVal = Number(value || '3');
          const icons = question.emojiType === 'hearts' 
            ? ['Γ¥ñ∩╕Å', 'Γ¥ñ∩╕Å', 'Γ¥ñ∩╕Å', 'Γ¥ñ∩╕Å', 'Γ¥ñ∩╕Å']
            : question.emojiType === 'emojis'
              ? ['≡ƒÿá', '≡ƒÖü', '≡ƒÿÉ', '≡ƒÖé', '≡ƒÿä']
              : ['Γÿà', 'Γÿà', 'Γÿà', 'Γÿà', 'Γÿà'];
          return (
            <div style={{ display: 'flex', gap: '12px', marginTop: '8px', fontSize: '1.6rem' }}>
              {icons.map((icon, idx) => (
                <button
                  key={idx}
                  type="button"
                  style={{
                    background: 'none',
                    border: 'none',
                    cursor: 'pointer',
                    opacity: idx < eVal ? 1 : 0.25,
                    transform: idx < eVal ? 'scale(1.15)' : 'scale(1)',
                    transition: 'all 0.2s ease',
                    padding: 0
                  }}
                  onClick={() => setAnswer(question.id, String(idx + 1))}
                >
                  {icon}
                </button>
              ))}
            </div>
          );

        case 'nps':
          const npsCurrent = value !== undefined ? Number(value) : -1;
          return (
            <div style={{ marginTop: '8px' }}>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
                {Array.from({ length: 11 }).map((_, idx) => (
                  <button
                    key={idx}
                    type="button"
                    style={{
                      width: '34px',
                      height: '34px',
                      padding: 0,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      borderRadius: '8px',
                      border: npsCurrent === idx ? '2px solid var(--accent)' : '1px solid var(--border)',
                      background: npsCurrent === idx ? 'var(--accent-glow)' : 'rgba(255,255,255,0.02)',
                      color: npsCurrent === idx ? 'var(--accent)' : 'var(--text)',
                      fontWeight: 'bold',
                      cursor: 'pointer',
                      fontSize: '0.85rem'
                    }}
                    onClick={() => setAnswer(question.id, String(idx))}
                  >
                    {idx}
                  </button>
                ))}
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.75rem', color: 'var(--muted)', marginTop: '8px' }}>
                <span>Not likely at all</span>
                <span>Extremely likely</span>
              </div>
            </div>
          );

        case 'ranking':
          let list: string[] = [];
          try {
            list = typeof value === 'string' ? JSON.parse(value) : Array.isArray(value) ? value : [];
          } catch {}
          if (list.length === 0) {
            list = question.rankingItems || [];
          }
          return (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginTop: '8px' }}>
              {list.map((item, idx) => (
                <div
                  key={idx}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    padding: '8px 12px',
                    background: 'rgba(255,255,255,0.02)',
                    border: '1px solid var(--border)',
                    borderRadius: '8px',
                    fontSize: '0.85rem'
                  }}
                >
                  <span>{item}</span>
                  <div style={{ display: 'flex', gap: '4px' }}>
                    <button
                      type="button"
                      className="ghost-button"
                      style={{ padding: '2px 6px', fontSize: '0.7rem' }}
                      disabled={idx === 0}
                      onClick={() => {
                        const next = [...list];
                        const temp = next[idx];
                        next[idx] = next[idx - 1];
                        next[idx - 1] = temp;
                        setAnswer(question.id, JSON.stringify(next));
                      }}
                    >
                      Γû▓
                    </button>
                    <button
                      type="button"
                      className="ghost-button"
                      style={{ padding: '2px 6px', fontSize: '0.7rem' }}
                      disabled={idx === list.length - 1}
                      onClick={() => {
                        const next = [...list];
                        const temp = next[idx];
                        next[idx] = next[idx + 1];
                        next[idx + 1] = temp;
                        setAnswer(question.id, JSON.stringify(next));
                      }}
                    >
                      Γû╝
                    </button>
                  </div>
                </div>
              ))}
            </div>
          );

        case 'matrix':
        case 'checkbox-matrix':
          let mGrid: Record<string, string[]> = {};
          try {
            mGrid = typeof value === 'string' ? JSON.parse(value) : {};
          } catch {}
          const rows = question.matrixRows || [];
          const cols = question.matrixCols || [];
          return (
            <div style={{ overflowX: 'auto', marginTop: '8px' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: '380px' }}>
                <thead>
                  <tr style={{ borderBottom: '1px solid var(--border)' }}>
                    <th style={{ padding: '8px', textAlign: 'left', fontSize: '0.75rem', color: 'var(--muted)' }}>Statement</th>
                    {cols.map(c => (
                      <th key={c} style={{ padding: '8px', textAlign: 'center', fontSize: '0.75rem', color: 'var(--muted)' }}>{c}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {rows.map(r => {
                    const selections = mGrid[r] || [];
                    return (
                      <tr key={r} style={{ borderBottom: '1px solid rgba(255,255,255,0.03)' }}>
                        <td style={{ padding: '8px', fontSize: '0.85rem', fontWeight: 'bold' }}>{r}</td>
                        {cols.map(c => {
                          const isSel = selections.includes(c);
                          return (
                            <td key={c} style={{ padding: '8px', textAlign: 'center' }}>
                              <input
                                type={question.type === 'matrix' ? 'radio' : 'checkbox'}
                                name={`${question.id}-${r}`}
                                checked={isSel}
                                onChange={(e) => {
                                  const next = { ...mGrid };
                                  if (question.type === 'matrix') {
                                    next[r] = e.target.checked ? [c] : [];
                                  } else {
                                    const currentSelections = next[r] || [];
                                    next[r] = e.target.checked 
                                      ? [...currentSelections, c]
                                      : currentSelections.filter(colItem => colItem !== c);
                                  }
                                  setAnswer(question.id, JSON.stringify(next));
                                }}
                                style={{ cursor: 'pointer' }}
                              />
                            </td>
                          );
                        })}
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          );

        case 'address':
          let addressData: Record<string, string> = { street: '', city: '', state: '', zip: '' };
          try {
            addressData = typeof value === 'string' ? JSON.parse(value) : {};
          } catch {}
          const changeAddress = (fieldKey: string, val: string) => {
            const next = { ...addressData, [fieldKey]: val };
            setAnswer(question.id, JSON.stringify(next));
          };
          return (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginTop: '8px' }}>
              <input
                type="text"
                placeholder="Street Address"
                value={addressData.street || ''}
                onChange={(e) => changeAddress('street', e.target.value)}
              />
              <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr 1fr', gap: '8px' }}>
                <input
                  type="text"
                  placeholder="City"
                  value={addressData.city || ''}
                  onChange={(e) => changeAddress('city', e.target.value)}
                />
                <input
                  type="text"
                  placeholder="State"
                  value={addressData.state || ''}
                  onChange={(e) => changeAddress('state', e.target.value)}
                />
                <input
                  type="text"
                  placeholder="ZIP"
                  value={addressData.zip || ''}
                  onChange={(e) => changeAddress('zip', e.target.value)}
                />
              </div>
            </div>
          );

        case 'signature':
          return (
            <div style={{ marginTop: '8px' }}>
              <div 
                style={{
                  width: '100%',
                  height: '110px',
                  border: '1px dashed var(--border)',
                  background: 'rgba(0,0,0,0.15)',
                  borderRadius: '8px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: 'var(--muted)',
                  fontSize: '0.8rem',
                  position: 'relative'
                }}
              >
                {value ? (
                  <img src={value as string} alt="Signature Preview" style={{ maxHeight: '100%', maxWidth: '100%', objectFit: 'contain' }} />
                ) : (
                  <span>[Signature Pad - Draw on public form]</span>
                )}
                {value && (
                  <button
                    type="button"
                    style={{ position: 'absolute', bottom: '4px', right: '4px', fontSize: '0.7rem', padding: '2px 6px', borderRadius: '4px', background: 'rgba(255,255,255,0.08)', border: 'none', cursor: 'pointer' }}
                    onClick={() => setAnswer(question.id, '')}
                  >
                    Clear
                  </button>
                )}
              </div>
            </div>
          );

        case 'file':
          const filesList: string[] = typeof value === 'string' ? [value] : Array.isArray(value) ? value : [];
          return (
            <div style={{ marginTop: '8px' }}>
              <div
                style={{
                  border: '2px dashed var(--border)',
                  borderRadius: '12px',
                  padding: '16px 12px',
                  textAlign: 'center',
                  background: 'rgba(255,255,255,0.01)',
                  cursor: 'pointer'
                }}
                onClick={() => alert("File Upload: Mock selection in live preview.")}
              >
                <span style={{ fontSize: '1.3rem', display: 'block', marginBottom: '4px' }}>≡ƒôñ</span>
                <strong style={{ fontSize: '0.8rem' }}>Upload files</strong>
                <p style={{ fontSize: '0.7rem', color: 'var(--muted)', margin: '2px 0 0' }}>
                  Limit: {question.maxFileSize || 10} MB. Supported: {question.allowedFileTypes?.join(', ') || 'Any'}
                </p>
              </div>
              {filesList.length > 0 && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', marginTop: '8px' }}>
                  {filesList.map((fileUrl, index) => (
                    <div key={index} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '4px 8px', background: 'rgba(255,255,255,0.03)', borderRadius: '6px', border: '1px solid var(--border)', fontSize: '0.75rem' }}>
                      <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: '80%' }}>{fileUrl}</span>
                      <button type="button" className="ghost-button danger" style={{ padding: '1px 4px', fontSize: '0.65rem' }} onClick={() => {
                        const next = filesList.filter((_, i) => i !== index);
                        setAnswer(question.id, next.length > 0 ? next : '');
                      }}>Delete</button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          );

        default:
          return null;
      }
    };

    return (
      <div key={question.id} className="preview-card">
        {question.mediaPosition === 'above' && renderQuestionMedia(question)}
        <span className="preview-label">
          {question.title} {question.required && <span style={{ color: 'var(--accent)' }}>*</span>}
        </span>
        {question.helpText && <span className="preview-help">{question.helpText}</span>}
        {renderMainInput()}
        {question.mediaPosition === 'below' && renderQuestionMedia(question)}
      </div>
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
        settingsJson: JSON.stringify(builder.settings),
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

  if (isInitialLoad) {
    return (
      <main className="shell forms-app skeleton-loading">
        <section className="hero">
          <div className="hero-copy">
            <div className="skeleton-line" style={{ width: '120px', height: '14px', marginBottom: '8px' }}></div>
            <div className="skeleton-line" style={{ width: '80%', height: '48px', marginBottom: '16px' }}></div>
            <div className="skeleton-line" style={{ width: '60%', height: '20px' }}></div>
          </div>
          <div className="hero-panel" style={{ display: 'flex', gap: '16px' }}>
            <div className="stat-card skeleton-box" style={{ height: '80px', flex: 1 }}></div>
            <div className="stat-card skeleton-box" style={{ height: '80px', flex: 1 }}></div>
          </div>
        </section>
        <section className="workspace" style={{ display: 'grid', gridTemplateColumns: '320px 1fr 340px', gap: '24px' }}>
          <aside className="rail skeleton-box" style={{ height: '600px' }}></aside>
          <div className="canvas skeleton-box" style={{ height: '600px', padding: '24px' }}>
            <div className="skeleton-line" style={{ width: '40%', height: '24px', marginBottom: '16px' }}></div>
            <div className="skeleton-line" style={{ width: '100%', height: '140px', marginBottom: '16px' }}></div>
            <div className="skeleton-line" style={{ width: '100%', height: '140px' }}></div>
          </div>
          <aside className="vault skeleton-box" style={{ height: '600px' }}></aside>
        </section>
      </main>
    );
  }

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
            <p className="section-label">Form Settings</p>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              {/* Lifecycle Section */}
              <div className="settings-accordion-item" style={{ border: '1px solid var(--border)', borderRadius: '8px', overflow: 'hidden' }}>
                <button
                  type="button"
                  onClick={() => setExpandedSection(expandedSection === 'lifecycle' ? null : 'lifecycle')}
                  style={{
                    width: '100%',
                    padding: '10px 12px',
                    background: 'rgba(255,255,255,0.02)',
                    border: 'none',
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    cursor: 'pointer',
                    fontFamily: 'Orbitron, sans-serif',
                    fontSize: '0.8rem',
                    color: 'var(--text)',
                    textAlign: 'left'
                  }}
                >
                  <span>≡ƒôü Lifecycle</span>
                  <span>{expandedSection === 'lifecycle' ? 'Γû╝' : 'Γû╢'}</span>
                </button>
                {expandedSection === 'lifecycle' && (
                  <div style={{ padding: '12px', display: 'flex', flexDirection: 'column', gap: '10px', borderTop: '1px solid var(--border)' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <span style={{ fontSize: '0.8rem', color: 'var(--muted)' }}>Current Status</span>
                      <span style={{
                        padding: '2px 8px',
                        borderRadius: '4px',
                        fontSize: '0.75rem',
                        fontWeight: 'bold',
                        background: 
                          builder.status === 'OPEN' ? 'rgba(34, 197, 94, 0.1)' :
                          builder.status === 'PAUSED' ? 'rgba(234, 179, 8, 0.1)' :
                          builder.status === 'CLOSED' ? 'rgba(239, 68, 68, 0.1)' :
                          builder.status === 'ARCHIVED' ? 'rgba(156, 163, 175, 0.1)' : 'rgba(234, 179, 8, 0.1)',
                        color:
                          builder.status === 'OPEN' ? '#22c55e' :
                          builder.status === 'PAUSED' ? '#eab308' :
                          builder.status === 'CLOSED' ? '#ef4444' :
                          builder.status === 'ARCHIVED' ? '#9ca3af' : '#eab308',
                        border: 
                          builder.status === 'OPEN' ? '1px solid #22c55e' :
                          builder.status === 'PAUSED' ? '1px solid #eab308' :
                          builder.status === 'CLOSED' ? '1px solid #ef4444' :
                          builder.status === 'ARCHIVED' ? '1px solid #9ca3af' : '1px solid #eab308'
                      }}>
                        {builder.status === 'OPEN' ? '≡ƒƒó Open' :
                         builder.status === 'PAUSED' ? 'ΓÅ╕ Paused' :
                         builder.status === 'CLOSED' ? '≡ƒö┤ Closed' :
                         builder.status === 'ARCHIVED' ? '≡ƒôª Archived' : '≡ƒƒí Draft'}
                      </span>
                    </div>
                    
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginTop: '4px' }}>
                      {!builder.published && (
                        <button
                          type="button"
                          className="submit-button"
                          style={{ padding: '6px 12px', fontSize: '0.75rem', width: '100%' }}
                          onClick={async () => {
                            try {
                              const res = await fetch(`${API_BASE}/api/form-config/${formId}/publish`, { method: 'POST' });
                              if (res.ok) {
                                setBuilder(prev => ({ ...prev, published: true, status: 'OPEN' }));
                                alert("Form successfully published!");
                              }
                            } catch (e) {
                              alert("Publish failed");
                            }
                          }}
                        >
                          ≡ƒÜÇ Publish Form
                        </button>
                      )}
                      {builder.published && (
                        <>
                          {builder.status === 'OPEN' && (
                            <button
                              type="button"
                              className="ghost-button"
                              style={{ padding: '6px 12px', fontSize: '0.75rem', width: '100%' }}
                              onClick={async () => {
                                try {
                                  const res = await fetch(`${API_BASE}/api/form-config/${formId}/pause`, { method: 'POST' });
                                  if (res.ok) {
                                    setBuilder(prev => ({ ...prev, status: 'PAUSED' }));
                                  }
                                } catch (e) {
                                  alert("Pause failed");
                                }
                              }}
                            >
                              ΓÅ╕ Pause Form
                            </button>
                          )}
                          {builder.status === 'PAUSED' && (
                            <button
                              type="button"
                              className="submit-button"
                              style={{ padding: '6px 12px', fontSize: '0.75rem', width: '100%' }}
                              onClick={async () => {
                                try {
                                  const res = await fetch(`${API_BASE}/api/form-config/${formId}/resume`, { method: 'POST' });
                                  if (res.ok) {
                                    setBuilder(prev => ({ ...prev, status: 'OPEN' }));
                                  }
                                } catch (e) {
                                  alert("Resume failed");
                                }
                              }}
                            >
                              Γû╢ Resume Form
                            </button>
                          )}
                          <button
                            type="button"
                            className="ghost-button danger"
                            style={{ padding: '6px 12px', fontSize: '0.75rem', width: '100%' }}
                            onClick={async () => {
                              if (confirm("Are you sure you want to unpublish? This will revert the form to a draft state.")) {
                                try {
                                  const res = await fetch(`${API_BASE}/api/form-config/${formId}/unpublish`, { method: 'POST' });
                                  if (res.ok) {
                                    setBuilder(prev => ({ ...prev, published: false, status: 'DRAFT' }));
                                  }
                                } catch (e) {
                                  alert("Unpublish failed");
                                }
                              }
                            }}
                          >
                            Γå⌐ Unpublish Form
                          </button>
                        </>
                      )}
                      {builder.status !== 'ARCHIVED' && (
                        <button
                          type="button"
                          className="ghost-button danger"
                          style={{ padding: '6px 12px', fontSize: '0.75rem', width: '100%' }}
                          onClick={async () => {
                            if (confirm("Archive this form? It will become read-only.")) {
                              try {
                                const res = await fetch(`${API_BASE}/api/form-config/${formId}/archive`, { method: 'POST' });
                                if (res.ok) {
                                  setBuilder(prev => ({ ...prev, status: 'ARCHIVED' }));
                                }
                              } catch (e) {
                                  alert("Archive failed");
                              }
                            }
                          }}
                        >
                          ≡ƒôª Archive Form
                        </button>
                      )}
                      {builder.status === 'ARCHIVED' && (
                        <button
                          type="button"
                          className="submit-button"
                          style={{ padding: '6px 12px', fontSize: '0.75rem', width: '100%' }}
                          onClick={async () => {
                            try {
                              const res = await fetch(`${API_BASE}/api/form-config/${formId}/unpublish`, { method: 'POST' });
                              if (res.ok) {
                                setBuilder(prev => ({ ...prev, published: false, status: 'DRAFT' }));
                              }
                            } catch (e) {
                              alert("Restore failed");
                            }
                          }}
                        >
                          ΓÖ╗ Restore Draft
                        </button>
                      )}
                    </div>
                  </div>
                )}
              </div>

              {/* Availability Section */}
              <div className="settings-accordion-item" style={{ border: '1px solid var(--border)', borderRadius: '8px', overflow: 'hidden' }}>
                <button
                  type="button"
                  onClick={() => setExpandedSection(expandedSection === 'availability' ? null : 'availability')}
                  style={{
                    width: '100%',
                    padding: '10px 12px',
                    background: 'rgba(255,255,255,0.02)',
                    border: 'none',
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    cursor: 'pointer',
                    fontFamily: 'Orbitron, sans-serif',
                    fontSize: '0.8rem',
                    color: 'var(--text)',
                    textAlign: 'left'
                  }}
                >
                  <span>≡ƒôà Availability</span>
                  <span>{expandedSection === 'availability' ? 'Γû╝' : 'Γû╢'}</span>
                </button>
                {expandedSection === 'availability' && (
                  <div style={{ padding: '12px', display: 'flex', flexDirection: 'column', gap: '10px', borderTop: '1px solid var(--border)' }}>
                    <label style={{ display: 'flex', alignContent: 'center', justifyContent: 'space-between', flexDirection: 'row', cursor: 'pointer' }}>
                      <span>Manual Close</span>
                      <input
                        type="checkbox"
                        checked={builder.status === 'CLOSED'}
                        onChange={(e) => {
                          setBuilder(prev => ({ ...prev, status: e.target.checked ? 'CLOSED' : 'OPEN' }));
                        }}
                        style={{ width: '16px', height: '16px', accentColor: 'var(--accent)', margin: 0 }}
                      />
                    </label>
                    
                    <label style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                      <span style={{ fontSize: '0.8rem', color: 'var(--muted)' }}>Scheduled Opening Date</span>
                      <input
                        type="datetime-local"
                        value={builder.openAt}
                        onChange={(e) => setBuilder(prev => ({ ...prev, openAt: e.target.value }))}
                        style={{ fontSize: '0.8rem', padding: '6px' }}
                      />
                    </label>

                    <label style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                      <span style={{ fontSize: '0.8rem', color: 'var(--muted)' }}>Scheduled Closing Date</span>
                      <input
                        type="datetime-local"
                        value={builder.closeAt}
                        onChange={(e) => setBuilder(prev => ({ ...prev, closeAt: e.target.value }))}
                        style={{ fontSize: '0.8rem', padding: '6px' }}
                      />
                    </label>

                    <label style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                      <span style={{ fontSize: '0.8rem', color: 'var(--muted)' }}>Time Zone</span>
                      <select
                        value={builder.timezone}
                        onChange={(e) => setBuilder(prev => ({ ...prev, timezone: e.target.value }))}
                        style={{ fontSize: '0.8rem', padding: '6px' }}
                      >
                        <option value="UTC">UTC</option>
                        <option value="America/New_York">EST/EDT (New York)</option>
                        <option value="Europe/London">GMT/BST (London)</option>
                        <option value="Asia/Kolkata">IST (Kolkata)</option>
                        <option value="Asia/Tokyo">JST (Tokyo)</option>
                        <option value="Australia/Sydney">AEST/AEDT (Sydney)</option>
                      </select>
                    </label>

                    <details style={{ marginTop: '8px' }}>
                      <summary style={{ fontSize: '0.75rem', cursor: 'pointer', color: 'var(--accent)' }}>Custom Paused Page</summary>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', marginTop: '8px', paddingLeft: '8px', borderLeft: '1px solid var(--border)' }}>
                        <input
                          type="text"
                          placeholder="Paused Title"
                          value={builder.settings.pausedTitle || ''}
                          onChange={(e) => updateSettings('pausedTitle', e.target.value)}
                          style={{ fontSize: '0.75rem', padding: '4px' }}
                        />
                        <textarea
                          placeholder="Paused Description"
                          rows={2}
                          value={builder.settings.pausedDescription || ''}
                          onChange={(e) => updateSettings('pausedDescription', e.target.value)}
                          style={{ fontSize: '0.75rem', padding: '4px', resize: 'vertical' }}
                        />
                        <input
                          type="text"
                          placeholder="Paused Illustration (e.g. ΓÅ╕)"
                          value={builder.settings.pausedIllustration || ''}
                          onChange={(e) => updateSettings('pausedIllustration', e.target.value)}
                          style={{ fontSize: '0.75rem', padding: '4px' }}
                        />
                      </div>
                    </details>

                    <details style={{ marginTop: '8px' }}>
                      <summary style={{ fontSize: '0.75rem', cursor: 'pointer', color: 'var(--accent)' }}>Custom Closed Page</summary>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', marginTop: '8px', paddingLeft: '8px', borderLeft: '1px solid var(--border)' }}>
                        <input
                          type="text"
                          placeholder="Closed Title"
                          value={builder.settings.closedTitle || ''}
                          onChange={(e) => updateSettings('closedTitle', e.target.value)}
                          style={{ fontSize: '0.75rem', padding: '4px' }}
                        />
                        <textarea
                          placeholder="Closed Description"
                          rows={2}
                          value={builder.settings.closedDescription || ''}
                          onChange={(e) => updateSettings('closedDescription', e.target.value)}
                          style={{ fontSize: '0.75rem', padding: '4px', resize: 'vertical' }}
                        />
                        <input
                          type="text"
                          placeholder="Closed Illustration (e.g. ≡ƒöÆ)"
                          value={builder.settings.closedIllustration || ''}
                          onChange={(e) => updateSettings('closedIllustration', e.target.value)}
                          style={{ fontSize: '0.75rem', padding: '4px' }}
                        />
                      </div>
                    </details>

                    <details style={{ marginTop: '8px' }}>
                      <summary style={{ fontSize: '0.75rem', cursor: 'pointer', color: 'var(--accent)' }}>Custom Scheduled Page</summary>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', marginTop: '8px', paddingLeft: '8px', borderLeft: '1px solid var(--border)' }}>
                        <input
                          type="text"
                          placeholder="Scheduled Title"
                          value={builder.settings.scheduledTitle || ''}
                          onChange={(e) => updateSettings('scheduledTitle', e.target.value)}
                          style={{ fontSize: '0.75rem', padding: '4px' }}
                        />
                        <textarea
                          placeholder="Scheduled Description"
                          rows={2}
                          value={builder.settings.scheduledDescription || ''}
                          onChange={(e) => updateSettings('scheduledDescription', e.target.value)}
                          style={{ fontSize: '0.75rem', padding: '4px', resize: 'vertical' }}
                        />
                        <input
                          type="text"
                          placeholder="Scheduled Illustration (e.g. ΓÅ│)"
                          value={builder.settings.scheduledIllustration || ''}
                          onChange={(e) => updateSettings('scheduledIllustration', e.target.value)}
                          style={{ fontSize: '0.75rem', padding: '4px' }}
                        />
                      </div>
                    </details>
                  </div>
                )}
              </div>

              {/* Responses Section */}
              <div className="settings-accordion-item" style={{ border: '1px solid var(--border)', borderRadius: '8px', overflow: 'hidden' }}>
                <button
                  type="button"
                  onClick={() => setExpandedSection(expandedSection === 'responses' ? null : 'responses')}
                  style={{
                    width: '100%',
                    padding: '10px 12px',
                    background: 'rgba(255,255,255,0.02)',
                    border: 'none',
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    cursor: 'pointer',
                    fontFamily: 'Orbitron, sans-serif',
                    fontSize: '0.8rem',
                    color: 'var(--text)',
                    textAlign: 'left'
                  }}
                >
                  <span>≡ƒôè Responses</span>
                  <span>{expandedSection === 'responses' ? 'Γû╝' : 'Γû╢'}</span>
                </button>
                {expandedSection === 'responses' && (
                  <div style={{ padding: '12px', display: 'flex', flexDirection: 'column', gap: '10px', borderTop: '1px solid var(--border)' }}>
                    <label style={{ display: 'flex', alignContent: 'center', justifyContent: 'space-between', flexDirection: 'row', cursor: 'pointer' }}>
                      <span>Allow Editing</span>
                      <input
                        type="checkbox"
                        checked={builder.settings.allowEdit}
                        onChange={(e) => updateSettings('allowEdit', e.target.checked)}
                        style={{ width: '16px', height: '16px', accentColor: 'var(--accent)', margin: 0 }}
                      />
                    </label>

                    <label style={{ display: 'flex', alignContent: 'center', justifyContent: 'space-between', flexDirection: 'row', cursor: 'pointer' }}>
                      <span>Allow Multiple</span>
                      <input
                        type="checkbox"
                        checked={builder.settings.allowMultiple}
                        onChange={(e) => updateSettings('allowMultiple', e.target.checked)}
                        style={{ width: '16px', height: '16px', accentColor: 'var(--accent)', margin: 0 }}
                      />
                    </label>

                    <label style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                      <span style={{ fontSize: '0.8rem', color: 'var(--muted)' }}>Max Responses (0 = Unlimited)</span>
                      <input
                        type="number"
                        min="0"
                        value={builder.maxResponses}
                        onChange={(e) => setBuilder(prev => ({ ...prev, maxResponses: Number(e.target.value) }))}
                        style={{ fontSize: '0.8rem', padding: '6px' }}
                      />
                    </label>

                    <details style={{ marginTop: '8px' }}>
                      <summary style={{ fontSize: '0.75rem', cursor: 'pointer', color: 'var(--accent)' }}>Custom Limit Reached Page</summary>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', marginTop: '8px', paddingLeft: '8px', borderLeft: '1px solid var(--border)' }}>
                        <input
                          type="text"
                          placeholder="Limit Reached Title"
                          value={builder.settings.limitTitle || ''}
                          onChange={(e) => updateSettings('limitTitle', e.target.value)}
                          style={{ fontSize: '0.75rem', padding: '4px' }}
                        />
                        <textarea
                          placeholder="Limit Reached Description"
                          rows={2}
                          value={builder.settings.limitDescription || ''}
                          onChange={(e) => updateSettings('limitDescription', e.target.value)}
                          style={{ fontSize: '0.75rem', padding: '4px', resize: 'vertical' }}
                        />
                        <input
                          type="text"
                          placeholder="Limit Reached Illustration"
                          value={builder.settings.limitIllustration || ''}
                          onChange={(e) => updateSettings('limitIllustration', e.target.value)}
                          style={{ fontSize: '0.75rem', padding: '4px' }}
                        />
                      </div>
                    </details>
                  </div>
                )}
              </div>

              {/* Completion Section */}
              <div className="settings-accordion-item" style={{ border: '1px solid var(--border)', borderRadius: '8px', overflow: 'hidden' }}>
                <button
                  type="button"
                  onClick={() => setExpandedSection(expandedSection === 'completion' ? null : 'completion')}
                  style={{
                    width: '100%',
                    padding: '10px 12px',
                    background: 'rgba(255,255,255,0.02)',
                    border: 'none',
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    cursor: 'pointer',
                    fontFamily: 'Orbitron, sans-serif',
                    fontSize: '0.8rem',
                    color: 'var(--text)',
                    textAlign: 'left'
                  }}
                >
                  <span>Γ£ô Completion</span>
                  <span>{expandedSection === 'completion' ? 'Γû╝' : 'Γû╢'}</span>
                </button>
                {expandedSection === 'completion' && (
                  <div style={{ padding: '12px', display: 'flex', flexDirection: 'column', gap: '10px', borderTop: '1px solid var(--border)' }}>
                    <label style={{ display: 'flex', alignContent: 'center', justifyContent: 'space-between', flexDirection: 'row', cursor: 'pointer' }}>
                      <span>Show Thank You</span>
                      <input
                        type="checkbox"
                        checked={builder.settings.showThankYou}
                        onChange={(e) => updateSettings('showThankYou', e.target.checked)}
                        style={{ width: '16px', height: '16px', accentColor: 'var(--accent)', margin: 0 }}
                      />
                    </label>

                    {builder.settings.showThankYou && (
                      <>
                        <label style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                          <span style={{ fontSize: '0.8rem', color: 'var(--muted)' }}>Thank You Title</span>
                          <input
                            type="text"
                            value={builder.settings.thankYouTitle}
                            onChange={(e) => updateSettings('thankYouTitle', e.target.value)}
                            style={{ fontSize: '0.8rem', padding: '6px' }}
                          />
                        </label>
                        <label style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                          <span style={{ fontSize: '0.8rem', color: 'var(--muted)' }}>Thank You Desc</span>
                          <textarea
                            rows={2}
                            value={builder.settings.thankYouDescription}
                            onChange={(e) => updateSettings('thankYouDescription', e.target.value)}
                            style={{ fontSize: '0.8rem', padding: '6px', resize: 'vertical' }}
                          />
                        </label>
                        <label style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                          <span style={{ fontSize: '0.8rem', color: 'var(--muted)' }}>Illustration Preset</span>
                          <select
                            value={builder.settings.successIllustration}
                            onChange={(e) => updateSettings('successIllustration', e.target.value)}
                            style={{ fontSize: '0.8rem', padding: '6px' }}
                          >
                            <option value="">None</option>
                            <option value="confetti">Confetti ≡ƒÄë</option>
                            <option value="cyber-globe">Cyber Globe ≡ƒîÉ</option>
                            <option value="space-launch">Space Launch ≡ƒÜÇ</option>
                          </select>
                        </label>
                        <label style={{ display: 'flex', alignContent: 'center', justifyContent: 'space-between', flexDirection: 'row', cursor: 'pointer' }}>
                          <span style={{ fontSize: '0.8rem', color: 'var(--muted)' }}>Show Response ID</span>
                          <input
                            type="checkbox"
                            checked={builder.settings.showSubmissionId}
                            onChange={(e) => updateSettings('showSubmissionId', e.target.checked)}
                            style={{ width: '16px', height: '16px', accentColor: 'var(--accent)', margin: 0 }}
                          />
                        </label>
                      </>
                    )}

                    <label style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                      <span style={{ fontSize: '0.8rem', color: 'var(--muted)' }}>Redirect URL on Success</span>
                      <input
                        type="text"
                        placeholder="https://example.com/success"
                        value={builder.settings.redirectUrl}
                        onChange={(e) => updateSettings('redirectUrl', e.target.value)}
                        style={{ fontSize: '0.8rem', padding: '6px' }}
                      />
                    </label>
                  </div>
                )}
              </div>

              {/* Access Section */}
              <div className="settings-accordion-item" style={{ border: '1px solid var(--border)', borderRadius: '8px', overflow: 'hidden' }}>
                <button
                  type="button"
                  onClick={() => setExpandedSection(expandedSection === 'access' ? null : 'access')}
                  style={{
                    width: '100%',
                    padding: '10px 12px',
                    background: 'rgba(255,255,255,0.02)',
                    border: 'none',
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    cursor: 'pointer',
                    fontFamily: 'Orbitron, sans-serif',
                    fontSize: '0.8rem',
                    color: 'var(--text)',
                    textAlign: 'left'
                  }}
                >
                  <span>≡ƒ¢í Access Control</span>
                  <span>{expandedSection === 'access' ? 'Γû╝' : 'Γû╢'}</span>
                </button>
                {expandedSection === 'access' && (
                  <div style={{ padding: '12px', display: 'flex', flexDirection: 'column', gap: '10px', borderTop: '1px solid var(--border)' }}>
                    <label style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                      <span style={{ fontSize: '0.8rem', color: 'var(--muted)' }}>Access Mode</span>
                      <select
                        value={builder.accessMode}
                        onChange={(e) => setBuilder(prev => ({ ...prev, accessMode: e.target.value }))}
                        style={{ fontSize: '0.8rem', padding: '6px' }}
                      >
                        <option value="PUBLIC">≡ƒöô Public</option>
                        <option value="PASSWORD_PROTECTED">≡ƒöÆ Password Protected</option>
                      </select>
                    </label>
                    
                    {builder.accessMode === 'PASSWORD_PROTECTED' && (
                      <label style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                        <span style={{ fontSize: '0.8rem', color: 'var(--muted)' }}>Set Password</span>
                        <input
                          type="password"
                          placeholder="Enter new password"
                          value={builder.password || ''}
                          onChange={(e) => setBuilder(prev => ({ ...prev, password: e.target.value }))}
                          style={{ fontSize: '0.8rem', padding: '6px' }}
                        />
                        <span style={{ fontSize: '0.7rem', color: 'var(--muted)', marginTop: '2px' }}>
                          Leave blank to keep existing password.
                        </span>
                      </label>
                    )}
                  </div>
                )}
              </div>

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
                          <span>Γ£ª</span>
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
              <div className="modal-icon">Γ£ª</div>
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
