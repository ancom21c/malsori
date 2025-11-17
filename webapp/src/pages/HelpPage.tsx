import type { ReactNode } from "react";
import {
  Box,
  Card,
  CardContent,
  CardHeader,
  Divider,
  List,
  ListItem,
  ListItemIcon,
  ListItemText,
  Stack,
  Typography,
} from "@mui/material";
import ChecklistIcon from "@mui/icons-material/Checklist";
import LiveHelpIcon from "@mui/icons-material/LiveHelp";
import SupportAgentIcon from "@mui/icons-material/SupportAgent";
import DescriptionIcon from "@mui/icons-material/Description";
import ArticleIcon from "@mui/icons-material/Article";
import GraphicEqIcon from "@mui/icons-material/GraphicEq";
import SettingsIcon from "@mui/icons-material/Settings";
import { useI18n } from "../i18n";

interface ScreenGuide {
  titleKey: string;
  descriptionKey: string;
  highlights: string[];
  icon: ReactNode;
}

const SCREEN_GUIDES: ScreenGuide[] = [
  {
    titleKey: "transcriptionListScreen",
    descriptionKey: "youCanSortYourFileTranscriptionsAndRealTimeTranscriptionRecordsAtAGlanceAndAdjustFilters",
    highlights: [
      "useTheTopFilterToCombineTitleModelDateAndContentToViewOnlyTheRecordsYouWant",
      "clickingOnEachListItemTakesYouToTheDetailedTranscriptionResultsScreen",
      "youCanCleanUpYourLocallyStoredTranscriptionRecordsWithTheDeleteIconOnTheRight",
    ],
    icon: <ArticleIcon fontSize="large" color="primary" />,
  },
  {
    titleKey: "transcriptionResultScreen",
    descriptionKey:
      "itProvidesPlaybackCorrectionAndWordHighlightingForEachSegmentAndAlsoSupportsJsonTextAndAudioDownloads",
    highlights: [
      "onceYouHaveTheAudioReadyYouCanPlayEachSectionAndSaveTheCorrectedSentences",
      "editQuicklyWithKeyboardShortcutsIncludingWordByWordProofreadingAndVimStyleNavigationHJKL",
      "youCanDownloadJsonTextAudioFilesOrDeleteRecordsUsingTheTopButton",
    ],
    icon: <DescriptionIcon fontSize="large" color="primary" />,
  },
  {
    titleKey: "realTimeTranscriptionScreen",
    descriptionKey: "activateTheMicrophoneToSeeRecognitionResultsInRealTimeAndSaveTheSession",
    highlights: [
      "proceedWithLocalSavingAfterStoppingRecordingOrAutomaticallyTemporarilySaveWhenTheConnectionIsLost",
      "youCanDirectlyChangeStreamingOptionsSuchAsModelAndSampleRateInTheSettingsPanelOnTheLeft",
      "atTheEndOfTheSessionTheResultsAreAddedToTheTranscriptionListAndCanBeModifiedLaterInTheDetailsScreen",
    ],
    icon: <GraphicEqIcon fontSize="large" color="primary" />,
  },
  {
    titleKey: "settingsScreen",
    descriptionKey: "manageOverallServiceSettingsIncludingEndpointsPresetsAndPermissions",
    highlights: [
      "exportOrImportTranscriptionPresetsToShareTheSameSettingsWithTeamMembers",
      "youCanCheckWhetherYouHaveMicrophoneAndFileAccessPermissionsAndQuicklyReRequestIt",
      "securelyStoreBackendEndpointUrlsAndCredentials",
    ],
    icon: <SettingsIcon fontSize="large" color="primary" />,
  },
];

const USAGE_STEPS = [
  "inTheTranscriptionListClickTheButtonToUploadAFileOrStartRealTimeTranscription",
  "checkBrowserPermissionsBeforeLiveSession",
  "correctTheRequiredSectionsOnTheTranscriptionResultsScreenAndFixTheResultsWithTheSaveButton",
  "theCompletedTranscriptionIsDownloadedAsAJsonTextOrAudioFileAndUsedForExternalServicesOrDocuments",
  "youCanCreateFrequentlyUsedOptionsAsPresetsOnTheSettingsScreenAndSelectThemAtAnyTime",
];

