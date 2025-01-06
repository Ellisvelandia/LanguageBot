export interface Message {
  id: string
  role: 'user' | 'assistant'
  content: string
  timestamp: number
}

export interface ChatResponse {
  role: 'assistant'
  content: string
}

export interface ChatCompletionResponse {
  choices: {
    message: {
      content: string
      role: string
    }
  }[]
}

export interface ConversationContext {
  messages: Message[]
}

