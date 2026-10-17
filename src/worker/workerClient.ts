// worker/workerClient.ts
import type { CompileOptions, CompilationResult } from '../types/canvas';
import { compileContext } from './contextCompiler';

class WorkerCompilerClient {
  private worker: Worker | null = null;
  private pendingCallbacks: Map<
    string,
    {
      resolve: (res: CompilationResult) => void;
      reject: (err: Error) => void;
    }
  > = new Map();
  private reqIdCounter = 0;

  constructor() {
    this.initWorker();
  }

  private initWorker() {
    if (typeof window !== 'undefined' && typeof Worker !== 'undefined') {
      try {
        this.worker = new Worker(
          new URL('./contextCompiler.worker.ts', import.meta.url),
          { type: 'module' }
        );

        this.worker.onmessage = (
          e: MessageEvent<{ id: string; success: boolean; result?: CompilationResult; error?: string }>
        ) => {
          const { id, success, result, error } = e.data;
          const handler = this.pendingCallbacks.get(id);
          if (handler) {
            this.pendingCallbacks.delete(id);
            if (success && result) {
              handler.resolve(result);
            } else {
              handler.reject(new Error(error || 'Worker compilation failed'));
            }
          }
        };

        this.worker.onerror = (err) => {
          console.error('[WebWorker] contextCompiler worker error:', err);
        };
      } catch (e) {
        console.warn('[WebWorker] Failed to initialize worker, falling back to main-thread execution', e);
        this.worker = null;
      }
    }
  }

  public async compile(options: CompileOptions): Promise<CompilationResult> {
    if (!this.worker) {
      // Main-thread synchronous execution fallback
      return Promise.resolve(compileContext(options));
    }

    const id = `req_${++this.reqIdCounter}_${Date.now()}`;
    return new Promise((resolve, reject) => {
      this.pendingCallbacks.set(id, { resolve, reject });
      this.worker!.postMessage({ id, type: 'COMPILE', payload: options });

      // Safety timeout
      setTimeout(() => {
        if (this.pendingCallbacks.has(id)) {
          this.pendingCallbacks.delete(id);
          // fallback to synchronous
          resolve(compileContext(options));
        }
      }, 500);
    });
  }
}

export const compilerClient = new WorkerCompilerClient();
