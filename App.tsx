import { StatusBar } from 'expo-status-bar';
import { QuietHome } from './components/QuietHome';
import { DesignHome, type DesignMode } from './components/DesignHome';
import { DeveloperPanel } from './components/DeveloperPanel';
import { WorkspaceChrome } from './components/WorkspaceChrome';
import { createWorkspaceStyles, getWorkspacePalette } from './lib/workspaceDesign';
import { getDeveloperAccess, type DeveloperGrant } from './lib/developerAccess';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { PlayfairDisplay_600SemiBold } from '@expo-google-fonts/playfair-display/600SemiBold';
import { VT323_400Regular } from '@expo-google-fonts/vt323/400Regular';
import { type AudioPlayer, useAudioPlayer } from 'expo-audio';
import { useFonts } from 'expo-font';
import * as Haptics from 'expo-haptics';
import { createContext, type ReactNode, useContext, useEffect, useMemo, useRef, useState } from 'react';
import Svg, { Circle, Path, Polygon } from 'react-native-svg';
import {
  Animated,
  AppState,
  BackHandler,
  Image,
  type ImageSourcePropType,
  Linking,
  PanResponder,
  Platform,
  Pressable as NativePressable,
  type PressableProps,
  SafeAreaView,
  ScrollView,
  StatusBar as NativeStatusBar,
  StyleSheet,
  type StyleProp,
  Text as NativeText,
  type TextInputProps,
  TextInput as NativeTextInput,
  type TextProps,
  View,
  type ViewStyle,
} from 'react-native';
import { debianExampleError, errorDatabase, exampleError, type ErrorRule } from './data/errorDatabase';
import { localizedCategory, localizedFix } from './data/errorDatabaseTranslations';
import { legalDocuments, type LegalDocumentId } from './data/legalContent';
import { supabase, supabaseConfigured } from './lib/supabase';

type Distro = 'arch' | 'debian' | 'fedora' | 'nixos' | 'cachyos';
type WorkspaceTarget = Distro | 'ui';
type AiStep = { description: string; command: string; risk: 'low' | 'medium' | 'high' };
type AiResult = {
  title: string;
  cause: string;
  confidence: number;
  steps: AiStep[];
  sources: Array<{ title: string; url: string }>;
};
type AiStatus = 'checking' | 'online' | 'offline';
type Language = 'pl' | 'en';
type ThemeMode = 'dark' | 'light';
type ColorTheme = 'basic' | 'rgb' | 'pinkNeon' | 'medievalAutumn';
type FontTheme = 'system' | 'terminal' | 'elegant';
type UpcomingDistribution = {
  name: string;
  logo: ImageSourcePropType;
};
type UiPalette = {
  background: string;
  surface: string;
  inset: string;
  accent: string;
  muted: string;
  text: string;
  hot: string;
  onAccent: string;
};
type HistoryItem = { role: 'user' | 'assistant'; content: string; createdAt?: string };
type RevealedText = { text: string; visible: boolean; active: boolean };
type GlassPiece = {
  id: string;
  points: string;
  x: number;
  y: number;
  rotate: number;
  start: number;
  tone: 'surface' | 'inset' | 'accent' | 'muted' | 'text';
};
type GlassSplinterGroup = {
  id: string;
  polygons: string[];
  x: number;
  y: number;
  rotate: number;
  start: number;
  tone: 'accent' | 'muted' | 'text';
};

const BACKEND_CONFIG_URL = 'https://raw.githubusercontent.com/szen1zzz/linuxfix-config/main/config.json';
const DEFAULT_BACKEND_URL = '';
const PRIVACY_CONSENT_KEY = 'linuxfix.privacy-consent';
const PRIVACY_CONSENT_VERSION = '2026-09-30';
const COLOR_THEME_KEY = 'linuxfix.color-theme';
const DESIGN_MODE_KEY = 'linuxfix.developer-design-mode';
const SOUND_ENABLED_KEY = 'linuxfix.sound-enabled';
const EFFECTS_ENABLED_KEY = 'linuxfix.effects-enabled';
const TILE_MOTION_ENABLED_KEY = 'linuxfix.tile-motion-enabled';
const FONT_THEME_KEY = 'linuxfix.font-theme';
const ACCOUNT_SESSION_STARTED_KEY = 'linuxfix.account-session-started';
const ACCOUNT_SESSION_TTL_MS = 30 * 24 * 60 * 60 * 1000;
const USERNAME_PATTERN = /^[a-z0-9_]{3,24}$/;
const USERNAME_AUTH_DOMAIN = 'login.linuxfix.invalid';
const MINIMUM_PASSWORD_LENGTH = 12;
const AI_ANALYSIS_TIMEOUT_MS = 100_000;
const AI_HEALTH_TIMEOUT_MS = 4_000;
const AI_HEALTH_INTERVAL_MS = 15_000;
const BACKEND_CONFIG_REFRESH_INTERVAL_MS = 30_000;
const AI_TYPING_CHUNK_SIZE = 3;
const AI_TYPING_BASE_DELAY_MS = 52;
const AI_TYPING_WORD_PAUSE_MS = 66;
const AI_TYPING_COMMA_PAUSE_MS = 112;
const AI_TYPING_SENTENCE_PAUSE_MS = 190;
const AI_TYPING_HAPTIC_INTERVAL_CHARS = 18;
const AI_CAMERA_FOLLOW_CHARS = 18;

const normalizedAccountIdentifier = (value: string) => value.trim().toLowerCase();

const accountEmailFromIdentifier = (value: string) => {
  const identifier = normalizedAccountIdentifier(value);
  return identifier.includes('@') ? identifier : `${identifier}@${USERNAME_AUTH_DOMAIN}`;
};

const UPCOMING_DISTRIBUTIONS: UpcomingDistribution[] = [
  {
    name: 'Ubuntu',
    logo: require('./assets/linuxfix-ubuntu-user.jpg'),
  },
  {
    name: 'Tails OS',
    logo: require('./assets/linuxfix-tails-user.jpg'),
  },
];

const DISTRO_LOGOS: Record<Distro, ImageSourcePropType> = {
  arch: require('./assets/linuxfix-arch-icon.jpg'),
  debian: require('./assets/linuxfix-debian-icon.jpg'),
  fedora: require('./assets/linuxfix-fedora-icon.jpg'),
  nixos: require('./assets/linuxfix-nixos-user.jpg'),
  cachyos: require('./assets/linuxfix-cachyos-user.jpg'),
};

const DISTRO_WORKSPACE_COPY: Record<Distro, { en: string; pl: string }> = {
  arch: {
    pl: 'Pacman, systemd i ArchWiki w jednym miejscu.',
    en: 'Pacman, systemd, and ArchWiki in one workspace.',
  },
  debian: {
    pl: 'APT, usługi systemowe i stabilna diagnostyka.',
    en: 'APT, system services, and stable diagnostics.',
  },
  fedora: {
    pl: 'DNF, RPM, SELinux i diagnostyka systemd.',
    en: 'DNF, RPM, SELinux, and systemd diagnostics.',
  },
  nixos: {
    pl: 'Konfiguracja deklaratywna, Nix i bezpieczne przebudowy systemu.',
    en: 'Declarative configuration, Nix, and safe system rebuilds.',
  },
  cachyos: {
    pl: 'Pacman, kerneli CachyOS, mirrory i wydajność systemu.',
    en: 'Pacman, CachyOS kernels, mirrors, and system performance.',
  },
};

const DISTRO_EXAMPLES: Record<Distro, string> = {
  arch: exampleError,
  debian: debianExampleError,
  fedora: 'Error: Unable to find a match: example-package',
  nixos: "error: attribute 'example-package' missing",
  cachyos: 'error: signature from key is unknown trust\nerror: failed to commit transaction',
};

const aiResultTextLength = (result: AiResult) => [
  result.title,
  result.cause,
  ...result.steps.flatMap((step) => [step.description, step.command]),
  ...result.sources.map((source) => source.title),
].reduce((total, value) => total + value.length + 3, 0);

const FontFamilyContext = createContext<string | undefined>(undefined);

function Text({ style, ...props }: TextProps) {
  const fontFamily = useContext(FontFamilyContext);
  const flattenedStyle = fontFamily === 'LinuxFIXTerminal' ? StyleSheet.flatten(style) : undefined;
  const terminalFontSize = typeof flattenedStyle?.fontSize === 'number'
    ? Math.max(Math.round(flattenedStyle.fontSize * 1.08), 9)
    : undefined;
  const terminalLineHeight = typeof flattenedStyle?.lineHeight === 'number'
    ? Math.max(Math.round(flattenedStyle.lineHeight * 1.08), (terminalFontSize ?? 0) + 2)
    : undefined;
  const fontOverride = fontFamily === 'LinuxFIXTerminal'
    ? {
        fontFamily,
        fontWeight: '700' as const,
        ...(terminalFontSize ? { fontSize: terminalFontSize } : {}),
        ...(terminalLineHeight ? { lineHeight: terminalLineHeight } : {}),
        textShadowColor: 'rgba(218,234,255,0.22)',
        textShadowOffset: { width: 0, height: 0 },
        textShadowRadius: 0.45,
      }
    : fontFamily ? { fontFamily, fontWeight: 'normal' as const } : undefined;
  return <NativeText {...props} style={[style, fontOverride]} />;
}

function TextInput({ style, ...props }: TextInputProps) {
  const fontFamily = useContext(FontFamilyContext);
  const flattenedStyle = fontFamily === 'LinuxFIXTerminal' ? StyleSheet.flatten(style) : undefined;
  const terminalFontSize = typeof flattenedStyle?.fontSize === 'number'
    ? Math.max(Math.round(flattenedStyle.fontSize * 1.08), 14)
    : undefined;
  const terminalLineHeight = typeof flattenedStyle?.lineHeight === 'number'
    ? Math.max(Math.round(flattenedStyle.lineHeight * 1.08), (terminalFontSize ?? 0) + 3)
    : undefined;
  const fontOverride = fontFamily === 'LinuxFIXTerminal'
    ? {
        fontFamily,
        fontWeight: '700' as const,
        ...(terminalFontSize ? { fontSize: terminalFontSize } : {}),
        ...(terminalLineHeight ? { lineHeight: terminalLineHeight } : {}),
      }
    : fontFamily ? { fontFamily, fontWeight: 'normal' as const } : undefined;
  return <NativeTextInput {...props} style={[style, fontOverride]} />;
}

function Pressable({ disabled, style, ...props }: PressableProps) {
  return (
    <NativePressable
      {...props}
      disabled={disabled}
      style={(state) => [
        typeof style === 'function' ? style(state) : style,
        state.pressed && !disabled
          ? { opacity: 0.94, transform: [{ translateY: -2 }, { scale: 1.012 }] }
          : undefined,
      ]}
    />
  );
}

function MagneticTile({ children, enabled, style }: { children: ReactNode; enabled: boolean; style?: StyleProp<ViewStyle> }) {
  const motion = useRef(new Animated.ValueXY()).current;
  const focus = useRef(new Animated.Value(0)).current;

  const reset = () => {
    motion.stopAnimation();
    focus.stopAnimation();
    Animated.parallel([
      Animated.spring(motion, {
        bounciness: 2,
        speed: 30,
        toValue: { x: 0, y: 0 },
        useNativeDriver: false,
      }),
      Animated.spring(focus, {
        bounciness: 1,
        speed: 32,
        toValue: 0,
        useNativeDriver: false,
      }),
    ]).start();
  };

  const responder = useMemo(() => PanResponder.create({
    onMoveShouldSetPanResponder: (_event, gesture) => enabled
      && Math.hypot(gesture.dx, gesture.dy) > 3
      && Math.abs(gesture.dx) > Math.abs(gesture.dy) * 0.8,
    onMoveShouldSetPanResponderCapture: (_event, gesture) => enabled
      && Math.hypot(gesture.dx, gesture.dy) > 3
      && Math.abs(gesture.dx) > Math.abs(gesture.dy) * 0.8,
    onPanResponderGrant: () => {
      motion.stopAnimation();
      focus.stopAnimation();
    },
    onPanResponderMove: (_event, gesture) => {
      const intensity = Math.min(1, Math.hypot(gesture.dx, gesture.dy) / 54);
      motion.setValue({
        x: Math.max(-8, Math.min(8, gesture.dx * 0.09)),
        y: -2 - intensity * 5,
      });
      focus.setValue(intensity);
    },
    onPanResponderRelease: reset,
    onPanResponderTerminate: reset,
    onPanResponderTerminationRequest: () => true,
    onStartShouldSetPanResponder: () => false,
  }), [enabled]);

  useEffect(() => {
    if (!enabled) {
      motion.setValue({ x: 0, y: 0 });
      focus.setValue(0);
    }
  }, [enabled, focus, motion]);

  return (
    <Animated.View
      {...responder.panHandlers}
      style={[
        style,
        {
          transform: [
            ...motion.getTranslateTransform(),
            { scale: focus.interpolate({ inputRange: [0, 1], outputRange: [1, 1.018] }) },
          ],
        },
      ]}
    >
      {children}
    </Animated.View>
  );
}

const uiPalettes: Record<ColorTheme, UiPalette> = {
  basic: {
    background: '#101C24', surface: '#1B2C37', inset: '#101C24', accent: '#82B6D9',
    muted: '#B6C7D1', text: '#EDF3F5', hot: '#EDF3F5', onAccent: '#101C24',
  },
  rgb: {
    background: '#05040A', surface: '#0B0D18', inset: '#090312', accent: '#00F5FF',
    muted: '#6DFF3A', text: '#FFFFFF', hot: '#FF2FD1', onAccent: '#05040A',
  },
  pinkNeon: {
    background: '#120223', surface: '#430357', inset: '#6E022F', accent: '#C40361',
    muted: '#D15BCB', text: '#FFE9F8', hot: '#8C0286', onAccent: '#120223',
  },
  medievalAutumn: {
    background: '#242423', surface: '#854D34', inset: '#BB794C', accent: '#DEB308',
    muted: '#D8C886', text: '#FFF7DD', hot: '#A59257', onAccent: '#242423',
  },
};

const GLASS_PIECES: GlassPiece[] = [
  { id: 'outer-north-west', points: '0,0 27,0 45,34 32,47 0,28', x: -25, y: -18, rotate: -7, start: 0.2, tone: 'surface' },
  { id: 'outer-north', points: '27,0 55,0 58,23 45,34', x: -8, y: -26, rotate: 6, start: 0.17, tone: 'inset' },
  { id: 'outer-north-east', points: '55,0 78,0 72,33 58,23', x: 11, y: -28, rotate: -5, start: 0.19, tone: 'surface' },
  { id: 'outer-corner-north-east', points: '78,0 100,0 100,26 83,47 72,33', x: 28, y: -19, rotate: 9, start: 0.23, tone: 'accent' },
  { id: 'outer-east', points: '100,26 100,61 72,59 83,47', x: 32, y: 1, rotate: 8, start: 0.2, tone: 'surface' },
  { id: 'outer-south-east', points: '100,61 100,100 78,100 60,70 72,59', x: 27, y: 23, rotate: -8, start: 0.24, tone: 'inset' },
  { id: 'outer-south', points: '78,100 52,100 44,61 60,70', x: 7, y: 29, rotate: 6, start: 0.21, tone: 'surface' },
  { id: 'outer-south-west', points: '52,100 24,100 32,47 44,61', x: -12, y: 29, rotate: -7, start: 0.18, tone: 'muted' },
  { id: 'outer-corner-south-west', points: '24,100 0,100 0,58 32,47', x: -29, y: 22, rotate: 9, start: 0.23, tone: 'surface' },
  { id: 'outer-west', points: '0,58 0,28 32,47', x: -33, y: 0, rotate: -10, start: 0.2, tone: 'inset' },
  { id: 'inner-north-west', points: '45,34 58,23 58,46', x: -10, y: -16, rotate: -9, start: 0.11, tone: 'text' },
  { id: 'inner-north-east', points: '58,23 72,33 58,46', x: 8, y: -17, rotate: 8, start: 0.1, tone: 'surface' },
  { id: 'inner-east', points: '72,33 83,47 58,46', x: 17, y: -5, rotate: 11, start: 0.13, tone: 'accent' },
  { id: 'inner-south-east', points: '83,47 72,59 58,46', x: 16, y: 10, rotate: -9, start: 0.14, tone: 'surface' },
  { id: 'inner-south', points: '72,59 60,70 58,46', x: 4, y: 17, rotate: 8, start: 0.12, tone: 'inset' },
  { id: 'inner-south-west', points: '60,70 44,61 58,46', x: -6, y: 17, rotate: -8, start: 0.11, tone: 'surface' },
  { id: 'inner-west', points: '44,61 32,47 58,46', x: -18, y: 7, rotate: 10, start: 0.14, tone: 'muted' },
  { id: 'inner-north-west-edge', points: '32,47 45,34 58,46', x: -17, y: -8, rotate: -11, start: 0.13, tone: 'surface' },
];

const GLASS_HAIRLINE_PATHS = [
  'M45 34 L39 23 L41 15',
  'M39 23 L31 19 L25 10',
  'M58 23 L61 13 L59 5',
  'M72 33 L82 21 L88 17',
  'M82 21 L78 13 L82 5',
  'M83 47 L91 42 L98 43',
  'M91 42 L95 34 L100 31',
  'M72 59 L84 70 L89 80',
  'M84 70 L93 69 L100 74',
  'M60 70 L64 84 L61 96',
  'M44 61 L37 76 L39 91',
  'M37 76 L29 80 L23 90',
  'M32 47 L18 43 L8 47',
  'M18 43 L14 35 L4 31',
];

const GLASS_SPLINTER_GROUPS: GlassSplinterGroup[] = [
  {
    id: 'splinters-north-west',
    polygons: ['50,40 54,37 53,44', '43,31 47,29 46,35', '35,21 39,20 37,26'],
    x: -24, y: -25, rotate: -13, start: 0.045, tone: 'text',
  },
  {
    id: 'splinters-north-east',
    polygons: ['63,40 67,37 66,44', '72,29 76,27 74,34', '84,20 88,18 86,25'],
    x: 27, y: -23, rotate: 15, start: 0.055, tone: 'accent',
  },
  {
    id: 'splinters-south-east',
    polygons: ['65,53 70,54 67,59', '76,64 81,65 78,70', '88,78 93,80 89,84'],
    x: 29, y: 26, rotate: -12, start: 0.07, tone: 'muted',
  },
  {
    id: 'splinters-south-west',
    polygons: ['50,54 46,57 51,60', '39,65 34,67 38,71', '24,78 19,81 24,84'],
    x: -28, y: 27, rotate: 14, start: 0.065, tone: 'accent',
  },
];

function normalizeBackendUrl(value: unknown): string | null {
  if (typeof value !== 'string' || !value.trim()) return null;

  try {
    const url = new URL(value.trim());
    const isLocalNetworkHost = url.hostname === 'localhost'
      || url.hostname === '127.0.0.1'
      || url.hostname === '::1'
      || /^10\./.test(url.hostname)
      || /^192\.168\./.test(url.hostname)
      || /^172\.(1[6-9]|2\d|3[01])\./.test(url.hostname);
    if (url.username || url.password) return null;
    if (url.protocol !== 'https:' && !(url.protocol === 'http:' && isLocalNetworkHost)) return null;
    return url.toString().replace(/\/+$/, '');
  } catch {
    return null;
  }
}

async function fetchWithTimeout(url: string, init?: RequestInit, timeoutMs = 15_000) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);
  try {
    return await fetch(url, { ...init, signal: controller.signal });
  } finally {
    clearTimeout(timeout);
  }
}

async function readJsonResponse(response: Response): Promise<unknown> {
  const text = await response.text();
  try {
    return JSON.parse(text);
  } catch {
    const detail = text.trim().replace(/\s+/g, ' ').slice(0, 160);
    throw new Error(detail
      ? `Backend HTTP ${response.status}: ${detail}`
      : `Backend HTTP ${response.status} zwrócił pustą odpowiedź.`);
  }
}

function responseError(payload: unknown, status: number) {
  if (payload && typeof payload === 'object' && !Array.isArray(payload)) {
    const error = (payload as Record<string, unknown>).error;
    if (typeof error === 'string' && error.trim()) return error;
  }
  return `Backend zwrócił HTTP ${status}.`;
}

function isAiResult(value: unknown): value is AiResult {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return false;
  const result = value as Record<string, unknown>;
  return (
    typeof result.title === 'string'
    && typeof result.cause === 'string'
    && typeof result.confidence === 'number'
    && result.confidence >= 0
    && result.confidence <= 1
    && Array.isArray(result.steps)
    && result.steps.every((step) => {
      if (!step || typeof step !== 'object' || Array.isArray(step)) return false;
      const item = step as Record<string, unknown>;
      return typeof item.description === 'string'
        && typeof item.command === 'string'
        && (item.risk === 'low' || item.risk === 'medium' || item.risk === 'high');
    })
    && Array.isArray(result.sources)
    && result.sources.every((source) => {
      if (!source || typeof source !== 'object' || Array.isArray(source)) return false;
      const item = source as Record<string, unknown>;
      return typeof item.title === 'string' && typeof item.url === 'string';
    })
  );
}

function readableError(error: unknown, language: Language, fallbackPl: string, fallbackEn: string) {
  if (error instanceof Error && error.name === 'AbortError') {
    return language === 'pl' ? 'Przekroczono czas oczekiwania na backend.' : 'The backend request timed out.';
  }
  if (error instanceof Error && error.message) return error.message;
  return language === 'pl' ? fallbackPl : fallbackEn;
}

const themes = {
  arch: {
    accent: '#DAEAFF',
    soft: '#DAEAFF',
    border: '#022E5B',
    label: 'ARCH LINUX',
    description: 'Pacman, ArchWiki i szybka diagnoza systemu.',
  },
  debian: {
    accent: '#DAEAFF',
    soft: '#A1C6F6',
    border: '#499BED',
    label: 'DEBIAN',
    description: 'Ten sam silnik naprawy w pomarańczowo-czerwonym motywie.',
  },
  fedora: {
    accent: '#A1C6F6',
    soft: '#DAEAFF',
    border: '#499BED',
    label: 'FEDORA',
    description: 'DNF, RPM, SELinux i systemd.',
  },
  nixos: {
    accent: '#A1C6F6',
    soft: '#DAEAFF',
    border: '#499BED',
    label: 'NIXOS',
    description: 'Nix, konfiguracja deklaratywna i rebuildy.',
  },
  cachyos: {
    accent: '#499BED',
    soft: '#DAEAFF',
    border: '#A1C6F6',
    label: 'CACHYOS',
    description: 'Pacman, zoptymalizowane repozytoria i kerneli.',
  },
} as const;

