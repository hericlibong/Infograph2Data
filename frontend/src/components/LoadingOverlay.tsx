import { Loader2 } from 'lucide-react';
import { useAppStore } from '@/store/useAppStore';

export function LoadingOverlay() {
  const { isLoading, loadingMessage, loadingProgress } = useAppStore();

  if (!isLoading) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
      <div className="bg-white rounded-2xl shadow-2xl p-8 max-w-md w-full mx-4 text-center">
        {/* Spinner */}
        <div className="relative w-16 h-16 mx-auto mb-6">
          <Loader2 className="w-16 h-16 text-blue-600 animate-spin" />
          {loadingProgress !== null && (
            <div className="absolute inset-0 flex items-center justify-center">
              <span className="text-sm font-bold text-blue-600">
                {Math.round(loadingProgress)}%
              </span>
            </div>
          )}
        </div>

        {/* Message */}
        <p className="text-lg font-medium text-gray-900 mb-2">
          {loadingMessage || 'Loading...'}
        </p>

        {/* Progress bar */}
        {loadingProgress !== null && (
          <div className="w-full h-2 bg-gray-200 rounded-full overflow-hidden">
            <div
              className="h-full bg-gradient-to-r from-blue-500 to-blue-600 transition-all duration-300"
              style={{ width: `${loadingProgress}%` }}
            />
          </div>
        )}

        {/* Hint */}
        <p className="mt-4 text-sm text-gray-500">
          Please wait, this may take a moment...
        </p>
      </div>
    </div>
  );
}
