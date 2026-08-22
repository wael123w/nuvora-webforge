import { app, BrowserWindow, dialog, ipcMain, Menu, protocol, safeStorage, shell } from 'electron';
import { randomUUID } from 'node:crypto';
import { fileURLToPath } from 'node:url';
import { dirname, join, relative, sep } from 'node:path';
import { mkdir, readFile, writeFile, readdir, stat, cp, rm, rename } from 'node:fs/promises';

const currentDirectory = dirname(fileURLToPath(import.meta.url));
protocol.registerSchemesAsPrivileged([{ scheme: 'nuvora-preview', privileges: { standard: true, secure: true, supportFetchAPI: true } }]);
const MAX_FILES = 250;
const MAX_FILE_BYTES = 3_000_000;
const MAX_EDIT_SNAPSHOT_BYTES = 1_500_000;
let activeGenerationAbort: AbortController | undefined;

export type ProviderSettings = {
  provider: 'gemini' | 'local';
  gemini: { model: string; temperature: number; maxTokens: number };
  local: { url: string; model: string };
  apiKey?: string;
};

type ProjectFile = { path: string; content: string };
type GeneratedProject = {
  project_name: string;
  framework: 'html' | 'react';
  files: ProjectFile[];
  dependencies: string[];
  instructions: string;
};

const defaultSettings: ProviderSettings = {
  provider: 'gemini',
  gemini: { model: 'gemini-2.5-flash', temperature: 0.7, maxTokens: 16384 },
  local: { url: 'http://localhost:11434', model: '' },
};

function projectsDirectory(): string {
  return join(app.getPath('documents'), 'Nuvora WebForge', 'projects');
}

function encryptedSettingsPath(): string {
  return join(app.getPath('userData'), 'provider-settings.bin');
}

async function loadPrivateSettings(): Promise<ProviderSettings> {
  try {
    const encrypted = await readFile(encryptedSettingsPath());
    const value = safeStorage.isEncryptionAvailable() ? safeStorage.decryptString(encrypted) : encrypted.toString('utf8');
    const parsed = JSON.parse(value) as Partial<ProviderSettings>;
    return { ...defaultSettings, ...parsed, gemini: { ...defaultSettings.gemini, ...parsed.gemini }, local: { ...defaultSettings.local, ...parsed.local } };
  } catch { return structuredClone(defaultSettings); }
}

async function savePrivateSettings(next: ProviderSettings): Promise<void> {
  await mkdir(app.getPath('userData'), { recursive: true });
  const serialized = JSON.stringify(next);
  const encrypted = safeStorage.isEncryptionAvailable() ? safeStorage.encryptString(serialized) : Buffer.from(serialized, 'utf8');
  await writeFile(encryptedSettingsPath(), encrypted);
}

function sanitizeSettings(settings: ProviderSettings) {
  const { apiKey: _ignored, ...publicSettings } = settings;
  return { ...publicSettings, apiKeyConfigured: Boolean(settings.apiKey) };
}

function effectiveSettings(previous: ProviderSettings, incoming: ProviderSettings): ProviderSettings {
  return {
    ...previous,
    ...incoming,
    gemini: { ...previous.gemini, ...incoming.gemini },
    local: { ...previous.local, ...incoming.local },
    apiKey: incoming.apiKey?.trim() || previous.apiKey || '',
  };
}

