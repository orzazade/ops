import { MCPUnavailableError } from './errors.js';

export interface DataResult<T> {
  data?: T;
  error?: string;
  source: string;
  available: boolean;
}

export async function withGracefulDegradation<T>(
  fetcher: () => Promise<T>,
  source: string
): Promise<DataResult<T>> {
  try {
    const data = await fetcher();
    return { data, source, available: true };
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    console.error(`[ops] ${source} unavailable:`, message);
    return {
      error: message,
      source,
      available: false,
    };
  }
}

export function summarizeAvailability(results: DataResult<unknown>[]): {
  available: string[];
  unavailable: string[];
} {
  return {
    available: results.filter(r => r.available).map(r => r.source),
    unavailable: results.filter(r => !r.available).map(r => r.source),
  };
}
