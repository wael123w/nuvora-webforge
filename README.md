# Nuvora WebForge

Nuvora WebForge is a Windows desktop application that turns detailed website briefs into organised, editable website projects. It supports Google Gemini and compatible local AI providers including Ollama, LM Studio, and OpenAI-style local endpoints.

The application can generate structured HTML/CSS/JavaScript projects and React + Vite projects, preview static HTML output, edit files in an integrated workspace, and refine a generated project with focused AI instructions.

## Product capabilities

| Area | Included capability |
|---|---|
| AI providers | Google Gemini, Ollama, LM Studio, and compatible OpenAI-style local servers. |
| Project outputs | HTML/CSS/JavaScript and React + Vite project structures. |
| Project workflow | Generate, preview, inspect, edit, refine with AI, copy, and export. |
| Project validation | Rejects incomplete structures and common placeholder content before a generated project is saved. |
| Desktop security | Electron context isolation, disabled Node integration in the renderer, and Windows secure storage where available. |

## Repository layout

```text
.
├── desktop/            Electron, React, and TypeScript application source
├── documentation/      English customer documentation and technical reference
├── docs/               Validation notes and product screenshots
├── marketplace/        CodeCanyon listing copy, review notes, and marketing assets
├── scripts/            Development and local-provider test scripts
├── CHANGELOG.md        Product change notes
└── RELEASE-README.md   Release and delivery guidance
```

## Requirements for development

Use Node.js 22 or later and pnpm. The application is developed and packaged on Windows-compatible Electron tooling. A Google Gemini API key or a running compatible local provider is required only when you want to test AI generation.

## Install development dependencies

```bash
cd desktop
pnpm install
```

## Run the application in development

```bash
cd desktop
pnpm dev
```

## Quality checks

```bash
cd desktop
pnpm lint
pnpm build
```

## Build a Windows installer

```bash
cd desktop
pnpm package:win
```

The installer output is intentionally excluded from this repository. Publish release binaries through GitHub Releases or the intended marketplace distribution package after completing a clean Windows installation test.

## CodeCanyon customer package

The customer-facing CodeCanyon delivery is designed as a compiled Windows installer with English documentation. It does not include application source code. The author-facing listing copy, screenshots, and submission materials are located under `marketplace/`.

## Documentation

Open `documentation/index.html` for the customer help guide. Supporting materials include the technical reference, annotated interface tour, CodeCanyon submission checklist, and resubmission/compliance notes.

## Security note

Do not commit API keys, provider settings, local Electron data, installer binaries, dependency directories, or generated build output. These paths are excluded by `.gitignore`.
