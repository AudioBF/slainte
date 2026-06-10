import { Component, type ErrorInfo, type ReactNode } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { Button } from './Button';
import { colors } from '../theme/colors';
import { typography } from '../theme/typography';

type Props = {
  children: ReactNode;
  onReset?: () => void;
};

type State = {
  error: Error | null;
};

export class ErrorBoundary extends Component<Props, State> {
  state: State = { error: null };

  static getDerivedStateFromError(error: Error): State {
    return { error };
  }

  componentDidCatch(error: Error, info: ErrorInfo): void {
    if (__DEV__) {
      console.error('[ErrorBoundary]', error, info.componentStack);
    }
  }

  private handleReset = (): void => {
    this.setState({ error: null });
    this.props.onReset?.();
  };

  render(): ReactNode {
    if (this.state.error) {
      return (
        <View style={styles.container}>
          <Text style={styles.title}>Algo deu errado</Text>
          <Text style={[typography.body, styles.message]}>
            Recarregue a página ou tente novamente. Se persistir, volte à aba Hoje.
          </Text>
          {__DEV__ ? (
            <Text style={styles.devError} selectable>
              {this.state.error.message}
            </Text>
          ) : null}
          <Button label="Tentar novamente" onPress={this.handleReset} style={styles.button} />
        </View>
      );
    }

    return this.props.children;
  }
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
    backgroundColor: colors.cream,
    gap: 12,
  },
  title: {
    fontFamily: 'Fraunces_700Bold',
    fontSize: 22,
    color: colors.forest,
    textAlign: 'center',
  },
  message: {
    textAlign: 'center',
    color: colors.textMuted,
  },
  devError: {
    fontFamily: 'Outfit_400Regular',
    fontSize: 12,
    color: colors.orange,
    textAlign: 'center',
  },
  button: {
    marginTop: 8,
    minWidth: 200,
  },
});
