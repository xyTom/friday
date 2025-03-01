import React, { useState, useCallback, useEffect, useRef } from 'react';
import { Bubble, GiftedChat, IMessage, BubbleProps } from 'react-native-gifted-chat';
import { LlamaService } from '@/services/llama/context';
import { STOP_WORDS } from '@/services/llama/config';
import { TokenData } from 'llama.rn';
import { View, ActivityIndicator, Text, StyleSheet, Alert } from 'react-native';
import * as FileSystem from 'expo-file-system';
import { Colors } from '@/constants/Colors';
import { SettingsService, ModelSettings } from '@/services/settings';

interface ModelConfig {
  name: string;
  url: string;
  contextSize: number;
  gpuLayers: number;
  localPath: string;
}

const MODEL_NAME = 'DeepSeek-R1-Distill-Qwen-1.5B-Q8_0.gguf';
const DEFAULT_CONFIG: ModelConfig = {
  name: MODEL_NAME,
  url: 'https://storage.lnks.eu.org/DeepSeek-R1-Distill-Qwen-1.5B-Q8_0.gguf',
  contextSize: 131072,
  gpuLayers: 0,
  localPath: `${FileSystem.documentDirectory}models/${MODEL_NAME}`,
};

export function Chat() {
  const [messages, setMessages] = useState<IMessage[]>([]);
  const [llamaContext, setLlamaContext] = useState<any>(null);
  const [loadingProgress, setLoadingProgress] = useState(0);
  const [isLoading, setIsLoading] = useState(false);
  const [settings, setSettings] = useState<ModelSettings>({
    selectedModel: '',
    contextSize: 131072,
    gpuLayers: 0,
  });

  const MODEL_DIR = `${FileSystem.documentDirectory}models/`;

  useEffect(() => {
    loadSettingsAndInitialize();
    setInitialMessage();
  }, []);

  const loadSettingsAndInitialize = async () => {
    try {
      const savedSettings = await SettingsService.getSettings();
      setSettings(savedSettings);
      
      if (savedSettings.selectedModel) {
        const modelPath = `${MODEL_DIR}${savedSettings.selectedModel}`;
        const modelExists = await FileSystem.getInfoAsync(modelPath);
        
        if (modelExists.exists) {
          await initializeLlama({
            modelName: savedSettings.selectedModel,
            modelPath,
            contextSize: savedSettings.contextSize,
            gpuLayers: savedSettings.gpuLayers,
          });
        } else if (savedSettings.selectedModel === DEFAULT_CONFIG.name) {
          // If the selected model is the default model but not downloaded yet
          showModelConfirmation();
        } else {
          Alert.alert(
            'Model Not Found',
            'The selected model was not found. Please check your model settings.',
            [{ text: 'OK' }]
          );
        }
      } else {
        // No model selected, show default model confirmation
        showModelConfirmation();
      }
    } catch (error) {
      console.error('Failed to load settings:', error);
      Alert.alert(
        'Error',
        'Failed to load settings. Using default configuration.',
        [{ text: 'OK' }]
      );
      showModelConfirmation();
    }
  };

  const showModelConfirmation = () => {
    Alert.alert(
      'Download Model',
      `Would you like to download the default language model?\n\nModel: ${DEFAULT_CONFIG.name}\n\nSize: ~2GB\nThis model will be used for AI chat functionality.`,
      [
        {
          text: 'Cancel',
          style: 'cancel',
          onPress: () => {
            console.log('Model download cancelled');
            Alert.alert(
              'Warning',
              'The app requires a language model to function. Please download a model from the settings page.',
              [{ text: 'OK' }]
            );
          },
        },
        {
          text: 'Download',
          onPress: async () => {
            try {
              // Create models directory if it doesn't exist
              const dirInfo = await FileSystem.getInfoAsync(MODEL_DIR);
              if (!dirInfo.exists) {
                await FileSystem.makeDirectoryAsync(MODEL_DIR, { intermediates: true });
              }

              await initializeLlama({
                modelName: DEFAULT_CONFIG.name,
                modelPath: DEFAULT_CONFIG.url,
                contextSize: DEFAULT_CONFIG.contextSize,
                gpuLayers: DEFAULT_CONFIG.gpuLayers,
              });

              // Update settings after successful download
              await SettingsService.saveSettings({
                ...settings,
                selectedModel: DEFAULT_CONFIG.name,
                contextSize: DEFAULT_CONFIG.contextSize,
                gpuLayers: DEFAULT_CONFIG.gpuLayers,
              });
            } catch (error) {
              console.error('Failed to download model:', error);
              Alert.alert(
                'Error',
                'Failed to download the model. Please try again or check your internet connection.',
                [{ text: 'OK' }]
              );
            }
          },
        },
      ],
      { cancelable: false }
    );
  };

  const initializeLlama = async ({
    modelName,
    modelPath,
    contextSize,
    gpuLayers,
  }: {
    modelName: string;
    modelPath: string;
    contextSize: number;
    gpuLayers: number;
  }) => {
    try {
      setIsLoading(true);
      const context = await LlamaService.getInstance(
        (progress) => {
          setLoadingProgress(progress);
        },
        modelName,
        contextSize,
        gpuLayers,
        modelPath
      );
      setLlamaContext(context);
      setIsLoading(false);
    } catch (error) {
      console.error('Init Llama failed:', error);
      setIsLoading(false);
      Alert.alert(
        'Error',
        'Failed to initialize the language model. Please try again.',
        [{ text: 'OK' }]
      );
    }
  };

  const setInitialMessage = () => {
    setMessages([
      {
        _id: 1,
        text: 'Hello! I am an AI assistant. How can I help you?',
        createdAt: new Date(),
        user: {
          _id: 2,
          name: 'A I',
        }, 
      },
    ]);
  };

  const currentText = useRef('');
  const messageIdRef = useRef<string>('');

  const llmcallback = async (data: TokenData) => {
    currentText.current += data.token;
    
    setMessages(previousMessages => 
      previousMessages.map(msg => 
        msg._id === messageIdRef.current
          ? { ...msg, text: currentText.current }
          : msg
      )
    );
  }

  const onSend = useCallback(async (newMessages: IMessage[]) => {
    setMessages(previousMessages =>
      GiftedChat.append(previousMessages, newMessages),
    );
    
    if (llamaContext) {
      try {
        // Create a new message ID for this response
        messageIdRef.current = Math.random().toString();
        currentText.current = '';

        // Add initial AI message
        const initialAiMessage: IMessage = {
          _id: messageIdRef.current,
          text: '',
          createdAt: new Date(),
          user: {
            _id: 2,
            name: 'A I',
          },
        };

        setMessages(previousMessages =>
          GiftedChat.append(previousMessages, [initialAiMessage]),
        );

        const response = await llamaContext.completion({
          messages: [
            {
              role: 'system',
              content: 'You are a friendly AI assistant.',
            },
            {
              role: 'user',
              content: newMessages[0].text,
            },
          ],
          n_predict: 131072,
          stop: STOP_WORDS,
        }, llmcallback);

      } catch (error) {
        console.error('Generate response failed:', error);
      }
    }
  }, [llamaContext]);

  const renderBubble = (props: BubbleProps<IMessage>) => {
    return (
      <Bubble
        {...props}
        wrapperStyle={{
          right: {
            backgroundColor: Colors.light.tint
          }
        }}
      />
    )
  }

  return (
    <View style={styles.container}>
      {isLoading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#0000ff" />
          <Text style={styles.loadingText}>
            Loading Model... {(loadingProgress * 100).toFixed(2)}%
          </Text>
        </View>
      ) : (
        <GiftedChat
          messages={messages}
          onSend={messages => onSend(messages)}
          user={{
            _id: 1,
          }}
          renderBubble={renderBubble}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 10,
    fontSize: 16,
  },
}); 