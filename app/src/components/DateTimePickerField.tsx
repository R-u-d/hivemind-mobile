import DateTimePicker, { type DateTimePickerEvent } from '@react-native-community/datetimepicker';
import { Ionicons } from '@expo/vector-icons';
import { useState } from 'react';
import { Modal, Platform, Pressable, StyleSheet, Text, View } from 'react-native';

import FieldFocusAura from '@/components/FieldFocusAura';
import { fonts, radius, spacing, typography } from '@/theme';
import { useTheme } from '@/theme/ThemeContext';
import { roundUpToInterval } from '@/utils/time';

interface DateTimePickerFieldProps {
  label: string;
  mode: 'date' | 'time';
  value: Date | null;
  onChange: (next: Date) => void;
  placeholder: string;
  format: (d: Date) => string;
  icon: keyof typeof Ionicons.glyphMap;
  error?: string;
  minimumDate?: Date;
  /** Snap the time wheel to this many minutes (e.g. 5 → 10:05, 10:10). */
  minuteInterval?: number;
}

// iOS holds a temp value while the spinner is open and commits it on "Done" —
// so tapping Done without scrolling still inserts the shown default, and a
// stray first tick never slams the picker shut. Android uses its one-shot dialog.

export default function DateTimePickerField({
  label,
  mode,
  value,
  onChange,
  placeholder,
  format,
  icon,
  error,
  minimumDate,
  minuteInterval,
}: DateTimePickerFieldProps) {
  const colors = useTheme();
  const [show, setShow] = useState(false);
  const [tempValue, setTempValue] = useState<Date | null>(null);

  const normalize = (d: Date) => (minuteInterval ? roundUpToInterval(d, minuteInterval) : d);
  const pickerValue = tempValue ?? normalize(value ?? minimumDate ?? new Date());

  const openPicker = () => {
    setTempValue(normalize(value ?? minimumDate ?? new Date()));
    setShow(true);
  };

  const handleAndroidChange = (event: DateTimePickerEvent, selected?: Date) => {
    setShow(false);
    if (event.type === 'set' && selected) onChange(selected);
  };

  const handleIosChange = (_event: DateTimePickerEvent, selected?: Date) => {
    if (selected) setTempValue(selected);
  };

  const handleDone = () => {
    if (tempValue) onChange(tempValue);
    setShow(false);
  };

  const borderColor = error ? colors.danger : show ? colors.primary : colors.border;

  return (
    <View style={styles.group}>
      <Text style={[styles.label, { color: colors.textMuted }]}>{label}</Text>
      <FieldFocusAura active={show}>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={`${label}: ${value ? format(value) : placeholder}`}
          onPress={openPicker}
          style={[styles.row, { borderColor, backgroundColor: colors.surface }]}
        >
          <Ionicons name={icon} size={16} color={colors.textMuted} />
          <Text
            style={[
              typography.body,
              { color: value ? colors.text : colors.textFaint, flex: 1, textAlign: 'center' },
            ]}
            numberOfLines={1}
          >
            {value ? format(value) : placeholder}
          </Text>
          {/* spacer keeps the centered text optically balanced against the leading icon */}
          <View style={styles.iconSpacer} />
        </Pressable>
      </FieldFocusAura>
      {error ? <Text style={[styles.error, { color: colors.danger }]}>{error}</Text> : null}

      {!show ? null : Platform.OS === 'ios' ? (
        <Modal visible transparent animationType="slide" onRequestClose={() => setShow(false)}>
          <Pressable
            style={styles.backdrop}
            onPress={() => setShow(false)}
            accessibilityLabel={`Close ${label.toLowerCase()} picker`}
          />
          <View style={[styles.sheet, { backgroundColor: colors.bg }]}>
            <View style={[styles.sheetHeader, { borderBottomColor: colors.borderSoft }]}>
              <Pressable
                accessibilityRole="button"
                accessibilityLabel="Done"
                onPress={handleDone}
                hitSlop={10}
              >
                <Text
                  style={[typography.body, { color: colors.primary, fontFamily: fonts.medium }]}
                >
                  Done
                </Text>
              </Pressable>
            </View>
            <DateTimePicker
              value={pickerValue}
              mode={mode}
              display="spinner"
              minimumDate={minimumDate}
              minuteInterval={minuteInterval}
              onChange={handleIosChange}
              style={styles.iosPicker}
            />
          </View>
        </Modal>
      ) : (
        <DateTimePicker
          value={pickerValue}
          mode={mode}
          minimumDate={minimumDate}
          minuteInterval={minuteInterval}
          onChange={handleAndroidChange}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  group: { gap: 6 },
  label: { fontSize: 13, letterSpacing: 0.1, fontFamily: fonts.medium },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    height: 48,
    paddingHorizontal: 14,
    borderRadius: radius.input,
    borderWidth: 1,
    gap: spacing.sm,
  },
  error: { fontSize: 12 },
  iconSpacer: { width: 16 },
  backdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.35)' },
  sheet: {
    borderTopLeftRadius: radius.xl,
    borderTopRightRadius: radius.xl,
    paddingBottom: spacing.xl,
  },
  sheetHeader: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    padding: spacing.base,
    borderBottomWidth: 1,
  },
  iosPicker: { alignSelf: 'center' },
});
