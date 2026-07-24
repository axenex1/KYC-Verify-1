"use client";

import { useCallback, useRef } from "react";
import type { SyncMessage } from "@/lib/sync/messages";

export type StreamType = "desktop_to_mobile" | "mobile_to_desktop";

export interface WebRtcHandlers {
  onRemoteStream?: (stream: MediaStream, streamType: StreamType) => void;
  onConnectionStateChange?: (streamType: StreamType, state: RTCPeerConnectionState) => void;
}

export function useWebRtcSignaling(
  sessionId: string,
  role: "desktop" | "mobile",
  send: (message: SyncMessage) => void
) {
  const peersRef = useRef<Map<StreamType, RTCPeerConnection>>(new Map());
  const handlersRef = useRef<WebRtcHandlers>({});

  const setHandlers = useCallback((handlers: WebRtcHandlers) => {
    handlersRef.current = handlers;
  }, []);

  const getPeer = useCallback((streamType: StreamType): RTCPeerConnection => {
    let pc = peersRef.current.get(streamType);
    if (!pc) {
      pc = new RTCPeerConnection({
        iceServers: [{ urls: "stun:stun.l.google.com:19302" }],
      });

      pc.onicecandidate = (event) => {
        if (event.candidate) {
          send({
            type: "ice_candidate",
            sessionId,
            candidate: event.candidate.candidate,
            sdpMid: event.candidate.sdpMid,
            sdpMLineIndex: event.candidate.sdpMLineIndex,
            streamType,
          });
        }
      };

      pc.ontrack = (event) => {
        const stream = event.streams[0];
        if (stream) {
          handlersRef.current.onRemoteStream?.(stream, streamType);
        }
      };

      pc.onconnectionstatechange = () => {
        handlersRef.current.onConnectionStateChange?.(
          streamType,
          pc!.connectionState
        );
      };

      peersRef.current.set(streamType, pc);
    }
    return pc;
  }, [sessionId, send]);

  const createOffer = useCallback(
    async (streamType: StreamType, localStream?: MediaStream) => {
      const pc = getPeer(streamType);
      if (localStream) {
        localStream.getTracks().forEach((track) => {
          pc.addTrack(track, localStream);
        });
      }

      const offer = await pc.createOffer();
      await pc.setLocalDescription(offer);
      send({
        type: "stream_offer",
        sessionId,
        sdp: offer.sdp ?? "",
        streamType,
      });
    },
    [getPeer, send, sessionId]
  );

  const handleSignalingMessage = useCallback(
    async (message: SyncMessage) => {
      if (message.type === "stream_offer") {
        const pc = getPeer(message.streamType);
        await pc.setRemoteDescription(
          new RTCSessionDescription({ type: "offer", sdp: message.sdp })
        );
        const answer = await pc.createAnswer();
        await pc.setLocalDescription(answer);
        send({
          type: "stream_answer",
          sessionId,
          sdp: answer.sdp ?? "",
          streamType: message.streamType,
        });
      } else if (message.type === "stream_answer") {
        const pc = getPeer(message.streamType);
        await pc.setRemoteDescription(
          new RTCSessionDescription({ type: "answer", sdp: message.sdp })
        );
      } else if (message.type === "ice_candidate") {
        const pc = getPeer(message.streamType);
        if (message.candidate) {
          await pc.addIceCandidate(
            new RTCIceCandidate({
              candidate: message.candidate,
              sdpMid: message.sdpMid,
              sdpMLineIndex: message.sdpMLineIndex,
            })
          );
        }
      }
    },
    [getPeer, send, sessionId]
  );

  const addLocalStream = useCallback(
    (streamType: StreamType, stream: MediaStream) => {
      const pc = getPeer(streamType);
      stream.getTracks().forEach((track) => pc.addTrack(track, stream));
    },
    [getPeer]
  );

  const closeAll = useCallback(() => {
    peersRef.current.forEach((pc) => pc.close());
    peersRef.current.clear();
  }, []);

  const shouldInitiate = useCallback(
    (streamType: StreamType) => {
      if (streamType === "mobile_to_desktop") {
        return role === "mobile";
      }
      return role === "desktop";
    },
    [role]
  );

  return {
    setHandlers,
    createOffer,
    handleSignalingMessage,
    addLocalStream,
    closeAll,
    shouldInitiate,
  };
}
