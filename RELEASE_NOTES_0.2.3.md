# LinuxFIX 0.2.3 — Full Release

LinuxFIX 0.2.3 is a regular Android release, replacing the public beta as the latest download.

## What's new

- Five available distribution workspaces: Arch Linux, Debian, Fedora, NixOS, and CachyOS. Ubuntu and Tails OS remain marked as upcoming.
- A refined default Quiet workspace with clearer navigation, quick questions, connection status, local matches, and suggested commands.
- **Workspace Design Lab for administrator and developer accounts:** Classic, Hyprland, Mosaic, Quiet, Atelier, and the new Clarity design inspired by the LinuxFIX campaign.
- Each design now has its own workspace typography, spacing, window treatment, composer, analysis cards, command blocks, and source presentation, with matching light and dark palettes.
- Design selection stays local to the device. Regular accounts continue to use Quiet.
- Developer access is bound to the current account. Signing out or switching accounts clears testing controls and drops the previous account's access immediately.
- Distribution-aware local troubleshooting and optional AI analysis, Polish and English UI, account history, appearance controls, sound, and haptics.
- Release version 0.2.3 and Android version code 23, with a dedicated signed APK build profile.

## Install or update

1. Download **LinuxFIX-0.2.3.apk** from the release assets.
2. Allow Android to install from this source if prompted.
3. Install the APK. It uses the existing `com.archfix.app` package identity.

The APK runs independently of Expo Go or a development server. AI features require the configured LinuxFIX backend to be online; local matching works without it.

## Design Lab access

Authorized users can open **Settings → Developer / Administrator panel → Workspace Design Lab**. Roles are maintained in the Supabase administrator allowlist and cannot be granted by the app. The lab changes appearance and local testing behavior; it does not grant access to other users' data.

## Scope and known limitations

- LinuxFIX suggests steps and commands; it never executes them automatically or connects to a computer over SSH.
- Review commands and source links before running them. Do not paste credentials or other secrets into logs.
- AI service availability depends on the backend host and its network connection. The app refreshes its configured HTTPS address automatically.
- Conversation history for signed-in users is retained for up to seven days.
- Automated dependency auditing currently reports moderate advisories in the Expo build-tool dependency chain; no high or critical advisories were reported.

Report issues through [GitHub Issues](https://github.com/szen1zzz/LinuxFIX/issues).
