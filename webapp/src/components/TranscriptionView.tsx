import { Card, CardContent, Chip, FormControlLabel, Stack, Switch, Typography, Button, Divider, TextField, Tooltip, Box } from "@mui/material";
import PlayArrowIcon from "@mui/icons-material/PlayArrow";
import type { LocalSegment, LocalWordTiming } from "../data/app-db";
import {
  resolveSegmentText,
  segmentHasTiming,
  getSegmentStartMs,
  getSegmentEndMs,
  resolveWordTimingMs,
} from "../utils/segments";
import { formatSecondsLabel } from "../utils/time";
import type { MutableRefObject } from "react";

type TranscriptionViewProps = {
  segments: LocalSegment[] | undefined;
  activeSegmentId: string | null;
  activeWordHighlight: { segmentId: string; index: number } | null;
  wordDetailsVisibility: Record<string, boolean>;
  editingSegmentId: string | null;
  editingValue: string;
  editingWordInputs: string[] | null;
  editingWordTimings: LocalWordTiming[] | null;
  savingEdit: boolean;
  audioReady: boolean;
  onSpeakerClick: (segment: LocalSegment) => void;
  onPlaySegment: (segment: LocalSegment) => void;
  onStartEdit: (segment: LocalSegment) => void;
  onWordInputChange: (index: number, nextValue: string) => void;
  onEditValueChange: (value: string) => void;
  onCancelEdit: () => void;
  onSaveEdit: () => void;
  onWordDetailsToggle: (segmentId: string) => void;
  onKeyDown: (event: React.KeyboardEvent<HTMLElement>) => void;
  segmentCardRefs: MutableRefObject<Map<string, HTMLDivElement>>;
  t: (key: string, options?: Record<string, unknown>) => string;
};

