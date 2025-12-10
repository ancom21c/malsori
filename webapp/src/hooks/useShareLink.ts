import { useCallback, useEffect, useRef, useState } from "react";
import type { ChangeEvent, MutableRefObject } from "react";
import type { LocalSegment, LocalTranscription } from "../data/app-db";
import { aggregateSegmentText } from "../utils/segments";
import { createSharePayload, type ShareDocument } from "../share/payload";
import { transcodeShareAudio } from "../services/audio/shareTranscoder";
import { arrayBufferToBase64 } from "../utils/base64";

type ShareLinkParams = {
  transcriptionId: string | undefined;
  transcription: LocalTranscription | null | undefined;
  segments: LocalSegment[] | undefined;
  audioUrl: string | null;
  audioBlobRef: MutableRefObject<Blob | null>;
  shareAudioAvailable: boolean;
  t: (key: string, options?: Record<string, unknown>) => string;
  enqueueSnackbar: (message: string, options?: { variant: "success" | "error" | "warning" | "info" }) => void;
};

export function useShareLink({
  transcriptionId,
  transcription,
  segments,
  audioUrl,
  audioBlobRef,
  shareAudioAvailable,
  t,
  enqueueSnackbar,
}: ShareLinkParams) {
  const [includeAudioInShare, setIncludeAudioInShare] = useState(true);
  const [sharePassword, setSharePassword] = useState("");
  const [shareLink, setShareLink] = useState<string | null>(null);
  const [shareGenerating, setShareGenerating] = useState(false);
  const [shareError, setShareError] = useState<string | null>(null);
  const [shareDialogOpen, setShareDialogOpen] = useState(false);
  const [audioTranscoding, setAudioTranscoding] = useState(false);
  const userToggledAudioRef = useRef(false);

  const handleShareDialogOpen = useCallback(() => setShareDialogOpen(true), []);
  const handleShareDialogClose = useCallback(() => setShareDialogOpen(false), []);

  const handleIncludeAudioChange = useCallback((event: ChangeEvent<HTMLInputElement>) => {
    userToggledAudioRef.current = true;
    setIncludeAudioInShare(event.target.checked);
  }, []);

  useEffect(() => {
    setShareLink(null);
    setShareError(null);
  }, [transcriptionId, segments?.length, includeAudioInShare, sharePassword]);

  useEffect(() => {
    userToggledAudioRef.current = false;
    setIncludeAudioInShare(true);
  }, [transcriptionId]);

  useEffect(() => {
    if (shareAudioAvailable && !userToggledAudioRef.current) {
      setIncludeAudioInShare(true);
    }
  }, [shareAudioAvailable]);

  const captureShareAudio = useCallback(async () => {
    if (!includeAudioInShare || !transcription || !shareAudioAvailable) {
      return undefined;
    }
    setAudioTranscoding(true);
    try {
      let sourceBlob: Blob | null = null;
      if (audioBlobRef.current) {
        sourceBlob = audioBlobRef.current;
      } else if (audioUrl) {
        const response = await fetch(audioUrl);
        if (!response.ok) {
          throw new Error(t("shareAudioIncludeFailed"));
        }
        sourceBlob = await response.blob();
      }
      if (!sourceBlob) {
        return undefined;
      }
      const transcodedBlob = await transcodeShareAudio(sourceBlob, {
        targetSampleRate: 12000,
        audioBitsPerSecond: 24000,
      });
      const finalBlob = transcodedBlob ?? sourceBlob;
      const buffer = await finalBlob.arrayBuffer();
      const bytes = new Uint8Array(buffer);
      return {
        mimeType: finalBlob.type || sourceBlob.type || "audio/webm",
        base64Data: arrayBufferToBase64(bytes),
        sampleRate: transcription.audioSampleRate,
        channels: transcription.audioChannels,
        transcoded: finalBlob !== sourceBlob,
      };
    } finally {
      setAudioTranscoding(false);
    }
  }, [includeAudioInShare, audioUrl, transcription, t, shareAudioAvailable, audioBlobRef]);

  const handleGenerateShareLink = useCallback(async () => {
    if (!transcription) {
      return;
    }
    setShareGenerating(true);
    setShareError(null);
    setShareLink(null);
    try {
      const audioPayload = await captureShareAudio();
      const segmentList = segments ?? [];
      const aggregatedText =
        transcription.transcriptText && transcription.transcriptText.trim().length
          ? transcription.transcriptText
          : aggregateSegmentText(segmentList, false);
      const correctedText = aggregateSegmentText(segmentList, true) ?? aggregatedText;
      const serializedSegments = segmentList.map((segment) => ({
        ...segment,
        words: segment.words ? segment.words.map((word) => ({ ...word })) : undefined,
      }));
      const shareDocument: ShareDocument = {
        id: transcription.id,
        title: transcription.title,
        kind: transcription.kind,
        status: transcription.status,
        createdAt: transcription.createdAt,
        updatedAt: transcription.updatedAt,
        remoteId: transcription.remoteId,
        transcriptText: transcription.transcriptText,
        aggregatedText,
        correctedAggregatedText: correctedText,
        configPresetName: transcription.configPresetName,
        modelName: transcription.modelName,
        backendEndpointName: transcription.backendEndpointName,
        backendEndpointSource: transcription.backendEndpointSource,
        backendDeployment: transcription.backendDeployment,
        backendApiBaseUrl: transcription.backendApiBaseUrl,
        remoteAudioUrl: transcription.remoteAudioUrl,
        segments: serializedSegments,
        audio: audioPayload
          ? {
              mimeType: audioPayload.mimeType,
              base64Data: audioPayload.base64Data,
              sampleRate: audioPayload.sampleRate,
              channels: audioPayload.channels,
            }
          : undefined,
      };
      const payload = await createSharePayload(shareDocument, {
        password: sharePassword.trim().length ? sharePassword.trim() : undefined,
      });
      const baseUrl = `${window.location.origin}${import.meta.env.BASE_URL}`;
      const shareEntryUrl = new URL("share.html", baseUrl).toString();
      const finalLink = `${shareEntryUrl}#payload=${encodeURIComponent(payload)}`;
      setShareLink(finalLink);
      enqueueSnackbar(t("shareLinkCreated"), { variant: "success" });
    } catch (error) {
      const message = error instanceof Error ? error.message : t("shareGenerateFailed");
      setShareError(message);
    } finally {
      setShareGenerating(false);
    }
  }, [
    captureShareAudio,
    segments,
    sharePassword,
    t,
    transcription,
    enqueueSnackbar,
  ]);

  const handleCopyShareLink = useCallback(async () => {
    if (!shareLink) {
      return;
    }
    try {
      if (navigator.clipboard && navigator.clipboard.writeText) {
        await navigator.clipboard.writeText(shareLink);
      } else {
        const textarea = document.createElement("textarea");
        textarea.value = shareLink;
        textarea.style.position = "fixed";
        textarea.style.opacity = "0";
        document.body.appendChild(textarea);
        textarea.select();
        document.execCommand("copy");
        textarea.remove();
      }
      enqueueSnackbar(t("shareLinkCopied"), { variant: "success" });
    } catch {
      enqueueSnackbar(t("shareLinkCopyFailed"), { variant: "warning" });
    }
  }, [enqueueSnackbar, shareLink, t]);

  return {
    includeAudioInShare,
    setIncludeAudioInShare,
    sharePassword,
    setSharePassword,
    shareLink,
    shareGenerating,
    shareError,
    shareDialogOpen,
    openShareDialog: handleShareDialogOpen,
    closeShareDialog: handleShareDialogClose,
    audioTranscoding,
    handleIncludeAudioChange,
    handleGenerateShareLink,
    handleCopyShareLink,
  };
}
