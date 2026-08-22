import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { app } from 'electron';
import { generateProject, testProvider } from '../desktop/dist-electron/main.js';

await app.whenReady();

const settings = {
  provider: 'local',
  gemini: { model: 'gemini-2.5-flash', temperature: 0.7, maxTokens: 8192 },
  local: { url: 'http://127.0.0.1:11434', model: 'nuvora-test-model' },
  apiKey: '',
};

const connection = await testProvider(settings);
assert.equal(connection.success, true, connection.message);
const prompt = 'Create a responsive Arabic restaurant landing page with a hero, menu categories, reservation form, dark navy and copper palette, no testimonials, and no invented prices.';
const project = await generateProject(settings, { prompt, framework: 'html', image: { mime: 'image/png', base64: 'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADElEQVR42mNk+M/wHwAF/gL+wv8QVAAAAABJRU5ErkJggg==' } }, new AbortController().signal);
assert.ok(project.files.some((file) => file.path === 'index.html'));
const html = await readFile(project.entry_point, 'utf8');
assert.match(html, /Create a responsive Arabic restaurant landing page/);
assert.match(html, /تم استلام مرجع بصري/);
console.log(JSON.stringify({ connection, project: { id: project.project_id, name: project.project_name, files: project.files, entryPoint: project.entry_point } }));
app.quit();
