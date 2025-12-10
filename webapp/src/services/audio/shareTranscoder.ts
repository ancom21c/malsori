type TranscodeOptions = {
  targetSampleRate?: number;
  mimeType?: string;
  audioBitsPerSecond?: number;
};

export async function transcodeShareAudio(
  source: Blob,
  options?: TranscodeOptions
): Promise<Blob> {
  if (
    typeof window === "undefined" ||
    !(window.AudioContext || window.webkitAudioContext) ||
    typeof MediaRecorder === "undefined"
  ) {
    return source;
  }

  const AudioCtx = window.AudioContext || window.webkitAudioContext;
  const context = new AudioCtx({
    sampleRate: options?.targetSampleRate ?? 16000,
  });

  let decodedBuffer: AudioBuffer | null = null;
  try {
    const arrayBuffer = await source.arrayBuffer();
    decodedBuffer = await context.decodeAudioData(arrayBuffer);
  } catch {
    await context.close();
    return source;
  }

  const destination = context.createMediaStreamDestination();
  const sourceNode = context.createBufferSource();
  sourceNode.buffer = decodedBuffer;
  sourceNode.connect(destination);

  const mimeType = options?.mimeType ?? "audio/webm;codecs=opus";
  if (MediaRecorder.isTypeSupported && !MediaRecorder.isTypeSupported(mimeType)) {
    await context.close();
    return source;
  }

  const recorderOptions: MediaRecorderOptions = { mimeType };
  if (typeof options?.audioBitsPerSecond === "number") {
    recorderOptions.audioBitsPerSecond = options.audioBitsPerSecond;
  }

  let recorder: MediaRecorder;
  try {
    recorder = new MediaRecorder(destination.stream, recorderOptions);
  } catch {
    await context.close();
    return source;
  }

  const chunks: BlobPart[] = [];
  const recordingPromise = new Promise<Blob>((resolve) => {
    recorder.addEventListener("dataavailable", (event) => {
      if (event.data && event.data.size) {
        chunks.push(event.data);
      }
    });
    recorder.addEventListener("stop", () => {
      void context.close();
      if (!chunks.length) {
        resolve(source);
        return;
      }
      const blob = new Blob(chunks, { type: recorder.mimeType || mimeType });
      resolve(blob);
    });
    recorder.addEventListener("error", () => {
      void context.close();
      resolve(source);
    });
  });

  sourceNode.start();
  recorder.start();
  sourceNode.addEventListener("ended", () => {
    if (recorder.state === "recording") {
      recorder.stop();
    }
  });

  return recordingPromise;
}

declare global {
  interface Window {
    webkitAudioContext?: typeof AudioContext;
  }
}
