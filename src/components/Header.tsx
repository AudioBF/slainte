import { StyleSheet, Text, View } from 'react-native';
import { colors } from '../theme/colors';
import { typography } from '../theme/typography';
import { LogoIcon } from './LogoIcon';

type Props = {
  title: string;
  subtitle?: string;
  dark?: boolean;
};

export function Header({ title, subtitle, dark }: Props) {
  if (dark) {
    return (
      <View style={styles.darkBanner}>
        <LogoIcon size={36} variant="dark" />
        <View style={styles.textBlock}>
          <Text style={styles.darkTitle}>{title}</Text>
          {subtitle ? <Text style={styles.darkSubtitle}>{subtitle}</Text> : null}
        </View>
      </View>
    );
  }

  return (
    <View style={styles.light}>
      <Text style={typography.display}>{title}</Text>
      {subtitle ? <Text style={[typography.caption, styles.subtitle]}>{subtitle}</Text> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  light: {
    marginBottom: 20,
    marginTop: 8,
  },
  subtitle: {
    marginTop: 4,
  },
  darkBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.forest,
    borderRadius: 20,
    padding: 16,
    marginBottom: 20,
    gap: 12,
  },
  textBlock: {
    flex: 1,
  },
  darkTitle: {
    fontFamily: 'Fraunces_700Bold',
    fontSize: 22,
    color: colors.textOnDark,
  },
  darkSubtitle: {
    fontFamily: 'Outfit_400Regular',
    fontSize: 13,
    color: colors.textOnDark,
    opacity: 0.85,
    marginTop: 2,
  },
});
