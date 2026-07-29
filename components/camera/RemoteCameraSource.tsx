"use client";

import { useEffect, useRef } from "react";

interface RemoteCameraSourceProps {
  stream: MediaStream | null;
  onStreamReady: (stream: MediaStream, video: HTMLVideoElement) => void;
  children?: React.ReactNode;
}

export function RemoteCameraSource({
  stream,
  onStreamReady,
  children,
}: RemoteCameraSourceProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const notifiedRef = useRef(false);

  useEffect(() => {
    const video = videoRef.current;
    if (!video || !stream) {
      notifiedRef.current = false;
      return;
    }

    video.srcObject = stream;
    notifiedRef.current = false;

    const notify = () => {
      if (notifiedRef.current) return;
      notifiedRef.current = true;
      onStreamReady(stream, video);
    };

    video.onloadedmetadata = () => {
      video.play().then(notify).catch(notify);
    };

    return () => {
      video.srcObject = null;
      notifiedRef.current = false;
    };
  }, [stream, onStreamReady]);

  return (
    <>
      <video ref={videoRef} className="hidden" playsInline muted autoPlay />
          {stream ? children : (
        <div className="flex aspect-[4/3] items-center justify-center rounded-xl border border-dashed border-zinc-300 bg-zinc-50 dark:border-zinc-700 dark:bg-zinc-900">
          <p className="text-sm text-zinc-500">
            Waiting for camera / inject stream…
          </p>
        </div>
      )}
    </>
  );
}
