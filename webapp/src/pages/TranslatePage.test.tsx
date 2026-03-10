import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { MemoryRouter } from "react-router-dom";
import { I18nProvider } from "../i18n";
import TranslatePage from "./TranslatePage";

describe("TranslatePage", () => {
  it("renders the source-first fallback translator shell", () => {
    render(
      <MemoryRouter>
        <I18nProvider>
          <TranslatePage />
        </I18nProvider>
      </MemoryRouter>
    );

    expect(screen.getByRole("heading", { name: /real-time translate/i })).toBeTruthy();
    expect(screen.getByText(/source transcript/i)).toBeTruthy();
    expect(screen.getByText(/translated output/i)).toBeTruthy();
    expect(screen.getByText(/capture stays authoritative/i)).toBeTruthy();
  });
});
