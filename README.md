# LinuxFIX

> A mobile assistant for diagnosing Linux problems.

<p>
  <a href="https://github.com/szen1zzz/LinuxFIX/releases"><img alt="Latest release" src="https://img.shields.io/github/v/release/szen1zzz/LinuxFIX?include_prereleases&amp;sort=semver&amp;style=flat-square&amp;label=release&amp;color=499BED"></a>
  <a href="https://github.com/szen1zzz/LinuxFIX/commits/main"><img alt="Last commit" src="https://img.shields.io/github/last-commit/szen1zzz/LinuxFIX?style=flat-square&amp;color=499BED"></a>
  <a href="https://github.com/szen1zzz/LinuxFIX/issues"><img alt="Open issues" src="https://img.shields.io/github/issues/szen1zzz/LinuxFIX?style=flat-square&amp;color=A1C6F6"></a>
  <img alt="Repository size" src="https://img.shields.io/github/repo-size/szen1zzz/LinuxFIX?style=flat-square&amp;color=022E5B">
  <img alt="README views" src="https://visitor-badge.laobi.icu/badge?page_id=szen1zzz.LinuxFIX&amp;left_color=031725&amp;right_color=499BED&amp;left_text=README%20views">
</p>

**Status: private beta | `0.2.2-beta.0`**

LinuxFIX accepts a terminal error, log, or Linux how-to question and returns short troubleshooting suggestions, example commands, and optional analysis from a local Ollama model.

> This is a prototype. Always review commands and their risk before running them.

## Features

- Local matching for common Arch Linux problems.
- Debian mode with the same diagnostic engine.
- Natural-language Linux questions such as how to configure a service or inspect the system.
- Similar-problem suggestions for typos.
- Suggested commands and source links.
- Optional AI analysis through a configurable backend.
- Automatic AI host availability indicator.
- Polish and English problem descriptions.
- Account registration and login through the backend.
- Synchronized AI conversation history for signed-in users.
- Startup connection animation.
- Dark and light appearance settings.
- No automatic command execution.

The local database contains 24 distribution-aware rules covering Pacman, AUR, APT, DPKG, systemd, graphics, networking, audio, boot, permissions, disks, the kernel, locale, terminals, and general troubleshooting. Rules live in [data/errorDatabase.ts](data/errorDatabase.ts).

## Beta limitations

The current version uses a local rule database and can send logs to Ollama through the backend. It does not yet crawl forums or Arch Wiki automatically. LinuxFIX does not execute commands automatically and does not connect to a user's computer over SSH.

### Privacy and security

- Never put passwords, API keys, session secrets, or Cloudflare credentials in the APK.
- When AI analysis is used, the pasted log is sent to the configured backend host.
- Ollama runs locally on the computer hosting the backend.
- A Cloudflare Quick Tunnel (`trycloudflare.com`) has a temporary URL that may change after a restart.
- The app reads the current backend address from the public LinuxFIX `config.json` on GitHub's `main` branch. Update that file after a Quick Tunnel address changes; never store secrets in it.
- The API sends security headers, limits login, registration, and AI analysis requests, and caps concurrent AI work. These controls make a small private beta safer, but they are not a replacement for Cloudflare WAF or a production abuse-prevention service.
- The current account storage is a local JSON persistence layer intended for a small beta, not a production database.

## Run the app with Expo Go

Requirements:

- Node.js LTS.
- Expo Go on an Android/iOS phone, or an emulator.

```powershell
cd C:\Users\nikod\apps\archfix
npm install
npm start
```

Scan the QR code in Expo Go. The phone and computer should normally be on the same Wi-Fi network.

Useful Expo terminal shortcuts:

- `a` — Android.
- `i` — iOS, when available.
- `w` — web preview.

## Run the local AI backend

The backend is optional. Local rule-based analysis also works without Ollama or the backend.

Install [Ollama](https://ollama.com/) and download the model:

```powershell
ollama pull qwen2.5:7b
```

Start the backend in a separate terminal:

```powershell
cd C:\Users\nikod\apps\archfix
npm.cmd run backend
```

Check it:

```powershell
Invoke-RestMethod http://127.0.0.1:8787/health
```

On a phone, `127.0.0.1` means the phone itself. Use the computer's LAN address, such as `http://192.168.1.10:8787`, or a configured HTTPS host. See [backend/README.md](backend/README.md) for account and history endpoints.

## Build a private APK

Install and authenticate with Expo EAS:

```powershell
npm.cmd install --global eas-cli
eas.cmd login
eas.cmd build --platform android --profile preview
```

The `preview` profile creates an installable `.apk` outside Google Play. The `production` profile is intended for an `.aab` release build.

## Project structure

```text
archfix/
├── App.tsx
├── app.json
├── package.json
├── backend/
│   ├── server.mjs
│   └── README.md
├── data/
│   └── errorDatabase.ts
└── README.md
```

## Roadmap

1. Add more Arch and Debian rules.
2. Add trusted-source search with links and citations.
3. Add RAG for Arch Wiki, forums, and package documentation.
4. Import logs from files or screenshots.
5. Add account recovery and a production session store.
6. Move account data and rate limits to managed production infrastructure.

## Development activity

The chart shows public GitHub activity for the project owner and may include work outside this repository.

[![Development activity](https://ghchart.rshah.org/499BED/szen1zzz)](https://github.com/szen1zzz)

<!-- Dynamic badges depend on Shields.io, visitor-badge.laobi.icu, and ghchart.rshah.org. -->

## License

This repository is shared as a private beta. The included LinuxFIX license is “all rights reserved”: people may evaluate the source in the repository, but may not reuse or redistribute it without written permission. Third-party packages retain their own licenses.

The `"private": true` field in `package.json` concerns npm package publishing, not GitHub repository visibility.

## Safe GitHub publishing checklist

Safe to publish:

- application source code,
- backend source code,
- curated public source URLs,
- redacted example requests and responses,
- setup instructions,
- screenshots and a roadmap.

Do not publish:

- `backend/data/` (accounts, session-token hashes, and conversation history),
- `.env` files, passwords, API keys, session tokens, or Cloudflare credentials,
- `.cloudflared/` configuration or credential files,
- private logs, personal data, or real user accounts,
- a live backend URL if you do not want it discovered.

Public source code cannot be made impossible to copy or inspect. Keep the repository private while the backend uses a Quick Tunnel, enable two-factor authentication on GitHub, protect the default branch, and add Cloudflare WAF or Turnstile before a wider public launch.
