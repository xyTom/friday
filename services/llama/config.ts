import { Asset } from 'expo-asset';
import * as FileSystem from 'expo-file-system';

const MODEL_FILENAME = 'DeepSeek-R1-Distill-Qwen-1.5B-Q8_0.gguf';
const MODEL_DIR = `${FileSystem.documentDirectory}models/`;

async function loadModel(
  status?: (progress: number) => void,
  downloadUrl?: string,
  modelName?: string
) {
  const modelPath = `${MODEL_DIR}${modelName || MODEL_FILENAME}`;
  const modelExists = await FileSystem.getInfoAsync(modelPath);
  
  if (!modelExists.exists) {
    await FileSystem.makeDirectoryAsync(MODEL_DIR, { intermediates: true });
    
    const finalDownloadUrl = downloadUrl || 'https://storage.lnks.eu.org/DeepSeek-R1-Distill-Qwen-1.5B-Q8_0.gguf';
    
    console.log('Starting download...');
    const downloadResumable = FileSystem.createDownloadResumable(
      finalDownloadUrl,
      modelPath,
      {},
      (downloadProgress) => {
        const progress = downloadProgress.totalBytesWritten / downloadProgress.totalBytesExpectedToWrite;
        console.log(`Download progress: ${(progress * 100).toFixed(2)}%`);
        status?.(progress);
      }
    );

    try {
      const result = await downloadResumable.downloadAsync();
      if (!result) {
        throw new Error('Download failed: No result returned');
      }
      console.log('Model download completed');
      return result.uri;
    } catch (error) {
      console.error('Download failed:', error);
      throw new Error('Model download failed');
    }
  }
  
  return modelPath;
}

export const createLlamaConfig = async (status?: (progress: number) => void, downloadUrl?: string, modelName?: string, n_ctx?: number, n_gpu_layers?: number) => ({
  model: await loadModel(status, downloadUrl, modelName),
  use_mlock: true,
  n_ctx: n_ctx || 131072,
  n_gpu_layers: n_gpu_layers || 0
});

export const STOP_WORDS = [
  '</s>',
  '<|end|>',
  '<|eot_id|>',
  '<|end_of_text|>',
  '<|im_end|>',
  '<|EOT|>',
  '<|END_OF_TURN_TOKEN|>',
  '<|end_of_turn|>',
  '<|endoftext|>',
  '<｜end▁of▁sentence｜>'
]; 