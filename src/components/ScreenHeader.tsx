import { ReactNode } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { APP } from '../constants/app';
import { colors } from '../theme/colors';
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
  const showGreeting = home && displayName;

  return (
    <View style={styles.banner} accessibilityRole="header">
      <LogoIcon size={40} variant="dark" />
      <View style={styles.textBlock}>
        {showGreeting ? (
          <Text style={styles.greeting}>
            {getGreeting()}, {displayName}
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
      {right}
      {onAvatarPress ? (
        <Pressable
          onPress={onAvatarPress}
          accessibilityRole="button"
          accessibilityLabel="Abrir perfil"
          hitSlop={8}
        >
          <Avatar uri={avatarUri ?? null} name={displayName} size={44} />
        </Pressable>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  banner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.forest,
    borderRadius: 20,
    padding: 16,
    marginBottom: 20,
    gap: 12,
    shadowColor: colors.forest,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 12,
    elevation: 4,
  },
  textBlock: {
    flex: 1,
    minWidth: 0,
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
