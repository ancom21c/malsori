import { appDb, type LocalTurnTranslation, type LocalTurnTranslationStatus } from "../../data/app-db";

export type TurnTranslationStatus = LocalTurnTranslationStatus;

export interface TurnTranslation {
  id: string;
  sessionId: string;
  turnId: string;
  sourceRevision: string;
  sourceText: string;
  sourceLanguage?: string | null;
  targetLanguage: string;
  text: string;
  status: TurnTranslationStatus;
  requestedAt: string;
  completedAt?: string | null;
  providerLabel?: string | null;
  model?: string | null;
  backendProfileId?: string | null;
  usedFallback?: boolean | null;
  errorMessage?: string | null;
}

function mapLocalTurnTranslation(record: LocalTurnTranslation): TurnTranslation {
  return {
    ...record,
    sourceLanguage: record.sourceLanguage ?? null,
    completedAt: record.completedAt ?? null,
    providerLabel: record.providerLabel ?? null,
    model: record.model ?? null,
    backendProfileId: record.backendProfileId ?? null,
    usedFallback: record.usedFallback ?? null,
    errorMessage: record.errorMessage ?? null,
  };
}

export function buildTurnTranslationId(
  sessionId: string,
  turnId: string,
  targetLanguage: string
): string {
  return `${sessionId}:${turnId}:${targetLanguage.trim().toLowerCase()}`;
}

export async function upsertTurnTranslation(input: TurnTranslation): Promise<TurnTranslation> {
  const payload: LocalTurnTranslation = {
    id: input.id,
    sessionId: input.sessionId,
    turnId: input.turnId,
    sourceRevision: input.sourceRevision,
    sourceText: input.sourceText,
    sourceLanguage: input.sourceLanguage ?? null,
    targetLanguage: input.targetLanguage.trim().toLowerCase(),
    text: input.text,
    status: input.status,
    requestedAt: input.requestedAt,
    completedAt: input.completedAt ?? null,
    providerLabel: input.providerLabel ?? undefined,
    model: input.model ?? null,
    backendProfileId: input.backendProfileId ?? null,
    usedFallback: input.usedFallback ?? null,
    errorMessage: input.errorMessage ?? null,
  };
  await appDb.turnTranslations.put(payload);
  return mapLocalTurnTranslation(payload);
}

export async function listTurnTranslations(sessionId: string): Promise<TurnTranslation[]> {
  const records = await appDb.turnTranslations.where("sessionId").equals(sessionId).toArray();
  return records
    .map(mapLocalTurnTranslation)
    .sort((left, right) => left.requestedAt.localeCompare(right.requestedAt));
}

export async function deleteTurnTranslations(ids: string[]): Promise<void> {
  if (ids.length === 0) {
    return;
  }
  await appDb.turnTranslations.bulkDelete(ids);
}
