import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TextInput,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
} from 'react-native';
import * as FileSystem from 'expo-file-system';
import { ExtendedFileInfo } from '@/types/FileSystem';
import { SettingsService, ModelSettings as ModelSettingsType } from '@/services/settings';

interface ModelInfo {
  name: string;
  size: number;
  modificationTime: number;
}

export function ModelSettings() {
  const [localModels, setLocalModels] = useState<ModelInfo[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [newModelUrl, setNewModelUrl] = useState('');
  const [settings, setSettings] = useState<ModelSettingsType>({
    selectedModel: '',
    contextSize: 131072,
    gpuLayers: 0,
  });
  const [downloadProgress, setDownloadProgress] = useState(0);
  const [isDownloading, setIsDownloading] = useState(false);

  const MODEL_DIR = `${FileSystem.documentDirectory}models/`;

  useEffect(() => {
    loadLocalModels();
    loadSettings();
  }, []);

  const loadSettings = async () => {
    try {
      const savedSettings = await SettingsService.getSettings();
      setSettings(savedSettings);
    } catch (error) {
      console.error('Failed to load settings:', error);
    }
  };

  const saveSettings = async () => {
    try {
      await SettingsService.saveSettings(settings);
      Alert.alert('Success', 'Settings saved successfully');
    } catch (error) {
      Alert.alert('Error', 'Failed to save settings');
    }
  };

  const loadLocalModels = async () => {
    try {
      setIsLoading(true);
      const dirInfo = await FileSystem.getInfoAsync(MODEL_DIR);
      
      if (!dirInfo.exists) {
        await FileSystem.makeDirectoryAsync(MODEL_DIR, { intermediates: true });
        setLocalModels([]);
        return;
      }

      const files = await FileSystem.readDirectoryAsync(MODEL_DIR);
      const modelInfos = await Promise.all(
        files.map(async (filename) => {
          const fileInfo = await FileSystem.getInfoAsync(MODEL_DIR + filename) as ExtendedFileInfo;
          return {
            name: filename,
            size: fileInfo.size || 0,
            modificationTime: fileInfo.modificationTime || 0,
          };
        })
      );

      setLocalModels(modelInfos);
    } catch (error) {
      Alert.alert('Error', 'Failed to load local models');
      console.error('Load local models failed:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const downloadModel = async () => {
    if (!newModelUrl) {
      Alert.alert('Error', 'Please enter a model URL');
      return;
    }

    const modelName = newModelUrl.split('/').pop();
    if (!modelName) {
      Alert.alert('Error', 'Invalid model URL');
      return;
    }

    try {
      setIsDownloading(true);
      const modelPath = `${MODEL_DIR}${modelName}`;

      const downloadResumable = FileSystem.createDownloadResumable(
        newModelUrl,
        modelPath,
        {},
        (downloadProgress) => {
          const progress = downloadProgress.totalBytesWritten / downloadProgress.totalBytesExpectedToWrite;
          setDownloadProgress(progress);
        }
      );

      await downloadResumable.downloadAsync();
      await loadLocalModels();
      setNewModelUrl('');
      Alert.alert('Success', 'Model downloaded successfully');
    } catch (error) {
      Alert.alert('Error', 'Failed to download model');
      console.error('Download failed:', error);
    } finally {
      setIsDownloading(false);
      setDownloadProgress(0);
    }
  };

  const deleteModel = async (modelName: string) => {
    Alert.alert(
      'Confirm Delete',
      `Are you sure you want to delete ${modelName}?`,
      [
        {
          text: 'Cancel',
          style: 'cancel',
        },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              await FileSystem.deleteAsync(MODEL_DIR + modelName);
              await loadLocalModels();
              Alert.alert('Success', 'Model deleted successfully');
            } catch (error) {
              Alert.alert('Error', 'Failed to delete model');
              console.error('Delete failed:', error);
            }
          },
        },
      ]
    );
  };

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return `${(bytes / Math.pow(k, i)).toFixed(2)} ${sizes[i]}`;
  };

  const selectModel = (modelName: string) => {
    setSettings(prev => ({
      ...prev,
      selectedModel: modelName,
    }));
  };

  const updateContextSize = (value: string) => {
    const size = parseInt(value) || 131072;
    setSettings(prev => ({
      ...prev,
      contextSize: size,
    }));
  };

  const updateGpuLayers = (value: string) => {
    const layers = parseInt(value) || 0;
    setSettings(prev => ({
      ...prev,
      gpuLayers: layers,
    }));
  };

  return (
    <ScrollView style={styles.container}>
      <Text style={styles.title}>Model Settings</Text>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Model Parameters</Text>
        <View style={styles.inputContainer}>
          <Text style={styles.label}>Context Size</Text>
          <TextInput
            style={styles.input}
            value={settings.contextSize.toString()}
            onChangeText={updateContextSize}
            keyboardType="numeric"
            placeholder="Enter context size"
          />
        </View>
        <View style={styles.inputContainer}>
          <Text style={styles.label}>GPU Layers</Text>
          <TextInput
            style={styles.input}
            value={settings.gpuLayers.toString()}
            onChangeText={updateGpuLayers}
            keyboardType="numeric"
            placeholder="Enter GPU layers"
          />
        </View>
        <TouchableOpacity style={styles.button} onPress={saveSettings}>
          <Text style={styles.buttonText}>Save Settings</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Download New Model</Text>
        <View style={styles.inputContainer}>
          <TextInput
            style={styles.input}
            value={newModelUrl}
            onChangeText={setNewModelUrl}
            placeholder="Enter model URL"
          />
          <TouchableOpacity
            style={styles.button}
            onPress={downloadModel}
            disabled={isDownloading}
          >
            <Text style={styles.buttonText}>Download</Text>
          </TouchableOpacity>
        </View>
        {isDownloading && (
          <View style={styles.progressContainer}>
            <ActivityIndicator size="small" color="#0000ff" />
            <Text style={styles.progressText}>
              Downloading... {(downloadProgress * 100).toFixed(2)}%
            </Text>
          </View>
        )}
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Local Models</Text>
        {isLoading ? (
          <ActivityIndicator size="large" color="#0000ff" />
        ) : localModels.length === 0 ? (
          <Text style={styles.emptyText}>No models found</Text>
        ) : (
          localModels.map((model) => (
            <View key={model.name} style={styles.modelItem}>
              <View style={styles.modelInfo}>
                <Text style={styles.modelName}>{model.name}</Text>
                <Text style={styles.modelSize}>
                  Size: {formatFileSize(model.size)}
                </Text>
                <TouchableOpacity
                  style={[
                    styles.selectButton,
                    model.name === settings.selectedModel && styles.selectedButton,
                  ]}
                  onPress={() => selectModel(model.name)}
                >
                  <Text style={[
                    styles.selectButtonText,
                    model.name === settings.selectedModel && styles.selectedButtonText,
                  ]}>
                    {model.name === settings.selectedModel ? 'Selected' : 'Select'}
                  </Text>
                </TouchableOpacity>
              </View>
              <TouchableOpacity
                style={[styles.button, styles.deleteButton]}
                onPress={() => deleteModel(model.name)}
              >
                <Text style={[styles.buttonText, styles.deleteButtonText]}>
                  Delete
                </Text>
              </TouchableOpacity>
            </View>
          ))
        )}
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 16,
    backgroundColor: '#f5f5f5',
  },
  title: {
    fontSize: 28,
    fontWeight: '500',
    marginBottom: 24,
    color: '#1a1a1a',
  },
  section: {
    marginBottom: 24,
    backgroundColor: '#ffffff',
    borderRadius: 4,
    padding: 16,
    elevation: 1,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.2,
    shadowRadius: 3,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: '500',
    marginBottom: 16,
    color: '#1a1a1a',
  },
  inputContainer: {
    marginBottom: 16,
  },
  label: {
    fontSize: 14,
    marginBottom: 8,
    color: '#666666',
    fontWeight: '500',
  },
  input: {
    borderWidth: 1,
    borderColor: '#e0e0e0',
    borderRadius: 4,
    padding: 12,
    fontSize: 16,
    backgroundColor: '#f8f8f8',
  },
  button: {
    backgroundColor: '#0a7ea4',
    padding: 12,
    borderRadius: 4,
    alignItems: 'center',
    marginTop: 8,
    elevation: 1,
  },
  buttonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '500',
    letterSpacing: 0.5,
  },
  progressContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 12,
  },
  progressText: {
    marginLeft: 12,
    fontSize: 14,
    color: '#666666',
  },
  modelItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    backgroundColor: '#f8f8f8',
    borderRadius: 4,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#e0e0e0',
  },
  modelInfo: {
    flex: 1,
  },
  modelName: {
    fontSize: 16,
    fontWeight: '500',
    color: '#1a1a1a',
  },
  modelSize: {
    fontSize: 14,
    color: '#666666',
    marginTop: 4,
  },
  deleteButton: {
    backgroundColor: '#d32f2f',
    marginTop: 0,
    marginLeft: 12,
    paddingHorizontal: 16,
    borderRadius: 4,
  },
  deleteButtonText: {
    color: '#fff',
  },
  emptyText: {
    fontSize: 16,
    color: '#666666',
    textAlign: 'center',
    marginTop: 16,
  },
  selectButton: {
    backgroundColor: 'transparent',
    padding: 8,
    borderRadius: 2,
    alignItems: 'center',
    marginTop: 8,
    borderWidth: 2,
    borderColor: '#0a7ea4',
  },
  selectedButton: {
    backgroundColor: '#0a7ea4',
  },
  selectButtonText: {
    color: '#0a7ea4',
    fontSize: 14,
    fontWeight: '500',
    letterSpacing: 0.5,
  },
  selectedButtonText: {
    color: '#fff',
  },
}); 