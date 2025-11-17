import { PcmResampler } from "./pcmResampler";

export type RecorderState = "idle" | "preparing" | "recording" | "stopped" | "error";

export interface RecorderChunkInfo {
  sampleRate: number;
  durationMs: number;
}

export interface RecorderCallbacks {
  onChunk?: (chunk: ArrayBuffer, info: RecorderChunkInfo) => void;
  onError?: (error: Error) => void;
  onStop?: () => void;
}

export interface RecorderStartOptions extends RecorderCallbacks {
  /**
   * Desired PCM sample rate sent to the streaming API.
   * Defaults to 16kHz to match RTZR realtime requirements.
   */
  targetSampleRate?: number;
  /**
   * Length of emitted PCM chunks in milliseconds. Defaults to 800ms.
   */
  chunkMillis?: number;
}

function concatInt16Arrays(a: Int16Array, b: Int16Array): Int16Array {
  if (a.length === 0) {
    return new Int16Array(b);
  }
  const result = new Int16Array(a.length + b.length);
  result.set(a, 0);
  result.set(b, a.length);
  return result;
}

export class RecorderManager {
  private mediaStream: MediaStream | null = null;
  private audioContext: AudioContext | null = null;
  private sourceNode: MediaStreamAudioSourceNode | null = null;
  private processorNode: ScriptProcessorNode | null = null;
  private resampler: PcmResampler | null = null;
  private state: RecorderState = "idle";
  private pendingSamples: Int16Array = new Int16Array(0);
  private recordedSamples = 0;
  private chunkSampleTarget = 0;
  private callbacks: RecorderCallbacks = {};
  private options: Required<Pick<RecorderStartOptions, "targetSampleRate" | "chunkMillis">> | null =
    null;
  private paused = false;

  get recorderState() {
    return this.state;
  }

  async start(options: RecorderStartOptions = {}) {
    if (this.state === "recording" || this.state === "preparing") {
      return;
    }

    try {
      this.state = "preparing";
      this.callbacks = {
        onChunk: options.onChunk,
        onError: options.onError,
        onStop: options.onStop,
      };
      const targetSampleRate = options.targetSampleRate ?? 16000;
      const chunkMillis = options.chunkMillis ?? 800;
      this.options = { targetSampleRate, chunkMillis };

      this.mediaStream = await navigator.mediaDevices.getUserMedia({ audio: true });
      this.audioContext = new AudioContext();
      const actualInputSampleRate = this.audioContext.sampleRate;
      this.resampler = new PcmResampler(actualInputSampleRate, targetSampleRate);
      this.chunkSampleTarget = Math.max(
        1,
        Math.round((targetSampleRate * chunkMillis) / 1000)
      );
      this.pendingSamples = new Int16Array(0);
      this.recordedSamples = 0;

      this.sourceNode = this.audioContext.createMediaStreamSource(this.mediaStream);
      this.processorNode = this.audioContext.createScriptProcessor(4096, 1, 1);

      this.processorNode.onaudioprocess = (event) => {
        if (this.paused) {
          return;
        }
        try {
          const inputBuffer = event.inputBuffer.getChannelData(0);
          if (!this.resampler) {
            return;
          }
          const pcmChunk = this.resampler.process(inputBuffer);
          if (pcmChunk.length === 0) {
            return;
          }
          this.pendingSamples = concatInt16Arrays(this.pendingSamples, pcmChunk);
          this.flushChunks(false);
        } catch (error) {
          this.handleError(
            error instanceof Error ? error : new Error("오디오 프레임 처리 중 오류가 발생했습니다.")
          );
        }
      };

      this.sourceNode.connect(this.processorNode);
      this.processorNode.connect(this.audioContext.destination);

      this.state = "recording";
      this.paused = false;
    } catch (error) {
      this.handleError(
        error instanceof Error ? error : new Error("녹음 장치 초기화에 실패했습니다.")
      );
    }
  }

  pause() {
    if (this.state !== "recording" || this.paused) {
      return;
    }
    this.flushChunks(true);
    this.paused = true;
  }

  resume() {
    if (this.state !== "recording" || !this.paused) {
      return;
    }
    this.paused = false;
  }

  stop() {
    if (this.state === "idle" || this.state === "stopped") {
      return;
    }

    try {
      this.flushChunks(true);
    } catch (error) {
      this.handleError(
        error instanceof Error ? error : new Error("오디오 청크를 마무리하는 중 오류가 발생했습니다.")
      );
    }

    this.processorNode?.disconnect();
    this.sourceNode?.disconnect();
    void this.audioContext?.close();
    this.mediaStream?.getTracks().forEach((track) => track.stop());

    this.processorNode = null;
    this.sourceNode = null;
    this.audioContext = null;
    this.mediaStream = null;
    this.resampler = null;
    this.pendingSamples = new Int16Array(0);
    this.state = "stopped";
    this.paused = false;
    this.callbacks.onStop?.();
  }

  private flushChunks(force: boolean) {
    if (!this.options || !this.resampler) return;
    const { targetSampleRate } = this.options;

    while (
      this.pendingSamples.length >= this.chunkSampleTarget ||
      (force && this.pendingSamples.length > 0)
    ) {
      const take =
        this.pendingSamples.length >= this.chunkSampleTarget || force
          ? Math.min(this.pendingSamples.length, this.chunkSampleTarget)
          : 0;
      if (take === 0) {
        break;
      }

      const chunk = this.pendingSamples.slice(0, take);
      this.pendingSamples = this.pendingSamples.slice(take);
      this.recordedSamples += chunk.length;

      const durationMs = Math.round((chunk.length / targetSampleRate) * 1000);
      const arrayBuffer = chunk.buffer.slice(0);
      this.callbacks.onChunk?.(arrayBuffer, {
        sampleRate: targetSampleRate,
        durationMs,
      });
    }
  }

  private handleError(error: Error) {
    this.state = "error";
    this.callbacks.onError?.(error);
  }
}
