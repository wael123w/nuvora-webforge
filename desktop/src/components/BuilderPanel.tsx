import { useRef, useState } from 'react';
import { ImagePlus, Sparkles, Square, Wand2, X } from 'lucide-react';
import type { AppStatus } from '../App';
import { toast } from '../lib/toast';

type ImageReference = { name: string; preview: string; base64: string; mime: string };

type Props = {
  status: AppStatus;
  providerConfigured: boolean;
  onGenerate(input: { prompt: string; framework: 'html' | 'react'; image?: { base64: string; mime: string } }): void;
  onCancel(): void;
};

export function BuilderPanel({ status, providerConfigured, onGenerate, onCancel }: Props) {
  const [prompt, setPrompt] = useState('');
  const [framework, setFramework] = useState<'html' | 'react'>('html');
  const [reference, setReference] = useState<ImageReference | null>(null);
  const [dragActive, setDragActive] = useState(false);
  const fileInput = useRef<HTMLInputElement>(null);

  const readReference = (file: File) => {
    if (!['image/png', 'image/jpeg', 'image/webp'].includes(file.type)) {
      toast.error('Use PNG, JPG/JPEG, or WEBP images only.');
      return;
    }
    if (file.size > 9 * 1024 * 1024) {
      toast.error('The image is too large. Choose a file smaller than 9 MB.');
      return;
    }
    const reader = new FileReader();
    reader.onload = () => {
      const preview = String(reader.result);
      setReference({ name: file.name, preview, base64: preview.split(',')[1] ?? '', mime: file.type });
    };
    reader.readAsDataURL(file);
  };

  const generate = () => {
    if (prompt.trim().length < 24) return toast.error('Write a detailed brief of at least 24 characters so the website can match your request.');
    if (!providerConfigured) return toast.error('Configure an AI provider in Settings first.');
    onGenerate({ prompt: prompt.trim(), framework, image: reference ? { base64: reference.base64, mime: reference.mime } : undefined });
  };

  return (
    <aside className="builder-panel">
      <div className="builder-heading">
        <div className="eyebrow"><Sparkles size={15} /> New project</div>
        <h1>Turn your idea into a complete website.</h1>
        <p>Describe what you need or add a visual reference. The AI will create the files and a responsive design.</p>
      </div>

      <label className="field-label" htmlFor="prompt">Website brief</label>
      <textarea
        id="prompt" className="prompt-input" value={prompt} onChange={(event) => setPrompt(event.target.value)}
        placeholder="Example: Create a modern learning platform with a landing page, course catalogue, analytics dashboard, and sign-up form…"
        dir="ltr"
      />
      <div className="field-meta"><span>{prompt.length} characters · 24 minimum</span><span>English and Arabic prompts are supported</span></div>

      <label className="field-label">Project technology</label>
      <div className="framework-toggle">
        <button className={framework === 'html' ? 'selected' : ''} onClick={() => setFramework('html')}>HTML / CSS / JS</button>
        <button className={framework === 'react' ? 'selected' : ''} onClick={() => setFramework('react')}>React + Vite</button>
      </div>

      <label className="field-label">Visual reference <span className="optional">Optional</span></label>
      {reference ? (
        <div className="reference-preview">
          <img src={reference.preview} alt="Visual reference" />
          <div className="reference-meta"><strong>{reference.name}</strong><span>Sent with this request</span></div>
          <button className="icon-button" aria-label="Remove image" onClick={() => setReference(null)}><X size={16} /></button>
        </div>
      ) : (
        <div
          className={`drop-zone ${dragActive ? 'is-dragging' : ''}`}
          onDragOver={(event) => { event.preventDefault(); setDragActive(true); }}
          onDragLeave={() => setDragActive(false)}
          onDrop={(event) => { event.preventDefault(); setDragActive(false); const file = event.dataTransfer.files[0]; if (file) readReference(file); }}
          onClick={() => fileInput.current?.click()}
        >
          <ImagePlus size={20} />
          <strong>Drop an image or choose a file</strong>
          <span>PNG · JPG · WEBP</span>
          <input ref={fileInput} type="file" accept="image/png,image/jpeg,image/webp" onChange={(event) => event.target.files?.[0] && readReference(event.target.files[0])} hidden />
        </div>
      )}

      <div className="builder-tip"><Wand2 size={16} /><span>Your brief and visual reference are sent to the selected provider as entered. Incomplete output and common placeholder text are rejected; specify the required pages, content, palette, and excluded elements.</span></div>
      <div className="builder-actions">
        {status === 'generating' ? (
          <button className="btn btn-danger btn-wide" onClick={onCancel}><Square size={16} fill="currentColor" /> Cancel generation</button>
        ) : (
          <button className="btn btn-primary btn-wide" onClick={generate}><Sparkles size={17} /> Generate website</button>
        )}
      </div>
    </aside>
  );
}
