import { useQuery } from '@tanstack/react-query';
import { getHealth } from '@/api/client';
import { CheckCircle, XCircle, Loader2 } from 'lucide-react';

export function Header() {
  const { data: health, isLoading, isError } = useQuery({
    queryKey: ['health'],
    queryFn: getHealth,
    refetchInterval: 30000, // Refresh every 30s
  });

  return (
    <header className="border-b bg-white">
      <div className="container mx-auto px-4 py-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <h1 className="text-xl font-semibold text-gray-900">
            Infograph2Data
          </h1>
          <span className="text-sm text-gray-500">
            Visual Data Extraction
          </span>
        </div>
        
        <div className="flex items-center gap-2 text-sm">
          <span className="text-gray-500">API:</span>
          {isLoading && (
            <Loader2 className="w-4 h-4 text-gray-400 animate-spin" />
          )}
          {isError && (
            <span className="flex items-center gap-1 text-red-600">
              <XCircle className="w-4 h-4" />
              Offline
            </span>
          )}
          {health && (
            <span className="flex items-center gap-1 text-green-600">
              <CheckCircle className="w-4 h-4" />
              {health.status}
            </span>
          )}
        </div>
      </div>
    </header>
  );
}