function providerSystemPrompt(framework: 'html' | 'react', hasImage: boolean) {
  const target = framework === 'react' ? 'React + Vite' : 'HTML + CSS + JavaScript';
  const structure = framework === 'html'
    ? 'For HTML, return at least five files: root index.html, root README.md, and a folder such as assets/ containing a separate CSS file, a separate JavaScript file, and at least one additional local asset or data file. Link every referenced local file correctly from index.html.'
    : 'For React, return a complete Vite project with root package.json containing "type": "module", root vite.config.ts, root README.md, and a src/ folder containing main.tsx, App.tsx, at least one component file, and a separate CSS file.';
  return `You are a senior web product designer and frontend engineer. Create a complete, polished, responsive website project using ${target}. Build exactly the requested website, scope, language, pages, sections, interactions, and style from the user's brief. ${hasImage ? 'A visual reference is attached. Treat it as a required design constraint: inspect its palette, spacing, hierarchy, component style, and visual mood; apply those cues without copying unreadable text or inventing assets.' : 'Use only the visual direction explicitly given in the user brief.'}

Return ONLY valid JSON, without markdown fences or explanations. Use exactly this shape:
{"project_name":"kebab-case-name","framework":"${framework}","files":[{"path":"index.html","content":"full file content"}],"dependencies":["package-name"],"instructions":"clear run instructions"}

Project structure is mandatory: ${structure}
Hard rules: include every file needed to run the project; use semantic accessible HTML; provide responsive desktop, tablet, and mobile layouts; never include API keys; keep every path relative; do not write TODOs, ellipses, partial code, or incomplete files. Do not invent business facts, people, testimonials, prices, contact details, legal claims, statistics, logos, or stock-image URLs. Never use lorem ipsum, dummy text, or generic placeholder copy. When the brief omits factual copy, use concise neutral UI labels rather than fabricated claims. Do not add pages or features outside the requested scope. Return a complete runnable project only.`;
}

async function postJson(url: string, body: unknown, headers: Record<string, string> = {}, signal?: AbortSignal) {
  const response = await fetch(url, { method: 'POST', headers: { 'Content-Type': 'application/json', Accept: 'application/json', ...headers }, body: JSON.stringify(body), signal });
  const text = await response.text();
  if (!response.ok) throw new Error(`${response.status}: ${extractProviderError(text)}`);
  return text;
}

function extractProviderError(raw: string) {
  try {
    const parsed = JSON.parse(raw) as { error?: { message?: string } | string; message?: string };
    return typeof parsed.error === 'object' ? parsed.error?.message ?? raw : parsed.error ?? parsed.message ?? raw;
  } catch { return raw.slice(0, 500); }
}

function parseProject(raw: string, framework: 'html' | 'react'): GeneratedProject {
  const cleaned = raw.trim().replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/, '');
  let parsed: Partial<GeneratedProject>;
  try { parsed = JSON.parse(cleaned) as Partial<GeneratedProject>; }
  catch { throw new Error('The provider returned invalid content. Try again or choose a model that supports JSON.'); }
  if (!Array.isArray(parsed.files) || parsed.files.length === 0 || parsed.files.length > MAX_FILES) throw new Error('The response does not include a valid file list.');
  const paths = new Set<string>();
  const files = parsed.files.map((file) => {
    if (!file?.path || typeof file.content !== 'string') throw new Error('One of the generated files is invalid.');
    const path = normalizeRelativePath(file.path);
    if (paths.has(path)) throw new Error(`Duplicate file path: ${path}`);
    if (Buffer.byteLength(file.content, 'utf8') > MAX_FILE_BYTES) throw new Error(`File is too large: ${path}`);
    paths.add(path);
    return { path, content: file.content };
  });
  const project: GeneratedProject = {
    project_name: safeProjectName(parsed.project_name ?? 'generated-website'),
    framework: parsed.framework === 'react' ? 'react' : framework,
    files,
    dependencies: Array.isArray(parsed.dependencies) ? parsed.dependencies.filter((item): item is string => typeof item === 'string').slice(0, 80) : [],
    instructions: typeof parsed.instructions === 'string' ? parsed.instructions : 'Review the project files, then run the project in an appropriate development environment.',
  };
  validateProjectCompleteness(project, framework);
  return project;
}

