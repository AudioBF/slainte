import { StyleSheet, Text, TextInput, TextInputProps, View } from 'react-native';
import { colors } from '../theme/colors';
import { radius, spacing } from '../theme/tokens';
import { typography } from '../theme/typography';

type Props = TextInputProps & {
  label?: string;
  hint?: string;
  multiline?: boolean;
};

export function InputField({ label, hint, multiline, style, ...rest }: Props) {
  return (
    <View style={styles.wrap}>
      {label ? <Text style={typography.label}>{label}</Text> : null}
      <TextInput
        placeholderTextColor={colors.textMuted}
        multiline={multiline}
        style={[styles.input, multiline && styles.textArea, style]}
        {...rest}
      />
      {hint ? <Text style={[typography.caption, styles.hint]}>{hint}</Text> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    marginTop: spacing.sm,
  },
  input: {
    fontFamily: 'Outfit_400Regular',
    fontSize: 15,
    color: colors.text,
    backgroundColor: colors.cream,
    borderRadius: radius.md,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.md,
    marginTop: spacing.sm,
    borderWidth: 1,
    borderColor: colors.border,
  },
  textArea: {
    minHeight: 88,
    textAlignVertical: 'top',
  },
  hint: {
    marginTop: spacing.xs,
  },
});
