import { useAppStore } from '@/store/useAppStore';
import type { WorkflowStep } from '@/types';
import { Upload, Search, MousePointerClick, Edit, Download } from 'lucide-react';

const steps: { key: WorkflowStep; label: string; icon: React.ReactNode }[] = [
  { key: 'upload', label: 'Upload', icon: <Upload className="w-4 h-4" /> },
  { key: 'identify', label: 'Identify', icon: <Search className="w-4 h-4" /> },
  { key: 'select', label: 'Select', icon: <MousePointerClick className="w-4 h-4" /> },
  { key: 'review', label: 'Review', icon: <Edit className="w-4 h-4" /> },
  { key: 'export', label: 'Export', icon: <Download className="w-4 h-4" /> },
];

export function StepIndicator() {
  const currentStep = useAppStore((state) => state.currentStep);
  const currentIndex = steps.findIndex((s) => s.key === currentStep);

  return (
    <div className="flex items-center justify-center gap-2 py-4 bg-gray-50 border-b">
      {steps.map((step, index) => {
        const isActive = step.key === currentStep;
        const isCompleted = index < currentIndex;

        return (
          <div key={step.key} className="flex items-center">
            <div
              className={`
                flex items-center gap-2 px-3 py-2 rounded-lg transition-colors
                ${isActive ? 'bg-blue-100 text-blue-700 font-medium' : ''}
                ${isCompleted ? 'text-green-600' : ''}
                ${!isActive && !isCompleted ? 'text-gray-400' : ''}
              `}
            >
              {step.icon}
              <span className="text-sm">{step.label}</span>
            </div>
            {index < steps.length - 1 && (
              <div className={`w-8 h-0.5 mx-1 ${isCompleted ? 'bg-green-300' : 'bg-gray-200'}`} />
            )}
          </div>
        );
      })}
    </div>
  );
}