function validateProjectCompleteness(project: GeneratedProject, requestedFramework: 'html' | 'react') {
  if (project.framework !== requestedFramework) throw new Error('The provider returned a different project type than the one you selected. No files were saved.');
  const contents = project.files.map((file) => file.content).join('\n');
  if (/lorem ipsum|\btodo\b|dummy text|sample testimonial/i.test(contents)) throw new Error('The output contains placeholder or incomplete content. No project was saved. Refine the brief or try again.');
  const paths = project.files.map((file) => file.path);
  const hasFolder = paths.some((path) => path.includes('/'));
  const hasRootReadme = paths.includes('README.md');
  if (requestedFramework === 'html') {
    const index = project.files.find((file) => file.path === 'index.html');
    const hasCss = paths.some((path) => /\.(?:css|scss)$/i.test(path) && path.includes('/'));
    const hasJavaScript = paths.some((path) => /\.(?:js|mjs)$/i.test(path) && path.includes('/'));
    if (!index || !/<(?:!doctype|html)\b/i.test(index.content) || project.files.length < 5 || !hasFolder || !hasRootReadme || !hasCss || !hasJavaScript) throw new Error('The provider did not return the required multi-file HTML project structure. Include root files plus a folder with separate CSS, JavaScript, and supporting files. No project was saved.');
    return;
  }
  const packageFile = project.files.find((file) => file.path === 'package.json');
  const viteConfig = project.files.some((file) => /^vite\.config\.(?:ts|js)$/.test(file.path));
  const sourceEntry = project.files.some((file) => /^src\/(?:main|index)\.(?:tsx|jsx|ts|js)$/.test(file.path));
  const appComponent = project.files.some((file) => /^src\/App\.(?:tsx|jsx|ts|js)$/.test(file.path));
  const component = project.files.some((file) => /^src\/components\/.+\.(?:tsx|jsx|ts|js)$/.test(file.path));
  const styles = project.files.some((file) => /^src\/.+\.(?:css|scss)$/.test(file.path));
  if (!packageFile || !viteConfig || !sourceEntry || !appComponent || !component || !styles || !hasRootReadme || project.files.length < 7) throw new Error('The provider did not return the required multi-file React + Vite project structure. Include root configuration files and organised source folders. No project was saved.');
}

async function generateWithGemini(settings: ProviderSettings, input: GenerationInput, signal: AbortSignal) {
  if (!settings.apiKey) throw new Error('Enter a Gemini API key in Settings first.');
  const model = encodeURIComponent(settings.gemini.model || 'gemini-2.5-flash');
  const parts: Array<Record<string, unknown>> = [{ text: input.prompt }];
  if (input.image) parts.push({ inlineData: { mimeType: input.image.mime, data: input.image.base64 } });
  const raw = await postJson(
    `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent`,
    {
      systemInstruction: { parts: [{ text: providerSystemPrompt(input.framework, Boolean(input.image)) }] },
      contents: [{ role: 'user', parts }],
      generationConfig: { temperature: settings.gemini.temperature, maxOutputTokens: settings.gemini.maxTokens, responseMimeType: 'application/json' },
    },
    { 'x-goog-api-key': settings.apiKey },
    signal,
  );
  const parsed = JSON.parse(raw) as { candidates?: Array<{ content?: { parts?: Array<{ text?: string }> } }> };
  const text = parsed.candidates?.[0]?.content?.parts?.map((part) => part.text ?? '').join('').trim();
  if (!text) throw new Error('Gemini did not return readable content.');
  return parseProject(text, input.framework);
}

function localEndpoint(base: string, path: string) { return `${base.replace(/\/$/, '')}${path}`; }
function isOllama(base: string) { return base.includes('11434') || base.includes('ollama') || base.endsWith('/api'); }

async function generateWithLocalModel(settings: ProviderSettings, input: GenerationInput, signal: AbortSignal) {
  const base = settings.local.url.trim().replace(/\/$/, '');
  const model = settings.local.model.trim();
  if (!base || !model) throw new Error('Enter the local server URL and model name in Settings.');
  const system = providerSystemPrompt(input.framework, Boolean(input.image));
  if (isOllama(base)) {
    const message: Record<string, unknown> = { role: 'user', content: input.prompt };
    if (input.image) message.images = [input.image.base64];
    const raw = await postJson(localEndpoint(base, '/api/chat'), { model, stream: false, format: 'json', messages: [{ role: 'system', content: system }, message], options: { temperature: settings.gemini.temperature, num_predict: settings.gemini.maxTokens } }, settings.apiKey ? { Authorization: `Bearer ${settings.apiKey}` } : {}, signal);
    const parsed = JSON.parse(raw) as { message?: { content?: string } };
    return parseProject(parsed.message?.content ?? '', input.framework);
  }
  const apiRoot = base.endsWith('/v1') ? base : `${base}/v1`;
  const userContent: unknown = input.image
    ? [{ type: 'text', text: input.prompt }, { type: 'image_url', image_url: { url: `data:${input.image.mime};base64,${input.image.base64}` } }]
    : input.prompt;
  const raw = await postJson(`${apiRoot}/chat/completions`, { model, messages: [{ role: 'system', content: system }, { role: 'user', content: userContent }], temperature: settings.gemini.temperature, max_tokens: settings.gemini.maxTokens, response_format: { type: 'json_object' } }, settings.apiKey ? { Authorization: `Bearer ${settings.apiKey}` } : {}, signal);
  const parsed = JSON.parse(raw) as { choices?: Array<{ message?: { content?: string } }> };
  return parseProject(parsed.choices?.[0]?.message?.content ?? '', input.framework);
}

