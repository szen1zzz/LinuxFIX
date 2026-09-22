export type Fix = {
  title: string;
  summary: string;
  commands: string[];
  source: string;
  sourceLabel: string;
};

export type ErrorRule = {
  id: string;
  category: string;
  match: RegExp;
  distro?: 'arch' | 'debian' | 'all';
  fix: Fix;
};

export const errorDatabase: ErrorRule[] = [
  {
    id: 'pacman-conflicting-files',
    category: 'Pacman',
    match: /conflicting files|failed to commit transaction/i,
    fix: {
      title: 'Konflikt plików podczas aktualizacji',
      summary: 'Sprawdź właściciela konfliktowego pliku. Nie usuwaj go automatycznie, dopóki nie wiesz, który pakiet go dostarcza.',
      commands: ['pacman -Qo /sciezka/do/konfliktowego-pliku', 'sudo pacman -Syu'],
      source: 'https://wiki.archlinux.org/title/Pacman',
      sourceLabel: 'Arch Wiki: Pacman',
    },
  },
  {
    id: 'pacman-keyring',
    category: 'Pacman',
    match: /keyring|invalid or corrupted package|signature from/i,
    fix: {
      title: 'Problem z kluczem pakietów',
      summary: 'Odśwież keyring Pacmana, a następnie wykonaj pełną synchronizację baz.',
      commands: ['sudo pacman -Sy archlinux-keyring', 'sudo pacman -Su'],
      source: 'https://wiki.archlinux.org/title/System_maintenance',
      sourceLabel: 'Arch Wiki: System maintenance',
    },
  },
  {
    id: 'pacman-database-lock',
    category: 'Pacman',
    match: /unable to lock database|db\.lck|could not lock database/i,
    fix: {
      title: 'Zablokowana baza Pacmana',
      summary: 'Najpierw upewnij się, że nie działa inny Pacman. Plik blokady usuwaj dopiero po sprawdzeniu procesów.',
      commands: ['ps aux | grep [p]acman', 'sudo rm /var/lib/pacman/db.lck'],
      source: 'https://wiki.archlinux.org/title/Pacman',
      sourceLabel: 'Arch Wiki: Pacman',
    },
  },
  {
    id: 'package-not-found',
    category: 'Pakiety i AUR',
    match: /target not found|package .* not found|aur|yay.*not found|paru/i,
    fix: {
      title: 'Pakiet nie został znaleziony',
      summary: 'Sprawdź nazwę pakietu. Jeśli to pakiet AUR, użyj helpera AUR tylko z zaufanym źródłem.',
      commands: ['pacman -Ss nazwa-pakietu', 'yay -Ss nazwa-pakietu'],
      source: 'https://wiki.archlinux.org/title/Arch_User_Repository',
      sourceLabel: 'Arch Wiki: Arch User Repository',
    },
  },
  {
    id: 'systemd-service',
    category: 'Systemd',
    match: /failed to start|systemctl|unit .* failed|service/i,
    fix: {
      title: 'Usługa systemd nie startuje',
      summary: 'Sprawdź status usługi i logi z bieżącego uruchomienia. Nie włączaj usługi w ciemno.',
      commands: ['systemctl status nazwa-uslugi', 'journalctl -u nazwa-uslugi -b --no-pager'],
      source: 'https://wiki.archlinux.org/title/Systemd',
      sourceLabel: 'Arch Wiki: systemd',
    },
  },
  {
    id: 'bootloader',
    category: 'Uruchamianie',
    match: /grub|bootloader|efibootmgr|no bootable|boot device/i,
    fix: {
      title: 'Problem z uruchamianiem systemu',
      summary: 'Zbierz informacje o trybie UEFI, partycji EFI i bootloaderze przed wykonaniem zmian.',
      commands: ['efibootmgr -v', 'lsblk -f'],
      source: 'https://wiki.archlinux.org/title/Arch_boot_process',
      sourceLabel: 'Arch Wiki: Arch boot process',
    },
  },
  {
    id: 'graphics',
    category: 'Grafika',
    match: /nvidia|gpu|vulkan|wayland|xorg|display/i,
    fix: {
      title: 'Problem z grafiką lub sesją',
      summary: 'Zidentyfikuj GPU i sesję graficzną, zanim zmienisz sterowniki. Zachowaj logi do dalszej analizy.',
      commands: ['lspci -k | grep -A 3 -E "(VGA|3D|Display)"', 'echo $XDG_SESSION_TYPE'],
      source: 'https://wiki.archlinux.org/title/Graphics',
      sourceLabel: 'Arch Wiki: Graphics',
    },
  },
  {
    id: 'network',
    category: 'Sieć',
    match: /networkmanager|wifi|wlan|dhcp|dns|temporary failure in name resolution|connection timed out/i,
    fix: {
      title: 'Problem z siecią lub DNS',
      summary: 'Sprawdź interfejs, trasę i rozwiązywanie nazw osobno, żeby zawęzić przyczynę.',
      commands: ['ip link', 'ip route', 'resolvectl status'],
      source: 'https://wiki.archlinux.org/title/Network_configuration',
      sourceLabel: 'Arch Wiki: Network configuration',
    },
  },
  {
    id: 'audio',
    category: 'Audio',
    match: /pipewire|pulseaudio|alsa|no sound|audio device|sink/i,
    fix: {
      title: 'Problem z dźwiękiem',
      summary: 'Sprawdź usługi audio użytkownika i dostępne wyjścia dźwięku.',
      commands: ['systemctl --user status pipewire pipewire-pulse', 'wpctl status'],
      source: 'https://wiki.archlinux.org/title/PipeWire',
      sourceLabel: 'Arch Wiki: PipeWire',
    },
  },
  {
    id: 'permissions',
    category: 'Uprawnienia',
    match: /permission denied|access denied|not permitted/i,
    fix: {
      title: 'Brak uprawnień',
      summary: 'Sprawdź właściciela i uprawnienia pliku. Unikaj używania sudo jako stałego rozwiązania.',
      commands: ['ls -l /sciezka/do/pliku', 'id'],
      source: 'https://wiki.archlinux.org/title/File_permissions_and_attributes',
      sourceLabel: 'Arch Wiki: File permissions',
    },
  },
  {
    id: 'disk-full',
    category: 'Dysk',
    match: /no space left on device|disk full|out of space|read-only file system/i,
    fix: {
      title: 'Brak miejsca lub system plików tylko do odczytu',
      summary: 'Sprawdź wolne miejsce i punkty montowania, zanim usuniesz dane.',
      commands: ['df -h', 'findmnt -no TARGET,OPTIONS /'],
      source: 'https://wiki.archlinux.org/title/File_systems',
      sourceLabel: 'Arch Wiki: File systems',
    },
  },
  {
    id: 'kernel-module',
    category: 'Kernel',
    match: /module .* not found|modprobe|kernel panic|invalid module format/i,
    fix: {
      title: 'Problem z modułem kernela',
      summary: 'Sprawdź wersję kernela, dostępne moduły i logi bieżącego uruchomienia.',
      commands: ['uname -r', 'journalctl -k -b --no-pager'],
      source: 'https://wiki.archlinux.org/title/Kernel_module',
      sourceLabel: 'Arch Wiki: Kernel module',
    },
  },
  {
    id: 'locale',
    category: 'System',
    match: /locale|failed to set locale|cannot set locale/i,
    fix: {
      title: 'Niepoprawna lokalizacja systemu',
      summary: 'Sprawdź wygenerowane locale i zgodność ustawień języka z plikiem locale.gen.',
      commands: ['locale', 'locale-gen'],
      source: 'https://wiki.archlinux.org/title/Locale',
      sourceLabel: 'Arch Wiki: Locale',
    },
  },
  {
    id: 'general-application-logs',
    category: 'Diagnostyka',
    match: /application|app|program|crash|crashed|debug|verbose|nie uruchamia|does not start/i,
    fix: {
      title: 'Zbierz pełny log aplikacji',
      summary: 'Uruchom program z terminala i zwiększ szczegółowość logów. Pełny komunikat często wskazuje zależność albo konfigurację, która powoduje problem.',
      commands: [
        'nazwa-programu --verbose',
        'nazwa-programu --debug',
        'journalctl --user -b --no-pager',
      ],
      source: 'https://wiki.archlinux.org/title/General_troubleshooting',
      sourceLabel: 'Arch Wiki: General troubleshooting',
    },
  },
  {
    id: 'general-journal-kernel',
    category: 'Diagnostyka',
    match: /journal|kernel|dmesg|kernel log|ring buffer|system froze|system freeze/i,
    fix: {
      title: 'Sprawdź dziennik systemu i kernela',
      summary: 'Journalctl zwykle daje pełniejszy obraz niż sam komunikat na ekranie. Zacznij od bieżącego uruchomienia i nie dodawaj -x, jeśli nie jest potrzebne.',
      commands: [
        'journalctl -b --no-pager',
        'journalctl -k -b --no-pager',
        'dmesg --level=err,warn',
      ],
      source: 'https://wiki.archlinux.org/title/General_troubleshooting',
      sourceLabel: 'Arch Wiki: General troubleshooting',
    },
  },
  {
    id: 'general-pacman-log',
    category: 'Diagnostyka',
    match: /pacman.*upgrade|upgrade.*broke|after update|after upgrade|pacman\.log/i,
    fix: {
      title: 'Sprawdź log ostatniej aktualizacji',
      summary: 'Jeśli problem pojawił się po aktualizacji, porównaj czas awarii z logiem Pacmana i dołącz pełny fragment do analizy.',
      commands: [
        'tail -n 100 /var/log/pacman.log',
        'pacman --debug -Syu',
      ],
      source: 'https://wiki.archlinux.org/title/General_troubleshooting',
      sourceLabel: 'Arch Wiki: General troubleshooting',
    },
  },
  {
    id: 'general-boot-stage',
    category: 'Uruchamianie',
    match: /boot fail|boot problem|does not boot|not booting|initramfs|boot loader|uefi|bios|secure boot/i,
    fix: {
      title: 'Ustal etap, na którym zatrzymuje się boot',
      summary: 'Rozróżnij firmware, bootloader, initramfs i uruchomiony system. Każdy etap ma inne logi i narzędzia diagnostyczne.',
      commands: [
        'journalctl -b --no-pager',
        'journalctl -k -b --no-pager',
        'lsblk -f',
        'efibootmgr -v',
      ],
      source: 'https://wiki.archlinux.org/title/General_troubleshooting',
      sourceLabel: 'Arch Wiki: General troubleshooting',
    },
  },
  {
    id: 'archwiki-http-429-user-agent',
    category: 'Sieć i WWW',
    match: /http.?429|too many requests|user.?agent|wiki.*blocked|bot protection/i,
    fix: {
      title: 'ArchWiki zwraca HTTP 429',
      summary: 'Sprawdź, czy klient nie wysyła starego lub nietypowego user-agenta, który może uruchamiać ochronę antybotową. Nie obchodź zabezpieczeń masowym ruchem.',
      commands: [
        "curl -A 'Mozilla/5.0' -I https://wiki.archlinux.org/",
        'curl -I https://wiki.archlinux.org/',
      ],
      source: 'https://bbs.archlinux.org/viewtopic.php?id=311901',
      sourceLabel: 'Arch Linux Forums: Wiki HTTP 429',
    },
  },
  {
    id: 'tmux-terminal-features',
    category: 'Terminal',
    match: /tmux|terminfo|truecolor|24.?bit color|terminal.?features|tput colors/i,
    fix: {
      title: 'Problem z kolorami lub możliwościami terminala w tmux',
      summary: 'Nie ustawiaj w ciemno TERM na wartość z zewnętrznego terminala. Sprawdź możliwości konsoli i skonfiguruj deklarowane cechy tmux.',
      commands: [
        'tput colors',
        'tmux info | grep -E "Tc|RGB|colors"',
      ],
      source: 'https://bbs.archlinux.org/viewtopic.php?id=309877',
      sourceLabel: 'Arch Linux Forums: tmux terminal settings',
    },
  },
  {
    id: 'debian-package-not-found',
    category: 'APT',
    distro: 'debian',
    match: /unable to locate package|has no installation candidate|package .* is not available/i,
    fix: {
      title: 'Pakiet nie został znaleziony',
      summary: 'Sprawdź nazwę pakietu oraz skonfigurowane repozytoria. Najpierw odśwież indeks pakietów, bez instalowania ani usuwania czegokolwiek.',
      commands: ['apt-cache search nazwa-pakietu', 'sudo apt update'],
      source: 'https://www.debian.org/doc/manuals/debian-handbook/sect.managing-packages.en.html',
      sourceLabel: 'Debian Handbook: Package management',
    },
  },
  {
    id: 'debian-dpkg-interrupted',
    category: 'DPKG',
    distro: 'debian',
    match: /dpkg was interrupted|run.*dpkg --configure -a|package is in a very bad inconsistent state/i,
    fix: {
      title: 'Przerwana konfiguracja pakietów',
      summary: 'Dokończ konfigurację wcześniej rozpakowanych pakietów, a następnie sprawdź, czy APT zgłasza brakujące zależności.',
      commands: ['sudo dpkg --configure -a', 'sudo apt-get check'],
      source: 'https://www.debian.org/doc/manuals/debian-handbook/sect.managing-packages.en.html',
      sourceLabel: 'Debian Handbook: Package management',
    },
  },
  {
    id: 'debian-unmet-dependencies',
    category: 'APT',
    distro: 'debian',
    match: /unmet dependencies|dependency problems|held broken packages|you have held broken packages/i,
    fix: {
      title: 'Niespełnione zależności pakietów',
      summary: 'Najpierw sprawdź stan zależności. Przed zaakceptowaniem naprawy dokładnie przeczytaj listę pakietów, które APT chce zmienić lub usunąć.',
      commands: ['sudo apt-get check', 'apt-mark showhold', 'sudo apt --fix-broken install'],
      source: 'https://wiki.debian.org/Apt',
      sourceLabel: 'Debian Wiki: Apt',
    },
  },
  {
    id: 'debian-apt-lock',
    category: 'APT',
    distro: 'debian',
    match: /could not get lock|unable to acquire the dpkg frontend lock|is another process using it/i,
    fix: {
      title: 'APT lub DPKG jest zajęty',
      summary: 'Sprawdź działające procesy i poczekaj na zakończenie aktualizacji. Nie usuwaj ręcznie plików blokady podczas pracy menedżera pakietów.',
      commands: ['ps aux | grep -E "[a]pt|[d]pkg"', 'systemctl status apt-daily.service apt-daily-upgrade.service'],
      source: 'https://wiki.debian.org/Apt',
      sourceLabel: 'Debian Wiki: Apt',
    },
  },
  {
    id: 'debian-repository-release',
    category: 'Repozytoria',
    distro: 'debian',
    match: /does not have a release file|repository .* is not signed|failed to fetch|temporary failure resolving/i,
    fix: {
      title: 'Problem z repozytorium APT',
      summary: 'Sprawdź adres repozytorium, nazwę wydania oraz połączenie sieciowe. Nie wyłączaj weryfikacji podpisów jako obejścia.',
      commands: ['grep -R "^deb" /etc/apt/sources.list /etc/apt/sources.list.d/', 'sudo apt update'],
      source: 'https://wiki.debian.org/Apt',
      sourceLabel: 'Debian Wiki: Apt',
    },
  },
];

export const exampleError =
  'error: failed to commit transaction (conflicting files)\nErrors occurred, no packages were upgraded.';

export const debianExampleError =
  'E: Unable to locate package example-package';
