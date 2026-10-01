import { FingerGlideField, GlideTile, useGlideScroll } from './FingerGlide';
import { Image, Platform, Pressable, ScrollView, StatusBar, StyleSheet, Text, View } from 'react-native';
import { designNames, getWorkspacePalette, mosaicTileColors } from '../lib/workspaceDesign';

export type DesignMode = 'classic' | 'hyprland' | 'mosaic' | 'current' | 'atelier' | 'clarity';
type Distro = 'arch' | 'debian' | 'fedora' | 'nixos' | 'cachyos';
type Palette = { background: string; surface: string; text: string; muted: string; accent: string };
type Props = {
  mode: Exclude<DesignMode, 'current'>;
  language: 'pl' | 'en';
  light: boolean;
  palette: Palette;
  fontFamily?: string;
  motion: boolean;
  busy: boolean;
  historyCount: number;
  onChoose: (distro: Distro) => void;
  onAppearance: () => void;
  onHistory: () => void;
  onSettings: () => void;
  onAccount: () => void;
};

const distros = [
  { id: 'arch', name: 'Arch Linux', detail: 'pacman · systemd · ArchWiki', logo: require('../assets/linuxfix-arch-icon.jpg') },
  { id: 'debian', name: 'Debian', detail: 'APT · dpkg · Debian Wiki', logo: require('../assets/linuxfix-debian-icon.jpg') },
  { id: 'fedora', name: 'Fedora', detail: 'DNF · RPM · Fedora Docs', logo: require('../assets/linuxfix-fedora-icon.jpg') },
  { id: 'nixos', name: 'NixOS', detail: 'Nix · flakes · declarative', logo: require('../assets/linuxfix-nixos-user.jpg') },
  { id: 'cachyos', name: 'CachyOS', detail: 'pacman · performance · Arch', logo: require('../assets/linuxfix-cachyos-user.jpg') },
] as const;


export function DesignHome(p: Props) {
  return <FingerGlideField enabled={p.motion && !p.busy} style={s.fill}><HomeContent {...p} /></FingerGlideField>;
}

