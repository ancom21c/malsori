const TEXT_ENCODER = new TextEncoder();
const TEXT_DECODER = new TextDecoder();

type ArrayBufferViewLike = ArrayBuffer | ArrayBufferView;

function toUint8Array(value: ArrayBufferViewLike) {
  if (value instanceof Uint8Array) {
    return value;
  }
  if ("buffer" in value) {
    return new Uint8Array(value.buffer, value.byteOffset, value.byteLength);
  }
  return new Uint8Array(value);
}

function arrayBufferToBinary(buffer: Uint8Array) {
  const chunkSize = 0x8000;
  let binary = "";
  for (let i = 0; i < buffer.length; i += chunkSize) {
    const chunk = buffer.subarray(i, Math.min(buffer.length, i + chunkSize));
    binary += String.fromCharCode(...chunk);
  }
  return binary;
}

export function arrayBufferToBase64(value: ArrayBufferViewLike) {
  const bytes = toUint8Array(value);
  const binary = arrayBufferToBinary(bytes);
  return btoa(binary);
}

export function base64ToUint8Array(base64: string) {
  const binary = atob(base64);
  const result = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i += 1) {
    result[i] = binary.charCodeAt(i);
  }
  return result;
}

export function base64UrlEncode(value: ArrayBufferViewLike) {
  const base64 = arrayBufferToBase64(value);
  return base64.replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/g, "");
}

export function base64UrlDecode(input: string) {
  let normalized = input.replace(/-/g, "+").replace(/_/g, "/");
  const padding = normalized.length % 4;
  if (padding === 2) {
    normalized += "==";
  } else if (padding === 3) {
    normalized += "=";
  } else if (padding === 1) {
    // Should not happen for valid base64url
    normalized += "===";
  }
  return base64ToUint8Array(normalized);
}

export function encodeStringToBase64Url(value: string) {
  const bytes = TEXT_ENCODER.encode(value);
  return base64UrlEncode(bytes);
}

export function decodeStringFromBase64Url(value: string) {
  const bytes = base64UrlDecode(value);
  return TEXT_DECODER.decode(bytes);
}
