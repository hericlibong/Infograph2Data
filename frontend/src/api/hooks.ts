import { useMutation } from '@tanstack/react-query';
import { identifyElements, runExtraction } from './client';
import type { ExtractionOptions } from '@/types';

export function useIdentify() {
  return useMutation({
    mutationFn: ({ fileId, page }: { fileId: string; page: number }) =>
      identifyElements(fileId, page),
  });
}

export function useExtract() {
  return useMutation({
    mutationFn: ({
      identificationId,
      options,
    }: {
      identificationId: string;
      options: ExtractionOptions;
    }) => runExtraction(identificationId, options),
  });
}
