# Nuvora WebForge — Quick Start

## What is Nuvora WebForge?

Nuvora WebForge is a Windows desktop application that turns your written brief into an editable website project. Choose Google Gemini or a local provider such as Ollama or LM Studio. The application does not require Rails, Ruby, a hosted server, or Docker.

## Install the application

1. Open the `Installer` folder.
2. Run `Nuvora-WebForge-Setup.exe`.
3. Select an installation location and complete the installer steps.
4. Launch **Nuvora WebForge** from the desktop or Start Menu.

## Configure an AI provider

1. Select **Settings** in the application header.
2. Choose **Google Gemini** and enter a Gemini API key plus a model, or choose **Local LLM** and enter the server URL and model name.
3. Select **Test connection**, then choose **Save settings**.

![AI provider settings](assets/02-provider-settings.png)

## Generate a website

1. Write a clear website brief describing the purpose, pages, sections, language, palette, and target screen sizes.
2. Choose `HTML / CSS / JS` or `React + Vite`.
3. Optionally add a PNG, JPG, or WEBP visual reference.
4. Select **Generate website**.
5. Review the project in **Preview**, **Code**, and **Files**, then copy it to a folder you choose.

HTML projects are required to include root files plus an organised `assets` folder with separate CSS, JavaScript, and supporting project files. React projects are required to include their root configuration and organised source folders.

![Main application workspace](assets/01-main-workspace.png)

## Refine a generated project with AI

After generating a project, write one specific requested change in the **Refine with AI** panel. The application sends your request and the current project files to the selected provider, validates the complete replacement structure, and refreshes the preview only after the updated files are safely written. If validation fails or the request is cancelled, the existing project remains unchanged.

> The product does not include a Gemini API key or the cost of any third-party provider. Use your own key or local model, and review generated code before deploying a website to production.

For the illustrated end-user guide, open `index.html` from the Documentation folder.

## Branding, themes, and technical reference

Generated projects are normal editable source code. Customize static HTML projects through their root markup and `assets/` folder. Customize React + Vite projects through `src/styles.css`, `src/App.tsx`, files in `src/components/`, and any generated content data.

Read [TECHNICAL-REFERENCE.md](TECHNICAL-REFERENCE.md) for the application architecture, project storage behavior, validated file structures, safe extension guidance, and external dependency management.
