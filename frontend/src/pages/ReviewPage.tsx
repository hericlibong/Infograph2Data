import { useState } from 'react';
import { useAppStore } from '@/store/useAppStore';
import { ArrowLeft, Download, Edit3, Check, X } from 'lucide-react';
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

// Dataset table component with improved presentation
function DatasetTable({ 
  dataset, 
  datasetIndex,
  onUpdateRow 
}: { 
  dataset: Dataset;
  datasetIndex: number;
  onUpdateRow: (rowIndex: number, column: string, value: string) => void;
}) {
  const displayColumns = dataset.columns.filter(c => c !== 'source' && c !== 'row_id');
  const typeLabel = dataset.type?.replace(/_/g, ' ') || 'data';
  const typeIcon = getTypeIcon(dataset.type);
  
  return (
    <div className="bg-white rounded-xl shadow-sm overflow-hidden border border-gray-200">
      {/* Header with clear labeling */}
      <div className="px-5 py-4 bg-gradient-to-r from-blue-50 to-white border-b">
        <div className="flex items-center gap-3">
          <span className="text-2xl">{typeIcon}</span>
          <div>
            <h3 className="font-semibold text-gray-900 text-lg">
              {dataset.title || `Dataset ${datasetIndex + 1}`}
            </h3>
            <div className="flex items-center gap-3 mt-1">
              <span className="text-xs px-2 py-0.5 bg-blue-100 text-blue-700 rounded-full font-medium">
                {typeLabel}
              </span>
              <span className="text-sm text-gray-500">
                {dataset.rows.length} rows × {displayColumns.length} columns
              </span>
            </div>
          </div>
        </div>
      </div>
      
      {/* Table with better styling */}
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-gray-100">
              <th className="px-4 py-3 text-left font-semibold text-gray-600 border-b text-xs uppercase tracking-wide">
                #
              </th>
              {displayColumns.map((col) => (
                <th key={col} className="px-4 py-3 text-left font-semibold text-gray-600 border-b text-xs uppercase tracking-wide">
                  {col}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {dataset.rows.map((row, rowIndex) => (
              <tr key={rowIndex} className={`border-b ${rowIndex % 2 === 0 ? 'bg-white' : 'bg-gray-50'} hover:bg-blue-50 transition-colors`}>
                <td className="px-4 py-2 text-gray-400 text-xs">
                  {rowIndex + 1}
                </td>
                {displayColumns.map((col) => (
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

// Helper function to get icon for data type
function getTypeIcon(type?: string): string {
  switch (type) {
    case 'line_chart': return '📈';
    case 'bar_chart': return '📊';
    case 'pie_chart': return '🥧';
    case 'stacked_bar_chart': return '📊';
    case 'grouped_bar_chart': return '📊';
    case 'kpi_panel': return '🔢';
    case 'table': return '📋';
    case 'time_series': return '📅';
    default: return '📄';
  }
}

export function ReviewPage() {
  const { 
    currentFile, 
    extraction,
    setCurrentStep 
  } = useAppStore();

  const [datasets, setDatasets] = useState<Dataset[]>(extraction?.datasets || []);

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

  // Guard: redirect if no extraction data
  if (!currentFile || !extraction) {
    return (
      <div className="text-center py-12">
        <p className="text-gray-500 mb-4">No extraction data available.</p>
        <button
          onClick={handleBack}
          className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
        >
          Go Back to Identify
        </button>
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
              {currentFile.filename} • {datasets.length} datasets • {extraction.duration_ms}ms
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
              key={dataset.dataset_id}
              dataset={dataset}
              datasetIndex={index}
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
