import * as ImagePicker from 'expo-image-picker';
import { Image } from 'expo-image';
import { useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import {
  Alert,
  Image as RNImage,
  Modal,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Avatar } from '../src/components/Avatar';
import { Button } from '../src/components/Button';
import { Card } from '../src/components/Card';
import { GoalPicker, type GoalOption } from '../src/components/GoalPicker';
import { InputField } from '../src/components/InputField';
import { Screen } from '../src/components/Screen';
import { ScreenHeader } from '../src/components/ScreenHeader';
import { Section } from '../src/components/Section';
import { signOut, useAuth } from '../src/features/auth';
import { DEFAULT_DAILY_GOALS, type ProfileGoal } from '../src/features/profile';
import { hasSupabase } from '../src/lib/env';
import { useAppStore } from '../src/store/useAppStore';
import { colors } from '../src/theme/colors';
import { elevation, radius, spacing } from '../src/theme/tokens';
import { typography } from '../src/theme/typography';

const GOAL_OPTIONS: GoalOption[] = [
  { value: 'lose', label: 'Emagrecimento', description: 'Déficit calórico moderado' },
  { value: 'maintain', label: 'Manutenção', description: 'Manter o peso atual' },
  { value: 'gain', label: 'Hipertrofia', description: 'Ganho de massa muscular' },
];

type MacroField = 'calories' | 'protein' | 'carbs' | 'fat';

const MACRO_FIELDS: {
  key: MacroField;
  label: string;
  a11yLabel: string;
  unit: string;
  color: string;
}[] = [
  { key: 'calories', label: 'Calorias', a11yLabel: 'Calorias', unit: 'kcal', color: colors.forest },
  { key: 'protein', label: 'Proteína', a11yLabel: 'Proteína', unit: 'g', color: colors.protein },
  { key: 'carbs', label: 'Carbs', a11yLabel: 'Carboidrato', unit: 'g', color: colors.carbs },
  { key: 'fat', label: 'Gordura', a11yLabel: 'Gordura', unit: 'g', color: colors.fat },
];

const MORE_OPTIONS = [
  { key: 'onboarding', label: 'Rever introdução' },
  { key: 'privacy', label: 'Privacidade e dados' },
  { key: 'back', label: 'Voltar' },
] as const;

const SAVED_FEEDBACK_MS = 2500;
const PREVIEW_FRAME = 240;
const PREVIEW_EXPORT = 512;
const PREVIEW_MIN_SCALE = 1;
const PREVIEW_MAX_SCALE = 3;
const PREVIEW_NUDGE = 14;

type PreviewTransform = {
  scale: number;
  offsetX: number;
  offsetY: number;
};

type ImageDimensions = {
  width: number;
  height: number;
};

type AvatarCropLayout = {
  width: number;
  height: number;
  left: number;
  top: number;
};

const DEFAULT_PREVIEW_TRANSFORM: PreviewTransform = {
  scale: 1,
  offsetX: 0,
  offsetY: 0,
};

function computeAvatarCropLayout(
  imageWidth: number,
  imageHeight: number,
  transform: PreviewTransform,
  frameSize: number,
): AvatarCropLayout {
  const cover = Math.max(frameSize / imageWidth, frameSize / imageHeight);
  const drawScale = cover * transform.scale;
  const width = imageWidth * drawScale;
  const height = imageHeight * drawScale;
  const left = frameSize / 2 - width / 2 + transform.offsetX;
  const top = frameSize / 2 - height / 2 + transform.offsetY;
  return { width, height, left, top };
}

function loadImageDimensions(uri: string): Promise<ImageDimensions> {
  if (Platform.OS === 'web') {
    return new Promise((resolve, reject) => {
      const img = document.createElement('img');
      img.onload = () => resolve({ width: img.naturalWidth, height: img.naturalHeight });
      img.onerror = () => reject(new Error('Failed to load image'));
      img.src = uri;
    });
  }

  return new Promise((resolve, reject) => {
    RNImage.getSize(
      uri,
      (width, height) => resolve({ width, height }),
      (error) => reject(error),
    );
  });
}

async function exportCroppedAvatarUri(
  uri: string,
  transform: PreviewTransform,
  imageSize: ImageDimensions,
): Promise<string> {
  if (Platform.OS !== 'web') {
    return uri;
  }

  return new Promise((resolve, reject) => {
    const img = document.createElement('img');
    img.onload = () => {
      try {
        const canvas = document.createElement('canvas');
        canvas.width = PREVIEW_EXPORT;
        canvas.height = PREVIEW_EXPORT;
        const ctx = canvas.getContext('2d');
        if (!ctx) {
          reject(new Error('Canvas unavailable'));
          return;
        }

        const layout = computeAvatarCropLayout(
          img.naturalWidth,
          img.naturalHeight,
          transform,
          PREVIEW_FRAME,
        );
        const ratio = PREVIEW_EXPORT / PREVIEW_FRAME;

        ctx.fillStyle = colors.cream;
        ctx.fillRect(0, 0, PREVIEW_EXPORT, PREVIEW_EXPORT);
        ctx.drawImage(
          img,
          layout.left * ratio,
          layout.top * ratio,
          layout.width * ratio,
          layout.height * ratio,
        );
        resolve(canvas.toDataURL('image/jpeg', 0.88));
      } catch (error) {
        reject(error);
      }
    };
    img.onerror = () => reject(new Error('Failed to load image'));
    img.src = uri;
  });
}

export default function ProfileScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { isSignedIn, user, configured } = useAuth();
  const profile = useAppStore((s) => s.profile);
  const lastSyncedAt = useAppStore((s) => s.lastSyncedAt);
  const updateProfile = useAppStore((s) => s.updateProfile);
  const resetOnboarding = useAppStore((s) => s.resetOnboarding);

  const [name, setName] = useState(profile.displayName);
  const [goal, setGoal] = useState<ProfileGoal>(profile.goal);
  const [restrictions, setRestrictions] = useState(profile.restrictions);
  const [dailyGoals, setDailyGoals] = useState({ ...profile.dailyGoals });
  const [saved, setSaved] = useState(false);
  const [pickingPhoto, setPickingPhoto] = useState(false);
  const [draftAvatarUri, setDraftAvatarUri] = useState<string | null>(profile.avatarUri);
  const [pendingAvatarUri, setPendingAvatarUri] = useState<string | null>(null);
  const [pendingImageSize, setPendingImageSize] = useState<ImageDimensions | null>(null);
  const [previewVisible, setPreviewVisible] = useState(false);
  const [previewTransform, setPreviewTransform] = useState<PreviewTransform>(DEFAULT_PREVIEW_TRANSFORM);
  const [confirmingAvatar, setConfirmingAvatar] = useState(false);
  const [viewAvatarVisible, setViewAvatarVisible] = useState(false);

  useEffect(() => {
    if (!saved) return;
    const timer = setTimeout(() => setSaved(false), SAVED_FEEDBACK_MS);
    return () => clearTimeout(timer);
  }, [saved]);

  async function pickImageFromGallery(): Promise<string | null> {
    if (Platform.OS !== 'web') {
      const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (!perm.granted) {
        Alert.alert(
          'Galeria necessária',
          'Permita o acesso às fotos nas configurações do dispositivo para alterar sua foto de perfil.',
        );
        return null;
      }
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      quality: 0.7,
      allowsEditing: Platform.OS !== 'web',
      aspect: [1, 1],
    });

    if (result.canceled || !result.assets[0]) return null;
    return result.assets[0].uri;
  }

  async function openPreview(uri: string) {
    setPendingAvatarUri(uri);
    setPendingImageSize(null);
    setPreviewTransform(DEFAULT_PREVIEW_TRANSFORM);
    setPreviewVisible(true);
    try {
      const size = await loadImageDimensions(uri);
      setPendingImageSize(size);
    } catch {
      Alert.alert('Não foi possível abrir a foto', 'Tente escolher outra imagem.');
      setPreviewVisible(false);
      setPendingAvatarUri(null);
    }
  }

  async function pickAvatar() {
    if (pickingPhoto || confirmingAvatar) return;
    setPickingPhoto(true);
    try {
      const uri = await pickImageFromGallery();
      if (uri) openPreview(uri);
    } finally {
      setPickingPhoto(false);
    }
  }

  function handleViewAvatar() {
    setViewAvatarVisible(true);
  }

  function handleEditAvatar() {
    setViewAvatarVisible(false);
    void pickAvatar();
  }

  async function replacePendingPhoto() {
    if (pickingPhoto || confirmingAvatar) return;
    setPickingPhoto(true);
    try {
      const uri = await pickImageFromGallery();
      if (uri) {
        setPendingAvatarUri(uri);
        setPendingImageSize(null);
        setPreviewTransform(DEFAULT_PREVIEW_TRANSFORM);
        try {
          const size = await loadImageDimensions(uri);
          setPendingImageSize(size);
        } catch {
          Alert.alert('Não foi possível abrir a foto', 'Tente escolher outra imagem.');
        }
      }
    } finally {
      setPickingPhoto(false);
    }
  }

  function cancelAvatarPreview() {
    setPreviewVisible(false);
    setPendingAvatarUri(null);
    setPendingImageSize(null);
    setPreviewTransform(DEFAULT_PREVIEW_TRANSFORM);
  }

  async function confirmAvatarPreview() {
    if (!pendingAvatarUri || confirmingAvatar) return;
    if (Platform.OS === 'web' && !pendingImageSize) return;

    setConfirmingAvatar(true);
    try {
      const finalUri = await exportCroppedAvatarUri(
        pendingAvatarUri,
        previewTransform,
        pendingImageSize ?? { width: PREVIEW_FRAME, height: PREVIEW_FRAME },
      );
      setDraftAvatarUri(finalUri);
      setPreviewVisible(false);
      setPendingAvatarUri(null);
      setPendingImageSize(null);
      setPreviewTransform(DEFAULT_PREVIEW_TRANSFORM);
      setSaved(false);
    } catch {
      Alert.alert('Não foi possível processar a foto', 'Tente outra imagem ou ajuste novamente.');
    } finally {
      setConfirmingAvatar(false);
    }
  }

  function nudgePreview(dx: number, dy: number) {
    setPreviewTransform((prev) => ({
      ...prev,
      offsetX: prev.offsetX + dx,
      offsetY: prev.offsetY + dy,
    }));
  }

  function zoomPreview(delta: number) {
    setPreviewTransform((prev) => ({
      ...prev,
      scale: Math.min(PREVIEW_MAX_SCALE, Math.max(PREVIEW_MIN_SCALE, prev.scale + delta)),
    }));
  }

  function setMacro(key: MacroField, text: string) {
    const value = parseInt(text, 10);
    setDailyGoals((prev) => ({ ...prev, [key]: isNaN(value) ? 0 : value }));
    setSaved(false);
  }

  function applyGoalDefaults() {
    setDailyGoals({ ...DEFAULT_DAILY_GOALS[goal] });
    setSaved(false);
  }

  function handleSave() {
    updateProfile({
      displayName: name.trim() || profile.displayName,
      goal,
      restrictions: restrictions.trim(),
      dailyGoals,
      avatarUri: draftAvatarUri,
    });
    setSaved(true);
  }

  function handleRedoOnboarding() {
    resetOnboarding();
    router.replace('/onboarding');
  }

  function handleReturnHome() {
    router.replace('/(tabs)');
  }

  function handleMoreOption(key: (typeof MORE_OPTIONS)[number]['key']) {
    if (key === 'onboarding') handleRedoOnboarding();
    else if (key === 'privacy') router.push('/privacy');
    else handleReturnHome();
  }

  return (
    <View style={styles.root}>
      <Screen>
        <ScreenHeader title="Perfil" subtitle="Seus dados e metas" />

        <Section title="Identidade">
          <Card flat style={styles.profileCard}>
            <View style={styles.avatarRow}>
              <Avatar
                uri={draftAvatarUri}
                name={profile.displayName}
                size={72}
                onPress={handleViewAvatar}
              />
              <View style={styles.avatarMeta}>
                <Text style={typography.subtitle}>{profile.displayName || 'Sem nome'}</Text>
                <Pressable
                  onPress={handleEditAvatar}
                  disabled={pickingPhoto}
                  hitSlop={8}
                  accessibilityRole="button"
                  accessibilityLabel="Editar foto de perfil"
                >
                  <Text style={styles.changePhoto}>
                    {pickingPhoto ? 'Abrindo galeria…' : 'Editar foto'}
                  </Text>
                </Pressable>
              </View>
            </View>
            <InputField
              label="Nome"
              value={name}
              onChangeText={(t) => {
                setName(t);
                setSaved(false);
              }}
              placeholder="Seu nome"
            />
          </Card>
        </Section>

        <Section title="Objetivo e metas">
          <Card flat style={styles.profileCard}>
            <Text style={typography.label}>Objetivo</Text>
            <GoalPicker
              options={GOAL_OPTIONS}
              value={goal}
              onChange={(g) => {
                setGoal(g);
                setSaved(false);
              }}
            />

            <View style={styles.macroDivider} />
            <Text style={typography.label}>Metas diárias</Text>
            <View style={styles.macroGrid}>
              {MACRO_FIELDS.map((field) => (
                <View key={field.key} style={styles.macroBlock}>
                  <Text style={[styles.macroBlockLabel, { color: field.color }]}>{field.label}</Text>
                  <View style={styles.macroBlockRow}>
                    <TextInput
                      style={styles.macroBlockInput}
                      keyboardType="numeric"
                      value={String(dailyGoals[field.key])}
                      onChangeText={(t) => setMacro(field.key, t)}
                      accessibilityLabel={`${field.a11yLabel}, ${dailyGoals[field.key]} ${field.unit}`}
                    />
                    <Text
                      style={[
                        styles.macroBlockUnit,
                        field.unit === 'kcal' ? styles.macroBlockUnitKcal : styles.macroBlockUnitG,
                      ]}
                    >
                      {field.unit}
                    </Text>
                  </View>
                </View>
              ))}
            </View>
            <Pressable
              onPress={applyGoalDefaults}
              style={styles.defaultsLink}
              accessibilityRole="button"
            >
              <Text style={styles.defaultsLinkText}>Aplicar metas padrão do objetivo</Text>
            </Pressable>
          </Card>
        </Section>

        <Section title="Preferências alimentares">
          <Card flat style={styles.profileCard}>
            <InputField
              label="Restrições"
              multiline
              numberOfLines={3}
              value={restrictions}
              onChangeText={(t) => {
                setRestrictions(t);
                setSaved(false);
              }}
              placeholder="Diabetes, sem glúten, intolerâncias..."
            />
          </Card>
        </Section>

        <Section title="Conta e nuvem">
          <Card flat style={styles.profileCard}>
            {!configured ? (
              <Text style={typography.caption}>
                Supabase não configurado — dados ficam só neste dispositivo.
              </Text>
            ) : isSignedIn ? (
              <>
                <Text style={typography.subtitle}>{user?.email}</Text>
                <Text style={[typography.caption, styles.cloudHint]}>
                  {lastSyncedAt
                    ? `Sync: ${new Date(lastSyncedAt).toLocaleString('pt-BR')}`
                    : 'Aguardando primeira sincronização...'}
                </Text>
                <View style={styles.inlineActions}>
                  <Pressable
                    onPress={() => router.push('/account')}
                    style={styles.inlineActionRow}
                    accessibilityRole="button"
                  >
                    <Text style={styles.inlineActionLabel}>Gerenciar conta</Text>
                    <Text style={styles.optionChevron}>›</Text>
                  </Pressable>
                  <Pressable
                    onPress={() => signOut()}
                    style={[styles.inlineActionRow, styles.inlineActionRowLast]}
                    accessibilityRole="button"
                  >
                    <Text style={[styles.inlineActionLabel, styles.signOutLabel]}>Sair</Text>
                    <Text style={styles.optionChevron}>›</Text>
                  </Pressable>
                </View>
              </>
            ) : (
              <>
                <Text style={typography.caption}>
                  Entre para sincronizar cardápio, refeições e lista entre dispositivos.
                </Text>
                <Button
                  label="Entrar / Criar conta"
                  onPress={() => router.push('/account')}
                  style={{ marginTop: spacing.md }}
                />
              </>
            )}
          </Card>
        </Section>

        <Section title="Mais opções">
          <Card flat style={styles.optionsCard}>
            {MORE_OPTIONS.map((opt, index) => (
              <Pressable
                key={opt.key}
                onPress={() => handleMoreOption(opt.key)}
                style={[
                  styles.optionRow,
                  index < MORE_OPTIONS.length - 1 && styles.optionRowBorder,
                ]}
                accessibilityRole="button"
                accessibilityLabel={opt.key === 'back' ? 'Voltar para Hoje' : opt.label}
              >
                <Text style={styles.optionLabel}>{opt.label}</Text>
                <Text style={styles.optionChevron}>›</Text>
              </Pressable>
            ))}
          </Card>
        </Section>
      </Screen>

      <View
        style={[styles.saveBar, { paddingBottom: Math.max(insets.bottom, spacing.md) }]}
        pointerEvents="box-none"
      >
        <Button
          label={saved ? 'Salvo ✓' : 'Salvar alterações'}
          onPress={handleSave}
          style={styles.saveBarBtn}
        />
      </View>

      <AvatarViewerModal
        visible={viewAvatarVisible}
        uri={draftAvatarUri}
        name={profile.displayName}
        onClose={() => setViewAvatarVisible(false)}
        onEdit={handleEditAvatar}
      />

      <AvatarPreviewModal
        visible={previewVisible}
        uri={pendingAvatarUri}
        imageSize={pendingImageSize}
        transform={previewTransform}
        pickingPhoto={pickingPhoto}
        confirmingAvatar={confirmingAvatar}
        onCancel={cancelAvatarPreview}
        onReplace={replacePendingPhoto}
        onConfirm={confirmAvatarPreview}
        onNudge={nudgePreview}
        onZoom={zoomPreview}
        onReset={() => setPreviewTransform(DEFAULT_PREVIEW_TRANSFORM)}
      />
    </View>
  );
}

