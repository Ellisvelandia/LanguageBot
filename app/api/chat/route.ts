import { NextRequest, NextResponse } from 'next/server'
import Groq from "groq-sdk"
import { ConversationContext, Message } from '@/types/chat'

if (!process.env.GROQ_API_KEY) {
  throw new Error('GROQ_API_KEY is not set in environment variables')
}

const groq = new Groq({ apiKey: process.env.GROQ_API_KEY })

export async function POST(req: NextRequest) {
  try {
    const { message, context }: { message: string; context: ConversationContext } = await req.json()

    if (!message) {
      return NextResponse.json({ error: 'Message is required' }, { status: 400 })
    }

    const conversationHistory = context.messages.map((msg: Message) => ({
      role: msg.role,
      content: msg.content
    }))

    const chatCompletion = await groq.chat.completions.create({
      messages: [
        {
          role: 'system',
          content: `You are a friendly and supportive language learning partner having a casual conversation. 
          Your goal is to help users practice and improve their English naturally through engaging dialogue.
          
          Guidelines:
          - Be conversational and natural, like talking to a friend
          - Only correct pronunciation or grammar if it significantly impacts understanding
          - Ask follow-up questions to keep the conversation flowing
          - Share relevant personal experiences or opinions to make the chat more engaging
          - Use a warm and encouraging tone
          - Keep responses concise and natural
          - Avoid mentioning that you're an AI or language tutor
          
          Remember: This is a casual conversation first, language practice second.`
        },
        ...conversationHistory,
        {
          role: 'user',
          content: message
        }
      ],
      model: "llama-3.3-70b-versatile",
      temperature: 0.9,
      max_tokens: 1000,
      top_p: 1,
    })

    const content = chatCompletion.choices[0]?.message?.content

    if (!content) {
      console.error('Empty Groq response:', chatCompletion)
      return NextResponse.json({ error: 'Failed to generate response' }, { status: 500 })
    }

    return NextResponse.json({ content })
  } catch (error) {
    console.error('Error in chat API:', error)
    if (error instanceof Error) {
      return NextResponse.json({ error: `Chat API error: ${error.message}` }, { status: 500 })
    } else {
      return NextResponse.json({ error: 'An unknown error occurred in chat API' }, { status: 500 })
    }
  }
}
