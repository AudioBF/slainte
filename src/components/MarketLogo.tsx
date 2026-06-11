import { StyleSheet, Text, View } from 'react-native';
import type { Market } from '../types';
import { colors } from '../theme/colors';
import { radius } from '../theme/tokens';

const MARKET_INITIALS: Record<string, string> = {
  lidl: 'Li',
  aldi: 'A',
  tesco: 'T',
  dunnes: 'D',
  supervalu: 'SV',
  centra: 'C',
  ms: 'M&S',
};

type Props = {
  market: Pick<Market, 'id' | 'name' | 'color'>;
  size?: number;
};

export function MarketLogo({ market, size = 44 }: Props) {
  const initials = MARKET_INITIALS[market.id] ?? market.name.slice(0, 2).toUpperCase();
  const fontSize = initials.length > 2 ? size * 0.28 : size * 0.38;

  return (
    <View
      style={[
        styles.wrap,
        {
          width: size,
          height: size,
          borderRadius: radius.md,
          backgroundColor: market.color,
        },
      ]}
    >
      <Text style={[styles.text, { fontSize }]}>{initials}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: colors.forest,
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.12,
    shadowRadius: 3,
    elevation: 2,
  },
  text: {
    fontFamily: 'Outfit_600SemiBold',
    color: colors.white,
    letterSpacing: -0.5,
  },
});