type GenerationInput = { prompt: string; framework: 'html' | 'react'; image?: { base64: string; mime: string } };

async function generateProject(settings: ProviderSettings, input: GenerationInput, signal: AbortSignal) {
  if (input.prompt.trim().length < 24) throw new Error('Write a detailed brief of at least 24 characters so the application can build the website you requested.');
  if (input.image && !['image/png', 'image/jpeg', 'image/webp'].includes(input.image.mime)) throw new Error('The visual reference format is not supported.');
  const project = settings.provider === 'gemini' ? await generateWithGemini(settings, input, signal) : await generateWithLocalModel(settings, input, signal);
  return materializeProject(project);
}

type ProjectModificationInput = { projectId: string; instruction: string };
type ProjectManifest = { project_name: string; framework: 'html' | 'react'; dependencies: string[]; instructions: string };

function revisionSystemPrompt(framework: 'html' | 'react') {
  return `${providerSystemPrompt(framework, false)}

You are revising an existing project. The user will provide a change request and a complete snapshot of the current project. Preserve all working behaviour and all content not affected by the request. Return the complete replacement project as valid JSON using the required structure, including every existing or newly required file. Do not return a patch, diff, explanation, partial snippet, or markdown fence. Only make changes that are necessary to fulfil the request.`;
}

async function readProjectSnapshot(projectId: string) {
  const root = projectPath(projectId);
  const files = await collectProjectFiles(root);
  let totalBytes = 0;
  const snapshot: ProjectFile[] = [];
  for (const file of files) {
    totalBytes += file.bytes;
    if (totalBytes > MAX_EDIT_SNAPSHOT_BYTES) throw new Error('This project is too large for an AI edit in one request. Edit individual files in Code instead.');
    snapshot.push({ path: file.path, content: await readFile(safeTarget(root, file.path), 'utf8') });
  }
  return snapshot;
}

async function readProjectManifest(projectId: string): Promise<ProjectManifest> {
  try {
    const raw = await readFile(join(projectPath(projectId), '.aiwb-manifest.json'), 'utf8');
    const manifest = JSON.parse(raw) as Partial<ProjectManifest>;
    if (manifest.framework !== 'html' && manifest.framework !== 'react') throw new Error('invalid framework');
    return {
      project_name: safeProjectName(manifest.project_name ?? projectId),
      framework: manifest.framework,
      dependencies: Array.isArray(manifest.dependencies) ? manifest.dependencies.filter((item): item is string => typeof item === 'string') : [],
      instructions: typeof manifest.instructions === 'string' ? manifest.instructions : '',
    };
  } catch {
    throw new Error('The project metadata could not be read. Generate a new project before requesting an AI edit.');
  }
}

