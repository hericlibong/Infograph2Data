import { useState, useMemo, useRef, useCallback, useEffect } from 'react';
import { useAppStore, type SourceFilter } from '@/store/useAppStore';
import { updateDataset } from '@/api/client';
import { ArrowLeft, Download, Edit3, X, Filter, Eye, EyeOff, Loader2, CheckCircle2, FileSpreadsheet } from 'lucide-react';
import { EmptyState } from '@/components/EmptyState';
import { useKeyboardShortcuts } from '@/hooks/useKeyboardShortcuts';
import type { Dataset } from '@/types';
import EditableCell from '@/components/EditableCell';


// Source filter component
function SourceFilterBar({
  filter,
  onFilterChange,
  counts,
}: {
  filter: SourceFilter;
  onFilterChange: (filter: SourceFilter) => void;
  counts: { all: number; annotated: number; estimated: number };
}) {
  return (
    <div className="bg-white rounded-xl shadow-sm p-4 border border-gray-200">
      <div className="flex items-center gap-2 mb-3">
        <Filter className="w-5 h-5 text-gray-500" />
        <span className="font-medium text-gray-700">Filter by Source</span>
      </div>
      
      <div className="flex flex-wrap gap-2">
        <button
          onClick={() => onFilterChange('all')}
          className={`flex items-center gap-2 px-4 py-2 rounded-lg border transition-all ${
            filter === 'all'
              ? 'bg-blue-600 text-white border-blue-600'
              : 'bg-white text-gray-700 border-gray-300 hover:border-blue-400'
          }`}
        >
          <Eye className="w-4 h-4" />
          All Data
          <span className={`text-xs px-2 py-0.5 rounded-full ${
            filter === 'all' ? 'bg-blue-500' : 'bg-gray-100'
          }`}>
            {counts.all}
          </span>
        </button>
        
        <button
          onClick={() => onFilterChange('annotated')}
          className={`flex items-center gap-2 px-4 py-2 rounded-lg border-2 transition-all font-medium ${
            filter === 'annotated'
              ? 'bg-green-600 text-white border-green-600 shadow-md'
              : 'bg-green-50 text-green-800 border-green-300 hover:border-green-500 hover:bg-green-100'
          }`}
        >
          <div className="w-3 h-3 bg-green-400 rounded border-2 border-green-600" />
          Annotated Only
          <span className={`text-xs px-2 py-0.5 rounded-full font-bold ${
            filter === 'annotated' ? 'bg-green-500 text-white' : 'bg-green-200 text-green-800'
          }`}>
            {counts.annotated}
          </span>
        </button>
        
        <button
          onClick={() => onFilterChange('estimated')}
          className={`flex items-center gap-2 px-4 py-2 rounded-lg border-2 transition-all font-medium ${
            filter === 'estimated'
              ? 'bg-amber-500 text-white border-amber-500 shadow-md'
              : 'bg-amber-50 text-amber-800 border-amber-300 hover:border-amber-500 hover:bg-amber-100'
          }`}
        >
          <div className="w-3 h-3 bg-amber-400 rounded border-2 border-amber-600" />
          Estimated Only
          <span className={`text-xs px-2 py-0.5 rounded-full font-bold ${
            filter === 'estimated' ? 'bg-amber-400 text-white' : 'bg-amber-200 text-amber-800'
          }`}>
            {counts.estimated}
          </span>
        </button>
      </div>
      
      {filter !== 'all' && (
        <p className="mt-3 text-sm text-gray-500">
          {filter === 'annotated' 
            ? '✓ Showing only values explicitly labeled on the chart (high confidence)'
            : '⚠ Showing only values estimated from axis/gridlines (review recommended)'}
        </p>
      )}
    </div>
  );
}

