import { Alert, Box, Button, Card, CardContent, Chip, Stack, Typography } from "@mui/material";
import TranslateIcon from "@mui/icons-material/Translate";
import { Link as RouterLink } from "react-router-dom";
import { useI18n } from "../i18n";
import { ActionStrip, StudioPageShell } from "../components/studio";
import { platformFeatureFlags, resolveRealtimeCapturePath } from "../app/platformRoutes";
import {
  derivePlatformFeatureAvailability,
  platformCapabilities,
} from "../app/platformCapabilities";
import { buildTranslateBindingPresentation } from "./translateBindingModel";
import { buildTranslateWorkspacePresentation } from "./translateWorkspaceModel";

export default function TranslatePage() {
  const { t } = useI18n();
  const availability = derivePlatformFeatureAvailability(
    platformFeatureFlags,
    platformCapabilities
  );
  const bindingPresentation = buildTranslateBindingPresentation(
    platformFeatureFlags,
    platformCapabilities,
    availability,
    { profiles: [], bindings: [] }
  );
  const workspacePresentation = buildTranslateWorkspacePresentation(bindingPresentation);

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
      <Stack spacing={2}>
        <Alert severity="info">{t("translationShellHelper")}</Alert>

        <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap>
          <Chip color="primary" variant="outlined" label={`${t("translationRoute")}: ${t(workspacePresentation.routeLabelKey)}`} />
          <Chip color="secondary" variant="outlined" label={t("capturePrimary")} />
          <Chip
            variant="outlined"
            color={bindingPresentation.finalTranslation.ready ? "success" : "default"}
            label={`${t("finalTurnsOnly")}: ${t(bindingPresentation.finalTranslation.statusLabelKey)}`}
          />
          <Chip
            variant="outlined"
            color={bindingPresentation.partialTranslation.ready ? "success" : "default"}
            label={`${t("streamingPartialTranslation")}: ${t(bindingPresentation.partialTranslation.statusLabelKey)}`}
          />
        </Stack>

        <Box
          sx={{
            display: "grid",
            gridTemplateColumns: { xs: "1fr", lg: "1.25fr 0.9fr" },
            gap: 2,
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
                  {t(workspacePresentation.sourcePrimaryHelperKey)}
                </Typography>
                <Stack spacing={1}>
                  {workspacePresentation.lanes.map((lane) => (
                    <Box
                      key={lane.id}
                      sx={{
                        display: "grid",
                        gridTemplateColumns: { xs: "1fr", md: "minmax(0, 1.15fr) minmax(0, 0.85fr)" },
                        gap: 1,
                        p: 1.25,
                        borderRadius: 2.5,
                        border: "1px solid",
                        borderColor: "divider",
                        bgcolor: "background.default",
                      }}
                    >
                      <Stack spacing={0.75}>
                        <Stack direction="row" spacing={1} alignItems="center" flexWrap="wrap">
                          <Chip size="small" variant="outlined" label={t(lane.sourceTitleKey)} />
                          <Chip size="small" color="secondary" label={t("sourceTranscript")} />
                        </Stack>
                        <Typography variant="body2" color="text.secondary">
                          {t(lane.sourceHelperKey)}
                        </Typography>
                      </Stack>

                      <Stack spacing={0.75}>
                        <Stack direction="row" spacing={1} alignItems="center" flexWrap="wrap">
                          <Chip
                            size="small"
                            color={lane.translationReady ? "success" : "default"}
                            variant={lane.translationReady ? "filled" : "outlined"}
                            label={t(lane.translationStatusLabelKey)}
                          />
                          <Chip size="small" variant="outlined" label={t("translatedOutput")} />
                        </Stack>
                        <Typography variant="body2" color="text.secondary">
                          {t(lane.translationHelperTextKey)}
                        </Typography>
                      </Stack>
                    </Box>
                  ))}
                </Stack>
              </Stack>
            </CardContent>
          </Card>

          <Card variant="outlined">
            <CardContent>
              <Stack spacing={1.5}>
                <Stack direction="row" spacing={1} alignItems="center" flexWrap="wrap" useFlexGap>
                  <Typography variant="subtitle1" fontWeight={700}>
                    {t("translationWorkspaceRail")}
                  </Typography>
                  <Chip size="small" color="warning" variant="outlined" label={t("translationPending")} />
                </Stack>
                <Typography variant="body2" color="text.secondary">
                  {t(workspacePresentation.sourceFallbackHelperKey)}
                </Typography>
                <Stack spacing={1}>
                  {workspacePresentation.lanes.map((lane) => (
                    <Box
                      key={`rail-${lane.id}`}
                      sx={{
                        p: 1.25,
                        borderRadius: 2.5,
                        border: "1px dashed",
                        borderColor: "divider",
                        bgcolor: "background.default",
                      }}
                    >
                      <Stack direction="row" spacing={1} alignItems="center" sx={{ mb: 0.75 }} flexWrap="wrap" useFlexGap>
                        <Typography variant="body2" fontWeight={600}>
                          {t(
                            lane.id === "final"
                              ? "translationFinalVariantLane"
                              : "translationPartialVariantLane"
                          )}
                        </Typography>
                        <Chip
                          size="small"
                          color={lane.translationReady ? "success" : "default"}
                          variant={lane.translationReady ? "filled" : "outlined"}
                          label={t(lane.translationStatusLabelKey)}
                        />
                      </Stack>
                      <Typography variant="body2" color="text.secondary">
                        {t(lane.translationHelperTextKey)}
                      </Typography>
                    </Box>
                  ))}
                </Stack>
              </Stack>
            </CardContent>
          </Card>
        </Box>
      </Stack>
    </StudioPageShell>
  );
}
