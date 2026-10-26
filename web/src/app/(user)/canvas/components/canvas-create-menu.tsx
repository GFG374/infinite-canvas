"use client";

import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { Clapperboard, Globe2, ImageIcon, Images, List, Music2, Settings2, Upload, Video } from "lucide-react";

import { canvasThemes } from "@/lib/canvas-theme";
import { useThemeStore } from "@/stores/use-theme-store";
import { CanvasNodeType, type Position } from "../types";

const nodeOptions = [
    { type: CanvasNodeType.Text, title: "文本生成", icon: List },
    { type: CanvasNodeType.Image, title: "图片生成", icon: ImageIcon },
    { type: CanvasNodeType.Video, title: "视频生成", icon: Video },
    { type: CanvasNodeType.Audio, title: "音频参考", icon: Music2 },
    { type: CanvasNodeType.Panorama, title: "全景图", icon: Globe2 },
    { type: CanvasNodeType.Director, title: "3D 导演台", icon: Clapperboard },
    { type: CanvasNodeType.Config, title: "配置节点", icon: Settings2 },
];

export function CanvasCreateMenu({ anchor, onCreate, onUpload, onOpenAssetLibrary, onClose }: {
    anchor: Position;
    onCreate: (type: CanvasNodeType) => void;
    onUpload: () => void;
    onOpenAssetLibrary: () => void;
    onClose: () => void;
}) {
    const theme = canvasThemes[useThemeStore(state => state.theme)];
    const ref = useRef<HTMLDivElement>(null);
    const [placement, setPlacement] = useState<Position | null>(null);

    useLayoutEffect(() => {
        const menu = ref.current;
        if (!menu) return;
        const bounds = menu.getBoundingClientRect();
        setPlacement({
            x: Math.max(8, Math.min(anchor.x, window.innerWidth - bounds.width - 8)),
            y: Math.max(8, Math.min(anchor.y, window.innerHeight - bounds.height - 8)),
        });
    }, [anchor.x, anchor.y]);

    useEffect(() => {
        if (placement) ref.current?.querySelector<HTMLButtonElement>("[role=menuitem]")?.focus({ preventScroll: true });
    }, [placement]);

    useEffect(() => {
        const closeOutside = (event: PointerEvent) => { if (!ref.current?.contains(event.target as Node)) onClose(); };
        document.addEventListener("pointerdown", closeOutside, true);
        window.addEventListener("resize", onClose);
        return () => {
            document.removeEventListener("pointerdown", closeOutside, true);
            window.removeEventListener("resize", onClose);
        };
    }, [onClose]);

    return createPortal(
        <div ref={ref} role="menu" aria-label="添加节点" data-canvas-no-zoom
            className="fixed z-[1200] w-60 max-w-[calc(100vw-16px)] overflow-y-auto rounded-2xl border p-1.5 shadow-xl"
            style={{ left: placement?.x ?? anchor.x, top: placement?.y ?? anchor.y, maxHeight: "calc(100dvh - 16px)", visibility: placement ? "visible" : "hidden", background: theme.node.panel, borderColor: theme.node.stroke, color: theme.node.text }}
            onPointerDown={event => event.stopPropagation()} onContextMenu={event => { event.preventDefault(); event.stopPropagation(); }}
            onKeyDown={event => {
                event.stopPropagation();
                if (event.key === "Escape" || event.key === "Tab") { onClose(); return; }
                if (!["ArrowDown", "ArrowUp", "Home", "End"].includes(event.key)) return;
                event.preventDefault();
                const items = Array.from(ref.current?.querySelectorAll<HTMLButtonElement>("[role=menuitem]") ?? []);
                const index = items.indexOf(document.activeElement as HTMLButtonElement);
                const next = event.key === "Home" ? 0 : event.key === "End" ? items.length - 1 : (index + (event.key === "ArrowDown" ? 1 : -1) + items.length) % items.length;
                items[next]?.focus();
            }}>
            <div className="px-2.5 pb-1.5 pt-2 text-[11px] font-medium" style={{ color: theme.node.muted }}>添加节点</div>
            {nodeOptions.map(({ type, title, icon: Icon }) => (
                <button key={type} type="button" role="menuitem" onClick={() => onCreate(type)}
                    className="flex h-9 w-full items-center gap-3 rounded-lg px-2.5 text-left text-[13px] transition-colors focus-visible:outline-none"
                    onMouseEnter={event => event.currentTarget.focus()}
                    onFocus={event => { event.currentTarget.style.background = theme.toolbar.itemHover; }}
                    onBlur={event => { event.currentTarget.style.background = "transparent"; }}>
                    <Icon className="size-4 shrink-0" style={{ color: theme.node.muted }} />{title}
                </button>
            ))}
            <div role="separator" className="mx-2 my-1.5 border-t" style={{ borderColor: theme.node.stroke }} />
            {[{ title: "上传素材", icon: Upload, action: onUpload }, { title: "从素材库选择", icon: Images, action: onOpenAssetLibrary }].map(({ title, icon: Icon, action }) => (
                <button key={title} type="button" role="menuitem" onClick={action}
                    className="flex h-9 w-full items-center gap-3 rounded-lg px-2.5 text-left text-[13px] transition-colors focus-visible:outline-none"
                    onMouseEnter={event => event.currentTarget.focus()}
                    onFocus={event => { event.currentTarget.style.background = theme.toolbar.itemHover; }}
                    onBlur={event => { event.currentTarget.style.background = "transparent"; }}>
                    <Icon className="size-4 shrink-0" style={{ color: theme.node.muted }} />{title}
                </button>
            ))}
            <div className="flex items-center justify-between px-2.5 pb-1.5 pt-2 text-[10px]" style={{ color: theme.node.faint }}><span>在此处创建</span><span>ESC 关闭</span></div>
        </div>, document.body,
    );
}
