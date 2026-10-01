import { StyleSheet } from 'react-native';
import type { DesignMode } from '../components/DesignHome';

export type WorkspacePalette = {
  background: string; surface: string; inset: string; accent: string;
  muted: string; text: string; hot: string; onAccent: string;
};

export const designNames: Record<DesignMode, string> = {
  current: 'Quiet', classic: 'Classic', hyprland: 'Hyprland', mosaic: 'Mosaic', atelier: 'Atelier', clarity: 'Clarity',
};

export const mosaicTileColors = ['#315781', '#805325', '#494E80', '#405F3D', '#794552'];

const palettes: Record<Exclude<DesignMode, 'current'>, { dark: WorkspacePalette; light: WorkspacePalette }> = {
  classic: {
    dark: { background: '#121810', surface: '#202A19', inset: '#151E11', accent: '#C4CE9C', muted: '#A9B39E', text: '#F0EFDF', hot: '#D8D5AE', onAccent: '#18200F' },
    light: { background: '#F2F1E9', surface: '#FFFFFF', inset: '#E8ECDf', accent: '#415D35', muted: '#5F6A59', text: '#20291D', hot: '#53652C', onAccent: '#FFFFFF' },
  },
  hyprland: {
    dark: { background: '#031725', surface: '#0A2A47', inset: '#041C30', accent: '#71B9FF', muted: '#A1C6F6', text: '#DAEAFF', hot: '#499BED', onAccent: '#031725' },
    light: { background: '#DAEAFF', surface: '#F8FBFF', inset: '#E6F0FF', accent: '#235D99', muted: '#42688F', text: '#031725', hot: '#215282', onAccent: '#FFFFFF' },
  },
  mosaic: {
    dark: { background: '#111B24', surface: '#203340', inset: '#142531', accent: '#8CD6DB', muted: '#B9C4CB', text: '#F4F0E6', hot: '#E9B46B', onAccent: '#142531' },
    light: { background: '#EDF1E9', surface: '#FFFFFF', inset: '#E0EAE6', accent: '#215D66', muted: '#536B70', text: '#172B37', hot: '#92612F', onAccent: '#FFFFFF' },
  },
  atelier: {
    dark: { background: '#172B37', surface: '#243E4B', inset: '#10232D', accent: '#B7CFCB', muted: '#C0CAC7', text: '#F2EEE3', hot: '#DDBB83', onAccent: '#172B37' },
    light: { background: '#F2EEE3', surface: '#FFFCF5', inset: '#E7E0D0', accent: '#1E6F8C', muted: '#526673', text: '#172B37', hot: '#8A6637', onAccent: '#FFFFFF' },
  },
  clarity: {
    dark: { background: '#080A10', surface: '#101721', inset: '#070C13', accent: '#A8FFED', muted: '#A3B1C2', text: '#F4F6F7', hot: '#7C98FF', onAccent: '#080A10' },
    light: { background: '#E9EEE9', surface: '#FFFFFF', inset: '#F0F4F1', accent: '#244BDB', muted: '#536372', text: '#18242E', hot: '#17604D', onAccent: '#FFFFFF' },
  },
};

export function getWorkspacePalette(mode: DesignMode, light: boolean, fallback: WorkspacePalette): WorkspacePalette {
  if (mode === 'current') return light
    ? { background: '#F4F5F2', surface: '#FFFFFF', inset: '#EFF3F7', accent: '#326C9A', muted: '#52636B', text: '#20262D', hot: '#326C9A', onAccent: '#FFFFFF' }
    : fallback;
  return palettes[mode][light ? 'light' : 'dark'];
}

export function createWorkspaceStyles(mode: DesignMode, c: WorkspacePalette) {
  const classic = mode === 'classic';
  const tiled = mode === 'hyprland';
  const mosaic = mode === 'mosaic';
  const editorial = mode === 'atelier';
  const clarity = mode === 'clarity';
  const radius = classic ? 3 : tiled ? 6 : editorial ? 0 : mosaic ? 22 : clarity ? 24 : 14;
  const padding = classic ? 16 : editorial ? 22 : 20;
  const border = classic || tiled || clarity || editorial ? 1 : 0;
  return StyleSheet.create({
    root: { backgroundColor: c.background },
    container: { backgroundColor: c.background, paddingHorizontal: classic ? 16 : clarity ? 20 : 24 },
    canvas: { width: '100%', maxWidth: editorial ? 760 : 680, alignSelf: 'center' },
    topline: { backgroundColor: c.surface, borderRadius: radius, borderWidth: border, borderColor: c.accent, paddingHorizontal: 12 },
    identity: { backgroundColor: c.surface, borderRadius: radius, borderWidth: border, borderColor: editorial ? c.muted : c.accent, padding, borderLeftWidth: classic ? 4 : border },
    avatar: { borderRadius: classic ? 0 : tiled ? 4 : editorial ? 0 : 12, width: clarity ? 54 : 48, height: clarity ? 54 : 48 },
    name: { color: c.text, fontSize: editorial ? 28 : clarity ? 25 : 21, letterSpacing: editorial || clarity ? -0.7 : 0 },
    text: { color: c.text }, muted: { color: c.muted }, accent: { color: c.accent }, onAccent: { color: c.onAccent },
    composer: { backgroundColor: c.surface, borderRadius: radius, padding, borderWidth: border, borderColor: c.accent, borderTopWidth: mosaic ? 5 : border, borderTopColor: mosaic ? c.hot : c.accent },
    composerTitle: { color: c.text, fontSize: editorial ? 28 : clarity ? 26 : 21, letterSpacing: -0.6 },
    chip: { backgroundColor: c.inset, borderRadius: clarity ? 20 : radius, borderWidth: tiled ? 1 : 0, borderColor: c.accent },
    terminal: { backgroundColor: c.inset, borderRadius: radius, borderWidth: tiled || clarity ? 1 : 0, borderColor: c.muted, overflow: 'hidden' },
    titlebar: { backgroundColor: editorial ? c.inset : c.accent, borderBottomWidth: editorial ? 1 : 0, borderBottomColor: c.muted },
    titlebarText: { color: editorial ? c.accent : c.onAccent },
    inputShell: { backgroundColor: c.inset, borderRadius: 0 },
    input: { color: c.text, minHeight: classic ? 130 : clarity ? 160 : 148, fontSize: clarity ? 17 : 15 },
    actions: { backgroundColor: c.surface, borderRadius: radius, paddingHorizontal: 0 },
    primary: { backgroundColor: c.accent, borderRadius: clarity ? 26 : radius, minHeight: 52 },
    secondary: { borderColor: c.accent, borderRadius: clarity ? 26 : radius },
    result: { backgroundColor: c.surface, borderRadius: radius, borderWidth: border, borderColor: c.accent, padding, borderTopWidth: mosaic ? 5 : border, borderTopColor: mosaic ? c.hot : c.accent },
    resultTitle: { color: c.text, fontSize: editorial ? 29 : clarity ? 27 : 24 },
    command: { backgroundColor: c.inset, borderRadius: classic || editorial ? 0 : 10, borderLeftWidth: classic ? 3 : 0, borderLeftColor: c.accent },
    source: { backgroundColor: c.inset, borderRadius: radius },
    aiWindow: { borderRadius: radius, borderWidth: border, borderColor: c.accent },
    aiStep: { borderRadius: editorial || classic ? 0 : mosaic ? 16 : 10, borderLeftWidth: mosaic ? 5 : 2 },
    note: { backgroundColor: c.inset, borderRadius: radius, borderTopWidth: editorial ? 1 : 0, borderTopColor: c.muted },
  });
}
