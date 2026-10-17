// worker/contextCompiler.worker.ts
import { compileContext } from './contextCompiler';
import type { CompileOptions } from '../types/canvas';

self.onmessage = (e: MessageEvent<{ id: string; type: 'COMPILE'; payload: CompileOptions }>) => {
  const { id, type, payload } = e.data;
  if (type === 'COMPILE') {
    try {
      const result = compileContext(payload);
      self.postMessage({ id, success: true, result });
    } catch (err: unknown) {
      const errorMessage = err instanceof Error ? err.message : String(err);
      self.postMessage({ id, success: false, error: errorMessage });
    }
  }
};
