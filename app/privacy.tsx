import { useRouter } from 'expo-router';
import { StyleSheet, Text, View } from 'react-native';
import { Button } from '../src/components/Button';
import { ScreenHeader } from '../src/components/ScreenHeader';
import { Screen } from '../src/components/Screen';
import { colors } from '../src/theme/colors';
import { typography } from '../src/theme/typography';

const SECTIONS = [
  {
    title: 'O que coletamos',
    body:
      'Nome, foto de perfil, metas nutricionais, restrições alimentares, refeições registradas, fotos de pratos que você envia para análise, cardápios e listas de compras.',
  },
  {
    title: 'Como usamos',
    body:
      'Para calcular macros, gerar cardápios personalizados e sincronizar seus dados entre dispositivos quando você entra com conta. Fotos são enviadas ao Google Gemini apenas para estimar nutrientes — não são usadas para treinar modelos públicos.',
  },
  {
    title: 'Onde ficam os dados',
    body:
      'Localmente no seu dispositivo (navegador ou app) e, se você criar conta, na nuvem Supabase vinculada ao seu e-mail. Cada usuário vê apenas os próprios dados.',
  },
  {
    title: 'Aviso de saúde',
    body:
      'O Sláinte fornece estimativas educacionais. Não substitui acompanhamento médico ou nutricional. Consulte um profissional para condições clínicas.',
  },
  {
    title: 'Seus direitos',
    body:
      'Você pode editar ou apagar dados no app, sair da conta ou pedir exclusão entrando em contato com quem administra o projeto.',
  },
] as const;

export default function PrivacyScreen() {
  const router = useRouter();

  return (
    <Screen>
      <ScreenHeader title="Privacidade" subtitle="Como tratamos seus dados" />

      {SECTIONS.map((section) => (
        <View key={section.title} style={styles.section}>
          <Text style={typography.subtitle}>{section.title}</Text>
          <Text style={[typography.body, styles.body]}>{section.body}</Text>
        </View>
      ))}

      <Text style={[typography.caption, styles.updated]}>
        Última atualização: junho de 2026 · Sláinte
      </Text>

      <Button label="Voltar" onPress={() => router.back()} variant="outline" style={styles.back} />
    </Screen>
  );
}

const styles = StyleSheet.create({
  section: {
    marginBottom: 20,
  },
  body: {
    marginTop: 6,
    color: colors.text,
  },
  updated: {
    textAlign: 'center',
    marginTop: 8,
    marginBottom: 16,
  },
  back: {
    marginTop: 4,
  },
});
