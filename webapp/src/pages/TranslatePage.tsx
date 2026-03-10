import { Alert, Box, Button, Card, CardContent, Chip, Stack, Typography } from "@mui/material";
import SwapHorizRoundedIcon from "@mui/icons-material/SwapHorizRounded";
import TranslateIcon from "@mui/icons-material/Translate";
import { Link as RouterLink } from "react-router-dom";
import { useI18n } from "../i18n";
import { ActionStrip, ContextCard, StudioPageShell } from "../components/studio";
import { resolveRealtimeCapturePath } from "../app/platformRoutes";

export default function TranslatePage() {
  const { t } = useI18n();

  return (
    <StudioPageShell
      title={t("realtimeTranslateTitle")}
      description={t("realtimeTranslateDescription")}
      headingId="translate-page-title"
      actionSlot={
        <ActionStrip ariaLabel={t("quickActions")} variant="header" sx={{ minWidth: 0 }}>
          <Button
            component={RouterLink}
            to={resolveRealtimeCapturePath()}
            variant="contained"
            size="small"
            startIcon={<TranslateIcon fontSize="small" />}
          >
            {t("openCaptureWorkspace")}
          </Button>
        </ActionStrip>
      }
    >
      <Stack spacing={2.25}>
        <Alert severity="info">{t("translationShellHelper")}</Alert>

        <Stack direction={{ xs: "column", md: "row" }} spacing={1.5}>
          <ContextCard title={t("translationRoute")} value={t("autoDetectToEnglish")} tone="primary" />
          <ContextCard title={t("translatorPhaseOne")} value={t("finalTurnsOnly")} tone="secondary" />
          <ContextCard title={t("translatorPhaseTwo")} value={t("streamingPartialTranslation")} tone="neutral" />
        </Stack>

        <Box
          sx={{
            display: "grid",
            gridTemplateColumns: { xs: "1fr", lg: "1fr 1fr" },
            gap: 2.25,
            alignItems: "stretch",
          }}
        >
          <Card variant="outlined">
            <CardContent>
              <Stack spacing={1.5}>
                <Stack direction="row" spacing={1} alignItems="center">
                  <Typography variant="subtitle1" fontWeight={700}>
                    {t("sourceTranscript")}
                  </Typography>
                  <Chip size="small" variant="outlined" label={t("capturePrimary")} />
                </Stack>
                <Typography variant="body2" color="text.secondary">
                  {t("sourceTranscriptPrimaryHelper")}
                </Typography>
                <Box
                  sx={{
                    p: 2,
                    borderRadius: 3,
                    border: "1px solid",
                    borderColor: "divider",
                    bgcolor: "background.default",
                  }}
                >
                  <Typography variant="body2" color="text.secondary">
                    {t("translationSourceEmptyState")}
                  </Typography>
                </Box>
              </Stack>
            </CardContent>
          </Card>

          <Card variant="outlined">
            <CardContent>
              <Stack spacing={1.5}>
                <Stack direction="row" spacing={1} alignItems="center">
                  <Typography variant="subtitle1" fontWeight={700}>
                    {t("translatedOutput")}
                  </Typography>
                  <Chip size="small" color="warning" variant="outlined" label={t("translationPending")} />
                </Stack>
                <Typography variant="body2" color="text.secondary">
                  {t("sourceOnlyFallback")}
                </Typography>
                <Box
                  sx={{
                    p: 2,
                    borderRadius: 3,
                    border: "1px dashed",
                    borderColor: "divider",
                    bgcolor: "background.default",
                  }}
                >
                  <Stack direction="row" spacing={1} alignItems="center" sx={{ mb: 1 }}>
                    <SwapHorizRoundedIcon fontSize="small" color="action" />
                    <Typography variant="body2" fontWeight={600}>
                      {t("translationUnavailable")}
                    </Typography>
                  </Stack>
                  <Typography variant="body2" color="text.secondary">
                    {t("translationUnavailableHelper")}
                  </Typography>
                </Box>
              </Stack>
            </CardContent>
          </Card>
        </Box>
      </Stack>
    </StudioPageShell>
  );
}
