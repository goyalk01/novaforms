'use client';

import { FormEvent, useEffect, useState, useRef, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';

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
  successIllustration: ''
};

function SignaturePad({ value, onChange }: { value: string; onChange: (val: string) => void }) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [isDrawing, setIsDrawing] = useState(false);

  const startDrawing = (e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    ctx.strokeStyle = '#a5b4fc';
    ctx.lineWidth = 3;
    ctx.lineCap = 'round';

    const rect = canvas.getBoundingClientRect();
    const x = ('touches' in e) ? e.touches[0].clientX - rect.left : e.clientX - rect.left;
    const y = ('touches' in e) ? e.touches[0].clientY - rect.top : e.clientY - rect.top;

    ctx.beginPath();
    ctx.moveTo(x, y);
    setIsDrawing(true);
  };

  const draw = (e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
    if (!isDrawing) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const rect = canvas.getBoundingClientRect();
    const x = ('touches' in e) ? e.touches[0].clientX - rect.left : e.clientX - rect.left;
    const y = ('touches' in e) ? e.touches[0].clientY - rect.top : e.clientY - rect.top;

    ctx.lineTo(x, y);
    ctx.stroke();
  };

  const stopDrawing = () => {
    if (!isDrawing) return;
    setIsDrawing(false);
    const canvas = canvasRef.current;
    if (canvas) {
      onChange(canvas.toDataURL('image/png'));
    }
  };

  const clear = () => {
    const canvas = canvasRef.current;
    if (canvas) {
      const ctx = canvas.getContext('2d');
      if (ctx) {
        ctx.clearRect(0, 0, canvas.width, canvas.height);
      }
      onChange('');
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
      <canvas
        ref={canvasRef}
        width={500}
        height={150}
        onMouseDown={startDrawing}
        onMouseMove={draw}
        onMouseUp={stopDrawing}
        onMouseLeave={stopDrawing}
        onTouchStart={startDrawing}
        onTouchMove={draw}
        onTouchEnd={stopDrawing}
        style={{
          width: '100%',
          height: '150px',
          border: '1px dashed var(--border)',
          background: 'rgba(0,0,0,0.2)',
          borderRadius: '8px',
          cursor: 'crosshair',
          touchAction: 'none'
        }}
      />
      <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
        <button type="button" className="ghost-button danger" style={{ padding: '4px 10px', fontSize: '0.75rem' }} onClick={clear}>
          Clear Signature
        </button>
      </div>
    </div>
  );
}

