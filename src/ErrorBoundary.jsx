// ErrorBoundary.jsx
import React from 'react';
import { logError } from './utils/logger';

class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true };
  }

  componentDidCatch(error, errorInfo) {
    logError({
      componentStack: errorInfo.componentStack,
      error: error.toString(),
      timestamp: new Date().toISOString()
    });
  }

  render() {
    if (this.state.hasError) {
      return <h1>Something went wrong. Our team has been notified.</h1>;
    }

    return this.props.children;
  }
}

export default ErrorBoundary;
