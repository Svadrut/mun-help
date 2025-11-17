"use client";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardFooter } from "@/components/ui/card";
import { useAudioRecorder } from "@/src/hooks/useAudioRecorder";
import { Loader2, RefreshCcw } from "lucide-react";

export default function AudioRecorderCard() {
  const { isRecording, audioUrl, startRecording, stopRecording, resetRecording } =
    useAudioRecorder();

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
