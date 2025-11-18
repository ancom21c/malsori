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
  anErrorOccurredDuringStreaming: {
    ko: "스트리밍 도중 오류가 발생했습니다.",
    en: "An error occurred during streaming.",
    ja: "ストリーミング中にエラーが発生しました。",
  },
  anErrorOccurredDuringTheTranscriptionRequest: {
    ko: "전사 요청 중 오류가 발생했습니다.",
    en: "An error occurred during the transcription request.",
    ja: "文字起こしリクエスト中にエラーが発生しました。",
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
  backendpresetselectorApplysuccess: {
    ko: "백엔드 프리셋을 적용했습니다.",
    en: "Backend preset applied successfully.",
    ja: "バックエンドプリセットが正常に適用されました。",
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
  clickTheButtonInTheBottomRightToRequestFileTranscriptionOrStartRealTimeTranscription: {
    ko: "우측 하단의 + 버튼을 눌러 파일 전사를 요청하거나 실시간 전사를 시작해 보세요.",
    en: "Click the + button in the bottom right to request file transcription or start real-time transcription.",
    ja: "右下の + ボタンをクリックして、ファイルの転写をリクエストするか、リアルタイムの転写を開始します。",
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
  credentialsNotUsed: {
    ko: "자격증명 미사용",
    en: "Credentials not used",
    ja: "認証情報は使用されません",
  },
  currentServerApplicationSettings: {
    ko: "현재 서버 적용 설정",
    en: "Current server application settings",
    ja: "現在のサーバーアプリケーション設定",
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
    ko: "로컬 Python API와 서버가 바라볼 STT 엔드포인트를 관리합니다.",
    en: "Manages the local Python API and STT endpoints that the server will look at.",
    ja: "サーバーが参照するローカルの Python API と STT エンドポイントを管理します。",
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
  readyToStartS: {
    ko: "시작 준비 ({{seconds}}s)",
    en: "Ready to start ({{seconds}}s)",
    ja: "開始する準備ができました ({{seconds}}s)",
  },
  realTimeRecognition: {
    ko: "실시간 인식 중",
    en: "Real-time recognition",
    ja: "リアルタイム認識",
  },
  realTimeTranscription: {
    ko: "실시간 전사",
    en: "Real-time Transcription",
    ja: "リアルタイム文字起こし",
  },
  realTimeTranscriptionAutoSaveCycleSeconds: {
    ko: "실시간 전사 자동 저장 주기(초)",
    en: "Real-time transcription auto-save cycle (seconds)",
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
    ko: "녹음 재생",
    en: "Recording Playback",
    ja: "録音再生",
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
  requesting: {
    ko: "요청 중...",
    en: "Requesting...",
    ja: "リクエスト中...",
  },
  requiredForCloudDeployment: {
    ko: "Cloud 배포 시 필수",
    en: "Required for cloud deployment",
    ja: "クラウド展開に必要",
  },
  requiredForRtzrCloudDeployments: {
    ko: "RTZR Cloud 배포에서 필수입니다.",
    en: "Required for RTZR Cloud deployments.",
    ja: "RTZR クラウド展開に必要です。",
  },
  restoringServerDefaultsFailed: {
    ko: "서버 기본값 복원에 실패했습니다.",
    en: "Restoring server defaults failed.",
    ja: "サーバーのデフォルトの復元に失敗しました。",
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
  revertedToServerDefaults: {
    ko: "서버 기본값으로 되돌렸습니다.",
    en: "Reverted to server defaults.",
    ja: "サーバーのデフォルトに戻しました。",
  },
  save: {
    ko: "저장",
    en: "Save",
    ja: "保存",
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
    ko: "음성 파일 선택",
    en: "Select audio file",
    ja: "音声ファイルを選択",
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
  streamTranscriptionSettings: {
    ko: "스트리밍 전사 설정",
    en: "Stream Transcription Settings",
    ja: "ストリーム文字起こし設定",
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
  thereIsASavedClientIdEnteringANewValueWillOverwriteIt: {
    ko: "저장된 Client ID가 있습니다. 새 값을 입력하면 덮어씁니다.",
    en: "There is a saved Client ID. Entering a new value will overwrite it.",
    ja: "保存されたクライアント ID があります。新しい値を入力すると上書きされます。",
  },
  thereIsASavedClientSecretEnteringANewValueWillOverwriteIt: {
    ko: "저장된 Client Secret이 있습니다. 새 값을 입력하면 덮어씁니다.",
    en: "There is a saved Client Secret. Entering a new value will overwrite it.",
    ja: "保存されたクライアント シークレットがあります。新しい値を入力すると上書きされます。",
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
