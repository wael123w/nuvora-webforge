# Envato EXE-Only Delivery Compliance Notes

## Official findings

The current Envato Code Item Preparation & Technical Requirements page states that an item should be uploaded as a single ZIP that contains the finished design and supporting information. It explicitly requires basic English documentation for every CodeCanyon item, including concise installation, customization, and usage instructions, general information, and required asset credits. The documentation must be available publicly online and should be suitable for beginners.

For an app submission, the same guidance says the app should focus on improving workflows for web developers. Nuvora WebForge is positioned as a desktop application for generating and refining website projects, which aligns with that direction.

The guidance reviewed does **not** explicitly state that a compiled desktop application must include editable source code in the buyer ZIP. However, it does say that the more editable a submitted file is, the more valuable it is to buyers. Therefore an EXE-only delivery should be presented transparently as a compiled Windows desktop application, not as source-code software, and the listing must not claim that source code is included.

Envato’s Author Terms state that the author licenses the item to buyers under Envato’s applicable licence options and must not impose different or additional buyer terms in the item description. The package should therefore use a concise notice that the download is licensed under the buyer’s applicable Envato licence and should not substitute a custom commercial licence.

## Recommended customer ZIP structure

```text
Nuvora_WebForge_Windows_Installer.zip
├── Nuvora-WebForge-Setup.exe
├── README-FIRST.html
├── INSTALLATION-AND-USE.md
├── THIRD-PARTY-NOTICES.md
└── LICENSE-NOTICE.txt
```

## Listing changes required for EXE-only delivery

- State exactly: “This download contains the Windows installer and English documentation. Source code is not included.”
- Do not make source code availability, custom licensing, or off-platform purchasing claims.
- Keep the current AI-provider disclosure: a Gemini API key or a separately installed local provider such as Ollama/LM Studio is required only when the buyer selects that provider.
- Publish the HTML help guide at a public URL before submitting because Envato requires public documentation.

## Sources

1. [Envato — Code Item Preparation & Technical Requirements](https://help.author.envato.com/hc/en-us/articles/360000471583-Code-Item-Preparation-Technical-Requirements)
2. [Envato — Market Author Terms](https://help.author.envato.com/hc/en-us/articles/41371538488473-Envato-Market-Author-Terms)