type AvatarViewerModalProps = {
  visible: boolean;
  uri: string | null;
  name?: string;
  onClose: () => void;
  onEdit: () => void;
};

const VIEWER_FRAME = 280;

function AvatarViewerModal({ visible, uri, name, onClose, onEdit }: AvatarViewerModalProps) {
  const hasPhoto = Boolean(uri?.trim());
  const initial = name?.trim().charAt(0).toUpperCase() || '?';

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <Pressable style={viewerStyles.backdrop} onPress={onClose}>
        <View style={viewerStyles.sheet} onStartShouldSetResponder={() => true}>
          <Text style={viewerStyles.title}>Foto de perfil</Text>

          <View style={viewerStyles.frame}>
            {hasPhoto ? (
              <Image source={{ uri: uri! }} style={viewerStyles.photo} contentFit="cover" />
            ) : (
              <View style={viewerStyles.fallback}>
                <Text style={viewerStyles.initial}>{initial}</Text>
              </View>
            )}
          </View>

          {!hasPhoto ? (
            <Text style={viewerStyles.emptyHint}>Você ainda não adicionou uma foto.</Text>
          ) : null}

          <View style={viewerStyles.actions}>
            <Button label="Fechar" onPress={onClose} variant="outline" />
            <Button label="Editar foto" onPress={onEdit} />
          </View>
        </View>
      </Pressable>
    </Modal>
  );
}