async function reviseWithGemini(settings: ProviderSettings, framework: 'html' | 'react', instruction: string, manifest: ProjectManifest, snapshot: ProjectFile[], signal: AbortSignal) {
  if (!settings.apiKey) throw new Error('Enter a Gemini API key in Settings first.');
  const model = encodeURIComponent(settings.gemini.model || 'gemini-2.5-flash');
  const requestText = `PROJECT CHANGE REQUEST:\n${instruction}\n\nCURRENT PROJECT METADATA:\n${JSON.stringify(manifest)}\n\nCURRENT PROJECT FILES:\n${JSON.stringify(snapshot)}`;
  const raw = await postJson(
    `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent`,
    { systemInstruction: { parts: [{ text: revisionSystemPrompt(framework) }] }, contents: [{ role: 'user', parts: [{ text: requestText }] }], generationConfig: { temperature: settings.gemini.temperature, maxOutputTokens: settings.gemini.maxTokens, responseMimeType: 'application/json' } },
    { 'x-goog-api-key': settings.apiKey },
    signal,
  );
  const parsed = JSON.parse(raw) as { candidates?: Array<{ content?: { parts?: Array<{ text?: string }> } }> };
  const text = parsed.candidates?.[0]?.content?.parts?.map((part) => part.text ?? '').join('').trim();
  if (!text) throw new Error('Gemini did not return readable edited files.');
  return parseProject(text, framework);
}

async function reviseWithLocalModel(settings: ProviderSettings, framework: 'html' | 'react', instruction: string, manifest: ProjectManifest, snapshot: ProjectFile[], signal: AbortSignal) {
  const base = settings.local.url.trim().replace(/\/$/, '');
  const model = settings.local.model.trim();
  if (!base || !model) throw new Error('Enter the local server URL and model name in Settings.');
  const requestText = `PROJECT CHANGE REQUEST:\n${instruction}\n\nCURRENT PROJECT METADATA:\n${JSON.stringify(manifest)}\n\nCURRENT PROJECT FILES:\n${JSON.stringify(snapshot)}`;
  const system = revisionSystemPrompt(framework);
  if (isOllama(base)) {
    const raw = await postJson(localEndpoint(base, '/api/chat'), { model, stream: false, format: 'json', messages: [{ role: 'system', content: system }, { role: 'user', content: requestText }], options: { temperature: settings.gemini.temperature, num_predict: settings.gemini.maxTokens } }, settings.apiKey ? { Authorization: `Bearer ${settings.apiKey}` } : {}, signal);
    const parsed = JSON.parse(raw) as { message?: { content?: string } };
    return parseProject(parsed.message?.content ?? '', framework);
  }
  const apiRoot = base.endsWith('/v1') ? base : `${base}/v1`;
  const raw = await postJson(`${apiRoot}/chat/completions`, { model, messages: [{ role: 'system', content: system }, { role: 'user', content: requestText }], temperature: settings.gemini.temperature, max_tokens: settings.gemini.maxTokens, response_format: { type: 'json_object' } }, settings.apiKey ? { Authorization: `Bearer ${settings.apiKey}` } : {}, signal);
  const parsed = JSON.parse(raw) as { choices?: Array<{ message?: { content?: string } }> };
  return parseProject(parsed.choices?.[0]?.message?.content ?? '', framework);
}

function projectResponse(projectId: string, directory: string, project: GeneratedProject) {
  const entry = project.files.find((file) => file.path === 'index.html') ?? project.files.find((file) => file.path.endsWith('.html'));
  return { project_id: projectId, project_name: project.project_name, framework: project.framework, files: project.files.map(({ path, content }) => ({ path, bytes: Buffer.byteLength(content, 'utf8') })), dependencies: project.dependencies, instructions: project.instructions, directory, entry_point: entry ? safeTarget(directory, entry.path) : undefined };
}

async function replaceProjectFiles(projectId: string, project: GeneratedProject) {
  const directory = projectPath(projectId);
  const parent = dirname(directory);
  const staging = join(parent, `.${projectId}-next-${randomUUID().slice(0, 8)}`);
  const backup = join(parent, `.${projectId}-backup-${randomUUID().slice(0, 8)}`);
  await mkdir(staging, { recursive: true });
  try {
    for (const file of project.files) {
      const target = safeTarget(staging, file.path);
      await mkdir(dirname(target), { recursive: true });
      await writeFile(target, file.content, 'utf8');
    }
    await writeFile(join(staging, '.aiwb-manifest.json'), JSON.stringify({ project_name: project.project_name, framework: project.framework, dependencies: project.dependencies, instructions: project.instructions }, null, 2), 'utf8');
    await rename(directory, backup);
    try {
      await rename(staging, directory);
    } catch (error) {
      await rename(backup, directory);
      throw error;
    }
    await rm(backup, { recursive: true, force: true });
    return projectResponse(projectId, directory, project);
  } catch (error) {
    await rm(staging, { recursive: true, force: true });
    throw error;
  }
}

