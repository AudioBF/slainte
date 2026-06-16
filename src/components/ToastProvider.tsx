import { createContext, ReactNode, useCallback, useContext, useMemo, useRef, useState } from 'react';
import { Platform, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { colors } from '../theme/colors';
import { radius, spacing } from '../theme/tokens';

type ToastType = 'success' | 'error';

type ToastState = {
  message: string;
  type: ToastType;
} | null;

type ToastContextValue = {
  showToast: (message: string, type?: ToastType) => void;
};

const TOAST_DURATION_MS = 2200;
const TAB_BAR_OFFSET = 64;
const ACTION_BAR_BUFFER = 88;

const ToastContext = createContext<ToastContextValue | null>(null);

export function ToastProvider({ children }: { children: ReactNode }) {
  const insets = useSafeAreaInsets();
  const [toast, setToast] = useState<ToastState>(null);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const showToast = useCallback((message: string, type: ToastType = 'success') => {
    if (timerRef.current) {
      clearTimeout(timerRef.current);
      timerRef.current = null;
    }
    setToast({ message, type });
    timerRef.current = setTimeout(() => {
      setToast(null);
      timerRef.current = null;
    }, TOAST_DURATION_MS);
  }, []);

  const value = useMemo<ToastContextValue>(() => ({ showToast }), [showToast]);
  const bottomOffset = Math.max(insets.bottom, spacing.md) + TAB_BAR_OFFSET + ACTION_BAR_BUFFER;

  return (
    <ToastContext.Provider value={value}>
      {children}
      {toast ? (
        <View style={[styles.outer, { bottom: bottomOffset }]} pointerEvents="none">
          <View style={[styles.toast, toast.type === 'error' ? styles.error : styles.success]}>
            <Text style={styles.message}>{toast.message}</Text>
          </View>
        </View>
      ) : null}
    </ToastContext.Provider>
  );
}

export function useToast(): ToastContextValue {
  const ctx = useContext(ToastContext);
  if (!ctx) {
    return {
      showToast: () => {},
    };
  }
  return ctx;
}

const styles = StyleSheet.create({
  outer: {
    position: 'absolute',
    left: spacing.lg,
    right: spacing.lg,
    zIndex: 200,
    alignItems: 'center',
  },
  toast: {
    width: '100%',
    maxWidth: 520,
    borderRadius: radius.md,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    borderWidth: StyleSheet.hairlineWidth,
    shadowColor: colors.forest,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: Platform.OS === 'web' ? 0.12 : 0.18,
    shadowRadius: 8,
    elevation: 4,
  },
  success: {
    backgroundColor: colors.success,
    borderColor: colors.forest,
  },
  error: {
    backgroundColor: colors.orange,
    borderColor: colors.orange,
  },
  message: {
    fontFamily: 'Outfit_500Medium',
    fontSize: 14,
    color: colors.white,
    textAlign: 'center',
  },
});
