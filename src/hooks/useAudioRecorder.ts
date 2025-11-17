// hooks/useAudioRecorder.ts
import { useState, useRef } from "react";

export function useAudioRecorder() {
  const [isRecording, setIsRecording] = useState(false);
  const [audioUrl, setAudioUrl] = useState<string | null>(null);
  const [audioBlob, setAudioBlob] = useState<Blob | null>(null);

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);

  const startRecording = async () => {
    const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
    mediaRecorderRef.current = new MediaRecorder(stream);
    audioChunksRef.current = [];

    mediaRecorderRef.current.ondataavailable = (e) => {
      audioChunksRef.current.push(e.data);
    };

    mediaRecorderRef.current.onstop = () => {
      const blob = new Blob(audioChunksRef.current, { type: "audio/wav" });
      setAudioBlob(blob);
      const url = URL.createObjectURL(blob);
      setAudioUrl(url);
    };

    mediaRecorderRef.current.start();
    setIsRecording(true);
  };

  const stopRecording = () => {
    mediaRecorderRef.current?.stop();
    setIsRecording(false);
  };

  const resetRecording = () => {
    // Stop any active recording
    if (isRecording) mediaRecorderRef.current?.stop();

    // Revoke previous object URL
    if (audioUrl) URL.revokeObjectURL(audioUrl);

    setAudioUrl(null);
    setAudioBlob(null);
    setIsRecording(false);
    audioChunksRef.current = [];
    mediaRecorderRef.current = null;
  };

  return {
    isRecording,
    audioUrl,
    startRecording,
    stopRecording,
    resetRecording,
    audioBlob
  };
}