async function modifyProject(settings: ProviderSettings, input: ProjectModificationInput, signal: AbortSignal) {
  const instruction = input.instruction.trim();
  if (instruction.length < 12) throw new Error('Describe the requested change in at least 12 characters.');
  const manifest = await readProjectManifest(input.projectId);
  const snapshot = await readProjectSnapshot(input.projectId);
  const revised = settings.provider === 'gemini'
    ? await reviseWithGemini(settings, manifest.framework, instruction, manifest, snapshot, signal)
    : await reviseWithLocalModel(settings, manifest.framework, instruction, manifest, snapshot, signal);
  if (revised.project_name !== manifest.project_name) revised.project_name = manifest.project_name;
  return replaceProjectFiles(input.projectId, revised);
}

async function testProvider(settings: ProviderSettings) {
  try {
    if (settings.provider === 'gemini') {
      if (!settings.apiKey) return { success: false, message: 'Enter a Gemini API key first.' };
      const response = await fetch('https://generativelanguage.googleapis.com/v1beta/models', { headers: { 'x-goog-api-key': settings.apiKey } });
      if (!response.ok) return { success: false, message: `Gemini returned ${response.status}: ${extractProviderError(await response.text())}` };
      const payload = await response.json() as { models?: Array<{ name?: string }> };
      const selected = settings.gemini.model.trim();
      const found = payload.models?.some((model) => model.name === `models/${selected}` || model.name === selected);
      return found ? { success: true, message: `Connected to Gemini with model ${selected}.` } : { success: false, message: `Connected to Gemini, but model ${selected} is not available for this API key.` };
    }
    const base = settings.local.url.trim().replace(/\/$/, '');
    if (!base) return { success: false, message: 'Enter a local server URL.' };
    const endpoint = isOllama(base) ? localEndpoint(base, '/api/tags') : `${base.endsWith('/v1') ? base : `${base}/v1`}/models`;
    const response = await fetch(endpoint, { headers: settings.apiKey ? { Authorization: `Bearer ${settings.apiKey}` } : {} });
    if (!response.ok) return { success: false, message: `The server returned ${response.status}.` };
    const payload = await response.json() as { models?: Array<{ name?: string; id?: string }> };
    const selected = settings.local.model.trim();
    const models = payload.models ?? [];
    const found = !selected || models.some((model) => model.name === selected || model.name === `${selected}:latest` || model.id === selected);
    return found ? { success: true, message: `Connected to the local server with model ${selected || 'selected model'}.` } : { success: false, message: `Connected to the local server, but model ${selected} is not listed.` };
  } catch (error) { return { success: false, message: error instanceof Error ? error.message : 'Unable to test the connection.' }; }
}

function normalizeRelativePath(value: string) {
  const path = value.replace(/\\/g, '/').trim();
  if (!path || path.startsWith('/') || path.includes(':') || path.split('/').some((part) => !part || part === '.' || part === '..')) throw new Error(`Unsafe path: ${value}`);
  return path;
}

function safeProjectName(value: string) {
  return value.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 64) || 'generated-website';
}

function previewContentType(path: string) {
  if (path.endsWith('.css')) return 'text/css; charset=utf-8';
  if (path.endsWith('.js') || path.endsWith('.mjs')) return 'text/javascript; charset=utf-8';
  if (path.endsWith('.json')) return 'application/json; charset=utf-8';
  if (path.endsWith('.svg')) return 'image/svg+xml';
  if (path.endsWith('.png')) return 'image/png';
  if (path.endsWith('.jpg') || path.endsWith('.jpeg')) return 'image/jpeg';
  if (path.endsWith('.webp')) return 'image/webp';
  if (path.endsWith('.woff2')) return 'font/woff2';
  return 'text/html; charset=utf-8';
}

