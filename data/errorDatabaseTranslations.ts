import type { ErrorRule, Fix } from './errorDatabase';

type EnglishRuleText = {
  category: string;
  title: string;
  summary: string;
};

const englishRuleText: Record<string, EnglishRuleText> = {
  'pacman-conflicting-files': {
    category: 'Pacman',
    title: 'File conflict during an upgrade',
    summary: 'Identify which package owns the conflicting file. Do not remove it until you know which package provides it.',
  },
  'pacman-keyring': {
    category: 'Pacman',
    title: 'Package signing key issue',
    summary: 'Refresh the Pacman keyring, then perform a complete database synchronization and upgrade.',
  },
  'pacman-database-lock': {
    category: 'Pacman',
    title: 'Pacman database is locked',
    summary: 'First make sure no other Pacman process is running. Remove the lock file only after checking active processes.',
  },
  'package-not-found': {
    category: 'Packages and AUR',
    title: 'Package not found',
    summary: 'Check the package name. If it is an AUR package, use an AUR helper only with a trusted source.',
  },
  'systemd-service': {
    category: 'Systemd',
    title: 'Systemd service does not start',
    summary: 'Check the service status and logs from the current boot. Do not enable the service without understanding the failure.',
  },
  bootloader: {
    category: 'Boot',
    title: 'System boot problem',
    summary: 'Collect information about UEFI mode, the EFI partition, and the bootloader before making changes.',
  },
  graphics: {
    category: 'Graphics',
    title: 'Graphics or desktop session problem',
    summary: 'Identify the GPU and session type before changing drivers. Keep the logs for further analysis.',
  },
  network: {
    category: 'Network',
    title: 'Network or DNS problem',
    summary: 'Check the interface, route, and name resolution separately to narrow down the cause.',
  },
  audio: {
    category: 'Audio',
    title: 'Audio problem',
    summary: 'Check the user audio services and the available audio outputs.',
  },
  permissions: {
    category: 'Permissions',
    title: 'Permission denied',
    summary: 'Check the file owner and permissions. Avoid using sudo as a permanent workaround.',
  },
  'disk-full': {
    category: 'Storage',
    title: 'No free space or read-only filesystem',
    summary: 'Check free space and mount points before removing any data.',
  },
  'kernel-module': {
    category: 'Kernel',
    title: 'Kernel module problem',
    summary: 'Check the kernel version, available modules, and logs from the current boot.',
  },
  locale: {
    category: 'System',
    title: 'Invalid system locale',
    summary: 'Check the generated locales and ensure the language settings match locale.gen.',
  },
  'general-application-logs': {
    category: 'Diagnostics',
    title: 'Collect the complete application log',
    summary: 'Run the program from a terminal with more verbose logging. The complete message often reveals the dependency or configuration causing the problem.',
  },
  'general-journal-kernel': {
    category: 'Diagnostics',
    title: 'Inspect the system and kernel journal',
    summary: 'Journalctl usually provides more context than an on-screen error. Start with the current boot and avoid adding -x unless necessary.',
  },
  'general-pacman-log': {
    category: 'Diagnostics',
    title: 'Inspect the latest upgrade log',
    summary: 'If the problem started after an upgrade, compare the failure time with the Pacman log and include the complete relevant section in the analysis.',
  },
  'general-boot-stage': {
    category: 'Boot',
    title: 'Identify where the boot process stops',
    summary: 'Distinguish between firmware, bootloader, initramfs, and the running system. Each stage has different logs and diagnostic tools.',
  },
  'archwiki-http-429-user-agent': {
    category: 'Network and web',
    title: 'ArchWiki returns HTTP 429',
    summary: 'Check whether the client sends an outdated or unusual user agent that may trigger anti-bot protection. Do not bypass safeguards with high-volume traffic.',
  },
  'tmux-terminal-features': {
    category: 'Terminal',
    title: 'Color or terminal capability problem in tmux',
    summary: 'Do not blindly set TERM to the outer terminal value. Inspect console capabilities and configure the features advertised by tmux.',
  },
  'debian-package-not-found': {
    category: 'APT packages',
    title: 'Package not found',
    summary: 'Check the package name and configured repositories. Refresh the package index first without installing or removing anything.',
  },
  'debian-dpkg-interrupted': {
    category: 'DPKG',
    title: 'Package configuration was interrupted',
    summary: 'Finish configuring previously unpacked packages, then check whether APT reports missing dependencies.',
  },
  'debian-unmet-dependencies': {
    category: 'APT dependencies',
    title: 'Unmet package dependencies',
    summary: 'Inspect the dependency state first. Before accepting a repair, carefully review which packages APT wants to change or remove.',
  },
  'debian-apt-lock': {
    category: 'APT and DPKG',
    title: 'APT or DPKG is busy',
    summary: 'Check active processes and wait for the upgrade to finish. Never remove lock files while the package manager is running.',
  },
  'debian-repository-release': {
    category: 'APT repositories',
    title: 'APT repository problem',
    summary: 'Check the repository address, release name, and network connection. Do not disable signature verification as a workaround.',
  },
};

export function localizedFix(rule: ErrorRule, language: 'pl' | 'en'): Fix {
  if (language === 'pl') return rule.fix;
  const translation = englishRuleText[rule.id];
  if (!translation) return rule.fix;
  return {
    ...rule.fix,
    title: translation.title,
    summary: translation.summary,
  };
}

export function localizedCategory(rule: ErrorRule, language: 'pl' | 'en'): string {
  return language === 'en' ? (englishRuleText[rule.id]?.category ?? rule.category) : rule.category;
}
