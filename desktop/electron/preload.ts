import { contextBridge, ipcRenderer } from 'electron';

contextBridge.exposeInMainWorld('desktopApi', {
  loadSettings: () => ipcRenderer.invoke('settings:load'),
  saveSettings: (settings: unknown) => ipcRenderer.invoke('settings:save', settings),
  testConnection: (settings: unknown) => ipcRenderer.invoke('settings:test', settings),
  systemStatus: () => ipcRenderer.invoke('system:status'),
  windowControl: (action: 'minimize' | 'maximize' | 'close') => ipcRenderer.invoke('window:control', action),
  generate: (input: unknown) => ipcRenderer.invoke('generation:create', input),
  modifyProject: (input: { projectId: string; instruction: string }) => ipcRenderer.invoke('generation:modify', input),
  cancelGeneration: () => ipcRenderer.invoke('generation:cancel'),
  listFiles: (projectId: string) => ipcRenderer.invoke('project:list-files', projectId),
  readFile: (projectId: string, path: string) => ipcRenderer.invoke('project:read-file', projectId, path),
  saveFile: (projectId: string, path: string, content: string) => ipcRenderer.invoke('project:save-file', projectId, path, content),
  openFolder: (directory: string) => ipcRenderer.invoke('project:open-folder', directory),
  copyProject: (directory: string) => ipcRenderer.invoke('project:copy-to', directory),
});
