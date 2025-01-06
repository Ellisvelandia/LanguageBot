'use client'

import React, { useState, useRef, useEffect } from 'react'
import { Volume2, VolumeX } from 'lucide-react'
import { Button } from '@/components/ui/button'
import stringSimilarity from 'string-similarity';

// Add type declarations for Web Speech API
declare global {
  interface Window {
    SpeechRecognition: typeof SpeechRecognition;
    webkitSpeechRecognition: typeof SpeechRecognition;
  }
}

interface SpeechRecognitionEvent extends Event {
  results: SpeechRecognitionResultList;
  resultIndex: number;
  emma: Document | null;
}

interface SpeechRecognitionResultList {
  length: number;
  item(index: number): SpeechRecognitionResult | null;
  [index: number]: SpeechRecognitionResult;
}

interface SpeechRecognitionResult {
  isConfident: boolean;
  isFinal: boolean;
  isInterim: boolean;
  length: number;
  item(index: number): SpeechRecognitionAlternative | null;
  [index: number]: SpeechRecognitionAlternative;
}

interface SpeechRecognitionAlternative {
  confidence: number;
  transcript: string;
}

interface SpeechRecognitionErrorEvent extends Event {
  error: string;
  message?: string;
}

interface SpeechRecognition extends EventTarget {
  continuous: boolean;
  interimResults: boolean;
  lang: string;
  maxAlternatives: number;
  onaudioend: ((this: SpeechRecognition, ev: Event) => any) | null;
  onaudiostart: ((this: SpeechRecognition, ev: Event) => any) | null;
  onend: ((this: SpeechRecognition, ev: Event) => any) | null;
  onerror: ((this: SpeechRecognition, ev: SpeechRecognitionErrorEvent) => any) | null;
  onnomatch: ((this: SpeechRecognition, ev: Event) => any) | null;
  onresult: ((this: SpeechRecognition, ev: SpeechRecognitionEvent) => any) | null;
  onsoundend: ((this: SpeechRecognition, ev: Event) => any) | null;
  onsoundstart: ((this: SpeechRecognition, ev: Event) => any) | null;
  onspeechend: ((this: SpeechRecognition, ev: Event) => any) | null;
  onspeechstart: ((this: SpeechRecognition, ev: Event) => any) | null;
  onstart: ((this: SpeechRecognition, ev: Event) => any) | null;
  start(): void;
  stop(): void;
  abort(): void;
}

declare var SpeechRecognition: {
  prototype: SpeechRecognition;
  new(): SpeechRecognition;
};

interface PronunciationResult {
  transcript: string;
  confidence: number;
  pronunciationScore: number;
  message: string;
}

interface AudioRecorderProps {
  onAudioSubmit: (result: PronunciationResult) => void
  expectedText?: string
}

const calculatePronunciationScore = (transcript: string, expected?: string): number => {
  if (!expected) return 1.0;
  return stringSimilarity.compareTwoStrings(
    transcript.toLowerCase().trim(),
    expected.toLowerCase().trim()
  );
};