// Dataset table component with improved presentation
function DatasetTable({ 
  dataset, 
  datasetIndex,
  onUpdateRow,
  filter,
}: { 
  dataset: Dataset;
  datasetIndex: number;
  onUpdateRow: (rowIndex: number, column: string, value: string) => void;
  filter: SourceFilter;
}) {
  const displayColumns = dataset.columns.filter(c => c !== 'source' && c !== 'row_id');
  const typeLabel = dataset.type?.replace(/_/g, ' ') || 'data';
  const typeIcon = getTypeIcon(dataset.type);
  
  // Filter rows based on source
  const filteredRows = useMemo(() => {
    if (filter === 'all') return dataset.rows;
    return dataset.rows.filter(row => row['source'] === filter);
  }, [dataset.rows, filter]);
  
  // Count by source for this dataset
  const annotatedCount = dataset.rows.filter(r => r['source'] === 'annotated').length;
  const estimatedCount = dataset.rows.filter(r => r['source'] === 'estimated').length;
  
  return (
    <div className="bg-white rounded-xl shadow-sm overflow-hidden border border-gray-200">
      {/* Header with clear labeling */}
      <div className="px-5 py-4 bg-gradient-to-r from-blue-50 to-white border-b">
        <div className="flex items-center justify-between">
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
                  {filteredRows.length} rows × {displayColumns.length} columns
                  {filter !== 'all' && ` (filtered from ${dataset.rows.length})`}
                </span>
              </div>
            </div>
          </div>
          
          {/* Quick source stats */}
          <div className="flex items-center gap-2 text-xs font-medium">
            <span className="px-3 py-1.5 bg-green-100 text-green-800 rounded-full border border-green-300">
              ✓ {annotatedCount} annotated
            </span>
            <span className="px-3 py-1.5 bg-amber-100 text-amber-800 rounded-full border border-amber-300">
              ~ {estimatedCount} estimated
            </span>
          </div>
        </div>
      </div>
      
      {/* Table with better styling */}
      <div className="overflow-x-auto">
        {filteredRows.length === 0 ? (
          <div className="text-center py-8 text-gray-500">
            <EyeOff className="w-8 h-8 mx-auto mb-2 opacity-50" />
            <p>No {filter} rows in this dataset</p>
          </div>
        ) : (
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
              {filteredRows.map((row, filteredIndex) => {
                // Find original index for editing
                const originalIndex = dataset.rows.findIndex(r => r === row);
                return (
                  <tr key={filteredIndex} className={`border-b ${filteredIndex % 2 === 0 ? 'bg-white' : 'bg-gray-50'} hover:bg-blue-50 transition-colors`}>
                    <td className="px-4 py-2 text-gray-400 text-xs">
                      {filteredIndex + 1}
                    </td>
                    {displayColumns.map((col) => (
                      <td key={col} className="px-4 py-2">
                        <EditableCell
                          value={row[col] as string | number}
                          onChange={(val) => onUpdateRow(originalIndex, col, val)}
                          source={row['source'] as string | undefined}
                        />
                      </td>
                    ))}
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
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
    sourceFilter,
    setSourceFilter,
    setCurrentStep,
    setHasUnsavedChanges
  } = useAppStore();

  const [datasets, setDatasets] = useState<Dataset[]>(extraction?.datasets || []);
  const [saveStatus, setSaveStatus] = useState<'idle' | 'saving' | 'saved' | 'error'>('idle');
  
  // Debounce timer ref
  const saveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  
  // Persist dataset to backend
  const persistDataset = useCallback(async (dataset: Dataset) => {
    try {
      setSaveStatus('saving');
      await updateDataset(dataset.dataset_id, {
        columns: dataset.columns,
        rows: dataset.rows,
      });
      setSaveStatus('saved');
      setHasUnsavedChanges(false);
      // Reset to idle after 2 seconds
      setTimeout(() => setSaveStatus('idle'), 2000);
    } catch (err) {
      console.error('Failed to save dataset:', err);
      setSaveStatus('error');
      setTimeout(() => setSaveStatus('idle'), 3000);
    }
  }, [setHasUnsavedChanges]);

  // Calculate total counts across all datasets
  const totalCounts = useMemo(() => {
    let all = 0;
    let annotated = 0;
    let estimated = 0;
    
    datasets.forEach(ds => {
      ds.rows.forEach(row => {
        all++;
        if (row['source'] === 'annotated') annotated++;
        else if (row['source'] === 'estimated') estimated++;
      });
    });
    
    return { all, annotated, estimated };
  }, [datasets]);

  const handleUpdateRow = (datasetIndex: number, rowIndex: number, column: string, value: string) => {
    // Mark as having unsaved changes immediately
    setHasUnsavedChanges(true);
    
    setDatasets(prev => {
      const updated = [...prev];
      updated[datasetIndex] = {
        ...updated[datasetIndex],
        rows: updated[datasetIndex].rows.map((row, i) => 
          i === rowIndex ? { ...row, [column]: value } : row
        ),
      };
      
      // Debounced save to backend (1 second delay)
      if (saveTimerRef.current) {
        clearTimeout(saveTimerRef.current);
      }
      saveTimerRef.current = setTimeout(() => {
        persistDataset(updated[datasetIndex]);
      }, 1000);
      
      return updated;
    });
  };
  
  // Cleanup timer on unmount
  useEffect(() => {
    return () => {
      if (saveTimerRef.current) {
        clearTimeout(saveTimerRef.current);
      }
    };
  }, []);

  const handleBack = () => {
    setCurrentStep('identify');
  };

  const handleExport = () => {
    setCurrentStep('export');
  };

  // Keyboard shortcuts
  useKeyboardShortcuts([
    {
      key: 'e',
      ctrl: true,
      description: 'Go to Export',
      action: handleExport,
    },
    {
      key: 'ArrowLeft',
      alt: true,
      description: 'Go back',
      action: handleBack,
    },
  ]);

  // Guard: redirect if no extraction data
  if (!currentFile || !extraction) {
    return (
      <EmptyState
        icon={<FileSpreadsheet className="w-8 h-8 text-gray-400" />}
        title="No Extraction Data"
        description="Complete the identification and extraction steps first to see your data here."
        action={{
          label: 'Go to Identify',
          onClick: handleBack,
        }}
        hint="Select elements from your image and extract their data to review it here."
      />
    );
  }

  return (
    <div className="space-y-4 sm:space-y-6">
      {/* Header - responsive */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="flex items-center gap-3 sm:gap-4">
          <button
            onClick={handleBack}
            className="p-2 hover:bg-gray-100 rounded-lg flex-shrink-0"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div className="min-w-0">
            <h2 className="text-lg sm:text-xl font-semibold text-gray-900">Review Extracted Data</h2>
            <p className="text-xs sm:text-sm text-gray-500 truncate">
              {currentFile.filename} • {datasets.length} dataset{datasets.length > 1 ? 's' : ''} • {extraction.duration_ms}ms
            </p>
          </div>
        </div>
        
        <div className="flex items-center gap-3 sm:gap-4 pl-11 sm:pl-0">
          {/* Save status indicator */}
          {saveStatus === 'saving' && (
            <span className="flex items-center gap-2 text-sm text-blue-600">
              <Loader2 className="w-4 h-4 animate-spin" />
              <span className="hidden sm:inline">Saving...</span>
            </span>
          )}
          {saveStatus === 'saved' && (
            <span className="flex items-center gap-2 text-sm text-green-600">
              <CheckCircle2 className="w-4 h-4" />
              <span className="hidden sm:inline">Saved</span>
            </span>
          )}
          {saveStatus === 'error' && (
            <span className="flex items-center gap-2 text-sm text-red-600">
              <X className="w-4 h-4" />
              <span className="hidden sm:inline">Save failed</span>
            </span>
          )}
          
          <button
            onClick={handleExport}
            className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700"
          >
            <Download className="w-5 h-5" />
            Export
          </button>
        </div>
      </div>

      {/* Source Filter */}
      {totalCounts.annotated > 0 || totalCounts.estimated > 0 ? (
        <SourceFilterBar
          filter={sourceFilter}
          onFilterChange={setSourceFilter}
          counts={totalCounts}
        />
      ) : (
        /* Legacy Legend for datasets without source info */
        <div className="flex items-center gap-6 text-sm bg-white rounded-xl shadow-sm p-4 border border-gray-200">
          <div className="flex items-center gap-2">
            <div className="w-5 h-5 bg-green-100 border-2 border-green-400 rounded" />
            <span className="text-gray-700 font-medium">Annotated (from chart)</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-5 h-5 bg-amber-100 border-2 border-amber-400 rounded" />
            <span className="text-gray-700 font-medium">Estimated (from axis)</span>
          </div>
          <div className="flex items-center gap-2">
            <Edit3 className="w-4 h-4 text-gray-500" />
            <span className="text-gray-600">Click any cell to edit</span>
          </div>
        </div>
      )}

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
              filter={sourceFilter}
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
