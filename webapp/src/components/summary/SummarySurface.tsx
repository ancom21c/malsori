import {
  Box,
  Button,
  Card,
  CardContent,
  Chip,
  Divider,
  Drawer,
  Stack,
  Typography,
} from "@mui/material";
import { alpha } from "@mui/material/styles";
import { useI18n } from "../../i18n";
import type {
  ArtifactSupportingSnippet,
  SummaryPresetApplyScope,
} from "../../domain/session";
import type {
  SummarySurfaceMode,
  SummarySurfaceView,
} from "./summarySurfaceModel";

export interface SummaryModeOption {
  value: SummarySurfaceMode;
  labelKey: "off" | "summaryLive" | "summaryFull";
}

export interface SummarySurfacePresetOption {
  value: string;
  label: string;
}

export interface SummarySurfaceAction {
  labelKey: "summaryGenerate" | "summaryRegenerate" | "summaryRetry" | "summaryOpenDetail";
  onClick: () => void;
  disabled?: boolean;
  variant?: "contained" | "outlined" | "text";
}

export interface SummarySurfaceControls {
  presetOptions: SummarySurfacePresetOption[];
  selectedPresetId: string;
  onPresetChange: (presetId: string) => void;
  applyScope: SummaryPresetApplyScope;
  onApplyScopeChange: (scope: SummaryPresetApplyScope) => void;
  applyScopeHelperKey:
    | "summaryPresetApplyFromNowHelper"
    | "summaryPresetRegenerateAllHelper";
  primaryAction?: SummarySurfaceAction | null;
  secondaryAction?: SummarySurfaceAction | null;
  disabled?: boolean;
}

interface SummarySurfaceProps {
  compactLayout: boolean;
  open: boolean;
  onToggle: () => void;
  selectedMode: SummarySurfaceMode;
  onModeChange: (mode: SummarySurfaceMode) => void;
  modeOptions: SummaryModeOption[];
  view: SummarySurfaceView;
  onJumpToSnippet?: (snippet: ArtifactSupportingSnippet) => void;
  controls?: SummarySurfaceControls;
}

function renderModeLabelKey(mode: SummarySurfaceMode): "off" | "summaryLive" | "summaryFull" {
  switch (mode) {
    case "realtime":
      return "summaryLive";
    case "full":
      return "summaryFull";
    default:
      return "off";
  }
}

