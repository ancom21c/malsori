import { create } from "zustand";

type UiState = {
  floatingActionsVisibleOverride: boolean | null;
  setFloatingActionsVisible: (visible: boolean | null) => void;

  uploadDialogOpen: boolean;
  setUploadDialogOpen: (open: boolean) => void;
  openUploadDialog: () => void;
  closeUploadDialog: () => void;
};

export const useUiStore = create<UiState>((set) => ({
  floatingActionsVisibleOverride: null,
  setFloatingActionsVisible: (visible) => set({ floatingActionsVisibleOverride: visible }),

  uploadDialogOpen: false,
  setUploadDialogOpen: (open) => set({ uploadDialogOpen: open }),
  openUploadDialog: () => set({ uploadDialogOpen: true }),
  closeUploadDialog: () => set({ uploadDialogOpen: false }),
}));