export function AudioRecorder({ onAudioSubmit, expectedText }: AudioRecorderProps) {
  const [isRecording, setIsRecording] = useState(false)
  const [isProcessing, setIsProcessing] = useState(false)
  const recognitionRef = useRef<SpeechRecognition | null>(null)
  const silenceTimeoutRef = useRef<NodeJS.Timeout | null>(null)
  const lastSpeechRef = useRef<number>(Date.now())

  useEffect(() => {
    if (typeof window !== 'undefined') {
      const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition
      if (SpeechRecognition) {
        recognitionRef.current = new SpeechRecognition()
        recognitionRef.current.continuous = true
        recognitionRef.current.interimResults = true
        
        const handleRecognitionResult = (event: SpeechRecognitionEvent) => {
          lastSpeechRef.current = Date.now() // Reset silence timer when speech is detected
          const result = event.results[event.results.length - 1]
          
          // Clear any existing silence timeout
          if (silenceTimeoutRef.current) {
            clearTimeout(silenceTimeoutRef.current)
          }
          
          if (result.isFinal) {
            const transcript = result[0].transcript
            const confidence = result[0].confidence
            const pronunciationScore = calculatePronunciationScore(transcript, expectedText)
            
            let message = transcript

            // Only add feedback if there are significant pronunciation issues
            if (pronunciationScore < 0.6 && expectedText) {
              message = `${transcript} (I noticed some pronunciation differences. Did you mean "${expectedText}"?)`
            }

            onAudioSubmit({ transcript, confidence, pronunciationScore, message })
            setIsProcessing(true)
          }

          // Set a new silence timeout
          silenceTimeoutRef.current = setTimeout(() => {
            if (isRecording && Date.now() - lastSpeechRef.current >= 5000) {
              console.log('Silence detected - stopping recording')
              stopRecording()
            }
          }, 5000)
        }

        recognitionRef.current.onresult = handleRecognitionResult

        recognitionRef.current.onspeechstart = () => {
          lastSpeechRef.current = Date.now()
          // Clear any existing silence timeout
          if (silenceTimeoutRef.current) {
            clearTimeout(silenceTimeoutRef.current)
          }
        }

        recognitionRef.current.onspeechend = () => {
          // Start silence detection timer
          if (silenceTimeoutRef.current) {
            clearTimeout(silenceTimeoutRef.current)
          }
          silenceTimeoutRef.current = setTimeout(() => {
            if (isRecording && Date.now() - lastSpeechRef.current >= 5000) {
              console.log('Silence detected - stopping recording')
              stopRecording()
            }
          }, 5000)
        }

        recognitionRef.current.onerror = (event: SpeechRecognitionErrorEvent) => {
          console.error('Speech recognition error:', event.error)
          
          // Handle different types of errors
          switch (event.error) {
            case 'aborted':
              // Clean stop of recording
              setIsRecording(false)
              break
            case 'no-speech':
              console.log('No speech detected. Please try speaking again.')
              setIsRecording(false)
              break
            case 'network':
              console.error('Network error occurred')
              setIsRecording(false)
              break
            case 'not-allowed':
              console.error('Microphone access denied')
              setIsRecording(false)
              break
            default:
              console.error('Speech recognition error:', event.error)
              setIsRecording(false)
          }
          setIsProcessing(false)
        }

        recognitionRef.current.onend = () => {
          // Always ensure recording state is false when recognition ends
          setIsRecording(false)
          if (!isProcessing) {
            // If we're not processing a final result, reset processing state
            setIsProcessing(false)
          }
          // Clear any existing silence timeout
          if (silenceTimeoutRef.current) {
            clearTimeout(silenceTimeoutRef.current)
          }
        }
      }
    }

    // Cleanup function
    return () => {
      if (recognitionRef.current) {
        try {
          recognitionRef.current.stop()
        } catch (error) {
          console.error('Error stopping recognition on cleanup:', error)
        }
      }
      // Clear any existing silence timeout
      if (silenceTimeoutRef.current) {
        clearTimeout(silenceTimeoutRef.current)
      }
    }
  }, [onAudioSubmit, expectedText, isRecording])

  const startRecording = () => {
    try {
      if (recognitionRef.current) {
        setIsRecording(true)
        setIsProcessing(false)
        lastSpeechRef.current = Date.now()
        recognitionRef.current.start()
      }
    } catch (error) {
      console.error('Failed to start recording:', error)
      setIsRecording(false)
      setIsProcessing(false)
    }
  }

  const stopRecording = () => {
    try {
      if (recognitionRef.current) {
        recognitionRef.current.stop()
        setIsRecording(false)
        // Clear any existing silence timeout
        if (silenceTimeoutRef.current) {
          clearTimeout(silenceTimeoutRef.current)
        }
      }
    } catch (error) {
      console.error('Failed to stop recording:', error)
      setIsRecording(false)
    }
  }

  return (
    <Button
      onClick={isRecording ? stopRecording : startRecording}
      className={`${isRecording ? 'bg-red-500 hover:bg-red-600' : 'bg-blue-500 hover:bg-blue-600'} transition-colors`}
      disabled={isProcessing}
    >
      {isRecording ? (
        <VolumeX className="h-4 w-4" />
      ) : (
        <Volume2 className="h-4 w-4" />
      )}
    </Button>
  )
}
