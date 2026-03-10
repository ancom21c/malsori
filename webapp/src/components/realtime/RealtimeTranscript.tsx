import {
  Box,
  Button,
  Card,
  CardContent,
  Chip,
  Stack,
  TextField,
  Typography,
} from "@mui/material";
import { alpha } from "@mui/material/styles";
import { useRef, useEffect } from "react";
import { useI18n } from "../../i18n";
import { usePrefersReducedMotion } from "../../hooks/usePrefersReducedMotion";

interface RealtimeSegment {
    id: string;
    text: string;
    startMs: number;
    endMs: number;
}

interface RealtimeTranscriptProps {
  segments: RealtimeSegment[];
  partialText: string | null;
  noteMode: boolean;
  onNoteModeChange: (enabled: boolean) => void;
  followLive: boolean;
  onFollowLiveChange: (enabled: boolean) => void;
  noteModeText: string;
  sessionState: string;
  compactLayout?: boolean;
}

export default function RealtimeTranscript({
  segments,
  partialText,
  noteMode,
  onNoteModeChange,
  followLive,
  onFollowLiveChange,
  noteModeText,
  sessionState,
  compactLayout = false,
}: RealtimeTranscriptProps) {
  const { t } = useI18n();
  const prefersReducedMotion = usePrefersReducedMotion();
  const transcriptEndRef = useRef<HTMLDivElement | null>(null);
  const liveAnnouncementsEnabled = !noteMode && sessionState !== "idle";

  useEffect(() => {
    if (!followLive || (segments.length === 0 && !partialText)) {
      return;
    }
    transcriptEndRef.current?.scrollIntoView({
      behavior: prefersReducedMotion ? "auto" : "smooth",
      block: "end",
    });
  }, [followLive, prefersReducedMotion, segments, partialText]);

  const formatTimeRange = (segment: RealtimeSegment) => {
    const start = (segment.startMs / 1000).toFixed(1);
    const end = (segment.endMs / 1000).toFixed(1);
    return `${start}s ~ ${end}s`;
  };
  const followLiveLabel = `${t("followLive")} · ${t(followLive ? "enabled" : "disabled")}`;

  const isEmpty = segments.length === 0 && !partialText && sessionState === "idle";

  return (
    <Card sx={{ minHeight: 0, flex: 1, display: "flex", flexDirection: "column" }}>
      <CardContent
        sx={{
          flex: 1,
          minHeight: 0,
          display: "flex",
          flexDirection: "column",
          p: compactLayout ? 1.5 : 2,
          "&:last-child": { pb: compactLayout ? 1.5 : 2 },
        }}
      >
        <Stack spacing={compactLayout ? 1.25 : 2} sx={{ flex: 1, minHeight: 0 }}>
          <Stack
            direction="row"
            justifyContent="space-between"
            alignItems="center"
            spacing={compactLayout ? 1 : 1.5}
            useFlexGap
            flexWrap="wrap"
          >
            <Stack spacing={0.5}>
              <Typography variant="overline" color="text.secondary" sx={{ lineHeight: 1 }}>
                {noteMode ? t("noteMode") : t("transcript")}
              </Typography>
              <Stack direction="row" spacing={1} useFlexGap>
                <Button
                  size="small"
                  variant={noteMode ? "text" : "contained"}
                  color={noteMode ? "inherit" : "primary"}
                  onClick={() => onNoteModeChange(false)}
                  sx={{ borderRadius: 999, minWidth: compactLayout ? 84 : 96 }}
                >
                  {t("transcript")}
                </Button>
                <Button
                  size="small"
                  variant={noteMode ? "contained" : "text"}
                  color={noteMode ? "primary" : "inherit"}
                  onClick={() => onNoteModeChange(true)}
                  sx={{ borderRadius: 999, minWidth: compactLayout ? 84 : 96 }}
                >
                  {t("noteMode")}
                </Button>
              </Stack>
            </Stack>
            <Button
              size="small"
              variant={followLive ? "contained" : "outlined"}
              color={followLive ? "secondary" : "inherit"}
              onClick={() => onFollowLiveChange(!followLive)}
              sx={{ borderRadius: 999 }}
            >
              {followLiveLabel}
            </Button>
          </Stack>

          <Box sx={{ borderBottom: "1px solid", borderColor: "divider" }} />

          {noteMode ? (
            <TextField
              multiline
              minRows={compactLayout ? 6 : 10}
              fullWidth
              variant="outlined"
              label={t("noteModeTextAreaLabel")}
              placeholder={t("noteModePlaceholder")}
              value={noteModeText}
              InputProps={{
                readOnly: true,
                sx: {
                  fontFamily: '"IBM Plex Sans KR", sans-serif',
                  lineHeight: 1.6,
                },
              }}
            />
          ) : (
            <Box
              sx={{ flex: 1, minHeight: 0, overflowY: "auto", pr: 0.5 }}
              role="log"
              aria-live={liveAnnouncementsEnabled ? "polite" : "off"}
              aria-relevant="additions text"
              aria-atomic="false"
              aria-label={t("realTimeTranscriptLog")}
            >
              {isEmpty ? (
                <Box sx={{ py: compactLayout ? 2.5 : 4, textAlign: "center", color: "text.secondary" }}>
                  <Typography variant="body1">
                    {t("whenYouStartASessionRecognizedSentencesWillAppearInThisAreaInOrder")}
                  </Typography>
                </Box>
              ) : (
                <Stack spacing={compactLayout ? 1.25 : 2}>
                  {segments.map((segment) => (
                    <Box key={segment.id}>
                      <Card
                        variant="outlined"
                        sx={{
                          borderRadius: compactLayout ? 2.5 : 3,
                          bgcolor: "background.paper",
                          "&:hover": { borderColor: "primary.main" },
                        }}
                      >
                        <CardContent sx={{ p: compactLayout ? 1.25 : 2, "&:last-child": { pb: compactLayout ? 1.25 : 2 } }}>
                          <Stack direction="row" spacing={1.5} alignItems="center" sx={{ mb: 0.75 }}>
                            <Chip
                              label={formatTimeRange(segment)}
                              color="success"
                              size="small"
                              variant="outlined"
                              sx={{ fontWeight: 600, fontSize: "0.7rem" }}
                            />
                          </Stack>
                          <Typography variant="body1" sx={{ lineHeight: 1.5 }}>
                            {segment.text}
                          </Typography>
                        </CardContent>
                      </Card>
                    </Box>
                  ))}

                  {partialText && (
                    <Box>
                      <Card
                        variant="outlined"
                        sx={{
                          borderColor: "secondary.main",
                          bgcolor: (theme) => alpha(theme.palette.secondary.main, 0.05),
                          borderRadius: compactLayout ? 2.5 : 3,
                        }}
                      >
                        <CardContent sx={{ p: compactLayout ? 1.25 : 2, "&:last-child": { pb: compactLayout ? 1.25 : 2 } }}>
                          <Stack direction="row" spacing={1.5} alignItems="center" sx={{ mb: 0.75 }}>
                            <Chip
                              label={t("realTimeRecognition")}
                              color="secondary"
                              size="small"
                              sx={{ fontWeight: 600, fontSize: "0.7rem" }}
                            />
                          </Stack>
                          <Typography
                            variant="body1"
                            color="secondary.main"
                            sx={{ lineHeight: 1.5 }}
                          >
                            {partialText}
                          </Typography>
                        </CardContent>
                      </Card>
                    </Box>
                  )}
                </Stack>
              )}
            </Box>
          )}
          <Box ref={transcriptEndRef} sx={{ height: 1 }} />
        </Stack>
      </CardContent>
    </Card>
  );
}
