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

  useEffect(() => {
    if (typeof window !== 'undefined') {
      const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition
      if (SpeechRecognition) {
        recognitionRef.current = new SpeechRecognition()
        
        const handleRecognitionResult = (event: SpeechRecognitionEvent) => {
          const result = event.results[event.results.length - 1]
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
            setIsProcessing(true);
          }
        }

        recognitionRef.current.continuous = true
        recognitionRef.current.interimResults = true
        
        recognitionRef.current.onresult = handleRecognitionResult

        recognitionRef.current.onerror = (event: SpeechRecognitionErrorEvent) => {
          console.error('Speech recognition error:', event.error)
          setIsRecording(false)
          setIsProcessing(false)
        }
      }
    }
  }, [onAudioSubmit, expectedText])

  const startRecording = () => {
    setIsRecording(true)
    setIsProcessing(false)
    recognitionRef.current?.start()
  }

  const stopRecording = () => {
    setIsRecording(false)
    recognitionRef.current?.stop()
  }

  return (
    <div className="flex items-center gap-2">
      {!isRecording ? (
        <Button
          onClick={startRecording}
          variant="outline"
          size="icon"
          className="h-8 w-8"
          disabled={isProcessing}
        >
          <Volume2 className="h-4 w-4" />
        </Button>
      ) : (
        <Button
          onClick={stopRecording}
          variant="outline"
          size="icon"
          className="h-8 w-8 bg-red-500 hover:bg-red-600"
        >
          <VolumeX className="h-4 w-4" />
        </Button>
      )}
    </div>
  )
}
