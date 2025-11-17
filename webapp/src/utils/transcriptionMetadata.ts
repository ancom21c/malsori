import { appDb } from "../data/app-db";
import type { BackendEndpointDeployment } from "../data/app-db";

export type BackendEndpointSnapshot = {
  id: string | null;
  source: "preset" | "server-default" | "unknown";
  name: string;
  deployment?: BackendEndpointDeployment;
  apiBaseUrl?: string;
};

export async function resolveBackendEndpointSnapshot(
  presetId: string | null | undefined
): Promise<BackendEndpointSnapshot> {
  if (!presetId) {
    return {
      id: null,
      source: "server-default",
      name: "서버 기본 엔드포인트",
    } satisfies BackendEndpointSnapshot;
  }

  const preset = await appDb.backendEndpoints.get(presetId);
  if (!preset) {
    return {
      id: presetId,
      source: "unknown",
      name: "삭제된 프리셋",
    } satisfies BackendEndpointSnapshot;
  }

  return {
    id: preset.id,
    source: "preset",
    name: preset.name,
    deployment: preset.deployment,
    apiBaseUrl: preset.apiBaseUrl,
  } satisfies BackendEndpointSnapshot;
}

export function extractModelNameFromConfig(config: unknown): string | undefined {
  if (!config || typeof config !== "object") {
    return undefined;
  }
  const record = config as Record<string, unknown>;
  const rawModelField =
    typeof record.model_name === "string"
      ? record.model_name
      : typeof record.modelName === "string"
      ? record.modelName
      : undefined;
  const normalized = rawModelField?.trim();
  return normalized ? normalized : undefined;
}

export function extractModelNameFromConfigJson(configJson: string): string | undefined {
  if (!configJson || configJson.trim().length === 0) {
    return undefined;
  }
  try {
    const parsed = JSON.parse(configJson);
    return extractModelNameFromConfig(parsed);
  } catch {
    return undefined;
  }
}