export function TranscriptionView({
  segments,
  activeSegmentId,
  activeWordHighlight,
  wordDetailsVisibility,
  editingSegmentId,
  editingValue,
  editingWordInputs,
  editingWordTimings,
  savingEdit,
  audioReady,
  onSpeakerClick,
  onPlaySegment,
  onStartEdit,
  onWordInputChange,
  onEditValueChange,
  onCancelEdit,
  onSaveEdit,
  onWordDetailsToggle,
  onKeyDown,
  segmentCardRefs,
  t,
}: TranscriptionViewProps) {
  if (!segments || segments.length === 0) {
    return null;
  }

  return (
    <Stack spacing={2}>
      {segments.map((segment) => {
        const isActiveSegment = activeSegmentId === segment.id;
        const isEditing = editingSegmentId === segment.id;
        const hasTimingInfo = segmentHasTiming(segment);
        const startMsValue = getSegmentStartMs(segment);
        const endMsValue = getSegmentEndMs(segment);
        const startLabel = startMsValue !== null ? `${(startMsValue / 1000).toFixed(1)}s` : null;
        const endLabel = endMsValue !== null ? `${(endMsValue / 1000).toFixed(1)}s` : null;
        const timingLabel = hasTimingInfo
          ? startLabel && endLabel
            ? `${startLabel} ~ ${endLabel}`
            : startLabel ?? ""
          : "";
        const playDisabled = !audioReady || !hasTimingInfo;
        const isWordDetailsVisible = Boolean(wordDetailsVisibility[segment.id]);
        const hasWordEditorData =
          editingWordInputs &&
          editingWordTimings &&
          editingWordInputs.length === editingWordTimings.length &&
          isEditing;
        const previewText =
          hasWordEditorData && editingWordInputs ? editingWordInputs.filter(Boolean).join(" ") : "";

        return (
          <Card
            key={segment.id}
            ref={(node) => {
              if (node) {
                segmentCardRefs.current.set(segment.id, node);
              } else {
                segmentCardRefs.current.delete(segment.id);
              }
            }}
            tabIndex={-1}
          >
            <CardContent>
              <Stack direction="row" spacing={2} alignItems="center" sx={{ mb: 1 }}>
                <Chip
                  label={
                    segment.speaker_label
                      ? t("speaker", { values: { speaker: segment.speaker_label } })
                      : t("speakerNotSpecified")
                  }
                  color="primary"
                  variant="outlined"
                  onClick={() => onSpeakerClick(segment)}
                />
                <Typography variant="caption" color="text.secondary">
                  {timingLabel}
                </Typography>
                <Button
                  size="small"
                  variant={isActiveSegment ? "contained" : "text"}
                  onClick={() => onPlaySegment(segment)}
                  disabled={playDisabled}
                  aria-label={t("playTheSection")}
                  sx={{ minWidth: 36 }}
                >
                  {isActiveSegment ? t("playing") : <PlayArrowIcon fontSize="small" />}
                </Button>
                <FormControlLabel
                  control={
                    <Switch
                      size="small"
                      checked={isWordDetailsVisible}
                      onChange={() => onWordDetailsToggle(segment.id)}
                    />
                  }
                  label={t("showWordDetails")}
                />
                <Button size="small" variant="outlined" onClick={() => onStartEdit(segment)}>
                  {t("edit")}
                </Button>
              </Stack>
              <Divider sx={{ mb: 1 }} />
              {isEditing ? (
                hasWordEditorData && editingWordInputs && editingWordTimings ? (
                  <Stack spacing={1.25}>
                    <Typography variant="subtitle2">{t("wordByWordCorrection")}</Typography>
                    <Box sx={{ display: "flex", flexWrap: "wrap", gap: 1 }}>
                      {editingWordInputs.map((value, wordIndex) => (
                        <TextField
                          key={`${segment.id}-word-editor-${wordIndex}`}
                          label={t("word", { values: { index: wordIndex + 1 } })}
                          size="small"
                          value={value}
                          disabled={savingEdit}
                          onChange={(event) => onWordInputChange(wordIndex, event.target.value)}
                          onKeyDown={onKeyDown}
                          autoFocus={wordIndex === 0}
                          sx={{ minWidth: 120 }}
                        />
                      ))}
                    </Box>
                    <Typography variant="body2" color="text.secondary">
                      {previewText ? t("preview", { values: { text: previewText } }) : t("noWordsWereEntered")}
                    </Typography>
                    <Typography variant="caption" color="text.secondary">
                      {t("youCanCancelWithEscAndSaveWithCtrlEnter")}
                    </Typography>
                    <Stack direction="row" spacing={1} justifyContent="flex-end">
                      <Button onClick={onCancelEdit} disabled={savingEdit}>
                        {t("cancellation")}
                      </Button>
                      <Button variant="contained" onClick={onSaveEdit} disabled={savingEdit}>
                        {savingEdit ? t("saving2") : t("save")}
                      </Button>
                    </Stack>
                  </Stack>
                ) : (
                  <Stack spacing={1}>
                    <TextField
                      multiline
                      minRows={3}
                      fullWidth
                      label={t("redactedText")}
                      value={editingValue}
                      disabled={savingEdit}
                      onChange={(event) => onEditValueChange(event.target.value)}
                      autoFocus
                      onKeyDown={onKeyDown}
                    />
                    <Stack direction="row" spacing={1} justifyContent="flex-end">
                      <Button onClick={onCancelEdit} disabled={savingEdit}>
                        {t("cancellation")}
                      </Button>
                      <Button variant="contained" onClick={onSaveEdit} disabled={savingEdit}>
                        {savingEdit ? t("saving2") : t("save")}
                      </Button>
                    </Stack>
                  </Stack>
                )
              ) : (
                <Stack
                  spacing={1}
                  onDoubleClick={() => onStartEdit(segment)}
                  sx={{ cursor: "text" }}
                >
                  <Typography variant="body1">{resolveSegmentText(segment, true)}</Typography>
                  {segment.correctedText ? (
                    <Typography variant="caption" color="text.secondary">
                      {t("text")}
                    </Typography>
                  ) : null}
                  {segment.rawText && segment.rawText !== segment.text ? (
                    <Typography variant="caption" color="text.secondary">
                      {t("raw")}: {segment.rawText}
                    </Typography>
                  ) : null}
                </Stack>
              )}

              {isWordDetailsVisible && segment.words && segment.words.length > 0 ? (
                <Stack spacing={0.5} sx={{ mt: 1 }}>
                  <Typography variant="caption" color="text.secondary">
                    {t("wordLevelDetails")}
                  </Typography>
                  <Stack spacing={0.5}>
                    {segment.words.map((word, wordIndex) => {
                      const isActiveWord =
                        activeWordHighlight?.segmentId === segment.id && activeWordHighlight?.index === wordIndex;
                      const timing = resolveWordTimingMs(segment, word);
                      const tooltipTitle = `start_at: ${formatSecondsLabel(
                        timing.startMs
                      )}s · duration: ${formatSecondsLabel(timing.durationMs)}s`;
                      return (
                        <Tooltip key={`${segment.id}-${wordIndex}`} title={tooltipTitle} enterTouchDelay={0} leaveTouchDelay={1500}>
                          <Stack
                            direction="row"
                            spacing={1}
                            alignItems="center"
                            sx={{
                              p: 0.5,
                              borderRadius: 1,
                              backgroundColor: isActiveWord ? "primary.light" : "transparent",
                            }}
                          >
                            <Typography variant="body2">{word.text}</Typography>
                            <Typography variant="caption" color="text.secondary">
                              {`${timing.startMs}ms - ${timing.startMs + timing.durationMs}ms`}
                            </Typography>
                            {hasWordEditorData ? (
                              <TextField
                                size="small"
                                value={editingWordInputs?.[wordIndex] ?? ""}
                                onChange={(e) => onWordInputChange(wordIndex, e.target.value)}
                                sx={{ minWidth: 120 }}
                              />
                            ) : null}
                          </Stack>
                        </Tooltip>
                      );
                    })}
                  </Stack>
                </Stack>
              ) : null}
            </CardContent>
          </Card>
        );
      })}
    </Stack>
  );
}
