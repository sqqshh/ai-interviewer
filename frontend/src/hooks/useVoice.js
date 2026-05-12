import { useState, useRef, useCallback, useEffect } from "react";
import api from "../api/client";

/**
 * useVoice hook
 * Handles:
 *   - Microphone recording via MediaRecorder API
 *   - Sending audio to /api/transcribe
 *   - Speaking text aloud via SpeechSynthesis API
 */
export default function useVoice() {
  const [isRecording, setIsRecording] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [isTranscribing, setIsTranscribing] = useState(false);
  const [voiceError, setVoiceError] = useState(null);

  const mediaRecorderRef = useRef(null);
  const audioChunksRef = useRef([]);
  const streamRef = useRef(null);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      stopRecording();
      window.speechSynthesis?.cancel();
    };
  }, []);

  // ── Recording ────────────────────────────────────────────────

  const startRecording = useCallback(async () => {
    setVoiceError(null);
    audioChunksRef.current = [];

    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream;

      // Pick best supported format
      const mimeType = MediaRecorder.isTypeSupported("audio/webm;codecs=opus")
        ? "audio/webm;codecs=opus"
        : MediaRecorder.isTypeSupported("audio/webm")
        ? "audio/webm"
        : "audio/mp4";

      const mediaRecorder = new MediaRecorder(stream, { mimeType });
      mediaRecorderRef.current = mediaRecorder;

      mediaRecorder.ondataavailable = (e) => {
        if (e.data.size > 0) audioChunksRef.current.push(e.data);
      };

      mediaRecorder.start(100); // collect chunks every 100ms
      setIsRecording(true);
    } catch (err) {
      if (err.name === "NotAllowedError") {
        setVoiceError("Microphone access denied. Please allow mic access in your browser.");
      } else {
        setVoiceError("Could not start recording: " + err.message);
      }
    }
  }, []);

  const stopRecording = useCallback(() => {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== "inactive") {
      mediaRecorderRef.current.stop();
    }
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((t) => t.stop());
      streamRef.current = null;
    }
    setIsRecording(false);
  }, []);

  // ── Transcription ─────────────────────────────────────────────

  const transcribeAudio = useCallback(async () => {
    if (audioChunksRef.current.length === 0) {
      setVoiceError("No audio recorded. Please try again.");
      return null;
    }

    setIsTranscribing(true);
    setVoiceError(null);

    try {
      const mimeType = mediaRecorderRef.current?.mimeType || "audio/webm";
      const audioBlob = new Blob(audioChunksRef.current, { type: mimeType });
      audioChunksRef.current = [];

      const formData = new FormData();
      formData.append("audio", audioBlob, "recording.webm");

      const res = await api.post("/transcribe", formData, {
        headers: { "Content-Type": "multipart/form-data" },
      });

      return res.data.transcript;
    } catch (err) {
      const msg = err.response?.data?.detail || "Transcription failed. Please try again.";
      setVoiceError(msg);
      return null;
    } finally {
      setIsTranscribing(false);
    }
  }, []);

  // Stop recording and transcribe in one call
  const stopAndTranscribe = useCallback(async () => {
    return new Promise((resolve) => {
      if (!mediaRecorderRef.current || mediaRecorderRef.current.state === "inactive") {
        resolve(null);
        return;
      }

      mediaRecorderRef.current.onstop = async () => {
        const transcript = await transcribeAudio();
        resolve(transcript);
      };

      stopRecording();
    });
  }, [stopRecording, transcribeAudio]);

  // ── Text to Speech ────────────────────────────────────────────

  const speak = useCallback((text, onEnd) => {
    if (!window.speechSynthesis) return;

    // Cancel any current speech
    window.speechSynthesis.cancel();

    const utterance = new SpeechSynthesisUtterance(text);
    utterance.rate = 0.95;
    utterance.pitch = 1;
    utterance.volume = 1;

    // Try to use a natural English voice
    const voices = window.speechSynthesis.getVoices();
    const preferred = voices.find(
      (v) =>
        v.lang.startsWith("en") &&
        (v.name.includes("Google") || v.name.includes("Natural") || v.name.includes("Neural"))
    );
    if (preferred) utterance.voice = preferred;

    utterance.onstart = () => setIsSpeaking(true);
    utterance.onend = () => {
      setIsSpeaking(false);
      onEnd?.();
    };
    utterance.onerror = () => setIsSpeaking(false);

    window.speechSynthesis.speak(utterance);
  }, []);

  const stopSpeaking = useCallback(() => {
    window.speechSynthesis?.cancel();
    setIsSpeaking(false);
  }, []);

  return {
    // Recording
    isRecording,
    startRecording,
    stopRecording,
    stopAndTranscribe,

    // Transcription
    isTranscribing,

    // TTS
    isSpeaking,
    speak,
    stopSpeaking,

    // Errors
    voiceError,
    setVoiceError,
  };
}