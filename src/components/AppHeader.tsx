import { Pressable, StyleSheet, Text, View } from 'react-native';
import { colors } from '../theme/colors';
import { APP } from '../constants/app';
import { Avatar } from './Avatar';
import { LogoIcon } from './LogoIcon';

type Props = {
  avatarUri?: string | null;
  displayName?: string;
  onAvatarPress?: () => void;
  showGreeting?: boolean;
};

function getGreeting(): string {
  const hour = new Date().getHours();
  if (hour < 12) return 'Bom dia';
  if (hour < 18) return 'Boa tarde';
  return 'Boa noite';
}

export function AppHeader({ avatarUri, displayName, onAvatarPress, showGreeting }: Props) {
  return (
    <View style={styles.banner}>
      <LogoIcon size={40} variant="dark" />
      <View style={styles.textBlock}>
        {showGreeting && displayName ? (
          <Text style={styles.greeting}>
            {getGreeting()}, {displayName}
          </Text>
        ) : null}
        <Text style={styles.title}>{APP.name}</Text>
        <Text style={styles.tagline}>{APP.tagline}</Text>
      </View>
      {onAvatarPress ? (
        <Pressable onPress={onAvatarPress}>
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
  },
  textBlock: {
    flex: 1,
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
  tagline: {
    fontFamily: 'Outfit_400Regular',
    fontSize: 13,
    color: colors.textOnDark,
    opacity: 0.85,
    marginTop: 2,
  },
});
