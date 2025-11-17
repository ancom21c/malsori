import { create } from "zustand";

type UiState = {
  floatingActionsVisible: boolean;
  setFloatingActionsVisible: (visible: boolean) => void;
};

export const useUiStore = create<UiState>((set) => ({
  floatingActionsVisible: true,
  setFloatingActionsVisible: (visible) => set({ floatingActionsVisible: visible }),
}));