function projectPath(projectId: string) {
  if (!/^[a-z0-9-]+$/i.test(projectId)) throw new Error('The project identifier is invalid.');
  return join(projectsDirectory(), projectId);
}

function safeTarget(root: string, relPath: string) {
  const target = join(root, normalizeRelativePath(relPath));
  if (relative(root, target).startsWith(`..${sep}`) || relative(root, target) === '..') throw new Error('Unsafe path.');
  return target;
}

async function materializeProject(project: GeneratedProject) {
  await mkdir(projectsDirectory(), { recursive: true });
  const id = `${project.project_name}-${new Date().toISOString().replace(/[-:.TZ]/g, '').slice(0, 14)}-${randomUUID().slice(0, 6)}`;
  const directory = projectPath(id);
  await mkdir(directory, { recursive: true });
  for (const file of project.files) {
    const target = safeTarget(directory, file.path);
    await mkdir(dirname(target), { recursive: true });
    await writeFile(target, file.content, 'utf8');
  }
  await writeFile(join(directory, '.aiwb-manifest.json'), JSON.stringify({ project_name: project.project_name, framework: project.framework, dependencies: project.dependencies, instructions: project.instructions }, null, 2), 'utf8');
  const entry = project.files.find((file) => file.path === 'index.html') ?? project.files.find((file) => file.path.endsWith('.html'));
  return { project_id: id, project_name: project.project_name, framework: project.framework, files: project.files.map(({ path, content }) => ({ path, bytes: Buffer.byteLength(content, 'utf8') })), dependencies: project.dependencies, instructions: project.instructions, directory, entry_point: entry ? safeTarget(directory, entry.path) : undefined };
}

async function collectProjectFiles(root: string, prefix = ''): Promise<Array<{ path: string; bytes: number }>> {
  const entries = await readdir(root, { withFileTypes: true });
  const output: Array<{ path: string; bytes: number }> = [];
  for (const entry of entries) {
    if (entry.name === '.aiwb-manifest.json') continue;
    const child = join(root, entry.name);
    const path = prefix ? `${prefix}/${entry.name}` : entry.name;
    if (entry.isDirectory()) output.push(...await collectProjectFiles(child, path));
    else output.push({ path, bytes: (await stat(child)).size });
  }
  return output.sort((a, b) => a.path.localeCompare(b.path));
}

async function readProjectFile(projectId: string, path: string) {
  const target = safeTarget(projectPath(projectId), path);
  return { path: normalizeRelativePath(path), content: await readFile(target, 'utf8') };
}

async function saveProjectFile(projectId: string, path: string, content: string) {
  if (Buffer.byteLength(content, 'utf8') > MAX_FILE_BYTES) throw new Error('File is too large.');
  const target = safeTarget(projectPath(projectId), path);
  await mkdir(dirname(target), { recursive: true });
  await writeFile(target, content, 'utf8');
  return { path: normalizeRelativePath(path), content };
}

function removeNativeMenu() {
  Menu.setApplicationMenu(null);
}

function createWindow() {
  const window = new BrowserWindow({
    width: 1520, height: 940, minWidth: 1120, minHeight: 700, backgroundColor: '#0b1020', show: false,
    frame: false,
    title: 'Nuvora WebForge',
    webPreferences: { preload: join(currentDirectory, 'preload.js'), contextIsolation: true, nodeIntegration: false, sandbox: false },
  });
  window.once('ready-to-show', () => window.show());
  const startUrl = process.env.ELECTRON_START_URL;
  if (startUrl) window.loadURL(startUrl); else window.loadFile(join(app.getAppPath(), 'dist', 'index.html'));
}

