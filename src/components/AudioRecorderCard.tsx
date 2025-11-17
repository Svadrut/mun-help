"use client";

import { useState, useRef, useEffect } from "react";
import { Card, CardContent, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Loader2, RefreshCcw } from "lucide-react";

interface Props {
  onRecordingComplete?: (blob: Blob) => void;
  initialAudio?: Blob | null;
}

export default function AudioRecorderCard({ onRecordingComplete, initialAudio }: Props) {
  const [isRecording, setIsRecording] = useState(false);
  const [audioUrl, setAudioUrl] = useState<string | null>(null);

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);

  // Load initial audio
  useEffect(() => {
    if (initialAudio) {
      const url = URL.createObjectURL(initialAudio);
      setAudioUrl(url);
    }
  }, [initialAudio]);

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const recorder = new MediaRecorder(stream);
      mediaRecorderRef.current = recorder;
      chunksRef.current = [];

      recorder.ondataavailable = (e) => {
        if (e.data.size > 0) chunksRef.current.push(e.data);
      };

      recorder.onstop = () => {
        const blob = new Blob(chunksRef.current, { type: "audio/webm" });
        const url = URL.createObjectURL(blob);
        setAudioUrl(url);
        if (onRecordingComplete) onRecordingComplete(blob);
      };

      recorder.start();
      setIsRecording(true);
    } catch (err) {
      console.error("Error starting recording", err);
    }
  };

  const stopRecording = () => {
    const recorder = mediaRecorderRef.current;
    if (recorder && recorder.state !== "inactive") {
      recorder.stop();
      setIsRecording(false);
    }
  };

  const resetRecording = () => {
    if (audioUrl) URL.revokeObjectURL(audioUrl);
    setAudioUrl(null);
    chunksRef.current = [];
    if (onRecordingComplete) onRecordingComplete(null as any);
  };

  return (
    <Card className="w-full max-w-sm mx-auto mt-8 p-4 text-center">
      <CardContent className="flex flex-col items-center gap-4">
        <h2 className="text-lg font-semibold text-center">Audio Recorder</h2>

        <Button
          variant={isRecording ? "destructive" : "default"}
          className="flex items-center gap-2"
          onClick={isRecording ? stopRecording : startRecording}
        >
          {isRecording && <Loader2 className="animate-spin h-4 w-4" />}
          {isRecording ? "Stop Recording" : "Start Recording"}
        </Button>

        {audioUrl && (
          <div className="flex flex-col items-center gap-2 w-full">
            <audio src={audioUrl} controls className="w-full" />

            <Button
              size="sm"
              variant="outline"
              className="flex items-center gap-1 mt-2"
              onClick={resetRecording}
            >
              <RefreshCcw className="h-4 w-4" />
              Restart
            </Button>
          </div>
        )}
      </CardContent>

      <CardFooter className="justify-center">
        <p className="text-sm text-muted-foreground text-center">
          {isRecording
            ? "Recording in progress..."
            : audioUrl
            ? "Recording ready"
            : "Click start to record your audio"}
        </p>
      </CardFooter>
    </Card>
  );
}
