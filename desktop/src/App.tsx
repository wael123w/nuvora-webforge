import { useCallback, useEffect, useState } from 'react';
import type { GeneratedProject, ProviderSettings } from './types/electron';
import { BuilderPanel } from './components/BuilderPanel';
import { WorkspacePanel } from './components/WorkspacePanel';
import { SettingsModal } from './components/SettingsModal';
import { StatusBar } from './components/StatusBar';
import { Toaster } from './components/Toast';
import { toast } from './lib/toast';

export type AppStatus = 'idle' | 'generating' | 'error';

export default function App() {
  const [settings, setSettings] = useState<ProviderSettings | null>(null);
  const [project, setProject] = useState<GeneratedProject | null>(null);
  const [status, setStatus] = useState<AppStatus>('idle');
  const [statusMessage, setStatusMessage] = useState('Ready. Open Settings to configure an AI provider.');
  const [showSettings, setShowSettings] = useState(false);
  const [serviceOnline, setServiceOnline] = useState<boolean | null>(null);

  useEffect(() => {
    window.desktopApi.loadSettings().then(setSettings).catch(() => undefined);
    window.desktopApi.systemStatus().then(() => setServiceOnline(true)).catch(() => setServiceOnline(false));
  }, []);

  const handleGenerate = useCallback(async (input: { prompt: string; framework: 'html' | 'react'; image?: { base64: string; mime: string } }) => {
    if (status === 'generating') return;
    setStatus('generating');
    setStatusMessage('Sending your request to the AI provider…');
    try {
      const result = await window.desktopApi.generate(input);
      setProject(result);
      setStatus('idle');
      setStatusMessage(`Generation complete: ${result.project_name} — ${result.files.length} files.`);
      toast.success(`${result.project_name} was generated successfully.`);
    } catch (error) {
      const message = error instanceof Error ? error.message : 'An unknown error occurred.';
      if (message.startsWith('Generation was cancelled')) {
        setStatus('idle');
        setStatusMessage(message);
        return;
      }
      setStatus('error');
      setStatusMessage(`Generation failed: ${message}`);
      toast.error(message);
    }
  }, [status]);

  const handleModify = useCallback(async (input: { projectId: string; instruction: string }) => {
    if (status === 'generating') return;
    setStatus('generating');
    setStatusMessage('Applying your AI change to the project…');
    try {
      const result = await window.desktopApi.modifyProject(input);
      setProject(result);
      setStatus('idle');
      setStatusMessage(`AI change applied: ${result.project_name} — ${result.files.length} files updated.`);
      toast.success('The AI change was applied and the preview was refreshed.');
    } catch (error) {
      const message = error instanceof Error ? error.message : 'An unknown error occurred.';
      if (message.startsWith('Generation was cancelled')) {
        setStatus('idle');
        setStatusMessage(message);
        return;
      }
      setStatus('error');
      setStatusMessage(`AI change failed: ${message}`);
      toast.error(message);
    }
  }, [status]);

  const handleCancel = useCallback(async () => {
    await window.desktopApi.cancelGeneration();
    setStatus('idle');
    setStatusMessage('Request cancelled. You can refine the brief and start a new generation.');
  }, []);

  const handleSaveSettings = useCallback(async (next: ProviderSettings) => {
    const saved = await window.desktopApi.saveSettings(next);
    setSettings(saved);
    toast.success('Settings were saved securely on this device.');
  }, []);

  return (
    <div className="app-root">
      <Toaster />
      <header className="app-header" onDoubleClick={() => void window.desktopApi.windowControl('maximize')}>
        <div className="app-brand">
          <span className="app-logo">⚡</span>
          <span className="app-title">Nuvora WebForge</span>
        </div>
        <div className="app-header-actions">
          {serviceOnline === null && <span className="badge badge-muted">Checking…</span>}
          {serviceOnline === true && <span className="badge badge-success">Engine ready</span>}
          {serviceOnline === false && <span className="badge badge-danger">Engine unavailable</span>}
          <button className="btn btn-ghost" onClick={() => setShowSettings(true)}>⚙ Settings</button>
          <div className="window-controls" onDoubleClick={(event) => event.stopPropagation()}>
            <button className="window-control" aria-label="Minimize window" title="Minimize" onClick={() => void window.desktopApi.windowControl('minimize')}>−</button>
            <button className="window-control" aria-label="Maximize or restore window" title="Maximize or restore" onClick={() => void window.desktopApi.windowControl('maximize')}>□</button>
            <button className="window-control window-control-close" aria-label="Close window" title="Close" onClick={() => void window.desktopApi.windowControl('close')}>×</button>
          </div>
        </div>
      </header>

      <main className="app-main">
        <BuilderPanel
          status={status}
          onGenerate={handleGenerate}
          onCancel={handleCancel}
          providerConfigured={Boolean(settings && (settings.provider === 'gemini' ? settings.apiKeyConfigured : settings.local.url.trim() && settings.local.model.trim()))}
        />
        <WorkspacePanel key={project?.project_id ?? 'empty'} project={project} onModify={handleModify} isModifying={status === 'generating'} onCancel={handleCancel} />
      </main>

      <StatusBar message={statusMessage} status={status} />
      {showSettings && settings && <SettingsModal initial={settings} onSave={handleSaveSettings} onClose={() => setShowSettings(false)} />}
    </div>
  );
}
