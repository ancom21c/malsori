import { renderHook, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it } from "vitest";
import { appDb } from "../data/app-db";
import { createLocalTranscription } from "../services/data/transcriptionRepository";
import { useTranscriptions } from "./useTranscriptions";

beforeEach(async () => {
  await appDb.delete();
  await appDb.open();
});

describe("useTranscriptions", () => {
  it("returns transcriptions ordered by creation time (newest first)", async () => {
    const first = await createLocalTranscription({
      title: "처음",
      kind: "file",
    });
    await new Promise((resolve) => setTimeout(resolve, 5));
    const second = await createLocalTranscription({
      title: "두 번째",
      kind: "realtime",
    });

    const { result } = renderHook(() => useTranscriptions());

    await waitFor(() => {
      expect(result.current).toBeDefined();
      expect(result.current?.length).toBe(2);
    });

    expect(result.current?.[0]?.id).toBe(second.id);
    expect(result.current?.[1]?.id).toBe(first.id);
  });

  it("hides realtime storage-stop fault rows from normal saved history", async () => {
    const visible = await createLocalTranscription({
      title: "Visible session",
      kind: "realtime",
    });
    await createLocalTranscription({
      title: "Hidden storage fault",
      kind: "realtime",
      metadata: {
        transcriptStorageTrust: "broken",
        transcriptStorageFaultReason: "segments_write_failed",
        transcriptStorageFaultAt: "2026-06-29T00:00:00.000Z",
      },
    });

    const { result } = renderHook(() => useTranscriptions());

    await waitFor(() => {
      expect(result.current).toBeDefined();
      expect(result.current?.length).toBe(1);
    });

    expect(result.current?.[0]?.id).toBe(visible.id);
  });
});
