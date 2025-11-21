import { beforeEach, describe, expect, it } from "vitest";
import { appDb } from "../../data/app-db";
import {
  appendAudioChunk,
  appendVideoChunk,
  createLocalTranscription,
  deleteTranscription,
  listAudioChunks,
  listVideoChunks,
  replaceSegments,
  updateLocalTranscription,
} from "./transcriptionRepository";

const SAMPLE_PCM_A = new Int16Array([0, 128, -128, 32767, -32768]).buffer;
const SAMPLE_PCM_B = new Int16Array([42, -42]).buffer;
const SAMPLE_VIDEO_A = new Uint8Array([1, 2, 3, 4]).buffer;
const SAMPLE_VIDEO_B = new Uint8Array([5, 6, 7, 8]).buffer;

beforeEach(async () => {
  await appDb.delete();
  await appDb.open();
});

describe("transcriptionRepository", () => {
  it("creates and updates local transcription records", async () => {
    const record = await createLocalTranscription({
      title: "테스트",
      kind: "realtime",
      metadata: {
        configPresetId: "preset-1",
        configPresetName: "테스트 프리셋",
        modelName: "sommers",
        backendEndpointId: "server-default",
        backendEndpointSource: "server-default",
        backendEndpointName: "서버 기본",
      },
    });
    expect(record.status).toBe("pending");
    expect(record.modelName).toBe("sommers");
    expect(record.searchTitle).toBe("테스트");

    await updateLocalTranscription(record.id, {
      status: "completed",
      transcriptText: "hello",
    });

    const stored = await appDb.transcriptions.get(record.id);
    expect(stored).toBeTruthy();
    expect(stored?.status).toBe("completed");
    expect(stored?.transcriptText).toBe("hello");
    expect(stored?.configPresetName).toBe("테스트 프리셋");
    expect(stored?.searchTranscript).toBe("hello");

    const searchIndex = await appDb.searchIndexes.get(record.id);
    expect(searchIndex).toBeTruthy();
    expect(searchIndex?.normalizedTranscript).toBe("hello");
    expect(searchIndex?.tokenSet).toContain("hello");
  });

  it("stores PCM audio chunks in order", async () => {
    const record = await createLocalTranscription({
      title: "audio",
      kind: "realtime",
    });

    await appendAudioChunk({
      transcriptionId: record.id,
      chunkIndex: 1,
      data: SAMPLE_PCM_B,
    });
    await appendAudioChunk({
      transcriptionId: record.id,
      chunkIndex: 0,
      data: SAMPLE_PCM_A,
    });

    const chunks = await listAudioChunks(record.id);
    expect(chunks.map((chunk) => chunk.chunkIndex)).toEqual([0, 1]);
    expect(Array.from(new Int16Array(chunks[0].data))).toEqual(Array.from(new Int16Array(SAMPLE_PCM_A)));
  });

  it("stores video chunks in order", async () => {
    const record = await createLocalTranscription({
      title: "video",
      kind: "realtime",
    });

    await appendVideoChunk({
      transcriptionId: record.id,
      chunkIndex: 0,
      data: SAMPLE_VIDEO_A,
      mimeType: "video/webm",
    });
    await appendVideoChunk({
      transcriptionId: record.id,
      chunkIndex: 1,
      data: SAMPLE_VIDEO_B,
    });

    const chunks = await listVideoChunks(record.id);
    expect(chunks.map((chunk) => chunk.chunkIndex)).toEqual([0, 1]);
    expect(chunks[0].mimeType).toBe("video/webm");
    expect(Array.from(new Uint8Array(chunks[1].data))).toEqual(Array.from(new Uint8Array(SAMPLE_VIDEO_B)));
  });

  it("deletes linked segments and audio when removing transcription", async () => {
    const record = await createLocalTranscription({
      title: "삭제 대상",
      kind: "realtime",
    });

    await appendAudioChunk({
      transcriptionId: record.id,
      chunkIndex: 0,
      data: SAMPLE_PCM_A,
    });

    await replaceSegments(record.id, [
      {
        text: "segment",
        startMs: 0,
        endMs: 1000,
        isFinal: true,
      },
    ]);
    await appendVideoChunk({
      transcriptionId: record.id,
      chunkIndex: 0,
      data: SAMPLE_VIDEO_A,
      mimeType: "video/webm",
    });

    await deleteTranscription(record.id);

    const stored = await appDb.transcriptions.get(record.id);
    expect(stored).toBeUndefined();
    const remainingSegments = await appDb.segments.where("transcriptionId").equals(record.id).count();
    expect(remainingSegments).toBe(0);
    const remainingChunks = await appDb.audioChunks.where("transcriptionId").equals(record.id).count();
    expect(remainingChunks).toBe(0);
    const remainingVideoChunks = await appDb.videoChunks
      .where("transcriptionId")
      .equals(record.id)
      .count();
    expect(remainingVideoChunks).toBe(0);
  });
});
