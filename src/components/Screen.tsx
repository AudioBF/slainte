import { ReactNode } from 'react';
import { ScrollView, StyleSheet, View, ViewStyle } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { colors } from '../theme/colors';
import { spacing } from '../theme/tokens';

type Props = {
  children: ReactNode;
  scroll?: boolean;
  style?: ViewStyle;
  padded?: boolean;
  /** Extra bottom padding when a PrimaryActionBar is shown */
  footerSpace?: number;
};

export function Screen({ children, scroll = true, style, padded = true, footerSpace = 0 }: Props) {
  const insets = useSafeAreaInsets();
  const topInset = Math.max(insets.top, spacing.md);
  const content = (
    <View style={[styles.inner, padded && styles.padded, style]}>{children}</View>
  );

  const scrollPadding = spacing.xxxl + footerSpace;

  if (!scroll) {
    return (
      <View style={[styles.container, { paddingTop: topInset }]}>
        <View style={styles.centered}>{content}</View>
      </View>
    );
  }

  return (
    <ScrollView
      style={[styles.container, { paddingTop: topInset }]}
      contentContainerStyle={[styles.scrollContent, { paddingBottom: scrollPadding }]}
      showsVerticalScrollIndicator={false}
    >
      {content}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    width: '100%',
    backgroundColor: colors.cream,
    overflow: 'hidden',
  },
  scrollContent: {
    flexGrow: 1,
    width: '100%',
    alignItems: 'center',
  },
  centered: {
    flex: 1,
    width: '100%',
    alignItems: 'center',
  },
  inner: {
    flex: 1,
    width: '100%',
    maxWidth: 520,
  },
  padded: {
    paddingHorizontal: 20,
  },
});
