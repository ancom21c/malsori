import { Suspense, lazy, useMemo } from "react";
import {
  createBrowserRouter,
  Navigate,
  Outlet,
  Route,
  RouterProvider,
  createRoutesFromElements,
} from "react-router-dom";
import { CircularProgress, Box } from "@mui/material";
import MainLayout from "../layouts/MainLayout";
import {
  platformFeatureFlags,
  resolveRealtimeCapturePath,
} from "./platformRoutes";
import {
  derivePlatformFeatureAvailability,
  platformCapabilities,
} from "./platformCapabilities";
import { platformBackendBindingRuntime } from "./backendBindingRuntime";
import { buildTranslateBindingPresentation } from "../pages/translateBindingModel";

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
const TranslatePage = platformFeatureFlags.realtimeTranslate
  ? lazy(() => import("../pages/TranslatePage"))
  : null;
const HelpPage = lazy(() => import("../pages/HelpPage"));
const LabPage = lazy(() => import("../pages/LabPage"));
const devOnlyUiConceptsEnabled = import.meta.env.MODE === "development";
const UiConceptsPage = devOnlyUiConceptsEnabled
  ? lazy(() => import("../pages/UiConceptsPage"))
  : null;
const translateRouteEnabled = buildTranslateBindingPresentation(
  platformFeatureFlags,
  platformCapabilities,
  derivePlatformFeatureAvailability(platformFeatureFlags, platformCapabilities),
  platformBackendBindingRuntime
).finalTranslation.ready;

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

function RootLayout() {
  return (
    <MainLayout>
      <Suspense fallback={<Loader />}>
        <Outlet />
      </Suspense>
    </MainLayout>
  );
}

function createAppRouter() {
  return createBrowserRouter(
    createRoutesFromElements(
      <Route element={<RootLayout />}>
        <Route path="/" element={<TranscriptionListPage />} />
        <Route path="/sessions" element={<TranscriptionListPage />} />
        <Route
          path="/transcriptions/:transcriptionId"
          element={<TranscriptionDetailPage />}
        />
        <Route
          path="/sessions/:transcriptionId"
          element={<TranscriptionDetailPage />}
        />
        <Route path="/capture" element={<Navigate to="/capture/realtime" replace />} />
        <Route path="/capture/file" element={<TranscriptionListPage />} />
        <Route path="/settings" element={<SettingsPage />} />
        <Route path="/realtime" element={<RealtimeSessionPage />} />
        <Route path="/capture/realtime" element={<RealtimeSessionPage />} />
        <Route
          path="/translate"
          element={
            platformFeatureFlags.realtimeTranslate && translateRouteEnabled && TranslatePage ? (
              <TranslatePage />
            ) : (
              <Navigate to={resolveRealtimeCapturePath()} replace />
            )
          }
        />
        <Route path="/lab" element={<LabPage />} />
        {devOnlyUiConceptsEnabled && UiConceptsPage ? (
          <Route path="/lab/ui-concepts" element={<UiConceptsPage />} />
        ) : null}
        <Route path="/help" element={<HelpPage />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Route>
    )
  );
}

export default function AppRouter() {
  const router = useMemo(() => createAppRouter(), []);
  return <RouterProvider router={router} />;
}