const viewerStyles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(27, 67, 50, 0.55)',
    justifyContent: 'center',
    padding: spacing.xl,
  },
  sheet: {
    width: '100%',
    maxWidth: 360,
    alignSelf: 'center',
    backgroundColor: colors.white,
    borderRadius: radius.xl,
    padding: spacing.lg,
    gap: spacing.md,
  },
  title: {
    fontFamily: 'Fraunces_700Bold',
    fontSize: 22,
    color: colors.forest,
    textAlign: 'center',
  },
  frame: {
    width: VIEWER_FRAME,
    height: VIEWER_FRAME,
    borderRadius: VIEWER_FRAME / 2,
    alignSelf: 'center',
    overflow: 'hidden',
    backgroundColor: colors.cream,
    borderWidth: 2,
    borderColor: colors.border,
  },
  photo: {
    width: VIEWER_FRAME,
    height: VIEWER_FRAME,
  },
  fallback: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.sage,
  },
  initial: {
    fontFamily: 'Outfit_600SemiBold',
    fontSize: 96,
    color: colors.white,
  },
  emptyHint: {
    ...typography.caption,
    textAlign: 'center',
    color: colors.textMuted,
  },
  actions: {
    gap: spacing.sm,
  },
});

type AvatarPreviewModalProps = {
  visible: boolean;
  uri: string | null;
  imageSize: ImageDimensions | null;
  transform: PreviewTransform;
  pickingPhoto: boolean;
  confirmingAvatar: boolean;
  onCancel: () => void;
  onReplace: () => void;
  onConfirm: () => void;
  onNudge: (dx: number, dy: number) => void;
  onZoom: (delta: number) => void;
  onReset: () => void;
};

