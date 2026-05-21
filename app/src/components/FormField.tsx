import { useState } from 'react';
import { StyleSheet, Text, TextInput, type TextInputProps, View } from 'react-native';

import { fonts, radius } from '@/theme';
import { useTheme } from '@/theme/ThemeContext';

interface FormFieldProps extends TextInputProps {
  label: string;
  error?: string;
  labelColor?: string;
  rightAccessory?: React.ReactNode;
}

export default function FormField({
  label,
  error,
  labelColor,
  rightAccessory,
  onFocus,
  onBlur,
  value,
  style,
  ...props
}: FormFieldProps) {
  const colors = useTheme();
  const [focused, setFocused] = useState(false);

  const borderColor = error ? colors.danger : focused ? colors.primary : colors.border;

  return (
    <View style={styles.wrapper}>
      <Text
        style={[styles.label, { color: labelColor ?? colors.textMuted, fontFamily: fonts.medium }]}
      >
        {label}
      </Text>
      <View
        style={[
          styles.row,
          { borderColor, backgroundColor: colors.surface },
          props.multiline && styles.rowMultiline,
        ]}
      >
        <TextInput
          style={[
            styles.input,
            { color: colors.text, fontFamily: fonts.regular },
            props.multiline && styles.inputMultiline,
            style,
          ]}
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
          scrollEnabled={props.multiline ? false : undefined}
          {...props}
        />
        {rightAccessory}
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
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    height: 48,
    paddingHorizontal: 14,
    borderRadius: radius.input,
    borderWidth: 1,
  },
  rowMultiline: {
    height: undefined,
    minHeight: 48,
    alignItems: 'flex-start',
    paddingVertical: 12,
  },
  input: {
    flex: 1,
    fontSize: 15,
    letterSpacing: -0.1,
    paddingVertical: 0,
  },
  inputMultiline: {
    textAlignVertical: 'top',
    paddingVertical: 0,
  },
  error: { fontSize: 12 },
});
