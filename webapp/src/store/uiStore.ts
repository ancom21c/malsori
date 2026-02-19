import { create } from "zustand";

type UiState = {
  floatingActionsVisible: boolean;
  setFloatingActionsVisible: (visible: boolean) => void;

  uploadDialogOpen: boolean;
  setUploadDialogOpen: (open: boolean) => void;
  openUploadDialog: () => void;
  closeUploadDialog: () => void;
};

export const useUiStore = create<UiState>((set) => ({
  floatingActionsVisible: true,
  setFloatingActionsVisible: (visible) => set({ floatingActionsVisible: visible }),

  uploadDialogOpen: false,
  setUploadDialogOpen: (open) => set({ uploadDialogOpen: open }),
  openUploadDialog: () => set({ uploadDialogOpen: true }),
  closeUploadDialog: () => set({ uploadDialogOpen: false }),
}));
