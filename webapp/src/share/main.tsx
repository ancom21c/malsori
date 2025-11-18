import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import AppProviders from "../app/AppProviders";
import ShareViewerPage from "../pages/share/ShareViewerPage";

const rootElement = document.getElementById("share-root");
if (rootElement) {
  createRoot(rootElement).render(
    <StrictMode>
      <AppProviders>
        <ShareViewerPage />
      </AppProviders>
    </StrictMode>
  );
}
