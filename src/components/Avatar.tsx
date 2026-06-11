import { Image } from 'expo-image';
import { useState } from 'react';
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
  const [imgFailed, setImgFailed] = useState(false);
  const initial = name?.trim().charAt(0).toUpperCase() || '?';
  const onDark = variant === 'onDark';
  const hasPhoto = Boolean(uri?.trim()) && !imgFailed;

  const content = hasPhoto ? (
    <Image
      source={{ uri: uri! }}
      style={{
        width: size,
        height: size,
        borderRadius: size / 2,
      }}
      onError={() => setImgFailed(true)}
    />
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
          { fontSize: Math.round(size * 0.42) },
        ]}
      >
        {initial}
      </Text>
    </View>
  );

  const wrapped = (
    <View
      style={[
        styles.ring,
        onDark && styles.ringOnDark,
        { width: size + 4, height: size + 4, borderRadius: (size + 4) / 2 },
      ]}
    >
      {content}
    </View>
  );

  if (onPress) {
    return (
      <Pressable onPress={onPress} style={({ pressed }) => pressed && styles.pressed}>
        {wrapped}
      </Pressable>
    );
  }

  return wrapped;
}

const styles = StyleSheet.create({
  ring: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  ringOnDark: {
    borderWidth: 2,
    borderColor: colors.white,
    backgroundColor: colors.orange,
  },
  fallback: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  fallbackDefault: {
    backgroundColor: colors.sage,
  },
  fallbackOnDark: {
    backgroundColor: colors.orange,
  },
  initial: {
    fontFamily: 'Outfit_600SemiBold',
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