export default function SummarySurface({
  compactLayout,
  open,
  onToggle,
  selectedMode,
  onModeChange,
  modeOptions,
  view,
  onJumpToSnippet,
  controls,
}: SummarySurfaceProps) {
  const { t } = useI18n();
  const statusChipColor: "default" | "success" | "warning" | "error" =
    view.status === "ready"
      ? "success"
      : view.status === "pending" || view.status === "updating" || view.status === "stale"
        ? "warning"
        : view.status === "failed"
          ? "error"
          : "default";

  const content = (
    <Stack spacing={1.5}>
      <Stack spacing={1}>
        <Stack
          direction="row"
          spacing={0.75}
          useFlexGap
          flexWrap="wrap"
          alignItems="center"
          justifyContent="space-between"
        >
          <Stack direction="row" spacing={0.75} useFlexGap flexWrap="wrap">
            <Chip size="small" color="primary" label={t("summary")} />
            <Chip size="small" variant="outlined" label={view.presetLabel} />
            {view.presetBadgeKey ? (
              <Chip size="small" variant="outlined" color="secondary" label={t(view.presetBadgeKey)} />
            ) : null}
            {view.statusLabelKey ? (
              <Chip
                size="small"
                color={statusChipColor}
                variant={view.status === "ready" ? "filled" : "outlined"}
                label={t(view.statusLabelKey)}
              />
            ) : null}
          </Stack>
          {view.providerLabel ? (
            <Typography variant="caption" color="text.secondary">
              {view.providerLabel}
            </Typography>
          ) : null}
        </Stack>

        <Stack direction="row" spacing={0.75} useFlexGap flexWrap="wrap">
          {modeOptions.map((option) => (
            <Chip
              key={option.value}
              label={t(option.labelKey)}
              color={selectedMode === option.value ? "primary" : "default"}
              variant={selectedMode === option.value ? "filled" : "outlined"}
              clickable
              onClick={() => onModeChange(option.value)}
              size="small"
            />
          ))}
        </Stack>
      </Stack>

      {controls ? (
        <Stack spacing={1}>
          <Stack spacing={0.5}>
            <Typography variant="caption" color="text.secondary">
              {t("summaryPreset")}
            </Typography>
            <Stack direction="row" spacing={0.75} useFlexGap flexWrap="wrap">
              {controls.presetOptions.map((option) => (
                <Chip
                  key={option.value}
                  size="small"
                  label={option.label}
                  color={controls.selectedPresetId === option.value ? "primary" : "default"}
                  variant={controls.selectedPresetId === option.value ? "filled" : "outlined"}
                  clickable={!controls.disabled}
                  onClick={() => {
                    if (controls.disabled) {
                      return;
                    }
                    controls.onPresetChange(option.value);
                  }}
                />
              ))}
            </Stack>
          </Stack>

          <Stack spacing={0.5}>
            <Typography variant="caption" color="text.secondary">
              {t("summaryPresetScope")}
            </Typography>
            <Stack direction="row" spacing={0.75} useFlexGap flexWrap="wrap">
              <Chip
                size="small"
                label={t("summaryPresetApplyFromNow")}
                color={controls.applyScope === "from_now" ? "secondary" : "default"}
                variant={controls.applyScope === "from_now" ? "filled" : "outlined"}
                clickable={!controls.disabled}
                onClick={() => {
                  if (controls.disabled) {
                    return;
                  }
                  controls.onApplyScopeChange("from_now");
                }}
              />
              <Chip
                size="small"
                label={t("summaryPresetRegenerateAll")}
                color={controls.applyScope === "regenerate_all" ? "secondary" : "default"}
                variant={controls.applyScope === "regenerate_all" ? "filled" : "outlined"}
                clickable={!controls.disabled}
                onClick={() => {
                  if (controls.disabled) {
                    return;
                  }
                  controls.onApplyScopeChange("regenerate_all");
                }}
              />
            </Stack>
            <Typography variant="caption" color="text.secondary">
              {t(controls.applyScopeHelperKey)}
            </Typography>
          </Stack>

          {controls.primaryAction || controls.secondaryAction ? (
            <Stack direction="row" spacing={0.75} useFlexGap flexWrap="wrap">
              {controls.primaryAction ? (
                <Button
                  size="small"
                  variant={controls.primaryAction.variant ?? "contained"}
                  onClick={controls.primaryAction.onClick}
                  disabled={controls.disabled || controls.primaryAction.disabled}
                >
                  {t(controls.primaryAction.labelKey)}
                </Button>
              ) : null}
              {controls.secondaryAction ? (
                <Button
                  size="small"
                  variant={controls.secondaryAction.variant ?? "outlined"}
                  onClick={controls.secondaryAction.onClick}
                  disabled={controls.disabled || controls.secondaryAction.disabled}
                >
                  {t(controls.secondaryAction.labelKey)}
                </Button>
              ) : null}
            </Stack>
          ) : null}
        </Stack>
      ) : null}

      <Divider />

      {view.sections.length > 0 ? (
        <Stack spacing={1}>
          {view.sections.map((section) => (
            <Card
              key={section.id}
              variant="outlined"
              sx={{
                borderColor: "var(--malsori-workspace-border)",
                bgcolor: "var(--malsori-workspace-rail)",
              }}
            >
              <CardContent sx={{ p: 1.25, "&:last-child": { pb: 1.25 } }}>
                <Stack spacing={1}>
                  <Typography variant="subtitle2" fontWeight={700}>
                    {section.title}
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    {section.content}
                  </Typography>
                  {section.supportingSnippets.length > 0 ? (
                    <Stack spacing={0.75}>
                      {section.supportingSnippets.map((snippet) => (
                        <Button
                          key={snippet.id}
                          variant="text"
                          color="inherit"
                          onClick={() => onJumpToSnippet?.(snippet)}
                          sx={{
                            justifyContent: "flex-start",
                            textAlign: "left",
                            px: 0,
                            py: 0.25,
                            minHeight: 0,
                            color: "text.secondary",
                          }}
                        >
                          <Stack spacing={0.25} alignItems="flex-start">
                            <Typography variant="caption" color="text.secondary">
                              {snippet.speakerLabel ?? snippet.turnId ?? t("transcript")}
                            </Typography>
                            <Typography variant="caption">
                              {snippet.text}
                            </Typography>
                          </Stack>
                        </Button>
                      ))}
                    </Stack>
                  ) : null}
                </Stack>
              </CardContent>
            </Card>
          ))}
        </Stack>
      ) : (
        <Box
          sx={{
            borderRadius: 2.5,
            border: "1px dashed",
            borderColor:
              view.status === "disabled"
                ? alpha("#7c8a9f", 0.35)
                : alpha("#0f766e", 0.25),
            bgcolor:
              view.status === "disabled"
                ? alpha("#f8fafc", 0.8)
                : alpha("#ecfeff", 0.9),
            p: 1.5,
          }}
        >
          <Typography variant="body2" color="text.secondary">
            {t(view.helperTextKey)}
          </Typography>
        </Box>
      )}
    </Stack>
  );

  return (
    <Stack spacing={1}>
      <Card
        variant="outlined"
        sx={{
          borderColor: "var(--malsori-workspace-border)",
          bgcolor: "var(--malsori-workspace-panel)",
          backgroundImage: (theme) =>
            `linear-gradient(180deg, ${alpha(theme.palette.info.main, 0.12)} 0%, ${alpha(
              theme.palette.background.paper,
              0.98
            )} 54%)`,
        }}
      >
        <CardContent sx={{ p: compactLayout ? 1.25 : 1.5, "&:last-child": { pb: compactLayout ? 1.25 : 1.5 } }}>
          <Stack
            direction="row"
            spacing={1}
            alignItems="center"
            justifyContent="space-between"
            useFlexGap
            flexWrap="wrap"
          >
            <Stack spacing={0.35}>
              <Typography variant="overline" color="text.secondary" sx={{ lineHeight: 1 }}>
                {t("summary")}
              </Typography>
              <Typography variant="subtitle2" fontWeight={700}>
                {t(renderModeLabelKey(selectedMode))}
              </Typography>
            </Stack>
            <Button
              size="small"
              variant={open ? "contained" : "outlined"}
              onClick={onToggle}
            >
              {t(open ? "summaryClose" : "summaryOpen")}
            </Button>
          </Stack>
        </CardContent>
      </Card>

      {compactLayout ? (
        <Drawer
          anchor="bottom"
          open={open}
          onClose={onToggle}
          keepMounted
          PaperProps={{
            sx: {
              borderTopLeftRadius: 20,
              borderTopRightRadius: 20,
              px: 1.5,
              pt: 1.5,
              pb: "calc(16px + var(--malsori-bottom-clearance))",
              maxHeight: "68vh",
              bgcolor: "var(--malsori-workspace-panel)",
            },
          }}
        >
          {content}
        </Drawer>
      ) : open ? (
        <Card
          variant="outlined"
          sx={{
            borderColor: "var(--malsori-workspace-border)",
            bgcolor: "var(--malsori-workspace-panel)",
          }}
        >
          <CardContent sx={{ p: 1.5, "&:last-child": { pb: 1.5 } }}>{content}</CardContent>
        </Card>
      ) : null}
    </Stack>
  );
}
