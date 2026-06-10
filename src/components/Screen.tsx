import { ReactNode } from 'react';
import { ScrollView, StyleSheet, View, ViewStyle } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { colors } from '../theme/colors';

type Props = {
  children: ReactNode;
  scroll?: boolean;
  style?: ViewStyle;
  padded?: boolean;
};

export function Screen({ children, scroll = true, style, padded = true }: Props) {
  const insets = useSafeAreaInsets();
  const content = (
    <View style={[styles.inner, padded && styles.padded, style]}>{children}</View>
  );

  if (!scroll) {
    return (
      <View style={[styles.container, { paddingTop: insets.top }]}>
        {content}
      </View>
    );
  }

  return (
    <ScrollView
      style={[styles.container, { paddingTop: insets.top }]}
      contentContainerStyle={styles.scrollContent}
      showsVerticalScrollIndicator={false}
    >
      {content}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.cream,
  },
  scrollContent: {
    flexGrow: 1,
    paddingBottom: 32,
  },
  inner: {
    flex: 1,
    width: '100%',
    maxWidth: 520,
    alignSelf: 'center',
  },
  padded: {
    paddingHorizontal: 20,
  },
});
