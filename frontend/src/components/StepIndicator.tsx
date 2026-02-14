import { useAppStore } from '@/store/useAppStore';
import type { WorkflowStep } from '@/types';
import { Upload, Search, MousePointerClick, Edit, Download, Check } from 'lucide-react';

const steps: { key: WorkflowStep; label: string; icon: React.ReactNode }[] = [
  { key: 'upload', label: 'Upload', icon: <Upload className="w-4 h-4" /> },
  { key: 'identify', label: 'Identify', icon: <Search className="w-4 h-4" /> },
  { key: 'select', label: 'Select', icon: <MousePointerClick className="w-4 h-4" /> },
  { key: 'review', label: 'Review', icon: <Edit className="w-4 h-4" /> },
  { key: 'export', label: 'Export', icon: <Download className="w-4 h-4" /> },
];

export function StepIndicator() {
  const currentStep = useAppStore((state) => state.currentStep);
  const canNavigateTo = useAppStore((state) => state.canNavigateTo);
  const navigateToStep = useAppStore((state) => state.navigateToStep);
  const hasUnsavedChanges = useAppStore((state) => state.hasUnsavedChanges);
  
  const currentIndex = steps.findIndex((s) => s.key === currentStep);
  const progressPercent = (currentIndex / (steps.length - 1)) * 100;

  const handleStepClick = (step: WorkflowStep, index: number) => {
    // Only allow clicking on completed steps
    if (index >= currentIndex) return;
    if (!canNavigateTo(step)) return;
    
    // Warn if unsaved changes
    if (hasUnsavedChanges) {
      const confirmed = window.confirm(
        'You have unsaved changes. Are you sure you want to go back?'
      );
      if (!confirmed) return;
    }
    
    navigateToStep(step);
  };

  return (
    <div className="bg-white border-b shadow-sm">
      {/* Progress bar */}
      <div className="h-1 bg-gray-200">
        <div 
          className="h-full bg-gradient-to-r from-blue-500 to-blue-600 transition-all duration-500 ease-out"
          style={{ width: `${progressPercent}%` }}
        />
      </div>
      
      {/* Steps */}
      <div className="flex items-center justify-center gap-1 py-3 px-4">
        {steps.map((step, index) => {
          const isActive = step.key === currentStep;
          const isCompleted = index < currentIndex;
          const isClickable = isCompleted && canNavigateTo(step.key);

          return (
            <div key={step.key} className="flex items-center">
              <button
                onClick={() => handleStepClick(step.key, index)}
                disabled={!isClickable}
                className={`
                  flex items-center gap-2 px-3 py-2 rounded-lg transition-all duration-200
                  ${isClickable ? 'cursor-pointer hover:bg-green-100' : 'cursor-default'}
                  ${isActive ? 'bg-blue-100 text-blue-700 font-medium ring-2 ring-blue-300' : ''}
                  ${isCompleted && !isActive ? 'text-green-600 hover:text-green-700' : ''}
                  ${!isActive && !isCompleted ? 'text-gray-400' : ''}
                `}
                title={isClickable ? `Go back to ${step.label}` : undefined}
              >
                {/* Step indicator circle/icon */}
                <span className={`
                  flex items-center justify-center w-6 h-6 rounded-full text-xs font-bold transition-all
                  ${isActive ? 'bg-blue-600 text-white' : ''}
                  ${isCompleted ? 'bg-green-500 text-white' : ''}
                  ${!isActive && !isCompleted ? 'bg-gray-200 text-gray-500' : ''}
                `}>
                  {isCompleted ? <Check className="w-3.5 h-3.5" /> : index + 1}
                </span>
                
                {/* Icon and label */}
                <span className="flex items-center gap-1.5">
                  {step.icon}
                  <span className="text-sm hidden sm:inline">{step.label}</span>
                </span>
              </button>
              
              {/* Connector line */}
              {index < steps.length - 1 && (
                <div className={`
                  w-6 md:w-10 h-0.5 mx-1 transition-colors duration-300
                  ${isCompleted ? 'bg-green-400' : 'bg-gray-200'}
                `} />
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
