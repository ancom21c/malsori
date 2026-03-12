import { beforeEach, describe, expect, it } from "vitest";
import { appDb } from "../../data/app-db";
import {
  buildTurnTranslationId,
  deleteTurnTranslations,
  listTurnTranslations,
  upsertTurnTranslation,
} from "./translationRepository";

beforeEach(async () => {
  await appDb.delete();
  await appDb.open();
});

describe("translationRepository", () => {
  it("stores final-turn translations by session and target language", async () => {
    await upsertTurnTranslation({
      id: buildTurnTranslationId("tx-1", "turn-1", "en"),
      sessionId: "tx-1",
      turnId: "turn-1",
      sourceRevision: "rev-1",
      sourceText: "출시 체크리스트를 확인합시다.",
      sourceLanguage: "ko",
      targetLanguage: "en",
      text: "Let's confirm the launch checklist.",
      status: "ready",
      requestedAt: "2026-03-12T00:00:00.000Z",
      completedAt: "2026-03-12T00:00:01.000Z",
      providerLabel: "Translate Primary",
      model: "gpt-5-mini",
      backendProfileId: "translate-primary",
      usedFallback: false,
      errorMessage: null,
    });
    await upsertTurnTranslation({
      id: buildTurnTranslationId("tx-1", "turn-1", "ja"),
      sessionId: "tx-1",
      turnId: "turn-1",
      sourceRevision: "rev-1",
      sourceText: "출시 체크리스트를 확인합시다.",
      sourceLanguage: "ko",
      targetLanguage: "ja",
      text: "",
      status: "pending",
      requestedAt: "2026-03-12T00:00:02.000Z",
      completedAt: null,
      providerLabel: null,
      model: null,
      backendProfileId: null,
      usedFallback: null,
      errorMessage: null,
    });

    const records = await listTurnTranslations("tx-1");

    expect(records).toHaveLength(2);
    expect(records[0].targetLanguage).toBe("en");
    expect(records[0].status).toBe("ready");
    expect(records[1].targetLanguage).toBe("ja");
    expect(records[1].status).toBe("pending");
  });

  it("deletes failed turn translations so they can be retried", async () => {
    const failedId = buildTurnTranslationId("tx-2", "turn-2", "en");
    await upsertTurnTranslation({
      id: failedId,
      sessionId: "tx-2",
      turnId: "turn-2",
      sourceRevision: "rev-2",
      sourceText: "이건 재시도해야 합니다.",
      sourceLanguage: "ko",
      targetLanguage: "en",
      text: "",
      status: "failed",
      requestedAt: "2026-03-12T00:05:00.000Z",
      completedAt: "2026-03-12T00:05:02.000Z",
      providerLabel: "Translate Primary",
      model: "gpt-5-mini",
      backendProfileId: "translate-primary",
      usedFallback: false,
      errorMessage: "Request failed",
    });

    await deleteTurnTranslations([failedId]);

    await expect(listTurnTranslations("tx-2")).resolves.toEqual([]);
  });
});
