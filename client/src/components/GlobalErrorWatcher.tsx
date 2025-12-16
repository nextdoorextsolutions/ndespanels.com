import { useEffect, useState } from 'react';
import { X, AlertCircle, Send } from 'lucide-react';
import { trpc } from '@/lib/trpc';
import { useAuth } from '@/_core/hooks/useAuth';

interface ErrorInfo {
  message: string;
  stack?: string;
  pageUrl: string;
  timestamp: Date;
}

export const GlobalErrorWatcher: React.FC = () => {
  const [error, setError] = useState<ErrorInfo | null>(null);
  const [isSending, setIsSending] = useState(false);
  const [sent, setSent] = useState(false);
  const { user } = useAuth();

  const reportErrorMutation = trpc.utility.reportError.useMutation();

  useEffect(() => {
    // Capture unhandled errors
    const handleError = (event: ErrorEvent) => {
      event.preventDefault();
      
      setError({
        message: event.message,
        stack: event.error?.stack,
        pageUrl: window.location.href,
        timestamp: new Date(),
      });
    };

    // Capture unhandled promise rejections
    const handleRejection = (event: PromiseRejectionEvent) => {
      event.preventDefault();
      
      const message = event.reason?.message || String(event.reason);
      const stack = event.reason?.stack;
      
      setError({
        message,
        stack,
        pageUrl: window.location.href,
        timestamp: new Date(),
      });
    };

    window.addEventListener('error', handleError);
    window.addEventListener('unhandledrejection', handleRejection);

    return () => {
      window.removeEventListener('error', handleError);
      window.removeEventListener('unhandledrejection', handleRejection);
    };
  }, []);

  const handleIgnore = () => {
    setError(null);
    setSent(false);
  };

  const handleSendReport = async () => {
    if (!error) return;

    setIsSending(true);

    try {
      // Get browser info
      const browserInfo = `${navigator.userAgent} | ${navigator.platform} | ${window.innerWidth}x${window.innerHeight}`;

      await reportErrorMutation.mutateAsync({
        errorMessage: error.message,
        stackTrace: error.stack,
        pageUrl: error.pageUrl,
        browserInfo,
      });

      setSent(true);
      
      // Auto-close after 2 seconds
      setTimeout(() => {
        setError(null);
        setSent(false);
      }, 2000);
    } catch (err) {
      console.error('[Error Reporter] Failed to send report:', err);
      // Still mark as sent to avoid infinite loops
      setSent(true);
      setTimeout(() => {
        setError(null);
        setSent(false);
      }, 2000);
    } finally {
      setIsSending(false);
    }
  };

  if (!error) return null;

  return (
    <div
      className="fixed bottom-4 right-4 z-[9999] w-96 bg-white border-2 border-red-500 rounded-lg shadow-2xl animate-in slide-in-from-bottom-5"
      role="alert"
    >
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b border-red-200 bg-red-50">
        <div className="flex items-center gap-2">
          <AlertCircle className="w-5 h-5 text-red-600" />
          <h3 className="font-semibold text-red-900">Something went wrong</h3>
        </div>
        <button
          onClick={handleIgnore}
          className="text-red-600 hover:text-red-800 transition-colors"
          aria-label="Close"
        >
          <X className="w-5 h-5" />
        </button>
      </div>

      {/* Body */}
      <div className="p-4">
        <p className="text-sm text-gray-700 mb-3">
          An unexpected error occurred. You can continue working, but sending a report helps us fix the issue.
        </p>
        
        {/* Error preview (truncated) */}
        <div className="bg-gray-50 border border-gray-200 rounded p-2 mb-4">
          <p className="text-xs font-mono text-gray-600 truncate">
            {error.message}
          </p>
        </div>

        {/* Action buttons */}
        <div className="flex gap-2">
          <button
            onClick={handleIgnore}
            className="flex-1 px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 hover:bg-gray-200 rounded transition-colors"
            disabled={isSending}
          >
            Ignore
          </button>
          <button
            onClick={handleSendReport}
            disabled={isSending || sent}
            className="flex-1 px-4 py-2 text-sm font-medium text-white bg-red-600 hover:bg-red-700 rounded transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
          >
            {isSending ? (
              <>
                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                Sending...
              </>
            ) : sent ? (
              <>
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
                Sent!
              </>
            ) : (
              <>
                <Send className="w-4 h-4" />
                Send Report
              </>
            )}
          </button>
        </div>
      </div>

      {/* Footer info */}
      <div className="px-4 py-2 bg-gray-50 border-t border-gray-200 rounded-b-lg">
        <p className="text-xs text-gray-500">
          {user ? `Logged in as ${user.name || user.email}` : 'Not logged in'}
        </p>
      </div>
    </div>
  );
};
