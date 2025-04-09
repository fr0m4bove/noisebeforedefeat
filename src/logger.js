// utils/logger.js
import { getDatabase, ref, push, serverTimestamp } from 'firebase/database';

export const logError = async (errorContext) => {
  try {
    const db = getDatabase();
    const errorRef = ref(db, 'errorLogs');
    
    await push(errorRef, {
      ...errorContext,
      timestamp: serverTimestamp(),
      environment: process.env.NODE_ENV,
      userAgent: navigator.userAgent,
      appVersion: process.env.REACT_APP_VERSION || 'unknown'
    });
  } catch (logError) {
    console.error('Failed to log error:', logError);
  }
};

export const createErrorDiagnostic = (componentName, functionName, error) => ({
  componentName,
  functionName,
  errorMessage: error.message,
  errorStack: error.stack,
  timestamp: new Date().toISOString()
});
