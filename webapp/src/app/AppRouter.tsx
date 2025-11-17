import { Suspense, lazy } from "react";
import {
  BrowserRouter,
  Navigate,
  Route,
  Routes,
} from "react-router-dom";
import { CircularProgress, Box } from "@mui/material";
import MainLayout from "../layouts/MainLayout";

const TranscriptionListPage = lazy(
  () => import("../pages/TranscriptionListPage")
);
const TranscriptionDetailPage = lazy(
  () => import("../pages/TranscriptionDetailPage")
);
const SettingsPage = lazy(() => import("../pages/SettingsPage"));
const RealtimeSessionPage = lazy(
  () => import("../pages/RealtimeSessionPage")
);
const HelpPage = lazy(() => import("../pages/HelpPage"));

function Loader() {
  return (
    <Box
      sx={{
        display: "flex",
        height: "100%",
        alignItems: "center",
        justifyContent: "center",
        padding: 4,
      }}
    >
      <CircularProgress />
    </Box>
  );
}

export default function AppRouter() {
  return (
    <BrowserRouter>
      <MainLayout>
        <Suspense fallback={<Loader />}>
          <Routes>
            <Route path="/" element={<TranscriptionListPage />} />
            <Route
              path="/transcriptions/:transcriptionId"
              element={<TranscriptionDetailPage />}
            />
            <Route path="/settings" element={<SettingsPage />} />
            <Route path="/realtime" element={<RealtimeSessionPage />} />
            <Route path="/help" element={<HelpPage />} />
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </Suspense>
      </MainLayout>
    </BrowserRouter>
  );
}
