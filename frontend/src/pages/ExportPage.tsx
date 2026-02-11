import { useState, useMemo } from 'react';
import { useAppStore } from '@/store/useAppStore';
import { 
  ArrowLeft, 
  Download, 
  FileDown, 
  CheckCircle2, 
  RotateCcw,
  FileText,
  FileJson,
  Package,
  Loader2,
  Filter
} from 'lucide-react';
import { exportDataset } from '@/api/client';
import type { Dataset } from '@/types';

// Dataset summary card
function DatasetSummary({ dataset, index }: { dataset: Dataset; index: number }) {
  const annotatedCount = dataset.rows.filter(r => r['source'] === 'annotated').length;
  const estimatedCount = dataset.rows.filter(r => r['source'] === 'estimated').length;
  
  return (
    <div className="bg-gray-50 rounded-lg p-4 border border-gray-200">
      <div className="flex items-start justify-between">
        <div>
          <h4 className="font-semibold text-gray-800">
            {dataset.title || `Dataset ${index + 1}`}
          </h4>
          <p className="text-sm text-gray-500 mt-1">
            {dataset.rows.length} rows × {dataset.columns.length} columns
          </p>
        </div>
        <span className="text-xs px-2 py-1 bg-blue-100 text-blue-700 rounded-full">
          {dataset.type || 'data'}
        </span>
      </div>
      
      {/* Source breakdown */}
      <div className="flex items-center gap-3 mt-3 text-xs">
        <span className="flex items-center gap-1 px-2 py-1 bg-green-100 text-green-800 rounded-full border border-green-300">
          <CheckCircle2 className="w-3 h-3" />
          {annotatedCount} annotated
        </span>
        <span className="flex items-center gap-1 px-2 py-1 bg-amber-100 text-amber-800 rounded-full border border-amber-300">
          ~ {estimatedCount} estimated
        </span>
      </div>
      
      {/* Column preview */}
      <div className="mt-3 pt-3 border-t border-gray-200">
        <p className="text-xs text-gray-500">
          Columns: {dataset.columns.filter(c => c !== 'source').join(', ')}
        </p>
      </div>
    </div>
  );
}

// Format selector
function FormatSelector({ 
  formats, 
  onChange 
}: { 
  formats: { csv: boolean; json: boolean }; 
  onChange: (key: 'csv' | 'json', value: boolean) => void;
}) {
  return (
    <div className="space-y-3">
      <label className="text-sm font-medium text-gray-700">Export Formats</label>
      <div className="flex items-center gap-4">
        <label className="flex items-center gap-2 cursor-pointer">
          <input
            type="checkbox"
            checked={formats.csv}
            onChange={(e) => onChange('csv', e.target.checked)}
            className="w-4 h-4 text-blue-600 rounded border-gray-300 focus:ring-blue-500"
          />
          <FileText className="w-4 h-4 text-gray-500" />
          <span className="text-sm text-gray-700">CSV</span>
        </label>
        
        <label className="flex items-center gap-2 cursor-pointer">
          <input
            type="checkbox"
            checked={formats.json}
            onChange={(e) => onChange('json', e.target.checked)}
            className="w-4 h-4 text-blue-600 rounded border-gray-300 focus:ring-blue-500"
          />
          <FileJson className="w-4 h-4 text-gray-500" />
          <span className="text-sm text-gray-700">JSON</span>
        </label>
      </div>
      
      {!formats.csv && !formats.json && (
        <p className="text-xs text-amber-600">
          Select at least one format to export
        </p>
      )}
    </div>
  );
}

