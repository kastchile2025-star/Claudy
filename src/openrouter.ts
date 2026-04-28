import axios from 'axios';
import { ChatRequest, ChatResponse, OpenRouterModel } from './types.js';

const OPENROUTER_BASE_URL = 'https://openrouter.ai/api/v1';

export class OpenRouterClient {
  private apiKey: string;

  constructor(apiKey: string) {
    if (!apiKey) {
      throw new Error('OpenRouter API key is required');
    }
    this.apiKey = apiKey;
  }

  async chat(request: ChatRequest): Promise<ChatResponse> {
    try {
      const response = await axios.post<ChatResponse>(
        `${OPENROUTER_BASE_URL}/chat/completions`,
        {
          model: request.model,
          messages: request.messages,
          max_tokens: request.max_tokens || 2048,
          temperature: request.temperature ?? 0.7,
        },
        {
          headers: {
            Authorization: `Bearer ${this.apiKey}`,
            'HTTP-Referer': 'https://github.com/claudy-ai/claudy',
            'X-Title': 'Claudy',
          },
        }
      );

      return response.data;
    } catch (error) {
      if (axios.isAxiosError(error)) {
        throw new Error(
          `OpenRouter API error: ${error.response?.status} - ${
            error.response?.data?.error?.message || error.message
          }`
        );
      }
      throw error;
    }
  }

  async getModels(): Promise<OpenRouterModel[]> {
    try {
      const response = await axios.get<{
        data: Array<{ id: string; name: string; description?: string }>;
      }>(`${OPENROUTER_BASE_URL}/models`, {
        headers: {
          Authorization: `Bearer ${this.apiKey}`,
        },
      });

      return response.data.data.map((model) => ({
        id: model.id,
        name: model.name,
        description: model.description,
      }));
    } catch (error) {
      if (axios.isAxiosError(error)) {
        throw new Error(
          `Failed to fetch models: ${error.response?.status} - ${error.message}`
        );
      }
      throw error;
    }
  }

  async testConnection(): Promise<boolean> {
    try {
      const response = await axios.get(`${OPENROUTER_BASE_URL}/models`, {
        headers: {
          Authorization: `Bearer ${this.apiKey}`,
        },
      });
      return response.status === 200;
    } catch {
      return false;
    }
  }
}
