import type { BackendEndpointPreset, PresetConfig } from "./app-db";
import { v4 as uuid } from "uuid";

function buildPreset(partial: Omit<PresetConfig, "id" | "createdAt" | "updatedAt">): PresetConfig {
  const now = new Date().toISOString();
  return {
    id: uuid(),
    createdAt: now,
    updatedAt: now,
    ...partial,
  };
}

function buildBackendPreset(
  partial: Omit<BackendEndpointPreset, "id" | "createdAt" | "updatedAt">
): BackendEndpointPreset {
  const now = new Date().toISOString();
  return {
    id: uuid(),
    createdAt: now,
    updatedAt: now,
    ...partial,
  };
}

export const DEFAULT_FILE_PRESETS: PresetConfig[] = [
  buildPreset({
    type: "file",
    name: "기본 (sommers)",
    description: "sommers 모델, 문단 분리 ON",
    configJson: JSON.stringify(
      {
        model_name: "sommers",
        use_paragraph_splitter: true,
        paragraph_splitter: { max: 80 },
        use_itn: true,
        use_disfluency_filter: false,
        use_profanity_filter: false,
        use_word_timestamp: true
      },
      null,
      2
    ),
    isDefault: true,
  }),
  buildPreset({
    type: "file",
    name: "화자 분리",
    description: "화자 수 2명 고정",
    configJson: JSON.stringify(
      {
        model_name: "sommers",
        use_diarization: true,
        use_word_timestamp: true,
        diarization: {
          spk_count: 2,
        },
      },
      null,
      2
    ),
    isDefault: false,
  }),
];

export const DEFAULT_STREAMING_PRESETS: PresetConfig[] = [
  buildPreset({
    type: "streaming",
    name: "기본 스트리밍",
    description: "16kHz LINEAR16, 사용 모델 자동",
    configJson: JSON.stringify(
      {
        sample_rate: 16000,
        encoding: "LINEAR16",
        use_punctuation: true,
      },
      null,
      2
    ),
    isDefault: true,
  }),
];

export const DEFAULT_BACKEND_ENDPOINT_PRESETS: BackendEndpointPreset[] = [
  buildBackendPreset({
    name: "RTZR Cloud (기본)",
    description: "공식 RTZR API (openapi.vito.ai)",
    deployment: "cloud",
    apiBaseUrl: "https://openapi.vito.ai",
    verifySsl: true,
    isDefault: true,
  }),
];
