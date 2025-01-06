'use server'

import { nanoid } from 'nanoid'
import { Message, ConversationContext } from '@/types/chat'

export async function sendMessage(message: string, context: ConversationContext): Promise<Message> {
  if (!process.env.NEXT_PUBLIC_BASE_URL) {
    throw new Error('NEXT_PUBLIC_BASE_URL is not set in environment variables')
  }

  try {
    const response = await fetch(`${process.env.NEXT_PUBLIC_BASE_URL}/api/chat`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ message, context }),
    })

    if (!response.ok) {
      const errorData = await response.json()
      console.error('API Error:', errorData)
      throw new Error(`API responded with status ${response.status}: ${errorData.error || 'Unknown error'}`)
    }

    const data = await response.json()

    if (!data.content) {
      console.error('Empty API response:', data)
      throw new Error('Received empty response from API')
    }

    return {
      id: nanoid(),
      role: 'assistant',
      content: data.content,
      timestamp: Date.now()
    }
  } catch (error) {
    console.error('Error in sendMessage:', error)
    if (error instanceof Error) {
      throw new Error(`SendMessage error: ${error.message}`)
    } else {
      throw new Error('An unknown error occurred in sendMessage')
    }
  }
}

export async function transcribeAudio(base64Audio: string): Promise<string> {
  if (!process.env.NEXT_PUBLIC_BASE_URL) {
    throw new Error('NEXT_PUBLIC_BASE_URL is not set in environment variables')
  }

  try {
    const response = await fetch(`${process.env.NEXT_PUBLIC_BASE_URL}/api/transcribe`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ audio: base64Audio }),
    })

    if (!response.ok) {
      throw new Error(`Transcription failed with status ${response.status}`)
    }

    const data = await response.json()
    return data.text
  } catch (error) {
    console.error('Transcription error:', error)
    throw error
  }
}
