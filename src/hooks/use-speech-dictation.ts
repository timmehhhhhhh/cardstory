"use client";

import * as React from "react";

/**
 * Minimal surface of the Web Speech API's SpeechRecognition we rely on —
 * TypeScript's DOM lib doesn't ship types for it (it's still non-standard),
 * and browser support is inconsistent (solid in Chrome/Edge desktop and
 * Android Chrome; absent or flag-gated in Safari/iOS as of this writing).
 * `supported` below is the feature-detection callers must check before
 * showing any mic affordance at all.
 */
interface SpeechRecognitionResultLike {
  isFinal: boolean;
  0: { transcript: string };
}
interface SpeechRecognitionEventLike {
  resultIndex: number;
  results: ArrayLike<SpeechRecognitionResultLike>;
}
interface SpeechRecognitionLike extends EventTarget {
  lang: string;
  continuous: boolean;
  interimResults: boolean;
  start: () => void;
  stop: () => void;
  onresult: ((event: SpeechRecognitionEventLike) => void) | null;
  onerror: (() => void) | null;
  onend: (() => void) | null;
}

function getSpeechRecognitionCtor(): (new () => SpeechRecognitionLike) | null {
  if (typeof window === "undefined") return null;
  const w = window as unknown as {
    SpeechRecognition?: new () => SpeechRecognitionLike;
    webkitSpeechRecognition?: new () => SpeechRecognitionLike;
  };
  return w.SpeechRecognition ?? w.webkitSpeechRecognition ?? null;
}

/**
 * Wraps the browser's built-in speech-to-text for the mobile search
 * dictation toggle. There's no cross-browser way to bias recognition
 * toward a custom vocabulary (SpeechGrammarList is effectively dead), so
 * this only does raw transcription — callers are expected to pair it with
 * a live fuzzy-suggestions list (see MobileSearchSheet) that lets the user
 * correct whatever the recognizer mis-hears against real card/player names.
 */
export function useSpeechDictation() {
  const [listening, setListening] = React.useState(false);
  const [transcript, setTranscript] = React.useState("");
  const recognitionRef = React.useRef<SpeechRecognitionLike | null>(null);
  const supported = React.useMemo(() => getSpeechRecognitionCtor() != null, []);

  React.useEffect(() => {
    return () => {
      recognitionRef.current?.stop();
    };
  }, []);

  const start = React.useCallback(() => {
    const Ctor = getSpeechRecognitionCtor();
    if (!Ctor) return;

    setTranscript("");
    const recognition = new Ctor();
    recognition.lang = "en-US";
    recognition.continuous = false;
    recognition.interimResults = true;

    recognition.onresult = (event) => {
      let text = "";
      for (let i = 0; i < event.results.length; i++) {
        text += event.results[i][0].transcript;
      }
      setTranscript(text);
    };
    recognition.onerror = () => setListening(false);
    recognition.onend = () => setListening(false);

    recognitionRef.current = recognition;
    recognition.start();
    setListening(true);
  }, []);

  const stop = React.useCallback(() => {
    recognitionRef.current?.stop();
    setListening(false);
  }, []);

  return { supported, listening, transcript, start, stop };
}
