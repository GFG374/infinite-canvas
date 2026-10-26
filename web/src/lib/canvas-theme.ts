export type CanvasColorTheme = "light" | "dark";
export type CanvasBackgroundMode = "dots" | "blank";

export const canvasThemes = {
    light: {
        canvas: {
            background: "#f5f5f5",
            dot: "rgba(0,0,0,.13)",
            selectionStroke: "#171717",
            selectionFill: "rgba(0,0,0,.05)",
        },
        node: {
            label: "#666666",
            fill: "#eaeaea",
            panel: "#ffffff",
            stroke: "#dddddd",
            activeStroke: "#171717",
            placeholder: "#888888",
            text: "#202020",
            muted: "#737373",
            faint: "#999999",
        },
        toolbar: {
            panel: "rgba(255,255,255,.98)",
            border: "#dddddd",
            item: "#666666",
            itemHover: "#eeeeee",
            activeBg: "#e6e6e6",
            activeText: "#202020",
        },
    },
    dark: {
        canvas: {
            background: "#080808",
            dot: "rgba(255,255,255,.13)",
            selectionStroke: "#eeeeee",
            selectionFill: "rgba(255,255,255,.07)",
        },
        node: {
            label: "#a3a3a3",
            fill: "#252525",
            panel: "#111111",
            stroke: "#2d2d2d",
            activeStroke: "#eeeeee",
            placeholder: "#858585",
            text: "#eeeeee",
            muted: "#b5b5b5",
            faint: "#6f6f6f",
        },
        toolbar: {
            panel: "rgba(20,20,20,.98)",
            border: "#2d2d2d",
            item: "#b5b5b5",
            itemHover: "#292929",
            activeBg: "#454545",
            activeText: "#eeeeee",
        },
    },
} as const;

export type CanvasTheme = (typeof canvasThemes)[CanvasColorTheme];
