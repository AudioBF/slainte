import { Image } from 'expo-image';
import { useEffect, useState } from 'react';
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
  const [imgLoaded, setImgLoaded] = useState(false);
  const [imgFailed, setImgFailed] = useState(false);
  const initial = name?.trim().charAt(0).toUpperCase() || '?';
  const onDark = variant === 'onDark';
  const trimmedUri = uri?.trim() ?? '';
  const hasUri = Boolean(trimmedUri);

  useEffect(() => {
    setImgLoaded(false);
    setImgFailed(false);
  }, [trimmedUri]);

  const showPhoto = hasUri && !imgFailed;

  const photoShellStyle = {
    width: size,
    height: size,
    borderRadius: size / 2,
  };

  const content = showPhoto ? (
    <View style={[styles.photoShell, photoShellStyle, onDark ? styles.photoShellOnDark : styles.photoShellDefault]}>
      {!imgLoaded ? (
        <View style={[StyleSheet.absoluteFill, styles.loadingPlaceholder, onDark && styles.loadingOnDark]} />
      ) : null}
      <Image
        source={{ uri: trimmedUri }}
        contentFit="cover"
        transition={0}
        style={[photoShellStyle, !imgLoaded && styles.imageHidden]}
        onLoad={() => setImgLoaded(true)}
        onError={() => setImgFailed(true)}
      />
    </View>
  ) : (
    <View
      style={[
        styles.fallback,
        onDark ? styles.fallbackOnDark : styles.fallbackDefault,
        photoShellStyle,
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
        onDark ? styles.ringOnDark : styles.ringDefault,
        showPhoto && onDark && styles.ringOnDarkPhoto,
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
  ringDefault: {
    backgroundColor: 'transparent',
  },
  ringOnDark: {
    borderWidth: 2,
    borderColor: colors.white,
    backgroundColor: colors.sage,
  },
  ringOnDarkPhoto: {
    backgroundColor: colors.sage,
  },
  photoShell: {
    overflow: 'hidden',
    alignItems: 'center',
    justifyContent: 'center',
  },
  photoShellDefault: {
    backgroundColor: colors.cream,
  },
  photoShellOnDark: {
    backgroundColor: colors.sage,
  },
  loadingPlaceholder: {
    backgroundColor: colors.cream,
  },
  loadingOnDark: {
    backgroundColor: colors.sage,
  },
  imageHidden: {
    opacity: 0,
  },
  fallback: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  fallbackDefault: {
    backgroundColor: colors.sage,
  },
  fallbackOnDark: {
    backgroundColor: colors.sage,
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
