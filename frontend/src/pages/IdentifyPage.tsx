import { useState } from 'react';
import { useAppStore } from '@/store/useAppStore';
import { useIdentify, useExtract } from '@/api/hooks';
import { getFilePreviewUrl } from '@/api/client';
import { Loader2, Search, ChevronLeft, ChevronRight, AlertCircle, Check, Square, CheckSquare } from 'lucide-react';

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
    setCurrentStep
  } = useAppStore();
  
  const identifyMutation = useIdentify();
  const extractMutation = useExtract();
  const [extractError, setExtractError] = useState<string | null>(null);

  const totalPages = currentFile?.pages ?? 1;
  const isPdf = currentFile?.mime_type === 'application/pdf';

  const handleIdentify = () => {
    if (!currentFile) return;
    identifyMutation.mutate(
      { fileId: currentFile.id, page: currentPage },
      {
        onSuccess: (result) => {
          setIdentification(result);
        },
      }
    );
  };

  const handleSelectAll = () => {
    if (!identification) return;
    setSelectedElements(identification.detected_items.map(e => e.item_id));
  };

  const handleSelectNone = () => {
    setSelectedElements([]);
  };

  // Fetch-on-Interaction: Extract THEN navigate
  const handleExtract = async (itemIds: string[]) => {
    if (!identification || itemIds.length === 0) return;
    
    setExtractError(null);
    
    try {
      console.log('🚀 Starting extraction for items:', itemIds);
      
      // Wait for extraction to complete
      const result = await extractMutation.mutateAsync({
        identificationId: identification.identification_id,
        options: {
          granularity: options.granularity,
          selectedItems: itemIds,
        },
      });
      
      console.log('✅ Extraction completed:', result);
      
      // Store result in Zustand
      setExtraction(result);
      
      // Navigate AFTER data is ready
      setCurrentStep('review');
    } catch (err) {
      console.error('❌ Extraction failed:', err);
      setExtractError(err instanceof Error ? err.message : 'Extraction failed');
    }
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

  if (!currentFile) {
    return (
      <div className="text-center py-12 text-gray-500">
        No file selected. Please upload a file first.
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      {/* Left: Image preview (no bbox overlay) */}
      <div>
        <div className="bg-white rounded-xl shadow-sm p-4">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-medium text-gray-900">{currentFile.filename}</h3>
            
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
                
                {extractMutation.isPending ? (
                  <div className="flex items-center justify-center gap-3 py-4 bg-blue-50 rounded-lg">
                    <Loader2 className="w-6 h-6 text-blue-600 animate-spin" />
                    <span className="text-blue-700 font-medium">Extracting data...</span>
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
  );
}
