import { useRouter } from 'expo-router';
import { useState } from 'react';
import { StyleSheet, Text, TextInput, View } from 'react-native';
import { Button } from '../src/components/Button';
import { Card } from '../src/components/Card';
import { ScreenHeader } from '../src/components/ScreenHeader';
import { Screen } from '../src/components/Screen';
import { signInWithEmail, signUpWithEmail, signOut, useAuth, manualSync } from '../src/features/auth';
import { hasSupabase } from '../src/lib/env';
import { useAppStore } from '../src/store/useAppStore';
import { colors } from '../src/theme/colors';
import { typography } from '../src/theme/typography';

export default function AccountScreen() {
  const router = useRouter();
  const { user, isSignedIn } = useAuth();
  const lastSyncedAt = useAppStore((s) => s.lastSyncedAt);

  const [mode, setMode] = useState<'signin' | 'signup'>('signin');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit() {
    if (!email.trim() || password.length < 6) {
      setError('Informe e-mail e senha (mínimo 6 caracteres).');
      return;
    }
    setBusy(true);
    setError(null);
    setMessage(null);
    try {
      if (mode === 'signin') {
        await signInWithEmail(email.trim(), password);
        setMessage('Login realizado. Sincronizando...');
      } else {
        await signUpWithEmail(email.trim(), password);
        setMessage('Conta criada! Confirme o e-mail se solicitado e faça login.');
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Não foi possível autenticar.');
    } finally {
      setBusy(false);
    }
  }

  async function handleManualSync() {
    if (!user) return;
    setBusy(true);
    setError(null);
    const result = await manualSync(user.id);
    setBusy(false);
    if (result.ok) {
      setMessage(`Sincronizado (${result.direction}) às ${new Date(result.updatedAt).toLocaleTimeString('pt-BR')}.`);
    } else {
      setError(result.error);
    }
  }

  if (!hasSupabase()) {
    return (
      <Screen>
        <ScreenHeader title="Conta" subtitle="Sincronização na nuvem" />
        <Card>
          <Text style={typography.body}>
            Supabase ainda não está configurado. Adicione `EXPO_PUBLIC_SUPABASE_URL` e
            `EXPO_PUBLIC_SUPABASE_ANON_KEY` no `.env` e execute o schema em `supabase/schema.sql`.
          </Text>
        </Card>
        <Button label="Voltar" onPress={() => router.back()} variant="outline" />
      </Screen>
    );
  }

  if (isSignedIn && user) {
    return (
      <Screen>
        <ScreenHeader title="Conta" subtitle="Seus dados na nuvem" />
        <Card>
          <Text style={typography.label}>E-mail</Text>
          <Text style={typography.subtitle}>{user.email}</Text>
          {lastSyncedAt ? (
            <Text style={[typography.caption, styles.syncHint]}>
              Última sync: {new Date(lastSyncedAt).toLocaleString('pt-BR')}
            </Text>
          ) : (
            <Text style={[typography.caption, styles.syncHint]}>Ainda não sincronizado.</Text>
          )}
        </Card>

        <Button
          label={busy ? 'Sincronizando...' : 'Sincronizar agora'}
          onPress={handleManualSync}
          disabled={busy}
        />
        {message ? <Text style={styles.success}>{message}</Text> : null}
        {error ? <Text style={styles.error}>{error}</Text> : null}

        <Button
          label="Voltar ao perfil"
          onPress={() => router.back()}
          variant="outline"
          style={{ marginTop: 10 }}
        />
        <Button
          label="Sair"
          onPress={() => signOut()}
          variant="outline"
          style={{ marginTop: 8 }}
        />
      </Screen>
    );
  }

  return (
    <Screen>
      <ScreenHeader title="Conta" subtitle="Entre para sincronizar entre dispositivos" />

      <Card>
        <View style={styles.modeRow}>
          <Button
            label="Entrar"
            onPress={() => setMode('signin')}
            variant={mode === 'signin' ? 'primary' : 'outline'}
            style={styles.modeBtn}
          />
          <Button
            label="Criar conta"
            onPress={() => setMode('signup')}
            variant={mode === 'signup' ? 'primary' : 'outline'}
            style={styles.modeBtn}
          />
        </View>

        <Text style={[typography.label, styles.field]}>E-mail</Text>
        <TextInput
          style={styles.input}
          autoCapitalize="none"
          keyboardType="email-address"
          value={email}
          onChangeText={setEmail}
          placeholder="voce@email.com"
          placeholderTextColor={colors.textMuted}
        />

        <Text style={[typography.label, styles.field]}>Senha</Text>
        <TextInput
          style={styles.input}
          secureTextEntry
          value={password}
          onChangeText={setPassword}
          placeholder="Mínimo 6 caracteres"
          placeholderTextColor={colors.textMuted}
        />

        <Button
          label={busy ? 'Aguarde...' : mode === 'signin' ? 'Entrar' : 'Criar conta'}
          onPress={handleSubmit}
          disabled={busy}
          style={{ marginTop: 12 }}
        />

        {message ? <Text style={styles.success}>{message}</Text> : null}
        {error ? <Text style={styles.error}>{error}</Text> : null}
      </Card>

      <Card style={styles.disclaimer}>
        <Text style={typography.caption}>
          Seus dados locais serão enviados para a nuvem no primeiro login. Depois, o app
          sincroniza automaticamente quando você edita refeições, plano ou lista.
        </Text>
      </Card>

      <Button label="Voltar" onPress={() => router.back()} variant="outline" />
    </Screen>
  );
}

const styles = StyleSheet.create({
  modeRow: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 8,
  },
  modeBtn: {
    flex: 1,
    paddingVertical: 10,
  },
  field: {
    marginTop: 12,
  },
  input: {
    fontFamily: 'Outfit_400Regular',
    fontSize: 15,
    color: colors.text,
    backgroundColor: colors.cream,
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 12,
    marginTop: 8,
  },
  syncHint: {
    marginTop: 8,
  },
  success: {
    fontFamily: 'Outfit_400Regular',
    fontSize: 13,
    color: colors.success,
    marginTop: 10,
    textAlign: 'center',
  },
  error: {
    fontFamily: 'Outfit_400Regular',
    fontSize: 13,
    color: colors.orange,
    marginTop: 10,
    textAlign: 'center',
  },
  disclaimer: {
    backgroundColor: colors.cream,
  },
});
