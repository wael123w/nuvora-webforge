import { useState } from 'react';
import { Eye, EyeOff, KeyRound, Server, X } from 'lucide-react';
import type { ProviderSettings } from '../types/electron';
import { toast } from '../lib/toast';

type Props = { initial: ProviderSettings; onSave(settings: ProviderSettings): Promise<void>; onClose(): void };

export function SettingsModal({ initial, onSave, onClose }: Props) {
  const [settings, setSettings] = useState<ProviderSettings>({ ...initial, apiKey: '' });
  const [showKey, setShowKey] = useState(false);
  const [testing, setTesting] = useState(false);
  const [saving, setSaving] = useState(false);
  const [testMessage, setTestMessage] = useState<string | null>(null);

  const update = (patch: Partial<ProviderSettings>) => setSettings((value) => ({ ...value, ...patch }));
  const test = async () => {
    setTesting(true); setTestMessage(null);
    try {
      const result = await window.desktopApi.testConnection(settings);
      setTestMessage(result.message);
      if (result.success) toast.success(result.message);
      else toast.error(result.message);
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unable to test the connection.';
      setTestMessage(message); toast.error(message);
    } finally { setTesting(false); }
  };
  const save = async () => {
    setSaving(true);
    try { await onSave(settings); onClose(); }
    catch (error) { toast.error(error instanceof Error ? error.message : 'Unable to save settings.'); }
    finally { setSaving(false); }
  };

  const gemini = settings.provider === 'gemini';
  return (
    <div className="modal-backdrop" role="presentation" onMouseDown={onClose}>
      <section className="settings-modal" role="dialog" aria-modal="true" aria-label="AI settings" onMouseDown={(event) => event.stopPropagation()}>
        <header className="modal-header">
          <div><div className="eyebrow"><KeyRound size={15} /> Privacy & settings</div><h2>AI provider</h2></div>
          <button className="icon-button" onClick={onClose} aria-label="Close"><X size={18} /></button>
        </header>

        <div className="settings-content">
          <label className="field-label">Active provider</label>
          <div className="provider-picker">
            <button className={gemini ? 'active' : ''} onClick={() => update({ provider: 'gemini' })}>Google Gemini</button>
            <button className={!gemini ? 'active' : ''} onClick={() => update({ provider: 'local' })}><Server size={15} /> Local LLM</button>
          </div>

          {gemini ? (
            <div className="settings-section">
              <div className="section-title">Gemini settings</div>
              <label className="field-label">Gemini API Key</label>
              <div className="secret-input"><input type={showKey ? 'text' : 'password'} value={settings.apiKey ?? ''} onChange={(event) => update({ apiKey: event.target.value })} placeholder={initial.apiKeyConfigured ? 'A key is saved — leave blank to keep it' : 'Paste your API key here'} /><button onClick={() => setShowKey(!showKey)}>{showKey ? <EyeOff size={16} /> : <Eye size={16} />}</button></div>
              <div className="settings-grid">
                <label><span>Model</span><select value={settings.gemini.model} onChange={(event) => update({ gemini: { ...settings.gemini, model: event.target.value } })}><option>gemini-2.5-flash</option><option>gemini-2.5-pro</option><option>gemini-2.0-flash</option></select></label>
                <label><span>Temperature</span><input type="number" min="0" max="2" step="0.1" value={settings.gemini.temperature} onChange={(event) => update({ gemini: { ...settings.gemini, temperature: Number(event.target.value) } })} /></label>
              </div>
              <label><span>Maximum Output Tokens</span><input type="number" min="512" max="65536" step="512" value={settings.gemini.maxTokens} onChange={(event) => update({ gemini: { ...settings.gemini, maxTokens: Number(event.target.value) } })} /></label>
            </div>
          ) : (
            <div className="settings-section">
              <div className="section-title">Local model settings</div>
              <label><span>Server URL</span><input value={settings.local.url} onChange={(event) => update({ local: { ...settings.local, url: event.target.value } })} placeholder="http://localhost:11434" /></label>
              <label><span>Model name</span><input value={settings.local.model} onChange={(event) => update({ local: { ...settings.local, model: event.target.value } })} placeholder="Example: llama3.2-vision" /></label>
              <label><span>Optional API key</span><div className="secret-input"><input type={showKey ? 'text' : 'password'} value={settings.apiKey ?? ''} onChange={(event) => update({ apiKey: event.target.value })} placeholder="Leave blank for local Ollama" /><button onClick={() => setShowKey(!showKey)}>{showKey ? <EyeOff size={16} /> : <Eye size={16} />}</button></div></label>
            </div>
          )}
          <p className="privacy-note">Keys are stored in Electron’s encrypted local system storage when available. They are never exposed to the React interface or sent to any service other than the provider you choose.</p>
          {testMessage && <p className="test-message">{testMessage}</p>}
        </div>

        <footer className="modal-footer"><button className="btn btn-ghost" onClick={onClose}>Cancel</button><button className="btn btn-ghost" onClick={test} disabled={testing}>{testing ? 'Testing…' : 'Test connection'}</button><button className="btn btn-primary" onClick={save} disabled={saving}>{saving ? 'Saving…' : 'Save settings'}</button></footer>
      </section>
    </div>
  );
}
