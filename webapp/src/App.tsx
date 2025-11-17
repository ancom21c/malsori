import { useEffect, useRef } from "react";
import AppProviders from "./app/AppProviders";
import AppRouter from "./app/AppRouter";
import {
  requestMicrophonePermission,
  requestPersistentStoragePermission,
} from "./services/permissions";

export default function App() {
  usePrewarmPermissions();

  return (
    <AppProviders>
      <AppRouter />
    </AppProviders>
  );
}

function usePrewarmPermissions() {
  const requestedRef = useRef(false);

  useEffect(() => {
    if (requestedRef.current) {
      return;
    }
    requestedRef.current = true;

    const prewarmMicrophone = async () => {
      const granted = await requestMicrophonePermission();
      if (!granted) {
        console.warn("마이크 권한을 미리 요청하지 못했습니다.");
      }
    };

    const prewarmStorage = async () => {
      const granted = await requestPersistentStoragePermission();
      if (!granted) {
        console.warn("저장소 쓰기 권한을 미리 요청하지 못했습니다.");
      }
    };

    void prewarmMicrophone();
    void prewarmStorage();
  }, []);
}
