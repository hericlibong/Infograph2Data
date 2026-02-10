import { MainLayout } from './components/MainLayout'
import { UploadPage } from './pages/UploadPage'
import { IdentifyPage } from './pages/IdentifyPage'
import { ReviewPage } from './pages/ReviewPage'
import { ExportPage } from './pages/ExportPage'
import { useAppStore } from './store/useAppStore'

function App() {
  const currentStep = useAppStore((state) => state.currentStep);

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
