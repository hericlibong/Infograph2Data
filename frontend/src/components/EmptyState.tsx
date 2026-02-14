import type { ReactNode } from 'react';
import { FileQuestion, ArrowRight } from 'lucide-react';

interface EmptyStateProps {
  icon?: ReactNode;
  title: string;
  description: string;
  action?: {
    label: string;
    onClick: () => void;
  };
  hint?: string;
}

export function EmptyState({ icon, title, description, action, hint }: EmptyStateProps) {
  return (
    <div className="flex flex-col items-center justify-center py-12 px-6 text-center">
      {/* Icon */}
      <div className="w-16 h-16 rounded-full bg-gray-100 flex items-center justify-center mb-4">
        {icon || <FileQuestion className="w-8 h-8 text-gray-400" />}
      </div>
      
      {/* Title */}
      <h3 className="text-lg font-semibold text-gray-900 mb-2">
        {title}
      </h3>
      
      {/* Description */}
      <p className="text-gray-600 max-w-md mb-6">
        {description}
      </p>
      
      {/* Action button */}
      {action && (
        <button
          onClick={action.onClick}
          className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
        >
          {action.label}
          <ArrowRight className="w-4 h-4" />
        </button>
      )}
      
      {/* Hint */}
      {hint && (
        <p className="mt-6 text-sm text-gray-500 bg-gray-50 px-4 py-2 rounded-lg">
          💡 {hint}
        </p>
      )}
    </div>
  );
}
