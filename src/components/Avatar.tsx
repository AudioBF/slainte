import { Image } from 'expo-image';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { colors } from '../theme/colors';

type Props = {
  uri: string | null;
  name?: string;
  size?: number;
  onPress?: () => void;
};

export function Avatar({ uri, name, size = 44, onPress }: Props) {
  const initial = name?.trim().charAt(0).toUpperCase() || '?';

  const content = uri ? (
    <Image source={{ uri }} style={{ width: size, height: size, borderRadius: size / 2 }} />
  ) : (
    <View style={[styles.fallback, { width: size, height: size, borderRadius: size / 2 }]}>
      <Text style={[styles.initial, { fontSize: size * 0.4 }]}>{initial}</Text>
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
    backgroundColor: colors.sage,
    alignItems: 'center',
    justifyContent: 'center',
  },
  initial: {
    fontFamily: 'Outfit_600SemiBold',
    color: colors.white,
  },
  pressed: {
    opacity: 0.85,
  },
});
