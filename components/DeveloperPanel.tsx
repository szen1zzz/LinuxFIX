import { Modal, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import type { DesignMode } from './DesignHome';

type Props = {
  visible: boolean;
  language: 'pl' | 'en';
  accessLevel: 'developer' | 'admin' | null;
  userId: string;
  aiStatus: 'checking' | 'online' | 'offline';
  backendUrl: string;
  slowTyping: boolean;
  godMode: boolean;
  instantAiReveal: boolean;
  offlinePreview: boolean;
  partyThemeActive: boolean;
  designMode: DesignMode;
  fontFamily?: string;
  onClose: () => void;
  onToggleSlowTyping: () => void;
  onToggleGodMode: () => void;
  onToggleInstantAiReveal: () => void;
  onToggleOfflinePreview: () => void;
  onTogglePartyTheme: () => void;
  onRefreshAi: () => void;
  onSelectDesign: (mode: DesignMode) => void;
  onTestHaptic: () => void;
  onTestSound: () => void;
  onInsertTestPrompt: () => void;
  onResetAnalysis: () => void;
  onOpenHostSettings: () => void;
};

export function DeveloperPanel(p: Props) {
  if (!p.accessLevel) return null;
  const pl = p.language === 'pl';
  const font = p.fontFamily ? { fontFamily: p.fontFamily } : undefined;
  const tools = [
    { title: pl ? 'Test haptyki' : 'Test haptics', detail: pl ? 'Uruchom lekką odpowiedź dotykową.' : 'Trigger light tactile feedback.', onPress: p.onTestHaptic },
    { title: pl ? 'Test dźwięku' : 'Test sound', detail: pl ? 'Odtwórz dźwięk przejścia.' : 'Play the transition sound.', onPress: p.onTestSound },
    { title: pl ? 'Wstaw prompt testowy' : 'Insert test prompt', detail: pl ? 'Przygotuj bezpieczne pytanie do modelu.' : 'Prepare a safe model test request.', onPress: p.onInsertTestPrompt },
    { title: pl ? 'Resetuj bieżącą analizę' : 'Reset current analysis', detail: pl ? 'Wyczyść wynik, błąd i stan pisania.' : 'Clear result, error, and typing state.', onPress: p.onResetAnalysis },
    { title: pl ? 'Konfiguracja hosta AI' : 'AI host configuration', detail: pl ? 'Otwórz techniczne ustawienia połączenia.' : 'Open technical connection settings.', onPress: p.onOpenHostSettings },
  ];
  const designModes: Array<{ id: DesignMode; name: string; detail: string }> = [
    { id: 'classic', name: 'Classic', detail: pl ? 'Oliwkowy dziennik, kompaktowy terminal i proste listy.' : 'Olive journal, compact terminal and simple lists.' },
    { id: 'hyprland', name: 'Hyprland', detail: pl ? 'Okna workspace i pierwotny niebieski motyw bety.' : 'Workspace windows and the original blue beta palette.' },
    { id: 'mosaic', name: pl ? 'Mozaika' : 'Mosaic', detail: pl ? 'Geometryczne kafelki i akcenty kolorystyczne w analizie.' : 'Geometric tiles and color accents across analysis.' },
    { id: 'current', name: 'Quiet / default', detail: pl ? 'Domyślna przestrzeń użytkownika i spokojny układ kart.' : 'Default user workspace with a quiet card layout.' },
    { id: 'atelier', name: 'Atelier', detail: pl ? 'Redakcyjny notatnik, wyraźna hierarchia i ciepła paleta.' : 'Editorial field notes, clear hierarchy and a warm palette.' },
    { id: 'clarity', name: 'Clarity', detail: pl ? 'Nowy styl reklamy: cyjan, kobalt i przejrzyste karty.' : 'The new campaign style: cyan, cobalt and clear cards.' },
  ];

  return <Modal visible={p.visible} transparent animationType="fade" onRequestClose={p.onClose}>
    <View style={s.backdrop}>
      <ScrollView style={s.card} contentContainerStyle={s.content} showsVerticalScrollIndicator={false}>
        <View style={s.headingRow}>
          <View style={s.headingCopy}>
            <Text style={[s.eyebrow, font]}>LINUXFIX / {p.accessLevel.toUpperCase()}</Text>
            <Text style={[s.title, font]}>{p.accessLevel === 'admin' ? (pl ? 'Panel administratora' : 'Administrator panel') : (pl ? 'Panel deweloperski' : 'Developer panel')}</Text>
          </View>
          <View style={s.liveDot} />
        </View>
        <Text style={[s.intro, font]}>{pl ? 'Laboratorium aplikacji. Narzędzia zmieniają tylko środowisko testowe tego urządzenia.' : 'Application lab. These tools only change the test environment on this device.'}</Text>
        <View style={s.statusCard}>
          <Info label={pl ? 'Połączenie AI' : 'AI connection'} value={p.aiStatus.toUpperCase()} font={font} />
          <Info label={pl ? 'Backend' : 'Backend'} value={p.backendUrl || (pl ? 'konfiguracja zdalna' : 'remote configuration')} font={font} />
          <Info label="User ID" value={p.userId} font={font} />
        </View>

        <Text style={[s.section, font]}>WORKSPACE DESIGN LAB</Text>
        <Text style={[s.designIntro, font]}>{pl ? 'Narzędzie admin/dev. Każdy styl obejmuje menu, edytor, analizę i komendy. Wybór jest lokalny; zwykłe konta korzystają z Quiet.' : 'Admin/dev tool. Each style covers home, composer, analysis and commands. Selection is local; regular accounts use Quiet.'}</Text>
        {designModes.map((mode, index) => <Pressable
          key={mode.id}
          accessibilityRole="button"
          accessibilityState={{ selected: p.designMode === mode.id }}
          onPress={() => p.onSelectDesign(mode.id)}
          style={({ pressed }) => [s.designOption, p.designMode === mode.id && s.designOptionActive, pressed && s.pressed]}
        >
          <Text style={[s.designIndex, font]}>{String(index + 1).padStart(2, '0')}</Text>
          <View style={s.flex}><Text style={[s.designName, font]}>{mode.name}</Text><Text style={[s.designNote, font]}>{mode.detail}</Text></View>
          <Text style={[s.designSelected, font]}>{p.designMode === mode.id ? (pl ? 'AKTYWNY' : 'ACTIVE') : '↗'}</Text>
        </Pressable>)}

        <Text style={[s.section, font]}>{pl ? 'LABORATORIUM' : 'LAB'}</Text>
        <Toggle
          title={pl ? 'Wolne pisanie AI' : 'Slow AI typing'}
          detail={pl ? 'Ułatwia obserwację animacji i haptyki.' : 'Makes animation and haptic testing easier.'}
          active={p.slowTyping}
          onPress={p.onToggleSlowTyping}
          font={font}
        />
        {p.accessLevel === 'admin' && <>
          <Toggle
            title={pl ? 'GOD MODE / odblokuj eksperymenty' : 'GOD MODE / unlock experiments'}
            detail={pl ? 'Pokaż przełączniki prototypów i testów specjalnych.' : 'Reveal prototype and special test controls.'}
            active={p.godMode}
            onPress={p.onToggleGodMode}
            font={font}
            accent
          />
          {p.godMode && <View style={s.labBox}>
            <Text style={[s.labEyebrow, font]}>{pl ? 'TRYB ADMINA AKTYWNY' : 'ADMIN MODE ACTIVE'}</Text>
            <Toggle
              title={pl ? 'Natychmiastowe odpowiedzi' : 'Instant AI reveal'}
              detail={pl ? 'Pomiń animację pisania podczas testów.' : 'Skip the typewriter effect while testing.'}
              active={p.instantAiReveal}
              onPress={p.onToggleInstantAiReveal}
              font={font}
            />
            <Toggle
              title={pl ? 'Symuluj status offline' : 'Simulate offline status'}
              detail={pl ? 'Zmienia tylko etykietę w panelu. Żądania AI nadal działają.' : 'Changes only the panel badge. AI requests still work.'}
              active={p.offlinePreview}
              onPress={p.onToggleOfflinePreview}
              font={font}
            />
            <Tool
              title={pl ? 'Ping AI teraz' : 'Ping AI now'}
              detail={pl ? 'Sprawdź backend i gotowość modelu Ollama.' : 'Check backend and Ollama model readiness.'}
              onPress={p.onRefreshAi}
              font={font}
            />
            <Tool
              title={p.partyThemeActive ? (pl ? 'Wyłącz RGB party mode' : 'Turn off RGB party mode') : (pl ? 'Odpal RGB party mode' : 'Launch RGB party mode')}
              detail={pl ? 'Włącza zabawny motyw RGB aplikacji.' : 'Switches the app to its playful RGB theme.'}
              onPress={p.onTogglePartyTheme}
              font={font}
            />
          </View>}
        </>}

        <Text style={[s.section, font]}>{pl ? 'NARZĘDZIA' : 'TOOLS'}</Text>
        {tools.map(tool => <Tool key={tool.title} {...tool} font={font} />)}
        <Text style={[s.security, font]}>{pl ? 'Role i dane kont nadal kontroluje Supabase. GOD MODE odblokowuje wyłącznie lokalne opcje testowe.' : 'Supabase still controls account roles and data. GOD MODE unlocks local testing options only.'}</Text>
        <Pressable onPress={p.onClose} style={({ pressed }) => [s.close, pressed && s.pressed]}><Text style={[s.closeText, font]}>{pl ? 'Gotowe' : 'Done'}</Text></Pressable>
      </ScrollView>
    </View>
  </Modal>;
}

function Info({ label, value, font }: { label: string; value: string; font?: { fontFamily: string } }) {
  return <View style={s.info}><Text style={[s.infoLabel, font]}>{label}</Text><Text numberOfLines={2} style={[s.infoValue, font]}>{value}</Text></View>;
}

function Toggle({ title, detail, active, onPress, font, accent = false }: { title: string; detail: string; active: boolean; onPress: () => void; font?: { fontFamily: string }; accent?: boolean }) {
  return <Pressable onPress={onPress} style={({ pressed }) => [s.toggle, accent && s.toggleAccent, pressed && s.pressed]}>
    <View style={s.flex}><Text style={[s.toolTitle, font]}>{title}</Text><Text style={[s.toolDetail, font]}>{detail}</Text></View>
    <View style={[s.switch, active && s.switchOn, accent && active && s.switchParty]}><View style={[s.switchKnob, active && s.switchKnobOn]} /></View>
  </Pressable>;
}

function Tool({ title, detail, onPress, font }: { title: string; detail: string; onPress: () => void; font?: { fontFamily: string } }) {
  return <Pressable onPress={onPress} style={({ pressed }) => [s.tool, pressed && s.pressed]}>
    <View style={s.flex}><Text style={[s.toolTitle, font]}>{title}</Text><Text style={[s.toolDetail, font]}>{detail}</Text></View><Text style={s.arrow}>›</Text>
  </Pressable>;
}

const s = StyleSheet.create({
  backdrop: { flex: 1, backgroundColor: 'rgba(4,10,14,0.82)', justifyContent: 'center', padding: 16 },
  card: { backgroundColor: '#1B2C37', borderRadius: 18, maxHeight: '90%', width: '100%', maxWidth: 620, alignSelf: 'center' },
  content: { padding: 22 }, headingRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }, headingCopy: { flex: 1 },
  eyebrow: { color: '#82B6D9', fontSize: 10, letterSpacing: 1.2 }, title: { color: '#EDF3F5', fontSize: 25, marginTop: 8 }, liveDot: { backgroundColor: '#78B8A0', width: 9, height: 9, borderRadius: 5 },
  intro: { color: '#B6C7D1', fontSize: 13, lineHeight: 21, marginTop: 14 }, statusCard: { backgroundColor: '#101C24', borderRadius: 12, marginTop: 20, padding: 16, gap: 14 },
  designIntro: { color: '#9EAFB8', fontSize: 12, lineHeight: 18, marginBottom: 10 }, designOption: { backgroundColor: '#101C24', borderColor: '#2F4959', borderWidth: 1, borderRadius: 10, flexDirection: 'row', alignItems: 'center', gap: 12, marginTop: 7, padding: 13 }, designOptionActive: { borderColor: '#A1C6F6', backgroundColor: '#233B4C' }, designIndex: { color: '#82B6D9', fontSize: 11, fontWeight: '800' }, designName: { color: '#EDF3F5', fontSize: 14, fontWeight: '700' }, designNote: { color: '#9EAFB8', fontSize: 11, lineHeight: 16, marginTop: 3 }, designSelected: { color: '#A1C6F6', fontSize: 10, fontWeight: '700' },
  info: { gap: 4 }, infoLabel: { color: '#7F929D', fontSize: 10, letterSpacing: 0.8 }, infoValue: { color: '#EDF3F5', fontSize: 12, lineHeight: 18 },
  section: { color: '#82B6D9', fontSize: 10, letterSpacing: 1.2, marginTop: 24, marginBottom: 8 }, toggle: { backgroundColor: '#101C24', borderRadius: 12, flexDirection: 'row', alignItems: 'center', gap: 14, marginTop: 8, padding: 16 },
  toggleAccent: { borderColor: '#A1C6F6', borderWidth: 1 }, labBox: { backgroundColor: '#111E29', borderColor: '#315572', borderWidth: 1, borderRadius: 14, marginTop: 10, padding: 12 }, labEyebrow: { color: '#A1C6F6', fontSize: 10, letterSpacing: 1, margin: 5 },
  tool: { backgroundColor: '#101C24', borderRadius: 12, flexDirection: 'row', alignItems: 'center', gap: 14, marginTop: 8, padding: 16 }, flex: { flex: 1 },
  toolTitle: { color: '#EDF3F5', fontSize: 14 }, toolDetail: { color: '#9EAFB8', fontSize: 11, lineHeight: 17, marginTop: 5 }, arrow: { color: '#82B6D9', fontSize: 23 },
  switch: { backgroundColor: '#344650', borderRadius: 12, height: 24, padding: 3, width: 44 }, switchOn: { backgroundColor: '#82B6D9' }, switchParty: { backgroundColor: '#C40361' }, switchKnob: { backgroundColor: '#B6C7D1', borderRadius: 9, height: 18, width: 18 }, switchKnobOn: { backgroundColor: '#101C24', marginLeft: 20 },
  security: { backgroundColor: '#101C24', borderRadius: 10, color: '#9EAFB8', fontSize: 11, lineHeight: 18, marginTop: 20, padding: 14 },
  close: { backgroundColor: '#EDF3F5', borderRadius: 10, marginTop: 16, padding: 16 }, closeText: { color: '#101C24', fontSize: 13, textAlign: 'center' }, pressed: { opacity: 0.68 },
});
