import { useEffect } from 'react'
import { MainLayout } from './components/MainLayout'
import { UploadPage } from './pages/UploadPage'
import { IdentifyPage } from './pages/IdentifyPage'
import { ReviewPage } from './pages/ReviewPage'
import { ExportPage } from './pages/ExportPage'
import { useAppStore } from './store/useAppStore'

function App() {
  const currentStep = useAppStore((state) => state.currentStep);
  const extraction = useAppStore((state) => state.extraction);
  const hasUnsavedChanges = useAppStore((state) => state.hasUnsavedChanges);

  // Navigation guard: warn before leaving if there's work in progress
  useEffect(() => {
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      // Warn if user has extraction data or unsaved changes
      if (extraction || hasUnsavedChanges) {
        e.preventDefault();
        // Modern browsers ignore custom messages, but we set it anyway
        e.returnValue = 'You have unsaved work. Are you sure you want to leave?';
        return e.returnValue;
      }
    };

    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, [extraction, hasUnsavedChanges]);

  return (
    <MainLayout>
      {currentStep === 'upload' && <UploadPage />}
      {currentStep === 'identify' && <IdentifyPage />}
      {currentStep === 'select' && <IdentifyPage />}
      {currentStep === 'review' && <ReviewPage />}
      {currentStep === 'export' && <ExportPage />}
    </MainLayout>
  )
}

export default App