app.whenReady().then(() => {
  app.setName('Nuvora WebForge');
  protocol.handle('nuvora-preview', async (request) => {
    try {
      const previewUrl = new URL(request.url);
      const relativePath = decodeURIComponent(previewUrl.pathname).replace(/^\/+/, '') || 'index.html';
      const target = safeTarget(projectPath(previewUrl.hostname), relativePath);
      return new Response(await readFile(target), { headers: { 'Content-Type': previewContentType(relativePath) } });
    } catch {
      return new Response('Preview file not found.', { status: 404, headers: { 'Content-Type': 'text/plain; charset=utf-8' } });
    }
  });
  removeNativeMenu();
  if (process.env.NUVORA_DISABLE_WINDOW !== '1') createWindow();
  ipcMain.handle('settings:load', async () => sanitizeSettings(await loadPrivateSettings()));
  ipcMain.handle('settings:save', async (_event, incoming: ProviderSettings) => {
    const persisted = effectiveSettings(await loadPrivateSettings(), incoming);
    await savePrivateSettings(persisted);
    return sanitizeSettings(persisted);
  });
  ipcMain.handle('system:status', async () => ({ status: 'ok', service: 'Nuvora desktop engine', timestamp: new Date().toISOString() }));
  ipcMain.handle('window:control', (event, action: 'minimize' | 'maximize' | 'close') => {
    const window = BrowserWindow.fromWebContents(event.sender);
    if (!window) return;
    if (action === 'minimize') window.minimize();
    if (action === 'maximize') {
      if (window.isMaximized()) window.unmaximize();
      else window.maximize();
    }
    if (action === 'close') window.close();
  });
  ipcMain.handle('settings:test', async (_event, incoming: ProviderSettings) => testProvider(effectiveSettings(await loadPrivateSettings(), incoming)));
  ipcMain.handle('generation:create', async (_event, input: GenerationInput) => {
    activeGenerationAbort?.abort();
    const controller = new AbortController();
    activeGenerationAbort = controller;
    try {
      return await generateProject(await loadPrivateSettings(), input, controller.signal);
    } catch (error) {
      if (controller.signal.aborted) throw new Error('Generation was cancelled before any project was saved.');
      console.error('Nuvora WebForge generation failed:', error instanceof Error ? error.message : String(error));
      throw error;
    } finally {
      if (activeGenerationAbort === controller) activeGenerationAbort = undefined;
    }
  });
  ipcMain.handle('generation:modify', async (_event, input: ProjectModificationInput) => {
    activeGenerationAbort?.abort();
    const controller = new AbortController();
    activeGenerationAbort = controller;
    try {
      return await modifyProject(await loadPrivateSettings(), input, controller.signal);
    } catch (error) {
      if (controller.signal.aborted) throw new Error('Generation was cancelled before any project files were changed.');
      console.error('Nuvora WebForge project modification failed:', error instanceof Error ? error.message : String(error));
      throw error;
    } finally {
      if (activeGenerationAbort === controller) activeGenerationAbort = undefined;
    }
  });
  ipcMain.handle('generation:cancel', () => {
    activeGenerationAbort?.abort();
    return { cancelled: true };
  });
  ipcMain.handle('project:list-files', async (_event, projectId: string) => {
    const root = projectPath(projectId);
    const files = await collectProjectFiles(root);
    const entry = files.find((file) => file.path === 'index.html') ?? files.find((file) => file.path.endsWith('.html'));
    return { files, entry_point: entry ? safeTarget(root, entry.path) : undefined };
  });
  ipcMain.handle('project:read-file', async (_event, projectId: string, path: string) => readProjectFile(projectId, path));
  ipcMain.handle('project:save-file', async (_event, projectId: string, path: string, content: string) => saveProjectFile(projectId, path, content));
  ipcMain.handle('project:open-folder', async (_event, directory: string) => shell.openPath(directory));
  ipcMain.handle('project:copy-to', async (_event, source: string) => {
    const result = await dialog.showOpenDialog({ properties: ['openDirectory', 'createDirectory'], title: 'Choose a folder for the project copy' });
    if (result.canceled || !result.filePaths[0]) return { cancelled: true };
    const target = join(result.filePaths[0], source.split(/[\\/]/).pop() ?? 'generated-project');
    await cp(source, target, { recursive: true, force: true });
    return { target, files: await collectProjectFiles(target) };
  });
});

app.on('window-all-closed', () => { if (process.platform !== 'darwin') app.quit(); });
app.on('activate', () => { if (process.env.NUVORA_DISABLE_WINDOW !== '1' && BrowserWindow.getAllWindows().length === 0) createWindow(); });

export { generateProject, modifyProject, parseProject, testProvider };