function AvatarPreviewModal({
  visible,
  uri,
  imageSize,
  transform,
  pickingPhoto,
  confirmingAvatar,
  onCancel,
  onReplace,
  onConfirm,
  onNudge,
  onZoom,
  onReset,
}: AvatarPreviewModalProps) {
  const isWeb = Platform.OS === 'web';
  const busy = pickingPhoto || confirmingAvatar;
  const cropLayout =
    uri && imageSize
      ? computeAvatarCropLayout(imageSize.width, imageSize.height, transform, PREVIEW_FRAME)
      : null;

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onCancel}>
      <View style={previewStyles.backdrop}>
        <View style={previewStyles.sheet}>
          <Text style={previewStyles.title}>Prévia da foto</Text>
          <Text style={previewStyles.subtitle}>
            {isWeb
              ? 'Ajuste o enquadramento e confirme — o avatar usará exatamente esta área.'
              : 'Confira o recorte da galeria antes de aplicar ao perfil.'}
          </Text>

          <View style={previewStyles.frame}>
            {uri && cropLayout ? (
              <Image
                source={{ uri }}
                style={{
                  position: 'absolute',
                  width: cropLayout.width,
                  height: cropLayout.height,
                  left: cropLayout.left,
                  top: cropLayout.top,
                }}
                contentFit="fill"
              />
            ) : (
              <Text style={previewStyles.loadingHint}>Carregando prévia…</Text>
            )}
          </View>

          {isWeb ? (
            <View style={previewStyles.adjustBlock}>
              <Text style={previewStyles.adjustLabel}>Ajustar enquadramento</Text>
              <View style={previewStyles.nudgeRow}>
                <Pressable style={previewStyles.nudgeBtn} onPress={() => onNudge(0, -PREVIEW_NUDGE)}>
                  <Text style={previewStyles.nudgeText}>↑</Text>
                </Pressable>
              </View>
              <View style={previewStyles.nudgeRow}>
                <Pressable style={previewStyles.nudgeBtn} onPress={() => onNudge(-PREVIEW_NUDGE, 0)}>
                  <Text style={previewStyles.nudgeText}>←</Text>
                </Pressable>
                <Pressable style={previewStyles.nudgeBtn} onPress={onReset}>
                  <Text style={previewStyles.nudgeText}>◎</Text>
                </Pressable>
                <Pressable style={previewStyles.nudgeBtn} onPress={() => onNudge(PREVIEW_NUDGE, 0)}>
                  <Text style={previewStyles.nudgeText}>→</Text>
                </Pressable>
              </View>
              <View style={previewStyles.nudgeRow}>
                <Pressable style={previewStyles.nudgeBtn} onPress={() => onNudge(0, PREVIEW_NUDGE)}>
                  <Text style={previewStyles.nudgeText}>↓</Text>
                </Pressable>
              </View>
              <View style={previewStyles.zoomRow}>
                <Button label="−" onPress={() => onZoom(-0.1)} variant="outline" style={previewStyles.zoomBtn} />
                <Button label="+" onPress={() => onZoom(0.1)} variant="outline" style={previewStyles.zoomBtn} />
              </View>
            </View>
          ) : null}

          <View style={previewStyles.actions}>
            <Button label="Cancelar" onPress={onCancel} variant="outline" disabled={busy} />
            <Button
              label={busy ? 'Aguarde…' : 'Trocar foto'}
              onPress={onReplace}
              variant="outline"
              disabled={busy}
            />
            <Button
              label={confirmingAvatar ? 'Aplicando…' : 'Usar foto'}
              onPress={onConfirm}
              disabled={busy || !uri || !imageSize}
            />
          </View>
        </View>
      </View>
    </Modal>
  );
}