function FileUpload({ 
  maxFileSize, 
  allowedFileTypes, 
  multipleFiles, 
  maxFiles, 
  value, 
  onChange 
}: { 
  maxFileSize?: number;
  allowedFileTypes?: string[];
  multipleFiles?: boolean;
  maxFiles?: number;
  value: AnswerValue;
  onChange: (val: AnswerValue) => void;
}) {
  const [uploading, setUploading] = useState(false);
  const filesList: string[] = typeof value === 'string' ? (value ? [value] : []) : Array.isArray(value) ? value : [];

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const sizeInMB = file.size / (1024 * 1024);
    const limitMB = maxFileSize || 10;
    if (sizeInMB > limitMB) {
      alert(`File size exceeds limit of ${limitMB}MB`);
      return;
    }

    if (allowedFileTypes && allowedFileTypes.length > 0) {
      const extension = '.' + file.name.split('.').pop()?.toLowerCase();
      const isAllowed = allowedFileTypes.some(type => {
        if (type.startsWith('.')) return extension === type.toLowerCase();
        if (type.endsWith('/*')) {
          const prefix = type.split('/')[0];
          return file.type.startsWith(prefix);
        }
        return file.type === type;
      });
      if (!isAllowed) {
        alert(`Allowed formats: ${allowedFileTypes.join(', ')}`);
        return;
      }
    }

    if (multipleFiles && maxFiles && filesList.length >= maxFiles) {
      alert(`Maximum file count reached: ${maxFiles}`);
      return;
    }

    const formData = new FormData();
    formData.append('file', file);

    setUploading(true);
    try {
      const res = await fetch(`${API_BASE}/api/storage/upload`, {
        method: 'POST',
        body: formData
      });
      if (res.ok) {
        const data = await res.json();
        if (data.url) {
          if (multipleFiles) {
            onChange([...filesList, data.url]);
          } else {
            onChange(data.url);
          }
        }
      } else {
        const err = await res.json().catch(() => ({}));
        alert(err.error || "File upload failed");
      }
    } catch {
      alert("Network error uploading file");
    } finally {
      setUploading(false);
    }
  };

  const removeFile = (idx: number) => {
    const next = filesList.filter((_, i) => i !== idx);
    onChange(multipleFiles ? next : (next[0] || ''));
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
      <label
        style={{
          border: '2px dashed var(--border)',
          borderRadius: '12px',
          padding: '24px 16px',
          textAlign: 'center',
          background: 'rgba(255,255,255,0.01)',
          cursor: uploading ? 'not-allowed' : 'pointer',
          display: 'block'
        }}
      >
        <span style={{ fontSize: '1.8rem', display: 'block', marginBottom: '8px' }}>
          {uploading ? '⏳' : '📤'}
        </span>
        <strong style={{ fontSize: '0.9rem' }}>
          {uploading ? 'Uploading attachment...' : 'Select file to upload'}
        </strong>
        <p style={{ fontSize: '0.75rem', color: 'var(--muted)', margin: '4px 0 0' }}>
          Size limit: {maxFileSize || 10} MB. Formats: {allowedFileTypes?.join(', ') || 'Any'}
        </p>
        <input 
          type="file" 
          disabled={uploading} 
          onChange={handleUpload} 
          style={{ display: 'none' }} 
        />
      </label>
      {filesList.length > 0 && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', marginTop: '4px' }}>
          {filesList.map((url, idx) => (
            <div key={idx} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '6px 12px', background: 'rgba(255,255,255,0.03)', borderRadius: '6px', border: '1px solid var(--border)', fontSize: '0.8rem' }}>
              <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: '80%' }}>
                {url.split('/').pop()}
              </span>
              <button type="button" className="ghost-button danger" style={{ padding: '2px 8px', fontSize: '0.7rem' }} onClick={() => removeFile(idx)}>
                Remove
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function FormIntakeComponent() {
  const searchParams = useSearchParams();
  const formId = searchParams.get('id') ?? '1';
  const submissionId = searchParams.get('submissionId');

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
    settings: SubmissionSettings;
  } | null>(null);

  const [answers, setAnswers] = useState<Record<string, AnswerValue>>({});
  const [loading, setLoading] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [newSubmissionId, setNewSubmissionId] = useState<number | null>(null);
  const [errorMsg, setErrorMsg] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [responseCount, setResponseCount] = useState(0);
  const [isEditing, setIsEditing] = useState(false);
  const [editingSubmissionId, setEditingSubmissionId] = useState<string | null>(null);

  useEffect(() => {
    const loadFormConfig = async () => {
      let loadedConfig: any = null;

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
            let parsedSettings = defaultSettings;
            if (conf.settingsJson) {
              try {
                parsedSettings = { ...defaultSettings, ...JSON.parse(conf.settingsJson) };
              } catch (e) {
                console.error("Failed to parse settingsJson", e);
              }
            }
            loadedConfig = {
              title: conf.title || 'Orbit Intake',
              description: conf.description || '',
              workspaceName: conf.name || 'Nova Studio',
              theme: conf.themeMode || 'silver',
              density: conf.layoutDensity || 'comfortable',
              submissionMode: conf.submissionMode || 'standard',
              totalPages: conf.totalPages || 1,
              bannerUrl: conf.bannerUrl || '',
              videoUrl: conf.videoUrl || '',
              questions,
              settings: parsedSettings
            };
          }
        }
      } catch (err) {
        console.error("Failed to fetch form config from API", err);
      }

      if (!loadedConfig) {
        // Try local storage
        const saved = localStorage.getItem('novaforms-published-form');
        if (saved) {
          try {
            const parsed = JSON.parse(saved);
            loadedConfig = {
              ...parsed,
              settings: parsed.settings || defaultSettings
            };
          } catch (e) {
            console.error("Failed to parse local storage configuration", e);
          }
        }
      }

      if (!loadedConfig) {
        // Fallback defaults
        const defaultQuestions: Question[] = [
          { id: 'q-name', title: 'Full name', helpText: 'Required', type: 'short-answer', required: true, options: [], scaleMax: 5, fieldKey: 'fullName' },
          { id: 'q-email', title: 'Email address', helpText: 'Required', type: 'email', required: true, options: [], scaleMax: 5, fieldKey: 'email' },
          { id: 'q-msg', title: 'Additional feedback', helpText: 'Optional', type: 'paragraph', required: false, options: [], scaleMax: 5 }
        ];
        loadedConfig = {
          title: 'Form Submission Intake',
          description: 'Please fill out this dynamic form response.',
          workspaceName: 'Nova Forms',
          theme: 'silver',
          density: 'comfortable',
          submissionMode: 'standard',
          questions: defaultQuestions,
          settings: defaultSettings
        };
      }

      setFormConfig(loadedConfig);
      initAnswers(loadedConfig.questions);
      applyThemeStyles(loadedConfig.theme, loadedConfig.density);

      // Fetch response count to enforce constraints
      try {
        const submissionsRes = await fetch(`${API_BASE}/api/submissions?formId=${formId}`, { cache: 'no-store' });
        if (submissionsRes.ok) {
          const submissionsData = await submissionsRes.json();
          setResponseCount(submissionsData.length);
        }
      } catch (err) {
        console.error("Failed to fetch submission count", err);
      }

      // Check edit mode
      if (submissionId && loadedConfig.settings.allowEdit) {
        try {
          const subRes = await fetch(`${API_BASE}/api/submissions/${submissionId}`);
          if (subRes.ok) {
            const subData = await subRes.json();
            if (subData.answersJson) {
              try {
                const parsedAnswers = JSON.parse(subData.answersJson);
                setAnswers((prev) => ({ ...prev, ...parsedAnswers }));
                setIsEditing(true);
                setEditingSubmissionId(submissionId);
              } catch (e) {
                console.error("Failed to parse answersJson from edit target", e);
              }
            }
          }
        } catch (err) {
          console.error("Failed to load submission for editing", err);
        }
      }
    };

    void loadFormConfig();
  }, [formId, submissionId]);

  const initAnswers = (questions: Question[]) => {
    const initial = questions.reduce<Record<string, AnswerValue>>((acc, q) => {
      if (q.defaultValue) {
        acc[q.id] = q.defaultValue;
      } else if (q.type === 'checkboxes') {
        acc[q.id] = [];
      } else if (q.type === 'scale') {
        acc[q.id] = String(q.scaleMin ?? 1);
      } else if (q.type === 'star-rating' || q.type === 'nps') {
        acc[q.id] = '5';
      } else if (q.type === 'slider') {
        acc[q.id] = String(q.sliderMin ?? 0);
      } else if (q.type === 'address') {
        acc[q.id] = JSON.stringify({ street: '', city: '', state: '', zip: '' });
      } else if (q.type === 'matrix' || q.type === 'checkbox-matrix') {
        const initialGrid: Record<string, string[]> = {};
        q.matrixRows?.forEach(row => {
          initialGrid[row] = [];
        });
        acc[q.id] = JSON.stringify(initialGrid);
      } else if (q.type === 'ranking') {
        acc[q.id] = JSON.stringify(q.rankingItems ?? []);
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

    // Validation Engine
    let isValid = true;
    let errorFields: string[] = [];

    for (const q of formConfig.questions) {
      const val = answers[q.id];
      const hasValue = (val !== undefined && val !== null && val !== '');

      // Required Check
      if (q.required) {
        if (!hasValue) {
          isValid = false;
          errorFields.push(`"${q.title}" is required.`);
          continue;
        }
        if (Array.isArray(val) && val.length === 0) {
          isValid = false;
          errorFields.push(`"${q.title}" is required.`);
          continue;
        }
        if (q.type === 'address') {
          try {
            const addr = JSON.parse(val as string);
            if (!addr.street || !addr.city || !addr.state || !addr.zip) {
              isValid = false;
              errorFields.push(`"${q.title}" (complete address) is required.`);
              continue;
            }
          } catch {
            isValid = false;
            errorFields.push(`"${q.title}" is required.`);
            continue;
          }
        }
        if (q.type === 'matrix' || q.type === 'checkbox-matrix') {
          try {
            const grid = JSON.parse(val as string);
            const incomplete = q.matrixRows?.some(r => !grid[r] || grid[r].length === 0);
            if (incomplete) {
              isValid = false;
              errorFields.push(`"${q.title}" requires an answer for each row.`);
              continue;
            }
          } catch {
            isValid = false;
            errorFields.push(`"${q.title}" is required.`);
            continue;
          }
        }
      }

      // Format & Range constraints if filled
      if (hasValue && typeof val === 'string') {
        const valStr = val.trim();

        // Email check
        if (q.type === 'email') {
          const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
          if (!emailPattern.test(valStr)) {
            isValid = false;
            errorFields.push(`"${q.title}" must be a valid email address.`);
            continue;
          }
        }

        // Phone check
        if (q.type === 'phone') {
          const phonePattern = /^\+?[0-9\s\-()]{7,20}$/;
          if (!phonePattern.test(valStr)) {
            isValid = false;
            errorFields.push(`"${q.title}" must be a valid phone number.`);
            continue;
          }
        }

        // URL check
        if (q.type === 'url') {
          try {
            new URL(valStr);
          } catch {
            isValid = false;
            errorFields.push(`"${q.title}" must be a valid website URL.`);
            continue;
          }
        }

        // Number check
        if (q.type === 'number') {
          if (isNaN(Number(valStr))) {
            isValid = false;
            errorFields.push(`"${q.title}" must be a number.`);
            continue;
          }
          const num = Number(valStr);
          if (q.minLength !== undefined && num < q.minLength) {
            isValid = false;
            errorFields.push(`"${q.title}" must be at least ${q.minLength}.`);
            continue;
          }
          if (q.maxLength !== undefined && num > q.maxLength) {
            isValid = false;
            errorFields.push(`"${q.title}" cannot exceed ${q.maxLength}.`);
            continue;
          }
        }

        // Min/Max Length check for text
        if (q.type === 'short-answer' || q.type === 'paragraph') {
          if (q.minLength !== undefined && valStr.length < q.minLength) {
            isValid = false;
            errorFields.push(`"${q.title}" must be at least ${q.minLength} characters.`);
            continue;
          }
          if (q.maxLength !== undefined && valStr.length > q.maxLength) {
            isValid = false;
            errorFields.push(`"${q.title}" cannot exceed ${q.maxLength} characters.`);
            continue;
          }
        }

        // Custom Regex check
        if (q.validationRegex) {
          try {
            const rx = new RegExp(q.validationRegex);
            if (!rx.test(valStr)) {
              isValid = false;
              errorFields.push(q.validationMessage || `"${q.title}" has an invalid format.`);
              continue;
            }
          } catch (e) {
            console.error("Regex validation compile error", e);
          }
        }
      }
    }

    if (!isValid) {
      setErrorMsg(errorFields.join(' '));
      setLoading(false);
      return;
    }

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
      let response;
      if (isEditing && editingSubmissionId) {
        response = await fetch(`${API_BASE}/api/submissions/${editingSubmissionId}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload)
        });
      } else {
        response = await fetch(`${API_BASE}/api/submissions`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload)
        });
      }

      if (!response.ok) {
        throw new Error('Submit failed');
      }

      const resData = await response.json();
      if (resData && resData.id) {
        setNewSubmissionId(resData.id);
      }

      const settings = formConfig.settings;
      if (settings.redirectUrl && !settings.showThankYou) {
        window.location.href = settings.redirectUrl;
        return;
      }

      setSubmitted(true);

      if (settings.redirectUrl && settings.showThankYou) {
        setTimeout(() => {
          window.location.href = settings.redirectUrl;
        }, 4000);
      }
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

  const isClosed = formConfig.settings.closeForm;
  const maxReached = formConfig.settings.maxResponses > 0 && responseCount >= formConfig.settings.maxResponses;

  if (isClosed || maxReached) {
    return (
      <main className="shell" style={{ maxWidth: '680px', padding: '100px 24px' }}>
        <section className="canvas" style={{ textAlign: 'center', padding: '48px 24px', border: '1px solid var(--border)', borderRadius: 'var(--card-radius)' }}>
          <div style={{ fontSize: '3rem', color: 'var(--accent)', marginBottom: '16px' }}>🔒</div>
          <h2 style={{ fontSize: '1.8rem', margin: '0 0 12px', fontFamily: 'Orbitron, sans-serif' }}>Form Unavailable</h2>
          <p style={{ color: 'var(--muted)', margin: 0 }}>
            {isClosed ? 'This form has been closed by its owner to new responses.' : 'This form has reached its maximum response capacity.'}
          </p>
        </section>
      </main>
    );
  }

  return (
    <main className="shell" style={{ maxWidth: '680px', padding: '60px 24px 100px' }}>
      {submitted ? (
        <section className="canvas" style={{ textAlign: 'center', padding: '48px 24px' }}>
          {formConfig.settings.successIllustration === 'confetti' && (
            <div style={{ fontSize: '3.5rem', animation: 'bounce 1s infinite', marginBottom: '8px' }}>🎉✨🥳</div>
          )}
          {formConfig.settings.successIllustration === 'cyber-globe' && (
            <div style={{ fontSize: '3.5rem', animation: 'spin 4s linear infinite', marginBottom: '8px' }}>🌐💫</div>
          )}
          {formConfig.settings.successIllustration === 'space-launch' && (
            <div style={{ fontSize: '3.5rem', animation: 'bounce 1.5s infinite', marginBottom: '8px' }}>🚀✨</div>
          )}
          {!formConfig.settings.successIllustration && (
            <div style={{ fontSize: '3rem', color: 'var(--success)' }}>✓</div>
          )}

          <h2 style={{ fontSize: '1.8rem', margin: '16px 0 8px', fontFamily: 'Orbitron, sans-serif' }}>
            {formConfig.settings.thankYouTitle || 'Response Submitted!'}
          </h2>
          <p style={{ color: 'var(--muted)', marginBottom: '24px' }}>
            {formConfig.settings.thankYouDescription || formConfig.settings.successMessage}
          </p>

          {formConfig.settings.showSubmissionId && newSubmissionId && (
            <div style={{ padding: '8px 16px', background: 'rgba(255,255,255,0.02)', border: '1px solid var(--border)', borderRadius: '8px', display: 'inline-block', fontSize: '0.85rem', color: 'var(--muted)', marginBottom: '32px', fontFamily: 'Share Tech Mono, monospace' }}>
              Submission Reference ID: <span style={{ color: 'var(--accent)', fontWeight: 'bold' }}>#{newSubmissionId}</span>
            </div>
          )}

          <div style={{ display: 'flex', gap: '12px', justifyContent: 'center', flexWrap: 'wrap' }}>
            {formConfig.settings.allowMultiple && (
              <button type="button" className="submit-button" onClick={() => { setSubmitted(false); initAnswers(formConfig.questions); setCurrentPage(1); setNewSubmissionId(null); setIsEditing(false); setEditingSubmissionId(null); }}>
                Submit Another Response
              </button>
            )}
            {formConfig.settings.allowEdit && newSubmissionId && (
              <button type="button" className="ghost-button" onClick={() => { setSubmitted(false); setIsEditing(true); setEditingSubmissionId(String(newSubmissionId)); }}>
                Edit Your Response
              </button>
            )}
          </div>
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
                          <span style={{ fontSize: '1.3rem' }}>📄</span>
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

                return (
                  <div key={question.id} className="preview-card" style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                    {question.mediaPosition === 'above' && renderQuestionMedia(question)}
                    <label className="preview-label" style={{ display: 'block', fontSize: '1rem', fontWeight: 600 }}>
                      {question.title} {question.required && <span style={{ color: 'var(--accent)' }}>*</span>}
                    </label>
                    {question.helpText && <span className="preview-help" style={{ display: 'block', fontSize: '0.8rem', color: 'var(--muted)' }}>{question.helpText}</span>}

                    {/* Inputs Rendering */}
                    {['short-answer', 'email', 'phone', 'number', 'url', 'time', 'datetime', 'date'].includes(question.type) && (
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                        {Array.from({ length: count }).map((_, idx) => {
                          const val = Array.isArray(value) ? value[idx] || '' : idx === 0 ? (value as string || '') : '';
                          const inputType = question.type === 'short-answer' ? 'text' 
                            : question.type === 'datetime' ? 'datetime-local' 
                            : question.type === 'phone' ? 'tel'
                            : question.type;

                          const inputEl = (
                            <input
                              key={idx}
                              type={inputType}
                              placeholder={question.placeholder || (count > 1 ? `Participant ${idx + 1} answer` : '')}
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

                          return (question.prefix || question.suffix) ? (
                            <div key={idx} style={{ display: 'flex', alignItems: 'stretch', gap: '0', borderRadius: 'var(--card-radius)', overflow: 'hidden', border: '1px solid var(--border)', background: 'rgba(255,255,255,0.01)' }}>
                              {question.prefix && <span style={{ display: 'flex', alignItems: 'center', padding: '0 12px', background: 'rgba(255,255,255,0.05)', borderRight: '1px solid var(--border)', fontSize: '0.85rem', color: 'var(--muted)' }}>{question.prefix}</span>}
                              <div style={{ flex: 1 }}>
                                <input
                                  type={inputType}
                                  placeholder={question.placeholder || ''}
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
                                  style={{ border: 'none', borderRadius: 0, width: '100%', background: 'transparent' }}
                                />
                              </div>
                              {question.suffix && <span style={{ display: 'flex', alignItems: 'center', padding: '0 12px', background: 'rgba(255,255,255,0.05)', borderLeft: '1px solid var(--border)', fontSize: '0.85rem', color: 'var(--muted)' }}>{question.suffix}</span>}
                            </div>
                          ) : inputEl;
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
                              placeholder={question.placeholder || (count > 1 ? `Participant ${idx + 1} details` : '')}
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

                    {question.type === 'scale' && (
                      <div className="scale-wrap" style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                        <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', justifyContent: 'space-between', marginBottom: '4px' }}>
                          {Array.from({ length: (question.scaleMax || 10) - (question.scaleMin || 1) + 1 }).map((_, idx) => {
                            const num = (question.scaleMin || 1) + idx;
                            const isActive = Number(value || (question.scaleMin || 1)) === num;
                            return (
                              <button
                                key={num}
                                type="button"
                                onClick={() => setAnswer(question.id, String(num))}
                                style={{
                                  width: '38px',
                                  height: '38px',
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
                          <span>{question.scaleLeftLabel || String(question.scaleMin || 1)}</span>
                          <span>{question.scaleRightLabel || String(question.scaleMax || 10)}</span>
                        </div>
                      </div>
                    )}

                    {question.type === 'slider' && (
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                        <input
                          type="range"
                          min={question.sliderMin !== undefined ? question.sliderMin : 0}
                          max={question.sliderMax !== undefined ? question.sliderMax : 100}
                          step={question.sliderStep !== undefined ? question.sliderStep : 1}
                          value={value !== undefined ? String(value) : String(question.sliderMin || 0)}
                          onChange={(e) => setAnswer(question.id, e.target.value)}
                          style={{ width: '100%', accentColor: 'var(--accent)' }}
                        />
                        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.8rem', color: 'var(--muted)' }}>
                          <span>{question.sliderMin !== undefined ? question.sliderMin : 0}</span>
                          <span style={{ color: 'var(--accent)', fontWeight: 'bold' }}>{value !== undefined ? String(value) : String(question.sliderMin || 0)}</span>
                          <span>{question.sliderMax !== undefined ? question.sliderMax : 100}</span>
                        </div>
                      </div>
                    )}

                    {question.type === 'emoji-rating' && (
                      <div style={{ display: 'flex', gap: '12px', fontSize: '1.8rem' }}>
                        {(question.emojiType === 'hearts' ? ['❤️', '❤️', '❤️', '❤️', '❤️'] : question.emojiType === 'emojis' ? ['😠', '🙁', '😐', '🙂', '😄'] : ['★', '★', '★', '★', '★']).map((icon, idx) => {
                          const ratingVal = Number(value || '3');
                          return (
                            <button
                              key={idx}
                              type="button"
                              style={{
                                background: 'none',
                                border: 'none',
                                cursor: 'pointer',
                                opacity: idx < ratingVal ? 1 : 0.25,
                                transform: idx < ratingVal ? 'scale(1.15)' : 'scale(1)',
                                transition: 'all 0.2s ease',
                                padding: 0
                              }}
                              onClick={() => setAnswer(question.id, String(idx + 1))}
                            >
                              {icon}
                            </button>
                          );
                        })}
                      </div>
                    )}

                    {question.type === 'nps' && (
                      <div>
                        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
                          {Array.from({ length: 11 }).map((_, idx) => {
                            const npsCurrent = value !== undefined ? Number(value) : -1;
                            return (
                              <button
                                key={idx}
                                type="button"
                                style={{
                                  width: '36px',
                                  height: '36px',
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
                            );
                          })}
                        </div>
                        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.75rem', color: 'var(--muted)', marginTop: '8px' }}>
                          <span>Not likely at all</span>
                          <span>Extremely likely</span>
                        </div>
                      </div>
                    )}

                    {question.type === 'ranking' && (
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                        {(() => {
                          let list: string[] = [];
                          try {
                            list = typeof value === 'string' ? JSON.parse(value) : Array.isArray(value) ? value : [];
                          } catch {}
                          if (list.length === 0) {
                            list = question.rankingItems || [];
                          }
                          return list.map((item, idx) => (
                            <div
                              key={idx}
                              style={{
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'space-between',
                                padding: '10px 14px',
                                background: 'rgba(255,255,255,0.02)',
                                border: '1px solid var(--border)',
                                borderRadius: '8px',
                                fontSize: '0.88rem'
                              }}
                            >
                              <span>{item}</span>
                              <div style={{ display: 'flex', gap: '4px' }}>
                                <button
                                  type="button"
                                  className="ghost-button"
                                  style={{ padding: '2px 8px', fontSize: '0.75rem' }}
                                  disabled={idx === 0}
                                  onClick={() => {
                                    const next = [...list];
                                    const temp = next[idx];
                                    next[idx] = next[idx - 1];
                                    next[idx - 1] = temp;
                                    setAnswer(question.id, JSON.stringify(next));
                                  }}
                                >
                                  ▲
                                </button>
                                <button
                                  type="button"
                                  className="ghost-button"
                                  style={{ padding: '2px 8px', fontSize: '0.75rem' }}
                                  disabled={idx === list.length - 1}
                                  onClick={() => {
                                    const next = [...list];
                                    const temp = next[idx];
                                    next[idx] = next[idx + 1];
                                    next[idx + 1] = temp;
                                    setAnswer(question.id, JSON.stringify(next));
                                  }}
                                >
                                  ▼
                                </button>
                              </div>
                            </div>
                          ));
                        })()}
                      </div>
                    )}

                    {(question.type === 'matrix' || question.type === 'checkbox-matrix') && (
                      <div style={{ overflowX: 'auto' }}>
                        <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: '380px' }}>
                          <thead>
                            <tr style={{ borderBottom: '1px solid var(--border)' }}>
                              <th style={{ padding: '8px', textAlign: 'left', fontSize: '0.75rem', color: 'var(--muted)' }}>Statement</th>
                              {(question.matrixCols || []).map(c => (
                                <th key={c} style={{ padding: '8px', textAlign: 'center', fontSize: '0.75rem', color: 'var(--muted)' }}>{c}</th>
                              ))}
                            </tr>
                          </thead>
                          <tbody>
                            {(() => {
                              let mGrid: Record<string, string[]> = {};
                              try {
                                mGrid = typeof value === 'string' ? JSON.parse(value) : {};
                              } catch {}
                              return (question.matrixRows || []).map(r => {
                                const selections = mGrid[r] || [];
                                return (
                                  <tr key={r} style={{ borderBottom: '1px solid rgba(255,255,255,0.03)' }}>
                                    <td style={{ padding: '8px', fontSize: '0.85rem', fontWeight: 'bold' }}>{r}</td>
                                    {(question.matrixCols || []).map(c => {
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
                              });
                            })()}
                          </tbody>
                        </table>
                      </div>
                    )}

                    {question.type === 'address' && (
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                        {(() => {
                          let addressData: Record<string, string> = { street: '', city: '', state: '', zip: '' };
                          try {
                            addressData = typeof value === 'string' ? JSON.parse(value) : {};
                          } catch {}
                          const changeAddress = (fieldKey: string, val: string) => {
                            const next = { ...addressData, [fieldKey]: val };
                            setAnswer(question.id, JSON.stringify(next));
                          };
                          return (
                            <>
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
                            </>
                          );
                        })()}
                      </div>
                    )}

                    {question.type === 'signature' && (
                      <SignaturePad 
                        value={typeof value === 'string' ? value : ''} 
                        onChange={(val) => setAnswer(question.id, val)} 
                      />
                    )}

                    {question.type === 'file' && (
                      <FileUpload
                        maxFileSize={question.maxFileSize}
                        allowedFileTypes={question.allowedFileTypes}
                        multipleFiles={question.multipleFiles}
                        maxFiles={question.maxFiles}
                        value={value || ''}
                        onChange={(val) => setAnswer(question.id, val)}
                      />
                    )}

                    {question.mediaPosition === 'below' && renderQuestionMedia(question)}
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
