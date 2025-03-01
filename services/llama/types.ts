export interface LlamaMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

export interface LlamaResponse {
  text: string;
  timings?: any;
} 