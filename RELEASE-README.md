# Nuvora WebForge — Commercial Distribution

**Nuvora WebForge** is a Windows desktop application for generating and editing website projects with Google Gemini, Ollama, LM Studio, and other OpenAI-compatible local servers. It is distributed as an Electron application and does not require Rails, Ruby, or a hosted backend.

## Package contents

| Folder or file | Purpose |
|---|---|
| `Installer/Nuvora-WebForge-Setup.exe` | Windows NSIS installer for end users. |
| `Documentation/` | Built-in-style HTML guide, English quick-start guide, and supporting visual assets. |
| `Marketplace_Assets/` | CodeCanyon-ready cover and preview images, English listing copy, and submission checklist. |
| `Source_Code/` | TypeScript, React, Electron, Vite, scripts, and project documentation needed by a purchaser or reviewer. |
| `SHA256SUMS.txt` | SHA-256 integrity hashes for the installer and the delivery archive. |

## Installation

1. Run `Nuvora-WebForge-Setup.exe` on a 64-bit edition of Windows 10 or Windows 11.
2. Choose an installation directory when prompted. The installer creates desktop and Start Menu shortcuts named **Nuvora WebForge**.
3. Launch the application and open **Settings** to select a provider and configure its connection.
4. For Google Gemini, provide your own Gemini API key. For local providers, enter the local endpoint and a model identifier, then use **Test connection**.
5. Enter a sufficiently detailed website brief, choose HTML or React, optionally add a reference image, and generate the project. Generated projects are stored in the user Documents directory under `Nuvora WebForge/projects`.

> **Windows security note:** This commercial build is not code-signed. Windows may show a SmartScreen or publisher warning for unsigned software. Distributors should code-sign the final installer with their own trusted certificate before public release whenever possible.

## Generation quality and review

The application rejects structurally incomplete payloads and common placeholder patterns such as `Lorem ipsum`, `TODO`, and `dummy text` before creating a project. It also requires a complete HTML page or a React entry structure, as appropriate. These safeguards improve structural completeness; they do not replace human review. Users must review generated copy, accessibility, branding, security, legal claims, data handling, and factual accuracy before deploying any generated site.

## Development

Open the `Source_Code/desktop` directory and use pnpm:

```bash
pnpm install
pnpm dev
```

To create the Windows installer:

```bash
pnpm package:win
```

The project ships with no server-side runtime. API keys are protected through Electron safe storage when the operating system makes that facility available.

## Support material

Use `Documentation/index.html` for the end-user guide, `Documentation/README.md` for the English quick-start guide, and `Marketplace_Assets/ITEM-LISTING-EN.md` for English marketplace copy.

---

© 2026 Nuvora WebForge. See `LICENSE.txt` for the license terms included with this distribution.
