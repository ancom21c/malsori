import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  Alert,
  Box,
  Button,
  Card,
  CardContent,
  Chip,
  FormControl,
  InputLabel,
  MenuItem,
  Select,
  Stack,
  Typography,
} from "@mui/material";
import TranslateIcon from "@mui/icons-material/Translate";
import ReplayIcon from "@mui/icons-material/Replay";
import { useLiveQuery } from "dexie-react-hooks";
import { Link as RouterLink } from "react-router-dom";
import { useI18n } from "../i18n";
import { ActionStrip, StudioPageShell } from "../components/studio";
import { platformFeatureFlags, resolveRealtimeCapturePath } from "../app/platformRoutes";
import {
  derivePlatformFeatureAvailability,
  platformCapabilities,
} from "../app/platformCapabilities";
import {
  findPlatformBackendProfile,
  platformBackendBindingRuntime,
} from "../app/backendBindingRuntime";
import { buildTranslateBindingPresentation } from "./translateBindingModel";
import { buildTranslateWorkspacePresentation } from "./translateWorkspaceModel";
import { appDb } from "../data/app-db";
import {
  mapLocalSegmentToSessionTurn,
  type SessionTurn,
  type TurnVariantStatus,
} from "../domain/session";
import { useRtzrApiClient } from "../services/api/rtzrApiClientContext";
import {
  buildTurnTranslationId,
  deleteTurnTranslations,
  listTurnTranslations,
  type TurnTranslation,
  upsertTurnTranslation,
} from "../services/data/translationRepository";

const TARGET_LANGUAGE_OPTIONS = [
  { value: "en", label: "EN" },
  { value: "ja", label: "JA" },
  { value: "ko", label: "KO" },
];

function buildTurnSourceRevision(turn: SessionTurn): string {
  return [
    turn.id,
    turn.status,
    turn.startMs,
    turn.endMs,
    turn.sourceLanguage ?? "",
    turn.text,
  ].join(":");
}