const previewStyles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(27, 67, 50, 0.5)',
    justifyContent: 'center',
    padding: spacing.xl,
  },
  sheet: {
    width: '100%',
    maxWidth: 400,
    alignSelf: 'center',
    backgroundColor: colors.white,
    borderRadius: radius.xl,
    padding: spacing.lg,
    gap: spacing.md,
  },
  title: {
    fontFamily: 'Fraunces_700Bold',
    fontSize: 22,
    color: colors.forest,
    textAlign: 'center',
  },
  subtitle: {
    ...typography.caption,
    textAlign: 'center',
    color: colors.textMuted,
  },
  frame: {
    width: PREVIEW_FRAME,
    height: PREVIEW_FRAME,
    borderRadius: PREVIEW_FRAME / 2,
    alignSelf: 'center',
    overflow: 'hidden',
    backgroundColor: colors.cream,
    borderWidth: 2,
    borderColor: colors.border,
    position: 'relative',
  },
  loadingHint: {
    ...typography.caption,
    color: colors.textMuted,
    textAlign: 'center',
    marginTop: PREVIEW_FRAME / 2 - 10,
  },
  adjustBlock: {
    alignItems: 'center',
    gap: spacing.xs,
  },
  adjustLabel: {
    fontFamily: 'Outfit_500Medium',
    fontSize: 13,
    color: colors.textMuted,
  },
  nudgeRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: spacing.sm,
  },
  nudgeBtn: {
    width: 44,
    height: 44,
    borderRadius: radius.md,
    backgroundColor: colors.cream,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  nudgeText: {
    fontFamily: 'Outfit_600SemiBold',
    fontSize: 18,
    color: colors.forest,
  },
  zoomRow: {
    flexDirection: 'row',
    gap: spacing.sm,
    marginTop: spacing.xs,
  },
  zoomBtn: {
    minWidth: 56,
    paddingVertical: 10,
  },
  actions: {
    gap: spacing.sm,
    marginTop: spacing.xs,
  },
});

