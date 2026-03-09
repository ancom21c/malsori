function concatFloat32Arrays(a: Float32Array, b: Float32Array): Float32Array {
  if (a.length === 0) {
    return b.slice();
  }
  const result = new Float32Array(a.length + b.length);
  result.set(a, 0);
  result.set(b, a.length);
  return result;
}

export class PcmResampler {
  readonly targetSampleRate: number;
  private readonly ratio: number;
  private buffer: Float32Array = new Float32Array(0);

  constructor(sourceSampleRate: number, targetSampleRate: number) {
    this.targetSampleRate = targetSampleRate;
    this.ratio = sourceSampleRate / targetSampleRate;
  }

  process(chunk: Float32Array): Int16Array {
    this.buffer = concatFloat32Arrays(this.buffer, chunk);
    if (this.buffer.length < 2) {
      return new Int16Array(0);
    }

    const outputLength = Math.floor((this.buffer.length - 1) / this.ratio);
    if (outputLength <= 0) {
      return new Int16Array(0);
    }

    const output = new Int16Array(outputLength);
    let inputPosition = 0;

    for (let i = 0; i < outputLength; i++) {
      const indexBefore = Math.floor(inputPosition);
      const indexAfter =
        indexBefore + 1 < this.buffer.length ? indexBefore + 1 : indexBefore;
      const weight = inputPosition - indexBefore;
      const sample =
        (1 - weight) * this.buffer[indexBefore] + weight * this.buffer[indexAfter];
      output[i] = PcmResampler.floatToInt16(sample);
      inputPosition += this.ratio;
    }

    const framesConsumed = Math.floor(inputPosition);
    this.buffer = this.buffer.slice(framesConsumed);

    return output;
  }

  reset() {
    this.buffer = new Float32Array(0);
  }

  private static floatToInt16(value: number): number {
    const clamped = Math.max(-1, Math.min(1, value));
    return clamped < 0 ? clamped * 0x8000 : clamped * 0x7fff;
  }
}
