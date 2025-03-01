import { initLlama } from 'llama.rn';
import { createLlamaConfig } from './config';
import { Platform } from 'react-native';

export class LlamaService {
  private static instance: any = null;
  private static isInitializing: boolean = false;

  static async getInstance(status: (progress: number) => void, modelName: string, n_ctx: number, n_gpu_layers: number, downloadUrl: string) {
    if (!this.instance && !this.isInitializing) {
      // try {
        this.isInitializing = true;
        const config = await createLlamaConfig(status, downloadUrl, modelName, n_ctx, n_gpu_layers);
        this.instance = await initLlama(config);
        this.isInitializing = false;
      // } catch (error) {
      //   this.isInitializing = false;
      //   console.error('Llama initialization failed:', error);
      //   if (__DEV__) {
      //     console.log('Config used:', await createLlamaConfig());
      //     console.log('Platform:', Platform.OS);
      //   }
      // }
    }
    return this.instance;
  }

  static resetInstance() {
    this.instance = null;
    this.isInitializing = false;
  }
} 