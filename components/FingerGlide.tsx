import { createContext, useContext, useEffect, useRef, type ReactNode } from 'react';
import { AccessibilityInfo, Animated, View, type GestureResponderEvent, type NativeSyntheticEvent, type NativeScrollEvent, type StyleProp, type ViewStyle } from 'react-native';

type Point = { x: number; y: number };
type Listener = (point: Point | null) => void;
type ScrollEvent = NativeSyntheticEvent<NativeScrollEvent>;
type Field = { listeners: Set<Listener>; refresh: () => void; begin: (e: ScrollEvent) => void; scroll: (e: ScrollEvent) => void; end: () => void };
const Context = createContext<Field | null>(null);

/** Observes bubbling touches without becoming the gesture responder. */
export function FingerGlideField({ children, enabled, style }: { children: ReactNode; enabled: boolean; style?: StyleProp<ViewStyle> }) {
  const listeners = useRef(new Set<Listener>()).current;
  const point = useRef<Point | null>(null);
  const frame = useRef<ReturnType<typeof requestAnimationFrame> | null>(null);
  const reduced = useRef(false);
  const drag = useRef<{ point: Point; offset: number } | null>(null);
  const active = useRef(enabled);
  active.current = enabled;
  const reset = () => {
    point.current = null;
    drag.current = null;
    if (frame.current !== null) cancelAnimationFrame(frame.current);
    frame.current = null;
    listeners.forEach(listener => listener(null));
  };
  const refresh = () => {
    if (!active.current || reduced.current || !point.current || frame.current !== null) return;
    frame.current = requestAnimationFrame(() => {
      frame.current = null;
      listeners.forEach(listener => listener(point.current));
    });
  };
  const begin = (event: ScrollEvent) => {
    if (point.current) drag.current = { point: { ...point.current }, offset: event.nativeEvent.contentOffset.y };
  };
  const scroll = (event: ScrollEvent) => {
    // Native ScrollView can cancel child touch events once it owns a drag.
    // Its content offset still tracks the finger, so keep the field alive.
    if (drag.current) point.current = { x: drag.current.point.x, y: drag.current.point.y - (event.nativeEvent.contentOffset.y - drag.current.offset) };
    refresh();
  };
  const field = useRef<Field>({ listeners, refresh, begin, scroll, end: reset }).current;
  field.refresh = refresh;
  field.begin = begin; field.scroll = scroll; field.end = reset;
  const observe = (event: GestureResponderEvent) => {
    if (!active.current || reduced.current) return;
    point.current = { x: event.nativeEvent.pageX, y: event.nativeEvent.pageY };
    refresh();
  };
  useEffect(() => { if (!enabled) reset(); }, [enabled]);
  useEffect(() => {
    let mounted = true;
    void AccessibilityInfo.isReduceMotionEnabled().then(value => {
      if (mounted) { reduced.current = value; if (value) reset(); }
    });
    const subscription = AccessibilityInfo.addEventListener('reduceMotionChanged', value => {
      reduced.current = value;
      if (value) reset();
    });
    return () => { mounted = false; subscription.remove(); reset(); };
  }, []);
  return <Context.Provider value={field}><View style={style}
    onStartShouldSetResponderCapture={event => { observe(event); return false; }}
    onMoveShouldSetResponderCapture={event => { observe(event); return false; }}
    onTouchStart={observe} onTouchMove={observe}
    onTouchEnd={() => { if (!drag.current) reset(); }}
    onTouchCancel={() => { requestAnimationFrame(() => { if (!drag.current) reset(); }); }}
  >{children}</View></Context.Provider>;
}

export function useGlideScroll() {
  const field = useContext(Context);
  return {
    onScroll: (event: ScrollEvent) => field?.scroll(event),
    onScrollBeginDrag: (event: ScrollEvent) => field?.begin(event),
    onScrollEndDrag: () => field?.end(),
    onMomentumScrollEnd: () => field?.end(),
  };
}

export function GlideTile({ children, style }: { children: ReactNode; style?: StyleProp<ViewStyle> }) {
  const field = useContext(Context);
  const anchor = useRef<View>(null);
  const movement = useRef(new Animated.ValueXY()).current;
  const scale = useRef(new Animated.Value(1)).current;
  useEffect(() => {
    if (!field) return;
    let revision = 0;
    let measuring = false;
    let mounted = true;
    let animation: Animated.CompositeAnimation | undefined;
    let lastTarget = { x: 0, y: 0, scale: 1 };
    const move = (x: number, y: number, zoom: number) => {
      if (Math.abs(x - lastTarget.x) < 0.3 && Math.abs(y - lastTarget.y) < 0.3 && Math.abs(zoom - lastTarget.scale) < 0.001) return;
      lastTarget = { x, y, scale: zoom };
      animation?.stop();
      animation = Animated.parallel([
        Animated.spring(movement, { toValue: { x, y }, stiffness: 150, damping: 24, mass: 0.65, useNativeDriver: true, isInteraction: false }),
        Animated.spring(scale, { toValue: zoom, stiffness: 150, damping: 24, mass: 0.65, useNativeDriver: true, isInteraction: false }),
      ]);
      animation.start();
    };
    const listener: Listener = point => {
      if (!point) { revision++; move(0, 0, 1); return; }
      if (measuring) return;
      const current = revision;
      measuring = true;
      // Measure the stationary wrapper, not the moving surface: no feedback drift.
      anchor.current?.measureInWindow((x, y, width, height) => {
        measuring = false;
        if (!mounted || revision !== current || !width || !height) return;
        const dx = point.x - (x + width / 2);
        const dy = point.y - (y + height / 2);
        const distance = Math.hypot(Math.max(0, Math.abs(dx) - width / 2), Math.max(0, Math.abs(dy) - height / 2));
        const proximity = Math.max(0, 1 - distance / 110);
        const influence = proximity * proximity;
        move(Math.tanh(dx / 160) * 14 * influence, Math.tanh(dy / 200) * 11 * influence, 1 + 0.014 * influence);
      });
    };
    field.listeners.add(listener);
    return () => { mounted = false; revision++; field.listeners.delete(listener); animation?.stop(); };
  }, [field, movement, scale]);
  return <View ref={anchor} collapsable={false} style={style}><Animated.View style={{ transform: [...movement.getTranslateTransform(), { scale }] }}>{children}</Animated.View></View>;
}
