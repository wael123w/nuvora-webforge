# Validation record

| Check | Result | Evidence |
|---|---|---|
| Electron/React lint | Passed | `pnpm lint` completed with zero warnings and zero errors. |
| TypeScript and production UI build | Passed | `pnpm build` completed for the React interface, Electron main process, and preload bridge. |
| English-first interface | Passed | All runnable application strings were scanned; no Arabic UI literals remain. |
| Header cleanup | Passed | The visible version badge and the in-app guide action were removed. |
| Local provider connection | Passed | The running application displayed a successful connection to `nuvora-test-model`. |
| Live website generation | Passed | An English Northline architecture-studio project was generated through the application and written to the user Documents projects directory. |
| Preview rendering | Passed | Generated project files are served through the app-owned `nuvora-preview` protocol, resolving the blank `file://` iframe preview. |
| Responsive preview | Passed | The generated one-page website was visually checked at desktop and mobile widths. |
| Generated content integrity | Passed | The project contained the requested work, services, process, and contact sections, with no common placeholder content. |
| Installer resources | Configured | The package configuration includes the English HTML guide and updated English screenshots in application resources. |

## Visual evidence

The current English workspace, local provider connection, generated desktop website, mid-page section, closing contact section, and mobile website view are recorded in `docs/`. The marketplace-ready images are stored in `marketplace/assets/`.

## Installer note

The Linux build environment can produce the NSIS installer artifact. Electron Builder may exit after the installer is written while attempting optional update metadata processing without a configured publish channel. The Windows installer should still be installed once on a clean Windows 10 or Windows 11 device before public marketplace submission.

## Final Windows checks

1. Run `Nuvora-WebForge-Setup.exe` on a clean Windows device.
2. Confirm the desktop and Start Menu shortcuts named **Nuvora WebForge**.
3. Configure a buyer-owned Gemini key or an active local endpoint and complete a generation.
4. Review the generated project in Preview, Code, and Files, then open its exported files in a browser or Vite environment.
