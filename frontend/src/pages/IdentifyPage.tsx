import { useState, useEffect, useMemo } from 'react';
import { useAppStore } from '@/store/useAppStore';
import { useIdentify } from '@/api/hooks';
import { getFilePreviewUrl, runExtraction } from '@/api/client';
import { Loader2, Search, ChevronLeft, ChevronRight, AlertCircle, Check, Square, CheckSquare, ArrowLeft, Upload, Clock } from 'lucide-react';
import { useKeyboardShortcuts } from '@/hooks/useKeyboardShortcuts';

export function IdentifyPage() {
  const { 
    currentFile, 
    currentPage, 
    setCurrentPage, 
    setIdentification, 
    toggleElement, 
    setSelectedElements,
    options, 
    identification,
    setExtraction,
    setCurrentStep,
    setLoading,
    reset
  } = useAppStore();
  
  const identifyMutation = useIdentify();
  const [isExtracting, setIsExtracting] = useState(false);
  const [extractError, setExtractError] = useState<string | null>(null);
  const [extractionProgress, setExtractionProgress] = useState<{
    current: number;
    total: number;
    currentItemId: string | null;
    completedItems: string[];
    elapsedSeconds: number;
  } | null>(null);

  const totalPages = currentFile?.pages ?? 1;
  const isPdf = currentFile?.mime_type === 'application/pdf';

  // Timer for elapsed time during extraction
  useEffect(() => {
    let interval: ReturnType<typeof setInterval> | null = null;
    if (isExtracting && extractionProgress) {
      interval = setInterval(() => {
        setExtractionProgress(prev => prev ? { ...prev, elapsedSeconds: prev.elapsedSeconds + 1 } : null);
      }, 1000);
    }
    return () => {
      if (interval) clearInterval(interval);
    };
  }, [isExtracting]);

  const handleIdentify = () => {
    if (!currentFile) return;
    
    // Confirm if re-analyzing (will lose current identification)
    if (identification) {
      const confirmed = window.confirm(
        'Re-analyzing will replace the current identification results.\n\nAre you sure you want to continue?'
      );
      if (!confirmed) return;
    }
    
    setLoading(true, 'Analyzing image...');
    
    identifyMutation.mutate(
      { fileId: currentFile.id, page: currentPage },
      {
        onSuccess: (result) => {
          setLoading(false);
          setIdentification(result);
        },
        onError: () => {
          setLoading(false);
        },
      }
    );
  };

  const handleBack = () => {
    // Confirm if there's identification data
    if (identification) {
      const confirmed = window.confirm(
        'Going back will clear the current identification.\n\nAre you sure you want to upload a different file?'
      );
      if (!confirmed) return;
    }
    reset();
  };

  const handleSelectAll = () => {
    if (!identification) return;
    setSelectedElements(identification.detected_items.map(e => e.item_id));
  };

  const handleSelectNone = () => {
    setSelectedElements([]);
  };

  // Fetch-on-Interaction: Extract THEN navigate (direct call, no React Query)
  const handleExtract = async (itemIds: string[]) => {
    if (!identification || itemIds.length === 0) return;
    
    // Check if identification has expired
    const expiresAt = new Date(identification.expires_at);
    if (new Date() > expiresAt) {
      setExtractError('Identification expired. Please click "Re-analyze" to continue.');
      return;
    }
    
    setExtractError(null);
    setIsExtracting(true);
    
    // Initialize progress tracking
    setExtractionProgress({
      current: 0,
      total: itemIds.length,
      currentItemId: itemIds[0],
      completedItems: [],
      elapsedSeconds: 0,
    });
    
    try {
      console.log('🚀 Starting extraction for items:', itemIds);
      
      // Direct call to API (no React Query mutation)
      const result = await runExtraction(identification.identification_id, {
        granularity: options.granularity,
        selectedItems: itemIds,
      });
      
      console.log('✅ Extraction completed:', result);
      
      // Mark all items as completed
      setExtractionProgress(prev => prev ? {
        ...prev,
        current: itemIds.length,
        completedItems: itemIds,
        currentItemId: null,
      } : null);
      
      // Store result in Zustand
      setExtraction(result);
      
      // Navigate AFTER data is ready
      setCurrentStep('review');
    } catch (err) {
      console.error('❌ Extraction failed:', err);
      // Handle 410 Gone (expired) specifically
      const axiosErr = err as { response?: { status?: number } };
      if (axiosErr.response?.status === 410) {
        setExtractError('Identification expired. Please click "Re-analyze" to continue.');
      } else {
        setExtractError(err instanceof Error ? err.message : 'Extraction failed');
      }
    } finally {
      setIsExtracting(false);
      setExtractionProgress(null);
    }
  };

  // Helper to format elapsed time
  const formatElapsedTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return mins > 0 ? `${mins}m ${secs}s` : `${secs}s`;
  };

  // Get element name by ID
  const getElementName = (itemId: string) => {
    const item = identification?.detected_items.find(e => e.item_id === itemId);
    return item?.description?.slice(0, 40) || item?.type || itemId;
  };

  const handleExtractSelected = () => {
    handleExtract(options.selectedElements);
  };

  const handleExtractAll = () => {
    if (!identification) return;
    const allIds = identification.detected_items.map(e => e.item_id);
    setSelectedElements(allIds);
    handleExtract(allIds);
  };

  // Keyboard shortcuts
  const shortcuts = useMemo(() => [
    {
      key: 'Enter',
      ctrl: true,
      description: 'Submit action',
      action: () => {
        if (!identification) {
          handleIdentify();
        } else if (options.selectedElements.length > 0 && !isExtracting) {
          handleExtractSelected();
        }
      },
    },
    {
      key: 'ArrowLeft',
      description: 'Previous page',
      action: () => {
        if (totalPages > 1 && currentPage > 1) {
          setCurrentPage(currentPage - 1);
        }
      },
    },
    {
      key: 'ArrowRight',
      description: 'Next page',
      action: () => {
        if (totalPages > 1 && currentPage < totalPages) {
          setCurrentPage(currentPage + 1);
        }
      },
    },
    {
      key: 'a',
      ctrl: true,
      description: 'Select all elements',
      action: () => {
        if (identification) {
          handleSelectAll();
        }
      },
    },
  ], [identification, options.selectedElements.length, isExtracting, totalPages, currentPage]);

  useKeyboardShortcuts(shortcuts, { enabled: !isExtracting });

  if (!currentFile) {
    return (
      <div className="text-center py-12 text-gray-500">
        <Upload className="w-12 h-12 mx-auto mb-4 opacity-50" />
        <p className="mb-4">No file selected. Please upload a file first.</p>
        <button
          onClick={() => setCurrentStep('upload')}
          className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
        >
          Go to Upload
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Back button and header - responsive */}
      <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-4">
        <button
          onClick={handleBack}
          className="flex items-center gap-2 px-3 py-2 text-gray-600 hover:text-gray-800 hover:bg-gray-100 rounded-lg transition-colors text-sm sm:text-base"
        >
          <ArrowLeft className="w-4 h-4" />
          <span className="hidden sm:inline">Upload Different File</span>
          <span className="sm:hidden">Back</span>
        </button>
        <div className="flex-1 min-w-0">
          <h2 className="text-base sm:text-lg font-semibold text-gray-900 truncate">{currentFile.filename}</h2>
          <p className="text-xs sm:text-sm text-gray-500">
            {currentFile.mime_type} • {Math.round((currentFile.size_bytes || 0) / 1024)} KB
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 lg:gap-6">
      {/* Left: Image preview (no bbox overlay) */}
      <div>
        <div className="bg-white rounded-xl shadow-sm p-3 sm:p-4">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-medium text-gray-900 text-sm sm:text-base truncate">{currentFile.filename}</h3>
            
            {/* Page navigation for PDFs */}
            {totalPages > 1 && (
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
                  disabled={currentPage <= 1}
                  className="p-1 rounded hover:bg-gray-100 disabled:opacity-50"
                >
                  <ChevronLeft className="w-5 h-5" />
                </button>
                <span className="text-sm text-gray-600">
                  Page {currentPage} / {totalPages}
                </span>
                <button
                  onClick={() => setCurrentPage(Math.min(totalPages, currentPage + 1))}
                  disabled={currentPage >= totalPages}
                  className="p-1 rounded hover:bg-gray-100 disabled:opacity-50"
                >
                  <ChevronRight className="w-5 h-5" />
                </button>
              </div>
            )}
          </div>

          <div className="flex justify-center bg-gray-100 rounded-lg p-4 min-h-[400px]">
            <img
              src={getFilePreviewUrl(currentFile.id, currentPage, isPdf)}
              alt="Preview"
              className="max-w-full h-auto max-h-[600px] rounded-lg shadow-md"
            />
          </div>
        </div>
      </div>

      {/* Right: Controls and element list */}
      <div className="space-y-4">
        {/* Identify button */}
        <div className="bg-white rounded-xl shadow-sm p-4">
          <h3 className="font-medium text-gray-900 mb-3">Step 1: Identify Elements</h3>
          <p className="text-sm text-gray-600 mb-4">
            Analyze the image to detect all data elements (charts, tables, KPIs).
          </p>
          <button
            onClick={handleIdentify}
            disabled={identifyMutation.isPending}
            className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-blue-400 transition-colors"
          >
            {identifyMutation.isPending ? (
              <>
                <Loader2 className="w-5 h-5 animate-spin" />
                Analyzing...
              </>
            ) : (
              <>
                <Search className="w-5 h-5" />
                {identification ? 'Re-analyze' : 'Identify Elements'}
              </>
            )}
          </button>
          
          {identifyMutation.isError && (
            <div className="mt-3 p-3 bg-red-50 text-red-700 rounded-lg text-sm flex items-start gap-2">
              <AlertCircle className="w-4 h-4 mt-0.5 flex-shrink-0" />
              <span>Analysis failed: {identifyMutation.error.message}</span>
            </div>
          )}
        </div>

        {/* Results - Element selection */}
        {identification && (
          <div className="bg-white rounded-xl shadow-sm p-4">
            <div className="flex items-center justify-between mb-3">
              <h3 className="font-medium text-gray-900">Step 2: Select Elements</h3>
              <span className="text-sm text-gray-500">
                {identification.duration_ms}ms
              </span>
            </div>
            
            {identification.detected_items.length === 0 ? (
              <p className="text-sm text-gray-500">No elements detected.</p>
            ) : (
              <>
                {/* Select all / none buttons */}
                <div className="flex gap-2 mb-3">
                  <button
                    onClick={handleSelectAll}
                    className="flex items-center gap-1 px-3 py-1 text-sm text-blue-600 hover:bg-blue-50 rounded"
                  >
                    <CheckSquare className="w-4 h-4" />
                    Select All
                  </button>
                  <button
                    onClick={handleSelectNone}
                    className="flex items-center gap-1 px-3 py-1 text-sm text-gray-600 hover:bg-gray-100 rounded"
                  >
                    <Square className="w-4 h-4" />
                    Select None
                  </button>
                </div>

                {/* Element list with checkboxes */}
                <div className="space-y-2 max-h-[350px] overflow-y-auto">
                  {identification.detected_items.map((element) => {
                    const isSelected = options.selectedElements.includes(element.item_id);
                    return (
                      <div
                        key={element.item_id}
                        onClick={() => toggleElement(element.item_id)}
                        className={`
                          p-3 rounded-lg cursor-pointer transition-colors border flex items-start gap-3
                          ${isSelected 
                            ? 'border-blue-500 bg-blue-50' 
                            : 'border-gray-200 hover:border-gray-300 hover:bg-gray-50'
                          }
                        `}
                      >
                        {/* Checkbox */}
                        <div className={`
                          w-5 h-5 rounded flex items-center justify-center flex-shrink-0 mt-0.5
                          ${isSelected ? 'bg-blue-500 text-white' : 'border-2 border-gray-300'}
                        `}>
                          {isSelected && <Check className="w-3 h-3" />}
                        </div>
                        
                        {/* Content */}
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-1">
                            <span className={`
                              text-xs px-2 py-0.5 rounded font-medium
                              ${isSelected ? 'bg-blue-500 text-white' : 'bg-gray-200 text-gray-700'}
                            `}>
                              {element.type.replace(/_/g, ' ')}
                            </span>
                            {element.confidence >= 0.9 && (
                              <span className="text-xs text-green-600">High confidence</span>
                            )}
                          </div>
                          <p className="text-sm text-gray-900">
                            {element.description}
                          </p>
                          <p className="text-xs text-gray-500 mt-1">
                            {element.data_preview}
                          </p>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </>
            )}

            {/* Action buttons */}
            {identification.detected_items.length > 0 && (
              <div className="mt-4 pt-4 border-t space-y-3">
                <p className="text-sm text-gray-600">
                  {options.selectedElements.length} of {identification.detected_items.length} elements selected
                </p>
                
                {extractError && (
                  <div className="p-3 bg-red-50 text-red-700 rounded-lg text-sm flex items-start gap-2">
                    <AlertCircle className="w-4 h-4 mt-0.5 flex-shrink-0" />
                    <span>Extraction failed: {extractError}</span>
                  </div>
                )}
                
                {isExtracting && extractionProgress ? (
                  <div className="bg-blue-50 rounded-lg p-4 space-y-4">
                    {/* Header with spinner and timer */}
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <Loader2 className="w-6 h-6 text-blue-600 animate-spin" />
                        <span className="text-blue-700 font-medium">Extracting data...</span>
                      </div>
                      <div className="flex items-center gap-2 text-sm text-blue-600">
                        <Clock className="w-4 h-4" />
                        <span>{formatElapsedTime(extractionProgress.elapsedSeconds)}</span>
                      </div>
                    </div>
                    
                    {/* Progress bar */}
                    <div className="w-full h-2 bg-blue-200 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-blue-600 transition-all duration-500"
                        style={{ width: `${Math.max(5, (extractionProgress.current / extractionProgress.total) * 100)}%` }}
                      />
                    </div>
                    
                    {/* Element list with status */}
                    <div className="space-y-2 max-h-32 overflow-y-auto">
                      {options.selectedElements.map((itemId, index) => {
                        const isCompleted = extractionProgress.completedItems.includes(itemId);
                        const isCurrent = extractionProgress.currentItemId === itemId;
                        
                        return (
                          <div
                            key={itemId}
                            className={`flex items-center gap-2 text-sm px-2 py-1 rounded ${
                              isCompleted ? 'text-green-700 bg-green-100' :
                              isCurrent ? 'text-blue-700 bg-blue-100' :
                              'text-gray-500'
                            }`}
                          >
                            {isCompleted ? (
                              <Check className="w-4 h-4 text-green-600" />
                            ) : isCurrent ? (
                              <Loader2 className="w-4 h-4 animate-spin" />
                            ) : (
                              <div className="w-4 h-4 rounded-full border-2 border-gray-300" />
                            )}
                            <span className="truncate">
                              {index + 1}. {getElementName(itemId)}
                            </span>
                          </div>
                        );
                      })}
                    </div>
                    
                    <p className="text-xs text-blue-500 text-center">
                      Processing element {extractionProgress.current + 1} of {extractionProgress.total}
                    </p>
                  </div>
                ) : (
                  <div className="flex gap-2">
                    <button
                      onClick={handleExtractSelected}
                      disabled={options.selectedElements.length === 0}
                      className="flex-1 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors"
                    >
                      Extract Selected ({options.selectedElements.length})
                    </button>
                    <button
                      onClick={handleExtractAll}
                      className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                    >
                      Extract All
                    </button>
                  </div>
                )}
              </div>
            )}
          </div>
        )}
      </div>
      </div>
    </div>
  );
}
