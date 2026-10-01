import React from 'react';
import { StyleSheet, Text, TextInput, View } from 'react-native';

import { COLORS, FONTS } from '../theme';

// A labelled text input in the redesign's style. `prefix` shows fixed text
// before the input (e.g. "+254"); `trailing` is any element after it.
export default function FormField({
  label,
  prefix,
  trailing,
  style,
  ...inputProps
}) {
  return (
    <View style={style}>
      <Text style={styles.label}>{label}</Text>

      <View style={styles.box}>
        {prefix ? (
          <View style={styles.prefixWrap}>
            <Text style={styles.prefix}>{prefix}</Text>
          </View>
        ) : null}

        <TextInput
          placeholderTextColor="#8193B0"
          style={[styles.input, prefix && styles.inputAfterPrefix]}
          accessibilityLabel={label}
          {...inputProps}
        />

        {trailing}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  label: {
    marginBottom: 6,
    color: COLORS.ink,
    fontFamily: FONTS.bold,
    fontSize: 13,
  },
  box: {
    height: 52,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: COLORS.line,
    backgroundColor: COLORS.surface,
  },
  prefixWrap: {
    paddingRight: 12,
    borderRightWidth: 1,
    borderRightColor: COLORS.line,
  },
  prefix: {
    color: COLORS.ink,
    fontFamily: FONTS.extrabold,
    fontSize: 15,
  },
  input: {
    flex: 1,
    height: '100%',
    color: COLORS.ink,
    fontFamily: FONTS.medium,
    fontSize: 15,
  },
  inputAfterPrefix: {
    paddingLeft: 12,
  },
});
