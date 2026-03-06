import React, { Component, ErrorInfo, ReactNode } from 'react';
import { View, ScrollView, SafeAreaView, TouchableOpacity } from 'react-native';
import { styled } from 'nativewind';
import { Ionicons } from '@expo/vector-icons';
import { H2, Body, Button } from '.';
import { createLogger } from '../../utils/secureLogger';

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

const StyledView = styled(View);
const StyledSafeAreaView = styled(SafeAreaView);
const StyledScrollView = styled(ScrollView);

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

    // TODO: Send to error reporting service (Sentry, Bugsnag, etc.)
    // if (__DEV__) {
    //   console.error('Error Stack:', errorInfo.componentStack);
    // }
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
        <StyledSafeAreaView className="flex-1 bg-neutral-50">
          <StyledScrollView
            className="flex-1"
            contentContainerStyle={{ padding: 24, justifyContent: 'center', minHeight: '100%' }}
          >
            <StyledView className="items-center">
              {/* Error Icon */}
              <StyledView className="w-20 h-20 bg-error-100 rounded-full items-center justify-center mb-6">
                <Ionicons name="alert-circle" size={48} color="#EF4444" />
              </StyledView>

              {/* Error Title */}
              <H2 className="text-neutral-900 text-center mb-3">
                Oops! Something went wrong
              </H2>

              {/* Error Message */}
              <Body className="text-neutral-600 text-center mb-6 max-w-sm">
                We encountered an unexpected error. Don't worry, your data is safe. Try refreshing the app.
              </Body>

              {/* Error Details (Development Only) */}
              {__DEV__ && this.state.error && (
                <StyledView className="w-full bg-error-50 border border-error-200 rounded-xl p-4 mb-6">
                  <Body className="text-error-800 font-semibold mb-2">
                    Error Details (Dev Mode):
                  </Body>
                  <Body className="text-error-700 text-xs font-mono">
                    {this.state.error.message}
                  </Body>
                  {this.state.error.stack && (
                    <Body className="text-error-600 text-xs font-mono mt-2">
                      {this.state.error.stack.split('\n').slice(0, 5).join('\n')}
                    </Body>
                  )}
                </StyledView>
              )}

              {/* Reset Button */}
              <TouchableOpacity
                onPress={this.resetError}
                activeOpacity={0.7}
                className="bg-primary-500 px-8 py-4 rounded-xl flex-row items-center mb-3"
              >
                <Ionicons name="refresh" size={20} color="#FFFFFF" style={{ marginRight: 8 }} />
                <Body className="text-white font-semibold text-base">
                  Try Again
                </Body>
              </TouchableOpacity>

              {/* Secondary Actions */}
              <TouchableOpacity
                onPress={() => {
                  // TODO: Navigate to help/support screen or open support email
                  logger.info('Contact support');
                }}
                activeOpacity={0.7}
                className="py-2"
              >
                <Body className="text-primary-600 text-sm">
                  Contact Support
                </Body>
              </TouchableOpacity>
            </StyledView>
          </StyledScrollView>
        </StyledSafeAreaView>
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
          <StyledView className="w-12 h-12 bg-error-100 rounded-full items-center justify-center mb-3">
            <Ionicons name="warning" size={24} color="#EF4444" />
          </StyledView>

          <Body className="text-neutral-700 font-medium text-center mb-1">
            Error loading content
          </Body>

          <Body className="text-primary-600 text-sm text-center">
            Tap to retry
          </Body>

          {__DEV__ && this.state.error && (
            <Body className="text-error text-xs text-center mt-2 max-w-xs">
              {this.state.error.message}
            </Body>
          )}
        </TouchableOpacity>
      );
    }

    return this.props.children;
  }
}
