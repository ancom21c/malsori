import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { ShareProviders } from "./ShareProviders";
import ShareViewerPage from "../pages/share/ShareViewerPage";

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
