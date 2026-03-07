import { describe, expect, it } from "vitest";
import {
  ALL_TRANSCRIPTION_LIST_FILTER_KINDS,
  DEFAULT_TRANSCRIPTION_LIST_FILTER_STATE,
  areTranscriptionListFilterStatesEqual,
  buildTranscriptionListFilterSearchParams,
  parseTranscriptionListFilterState,
} from "./transcriptionListFilterState";

describe("transcriptionListFilterState", () => {
  it("parses valid query params into normalized filter state", () => {
    const state = parseTranscriptionListFilterState(
      new URLSearchParams(
        "title=Roadmap&content=latency%20budget&start=2026-03-01&end=2026-03-07&kind=realtime&model=Sommers&endpoint=id%3Adefault"
      )
    );

    expect(state).toEqual({
      titleQuery: "Roadmap",
      contentQuery: "latency budget",
      startDate: "2026-03-01",
      endDate: "2026-03-07",
      selectedKinds: ["realtime"],
      selectedModels: ["sommers"],
      selectedEndpoints: ["id:default"],
    });
  });

  it("falls back safely on invalid query params", () => {
    const state = parseTranscriptionListFilterState(
      new URLSearchParams("start=2026-13-99&kind=invalid&model=&endpoint=   ")
    );

    expect(state).toEqual(DEFAULT_TRANSCRIPTION_LIST_FILTER_STATE);
  });

  it("omits default values and round-trips selected filters", () => {
    const searchParams = buildTranscriptionListFilterSearchParams({
      titleQuery: "  March review  ",
      contentQuery: "",
      startDate: "2026-03-05",
      endDate: "",
      selectedKinds: ["file"],
      selectedModels: ["Sommers", "sommers"],
      selectedEndpoints: ["source:preset"],
    });

    expect(searchParams.toString()).toBe(
      "title=March+review&start=2026-03-05&kind=file&model=sommers&endpoint=source%3Apreset"
    );
    expect(
      parseTranscriptionListFilterState(searchParams)
    ).toEqual({
      titleQuery: "March review",
      contentQuery: "",
      startDate: "2026-03-05",
      endDate: "",
      selectedKinds: ["file"],
      selectedModels: ["sommers"],
      selectedEndpoints: ["source:preset"],
    });
  });

  it("preserves an explicit empty kind selection", () => {
    const searchParams = buildTranscriptionListFilterSearchParams({
      ...DEFAULT_TRANSCRIPTION_LIST_FILTER_STATE,
      selectedKinds: [],
    });

    expect(searchParams.toString()).toBe("kind=none");
    expect(parseTranscriptionListFilterState(searchParams).selectedKinds).toEqual([]);
  });

  it("compares filter states structurally", () => {
    expect(
      areTranscriptionListFilterStatesEqual(
        DEFAULT_TRANSCRIPTION_LIST_FILTER_STATE,
        {
          ...DEFAULT_TRANSCRIPTION_LIST_FILTER_STATE,
          selectedKinds: [...ALL_TRANSCRIPTION_LIST_FILTER_KINDS],
        }
      )
    ).toBe(true);
    expect(
      areTranscriptionListFilterStatesEqual(DEFAULT_TRANSCRIPTION_LIST_FILTER_STATE, {
        ...DEFAULT_TRANSCRIPTION_LIST_FILTER_STATE,
        titleQuery: "abc",
      })
    ).toBe(false);
  });
});