function HomeContent(p: Props) {
  const pl = p.language === 'pl';
  const refreshGlide = useGlideScroll();
  const palette = getWorkspacePalette(p.mode, p.light, { ...p.palette, inset: p.palette.background, hot: p.palette.accent, onAccent: p.palette.background });
  const colors = { ...palette, border: palette.accent };
  const font = p.fontFamily ? { fontFamily: p.fontFamily } : undefined;
  const ink = { color: colors.text };
  const muted = { color: colors.muted };

  const card = (item: typeof distros[number], index: number, shape: 'row' | 'window' | 'mosaic' | 'editorial') => (
    <GlideTile key={`${p.mode}-${item.id}`}>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={item.name}
        disabled={p.busy}
        onPress={() => p.onChoose(item.id)}
        style={({ pressed }) => [
          s.card,
          shape === 'row' && s.rowCard,
          shape === 'window' && s.windowCard,
          shape === 'mosaic' && s.mosaicCard,
          shape === 'editorial' && s.editorialCard,
          p.mode === 'clarity' && s.clarityCard,
          { backgroundColor: shape === 'mosaic' ? mosaicTileColors[index] : shape === 'editorial' && index === 0 ? colors.text : colors.surface, borderColor: colors.border },
          pressed && s.pressed,
        ]}
      >
        {shape === 'editorial' && <Text style={[s.editorialIndex, { color: index === 0 ? '#C5D5D2' : colors.accent }, font]}>{String(index + 1).padStart(2, '0')}</Text>}
        {shape === 'window' && <Text style={[s.windowIndex, { color: colors.accent }, font]}>WINDOW {String(index + 1).padStart(2, '0')}</Text>}
        <View style={[s.cardBody, index > 0 && (shape === 'window' || shape === 'mosaic') && s.compactCardBody]}>
          <Image source={item.logo} style={[s.logo, shape === 'editorial' && s.editorialLogo]} />
          <View style={s.flex}>
            <Text style={[s.cardTitle, index > 0 && (shape === 'window' || shape === 'mosaic') && s.compactCardTitle, ink, shape === 'editorial' && index === 0 && { color: '#F7F1E3' }, shape === 'mosaic' && s.mosaicInk, font]}>{item.name}</Text>
            <Text style={[s.cardDetail, muted, shape === 'editorial' && index === 0 && { color: '#C5D5D2' }, shape === 'mosaic' && s.mosaicInk, font]}>{item.detail}</Text>
          </View>
          <Text style={[s.cardArrow, index > 0 && (shape === 'window' || shape === 'mosaic') && s.compactArrow, { color: colors.accent }, shape === 'editorial' && index === 0 && { color: '#F7F1E3' }, shape === 'mosaic' && s.mosaicInk]}>↗</Text>
        </View>
      </Pressable>
    </GlideTile>
  );

  const nav = <View style={[s.nav, { borderTopColor: colors.border }]}>
    <NavButton label={pl ? 'Historia' : 'History'} count={p.historyCount} onPress={p.onHistory} color={colors.text} font={font} />
    <NavButton label={pl ? 'Wygląd' : 'Appearance'} onPress={p.onAppearance} color={colors.text} font={font} />
    <NavButton label={pl ? 'Ustawienia' : 'Settings'} onPress={p.onSettings} color={colors.text} font={font} />
  </View>;

  return <View style={[s.fill, { backgroundColor: colors.background }]}>
    <ScrollView contentContainerStyle={s.content} showsVerticalScrollIndicator={false} {...refreshGlide} scrollEventThrottle={16}>
      <View style={[s.topbar, { borderBottomColor: colors.border }]}>
        <Text style={[s.wordmark, ink, font]}>LinuxFIX</Text>
        <Text style={[s.modeName, { color: colors.accent }, font]}>{designNames[p.mode].toUpperCase()}</Text>
        <Pressable accessibilityRole="button" onPress={p.onAccount} style={[s.account, { borderColor: colors.border }]}><Text style={[s.accountText, ink, font]}>{pl ? 'KONTO' : 'ACCOUNT'}</Text></Pressable>
      </View>

      {p.mode === 'classic' && <>
        <Text style={[s.kicker, { color: colors.accent }, font]}>LINUXFIX / CLASSIC</Text>
        <Text style={[s.classicTitle, ink, font]}>{pl ? 'Wybierz\nswój system.' : 'Choose your\nsystem.'}</Text>
        <Text style={[s.lead, muted, font]}>{pl ? 'Prosty punkt startu. Wybierz dystrybucję, a potem opisz problem.' : 'A simple starting point. Choose a distribution, then describe the problem.'}</Text>
        <View style={s.stack}>{distros.map((item, index) => card(item, index, 'row'))}</View>
      </>}

      {p.mode === 'hyprland' && <>
        <View style={s.hyprIndexes}><Text style={[s.hyprIndexText, { color: colors.accent, borderColor: colors.border }]}>01</Text><Text style={[s.hyprIndexText, muted, { borderColor: colors.border }]}>02</Text><Text style={[s.hyprIndexText, muted, { borderColor: colors.border }]}>03</Text></View>
        <Text style={[s.kicker, { color: colors.accent }, font]}>$ linuxfix --select</Text>
        <Text style={[s.hyprTitle, ink, font]}>{pl ? 'Otwórz workspace.' : 'Open a workspace.'}</Text>
        <Text style={[s.lead, muted, font]}>{pl ? 'Każda dystrybucja to osobne okno diagnostyczne.' : 'Each distribution opens its own diagnostic window.'}</Text>
        <View style={s.stack}>{card(distros[0], 0, 'window')}
          <View style={s.twoColumn}>{distros.slice(1, 3).map((item, index) => <View key={item.id} style={s.half}>{card(item, index + 1, 'window')}</View>)}</View>
          <View style={s.twoColumn}>{distros.slice(3).map((item, index) => <View key={item.id} style={s.half}>{card(item, index + 3, 'window')}</View>)}</View>
        </View>
      </>}

      {p.mode === 'mosaic' && <>
        <View style={[s.mosaicHeading, { backgroundColor: '#DBE7E2' }]}>
          <View style={s.mosaicBlocks}><View style={[s.mosaicBlock, { backgroundColor: '#43648E' }]} /><View style={[s.mosaicBlock, { backgroundColor: '#BF8342' }]} /><View style={[s.mosaicBlock, { backgroundColor: '#758C60' }]} /></View>
          <Text style={[s.kicker, { color: '#355062' }, font]}>LINUX / MOSAIC</Text>
          <Text style={[s.mosaicTitle, { color: '#172B37' }, font]}>{pl ? 'Pięć dróg.\nJedno miejsce.' : 'Five routes.\nOne place.'}</Text>
        </View>
        <View style={s.stack}>{card(distros[0], 0, 'mosaic')}
          <View style={s.twoColumn}>{distros.slice(1, 3).map((item, index) => <View key={item.id} style={s.half}>{card(item, index + 1, 'mosaic')}</View>)}</View>
          <View style={s.twoColumn}>{distros.slice(3).map((item, index) => <View key={item.id} style={s.half}>{card(item, index + 3, 'mosaic')}</View>)}</View>
        </View>
      </>}

      {p.mode === 'atelier' && <>
        <View style={s.atelierHero}>
          <Text style={[s.kicker, { color: colors.accent }, font]}>LINUXFIX   /   FIELD GUIDE</Text>
          <Text style={[s.atelierTitle, ink, font]}>{pl ? 'Zrozum system.\nZnajdź rozwiązanie.' : 'Understand the system.\nFind the answer.'}</Text>
          <Text style={[s.lead, muted, font]}>{pl ? 'Wybierz środowisko. Pokażemy konkretne kroki i komendy, które możesz wpisać w Terminalu.' : 'Choose your environment. Get concrete steps and commands to type in Terminal.'}</Text>
          <View style={[s.atelierRule, { backgroundColor: colors.accent }]} />
        </View>
        <Text style={[s.atelierSection, ink, font]}>{pl ? 'DYSTRYBUCJE' : 'DISTRIBUTIONS'} <Text style={{ color: colors.accent }}> / 05</Text></Text>
        <View style={s.stack}>{distros.map((item, index) => card(item, index, 'editorial'))}</View>
      </>}

      {p.mode === 'clarity' && <>
        <View style={[s.clarityMark, { backgroundColor: colors.inset, borderColor: colors.accent }]}><Text style={[s.claritySymbol, { color: colors.accent }, font]}>[✓]</Text></View>
        <Text style={[s.kicker, { color: colors.accent }, font]}>LINUXFIX / CLARITY</Text>
        <Text style={[s.clarityTitle, ink, font]}>{pl ? 'Mniej szukania.\nWięcej działania.' : 'Less searching.\nMore doing.'}</Text>
        <Text style={[s.lead, muted, font]}>{pl ? 'Twoje logi, kontekst i następny krok — w jednej przestrzeni.' : 'Your logs, context and next step — in one workspace.'}</Text>
        <View style={s.stack}>{distros.map((item, index) => card(item, index, 'row'))}</View>
      </>}

      {nav}
      <Text style={[s.footnote, muted, font]}>{pl ? 'LinuxFIX nie uruchamia poleceń automatycznie.' : 'LinuxFIX never runs commands automatically.'}</Text>
    </ScrollView>
  </View>;
}