export default function App() {
  const [fontsLoaded] = useFonts({
    LinuxFIXTerminal: VT323_400Regular,
    LinuxFIXElegant: PlayfairDisplay_600SemiBold,
  });
  const [booting, setBooting] = useState(true);
  const [language, setLanguage] = useState<Language>('pl');
  const [themeMode, setThemeMode] = useState<ThemeMode>('dark');
  const [colorTheme, setColorTheme] = useState<ColorTheme>('basic');
  const [fontTheme, setFontTheme] = useState<FontTheme>('system');
  const [soundEnabled, setSoundEnabled] = useState(true);
  const [effectsEnabled, setEffectsEnabled] = useState(true);
  const [tileMotionEnabled, setTileMotionEnabled] = useState(true);
  const [preferencesLoaded, setPreferencesLoaded] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [showSystemSettings, setShowSystemSettings] = useState(false);
  const [showAccount, setShowAccount] = useState(false);
  const [showHistory, setShowHistory] = useState(false);
  const [accountMode, setAccountMode] = useState<'login' | 'register'>('login');
  const [accountIdentifier, setAccountIdentifier] = useState('');
  const [accountPassword, setAccountPassword] = useState('');
  const [newAccountPassword, setNewAccountPassword] = useState('');
  const [accountToken, setAccountToken] = useState('');
  const [accountUserId, setAccountUserId] = useState('');
  const [accountError, setAccountError] = useState('');
  const [accountNotice, setAccountNotice] = useState('');
  const [accountLoading, setAccountLoading] = useState(false);
  const [confirmDeleteAccount, setConfirmDeleteAccount] = useState(false);
  const [developerGrant, setDeveloperGrant] = useState<DeveloperGrant | null>(null);
  const developerAccess = getDeveloperAccess(developerGrant, accountUserId);
  const [showDeveloperPanel, setShowDeveloperPanel] = useState(false);
  const [designMode, setDesignMode] = useState<DesignMode>('current');
  const [devSlowTyping, setDevSlowTyping] = useState(false);
  const [devGodMode, setDevGodMode] = useState(false);
  const [devInstantAiReveal, setDevInstantAiReveal] = useState(false);
  const [devOfflinePreview, setDevOfflinePreview] = useState(false);
  const [history, setHistory] = useState<HistoryItem[]>([]);
  const [privacyConsent, setPrivacyConsent] = useState(false);
  const [showPrivacyConsent, setShowPrivacyConsent] = useState(false);
  const [ageConfirmed, setAgeConfirmed] = useState(false);
  const [dataConsent, setDataConsent] = useState(false);
  const [legalDocument, setLegalDocument] = useState<LegalDocumentId | null>(null);
  const bootPulse = useRef(new Animated.Value(0)).current;
  const bootRotation = useRef(new Animated.Value(0)).current;
  const aiRotation = useRef(new Animated.Value(0)).current;
  const aiPanelReveal = useRef(new Animated.Value(0)).current;
  const aiCursorBlink = useRef(new Animated.Value(1)).current;
  const typingMotion = useRef(new Animated.Value(0)).current;
  const workspaceReveal = useRef(new Animated.Value(0)).current;
  const menuReveal = useRef(new Animated.Value(0)).current;
  const menuActivity = useRef(new Animated.Value(0)).current;
  const uiModalReveal = useRef(new Animated.Value(0)).current;
  const rgbColorCycle = useRef(new Animated.Value(0)).current;
  const rgbMotionCycle = useRef(new Animated.Value(0)).current;
  const distroLoadingRotation = useRef(new Animated.Value(0)).current;
  const tileCrumble = useRef(new Animated.Value(0)).current;
  const distroIconMotion = useRef(UPCOMING_DISTRIBUTIONS.map(() => new Animated.ValueXY())).current;
  const distroIconFocus = useRef(UPCOMING_DISTRIBUTIONS.map(() => new Animated.Value(0))).current;
  const distroIconRailSize = useRef({ height: 1, width: 1 });
  const distroIconTouchStart = useRef({ x: 0, y: 0 });
  const shatterScatter = useRef(GLASS_PIECES.map(({ x, y, rotate }) => ({ x, y, rotate })));
  const bootSoundPlayed = useRef(false);
  const previousAiStatus = useRef<AiStatus>('checking');
  const workspaceExitRunning = useRef(false);
  const workspaceScrollRef = useRef<ScrollView | null>(null);
  const lastAiAutoScrollChars = useRef(0);
  const healthCheckRequest = useRef(0);
  const bootPlayer = useAudioPlayer(require('./assets/sounds/boot.wav'));
  const connectedPlayer = useAudioPlayer(require('./assets/sounds/connected.wav'));
  const switchPlayer = useAudioPlayer(require('./assets/sounds/switch.wav'));
  const glassPlayer = useAudioPlayer(require('./assets/sounds/switch.wav'));
  const glassTailPlayer = useAudioPlayer(require('./assets/sounds/switch.wav'));
  const whooshPlayer = useAudioPlayer(require('./assets/sounds/boot.wav'));
  const [isProblemFocused, setIsProblemFocused] = useState(false);
  const [crumblingWorkspace, setCrumblingWorkspace] = useState<WorkspaceTarget | null>(null);
  const [pendingWorkspace, setPendingWorkspace] = useState<WorkspaceTarget | null>(null);
  const [distro, setDistro] = useState<Distro | null>(null);
  const [problem, setProblem] = useState('');
  const [result, setResult] = useState<ErrorRule | null>(null);
  const [searched, setSearched] = useState(false);
  const [suggestions, setSuggestions] = useState<ErrorRule[]>([]);
  const [aiResult, setAiResult] = useState<AiResult | null>(null);
  const [aiRevealChars, setAiRevealChars] = useState(0);
  const [aiTyping, setAiTyping] = useState(false);
  const [aiLoading, setAiLoading] = useState(false);
  const [aiError, setAiError] = useState('');
  const [backendUrl, setBackendUrl] = useState(DEFAULT_BACKEND_URL);
  const [showHostSettings, setShowHostSettings] = useState(false);
  const [aiStatus, setAiStatus] = useState<AiStatus>('checking');
  const selectedDesignMode = developerAccess ? designMode : 'current';
  const activePalette = getWorkspacePalette(selectedDesignMode, themeMode === 'light', uiPalettes[colorTheme]);
  const workspaceStyles = useMemo(() => createWorkspaceStyles(selectedDesignMode, activePalette), [selectedDesignMode, activePalette]);
  const customThemeEnabled = colorTheme !== 'basic' || selectedDesignMode !== 'current';
  const rgbEnabled = selectedDesignMode === 'current' && colorTheme === 'rgb';
  const customThemeDark = customThemeEnabled && themeMode === 'dark';
  const aiPanelVisible = aiLoading || aiResult !== null;
  const aiPanelColors = activePalette;
  const selectedFontFamily = fontsLoaded
    ? fontTheme === 'terminal'
      ? 'LinuxFIXTerminal'
      : fontTheme === 'elegant'
        ? 'LinuxFIXElegant'
        : selectedDesignMode === 'classic'
          ? 'LinuxFIXTerminal'
          : selectedDesignMode === 'atelier'
            ? 'LinuxFIXElegant'
            : undefined
    : undefined;
  const analysisHistoryCount = useMemo(
    () => history.filter((item) => item.role === 'user').length,
    [history],
  );
  const tileMotionActive = effectsEnabled && tileMotionEnabled;
  const uiTileRenderKey = [
    'ui-tile',
    crumblingWorkspace === 'ui' ? 'crumbling' : 'idle',
    showSettings ? 'settings-open' : 'menu',
    language,
    themeMode,
    colorTheme,
    fontTheme,
    effectsEnabled ? 'effects-on' : 'effects-off',
    tileMotionEnabled ? 'tile-motion-on' : 'tile-motion-off',
    soundEnabled ? 'sound-on' : 'sound-off',
  ].join(':');
  const paletteStyles = useMemo(() => StyleSheet.create({
    root: { backgroundColor: activePalette.background },
    panel: { backgroundColor: activePalette.surface },
    inset: { backgroundColor: activePalette.inset },
    bar: { backgroundColor: activePalette.accent },
    text: { color: activePalette.text },
    mutedText: { color: activePalette.muted },
    accentText: { color: activePalette.accent },
    hotText: { color: activePalette.hot },
    border: { borderColor: activePalette.accent },
  }), [activePalette]);
  const animatedRgbColor = rgbColorCycle.interpolate({
    inputRange: [0, 0.14, 0.28, 0.42, 0.57, 0.71, 0.85, 1],
    outputRange: ['#FF315C', '#FFB000', '#FFF500', '#28FF6A', '#00F5FF', '#3D7BFF', '#D431FF', '#FF315C'],
  });
  const theme = themes[distro ?? 'arch'];
  const copy = language === 'pl'
    ? {
        choose: 'Wybierz dystrybucję.', subtitle: 'Wklej błąd albo zapytaj, jak coś zrobić. LinuxFIX poda krótkie, bezpieczne kroki.',
        analyze: 'SZUKAJ W BAZIE', ai: 'ZAPYTAJ AI', ready: 'GOTOWE',
        matched: 'DOPASOWANE ROZWIĄZANIE', settings: 'USTAWIENIA', account: 'KONTO',
        loading: 'ŁĄCZENIE Z AI...', loadingSub: 'Sprawdzanie bezpiecznego połączenia z hostem',
        light: 'JASNY', dark: 'CIEMNY', polish: 'POLSKI', english: 'ENGLISH',
        login: 'ZALOGUJ SIĘ', register: 'UTWÓRZ KONTO', logout: 'WYLOGUJ', history: 'HISTORIA AI',
        important: 'WAŻNE',
        importantText: 'LinuxFIX podpowiada, ale nie wykonuje komend za Ciebie. Zawsze sprawdź polecenia i źródło przed uruchomieniem.',
      }
    : {
        choose: 'Choose a distribution.', subtitle: 'Paste an error or ask how to do something. LinuxFIX will suggest short, safe steps.',
        analyze: 'SEARCH LOCAL RULES', ai: 'ASK AI', ready: 'READY',
        matched: 'MATCHED SOLUTION', settings: 'SETTINGS', account: 'ACCOUNT',
        loading: 'CONNECTING TO AI...', loadingSub: 'Checking a secure connection to the host',
        light: 'LIGHT', dark: 'DARK', polish: 'POLISH', english: 'ENGLISH',
        login: 'LOG IN', register: 'CREATE ACCOUNT', logout: 'LOG OUT', history: 'AI HISTORY',
        important: 'IMPORTANT',
        importantText: 'LinuxFIX provides suggestions but does not run commands for you. Always review commands and sources before running them.',
      };

  const playSound = (player: AudioPlayer, force = false) => {
    if ((!soundEnabled && !force) || !preferencesLoaded) return;
    void player.seekTo(0).then(() => player.play()).catch(() => {
      try {
        player.play();
      } catch {
        // Audio is optional and must never block the interface.
      }
    });
  };

  const triggerTileHaptic = () => {
    if (!effectsEnabled) return;
    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => undefined);
    setTimeout(() => {
      void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => undefined);
    }, 85);
  };

  const triggerTypingHaptic = () => {
    if (!effectsEnabled) return;
    const feedback = Platform.OS === 'android'
      ? Haptics.performAndroidHapticsAsync(Haptics.AndroidHaptics.Segment_Frequent_Tick)
      : Haptics.selectionAsync();
    void feedback.catch(() => undefined);
  };

  const selectColorTheme = (nextTheme: ColorTheme) => {
    setColorTheme(nextTheme);
    if (nextTheme !== 'basic') setThemeMode('dark');
    void AsyncStorage.setItem(COLOR_THEME_KEY, nextTheme);
    playSound(switchPlayer);
  };

  const selectFontTheme = (nextTheme: FontTheme) => {
    setFontTheme(nextTheme);
    void AsyncStorage.setItem(FONT_THEME_KEY, nextTheme);
    playSound(switchPlayer);
  };

  const toggleSound = () => {
    const nextValue = !soundEnabled;
    setSoundEnabled(nextValue);
    void AsyncStorage.setItem(SOUND_ENABLED_KEY, nextValue ? 'true' : 'false');
    if (nextValue && preferencesLoaded) {
      void switchPlayer.seekTo(0).then(() => switchPlayer.play()).catch(() => undefined);
    }
  };

  const toggleEffects = () => {
    const nextValue = !effectsEnabled;
    setEffectsEnabled(nextValue);
    void AsyncStorage.setItem(EFFECTS_ENABLED_KEY, nextValue ? 'true' : 'false');
    if (nextValue) playSound(switchPlayer);
  };

  const toggleTileMotion = () => {
    const nextValue = !tileMotionEnabled;
    setTileMotionEnabled(nextValue);
    void AsyncStorage.setItem(TILE_MOTION_ENABLED_KEY, nextValue ? 'true' : 'false');
    if (nextValue) playSound(switchPlayer);
  };

  useEffect(() => {
    glassPlayer.volume = 0.42;
    glassPlayer.setPlaybackRate(1.55);
    glassTailPlayer.volume = 0.22;
    glassTailPlayer.setPlaybackRate(0.82);
    whooshPlayer.volume = 0.2;
    whooshPlayer.setPlaybackRate(0.92);
  }, [glassPlayer, glassTailPlayer, whooshPlayer]);

  useEffect(() => {
    if (!aiResult) {
      setAiRevealChars(0);
      setAiTyping(false);
      return;
    }

    const totalCharacters = aiResultTextLength(aiResult);
    if (!effectsEnabled || (developerAccess === 'admin' && devGodMode && devInstantAiReveal)) {
      setAiRevealChars(totalCharacters);
      setAiTyping(false);
      return;
    }

    let visibleCharacters = 0;
    let charactersSinceHaptic = 0;
    let typingTimer: ReturnType<typeof setTimeout> | undefined;
    let finishScrollTimer: ReturnType<typeof setTimeout> | undefined;
    let cancelled = false;
    const typingSequence = [
      aiResult.title,
      aiResult.cause,
      ...aiResult.steps.flatMap((step) => [step.description, step.command]),
      ...aiResult.sources.map((source) => source.title),
    ].map((value) => `${value}   `).join('');
    setAiRevealChars(0);
    setAiTyping(true);

    const revealNextCharacters = () => {
      if (cancelled) return;
      const currentCharacter = typingSequence[visibleCharacters] ?? '';
      const chunkSize = /[.!?;:\n]/.test(currentCharacter) ? 1 : AI_TYPING_CHUNK_SIZE;
      visibleCharacters = Math.min(totalCharacters, visibleCharacters + chunkSize);
      setAiRevealChars(visibleCharacters);
      charactersSinceHaptic += chunkSize;
      if (visibleCharacters === chunkSize || charactersSinceHaptic >= AI_TYPING_HAPTIC_INTERVAL_CHARS) {
        triggerTypingHaptic();
        charactersSinceHaptic = 0;
      }
      if (visibleCharacters >= totalCharacters) {
        setAiTyping(false);
        finishScrollTimer = setTimeout(() => workspaceScrollRef.current?.scrollToEnd({ animated: true }), 80);
        return;
      }

      const typingDelay = /[.!?]/.test(currentCharacter)
        ? AI_TYPING_SENTENCE_PAUSE_MS
        : /[,;:]/.test(currentCharacter)
          ? AI_TYPING_COMMA_PAUSE_MS
          : /\s/.test(currentCharacter)
            ? AI_TYPING_WORD_PAUSE_MS
            : AI_TYPING_BASE_DELAY_MS;
      typingTimer = setTimeout(revealNextCharacters, typingDelay * (developerAccess && devSlowTyping ? 2.4 : 1));
    };

    typingTimer = setTimeout(revealNextCharacters, 220);

    return () => {
      cancelled = true;
      if (typingTimer) clearTimeout(typingTimer);
      if (finishScrollTimer) clearTimeout(finishScrollTimer);
    };
  }, [aiResult, developerAccess, devGodMode, devInstantAiReveal, devSlowTyping, effectsEnabled]);

  useEffect(() => {
    aiPanelReveal.stopAnimation();
    if (!aiPanelVisible) {
      aiPanelReveal.setValue(0);
      return;
    }

    if (!effectsEnabled) {
      aiPanelReveal.setValue(1);
    } else {
      aiPanelReveal.setValue(0);
      Animated.spring(aiPanelReveal, {
        toValue: 1,
        damping: 18,
        stiffness: 155,
        mass: 0.72,
        useNativeDriver: true,
      }).start();
    }

    const scrollTimer = setTimeout(() => {
      workspaceScrollRef.current?.scrollToEnd({ animated: effectsEnabled });
    }, effectsEnabled ? 240 : 0);
    return () => clearTimeout(scrollTimer);
  }, [aiPanelReveal, aiPanelVisible, effectsEnabled]);

  useEffect(() => {
    aiCursorBlink.stopAnimation();
    if ((!aiLoading && !aiTyping) || !effectsEnabled) {
      aiCursorBlink.setValue(1);
      return;
    }

    aiCursorBlink.setValue(1);
    const blink = Animated.loop(Animated.sequence([
      Animated.timing(aiCursorBlink, { toValue: 0.12, duration: 420, useNativeDriver: true }),
      Animated.timing(aiCursorBlink, { toValue: 1, duration: 420, useNativeDriver: true }),
    ]));
    blink.start();
    return () => blink.stop();
  }, [aiCursorBlink, aiLoading, aiTyping, effectsEnabled]);

  useEffect(() => {
    if (!aiTyping) {
      lastAiAutoScrollChars.current = 0;
      return;
    }
    if (aiRevealChars - lastAiAutoScrollChars.current < AI_CAMERA_FOLLOW_CHARS) return;

    lastAiAutoScrollChars.current = aiRevealChars;
    const followTimer = setTimeout(() => {
      workspaceScrollRef.current?.scrollToEnd({ animated: true });
    }, 16);
    return () => clearTimeout(followTimer);
  }, [aiRevealChars, aiTyping]);

  useEffect(() => {
    const entrance = Animated.parallel([
      Animated.spring(bootPulse, { toValue: 1, damping: 14, stiffness: 90, mass: 0.8, useNativeDriver: true }),
      Animated.sequence([
        Animated.delay(220),
        Animated.timing(bootRotation, { toValue: 1, duration: 1050, useNativeDriver: true }),
      ]),
    ]);
    entrance.start();
    const timer = setTimeout(() => setBooting(false), 1650);
    return () => {
      clearTimeout(timer);
      entrance.stop();
    };
  }, [bootPulse, bootRotation]);

  useEffect(() => {
    let active = true;
    void AsyncStorage.getItem(PRIVACY_CONSENT_KEY).then((value) => {
      if (active) setPrivacyConsent(value === PRIVACY_CONSENT_VERSION);
    }).catch(() => {
      if (active) setPrivacyConsent(false);
    });
    return () => {
      active = false;
    };
  }, []);

  useEffect(() => {
    let active = true;
    void Promise.all([
      AsyncStorage.getItem(COLOR_THEME_KEY),
      AsyncStorage.getItem(SOUND_ENABLED_KEY),
      AsyncStorage.getItem(EFFECTS_ENABLED_KEY),
      AsyncStorage.getItem(TILE_MOTION_ENABLED_KEY),
      AsyncStorage.getItem(FONT_THEME_KEY),
      AsyncStorage.getItem(DESIGN_MODE_KEY),
    ]).then(([storedTheme, storedSound, storedEffects, storedTileMotion, storedFont, storedDesignMode]) => {
      if (!active) return;
      if (storedTheme === 'basic' || storedTheme === 'rgb' || storedTheme === 'pinkNeon' || storedTheme === 'medievalAutumn') setColorTheme(storedTheme);
      if (storedSound === 'false') setSoundEnabled(false);
      if (storedEffects === 'false') setEffectsEnabled(false);
      if (storedTileMotion === 'false') setTileMotionEnabled(false);
      if (storedFont === 'system' || storedFont === 'terminal' || storedFont === 'elegant') setFontTheme(storedFont);
      if (storedDesignMode === 'classic' || storedDesignMode === 'hyprland' || storedDesignMode === 'mosaic' || storedDesignMode === 'current' || storedDesignMode === 'atelier' || storedDesignMode === 'clarity') setDesignMode(storedDesignMode);
      setPreferencesLoaded(true);
    }).catch(() => {
      if (active) setPreferencesLoaded(true);
    });
    return () => {
      active = false;
    };
  }, []);

  useEffect(() => {
    const client = supabase;
    if (!client) return;
    let active = true;

    const expireStaleSession = async () => {
      const startedValue = await AsyncStorage.getItem(ACCOUNT_SESSION_STARTED_KEY);
      const startedAt = Number(startedValue);
      if (!Number.isFinite(startedAt) || startedAt <= 0) {
        await AsyncStorage.setItem(ACCOUNT_SESSION_STARTED_KEY, String(Date.now()));
        return false;
      }
      if (Date.now() - startedAt < ACCOUNT_SESSION_TTL_MS) return false;
      await client.auth.signOut();
      await AsyncStorage.removeItem(ACCOUNT_SESSION_STARTED_KEY);
      return true;
    };

    void client.auth.getSession().then(async ({ data, error }) => {
      if (!active) return;
      if (error) {
        setAccountError(error.message);
        return;
      }
      if (data.session && await expireStaleSession()) return;
      setAccountToken(data.session?.access_token ?? '');
      setAccountUserId(data.session?.user.id ?? '');
    });

    const { data: authListener } = client.auth.onAuthStateChange((_event, session) => {
      if (!active) return;
      setAccountToken(session?.access_token ?? '');
      setAccountUserId(session?.user.id ?? '');
      if (!session) setHistory([]);
    });

    const appStateListener = AppState.addEventListener('change', (nextState) => {
      if (nextState === 'active') {
        client.auth.startAutoRefresh();
        void expireStaleSession();
      }
      else client.auth.stopAutoRefresh();
    });
    if (AppState.currentState === 'active') client.auth.startAutoRefresh();

    return () => {
      active = false;
      authListener.subscription.unsubscribe();
      appStateListener.remove();
      client.auth.stopAutoRefresh();
    };
  }, []);

  useEffect(() => {
    const client = supabase;
    if (!client || !accountUserId) return;
    let active = true;
    const cutoff = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();

    void client
      .from('analysis_history')
      .select('role, content, created_at')
      .gte('created_at', cutoff)
      .order('created_at', { ascending: true })
      .limit(500)
      .then(({ data, error }) => {
        if (!active) return;
        if (error) {
          setAccountError(error.message);
          return;
        }
        const restoredHistory = (data ?? []).flatMap((row) => (
          (row.role === 'user' || row.role === 'assistant') && typeof row.content === 'string'
            ? [{ role: row.role, content: row.content, createdAt: row.created_at } satisfies HistoryItem]
            : []
        ));
        setHistory(restoredHistory);
      });

    return () => {
      active = false;
    };
  }, [accountUserId]);

  useEffect(() => {
    const client = supabase;
    setDeveloperGrant(null);
    setShowDeveloperPanel(false);
    setDevGodMode(false);
    setDevSlowTyping(false);
    setDevInstantAiReveal(false);
    setDevOfflinePreview(false);
    if (!client || !accountUserId) {
      return;
    }
    let active = true;
    void client
      .from('developer_access')
      .select('access_level')
      .eq('user_id', accountUserId)
      .eq('enabled', true)
      .maybeSingle()
      .then(({ data, error }) => {
        if (!active) return;
        if (error || (data?.access_level !== 'developer' && data?.access_level !== 'admin')) {
          setDeveloperGrant(null);
          setShowDeveloperPanel(false);
          return;
        }
        setDeveloperGrant({ userId: accountUserId, level: data.access_level });
      });
    return () => { active = false; };
  }, [accountUserId]);

  useEffect(() => {
    if (!preferencesLoaded || !booting || bootSoundPlayed.current) return;
    bootSoundPlayed.current = true;
    const timer = setTimeout(() => playSound(bootPlayer), 120);
    return () => clearTimeout(timer);
  }, [bootPlayer, booting, preferencesLoaded, soundEnabled]);

  useEffect(() => {
    if (!rgbEnabled || !effectsEnabled) {
      rgbColorCycle.stopAnimation();
      rgbMotionCycle.stopAnimation();
      rgbColorCycle.setValue(0);
      rgbMotionCycle.setValue(0);
      return;
    }
    const colorCycle = Animated.loop(
      Animated.timing(rgbColorCycle, { toValue: 1, duration: 5_200, useNativeDriver: false }),
    );
    const motionCycle = Animated.loop(
      Animated.timing(rgbMotionCycle, { toValue: 1, duration: 1_850, useNativeDriver: true }),
    );
    colorCycle.start();
    motionCycle.start();
    return () => {
      colorCycle.stop();
      motionCycle.stop();
    };
  }, [effectsEnabled, rgbColorCycle, rgbEnabled, rgbMotionCycle]);

  useEffect(() => {
    if (!preferencesLoaded) return;
    if (aiStatus === 'online' && previousAiStatus.current !== 'online') {
      playSound(connectedPlayer);
    }
    previousAiStatus.current = aiStatus;
  }, [aiStatus, connectedPlayer, preferencesLoaded, soundEnabled]);

  useEffect(() => {
    if (!aiLoading) {
      aiRotation.stopAnimation();
      aiRotation.setValue(0);
      return;
    }
    const rotation = Animated.loop(
      Animated.timing(aiRotation, { toValue: 1, duration: 850, useNativeDriver: true }),
    );
    rotation.start();
    return () => rotation.stop();
  }, [aiLoading, aiRotation]);

  useEffect(() => {
    if (!effectsEnabled || !isProblemFocused || !problem.trim()) {
      typingMotion.stopAnimation();
      typingMotion.setValue(0);
      return;
    }
    const motion = Animated.loop(Animated.sequence([
      Animated.timing(typingMotion, { toValue: 1, duration: 520, useNativeDriver: true }),
      Animated.timing(typingMotion, { toValue: 0, duration: 520, useNativeDriver: true }),
    ]));
    motion.start();
    return () => motion.stop();
  }, [effectsEnabled, isProblemFocused, problem, typingMotion]);

  useEffect(() => {
    if (!distro) {
      workspaceReveal.setValue(0);
      return;
    }
    if (!effectsEnabled) {
      workspaceReveal.setValue(1);
      return;
    }
    const reveal = Animated.spring(workspaceReveal, { toValue: 1, damping: 18, stiffness: 120, mass: 0.75, useNativeDriver: true });
    reveal.start();
    return () => reveal.stop();
  }, [distro, effectsEnabled, workspaceReveal]);

  useEffect(() => {
    if (booting || distro) {
      menuReveal.setValue(0);
      menuActivity.stopAnimation();
      menuActivity.setValue(0);
      return;
    }
    if (!effectsEnabled) {
      menuReveal.setValue(1);
      menuActivity.stopAnimation();
      menuActivity.setValue(0);
      return;
    }

    const reveal = Animated.spring(menuReveal, {
      toValue: 1,
      damping: 18,
      stiffness: 105,
      mass: 0.78,
      useNativeDriver: true,
    });
    const activity = Animated.loop(Animated.sequence([
      Animated.timing(menuActivity, { toValue: 1, duration: 1150, useNativeDriver: true }),
      Animated.timing(menuActivity, { toValue: 0, duration: 1150, useNativeDriver: true }),
    ]));
    reveal.start();
    activity.start();
    return () => {
      reveal.stop();
      activity.stop();
    };
  }, [booting, distro, effectsEnabled, menuActivity, menuReveal]);

  useEffect(() => {
    if (!showSettings) {
      uiModalReveal.setValue(0);
      return;
    }
    if (!effectsEnabled) {
      uiModalReveal.setValue(1);
      return;
    }
    const entrance = Animated.spring(uiModalReveal, {
      toValue: 1,
      damping: 18,
      stiffness: 170,
      mass: 0.68,
      useNativeDriver: true,
    });
    entrance.start();
    return () => entrance.stop();
  }, [effectsEnabled, showSettings, uiModalReveal]);

  useEffect(() => {
    if (!pendingWorkspace) {
      distroLoadingRotation.stopAnimation();
      distroLoadingRotation.setValue(0);
      return;
    }
    if (!effectsEnabled) {
      if (pendingWorkspace === 'ui') setShowSettings(true);
      else setDistro(pendingWorkspace);
      setPendingWorkspace(null);
      return;
    }
    const rotation = Animated.loop(Animated.timing(distroLoadingRotation, { toValue: 1, duration: 760, useNativeDriver: true }));
    rotation.start();
    const loadingDelayMs = 200 + Math.floor(Math.random() * 801);
    const timer = setTimeout(() => {
      playSound(whooshPlayer);
      if (pendingWorkspace === 'ui') {
        setShowSettings(true);
      } else {
        setDistro(pendingWorkspace);
      }
      setPendingWorkspace(null);
    }, loadingDelayMs);
    return () => {
      clearTimeout(timer);
      rotation.stop();
    };
  }, [distroLoadingRotation, effectsEnabled, pendingWorkspace, whooshPlayer]);

  const launchWorkspace = (target: WorkspaceTarget) => {
    if (pendingWorkspace || crumblingWorkspace) return;
    triggerTileHaptic();

    // Quiet transitions replace the old glass shatter sequence.
    playSound(switchPlayer);
    setPendingWorkspace(target);
    return;

  };

  const resetDistroIconRail = () => {
    distroIconMotion.forEach((motion, index) => {
      motion.stopAnimation();
      distroIconFocus[index].stopAnimation();
      Animated.spring(motion, {
        bounciness: 5,
        speed: 26,
        toValue: { x: 0, y: 0 },
        useNativeDriver: false,
      }).start();
      Animated.spring(distroIconFocus[index], {
        bounciness: 3,
        speed: 28,
        toValue: 0,
        useNativeDriver: false,
      }).start();
    });
  };

  const trackDistroIconRail = (locationX: number, locationY: number) => {
    if (!tileMotionActive) {
      resetDistroIconRail();
      return;
    }

    const { height, width } = distroIconRailSize.current;
    const slotWidth = width / Math.max(distroIconMotion.length, 1);
    distroIconMotion.forEach((motion, index) => {
      const centerX = slotWidth * (index + 0.5);
      const centerY = height * 0.46;
      const dx = locationX - centerX;
      const dy = locationY - centerY;
      const influence = Math.max(0, 1 - Math.hypot(dx, dy) / Math.max(slotWidth * 1.55, 84));
      const followX = Math.max(-18, Math.min(18, dx * 0.24)) * influence;
      const followY = Math.max(-8, Math.min(8, dy * 0.14)) * influence - 14 * influence;
      motion.setValue({ x: followX, y: followY });
      distroIconFocus[index].setValue(influence);
    });
  };

  const distroIconPanResponder = useMemo(() => PanResponder.create({
    onMoveShouldSetPanResponder: (_event, gesture) => tileMotionActive
      && Math.abs(gesture.dx) > 2
      && Math.abs(gesture.dx) > Math.abs(gesture.dy) * 0.72,
    onPanResponderGrant: (event, gesture) => {
      distroIconMotion.forEach((motion, index) => {
        motion.stopAnimation();
        distroIconFocus[index].stopAnimation();
      });
      distroIconTouchStart.current = {
        x: event.nativeEvent.locationX - gesture.dx,
        y: event.nativeEvent.locationY - gesture.dy,
      };
      trackDistroIconRail(event.nativeEvent.locationX, event.nativeEvent.locationY);
    },
    onPanResponderMove: (_event, gesture) => {
      trackDistroIconRail(
        distroIconTouchStart.current.x + gesture.dx,
        distroIconTouchStart.current.y + gesture.dy,
      );
    },
    onPanResponderRelease: resetDistroIconRail,
    onPanResponderTerminate: resetDistroIconRail,
    onPanResponderTerminationRequest: () => true,
    onStartShouldSetPanResponder: () => false,
  }), [tileMotionActive]);

  useEffect(() => {
    if (tileMotionActive) return;
    distroIconMotion.forEach((motion, index) => {
      motion.setValue({ x: 0, y: 0 });
      distroIconFocus[index].setValue(0);
    });
  }, [tileMotionActive]);

  const chooseDistro = (nextDistro: Distro) => launchWorkspace(nextDistro);

  const openUiWorkspace = () => launchWorkspace('ui');

  const renderRgbRunner = (reverse = false) => rgbEnabled ? (
    <Animated.View
      pointerEvents="none"
      style={[
        styles.rgbSpectrumRunner,
        {
          transform: [{
            translateX: rgbMotionCycle.interpolate({
              inputRange: [0, 1],
              outputRange: reverse ? [320, -52] : [-52, 320],
            }),
          }],
        },
      ]}
    >
      <Animated.View style={[styles.rgbSpectrumRunnerColor, { backgroundColor: animatedRgbColor }]} />
    </Animated.View>
  ) : null;

  const renderRgbGlow = (borderRadius = 12) => rgbEnabled ? (
    <View pointerEvents="none" style={styles.rgbGlowLayer}>
      <Animated.View style={[styles.rgbGlowFrameOuter, { borderColor: animatedRgbColor, borderRadius }]} />
      <Animated.View style={[styles.rgbGlowFrame, { borderColor: animatedRgbColor, borderRadius }]} />
      <Animated.View style={[styles.rgbGlowEdge, { backgroundColor: animatedRgbColor }]} />
    </View>
  ) : null;

  const crumbleTileStyle = (target: WorkspaceTarget) => crumblingWorkspace === target
    ? {
        opacity: tileCrumble.interpolate({ inputRange: [0, 0.24, 0.42, 0.84, 1], outputRange: [1, 1, 0.78, 0.12, 0] }),
        transform: [
          { translateX: tileCrumble.interpolate({ inputRange: [0, 0.025, 0.08, 0.14, 0.22, 1], outputRange: [0, -2, 3, -3, 2, 0] }) },
          { translateY: tileCrumble.interpolate({ inputRange: [0, 0.04, 0.09, 0.16, 0.24, 1], outputRange: [0, 1, -1, 1, 0, 0] }) },
          { scaleX: tileCrumble.interpolate({ inputRange: [0, 0.25, 0.48, 1], outputRange: [1, 1, 0.98, 0.91] }) },
          { scaleY: tileCrumble.interpolate({ inputRange: [0, 0.25, 0.48, 1], outputRange: [1, 0.99, 0.97, 0.9] }) },
          { rotate: tileCrumble.interpolate({ inputRange: [0, 0.32, 1], outputRange: ['0deg', '-0.5deg', '1.2deg'] }) },
        ],
      }
    : {
        opacity: 1,
        transform: [
          { translateX: 0 },
          { translateY: 0 },
          { scaleX: 1 },
          { scaleY: 1 },
          { rotate: '0deg' },
        ],
      };

  const renderTileCrumble = (target: WorkspaceTarget) => {
    if (crumblingWorkspace !== target) return null;

    const crackOpacity = tileCrumble.interpolate({ inputRange: [0, 0.015, 0.1, 0.38, 0.56], outputRange: [0.72, 1, 1, 0.95, 0] });
    const crackBloom = tileCrumble.interpolate({ inputRange: [0, 0.04, 0.3, 1], outputRange: [0.99, 0.99, 1, 1.015] });
    const crackColor = themeMode === 'light' ? '#031725' : activePalette.text;
    const tileSurface = themeMode === 'light' ? '#DAEAFF' : activePalette.surface;
    const tileInset = themeMode === 'light' ? '#A1C6F6' : activePalette.inset;

    return (
      <View pointerEvents="none" style={styles.tileCrumbleLayer}>
        <Animated.View style={[styles.glassCrackMap, { opacity: crackOpacity, transform: [{ scale: crackBloom }] }]}>
          <Svg height="100%" preserveAspectRatio="none" viewBox="0 0 100 100" width="100%">
            {GLASS_PIECES.map((piece) => (
              <Polygon
                key={`crack-${piece.id}`}
                fill="none"
                points={piece.points}
                stroke={crackColor}
                strokeLinejoin="round"
                strokeWidth="0.58"
              />
            ))}
            {GLASS_HAIRLINE_PATHS.map((path) => (
              <Path key={path} d={path} fill="none" stroke={activePalette.accent} strokeLinecap="round" strokeWidth="0.36" />
            ))}
            <Circle cx="58" cy="46" fill={activePalette.text} r="1.35" />
            <Circle cx="58" cy="46" fill="none" r="3.2" stroke={activePalette.accent} strokeWidth="0.42" />
          </Svg>
        </Animated.View>
        {GLASS_PIECES.map((piece, index) => {
          const motion = shatterScatter.current[index] ?? piece;
          const startsAt = piece.start * 0.4;
          const visibleAt = startsAt + 0.065;
          const opacity = tileCrumble.interpolate({ inputRange: [0, startsAt, visibleAt, 0.8, 1], outputRange: [0, 0, 1, 0.96, 0] });
          const scale = tileCrumble.interpolate({ inputRange: [0, visibleAt, 0.58, 1], outputRange: [0.97, 1, 1, 0.88] });
          const pieceColor = piece.tone === 'surface'
            ? tileSurface
            : piece.tone === 'inset'
              ? tileInset
              : activePalette[piece.tone];

          return (
            <Animated.View
              key={piece.id}
              style={[
                styles.glassPieceLayer,
                {
                  opacity,
                  transform: [
                    { translateX: tileCrumble.interpolate({ inputRange: [0, visibleAt, 1], outputRange: [0, 0, motion.x] }) },
                    { translateY: tileCrumble.interpolate({ inputRange: [0, visibleAt, 1], outputRange: [0, 0, motion.y] }) },
                    { rotate: tileCrumble.interpolate({ inputRange: [0, visibleAt, 1], outputRange: ['0deg', '0deg', `${motion.rotate}deg`] }) },
                    { scale },
                  ],
                },
              ]}
            >
              <Svg height="100%" preserveAspectRatio="none" viewBox="0 0 100 100" width="100%">
                <Polygon
                  fill={pieceColor}
                  points={piece.points}
                  stroke={crackColor}
                  strokeLinejoin="round"
                  strokeWidth="0.28"
                />
              </Svg>
            </Animated.View>
          );
        })}
        {GLASS_SPLINTER_GROUPS.map((group) => {
          const visibleAt = group.start + 0.045;
          const opacity = tileCrumble.interpolate({ inputRange: [0, group.start, visibleAt, 0.64, 0.9], outputRange: [0, 0, 1, 0.78, 0] });
          const scale = tileCrumble.interpolate({ inputRange: [0, visibleAt, 1], outputRange: [0.9, 1, 0.72] });

          return (
            <Animated.View
              key={group.id}
              style={[
                styles.glassSplinterLayer,
                {
                  opacity,
                  transform: [
                    { translateX: tileCrumble.interpolate({ inputRange: [0, visibleAt, 1], outputRange: [0, 0, group.x] }) },
                    { translateY: tileCrumble.interpolate({ inputRange: [0, visibleAt, 1], outputRange: [0, 0, group.y] }) },
                    { rotate: tileCrumble.interpolate({ inputRange: [0, visibleAt, 1], outputRange: ['0deg', '0deg', `${group.rotate}deg`] }) },
                    { scale },
                  ],
                },
              ]}
            >
              <Svg height="100%" preserveAspectRatio="none" viewBox="0 0 100 100" width="100%">
                {group.polygons.map((points) => (
                  <Polygon
                    key={points}
                    fill={activePalette[group.tone]}
                    points={points}
                    stroke={crackColor}
                    strokeLinejoin="round"
                    strokeWidth="0.24"
                  />
                ))}
              </Svg>
            </Animated.View>
          );
        })}
      </View>
    );
  };

  useEffect(() => {
    let cancelled = false;

    const loadConfiguredBackend = async (initialLoad: boolean) => {
      try {
        const response = await fetchWithTimeout(`${BACKEND_CONFIG_URL}?updated=${Date.now()}`, undefined, 8_000);
        if (!response.ok) throw new Error('Nie udało się pobrać konfiguracji AI.');
        const config = await readJsonResponse(response) as { backendUrl?: unknown };
        const configuredUrl = normalizeBackendUrl(config.backendUrl);
        if (!configuredUrl) throw new Error('Adres backendu w konfiguracji jest nieprawidłowy.');
        if (!cancelled) setBackendUrl(configuredUrl);
      } catch {
        // A temporary GitHub/config request failure must not hide a still-working host.
        // On first load there is no host to check, so the UI can safely go offline.
        if (!cancelled && initialLoad) setAiStatus('offline');
      }
    };

    void loadConfiguredBackend(true);
    const configRefreshTimer = setInterval(() => {
      void loadConfiguredBackend(false);
    }, BACKEND_CONFIG_REFRESH_INTERVAL_MS);
    return () => {
      cancelled = true;
      clearInterval(configRefreshTimer);
    };
  }, []);

  const checkAiStatus = async (showChecking = true) => {
    const requestId = healthCheckRequest.current + 1;
    healthCheckRequest.current = requestId;
    if (!backendUrl) {
      setAiStatus('offline');
      return;
    }
    if (showChecking) setAiStatus('checking');
    try {
      const response = await fetchWithTimeout(`${backendUrl.replace(/\/+$/, '')}/health`, undefined, AI_HEALTH_TIMEOUT_MS);
      if (!response.ok) {
        throw new Error('Backend AI jest niedostępny.');
      }
      const data = await readJsonResponse(response) as { ok?: unknown };
      if (requestId !== healthCheckRequest.current) return;
      setAiStatus(data.ok === true ? 'online' : 'offline');
    } catch {
      if (requestId !== healthCheckRequest.current) return;
      setAiStatus('offline');
    }
  };

  useEffect(() => {
    let cancelled = false;
    const runHealthCheck = (showChecking: boolean) => {
      if (!cancelled) void checkAiStatus(showChecking);
    };
    const initialTimer = setTimeout(() => runHealthCheck(true), 350);
    const healthRefreshTimer = setInterval(() => runHealthCheck(false), AI_HEALTH_INTERVAL_MS);
    return () => {
      cancelled = true;
      healthCheckRequest.current += 1;
      clearTimeout(initialTimer);
      clearInterval(healthRefreshTimer);
    };
  }, [backendUrl]);

  const detectedLabel = useMemo(
    () => (result ? copy.matched : copy.ready),
    [copy, result],
  );
  const displayedResult = useMemo(
    () => (result ? localizedFix(result, language) : null),
    [language, result],
  );
  const revealedAiResult = useMemo(() => {
    if (!aiResult) return null;
    let cursor = 0;
    const reveal = (value: string): RevealedText => {
      const segmentStart = cursor;
      const available = Math.max(0, Math.min(value.length, aiRevealChars - cursor));
      const revealed = {
        text: value.slice(0, available),
        visible: available > 0,
        active: aiRevealChars >= segmentStart && aiRevealChars < segmentStart + value.length + 3,
      };
      cursor += value.length + 3;
      return revealed;
    };

    return {
      title: reveal(aiResult.title),
      cause: reveal(aiResult.cause),
      confidence: aiResult.confidence,
      steps: aiResult.steps.map((step) => ({
        description: reveal(step.description),
        command: reveal(step.command),
        risk: step.risk,
      })),
      sources: aiResult.sources.map((source) => ({
        title: reveal(source.title),
        url: source.url,
      })),
    };
  }, [aiResult, aiRevealChars]);
  const aiTypingProgress = aiResult
    ? Math.min(1, aiRevealChars / Math.max(1, aiResultTextLength(aiResult)))
    : 0;
  const aiCursor = (active: boolean) => active && (aiTyping || aiLoading) ? (
    <Animated.Text
      style={[
        styles.aiCursor,
        { color: aiPanelColors.accent, opacity: aiCursorBlink },
        selectedFontFamily ? { fontFamily: selectedFontFamily } : undefined,
      ]}
    >
      ▌
    </Animated.Text>
  ) : null;

  const analyze = () => {
    const found = rulesForDistro(distro).find(({ match }) => match.test(problem));
    setResult(found ?? null);
    setSuggestions(found ? [] : findSuggestions(problem, distro));
    setSearched(true);
  };

  const updateProblem = (value: string) => {
    setProblem(value);
    setResult(null);
    setSuggestions([]);
    setSearched(false);
    setAiResult(null);
    setAiError('');
  };

  const analyzeWithAi = async () => {
    const log = problem.trim();
    if (!log) {
      setAiError(language === 'pl' ? 'Najpierw wpisz błąd, opis problemu lub pytanie.' : 'Enter an error, problem description, or question first.');
      return;
    }

    if (!privacyConsent) {
      setShowPrivacyConsent(true);
      return;
    }

    if (aiStatus === 'offline') {
      setAiError('Host AI jest niedostępny. Uruchom backend albo ustaw własny host.');
      return;
    }

    setAiLoading(true);
    setAiError('');
    setAiResult(null);
    try {
      const response = await fetchWithTimeout(`${backendUrl.replace(/\/+$/, '')}/analyze`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ distro, log, language }),
      }, AI_ANALYSIS_TIMEOUT_MS);
      const data = await readJsonResponse(response);
      if (!response.ok) {
        throw new Error(responseError(data, response.status));
      }
      if (!isAiResult(data)) {
        throw new Error(language === 'pl' ? 'Backend zwrócił niepełną odpowiedź.' : 'The backend returned an incomplete response.');
      }
      setAiResult(data);
      const assistantHistoryContent = `${data.title}\n${data.cause}`.slice(0, 20_000);
      const nextHistory: HistoryItem[] = [
        ...history,
        { role: 'user' as const, content: log, createdAt: new Date().toISOString() },
        { role: 'assistant' as const, content: assistantHistoryContent, createdAt: new Date().toISOString() },
      ].slice(-100);
      setHistory(nextHistory);
      if (accountUserId && supabase) {
        const createdAt = Date.now();
        const { error: historyError } = await supabase.from('analysis_history').insert([
          { user_id: accountUserId, distribution: distro, role: 'user', content: log, created_at: new Date(createdAt).toISOString() },
          { user_id: accountUserId, distribution: distro, role: 'assistant', content: assistantHistoryContent, created_at: new Date(createdAt + 1).toISOString() },
        ]);
        if (historyError) setAccountError(historyError.message);
      }
    } catch (error) {
      setAiError(readableError(error, language, 'Nie udało się połączyć z backendem.', 'Could not connect to the backend.'));
    } finally {
      setAiLoading(false);
    }
  };

  const submitAccount = async () => {
    if (!supabaseConfigured || !supabase) {
      setAccountError(language === 'pl' ? 'Supabase nie jest jeszcze skonfigurowany.' : 'Supabase is not configured yet.');
      return;
    }
    const identifier = normalizedAccountIdentifier(accountIdentifier);
    const usesEmail = identifier.includes('@');
    if (!identifier || (!usesEmail && !USERNAME_PATTERN.test(identifier))) {
      setAccountError(language === 'pl'
        ? 'Nazwa użytkownika musi mieć 3–24 znaki i może zawierać małe litery, cyfry oraz znak _.'
        : 'The username must be 3–24 characters and may contain lowercase letters, numbers, and _.');
      return;
    }
    if (!accountPassword) {
      setAccountError(language === 'pl' ? 'Podaj hasło.' : 'Enter your password.');
      return;
    }
    if (accountMode === 'register' && accountPassword.length < MINIMUM_PASSWORD_LENGTH) {
      setAccountError(language === 'pl'
        ? `Hasło musi mieć co najmniej ${MINIMUM_PASSWORD_LENGTH} znaków.`
        : `The password must contain at least ${MINIMUM_PASSWORD_LENGTH} characters.`);
      return;
    }
    setAccountLoading(true);
    setAccountError('');
    setAccountNotice('');
    try {
      const credentials = { email: accountEmailFromIdentifier(identifier), password: accountPassword };
      const { data, error } = accountMode === 'login'
        ? await supabase.auth.signInWithPassword(credentials)
        : await supabase.auth.signUp({
          ...credentials,
          options: usesEmail ? undefined : { data: { username: identifier } },
        });
      if (error) throw error;
      setAccountPassword('');
      if (!data.session) {
        setAccountNotice(language === 'pl'
          ? (usesEmail
            ? 'Sprawdź skrzynkę e-mail i potwierdź konto, a następnie się zaloguj.'
            : 'Konto utworzono, ale wymaga zatwierdzenia przez administratora.')
          : (usesEmail
            ? 'Check your email, confirm the account, and then sign in.'
            : 'The account was created but requires administrator approval.'));
        return;
      }
      await AsyncStorage.setItem(ACCOUNT_SESSION_STARTED_KEY, String(Date.now()));
      setAccountToken(data.session.access_token);
      setAccountUserId(data.session.user.id);
    } catch (error) {
      setAccountError(readableError(error, language, 'Nie udało się obsłużyć konta.', 'The account request failed.'));
    } finally {
      setAccountLoading(false);
    }
  };

  const changeAccountPassword = async () => {
    if (!supabase || !accountToken) return;
    if (newAccountPassword.length < MINIMUM_PASSWORD_LENGTH) {
      setAccountError(language === 'pl'
        ? `Nowe hasło musi mieć co najmniej ${MINIMUM_PASSWORD_LENGTH} znaków.`
        : `The new password must contain at least ${MINIMUM_PASSWORD_LENGTH} characters.`);
      return;
    }
    setAccountLoading(true);
    setAccountError('');
    setAccountNotice('');
    try {
      const { error } = await supabase.auth.updateUser({ password: newAccountPassword });
      if (error) throw error;
      setNewAccountPassword('');
      setAccountNotice(language === 'pl' ? 'Hasło zostało zmienione.' : 'The password has been changed.');
    } catch (error) {
      setAccountError(readableError(error, language, 'Nie udało się zmienić hasła.', 'Could not change the password.'));
    } finally {
      setAccountLoading(false);
    }
  };

  const logout = async () => {
    if (supabase) {
      await supabase.auth.signOut().catch(() => undefined);
    }
    await AsyncStorage.removeItem(ACCOUNT_SESSION_STARTED_KEY);
    setAccountToken('');
    setAccountUserId('');
    setDeveloperGrant(null);
    setShowDeveloperPanel(false);
    setDevGodMode(false);
    setDevInstantAiReveal(false);
    setDevOfflinePreview(false);
    setHistory([]);
    setConfirmDeleteAccount(false);
    setShowAccount(false);
  };

  const acceptPrivacyConsent = async () => {
    if (!ageConfirmed || !dataConsent) return;
    await AsyncStorage.setItem(PRIVACY_CONSENT_KEY, PRIVACY_CONSENT_VERSION);
    setPrivacyConsent(true);
    setShowPrivacyConsent(false);
  };

  const withdrawPrivacyConsent = async () => {
    await AsyncStorage.removeItem(PRIVACY_CONSENT_KEY);
    setPrivacyConsent(false);
    setAgeConfirmed(false);
    setDataConsent(false);
  };

  const deleteAccount = async () => {
    if (!confirmDeleteAccount) {
      setConfirmDeleteAccount(true);
      return;
    }
    if (!accountToken || !supabase) return;
    setAccountLoading(true);
    setAccountError('');
    try {
      const { error } = await supabase.functions.invoke('delete-account');
      if (error) throw error;
      await supabase.auth.signOut({ scope: 'local' }).catch(() => undefined);
      await AsyncStorage.removeItem(ACCOUNT_SESSION_STARTED_KEY);
      setAccountToken('');
      setAccountUserId('');
      setDeveloperGrant(null);
      setShowDeveloperPanel(false);
      setDevGodMode(false);
      setDevInstantAiReveal(false);
      setDevOfflinePreview(false);
      setHistory([]);
      setAccountIdentifier('');
      setNewAccountPassword('');
      setShowAccount(false);
      setConfirmDeleteAccount(false);
    } catch (error) {
      setAccountError(readableError(error, language, 'Nie udało się usunąć konta.', 'Could not delete the account.'));
    } finally {
      setAccountLoading(false);
    }
  };

  const openDeveloperTestPrompt = () => {
    setProblem(language === 'pl'
      ? 'Wyjaśnij, jak bezpiecznie sprawdzić nieudaną usługę systemd i jej logi.'
      : 'Explain how to safely inspect a failed systemd service and its logs.');
    setResult(null);
    setSuggestions([]);
    setSearched(false);
    setAiResult(null);
    setAiError('');
    setShowDeveloperPanel(false);
    if (!distro) setDistro('arch');
  };

  const resetDeveloperAnalysis = () => {
    setProblem('');
    setResult(null);
    setSuggestions([]);
    setSearched(false);
    setAiResult(null);
    setAiRevealChars(0);
    setAiTyping(false);
    setAiLoading(false);
    setAiError('');
  };

  const legalOverlays = (
    <>
      {showPrivacyConsent && (
        <View style={styles.modalBackdrop}>
          <View style={[styles.modalCard, customThemeDark && paletteStyles.panel]}>
            <Text style={styles.modalTitle}>{language === 'pl' ? 'PRYWATNOŚĆ ANALIZY AI' : 'AI ANALYSIS PRIVACY'}</Text>
            <Text style={styles.consentIntro}>
              {language === 'pl'
                ? 'Treść pytania lub logu zostanie wysłana do backendu LinuxFIX i lokalnego modelu Ollama. Nie wklejaj haseł, kluczy API ani innych sekretów.'
                : 'Your question or log will be sent to the LinuxFIX backend and a local Ollama model. Do not paste passwords, API keys, or other secrets.'}
            </Text>
            <Pressable onPress={() => setAgeConfirmed((value) => !value)} style={styles.consentRow}>
              <View style={[styles.consentBox, ageConfirmed && styles.consentBoxActive]}><Text style={styles.consentMark}>{ageConfirmed ? '✓' : ''}</Text></View>
              <Text style={styles.consentText}>{language === 'pl' ? 'Mam co najmniej 16 lat.' : 'I am at least 16 years old.'}</Text>
            </Pressable>
            <Pressable onPress={() => setDataConsent((value) => !value)} style={styles.consentRow}>
              <View style={[styles.consentBox, dataConsent && styles.consentBoxActive]}><Text style={styles.consentMark}>{dataConsent ? '✓' : ''}</Text></View>
              <Text style={styles.consentText}>{language === 'pl' ? 'Zgadzam się na przesłanie tej treści do analizy AI.' : 'I agree to send this content for AI analysis.'}</Text>
            </Pressable>
            <Pressable onPress={() => setLegalDocument('privacy')}><Text style={styles.modalLink}>{language === 'pl' ? 'POLITYKA PRYWATNOŚCI' : 'PRIVACY POLICY'}</Text></Pressable>
            <Pressable disabled={!ageConfirmed || !dataConsent} onPress={() => void acceptPrivacyConsent()} style={[styles.modalClose, (!ageConfirmed || !dataConsent) && styles.buttonDisabled]}>
              <Text style={styles.modalCloseText}>{language === 'pl' ? 'ZGADZAM SIĘ I KONTYNUUJĘ' : 'AGREE AND CONTINUE'}</Text>
            </Pressable>
            <Pressable onPress={() => setShowPrivacyConsent(false)}><Text style={styles.modalCancel}>{language === 'pl' ? 'ANULUJ' : 'CANCEL'}</Text></Pressable>
          </View>
        </View>
      )}
      {legalDocument && (
        <View style={[styles.modalBackdrop, styles.legalBackdrop]}>
          <View style={[styles.modalCard, styles.legalCard, customThemeDark && paletteStyles.panel]}>
            <Text style={styles.modalTitle}>{legalDocuments[legalDocument].title}</Text>
            <ScrollView style={styles.legalScroll} showsVerticalScrollIndicator={false}>
              <Text style={styles.legalText}>{legalDocuments[legalDocument].content}</Text>
            </ScrollView>
            <Pressable onPress={() => setLegalDocument(null)} style={styles.modalClose}><Text style={styles.modalCloseText}>{language === 'pl' ? 'ZAMKNIJ' : 'CLOSE'}</Text></Pressable>
          </View>
        </View>
      )}
      <DeveloperPanel
        visible={showDeveloperPanel}
        language={language}
        accessLevel={developerAccess}
        userId={accountUserId}
        aiStatus={devOfflinePreview ? 'offline' : aiStatus}
        backendUrl={backendUrl}
        slowTyping={devSlowTyping}
        godMode={devGodMode}
        instantAiReveal={devInstantAiReveal}
        offlinePreview={devOfflinePreview}
        partyThemeActive={colorTheme === 'rgb'}
        designMode={selectedDesignMode}
        fontFamily={selectedFontFamily}
        onClose={() => setShowDeveloperPanel(false)}
        onToggleSlowTyping={() => setDevSlowTyping((value) => !value)}
        onToggleGodMode={() => setDevGodMode((value) => !value)}
        onToggleInstantAiReveal={() => setDevInstantAiReveal((value) => !value)}
        onToggleOfflinePreview={() => setDevOfflinePreview((value) => !value)}
        onTogglePartyTheme={() => selectColorTheme(colorTheme === 'rgb' ? 'basic' : 'rgb')}
        onRefreshAi={() => void checkAiStatus(true)}
        onSelectDesign={(mode) => {
          if (!developerAccess) return;
          setDesignMode(mode);
          void AsyncStorage.setItem(DESIGN_MODE_KEY, mode);
          setShowDeveloperPanel(false);
          if (distro) clearWorkspace();
        }}
        onTestHaptic={() => void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium).catch(() => undefined)}
        onTestSound={() => playSound(switchPlayer, true)}
        onInsertTestPrompt={openDeveloperTestPrompt}
        onResetAnalysis={resetDeveloperAnalysis}
        onOpenHostSettings={() => { setShowDeveloperPanel(false); setShowHostSettings(true); if (!distro) setDistro('arch'); }}
      />
    </>
  );

  const chooseSuggestion = (rule: ErrorRule) => {
    setResult(rule);
    setSuggestions([]);
    setSearched(true);
  };

  const insertExample = () => {
    const selectedExample = DISTRO_EXAMPLES[distro ?? 'arch'];
    const found = rulesForDistro(distro).find(({ match }) => match.test(selectedExample)) ?? null;
    setProblem(selectedExample);
    setResult(found);
    setSuggestions([]);
    setAiResult(null);
    setAiError('');
    setSearched(true);
  };

  const openSource = () => {
    if (result) {
      void Linking.openURL(result.fix.source);
    }
  };

  const clearWorkspace = () => {
    setDistro(null);
    setProblem('');
    setResult(null);
    setSearched(false);
    setAiResult(null);
    setAiError('');
    workspaceExitRunning.current = false;
  };

  const returnToMenu = () => {
    if (!distro || workspaceExitRunning.current) return;
    playSound(whooshPlayer);
    if (!effectsEnabled) {
      clearWorkspace();
      return;
    }
    workspaceExitRunning.current = true;
    Animated.timing(workspaceReveal, {
      toValue: 0,
      duration: 220,
      useNativeDriver: true,
    }).start(({ finished }) => {
      if (!finished) {
        workspaceExitRunning.current = false;
        return;
      }
      clearWorkspace();
    });
  };

  const closeUiSettings = () => {
    if (!showSettings) return;
    playSound(whooshPlayer);
    if (!effectsEnabled) {
      setShowSettings(false);
      return;
    }
    Animated.timing(uiModalReveal, {
      toValue: 0,
      duration: 190,
      useNativeDriver: true,
    }).start(({ finished }) => {
      if (finished) setShowSettings(false);
    });
  };

  useEffect(() => {
    const subscription = BackHandler.addEventListener('hardwareBackPress', () => {
      if (pendingWorkspace || crumblingWorkspace) return true;
      if (legalDocument) {
        setLegalDocument(null);
        return true;
      }
      if (showPrivacyConsent) {
        setShowPrivacyConsent(false);
        return true;
      }
      if (showAccount) {
        setShowAccount(false);
        setConfirmDeleteAccount(false);
        setAccountError('');
        return true;
      }
      if (showSystemSettings) {
        setShowSystemSettings(false);
        return true;
      }
      if (showSettings) {
        closeUiSettings();
        return true;
      }
      if (showHistory) {
        setShowHistory(false);
        return true;
      }
      if (distro) {
        returnToMenu();
        return true;
      }
      return true;
    });
    return () => subscription.remove();
  }, [crumblingWorkspace, distro, effectsEnabled, legalDocument, pendingWorkspace, showAccount, showHistory, showPrivacyConsent, showSettings, showSystemSettings, uiModalReveal, whooshPlayer, workspaceReveal]);

  if (booting) {
    return (
      <FontFamilyContext.Provider value={selectedFontFamily}>
        <SafeAreaView style={[styles.bootScreen, customThemeDark && paletteStyles.root]}>
        <Animated.View
          style={[
            styles.bootMark,
            {
              opacity: bootPulse,
              transform: [
                { scale: bootPulse.interpolate({ inputRange: [0, 1], outputRange: [0.78, 1] }) },
                { rotate: bootPulse.interpolate({ inputRange: [0, 1], outputRange: ['-5deg', '0deg'] }) },
              ],
            },
          ]}
        >
          <View style={[styles.bootCorner, styles.bootCornerTopLeft, customThemeDark && paletteStyles.border]} />
          <View style={[styles.bootCorner, styles.bootCornerTopRight, customThemeDark && paletteStyles.border]} />
          <View style={[styles.bootCorner, styles.bootCornerBottomLeft, customThemeDark && paletteStyles.border]} />
          <View style={[styles.bootCorner, styles.bootCornerBottomRight, customThemeDark && paletteStyles.border]} />
          <View style={styles.bootLogoClip}>
            <Image source={require('./assets/linuxfix-logo.jpg')} style={styles.bootLogo} />
            <Animated.View
              style={[
                styles.bootScan,
                customThemeDark && paletteStyles.bar,
                {
                  opacity: bootRotation.interpolate({ inputRange: [0, 0.12, 0.88, 1], outputRange: [0, 0.9, 0.9, 0] }),
                  transform: [{ translateY: bootRotation.interpolate({ inputRange: [0, 1], outputRange: [-56, 56] }) }],
                },
              ]}
            />
          </View>
        </Animated.View>
        <Text style={[styles.bootBrand, customThemeDark && paletteStyles.mutedText]}>LINUXFIX</Text>
        <Text style={[styles.bootTitle, customThemeDark && paletteStyles.text]}>{language === 'pl' ? 'DIAGNOSTYKA SYSTEMU' : 'SYSTEM DIAGNOSTICS'}</Text>
        <View style={[styles.bootProgressTrack, customThemeDark && paletteStyles.panel]}>
          <Animated.View style={[styles.bootProgressFill, customThemeDark && paletteStyles.bar, { transform: [{ scaleX: bootRotation }] }]} />
        </View>
        <Text style={[styles.bootSubtitle, customThemeDark && paletteStyles.mutedText]}>{language === 'pl' ? 'Przygotowywanie bezpiecznego środowiska' : 'Preparing a secure environment'}</Text>
        <StatusBar style="light" />
        </SafeAreaView>
      </FontFamilyContext.Provider>
    );
  }

  if (!distro) {
    return (
      <FontFamilyContext.Provider value={selectedFontFamily}>
        <SafeAreaView style={[styles.menuSurface, themeMode === 'light' && styles.menuSurfaceLight, customThemeDark && paletteStyles.root, workspaceStyles.root]}>
        {selectedDesignMode === 'current' ? <QuietHome
          language={language} light={themeMode === 'light'} palette={activePalette}
          fontFamily={selectedFontFamily} motion={effectsEnabled}
          busy={!!pendingWorkspace || !!crumblingWorkspace} historyCount={analysisHistoryCount}
          onChoose={chooseDistro} onAppearance={openUiWorkspace}
          onHistory={() => setShowHistory(true)} onSettings={() => setShowSystemSettings(true)}
          onAccount={() => setShowAccount(true)}
        /> : <DesignHome
          mode={selectedDesignMode}
          language={language} light={themeMode === 'light'} palette={activePalette}
          fontFamily={selectedFontFamily} motion={effectsEnabled}
          busy={!!pendingWorkspace || !!crumblingWorkspace} historyCount={analysisHistoryCount}
          onChoose={chooseDistro} onAppearance={openUiWorkspace}
          onHistory={() => setShowHistory(true)} onSettings={() => setShowSystemSettings(true)}
          onAccount={() => setShowAccount(true)}
        />}
        {pendingWorkspace && (
          <View style={[styles.distroLoadingOverlay, customThemeDark && paletteStyles.root]}>
            <View pointerEvents="none" style={styles.loadingLogoStage}>
              <Animated.View
                style={[
                  styles.loadingOrbitOuter,
                  {
                    borderColor: activePalette.accent,
                    transform: [
                      { rotate: distroLoadingRotation.interpolate({ inputRange: [0, 1], outputRange: ['0deg', '360deg'] }) },
                      { scale: distroLoadingRotation.interpolate({ inputRange: [0, 0.5, 1], outputRange: [0.96, 1.04, 0.96] }) },
                    ],
                  },
                ]}
              />
              <Animated.View
                style={[
                  styles.loadingOrbitInner,
                  {
                    borderColor: activePalette.muted,
                    opacity: distroLoadingRotation.interpolate({ inputRange: [0, 0.5, 1], outputRange: [0.38, 0.85, 0.38] }),
                    transform: [{ rotate: distroLoadingRotation.interpolate({ inputRange: [0, 1], outputRange: ['360deg', '0deg'] }) }],
                  },
                ]}
              />
              <Animated.Image
                source={pendingWorkspace === 'ui'
                  ? require('./assets/linuxfix-logo.jpg')
                  : DISTRO_LOGOS[pendingWorkspace]}
                style={[
                  styles.distroLoadingLogo,
                  {
                    transform: [
                      { rotate: distroLoadingRotation.interpolate({ inputRange: [0, 1], outputRange: ['0deg', '360deg'] }) },
                      { scale: distroLoadingRotation.interpolate({ inputRange: [0, 0.5, 1], outputRange: [0.91, 1, 0.91] }) },
                    ],
                  },
                ]}
              />
            </View>
            <Text style={styles.distroLoadingTitle}>{pendingWorkspace === 'ui' ? 'UI CONFIG' : themes[pendingWorkspace].label}</Text>
            <Text style={styles.distroLoadingText}>{language === 'pl' ? 'ŁADOWANIE WORKSPACE' : 'LOADING WORKSPACE'}</Text>
            <View style={[styles.loadingProgressTrack, { backgroundColor: activePalette.surface }]}>
              <Animated.View style={[styles.loadingProgressFill, { backgroundColor: activePalette.accent, transform: [{ scaleX: distroLoadingRotation }] }]} />
            </View>
          </View>
        )}
        {showSettings && (
          <View style={styles.modalBackdrop}>
            <Animated.View
              style={[
                styles.modalCard,
                styles.settingsCard,
                customThemeDark && paletteStyles.panel,
                {
                  opacity: uiModalReveal,
                  transform: [
                    { translateY: uiModalReveal.interpolate({ inputRange: [0, 1], outputRange: [42, 0] }) },
                    { scale: uiModalReveal.interpolate({ inputRange: [0, 1], outputRange: [0.97, 1] }) },
                  ],
                },
              ]}
            >
              <ScrollView
                contentContainerStyle={styles.settingsScrollContent}
                persistentScrollbar={Platform.OS === 'android'}
                style={styles.settingsScroll}
                showsVerticalScrollIndicator
              >
              <Text style={[styles.modalTitle, customThemeDark && paletteStyles.text]}>{language === 'pl' ? 'Wygląd i język' : 'Appearance & language'}</Text>
              <Text style={styles.modalLabel}>{language === 'pl' ? 'JĘZYK' : 'LANGUAGE'}</Text>
              <View style={styles.choiceRow}>
                <Pressable onPress={() => setLanguage('pl')} style={[styles.choice, language === 'pl' && styles.choiceActive]}><Text style={[styles.choiceText, language === 'pl' && styles.choiceTextActive]}>{copy.polish}</Text></Pressable>
                <Pressable onPress={() => setLanguage('en')} style={[styles.choice, language === 'en' && styles.choiceActive]}><Text style={[styles.choiceText, language === 'en' && styles.choiceTextActive]}>{copy.english}</Text></Pressable>
              </View>
              <Text style={styles.modalLabel}>{language === 'pl' ? 'TRYB WYŚWIETLANIA' : 'DISPLAY MODE'}</Text>
              <View style={styles.choiceRow}>
                <Pressable onPress={() => setThemeMode('dark')} style={[styles.choice, themeMode === 'dark' && styles.choiceActive]}><Text style={[styles.choiceText, themeMode === 'dark' && styles.choiceTextActive]}>{copy.dark}</Text></Pressable>
                <Pressable onPress={() => setThemeMode('light')} style={[styles.choice, themeMode === 'light' && styles.choiceActive]}><Text style={[styles.choiceText, themeMode === 'light' && styles.choiceTextActive]}>{copy.light}</Text></Pressable>
              </View>
              <Text style={styles.modalLabel}>{language === 'pl' ? 'KOLORY INTERFEJSU' : 'INTERFACE COLORS'}</Text>
              <View style={styles.colorThemeGrid}>
                <Pressable onPress={() => selectColorTheme('basic')} style={[styles.colorThemeChoice, colorTheme === 'basic' && styles.colorThemeChoiceActive]}>
                  <View style={styles.colorPreview}>
                    <View style={[styles.colorPreviewBar, { backgroundColor: '#031725' }]} />
                    <View style={[styles.colorPreviewBar, { backgroundColor: '#022E5B' }]} />
                    <View style={[styles.colorPreviewBar, { backgroundColor: '#499BED' }]} />
                    <View style={[styles.colorPreviewBar, { backgroundColor: '#A1C6F6' }]} />
                    <View style={[styles.colorPreviewBar, { backgroundColor: '#DAEAFF' }]} />
                  </View>
                  <Text style={[styles.colorThemeTitle, colorTheme === 'basic' && styles.colorThemeTitleActive]}>{language === 'pl' ? 'PODSTAWOWY' : 'BASIC'}</Text>
                  <Text style={styles.colorThemeDescription}>{language === 'pl' ? 'Niebieski LinuxFIX' : 'LinuxFIX blue'}</Text>
                </Pressable>
                <Pressable onPress={() => selectColorTheme('rgb')} style={[styles.colorThemeChoice, colorTheme === 'rgb' && styles.colorThemeChoiceActive]}>
                  <View style={styles.colorPreview}>
                    <View style={[styles.colorPreviewBar, { backgroundColor: '#05040A' }]} />
                    <View style={[styles.colorPreviewBar, { backgroundColor: '#0B0D18' }]} />
                    <View style={[styles.colorPreviewBar, { backgroundColor: '#00F5FF' }]} />
                    <View style={[styles.colorPreviewBar, { backgroundColor: '#6DFF3A' }]} />
                    <View style={[styles.colorPreviewBar, { backgroundColor: '#FF2FD1' }]} />
                  </View>
                  <Text style={[styles.colorThemeTitle, colorTheme === 'rgb' && styles.colorThemeTitleActive]}>RGB SIGNAL</Text>
                  <Text style={styles.colorThemeDescription}>{language === 'pl' ? 'Pełne neonowe RGB i świecące ramki' : 'Full neon RGB with glowing frames'}</Text>
                </Pressable>
              </View>
              <View style={styles.colorThemeGrid}>
                <Pressable onPress={() => selectColorTheme('pinkNeon')} style={[styles.colorThemeChoice, colorTheme === 'pinkNeon' && styles.colorThemeChoiceActive]}>
                  <View style={styles.colorPreview}>
                    <View style={[styles.colorPreviewBar, { backgroundColor: '#120223' }]} />
                    <View style={[styles.colorPreviewBar, { backgroundColor: '#430357' }]} />
                    <View style={[styles.colorPreviewBar, { backgroundColor: '#6E022F' }]} />
                    <View style={[styles.colorPreviewBar, { backgroundColor: '#8C0286' }]} />
                    <View style={[styles.colorPreviewBar, { backgroundColor: '#C40361' }]} />
                  </View>
                  <Text style={[styles.colorThemeTitle, colorTheme === 'pinkNeon' && styles.colorThemeTitleActive]}>PINK NEON</Text>
                  <Text style={styles.colorThemeDescription}>{language === 'pl' ? 'Neonowy róż i śliwka' : 'Neon pink and plum'}</Text>
                </Pressable>
                <Pressable onPress={() => selectColorTheme('medievalAutumn')} style={[styles.colorThemeChoice, colorTheme === 'medievalAutumn' && styles.colorThemeChoiceActive]}>
                  <View style={styles.colorPreview}>
                    <View style={[styles.colorPreviewBar, { backgroundColor: '#242423' }]} />
                    <View style={[styles.colorPreviewBar, { backgroundColor: '#854D34' }]} />
                    <View style={[styles.colorPreviewBar, { backgroundColor: '#BB794C' }]} />
                    <View style={[styles.colorPreviewBar, { backgroundColor: '#DEB308' }]} />
                    <View style={[styles.colorPreviewBar, { backgroundColor: '#A59257' }]} />
                  </View>
                  <Text style={[styles.colorThemeTitle, colorTheme === 'medievalAutumn' && styles.colorThemeTitleActive]}>{language === 'pl' ? 'JESIEŃ ŚREDNIOWIECZA' : 'MEDIEVAL AUTUMN'}</Text>
                  <Text style={styles.colorThemeDescription}>{language === 'pl' ? 'Brąz, mosiądz i złoto' : 'Brown, brass, and gold'}</Text>
                </Pressable>
              </View>
              <Text style={styles.modalLabel}>{language === 'pl' ? 'CZCIONKA INTERFEJSU' : 'INTERFACE FONT'}</Text>
              <View style={styles.fontThemeGrid}>
                <Pressable onPress={() => selectFontTheme('system')} style={[styles.fontThemeChoice, fontTheme === 'system' && styles.fontThemeChoiceActive]}>
                  <NativeText style={[styles.fontThemeSample, styles.fontThemeSampleSystem, fontTheme === 'system' && styles.fontThemeSampleActive]}>Aa</NativeText>
                  <NativeText style={[styles.fontThemeTitle, styles.fontThemeSampleSystem, fontTheme === 'system' && styles.fontThemeTitleActive]}>{language === 'pl' ? 'DOMYŚLNA' : 'DEFAULT'}</NativeText>
                  <NativeText style={[styles.fontThemeDescription, styles.fontThemeSampleSystem]}>{language === 'pl' ? 'Czytelna i neutralna' : 'Clear and neutral'}</NativeText>
                </Pressable>
                <Pressable onPress={() => selectFontTheme('terminal')} style={[styles.fontThemeChoice, fontTheme === 'terminal' && styles.fontThemeChoiceActive]}>
                  <NativeText style={[styles.fontThemeSample, styles.fontThemeTerminalSample, { fontFamily: 'LinuxFIXTerminal' }, fontTheme === 'terminal' && styles.fontThemeSampleActive]}>$_</NativeText>
                  <NativeText style={[styles.fontThemeTitle, styles.fontThemeTerminalTitle, { fontFamily: 'LinuxFIXTerminal' }, fontTheme === 'terminal' && styles.fontThemeTitleActive]}>{language === 'pl' ? 'TERMINAL' : 'TERMINAL'}</NativeText>
                  <NativeText style={[styles.fontThemeDescription, styles.fontThemeTerminalDescription, { fontFamily: 'LinuxFIXTerminal' }]}>{language === 'pl' ? 'Pikselowa konsola' : 'Pixel console'}</NativeText>
                </Pressable>
                <Pressable onPress={() => selectFontTheme('elegant')} style={[styles.fontThemeChoice, fontTheme === 'elegant' && styles.fontThemeChoiceActive]}>
                  <NativeText style={[styles.fontThemeSample, { fontFamily: 'LinuxFIXElegant' }, fontTheme === 'elegant' && styles.fontThemeSampleActive]}>Ag</NativeText>
                  <NativeText style={[styles.fontThemeTitle, { fontFamily: 'LinuxFIXElegant' }, fontTheme === 'elegant' && styles.fontThemeTitleActive]}>{language === 'pl' ? 'ELEGANCKA' : 'ELEGANT'}</NativeText>
                  <NativeText style={[styles.fontThemeDescription, { fontFamily: 'LinuxFIXElegant' }]}>{language === 'pl' ? 'Klasyczna i premium' : 'Classic and premium'}</NativeText>
                </Pressable>
              </View>
              <Text style={styles.modalLabel}>{language === 'pl' ? 'ANIMACJE INTERFEJSU' : 'INTERFACE ANIMATIONS'}</Text>
              <Pressable onPress={toggleEffects} style={styles.soundSetting}>
                <View>
                  <Text style={styles.soundSettingTitle}>{effectsEnabled ? (language === 'pl' ? 'WŁĄCZONE' : 'ENABLED') : (language === 'pl' ? 'WYŁĄCZONE' : 'DISABLED')}</Text>
                  <Text style={styles.soundSettingDescription}>{language === 'pl' ? 'Przejścia ekranów, wysuwanie menu i lekka haptyka' : 'Screen transitions, sliding menus, and light haptics'}</Text>
                </View>
                <View style={[styles.soundIndicator, effectsEnabled && styles.soundIndicatorActive]}>
                  <View style={[styles.soundIndicatorCore, effectsEnabled && styles.soundIndicatorCoreActive]} />
                </View>
              </Pressable>
              <Text style={styles.modalLabel}>{language === 'pl' ? 'DŹWIĘKI INTERFEJSU' : 'INTERFACE SOUNDS'}</Text>
              <Pressable onPress={toggleSound} style={styles.soundSetting}>
                <View>
                  <Text style={styles.soundSettingTitle}>{soundEnabled ? (language === 'pl' ? 'WŁĄCZONE' : 'ENABLED') : (language === 'pl' ? 'WYŁĄCZONE' : 'DISABLED')}</Text>
                  <Text style={styles.soundSettingDescription}>{language === 'pl' ? 'Subtelne dźwięki startu, AI i przejść' : 'Subtle startup, AI, and transition sounds'}</Text>
                </View>
                <View style={[styles.soundIndicator, soundEnabled && styles.soundIndicatorActive]}>
                  <View style={[styles.soundIndicatorCore, soundEnabled && styles.soundIndicatorCoreActive]} />
                </View>
              </Pressable>
              </ScrollView>
              <Pressable onPress={closeUiSettings} style={styles.modalClose}><Text style={styles.modalCloseText}>{language === 'pl' ? 'GOTOWE' : 'DONE'}</Text></Pressable>
            </Animated.View>
          </View>
        )}
        {showSystemSettings && (
          <View style={styles.modalBackdrop}>
            <ScrollView style={[styles.modalCard, styles.settingsCard, customThemeDark && paletteStyles.panel]} showsVerticalScrollIndicator={false}>
              <Text style={[styles.modalTitle, customThemeDark && paletteStyles.text]}>{language === 'pl' ? 'Ustawienia' : 'Settings'}</Text>
              <Text style={[styles.settingsWindowPath, customThemeDark && paletteStyles.accentText]}>{language === 'pl' ? 'Konto, prywatność i aplikacja' : 'Account, privacy and application'}</Text>

              <Pressable onPress={() => { setShowSystemSettings(false); setShowAccount(true); }} style={({ pressed }) => [styles.settingsRoute, pressed && styles.buttonPressed]}>
                <View>
                  <Text style={[styles.settingsRouteTitle, customThemeDark && paletteStyles.text]}>{language === 'pl' ? 'KONTO I LOGOWANIE' : 'ACCOUNT AND LOGIN'}</Text>
                  <Text style={[styles.settingsRouteDescription, customThemeDark && paletteStyles.mutedText]}>{accountToken ? (language === 'pl' ? 'Zalogowano' : 'Signed in') : (language === 'pl' ? 'Logowanie, rejestracja i historia' : 'Login, registration, and history')}</Text>
                </View>
                <Text style={[styles.settingsRouteArrow, customThemeDark && paletteStyles.text]}>→</Text>
              </Pressable>

              {developerAccess && (
                <Pressable onPress={() => { setShowSystemSettings(false); setShowDeveloperPanel(true); }} style={({ pressed }) => [styles.settingsRoute, styles.developerRoute, pressed && styles.buttonPressed]}>
                  <View>
                    <Text style={[styles.settingsRouteTitle, customThemeDark && paletteStyles.text]}>{language === 'pl' ? 'PANEL DEWELOPERSKI' : 'DEVELOPER PANEL'}</Text>
                    <Text style={[styles.settingsRouteDescription, customThemeDark && paletteStyles.mutedText]}>{language === 'pl' ? `Dostęp: ${developerAccess}. Narzędzia testowe.` : `Access: ${developerAccess}. Testing tools.`}</Text>
                  </View>
                  <Text style={[styles.settingsRouteArrow, customThemeDark && paletteStyles.text]}>›</Text>
                </Pressable>
              )}

              <Pressable
                onPress={() => {
                  setShowSystemSettings(false);
                  if (privacyConsent) void withdrawPrivacyConsent();
                  else setShowPrivacyConsent(true);
                }}
                style={({ pressed }) => [styles.settingsRoute, pressed && styles.buttonPressed]}
              >
                <View>
                  <Text style={[styles.settingsRouteTitle, customThemeDark && paletteStyles.text]}>{language === 'pl' ? 'UPRAWNIENIA AI' : 'AI PERMISSIONS'}</Text>
                  <Text style={[styles.settingsRouteDescription, customThemeDark && paletteStyles.mutedText]}>{privacyConsent ? (language === 'pl' ? 'Aktywne. Kliknij, aby wycofać zgodę.' : 'Active. Tap to withdraw consent.') : (language === 'pl' ? 'Nieaktywne. Kliknij, aby skonfigurować.' : 'Inactive. Tap to configure.')}</Text>
                </View>
                <View style={[styles.permissionState, privacyConsent && styles.permissionStateActive, customThemeEnabled && paletteStyles.border]} />
              </Pressable>

              <Text style={[styles.modalLabel, customThemeDark && paletteStyles.accentText]}>{language === 'pl' ? 'PRYWATNOŚĆ I PRAWO' : 'PRIVACY AND LEGAL'}</Text>
              <View style={styles.legalButtons}>
                <Pressable onPress={() => { setShowSystemSettings(false); setLegalDocument('privacy'); }} style={[styles.legalButton, customThemeEnabled && paletteStyles.border]}><Text style={[styles.legalButtonText, customThemeDark && paletteStyles.text]}>{language === 'pl' ? 'POLITYKA PRYWATNOŚCI' : 'PRIVACY POLICY'}</Text></Pressable>
                <Pressable onPress={() => { setShowSystemSettings(false); setLegalDocument('terms'); }} style={[styles.legalButton, customThemeEnabled && paletteStyles.border]}><Text style={[styles.legalButtonText, customThemeDark && paletteStyles.text]}>{language === 'pl' ? 'REGULAMIN' : 'TERMS OF SERVICE'}</Text></Pressable>
                <Pressable onPress={() => { setShowSystemSettings(false); setLegalDocument('refund'); }} style={[styles.legalButton, customThemeEnabled && paletteStyles.border]}><Text style={[styles.legalButtonText, customThemeDark && paletteStyles.text]}>{language === 'pl' ? 'POLITYKA ZWROTÓW' : 'REFUND POLICY'}</Text></Pressable>
              </View>

              {Platform.OS === 'android' && (
                <Pressable onPress={() => BackHandler.exitApp()} style={({ pressed }) => [styles.exitAppButton, pressed && styles.buttonPressed]}>
                  <Text style={styles.exitAppText}>{language === 'pl' ? 'WYJDŹ Z APLIKACJI' : 'EXIT APPLICATION'}</Text>
                </Pressable>
              )}
              <Pressable onPress={() => setShowSystemSettings(false)} style={[styles.modalClose, customThemeEnabled && paletteStyles.bar]}><Text style={[styles.modalCloseText, customThemeEnabled && { color: activePalette.onAccent }]}>{language === 'pl' ? 'GOTOWE' : 'DONE'}</Text></Pressable>
            </ScrollView>
          </View>
        )}
        {showAccount && (
          <View style={styles.modalBackdrop}>
            <View style={[styles.modalCard, customThemeDark && paletteStyles.panel]}>
              <Text style={styles.modalTitle}>{copy.account}</Text>
              {accountToken ? (
                <>
                  <Text style={styles.accountOk}>{language === 'pl' ? 'Zalogowano. Historia AI jest synchronizowana.' : 'Logged in. AI history is synchronized.'}</Text>
                  <Pressable onPress={() => { setShowAccount(false); setShowHistory(true); }} style={styles.accountHistoryLink}>
                    <Text style={styles.accountHistoryLinkText}>{language === 'pl' ? 'OTWÓRZ HISTORIĘ ANALIZ' : 'OPEN ANALYSIS HISTORY'}</Text>
                  </Pressable>
                  {developerAccess && (
                    <Pressable onPress={() => { setShowAccount(false); setShowDeveloperPanel(true); }} style={[styles.accountHistoryLink, styles.developerRoute]}>
                      <Text style={styles.accountHistoryLinkText}>{language === 'pl' ? 'OTWÓRZ PANEL DEWELOPERSKI' : 'OPEN DEVELOPER PANEL'}</Text>
                    </Pressable>
                  )}
                  <TextInput
                    autoCapitalize="none"
                    autoCorrect={false}
                    onChangeText={setNewAccountPassword}
                    placeholder={language === 'pl' ? 'Nowe hasło (min. 12 znaków)' : 'New password (12 characters minimum)'}
                    placeholderTextColor="#499BED"
                    secureTextEntry
                    style={styles.modalInput}
                    value={newAccountPassword}
                  />
                  <Pressable disabled={accountLoading || !newAccountPassword} onPress={() => void changeAccountPassword()} style={[styles.accountHistoryLink, (!newAccountPassword || accountLoading) && styles.buttonDisabled]}>
                    <Text style={styles.accountHistoryLinkText}>{language === 'pl' ? 'ZMIEŃ HASŁO' : 'CHANGE PASSWORD'}</Text>
                  </Pressable>
                  {!!accountNotice && <Text style={styles.accountOk}>{accountNotice}</Text>}
                  {!!accountError && <Text style={styles.aiError}>{accountError}</Text>}
                  <Pressable onPress={() => void logout()} style={styles.modalClose}><Text style={styles.modalCloseText}>{copy.logout}</Text></Pressable>
                  <Pressable disabled={accountLoading} onPress={() => void deleteAccount()} style={styles.deleteAccountButton}>
                    <Text style={styles.deleteAccountText}>{confirmDeleteAccount
                      ? (language === 'pl' ? 'POTWIERDŹ TRWAŁE USUNIĘCIE' : 'CONFIRM PERMANENT DELETION')
                      : (language === 'pl' ? 'USUŃ KONTO I HISTORIĘ' : 'DELETE ACCOUNT AND HISTORY')}</Text>
                  </Pressable>
                </>
              ) : (
                <>
                  <TextInput autoCapitalize="none" autoCorrect={false} onChangeText={setAccountIdentifier} placeholder={language === 'pl' ? 'Nazwa użytkownika lub e-mail' : 'Username or email'} placeholderTextColor="#499BED" style={styles.modalInput} value={accountIdentifier} />
                  <TextInput onChangeText={setAccountPassword} placeholder={language === 'pl' ? 'Hasło' : 'Password'} placeholderTextColor="#499BED" secureTextEntry style={styles.modalInput} value={accountPassword} />
                  {!!accountNotice && <Text style={styles.accountOk}>{accountNotice}</Text>}
                  {!!accountError && <Text style={styles.aiError}>{accountError}</Text>}
                  <Pressable disabled={accountLoading} onPress={() => void submitAccount()} style={[styles.modalClose, accountLoading && styles.buttonDisabled]}><Text style={styles.modalCloseText}>{accountLoading ? (language === 'pl' ? 'PROSZĘ CZEKAĆ' : 'PLEASE WAIT') : accountMode === 'login' ? copy.login : copy.register}</Text></Pressable>
                  <Pressable onPress={() => { setAccountError(''); setAccountNotice(''); setAccountMode(accountMode === 'login' ? 'register' : 'login'); }}><Text style={styles.modalLink}>{accountMode === 'login' ? copy.register : copy.login}</Text></Pressable>
                </>
              )}
              <Pressable onPress={() => { setShowAccount(false); setConfirmDeleteAccount(false); setAccountError(''); }}><Text style={styles.modalCancel}>{language === 'pl' ? 'ANULUJ' : 'CANCEL'}</Text></Pressable>
            </View>
          </View>
        )}
        {showHistory && (
          <View style={styles.modalBackdrop}>
            <View style={[styles.modalCard, styles.historyModalCard, customThemeDark && paletteStyles.panel]}>
              <Text style={styles.modalTitle}>{language === 'pl' ? 'HISTORIA ANALIZ' : 'ANALYSIS HISTORY'}</Text>
              <Text style={styles.historyIntro}>{accountToken
                ? (language === 'pl' ? 'Historia konta jest synchronizowana i przechowywana maksymalnie 7 dni.' : 'Account history is synchronized and retained for up to 7 days.')
                : (language === 'pl' ? 'Bez logowania widzisz historię tylko z bieżącej sesji.' : 'Without an account, only the current session history is available.')}</Text>
              <ScrollView style={styles.historyList} showsVerticalScrollIndicator={false}>
                {history.length === 0 ? (
                  <Text style={styles.historyEmpty}>{language === 'pl' ? 'Nie ma jeszcze żadnych analiz.' : 'There are no analyses yet.'}</Text>
                ) : history.map((item, index) => (
                  <View key={`${item.role}-${item.createdAt ?? index}`} style={styles.historyItem}>
                    <View style={[styles.historyMarker, item.role === 'assistant' && styles.historyMarkerAi]} />
                    <View style={styles.historyBody}>
                      <View style={styles.historyItemHeader}>
                        <Text style={styles.historyRole}>{item.role === 'user' ? (language === 'pl' ? 'TWOJE ZAPYTANIE' : 'YOUR REQUEST') : (language === 'pl' ? 'ODPOWIEDŹ AI' : 'AI RESPONSE')}</Text>
                        {!!item.createdAt && <Text style={styles.historyDate}>{new Date(item.createdAt).toLocaleString(language === 'pl' ? 'pl-PL' : 'en-GB')}</Text>}
                      </View>
                      <Text style={styles.historyContent}>{item.content}</Text>
                    </View>
                  </View>
                ))}
              </ScrollView>
              <Pressable onPress={() => setShowHistory(false)} style={styles.modalClose}><Text style={styles.modalCloseText}>{language === 'pl' ? 'ZAMKNIJ' : 'CLOSE'}</Text></Pressable>
            </View>
          </View>
        )}
        {legalOverlays}
        <StatusBar style={themeMode === 'light' ? 'dark' : 'light'} />
        </SafeAreaView>
      </FontFamilyContext.Provider>
    );
  }

  return (
    <FontFamilyContext.Provider value={selectedFontFamily}>
      <SafeAreaView style={[styles.safeArea, themeMode === 'light' && styles.lightSurface, customThemeDark && paletteStyles.root, workspaceStyles.root]}>
    <ScrollView
      ref={workspaceScrollRef}
      contentContainerStyle={[
        styles.container,
        themeMode === 'light' && styles.lightSurface,
        customThemeDark && paletteStyles.root,
        Platform.OS === 'android' && { paddingTop: (NativeStatusBar.currentHeight ?? 24) + 16 },
        workspaceStyles.container,
      ]}
      keyboardShouldPersistTaps="handled"
    >
      <Animated.View
        style={[
          styles.workspaceCanvas,
          workspaceStyles.canvas,
          {
            opacity: workspaceReveal,
            transform: [
              { translateY: workspaceReveal.interpolate({ inputRange: [0, 1], outputRange: [22, 0] }) },
              { scale: workspaceReveal.interpolate({ inputRange: [0, 1], outputRange: [0.985, 1] }) },
            ],
          },
        ]}
      >
        <WorkspaceChrome mode={selectedDesignMode} palette={activePalette} language={language} fontFamily={selectedFontFamily} />
        <View style={[styles.topline, themeMode === 'light' && styles.hyprWindowLight, customThemeDark && paletteStyles.panel, workspaceStyles.topline]}>
          <Pressable
            accessibilityLabel="Wróć do wyboru systemu"
            onPress={returnToMenu}
            style={styles.backButton}
          >
            <Text style={[styles.backArrow, { color: theme.soft }, themeMode === 'light' && styles.lightText, customThemeDark && paletteStyles.text, workspaceStyles.text]}>‹</Text>
          </Pressable>
          <Pressable onPress={returnToMenu}>
            <Text style={[styles.brand, { color: theme.soft }, themeMode === 'light' && styles.lightText, customThemeDark && paletteStyles.text, workspaceStyles.text]}>LINUXFIX</Text>
          </Pressable>
          <Text style={[styles.distroPill, { color: theme.soft }, themeMode === 'light' && styles.lightText, customThemeDark && paletteStyles.accentText, workspaceStyles.accent]}>{theme.label}</Text>
          {renderRgbGlow(0)}
        </View>

        <View style={[styles.workspaceIdentity, workspaceStyles.identity]}>
          <Image source={DISTRO_LOGOS[distro]} style={[styles.workspaceAvatar, workspaceStyles.avatar]} />
          <View style={{ flex: 1 }}>
            <Text style={[styles.workspaceName, workspaceStyles.name, { color: activePalette.text }, workspaceStyles.text]}>{theme.label}</Text>
            <Text style={[styles.workspaceCaption, { color: activePalette.muted }, workspaceStyles.muted]}>{DISTRO_WORKSPACE_COPY[distro][language]}</Text>
          </View>
        </View>

        <View style={[styles.composer, { backgroundColor: activePalette.surface }, workspaceStyles.composer]}>
          <View style={styles.composerHeading}>
            <Text style={[styles.composerTitle, workspaceStyles.composerTitle]}>{language === 'pl' ? 'Nowe zapytanie' : 'New request'}</Text>
            <View style={[styles.connectionChip, workspaceStyles.chip, { backgroundColor: activePalette.inset }]}>
              <View style={[styles.connectionDot, { backgroundColor: aiStatus === 'online' ? '#78B8A0' : '#A4A9B0' }]} />
              <Text style={[styles.connectionLabel, { color: activePalette.muted }, workspaceStyles.muted]}>{aiStatus === 'online' ? 'AI online' : aiStatus === 'checking' ? (language === 'pl' ? 'Łączenie' : 'Connecting') : 'AI offline'}</Text>
            </View>
          </View>
          <Text style={[styles.composerDescription, { color: activePalette.muted }, workspaceStyles.muted]}>{language === 'pl' ? 'Opisz, co chcesz zrobić, albo wklej komunikat błędu.' : 'Describe what you want to do, or paste an error message.'}</Text>
          <View style={styles.quickQuestions}>
            <Pressable onPress={() => updateProblem(language === 'pl' ? 'Jak bezpiecznie zaktualizować system?' : 'How do I safely update my system?')} style={[styles.questionChip, workspaceStyles.chip, { backgroundColor: activePalette.inset }]}>
              <Text style={{ color: activePalette.accent, fontSize: 12 }}>{language === 'pl' ? 'Aktualizacja systemu ↗' : 'System update ↗'}</Text>
            </Pressable>
            <Pressable onPress={insertExample} style={[styles.questionChip, workspaceStyles.chip, { backgroundColor: activePalette.inset }]}>
              <Text style={{ color: activePalette.accent, fontSize: 12 }}>{language === 'pl' ? 'Przykładowy błąd ↗' : 'Example error ↗'}</Text>
            </Pressable>
          </View>

        <View style={[styles.terminalFrame, themeMode === 'light' && styles.hyprWindowLight, customThemeDark && paletteStyles.panel, workspaceStyles.terminal]}>
          <View style={[styles.terminalTitlebar, customThemeEnabled && paletteStyles.bar, workspaceStyles.titlebar]}>
            <Text style={[styles.terminalTitle, workspaceStyles.titlebarText]}>{language === 'pl' ? 'Twoja wiadomość' : 'Your message'}</Text>
            <Text style={[styles.terminalCounter, workspaceStyles.titlebarText]}>{problem.length.toString().padStart(3, '0')}</Text>
          </View>
          {rgbEnabled && (
            <View style={styles.rgbSpectrum}>
              <View style={[styles.rgbSpectrumSegment, { backgroundColor: '#6DFF3A' }]} />
              <View style={[styles.rgbSpectrumSegment, { backgroundColor: '#FF2FD1' }]} />
              <View style={[styles.rgbSpectrumSegment, { backgroundColor: '#00F5FF' }]} />
              {renderRgbRunner()}
            </View>
          )}
          <View style={[styles.inputShell, themeMode === 'light' && styles.inputShellLight, customThemeDark && paletteStyles.panel, isProblemFocused && styles.inputShellFocused, workspaceStyles.inputShell]}>
            <TextInput
              maxLength={20_000}
              multiline
              onBlur={() => setIsProblemFocused(false)}
              onChangeText={updateProblem}
              onFocus={() => setIsProblemFocused(true)}
              placeholder={language === 'pl' ? 'np. Jak włączyć usługę przy starcie systemu?' : 'e.g. How do I enable a service at startup?'}
              placeholderTextColor={customThemeEnabled ? activePalette.muted : '#499BED'}
              selectionColor={customThemeEnabled ? activePalette.accent : '#DAEAFF'}
              style={[styles.input, workspaceStyles.input, themeMode === 'light' && styles.lightText, customThemeDark && paletteStyles.text, workspaceStyles.text]}
              textAlignVertical="top"
              value={problem}
            />
            {isProblemFocused && !!problem.trim() && (
              <>
                <View pointerEvents="none" style={[styles.typingRail, customThemeEnabled && paletteStyles.bar]} />
                <Animated.View pointerEvents="none" style={[styles.typingMotionTrail, customThemeEnabled && paletteStyles.bar, { opacity: typingMotion.interpolate({ inputRange: [0, 0.5, 1], outputRange: [0.02, 0.14, 0.02] }), transform: [{ translateX: typingMotion.interpolate({ inputRange: [0, 1], outputRange: [-38, 194] }) }, { scaleX: typingMotion.interpolate({ inputRange: [0, 0.5, 1], outputRange: [0.7, 1.8, 0.7] }) }] }]} />
                <Animated.View pointerEvents="none" style={[styles.typingPulseBlur, customThemeEnabled && paletteStyles.bar, { opacity: typingMotion.interpolate({ inputRange: [0, 0.5, 1], outputRange: [0.06, 0.28, 0.06] }), transform: [{ translateX: typingMotion.interpolate({ inputRange: [0, 1], outputRange: [-12, 220] }) }] }]} />
                <Animated.View pointerEvents="none" style={[styles.typingPulse, customThemeEnabled && paletteStyles.bar, { opacity: typingMotion.interpolate({ inputRange: [0, 0.5, 1], outputRange: [0.4, 1, 0.4] }), transform: [{ translateX: typingMotion.interpolate({ inputRange: [0, 1], outputRange: [0, 230] }) }] }]} />
              </>
            )}
          </View>
          {renderRgbGlow(0)}
        </View>

        <View style={[styles.actions, themeMode === 'light' && styles.hyprWindowLight, customThemeDark && paletteStyles.panel, workspaceStyles.actions]}>
          <Pressable
            disabled={aiLoading || aiStatus === 'checking'}
            onPress={analyzeWithAi}
            style={({ pressed }) => [
              styles.primaryButton,
              workspaceStyles.primary,
              { backgroundColor: activePalette.accent },
              (aiLoading || aiStatus === 'checking') && styles.buttonDisabled,
              pressed && styles.buttonPressed,
            ]}
          >
            {aiLoading ? (
              <View style={styles.loadingButtonContent}>
                <Animated.View
                  style={[
                    styles.buttonSpinner,
                    {
                      transform: [{
                        rotate: aiRotation.interpolate({ inputRange: [0, 1], outputRange: ['0deg', '360deg'] }),
                      }],
                    },
                  ]}
                />
                <Text style={[styles.primaryText, workspaceStyles.onAccent]}>{language === 'pl' ? 'ANALIZOWANIE' : 'ANALYZING'}</Text>
              </View>
            ) : <Text style={[styles.primaryText, workspaceStyles.onAccent]}>{copy.ai}</Text>}
            {renderRgbGlow(0)}
          </Pressable>
          {aiLoading && (
            <Text style={[styles.aiLoadingHint, customThemeDark && paletteStyles.mutedText, workspaceStyles.muted]}>
              {language === 'pl'
                ? 'Ollama przygotowuje odpowiedź. Pierwsza analiza może potrwać do 90 sekund.'
                : 'Ollama is preparing the response. The first analysis can take up to 90 seconds.'}
            </Text>
          )}
          <Pressable onPress={analyze} style={({ pressed }) => [styles.secondaryButton, workspaceStyles.secondary, customThemeEnabled && paletteStyles.border, pressed && styles.buttonPressed]}>
            <Text style={[styles.secondaryText, customThemeDark && paletteStyles.text, workspaceStyles.text]}>{copy.analyze}</Text>
            {renderRgbGlow(0)}
          </Pressable>
          <Pressable
            onPress={insertExample}
            style={({ pressed }) => [styles.exampleButton, pressed && styles.buttonPressed]}
          >
            <Text style={[styles.exampleButtonText, workspaceStyles.accent]}>{language === 'pl' ? 'Wstaw przykładowy błąd' : 'Use an example error'}</Text>
          </Pressable>
          {!!aiError && <Text style={[styles.aiError, workspaceStyles.muted]}>{aiError}</Text>}
        </View>
        </View>
        <Pressable onPress={() => setShowHostSettings((visible) => !visible)} style={styles.hostToggle}>
          <Text style={[styles.hostToggleText, workspaceStyles.accent]}>{showHostSettings
            ? (language === 'pl' ? 'UKRYJ USTAWIENIA HOSTA' : 'HIDE HOST SETTINGS')
            : (language === 'pl' ? 'WŁASNY HOST AI' : 'CUSTOM AI HOST')}</Text>
        </Pressable>
        {showHostSettings && (
          <>
            <Text style={[styles.backendLabel, workspaceStyles.accent]}>{language === 'pl' ? 'ADRES BACKENDU AI' : 'AI BACKEND ADDRESS'}</Text>
            <TextInput
              autoCapitalize="none"
              autoCorrect={false}
              onChangeText={setBackendUrl}
              placeholder="http://192.168.1.10:8787"
              placeholderTextColor="#499BED"
              style={[styles.backendInput, workspaceStyles.command, workspaceStyles.text]}
              value={backendUrl}
            />
            <Text style={[styles.backendHint, workspaceStyles.muted]}>
              {language === 'pl'
                ? 'Domyślny adres jest pobierany z konfiguracji LinuxFIX. To pole służy tylko jako tymczasowe nadpisanie.'
                : 'The default address comes from LinuxFIX configuration. Use this field only for a temporary override.'}
            </Text>
          </>
        )}
        {searched && !result && (
          <>
            {suggestions.length > 0 ? (
              <View style={[styles.suggestionCard, customThemeDark && paletteStyles.panel, workspaceStyles.result]}>
                <Text style={[styles.emptyTitle, customThemeDark && paletteStyles.text, workspaceStyles.text]}>{language === 'pl' ? 'Podobne problemy' : 'Similar problems'}</Text>
                <Text style={[styles.emptyText, customThemeDark && paletteStyles.mutedText, workspaceStyles.muted]}>{language === 'pl' ? 'Nie znaleziono dokładnej reguły. Sprawdź jedno z podobnych dopasowań:' : 'No exact rule was found. Review one of these similar matches:'}</Text>
                {suggestions.map((suggestion) => (
                  <Pressable key={suggestion.id} onPress={() => chooseSuggestion(suggestion)} style={styles.suggestion}>
                    <View style={styles.suggestionText}>
                      <Text style={[styles.suggestionTitle, customThemeDark && paletteStyles.text, workspaceStyles.text]}>{localizedFix(suggestion, language).title}</Text>
                      <Text style={[styles.suggestionCategory, customThemeDark && paletteStyles.accentText, workspaceStyles.accent]}>{localizedCategory(suggestion, language)}</Text>
                    </View>
                    <Text style={[styles.arrow, { color: theme.soft }]}>-&gt;</Text>
                  </Pressable>
                ))}
              </View>
            ) : (
              <View style={[styles.emptyCard, customThemeDark && paletteStyles.panel, workspaceStyles.result]}>
                <Text style={[styles.emptyTitle, customThemeDark && paletteStyles.text, workspaceStyles.text]}>{language === 'pl' ? 'Brak lokalnego dopasowania' : 'No local match'}</Text>
                <Text style={[styles.emptyText, customThemeDark && paletteStyles.mutedText, workspaceStyles.muted]}>
                  {language === 'pl'
                    ? 'Baza lokalna rozpoznaje typowe błędy. Dla pytań i nowych problemów użyj przycisku „Zapytaj AI”.'
                    : 'Local rules recognize common errors. For questions and new issues, use “Ask AI”.'}
                </Text>
              </View>
            )}
          </>
        )}

        {displayedResult && (
          <View style={[styles.resultCard, customThemeDark && paletteStyles.panel, workspaceStyles.result]}>
            <Text style={[styles.resultEyebrow, customThemeDark && paletteStyles.accentText, workspaceStyles.accent]}>{language === 'pl' ? 'DOPASOWANIE LOKALNE' : 'LOCAL MATCH'}</Text>
            <Text style={[styles.resultTitle, customThemeDark && paletteStyles.text, workspaceStyles.resultTitle]}>{displayedResult.title}</Text>
            <Text style={[styles.resultSummary, customThemeDark && paletteStyles.mutedText, workspaceStyles.muted]}>{displayedResult.summary}</Text>
            <Text style={[styles.commandLabel, customThemeDark && paletteStyles.accentText, workspaceStyles.accent]}>{language === 'pl' ? 'SUGEROWANE KROKI' : 'SUGGESTED STEPS'}</Text>
            {displayedResult.commands.map((command) => (
              <View key={command} style={[styles.command, workspaceStyles.command, customThemeDark && paletteStyles.inset]}>
                <Text style={[styles.commandText, { color: theme.soft }, customThemeDark && paletteStyles.text, workspaceStyles.text]}>{command}</Text>
              </View>
            ))}
            <Pressable onPress={openSource} style={[styles.sourceButton, workspaceStyles.source]}>
              <Text style={[styles.sourceText, { color: activePalette.accent }]}>{displayedResult.sourceLabel}  ↗</Text>
            </Pressable>
            {renderRgbGlow(0)}
          </View>
        )}

        {aiPanelVisible && (
          <Animated.View
            style={[
              styles.aiLiveWindow,
              workspaceStyles.aiWindow,
              {
                backgroundColor: aiPanelColors.background,
                borderColor: aiPanelColors.accent,
                opacity: aiPanelReveal,
                transform: [
                  { translateY: aiPanelReveal.interpolate({ inputRange: [0, 1], outputRange: [24, 0] }) },
                  { scale: aiPanelReveal.interpolate({ inputRange: [0, 1], outputRange: [0.985, 1] }) },
                ],
              },
            ]}
          >
            <View style={[styles.aiLiveWindowBar, { backgroundColor: aiPanelColors.accent }]}>
              <View style={styles.aiLiveWindowIdentity}>
                <View style={[styles.aiLiveWindowSignal, { backgroundColor: aiPanelColors.onAccent }]} />
                <Text style={[styles.aiLiveWindowTitle, { color: aiPanelColors.onAccent }]}>
                  {language === 'pl' ? 'Odpowiedź asystenta' : 'Assistant response'}
                </Text>
              </View>
              <Text style={[styles.aiLiveWindowState, { color: aiPanelColors.onAccent }]}>
                {aiLoading
                  ? (language === 'pl' ? 'PRZETWARZANIE' : 'PROCESSING')
                  : aiTyping
                    ? `${Math.round(aiTypingProgress * 100)}%`
                    : (language === 'pl' ? 'GOTOWE' : 'COMPLETE')}
              </Text>
            </View>

            <View style={[styles.aiLiveProgressTrack, { backgroundColor: aiPanelColors.inset }]}>
              <View
                style={[
                  styles.aiLiveProgressFill,
                  {
                    backgroundColor: aiPanelColors.accent,
                    width: aiLoading ? '12%' : `${Math.max(aiTypingProgress * 100, 2)}%`,
                  },
                ]}
              />
            </View>

            {aiLoading ? (
              <View style={styles.aiWaitingBody}>
                <Text style={[styles.aiTerminalPrompt, { color: aiPanelColors.accent }]}>
                  $ linuxfix-ai --distro {distro} --lang {language}
                </Text>
                <Text style={[styles.aiWaitingText, { color: aiPanelColors.muted }]}>
                  {language === 'pl'
                    ? 'Model analizuje pytanie i przygotowuje bezpieczne kroki'
                    : 'The model is analyzing the request and preparing safe steps'}
                  {aiCursor(true)}
                </Text>
                <Text style={[styles.aiWaitingMeta, { color: aiPanelColors.accent }]}>
                  {language === 'pl' ? 'POŁĄCZENIE AKTYWNE · ODPOWIEDŹ ZOSTANIE WPISANA PONIŻEJ' : 'CONNECTION ACTIVE · THE RESPONSE WILL BE TYPED BELOW'}
                </Text>
              </View>
            ) : revealedAiResult ? (
              <View style={styles.aiLiveBody}>
                <Text style={[styles.aiLiveSectionIndex, { color: aiPanelColors.accent }]}>01 / {language === 'pl' ? 'DIAGNOZA' : 'DIAGNOSIS'}</Text>
                <Text style={[styles.aiLiveResultTitle, { color: aiPanelColors.text }]}>
                  {revealedAiResult.title.text}{aiCursor(revealedAiResult.title.active)}
                </Text>
                {(revealedAiResult.cause.visible || revealedAiResult.cause.active) && (
                  <Text style={[styles.aiLiveSummary, { color: aiPanelColors.muted }]}>
                    {revealedAiResult.cause.text}{aiCursor(revealedAiResult.cause.active)}
                  </Text>
                )}

                {revealedAiResult.steps.some((step) => step.description.visible || step.command.visible || step.description.active || step.command.active) && (
                  <View style={[styles.aiLiveDivider, { backgroundColor: aiPanelColors.accent }]} />
                )}
                {revealedAiResult.steps.some((step) => step.description.visible || step.command.visible || step.description.active || step.command.active) && (
                  <Text style={[styles.aiLiveSectionIndex, { color: aiPanelColors.accent }]}>
                    02 / {language === 'pl' ? 'ZALECANE KROKI' : 'RECOMMENDED STEPS'} · {Math.round(revealedAiResult.confidence * 100)}%
                  </Text>
                )}
                {revealedAiResult.steps.map((step, index) => (
                  step.description.visible || step.command.visible || step.description.active || step.command.active
                ) ? (
                  <View key={`ai-step-${index}`} style={[styles.aiLiveStep, workspaceStyles.aiStep, { backgroundColor: aiPanelColors.inset, borderLeftColor: aiPanelColors.accent }]}>
                    <View style={styles.aiLiveStepHeader}>
                      <Text style={[styles.aiLiveStepNumber, { color: aiPanelColors.accent }]}>{String(index + 1).padStart(2, '0')}</Text>
                      <Text style={[styles.aiRisk, { color: aiPanelColors.accent }]}>{language === 'pl' ? 'RYZYKO' : 'RISK'}: {step.risk.toUpperCase()}</Text>
                    </View>
                    <Text style={[styles.aiStepDescription, { color: aiPanelColors.muted }]}>
                      {step.description.text}{aiCursor(step.description.active)}
                    </Text>
                    {(step.command.visible || step.command.active) && (
                      <View style={[styles.aiLiveCommand, { borderColor: aiPanelColors.accent }]}>
                        <Text style={[styles.aiCommandLabel, { color: aiPanelColors.accent }]}>{language === 'pl' ? 'WPISZ W TERMINALU' : 'TYPE IN TERMINAL'}</Text>
                        <Text selectable style={[styles.aiLiveCommandText, { color: aiPanelColors.text }]}>
                          {step.command.text}{aiCursor(step.command.active)}
                        </Text>
                      </View>
                    )}
                  </View>
                ) : null)}

                {revealedAiResult.sources.some((source) => source.title.visible || source.title.active) && (
                  <View style={styles.aiSources}>
                    <View style={[styles.aiLiveDivider, { backgroundColor: aiPanelColors.accent }]} />
                    <Text style={[styles.aiLiveSectionIndex, { color: aiPanelColors.accent }]}>03 / {language === 'pl' ? 'ŹRÓDŁA' : 'SOURCES'}</Text>
                    {revealedAiResult.sources.map((source) => source.title.visible || source.title.active ? (
                      <Pressable key={source.url} onPress={() => void Linking.openURL(source.url)} style={styles.aiLiveSourceLink}>
                        <Text style={[styles.aiLiveSourceText, { color: aiPanelColors.text }]}>
                          {source.title.text}{aiCursor(source.title.active)}  ↗
                        </Text>
                      </Pressable>
                    ) : null)}
                  </View>
                )}
              </View>
            ) : null}
            {renderRgbGlow(0)}
          </Animated.View>
        )}

        <View style={[styles.note, workspaceStyles.note]}>
          <Text style={[styles.noteTitle, workspaceStyles.accent]}>{copy.important}</Text>
          <Text style={[styles.noteText, workspaceStyles.muted]}>{copy.importantText}</Text>
        </View>
      </Animated.View>
      </ScrollView>
      {legalOverlays}
      <StatusBar style={themeMode === 'light' ? 'dark' : 'light'} />
      </SafeAreaView>
    </FontFamilyContext.Provider>
  );
}

