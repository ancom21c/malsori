import { render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { MemoryRouter } from "react-router-dom";
import { I18nProvider } from "../i18n";
import { appDb } from "../data/app-db";
import TranslatePage from "./TranslatePage";

vi.mock("../services/api/rtzrApiClientContext", () => ({
  useRtzrApiClient: () => ({
    requestFinalTurnTranslation: vi.fn(),
  }),
}));

beforeEach(async () => {
  await appDb.delete();
  await appDb.open();
});

describe("TranslatePage", () => {
  it("renders the final-turn translation workspace with an empty session helper", () => {
    render(
      <MemoryRouter>
        <I18nProvider>
          <TranslatePage />
        </I18nProvider>
      </MemoryRouter>
    );

    expect(screen.getByRole("heading", { name: /real-time translate/i })).toBeTruthy();
    expect(screen.getByRole("button", { name: /retry failed turns/i })).toBeTruthy();
    expect(screen.getByLabelText(/target language/i)).toBeTruthy();
    expect(screen.getAllByText(/source transcript/i).length).toBeGreaterThan(0);
    expect(screen.getByText(/translation workspace/i)).toBeTruthy();
    expect(screen.getByText(/there is no realtime session yet/i)).toBeTruthy();
    expect(screen.getAllByText(/final turns only/i).length).toBeGreaterThan(0);
  });
});
