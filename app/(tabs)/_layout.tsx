import { Redirect, Tabs } from 'expo-router';
import { ActivityIndicator, StyleSheet, View } from 'react-native';
import {
  DietIcon,
  MarketsIcon,
  MealIcon,
  ShoppingIcon,
  TodayIcon,
} from '../../src/components/TabIcons';
import { useAppStore, useStoreHydrated } from '../../src/store/useAppStore';
import { colors } from '../../src/theme/colors';

export default function TabLayout() {
  const hydrated = useStoreHydrated();
  const onboardingComplete = useAppStore((s) => s.profile.onboardingComplete);

  if (!hydrated) {
    return (
      <View style={styles.loading}>
        <ActivityIndicator color={colors.forest} size="large" />
      </View>
    );
  }
  if (!onboardingComplete) return <Redirect href="/onboarding" />;

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: colors.forest,
        tabBarInactiveTintColor: colors.textMuted,
        tabBarStyle: styles.tabBar,
        tabBarLabelStyle: styles.tabLabel,
        tabBarItemStyle: styles.tabItem,
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: 'Hoje',
          tabBarIcon: ({ color }) => <TodayIcon color={color} />,
        }}
      />
      <Tabs.Screen
        name="meal"
        options={{
          title: 'Refeição',
          tabBarIcon: ({ color }) => <MealIcon color={color} />,
        }}
      />
      <Tabs.Screen
        name="diet"
        options={{
          title: 'Dieta',
          tabBarIcon: ({ color }) => <DietIcon color={color} />,
        }}
      />
      <Tabs.Screen
        name="shopping"
        options={{
          title: 'Compras',
          tabBarIcon: ({ color }) => <ShoppingIcon color={color} />,
        }}
      />
      <Tabs.Screen
        name="markets"
        options={{
          title: 'Mercados',
          tabBarIcon: ({ color }) => <MarketsIcon color={color} />,
        }}
      />
    </Tabs>
  );
}

const styles = StyleSheet.create({
  loading: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.cream,
  },
  tabBar: {
    backgroundColor: colors.white,
    borderTopColor: colors.border,
    borderTopWidth: StyleSheet.hairlineWidth,
    height: 64,
    paddingBottom: 8,
    paddingTop: 4,
    shadowColor: colors.forest,
    shadowOffset: { width: 0, height: -2 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 8,
  },
  tabLabel: {
    fontFamily: 'Outfit_500Medium',
    fontSize: 11,
  },
  tabItem: {
    minHeight: 48,
  },
});
