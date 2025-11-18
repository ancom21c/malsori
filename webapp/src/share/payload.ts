import type {
  LocalSegment,
  LocalTranscription,
  LocalTranscriptionKind,
} from "../data/app-db";
import {
  base64UrlDecode,
  base64UrlEncode,
  decodeStringFromBase64Url,
  encodeStringToBase64Url,
} from "../utils/base64";

const TEXT_ENCODER = new TextEncoder();
const TEXT_DECODER = new TextDecoder();
const PACKAGE_VERSION = 1;
const SALT_BYTE_LENGTH = 16;
const IV_BYTE_LENGTH = 12;
const DERIVATION_ITERATIONS = 200_000;

function bufferSourceFromView(view: ArrayBufferView): BufferSource {
  if (view.byteOffset === 0 && view.byteLength === view.buffer.byteLength) {
    return view.buffer as BufferSource;
  }
  return view.buffer.slice(view.byteOffset, view.byteOffset + view.byteLength) as BufferSource;
}

export type ShareSegment = LocalSegment;

export interface ShareAudioData {
  mimeType: string;
  base64Data: string;
  sampleRate?: number;
  channels?: number;
}

export interface ShareDocument {
  id: string;
  title: string;
  kind: LocalTranscriptionKind;
  status: LocalTranscription["status"];
  createdAt: string;
  updatedAt?: string;
  remoteId?: string;
  transcriptText?: string;
  aggregatedText?: string;
  correctedAggregatedText?: string;
  configPresetName?: string;
  modelName?: string;
  backendEndpointName?: string;
  backendEndpointSource?: LocalTranscription["backendEndpointSource"];
  backendDeployment?: LocalTranscription["backendDeployment"];
  backendApiBaseUrl?: string;
  remoteAudioUrl?: string;
  audio?: ShareAudioData;
  segments: ShareSegment[];
}

interface SharePackage {
  version: 1;
  encrypted: boolean;
  payload: string;
  iv?: string;
  salt?: string;
}

export interface SharePackageMetadata {
  version: number;
  encrypted: boolean;
}

async function deriveEncryptionKey(password: string, salt: Uint8Array) {
  const passwordBytes = TEXT_ENCODER.encode(password);
  const baseKey = await crypto.subtle.importKey(
    "raw",
    bufferSourceFromView(passwordBytes),
    "PBKDF2",
    false,
    ["deriveKey"]
  );
  return crypto.subtle.deriveKey(
    {
      name: "PBKDF2",
      salt: bufferSourceFromView(salt),
      iterations: DERIVATION_ITERATIONS,
      hash: "SHA-256",
    },
    baseKey,
    { name: "AES-GCM", length: 256 },
    false,
    ["encrypt", "decrypt"]
  );
}

async function encryptMessage(payload: Uint8Array, password: string) {
  const salt = crypto.getRandomValues(new Uint8Array(SALT_BYTE_LENGTH));
  const iv = crypto.getRandomValues(new Uint8Array(IV_BYTE_LENGTH));
  const key = await deriveEncryptionKey(password, salt);
  const cipherBuffer = await crypto.subtle.encrypt(
    { name: "AES-GCM", iv: bufferSourceFromView(iv) },
    key,
    bufferSourceFromView(payload)
  );
  return {
    cipher: base64UrlEncode(cipherBuffer),
    iv: base64UrlEncode(iv),
    salt: base64UrlEncode(salt),
  };
}

async function decryptMessage(
  cipherBase64: string,
  password: string,
  saltBase64: string,
  ivBase64: string
) {
  const salt = base64UrlDecode(saltBase64);
  const iv = base64UrlDecode(ivBase64);
  const cipherBytes = base64UrlDecode(cipherBase64);
  const key = await deriveEncryptionKey(password, salt);
  const plainBuffer = await crypto.subtle.decrypt(
    { name: "AES-GCM", iv: bufferSourceFromView(iv) },
    key,
    bufferSourceFromView(cipherBytes)
  );
  return new Uint8Array(plainBuffer);
}

function buildSharePackage(documentJson: string, encrypted: false): SharePackage;
function buildSharePackage(
  documentJson: string,
  encrypted: true,
  cipherData: { cipher: string; iv: string; salt: string }
): SharePackage;
function buildSharePackage(
  documentJson: string,
  encrypted: boolean,
  cipherData?: { cipher: string; iv: string; salt: string }
) {
  if (encrypted) {
    return {
      version: PACKAGE_VERSION,
      encrypted: true,
      payload: cipherData?.cipher ?? "",
      iv: cipherData?.iv,
      salt: cipherData?.salt,
    };
  }
  const documentBytes = TEXT_ENCODER.encode(documentJson);
  return {
    version: PACKAGE_VERSION,
    encrypted: false,
    payload: base64UrlEncode(documentBytes),
  };
}

function encodeSharePackage(pkg: SharePackage) {
  return encodeStringToBase64Url(JSON.stringify(pkg));
}

async function decodeShareDocument(payload: string) {
  const decoded = base64UrlDecode(payload);
  const json = TEXT_DECODER.decode(decoded);
  return JSON.parse(json) as ShareDocument;
}

export async function createSharePayload(
  document: ShareDocument,
  options?: { password?: string }
) {
  const docJson = JSON.stringify(document);
  if (options?.password && options.password.trim().length > 0) {
    const cipherData = await encryptMessage(TEXT_ENCODER.encode(docJson), options.password.trim());
    const pkg = buildSharePackage(docJson, true, cipherData);
    return encodeSharePackage(pkg);
  }
  const pkg = buildSharePackage(docJson, false);
  return encodeSharePackage(pkg);
}

export function inspectSharePackage(payloadParam: string): SharePackageMetadata | null {
  try {
    const decoded = decodeStringFromBase64Url(payloadParam);
    const parsed = JSON.parse(decoded) as SharePackage;
    if (typeof parsed.version !== "number" || !("encrypted" in parsed)) {
      return null;
    }
    return {
      version: parsed.version,
      encrypted: Boolean(parsed.encrypted),
    };
  } catch {
    return null;
  }
}

export async function parseSharePayload(payloadParam: string, password?: string) {
  const decoded = decodeStringFromBase64Url(payloadParam);
  const pkg = JSON.parse(decoded) as SharePackage;
  if (pkg.version !== PACKAGE_VERSION) {
    throw new Error("Unsupported share payload version.");
  }
  if (pkg.encrypted) {
    if (!password || !password.trim().length) {
      throw new Error("Password is required to open this share link.");
    }
    if (!pkg.salt || !pkg.iv) {
      throw new Error("Missing encryption metadata.");
    }
    const decrypted = await decryptMessage(pkg.payload, password.trim(), pkg.salt, pkg.iv);
    const json = TEXT_DECODER.decode(decrypted);
    return JSON.parse(json) as ShareDocument;
  }
  return decodeShareDocument(pkg.payload);
}