const styles = StyleSheet.create({
  developerRoute: { borderColor: '#82B6D9', borderWidth: 1 },
  workspaceIdentity: { flexDirection: 'row', alignItems: 'center', gap: 16, padding: 20, borderRadius: 14, marginTop: 16 },
  workspaceAvatar: { width: 48, height: 48, borderRadius: 12 },
  workspaceName: { fontSize: 21, fontWeight: '500' },
  workspaceCaption: { fontSize: 12, lineHeight: 19, marginTop: 6 },
  composer: { padding: 20, borderRadius: 14, marginTop: 16 },
  composerHeading: { flexDirection: 'row', flexWrap: 'wrap', gap: 12, alignItems: 'center', justifyContent: 'space-between' },
  composerTitle: { fontSize: 21, fontWeight: '500', letterSpacing: -0.5 },
  composerDescription: { fontSize: 14, lineHeight: 22, marginTop: 12 },
  connectionChip: { flexDirection: 'row', alignItems: 'center', gap: 6, padding: 8, borderRadius: 6 },
  connectionDot: { width: 6, height: 6, borderRadius: 3 },
  connectionLabel: { fontSize: 10 },
  quickQuestions: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 20 },
  questionChip: { padding: 12, borderRadius: 8 },
  introPanel: { backgroundColor: '#1B2C37', borderRadius: 12, padding: 20, marginTop: 16 },
  safeArea: { flex: 1, backgroundColor: '#101C24' },
  lightSurface: { backgroundColor: '#F4F5F2' },
  lightText: { color: '#101C24' },
  lightMuted: { color: '#52636B' },
  menuSurface: { backgroundColor: '#101C24', flex: 1 },
  menuSurfaceLight: { backgroundColor: '#F4F5F2' },
  bootScreen: { alignItems: 'center', backgroundColor: '#101C24', flex: 1, justifyContent: 'center', padding: 24 },
  bootMark: { alignItems: 'center', height: 144, justifyContent: 'center', width: 144 },
  bootLogoClip: { borderRadius: 8, height: 112, overflow: 'hidden', width: 112 },
  bootLogo: { height: 112, width: 112 },
  bootScan: { backgroundColor: '#B6C7D1', height: 2, left: 0, position: 'absolute', right: 0, top: 55 },
  bootCorner: { borderColor: '#EDF3F5', height: 22, position: 'absolute', width: 22 },
  bootCornerTopLeft: { borderLeftWidth: 2, borderTopWidth: 2, left: 0, top: 0 },
  bootCornerTopRight: { borderRightWidth: 2, borderTopWidth: 2, right: 0, top: 0 },
  bootCornerBottomLeft: { borderBottomWidth: 2, borderLeftWidth: 2, bottom: 0, left: 0 },
  bootCornerBottomRight: { borderBottomWidth: 2, borderRightWidth: 2, bottom: 0, right: 0 },
  bootBrand: { color: '#B6C7D1', fontSize: 29, fontWeight: '600', letterSpacing: 4, marginTop: 24 },
  bootTitle: { color: '#EDF3F5', fontSize: 12, fontWeight: '600', letterSpacing: 2.2, marginTop: 40 },
  bootProgressTrack: { backgroundColor: '#1B2C37', height: 2, marginTop: 16, overflow: 'hidden', width: 192 },
  bootProgressFill: { backgroundColor: '#EDF3F5', height: 2, transformOrigin: 'left', width: '100%' },
  bootSubtitle: { color: '#B6C7D1', fontSize: 11, marginTop: 16 },
  container: { backgroundColor: '#101C24', flexGrow: 1, padding: 24, paddingBottom: 48 },
  workspaceCanvas: { flex: 1 },
  menuContainer: { flexGrow: 1, paddingBottom: 48, paddingHorizontal: 24 },
  hyprPanel: { alignItems: 'center', backgroundColor: '#1B2C37', borderRadius: 0, flexDirection: 'row', minHeight: 58, overflow: 'hidden', paddingHorizontal: 12, position: 'relative' },
  hyprPanelLight: { backgroundColor: '#EDF3F5' },
  hyprBrand: { alignItems: 'center', flexDirection: 'row', flex: 1 },
  hyprLogo: { borderRadius: 3, height: 32, width: 32 },
  hyprBrandName: { color: '#EDF3F5', fontSize: 13, fontWeight: '600', letterSpacing: -0.2, marginLeft: 8 },
  hyprBrandVersion: { color: '#B6C7D1', fontSize: 9, fontWeight: '600', letterSpacing: 0.9, marginLeft: 8, marginTop: 2 },
  hyprWorkspaces: { alignItems: 'center', flexDirection: 'row', gap: 4 },
  hyprWorkspaceActive: { alignItems: 'center', backgroundColor: '#EDF3F5', borderRadius: 0, height: 32, justifyContent: 'center', overflow: 'hidden', width: 34 },
  hyprWorkspaceActiveText: { color: '#101C24', fontSize: 12, fontWeight: '600' },
  hyprWorkspacePulse: { backgroundColor: '#82B6D9', bottom: 0, height: 2, position: 'absolute', width: 20 },
  hyprWorkspace: { color: '#B6C7D1', fontSize: 12, fontWeight: '600', paddingHorizontal: 7, paddingVertical: 10 },
  hyprStatus: { alignItems: 'center', flex: 1, flexDirection: 'row', justifyContent: 'flex-end' },
  hyprStatusDot: { backgroundColor: '#EDF3F5', borderRadius: 1, height: 5, marginRight: 6, width: 5 },
  hyprStatusText: { color: '#B6C7D1', fontSize: 10, fontWeight: '600', letterSpacing: 0.8 },
  rgbPanelSignal: { bottom: 0, height: 2, left: 0, position: 'absolute', right: 0 },
  rgbSpectrum: { flexDirection: 'row', height: 4, overflow: 'hidden', position: 'relative' },
  rgbSpectrumSegment: { flex: 1, height: 4 },
  rgbSpectrumRunner: { height: 4, opacity: 0.95, position: 'absolute', width: 52 },
  rgbSpectrumRunnerColor: { bottom: 0, left: 0, position: 'absolute', right: 0, top: 0 },
  rgbGlowLayer: { bottom: -3, left: -3, position: 'absolute', right: -3, top: -3, zIndex: 7 },
  rgbGlowFrameOuter: { borderWidth: 1, bottom: -2, left: -2, opacity: 0.3, position: 'absolute', right: -2, top: -2 },
  rgbGlowFrame: { borderWidth: 2, bottom: 2, left: 2, opacity: 0.82, position: 'absolute', right: 2, top: 2 },
  rgbGlowEdge: { bottom: 0, height: 3, left: 12, opacity: 0.88, position: 'absolute', right: 12 },
  hyprHeroWindow: { backgroundColor: '#1B2C37', borderRadius: 0, marginTop: 12, overflow: 'hidden' },
  hyprWindowLight: { backgroundColor: '#FFFFFF' },
  hyprWindowBar: { alignItems: 'center', backgroundColor: '#82B6D9', flexDirection: 'row', justifyContent: 'space-between', minHeight: 30, paddingHorizontal: 12 },
  hyprWindowBarLight: { backgroundColor: '#82B6D9' },
  hyprWindowPath: { color: '#EDF3F5', fontFamily: 'monospace', fontSize: 11, fontWeight: '600', letterSpacing: 0.7 },
  hyprWindowMeta: { color: '#101C24', fontSize: 10, fontWeight: '600', letterSpacing: 0.8 },
  hyprHeroBody: { minHeight: 286, paddingBottom: 34, paddingHorizontal: 24, paddingTop: 30 },
  hyprPrompt: { color: '#82B6D9', fontFamily: 'monospace', fontSize: 10, fontWeight: '600', marginBottom: 22 },
  hyprSectionIndex: { color: '#82B6D9', fontFamily: 'monospace', fontSize: 11, fontWeight: '600', letterSpacing: 1.1, marginBottom: 7 },
  crumbleTileShell: { position: 'relative' },
  crumbleTileShellSplit: { flex: 1 },
  crumbleTileFill: { flex: 1 },
  tileCrumbleLayer: { bottom: 0, left: 0, overflow: 'visible', position: 'absolute', right: 0, top: 0, zIndex: 8 },
  glassCrackMap: { bottom: 0, left: 0, position: 'absolute', right: 0, top: 0, zIndex: 12 },
  glassPieceLayer: { bottom: 0, left: 0, position: 'absolute', right: 0, top: 0, zIndex: 10 },
  glassSplinterLayer: { bottom: 0, left: 0, position: 'absolute', right: 0, top: 0, zIndex: 13 },
  uiWorkspaceTile: { backgroundColor: '#1B2C37', borderRadius: 12, marginBottom: 10, minHeight: 126, overflow: 'hidden', padding: 16 },
  uiWorkspaceHeader: { alignItems: 'flex-start', flexDirection: 'row', justifyContent: 'space-between' },
  uiWorkspaceTitle: { color: '#EDF3F5', fontSize: 19, fontWeight: '600', letterSpacing: -0.4, marginTop: 7 },
  uiWorkspaceGlyph: { color: '#82B6D9', fontSize: 23, fontWeight: '600', letterSpacing: -1 },
  uiWorkspaceFooter: { alignItems: 'center', borderTopColor: '#82B6D9', borderTopWidth: 1, flexDirection: 'row', justifyContent: 'space-between', marginTop: 'auto', paddingTop: 12 },
  uiWorkspaceMeta: { color: '#B6C7D1', fontSize: 10, fontWeight: '600', letterSpacing: 0.9 },
  hyprPrimaryWindow: { backgroundColor: '#1B2C37', borderRadius: 12, marginTop: 0, overflow: 'hidden' },
  hyprWindowPressed: { opacity: 0.7, transform: [{ scale: 0.965 }, { translateY: 3 }] },
  hyprDistroBody: { alignItems: 'center', flexDirection: 'row', minHeight: 162, padding: 20 },
  hyprDistroCopy: { flex: 1, paddingRight: 18 },
  hyprDistroTitle: { color: '#EDF3F5', fontSize: 25, fontWeight: '600', letterSpacing: -0.7 },
  hyprDistroDescription: { color: '#B6C7D1', fontSize: 12, lineHeight: 18, marginTop: 8 },
  hyprDistroLogo: { borderRadius: 3, height: 70, width: 70 },
  hyprActionLine: { alignItems: 'center', borderTopColor: '#82B6D9', borderTopWidth: 1, flexDirection: 'row', justifyContent: 'space-between', minHeight: 44, paddingHorizontal: 16 },
  hyprActionLineLight: { borderTopColor: '#82B6D9' },
  hyprActionText: { color: '#EDF3F5', fontSize: 11, fontWeight: '600', letterSpacing: 1.3 },
  hyprActionArrow: { color: '#EDF3F5', fontSize: 17 },
  hyprSplit: { flexDirection: 'row', gap: 10, marginTop: 10 },
  hyprSecondaryWindow: { backgroundColor: '#1B2C37', borderRadius: 12, flex: 1, minHeight: 172, overflow: 'hidden', padding: 14 },
  hyprNixWindow: { minHeight: 184 },
  hyprCachyWindow: { minHeight: 184 },
  hyprSecondaryHeader: { alignItems: 'center', flexDirection: 'row', justifyContent: 'space-between' },
  hyprSmallLogo: { borderRadius: 2, height: 28, width: 28 },
  hyprSecondaryTitle: { color: '#EDF3F5', fontSize: 18, fontWeight: '600', marginTop: 20 },
  hyprSecondaryDescription: { color: '#B6C7D1', fontSize: 10, lineHeight: 15, marginTop: 5 },
  hyprSecondaryAction: { color: '#EDF3F5', fontSize: 11, fontWeight: '600', letterSpacing: 1, marginTop: 'auto', paddingTop: 16 },
  hyprDisabledWindow: { opacity: 0.68 },
  hyprDisabledLogo: { opacity: 0.82 },
  hyprComingSoon: { color: '#82B6D9', fontSize: 11, fontWeight: '600', letterSpacing: 1, marginTop: 'auto', paddingTop: 16 },
  distroIconRail: { backgroundColor: '#1B2C37', marginTop: 10, minHeight: 142, paddingHorizontal: 14, paddingVertical: 13 },
  distroIconRailHeader: { alignItems: 'center', flexDirection: 'row', justifyContent: 'space-between' },
  distroIconRailEyebrow: { color: '#82B6D9', fontSize: 10, fontWeight: '600', letterSpacing: 0.9 },
  distroIconRailHint: { color: '#B6C7D1', fontSize: 9, fontWeight: '600', letterSpacing: 0.7 },
  distroIconRailItems: { alignItems: 'flex-end', flexDirection: 'row', minHeight: 88, paddingTop: 16 },
  distroIconSlot: { alignItems: 'center', flex: 1, justifyContent: 'flex-end' },
  distroRailLogo: { backgroundColor: '#FFFFFF', borderRadius: 2, height: 48, width: 48 },
  distroRailName: { color: '#EDF3F5', fontSize: 10, fontWeight: '600', marginTop: 8 },
  hyprDock: { alignItems: 'stretch', backgroundColor: '#1B2C37', borderRadius: 0, flexDirection: 'row', marginTop: 10, minHeight: 66 },
  hyprDockCommand: { flex: 1, justifyContent: 'center', paddingHorizontal: 10 },
  hyprDockIndex: { color: '#82B6D9', fontFamily: 'monospace', fontSize: 10, fontWeight: '600' },
  hyprDockLabel: { color: '#EDF3F5', fontSize: 11, fontWeight: '600', letterSpacing: 0.6, marginTop: 5 },
  hyprDockValue: { color: '#82B6D9', fontSize: 11, fontWeight: '600', position: 'absolute', right: 8, top: 11 },
  hyprDockDivider: { alignSelf: 'stretch', backgroundColor: '#82B6D9', opacity: 0.55, width: 1 },
  menuTopbar: { alignItems: 'center', flexDirection: 'row', justifyContent: 'space-between', paddingTop: 16 },
  menuIdentity: { alignItems: 'center', flexDirection: 'row' },
  menuLogo: { borderColor: '#1B2C37', borderRadius: 8, borderWidth: 1, height: 42, width: 42 },
  menuWordmark: { color: '#B6C7D1', fontSize: 18, fontWeight: '600', letterSpacing: -0.4, marginLeft: 8 },
  menuVersion: { color: '#B6C7D1', fontSize: 10, fontWeight: '600', letterSpacing: 1.2, marginLeft: 8, marginTop: 2 },
  menuTopActions: { alignItems: 'center', flexDirection: 'row', gap: 8 },
  menuIconButton: { alignItems: 'center', backgroundColor: '#1B2C37', borderRadius: 8, height: 40, justifyContent: 'center', width: 40 },
  menuIconText: { color: '#B6C7D1', fontSize: 11, fontWeight: '600' },
  menuAccountButton: { alignItems: 'center', backgroundColor: '#EDF3F5', borderRadius: 8, flexDirection: 'row', height: 40, paddingHorizontal: 16 },
  menuAccountDot: { backgroundColor: '#101C24', borderRadius: 2, height: 5, marginRight: 7, width: 5 },
  menuAccountText: { color: '#101C24', fontSize: 10, fontWeight: '600' },
  menuHero: { marginTop: 64 },
  historyShortcut: { alignItems: 'center', borderBottomColor: '#82B6D9', borderBottomWidth: 1, borderTopColor: '#82B6D9', borderTopWidth: 1, flexDirection: 'row', justifyContent: 'space-between', marginTop: 32, paddingVertical: 18 },
  historyShortcutLabel: { color: '#EDF3F5', fontSize: 11, fontWeight: '600', letterSpacing: 1.2 },
  historyShortcutHint: { color: '#B6C7D1', fontSize: 11, marginTop: 5 },
  historyShortcutArrow: { color: '#EDF3F5', fontSize: 21 },
  menuSectionHeader: { alignItems: 'flex-end', flexDirection: 'row', justifyContent: 'space-between', marginBottom: 14, marginTop: 34 },
  menuSectionTitle: { color: '#EDF3F5', fontSize: 20, fontWeight: '600', letterSpacing: -0.5 },
  menuSectionCount: { color: '#82B6D9', fontSize: 11, fontWeight: '600', letterSpacing: 1.2 },
  premiumDistroCard: { backgroundColor: '#1B2C37', borderRadius: 10, marginTop: 16, overflow: 'hidden' },
  premiumDistroCardPressed: { opacity: 0.82, transform: [{ scale: 0.988 }] },
  debianPremiumCard: { backgroundColor: '#EDF3F5' },
  distroCardContent: { minHeight: 224, padding: 24 },
  distroCardTopline: { alignItems: 'flex-start', flexDirection: 'row', justifyContent: 'space-between' },
  premiumDistroIcon: { backgroundColor: '#101C24', borderRadius: 8, height: 48, overflow: 'hidden', padding: 3, width: 48 },
  debianPremiumIcon: { backgroundColor: '#B6C7D1' },
  premiumDistroLogo: { borderRadius: 6, height: '100%', width: '100%' },
  premiumDistroContent: { marginTop: 24 },
  premiumDistroTitle: { color: '#B6C7D1', fontSize: 25, fontWeight: '600', letterSpacing: -0.7 },
  premiumDistroDescription: { color: '#B6C7D1', fontSize: 13, lineHeight: 20, marginTop: 8, maxWidth: 310 },
  debianDistroTitle: { color: '#101C24' },
  debianDistroDescription: { color: '#101C24' },
  distroCardFooter: { alignItems: 'center', flexDirection: 'row', justifyContent: 'space-between', marginTop: 'auto', paddingTop: 20 },
  distroCapability: { color: '#B6C7D1', fontSize: 10, fontWeight: '600', letterSpacing: 1.1 },
  debianDistroCapability: { color: '#101C24' },
  distroArrowCircle: { alignItems: 'flex-end', height: 32, justifyContent: 'center', width: 32 },
  distroArrow: { color: '#EDF3F5', fontSize: 22, fontWeight: '400' },
  debianDistroArrow: { color: '#101C24' },
  futureDistroCard: { alignItems: 'center', backgroundColor: '#1B2C37', borderRadius: 10, flexDirection: 'row', marginTop: 16, padding: 16 },
  futureDistroIcon: { borderRadius: 7, height: 38, opacity: 0.55, overflow: 'hidden', width: 38 },
  futureDistroLogo: { height: '100%', width: '100%' },
  futureDistroText: { flex: 1, marginLeft: 12 },
  futureDistroTitle: { color: '#B6C7D1', fontSize: 13, fontWeight: '600' },
  futureDistroDescription: { color: '#B6C7D1', fontSize: 10, marginTop: 4 },
  futureBadge: { color: '#B6C7D1', fontSize: 10, fontWeight: '600', letterSpacing: 1.2 },
  menuTrustRow: { alignItems: 'center', flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'center', marginTop: 24 },
  menuTrustItem: { alignItems: 'center', flexDirection: 'row' },
  trustDot: { backgroundColor: '#EDF3F5', borderRadius: 1, height: 4, marginRight: 7, width: 4 },
  menuTrustText: { color: '#B6C7D1', fontSize: 11, fontWeight: '600' },
  menuTrustDivider: { color: '#82B6D9', marginHorizontal: 8 },
  menuTools: { flexDirection: 'row', gap: 10, marginTop: 22 },
  toolButton: { borderColor: '#1B2C37', borderRadius: 8, borderWidth: 1, flex: 1, padding: 13 },
  toolButtonText: { color: '#EDF3F5', fontSize: 11, fontWeight: '600', textAlign: 'center' },
  distroLoadingOverlay: { alignItems: 'center', backgroundColor: '#101C24', bottom: 0, justifyContent: 'center', left: 0, padding: 24, position: 'absolute', right: 0, top: 0, zIndex: 10 },
  loadingLogoStage: { alignItems: 'center', height: 142, justifyContent: 'center', position: 'relative', width: 142 },
  loadingOrbitOuter: { borderRadius: 0, borderWidth: 3, height: 124, position: 'absolute', width: 124 },
  loadingOrbitInner: { borderRadius: 0, borderWidth: 1, height: 104, position: 'absolute', width: 104 },
  distroLoadingLogo: { borderRadius: 6, height: 78, width: 78 },
  distroLoadingTitle: { color: '#B6C7D1', fontSize: 22, fontWeight: '600', letterSpacing: 1.4, marginTop: 24 },
  distroLoadingText: { color: '#EDF3F5', fontSize: 12, fontWeight: '600', letterSpacing: 1.8, marginTop: 9 },
  loadingProgressTrack: { height: 2, marginTop: 20, overflow: 'hidden', width: 150 },
  loadingProgressFill: { height: 2, transformOrigin: 'left center', width: '100%' },
  modalBackdrop: { alignItems: 'center', backgroundColor: 'rgba(3,23,37,0.94)', bottom: 0, justifyContent: 'center', left: 0, padding: 16, position: 'absolute', right: 0, top: 0, zIndex: 20 },
  modalCard: { backgroundColor: '#1B2C37', borderRadius: 16, padding: 24, width: '100%' },
  settingsCard: { height: '88%', maxHeight: '88%' },
  settingsScroll: { flexShrink: 1, minHeight: 0 },
  settingsScrollContent: { paddingBottom: 8 },
  modalTitle: { backgroundColor: '#101C24', borderRadius: 10, padding: 18, color: '#EDF3F5', fontSize: 21, fontWeight: '500', marginBottom: 16 },
  modalLabel: { backgroundColor: '#101C24', borderRadius: 8, padding: 12, color: '#B6C7D1', fontSize: 11, fontWeight: '500', marginTop: 20 },
  choiceRow: { flexDirection: 'row', gap: 8, marginTop: 8 },
  choice: { borderColor: '#526773', borderRadius: 10, borderWidth: 1, flex: 1, padding: 12 },
  choiceActive: { backgroundColor: '#EDF3F5', borderColor: '#EDF3F5' },
  choiceText: { color: '#B6C7D1', fontSize: 11, fontWeight: '600', textAlign: 'center' },
  choiceTextActive: { color: '#101C24' },
  colorThemeGrid: { flexDirection: 'row', gap: 8, marginTop: 8 },
  colorThemeChoice: { backgroundColor: '#101C24', borderColor: '#526773', borderRadius: 10, borderWidth: 1, flex: 1, minHeight: 106, padding: 12 },
  colorThemeChoiceActive: { backgroundColor: '#EDF3F5', borderColor: '#EDF3F5' },
  colorPreview: { flexDirection: 'row', gap: 4 },
  colorPreviewBar: { flex: 1, height: 18 },
  colorThemeTitle: { color: '#EDF3F5', fontSize: 10, fontWeight: '600', letterSpacing: 0.8, marginTop: 12 },
  colorThemeTitleActive: { color: '#101C24' },
  colorThemeDescription: { color: '#82B6D9', fontSize: 12, lineHeight: 13, marginTop: 4 },
  fontThemeGrid: { flexDirection: 'row', gap: 8, marginTop: 8 },
  fontThemeChoice: { backgroundColor: '#101C24', borderColor: '#526773', borderRadius: 10, borderWidth: 1, flex: 1, minHeight: 136, paddingHorizontal: 8, paddingVertical: 14 },
  fontThemeChoiceActive: { backgroundColor: '#EDF3F5', borderColor: '#EDF3F5' },
  fontThemeSample: { color: '#EDF3F5', fontSize: 27, lineHeight: 32 },
  fontThemeSampleSystem: { fontFamily: Platform.OS === 'ios' ? 'System' : 'sans-serif' },
  fontThemeSampleActive: { color: '#101C24' },
  fontThemeTitle: { color: '#EDF3F5', fontSize: 12, fontWeight: '600', letterSpacing: 0.5, marginTop: 9 },
  fontThemeTitleActive: { color: '#101C24' },
  fontThemeDescription: { color: '#82B6D9', fontSize: 12, lineHeight: 13, marginTop: 5 },
  fontThemeTerminalSample: { fontSize: 30, fontWeight: '700', lineHeight: 34 },
  fontThemeTerminalTitle: { fontSize: 10, fontWeight: '700' },
  fontThemeTerminalDescription: { fontSize: 12, lineHeight: 13 },
  soundSetting: { alignItems: 'center', backgroundColor: '#101C24', borderRadius: 16, flexDirection: 'row', justifyContent: 'space-between', marginTop: 8, padding: 14 },
  soundSettingTitle: { color: '#EDF3F5', fontSize: 10, fontWeight: '600', letterSpacing: 0.8 },
  soundSettingDescription: { color: '#B6C7D1', fontSize: 12, lineHeight: 14, marginTop: 4, maxWidth: 220 },
  soundIndicator: { alignItems: 'center', borderColor: '#82B6D9', borderRadius: 0, borderWidth: 1, height: 28, justifyContent: 'center', width: 28 },
  soundIndicatorActive: { backgroundColor: '#EDF3F5', borderColor: '#EDF3F5' },
  soundIndicatorCore: { backgroundColor: '#82B6D9', height: 6, width: 6 },
  soundIndicatorCoreActive: { backgroundColor: '#101C24' },
  modalClose: { backgroundColor: '#EDF3F5', borderRadius: 10, marginTop: 24, padding: 16 },
  modalCloseText: { color: '#101C24', fontSize: 11, fontWeight: '600', textAlign: 'center' },
  modalCancel: { backgroundColor: '#101C24', borderRadius: 10, padding: 16, color: '#B6C7D1', fontSize: 10, fontWeight: '600', marginTop: 16, textAlign: 'center' },
  modalLink: { backgroundColor: '#101C24', borderRadius: 10, padding: 16, color: '#EDF3F5', fontSize: 11, fontWeight: '600', marginTop: 16, textAlign: 'center' },
  legalButtons: { gap: 8, marginTop: 8 },
  legalButton: { backgroundColor: '#101C24', borderRadius: 10, padding: 16, minHeight: 48 },
  legalButtonText: { color: '#B6C7D1', fontSize: 11, fontWeight: '600', letterSpacing: 0.5 },
  settingsWindowPath: { backgroundColor: '#101C24', borderRadius: 10, padding: 16, color: '#82B6D9', fontFamily: 'monospace', fontSize: 12, fontWeight: '600', letterSpacing: 0.8, marginBottom: 8, marginTop: -12 },
  settingsRoute: { backgroundColor: '#101C24', borderRadius: 10, alignItems: 'center', flexDirection: 'row', justifyContent: 'space-between', minHeight: 84, marginTop: 10, padding: 16 },
  settingsRouteTitle: { color: '#EDF3F5', fontSize: 11, fontWeight: '600', letterSpacing: 0.7 },
  settingsRouteDescription: { color: '#B6C7D1', fontSize: 10, lineHeight: 15, marginTop: 5, maxWidth: 260 },
  settingsRouteArrow: { color: '#EDF3F5', fontSize: 20 },
  permissionState: { borderColor: '#82B6D9', borderWidth: 1, height: 12, width: 12 },
  permissionStateActive: { backgroundColor: '#EDF3F5' },
  exitAppButton: { borderColor: '#C40361', borderWidth: 1, marginTop: 26, padding: 15 },
  exitAppText: { color: '#FFE9F8', fontSize: 10, fontWeight: '600', letterSpacing: 1, textAlign: 'center' },
  consentStatus: { color: '#B6C7D1', fontSize: 11, lineHeight: 17, marginTop: 14, textAlign: 'center' },
  consentIntro: { backgroundColor: '#101C24', borderRadius: 10, padding: 16, color: '#B6C7D1', fontSize: 13, lineHeight: 20 },
  consentRow: { alignItems: 'flex-start', flexDirection: 'row', gap: 12, marginTop: 18 },
  consentBox: { alignItems: 'center', borderColor: '#EDF3F5', borderRadius: 0, borderWidth: 1, height: 22, justifyContent: 'center', width: 22 },
  consentBoxActive: { backgroundColor: '#EDF3F5' },
  consentMark: { color: '#101C24', fontSize: 14, fontWeight: '600' },
  consentText: { color: '#B6C7D1', flex: 1, fontSize: 12, lineHeight: 18 },
  legalBackdrop: { zIndex: 30 },
  legalCard: { maxHeight: '88%' },
  legalScroll: { maxHeight: 480 },
  legalText: { backgroundColor: '#101C24', borderRadius: 10, padding: 16, color: '#B6C7D1', fontSize: 12, lineHeight: 19 },
  deleteAccountButton: { borderColor: '#B6C7D1', borderRadius: 10, borderWidth: 1, marginTop: 12, padding: 13 },
  deleteAccountText: { color: '#B6C7D1', fontSize: 10, fontWeight: '600', textAlign: 'center' },
  modalInput: { backgroundColor: '#101C24', borderColor: '#526773', borderRadius: 10, borderWidth: 1, color: '#B6C7D1', marginTop: 8, padding: 16 },
  accountOk: { backgroundColor: '#101C24', borderRadius: 10, padding: 16, color: '#EDF3F5', fontSize: 14, lineHeight: 21 },
  accountHistoryLink: { borderBottomColor: '#82B6D9', borderBottomWidth: 1, borderTopColor: '#82B6D9', borderTopWidth: 1, marginTop: 20, paddingVertical: 14 },
  accountHistoryLinkText: { color: '#B6C7D1', fontSize: 11, fontWeight: '600', textAlign: 'center' },
  historyModalCard: { maxHeight: '86%' },
  historyIntro: { backgroundColor: '#101C24', borderRadius: 16, color: '#B6C7D1', fontSize: 12, lineHeight: 18, padding: 14 },
  historyList: { maxHeight: 420, marginTop: 8 },
  historyEmpty: { backgroundColor: '#101C24', borderRadius: 10, padding: 16, color: '#B6C7D1', fontSize: 13, paddingVertical: 28, textAlign: 'center' },
  historyItem: { backgroundColor: '#101C24', borderRadius: 12, flexDirection: 'row', padding: 16, marginTop: 12 },
  historyMarker: { backgroundColor: '#B6C7D1', height: 7, marginRight: 12, marginTop: 4, width: 7 },
  historyMarkerAi: { backgroundColor: '#EDF3F5' },
  historyBody: { flex: 1 },
  historyItemHeader: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between', gap: 8 },
  historyRole: { color: '#EDF3F5', fontSize: 12, fontWeight: '600', letterSpacing: 1 },
  historyDate: { color: '#82B6D9', fontSize: 12 },
  historyContent: { color: '#B6C7D1', fontSize: 14, lineHeight: 22, marginTop: 10 },
  menuTitle: { color: '#EDF3F5', fontSize: 38, fontWeight: '600', letterSpacing: -1.7, lineHeight: 42, marginTop: 0 },
  menuSubtitle: { color: '#B6C7D1', fontSize: 13, lineHeight: 20, marginTop: 18, maxWidth: 335 },
  arrow: { fontSize: 20, fontWeight: '600' },
  topline: { alignItems: 'center', backgroundColor: '#1B2C37', borderRadius: 12, flexDirection: 'row', gap: 8, minHeight: 52, paddingHorizontal: 10 },
  backButton: { alignItems: 'center', height: 38, justifyContent: 'center', width: 30 },
  backArrow: { fontSize: 32, fontWeight: '300', lineHeight: 32 },
  brand: { color: '#EDF3F5', fontSize: 16, fontWeight: '600', letterSpacing: 4 },
  badge: { backgroundColor: '#1B2C37', borderRadius: 4, color: '#EDF3F5', fontSize: 10, fontWeight: '600', paddingHorizontal: 7, paddingVertical: 4 },
  distroPill: { fontSize: 10, fontWeight: '600', letterSpacing: 1, marginLeft: 'auto' },
  workspaceSignal: { backgroundColor: '#1B2C37', borderLeftWidth: 0, borderRadius: 16, marginTop: 28, padding: 24 },
  workspaceEyebrow: { fontSize: 12, fontWeight: '600', letterSpacing: 1.8 },
  workspaceDistro: { color: '#B6C7D1', fontSize: 27, fontWeight: '600', letterSpacing: -0.8, marginTop: 6 },
  workspaceDescription: { color: '#B6C7D1', fontSize: 13, lineHeight: 19, marginTop: 7 },
  title: { color: '#EDF3F5', fontSize: 25, fontWeight: '500', lineHeight: 33 },
  subtitle: { color: '#B6C7D1', fontSize: 14, lineHeight: 22, marginTop: 10 },
  diagnosticStrip: { backgroundColor: '#1B2C37', borderRadius: 16, flexDirection: 'row', marginTop: 26, padding: 15 },
  diagnosticStripItem: { flex: 1 },
  diagnosticStripDivider: { backgroundColor: '#82B6D9', marginHorizontal: 16, width: 1 },
  diagnosticStripLabel: { color: '#EDF3F5', fontSize: 11, fontWeight: '600', letterSpacing: 1.2 },
  diagnosticStripValue: { color: '#B6C7D1', fontSize: 11, fontWeight: '600', marginTop: 6 },
  status: { alignItems: 'center', backgroundColor: '#1B2C37', borderRadius: 12, flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 16, padding: 16 },
  statusDot: { backgroundColor: '#82B6D9', borderRadius: 2, height: 8, marginRight: 9, width: 8 },
  statusDotOnline: { backgroundColor: '#EDF3F5' },
  statusDotOffline: { backgroundColor: '#B6C7D1' },
  statusText: { color: '#B6C7D1', fontSize: 11, fontWeight: '600', letterSpacing: 1 },
  aiStatusText: { color: '#EDF3F5', fontSize: 10, fontWeight: '600', letterSpacing: 1, marginLeft: 'auto' },
  label: { color: '#B6C7D1', fontSize: 11, fontWeight: '600', letterSpacing: 1.5, marginBottom: 8, marginTop: 32 },
  terminalFrame: { backgroundColor: '#101C24', borderRadius: 10, marginTop: 18, overflow: 'hidden' },
  terminalTitlebar: { alignItems: 'center', backgroundColor: '#263B49', flexDirection: 'row', justifyContent: 'space-between', minHeight: 38, paddingHorizontal: 14 },
  terminalTitle: { color: '#B6C7D1', fontSize: 11, fontWeight: '500' },
  terminalCounter: { color: '#B6C7D1', fontSize: 10 },
  inputShell: { backgroundColor: '#101C24', borderColor: 'transparent', borderWidth: 1, height: 180, overflow: 'hidden', position: 'relative' },
  inputShellLight: { backgroundColor: '#EDF3F5' },
  inputShellFocused: { borderColor: '#EDF3F5' },
  input: { color: '#EDF3F5', fontSize: 15, height: '100%', lineHeight: 24, padding: 16 },
  typingRail: { backgroundColor: '#82B6D9', bottom: 11, height: 1, left: 15, position: 'absolute', right: 15 },
  typingMotionTrail: { backgroundColor: '#82B6D9', bottom: 5, height: 12, left: 15, position: 'absolute', width: 88 },
  typingPulseBlur: { backgroundColor: '#EDF3F5', bottom: 8, height: 7, left: 15, position: 'absolute', width: 72 },
  typingPulse: { backgroundColor: '#EDF3F5', bottom: 10, height: 2, left: 15, position: 'absolute', width: 54 },
  actions: { gap: 10, marginTop: 18 },
  primaryButton: { alignItems: 'center', backgroundColor: '#82B6D9', borderRadius: 10, padding: 18, minHeight: 54 },
  primaryText: { color: '#101C24', fontSize: 12, fontWeight: '600', letterSpacing: 1 },
  buttonDisabled: { opacity: 0.45 },
  buttonPressed: { opacity: 0.78 },
  loadingButtonContent: { alignItems: 'center', flexDirection: 'row', gap: 9 },
  buttonSpinner: { borderColor: '#82B6D9', borderRadius: 8, borderRightColor: '#EDF3F5', borderTopColor: '#B6C7D1', borderWidth: 2, height: 16, width: 16 },
  aiLoadingHint: { backgroundColor: '#101C24', borderRadius: 10, padding: 16, color: '#B6C7D1', fontSize: 11, lineHeight: 16, paddingHorizontal: 8, textAlign: 'center' },
  secondaryButton: { alignItems: 'center', borderColor: '#526773', borderRadius: 10, borderWidth: 1, padding: 14 },
  secondaryText: { color: '#EDF3F5', fontSize: 12, fontWeight: '600', letterSpacing: 1 },
  exampleButton: { backgroundColor: '#101C24', borderRadius: 10, padding: 16, alignItems: 'center' },
  exampleButtonText: { color: '#B6C7D1', fontSize: 11, fontWeight: '700' },
  backendLabel: { backgroundColor: '#101C24', borderRadius: 10, padding: 16, color: '#B6C7D1', fontSize: 10, fontWeight: '600', letterSpacing: 1.2, marginTop: 16 },
  backendInput: { backgroundColor: '#1B2C37', borderColor: '#526773', borderRadius: 0, borderWidth: 1, color: '#EDF3F5', fontFamily: 'monospace', fontSize: 12, marginTop: 8, padding: 12 },
  backendHint: { backgroundColor: '#101C24', borderRadius: 10, padding: 16, color: '#82B6D9', fontSize: 11, lineHeight: 16, marginTop: 6 },
  hostToggle: { backgroundColor: '#1B2C37', borderRadius: 12, marginTop: 16, padding: 20 },
  hostToggleText: { color: '#EDF3F5', fontSize: 10, fontWeight: '600', letterSpacing: 1 },
  aiError: { color: '#B6C7D1', fontSize: 13, lineHeight: 19, marginTop: 12 },
  resultCard: { backgroundColor: '#1B2C37', borderRadius: 16, marginTop: 24, padding: 24 },
  resultEyebrow: { color: '#EDF3F5', fontSize: 10, fontWeight: '600', letterSpacing: 1.5 },
  resultTitle: { color: '#B6C7D1', fontSize: 24, fontWeight: '600', marginTop: 8 },
  resultSummary: { color: '#B6C7D1', fontSize: 14, lineHeight: 21, marginTop: 10 },
  commandLabel: { color: '#82B6D9', fontSize: 10, fontWeight: '600', letterSpacing: 1.5, marginTop: 20 },
  command: { backgroundColor: '#101C24', borderRadius: 10, marginTop: 8, padding: 11 },
  commandText: { color: '#EDF3F5', fontFamily: 'monospace', fontSize: 12 },
  sourceButton: { backgroundColor: '#101C24', borderRadius: 10, padding: 16, marginTop: 16 },
  sourceText: { color: '#EDF3F5', fontSize: 13, fontWeight: '600' },
  aiSources: { marginTop: 8 },
  aiSourceLink: { paddingVertical: 8 },
  aiCard: { backgroundColor: '#1B2C37', borderRadius: 16, marginTop: 24, padding: 24 },
  aiCardHeader: { alignItems: 'center', flexDirection: 'row', justifyContent: 'space-between' },
  aiLiveStatus: { alignItems: 'center', flexDirection: 'row', gap: 6 },
  aiLiveDot: { backgroundColor: '#EDF3F5', height: 5, width: 5 },
  aiLiveText: { color: '#EDF3F5', fontSize: 11, fontWeight: '600', letterSpacing: 1 },
  aiLiveWindow: { borderRadius: 14, borderWidth: 0, marginTop: 20, overflow: 'hidden', position: 'relative' },
  aiLiveWindowBar: { alignItems: 'center', flexDirection: 'row', flexWrap: 'wrap', gap: 10, justifyContent: 'space-between', minHeight: 56, padding: 16 },
  aiLiveWindowIdentity: { alignItems: 'center', flexDirection: 'row', gap: 8 },
  aiLiveWindowSignal: { height: 6, width: 6 },
  aiLiveWindowTitle: { fontSize: 11, fontWeight: '600', letterSpacing: 1.1 },
  aiLiveWindowState: { fontSize: 11, fontWeight: '600', letterSpacing: 0.9 },
  aiLiveProgressTrack: { height: 3, overflow: 'hidden', width: '100%' },
  aiLiveProgressFill: { height: 3, minWidth: 8 },
  aiWaitingBody: { minHeight: 152, paddingHorizontal: 18, paddingVertical: 22 },
  aiTerminalPrompt: { fontFamily: 'monospace', fontSize: 10, fontWeight: '600', letterSpacing: 0.2 },
  aiWaitingText: { fontSize: 15, lineHeight: 23, marginTop: 18 },
  aiWaitingMeta: { fontFamily: 'monospace', fontSize: 10, fontWeight: '600', letterSpacing: 0.75, lineHeight: 12, marginTop: 22 },
  aiLiveBody: { paddingBottom: 22, paddingHorizontal: 18, paddingTop: 20 },
  aiLiveSectionIndex: { fontFamily: 'monospace', fontSize: 11, fontWeight: '600', letterSpacing: 1.15, marginBottom: 8 },
  aiLiveResultTitle: { fontSize: 25, fontWeight: '500', letterSpacing: -0.5, lineHeight: 33 },
  aiLiveSummary: { fontSize: 15, lineHeight: 24, marginTop: 14 },
  aiLiveDivider: { height: 1, marginBottom: 16, marginTop: 20, opacity: 0.72 },
  aiLiveStep: { borderLeftWidth: 0, borderRadius: 10, marginTop: 12, padding: 18 },
  aiLiveStepHeader: { alignItems: 'center', flexDirection: 'row', justifyContent: 'space-between', marginBottom: 8 },
  aiLiveStepNumber: { fontFamily: 'monospace', fontSize: 11, fontWeight: '600', letterSpacing: 1 },
  aiLiveCommand: { borderTopWidth: 1, marginTop: 11, paddingTop: 10 },
  aiCommandLabel: { fontSize: 10, fontWeight: '700', letterSpacing: 1, marginBottom: 7 },
  aiLiveCommandText: { fontFamily: 'monospace', fontSize: 12, lineHeight: 18 },
  aiCursor: { fontSize: 14, fontWeight: '600', lineHeight: 18 },
  aiLiveSourceLink: { borderTopWidth: 0, paddingVertical: 7 },
  aiLiveSourceText: { fontSize: 12, fontWeight: '600', lineHeight: 18 },
  aiStep: { backgroundColor: '#101C24', borderRadius: 0, marginTop: 10, padding: 12 },
  aiStepDescription: { color: '#B6C7D1', fontSize: 14, lineHeight: 23 },
  aiRisk: { color: '#B6C7D1', fontSize: 10, fontWeight: '600', letterSpacing: 1, marginTop: 8 },
  emptyCard: { backgroundColor: '#1B2C37', borderRadius: 16, marginTop: 24, padding: 24 },
  emptyTitle: { color: '#B6C7D1', fontSize: 17, fontWeight: '600' },
  emptyText: { color: '#B6C7D1', fontSize: 14, lineHeight: 21, marginTop: 8 },
  note: { backgroundColor: '#1B2C37', borderRadius: 12, marginTop: 16, padding: 20 },
  noteTitle: { color: '#EDF3F5', fontSize: 10, fontWeight: '600', letterSpacing: 1.5 },
  noteText: { color: '#82B6D9', fontSize: 12, lineHeight: 18, marginTop: 7 },
  suggestionCard: { backgroundColor: '#1B2C37', borderRadius: 16, marginTop: 24, padding: 24 },
  suggestion: { alignItems: 'center', borderTopColor: '#82B6D9', borderTopWidth: 1, flexDirection: 'row', marginTop: 16, paddingTop: 16 },
  suggestionText: { flex: 1 },
  suggestionTitle: { color: '#B6C7D1', fontSize: 15, fontWeight: '600' },
  suggestionCategory: { color: '#82B6D9', fontSize: 11, marginTop: 4 },
});

