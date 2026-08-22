# Nuvora WebForge Technical Reference

## Purpose

Nuvora WebForge is an Electron desktop application for Windows. It accepts a website brief, sends it to the buyer-selected AI provider, validates the structured response, writes the project to the buyer's Documents directory, and exposes the project for review, editing, copying, and preview.

> **Runtime boundary:** The installed desktop application does not require Node.js, pnpm, Ruby, Rails, Docker, or a separate server. These tools are relevant only when a buyer chooses to run or extend a generated React + Vite project outside Nuvora WebForge.

## Application architecture

| Layer | Primary location | Responsibility |
|---|---|---|
| Electron main process | `desktop/electron/main.ts` | Window lifecycle, secure settings, provider requests, response validation, project writing, preview protocol, file operations, and IPC handlers. |
| Secure preload bridge | `desktop/electron/preload.ts` | Exposes only approved operations from the renderer to Electron. |
| React renderer | `desktop/src/App.tsx` | Coordinates settings, generation, cancellation, project state, and messages. |
| Builder interface | `desktop/src/components/BuilderPanel.tsx` | Collects the brief, framework choice, and optional visual reference. |
| Workspace interface | `desktop/src/components/WorkspacePanel.tsx` | Displays Preview, Code, Files, Copy project, and Refine with AI. |
| Settings interface | `desktop/src/components/SettingsModal.tsx` | Configures Gemini or a compatible local provider. |
| UI styling | `desktop/src/index.css` | Defines the product theme, layout, responsive rules, and custom window controls. |

The renderer never receives the raw API key. Provider settings are stored locally using operating-system secure storage where it is available. The application uses Electron IPC with context isolation enabled and does not enable Node integration in the renderer.

## Generated-project storage

Generated projects are written beneath the buyer's Documents folder in `Nuvora WebForge/projects`. Each project receives a unique folder and a `.aiwb-manifest.json` file containing the project name, selected framework, dependency list, and run instructions.

| Action | Result |
|---|---|
| Generate | A validated project is written to a new local project folder. |
| Save in Code | The selected project file is updated in place. |
| Refine with AI | The current project snapshot and the buyer's request are sent to the selected provider. The returned replacement is validated and then written through a staging-and-swap operation. |
| Copy project | The project folder is copied to a buyer-selected directory. |

## Required generated file structures

### Static HTML/CSS/JavaScript

Nuvora WebForge accepts an HTML project only when it contains at least five files, including root `index.html`, root `README.md`, and an organised folder with separate CSS, JavaScript, and supporting files. A typical structure is:

```text
my-site/
├── index.html
├── README.md
└── assets/
    ├── styles.css
    ├── site.js
    └── content.json
```

### React + Vite

Nuvora WebForge accepts a React project only when it contains root configuration files, `package.json` with `"type": "module"`, `vite.config.ts`, `README.md`, a source entry point, an `App` component, a separate component, and a separate stylesheet. A typical structure is:

```text
my-react-site/
├── package.json
├── vite.config.ts
├── index.html
├── README.md
└── src/
    ├── main.tsx
    ├── App.tsx
    ├── styles.css
    ├── components/
    │   └── StudioCard.tsx
    └── data/
        └── studio.ts
```

The validator rejects common placeholder text, duplicate or unsafe paths, incomplete response files, and project structures that do not meet the selected framework requirements.

## Branding and theme customization

Branding is controlled by normal project files after generation. Buyers retain full control of generated project code.

| Generated project type | Recommended customization location | Typical changes |
|---|---|---|
| HTML/CSS/JavaScript | `assets/styles.css`, `index.html`, and supporting assets | Brand colours, typography, spacing, logo markup, navigation labels, and local images. |
| React + Vite | `src/styles.css`, `src/App.tsx`, `src/components/`, and `src/data/` | Theme variables, component styles, page sections, content data, interactions, and local assets. |

For a targeted change, the buyer can either edit the file directly in the Code tab or use **Refine with AI** with a specific request such as “replace the violet accent with a forest-green palette and keep all existing sections.” The buyer should review the updated code before production deployment.

## Managing external dependencies

### Desktop application dependencies

The packaged desktop application already includes its application dependencies. Buyers do not run package-manager commands to start Nuvora WebForge.

### Generated React + Vite dependencies

A generated React + Vite project has its own `package.json`. To run it outside Nuvora WebForge, open the copied project folder in a terminal and run:

```bash
pnpm install
pnpm dev
```

Use `pnpm build` to create a production bundle. Add a library with `pnpm add package-name`, then import it in the appropriate source file. Keep packages in `package.json`, do not place credentials in client code, and retest the production build after dependency changes.

### AI provider dependencies

| Provider | Buyer-managed requirement |
|---|---|
| Google Gemini | A valid buyer-owned API key and internet access. |
| Ollama | A local Ollama installation with the chosen model running. |
| LM Studio or compatible server | A running local endpoint URL and a selected model. |

## Preview behavior

Static HTML projects are previewed directly in the application using an app-owned local protocol. React + Vite projects are generated with run instructions and should be run through Vite when an interactive browser preview outside the generated files is needed. This prevents the desktop application from attempting to execute Vite modules as static files.

## Safe extension guidelines

Do not remove Electron security settings, expose secrets to the React renderer, or accept unvalidated file paths from a provider. When extending provider support, preserve the JSON project contract and structural validation so incomplete or unsafe generated responses are not written to the buyer's project folder.