export default function TranslatePage() {
  const { t } = useI18n();
  const apiClient = useRtzrApiClient();
  const [targetLanguage, setTargetLanguage] = useState("en");
  const [translationRunnerTick, setTranslationRunnerTick] = useState(0);
  const translationRunnerBusyRef = useRef(false);

  const availability = derivePlatformFeatureAvailability(
    platformFeatureFlags,
    platformCapabilities
  );
  const bindingPresentation = useMemo(
    () =>
      buildTranslateBindingPresentation(
        platformFeatureFlags,
        platformCapabilities,
        availability,
        platformBackendBindingRuntime
      ),
    [availability]
  );
  const finalTranslationResolution = bindingPresentation.finalTranslation.resolution;
  const finalTranslationProfile = useMemo(
    () =>
      findPlatformBackendProfile(
        finalTranslationResolution?.resolvedBackendProfileId,
        platformBackendBindingRuntime
      ),
    [finalTranslationResolution]
  );
  const translationReady =
    bindingPresentation.finalTranslation.ready && Boolean(finalTranslationResolution);

  const activeTranscription = useLiveQuery(async () => {
    const realtimeSessions = await appDb.transcriptions.where("kind").equals("realtime").toArray();
    return (
      realtimeSessions.sort((left, right) => right.updatedAt.localeCompare(left.updatedAt))[0] ??
      null
    );
  }, []);
  const sourceTurns = useLiveQuery(async () => {
    if (!activeTranscription?.id) {
      return [] as SessionTurn[];
    }
    const segments = await appDb.segments
      .where("transcriptionId")
      .equals(activeTranscription.id)
      .sortBy("startMs");
    return segments
      .map(mapLocalSegmentToSessionTurn)
      .filter((turn) => turn.text.trim().length > 0);
  }, [activeTranscription?.id]);
  const turnTranslations = useLiveQuery(async () => {
    if (!activeTranscription?.id) {
      return [];
    }
    return await listTurnTranslations(activeTranscription.id);
  }, [activeTranscription?.id]);

  const translationsByTurnId = useMemo(() => {
    const map = new Map<string, TurnTranslation>();
    (turnTranslations ?? [])
      .filter((record) => record.targetLanguage === targetLanguage)
      .forEach((record) => {
        map.set(record.turnId, record);
      });
    return map;
  }, [targetLanguage, turnTranslations]);

  const workspaceTurns = useMemo(
    () =>
      (sourceTurns ?? []).map((turn) => {
        const translation = translationsByTurnId.get(turn.id) ?? null;
        const variantStatus: TurnVariantStatus =
          turn.status !== "final"
            ? "pending"
            : translation?.status === "ready"
              ? "final"
              : translation?.status === "failed"
                ? "failed"
                : "pending";

        return {
          ...turn,
          variants: [
            {
              id: buildTurnTranslationId(turn.sessionId, turn.id, targetLanguage),
              type: "translation" as const,
              language: targetLanguage,
              text: translation?.status === "ready" ? translation.text : "",
              status: variantStatus,
              errorMessage:
                translation?.status === "failed" ? translation.errorMessage ?? null : null,
            },
          ],
        };
      }),
    [sourceTurns, targetLanguage, translationsByTurnId]
  );
  const workspacePresentation = useMemo(
    () => buildTranslateWorkspacePresentation(bindingPresentation, { turns: workspaceTurns }),
    [bindingPresentation, workspaceTurns]
  );

  const finalTurnsNeedingTranslation = useMemo(() => {
    if (!translationReady) {
      return [] as SessionTurn[];
    }
    return (sourceTurns ?? []).filter((turn) => {
      if (turn.status !== "final" || turn.text.trim().length === 0) {
        return false;
      }
      const translation = translationsByTurnId.get(turn.id);
      if (!translation) {
        return true;
      }
      if (translation.status === "pending" || translation.status === "failed") {
        return false;
      }
      return translation.sourceRevision !== buildTurnSourceRevision(turn);
    });
  }, [sourceTurns, translationReady, translationsByTurnId]);

  const pendingTranslationCount = useMemo(
    () =>
      workspaceTurns.filter((turn) => {
        if (turn.status !== "final") {
          return false;
        }
        const translation = translationsByTurnId.get(turn.id);
        return !translation || translation.status === "pending";
      }).length,
    [translationsByTurnId, workspaceTurns]
  );
  const readyTranslationCount = useMemo(
    () =>
      workspaceTurns.filter(
        (turn) => turn.status === "final" && translationsByTurnId.get(turn.id)?.status === "ready"
      ).length,
    [translationsByTurnId, workspaceTurns]
  );
  const failedTranslationIds = useMemo(
    () =>
      Array.from(translationsByTurnId.values())
        .filter((record) => record.status === "failed")
        .map((record) => record.id),
    [translationsByTurnId]
  );

  useEffect(() => {
    if (
      !translationReady ||
      !activeTranscription ||
      finalTurnsNeedingTranslation.length === 0 ||
      translationRunnerBusyRef.current
    ) {
      return;
    }

    const nextTurn = finalTurnsNeedingTranslation[0];
    const sourceRevision = buildTurnSourceRevision(nextTurn);
    const pendingId = buildTurnTranslationId(
      activeTranscription.id,
      nextTurn.id,
      targetLanguage
    );
    translationRunnerBusyRef.current = true;
    let cancelled = false;

    void (async () => {
      const requestedAt = new Date().toISOString();
      await upsertTurnTranslation({
        id: pendingId,
        sessionId: activeTranscription.id,
        turnId: nextTurn.id,
        sourceRevision,
        sourceText: nextTurn.text,
        sourceLanguage: nextTurn.sourceLanguage ?? null,
        targetLanguage,
        text: "",
        status: "pending",
        requestedAt,
        completedAt: null,
        providerLabel: finalTranslationProfile?.label ?? null,
        model: finalTranslationResolution?.resolvedModel ?? null,
        backendProfileId: finalTranslationResolution?.resolvedBackendProfileId ?? null,
        usedFallback: finalTranslationResolution?.usedFallback ?? false,
        errorMessage: null,
      });

      try {
        const response = await apiClient.requestFinalTurnTranslation({
          sessionId: activeTranscription.id,
          turnId: nextTurn.id,
          sourceRevision,
          text: nextTurn.text,
          speakerLabel: nextTurn.speakerLabel ?? null,
          sourceLanguage: nextTurn.sourceLanguage ?? null,
          targetLanguage,
          startMs: nextTurn.startMs,
          endMs: nextTurn.endMs,
        });
        if (cancelled) {
          return;
        }
        await upsertTurnTranslation({
          id: pendingId,
          sessionId: activeTranscription.id,
          turnId: nextTurn.id,
          sourceRevision: response.sourceRevision,
          sourceText: nextTurn.text,
          sourceLanguage: response.sourceLanguage ?? nextTurn.sourceLanguage ?? null,
          targetLanguage: response.targetLanguage,
          text: response.text,
          status: "ready",
          requestedAt: response.requestedAt,
          completedAt: response.completedAt,
          providerLabel: response.binding.providerLabel,
          model: response.binding.model ?? null,
          backendProfileId: response.binding.resolvedBackendProfileId,
          usedFallback: response.binding.usedFallback,
          errorMessage: null,
        });
      } catch (error) {
        if (cancelled) {
          return;
        }
        await upsertTurnTranslation({
          id: pendingId,
          sessionId: activeTranscription.id,
          turnId: nextTurn.id,
          sourceRevision,
          sourceText: nextTurn.text,
          sourceLanguage: nextTurn.sourceLanguage ?? null,
          targetLanguage,
          text: "",
          status: "failed",
          requestedAt,
          completedAt: new Date().toISOString(),
          providerLabel: finalTranslationProfile?.label ?? null,
          model: finalTranslationResolution?.resolvedModel ?? null,
          backendProfileId: finalTranslationResolution?.resolvedBackendProfileId ?? null,
          usedFallback: finalTranslationResolution?.usedFallback ?? false,
          errorMessage:
            error instanceof Error ? error.message : t("translationProviderRequestFailed"),
        });
      } finally {
        translationRunnerBusyRef.current = false;
        if (!cancelled) {
          setTranslationRunnerTick((tick) => tick + 1);
        }
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [
    activeTranscription,
    apiClient,
    finalTranslationProfile,
    finalTranslationResolution,
    finalTurnsNeedingTranslation,
    t,
    targetLanguage,
    translationReady,
    translationRunnerTick,
  ]);

  const handleRetryFailedTranslations = useCallback(() => {
    void deleteTurnTranslations(failedTranslationIds).then(() => {
      setTranslationRunnerTick((tick) => tick + 1);
    });
  }, [failedTranslationIds]);

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
        <Alert severity={activeTranscription ? "info" : "warning"}>
          {activeTranscription ? t("translationShellHelper") : t("translationNoRealtimeSession")}
        </Alert>

        <ActionStrip ariaLabel={t("translationWorkspaceRail")} variant="content">
          <FormControl size="small" sx={{ minWidth: 160 }}>
            <InputLabel id="translate-target-language-label">
              {t("translationTargetLanguage")}
            </InputLabel>
            <Select
              labelId="translate-target-language-label"
              value={targetLanguage}
              label={t("translationTargetLanguage")}
              onChange={(event) => {
                setTargetLanguage(String(event.target.value));
              }}
            >
              {TARGET_LANGUAGE_OPTIONS.map((option) => (
                <MenuItem key={option.value} value={option.value}>
                  {option.label}
                </MenuItem>
              ))}
            </Select>
          </FormControl>
          <Button
            variant="outlined"
            size="small"
            startIcon={<ReplayIcon fontSize="small" />}
            disabled={failedTranslationIds.length === 0}
            onClick={handleRetryFailedTranslations}
          >
            {t("translationRetryFailed")}
          </Button>
        </ActionStrip>

        <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap>
          <Chip
            color="primary"
            variant="outlined"
            label={`${t("translationRoute")}: ${t("finalTurnsOnly")}`}
          />
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
          <Chip variant="outlined" label={`${t("translatedOutput")}: ${targetLanguage.toUpperCase()}`} />
          {finalTranslationProfile ? (
            <Chip variant="outlined" label={finalTranslationProfile.label} />
          ) : null}
          {activeTranscription ? (
            <Chip variant="outlined" label={`${t("session")}: ${activeTranscription.title}`} />
          ) : null}
        </Stack>

        <Box
          sx={{
            display: "grid",
            gridTemplateColumns: { xs: "1fr", lg: "1.25fr 0.9fr" },
            gap: 2,
            alignItems: "stretch",
          }}
        >
          <Card
            variant="outlined"
            sx={{
              borderColor: "var(--malsori-workspace-border)",
              bgcolor: "var(--malsori-workspace-panel)",
              boxShadow: "0 18px 36px rgba(0, 0, 0, 0.18)",
            }}
          >
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
                  {workspacePresentation.turnGroups.length > 0 ? (
                    workspacePresentation.turnGroups.map((group) => (
                      <Box
                        key={group.id}
                        sx={{
                          display: "grid",
                          gridTemplateColumns: {
                            xs: "1fr",
                            md: "minmax(0, 1.15fr) minmax(0, 0.85fr)",
                          },
                          gap: 1,
                          p: 1.25,
                          borderRadius: 2.5,
                          border: "1px solid",
                          borderColor: "var(--malsori-workspace-border)",
                          bgcolor: "var(--malsori-workspace-rail)",
                        }}
                      >
                        <Stack spacing={0.75}>
                          <Stack direction="row" spacing={1} alignItems="center" flexWrap="wrap">
                            <Chip
                              size="small"
                              variant="outlined"
                              label={t(group.sourceStatusLabelKey)}
                            />
                            <Chip size="small" color="secondary" label={t("sourceTranscript")} />
                            <Chip size="small" variant="outlined" label={group.speakerLabel} />
                            <Chip
                              size="small"
                              variant="outlined"
                              label={group.sourceLanguageLabel}
                            />
                          </Stack>
                          <Typography variant="body1" fontWeight={600}>
                            {group.sourceText}
                          </Typography>
                          <Typography variant="body2" color="text.secondary">
                            {t(
                              group.sourceStatusLabelKey === "finalTurnsOnly"
                                ? "translationFinalSourceHelper"
                                : "translationPartialSourceHelper"
                            )}
                          </Typography>
                        </Stack>

                        <Stack spacing={0.75}>
                          <Stack direction="row" spacing={1} alignItems="center" flexWrap="wrap">
                            <Chip
                              size="small"
                              color={group.translationVariant.ready ? "success" : "default"}
                              variant={group.translationVariant.ready ? "filled" : "outlined"}
                              label={t(group.translationVariant.statusLabelKey)}
                            />
                            <Chip size="small" variant="outlined" label={t("translatedOutput")} />
                            <Chip
                              size="small"
                              variant="outlined"
                              label={group.translationVariant.languageLabel}
                            />
                          </Stack>
                          {group.translationVariant.text ? (
                            <Typography variant="body1">
                              {group.translationVariant.text}
                            </Typography>
                          ) : null}
                          <Typography
                            variant="body2"
                            color={
                              group.translationVariant.errorMessage ? "error.main" : "text.secondary"
                            }
                          >
                            {group.translationVariant.errorMessage ??
                              t(group.translationVariant.helperTextKey)}
                          </Typography>
                        </Stack>
                      </Box>
                    ))
                  ) : (
                    <Alert severity="info">{t("translationSourceEmptyState")}</Alert>
                  )}
                </Stack>
              </Stack>
            </CardContent>
          </Card>

          <Card
            variant="outlined"
            sx={{
              borderColor: "var(--malsori-workspace-border)",
              bgcolor: "var(--malsori-workspace-panel)",
              boxShadow: "0 18px 36px rgba(0, 0, 0, 0.18)",
            }}
          >
            <CardContent>
              <Stack spacing={1.5}>
                <Stack direction="row" spacing={1} alignItems="center" flexWrap="wrap" useFlexGap>
                  <Typography variant="subtitle1" fontWeight={700}>
                    {t("translationWorkspaceRail")}
                  </Typography>
                  <Chip
                    size="small"
                    color={pendingTranslationCount > 0 ? "warning" : "success"}
                    variant="outlined"
                    label={
                      pendingTranslationCount > 0 ? t("translationPending") : t("artifactReady")
                    }
                  />
                </Stack>
                <Typography variant="body2" color="text.secondary">
                  {t(workspacePresentation.sourceFallbackHelperKey)}
                </Typography>
                <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap>
                  <Chip
                    size="small"
                    variant="outlined"
                    label={`${t("artifactReady")}: ${readyTranslationCount}`}
                  />
                  <Chip
                    size="small"
                    variant="outlined"
                    label={`${t("translationPending")}: ${pendingTranslationCount}`}
                  />
                  <Chip
                    size="small"
                    variant="outlined"
                    color={failedTranslationIds.length > 0 ? "error" : "default"}
                    label={`${t("artifactFailed")}: ${failedTranslationIds.length}`}
                  />
                </Stack>
                <Stack spacing={1}>
                  {workspacePresentation.lanes.map((lane) => (
                    <Box
                      key={`rail-${lane.id}`}
                      sx={{
                        p: 1.25,
                        borderRadius: 2.5,
                        border: "1px dashed",
                        borderColor: "var(--malsori-workspace-border)",
                        bgcolor: "var(--malsori-workspace-rail)",
                      }}
                    >
                      <Stack
                        direction="row"
                        spacing={1}
                        alignItems="center"
                        sx={{ mb: 0.75 }}
                        flexWrap="wrap"
                        useFlexGap
                      >
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
