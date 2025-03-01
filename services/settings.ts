import AsyncStorage from '@react-native-async-storage/async-storage';

export interface ModelSettings {
  selectedModel: string;
  contextSize: number;
  gpuLayers: number;
}

const SETTINGS_KEY = 'model_settings';

export class SettingsService {
  static async saveSettings(settings: ModelSettings): Promise<void> {
    try {
      await AsyncStorage.setItem(SETTINGS_KEY, JSON.stringify(settings));
    } catch (error) {
      console.error('Failed to save settings:', error);
      throw error;
    }
  }

  static async getSettings(): Promise<ModelSettings> {
    try {
      const settings = await AsyncStorage.getItem(SETTINGS_KEY);
      if (settings) {
        return JSON.parse(settings);
      }
      // Default settings
      return {
        selectedModel: 'DeepSeek-R1-Distill-Qwen-1.5B-Q8_0.gguf',
        contextSize: 131072,
        gpuLayers: 0,
      };
    } catch (error) {
      console.error('Failed to load settings:', error);
      throw error;
    }
  }
} 