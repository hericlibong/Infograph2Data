import { useCallback, useEffect } from 'react';
import { useMutation } from '@tanstack/react-query';
import { useAppStore } from '@/store/useAppStore';
import { uploadFile } from '@/api/client';
import { Upload, FileImage, FileText } from 'lucide-react';

export function UploadPage() {
  const setCurrentFile = useAppStore((state) => state.setCurrentFile);
  const setLoading = useAppStore((state) => state.setLoading);

  const uploadMutation = useMutation({
    mutationFn: uploadFile,
    onMutate: () => {
      setLoading(true, 'Uploading file...');
    },
    onSuccess: (file) => {
      setLoading(false);
      setCurrentFile(file);
    },
    onError: () => {
      setLoading(false);
    },
  });

  // Cleanup loading state on unmount
  useEffect(() => {
    return () => setLoading(false);
  }, [setLoading]);

  const handleDrop = useCallback(
    (e: React.DragEvent<HTMLDivElement>) => {
      e.preventDefault();
      const file = e.dataTransfer.files[0];
      if (file) {
        uploadMutation.mutate(file);
      }
    },
    [uploadMutation]
  );

  const handleFileSelect = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (file) {
        uploadMutation.mutate(file);
      }
    },
    [uploadMutation]
  );

  return (
    <div className="max-w-2xl mx-auto">
      <div className="text-center mb-8">
        <h2 className="text-2xl font-semibold text-gray-900 mb-2">
          Upload Your Visual Data
        </h2>
        <p className="text-gray-600">
          Upload an infographic, chart, or PDF to extract structured data.
        </p>
      </div>

      <div
        onDrop={handleDrop}
        onDragOver={(e) => e.preventDefault()}
        className="border-2 border-dashed rounded-xl p-12 text-center transition-colors border-gray-300 hover:border-blue-400 hover:bg-gray-50"
      >
        <Upload className="w-12 h-12 text-gray-400 mx-auto mb-4" />
        <p className="text-gray-600 mb-4">
          Drag and drop a file here, or click to browse
        </p>
        <label className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg cursor-pointer hover:bg-blue-700 transition-colors">
          <span>Select File</span>
          <input
            type="file"
            accept=".pdf,.png,.jpg,.jpeg"
            onChange={handleFileSelect}
            className="hidden"
          />
        </label>
        <div className="mt-6 flex items-center justify-center gap-6 text-sm text-gray-500">
          <span className="flex items-center gap-1">
            <FileImage className="w-4 h-4" />
            PNG, JPG
          </span>
          <span className="flex items-center gap-1">
            <FileText className="w-4 h-4" />
            PDF
          </span>
        </div>
      </div>

      {uploadMutation.isError && (
        <div className="mt-4 p-4 bg-red-50 text-red-700 rounded-lg">
          Upload failed: {uploadMutation.error.message}
        </div>
      )}
    </div>
  );
}
