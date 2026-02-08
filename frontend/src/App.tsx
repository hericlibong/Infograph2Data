import { MainLayout } from './components/MainLayout'
import { UploadPage } from './pages/UploadPage'
import { useAppStore } from './store/useAppStore'

function App() {
  const currentStep = useAppStore((state) => state.currentStep);

  return (
    <MainLayout>
      {currentStep === 'upload' && <UploadPage />}
      {currentStep === 'identify' && (
        <div className="text-center py-12 text-gray-500">
          Identify step (coming soon)
        </div>
      )}
      {currentStep === 'select' && (
        <div className="text-center py-12 text-gray-500">
          Select step (coming soon)
        </div>
      )}
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
