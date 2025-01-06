let currentUtterance: SpeechSynthesisUtterance | null = null;

export function speak(text: string, onEnd?: () => void) {
  if (!window.speechSynthesis) return;
  
  stopSpeaking();
  
  const utterance = new SpeechSynthesisUtterance(text);
  utterance.rate = 0.9; // Slightly slower for better clarity
  utterance.pitch = 1;
  
  if (onEnd) {
    utterance.onend = onEnd;
  }
  
  currentUtterance = utterance;
  window.speechSynthesis.speak(utterance);
}

export function stopSpeaking() {
  if (window.speechSynthesis) {
    window.speechSynthesis.cancel();
  }
  if (currentUtterance) {
    currentUtterance = null;
  }
}
