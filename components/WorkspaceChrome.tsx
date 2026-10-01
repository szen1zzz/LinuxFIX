import { StyleSheet, Text, View } from 'react-native';
import type { DesignMode } from './DesignHome';
import { designNames, type WorkspacePalette } from '../lib/workspaceDesign';

type Props = { mode: DesignMode; palette: WorkspacePalette; language: 'pl' | 'en'; fontFamily?: string };

export function WorkspaceChrome({ mode, palette: c, language, fontFamily }: Props) {
  const pl = language === 'pl';
  const font = fontFamily ? { fontFamily } : undefined;
  const title = mode === 'classic' ? (pl ? 'Dziennik diagnostyczny' : 'Diagnostic journal')
    : mode === 'hyprland' ? (pl ? 'Workspace / diagnostyka' : 'Workspace / diagnostics')
    : mode === 'mosaic' ? (pl ? 'Połącz elementy.' : 'Connect the pieces.')
    : mode === 'atelier' ? (pl ? 'Notatnik systemu.' : 'System field notes.')
    : mode === 'clarity' ? (pl ? 'Zrozum. Działaj dalej.' : 'Understand. Move forward.')
    : (pl ? 'Twoja przestrzeń pracy' : 'Your workspace');
  return <View style={[s.root, mode === 'atelier' && s.editorial]}>
    <View style={s.row}>
      <Text style={[s.eyebrow, { color: c.accent }, font]}>{designNames[mode].toUpperCase()} / WORKSPACE</Text>
      <Text style={[s.eyebrow, { color: c.muted }, font]}>0.2.3</Text>
    </View>
    {mode === 'hyprland' && <View style={s.row}>
      {[pl ? '01 Zapytanie' : '01 Request', pl ? '02 Analiza' : '02 Analysis', pl ? '03 Kroki' : '03 Steps'].map((label, i) => <View key={label} style={[s.window, { borderColor: c.accent, backgroundColor: i === 0 ? c.accent : c.surface }]}><Text style={[s.windowText, { color: i === 0 ? c.onAccent : c.muted }, font]}>{label}</Text></View>)}
    </View>}
    <Text accessibilityRole="header" style={[s.title, mode === 'classic' && s.compact, mode === 'atelier' && s.editorialTitle, { color: c.text }, font]}>{title}</Text>
    {mode === 'mosaic' && <View style={s.bands}>{[c.accent, c.hot, c.muted].map(color => <View key={color} style={[s.band, { backgroundColor: color }]} />)}</View>}
    <Text style={[s.subtitle, { color: c.muted }, font]}>{pl ? 'Zapytanie → kontekst → konkretne kroki. Ty decydujesz, co uruchomić.' : 'Request → context → practical steps. You decide what to run.'}</Text>
  </View>;
}

const s = StyleSheet.create({
  root: { gap: 14, paddingVertical: 25 }, row: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between', gap: 8 },
  eyebrow: { fontSize: 10, fontWeight: '700', letterSpacing: 1.4 }, title: { fontSize: 31, lineHeight: 38, letterSpacing: -1.2, fontWeight: '600' },
  compact: { fontSize: 24, lineHeight: 31, letterSpacing: -0.4 }, subtitle: { fontSize: 12, lineHeight: 20 },
  editorial: { paddingVertical: 32 }, editorialTitle: { fontSize: 36, lineHeight: 44, fontWeight: '400' },
  window: { flex: 1, minWidth: 85, borderWidth: 1, paddingVertical: 9, paddingHorizontal: 7, borderRadius: 4 }, windowText: { fontSize: 10 },
  bands: { flexDirection: 'row', gap: 5 }, band: { height: 6, flex: 1, borderRadius: 3 },
});
