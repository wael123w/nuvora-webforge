export type ProviderSettings = {
  provider: 'gemini' | 'local';
  gemini: { model: string; temperature: number; maxTokens: number };
  local: { url: string; model: string };
  apiKey?: string;
  apiKeyConfigured?: boolean;
};

export type GeneratedProject = {
  project_id: string;
  project_name: string;
  framework: 'html' | 'react';
  files: Array<{ path: string; bytes: number }>;
  dependencies: string[];
  instructions: string;
  directory: string;
  entry_point?: string;
};

declare global {
  interface Window {
    desktopApi: {
      loadSettings(): Promise<ProviderSettings>;
      saveSettings(settings: ProviderSettings): Promise<ProviderSettings>;
      testConnection(settings: ProviderSettings): Promise<{ success: boolean; message: string }>;
      systemStatus(): Promise<{ status: string; service: string; timestamp: string }>;
      windowControl(action: 'minimize' | 'maximize' | 'close'): Promise<void>;
      generate(input: { prompt: string; framework: 'html' | 'react'; image?: { base64: string; mime: string } }): Promise<GeneratedProject>;
      modifyProject(input: { projectId: string; instruction: string }): Promise<GeneratedProject>;
      cancelGeneration(): Promise<{ cancelled: boolean }>;
      listFiles(projectId: string): Promise<{ files: Array<{ path: string; bytes: number }>; entry_point?: string }>;
      readFile(projectId: string, path: string): Promise<{ path: string; content: string }>;
      saveFile(projectId: string, path: string, content: string): Promise<{ path: string; content: string }>;
      openFolder(directory: string): Promise<string>;
      copyProject(directory: string): Promise<{ cancelled?: boolean; target?: string }>;
    };
  }
}

export {};
