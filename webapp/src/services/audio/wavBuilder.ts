function writeString(view: DataView, offset: number, value: string) {
  for (let i = 0; i < value.length; i++) {
    view.setUint8(offset + i, value.charCodeAt(i));
  }
}

export function createWavBlobFromPcmChunks(
  chunks: ArrayBuffer[],
  sampleRate: number,
  channels: number = 1
): Blob | null {
  if (chunks.length === 0) {
    return null;
  }

  const bytesPerSample = 2;
  const totalDataBytes = chunks.reduce((sum, chunk) => sum + chunk.byteLength, 0);
  if (totalDataBytes === 0) {
    return null;
  }

  const dataView = new DataView(new ArrayBuffer(44 + totalDataBytes));
  writeString(dataView, 0, "RIFF");
  dataView.setUint32(4, 36 + totalDataBytes, true);
  writeString(dataView, 8, "WAVE");
  writeString(dataView, 12, "fmt ");
  dataView.setUint32(16, 16, true); // PCM chunk size
  dataView.setUint16(20, 1, true); // audio format (PCM)
  dataView.setUint16(22, channels, true);
  dataView.setUint32(24, sampleRate, true);
  const byteRate = sampleRate * channels * bytesPerSample;
  dataView.setUint32(28, byteRate, true);
  const blockAlign = channels * bytesPerSample;
  dataView.setUint16(32, blockAlign, true);
  dataView.setUint16(34, bytesPerSample * 8, true); // bits per sample
  writeString(dataView, 36, "data");
  dataView.setUint32(40, totalDataBytes, true);

  let offset = 44;
  const target = new Uint8Array(dataView.buffer);
  for (const chunk of chunks) {
    target.set(new Uint8Array(chunk), offset);
    offset += chunk.byteLength;
  }

  return new Blob([target], { type: "audio/wav" });
}