const CONTACT_CHANNELS = [
  {
    labelKey: "email",
    // value: "support@malsori.app",
    value: "ancom21c@gmail.com",
    descriptionKey: "weQuicklyHandleBugReportsFeatureSuggestionsAndAccountInquiries",
  },
  // {
  //   label: "Slack",
  //   value: "malsori-dev.slack.com",
  //   description: "기업 고객용 전용 채널을 통해 실시간으로 지원을 받을 수 있습니다.",
  // },
  // {
  //   label: "GitHub Issues",
  //   value: "https://github.com/malsori-labs/malsori/issues",
  //   description: "오픈소스 기여나 기술적인 논의를 원하시면 이슈를 등록해 주세요.",
  // },
];

export default function HelpPage() {
  const { t } = useI18n();
  return (
    <Box sx={{ display: "flex", flexDirection: "column", gap: 3 }}>
      <Card>
        <CardHeader
          avatar={<LiveHelpIcon color="primary" sx={{ fontSize: 40 }} />}
          title={t("malsoriHelp")}
          subheader={t("checkOutHowToUseTheServiceAndEachScreenSFeaturesInOnePlace")}
        />
        <CardContent>
          <Typography variant="body1" color="text.secondary">
            {t(
              "malsoriIsAWebAppDesignedToQuicklyRecordAndProofreadConversationsAndMeetingMinutesPleaseReferToTheInstructionsBelowToLearnTheMainFunctionsAndShortcutKeysAndIfYouHaveAnyQuestionsPleaseContactUsAtAnyTime"
            )}
          </Typography>
        </CardContent>
      </Card>

      <Stack spacing={2}>
        {SCREEN_GUIDES.map((guide) => (
          <Card key={guide.titleKey}>
            <CardHeader
              avatar={guide.icon}
              title={t(guide.titleKey)}
              subheader={t(guide.descriptionKey)}
              sx={{ alignItems: "center" }}
            />
            <CardContent>
              <List dense>
                {guide.highlights.map((highlight) => (
                  <ListItem key={highlight}>
                    <ListItemIcon>
                      <ChecklistIcon color="action" fontSize="small" />
                    </ListItemIcon>
                    <ListItemText primary={t(highlight)} />
                  </ListItem>
                ))}
              </List>
            </CardContent>
          </Card>
        ))}
      </Stack>

      <Card>
        <CardHeader
          avatar={<ChecklistIcon color="primary" sx={{ fontSize: 32 }} />}
          title={t("basicUsageMethod")}
          subheader={t("weHaveOrganizedItSoThatEvenFirstTimeUsersCanFollowItStepByStep")}
        />
        <CardContent>
          <List>
            {USAGE_STEPS.map((step, index) => (
              <ListItem key={step} alignItems="flex-start">
                <ListItemIcon>
                  <Typography variant="subtitle1" fontWeight={700} color="primary">
                    {index + 1}.
                  </Typography>
                </ListItemIcon>
                <ListItemText primary={t(step)} />
              </ListItem>
            ))}
          </List>
        </CardContent>
      </Card>

      <Card>
        <CardHeader
          avatar={<SupportAgentIcon color="primary" sx={{ fontSize: 34 }} />}
          title={t("developerContactInformation")}
          subheader={t("forServiceRelatedInquiriesPleaseUseTheChannelsBelow")}
        />
        <CardContent>
          <Stack spacing={1.5} divider={<Divider flexItem />}>
            {CONTACT_CHANNELS.map((channel) => (
              <Box key={channel.labelKey}>
                <Typography variant="subtitle1" fontWeight={700}>
                  {t(channel.labelKey)}
                </Typography>
                <Typography variant="body1">{channel.value}</Typography>
                <Typography variant="body2" color="text.secondary">
                  {t(channel.descriptionKey)}
                </Typography>
              </Box>
            ))}
          </Stack>
        </CardContent>
      </Card>
    </Box>
  );
}
