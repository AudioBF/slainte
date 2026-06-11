import { Image } from 'expo-image';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { colors } from '../theme/colors';

type Props = {
  uri: string | null;
  name?: string;
  size?: number;
  onPress?: () => void;
  /** Header escuro — alto contraste */
  variant?: 'default' | 'onDark';
};

export function Avatar({ uri, name, size = 44, onPress, variant = 'default' }: Props) {
  const initial = name?.trim().charAt(0).toUpperCase() || '?';
  const onDark = variant === 'onDark';

  const imageStyle = {
    width: size,
    height: size,
    borderRadius: size / 2,
    borderWidth: onDark ? 2 : 0,
    borderColor: colors.white,
  };

  const content = uri ? (
    <Image source={{ uri }} style={imageStyle} />
  ) : (
    <View
      style={[
        styles.fallback,
        onDark ? styles.fallbackOnDark : styles.fallbackDefault,
        {
          width: size,
          height: size,
          borderRadius: size / 2,
        },
      ]}
    >
      <Text
        style={[
          styles.initial,
          onDark ? styles.initialOnDark : styles.initialDefault,
          { fontSize: size * 0.4 },
        ]}
      >
        {initial}
      </Text>
    </View>
  );

  if (onPress) {
    return (
      <Pressable onPress={onPress} style={({ pressed }) => pressed && styles.pressed}>
        {content}
      </Pressable>
    );
  }

  return content;
}

const styles = StyleSheet.create({
  fallback: {
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: colors.white,
  },
  fallbackDefault: {
    backgroundColor: colors.sage,
  },
  fallbackOnDark: {
    backgroundColor: colors.orange,
  },
  initial: {
    fontFamily: 'Outfit_700Bold',
  },
  initialDefault: {
    color: colors.white,
  },
  initialOnDark: {
    color: colors.white,
  },
  pressed: {
    opacity: 0.85,
  },
});
