import React from 'react';
import { ActivityIndicator, StyleSheet, Text, TouchableOpacity } from 'react-native';

import { COLORS, FONTS } from '../theme';

// The redesign's main button. `rightText` (e.g. a total) is shown at the
// right edge; otherwise the title is centred.
export default function PrimaryButton({
  title,
  rightText,
  onPress,
  disabled = false,
  loading = false,
  style,
}) {
  const inactive = disabled || loading;

  return (
    <TouchableOpacity
      style={[
        styles.button,
        rightText ? styles.split : styles.centered,
        inactive && styles.inactive,
        style,
      ]}
      activeOpacity={0.85}
      disabled={inactive}
      onPress={onPress}
      accessibilityRole="button"
      accessibilityState={{ disabled: inactive, busy: loading }}
    >
      {loading ? (
        <ActivityIndicator color={COLORS.surface} />
      ) : (
        <>
          <Text style={styles.text}>{title}</Text>
          {rightText ? <Text style={styles.text}>{rightText}</Text> : null}
        </>
      )}
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  button: {
    height: 56,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    borderRadius: 16,
    backgroundColor: COLORS.royal,
  },
  centered: {
    justifyContent: 'center',
  },
  split: {
    justifyContent: 'space-between',
  },
  inactive: {
    backgroundColor: COLORS.disabled,
  },
  text: {
    color: COLORS.surface,
    fontFamily: FONTS.extrabold,
    fontSize: 16,
  },
});
