import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import ShareViewerPage from "../pages/share/ShareViewerPage";
import { ShareProviders } from "./ShareProviders";

const rootElement = document.getElementById("share-root");
if (rootElement) {
  createRoot(rootElement).render(
    <StrictMode>
      <ShareProviders>
        <ShareViewerPage />
      </ShareProviders>
    </StrictMode>
  );
}
