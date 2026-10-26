import { create } from "zustand";
import { persist } from "zustand/middleware";
import type { CanvasNodeMetadata, CanvasNodeType } from "../types";

export type CanvasPanelTab = "canvas" | "assets" | "prompts";
export type CanvasAssetSource = "mine" | "library";

type CanvasUiStore = {
    generationDefaults: Partial<Record<CanvasNodeType.Image | CanvasNodeType.Video, Pick<CanvasNodeMetadata, "quality" | "size" | "vquality">>>;
    sidePanelTab: CanvasPanelTab;
    assetSource: CanvasAssetSource;
    assetFormOpen: boolean;
    setAssetFormOpen: (open: boolean) => void;
    setSidePanelTab: (tab: CanvasPanelTab) => void;
    setAssetSource: (source: CanvasAssetSource) => void;
    editingProjectId: string | null;
    editingProjectTitle: string;
    selectedProjectIds: string[];
    deleteProjectIds: string[];
    startEditingProject: (id: string, title: string) => void;
    setEditingProjectTitle: (title: string) => void;
    stopEditingProject: () => void;
    toggleSelectedProjectId: (id: string, selected: boolean) => void;
    setDeleteProjectIds: (ids: string[]) => void;
    removeSelectedProjectIds: (ids: string[]) => void;
};

export const useCanvasUiStore = create<CanvasUiStore>()(persist((set) => ({
    generationDefaults: {},
    sidePanelTab: "assets",
    assetSource: "mine",
    assetFormOpen: false,
    setAssetFormOpen: (assetFormOpen) => set({ assetFormOpen }),
    setSidePanelTab: (sidePanelTab) => set({ sidePanelTab }),
    setAssetSource: (assetSource) => set({ assetSource }),
    editingProjectId: null,
    editingProjectTitle: "",
    selectedProjectIds: [],
    deleteProjectIds: [],
    startEditingProject: (editingProjectId, editingProjectTitle) => set({ editingProjectId, editingProjectTitle }),
    setEditingProjectTitle: (editingProjectTitle) => set({ editingProjectTitle }),
    stopEditingProject: () => set({ editingProjectId: null }),
    toggleSelectedProjectId: (id, selected) => set((state) => ({ selectedProjectIds: selected ? [...new Set([...state.selectedProjectIds, id])] : state.selectedProjectIds.filter((item) => item !== id) })),
    setDeleteProjectIds: (deleteProjectIds) => set({ deleteProjectIds }),
    removeSelectedProjectIds: (ids) => set((state) => ({ selectedProjectIds: state.selectedProjectIds.filter((id) => !ids.includes(id)) })),
}), {
    name: "infinite-canvas:canvas_ui_store",
    partialize: (state) => ({ generationDefaults: state.generationDefaults }),
}));