function rulesForDistro(distro: Distro | null): ErrorRule[] {
  const selected = distro ?? 'arch';
  return errorDatabase.filter((rule) => (rule.distro ?? 'arch') === selected || rule.distro === 'all');
}

function findSuggestions(input: string, distro: Distro | null): ErrorRule[] {
  const queryTokens = tokenize(input);
  if (queryTokens.length === 0) {
    return [];
  }

  return rulesForDistro(distro)
    .map((rule) => ({
      rule,
      score: scoreRule(queryTokens, rule),
    }))
    .filter(({ score }) => score >= 0.48)
    .sort((left, right) => right.score - left.score)
    .slice(0, 3)
    .map(({ rule }) => rule);
}

function scoreRule(queryTokens: string[], rule: ErrorRule): number {
  const searchable = tokenize([
    rule.id.replaceAll('-', ' '),
    rule.category,
    rule.fix.title,
    rule.fix.summary,
    ...rule.fix.commands,
  ].join(' '));

  const scores = queryTokens.map((queryToken) => {
    if (searchable.includes(queryToken)) {
      return 1;
    }

    return Math.max(...searchable.map((candidate) => similarity(queryToken, candidate)));
  });

  return scores.reduce((total, score) => total + score, 0) / scores.length;
}

function tokenize(value: string): string[] {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9ąćęłńóśźż-]+/gi, ' ')
    .split(/\s+/)
    .filter((token) => token.length >= 3);
}

function similarity(left: string, right: string): number {
  const distance = levenshtein(left, right);
  return 1 - distance / Math.max(left.length, right.length);
}

function levenshtein(left: string, right: string): number {
  const previous = Array.from({ length: right.length + 1 }, (_, index) => index);

  for (let leftIndex = 1; leftIndex <= left.length; leftIndex += 1) {
    let diagonal = previous[0];
    previous[0] = leftIndex;

    for (let rightIndex = 1; rightIndex <= right.length; rightIndex += 1) {
      const saved = previous[rightIndex];
      previous[rightIndex] = Math.min(
        previous[rightIndex] + 1,
        previous[rightIndex - 1] + 1,
        diagonal + (left[leftIndex - 1] === right[rightIndex - 1] ? 0 : 1),
      );
      diagonal = saved;
    }
  }

  return previous[right.length];
}
