import { Linking, Pressable, StyleSheet, Text, View } from 'react-native';
import { Card } from '../../src/components/Card';
import { EmptyState } from '../../src/components/EmptyState';
import { Header } from '../../src/components/Header';
import { Screen } from '../../src/components/Screen';
import { useAppStore } from '../../src/store/useAppStore';
import { colors } from '../../src/theme/colors';
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
      <Header
        title="Mercados"
        subtitle="Supermercados de Dublin — encontre o mais próximo"
        dark
      />

      <Text style={[typography.body, styles.intro]}>
        Referência rápida dos principais mercados irlandeses. Toque para abrir no mapa.
      </Text>

      {markets.length === 0 ? (
        <Card>
          <EmptyState
            title="Nenhum mercado cadastrado"
            message="A lista de mercados será carregada em breve."
          />
        </Card>
      ) : (
        markets.map((market) => (
          <Pressable key={market.id} onPress={() => openNearestStore(market.searchQuery)}>
            <Card>
              <View style={styles.row}>
                <View style={[styles.dot, { backgroundColor: market.color }]} />
                <View style={{ flex: 1 }}>
                  <Text style={typography.subtitle}>{market.name}</Text>
                  <Text style={typography.caption}>Encontrar loja mais próxima</Text>
                </View>
                <Text style={styles.arrow}>→</Text>
              </View>
            </Card>
          </Pressable>
        ))
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
  intro: {
    marginBottom: 16,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
  },
  dot: {
    width: 12,
    height: 12,
    borderRadius: 6,
  },
  arrow: {
    fontSize: 20,
    color: colors.sage,
  },
  tip: {
    backgroundColor: colors.cream,
    marginTop: 8,
  },
});
