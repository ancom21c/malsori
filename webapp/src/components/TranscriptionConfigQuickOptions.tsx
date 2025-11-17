import {
  Alert,
  Box,
  Button,
  Collapse,
  Divider,
  FormControl,
  FormControlLabel,
  FormHelperText,
  FormLabel,
  IconButton,
  Stack,
  Switch,
  TextField,
  ToggleButton,
  ToggleButtonGroup,
  Tooltip,
  Typography,
} from "@mui/material";
import { useCallback, useEffect, useMemo, useState } from "react";
import type { BackendEndpointDeployment } from "../data/app-db";
import ExpandLessIcon from "@mui/icons-material/ExpandLess";
import ExpandMoreIcon from "@mui/icons-material/ExpandMore";
import { useI18n } from "../i18n";

type ConfigMap = Record<string, unknown>;

type ConfigBooleanField = {
  key: string;
  labelKey: string;
  helperTextKey?: string;
};

type TranscriptionConfigQuickOptionsProps = {
  type: "file" | "streaming";
  configJson: string;
  onChange: (nextJson: string) => void;
  backendDeploymentMode?: BackendEndpointDeployment;
  collapsible?: boolean;
  defaultCollapsed?: boolean;
};

const FILE_BOOLEAN_FIELDS: ConfigBooleanField[] = [
  {
    key: "use_itn",
    labelKey: "itnNormalization",
    helperTextKey: "convertNumbersUnitsToStandardNotation",
  },
  {
    key: "use_disfluency_filter",
    labelKey: "disfluencyRemoval",
    helperTextKey: "eliminatesAwkwardSpeechAndStuttering",
  },
  {
    key: "use_profanity_filter",
    labelKey: "profanityFiltering",
    helperTextKey: "maskOutInappropriateExpressions",
  },
  {
    key: "use_word_timestamp",
    labelKey: "wordTimestamp",
    helperTextKey: "containsPerWordTimestamps",
  },
];

const STREAMING_BOOLEAN_FIELDS: ConfigBooleanField[] = [
  {
    key: "use_punctuation",
    labelKey: "punctuationCorrection",
    helperTextKey: "automaticallyAddsPunctuationToRealTimeResults",
  },
  {
    key: "use_itn",
    labelKey: "itnNormalization",
    helperTextKey: "convertNumbersUnitsToStandardNotation",
  },
  {
    key: "use_disfluency_filter",
    labelKey: "disfluencyRemoval",
    helperTextKey: "eliminatesAwkwardSpeechAndStuttering",
  },
  {
    key: "use_profanity_filter",
    labelKey: "profanityFiltering",
    helperTextKey: "maskOutInappropriateExpressions",
  },
];

const STREAMING_SAMPLE_RATE_OPTIONS = [
  { label: "8 kHz", value: 8000 },
  { label: "16 kHz", value: 16000 },
  { label: "44 kHz", value: 44100 },
];

const LANGUAGE_OPTIONS = [
  { value: "", labelKey: "apiBasics" },
  { value: "ko", labelKey: "koreanKo" },
  { value: "ja", labelKey: "japaneseJa" },
  {
    value: "multi",
    labelKey: "multilingualMultiWhisperOnly",
    requiresWhisper: true,
  },
  {
    value: "detect",
    labelKey: "automaticDetectionDetectWhisperOnly",
    requiresWhisper: true,
  },
];

const DEFAULT_PARAGRAPH_SPLITTER_MAX = 80;

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null && !Array.isArray(value);

const shouldRemoveValue = (value: unknown) =>
  value === undefined || value === null || (typeof value === "string" && value.trim().length === 0);

const parseConfigJsonToMap = (json: string): ConfigMap => {
  try {
    const parsed = json ? JSON.parse(json) : {};
    if (isRecord(parsed)) {
      return parsed as ConfigMap;
    }
  } catch {
    /* noop */
  }
  return {};
};

const assignNestedValue = (target: ConfigMap, path: string[], value: unknown) => {
  if (path.length === 0) {
    return;
  }
  if (shouldRemoveValue(value)) {
    removeNestedValue(target, path);
    return;
  }
  const [head, ...rest] = path;
  if (rest.length === 0) {
    target[head] = value;
    return;
  }
  if (!isRecord(target[head])) {
    target[head] = {};
  }
  assignNestedValue(target[head] as ConfigMap, rest, value);
};