function NavButton({ label, count, onPress, color, font }: { label: string; count?: number; onPress: () => void; color: string; font?: { fontFamily: string } }) {
  return <Pressable accessibilityRole="button" onPress={onPress} style={({ pressed }) => [s.navButton, pressed && s.pressed]}>
    <Text style={[s.navText, { color }, font]}>{label}{count ? ` ${count}` : ''}</Text>
    <Text style={[s.navArrow, { color }]}>↗</Text>
  </Pressable>;
}

const s = StyleSheet.create({
  fill: { flex: 1 }, flex: { flex: 1 }, content: { width: '100%', maxWidth: 720, alignSelf: 'center', paddingHorizontal: 22, paddingTop: Platform.OS === 'android' ? (StatusBar.currentHeight ?? 24) + 12 : 20, paddingBottom: 50 },
  topbar: { alignItems: 'center', borderBottomWidth: 1, flexDirection: 'row', gap: 12, minHeight: 58, marginBottom: 34 }, wordmark: { fontSize: 19, fontWeight: '800', flex: 1 }, modeName: { fontSize: 10, fontWeight: '800', letterSpacing: 1.4 }, account: { borderWidth: 1, paddingHorizontal: 10, paddingVertical: 9 }, accountText: { fontSize: 10, fontWeight: '700' },
  kicker: { fontSize: 11, fontWeight: '800', letterSpacing: 2, marginBottom: 16 }, lead: { fontSize: 14, lineHeight: 22, maxWidth: 475, marginTop: 10, marginBottom: 16 }, classicTitle: { fontSize: 48, fontWeight: '800', lineHeight: 52, letterSpacing: -2.5 }, hyprTitle: { fontSize: 39, fontWeight: '700', lineHeight: 45, letterSpacing: -1.6 },
  stack: { gap: 10, marginTop: 18 }, twoColumn: { flexDirection: 'row', gap: 10 }, half: { flex: 1, minWidth: 0 }, card: { borderWidth: 1, justifyContent: 'center', overflow: 'hidden' }, rowCard: { borderRadius: 3, minHeight: 88, padding: 17 }, windowCard: { borderRadius: 4, minHeight: 152, padding: 16 }, mosaicCard: { borderRadius: 14, minHeight: 178, padding: 18, borderWidth: 0 }, editorialCard: { borderRadius: 0, minHeight: 105, padding: 16 },
  cardBody: { alignItems: 'center', flexDirection: 'row', gap: 14 }, compactCardBody: { alignItems: 'flex-start', flexDirection: 'column', gap: 8 }, compactCardTitle: { fontSize: 15 }, compactArrow: { position: 'absolute', right: 0, top: 0 }, logo: { borderRadius: 6, height: 42, width: 42, backgroundColor: '#FFFFFF' }, editorialLogo: { height: 44, width: 44 }, cardTitle: { fontSize: 17, fontWeight: '700' }, cardDetail: { fontSize: 10, lineHeight: 15, marginTop: 4 }, cardArrow: { fontSize: 20, fontWeight: '600' }, pressed: { opacity: 0.72 },
  clarityMark: { alignItems: 'center', justifyContent: 'center', width: 74, height: 74, borderWidth: 1, borderRadius: 22, marginBottom: 30 }, claritySymbol: { fontSize: 25, fontWeight: '600' }, clarityTitle: { fontSize: 41, lineHeight: 48, letterSpacing: -1.5, fontWeight: '600' }, clarityCard: { borderRadius: 20, minHeight: 96 },
  windowIndex: { fontSize: 10, fontWeight: '800', letterSpacing: 1.5, marginBottom: 27 }, hyprIndexes: { flexDirection: 'row', gap: 6, marginBottom: 36 }, hyprIndexText: { borderWidth: 1, fontSize: 11, fontWeight: '700', paddingHorizontal: 10, paddingVertical: 8 },
  mosaicHeading: { borderRadius: 18, padding: 24, overflow: 'hidden' }, mosaicBlocks: { flexDirection: 'row', gap: 3, marginBottom: 38, transform: [{ rotate: '-9deg' }] }, mosaicBlock: { height: 30, width: 64, borderRadius: 4 }, mosaicTitle: { fontSize: 40, fontWeight: '800', lineHeight: 44, letterSpacing: -2 }, mosaicInk: { color: '#FFFFFF' },
  atelierHero: { paddingVertical: 36 }, atelierTitle: { fontSize: 43, lineHeight: 50, letterSpacing: -2.3, fontWeight: '500' }, atelierRule: { height: 5, width: 64, marginTop: 27 }, atelierSection: { fontSize: 13, fontWeight: '800', letterSpacing: 1.3, marginTop: 12 }, editorialIndex: { fontSize: 11, fontWeight: '800', letterSpacing: 1, marginBottom: 8 },
  nav: { borderTopWidth: 1, marginTop: 36 }, navButton: { borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: '#82939B', flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', minHeight: 55 }, navText: { fontSize: 13, fontWeight: '700' }, navArrow: { fontSize: 18 }, footnote: { fontSize: 11, lineHeight: 16, marginTop: 22 },
});
