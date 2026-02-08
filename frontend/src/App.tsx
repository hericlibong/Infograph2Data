import { MainLayout } from './components/MainLayout'
import { UploadPage } from './pages/UploadPage'
import { IdentifyPage } from './pages/IdentifyPage'
import { useAppStore } from './store/useAppStore'

function App() {
  const currentStep = useAppStore((state) => state.currentStep);

  return (
    <MainLayout>
      {currentStep === 'upload' && <UploadPage />}
      {currentStep === 'identify' && <IdentifyPage />}
      {currentStep === 'select' && <IdentifyPage />}
      {currentStep === 'review' && (
        <div className="text-center py-12 text-gray-500">
          Review step (coming soon)
        </div>
      )}
      {currentStep === 'export' && (
        <div className="text-center py-12 text-gray-500">
          Export step (coming soon)
        </div>
      )}
    </MainLayout>
  )
}

export default App
