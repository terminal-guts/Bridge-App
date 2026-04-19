import React, { Component, ErrorInfo, ReactNode } from 'react';
import { View, ScrollView, TouchableOpacity, Linking } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { H2, Body, Button } from '.';
import { createLogger } from '../../utils/secureLogger';
import { Sentry } from '../../lib/sentry';
import { EvaIcon } from '../icons';
import { COLORS } from '../../theme/colors';

const logger = createLogger('ErrorBoundary');

interface ErrorBoundaryProps {
  children: ReactNode;
  fallback?: (error: Error, reset: () => void) => ReactNode;
  onError?: (error: Error, errorInfo: ErrorInfo) => void;
}

interface ErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
}

/**
 * ErrorBoundary Component
 *
 * Catches JavaScript errors anywhere in the child component tree,
 * logs those errors, and displays a fallback UI instead of crashing.
 *
 * Usage:
 * ```tsx
 * <ErrorBoundary>
 *   <YourComponent />
 * </ErrorBoundary>
 * ```
 */
export class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = {
      hasError: false,
      error: null,
    };
  }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    // Update state so the next render will show the fallback UI
    return {
      hasError: true,
      error,
    };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    // Log error to console (in production, send to error reporting service)
    logger.error('Error Boundary caught an error:', error, errorInfo);

    // Call optional error handler
    this.props.onError?.(error, errorInfo);

    Sentry.captureException(error, {
      contexts: { react: { componentStack: errorInfo.componentStack } },
    });
  }

  resetError = () => {
    this.setState({
      hasError: false,
      error: null,
    });
  };

  render() {
    if (this.state.hasError && this.state.error) {
      // Custom fallback UI provided
      if (this.props.fallback) {
        return this.props.fallback(this.state.error, this.resetError);
      }

      // Default fallback UI
      return (
        <SafeAreaView style={{ flex: 1, backgroundColor: COLORS.screenBackground }}>
          <ScrollView
            style={{ flex: 1 }}
            contentContainerStyle={{ padding: 24, justifyContent: 'center', minHeight: '100%' }}
          >
            <View style={{ alignItems: 'center' }}>
              {/* Error Icon */}
              <View style={{ width: 80, height: 80, backgroundColor: 'rgba(239, 68, 68, 0.08)', borderRadius: 40, alignItems: 'center', justifyContent: 'center', marginBottom: 24 }}>
                <EvaIcon name="alert-circle" variant="outline" size={48} color={COLORS.error} />
              </View>

              {/* Error Title */}
              <H2 className="text-center mb-3" style={{ color: COLORS.text.primary }}>
                Oops! Something went wrong
              </H2>

              {/* Error Message */}
              <Body className="text-center mb-6 max-w-sm" style={{ color: COLORS.text.secondary }}>
                We encountered an unexpected error. Don't worry, your data is safe. Try refreshing the app.
              </Body>

              {/* Error Details (Development Only) */}
              {__DEV__ && this.state.error && (
                <View style={{ width: '100%', backgroundColor: 'rgba(239, 68, 68, 0.08)', borderWidth: 1, borderColor: COLORS.border, borderRadius: 12, padding: 16, marginBottom: 24 }}>
                  <Body className="font-semibold mb-2" style={{ color: COLORS.error }}>
                    Error Details (Dev Mode):
                  </Body>
                  <Body className="text-xs" style={{ color: COLORS.error }}>
                    {this.state.error.message}
                  </Body>
                  {this.state.error.stack && (
                    <Body className="text-xs mt-2" style={{ color: COLORS.text.secondary }}>
                      {this.state.error.stack.split('\n').slice(0, 5).join('\n')}
                    </Body>
                  )}
                </View>
              )}

              {/* Reset Button */}
              <TouchableOpacity
                onPress={this.resetError}
                activeOpacity={0.7}
                style={{ backgroundColor: COLORS.primaryAccent, paddingHorizontal: 32, paddingVertical: 16, borderRadius: 12, flexDirection: 'row', alignItems: 'center', marginBottom: 12 }}
              >
                <EvaIcon name="refresh" variant="outline" size={20} color={COLORS.card} style={{ marginRight: 8 }} />
                <Body className="font-semibold text-base" style={{ color: COLORS.card }}>
                  Try Again
                </Body>
              </TouchableOpacity>

              {/* Secondary Actions */}
              <TouchableOpacity
                onPress={() => {
                  const subject = encodeURIComponent('Bridge App — Error Report');
                  const body = encodeURIComponent(
                    `Hi Bridge team,\n\nI encountered an error in the app.\n\nError: ${this.state.error?.message ?? 'Unknown'}\n\nPlease help!`
                  );
                  Linking.openURL(`mailto:bridge.date.app@gmail.com?subject=${subject}&body=${body}`).catch(() => {
                    logger.warn('Unable to open mail client');
                  });
                }}
                activeOpacity={0.7}
                style={{ paddingVertical: 8 }}
              >
                <Body className="text-sm" style={{ color: COLORS.primary }}>
                  Contact Support
                </Body>
              </TouchableOpacity>
            </View>
          </ScrollView>
        </SafeAreaView>
      );
    }

    return this.props.children;
  }
}

/**
 * CardErrorBoundary Component
 *
 * Compact error boundary for use inside dashboard cards
 * Shows minimal error UI without taking over the whole screen
 */
export class CardErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = {
      hasError: false,
      error: null,
    };
  }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return {
      hasError: true,
      error,
    };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    logger.error('Card Error Boundary caught an error:', error, errorInfo);
    this.props.onError?.(error, errorInfo);
    Sentry.captureException(error, {
      contexts: { react: { componentStack: errorInfo.componentStack } },
    });
  }

  resetError = () => {
    this.setState({
      hasError: false,
      error: null,
    });
  };

  render() {
    if (this.state.hasError && this.state.error) {
      if (this.props.fallback) {
        return this.props.fallback(this.state.error, this.resetError);
      }

      return (
        <TouchableOpacity
          onPress={this.resetError}
          activeOpacity={0.7}
          className="items-center justify-center py-8 px-4"
        >
          <View style={{ width: 48, height: 48, backgroundColor: 'rgba(239, 68, 68, 0.08)', borderRadius: 24, alignItems: 'center', justifyContent: 'center', marginBottom: 12 }}>
            <EvaIcon name="alert-triangle" variant="outline" size={24} color={COLORS.error} />
          </View>

          <Body className="font-medium text-center mb-1" style={{ color: COLORS.text.primary }}>
            Error loading content
          </Body>

          <Body className="text-sm text-center" style={{ color: COLORS.primary }}>
            Tap to retry
          </Body>

          {__DEV__ && this.state.error && (
            <Body className="text-xs text-center mt-2 max-w-xs" style={{ color: COLORS.error }}>
              {this.state.error.message}
            </Body>
          )}
        </TouchableOpacity>
      );
    }

    return this.props.children;
  }
}