const styles = StyleSheet.create({
  root: {
    flex: 1,
    width: '100%',
  },
  profileCard: {
    borderRadius: radius.xl,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.border,
    shadowOpacity: 0,
    elevation: 0,
  },
  avatarRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.lg,
    marginBottom: spacing.xs,
  },
  avatarMeta: {
    flex: 1,
    gap: spacing.xs,
  },
  changePhoto: {
    fontFamily: 'Outfit_500Medium',
    fontSize: 13,
    color: colors.orange,
  },
  macroDivider: {
    height: StyleSheet.hairlineWidth,
    backgroundColor: colors.border,
    marginVertical: spacing.lg,
  },
  macroGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
    marginTop: spacing.sm,
  },
  macroBlock: {
    flexGrow: 1,
    flexShrink: 1,
    flexBasis: '47%',
    maxWidth: '48%',
    minWidth: 0,
    backgroundColor: colors.cream,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.sm,
    overflow: 'hidden',
  },
  macroBlockLabel: {
    fontFamily: 'Outfit_600SemiBold',
    fontSize: 11,
    textTransform: 'uppercase',
    letterSpacing: 0.3,
    marginBottom: spacing.xs,
  },
  macroBlockRow: {
    flexDirection: 'row',
    alignItems: 'center',
    minHeight: 36,
    overflow: 'hidden',
  },
  macroBlockInput: {
    flex: 1,
    flexShrink: 1,
    minWidth: 0,
    fontFamily: 'Outfit_600SemiBold',
    fontSize: 15,
    color: colors.forest,
    paddingVertical: spacing.xs,
    textAlign: 'right',
  },
  macroBlockUnit: {
    fontFamily: 'Outfit_500Medium',
    fontSize: 11,
    color: colors.textMuted,
    marginLeft: spacing.xs,
    flexShrink: 0,
    textAlign: 'left',
  },
  macroBlockUnitKcal: {
    width: 30,
  },
  macroBlockUnitG: {
    width: 14,
  },
  defaultsLink: {
    alignSelf: 'flex-start',
    marginTop: spacing.md,
    paddingVertical: spacing.xs,
  },
  defaultsLinkText: {
    fontFamily: 'Outfit_500Medium',
    fontSize: 13,
    color: colors.orange,
  },
  cloudHint: {
    marginTop: spacing.xs,
  },
  inlineActions: {
    marginTop: spacing.md,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: colors.border,
  },
  inlineActionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: spacing.md,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.border,
  },
  inlineActionRowLast: {
    borderBottomWidth: 0,
  },
  inlineActionLabel: {
    fontFamily: 'Outfit_500Medium',
    fontSize: 15,
    color: colors.forest,
  },
  signOutLabel: {
    color: colors.orange,
  },
  optionsCard: {
    borderRadius: radius.xl,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.border,
    shadowOpacity: 0,
    elevation: 0,
    paddingVertical: 0,
    paddingHorizontal: 0,
    overflow: 'hidden',
  },
  optionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.lg,
    minHeight: 48,
  },
  optionRowBorder: {
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.border,
  },
  optionLabel: {
    fontFamily: 'Outfit_500Medium',
    fontSize: 15,
    color: colors.text,
    flex: 1,
  },
  optionChevron: {
    fontFamily: 'Outfit_400Regular',
    fontSize: 22,
    color: colors.textMuted,
    lineHeight: 24,
    marginLeft: spacing.sm,
  },
  saveBar: {
    width: '100%',
    maxWidth: 520,
    alignSelf: 'center',
    backgroundColor: colors.white,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: colors.border,
    paddingHorizontal: spacing.xl,
    paddingTop: spacing.md,
    ...elevation.bar,
  },
  saveBarBtn: {
    width: '100%',
  },
});
