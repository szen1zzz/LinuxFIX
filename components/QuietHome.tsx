import { FingerGlideField, GlideTile, useGlideScroll } from './FingerGlide';
import { useEffect, useRef, useState } from 'react';
import { Animated, Image, Modal, Platform, Pressable, ScrollView, StatusBar, StyleSheet, Text, View, useWindowDimensions } from 'react-native';
type Palette = { background: string; surface: string; text: string; muted: string; accent: string };
type Props = {
  language: 'pl' | 'en'; light: boolean; palette: Palette; fontFamily?: string;
  motion: boolean; busy: boolean; historyCount: number;
  onChoose: (distro: 'arch' | 'debian' | 'fedora' | 'nixos' | 'cachyos') => void;
  onAppearance: () => void; onHistory: () => void; onSettings: () => void; onAccount: () => void;
};
const upcoming = ['Ubuntu', 'Tails OS'];
const distributions = [
  { id: 'arch', name: 'Arch Linux', detail: 'Pacman · systemd · ArchWiki', logo: require('../assets/linuxfix-arch-icon.jpg') },
  { id: 'debian', name: 'Debian', detail: 'APT · dpkg · Debian Wiki', logo: require('../assets/linuxfix-debian-icon.jpg') },
  { id: 'fedora', name: 'Fedora', detail: 'DNF · RPM · Fedora Docs', logo: require('../assets/linuxfix-fedora-icon.jpg') },
  { id: 'nixos', name: 'NixOS', detail: 'Nix · flakes · configuration', logo: require('../assets/linuxfix-nixos-user.jpg') },
  { id: 'cachyos', name: 'CachyOS', detail: 'Pacman · performance · Arch', logo: require('../assets/linuxfix-cachyos-user.jpg') },
] as const;
export function QuietHome(p: Props) {
  return <FingerGlideField enabled={p.motion && !p.busy} style={{ flex: 1 }}><HomeContent {...p} /></FingerGlideField>;
}
function HomeContent(p: Props) {
  const refreshGlide = useGlideScroll();
  const [open, setOpen] = useState(false);
  const slide = useRef(new Animated.Value(0)).current;
  const closing = useRef(false);
  const { width } = useWindowDimensions();
  const drawerWidth = Math.min(width * 0.86, 370);
  const pl = p.language === 'pl';
  const c = p.light ? { background: '#F7F8FA', surface: '#FFFFFF', text: '#20262D', muted: '#66717C', accent: '#326C9A' } : p.palette;
  const font = { fontFamily: p.fontFamily, color: c.text };
  const muted = { ...font, color: c.muted };
  const border = p.light ? '#E5E8EC' : '#35444F';
  useEffect(() => {
    if (!open) return;
    closing.current = false;
    const animation = Animated.timing(slide, { toValue: 1, duration: p.motion ? 300 : 0, useNativeDriver: true });
    animation.start();
    return () => animation.stop();
  }, [open, p.motion, slide]);
  const close = (action?: () => void) => {
    if (closing.current) return;
    closing.current = true;
    Animated.timing(slide, { toValue: 0, duration: p.motion ? 220 : 0, useNativeDriver: true }).start(({ finished }) => {
      if (finished) { setOpen(false); closing.current = false; action?.(); }
    });
  };
  const routes = [
    { title: pl ? 'Dystrybucje' : 'Distributions', symbol: '⌂', action: () => {} },
    { title: pl ? 'Historia analiz' : 'Analysis history', symbol: '↶', action: p.onHistory },
    { title: pl ? 'Wygląd i język' : 'Appearance & language', symbol: 'Aa', action: p.onAppearance },
    { title: pl ? 'Moje konto' : 'My account', symbol: '○', action: p.onAccount },
    { title: pl ? 'Ustawienia' : 'Settings', symbol: '≡', action: p.onSettings },
  ];
  const route = (item: typeof routes[number], drawer = false) => (
    <GlideTile key={item.title}>
    <Pressable key={item.title} accessibilityRole="button" onPress={() => drawer ? close(item.action) : item.action()} style={({ pressed }) => [s.route, { backgroundColor: c.surface, borderRadius: 10 }, pressed && { opacity: 0.55 }]}>
      <Text style={[s.symbol, { color: c.accent }]}>{item.symbol}</Text>
      <Text style={[s.routeTitle, font]}>{item.title}</Text>
      <Text style={[s.arrow, muted]}>›</Text>
    </Pressable>
    </GlideTile>
  );
  return <View style={[s.root, { backgroundColor: c.background }]}>
    <View style={[s.header, { backgroundColor: c.surface, borderBottomColor: border }]}>
      <Pressable accessibilityRole="button" accessibilityLabel={pl ? 'Otwórz menu' : 'Open menu'} onPress={() => setOpen(true)} style={s.iconButton}><Text style={[s.symbol, font]}>☰</Text></Pressable>
      <Text style={[s.brand, font]}>LinuxFIX</Text>
      <Pressable accessibilityRole="button" accessibilityLabel={pl ? 'Moje konto' : 'My account'} onPress={p.onAccount} style={s.iconButton}><Image source={require('../assets/linuxfix-logo.jpg')} style={s.avatar} /></Pressable>
    </View>
    <ScrollView contentContainerStyle={s.content} showsVerticalScrollIndicator={false} {...refreshGlide} scrollEventThrottle={16}>
      <GlideTile><View style={[s.intro, { backgroundColor: c.surface }]}>
      <Text accessibilityRole="header" style={[s.heading, font]}>{pl ? 'Wybierz dystrybucję' : 'Choose a distribution'}</Text>
      <Text style={[s.description, muted]}>{pl ? 'Pomoc z błędami i codzienną pracą z systemem.' : 'Help with errors and everyday tasks on your system.'}</Text>
      </View></GlideTile>
      <View style={s.list}>
        {distributions.map((item, i) => <GlideTile key={item.id}><Pressable accessibilityRole="button" disabled={p.busy} onPress={() => p.onChoose(item.id)} style={({ pressed }) => [s.distro, { backgroundColor: c.surface, borderRadius: 10 }, i === 0 && { minHeight: 120 }, i > 0 && { borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: border }, pressed && { opacity: 0.6 }]}>
          <Image source={item.logo} style={s.logo} />
          <View style={s.flex}><Text style={[s.distroTitle, font]}>{item.name}</Text><Text style={[s.detail, muted]}>{item.detail}</Text></View><Text style={[s.arrow, muted]}>›</Text>
        </Pressable></GlideTile>)}
      </View>
      <Text style={[s.section, font, { backgroundColor: c.surface }]}>{pl ? 'Twoja przestrzeń' : 'Your space'}</Text>
      <View style={s.list}>{route(routes[1])}{route(routes[2])}</View>
      <Text style={[s.section, font, { backgroundColor: c.surface }]}>{pl ? 'W przygotowaniu' : 'Coming next'}</Text>
      <View style={s.list}>
        {upcoming.map((name, i) => <GlideTile key={name}><View accessible accessibilityLabel={name + ', Incoming'} accessibilityState={{ disabled: true }} style={[s.future, { backgroundColor: p.light ? '#EEEFF1' : '#252C31', borderRadius: 10 }, i > 0 && { borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: border }]}><Text style={[s.futureName, { ...font, color: p.light ? '#656D75' : '#A8AFB5' }]}>{name}</Text><Text style={{ color: p.light ? '#656D75' : '#A8AFB5', fontSize: 11 }}>Incoming</Text></View></GlideTile>)}
      </View>
      <Text style={[s.footer, muted, { backgroundColor: c.surface }]}>{pl ? 'Komendy nigdy nie uruchamiają się automatycznie.' : 'Commands never run automatically.'}</Text>
    </ScrollView>
    <View style={[s.bottom, { backgroundColor: c.surface, borderTopColor: border }]}>
      {[routes[0], routes[1], routes[4]].map(item => <Pressable key={item.title} accessibilityRole="button" onPress={item.action} style={s.tab}><Text style={[s.symbol, { color: item === routes[0] ? c.accent : c.muted }]}>{item.symbol}</Text><Text style={[s.tabLabel, muted]}>{item.title}</Text></Pressable>)}
    </View>
    <Modal visible={open} transparent animationType="none" onRequestClose={() => close()}>
      <View style={s.root}>
        <Pressable accessibilityRole="button" accessibilityLabel={pl ? 'Zamknij menu' : 'Close menu'} onPress={() => close()} style={s.scrim} />
        <Animated.View accessibilityViewIsModal style={[s.drawer, { width: drawerWidth, backgroundColor: c.surface, transform: [{ translateX: slide.interpolate({ inputRange: [0, 1], outputRange: [-drawerWidth, 0] }) }] }]}>
          <ScrollView contentContainerStyle={s.drawerContent}>
            <Pressable accessibilityRole="button" onPress={() => close(p.onAccount)} style={[s.profile, { borderBottomColor: border }]}>
              <Image source={require('../assets/linuxfix-logo.jpg')} style={s.profileImage} /><View style={s.flex}><Text style={[s.profileName, font]}>LinuxFIX</Text><Text style={[s.detail, muted]}>{pl ? 'Zobacz swoje konto' : 'View your account'}</Text></View><Text style={[s.arrow, muted]}>›</Text>
            </Pressable>
            <View style={s.links}>{routes.map(item => route(item, true))}</View>
            <View style={[s.note, { borderTopColor: border }]}><Text style={[s.description, muted]}>{pl ? 'Prywatność, uprawnienia i regulamin znajdziesz w ustawieniach.' : 'Privacy, permissions and terms are available in Settings.'}</Text></View>
            <Text style={[s.version, muted]}>LinuxFIX 0.2.3</Text>
          </ScrollView>
        </Animated.View>
      </View>
    </Modal>
  </View>;
}
const s = StyleSheet.create({
  intro: { borderRadius: 12, padding: 20 },
  root: { flex: 1 }, flex: { flex: 1 },
  header: { paddingTop: Platform.OS === 'android' ? (StatusBar.currentHeight ?? 24) + 8 : 8, paddingBottom: 12, paddingHorizontal: 16, flexDirection: 'row', alignItems: 'center', borderBottomWidth: StyleSheet.hairlineWidth },
  iconButton: { width: 48, height: 48, alignItems: 'center', justifyContent: 'center' }, brand: { flex: 1, textAlign: 'center', fontSize: 20, fontWeight: '600' }, avatar: { height: 30, width: 30, borderRadius: 15 },
  content: { width: '100%', maxWidth: 620, alignSelf: 'center', padding: 24, paddingBottom: 32 },
  heading: { fontSize: 25, lineHeight: 33, fontWeight: '500', letterSpacing: -0.6 }, description: { fontSize: 14, lineHeight: 22, marginTop: 10 },
  list: { borderRadius: 10, gap: 10, marginTop: 18 }, distro: { flexDirection: 'row', alignItems: 'center', gap: 16, padding: 20, minHeight: 98 }, logo: { width: 42, height: 42, borderRadius: 8 },
  distroTitle: { fontSize: 18, fontWeight: '500' }, detail: { fontSize: 11, lineHeight: 18, marginTop: 6 }, arrow: { fontSize: 23, fontWeight: '300' },
  section: { fontSize: 16, fontWeight: '500', marginTop: 24, padding: 16, borderRadius: 10 }, route: { flexDirection: 'row', alignItems: 'center', gap: 18, minHeight: 60, paddingHorizontal: 22, paddingVertical: 16 }, symbol: { fontSize: 23, width: 28, textAlign: 'center' }, routeTitle: { flex: 1, fontSize: 15 },
  future: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', minHeight: 60, paddingHorizontal: 20 }, futureName: { fontSize: 15 },
  footer: { fontSize: 11, lineHeight: 19, textAlign: 'center', marginTop: 24, padding: 16, borderRadius: 10 }, bottom: { flexDirection: 'row', paddingTop: 8, paddingBottom: 16, borderTopWidth: StyleSheet.hairlineWidth }, tab: { flex: 1, alignItems: 'center', paddingVertical: 8, gap: 6 }, tabLabel: { fontSize: 10 },
  scrim: { position: 'absolute', top: 0, bottom: 0, left: 0, right: 0, backgroundColor: 'rgba(0,0,0,0.35)' }, drawer: { height: '100%', paddingTop: Platform.OS === 'android' ? (StatusBar.currentHeight ?? 24) : 44 }, drawerContent: { flexGrow: 1, paddingBottom: 32 },
  profile: { flexDirection: 'row', gap: 14, alignItems: 'center', paddingHorizontal: 24, paddingTop: 22, paddingBottom: 28, borderBottomWidth: StyleSheet.hairlineWidth }, profileImage: { height: 44, width: 44, borderRadius: 22 }, profileName: { fontSize: 17, fontWeight: '600' },
  links: { paddingVertical: 20 }, note: { marginHorizontal: 24, paddingTop: 12, borderTopWidth: StyleSheet.hairlineWidth }, version: { textAlign: 'center', fontSize: 10, marginTop: 'auto', paddingTop: 50 },
});
