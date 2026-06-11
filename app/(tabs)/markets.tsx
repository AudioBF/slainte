import { Linking, StyleSheet, Text, View } from 'react-native';
import { Card } from '../../src/components/Card';
import { EmptyState } from '../../src/components/EmptyState';
import { ListRow } from '../../src/components/ListRow';
import { MarketLogo } from '../../src/components/MarketLogo';
import { ScreenHeader } from '../../src/components/ScreenHeader';
import { Screen } from '../../src/components/Screen';
import { Section } from '../../src/components/Section';
import { useAppStore } from '../../src/store/useAppStore';
import { colors } from '../../src/theme/colors';
import { spacing } from '../../src/theme/tokens';
import { typography } from '../../src/theme/typography';

async function openNearestStore(query: string) {
  const url = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(query)}`;
  try {
    const supported = await Linking.canOpenURL(url);
    if (!supported) {
      throw new Error('Maps indisponível');
    }
    await Linking.openURL(url);
  } catch {
    if (typeof window !== 'undefined') {
      window.open(url, '_blank');
    }
  }
}

export default function MarketsScreen() {
  const markets = useAppStore((s) => s.markets);

  return (
    <Screen>
      <ScreenHeader
        title="Mercados"
        subtitle="Supermercados de Dublin — encontre o mais próximo"
      />

      {markets.length === 0 ? (
        <Card>
          <EmptyState
            title="Nenhum mercado cadastrado"
            message="A lista de mercados será carregada em breve."
          />
        </Card>
      ) : (
        <>
          <Section
            title="Redes na região"
            subtitle="Toque para abrir a loja mais próxima no Google Maps"
          />
          <Card flat>
            {markets.map((market, index) => (
              <View
                key={market.id}
                style={index < markets.length - 1 ? styles.listDivider : undefined}
              >
                <ListRow
                  leading={<MarketLogo market={market} />}
                  title={market.name}
                  subtitle="Encontrar loja mais próxima"
                  onPress={() => openNearestStore(market.searchQuery)}
                />
              </View>
            ))}
          </Card>
        </>
      )}

      <Card style={styles.tip}>
        <Text style={typography.caption}>
          Dica: gere sua lista de compras na aba Compras antes de ir ao mercado.
        </Text>
      </Card>
    </Screen>
  );
}

const styles = StyleSheet.create({
  listDivider: {
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.border,
    marginBottom: spacing.sm,
    paddingBottom: spacing.sm,
  },
  tip: {
    backgroundColor: colors.cream,
    marginTop: spacing.md,
  },
});