const removeNestedValue = (target: ConfigMap, path: string[]) => {
  if (path.length === 0) {
    return;
  }
  const [head, ...rest] = path;
  if (rest.length === 0) {
    delete target[head];
    return;
  }
  const child = target[head];
  if (!isRecord(child)) {
    return;
  }
  removeNestedValue(child as ConfigMap, rest);
  if (Object.keys(child as Record<string, unknown>).length === 0) {
    delete target[head];
  }
};

export function TranscriptionConfigQuickOptions({
  type,
  configJson,
  onChange,
  backendDeploymentMode = "cloud",
  collapsible = false,
  defaultCollapsed = false,
}: TranscriptionConfigQuickOptionsProps) {
  const { t } = useI18n();
  const [collapsed, setCollapsed] = useState<boolean>(defaultCollapsed);
  const parsedConfig = useMemo(() => {
    try {
      const parsed = JSON.parse(configJson || "{}");
      if (typeof parsed !== "object" || parsed === null) {
      return { config: null, error: t("settingsJsonMustBeInObjectForm") };
      }
      return { config: parsed as ConfigMap, error: null };
    } catch (error) {
      return {
        config: null,
        error:
          error instanceof Error ? error.message : t("pleaseCheckTheSettingsJson"),
      };
    }
  }, [configJson, t]);

  const configObject = parsedConfig.config;
  const configParseError = parsedConfig.error;

  const getConfigValue = useCallback(
    (path: string | string[]) => {
      if (!configObject || !isRecord(configObject)) {
        return undefined;
      }
      const segments = Array.isArray(path) ? path : [path];
      return segments.reduce<unknown>((acc, key) => {
        if (!isRecord(acc)) {
          return undefined;
        }
        return acc[key];
      }, configObject as unknown);
    },
    [configObject]
  );

  const updateConfigJson = useCallback(
    (updater: (draft: ConfigMap) => void) => {
      const draft = parseConfigJsonToMap(configJson);
      updater(draft);
      onChange(JSON.stringify(draft, null, 2));
    },
    [configJson, onChange]
  );

  useEffect(() => {
    setCollapsed(defaultCollapsed);
  }, [defaultCollapsed]);

  useEffect(() => {
    if (!configObject) {
      return;
    }
    const legacyDiarization = (configObject as Record<string, unknown>)["diarization.spk_count"];
    const legacyParagraphMax = (configObject as Record<string, unknown>)["paragraph_splitter.max"];
    if (legacyDiarization === undefined && legacyParagraphMax === undefined) {
      return;
    }
    updateConfigJson((draft) => {
      if (typeof legacyDiarization === "number") {
        assignNestedValue(draft, ["diarization", "spk_count"], legacyDiarization);
        delete draft["diarization.spk_count"];
      }
      if (typeof legacyParagraphMax === "number") {
        assignNestedValue(draft, ["paragraph_splitter", "max"], legacyParagraphMax);
        delete draft["paragraph_splitter.max"];
      }
    });
  }, [configObject, updateConfigJson]);

  const getBooleanConfigValue = useCallback(
    (path: string | string[]) => {
      const value = getConfigValue(path);
      return typeof value === "boolean" ? value : Boolean(value);
    },
    [getConfigValue]
  );

  const getStringConfigValue = useCallback(
    (path: string | string[]) => {
      const value = getConfigValue(path);
      return typeof value === "string" ? value : "";
    },
    [getConfigValue]
  );

  const getNumberConfigValue = useCallback(
    (path: string | string[]) => {
      const value = getConfigValue(path);
      return typeof value === "number" ? value : undefined;
    },
    [getConfigValue]
  );

  const getListStringValue = useCallback(
    (path: string | string[]) => {
      const value = getConfigValue(path);
      if (Array.isArray(value)) {
        return value
          .map((item) => {
            if (typeof item === "string") return item.trim();
            if (typeof item === "number" || typeof item === "boolean") {
              return String(item);
            }
            return "";
          })
          .filter((item) => item.length > 0)
          .join(", ");
      }
      if (typeof value === "string") {
        return value;
      }
      return "";
    },
    [getConfigValue]
  );

  const handleConfigValueChange = (path: string | string[], value: unknown, legacyKey?: string) => {
    const segments = Array.isArray(path) ? path : [path];
    updateConfigJson((draft) => {
      if (legacyKey) {
        delete draft[legacyKey];
      }
      assignNestedValue(draft, segments, value);
    });
  };

  const handleListConfigChange = (key: string, rawValue: string) => {
    const items = rawValue
      .split(/[,;\n]/)
      .map((item) => item.trim())
      .filter((item) => item.length > 0);
    handleConfigValueChange(key, items.length > 0 ? items : undefined);
  };

  const handleStringConfigChange = (key: string, value: string) => {
    const trimmed = value.trim();
    handleConfigValueChange(key, trimmed.length > 0 ? trimmed : undefined);
  };

  const handleDiarizationToggle = (checked: boolean) => {
    handleConfigValueChange("use_diarization", checked ? true : undefined);
    if (!checked) {
      handleConfigValueChange(["diarization", "spk_count"], undefined, "diarization.spk_count");
    }
  };

  const handleParagraphSplitterToggle = (checked: boolean) => {
    handleConfigValueChange("use_paragraph_splitter", checked ? true : undefined);
    if (checked) {
      const currentMax =
        getNumberConfigValue(["paragraph_splitter", "max"]) ?? getNumberConfigValue("paragraph_splitter.max");
      const nextValue = currentMax ?? DEFAULT_PARAGRAPH_SPLITTER_MAX;
      handleConfigValueChange(["paragraph_splitter", "max"], nextValue, "paragraph_splitter.max");
    } else {
      handleConfigValueChange(["paragraph_splitter", "max"], undefined, "paragraph_splitter.max");
    }
  };

  const booleanQuickOptions = type === "file" ? FILE_BOOLEAN_FIELDS : STREAMING_BOOLEAN_FIELDS;
  const diarizationEnabled = getBooleanConfigValue("use_diarization");
  const diarizationSpeakerCount =
    getNumberConfigValue(["diarization", "spk_count"]) ?? getNumberConfigValue("diarization.spk_count");
  const paragraphSplitterEnabled = getBooleanConfigValue("use_paragraph_splitter");
  const paragraphSplitterMax =
    getNumberConfigValue(["paragraph_splitter", "max"]) ?? getNumberConfigValue("paragraph_splitter.max");
  const streamingSampleRate = getNumberConfigValue("sample_rate");
  const modelName = getStringConfigValue("model_name");
  const isWhisperModel = /whisper/i.test(modelName);
  const languageValue = getStringConfigValue("language");
  const languageCandidatesValue = getListStringValue("language_candidates");
  const keywordsValue = getListStringValue("keywords");
  const domainValue = getStringConfigValue("domain");

  useEffect(() => {
    if (!paragraphSplitterEnabled || paragraphSplitterMax !== undefined) {
      return;
    }
    updateConfigJson((draft) => {
      assignNestedValue(draft, ["paragraph_splitter", "max"], DEFAULT_PARAGRAPH_SPLITTER_MAX);
      delete draft["paragraph_splitter.max"];
    });
  }, [paragraphSplitterEnabled, paragraphSplitterMax, updateConfigJson]);

  const streamingModelOptions = backendDeploymentMode === "cloud" ? ["sommers_ko", "sommers_ja", "whisper"] : [];

  const renderLanguageSelector = (helperText: string, labelId: string) => (
    <FormControl component="fieldset" sx={{ gap: 1 }}>
      <FormLabel id={labelId}>{t("language")}</FormLabel>
      <ToggleButtonGroup
        aria-labelledby={labelId}
        color="primary"
        exclusive
        size="small"
        value={languageValue ?? ""}
        onChange={(_, value) => {
          if (value === null) {
            return;
          }
          const nextValue = typeof value === "string" ? value : "";
          if (!nextValue) {
            handleConfigValueChange("language", undefined);
          } else {
            handleConfigValueChange("language", nextValue);
          }
        }}
        sx={{ flexWrap: "wrap" }}
      >
        {LANGUAGE_OPTIONS.map((option) => (
          <ToggleButton
            key={option.value || "default"}
            value={option.value}
            disabled={option.requiresWhisper && !isWhisperModel}
            sx={{
              textTransform: "none",
              px: 1.5,
              py: 0.5,
              fontWeight: 600,
              "&.Mui-selected": {
                color: "#fff",
              },
            }}
          >
            {t(option.labelKey)}
          </ToggleButton>
        ))}
      </ToggleButtonGroup>
      <FormHelperText>{helperText}</FormHelperText>
    </FormControl>
  );

  const collapsibleToggleLabel = collapsed ? t("expandOptions") : t("collapseOptions");

  return (
    <Box
      sx={{
        border: 1,
        borderColor: "divider",
        borderRadius: 2,
        p: 2,
        width: "100%",
      }}
    >
      <Stack direction="row" alignItems="center" justifyContent="space-between" sx={{ mb: 1 }}>
        <Typography variant="subtitle2">{t("quickOptionControl")}</Typography>
        {collapsible ? (
          <Tooltip title={collapsibleToggleLabel}>
            <IconButton
              size="small"
              onClick={() => setCollapsed((prev) => !prev)}
              aria-label={collapsibleToggleLabel}
            >
              {collapsed ? <ExpandMoreIcon fontSize="small" /> : <ExpandLessIcon fontSize="small" />}
            </IconButton>
          </Tooltip>
        ) : null}
      </Stack>
      {configParseError ? (
        <Alert severity="warning">
          {t("unableToParseSettingsJson")} {configParseError}
        </Alert>
      ) : (
        <Collapse in={!collapsed} timeout="auto" unmountOnExit={false}>
          <Stack spacing={2}>
            <TextField
              fullWidth
              label={t("modelName")}
              value={modelName}
              onChange={(event) => handleConfigValueChange("model_name", event.target.value)}
              placeholder={type === "file" ? "sommers" : "sommers_ko"}
            />
          {type === "file" && (
            <Stack direction="row" spacing={1} flexWrap="wrap">
              {["sommers", "whisper"].map((model) => (
                <Button
                  key={model}
                  size="small"
                  variant={modelName === model ? "contained" : "outlined"}
                  onClick={() => handleStringConfigChange("model_name", model)}
                >
                  {model}
                </Button>
              ))}
            </Stack>
          )}
          {type === "streaming" && (
            <>
              <Stack direction="row" spacing={1} flexWrap="wrap">
                <Button
                  size="small"
                  variant={modelName ? "outlined" : "contained"}
                  onClick={() => handleStringConfigChange("model_name", "")}
                >
                  {t("modelNotSpecified")}
                </Button>
                {streamingModelOptions.map((model) => (
                  <Button
                    key={model}
                    size="small"
                    variant={modelName === model ? "contained" : "outlined"}
                    onClick={() => handleStringConfigChange("model_name", model)}
                  >
                    {model}
                  </Button>
                ))}
              </Stack>
              {backendDeploymentMode !== "cloud" && (
                <Typography variant="caption" color="text.secondary">
                  {t("inAnOnPremEnvironmentYouCanEnterTheModelNameDirectlyOrLeaveItBlank")}
                </Typography>
              )}
            </>
          )}
          <Divider />
          <Typography variant="body2" color="text.secondary">
            {t("frequentlyUsedFunctionsCanBeAdjustedDirectlyWithSwitchesAndButtons")}
          </Typography>
          {booleanQuickOptions.map((option) => (
            <Box key={option.key} sx={{ pl: 0.5 }}>
              <FormControlLabel
                control={
                  <Switch
                        checked={getBooleanConfigValue(option.key)}
                        onChange={(event) => handleConfigValueChange(option.key, event.target.checked)}
                  />
                }
                label={t(option.labelKey)}
              />
              {option.helperTextKey ? (
                <Typography variant="caption" color="text.secondary" sx={{ ml: 5 }}>
                  {t(option.helperTextKey)}
                </Typography>
              ) : null}
            </Box>
          ))}
          {type === "file" && (
            <>
              <Divider />
              <Stack spacing={1}>
                <Stack
                  direction={{ xs: "column", sm: "row" }}
                  spacing={1}
                  alignItems={{ xs: "flex-start", sm: "center" }}
                >
                  <FormControlLabel
                    control={
                      <Switch
                        checked={diarizationEnabled}
                        onChange={(event) => handleDiarizationToggle(event.target.checked)}
                      />
                    }
                    label={t("useSpeakerSeparation")}
                  />
                  {diarizationEnabled && (
                  <TextField
                    fullWidth
                    label={t("numberOfSpeakersMaximum")}
                      type="number"
                      value={diarizationSpeakerCount ?? ""}
                      onChange={(event) => {
                        const { value } = event.target;
                        if (!value) {
                          handleConfigValueChange(
                            ["diarization", "spk_count"],
                            undefined,
                            "diarization.spk_count"
                          );
                          return;
                        }
                        const nextValue = Number(value);
                        if (!Number.isNaN(nextValue)) {
                          handleConfigValueChange(
                            ["diarization", "spk_count"],
                            nextValue,
                            "diarization.spk_count"
                          );
                        }
                      }}
                      sx={{ width: { xs: "100%", sm: 220 } }}
                    />
                  )}
                </Stack>
                <Typography variant="caption" color="text.secondary">
                  {t("specifiesTheMaximumNumberOfSpeakersWhenUsingSpeakerSeparation")}
                </Typography>
              </Stack>
              <Divider />
              <Stack spacing={1}>
                <Stack
                  direction={{ xs: "column", sm: "row" }}
                  spacing={1}
                  alignItems={{ xs: "flex-start", sm: "center" }}
                >
                  <FormControlLabel
                    control={
                      <Switch
                        checked={paragraphSplitterEnabled}
                        onChange={(event) => handleParagraphSplitterToggle(event.target.checked)}
                      />
                    }
                    label={t("useParagraphSeparation")}
                  />
                  {paragraphSplitterEnabled && (
                  <TextField
                    fullWidth
                    label={t("maximumNumberOfParagraphSeparatorCharacters")}
                      type="number"
                      value={paragraphSplitterMax ?? ""}
                      onChange={(event) => {
                        const { value } = event.target;
                        if (!value) {
                          handleConfigValueChange(
                            ["paragraph_splitter", "max"],
                            undefined,
                            "paragraph_splitter.max"
                          );
                          return;
                        }
                        const parsed = Number(value);
                        if (!Number.isNaN(parsed)) {
                          handleConfigValueChange(
                            ["paragraph_splitter", "max"],
                            parsed,
                            "paragraph_splitter.max"
                          );
                        }
                      }}
                      sx={{ width: { xs: "100%", sm: 220 } }}
                    />
                  )}
                </Stack>
                <Typography variant="caption" color="text.secondary">
                  {t("whenUsingParagraphBreaksSpecifyTheMaximumNumberOfCharactersAllowedInOneParagraph")}
                </Typography>
              </Stack>
              <Divider />
              {renderLanguageSelector(
                t("selectFromKoJaMultiOrDetectMultiDetectIsOnlyEnabledOnWhisperFamilyModels"),
                "file-language-selector"
              )}
              <TextField
                fullWidth
                label={t("listOfLanguageCandidatesCommaSeparated")}
                value={languageCandidatesValue}
                onChange={(event) => handleListConfigChange("language_candidates", event.target.value)}
                helperText={t("onlyAvailableOnWhisperModelExampleKoEnJa")}
                disabled={!isWhisperModel}
              />
              <TextField
                fullWidth
                label={t("keywordsCommaSeparated")}
                value={keywordsValue}
                onChange={(event) => handleListConfigChange("keywords", event.target.value)}
                helperText={t("passInTheKeywordsFieldToEmphasizeOrPrioritizeSpecificWords")}
              />
              <TextField
                fullWidth
                label={t("domain")}
                value={domainValue}
                onChange={(event) => handleStringConfigChange("domain", event.target.value)}
                helperText={t("specifiesTheBusinessDomainEGFinanceMedicalEtcThatTheModelWillReference")}
              />
            </>
          )}
          {type === "streaming" && (
            <>
              <Divider />
              <TextField
                fullWidth
                label={t("audioEncoding")}
                value={getStringConfigValue("encoding")}
                onChange={(event) => handleConfigValueChange("encoding", event.target.value)}
                placeholder={t("exampleLinear16")}
              />
              <Typography variant="subtitle2">{t("selectSampleRate")}</Typography>
              <Stack direction="row" spacing={1} flexWrap="wrap">
                {STREAMING_SAMPLE_RATE_OPTIONS.map((option) => (
                  <Button
                    key={option.value}
                    size="small"
                    variant={streamingSampleRate === option.value ? "contained" : "outlined"}
                    onClick={() => handleConfigValueChange("sample_rate", option.value)}
                  >
                    {option.label}
                  </Button>
                ))}
              </Stack>
              <TextField
                fullWidth
                label={t("manualInputHz")}
                type="number"
                value={streamingSampleRate ?? ""}
                onChange={(event) => {
                  const { value } = event.target;
                  if (!value) {
                    handleConfigValueChange("sample_rate", undefined);
                    return;
                  }
                  const parsedValue = Number(value);
                  if (!Number.isNaN(parsedValue)) {
                    handleConfigValueChange("sample_rate", parsedValue);
                  }
                }}
                helperText={t("pleaseEnterTheSampleRateDirectlyIfItIsNotInTheButton")}
              />
              <Divider />
              {renderLanguageSelector(
                t("deliversKoJaMultiDetectEtcAccordingToRtzrStreamingDocument"),
                "streaming-language-selector"
              )}
              <TextField
                fullWidth
                label={t("keywordsCommaSeparated")}
                value={keywordsValue}
                onChange={(event) => handleListConfigChange("keywords", event.target.value)}
                helperText={t("specifyWordsToHighlightInRealTimeThroughTheKeywordsArray")}
              />
            </>
          )}
          </Stack>
        </Collapse>
      )}
    </Box>
  );
}

export default TranscriptionConfigQuickOptions;
