import { TextStyle } from 'react-native';
import { colors } from './colors';

export const typography = {
  display: {
    fontFamily: 'Fraunces_700Bold',
    fontSize: 28,
    color: colors.text,
  } satisfies TextStyle,
  title: {
    fontFamily: 'Fraunces_600SemiBold',
    fontSize: 22,
    color: colors.text,
  } satisfies TextStyle,
  subtitle: {
    fontFamily: 'Outfit_600SemiBold',
    fontSize: 16,
    color: colors.text,
  } satisfies TextStyle,
  body: {
    fontFamily: 'Outfit_400Regular',
    fontSize: 15,
    color: colors.text,
    lineHeight: 22,
  } satisfies TextStyle,
  caption: {
    fontFamily: 'Outfit_400Regular',
    fontSize: 13,
    color: colors.textMuted,
    lineHeight: 18,
  } satisfies TextStyle,
  label: {
    fontFamily: 'Outfit_500Medium',
    fontSize: 12,
    color: colors.textMuted,
    letterSpacing: 0.5,
    textTransform: 'uppercase' as const,
  },
};
