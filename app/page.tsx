'use client'

import { useState, useRef, useEffect } from 'react'
import { nanoid } from 'nanoid'
import { Volume2, VolumeX, Send, Loader2, RefreshCw } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardHeader, CardContent, CardFooter } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Message, ConversationContext } from '@/types/chat'
import { sendMessage, transcribeAudio } from './actions'
import { speak, stopSpeaking } from '@/utils/tts'
import { AudioRecorder } from '@/components/audio-recorder'

export default function LanguageBot() {
  const [messages, setMessages] = useState<Message[]>([])
  const [input, setInput] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [isSpeaking, setIsSpeaking] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [isRecordingEnabled, setIsRecordingEnabled] = useState(true)
  const messagesEndRef = useRef<HTMLDivElement>(null)

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }

  useEffect(() => {
    scrollToBottom()
  }, [messages])

  // Add initial greeting when component mounts
  useEffect(() => {
    if (messages.length === 0) {
      const initialGreeting = {
        id: nanoid(),
        role: 'assistant',
        content: "Hi! I'm here to chat and help you practice English. Feel free to start speaking or typing!",
        timestamp: Date.now()
      };
      setMessages([initialGreeting]);
    }
  }, []);

  useEffect(() => {
    // Auto-speak only assistant messages
    const lastMessage = messages[messages.length - 1];
    if (lastMessage && lastMessage.role === 'assistant') {
      handleSpeak(lastMessage.content);
    }
  }, [messages]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!input.trim() || isLoading) return

    await processInput(input)
  }

  async function processInput(inputText: string) {
    const userMessage: Message = {
      id: nanoid(),
      role: 'user',
      content: inputText,
      timestamp: Date.now()
    }

    setMessages(prev => [...prev, userMessage])
    setInput('')
    setIsLoading(true)
    setError(null)

    try {
      const context: ConversationContext = {
        messages: messages.concat(userMessage)
      }

      const response = await sendMessage(inputText, context)
      setMessages(prev => [...prev, response])
      setIsRecordingEnabled(true); // Re-enable recording after getting response
    } catch (error) {
      console.error('Error processing message:', error)
      const errorMessage = error instanceof Error ? error.message : 'An unknown error occurred'
      setError(errorMessage)
    } finally {
      setIsLoading(false)
    }
  }

  const handleAudioSubmit = async (result: any) => {
    setIsRecordingEnabled(false); // Disable recording after submission
    await processInput(result.message);
  }

  function handleSpeak(text: string) {
    if (isSpeaking) {
      stopSpeaking();
    }
    setIsSpeaking(true);
    speak(text, () => setIsSpeaking(false));
  }

  function handleResetConversation() {
    setMessages([])
    setError(null)
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-gray-900 to-gray-800 text-white p-4">
      <Card className="max-w-2xl mx-auto bg-gray-800 border-gray-700">
        <CardHeader className="border-b border-gray-700 px-6 py-4">
          <div className="flex justify-between items-center">
            <h1 className="text-xl font-bold">English Learning Assistant</h1>
            <Button
              onClick={handleResetConversation}
              variant="outline"
              size="icon"
              title="Reset Conversation"
            >
              <RefreshCw className="h-4 w-4" />
            </Button>
          </div>
          <p className="text-sm text-gray-400">Practice your English with AI-powered conversations</p>
        </CardHeader>
        <CardContent className="h-[500px] p-6 overflow-y-auto space-y-4">
          {messages.length === 0 && (
            <div className="text-center text-gray-400 py-8">
              <p>👋 Hello! I'm your English learning assistant.</p>
              <p className="mt-2">Ask me anything or practice your English with me!</p>
            </div>
          )}
          {messages.map((message) => (
            <div
              key={message.id}
              className={`flex gap-2 ${
                message.role === 'user' ? 'justify-end' : 'justify-start'
              }`}
            >
              <div
                className={`p-4 rounded-lg max-w-[80%] ${
                  message.role === 'user'
                    ? 'bg-blue-600 text-white'
                    : 'bg-gray-700 text-gray-100'
                }`}
              >
                <p className="text-sm leading-relaxed">{message.content}</p>
                {message.role === 'assistant' && (
                  <div className="flex items-center gap-2 mt-2 pt-2 border-t border-gray-600">
                    <Button
                      variant="ghost"
                      size="sm"
                      className="text-gray-300 hover:text-white"
                      onClick={() => handleSpeak(message.content)}
                    >
                      {isSpeaking ? (
                        <VolumeX className="h-4 w-4" />
                      ) : (
                        <Volume2 className="h-4 w-4" />
                      )}
                      <span className="ml-2 text-xs">
                        {isSpeaking ? 'Stop' : 'Listen'}
                      </span>
                    </Button>
                  </div>
                )}
              </div>
            </div>
          ))}
          {isLoading && (
            <div className="flex justify-start">
              <div className="bg-gray-700 p-4 rounded-lg">
                <Loader2 className="h-5 w-5 animate-spin text-gray-400" />
              </div>
            </div>
          )}
          {error && (
            <div className="text-red-500 text-sm text-center">
              <p>Error: {error}</p>
              <p>Please try again or refresh the page.</p>
            </div>
          )}
          <div ref={messagesEndRef} />
        </CardContent>
        <CardFooter className="p-4 border-t border-gray-700">
          <form onSubmit={handleSubmit} className="flex gap-2 w-full items-center">
            <Input
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Type your message..."
              className="flex-1 bg-gray-700 border-gray-600 text-white placeholder:text-gray-400"
              disabled={isLoading}
            />
            <div className="flex items-center gap-2">
              {isRecordingEnabled && (
                <AudioRecorder 
                  onAudioSubmit={handleAudioSubmit}
                  expectedText={messages.length > 0 ? messages[messages.length - 1].content : undefined}
                />
              )}
              <Button 
                type="submit" 
                disabled={isLoading || !input.trim()}
                className="bg-blue-600 hover:bg-blue-700"
              >
                {isLoading ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Send className="h-4 w-4" />
                )}
              </Button>
            </div>
          </form>
        </CardFooter>
      </Card>
    </div>
  )
}
