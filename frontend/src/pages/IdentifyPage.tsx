import { useEffect, useMemo, useState, useRef } from 'react';
import { useAppStore } from '@/store/useAppStore';
import { useIdentify } from '@/api/hooks';
import { getFilePreviewUrl } from '@/api/client';
import type { DetectedElement, ImageDimensions } from '@/types';
import { Loader2, Search, ChevronLeft, ChevronRight, AlertCircle } from 'lucide-react';

interface ImageCanvasProps {
  fileId: string;
  page: number;
  isPdf: boolean;
  elements: DetectedElement[];
  selectedElements: string[];
  onToggleElement: (id: string) => void;
  imageDimensions: ImageDimensions; // Dimensions used by Vision LLM
}

function ImageCanvas({ fileId, page, isPdf, elements, selectedElements, onToggleElement, imageDimensions }: ImageCanvasProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [displaySize, setDisplaySize] = useState({ width: 0, height: 0 });

  const previewUrl = getFilePreviewUrl(fileId, page, isPdf);

  const handleImageLoad = (e: React.SyntheticEvent<HTMLImageElement>) => {
    const img = e.currentTarget;
    setDisplaySize({ width: img.width, height: img.height });
  };

  // Recalculate on resize
  useEffect(() => {
    const handleResize = () => {
      if (containerRef.current) {
        const img = containerRef.current.querySelector('img');
        if (img) {
          setDisplaySize({ width: img.width, height: img.height });
        }
      }
    };
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // Scale based on API's image_dimensions (what Vision LLM analyzed)
  const scale = useMemo(() => {
    if (imageDimensions.width === 0 || displaySize.width === 0) return 1;
    return displaySize.width / imageDimensions.width;
  }, [displaySize.width, imageDimensions.width]);

  return (
    <div ref={containerRef} className="relative inline-block">
      <img
        src={previewUrl}
        alt="Preview"
        className="max-w-full h-auto rounded-lg shadow-md"
        onLoad={handleImageLoad}
      />
      {elements.map((element) => {
        const isSelected = selectedElements.includes(element.item_id);
        const scaledBbox = {
          x: element.bbox.x * scale,
          y: element.bbox.y * scale,
          width: element.bbox.width * scale,
          height: element.bbox.height * scale,
        };

        return (
          <div
            key={element.item_id}
            onClick={() => onToggleElement(element.item_id)}
            className={`
              absolute cursor-pointer transition-all
              ${isSelected 
                ? 'border-2 border-blue-500 bg-blue-500/20' 
                : 'border-2 border-gray-400 bg-gray-400/10 hover:border-blue-400 hover:bg-blue-400/10'
              }
            `}
            style={{
              left: scaledBbox.x,
              top: scaledBbox.y,
              width: scaledBbox.width,
              height: scaledBbox.height,
            }}
            title={element.description}
          >
            <span className={`
              absolute -top-6 left-0 text-xs px-2 py-0.5 rounded whitespace-nowrap
              ${isSelected ? 'bg-blue-500 text-white' : 'bg-gray-600 text-white'}
            `}>
              {element.type}
            </span>
          </div>
        );
      })}
    </div>
  );
}

export function IdentifyPage() {
  const { currentFile, currentPage, setCurrentPage, setIdentification, toggleElement, options, identification } = useAppStore();
  const identifyMutation = useIdentify();

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

  if (!currentFile) {
    return (
      <div className="text-center py-12 text-gray-500">
        No file selected. Please upload a file first.
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
      {/* Left: Image preview with bbox overlay */}
      <div className="lg:col-span-2">
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
            {identification?.detected_items ? (
              <ImageCanvas
                fileId={currentFile.id}
                page={currentPage}
                isPdf={isPdf}
                elements={identification.detected_items}
                selectedElements={options.selectedElements}
                onToggleElement={toggleElement}
                imageDimensions={identification.image_dimensions}
              />
            ) : (
              <img
                src={getFilePreviewUrl(currentFile.id, currentPage, isPdf)}
                alt="Preview"
                className="max-w-full h-auto max-h-[500px] rounded-lg shadow-md"
              />
            )}
          </div>
        </div>
      </div>

      {/* Right: Controls and results */}
      <div className="space-y-4">
        {/* Identify button */}
        <div className="bg-white rounded-xl shadow-sm p-4">
          <h3 className="font-medium text-gray-900 mb-3">Step 1: Identify Elements</h3>
          <p className="text-sm text-gray-600 mb-4">
            Click the button below to analyze the image and detect charts, tables, and other data elements.
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
                Identify Elements
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

        {/* Results */}
        {identification && (
          <div className="bg-white rounded-xl shadow-sm p-4">
            <div className="flex items-center justify-between mb-3">
              <h3 className="font-medium text-gray-900">Detected Elements</h3>
              <span className="text-sm text-gray-500">
                {identification.duration_ms}ms
              </span>
            </div>
            
            {identification.detected_items.length === 0 ? (
              <p className="text-sm text-gray-500">No elements detected.</p>
            ) : (
              <div className="space-y-2">
                {identification.detected_items.map((element) => {
                  const isSelected = options.selectedElements.includes(element.item_id);
                  return (
                    <div
                      key={element.item_id}
                      onClick={() => toggleElement(element.item_id)}
                      className={`
                        p-3 rounded-lg cursor-pointer transition-colors border
                        ${isSelected 
                          ? 'border-blue-500 bg-blue-50' 
                          : 'border-gray-200 hover:border-gray-300 hover:bg-gray-50'
                        }
                      `}
                    >
                      <div className="flex items-center justify-between">
                        <span className="text-sm font-medium text-gray-900">
                          {element.description}
                        </span>
                        <span className={`
                          text-xs px-2 py-0.5 rounded
                          ${isSelected ? 'bg-blue-500 text-white' : 'bg-gray-200 text-gray-700'}
                        `}>
                          {element.type.replace('_', ' ')}
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}

            {identification.detected_items.length > 0 && (
              <div className="mt-4 pt-4 border-t">
                <p className="text-sm text-gray-600 mb-2">
                  {options.selectedElements.length} of {identification.detected_items.length} selected
                </p>
                <button
                  onClick={() => useAppStore.getState().setCurrentStep('select')}
                  disabled={options.selectedElements.length === 0}
                  className="w-full px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors"
                >
                  Continue to Extract
                </button>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
