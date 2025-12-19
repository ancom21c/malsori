import { useCallback, useEffect, useRef, useState } from "react";
import type { ChangeEvent, MutableRefObject } from "react";
import type { LocalSegment, LocalTranscription } from "../data/app-db";
import { aggregateSegmentText } from "../utils/segments";
import { createSharePayload, type ShareAudioData, type ShareDocument } from "../share/payload";
import { transcodeShareAudio } from "../services/audio/shareTranscoder";
import { arrayBufferToBase64 } from "../utils/base64";

const INVALID_FILENAME_CHARS = /[\\/:*?"<>|]/g;
const SHARE_EMBED_DIR = "share-embed";
const SHARE_EMBED_SCRIPT = "share-embed.js";
const SHARE_EMBED_STYLE = "share-embed.css";

function buildDownloadFileName(title: string | undefined, fallbackId: string, extension: string) {
  const base = (title?.trim().length ? title.trim() : fallbackId || "transcription")
    .replace(INVALID_FILENAME_CHARS, "_")
    .replace(/\s+/g, "_");
  return `${base}.${extension}`;
}

function downloadBlobContent(blob: Blob, fileName: string) {
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = fileName;
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
}

function escapeHtml(value: string) {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function looksLikeHtml(text: string) {
  const trimmed = text.trimStart().toLowerCase();
  return trimmed.startsWith("<!doctype html") || trimmed.startsWith("<html");
}

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
  const [shareHtmlGenerating, setShareHtmlGenerating] = useState(false);
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

  const captureShareAudio = useCallback(
    async (options?: { force?: boolean; require?: boolean }) => {
      if (!transcription) {
        return undefined;
      }
      if (!shareAudioAvailable) {
        if (options?.require) {
          throw new Error(t("shareHtmlAudioRequired"));
        }
        return undefined;
      }
      if (!includeAudioInShare && !options?.force) {
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
    },
    [includeAudioInShare, audioUrl, transcription, t, shareAudioAvailable, audioBlobRef]
  );

  const buildShareDocument = useCallback(
    (audioPayload?: ShareAudioData): ShareDocument => {
      if (!transcription) {
        throw new Error(t("shareGenerateFailed"));
      }
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
      return {
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
              compression: audioPayload.compression,
              originalSize: audioPayload.originalSize,
              compressedSize: audioPayload.compressedSize,
              transcoded: audioPayload.transcoded,
            }
          : undefined,
      };
    },
    [segments, t, transcription]
  );

  const handleGenerateShareLink = useCallback(async () => {
    if (!transcription) {
      return;
    }
    setShareGenerating(true);
    setShareError(null);
    setShareLink(null);
    try {
      const audioPayload = await captureShareAudio();
      const shareDocument = buildShareDocument(audioPayload);
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
    buildShareDocument,
    sharePassword,
    t,
    transcription,
    enqueueSnackbar,
  ]);

  const fetchShareEmbedAssets = useCallback(async () => {
    const baseUrl = `${window.location.origin}${import.meta.env.BASE_URL}`;
    const embedBaseUrl = new URL(`${SHARE_EMBED_DIR}/`, baseUrl);
    const scriptUrl = new URL(SHARE_EMBED_SCRIPT, embedBaseUrl).toString();
    const scriptResponse = await fetch(scriptUrl);
    if (!scriptResponse.ok) {
      throw new Error(t("shareHtmlAssetMissing"));
    }
    const scriptText = await scriptResponse.text();
    if (looksLikeHtml(scriptText)) {
      throw new Error(t("shareHtmlAssetMissing"));
    }
    const styleUrl = new URL(SHARE_EMBED_STYLE, embedBaseUrl).toString();
    let cssText = "";
    try {
      const styleResponse = await fetch(styleUrl);
      if (styleResponse.ok) {
        const candidate = await styleResponse.text();
        cssText = looksLikeHtml(candidate) ? "" : candidate;
      }
    } catch {
      cssText = "";
    }
    return { scriptText, cssText };
  }, [t]);

  const buildShareHtmlDocument = useCallback(
    (payload: string, scriptText: string, cssText: string, title: string) => {
      const safeTitle = escapeHtml(title);
      const payloadLiteral = JSON.stringify(payload);
      const sanitizedScript = scriptText.replace(/<\/script/gi, "<\\/script");
      const processShim =
        "globalThis.process = globalThis.process || { env: { NODE_ENV: \"production\" } };";
      const styleBlock = cssText ? `<style>${cssText}</style>` : "";
      return `<!doctype html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <meta name="theme-color" content="#e75959" />
    <title>${safeTitle}</title>
    ${styleBlock}
  </head>
  <body>
    <div id="share-root"></div>
    <script>window.__SHARE_EMBED__ = ${payloadLiteral};</script>
    <script>${processShim}</script>
    <script>${sanitizedScript}</script>
  </body>
</html>`;
    },
    []
  );

  const handleDownloadShareHtml = useCallback(async () => {
    if (!transcription) {
      return;
    }
    setShareHtmlGenerating(true);
    setShareError(null);
    try {
      const audioPayload = await captureShareAudio({ force: true, require: true });
      if (!audioPayload) {
        throw new Error(t("shareHtmlAudioRequired"));
      }
      const shareDocument = buildShareDocument(audioPayload);
      const payload = await createSharePayload(shareDocument, {
        password: sharePassword.trim().length ? sharePassword.trim() : undefined,
      });
      const { scriptText, cssText } = await fetchShareEmbedAssets();
      const title = shareDocument.title || t("untitledTranscription");
      const html = buildShareHtmlDocument(payload, scriptText, cssText, title);
      const fileName = buildDownloadFileName(
        shareDocument.title,
        shareDocument.id,
        "html"
      );
      const blob = new Blob([html], { type: "text/html;charset=utf-8" });
      downloadBlobContent(blob, fileName);
      enqueueSnackbar(t("shareHtmlDownloaded"), { variant: "success" });
    } catch (error) {
      const message = error instanceof Error ? error.message : t("shareHtmlDownloadFailed");
      setShareError(message);
    } finally {
      setShareHtmlGenerating(false);
    }
  }, [
    transcription,
    captureShareAudio,
    buildShareDocument,
    fetchShareEmbedAssets,
    buildShareHtmlDocument,
    sharePassword,
    enqueueSnackbar,
    t,
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
    shareHtmlGenerating,
    shareError,
    shareDialogOpen,
    openShareDialog: handleShareDialogOpen,
    closeShareDialog: handleShareDialogClose,
    audioTranscoding,
    handleIncludeAudioChange,
    handleGenerateShareLink,
    handleDownloadShareHtml,
    handleCopyShareLink,
  };
}
