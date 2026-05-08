export const supportedLocales = ["ko", "en", "ja"] as const;

export type Locale = (typeof supportedLocales)[number];

type BaseTranslationEntry = {
  en: string;
  ja: string;
  ko?: string;
};

const baseTranslations: Record<string, BaseTranslationEntry> = {
  aFatalErrorOccurredInYourStreamingSession: {
    ko: "스트리밍 세션에 치명적인 오류가 발생했습니다.",
    en: "A fatal error occurred in your streaming session.",
    ja: "ストリーミング セッションで致命的なエラーが発生しました。",
  },
  aValidApiBaseUrlIsRequired: {
    ko: "유효한 API Base URL이 필요합니다.",
    en: "A valid API Base URL is required.",
    ja: "有効な API Base URL が必要です。",
  },
  aRecordingErrorOccurred: {
    ko: "녹음 오류가 발생했습니다.",
    en: "A recording error occurred.",
    ja: "記録エラーが発生しました。",
  },
  aRequestToInstallAnAppHasBeenSentPleaseCheckYourBrowserInstructions: {
    ko: "앱 설치 요청을 전송했습니다. 브라우저 안내를 확인해 주세요.",
    en: "A request to install an app has been sent. Please check your browser instructions.",
    ja: "アプリのインストール要求が送信されました。ブラウザの指示をご確認ください。",
  },
  aStreamingErrorOccurredTheConnectionIsBeingRestored: {
    ko: "스트리밍 오류가 발생했습니다. 연결을 복구하는 중입니다.",
    en: "A streaming error occurred. The connection is being restored.",
    ja: "ストリーミングエラーが発生しました。接続は復元中です。",
  },
  aStreamingErrorOccurredTryReconnecting: {
    ko: "스트리밍 오류가 발생했습니다. 재연결을 시도합니다.",
    en: "A streaming error occurred. Try reconnecting.",
    ja: "ストリーミングエラーが発生しました。再接続してみてください。",
  },
  activateTheMicrophoneToSeeRecognitionResultsInRealTimeAndSaveTheSession: {
    ko: "마이크를 활성화하면 실시간으로 인식 결과를 확인하고 세션을 저장합니다.",
    en: "Activate the microphone to see recognition results in real time and save the session.",
    ja: "マイクをアクティブにして認識結果をリアルタイムで確認し、セッションを保存します。",
  },
  addEditPresetsToUseForApiCallsAndPreviewSamples: {
    ko: "API 호출에 사용할 프리셋을 추가/수정하고 샘플을 미리 확인합니다.",
    en: "Add/edit presets to use for API calls and preview samples.",
    ja: "API 呼び出しに使用するプリセットを追加/編集し、サンプルをプレビューします。",
  },
  addedBackendPresets: {
    ko: "백엔드 프리셋을 추가했습니다.",
    en: "Added backend presets.",
    ja: "バックエンドプリセットを追加しました。",
  },
  addedNewPresets: {
    ko: "새 프리셋을 추가했습니다.",
    en: "Added new presets.",
    ja: "新しいプリセットが追加されました。",
  },
  allowed: {
    ko: "허용됨",
    en: "allowed",
    ja: "許可された",
  },
  anErrorOccurredDuringRecording: {
    ko: "녹음 도중 오류가 발생했습니다.",
    en: "An error occurred during recording.",
    ja: "録音中にエラーが発生しました。",
  },
  anErrorOccurredWhileProcessingAudioFrames: {
    ko: "오디오 프레임 처리 중 오류가 발생했습니다.",
    en: "An error occurred while processing audio frames.",
    ja: "オーディオ フレームの処理中にエラーが発生しました。",
  },
  failedToInitializeRecordingDevice: {
    ko: "녹음 장치 초기화에 실패했습니다.",
    en: "Failed to initialize recording device.",
    ja: "録音デバイスの初期化に失敗しました。",
  },
  anErrorOccurredWhileFinalizingAudioChunks: {
    ko: "오디오 청크를 마무리하는 중 오류가 발생했습니다.",
    en: "An error occurred while finalizing audio chunks.",
    ja: "オーディオ チャンクの終了処理中にエラーが発生しました。",
  },
  cameraNotSupported: {
    ko: "이 브라우저에서는 카메라 녹화를 지원하지 않습니다.",
    en: "Camera recording is not supported in this browser.",
    ja: "このブラウザではカメラ録画はサポートされていません。",
  },
  cameraAccessFailed: {
    ko: "카메라 권한을 요청할 수 없습니다. 브라우저 설정을 확인해 주세요.",
    en: "Unable to access the camera. Please check your browser settings.",
    ja: "カメラにアクセスできません。ブラウザの設定を確認してください。",
  },
  cameraRecordingFailed: {
    ko: "카메라 녹화를 시작할 수 없습니다.",
    en: "Unable to start camera recording.",
    ja: "カメラの録画を開始できません。",
  },
  sessionVideoCapture: {
    ko: "세션 비디오 캡처",
    en: "Session video capture",
    ja: "セッション動画キャプチャ",
  },
  recordVideoAlongsideRealTimeTranscription: {
    ko: "실시간 전사와 함께 보조 카메라 영상을 기록합니다. 전사 오디오는 마이크 PCM을 사용합니다.",
    en: "Capture supplementary camera video alongside your real-time transcription. Transcription audio still uses microphone PCM.",
    ja: "リアルタイム文字起こしと一緒に補助的なカメラ映像を記録します。文字起こし音声は引き続きマイク PCM を使用します。",
  },
  cameraPreview: {
    ko: "카메라가 꺼져 있습니다. 카메라를 켜면 미리보기가 표시됩니다.",
    en: "Camera is off. Turn it on to see the preview.",
    ja: "カメラはオフです。オンにするとプレビューが表示されます。",
  },
  cameraRecording: {
    ko: "카메라 녹화 중",
    en: "Camera recording",
    ja: "カメラ録画中",
  },
  enableCamera: {
    ko: "카메라 켜기",
    en: "Enable camera",
    ja: "カメラをオンにする",
  },
  disableCamera: {
    ko: "카메라 끄기",
    en: "Disable camera",
    ja: "カメラをオフにする",
  },
  switchToFrontCamera: {
    ko: "전면 카메라로 전환",
    en: "Switch to front camera",
    ja: "フロントカメラに切り替え",
  },
  switchToRearCamera: {
    ko: "후면 카메라로 전환",
    en: "Switch to rear camera",
    ja: "リアカメラに切り替え",
  },
  cameraRecordingSavedWithSession: {
    ko: "카메라가 켜져 있는 동안 촬영된 보조 영상이 이 세션에 저장됩니다. 전사 오디오는 별도의 마이크 캡처를 사용합니다.",
    en: "Supplementary video captured while the camera is on will be saved with this session. Transcription audio stays on the dedicated microphone capture.",
    ja: "カメラがオンの間に撮影された補助動画がこのセッションに保存されます。文字起こし音声は専用のマイク収録を維持します。",
  },
  enableCameraToCaptureVideo: {
    ko: "카메라를 켜서 비디오 캡처를 시작할 수 있습니다.",
    en: "Turn on the camera to start capturing video.",
    ja: "カメラをオンにして動画のキャプチャを開始できます。",
  },
  sessionVideo: {
    ko: "세션 비디오",
    en: "Session video",
    ja: "セッション動画",
  },
  recordedVideoPreview: {
    ko: "세션 동안 녹화된 보조 영상을 확인하고 다운로드합니다.",
    en: "Preview and download the supplementary video recorded during the session.",
    ja: "セッション中に録画された補助動画をプレビューしてダウンロードします。",
  },
  sessionVideoSupplementaryNote: {
    ko: "세션 비디오는 보조 기록용입니다. 전사 결과는 별도로 수집된 마이크 오디오를 기준으로 생성됩니다.",
    en: "Session video is supplementary. Transcription results are generated from the separately captured microphone audio.",
    ja: "セッション動画は補助記録用です。文字起こし結果は別途取得したマイク音声を基準に生成されます。",
  },
  noVideoRecorded: {
    ko: "이 세션에는 저장된 비디오가 없습니다.",
    en: "No video was recorded for this session.",
    ja: "このセッションには録画された動画がありません。",
  },
  downloadVideo: {
    ko: "비디오 다운로드",
    en: "Download video",
    ja: "動画をダウンロード",
  },
  videoCannotBeLoaded: {
    ko: "비디오를 불러올 수 없습니다.",
    en: "Video cannot be loaded.",
    ja: "動画を読み込めません。",
  },
  yourBrowserDoesNotSupportTheVideoTag: {
    ko: "브라우저가 video 태그를 지원하지 않습니다.",
    en: "Your browser does not support the video tag.",
    ja: "お使いのブラウザは video タグをサポートしていません。",
  },
  anErrorOccurredDuringStreaming: {
    ko: "스트리밍 도중 오류가 발생했습니다.",
    en: "An error occurred during streaming.",
    ja: "ストリーミング中にエラーが発生しました。",
  },
  noRealtimeTranscriptionResultsReturned: {
    ko: "실시간 STT API에서 저장할 전사 결과를 받지 못했습니다.",
    en: "The realtime STT API did not return transcription results to save.",
    ja: "リアルタイム STT API から保存できる文字起こし結果が返されませんでした。",
  },
  anErrorOccurredDuringTheTranscriptionRequest: {
    ko: "전사 요청 중 오류가 발생했습니다.",
    en: "An error occurred during the transcription request.",
    ja: "文字起こしリクエスト中にエラーが発生しました。",
  },
  requestFailedWithStatus: {
    ko: "요청 실패 ({{status}})",
    en: "Request failed ({{status}})",
    ja: "リクエストに失敗しました ({{status}})",
  },
  responseIsMissingTranscribeId: {
    ko: "응답에 transcribe_id가 없습니다.",
    en: "Response is missing transcribe_id.",
    ja: "レスポンスに transcribe_id がありません。",
  },
  apiBasics: {
    ko: "API 기본",
    en: "API basics",
    ja: "APIの基本",
  },
  apiEndpointPresets: {
    ko: "API 엔드포인트 프리셋",
    en: "API Endpoint Presets",
    ja: "APIエンドポイントのプリセット",
  },
  apiBaseUrl: {
    ko: "API Base URL",
    en: "API Base URL",
    ja: "API Base URL",
  },
  internalAdminApiBaseUrl: {
    ko: "Internal Admin API Base URL",
    en: "Internal Admin API Base URL",
    ja: "内部管理 API Base URL",
  },
  pythonApiBaseUrl: {
    ko: "Python API Base URL",
    en: "Python API Base URL",
    ja: "Python API Base URL",
  },
  apiSettingsModifiedHereWillBeSavedInTheOverallAppSettings: {
    ko: "여기서 수정한 API 설정은 전체 앱 설정에 저장됩니다.",
    en: "API settings modified here will be saved in the overall app settings.",
    ja: "ここで変更した API 設定は、アプリ全体の設定に保存されます。",
  },
  appInstallationHasBeenCancelled: {
    ko: "앱 설치가 취소되었습니다.",
    en: "App installation has been cancelled.",
    ja: "アプリのインストールがキャンセルされました。",
  },
  applyToServer: {
    ko: "서버에 적용",
    en: "Apply to server",
    ja: "サーバーに適用する",
  },
  applyingApiEndpointFailed: {
    ko: "API 엔드포인트 적용에 실패했습니다.",
    en: "Applying API Endpoint Failed.",
    ja: "API エンドポイントの適用に失敗しました。",
  },
  applyingBackendEndpointFailed: {
    ko: "백엔드 엔드포인트 적용에 실패했습니다.",
    en: "Applying backend endpoint failed.",
    ja: "バックエンド エンドポイントの適用に失敗しました。",
  },
  applyingToServer: {
    ko: "서버에 적용 중...",
    en: "Applying to server...",
    ja: "サーバーに申請中...",
  },
  applyingToServer2: {
    ko: "서버 적용 중",
    en: "Applying to server",
    ja: "サーバーに申請中",
  },
  areYouSureYouWantToDeleteTheSelectedBackendPreset: {
    ko: "선택한 백엔드 프리셋을 삭제하시겠습니까?",
    en: "Are you sure you want to delete the selected backend preset?",
    ja: "選択したバックエンド プリセットを削除してもよろしいですか?",
  },
  areYouSureYouWantToDeleteTheSelectedPreset: {
    ko: "선택한 프리셋을 삭제하시겠습니까?",
    en: "Are you sure you want to delete the selected preset?",
    ja: "選択したプリセットを削除してもよろしいですか?",
  },
  atTheEndOfTheSessionTheResultsAreAddedToTheTranscriptionListAndCanBeModifiedLaterInTheDetailsScreen: {
    ko: "세션 종료 시 전사 목록에 결과가 추가되어 나중에 상세 화면에서 수정할 수 있습니다.",
    en: "At the end of the session, the results are added to the transcription list and can be modified later in the details screen.",
    ja: "セッションの終了時に、結果は文字起こしリストに追加され、後で詳細画面で変更できます。",
  },
  attemptingToReconnectToStreaming: {
    ko: "스트리밍 재연결 시도 중... ({{attempt}})",
    en: "Attempting to reconnect to streaming... ({{attempt}})",
    ja: "ストリーミングに再接続しようとしています... ({{attempt}})",
  },
  audio: {
    ko: "오디오",
    en: "Audio",
    ja: "オーディオ",
  },
  audioCannotBeConverted: {
    ko: "오디오를 변환할 수 없습니다.",
    en: "Audio cannot be converted.",
    ja: "音声は変換できません。",
  },
  audioEncoding: {
    ko: "오디오 인코딩",
    en: "Audio Encoding",
    ja: "オーディオエンコーディング",
  },
  automaticDetectionDetectWhisperOnly: {
    ko: "자동 감지 (detect · Whisper 전용)",
    en: "Automatic detection (detect · Whisper only)",
    ja: "自動検知（検知・ささやきのみ）",
  },
  automaticTemporaryStorageCycleSeconds: {
    ko: "자동 임시 저장 주기: {{seconds}}초",
    en: "Automatic temporary storage cycle: {{seconds}} seconds",
    ja: "自動一時保存サイクル: {{seconds}} 秒",
  },
  automaticallyAddsPunctuationToRealTimeResults: {
    ko: "실시간 결과에 문장부호를 자동으로 추가합니다.",
    en: "Automatically adds punctuation to real-time results.",
    ja: "リアルタイムの結果に句読点を自動的に追加します。",
  },
  backendApiEndpointPresets: {
    ko: "백엔드 API 엔드포인트 프리셋",
    en: "Backend API endpoint presets",
    ja: "バックエンド API エンドポイントのプリセット",
  },
  backendEndpointApplied: {
    ko: "백엔드 엔드포인트를 적용했습니다.",
    en: "Backend endpoint applied.",
    ja: "バックエンド エンドポイントが適用されました。",
  },
  backendEndpointAppliedWithName: {
    ko: "{{name}} 프리셋을 서버에 적용했습니다.",
    en: "Applied {{name}} to the server.",
    ja: "{{name}} をサーバーに適用しました。",
  },
  backendApplyImpactHelper: {
    ko: "이 변경은 legacy backend surface를 통해 들어오는 새 요청부터 즉시 영향을 줍니다.",
    en: "This change affects new requests that use the legacy backend surface immediately.",
    ja: "この変更は legacy backend surface を使う新しいリクエストに即時反映されます。",
  },
  backendApplyRequiresConfirmationHelper: {
    ko: "적용 전에 현재 서버 상태와 다음 적용 상태를 한 번 더 확인합니다.",
    en: "Review the current and next server state before applying.",
    ja: "適用前に現在のサーバー状態と適用後の状態を確認します。",
  },
  backendApplyRollbackHelper: {
    ko: "되돌리려면 서버 기본값으로 복원하거나 다른 프리셋을 다시 적용하세요.",
    en: "To revert, return to the server default or re-apply another preset.",
    ja: "戻すにはサーバーのデフォルトに戻すか、別のプリセットを再適用してください。",
  },
  backendAdminToken: {
    ko: "백엔드 관리자 토큰",
    en: "Backend admin token",
    ja: "バックエンド管理者トークン",
  },
  backendAdminTokenHelperDetailed: {
    ko: "서버 상태 조회와 live apply/reset에만 사용합니다. 현재 페이지 메모리에만 유지되며 로컬에 저장되지 않습니다.",
    en: "Used only for server-status checks and live apply/reset actions. It stays in page memory only and is never saved locally.",
    ja: "サーバー状態の確認と live apply/reset にのみ使用します。このページのメモリにのみ保持され、ローカルには保存されません。",
  },
  backendPresetApiBaseUrlHelper: {
    ko: "전체 API Base URL을 입력하세요. 이 값은 프리셋 저장 후 live apply 시 그대로 서버에 전달됩니다.",
    en: "Enter the full API base URL. This saved value is sent to the server when you apply the preset live.",
    ja: "完全な API Base URL を入力してください。この保存値は live apply 時にそのままサーバーへ送信されます。",
  },
  backendAdminTokenHelperDetailedOptional: {
    ko: "이 서버는 관리자 토큰 없이도 내부 관리자 요청을 허용합니다. 필요하면 추가 헤더로 보낼 수 있지만 현재 페이지 메모리에만 유지되며 로컬에 저장되지 않습니다.",
    en: "This server allows internal admin requests without an admin token. If needed, you can still send one as an extra header, and it remains only in this page's memory. It is not saved locally.",
    ja: "このサーバーでは管理者トークンなしでも内部管理リクエストを許可します。必要に応じて追加ヘッダーとして送信できますが、このページのメモリにのみ保持され、ローカルには保存されません。",
  },
  backendPresetsHaveBeenExported: {
    ko: "백엔드 프리셋을 내보냈습니다.",
    en: "Backend presets have been exported.",
    ja: "バックエンド プリセットがエクスポートされました。",
  },
  backendPresetsHaveBeenLoaded: {
    ko: "백엔드 프리셋을 불러왔습니다.",
    en: "Backend presets have been loaded.",
    ja: "バックエンドのプリセットがロードされました。",
  },
  backendSettings: {
    ko: "백엔드 설정",
    en: "Backend settings",
    ja: "バックエンド設定",
  },
  additiveFeatureBackends: {
    ko: "부가 기능 백엔드",
    en: "Additive feature backends",
    ja: "追加機能バックエンド",
  },
  additiveFeatureBackendsHelper: {
    ko: "요약, QA, 번역, TTS 같은 부가 기능이 어떤 backend profile을 쓰는지 operator 전용 surface에서 관리합니다.",
    en: "Manage which backend profiles power additive features such as summary, QA, translation, and TTS from an operator-only surface.",
    ja: "summary、QA、translation、TTS などの追加機能がどの backend profile を使うかを operator 専用 surface で管理します。",
  },
  profileInspectorHelper: {
    ko: "프로필을 선택하면 base URL, auth, capability, health 상태를 JSON 없이 먼저 확인할 수 있습니다.",
    en: "Select a profile to inspect its base URL, auth, capability, and health state before opening JSON.",
    ja: "プロファイルを選択すると、base URL、auth、capability、health を JSON を開く前に確認できます。",
  },
  bindingInspectorHelper: {
    ko: "바인딩을 선택하면 primary/fallback, resolution, retry, mismatch 경고를 한 곳에서 확인할 수 있습니다.",
    en: "Select a binding to inspect primary/fallback routing, resolution, retry policy, and mismatch warnings in one place.",
    ja: "バインディングを選択すると、primary/fallback、resolution、retry policy、mismatch warning をまとめて確認できます。",
  },
  advancedProfileEditorHelper: {
    ko: "프로필 JSON 편집은 고급 경로입니다. inspector에서 상태를 먼저 읽고 필요할 때만 수정하세요.",
    en: "Profile JSON editing is the advanced path. Review the inspector first, then edit when needed.",
    ja: "プロファイル JSON 編集は上級者向けの経路です。まず inspector を確認し、必要なときだけ編集してください。",
  },
  advancedBindingEditorHelper: {
    ko: "바인딩 JSON 편집은 고급 경로입니다. inspector의 상태와 경고를 먼저 확인한 뒤 수정하세요.",
    en: "Binding JSON editing is the advanced path. Review the inspector state and warnings first, then edit.",
    ja: "バインディング JSON 編集は上級者向けの経路です。まず inspector の状態と warning を確認してから編集してください。",
  },
  backendProfiles: {
    ko: "백엔드 프로파일",
    en: "Backend profiles",
    ja: "バックエンドプロファイル",
  },
  featureBindings: {
    ko: "기능 바인딩",
    en: "Feature bindings",
    ja: "機能バインディング",
  },
  bindingCompatibility: {
    ko: "호환성 브리지",
    en: "Compatibility bridge",
    ja: "互換ブリッジ",
  },
  legacyBackendSource: {
    ko: "레거시 백엔드 소스",
    en: "Legacy backend source",
    ja: "レガシーバックエンドソース",
  },
  legacyCaptureBridgeHelper: {
    ko: "기존 capture STT endpoint override는 유지되고, additive feature binding은 별도 store에서 관리됩니다.",
    en: "The existing capture STT endpoint override stays intact, while additive feature bindings are managed in a separate store.",
    ja: "既存の capture STT endpoint override は維持し、追加機能 binding は別 store で管理します。",
  },
  availableCapabilities: {
    ko: "사용 가능한 capability",
    en: "Available capabilities",
    ja: "利用可能な capability",
  },
  newProfile: {
    ko: "새 프로파일",
    en: "New profile",
    ja: "新しいプロファイル",
  },
  saveProfile: {
    ko: "프로파일 저장",
    en: "Save profile",
    ja: "プロファイルを保存",
  },
  deleteProfile: {
    ko: "프로파일 삭제",
    en: "Delete profile",
    ja: "プロファイルを削除",
  },
  degradedBehavior: {
    ko: "degraded 동작",
    en: "Degraded behavior",
    ja: "degraded 動作",
  },
  profileRecordJson: {
    ko: "프로파일 레코드 JSON",
    en: "Profile record JSON",
    ja: "プロファイルレコード JSON",
  },
  profileRecordJsonHelper: {
    ko: "internal API contract와 동일한 shape로 backend profile을 편집합니다.",
    en: "Edit a backend profile using the same shape as the internal API contract.",
    ja: "internal API contract と同じ shape で backend profile を編集します。",
  },
  thereAreNoRegisteredProfiles: {
    ko: "등록된 backend profile이 없습니다.",
    en: "There are no registered backend profiles.",
    ja: "登録された backend profile はありません。",
  },
  backendProfileSaved: {
    ko: "backend profile을 저장했습니다.",
    en: "Saved the backend profile.",
    ja: "backend profile を保存しました。",
  },
  backendProfileHealthRefreshed: {
    ko: "backend profile health 상태를 다시 확인했습니다.",
    en: "Revalidated the backend profile health snapshot.",
    ja: "backend profile の health snapshot を再確認しました。",
  },
  backendProfileDeleted: {
    ko: "backend profile을 삭제했습니다.",
    en: "Deleted the backend profile.",
    ja: "backend profile を削除しました。",
  },
  failedToDeleteBackendProfile: {
    ko: "backend profile을 삭제하지 못했습니다.",
    en: "Failed to delete the backend profile.",
    ja: "backend profile を削除できませんでした。",
  },
  newBinding: {
    ko: "새 바인딩",
    en: "New binding",
    ja: "新しいバインディング",
  },
  saveBinding: {
    ko: "바인딩 저장",
    en: "Save binding",
    ja: "バインディングを保存",
  },
  deleteBinding: {
    ko: "바인딩 삭제",
    en: "Delete binding",
    ja: "バインディングを削除",
  },
  bindingRecordJson: {
    ko: "바인딩 레코드 JSON",
    en: "Binding record JSON",
    ja: "バインディングレコード JSON",
  },
  bindingRecordJsonHelper: {
    ko: "feature-to-backend binding을 internal API contract shape로 편집합니다.",
    en: "Edit the feature-to-backend binding using the internal API contract shape.",
    ja: "feature-to-backend binding を internal API contract shape で編集します。",
  },
  thereAreNoFeatureBindings: {
    ko: "등록된 기능 바인딩이 없습니다.",
    en: "There are no registered feature bindings.",
    ja: "登録された機能バインディングはありません。",
  },
  featureBindingSaved: {
    ko: "기능 바인딩을 저장했습니다.",
    en: "Saved the feature binding.",
    ja: "機能バインディングを保存しました。",
  },
  featureBindingDeleted: {
    ko: "기능 바인딩을 삭제했습니다.",
    en: "Deleted the feature binding.",
    ja: "機能バインディングを削除しました。",
  },
  failedToDeleteFeatureBinding: {
    ko: "기능 바인딩을 삭제하지 못했습니다.",
    en: "Failed to delete the feature binding.",
    ja: "機能バインディングを削除できませんでした。",
  },
  fallbackActiveInspectorNotice: {
    ko: "현재 fallback backend가 선택되어 사용 중입니다.",
    en: "The fallback backend is currently active.",
    ja: "現在 fallback backend が有効です。",
  },
  fallbackBackend: {
    ko: "fallback backend",
    en: "Fallback backend",
    ja: "fallback backend",
  },
  fallbackProfileMissingInspectorNotice: {
    ko: "fallback backend가 없거나 찾을 수 없습니다. primary가 실패하면 이 기능은 바로 degraded 됩니다.",
    en: "No usable fallback backend is configured. If the primary fails, this feature degrades immediately.",
    ja: "利用可能な fallback backend がありません。primary が失敗するとこの機能はすぐ degraded になります。",
  },
  fallbackProfileNotReadyInspectorNotice: {
    ko: "fallback backend가 비활성화되었거나 health 상태가 좋지 않습니다.",
    en: "The fallback backend is disabled or not healthy enough to take traffic.",
    ja: "fallback backend が無効、またはトラフィックを受けるのに十分な health 状態ではありません。",
  },
  failedToCopyJson: {
    ko: "JSON을 복사하지 못했습니다.",
    en: "Failed to copy the JSON.",
    ja: "JSON をコピーできませんでした。",
  },
  backendpresetselectorApplysuccess: {
    ko: "\"{{name}}\" 프리셋을 적용했습니다.",
    en: "Applied \"{{name}}\" preset.",
    ja: "「{{name}}」プリセットを適用しました。",
  },
  basic: {
    ko: "기본",
    en: "basic",
    ja: "基本的な",
  },
  basicUsageMethod: {
    ko: "기본 사용 방법",
    en: "Basic usage method",
    ja: "基本的な使用方法",
  },
  browserPermissions: {
    ko: "브라우저 권한",
    en: "Browser permissions",
    ja: "ブラウザの権限",
  },
  cancellation: {
    ko: "취소",
    en: "Cancel",
    ja: "キャンセル",
  },
  changeAllSpeakers: {
    ko: "모든 구간 변경",
    en: "Change all segments",
    ja: "すべてのセグメントを変更",
  },
  checkFileTranscriptionAndRealTimeTranscriptionResultsInChronologicalOrder: {
    ko: "파일 전사와 실시간 전사 결과를 시간 순으로 확인합니다.",
    en: "Check file transcription and real-time transcription results in chronological order.",
    ja: "ファイルの文字起こしとリアルタイムの文字起こし結果を時系列で確認します。",
  },
  checkOutHowToUseTheServiceAndEachScreenSFeaturesInOnePlace: {
    ko: "서비스 사용법과 화면별 기능을 한 곳에서 확인하세요.",
    en: "Check out how to use the service and each screen’s features in one place.",
    ja: "サービスの使い方や各画面の機能をまとめてご確認いただけます。",
  },
  checkBrowserPermissionsBeforeLiveSession: {
    ko: "실시간 세션에서는 녹음 전 브라우저 권한을 확인하고 필요 시 설정 > 권한 관리에서 재승인합니다.",
    en: "Before recording in a live session, check your browser permissions and re-authorize them under Settings > Permission Management if needed.",
    ja: "ライブセッションで録音する前にブラウザの権限を確認し、必要に応じて設定 > 権限管理で再承認してください。",
  },
  checking: {
    ko: "확인 중...",
    en: "Checking...",
    ja: "チェック中...",
  },
  enterAdminTokenBeforeCheckingServerSettings: {
    ko: "서버 설정을 조회하려면 관리자 토큰을 입력하세요.",
    en: "Enter an admin token before checking server settings.",
    ja: "サーバー設定を確認する前に管理者トークンを入力してください。",
  },
  enterAdminTokenBeforeApplyingServerSettings: {
    ko: "서버 설정을 적용하려면 관리자 토큰을 입력하세요.",
    en: "Enter an admin token before applying server settings.",
    ja: "サーバー設定を適用する前に管理者トークンを入力してください。",
  },
  operatorSettingsUnavailableFromServer: {
    ko: "이 서버에서는 내부 운영자 설정이 비활성화되어 있습니다. 내부망 상태를 확인한 뒤 운영자 접근 상태를 다시 새로고침하세요.",
    en: "Internal operator settings are unavailable on this server. Check the internal network path, then refresh operator access.",
    ja: "このサーバーでは内部オペレーター設定を利用できません。内部ネットワーク経路を確認してから、オペレーターアクセスを更新してください。",
  },
  clientId: {
    ko: "Client ID",
    en: "Client ID",
    ja: "Client ID",
  },
  clientIdFieldHelper: {
    ko: "RTZR Cloud 배포에서 필요합니다. 저장하거나 적용하기 전에 값을 그대로 검토할 수 있도록 가리지 않습니다.",
    en: "Required for RTZR Cloud deployments. It stays visible so operators can review it before saving or applying.",
    ja: "RTZR Cloud 配置で必要です。保存または適用前に確認できるよう、非表示にしません。",
  },
  clientIdOverwriteHelper: {
    ko: "저장된 Client ID가 있습니다. 새 값을 입력하면 교체되고, 지우기를 누르면 저장된 값을 제거합니다.",
    en: "A Client ID is already saved. Enter a new value to replace it, or clear the saved value.",
    ja: "保存済みの Client ID があります。新しい値を入力すると置き換わり、消去すると保存値を削除します。",
  },
  clientSecret: {
    ko: "Client Secret",
    en: "Client Secret",
    ja: "Client Secret",
  },
  clientSecretFieldHelper: {
    ko: "RTZR Cloud 배포에서 필요합니다. 기본적으로 가려 두며, 프리셋 저장이나 live apply 시에만 사용합니다.",
    en: "Required for RTZR Cloud deployments. It stays masked by default and is used only when the preset is saved or applied live.",
    ja: "RTZR Cloud 配置で必要です。既定ではマスクされ、プリセット保存または live apply 時にのみ使用されます。",
  },
  clientSecretOverwriteHelper: {
    ko: "저장된 Client Secret이 있습니다. 새 값을 입력하면 교체되고, 지우기를 누르면 저장된 값을 제거합니다.",
    en: "A Client Secret is already saved. Enter a new value to replace it, or clear the saved value.",
    ja: "保存済みの Client Secret があります。新しい値を入力すると置き換わり、消去すると保存値を削除します。",
  },
  clearSavedClientId: {
    ko: "저장된 Client ID 지우기",
    en: "Clear saved Client ID",
    ja: "保存されたクライアント ID をクリアする",
  },
  clearSavedClientSecret: {
    ko: "저장된 Client Secret 지우기",
    en: "Clear saved Client Secret",
    ja: "保存されたクライアント シークレットをクリアする",
  },
  requestFileTranscriptionOrStartRealTimeSessionToGetStarted: {
    ko: "파일 전사를 요청하거나 실시간 세션을 시작해 첫 전사 기록을 만들어 보세요.",
    en: "Request file transcription or start a real-time session to create your first transcript.",
    ja: "ファイル文字起こしを依頼するか、リアルタイム セッションを開始して最初の記録を作成してください。",
  },
  clickingOnEachListItemTakesYouToTheDetailedTranscriptionResultsScreen: {
    ko: "각 리스트 항목을 클릭하면 세부 전사 결과 화면으로 이동합니다.",
    en: "Clicking on each list item takes you to the detailed transcription results screen.",
    ja: "リストの各項目をクリックすると、文字起こし結果の詳細画面に移動します。",
  },
  close: {
    ko: "닫기",
    en: "Close",
    ja: "閉じる",
  },
  closeSettings: {
    ko: "설정 닫기",
    en: "Close settings",
    ja: "設定を閉じる",
  },
  closeStreamingSettings: {
    ko: "스트리밍 설정 닫기",
    en: "Close streaming settings",
    ja: "ストリーミング設定を閉じる",
  },
  collapseOptions: {
    ko: "옵션 접기",
    en: "Collapse options",
    ja: "オプションを折りたたむ",
  },
  complete: {
    ko: "완료",
    en: "Complete",
    ja: "完了",
  },
  connecting: {
    ko: "연결 중",
    en: "Connecting",
    ja: "接続中",
  },
  containsPerWordTimestamps: {
    ko: "단어 단위의 타임스탬프를 포함합니다.",
    en: "Contains per-word timestamps.",
    ja: "単語ごとのタイムスタンプが含まれます。",
  },
  convertNumbersUnitsToStandardNotation: {
    ko: "숫자·단위를 표준 표기로 변환합니다.",
    en: "Convert numbers/units to standard notation.",
    ja: "数値/単位を標準表記に変換します。",
  },
  correctTheRequiredSectionsOnTheTranscriptionResultsScreenAndFixTheResultsWithTheSaveButton: {
    ko: "전사 결과 화면에서 필요한 구간을 교정하고 저장 버튼으로 결과를 고정합니다.",
    en: "Correct the required sections on the transcription results screen and fix the results with the Save button.",
    ja: "書き起こし結果画面で必要な箇所を修正し、「保存」ボタンで結果を確定します。",
  },
  creationTime: {
    ko: "생성 시각",
    en: "Creation time",
    ja: "作成時間",
  },
  createNewSpeaker: {
    ko: "이 구간만 변경 (새 화자)",
    en: "Change for this segment only (New Speaker)",
    ja: "このセグメントのみ変更（新しい話者）",
  },
  credentialsNotUsed: {
    ko: "자격증명 미사용",
    en: "Credentials not used",
    ja: "認証情報は使用されません",
  },
  credentialUsage: {
    ko: "자격증명 사용",
    en: "Credential usage",
    ja: "認証情報の使用",
  },
  credentialReference: {
    ko: "자격증명 참조",
    en: "Credential reference",
    ja: "認証情報参照",
  },
  currentServerApplicationSettings: {
    ko: "현재 서버 적용 설정",
    en: "Current server application settings",
    ja: "現在のサーバーアプリケーション設定",
  },
  currentServerState: {
    ko: "현재 서버 상태",
    en: "Current server state",
    ja: "現在のサーバー状態",
  },
  currentlySelectedStreamingSetting: {
    ko: "현재 선택된 스트리밍 설정: {{name}}",
    en: "Currently selected streaming setting: {{name}}",
    ja: "現在選択されているストリーミング設定: {{name}}",
  },
  custom: {
    ko: "사용자 지정",
    en: "custom",
    ja: "カスタム",
  },
  defaultLoad: {
    ko: "기본 로드",
    en: "default load",
    ja: "デフォルトロード",
  },
  defaultSettings: {
    ko: "기본 설정",
    en: "Default settings",
    ja: "デフォルト設定",
  },
  defaultModel: {
    ko: "기본 모델",
    en: "Default model",
    ja: "デフォルトモデル",
  },
  defaultSpeakerName: {
    ko: "기본 화자 이름",
    en: "Default Speaker Name",
    ja: "デフォルトの話者名",
  },
  defaultSpeakerNameHelper: {
    ko: "전사 결과에서 화자가 식별되지 않았을 때 사용할 기본 이름입니다.",
    en: "The default name to use when the speaker is not identified in the transcription results.",
    ja: "文字起こし結果で話者が特定されなかった場合に使用するデフォルトの名前です。",
  },
  delete: {
    ko: "삭제",
    en: "Delete",
    ja: "消去",
  },
  deletePreset: {
    ko: "프리셋 삭제",
    en: "Delete preset",
    ja: "プリセットの削除",
  },
  deliversKoJaMultiDetectEtcAccordingToRtzrStreamingDocument: {
    ko: "RTZR 스트리밍 문서에 맞춰 ko, ja, multi, detect 등을 전달합니다.",
    en: "Delivers ko, ja, multi, detect, etc. according to RTZR streaming document.",
    ja: "RTZR ストリーミング ドキュメントに従って、ko、ja、multi、detect などを配信します。",
  },
  developerContactInformation: {
    ko: "개발자 연락처",
    en: "Developer contact information",
    ja: "開発者の連絡先情報",
  },
  disfluencyRemoval: {
    ko: "비유창성 제거",
    en: "Disfluency removal",
    ja: "非流暢性の解消",
  },
  domain: {
    ko: "도메인",
    en: "Domain",
    ja: "ドメイン",
  },
  editJsonDirectly: {
    ko: "JSON 직접 편집",
    en: "Edit JSON directly",
    ja: "JSONを直接編集する",
  },
  formatJson: {
    ko: "JSON 정리",
    en: "Format JSON",
    ja: "JSONを整形",
  },
  copyJson: {
    ko: "JSON 복사",
    en: "Copy JSON",
    ja: "JSONをコピー",
  },
  copiedToClipboard: {
    ko: "클립보드에 복사했습니다.",
    en: "Copied to clipboard.",
    ja: "クリップボードにコピーしました。",
  },
  checkJsonSyntax: {
    ko: "JSON 문법을 확인해 주세요.",
    en: "Please check the JSON syntax.",
    ja: "JSON 構文を確認してください。",
  },
  detailedSettingsJson: {
    ko: "상세 설정 JSON",
    en: "Detailed settings JSON",
    ja: "詳細設定 JSON",
  },
  requestConfigJson: {
    ko: "RequestConfig (JSON)",
    en: "RequestConfig (JSON)",
    ja: "RequestConfig (JSON)",
  },
  editSpeaker: {
    ko: "화자 편집",
    en: "Edit Speaker",
    ja: "話者の編集",
  },
  editTitle: {
    ko: "제목 편집",
    en: "Edit title",
    ja: "タイトルを編集",
  },
  editQuicklyWithKeyboardShortcutsIncludingWordByWordProofreadingAndVimStyleNavigationHJKL: {
    ko: "단어 단위 교정, Vim 스타일 이동(h/j/k/l) 등 키보드 단축키로 빠르게 편집합니다.",
    en: "Edit quickly with keyboard shortcuts, including word-by-word proofreading and Vim-style navigation (h/j/k/l).",
    ja: "単語ごとの校正や Vim スタイルのナビゲーション (h/j/k/l) などのキーボード ショートカットを使用してすばやく編集できます。",
  },
  editTheEntireJsonDirectlyToImmediatelyReflectTheOptionsYouNeed: {
    ko: "JSON 전체를 직접 편집해 필요한 옵션을 즉시 반영하세요.",
    en: "Edit the entire JSON directly to immediately reflect the options you need.",
    ja: "JSON 全体を直接編集して、必要なオプションをすぐに反映します。",
  },
  eliminatesAwkwardSpeechAndStuttering: {
    ko: "어색한 발화 및 말더듬을 제거합니다.",
    en: "Eliminates awkward speech and stuttering.",
    ja: "ぎこちない話し方や吃音を解消します。",
  },
  email: {
    ko: "이메일",
    en: "e-mail",
    ja: "電子メール",
  },
  endDate: {
    ko: "종료일",
    en: "End Date",
    ja: "終了日",
  },
  endpoint: {
    ko: "엔드포인트",
    en: "Endpoint",
    ja: "エンドポイント",
  },
  endpointType: {
    ko: "엔드포인트 종류",
    en: "Endpoint type",
    ja: "エンドポイントの種類",
  },
  rtzrApi: {
    ko: "RTZR API",
    en: "RTZR API",
    ja: "RTZR API",
  },
  onPrem: {
    ko: "On-prem",
    en: "On-prem",
    ja: "On-prem",
  },
  enterThePythonApiBaseUrlToApplyItToYourServer: {
    ko: "Python API Base URL을 입력하면 서버에 적용할 수 있습니다.",
    en: "Enter the Python API Base URL to apply it to your server.",
    ja: "Python API のベース URL を入力してサーバーに適用します。",
  },
  entire: {
    ko: "전체",
    en: "Entire",
    ja: "全体",
  },
  error: {
    ko: "오류",
    en: "Error",
    ja: "エラー",
  },
  exampleBasicKoreanSpeakerSeparation: {
    ko: "예: 기본 한국어(화자분리)",
    en: "Example: Basic Korean (speaker separation)",
    ja: "例：基礎韓国語（話者分離）",
  },
  exampleLinear16: {
    ko: "예: LINEAR16",
    en: "Example: LINEAR16",
    ja: "例: LINEAR16",
  },
  exampleMarchMeeting: {
    ko: "예: 3월 회의",
    en: "Example: March meeting",
    ja: "例: 3 月の会議",
  },
  exampleMeetingMinutesFilter: {
    ko: "예: \"회의록\" -오류 OR 업데이트",
    en: "Example: \"Meeting Minutes\" -Error OR Update",
    ja: "例: 「会議議事録」 - エラー OR 更新",
  },
  expandOptions: {
    ko: "옵션 펼치기",
    en: "Expand options",
    ja: "オプションを展開する",
  },
  explanation: {
    ko: "설명",
    en: "explanation",
    ja: "説明",
  },
  exportOrImportTranscriptionPresetsToShareTheSameSettingsWithTeamMembers: {
    ko: "전사 프리셋을 내보내거나 가져와 팀 구성원과 동일한 설정을 공유합니다.",
    en: "Export or import transcription presets to share the same settings with team members.",
    ja: "文字起こしプリセットをエクスポートまたはインポートして、チーム メンバーと同じ設定を共有します。",
  },
  exportTranscriptionSettingsJson: {
    ko: "전사 설정 내보내기 (JSON)",
    en: "Export transcription settings (JSON)",
    ja: "文字起こし設定のエクスポート（JSON）",
  },
  failedToDeleteBackendPreset: {
    ko: "백엔드 프리셋 삭제에 실패했습니다.",
    en: "Failed to delete backend preset.",
    ja: "バックエンド プリセットの削除に失敗しました。",
  },
  failedToExportTranscriptionPreset: {
    ko: "전사 프리셋 내보내기에 실패했습니다.",
    en: "Failed to export transcription preset.",
    ja: "文字起こしプリセットのエクスポートに失敗しました。",
  },
  failedToLoadBackendPreset: {
    ko: "백엔드 프리셋 불러오기에 실패했습니다.",
    en: "Failed to load backend preset.",
    ja: "バックエンド プリセットのロードに失敗しました。",
  },
  failedToLoadBackendState: {
    ko: "백엔드 상태를 불러오지 못했습니다.",
    en: "Failed to load backend state.",
    ja: "バックエンド状態のロードに失敗しました。",
  },
  showingLastKnownServerSettings: {
    ko: "마지막으로 확인된 서버 설정을 표시 중입니다.",
    en: "Showing the last known server settings.",
    ja: "最後に確認したサーバー設定を表示しています。",
  },
  pleaseCheckInternalAdminApiBaseUrlAndRetryServerStatus: {
    ko: "내부 관리자 API Base URL과 서버 상태를 확인한 뒤 다시 시도해 주세요.",
    en: "Check the internal admin API Base URL and server status, then retry.",
    ja: "内部管理 API Base URL とサーバー状態を確認してから再試行してください。",
  },
  pleaseCheckPythonApiBaseUrlAndRetryServerStatus: {
    ko: "Python API Base URL과 서버 상태를 확인한 뒤 다시 시도해 주세요.",
    en: "Check the Python API Base URL and server status, then retry.",
    ja: "Python API Base URL とサーバー状態を確認してから再試行してください。",
  },
  lastSuccessfulCheckAt: {
    ko: "마지막 정상 확인: {{time}}",
    en: "Last successful check: {{time}}",
    ja: "最後に正常確認した時刻: {{time}}",
  },
  failedToLoadWarriorPreset: {
    ko: "전사 프리셋 불러오기에 실패했습니다.",
    en: "Failed to load warrior preset.",
    ja: "戦士プリセットのロードに失敗しました。",
  },
  failedToSaveAudioChunk: {
    ko: "오디오 청크 저장 실패",
    en: "Failed to save audio chunk",
    ja: "オーディオチャンクの保存に失敗しました",
  },
  failedToSaveBackendPreset: {
    ko: "백엔드 프리셋 저장에 실패했습니다.",
    en: "Failed to save backend preset.",
    ja: "バックエンド プリセットの保存に失敗しました。",
  },
  failedToSaveCorrections: {
    ko: "교정 내용을 저장하지 못했습니다.",
    en: "Failed to save corrections.",
    ja: "修正内容の保存に失敗しました。",
  },
  failedToStartRecording: {
    ko: "녹음 시작 실패",
    en: "Failed to start recording",
    ja: "録音の開始に失敗しました",
  },
  failure: {
    ko: "실패",
    en: "Failure",
    ja: "失敗",
  },
  fileTranscription: {
    ko: "파일 전사",
    en: "File Transcription",
    ja: "ファイルの転写",
  },
  fileTranscriptionAndLiveStreamingRequestsAreDirectedToThisAddress: {
    ko: "파일 전사 및 실시간 스트리밍 요청이 이 주소로 전달됩니다.",
    en: "File transcription and live streaming requests are directed to this address.",
    ja: "ファイルのトランスクリプションとライブ ストリーミングのリクエストは、このアドレスに送信されます。",
  },
  internalAdminApiBaseUrlHelper: {
    ko: "비워 두면 Python API Base URL을 그대로 사용합니다. 분리된 내부망 주소가 있을 때만 별도로 입력하세요.",
    en: "Leave this blank to reuse the Python API Base URL. Set it only when admin traffic must use a separate internal address.",
    ja: "空欄の場合は Python API Base URL をそのまま使います。管理トラフィックを別の内部アドレスへ分ける必要がある場合のみ設定してください。",
  },
  internalAdminApiBaseUrlNotConfigured: {
    ko: "내부 관리자 URL 미설정",
    en: "Internal admin URL not configured",
    ja: "内部管理 URL 未設定",
  },
  fileTranscriptionRequest: {
    ko: "파일 전사 요청",
    en: "File Transcription Request",
    ja: "ファイル転写リクエスト",
  },
  fileUpload: {
    ko: "파일 업로드",
    en: "File Upload",
    ja: "ファイルのアップロード",
  },
  capture: {
    ko: "캡처",
    en: "Capture",
    ja: "キャプチャ",
  },
  translate: {
    ko: "번역",
    en: "Translate",
    ja: "翻訳",
  },
  filterReset: {
    ko: "필터 초기화",
    en: "Filter reset",
    ja: "フィルターリセット",
  },
  forServiceRelatedInquiriesPleaseUseTheChannelsBelow: {
    ko: "서비스 관련 문의는 아래 채널을 이용해 주세요.",
    en: "For service-related inquiries, please use the channels below.",
    ja: "サービスに関するお問い合わせは以下よりお願いいたします。",
  },
  forwarding: {
    ko: "전송",
    en: "forwarding",
    ja: "転送",
  },
  frequentlyUsedFunctionsCanBeAdjustedDirectlyWithSwitchesAndButtons: {
    ko: "자주 사용하는 기능을 스위치와 버튼으로 바로 조정할 수 있습니다.",
    en: "Frequently used functions can be adjusted directly with switches and buttons.",
    ja: "よく使う機能をスイッチやボタンで直接調整できます。",
  },
  generalStt: {
    ko: "일반 STT",
    en: "General STT",
    ja: "一般的なSTT",
  },
  getRealTimeSupportThroughADedicatedChannelForEnterpriseCustomers: {
    ko: "기업 고객용 전용 채널을 통해 실시간으로 지원을 받을 수 있습니다.",
    en: "Get real-time support through a dedicated channel for enterprise customers.",
    ja: "企業顧客向けの専用チャネルを通じてリアルタイムのサポートを受けられます。",
  },
  hasTimeInformation: {
    ko: "시간 정보 있음",
    en: "Has timestamp information",
    ja: "時刻情報あり",
  },
  help: {
    ko: "도움말",
    en: "Help",
    ja: "ヘルプ",
  },
  hideAdvancedSettings: {
    ko: "고급 설정 숨기기",
    en: "Hide advanced settings",
    ja: "詳細設定を非表示にする",
  },
  hideJson: {
    ko: "JSON 숨기기",
    en: "Hide JSON",
    ja: "JSONを隠す",
  },
  hideSettings: {
    ko: "설정 숨기기",
    en: "Hide settings",
    ja: "設定を非表示にする",
  },
  ifYouWouldLikeToContributeToOpenSourceOrHaveTechnicalDiscussionsPleaseRegisterAnIssue: {
    ko: "오픈소스 기여나 기술적인 논의를 원하시면 이슈를 등록해 주세요.",
    en: "If you would like to contribute to open source or have technical discussions, please register an issue.",
    ja: "オープンソースに貢献したい、または技術的な議論をしたい場合は、問題を登録してください。",
  },
  ignoreSsl: {
    ko: "SSL 무시",
    en: "Ignore SSL",
    ja: "SSLを無視する",
  },
  immediatelySwitchesTheSttServerEndpointThatThePythonApiWillConnectTo: {
    ko: "Python API가 연동할 STT 서버 엔드포인트를 즉시 전환합니다.",
    en: "Immediately switches the STT server endpoint that the Python API will connect to.",
    ja: "Python API が接続する STT サーバー エンドポイントをすぐに切り替えます。",
  },
  inAnOnPremEnvironmentYouCanEnterTheModelNameDirectlyOrLeaveItBlank: {
    ko: "On-prem 환경에서는 모델 이름을 직접 입력하거나 비워 둘 수 있습니다.",
    en: "In an on-prem environment, you can enter the model name directly or leave it blank.",
    ja: "オンプレミス環境では、モデル名を直接入力することも、空白のままにすることもできます。",
  },
  inProgress: {
    ko: "진행 중",
    en: "In progress",
    ja: "進行中",
  },
  inTheTranscriptionListClickTheButtonToUploadAFileOrStartRealTimeTranscription: {
    ko: "전사 목록에서 + 버튼을 눌러 파일 업로드 또는 실시간 전사를 시작합니다.",
    en: "In the transcription list, click the + button to upload a file or start real-time transcription.",
    ja: "文字起こしリストで、+ ボタンをクリックしてファイルをアップロードするか、リアルタイム文字起こしを開始します。",
  },
  installApp: {
    ko: "앱 설치",
    en: "Install App",
    ja: "アプリをインストールする",
  },
  installMalsoriAsAnApp: {
    ko: "MalSori를 앱으로 설치",
    en: "Install MalSori as an app",
    ja: "MalSori をアプリとしてインストールする",
  },
  itCannotBePlayedBecauseThereIsNoSectionInformation: {
    ko: "구간 정보가 없어 재생할 수 없습니다.",
    en: "It cannot be played because there is no section information.",
    ja: "セクション情報がないため再生できません。",
  },
  itProvidesPlaybackCorrectionAndWordHighlightingForEachSegmentAndAlsoSupportsJsonTextAndAudioDownloads: {
    ko: "세그먼트별 재생·교정·단어 하이라이트를 제공하며 JSON, 텍스트, 오디오 다운로드도 지원합니다.",
    en: "It provides playback, correction, and word highlighting for each segment, and also supports JSON, text, and audio downloads.",
    ja: "各セグメントの再生、修正、単語の強調表示が可能で、JSON、テキスト、音声のダウンロードもサポートしています。",
  },
  itnNormalization: {
    ko: "ITN 정규화",
    en: "ITN normalization",
    ja: "ITNの正規化",
  },
  japaneseJa: {
    ko: "일본어 (ja)",
    en: "Japanese (ja)",
    ja: "日本語 (ja)",
  },
  json: {
    ko: "JSON",
    en: "JSON",
    ja: "JSON",
  },
  jsonExport: {
    ko: "JSON 내보내기",
    en: "JSON export",
    ja: "JSON エクスポート",
  },
  keywordsCommaSeparated: {
    ko: "키워드 (쉼표 구분)",
    en: "Keywords (comma separated)",
    ja: "キーワード (カンマ区切り)",
  },
  koreanKo: {
    ko: "한국어 (ko)",
    en: "Korean (ko)",
    ja: "韓国語（コ）",
  },
  language: {
    ko: "언어",
    en: "Language",
    ja: "言語",
  },
  languageEnglish: {
    ko: "영어",
    en: "English",
    ja: "英語",
  },
  languageJapanese: {
    ko: "일본어",
    en: "Japanese",
    ja: "日本語",
  },
  languageKorean: {
    ko: "한국어",
    en: "Korean",
    ja: "韓国語",
  },
  listOfLanguageCandidatesCommaSeparated: {
    ko: "언어 후보 목록 (쉼표 구분)",
    en: "List of language candidates (comma separated)",
    ja: "言語候補のリスト (カンマ区切り)",
  },
  loadJson: {
    ko: "JSON 불러오기",
    en: "Load JSON",
    ja: "JSONをロードする",
  },
  loadTranscriptionSettingsJson: {
    ko: "전사 설정 불러오기 (JSON)",
    en: "Load transcription settings (JSON)",
    ja: "文字起こし設定の読み込み(JSON)",
  },
  localAudioFailedToLoad: {
    ko: "로컬 오디오를 불러오지 못했습니다.",
    en: "Local audio failed to load.",
    ja: "ローカルオーディオのロードに失敗しました。",
  },
  localAudioLoadFailed: {
    ko: "로컬 오디오 로드 실패",
    en: "Local audio load failed",
    ja: "ローカルオーディオのロードに失敗しました",
  },
  localTemporaryStorageCycleDuringRealTimeSessionsDefaultIs10Seconds: {
    ko: "실시간 세션 중 로컬 임시 저장 주기. 기본값 10초.",
    en: "Local temporary storage cycle during real-time sessions. Default is 10 seconds.",
    ja: "リアルタイムセッション中のローカル一時ストレージサイクル。デフォルトは 10 秒です。",
  },
  localTranscriptionRecordCreationFailed: {
    ko: "로컬 전사 레코드 생성 실패",
    en: "Local transcription record creation failed",
    ja: "ローカルの文字起こしレコードの作成に失敗しました",
  },
  localTranscriptionRecordsCannotBeCreated: {
    ko: "로컬 전사 레코드를 생성할 수 없습니다.",
    en: "Local transcription records cannot be created.",
    ja: "ローカルの文字起こしレコードは作成できません。",
  },
  malsoriHelp: {
    ko: "MalSori 도움말",
    en: "MalSori Help",
    ja: "マルソリのヘルプ",
  },
  malsoriIsAWebAppDesignedToQuicklyRecordAndProofreadConversationsAndMeetingMinutesPleaseReferToTheInstructionsBelowToLearnTheMainFunctionsAndShortcutKeysAndIfYouHaveAnyQuestionsPleaseContactUsAtAnyTime: {
    ko: "MalSori는 대화와 회의록을 빠르게 기록하고 교정할 수 있도록 설계된 웹앱입니다. 아래 안내를 참고해 주요 기능과 단축키를 익히고 궁금한 점은 언제든 연락 주세요.",
    en: "MalSori is a web app designed to quickly record and proofread conversations and meeting minutes. Please refer to the instructions below to learn the main functions and shortcut keys, and if you have any questions, please contact us at any time.",
    ja: "MalSori は、会話や会議議事録を迅速に記録および校正するように設計された Web アプリです。主な機能とショートカット キーについては、以下の手順を参照してください。ご不明な点がございましたら、いつでもお問い合わせください。",
  },
  manageOverallServiceSettingsIncludingEndpointsPresetsAndPermissions: {
    ko: "엔드포인트·프리셋·권한 등 서비스 전반의 환경설정을 관리합니다.",
    en: "Manage overall service settings, including endpoints, presets, and permissions.",
    ja: "エンドポイント、プリセット、権限などのサービス全体の設定を管理します。",
  },
  manageTranscriptionSettings: {
    ko: "전사 설정 관리",
    en: "Manage transcription settings",
    ja: "文字起こし設定を管理する",
  },
  managesDecoderconfigAndSessionSettingsForStreamingSttApiWebsocket: {
    ko: "스트리밍 STT API(WebSocket)용 DecoderConfig 및 세션 설정을 관리합니다.",
    en: "Manages DecoderConfig and session settings for streaming STT API (WebSocket).",
    ja: "DecoderConfig とストリーミング STT API (WebSocket) のセッション設定を管理します。",
  },
  managesTheLocalPythonApiAndSttEndpointsThatTheServerWillLookAt: {
    ko: "로컬 Python API와 STT 백엔드 프로필을 관리합니다.",
    en: "Manage the local Python API and STT backend profiles.",
    ja: "ローカルの Python API と STT バックエンドプロファイルを管理します。",
  },
  managesTheRequestconfigJsonToBePassedToTheRegularSttApiV1Transcribe: {
    ko: "일반 STT API(/v1/transcribe)에 전달할 RequestConfig JSON을 관리합니다.",
    en: "Manages the RequestConfig JSON to be passed to the regular STT API (/v1/transcribe).",
    ja: "通常の STT API (/v1/transcribe) に渡される RequestConfig JSON を管理します。",
  },
  manualInputHz: {
    ko: "수동 입력 (Hz)",
    en: "Manual input (Hz)",
    ja: "手動入力(Hz)",
  },
  maskOutInappropriateExpressions: {
    ko: "부적절한 표현을 마스킹합니다.",
    en: "Mask out inappropriate expressions.",
    ja: "不適切な表現をマスクしてください。",
  },
  maximumNumberOfParagraphSeparatorCharacters: {
    ko: "문단 분리 최대 문자 수",
    en: "Maximum number of paragraph separator characters",
    ja: "段落区切り文字の最大数",
  },
  meetingRecording: {
    ko: "회의 녹음",
    en: "Meeting Recording",
    ja: "会議の録音",
  },
  microphonePermission: {
    ko: "마이크 권한",
    en: "microphone permission",
    ja: "マイクの許可",
  },
  microphonePermissionHasBeenGranted: {
    ko: "마이크 권한이 허용되었습니다.",
    en: "Microphone permission has been granted.",
    ja: "マイクの許可が与えられました。",
  },
  model: {
    ko: "모델",
    en: "Model",
    ja: "モデル",
  },
  modelName: {
    ko: "모델 이름",
    en: "Model name",
    ja: "モデル名",
  },
  modelNotSpecified: {
    ko: "모델 미지정",
    en: "Model not specified",
    ja: "モデルが指定されていません",
  },
  multilingualMultiWhisperOnly: {
    ko: "다국어 (multi · Whisper 전용)",
    en: "Multilingual (multi·Whisper only)",
    ja: "多言語対応（マルチ・ウィスパーのみ）",
  },
  newPreset: {
    ko: "새 프리셋",
    en: "new preset",
    ja: "新しいプリセット",
  },
  noEndpointInformation: {
    ko: "엔드포인트 정보 없음",
    en: "No endpoint information",
    ja: "エンドポイント情報がありません",
  },
  noEndpointInformationRecorded: {
    ko: "기록된 엔드포인트 정보가 없습니다",
    en: "No endpoint information recorded",
    ja: "エンドポイント情報が記録されていません",
  },
  noModelInformationRecorded: {
    ko: "기록된 모델 정보가 없습니다",
    en: "No model information recorded",
    ja: "モデル情報が記録されていません",
  },
  noTimeInformation: {
    ko: "시간 정보 없음",
    en: "No timestamp information",
    ja: "時間情報がありません",
  },
  noTranscriptionRecordsFound: {
    ko: "전사 기록을 찾을 수 없습니다.",
    en: "No transcription records found.",
    ja: "転写レコードは見つかりませんでした。",
  },
  noWordsWereEntered: {
    ko: "입력된 단어가 없습니다.",
    en: "No words were entered.",
    ja: "言葉は入力されませんでした。",
  },
  noteMode: {
    ko: "노트 모드",
    en: "Note mode",
    ja: "ノートモード",
  },
  noteModeHelper: {
    ko: "발화 시간/말풍선 없이 한 줄씩 이어 붙여 보여줍니다.",
    en: "Show everything in one text area without timestamps or bubbles.",
    ja: "時間や吹き出しを省き、1つのテキスト欄にまとめて表示します。",
  },
  noteModePlaceholder: {
    ko: "말풍선마다 줄바꿈되어 노트처럼 표시됩니다.",
    en: "Each utterance is placed on a new line, like a note.",
    ja: "各発話が改行され、ノートのように表示されます。",
  },
  noteModeTextAreaLabel: {
    ko: "노트 보기",
    en: "Note view",
    ja: "ノート表示",
  },
  waveformTimeline: {
    ko: "웨이브폼 타임라인",
    en: "Waveform timeline",
    ja: "波形タイムライン",
  },
  waveformTimelineHelper: {
    ko: "타임라인을 눌러 원하는 시점으로 이동하고, 구간을 선택해 반복 재생 범위를 설정하세요.",
    en: "Tap or click the timeline to seek, then set a loop range from the selected segment.",
    ja: "タイムラインをクリックしてシークし、選択したセグメントからループ範囲を設定できます。",
  },
  playbackPosition: {
    ko: "재생 위치",
    en: "Playback position",
    ja: "再生位置",
  },
  timelineScrub: {
    ko: "타임라인 스크럽",
    en: "Timeline scrub",
    ja: "タイムラインスクラブ",
  },
  loopPlayback: {
    ko: "루프 재생",
    en: "Loop playback",
    ja: "ループ再生",
  },
  setLoopStart: {
    ko: "루프 시작 지정",
    en: "Set loop start",
    ja: "ループ開始を設定",
  },
  setLoopEnd: {
    ko: "루프 종료 지정",
    en: "Set loop end",
    ja: "ループ終了を設定",
  },
  loopActiveSegment: {
    ko: "활성 구간으로 루프",
    en: "Loop active segment",
    ja: "アクティブ区間をループ",
  },
  clearLoop: {
    ko: "루프 해제",
    en: "Clear loop",
    ja: "ループ解除",
  },
  loopRangeLabel: {
    ko: "루프 범위: {{start}} ~ {{end}}",
    en: "Loop range: {{start}} - {{end}}",
    ja: "ループ範囲: {{start}} - {{end}}",
  },
  loopRangeNotSet: {
    ko: "루프 범위가 아직 설정되지 않았습니다.",
    en: "Loop range is not set yet.",
    ja: "ループ範囲はまだ設定されていません。",
  },
  waveformLoading: {
    ko: "웨이브폼을 불러오는 중입니다...",
    en: "Loading waveform...",
    ja: "波形を読み込み中...",
  },
  selectSegmentToSetLoop: {
    ko: "루프를 지정할 구간을 먼저 선택해 주세요.",
    en: "Select a segment first to set loop range.",
    ja: "ループ範囲を設定するには、先にセグメントを選択してください。",
  },
  numberOfSpeakersMaximum: {
    ko: "화자 수 (최대값)",
    en: "Number of speakers (maximum)",
    ja: "スピーカーの数 (最大)",
  },
  onceYouHaveTheAudioReadyYouCanPlayEachSectionAndSaveTheCorrectedSentences: {
    ko: "오디오가 준비된 경우 각 구간을 재생하고 교정된 문장을 저장할 수 있습니다.",
    en: "Once you have the audio ready, you can play each section and save the corrected sentences.",
    ja: "音声の準備ができたら、各セクションを再生し、修正した文章を保存できます。",
  },
  onlyAvailableOnWhisperModelExampleKoEnJa: {
    ko: "Whisper 모델에서만 사용 가능합니다. 예: ko, en, ja",
    en: "Only available on Whisper model. Example: ko, en, ja",
    ja: "Whisperモデルのみでご利用いただけます。例: ko、en、ja",
  },
  openMenu: {
    ko: "메뉴 열기",
    en: "Open menu",
    ja: "メニューを開く",
  },
  skipToMainContent: {
    ko: "본문으로 바로 이동",
    en: "Skip to main content",
    ja: "メイン コンテンツへスキップ",
  },
  quickActions: {
    ko: "빠른 작업",
    en: "Quick actions",
    ja: "クイックアクション",
  },
  openRealTimeTranscriptionSettings: {
    ko: "실시간 전사 설정 열기",
    en: "Open real-time transcription settings",
    ja: "リアルタイム文字起こし設定を開く",
  },
  openStreamingSettings: {
    ko: "스트리밍 설정 열기",
    en: "Open streaming settings",
    ja: "ストリーミング設定を開く",
  },
  passInTheKeywordsFieldToEmphasizeOrPrioritizeSpecificWords: {
    ko: "특정 단어를 강조하거나 우선 인식하도록 keywords 필드에 전달합니다.",
    en: "Pass in the keywords field to emphasize or prioritize specific words.",
    ja: "特定の単語を強調または優先するには、キーワード フィールドを渡します。",
  },
  pause: {
    ko: "일시정지",
    en: "Pause",
    ja: "一時停止",
  },
  permissionToReliablyStoreSessionLogsAndTemporaryTranscriptionData: {
    ko: "세션 로그와 임시 전사 데이터를 안정적으로 보관하기 위한 권한입니다.",
    en: "Permission to reliably store session logs and temporary transcription data.",
    ja: "セッション ログと一時的な文字起こしデータを確実に保存する権限。",
  },
  playTheSection: {
    ko: "해당 구간 재생",
    en: "Play the section",
    ja: "セクションを再生する",
  },
  playing: {
    ko: "재생 중...",
    en: "Playing...",
    ja: "再生中...",
  },
  pleaseAddANewPreset: {
    ko: "새 프리셋을 추가해 주세요.",
    en: "Please add a new preset.",
    ja: "新しいプリセットを追加してください。",
  },
  pleaseAddStreamingPresetsInSettingsManageTranscriptionSettings: {
    ko: "설정 > 전사 설정 관리에서 스트리밍 프리셋을 추가해 주세요.",
    en: "Please add streaming presets in Settings > Manage transcription settings.",
    ja: "[設定] > [文字起こし設定の管理] でストリーミング プリセットを追加してください。",
  },
  pleaseAdjustOrResetTheFilter: {
    ko: "필터를 조정하거나 초기화해 주세요.",
    en: "Please adjust or reset the filter.",
    ja: "フィルターを調整またはリセットしてください。",
  },
  pleaseCheckTheSettingsJson: {
    ko: "설정 JSON을 확인해 주세요.",
    en: "Please check the settings JSON.",
    ja: "設定のJSONを確認してください。",
  },
  pleaseCheckTheStreamingSettingsJson: {
    ko: "스트리밍 설정 JSON을 확인해 주세요.",
    en: "Please check the streaming settings JSON.",
    ja: "ストリーミング設定の JSON を確認してください。",
  },
  pleaseEnterAPresetName: {
    ko: "프리셋 이름을 입력해 주세요.",
    en: "Please enter a preset name.",
    ja: "プリセット名を入力してください。",
  },
  pleaseEnterTheApiBaseUrl: {
    ko: "API Base URL을 입력해 주세요.",
    en: "Please enter the API Base URL.",
    ja: "API ベース URL を入力してください。",
  },
  pleaseEnterAValidApiBaseUrl: {
    ko: "유효한 API Base URL(http/https)을 입력해 주세요.",
    en: "Please enter a valid API Base URL (http/https).",
    ja: "有効な API ベース URL（http/https）を入力してください。",
  },
  pleaseEnterTheBackendPresetName: {
    ko: "백엔드 프리셋 이름을 입력해 주세요.",
    en: "Please enter the backend preset name.",
    ja: "バックエンドのプリセット名を入力してください。",
  },
  pleaseEnterThePythonApiBaseUrlFirst: {
    ko: "Python API Base URL을 먼저 입력해 주세요.",
    en: "Please enter the Python API Base URL first.",
    ja: "最初に Python API のベース URL を入力してください。",
  },
  internalAdminApiBaseUrlRequired: {
    ko: "Python API Base URL을 먼저 저장하거나, 별도 내부 관리자 API Base URL을 입력해 주세요.",
    en: "Save the Python API Base URL first, or enter a separate internal admin API base URL.",
    ja: "まず Python API Base URL を保存するか、別の内部管理 API Base URL を入力してください。",
  },
  pleaseEnterThePythonApiBaseUrlOnTheSettingsPage: {
    ko: "Python API Base URL을 설정 페이지에서 입력해 주세요.",
    en: "Please enter the Python API Base URL on the settings page.",
    ja: "設定ページで Python API のベース URL を入力してください。",
  },
  pleaseEnterTheSampleRateDirectlyIfItIsNotInTheButton: {
    ko: "버튼에 없는 샘플 레이트를 직접 입력하세요.",
    en: "Please enter the sample rate directly if it is not in the button.",
    ja: "ボタンにサンプルレートがない場合は、サンプルレートを直接入力してください。",
  },
  pleaseLeaveANoteAboutTranscriptionOptions: {
    ko: "전사 옵션 메모를 남겨 주세요.",
    en: "Please leave a note about transcription options.",
    ja: "文字起こしオプションについてメモを残してください。",
  },
  pleaseLeaveAnEndpointNote: {
    ko: "엔드포인트 메모를 남겨 주세요.",
    en: "Please leave an endpoint note.",
    ja: "エンドポイントメモを残してください。",
  },
  pleaseSelectTheBackendPresetToApply: {
    ko: "적용할 백엔드 프리셋을 선택해 주세요.",
    en: "Please select the backend preset to apply.",
    ja: "適用するバックエンド プリセットを選択してください。",
  },
  pleaseSelectTheBackendPresetYouWantToDelete: {
    ko: "삭제할 백엔드 프리셋을 선택해 주세요.",
    en: "Please select the backend preset you want to delete.",
    ja: "削除するバックエンド プリセットを選択してください。",
  },
  pleaseSelectTheBackendPresetYouWantToExport: {
    ko: "내보낼 백엔드 프리셋을 선택해 주세요.",
    en: "Please select the backend preset you want to export.",
    ja: "エクスポートするバックエンド プリセットを選択してください。",
  },
  pleaseSetThePythonApiBaseUrlFirst: {
    ko: "Python API Base URL을 먼저 설정해 주세요.",
    en: "Please set the Python API Base URL first.",
    ja: "最初に Python API のベース URL を設定してください。",
  },
  preparingForSession: {
    ko: "세션 준비 중",
    en: "Preparing for session",
    ja: "セッションの準備中",
  },
  presetEndpoints: {
    ko: "프리셋 엔드포인트",
    en: "Preset Endpoints",
    ja: "プリセットエンドポイント",
  },
  presetName: {
    ko: "프리셋 이름",
    en: "Preset name",
    ja: "プリセット名",
  },
  presetList: {
    ko: "프리셋 목록",
    en: "Preset list",
    ja: "プリセット一覧",
  },
  defaultFilePresetName: {
    ko: "기본 (sommers)",
    en: "Default (sommers)",
    ja: "デフォルト (sommers)",
  },
  defaultFilePresetDescription: {
    ko: "sommers 모델, 문단 분리 ON",
    en: "sommers model, paragraph split ON",
    ja: "sommers モデル、段落分割 ON",
  },
  speakerSeparationPresetName: {
    ko: "화자 분리",
    en: "Speaker separation",
    ja: "話者分離",
  },
  speakerSeparationPresetDescription: {
    ko: "화자 수 2명 고정",
    en: "Fixed to 2 speakers",
    ja: "話者数 2 名固定",
  },
  defaultStreamingPresetName: {
    ko: "기본 스트리밍",
    en: "Default streaming",
    ja: "デフォルト ストリーミング",
  },
  defaultStreamingPresetDescription: {
    ko: "16kHz LINEAR16, 사용 모델 자동",
    en: "16kHz LINEAR16, auto model",
    ja: "16kHz LINEAR16、モデル自動",
  },
  defaultBackendPresetName: {
    ko: "RTZR Cloud (기본)",
    en: "RTZR Cloud (Default)",
    ja: "RTZR Cloud (デフォルト)",
  },
  defaultBackendPresetDescription: {
    ko: "공식 RTZR API (openapi.vito.ai)",
    en: "Official RTZR API (openapi.vito.ai)",
    ja: "公式 RTZR API (openapi.vito.ai)",
  },
  preview: {
    ko: "미리보기: {{text}}",
    en: "Preview: {{text}}",
    ja: "プレビュー: {{text}}",
  },
  proceedWithLocalSavingAfterStoppingRecordingOrAutomaticallyTemporarilySaveWhenTheConnectionIsLost: {
    ko: "녹음 중단 후 로컬 저장을 진행하거나 연결이 끊기면 자동으로 임시 저장합니다.",
    en: "Proceed with local saving after stopping recording, or automatically temporarily save when the connection is lost.",
    ja: "録画停止後にローカル保存を続行するか、接続が切断されたときに自動的に一時保存します。",
  },
  profanityFiltering: {
    ko: "비속어 필터링",
    en: "Profanity filtering",
    ja: "冒とく的な表現のフィルタリング",
  },
  punctuationCorrection: {
    ko: "문장부호 보정",
    en: "Punctuation correction",
    ja: "句読点の修正",
  },
  quickOptionControl: {
    ko: "빠른 옵션 제어",
    en: "Quick option control",
    ja: "クイックオプションコントロール",
  },
  reRequestPermission: {
    ko: "권한 재요청",
    en: "Re-request permission",
    ja: "許可を再リクエストする",
  },
  bufferingAudioS: {
    ko: "오디오 버퍼링 {{seconds}}초",
    en: "Buffering {{seconds}}s of audio",
    ja: "音声を {{seconds}} 秒バッファリング中",
  },
  bufferedAudioWillReplayWhenConnectionReturns: {
    ko: "연결이 복구되면 버퍼링된 오디오 {{seconds}}초를 순서대로 다시 전송합니다.",
    en: "When the connection returns, the buffered {{seconds}} seconds of audio will replay in order.",
    ja: "接続が戻ると、バッファされた {{seconds}} 秒の音声を順番どおり再送します。",
  },
  readyToStartS: {
    ko: "시작 준비 ({{seconds}}s)",
    en: "Ready to start ({{seconds}}s)",
    ja: "開始する準備ができました ({{seconds}}s)",
  },
  lab: {
    ko: "실험실",
    en: "Lab",
    ja: "ラボ",
  },
  labRealtimeUploadTitle: {
    ko: "실시간 STT 파일 업로드",
    en: "Realtime STT file upload",
    ja: "リアルタイムSTTファイルアップロード",
  },
  labRealtimeUploadDescription: {
    ko: "오디오 파일을 실시간 STT API로 전송하고 응답을 확인합니다.",
    en: "Send an audio file to the realtime STT API and watch the responses.",
    ja: "音声ファイルをリアルタイム STT API に送り、応答を確認します。",
  },
  uploadProcessingMode: {
    ko: "업로드 처리 방식",
    en: "Upload processing mode",
    ja: "アップロード処理方式",
  },
  uploadQueue: {
    ko: "업로드 큐",
    en: "Upload queue",
    ja: "アップロードキュー",
  },
  batchFileTranscription: {
    ko: "일반 파일 STT",
    en: "Batch file STT",
    ja: "通常ファイル STT",
  },
  batchFileTranscriptionHelper: {
    ko: "일반 STT API로 파일 작업을 만들고 상태를 동기화합니다.",
    en: "Create a file transcription job through the batch STT API and sync status.",
    ja: "通常の STT API でファイル文字起こしジョブを作成し、状態を同期します。",
  },
  bulkTranscriptionRequestsFailed: {
    ko: "벌크 전사 요청이 모두 실패했습니다.",
    en: "All bulk transcription requests failed.",
    ja: "一括文字起こしリクエストはすべて失敗しました。",
  },
  bulkTranscriptionRequestsPartiallySent: {
    ko: "전사 요청 {{total}}개 중 {{success}}개를 전송했습니다.",
    en: "Sent {{success}} of {{total}} transcription requests.",
    ja: "{{total}} 件中 {{success}} 件の文字起こしリクエストを送信しました。",
  },
  bulkTranscriptionRequestsSent: {
    ko: "전사 요청 {{count}}개를 전송했습니다.",
    en: "Sent {{count}} transcription requests.",
    ja: "{{count}} 件の文字起こしリクエストを送信しました。",
  },
  realtimeApiFileUpload: {
    ko: "실시간 API 파일 STT",
    en: "Realtime API file STT",
    ja: "リアルタイム API ファイル STT",
  },
  realtimeApiFileUploadHelper: {
    ko: "브라우저에서 파일을 PCM으로 변환한 뒤 실시간 STT API로 전송하고 결과를 전사 목록에 저장합니다.",
    en: "Convert the file to PCM in the browser, stream it to the realtime STT API, and save the result in transcription history.",
    ja: "ブラウザーでファイルを PCM に変換し、リアルタイム STT API に送信して結果を文字起こし履歴に保存します。",
  },
  sttTransport: {
    ko: "STT 전송",
    en: "STT transport",
    ja: "STT 送信方式",
  },
  batchApi: {
    ko: "일반 API",
    en: "Batch API",
    ja: "通常 API",
  },
  realtimeApi: {
    ko: "실시간 API",
    en: "Realtime API",
    ja: "リアルタイム API",
  },
  realtimeSimulationOption: {
    ko: "실시간 전송 모사 (0.1~0.2초 간격)",
    en: "Simulate realtime streaming (0.1–0.2s pacing)",
    ja: "リアルタイムシミュレーション（0.1〜0.2秒間隔）",
  },
  realtimeSimulationHelper: {
    ko: "선택 시 오디오 길이에 맞춰 0.1~0.2초씩 지연해 전송합니다.",
    en: "When enabled, chunks are throttled to match real time, sending only 0.1–0.2s of audio at a time.",
    ja: "有効にすると、0.1〜0.2秒分の音声だけをリアルタイムに合わせて送信します。",
  },
  simulateRealtimeFromFile: {
    ko: "파일로 실시간 전사 모사",
    en: "Simulate realtime transcription from a file",
    ja: "ファイルでリアルタイム文字起こしをシミュレート",
  },
  startRealtimeUpload: {
    ko: "전송 시작",
    en: "Start upload",
    ja: "アップロード開始",
  },
  stopRealtimeUpload: {
    ko: "전송 중단",
    en: "Stop upload",
    ja: "アップロード停止",
  },
  streamingUploadStatus: {
    ko: "전송 상태",
    en: "Upload status",
    ja: "アップロード状態",
  },
  streamingUploadProgress: {
    ko: "전송 진행률",
    en: "Upload progress",
    ja: "アップロード進行状況",
  },
  streamingResponse: {
    ko: "실시간 응답",
    en: "Realtime response",
    ja: "リアルタイム応答",
  },
  recentPartialResult: {
    ko: "현재 인식 중",
    en: "Current partial",
    ja: "現在の暫定結果",
  },
  noStreamingResultsYet: {
    ko: "아직 수신된 실시간 결과가 없습니다.",
    en: "No realtime results yet.",
    ja: "まだリアルタイム結果がありません。",
  },
  duration: {
    ko: "재생 시간",
    en: "Duration",
    ja: "再生時間",
  },
  realTimeRecognition: {
    ko: "실시간 인식 중",
    en: "Real-time recognition",
    ja: "リアルタイム認識",
  },
  realTimeTranscriptLog: {
    ko: "실시간 전사 로그",
    en: "Real-time transcript log",
    ja: "リアルタイム文字起こしログ",
  },
  realtimeLatency: {
    ko: "지연",
    en: "Latency",
    ja: "遅延",
  },
  latencyUnknown: {
    ko: "측정 대기",
    en: "Waiting",
    ja: "計測待機",
  },
  latencyStable: {
    ko: "안정",
    en: "Stable",
    ja: "安定",
  },
  latencyDelayed: {
    ko: "지연",
    en: "Delayed",
    ja: "遅延",
  },
  latencyCritical: {
    ko: "불안정",
    en: "Unstable",
    ja: "不安定",
  },
  realTimeTranscription: {
    ko: "실시간",
    en: "Realtime",
    ja: "リアルタイム文字起こし",
  },
  realTimeTranscriptionAutoSaveCycleSeconds: {
    ko: "실시간 자동저장(초)",
    en: "Realtime autosave (s)",
    ja: "リアルタイム文字起こし自動保存サイクル (秒)",
  },
  realTimeTranscriptionBeginsAfterA3SecondCountdown: {
    ko: "3초 카운트다운 후 실시간 전사를 시작합니다",
    en: "Real-time transcription begins after a 3-second countdown.",
    ja: "3 秒のカウントダウンの後、リアルタイムの文字起こしが始まります。",
  },
  realTimeTranscriptionResultsAreSaved: {
    ko: "실시간 전사 결과를 저장했습니다.",
    en: "Real-time Transcription results are saved.",
    ja: "リアルタイムの文字起こし結果が保存されます。",
  },
  realTimeTranscriptionSaveFailure: {
    ko: "실시간 전사 저장 실패",
    en: "Real-time transcription save failure",
    ja: "リアルタイム文字起こし保存失敗",
  },
  realTimeTranscriptionScreen: {
    ko: "실시간 전사 화면",
    en: "Real-time transcription screen",
    ja: "リアルタイム文字起こし画面",
  },
  realTimeTranscriptionWasInterruptedAndTheResultsWereTemporarilyStored: {
    ko: "실시간 전사가 중단되어 결과를 임시 저장했습니다.",
    en: "Real-time transcription was interrupted and the results were temporarily stored.",
    ja: "リアルタイムの転写は中断され、結果は一時的に保存されました。",
  },
  recordingError: {
    ko: "녹음 오류",
    en: "Recording error",
    ja: "録音エラー",
  },
  recordingPlayback: {
    ko: "녹음 재생 중",
    en: "Playing recording",
    ja: "録音再生中",
  },
  redactedText: {
    ko: "교정된 텍스트",
    en: "Redacted text",
    ja: "編集されたテキスト",
  },
  refreshServerStatus: {
    ko: "서버 상태 새로고침",
    en: "Refresh server status",
    ja: "サーバーのステータスを更新する",
  },
  refreshServerStatusBeforeApplyingServerSettings: {
    ko: "서버 상태를 먼저 새로고침해 현재 적용값을 확인한 뒤 적용하세요.",
    en: "Refresh the server status first so you can review the current live settings before applying.",
    ja: "先にサーバー状態を更新して現在の適用値を確認してから適用してください。",
  },
  refreshServerStatusBeforeRestoringServerDefaults: {
    ko: "서버 상태를 먼저 새로고침해 현재 override 상태를 확인한 뒤 복원하세요.",
    en: "Refresh the server status first so you can review the current override before restoring the server default.",
    ja: "先にサーバー状態を更新して現在の override を確認してからサーバーのデフォルトへ戻してください。",
  },
  refreshOperatorAccess: {
    ko: "운영자 접근 새로고침",
    en: "Refresh operator access",
    ja: "オペレーターアクセスを更新",
  },
  refreshStatus: {
    ko: "상태 새로고침",
    en: "Refresh status",
    ja: "ステータスの更新",
  },
  rejected: {
    ko: "거부됨",
    en: "rejected",
    ja: "拒否されました",
  },
  removedBackendPresets: {
    ko: "백엔드 프리셋을 삭제했습니다.",
    en: "Removed backend presets.",
    ja: "バックエンドのプリセットを削除しました。",
  },
  requestRequired: {
    ko: "요청 필요",
    en: "Request required",
    ja: "リクエストが必要です",
  },
  optional: {
    ko: "선택",
    en: "Optional",
    ja: "任意",
  },
  requesting: {
    ko: "요청 중...",
    en: "Requesting...",
    ja: "リクエスト中...",
  },
  requiredWhenCheckingOrApplyingServerSettings: {
    ko: "서버 상태 조회/적용 시 필요합니다. 로컬에 저장되지 않습니다.",
    en: "Required to check or apply server settings. Not saved locally.",
    ja: "サーバー設定の確認/適用に必要です。ローカルには保存されません。",
  },
  resolvedByServerDefault: {
    ko: "서버 기본값에 따라 결정됨",
    en: "Resolved by server default",
    ja: "サーバーのデフォルトで決定",
  },
  restoringServerDefaultsFailed: {
    ko: "서버 기본값 복원에 실패했습니다.",
    en: "Restoring server defaults failed.",
    ja: "サーバーのデフォルトの復元に失敗しました。",
  },
  restoringServerDefaults: {
    ko: "서버 기본값 복원 중...",
    en: "Restoring server defaults...",
    ja: "サーバーのデフォルトを復元中...",
  },
  resumption: {
    ko: "재개",
    en: "Resumption",
    ja: "再開",
  },
  returnToServerDefault: {
    ko: "서버 기본값으로 돌리기",
    en: "Return to server default",
    ja: "サーバーのデフォルトに戻す",
  },
  reviewBackendApplyChange: {
    ko: "서버 적용 전 변경사항 확인",
    en: "Review backend apply change",
    ja: "サーバー適用前の変更を確認",
  },
  reviewBackendApplyChangeHelper: {
    ko: "{{name}} 프리셋을 live backend로 적용합니다. 현재 상태와 다음 상태를 확인한 뒤 진행하세요.",
    en: "Apply {{name}} to the live backend. Review the current and next state before continuing.",
    ja: "{{name}} を live backend に適用します。続行前に現在と変更後の状態を確認してください。",
  },
  reviewServerDefaultRestore: {
    ko: "서버 기본값 복원 전 확인",
    en: "Review server default restore",
    ja: "サーバーのデフォルトに戻す前の確認",
  },
  reviewServerDefaultRestoreHelper: {
    ko: "현재 live override를 제거하고 서버 기본값으로 되돌립니다. 복원 후에는 서버가 관리하는 기본 endpoint/credential 구성을 따릅니다.",
    en: "Remove the current live override and return to the server default. After restore, the server-managed endpoint and credential configuration will be used.",
    ja: "現在の live override を削除してサーバーのデフォルトに戻します。復元後はサーバー管理の endpoint / credential 設定を使用します。",
  },
  revertedToServerDefaults: {
    ko: "서버 기본값으로 되돌렸습니다.",
    en: "Reverted to server defaults.",
    ja: "サーバーのデフォルトに戻しました。",
  },
  revertedToServerDefaultsWithRollbackHint: {
    ko: "서버 기본값으로 되돌렸습니다. 다시 override하려면 원하는 프리셋을 재적용하세요.",
    en: "Reverted to the server default. Re-apply a preset if you need to restore an override.",
    ja: "サーバーのデフォルトに戻しました。override を復元するにはプリセットを再適用してください。",
  },
  save: {
    ko: "저장",
    en: "Save",
    ja: "保存",
  },
  saveConnectionSettings: {
    ko: "연결 설정 저장",
    en: "Save connection settings",
    ja: "接続設定を保存",
  },
  savePreset: {
    ko: "프리셋 저장",
    en: "Save preset",
    ja: "プリセットの保存",
  },
  saving: {
    ko: "저장 중",
    en: "Saving",
    ja: "保存",
  },
  saving2: {
    ko: "저장 중...",
    en: "Saving...",
    ja: "保存中...",
  },
  saved: {
    ko: "저장됨",
    en: "Saved",
    ja: "保存済み",
  },
  connectionSettingsSaved: {
    ko: "연결 설정을 저장했습니다.",
    en: "Connection settings saved.",
    ja: "接続設定を保存しました。",
  },
  failedToSaveConnectionSettings: {
    ko: "연결 설정 저장에 실패했습니다.",
    en: "Failed to save connection settings.",
    ja: "接続設定の保存に失敗しました。",
  },
  savingResults: {
    ko: "결과를 저장하는 중입니다",
    en: "Saving results",
    ja: "結果の保存",
  },
  searchForUtteranceContent: {
    ko: "발화 내용 검색",
    en: "Search for utterance content",
    ja: "発言内容を検索する",
  },
  securelyStoreBackendEndpointUrlsAndCredentials: {
    ko: "백엔드 엔드포인트 URL과 인증 정보를 안전하게 보관합니다.",
    en: "Securely store backend endpoint URLs and credentials.",
    ja: "バックエンドのエンドポイント URL と認証情報を安全に保存します。",
  },
  segmentCalibrationSaveFailure: {
    ko: "세그먼트 교정 저장 실패",
    en: "Segment calibration save failure",
    ja: "セグメントキャリブレーションの保存に失敗しました",
  },
  segmentPlaybackFailed: {
    ko: "세그먼트 재생 실패",
    en: "Segment playback failed",
    ja: "セグメントの再生に失敗しました",
  },
  selectAudioFile: {
    ko: "오디오/비디오 파일 선택",
    en: "Select audio or video file",
    ja: "音声/動画ファイルを選択",
  },
  selectAudioFiles: {
    ko: "오디오/비디오 파일 선택",
    en: "Select audio or video files",
    ja: "音声/動画ファイルを選択",
  },
  selectedFilesSummary: {
    ko: "선택한 파일 {{count}}개 · {{size}}",
    en: "{{count}} files selected · {{size}}",
    ja: "{{count}} 件のファイルを選択 · {{size}}",
  },
  selectFromKoJaMultiOrDetectMultiDetectIsOnlyEnabledOnWhisperFamilyModels: {
    ko: "ko, ja, multi, detect 중 선택합니다. multi/detect는 Whisper 계열 모델에서만 활성화됩니다.",
    en: "Select from ko, ja, multi, or detect. multi/detect is only enabled on Whisper family models.",
    ja: "ko、ja、multi、detectから選択します。 multi/detect は Whisper ファミリ モデルでのみ有効になります。",
  },
  selectLanguage: {
    ko: "언어 선택",
    en: "Select language",
    ja: "言語を選択してください",
  },
  selectSampleRate: {
    ko: "샘플 레이트 선택",
    en: "Select sample rate",
    ja: "サンプルレートの選択",
  },
  sending: {
    ko: "전송 중...",
    en: "Sending...",
    ja: "送信中...",
  },
  serverDefault: {
    ko: "서버 기본",
    en: "server default",
    ja: "サーバーのデフォルト",
  },
  serverDefaultEndpoint: {
    ko: "서버 기본 엔드포인트",
    en: "Server default endpoint",
    ja: "サーバーのデフォルトのエンドポイント",
  },
  deletedPreset: {
    ko: "삭제된 프리셋",
    en: "Deleted preset",
    ja: "削除されたプリセット",
  },
  serverDefaultSettingsHaveBeenApplied: {
    ko: "서버 기본 설정을 적용했습니다.",
    en: "Server default settings have been applied.",
    ja: "サーバーのデフォルト設定が適用されました。",
  },
  serverPreferences: {
    ko: "서버 기본 설정",
    en: "Server Preferences",
    ja: "サーバー設定",
  },
  sessionControl: {
    ko: "세션 제어",
    en: "Session Control",
    ja: "セッション制御",
  },
  sessionEnds: {
    ko: "세션 종료",
    en: "Terminate Session",
    ja: "セッション終了",
  },
  abortSession: {
    ko: "세션 중단",
    en: "Abort session",
    ja: "セッション中断",
  },
  sessionStateCountdown: {
    ko: "카운트다운",
    en: "Countdown",
    ja: "カウントダウン",
  },
  sessionStateRecording: {
    ko: "녹음 중",
    en: "Recording",
    ja: "録音中",
  },
  setAsDefaultPreset: {
    ko: "기본 프리셋으로 지정",
    en: "Set as default preset",
    ja: "デフォルトのプリセットとして設定",
  },
  setting: {
    ko: "설정",
    en: "Setting",
    ja: "設定",
  },
  settingsJson: {
    ko: "설정 JSON",
    en: "Settings JSON",
    ja: "設定JSON",
  },
  settingsJsonMustBeInObjectForm: {
    ko: "설정 JSON은 객체 형태여야 합니다.",
    en: "Settings JSON must be in object form.",
    ja: "設定 JSON はオブジェクト形式である必要があります。",
  },
  settingsPresets: {
    ko: "설정 프리셋",
    en: "Settings Presets",
    ja: "設定のプリセット",
  },
  settingsScreen: {
    ko: "설정 화면",
    en: "Settings screen",
    ja: "設定画面",
  },
  sourceSettingsJson: {
    ko: "원본 설정 JSON",
    en: "Source settings JSON",
    ja: "ソース設定 JSON",
  },
  speaker: {
    ko: "화자 {{speaker}}",
    en: "Speaker {{speaker}}",
    ja: "スピーカー {{speaker}}",
  },
  speakerUpdateSuccess: {
    ko: "화자 정보가 업데이트되었습니다.",
    en: "Speaker updated successfully.",
    ja: "話者情報が更新されました。",
  },
  speakerName: {
    ko: "화자 이름",
    en: "Speaker Name",
    ja: "話者名",
  },
  speakerNotSpecified: {
    ko: "화자 미지정",
    en: "Speaker not specified",
    ja: "スピーカーが指定されていません",
  },
  specifiesTheBusinessDomainEGFinanceMedicalEtcThatTheModelWillReference: {
    ko: "모델이 참고할 업무 도메인(예: finance, medical 등)을 지정합니다.",
    en: "Specifies the business domain (e.g. finance, medical, etc.) that the model will reference.",
    ja: "モデルが参照するビジネス ドメイン (金融、医療など) を指定します。",
  },
  specifiesTheMaximumNumberOfSpeakersWhenUsingSpeakerSeparation: {
    ko: "화자 분리 사용 시 최대 화자 수를 지정합니다.",
    en: "Specifies the maximum number of speakers when using speaker separation.",
    ja: "スピーカーセパレーションを使用する場合のスピーカーの最大数を指定します。",
  },
  specifyWordsToHighlightInRealTimeThroughTheKeywordsArray: {
    ko: "keywords 배열을 통해 실시간으로 강조할 단어를 지정합니다.",
    en: "Specify words to highlight in real time through the keywords array.",
    ja: "キーワード配列を通じてリアルタイムで強調表示する単語を指定します。",
  },
  sslCertificateVerification: {
    ko: "SSL 인증서 검증",
    en: "SSL certificate verification",
    ja: "SSL証明書の検証",
  },
  sslVerification: {
    ko: "SSL 검증",
    en: "SSL Verification",
    ja: "SSL検証",
  },
  startDate: {
    ko: "시작일",
    en: "Start Date",
    ja: "開始日",
  },
  startRealTimeTranscription: {
    ko: "실시간 전사 시작",
    en: "Start real-time transcription",
    ja: "リアルタイム文字起こしを開始する",
  },
  startRecordingAfterA3SecondCountdownAndCheckThePartialFinalResultsInRealTime: {
    ko: "3초 카운트다운 후 녹음을 시작하고, Partial/Final 결과를 실시간으로 확인하세요.",
    en: "Start recording after a 3-second countdown, and check the Partial/Final results in real time.",
    ja: "3 秒のカウントダウン後に録画を開始し、部分/最終結果をリアルタイムで確認します。",
  },
  startSession: {
    ko: "세션 시작",
    en: "Start session",
    ja: "セッションを開始する",
  },
  status: {
    ko: "상태",
    en: "Status",
    ja: "ステータス",
  },
  storagePermissions: {
    ko: "저장소 권한",
    en: "storage permissions",
    ja: "ストレージ権限",
  },
  storagePermissionsGranted: {
    ko: "저장소 권한이 허용되었습니다.",
    en: "Storage permissions granted.",
    ja: "ストレージ権限が付与されました。",
  },
  storagePermissionBrowserManaged: {
    ko: "브라우저가 저장소를 자동으로 관리하므로 별도 권한이 필요하지 않습니다.",
    en: "Your browser manages storage automatically, so no additional permission is required.",
    ja: "ブラウザがストレージを自動管理するため、追加の権限は必要ありません。",
  },
  streamTranscriptionSettings: {
    ko: "스트리밍 설정",
    en: "Streaming settings",
    ja: "ストリーム文字起こし設定",
  },
  followLive: {
    ko: "실시간 따라가기",
    en: "Follow live",
    ja: "ライブ追従",
  },
  followLiveHelper: {
    ko: "끄면 새 문장이 추가되어도 스크롤 위치를 유지합니다.",
    en: "Turn off to keep your current scroll position when new lines arrive.",
    ja: "オフにすると、新しい文が追加されても現在のスクロール位置を維持します。",
  },
  streamingError: {
    ko: "스트리밍 오류",
    en: "Streaming error",
    ja: "ストリーミングエラー",
  },
  streamingMessageParsingFailure: {
    ko: "스트리밍 메시지 파싱 실패",
    en: "Streaming message parsing failure",
    ja: "ストリーミングメッセージの解析失敗",
  },
  streamingSettingsJsonIsInvalid: {
    ko: "스트리밍 설정 JSON이 유효하지 않습니다.",
    en: "Streaming settings JSON is invalid.",
    ja: "ストリーミング設定の JSON が無効です。",
  },
  streamingSettingsJsonParsingFailure: {
    ko: "스트리밍 설정 JSON 파싱 실패",
    en: "Streaming settings JSON parsing failure",
    ja: "ストリーミング設定の JSON 解析エラー",
  },
  streamingStt: {
    ko: "스트리밍 STT",
    en: "Streaming STT",
    ja: "ストリーミングSTT",
  },
  streamingTranscriptionPresets: {
    ko: "스트리밍 전사 프리셋",
    en: "Streaming Transcription Presets",
    ja: "ストリーミング文字起こしプリセット",
  },
  tapToPausePressAndHoldFor3SecondsToEndTheSession: {
    ko: "탭하면 일시정지, 3초 길게 누르면 세션 종료",
    en: "Tap to pause, press and hold for 3 seconds to end the session.",
    ja: "タップして一時停止し、3 秒間長押ししてセッションを終了します。",
  },
  tapToResumeTranscription: {
    ko: "탭하여 전사를 재개합니다",
    en: "Tap to resume transcription",
    ja: "タップして文字起こしを再開します",
  },
  text: {
    ko: "원본",
    en: "Text",
    ja: "文章",
  },
  text2: {
    ko: "텍스트",
    en: "Text",
    ja: "文章",
  },
  thatSectionCannotBePlayed: {
    ko: "해당 구간을 재생할 수 없습니다.",
    en: "That section cannot be played.",
    ja: "そのセクションは再生できません。",
  },
  theAudioIsNotReadyYet: {
    ko: "오디오가 아직 준비되지 않았습니다.",
    en: "The audio is not ready yet.",
    ja: "オーディオはまだ準備ができていません。",
  },
  theAutoSaveIntervalMustBeAtLeast1Second: {
    ko: "자동 저장 주기는 1초 이상이어야 합니다.",
    en: "The auto-save interval must be at least 1 second.",
    ja: "自動保存間隔は 1 秒以上である必要があります。",
  },
  theCompletedTranscriptionIsDownloadedAsAJsonTextOrAudioFileAndUsedForExternalServicesOrDocuments: {
    ko: "완료된 전사는 JSON·텍스트·오디오 파일로 다운로드해 외부 서비스나 문서에 활용합니다.",
    en: "The completed transcription is downloaded as a JSON, text, or audio file and used for external services or documents.",
    ja: "完成した文字起こしは、JSON、テキスト、または音声ファイルとしてダウンロードされ、外部サービスやドキュメントに使用されます。",
  },
  theLastPresetCannotBeDeleted: {
    ko: "마지막 프리셋은 삭제할 수 없습니다.",
    en: "The last preset cannot be deleted.",
    ja: "最後のプリセットは削除できません。",
  },
  thePresetHasBeenDeleted: {
    ko: "프리셋을 삭제했습니다.",
    en: "The preset has been deleted.",
    ja: "プリセットが削除されました。",
  },
  thePresetHasBeenSaved: {
    ko: "프리셋을 저장했습니다.",
    en: "The preset has been saved.",
    ja: "プリセットが保存されました。",
  },
  theRtzrOnPremEndpointAndCredentialsThatThePythonApiWillInteractWithCanBeSavedAsPresetsAndAppliedWhenNeeded: {
    ko: "Python API가 연동할 RTZR/On-prem 엔드포인트와 자격증명을 프리셋으로 저장해 두고 필요할 때 적용할 수 있습니다.",
    en: "The RTZR/On-prem endpoint and credentials that the Python API will interact with can be saved as presets and applied when needed.",
    ja: "Python API が対話する RTZR/オンプレミスのエンドポイントと認証情報は、プリセットとして保存し、必要に応じて適用できます。",
  },
  theSavedAudioDataCannotBeFound: {
    ko: "저장된 오디오 데이터를 찾을 수 없습니다.",
    en: "The saved audio data cannot be found.",
    ja: "保存した音声データが見つかりません。",
  },
  theSelectedPresetCannotBeFound: {
    ko: "선택한 프리셋을 찾을 수 없습니다.",
    en: "The selected preset cannot be found.",
    ja: "選択したプリセットが見つかりません。",
  },
  theSessionHasBeenAborted: {
    ko: "세션이 중단되었습니다.",
    en: "The session has been aborted.",
    ja: "セッションは中止されました。",
  },
  theTranscriptionPresetHasBeenExported: {
    ko: "전사 프리셋을 내보냈습니다.",
    en: "The transcription preset has been exported.",
    ja: "文字起こしプリセットがエクスポートされました。",
  },
  theTranscriptionRecordHasBeenDeleted: {
    ko: "전사 기록을 삭제했습니다.",
    en: "The transcription record has been deleted.",
    ja: "転写記録は削除されました。",
  },
  thereAreNoFilesSelected: {
    ko: "선택된 파일이 없습니다.",
    en: "There are no files selected.",
    ja: "ファイルが選択されていません。",
  },
  thereAreNoPresets: {
    ko: "프리셋이 없습니다",
    en: "There are no presets",
    ja: "プリセットはありません",
  },
  thereAreNoRegisteredPresets: {
    ko: "등록된 프리셋이 없습니다.",
    en: "There are no registered presets.",
    ja: "登録されたプリセットはありません。",
  },
  thereAreNoSavedTranscriptionSectionsForFileTranscriptionTheSectionIsDisplayedAfterSynchronizingTheApiResults: {
    ko: "저장된 전사 구간이 없습니다. 파일 전사의 경우 API 결과 동기화 후 구간이 표시됩니다.",
    en: "There are no saved transcription sections. For file transcription, the section is displayed after synchronizing the API results.",
    ja: "保存された文字起こしセクションはありません。ファイル転写の場合、このセクションは API 結果の同期後に表示されます。",
  },
  thereAreNoTranscriptionPresetsToImport: {
    ko: "가져올 전사 프리셋이 없습니다.",
    en: "There are no transcription presets to import.",
    ja: "インポートする文字起こしプリセットはありません。",
  },
  thereAreNoTranscriptionRecordsMatchingTheCriteria: {
    ko: "조건에 맞는 전사 기록이 없습니다.",
    en: "There are no transcription records matching the criteria.",
    ja: "条件に一致する転写レコードはありません。",
  },
  thereAreNoTranscriptionRecordsYet: {
    ko: "아직 전사 기록이 없습니다.",
    en: "There are no transcription records yet.",
    ja: "転写記録はまだありません。",
  },
  thereAreNoTranscriptionResultsToDownload: {
    ko: "다운로드할 전사 결과가 없습니다.",
    en: "There are no transcription results to download.",
    ja: "ダウンロードできる文字起こし結果はありません。",
  },
  thereIsRealTimeTranscriptionAlreadyUnderway: {
    ko: "이미 진행 중인 실시간 전사가 있습니다.",
    en: "There is real-time transcription already underway.",
    ja: "リアルタイムの文字起こしはすでに進行中です。",
  },
  thisIsNotAValidBackendPresetJson: {
    ko: "유효한 백엔드 프리셋 JSON이 아닙니다.",
    en: "This is not a valid backend preset JSON.",
    ja: "これは有効なバックエンド プリセット JSON ではありません。",
  },
  thisIsNotAValidTranscriptionSettingsJson: {
    ko: "유효한 전사 설정 JSON이 아닙니다.",
    en: "This is not a valid transcription settings JSON.",
    ja: "これは有効な文字起こし設定 JSON ではありません。",
  },
  thisIsNotAnInstallableEnvironment: {
    ko: "설치 가능한 환경이 아닙니다.",
    en: "This is not an installable environment.",
    ja: "インストール可能な環境ではありません。",
  },
  thisPermissionIsRequiredForRealTimeSessionRecording: {
    ko: "실시간 세션 녹음을 위해 필요한 권한입니다.",
    en: "This permission is required for real-time session recording.",
    ja: "この権限は、リアルタイムセッションの記録に必要です。",
  },
  title: {
    ko: "제목",
    en: "Title",
    ja: "タイトル",
  },
  titleSearch: {
    ko: "제목 검색",
    en: "Title Search",
    ja: "タイトル検索",
  },
  toTranscriptionList: {
    ko: "전사 목록으로",
    en: "To transcription list",
    ja: "文字起こし一覧へ",
  },
  transcriptionList: {
    ko: "전사 목록",
    en: "Transcription List",
    ja: "転写リスト",
  },
  transcriptionListScreen: {
    ko: "전사 목록 화면",
    en: "Transcription list screen",
    ja: "文字起こし一覧画面",
  },
  transcriptionResultScreen: {
    ko: "전사 결과 화면",
    en: "Transcription result screen",
    ja: "文字起こし結果画面",
  },
  transcriptionStateSynchronizationFailure: {
    ko: "전사 상태 동기화 실패",
    en: "Transcription state synchronization failure",
    ja: "転写状態の同期失敗",
  },
  twoWarriorPresetsHaveBeenLoaded: {
    ko: "개의 전사 프리셋을 불러왔습니다.",
    en: "Two warrior presets have been loaded.",
    ja: "2 つの戦士プリセットがロードされました。",
  },
  type: {
    ko: "종류",
    en: "Type",
    ja: "タイプ",
  },
  unableToConfirm: {
    ko: "확인 불가",
    en: "Unable to confirm",
    ja: "確認できません",
  },
  unableToParseSettingsJson: {
    ko: "설정 JSON을 파싱할 수 없습니다.",
    en: "Unable to parse settings JSON.",
    ja: "設定の JSON を解析できません。",
  },
  unableToRequestMicrophonePermissionPleaseCheckYourBrowserSettings: {
    ko: "마이크 권한을 요청할 수 없습니다. 브라우저 설정을 확인해 주세요.",
    en: "Unable to request microphone permission. Please check your browser settings.",
    ja: "マイクの許可を要求できません。ブラウザの設定を確認してください。",
  },
  unableToRequestStoragePermissionPleaseCheckYourBrowserSettings: {
    ko: "저장소 권한을 요청할 수 없습니다. 브라우저 설정을 확인해 주세요.",
    en: "Unable to request storage permission. Please check your browser settings.",
    ja: "ストレージ許可を要求できません。ブラウザの設定を確認してください。",
  },
  openBrowserSiteSettingsAndAllowPermissionThenRetry: {
    ko: "브라우저 주소창의 자물쇠 아이콘 > 사이트 설정에서 {{permission}} 권한을 허용한 뒤 다시 시도해 주세요.",
    en: "In your browser, open the lock icon in the address bar > Site settings, allow {{permission}}, then retry.",
    ja: "ブラウザのアドレスバーの鍵アイコン > サイト設定で {{permission}} を許可してから、もう一度お試しください。",
  },
  useClientCredentials: {
    ko: "클라이언트 자격증명 사용",
    en: "Use client credentials",
    ja: "クライアント認証情報を使用する",
  },
  useDefaultEndpointStoredOnServer: {
    ko: "서버에 저장된 기본 엔드포인트 사용",
    en: "Use default endpoint stored on server",
    ja: "サーバーに保存されているデフォルトのエンドポイントを使用する",
  },
  useParagraphSeparation: {
    ko: "문단 분리 사용",
    en: "Use paragraph separation",
    ja: "段落区切りを使用する",
  },
  useSpeakerSeparation: {
    ko: "화자 분리 사용",
    en: "Use speaker separation",
    ja: "スピーカー分離を使用する",
  },
  useTheTopFilterToCombineTitleModelDateAndContentToViewOnlyTheRecordsYouWant: {
    ko: "상단 필터로 제목·모델·날짜·내용을 조합하여 원하는 기록만 조회합니다.",
    en: "Use the top filter to combine title, model, date, and content to view only the records you want.",
    ja: "上部のフィルターを使用してタイトル、モデル、日付、コンテンツを組み合わせて、必要なレコードのみを表示します。",
  },
  advancedFiltersApplied: {
    ko: "고급 필터 적용됨",
    en: "Advanced filters applied",
    ja: "詳細フィルター適用中",
  },
  viewAdvancedSettings: {
    ko: "고급 설정 보기",
    en: "View advanced settings",
    ja: "詳細設定を表示する",
  },
  viewSettings: {
    ko: "설정 보기",
    en: "View settings",
    ja: "設定を表示する",
  },
  voiceRecordList: {
    ko: "음성기록 목록",
    en: "Voice record list",
    ja: "ボイスレコードリスト",
  },
  sessions: {
    ko: "세션",
    en: "Sessions",
    ja: "セッション",
  },
  session: {
    ko: "세션",
    en: "Session",
    ja: "セッション",
  },
  realtimeTranslateTitle: {
    ko: "실시간 번역 워크스페이스",
    en: "Real-time Translate",
    ja: "リアルタイム翻訳ワークスペース",
  },
  realtimeTranslateDescription: {
    ko: "원문 turn은 항상 유지하고, 번역 결과는 별도 variant로 붙이는 독립 mode shell입니다.",
    en: "An additive mode shell where source turns stay primary and translated variants attach separately.",
    ja: "原文ターンを主に保ち、翻訳結果を別 variant として追加する独立モードシェルです。",
  },
  openCaptureWorkspace: {
    ko: "캡처 워크스페이스 열기",
    en: "Open capture workspace",
    ja: "キャプチャワークスペースを開く",
  },
  translationShellHelper: {
    ko: "final turn 번역만 먼저 붙여도 source transcript는 그대로 유지됩니다. provider failure는 이 워크스페이스 안에만 격리됩니다.",
    en: "The first slice attaches only final-turn translations while keeping the source transcript authoritative. Provider failures stay isolated inside this workspace.",
    ja: "最初のスライスでは final turn 翻訳だけを追加し、source transcript はそのまま維持します。provider failure はこのワークスペース内にだけ隔離されます。",
  },
  translationRoute: {
    ko: "번역 경로",
    en: "Translation route",
    ja: "翻訳ルート",
  },
  autoDetectToEnglish: {
    ko: "자동 감지 -> 영어",
    en: "Auto-detect -> English",
    ja: "自動検出 -> 英語",
  },
  translatorPhaseOne: {
    ko: "1단계",
    en: "Phase 1",
    ja: "第1段階",
  },
  translatorPhaseTwo: {
    ko: "2단계",
    en: "Phase 2",
    ja: "第2段階",
  },
  finalTurnsOnly: {
    ko: "최종 turn 번역",
    en: "Final turns only",
    ja: "最終ターンのみ",
  },
  streamingPartialTranslation: {
    ko: "부분 turn 스트리밍 번역",
    en: "Streaming partial translation",
    ja: "部分ターンのストリーミング翻訳",
  },
  sourceTranscript: {
    ko: "원문 전사",
    en: "Source transcript",
    ja: "原文文字起こし",
  },
  translatedOutput: {
    ko: "번역 출력",
    en: "Translated output",
    ja: "翻訳出力",
  },
  capturePrimary: {
    ko: "캡처 우선",
    en: "Capture primary",
    ja: "キャプチャ優先",
  },
  sourceTranscriptPrimaryHelper: {
    ko: "번역 지연이나 실패와 무관하게 원문 turn은 계속 누적됩니다.",
    en: "Capture stays authoritative. Source turns keep accumulating even when translation is delayed or unavailable.",
    ja: "翻訳の遅延や失敗に関係なく、原文ターンは継続して蓄積されます。",
  },
  translationSourceEmptyState: {
    ko: "provider가 연결되면 이 영역에 source turn이 순서대로 쌓입니다.",
    en: "Source turns will stream here in order once the provider is enabled.",
    ja: "provider が有効になると、ここに source turn が順番に流れます。",
  },
  translationPending: {
    ko: "번역 대기",
    en: "Translation pending",
    ja: "翻訳待ち",
  },
  translationVariantFinal: {
    ko: "최종 번역",
    en: "Final translation",
    ja: "最終翻訳",
  },
  translationVariantPartial: {
    ko: "부분 번역",
    en: "Partial translation",
    ja: "部分翻訳",
  },
  sourceOnlyFallback: {
    ko: "번역이 준비되지 않아도 source transcript는 계속 사용할 수 있습니다.",
    en: "Source-only fallback keeps the session usable even when translation is not ready.",
    ja: "翻訳が未準備でも source transcript は継続して利用できます。",
  },
  translationUnavailable: {
    ko: "번역 provider 미연결",
    en: "Translation provider unavailable",
    ja: "翻訳 provider 未接続",
  },
  translationUnavailableHelper: {
    ko: "phase 1은 final turn 번역부터 시작하고, provider capability가 준비되면 이 패널에 translated variant를 붙입니다.",
    en: "Phase 1 starts with final-turn translation. When provider capability is available, translated variants will attach here without changing the capture contract.",
    ja: "第1段階は最終ターン翻訳から始め、provider capability が整えばこのパネルに translated variant を追加します。",
  },
  translationProviderEnabledHelper: {
    ko: "provider capability가 열리면 source turn 아래에 translated variant를 붙이는 구조는 그대로 유지됩니다.",
    en: "Provider capability is enabled. The shell will keep attaching translated variants under the source turns without changing the capture-first layout.",
    ja: "provider capability が有効になっても、capture-first layout は維持したまま source turn の下に translated variant を追加します。",
  },
  translationVariantPendingHelper: {
    ko: "source turn은 먼저 유지되고, translated variant는 provider 준비 상태에 따라 같은 그룹 아래에 늦게 붙습니다.",
    en: "The source turn stays visible first, and the translated variant attaches later under the same group when the provider is ready.",
    ja: "source turn は先に表示され、translated variant は provider の準備が整うと同じグループの下にあとから追加されます。",
  },
  translationVariantFailedHelper: {
    ko: "번역 요청이 실패해도 원문 transcript는 그대로 유지됩니다. 실패한 turn만 다시 요청하면 됩니다.",
    en: "A failed translation request does not affect the source transcript. Retry only the failed turns.",
    ja: "翻訳リクエストが失敗しても source transcript には影響しません。失敗した turn だけ再試行できます。",
  },
  translationFinalSourceHelper: {
    ko: "확정된 source turn이 먼저 쌓이고, final translation binding이 준비되면 이 turn 아래에 번역 variant가 붙습니다.",
    en: "Final source turns accumulate first. When the final translation binding is ready, translated variants attach under those turns.",
    ja: "確定した source turn が先に蓄積され、final translation binding が準備되るとその turn の下に翻訳 variant が付きます。",
  },
  translationPartialSourceHelper: {
    ko: "부분 source turn은 먼저 보이고, 실시간 partial translation은 provider capability가 준비되면 additive layer로 붙습니다.",
    en: "Partial source turns stay visible first. Streaming partial translation attaches later as an additive layer when the provider capability is ready.",
    ja: "部分 source turn は先に表示され、streaming partial translation は provider capability が準備できると追加レイヤーとして付きます。",
  },
  translationWorkspaceRail: {
    ko: "번역 워크스페이스",
    en: "Translation workspace",
    ja: "翻訳ワークスペース",
  },
  translationFinalVariantLane: {
    ko: "최종 turn 번역 레인",
    en: "Final-turn translation lane",
    ja: "最終ターン翻訳レーン",
  },
  translationPartialVariantLane: {
    ko: "부분 turn 번역 레인",
    en: "Partial-turn translation lane",
    ja: "部分ターン翻訳レーン",
  },
  translationTargetLanguage: {
    ko: "대상 언어",
    en: "Target language",
    ja: "対象言語",
  },
  translationRetryFailed: {
    ko: "실패 turn 다시 번역",
    en: "Retry failed turns",
    ja: "失敗した turn を再翻訳",
  },
  translationNoRealtimeSession: {
    ko: "아직 realtime 세션이 없어 source turn을 붙일 수 없습니다. 먼저 캡처를 시작한 뒤 이 화면으로 돌아오세요.",
    en: "There is no realtime session yet, so no source turns can attach here. Start capture first, then return to this workspace.",
    ja: "まだ realtime session がないため、ここに source turn を表示できません。先に capture を始めてからこのワークスペースに戻ってください。",
  },
  translationBindingNotReady: {
    ko: "translate.turn_final binding이 아직 준비되지 않았습니다.",
    en: "The translate.turn_final binding is not ready yet.",
    ja: "translate.turn_final binding がまだ準備できていません。",
  },
  translationProviderMisconfigured: {
    ko: "번역 provider 설정이나 credential이 아직 준비되지 않았습니다.",
    en: "The translation provider configuration or credentials are not ready yet.",
    ja: "翻訳 provider の設定または credential がまだ準備できていません。",
  },
  translationProviderRequestFailed: {
    ko: "번역 provider 요청에 실패했습니다.",
    en: "The translation provider request failed.",
    ja: "翻訳 provider リクエストに失敗しました。",
  },
  translationProviderResponseInvalid: {
    ko: "번역 provider 응답을 해석할 수 없습니다.",
    en: "The translation provider response could not be parsed.",
    ja: "翻訳 provider の応答を解釈できませんでした。",
  },
  translationTurnTextEmpty: {
    ko: "비어 있지 않은 source turn이 있어야 번역을 요청할 수 있습니다.",
    en: "A non-empty source turn is required before translation can run.",
    ja: "翻訳を実行するには空でない source turn が必要です。",
  },
  translationTargetLanguageRequired: {
    ko: "대상 언어를 먼저 선택해야 합니다.",
    en: "Select a target language before requesting translation.",
    ja: "翻訳をリクエストする前に対象言語を選択してください。",
  },
  waiting: {
    ko: "대기 중",
    en: "Waiting",
    ja: "待っている",
  },
  warriorFailure: {
    ko: "전사 실패",
    en: "warrior failure",
    ja: "戦士の失敗",
  },
  weHaveOrganizedItSoThatEvenFirstTimeUsersCanFollowItStepByStep: {
    ko: "처음 이용하는 분도 단계별로 따라 할 수 있도록 정리했습니다.",
    en: "We have organized it so that even first-time users can follow it step by step.",
    ja: "初めての方でもステップバイステップで理解できるようにまとめました。",
  },
  weQuicklyHandleBugReportsFeatureSuggestionsAndAccountInquiries: {
    ko: "버그 제보, 기능 제안, 계정 문의 등을 빠르게 처리해 드립니다.",
    en: "We quickly handle bug reports, feature suggestions, and account inquiries.",
    ja: "バグレポート、機能の提案、アカウントの問い合わせに迅速に対応します。",
  },
  whenUsingParagraphBreaksSpecifyTheMaximumNumberOfCharactersAllowedInOneParagraph: {
    ko: "문단 분리 사용 시 한 문단에 허용할 최대 문자 수를 지정합니다.",
    en: "When using paragraph breaks, specify the maximum number of characters allowed in one paragraph.",
    ja: "段落区切りを使用する場合は、1 つの段落で許可される最大文字数を指定します。",
  },
  whenYouStartASessionRecognizedSentencesWillAppearInThisAreaInOrder: {
    ko: "세션을 시작하면 인식된 문장이 이 영역에 순서대로 표시됩니다.",
    en: "When you start a session, recognized sentences will appear in this area in order.",
    ja: "セッションを開始すると、認識された文章がこの領域に順番に表示されます。",
  },
  showWordDetails: {
    ko: "단어 정보 표시",
    en: "Show word details",
    ja: "単語の詳細を表示",
  },
  word: {
    ko: "단어 {{index}}",
    en: "word {{index}}",
    ja: "ワード {{index}}",
  },
  wordByWordCorrection: {
    ko: "단어별 교정",
    en: "Word-by-word correction",
    ja: "単語ごとの修正",
  },
  wordTimestamp: {
    ko: "워드 타임스탬프",
    en: "word timestamp",
    ja: "ワードタイムスタンプ",
  },
  wouldYouLikeToDeleteYourTranscriptionHistory: {
    ko: "전사 기록을 삭제하시겠습니까?",
    en: "Would you like to delete your transcription history?",
    ja: "文字起こし履歴を削除しますか?",
  },
  youCanAddEditPresetsOnTheSettingsPage: {
    ko: "프리셋 추가/수정은 설정 페이지에서 진행할 수 있습니다.",
    en: "You can add/edit presets on the settings page.",
    ja: "設定ページでプリセットを追加/編集できます。",
  },
  youCanAlsoPassGrpcRuntimestreamconfigValuesToWebsocketSessions: {
    ko: "gRPC RuntimeStreamConfig 값을 WebSocket 세션에도 전달할 수 있습니다.",
    en: "You can also pass gRPC RuntimeStreamConfig values ​​to WebSocket sessions.",
    ja: "gRPC RuntimeStreamConfig 値を WebSocket セッションに渡すこともできます。",
  },
  youCanCancelWithEscAndSaveWithCtrlEnter: {
    ko: "Esc로 취소, ⌘/Ctrl + Enter로 저장할 수 있습니다.",
    en: "You can cancel with Esc and save with ⌘/Ctrl + Enter.",
    ja: "Escでキャンセル、⌘/Ctrl+Enterで保存できます。",
  },
  youCanCheckTheStatusOfMicrophoneAndStoragePermissionsAndReRequestThem: {
    ko: "마이크 및 저장소 권한 상태를 확인하고 재요청할 수 있습니다.",
    en: "You can check the status of microphone and storage permissions and re-request them.",
    ja: "マイクとストレージのアクセス許可のステータスを確認し、それらを再要求できます。",
  },
  youCanCheckWhetherYouHaveMicrophoneAndFileAccessPermissionsAndQuicklyReRequestIt: {
    ko: "마이크 및 파일 접근 권한 여부를 확인하고 빠르게 재요청할 수 있습니다.",
    en: "You can check whether you have microphone and file access permissions and quickly re-request it.",
    ja: "マイクとファイルへのアクセス許可があるかどうかを確認し、すぐに再リクエストできます。",
  },
  youCanCleanUpYourLocallyStoredTranscriptionRecordsWithTheDeleteIconOnTheRight: {
    ko: "오른쪽 삭제 아이콘으로 로컬에 저장된 전사 기록을 정리할 수 있습니다.",
    en: "You can clean up your locally stored transcription records with the delete icon on the right.",
    ja: "右側の削除アイコンを使用して、ローカルに保存された文字起こしレコードをクリーンアップできます。",
  },
  youCanCreateFrequentlyUsedOptionsAsPresetsOnTheSettingsScreenAndSelectThemAtAnyTime: {
    ko: "설정 화면에서 자주 사용하는 옵션을 프리셋으로 만들어 언제든 선택할 수 있습니다.",
    en: "You can create frequently used options as presets on the settings screen and select them at any time.",
    ja: "よく使うオプションを設定画面にプリセットとして作成しておき、いつでも選択できます。",
  },
  youCanDirectlyChangeStreamingOptionsSuchAsModelAndSampleRateInTheSettingsPanelOnTheLeft: {
    ko: "좌측 설정 패널에서 모델, 샘플레이트 등 스트리밍 옵션을 바로 변경할 수 있습니다.",
    en: "You can directly change streaming options such as model and sample rate in the settings panel on the left.",
    ja: "左側の設定パネルでモデルやサンプルレートなどのストリーミングオプションを直接変更できます。",
  },
  youCanDownloadJsonTextAudioFilesOrDeleteRecordsUsingTheTopButton: {
    ko: "상단 버튼으로 JSON/텍스트/오디오 파일을 내려받거나 기록을 삭제할 수 있습니다.",
    en: "You can download JSON/text/audio files or delete records using the top button.",
    ja: "上部のボタンを使用して、JSON/テキスト/音声ファイルをダウンロードしたり、レコードを削除したりできます。",
  },
  youCanInstantlySelectSettingsToUseInYourLiveSessionOrFineTuneThemInJson: {
    ko: "실시간 세션에서 사용할 설정을 즉시 선택하거나 JSON으로 세부 조정할 수 있습니다.",
    en: "You can instantly select settings to use in your live session or fine-tune them in JSON.",
    ja: "ライブ セッションで使用する設定を即座に選択したり、JSON で微調整したりできます。",
  },
  youCanSortYourFileTranscriptionsAndRealTimeTranscriptionRecordsAtAGlanceAndAdjustFilters: {
    ko: "파일 전사와 실시간 전사 기록을 한눈에 정렬하고 필터를 조정할 수 있습니다.",
    en: "You can sort your file transcriptions and real-time transcription records at a glance and adjust filters.",
    ja: "ファイルの文字起こしとリアルタイムの文字起こしレコードを一目で並べ替えたり、フィルターを調整したりできます。",
  },
  youCanUseQuotationMarksExcludeOrOperator: {
    ko: "따옴표(\"\"), -제외, OR 연산자를 사용할 수 있습니다.",
    en: "You can use quotation marks (\"\"), -exclusion, and the OR operator.",
    ja: "引用符 (\"\")、- exclusion、および OR 演算子を使用できます。",
  },
  youHaveSavedYourBackendPreset: {
    ko: "백엔드 프리셋을 저장했습니다.",
    en: "You have saved your backend preset.",
    ja: "バックエンドのプリセットが保存されました。",
  },
  youWillNeedAPresetNameAndApiBaseUrl: {
    ko: "프리셋 이름과 API Base URL이 필요합니다.",
    en: "You will need a preset name and API Base URL.",
    ja: "プリセット名と API ベース URL が必要になります。",
  },
  yourBrowserDoesNotSupportTheAudioTag: {
    ko: "브라우저에서 오디오 태그를 지원하지 않습니다.",
    en: "Your browser does not support the audio tag.",
    ja: "お使いのブラウザはaudioタグをサポートしていません。",
  },
  yourCorrectionsHaveBeenSaved: {
    ko: "교정 내용을 저장했습니다.",
    en: "Your corrections have been saved.",
    ja: "修正内容が保存されました。",
  },
  yourMicrophoneDeviceCannotBeUsed: {
    ko: "마이크 장치를 사용할 수 없습니다.",
    en: "Your microphone device cannot be used.",
    ja: "マイクデバイスは使用できません。",
  },
  yourSelectionWillBeAppliedToTheServerImmediately: {
    ko: "선택 즉시 서버에 적용됩니다.",
    en: "Your selection will be applied to the server immediately.",
    ja: "選択内容はすぐにサーバーに適用されます。",
  },
  yourStreamingConnectionHasEnded: {
    ko: "스트리밍 연결이 종료되었습니다.",
    en: "Your streaming connection has ended.",
    ja: "ストリーミング接続が終了しました。",
  },
  streamingConnectionRecovered: {
    ko: "스트리밍 연결이 복구되었습니다.",
    en: "Streaming connection has recovered.",
    ja: "ストリーミング接続が復旧しました。",
  },
  sessionQualityDegraded: {
    ko: "품질 저하",
    en: "Degraded",
    ja: "品質低下",
  },
  someBufferedAudioCouldNotBeReplayedResultsMayBeIncomplete: {
    ko: "일부 버퍼링된 오디오를 다시 보내지 못했습니다. 결과가 일부 누락될 수 있습니다.",
    en: "Some buffered audio could not be replayed. Results may be incomplete.",
    ja: "一部のバッファ済み音声を再送できませんでした。結果が一部欠落している可能性があります。",
  },
  yourStreamingSessionHasEnded: {
    ko: "스트리밍 세션이 종료되었습니다.",
    en: "Your streaming session has ended.",
    ja: "ストリーミング セッションが終了しました。",
  },
  yourTranscriptionRequestHasBeenSent: {
    ko: "전사 요청을 전송했습니다.",
    en: "Your transcription request has been sent.",
    ja: "文字起こしリクエストが送信されました。",
  },
  sharePageTitle: {
    ko: "전사 결과 공유",
    en: "Transcription share view",
    ja: "文字起こし共有ビュー",
  },
  sharePageSubtitle: {
    ko: "링크를 열면 앱 접속 없이 결과를 확인할 수 있습니다.",
    en: "Open the link to view the transcription without visiting the app.",
    ja: "リンクを開くとアプリにアクセスせずに結果を確認できます。",
  },
  sharePayloadMissing: {
    ko: "공유 링크에 전사 데이터가 포함되어 있지 않습니다.",
    en: "No transcription data was included in the share link.",
    ja: "共有リンクに文字起こしデータが含まれていません。",
  },
  sharePayloadInvalid: {
    ko: "공유 링크를 읽을 수 없거나 손상되었습니다.",
    en: "The share link is invalid or corrupted.",
    ja: "共有リンクが無効か破損しています。",
  },
  sharePasswordPrompt: {
    ko: "암호를 입력하여 전사 결과를 확인하세요.",
    en: "Enter the password to view the transcription.",
    ja: "文字起こしを表示するにはパスワードを入力してください。",
  },
  sharePasswordPlaceholder: {
    ko: "암호 (선택)",
    en: "Password (optional)",
    ja: "パスワード（任意）",
  },
  shareUnlock: {
    ko: "열기",
    en: "Unlock",
    ja: "開く",
  },
  shareAudioIncluded: {
    ko: "오디오가 포함되어 있습니다.",
    en: "Audio is included in this share.",
    ja: "音声が含まれています。",
  },
  shareRemoteAudioAvailable: {
    ko: "원본 오디오를 아래 버튼에서 재생합니다.",
    en: "You can play the original audio via the button below.",
    ja: "以下のボタンで元の音声を再生できます。",
  },
  sharePlayRemoteAudio: {
    ko: "원본 오디오 재생",
    en: "Play original audio",
    ja: "元の音声を再生",
  },
  shareAudioUnavailable: {
    ko: "오디오가 포함되지 않은 공유입니다.",
    en: "This share does not include audio.",
    ja: "この共有には音声が含まれていません。",
  },
  shareAggregatedText: {
    ko: "전체 전사",
    en: "Aggregated transcript",
    ja: "集約された文字起こし",
  },
  shareSegmentsTitle: {
    ko: "구간",
    en: "Segments",
    ja: "セグメント",
  },
  shareSegmentsSubTitle: {
    ko: "{{count}}개 구간",
    en: "{{count}} segments",
    ja: "{{count}}セグメント",
  },
  shareNoSegments: {
    ko: "저장된 구간이 없습니다.",
    en: "There are no saved segments.",
    ja: "保存されたセグメントはありません。",
  },
  shareSegmentTextEmpty: {
    ko: "내용이 없습니다.",
    en: "No text available.",
    ja: "テキストがありません。",
  },
  untitledTranscription: {
    ko: "제목 없음",
    en: "Untitled transcription",
    ja: "タイトルなし",
  },
  shareSectionTitle: {
    ko: "공유 링크 생성",
    en: "Share link",
    ja: "共有リンク",
  },
  shareIncludeAudioLabel: {
    ko: "이 링크에 오디오 포함",
    en: "Include audio in this link",
    ja: "このリンクに音声を含める",
  },
  shareIncludeAudioHelper: {
    ko: "오디오를 포함하면 URL이 길어질 수 있습니다.",
    en: "Including audio makes the URL longer.",
    ja: "音声を含めるとURLが長くなります。",
  },
  shareIncludeAudioUnavailable: {
    ko: "현재 오디오가 없어 포함할 수 없습니다.",
    en: "Audio is not available right now.",
    ja: "現在音声は利用できません。",
  },
  shareButtonLabel: {
    ko: "공유하기",
    en: "Share",
    ja: "共有",
  },
  shareTranscoding: {
    ko: "오디오 변환 중...",
    en: "Transcoding audio...",
    ja: "音声を変換中…",
  },
  sharePlaySegment: {
    ko: "구간 재생",
    en: "Play segment",
    ja: "セグメントを再生",
  },
  shareAudioDecodingFailed: {
    ko: "공유된 오디오를 복호화할 수 없습니다.",
    en: "Unable to decode the shared audio.",
    ja: "共有された音声を復号できません。",
  },
  sharePasswordLabel: {
    ko: "공유 암호",
    en: "Share password",
    ja: "共有パスワード",
  },
  sharePasswordHelper: {
    ko: "선택 사항입니다. 입력하면 링크가 암호화됩니다.",
    en: "Optional. Entering a password encrypts the link.",
    ja: "任意。パスワードを入力するとリンクが暗号化されます。",
  },
  shareGenerating: {
    ko: "링크 생성 중...",
    en: "Generating link...",
    ja: "リンクを生成中...",
  },
  shareCreateLinkButton: {
    ko: "공유 링크 만들기",
    en: "Create share link",
    ja: "共有リンクを作成",
  },
  shareDownloadHtmlButton: {
    ko: "HTML 다운로드",
    en: "Download HTML",
    ja: "HTMLをダウンロード",
  },
  shareHtmlGenerating: {
    ko: "HTML 생성 중...",
    en: "Building HTML...",
    ja: "HTMLを生成中...",
  },
  shareHtmlIncludesAudio: {
    ko: "HTML 다운로드에는 오디오가 항상 포함됩니다.",
    en: "The HTML download always includes audio.",
    ja: "HTMLダウンロードには常に音声が含まれます。",
  },
  shareCopyLink: {
    ko: "링크 복사",
    en: "Copy link",
    ja: "リンクをコピー",
  },
  shareLinkCreated: {
    ko: "공유 링크를 생성했습니다.",
    en: "Share link created.",
    ja: "共有リンクが生成されました。",
  },
  shareGenerateFailed: {
    ko: "공유 링크 생성에 실패했습니다.",
    en: "Failed to generate share link.",
    ja: "共有リンクの生成に失敗しました。",
  },
  shareAudioIncludeFailed: {
    ko: "오디오를 가져올 수 없어 포함하지 않습니다.",
    en: "Unable to fetch audio to include in the share.",
    ja: "音声を取得できず、共有に含めることができません。",
  },
  shareLinkCopied: {
    ko: "링크가 복사되었습니다.",
    en: "Link copied.",
    ja: "リンクがコピーされました。",
  },
  shareLinkCopyFailed: {
    ko: "자동 복사에 실패했습니다. 수동으로 복사하세요.",
    en: "Automatic copy failed; please copy manually.",
    ja: "自動コピーに失敗しました。手動でコピーしてください。",
  },
  shareHtmlDownloaded: {
    ko: "오프라인 HTML을 저장했습니다.",
    en: "Offline HTML saved.",
    ja: "オフラインHTMLを保存しました。",
  },
  shareHtmlDownloadFailed: {
    ko: "HTML 파일 생성에 실패했습니다.",
    en: "Failed to build the HTML file.",
    ja: "HTMLファイルの生成に失敗しました。",
  },
  shareHtmlAudioRequired: {
    ko: "오디오가 없어 HTML에 포함할 수 없습니다.",
    en: "Audio is required to build the HTML file.",
    ja: "HTMLファイルの作成には音声が必要です。",
  },
  shareHtmlAssetMissing: {
    ko: "공유 HTML 번들을 가져올 수 없습니다.",
    en: "Unable to load the share HTML bundle.",
    ja: "共有HTMLバンドルを読み込めません。",
  },
  loading: {
    ko: "불러오는 중",
    en: "Loading",
    ja: "読み込み中",
  },
  cloudSync: {
    ko: "클라우드 동기화",
    en: "Cloud sync",
    ja: "クラウド同期",
  },
  cloudSyncEnabled: {
    ko: "클라우드 동기화를 활성화했습니다.",
    en: "Cloud sync enabled.",
    ja: "クラウド同期を有効にしました。",
  },
  cloudSyncDisabled: {
    ko: "클라우드 동기화를 비활성화했습니다.",
    en: "Cloud sync disabled.",
    ja: "クラウド同期を無効にしました。",
  },
  enableCloudSync: {
    ko: "클라우드 동기화 활성화",
    en: "Enable cloud sync",
    ja: "クラウド同期を有効化",
  },
  disableCloudSync: {
    ko: "클라우드 동기화 비활성화",
    en: "Disable cloud sync",
    ja: "クラウド同期を無効化",
  },
  enabled: {
    ko: "활성화",
    en: "Enabled",
    ja: "有効",
  },
  disabled: {
    ko: "비활성화",
    en: "Disabled",
    ja: "無効",
  },
  lastSyncedAt: {
    ko: "마지막 동기화",
    en: "Last synced",
    ja: "最終同期",
  },
  syncRetryAt: {
    ko: "동기화 재시도 예정",
    en: "Next sync retry",
    ja: "同期再試行予定",
  },
  syncError: {
    ko: "동기화 오류",
    en: "Sync error",
    ja: "同期エラー",
  },
  download: {
    ko: "다운로드",
    en: "Download",
    ja: "ダウンロード",
  },
  downloading: {
    ko: "다운로드 중",
    en: "Downloading",
    ja: "ダウンロード中",
  },
  downloaded: {
    ko: "다운로드 완료",
    en: "Downloaded",
    ja: "ダウンロード済み",
  },
  notDownloaded: {
    ko: "미다운로드",
    en: "Not downloaded",
    ja: "未ダウンロード",
  },
  downloadStarted: {
    ko: "다운로드를 시작했습니다.",
    en: "Download started.",
    ja: "ダウンロードを開始しました。",
  },
  downloadCompleted: {
    ko: "다운로드가 완료되었습니다.",
    en: "Download completed.",
    ja: "ダウンロードが完了しました。",
  },
  downloadFailed: {
    ko: "다운로드에 실패했습니다.",
    en: "Download failed.",
    ja: "ダウンロードに失敗しました。",
  },
  googleDriveNotConnected: {
    ko: "Google Drive에 먼저 연결해 주세요.",
    en: "Please connect to Google Drive first.",
    ja: "まず Google Drive に接続してください。",
  },
  connectGoogleDrive: {
    ko: "Drive 연결",
    en: "Connect Drive",
    ja: "Drive に接続",
  },
  disconnectGoogleDrive: {
    ko: "연결 해제",
    en: "Disconnect",
    ja: "切断",
  },
  googleDriveConnected: {
    ko: "Drive 연결됨",
    en: "Drive connected",
    ja: "Drive 接続済み",
  },
  googleDriveConnectedWithEmail: {
    ko: "Drive 연결됨 ({{email}})",
    en: "Drive connected ({{email}})",
    ja: "Drive 接続済み（{{email}}）",
  },
  googleDriveSyncTooltip: {
    ko: "Google Drive에 연결하면 전사 기록을 백업/동기화하고, 다른 기기에서 만든 기록을 다운로드할 수 있습니다. Drive에 'Malsori Data' 폴더가 생성됩니다.",
    en: "Connect Google Drive to back up/sync transcription records and download records created on other devices. A 'Malsori Data' folder will be created in your Drive.",
    ja: "Google Drive に接続すると文字起こし記録をバックアップ/同期し、他のデバイスで作成した記録をダウンロードできます。Drive に「Malsori Data」フォルダーが作成されます。",
  },
  googleDriveAccountConflictDetected: {
    ko: "계정 충돌 감지",
    en: "Account conflict detected",
    ja: "アカウントの競合を検出しました",
  },
  googleDriveAccountConflictDetectedDescription: {
    ko: "이전에 사용한 Google 계정과 다른 계정에 연결하려고 합니다. 어떻게 진행할까요?",
    en: "You are connecting a different Google account than the one previously used. How would you like to proceed?",
    ja: "以前に使用した Google アカウントとは別のアカウントに接続しようとしています。どのように進めますか？",
  },
  googleDriveConflictMergeButtonLabel: {
    ko: "병합 (로컬 유지 + 새 계정에 업로드)",
    en: "Merge (Keep local, upload to new account)",
    ja: "マージ（ローカルを保持して新しいアカウントへアップロード）",
  },
  googleDriveConflictMergeHelper: {
    ko: "현재 로컬 기록을 유지하고, 새 계정의 Drive로 업로드합니다.",
    en: "Keep your current local recordings and upload them to the new account.",
    ja: "現在のローカル記録を保持し、新しいアカウントにアップロードします。",
  },
  googleDriveConflictReplaceButtonLabel: {
    ko: "교체 (로컬 삭제 + 새 계정에서 다운로드)",
    en: "Replace (Wipe local & download)",
    ja: "置き換え（ローカル削除してダウンロード）",
  },
  googleDriveConflictReplaceWarning: {
    ko: "주의: 모든 로컬 기록이 삭제되고 새 계정의 데이터가 다운로드됩니다.",
    en: "Warning: This will delete all local recordings and download data from the new account.",
    ja: "注意: すべてのローカル記録が削除され、新しいアカウントのデータがダウンロードされます。",
  },
  connectGoogleDriveToBackUpAndSyncYourTranscriptionHistory: {
    ko: "Google Drive에 연결해 전사 기록을 백업·동기화하고 다른 기기 기록을 내려받습니다.",
    en: "Connect Google Drive to back up/sync your transcription history and download records from other devices.",
    ja: "Google Drive に接続して文字起こし履歴をバックアップ/同期し、他のデバイスの記録をダウンロードします。",
  },
  finalizing: {
    ko: "마무리 중",
    en: "Finalizing",
    ja: "最終処理中",
  },
  retryTranscription: {
    ko: "재실행",
    en: "Retry transcription",
    ja: "文字起こしを再実行",
  },
  retryConnection: {
    ko: "연결 재시도",
    en: "Retry connection",
    ja: "接続を再試行",
  },
  retryingConnection: {
    ko: "재연결 중...",
    en: "Retrying...",
    ja: "再接続中...",
  },
  retryConnectionFailed: {
    ko: "연결 재시도에 실패했습니다.",
    en: "Connection retry failed.",
    ja: "接続の再試行に失敗しました。",
  },
  retryConnectionToResumeSession: {
    ko: "재시도로 세션을 복구합니다.",
    en: "Retry to recover the session.",
    ja: "再試行してセッションを復旧します。",
  },
  realtimeReconnectInProgress: {
    ko: "연결 복구 중",
    en: "Recovering connection",
    ja: "接続を復旧中",
  },
  realtimeReconnectFailed: {
    ko: "연결 복구 실패",
    en: "Connection recovery failed",
    ja: "接続の復旧に失敗",
  },
  realtimeReconnectFailedDetail: {
    ko: "네트워크 상태를 확인한 뒤 연결 재시도 또는 세션 중단을 선택해 주세요.",
    en: "Check network status, then choose retry connection or abort session.",
    ja: "ネットワーク状態を確認し、接続再試行またはセッション中断を選択してください。",
  },
  editingHintUseEditActionsAndKeyboardNavigation: {
    ko: "제목 편집 버튼과 세그먼트 편집 아이콘으로 교정을 시작할 수 있습니다. 전사 영역 안에서는 h/j/k/l 또는 방향키로 구간을 이동할 수 있습니다.",
    en: "Use the title edit button and segment edit icons to start corrections. Inside the transcript workspace, use h/j/k/l or the arrow keys to move between segments.",
    ja: "タイトル編集ボタンとセグメント編集アイコンから修正を始められます。文字起こしワークスペース内では、h/j/k/l または矢印キーで区間を移動できます。",
  },
  runtimeRequestConfig: {
    ko: "Runtime RequestConfig",
    en: "Runtime RequestConfig",
    ja: "Runtime RequestConfig",
  },
  runtimeStreamConfigWebsocketTitle: {
    ko: "RuntimeStreamConfig (WebSocket 적용)",
    en: "RuntimeStreamConfig (WebSocket)",
    ja: "RuntimeStreamConfig (WebSocket)",
  },
  runtimeStreamConfigWebsocketHelper: {
    ko: "gRPC proto(vito-stt-client.proto)에 정의된 RuntimeStreamConfig 값을 WebSocket 세션에도 전달합니다. 입력을 비워두면 해당 필드는 제외됩니다.",
    en: "Pass RuntimeStreamConfig values defined in the gRPC proto (vito-stt-client.proto) to the WebSocket session as well. Leave a field blank to omit it.",
    ja: "gRPC proto（vito-stt-client.proto）で定義された RuntimeStreamConfig の値を WebSocket セッションにも渡します。空欄にするとそのフィールドは除外されます。",
  },
  runtimeSettingMaxUtterDurationLabel: {
    ko: "max_utter_duration (초)",
    en: "max_utter_duration (sec)",
    ja: "max_utter_duration (秒)",
  },
  runtimeSettingMaxUtterDurationPlaceholder: {
    ko: "예: 12",
    en: "e.g., 12",
    ja: "例: 12",
  },
  runtimeSettingMaxUtterDurationHelper: {
    ko: "최대 발화 길이. 기본 12초, 값이 크면 긴 발화 하나로 처리됩니다.",
    en: "Maximum utterance duration. Default is 12 seconds; larger values treat long speech as a single utterance.",
    ja: "最大発話長。デフォルトは 12 秒で、値が大きいほど長い発話を 1 つの発話として扱います。",
  },
  runtimeSettingNoiseThresholdLabel: {
    ko: "noise_threshold",
    en: "noise_threshold",
    ja: "noise_threshold",
  },
  runtimeSettingNoiseThresholdPlaceholder: {
    ko: "예: 0.7",
    en: "e.g., 0.7",
    ja: "例: 0.7",
  },
  runtimeSettingNoiseThresholdHelper: {
    ko: "백그라운드 노이즈 감지 임계값. 기본 0.7.",
    en: "Background noise detection threshold. Default is 0.7.",
    ja: "バックグラウンドノイズ検知のしきい値。デフォルトは 0.7。",
  },
  runtimeSettingEpdTimeLabel: {
    ko: "epd_time (초)",
    en: "epd_time (sec)",
    ja: "epd_time (秒)",
  },
  runtimeSettingEpdTimePlaceholder: {
    ko: "예: 0.5",
    en: "e.g., 0.5",
    ja: "例: 0.5",
  },
  runtimeSettingEpdTimeHelper: {
    ko: "무음 감지 시간. 0.5~1.0초 추천.",
    en: "Silence detection time. Recommended 0.5–1.0 seconds.",
    ja: "無音検知時間。0.5〜1.0 秒を推奨。",
  },
  runtimeSettingActiveThresholdLabel: {
    ko: "active_threshold",
    en: "active_threshold",
    ja: "active_threshold",
  },
  runtimeSettingActiveThresholdPlaceholder: {
    ko: "예: 0.88",
    en: "e.g., 0.88",
    ja: "例: 0.88",
  },
  runtimeSettingActiveThresholdHelper: {
    ko: "음성 활성화 임계값. 기본 0.88.",
    en: "Voice activity threshold. Default is 0.88.",
    ja: "音声アクティビティのしきい値。デフォルトは 0.88。",
  },
  runtimeSettingAcousticScaleLabel: {
    ko: "acoustic_scale",
    en: "acoustic_scale",
    ja: "acoustic_scale",
  },
  runtimeSettingAcousticScalePlaceholder: {
    ko: "예: 1.0",
    en: "e.g., 1.0",
    ja: "例: 1.0",
  },
  runtimeSettingAcousticScaleHelper: {
    ko: "음향 모델 스케일링. Whisper 계열 미세 조정 시 사용.",
    en: "Acoustic model scaling. Used for fine-tuning Whisper-family models.",
    ja: "音響モデルのスケーリング。Whisper 系モデルの微調整に使用します。",
  },
  settingsConsoleOverview: {
    ko: "설정 콘솔 개요",
    en: "Settings Console Overview",
    ja: "設定コンソール概要",
  },
  publicSetup: {
    ko: "공개 설정",
    en: "Public Setup",
    ja: "公開設定",
  },
  publicSetupHelper: {
    ko: "전사 프리셋, 브라우저 권한, 공개 API 연결처럼 일반 사용 흐름에 필요한 항목입니다.",
    en: "Use this area for transcription presets, browser permissions, and the public API connection used in everyday workflows.",
    ja: "文字起こしプリセット、ブラウザー権限、公開 API 接続など、日常の利用フローに必要な項目です。",
  },
  operatorTools: {
    ko: "운영자 도구",
    en: "Operator Tools",
    ja: "オペレーターツール",
  },
  operatorToolsHelper: {
    ko: "내부망과 관리자 토큰이 필요한 점검/오버라이드 기능입니다. 일반 사용자 설정과 분리해서 다룹니다.",
    en: "Use this area for internal-network checks and overrides that require an admin token. Keep it separate from everyday user settings.",
    ja: "管理者トークンが必要な内部ネットワーク向け確認・オーバーライド機能です。通常のユーザー設定とは分けて扱います。",
  },
  operatorToolsHelperTokenOptional: {
    ko: "내부망에서 사용하는 점검/오버라이드 기능입니다. 이 서버는 관리자 토큰 없이도 호출을 허용하지만 일반 사용자 설정과는 분리해서 다룹니다.",
    en: "Use this area for internal-network checks and overrides. This server allows those calls without an admin token, but keep them separate from everyday user settings.",
    ja: "内部ネットワーク向けの確認・オーバーライド機能です。このサーバーでは管理者トークンなしでも呼び出せますが、通常のユーザー設定とは分けて扱います。",
  },
  operatorSettingsBoundaryHelper: {
    ko: "이 영역은 내부 관리자 URL과 관리자 토큰이 필요하며, 조회는 버튼을 눌렀을 때만 실행됩니다.",
    en: "This area requires the internal admin URL and an admin token, and checks run only when you press a button.",
    ja: "この領域では内部管理 URL と管理者トークンが必要で、確認はボタンを押したときにのみ実行されます。",
  },
  operatorSettingsBoundaryHelperTokenOptional: {
    ko: "이 영역은 내부 관리자 URL이 필요하며, 이 서버에서는 관리자 토큰 없이도 조회와 오버라이드를 허용합니다. 요청은 버튼을 눌렀을 때만 실행됩니다.",
    en: "This area requires the internal admin URL, and this server allows checks and overrides without an admin token. Requests run only when you press a button.",
    ja: "この領域では内部管理 URL が必要ですが、このサーバーでは管理者トークンなしでも確認とオーバーライドを許可します。リクエストはボタンを押したときにのみ実行されます。",
  },
  operatorMetadata: {
    ko: "운영 메타데이터",
    en: "Operator metadata",
    ja: "運用メタデータ",
  },
  permissionsReadyCount: {
    ko: "권한 {{ready}}/{{total}}",
    en: "Permissions {{ready}}/{{total}}",
    ja: "権限 {{ready}}/{{total}}",
  },
  unsavedChanges: {
    ko: "미저장 변경",
    en: "Unsaved changes",
    ja: "未保存の変更",
  },
  restoreSavedValues: {
    ko: "저장된 값으로 되돌리기",
    en: "Restore saved values",
    ja: "保存済みの値に戻す",
  },
  saveConnectionSettingsToUseDraftValues: {
    ko: "입력 중인 URL을 사용하려면 먼저 연결 설정을 저장하세요.",
    en: "Save the connection settings first to use the URLs you are editing.",
    ja: "編集中の URL を使うには、先に接続設定を保存してください。",
  },
  selectPresetBeforeApplyingServerSettings: {
    ko: "서버에 적용할 백엔드 프리셋을 먼저 선택하세요.",
    en: "Select a backend preset before applying it to the server.",
    ja: "サーバーに適用する前にバックエンド プリセットを選択してください。",
  },
  selectedPreset: {
    ko: "선택한 프리셋",
    en: "Selected preset",
    ja: "選択したプリセット",
  },
  selectABindingToInspect: {
    ko: "검토할 binding을 선택하세요.",
    en: "Select a binding to inspect.",
    ja: "確認する binding を選択してください。",
  },
  selectAProfileToInspect: {
    ko: "검토할 profile을 선택하세요.",
    en: "Select a profile to inspect.",
    ja: "確認する profile を選択してください。",
  },
  serverDefaultAlreadyActive: {
    ko: "이미 서버 기본값이 적용 중입니다.",
    en: "The server default is already active.",
    ja: "サーバーのデフォルトはすでに有効です。",
  },
  serverManaged: {
    ko: "서버가 결정",
    en: "Server managed",
    ja: "サーバー管理",
  },
  settingSource: {
    ko: "설정 출처",
    en: "Setting source",
    ja: "設定ソース",
  },
  sslMode: {
    ko: "SSL 모드",
    en: "SSL mode",
    ja: "SSL モード",
  },
  transport: {
    ko: "전송 방식",
    en: "Transport",
    ja: "トランスポート",
  },
  healthStatus: {
    ko: "헬스 상태",
    en: "Health status",
    ja: "ヘルス状態",
  },
  lastCheckedAt: {
    ko: "마지막 확인 시각",
    en: "Last checked",
    ja: "最終確認時刻",
  },
  recheckProfileHealth: {
    ko: "health 다시 확인",
    en: "Recheck health",
    ja: "health を再確認",
  },
  healthReviewSnapshot: {
    ko: "health 검토 스냅샷",
    en: "Health review snapshot",
    ja: "health review snapshot",
  },
  profileId: {
    ko: "프로필 ID",
    en: "Profile ID",
    ja: "プロファイル ID",
  },
  authStrategy: {
    ko: "인증 방식",
    en: "Auth strategy",
    ja: "認証方式",
  },
  noMetadataAvailable: {
    ko: "표시할 metadata가 없습니다.",
    en: "No metadata available.",
    ja: "表示できる metadata はありません。",
  },
  primaryBackend: {
    ko: "primary backend",
    en: "Primary backend",
    ja: "primary backend",
  },
  resolvedBackend: {
    ko: "해결된 backend",
    en: "Resolved backend",
    ja: "解決された backend",
  },
  resolvedModel: {
    ko: "해결된 모델",
    en: "Resolved model",
    ja: "解決されたモデル",
  },
  modelOverride: {
    ko: "모델 override",
    en: "Model override",
    ja: "モデル override",
  },
  timeoutMs: {
    ko: "타임아웃(ms)",
    en: "Timeout (ms)",
    ja: "タイムアウト (ms)",
  },
  retryPolicy: {
    ko: "재시도 정책",
    en: "Retry policy",
    ja: "再試行ポリシー",
  },
  requiredCapabilities: {
    ko: "필수 capability",
    en: "Required capabilities",
    ja: "必須 capability",
  },
  resolutionStatus: {
    ko: "해결 상태",
    en: "Resolution status",
    ja: "解決状態",
  },
  bindingDisabledInspectorNotice: {
    ko: "이 binding은 비활성화되어 있어 runtime에서 선택되지 않습니다.",
    en: "This binding is disabled and will not be selected at runtime.",
    ja: "この binding は無効化されているため runtime では選択されません。",
  },
  primaryProfileMissingInspectorNotice: {
    ko: "primary backend profile을 찾을 수 없습니다. binding 구성이 끊겨 있습니다.",
    en: "The primary backend profile cannot be found. This binding is broken.",
    ja: "primary backend profile が見つかりません。この binding は壊れています。",
  },
  primaryCapabilityMismatchInspectorNotice: {
    ko: "primary backend가 이 feature에 필요한 capability를 제공하지 않습니다.",
    en: "The primary backend does not advertise the capabilities required for this feature.",
    ja: "primary backend がこの feature に必要な capability を持っていません。",
  },
  primaryProfileNotReadyInspectorNotice: {
    ko: "primary backend가 비활성화되었거나 health 상태가 좋지 않습니다.",
    en: "The primary backend is disabled or not healthy enough to serve this feature.",
    ja: "primary backend が無効、またはこの feature を処理するのに十分な health 状態ではありません。",
  },
  nextServerState: {
    ko: "다음 서버 상태",
    en: "Next server state",
    ja: "次のサーバー状態",
  },
  backendResetImpactHelper: {
    ko: "이 작업은 현재 live override를 제거하고 이후 요청을 서버 기본 endpoint 구성으로 되돌립니다.",
    en: "This removes the current live override and sends future requests back to the server default endpoint configuration.",
    ja: "この操作は現在の live override を削除し、今後のリクエストをサーバーのデフォルト endpoint 設定に戻します。",
  },
  backendResetRequiresConfirmationHelper: {
    ko: "복원 전에 현재 override와 복원 후 server-default 경로를 다시 확인합니다.",
    en: "Review the current override and the server-default path before restoring.",
    ja: "復元前に現在の override と server-default 適用後の状態を確認します。",
  },
  backendResetRollbackHelper: {
    ko: "복원 후 다시 override가 필요하면 원하는 프리셋을 다시 적용하세요.",
    en: "If you need the override again after restore, re-apply the desired preset.",
    ja: "復元後に再び override が必要なら、目的のプリセットを再適用してください。",
  },
  discardUnsavedConnectionSettingsChanges: {
    ko: "저장하지 않은 연결 설정 변경사항이 있습니다. 이 페이지를 떠나시겠습니까?",
    en: "You have unsaved connection settings changes. Leave this page?",
    ja: "保存していない接続設定の変更があります。このページを離れますか？",
  },
  savedConnectionSettingsAreActive: {
    ko: "현재 저장된 연결 설정이 적용 중입니다.",
    en: "The saved connection settings are currently active.",
    ja: "現在は保存済みの接続設定が適用されています。",
  },
  loadMoreTranscriptionRecords: {
    ko: "전사 기록 더 보기",
    en: "Load more transcription records",
    ja: "文字起こし記録をさらに読み込む",
  },
  showingTranscriptionRecordsCount: {
    ko: "전사 기록 {{visible}} / {{total}}개 표시 중",
    en: "Showing {{visible}} of {{total}} transcription records",
    ja: "文字起こし記録 {{total}} 件中 {{visible}} 件を表示中",
  },
  notConfigured: {
    ko: "미설정",
    en: "Not configured",
    ja: "未設定",
  },
  internalOnly: {
    ko: "내부 전용",
    en: "Internal only",
    ja: "内部専用",
  },
  pendingStatus: {
    ko: "상태 확인 대기",
    en: "Pending status",
    ja: "状態確認待ち",
  },
  presetsCount: {
    ko: "프리셋 {{count}}",
    en: "Presets {{count}}",
    ja: "プリセット {{count}}",
  },
  detailConsoleOverview: {
    ko: "상세 콘솔 개요",
    en: "Detail Console Overview",
    ja: "詳細コンソール概要",
  },
  analysisWorkspace: {
    ko: "분석 워크스페이스",
    en: "Analysis Workspace",
    ja: "分析ワークスペース",
  },
  analysisWorkspaceSubheader: {
    ko: "파형 타임라인, 루프 구간, 세그먼트 탐색을 한 곳에서 관리합니다.",
    en: "Waveform timeline, loop range, and segment navigation are grouped here.",
    ja: "波形タイムライン、ループ範囲、セグメント移動をここでまとめて管理します。",
  },
  transcriptWorkspace: {
    ko: "전사 워크스페이스",
    en: "Transcript Workspace",
    ja: "文字起こしワークスペース",
  },
  transcript: {
    ko: "전사",
    en: "Transcript",
    ja: "文字起こし",
  },
  transcriptWorkspaceSubheader: {
    ko: "세그먼트 교정/탐색/노트 모드를 한 레이어에서 처리합니다.",
    en: "Review, correct, and navigate transcript segments with keyboard and waveform sync.",
    ja: "キーボード操作と波形同期でセグメントを確認・修正・移動します。",
  },
  segments: {
    ko: "세그먼트",
    en: "Segments",
    ja: "セグメント",
  },
  timed: {
    ko: "타이밍",
    en: "Timed",
    ja: "タイミング",
  },
  speakers: {
    ko: "화자",
    en: "Speakers",
    ja: "話者",
  },
  corrections: {
    ko: "교정",
    en: "Corrections",
    ja: "修正",
  },
  loop: {
    ko: "루프",
    en: "Loop",
    ja: "ループ",
  },
  cursor: {
    ko: "커서",
    en: "Cursor",
    ja: "カーソル",
  },
  off: {
    ko: "꺼짐",
    en: "Off",
    ja: "オフ",
  },
  mediaReadyAudioVideo: {
    ko: "오디오+비디오 준비",
    en: "Audio + Video Ready",
    ja: "音声+映像準備完了",
  },
  mediaReadyAudio: {
    ko: "오디오 준비",
    en: "Audio Ready",
    ja: "音声準備完了",
  },
  mediaLoading: {
    ko: "미디어 로딩중",
    en: "Media Loading",
    ja: "メディア読み込み中",
  },
  mediaPending: {
    ko: "미디어 대기",
    en: "Media Pending",
    ja: "メディア待機",
  },
  sessionWorkspace: {
    ko: "세션 워크스페이스",
    en: "Session Workspace",
    ja: "セッションワークスペース",
  },
  sessionWorkspaceSubheader: {
    ko: "후처리 결과 슬롯과 전사 검색 진입점을 이 영역에 모읍니다.",
    en: "Keep transcript search and future artifacts grouped in one operator-friendly rail.",
    ja: "文字起こし検索と今後の成果물スロットをここにまとめます。",
  },
  mode: {
    ko: "모드",
    en: "Mode",
    ja: "モード",
  },
  realTimeTranslation: {
    ko: "실시간 번역",
    en: "Real-time Translation",
    ja: "リアルタイム翻訳",
  },
  summary: {
    ko: "요약",
    en: "Summary",
    ja: "要約",
  },
  summaryOpen: {
    ko: "열기",
    en: "Open",
    ja: "開く",
  },
  summaryClose: {
    ko: "닫기",
    en: "Close",
    ja: "閉じる",
  },
  summaryLive: {
    ko: "실시간",
    en: "Live",
    ja: "ライブ",
  },
  summaryFull: {
    ko: "전체",
    en: "Full",
    ja: "全体",
  },
  summaryUpdating: {
    ko: "갱신 중",
    en: "Updating",
    ja: "更新中",
  },
  summaryStale: {
    ko: "오래됨",
    en: "Stale",
    ja: "古い",
  },
  summaryAutoSelected: {
    ko: "자동 추천",
    en: "Auto-selected",
    ja: "自動推奨",
  },
  summaryManualSelected: {
    ko: "수동 선택",
    en: "Manual",
    ja: "手動選択",
  },
  summaryDefaultSelected: {
    ko: "기본값 적용",
    en: "Safe default",
    ja: "既定値適用",
  },
  summaryGenerated: {
    ko: "전체 요약을 생성했습니다.",
    en: "Generated the full summary.",
    ja: "全体要約を生成しました。",
  },
  summaryRegenerated: {
    ko: "전체 요약을 다시 생성했습니다.",
    en: "Regenerated the full summary.",
    ja: "全体要約を再生成しました。",
  },
  summaryGenerate: {
    ko: "요약 생성",
    en: "Generate",
    ja: "要約生成",
  },
  summaryRegenerate: {
    ko: "다시 생성",
    en: "Regenerate",
    ja: "再生成",
  },
  summaryRetry: {
    ko: "다시 시도",
    en: "Retry",
    ja: "再試行",
  },
  summaryOpenDetail: {
    ko: "세부 보기",
    en: "Open detail",
    ja: "詳細を開く",
  },
  summaryPreset: {
    ko: "프리셋",
    en: "Preset",
    ja: "プリセット",
  },
  summaryPresetScope: {
    ko: "적용 범위",
    en: "Apply scope",
    ja: "適用範囲",
  },
  summaryPresetApplyFromNow: {
    ko: "다음부터 적용",
    en: "Apply from now",
    ja: "次回から適用",
  },
  summaryPresetRegenerateAll: {
    ko: "전체 다시 생성",
    en: "Regenerate all",
    ja: "全体を再生成",
  },
  summaryPresetApplyFromNowHelper: {
    ko: "프리셋 변경은 다음 full summary run부터 적용됩니다. 현재 요약은 유지됩니다.",
    en: "Preset changes apply to the next full-summary run. The current summary stays in place.",
    ja: "プリセット変更は次の full summary run から適用されます。現在の summary は維持されます。",
  },
  summaryPresetRegenerateAllHelper: {
    ko: "프리셋을 바꾸면 현재 세션 전체 요약을 같은 범위로 다시 생성합니다.",
    en: "Changing the preset regenerates the current session-wide summary against the same scope.",
    ja: "プリセットを変えると、現在のセッション全体 summary を同じ範囲で再生成します。",
  },
  summaryPresetUpdateFailed: {
    ko: "summary preset 변경을 저장하지 못했습니다.",
    en: "The summary preset change could not be saved.",
    ja: "summary preset の変更を保存できませんでした。",
  },
  summaryTranscriptEmpty: {
    ko: "요약할 transcript turn이 아직 없습니다.",
    en: "There are no transcript turns available for summary generation yet.",
    ja: "要約できる transcript turn がまだありません。",
  },
  summaryBindingNotReady: {
    ko: "summary binding이 아직 준비되지 않았습니다.",
    en: "The summary binding is not ready yet.",
    ja: "summary binding の準備がまだできていません。",
  },
  summaryProviderMisconfigured: {
    ko: "summary provider 설정을 다시 확인해야 합니다.",
    en: "The summary provider configuration needs to be reviewed.",
    ja: "summary provider の設定を見直す必要があります。",
  },
  summaryProviderRequestFailed: {
    ko: "summary provider 요청이 실패했습니다.",
    en: "The summary provider request failed.",
    ja: "summary provider へのリクエストに失敗しました。",
  },
  summaryProviderResponseInvalid: {
    ko: "summary provider 응답을 해석하지 못했습니다.",
    en: "The summary provider response could not be parsed.",
    ja: "summary provider の応答を解釈できませんでした。",
  },
  actionItems: {
    ko: "액션 아이템",
    en: "Action items",
    ja: "アクションアイテム",
  },
  keyTerms: {
    ko: "핵심 용어",
    en: "Key terms",
    ja: "重要用語",
  },
  askTranscript: {
    ko: "전사에 질문하기",
    en: "Ask transcript",
    ja: "文字起こしに質問する",
  },
  askTranscriptPrompt: {
    ko: "질문",
    en: "Question",
    ja: "質問",
  },
  artifactNotRequested: {
    ko: "미요청",
    en: "Not requested",
    ja: "未リクエスト",
  },
  artifactPending: {
    ko: "생성 대기",
    en: "Pending",
    ja: "生成待ち",
  },
  artifactReady: {
    ko: "준비됨",
    en: "Ready",
    ja: "準備完了",
  },
  artifactFailed: {
    ko: "실패",
    en: "Failed",
    ja: "失敗",
  },
  artifactNotRequestedHelper: {
    ko: "아직 provider가 연결되지 않았습니다. 이 슬롯은 후속 요약/키워드/QA 기능을 수용하기 위한 자리입니다.",
    en: "No provider is attached yet. This slot is reserved so summaries, terms, and QA can be added without reshaping the workspace.",
    ja: "まだ provider は接続されていません。要約、用語、QA を追加してもワークスペースの形を変えないためのスロットです。",
  },
  summaryArtifactNotRequestedHelper: {
    ko: "요약 요청은 아직 시작되지 않았습니다. summary backend가 준비되면 이 슬롯에서 독립적으로 생성됩니다.",
    en: "The summary request has not started yet. Once a summary backend is ready, it will render here as an independent artifact.",
    ja: "要約リクエストはまだ開始されていません。summary backend の準備ができると、このスロットに独立した artifact として表示されます。",
  },
  summaryArtifactPendingHelper: {
    ko: "요약을 생성 중입니다. transcript와 세션 자체는 계속 읽을 수 있습니다.",
    en: "The summary is being generated. The transcript and session remain readable while the artifact is pending.",
    ja: "要約を生成中です。artifact の生成中でも transcript と session はそのまま閲覧できます。",
  },
  summaryArtifactFailedHelper: {
    ko: "요약 생성에 실패했습니다. transcript와 세션 데이터는 그대로 유지됩니다.",
    en: "Summary generation failed. The transcript and session data remain intact.",
    ja: "要約の生成に失敗しました。transcript と session データはそのまま保持されます。",
  },
  summarySurfaceDisabledHelper: {
    ko: "summary capability 또는 backend binding이 준비되지 않아 이 패널은 대기 상태입니다.",
    en: "This panel is waiting because the summary capability or backend binding is not ready.",
    ja: "summary capability または backend binding の準備ができていないため、このパネルは待機状態です。",
  },
  summaryUpdatingHelper: {
    ko: "기존 요약을 유지한 채 새 summary run 결과를 반영하는 중입니다.",
    en: "A new summary run is updating this panel while the current summary remains readable.",
    ja: "現在の summary を維持したまま、新しい summary run の結果を反映しています。",
  },
  summaryStaleHelper: {
    ko: "source transcript가 바뀌어 현재 요약을 다시 생성해야 합니다.",
    en: "The source transcript changed, so this summary should be regenerated.",
    ja: "source transcript が変わったため、この summary は再生成が必要です。",
  },
  qaArtifactNotRequestedHelper: {
    ko: "질문 요청은 아직 시작되지 않았습니다. QA backend가 준비되면 transcript를 근거로 답변을 붙입니다.",
    en: "No question has been requested yet. Once a QA backend is ready, answers can be attached with transcript-backed provenance.",
    ja: "質問リクエストはまだ開始されていません。QA backend の準備ができると、transcript を根拠にした回答を追加できます。",
  },
  qaArtifactPendingHelper: {
    ko: "질문 응답을 생성 중입니다. transcript는 계속 탐색할 수 있습니다.",
    en: "The answer is being generated. The transcript remains available while QA is pending.",
    ja: "回答を生成中です。QA の生成中でも transcript は引き続き参照できます。",
  },
  qaArtifactFailedHelper: {
    ko: "질문 응답 생성에 실패했습니다. transcript와 세션 데이터는 그대로 유지됩니다.",
    en: "Answer generation failed. The transcript and session data remain intact.",
    ja: "回答の生成に失敗しました。transcript と session データはそのまま保持されます。",
  },
  askTranscriptPromptPlaceholder: {
    ko: "예: 이 회의의 핵심 결정은 무엇인가요?",
    en: "Example: What was the key decision in this meeting?",
    ja: "例: この会議の主要な決定事項は何ですか？",
  },
  askTranscriptPromptHelper: {
    ko: "질문과 provenance 스니펫은 이 슬롯에서 함께 관리됩니다.",
    en: "The question and its supporting provenance snippets will live together in this slot.",
    ja: "質問と supporting provenance snippet はこのスロットで一緒に管理されます。",
  },
  supportingTranscriptSnippets: {
    ko: "근거 전사 스니펫",
    en: "Supporting transcript snippets",
    ja: "根拠となる transcript snippet",
  },
  searchTranscript: {
    ko: "전사 검색",
    en: "Search transcript",
    ja: "文字起こし検索",
  },
  searchTranscriptPlaceholder: {
    ko: "발화, 화자, 언어를 검색",
    en: "Search by utterance, speaker, or language",
    ja: "発話、話者、言語で検索",
  },
  sourceFile: {
    ko: "원본 파일",
    en: "Source file",
    ja: "元ファイル",
  },
  noTranscriptMatches: {
    ko: "검색 조건과 일치하는 세그먼트가 없습니다.",
    en: "No transcript segments match this search.",
    ja: "この検索条件に一致するセグメントはありません。",
  },
  matchingSegments: {
    ko: "일치 세그먼트 {{count}} / {{total}}",
    en: "Matching segments {{count}} / {{total}}",
    ja: "一致セグメント {{count}} / {{total}}",
  },
  automaticCopyFailedPleaseCopyManually: {
    ko: "자동 복사에 실패했습니다. 수동으로 복사해 주세요.",
    en: "Automatic copy failed. Please copy manually.",
    ja: "自動コピーに失敗しました。手動でコピーしてください。",
  },
  edit: {
    ko: "수정",
    en: "Edit",
    ja: "編集",
  },
  raw: {
    ko: "원문",
    en: "Raw",
    ja: "原文",
  },
  stopping: {
    ko: "중지 중",
    en: "Stopping",
    ja: "停止中",
  },
  wordLevelDetails: {
    ko: "단어 단위 상세",
    en: "Word-level details",
    ja: "単語単位の詳細",
  },
  unknownErrorTryAgain: {
    ko: "알 수 없는 오류가 발생했습니다. 잠시 후 다시 시도해 주세요.",
    en: "An unknown error occurred. Please try again.",
    ja: "不明なエラーが発生しました。しばらくしてから再試行してください。",
  },
  unknownUpstreamStatus: {
    ko: "알 수 없는 업스트림 상태",
    en: "Unknown upstream status",
    ja: "不明なアップストリーム状態",
  },
  unknownUpstreamStatusReceived: {
    ko: "업스트림 서버가 예상하지 못한 상태를 반환했습니다: {{status}}",
    en: "The upstream server returned an unexpected status: {{status}}",
    ja: "アップストリーム サーバーが想定外の状態を返しました: {{status}}",
  },
  upstreamStatus: {
    ko: "업스트림 상태",
    en: "Upstream status",
    ja: "アップストリーム状態",
  },
  backendAdminDisabled: {
    ko: "백엔드 관리자 기능이 비활성화되어 있습니다.",
    en: "Backend admin is disabled.",
    ja: "バックエンド管理機能は無効です。",
  },
  backendAdminUnauthorized: {
    ko: "백엔드 관리자 토큰이 유효하지 않습니다.",
    en: "Invalid backend admin token.",
    ja: "バックエンド管理者トークンが無効です。",
  },
  backendAdminMisconfigured: {
    ko: "백엔드 관리자 설정이 올바르지 않습니다.",
    en: "Backend admin is misconfigured.",
    ja: "バックエンド管理設定が不正です。",
  },
  streamAckTimeoutTryAgain: {
    ko: "스트리밍 준비 응답이 지연되어 연결을 재시도합니다.",
    en: "Streaming ready acknowledgement timed out. Reconnecting.",
    ja: "ストリーミング準備応答がタイムアウトしました。再接続します。",
  },
  serverConfigurationError: {
    ko: "서버 설정을 불러오지 못했습니다.",
    en: "Failed to load server configuration.",
    ja: "サーバー設定を読み込めませんでした。",
  },
  invalidConfigurationJson: {
    ko: "설정 JSON 형식이 올바르지 않습니다.",
    en: "Configuration JSON is invalid.",
    ja: "設定 JSON の形式が正しくありません。",
  },
  configJsonMustBeObject: {
    ko: "설정 JSON은 객체 형태여야 합니다.",
    en: "Configuration JSON must be an object.",
    ja: "設定 JSON はオブジェクト形式である必要があります。",
  },
  transcriptionRequestFailedTryAgain: {
    ko: "전사 요청에 실패했습니다. 잠시 후 다시 시도해 주세요.",
    en: "Transcription request failed. Please try again shortly.",
    ja: "文字起こしリクエストに失敗しました。しばらくしてから再試行してください。",
  },
  googleDriveReconnectRequired: {
    ko: "Google Drive 연결 상태가 만료되었습니다. 다시 연결해 주세요.",
    en: "Google Drive session expired. Please reconnect.",
    ja: "Google Drive セッションが期限切れです。再接続してください。",
  },
  cannotRetryWithoutOriginalConfiguration: {
    ko: "원본 설정 정보를 찾을 수 없어 재실행할 수 없습니다.",
    en: "Cannot retry because the original configuration is missing.",
    ja: "元の設定情報が見つからないため再実行できません。",
  },
  storedSourceFileDataIsIncomplete: {
    ko: "저장된 원본 파일 데이터가 불완전하여 파일을 다시 선택해야 합니다.",
    en: "The stored source file data is incomplete. Please select the file again.",
    ja: "保存された元ファイルのデータが不完全なため、ファイルを再選択してください。",
  },
  forRealTimeTranscriptionLocallyStoredAudioChunksWillAlsoBeDeleted: {
    ko: "실시간 전사인 경우 로컬에 저장된 오디오 청크도 삭제됩니다.",
    en: "For real-time transcription, locally stored audio chunks will also be deleted.",
    ja: "リアルタイム文字起こしの場合、ローカルに保存された音声チャンクも削除されます。",
  },
};

const buildLocaleMap = (locale: Locale) => {
  return Object.entries(baseTranslations).reduce<Record<string, string>>((acc, [key, value]) => {
    if (locale === "en") {
      acc[key] = value.en;
    } else if (locale === "ja") {
      acc[key] = value.ja;
    } else {
      acc[key] = value.ko ?? key;
    }
    return acc;
  }, {});
};

export const translations: Record<Locale, Record<string, string>> = {
  ko: buildLocaleMap("ko"),
  en: buildLocaleMap("en"),
  ja: buildLocaleMap("ja"),
};
