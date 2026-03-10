import { Alert, Box, Button, Card, CardContent, Chip, Stack, Typography } from "@mui/material";
import SwapHorizRoundedIcon from "@mui/icons-material/SwapHorizRounded";
import TranslateIcon from "@mui/icons-material/Translate";
import { Link as RouterLink } from "react-router-dom";
import { useI18n } from "../i18n";
import { ActionStrip, ContextCard, StudioPageShell } from "../components/studio";
import { platformFeatureFlags, resolveRealtimeCapturePath } from "../app/platformRoutes";
import {
  derivePlatformFeatureAvailability,
  platformCapabilities,
} from "../app/platformCapabilities";

export default function TranslatePage() {
  const { t } = useI18n();
  const availability = derivePlatformFeatureAvailability(
    platformFeatureFlags,
    platformCapabilities
  );

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
          <ContextCard
            title={t("translatorPhaseOne")}
            value={
              availability.translateTurnFinalEnabled
                ? `${t("finalTurnsOnly")} · ${t("artifactReady")}`
                : `${t("finalTurnsOnly")} · ${t("translationPending")}`
            }
            tone={availability.translateTurnFinalEnabled ? "secondary" : "warning"}
          />
          <ContextCard
            title={t("translatorPhaseTwo")}
            value={
              availability.translateTurnPartialEnabled
                ? `${t("streamingPartialTranslation")} · ${t("artifactReady")}`
                : `${t("streamingPartialTranslation")} · ${t("artifactPending")}`
            }
            tone="neutral"
          />
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
                      {availability.translateTurnFinalEnabled
                        ? t("artifactReady")
                        : t("translationUnavailable")}
                    </Typography>
                  </Stack>
                  <Typography variant="body2" color="text.secondary">
                    {availability.translateTurnFinalEnabled
                      ? t("translationProviderEnabledHelper")
                      : t("translationUnavailableHelper")}
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
