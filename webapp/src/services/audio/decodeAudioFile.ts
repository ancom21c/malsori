const FALLBACK_SAMPLE_RATE = 16000;

export interface DecodedPcmAudio {
  pcm: Int16Array;
  sampleRate: number;
  durationMs: number;
}

export function extractSampleRateFromAudioConfig(
  config: Record<string, unknown>,
  fallback = FALLBACK_SAMPLE_RATE
): number {
  const maybeSampleRate =
    typeof config.sample_rate === "number"
      ? config.sample_rate
      : typeof config.sampleRate === "number"
        ? config.sampleRate
        : undefined;
  if (typeof maybeSampleRate === "number" && Number.isFinite(maybeSampleRate) && maybeSampleRate > 0) {
    return Math.floor(maybeSampleRate);
  }
  return fallback;
}

export async function decodeAudioFileToPcm(
  file: File,
  targetSampleRate: number
): Promise<DecodedPcmAudio> {
  const AudioContextClass =
    typeof window !== "undefined"
      ? window.AudioContext ||
      (window as typeof window & { webkitAudioContext?: typeof AudioContext }).webkitAudioContext
      : null;

  if (!AudioContextClass) {
    throw new Error("AudioContext is not available in this environment.");
  }

  const arrayBuffer = await file.arrayBuffer();
  const audioContext = new AudioContextClass({ sampleRate: targetSampleRate });
  let decoded: AudioBuffer;
  try {
    decoded = await audioContext.decodeAudioData(arrayBuffer.slice(0));
  } finally {
    void audioContext.close();
  }

  let buffer = decoded;
  if (Math.abs(decoded.sampleRate - targetSampleRate) > 1) {
    const OfflineContextClass =
      typeof window !== "undefined"
        ? window.OfflineAudioContext ||
        (window as typeof window & { webkitOfflineAudioContext?: typeof OfflineAudioContext }).webkitOfflineAudioContext
        : null;
    if (OfflineContextClass) {
      const frameCount = Math.ceil(decoded.duration * targetSampleRate);
      const offlineContext = new OfflineContextClass(1, frameCount, targetSampleRate);
      const source = offlineContext.createBufferSource();
      source.buffer = decoded;
      source.connect(offlineContext.destination);
      source.start(0);
      buffer = await offlineContext.startRendering();
    }
  }

  const channelCount = buffer.numberOfChannels || 1;
  const length = buffer.length;
  const mono = new Float32Array(length);
  for (let channel = 0; channel < channelCount; channel += 1) {
    const channelData = buffer.getChannelData(channel);
    for (let index = 0; index < length; index += 1) {
      mono[index] += channelData[index];
    }
  }
  if (channelCount > 1) {
    for (let index = 0; index < mono.length; index += 1) {
      mono[index] /= channelCount;
    }
  }

  const pcm = new Int16Array(mono.length);
  for (let index = 0; index < mono.length; index += 1) {
    const clamped = Math.max(-1, Math.min(1, mono[index]));
    pcm[index] = clamped < 0 ? clamped * 0x8000 : clamped * 0x7fff;
  }

  const durationMs = Math.round((pcm.length / buffer.sampleRate) * 1000);

  return { pcm, sampleRate: buffer.sampleRate, durationMs };
}