export function ExportPage() {
  const { 
    currentFile, 
    extraction,
    sourceFilter,
    reset,
    setCurrentStep 
  } = useAppStore();

  const [formats, setFormats] = useState({ csv: true, json: true });
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const datasets = extraction?.datasets || [];

  // Calculate totals (considering the source filter)
  const totals = useMemo(() => {
    let rows = 0;
    let annotated = 0;
    let estimated = 0;
    let filteredRows = 0;
    
    datasets.forEach(ds => {
      ds.rows.forEach(row => {
        rows++;
        if (row['source'] === 'annotated') {
          annotated++;
          if (sourceFilter === 'all' || sourceFilter === 'annotated') filteredRows++;
        } else if (row['source'] === 'estimated') {
          estimated++;
          if (sourceFilter === 'all' || sourceFilter === 'estimated') filteredRows++;
        } else {
          // Rows without source info
          filteredRows++;
        }
      });
    });
    
    return { rows, annotated, estimated, filteredRows };
  }, [datasets, sourceFilter]);

  const handleFormatChange = (key: 'csv' | 'json', value: boolean) => {
    setFormats(prev => ({ ...prev, [key]: value }));
    setError(null);
  };

  const handleDownload = async (datasetId: string, datasetTitle: string) => {
    if (!formats.csv && !formats.json) {
      setError('Please select at least one format');
      return;
    }

    setLoading(true);
    setError(null);
    
    try {
      const selectedFormats: string[] = [];
      if (formats.csv) selectedFormats.push('csv');
      if (formats.json) selectedFormats.push('json');
      
      const blob = await exportDataset(datasetId, selectedFormats, sourceFilter);
      
      // Create download link
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${datasetTitle || datasetId}.zip`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      window.URL.revokeObjectURL(url);
      
      setSuccess(true);
    } catch (err) {
      console.error('Export failed:', err);
      setError('Export failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleStartNew = () => {
    reset();
  };

  const handleBackToReview = () => {
    setCurrentStep('review');
  };

  if (!extraction || datasets.length === 0) {
    return (
      <div className="max-w-2xl mx-auto p-8 text-center">
        <Package className="w-16 h-16 mx-auto text-gray-300 mb-4" />
        <h2 className="text-xl font-semibold text-gray-700 mb-2">No Data to Export</h2>
        <p className="text-gray-500 mb-6">
          Please complete the extraction process first.
        </p>
        <button
          onClick={handleStartNew}
          className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
        >
          Start New Extraction
        </button>
      </div>
    );
  }

  return (
    <div className="max-w-3xl mx-auto p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <button
          onClick={handleBackToReview}
          className="flex items-center gap-2 text-gray-600 hover:text-gray-800"
        >
          <ArrowLeft className="w-4 h-4" />
          Back to Review
        </button>
      </div>

      {/* Main export card */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 space-y-6">
        {/* Title */}
        <div className="flex items-center gap-3">
          <div className="p-3 bg-blue-100 rounded-lg">
            <FileDown className="w-6 h-6 text-blue-600" />
          </div>
          <div>
            <h2 className="text-xl font-semibold text-gray-800">Export Dataset</h2>
            <p className="text-sm text-gray-500">
              Download your extracted data as CSV and/or JSON
            </p>
          </div>
        </div>

        {/* Source info */}
        <div className="bg-gray-50 rounded-lg p-4">
          <p className="text-sm text-gray-600">
            <span className="font-medium">Source:</span> {currentFile?.filename || 'Unknown file'}
          </p>
          <p className="text-sm text-gray-600 mt-1">
            <span className="font-medium">Extracted:</span> {datasets.length} dataset{datasets.length > 1 ? 's' : ''}, {totals.rows} rows total
          </p>
        </div>

        {/* Source filter indicator */}
        {sourceFilter !== 'all' && (
          <div className={`p-4 rounded-lg border-2 ${
            sourceFilter === 'annotated' 
              ? 'bg-green-50 border-green-300 text-green-800' 
              : 'bg-amber-50 border-amber-300 text-amber-800'
          }`}>
            <div className="flex items-center gap-2 font-medium">
              <Filter className="w-4 h-4" />
              Exporting {sourceFilter} data only
            </div>
            <p className="text-sm mt-1 opacity-80">
              {totals.filteredRows} of {totals.rows} rows will be exported
            </p>
          </div>
        )}

        {/* Dataset summaries */}
        <div className="space-y-3">
          <h3 className="text-sm font-medium text-gray-700">Datasets</h3>
          {datasets.map((dataset, index) => (
            <DatasetSummary key={dataset.dataset_id} dataset={dataset} index={index} />
          ))}
        </div>

        {/* Divider */}
        <hr className="border-gray-200" />

        {/* Format selector */}
        <FormatSelector formats={formats} onChange={handleFormatChange} />

        {/* Error message */}
        {error && (
          <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">
            {error}
          </div>
        )}

        {/* Success message */}
        {success && (
          <div className="p-4 bg-green-50 border border-green-200 rounded-lg">
            <div className="flex items-center gap-2 text-green-700">
              <CheckCircle2 className="w-5 h-5" />
              <span className="font-medium">Export successful!</span>
            </div>
            <p className="text-sm text-green-600 mt-1">
              Your ZIP file has been downloaded. It contains:
            </p>
            <ul className="text-sm text-green-600 mt-2 ml-6 list-disc">
              {formats.csv && <li>data.csv — Tabular data</li>}
              {formats.json && <li>data.json — Structured data</li>}
              <li>manifest.json — Full provenance (source, extraction date, edits)</li>
            </ul>
          </div>
        )}

        {/* Download buttons */}
        <div className="space-y-3">
          {datasets.length === 1 ? (
            <button
              onClick={() => handleDownload(datasets[0].dataset_id, datasets[0].title || 'export')}
              disabled={loading || (!formats.csv && !formats.json)}
              className="w-full flex items-center justify-center gap-2 px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors font-medium"
            >
              {loading ? (
                <>
                  <Loader2 className="w-5 h-5 animate-spin" />
                  Preparing download...
                </>
              ) : (
                <>
                  <Download className="w-5 h-5" />
                  Download ZIP
                </>
              )}
            </button>
          ) : (
            <>
              {datasets.map((dataset, index) => (
                <button
                  key={dataset.dataset_id}
                  onClick={() => handleDownload(dataset.dataset_id, dataset.title || `dataset-${index + 1}`)}
                  disabled={loading || (!formats.csv && !formats.json)}
                  className="w-full flex items-center justify-center gap-2 px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors"
                >
                  {loading ? (
                    <Loader2 className="w-5 h-5 animate-spin" />
                  ) : (
                    <Download className="w-5 h-5" />
                  )}
                  Download {dataset.title || `Dataset ${index + 1}`}
                </button>
              ))}
            </>
          )}
        </div>

        {/* Info note */}
        <div className="flex items-start gap-2 p-3 bg-blue-50 rounded-lg text-sm text-blue-700">
          <Package className="w-4 h-4 mt-0.5 flex-shrink-0" />
          <p>
            The ZIP includes a <code className="px-1 py-0.5 bg-blue-100 rounded">manifest.json</code> with 
            full provenance: source file, extraction date, confidence scores, and edit history.
          </p>
        </div>
      </div>

      {/* Start new extraction */}
      <div className="text-center">
        <button
          onClick={handleStartNew}
          className="flex items-center gap-2 mx-auto px-4 py-2 text-gray-600 hover:text-gray-800 hover:bg-gray-100 rounded-lg transition-colors"
        >
          <RotateCcw className="w-4 h-4" />
          Start New Extraction
        </button>
      </div>
    </div>
  );
}
