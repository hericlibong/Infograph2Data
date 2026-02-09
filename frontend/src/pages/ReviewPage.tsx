import { useEffect, useState } from 'react';
import { useAppStore } from '@/store/useAppStore';
import { useExtract } from '@/api/hooks';
import { Loader2, ArrowLeft, Download, Edit3, Check, X } from 'lucide-react';
import type { Dataset } from '@/types';

// Editable cell component
function EditableCell({ 
  value, 
  onChange,
  source 
}: { 
  value: string | number; 
  onChange: (val: string) => void;
  source?: string;
}) {
  const [isEditing, setIsEditing] = useState(false);
  const [editValue, setEditValue] = useState(String(value));

  const handleSave = () => {
    onChange(editValue);
    setIsEditing(false);
  };

  const handleCancel = () => {
    setEditValue(String(value));
    setIsEditing(false);
  };

  if (isEditing) {
    return (
      <div className="flex items-center gap-1">
        <input
          type="text"
          value={editValue}
          onChange={(e) => setEditValue(e.target.value)}
          className="w-full px-2 py-1 border rounded text-sm"
          autoFocus
          onKeyDown={(e) => {
            if (e.key === 'Enter') handleSave();
            if (e.key === 'Escape') handleCancel();
          }}
        />
        <button onClick={handleSave} className="p-1 text-green-600 hover:bg-green-50 rounded">
          <Check className="w-4 h-4" />
        </button>
        <button onClick={handleCancel} className="p-1 text-red-600 hover:bg-red-50 rounded">
          <X className="w-4 h-4" />
        </button>
      </div>
    );
  }

  // Color based on source
  const bgColor = source === 'annotated' 
    ? 'bg-green-50' 
    : source === 'estimated' 
      ? 'bg-orange-50' 
      : '';

  return (
    <div 
      onClick={() => setIsEditing(true)}
      className={`px-2 py-1 cursor-pointer hover:bg-gray-100 rounded ${bgColor}`}
      title={source ? `Source: ${source}` : 'Click to edit'}
    >
      {value}
    </div>
  );
}

// Dataset table component
function DatasetTable({ 
  dataset, 
  onUpdateRow 
}: { 
  dataset: Dataset;
  onUpdateRow: (rowIndex: number, column: string, value: string) => void;
}) {
  return (
    <div className="bg-white rounded-xl shadow-sm overflow-hidden">
      <div className="px-4 py-3 bg-gray-50 border-b">
        <h3 className="font-medium text-gray-900">{dataset.name}</h3>
        <p className="text-sm text-gray-500">{dataset.rows.length} rows</p>
      </div>
      
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="bg-gray-50">
            <tr>
              {dataset.columns.filter(c => c !== 'source').map((col) => (
                <th key={col} className="px-4 py-2 text-left font-medium text-gray-700 border-b">
                  {col}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {dataset.rows.map((row, rowIndex) => (
              <tr key={rowIndex} className="border-b hover:bg-gray-50">
                {dataset.columns.filter(c => c !== 'source').map((col) => (
                  <td key={col} className="px-4 py-2">
                    <EditableCell
                      value={row[col] as string | number}
                      onChange={(val) => onUpdateRow(rowIndex, col, val)}
                      source={row['source'] as string | undefined}
                    />
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

export function ReviewPage() {
  const { 
    currentFile, 
    currentPage,
    identification, 
    options,
    extraction,
    setExtraction,
    setCurrentStep 
  } = useAppStore();

  const extractMutation = useExtract();
  const [datasets, setDatasets] = useState<Dataset[]>([]);

  // Start extraction when page loads
  useEffect(() => {
    if (!identification || extraction) return;

    extractMutation.mutate(
      {
        identificationId: identification.identification_id,
        options: {
          granularity: options.granularity,
          selectedItems: options.selectedElements,
        },
      },
      {
        onSuccess: (result) => {
          setExtraction(result);
          setDatasets(result.datasets);
        },
      }
    );
  }, [identification]);

  // Update datasets when extraction changes
  useEffect(() => {
    if (extraction?.datasets) {
      setDatasets(extraction.datasets);
    }
  }, [extraction]);

  const handleUpdateRow = (datasetIndex: number, rowIndex: number, column: string, value: string) => {
    setDatasets(prev => {
      const updated = [...prev];
      updated[datasetIndex] = {
        ...updated[datasetIndex],
        rows: updated[datasetIndex].rows.map((row, i) => 
          i === rowIndex ? { ...row, [column]: value } : row
        ),
      };
      return updated;
    });
  };

  const handleBack = () => {
    setCurrentStep('identify');
  };

  const handleExport = () => {
    setCurrentStep('export');
  };

  if (!currentFile || !identification) {
    return (
      <div className="text-center py-12 text-gray-500">
        No identification data. Please go back and identify elements first.
      </div>
    );
  }

  // Loading state
  if (extractMutation.isPending) {
    return (
      <div className="flex flex-col items-center justify-center py-16">
        <Loader2 className="w-12 h-12 text-blue-500 animate-spin mb-4" />
        <h3 className="text-lg font-medium text-gray-900 mb-2">Extracting Data...</h3>
        <p className="text-gray-500">
          Analyzing {options.selectedElements.length} elements from {currentFile.filename}
        </p>
      </div>
    );
  }

  // Error state
  if (extractMutation.isError) {
    return (
      <div className="max-w-lg mx-auto py-12">
        <div className="bg-red-50 border border-red-200 rounded-xl p-6 text-center">
          <h3 className="text-lg font-medium text-red-800 mb-2">Extraction Failed</h3>
          <p className="text-red-600 mb-4">{extractMutation.error.message}</p>
          <button
            onClick={handleBack}
            className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700"
          >
            Go Back
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <button
            onClick={handleBack}
            className="p-2 hover:bg-gray-100 rounded-lg"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div>
            <h2 className="text-xl font-semibold text-gray-900">Review Extracted Data</h2>
            <p className="text-sm text-gray-500">
              {currentFile.filename} • {datasets.length} datasets • 
              {extraction?.duration_ms && ` ${extraction.duration_ms}ms`}
            </p>
          </div>
        </div>
        
        <button
          onClick={handleExport}
          className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700"
        >
          <Download className="w-5 h-5" />
          Export
        </button>
      </div>

      {/* Legend */}
      <div className="flex items-center gap-6 text-sm">
        <div className="flex items-center gap-2">
          <div className="w-4 h-4 bg-green-50 border border-green-200 rounded" />
          <span className="text-gray-600">Annotated (from chart)</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-4 h-4 bg-orange-50 border border-orange-200 rounded" />
          <span className="text-gray-600">Estimated (from axis)</span>
        </div>
        <div className="flex items-center gap-2">
          <Edit3 className="w-4 h-4 text-gray-400" />
          <span className="text-gray-600">Click any cell to edit</span>
        </div>
      </div>

      {/* Datasets */}
      {datasets.length === 0 ? (
        <div className="text-center py-12 text-gray-500">
          No datasets extracted.
        </div>
      ) : (
        <div className="space-y-6">
          {datasets.map((dataset, index) => (
            <DatasetTable
              key={dataset.id}
              dataset={dataset}
              onUpdateRow={(rowIndex, column, value) => 
                handleUpdateRow(index, rowIndex, column, value)
              }
            />
          ))}
        </div>
      )}
    </div>
  );
}
