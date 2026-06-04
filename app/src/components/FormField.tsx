import { useEffect, useRef, useState } from 'react';
import {
  Animated,
  Easing,
  Platform,
  StyleSheet,
  Text,
  TextInput,
  type TextInputProps,
  View,
} from 'react-native';

import { fonts, radius } from '@/theme';
import { useTheme } from '@/theme/ThemeContext';

interface FormFieldProps extends TextInputProps {
  label: string;
  error?: string;
  labelColor?: string;
  rightAccessory?: React.ReactNode;
  /** Floor height for multiline fields. Defaults to ~3 lines. */
  minHeight?: number;
  /**
   * When set, a multiline field grows freely up to this many lines then
   * becomes internally scrollable. Without this prop the field grows without
   * bound (existing behaviour).
   */
  maxLines?: number;
}

// Focus state renders a two-layer purple aura around the input. The outer
// ring breathes while focused, tying the field to the same hex/halo motion
// language used on the splash.

const PRIMARY_RGB = '109, 40, 217'; // colors.primary #6D28D9

// Single source of truth for the default multiline height (~3 lines) so every
// textarea-style field (event description, bio, community description) matches.
export const MULTILINE_MIN_HEIGHT = 56;

// Approximate line height for the 15px body font used inside FormField.
const FORM_LINE_H = 22;
// Vertical padding on the row container (rowMultiline.paddingVertical = 12).
const ROW_PAD_V = 12;

export default function FormField({
  label,
  error,
  labelColor,
  rightAccessory,
  onFocus,
  onBlur,
  value,
  style,
  minHeight,
  maxLines,
  ...props
}: FormFieldProps) {
  const colors = useTheme();
  const [focused, setFocused] = useState(false);
  const glow = useRef(new Animated.Value(0)).current;
  const breath = useRef(new Animated.Value(0)).current;

  const maxInputH = maxLines ? maxLines * FORM_LINE_H : undefined;
  const maxRowH = maxInputH ? maxInputH + ROW_PAD_V * 2 : undefined;

  // Android: track content height explicitly so the field can grow and then scroll.
  const minInputH = minHeight ?? MULTILINE_MIN_HEIGHT;
  const [androidH, setAndroidH] = useState(minInputH);

  useEffect(() => {
    Animated.timing(glow, {
      toValue: focused ? 1 : 0,
      duration: 220,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: false,
    }).start();
  }, [focused, glow]);

  useEffect(() => {
    if (!focused) return;
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(breath, {
          toValue: 1,
          duration: 1600,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: false,
        }),
        Animated.timing(breath, {
          toValue: 0,
          duration: 1600,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: false,
        }),
      ]),
    );
    loop.start();
    return () => loop.stop();
  }, [focused, breath]);

  const breathOpacity = breath.interpolate({ inputRange: [0, 1], outputRange: [0.85, 1] });
  const borderColor = error ? colors.danger : focused ? colors.primary : colors.border;

  // Height / scroll logic for capped multiline fields.
  const isAndroid = Platform.OS === 'android';
  const cappedMultiline = props.multiline && maxLines != null;
  const androidAtCap = cappedMultiline && isAndroid && androidH >= (maxInputH ?? Infinity);

  const inputHeightStyle = cappedMultiline
    ? isAndroid
      ? { height: androidH }
      : { maxHeight: maxInputH }
    : props.multiline
      ? { minHeight: minInputH }
      : undefined;

  const scrollEnabled = cappedMultiline
    ? isAndroid
      ? androidAtCap
      : undefined // iOS handles it natively via maxHeight
    : props.multiline
      ? false
      : undefined;

  return (
    <View style={styles.wrapper}>
      <Text
        style={[styles.label, { color: labelColor ?? colors.textMuted, fontFamily: fonts.medium }]}
      >
        {label}
      </Text>
      <View style={styles.haloFrame}>
        <Animated.View
          pointerEvents="none"
          style={[
            styles.glowOuter,
            {
              backgroundColor: `rgba(${PRIMARY_RGB}, 0.07)`,
              opacity: Animated.multiply(glow, breathOpacity),
            },
          ]}
        />
        <Animated.View
          pointerEvents="none"
          style={[
            styles.glowInner,
            { backgroundColor: `rgba(${PRIMARY_RGB}, 0.16)`, opacity: glow },
          ]}
        />
        <View
          style={[
            styles.row,
            { borderColor, backgroundColor: colors.surface },
            props.multiline ? styles.rowMultiline : styles.rowSingleLine,
            cappedMultiline && maxRowH ? { maxHeight: maxRowH } : undefined,
          ]}
        >
          <TextInput
            style={[
              styles.input,
              { color: colors.text, fontFamily: fonts.regular },
              props.multiline && styles.inputMultiline,
              inputHeightStyle,
              style,
            ]}
            underlineColorAndroid="transparent"
            placeholderTextColor={colors.textFaint}
            onFocus={e => {
              setFocused(true);
              onFocus?.(e);
            }}
            onBlur={e => {
              setFocused(false);
              onBlur?.(e);
            }}
            value={value ?? ''}
            scrollEnabled={scrollEnabled}
            onContentSizeChange={
              cappedMultiline && isAndroid
                ? e => {
                    const h = e.nativeEvent.contentSize.height;
                    setAndroidH(Math.min(Math.max(h, minInputH), maxInputH ?? h));
                  }
                : props.onContentSizeChange
            }
            {...props}
          />
          {rightAccessory}
        </View>
      </View>
      {error ? (
        <Text style={[styles.error, { color: colors.danger, fontFamily: fonts.regular }]}>
          {error}
        </Text>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: { gap: 6 },
  label: { fontSize: 13, letterSpacing: 0.1 },
  haloFrame: { position: 'relative' },
  glowOuter: {
    position: 'absolute',
    top: -7,
    left: -7,
    right: -7,
    bottom: -7,
    borderRadius: radius.input + 7,
  },
  glowInner: {
    position: 'absolute',
    top: -3,
    left: -3,
    right: -3,
    bottom: -3,
    borderRadius: radius.input + 3,
  },
  row: {
    flexDirection: 'row',
    paddingHorizontal: 14,
    borderRadius: radius.input,
    borderWidth: 1,
  },
  rowSingleLine: { height: 48, alignItems: 'center' },
  rowMultiline: { minHeight: 48, alignItems: 'flex-start', paddingVertical: 12 },
  input: {
    flex: 1,
    fontSize: 15,
    letterSpacing: -0.1,
    paddingVertical: 0,
    outlineStyle: 'none' as never,
  },
  inputMultiline: { textAlignVertical: 'top', paddingVertical: 0 },
  error: { fontSize: 12 },
});
