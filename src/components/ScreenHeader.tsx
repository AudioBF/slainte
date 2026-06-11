import { ReactNode } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { APP } from '../constants/app';
import { colors } from '../theme/colors';
import { elevation, spacing } from '../theme/tokens';
import { Avatar } from './Avatar';
import { LogoIcon } from './LogoIcon';

type Props = {
  title: string;
  subtitle?: string;
  /** Aba Hoje — saudação + branding */
  home?: boolean;
  displayName?: string;
  avatarUri?: string | null;
  onAvatarPress?: () => void;
  right?: ReactNode;
};

function getGreeting(): string {
  const hour = new Date().getHours();
  if (hour < 12) return 'Bom dia';
  if (hour < 18) return 'Boa tarde';
  return 'Boa noite';
}

export function ScreenHeader({
  title,
  subtitle,
  home,
  displayName,
  avatarUri,
  onAvatarPress,
  right,
}: Props) {
  const name = displayName?.trim();
  const greeting = name ? `${getGreeting()}, ${name}` : getGreeting();

  return (
    <View style={styles.banner} accessibilityRole="header">
      <View style={styles.logoWrap}>
        <LogoIcon size={40} variant="dark" />
      </View>
      <View style={styles.textBlock}>
        {home ? (
          <Text style={styles.greeting} numberOfLines={1}>
            {greeting}
          </Text>
        ) : null}
        <Text style={styles.title} numberOfLines={1}>
          {home ? APP.name : title}
        </Text>
        {(home ? APP.tagline : subtitle) ? (
          <Text style={styles.subtitle} numberOfLines={2}>
            {home ? APP.tagline : subtitle}
          </Text>
        ) : null}
      </View>
      {right ? <View style={styles.right}>{right}</View> : null}
      {onAvatarPress ? (
        <Pressable
          onPress={onAvatarPress}
          accessibilityRole="button"
          accessibilityLabel="Abrir perfil"
          hitSlop={8}
          style={styles.avatarBtn}
        >
          <Avatar uri={avatarUri ?? null} name={name} size={44} />
        </Pressable>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  banner: {
    flexDirection: 'row',
    alignItems: 'center',
    width: '100%',
    backgroundColor: colors.forest,
    borderRadius: 20,
    padding: 16,
    marginBottom: spacing.xl,
    gap: spacing.md,
    overflow: 'hidden',
    ...elevation.header,
  },
  logoWrap: {
    flexShrink: 0,
  },
  textBlock: {
    flex: 1,
    minWidth: 0,
  },
  right: {
    flexShrink: 0,
  },
  avatarBtn: {
    flexShrink: 0,
  },
  greeting: {
    fontFamily: 'Outfit_400Regular',
    fontSize: 13,
    color: colors.textOnDark,
    opacity: 0.9,
    marginBottom: 2,
  },
  title: {
    fontFamily: 'Fraunces_700Bold',
    fontSize: 22,
    color: colors.textOnDark,
  },
  subtitle: {
    fontFamily: 'Outfit_400Regular',
    fontSize: 13,
    color: colors.textOnDark,
    opacity: 0.85,
    marginTop: 2,
  },
});
