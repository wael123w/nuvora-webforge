import { useCallback, useState } from 'react';
import Editor from '@monaco-editor/react';
import { Code2, Eye, Files, FolderOpen, Monitor, Save, Smartphone, Sparkles, Square, Tablet, Wand2, ZoomIn, ZoomOut } from 'lucide-react';
import type { GeneratedProject } from '../types/electron';
import { toast } from '../lib/toast';

type Tab = 'preview' | 'code' | 'files';
type PreviewMode = 'desktop' | 'tablet' | 'mobile';

const PREVIEW_WIDTHS: Record<PreviewMode, string> = { desktop: '100%', tablet: '820px', mobile: '390px' };

type Props = {
  project: GeneratedProject | null;
  isModifying: boolean;
  onCancel(): void;
  onModify(input: { projectId: string; instruction: string }): void;
};

export function WorkspacePanel({ project, isModifying, onCancel, onModify }: Props) {
  const [tab, setTab] = useState<Tab>('preview');
  const [previewMode, setPreviewMode] = useState<PreviewMode>('desktop');
  const [previewScale, setPreviewScale] = useState(1);
  const [selectedFile, setSelectedFile] = useState<string | null>(null);
  const [fileContent, setFileContent] = useState('');
  const [dirty, setDirty] = useState(false);
  const [saving, setSaving] = useState(false);
  const [changeRequest, setChangeRequest] = useState('');

  const openFile = useCallback(async (path: string) => {
    if (!project) return;
    try {
      const result = await window.desktopApi.readFile(project.project_id, path);
      setSelectedFile(path);
      setFileContent(result.content);
      setDirty(false);
      setTab('code');
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Unable to read the file.');
    }
  }, [project]);

  const saveFile = useCallback(async () => {
    if (!project || !selectedFile) return;
    setSaving(true);
    try {
      await window.desktopApi.saveFile(project.project_id, selectedFile, fileContent);
      setDirty(false);
      toast.success(`${selectedFile} was saved.`);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Unable to save the file.');
    } finally { setSaving(false); }
  }, [project, selectedFile, fileContent]);

  const copyProject = useCallback(async () => {
    if (!project) return;
    const result = await window.desktopApi.copyProject(project.directory);
    if (!result.cancelled) toast.success(`Project copied to: ${result.target}`);
  }, [project]);

  const openFolder = useCallback(() => {
    if (project) window.desktopApi.openFolder(project.directory);
  }, [project]);

  const requestAiChange = useCallback(() => {
    if (!project) return;
    const instruction = changeRequest.trim();
    if (instruction.length < 12) {
      toast.error('Describe the requested change in at least 12 characters.');
      return;
    }
    onModify({ projectId: project.project_id, instruction });
    setChangeRequest('');
  }, [changeRequest, onModify, project]);

  const editorLanguage = (path: string) => {
    if (path.endsWith('.ts') || path.endsWith('.tsx')) return 'typescript';
    if (path.endsWith('.js') || path.endsWith('.jsx')) return 'javascript';
    if (path.endsWith('.css') || path.endsWith('.scss')) return 'css';
    if (path.endsWith('.json')) return 'json';
    if (path.endsWith('.md')) return 'markdown';
    return 'html';
  };

  if (!project) {
    return (
      <section className="workspace-panel workspace-empty">
        <div className="empty-state">
          <div className="empty-icon">🌐</div>
          <h2>Your website will appear here</h2>
          <p>Write a project brief in the left panel, then select “Generate website” to see the result here.</p>
        </div>
      </section>
    );
  }

  return (
    <section className="workspace-panel">
      <div className="workspace-tabs">
        <button className={tab === 'preview' ? 'tab active' : 'tab'} onClick={() => setTab('preview')}><Eye size={15} /> Preview</button>
        <button className={tab === 'code' ? 'tab active' : 'tab'} onClick={() => setTab('code')}><Code2 size={15} /> Code</button>
        <button className={tab === 'files' ? 'tab active' : 'tab'} onClick={() => setTab('files')}><Files size={15} /> Files</button>
        <div className="tab-spacer" />
        <button className="btn btn-ghost btn-sm" onClick={copyProject}><Save size={14} /> Copy project</button>
        <button className="btn btn-ghost btn-sm" onClick={openFolder}><FolderOpen size={14} /> Open folder</button>
      </div>

      <section className="ai-edit-panel" aria-labelledby="ai-edit-title">
        <div className="ai-edit-intro"><div className="eyebrow"><Wand2 size={14} /> Refine with AI</div><p id="ai-edit-title">Describe one specific change. The AI receives the current project files, returns a validated replacement structure, and refreshes the preview.</p></div>
        <textarea value={changeRequest} onChange={(event) => setChangeRequest(event.target.value)} disabled={isModifying} placeholder="Example: Make the accent colour cooler, add an accessible mobile menu, and keep all existing sections." aria-label="AI change request" />
        {isModifying ? (
          <button className="btn btn-danger ai-edit-action" onClick={onCancel}><Square size={15} fill="currentColor" /> Cancel AI change</button>
        ) : (
          <button className="btn btn-primary ai-edit-action" onClick={requestAiChange}><Sparkles size={16} /> Apply AI change</button>
        )}
      </section>

      {tab === 'preview' && (
        <div className="preview-area">
          <div className="preview-toolbar">
            <button className={previewMode === 'desktop' ? 'active' : ''} onClick={() => setPreviewMode('desktop')} title="Desktop"><Monitor size={16} /></button>
            <button className={previewMode === 'tablet' ? 'active' : ''} onClick={() => setPreviewMode('tablet')} title="Tablet"><Tablet size={16} /></button>
            <button className={previewMode === 'mobile' ? 'active' : ''} onClick={() => setPreviewMode('mobile')} title="Mobile"><Smartphone size={16} /></button>
            <div className="preview-divider" />
            <button onClick={() => setPreviewScale((s) => Math.min(2, s + 0.1))} title="Zoom in"><ZoomIn size={16} /></button>
            <button onClick={() => setPreviewScale((s) => Math.max(0.3, s - 0.1))} title="Zoom out"><ZoomOut size={16} /></button>
            <span className="preview-scale-label">{Math.round(previewScale * 100)}%</span>
          </div>
          <div className="preview-canvas">
            <div className="preview-frame-wrapper" style={{ width: PREVIEW_WIDTHS[previewMode], transform: `scale(${previewScale})`, transformOrigin: 'top center' }}>
              {project.framework === 'html' && project.entry_point ? (
                <iframe src={`nuvora-preview://${project.project_id}/index.html?revision=${project.files.map((file) => `${file.path}:${file.bytes}`).join('|')}`} className="preview-iframe" title="Website preview" sandbox="allow-scripts allow-same-origin" />
              ) : (
                <div className="preview-no-html"><p>{project.framework === 'react' ? 'This React + Vite project is ready to run. Open Files to review the project, then run the generated pnpm install and pnpm dev commands in the project folder.' : 'No standalone HTML file is available for preview. Open the Files tab or run the project manually.'}</p></div>
              )}
            </div>
          </div>
        </div>
      )}

      {tab === 'code' && (
        <div className="code-area">
          <div className="file-tree">
            <div className="file-tree-header">Project files</div>
            {project.files.map((file) => (
              <button key={file.path} className={`file-item ${selectedFile === file.path ? 'selected' : ''}`} onClick={() => openFile(file.path)}>
                <span className="file-name">{file.path.split('/').pop()}</span>
                <span className="file-path">{file.path}</span>
              </button>
            ))}
          </div>
          <div className="editor-area">
            {selectedFile ? (
              <>
                <div className="editor-toolbar">
                  <span className="editor-file-path">{selectedFile}</span>
                  {dirty && <span className="dirty-badge">Unsaved</span>}
                  <button className="btn btn-primary btn-sm" onClick={saveFile} disabled={!dirty || saving}>{saving ? 'Saving…' : 'Save'}</button>
                </div>
                <Editor height="calc(100% - 42px)" theme="vs-dark" language={editorLanguage(selectedFile)} value={fileContent} onChange={(value) => { setFileContent(value ?? ''); setDirty(true); }} options={{ fontSize: 14, minimap: { enabled: false }, wordWrap: 'on', scrollBeyondLastLine: false, renderWhitespace: 'none' }} />
              </>
            ) : (
              <div className="editor-placeholder"><p>Select a file from the list to edit it.</p></div>
            )}
          </div>
        </div>
      )}

      {tab === 'files' && (
        <div className="files-area">
          <div className="files-header"><div><strong>{project.project_name}</strong> — {project.framework.toUpperCase()}</div><div className="files-count">{project.files.length} files</div></div>
          {project.instructions && <div className="project-instructions"><strong>Run instructions:</strong><pre>{project.instructions}</pre></div>}
          {project.dependencies.length > 0 && <div className="project-deps"><strong>Dependencies:</strong> {project.dependencies.join(', ')}</div>}
          <table className="files-table"><thead><tr><th>Path</th><th>Size</th><th></th></tr></thead><tbody>{project.files.map((file) => (
            <tr key={file.path} onClick={() => openFile(file.path)} className="file-row"><td className="file-path-cell">{file.path}</td><td className="file-size-cell">{(file.bytes / 1024).toFixed(1)} KB</td><td><button className="btn btn-ghost btn-xs" onClick={(event) => { event.stopPropagation(); openFile(file.path); }}>Edit</button></td></tr>
          ))}</tbody></table>
        </div>
      )}
    </section>
  );
}
