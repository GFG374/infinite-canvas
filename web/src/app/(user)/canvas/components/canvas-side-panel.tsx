"use client";

import { memo, useEffect, useMemo, useRef, useState, type PointerEvent as ReactPointerEvent } from "react";
import { Input, Select, Spin } from "antd";
import { useQuery } from "@tanstack/react-query";
import { BookOpen, ChevronLeft, ChevronRight, Clapperboard, Eye, FileText, Group, Image as ImageIcon, Music2, Plus, Search, Settings2, Type, Video } from "lucide-react";
import { motion } from "motion/react";

import { PromptDetailDialog } from "@/components/prompts/prompt-detail-dialog";
import { useCopyText } from "@/hooks/use-copy-text";
import { canvasThemes, type CanvasTheme } from "@/lib/canvas-theme";
import { cn } from "@/lib/utils";
import { fetchPrompts, type Prompt } from "@/services/api/prompts";
import { useThemeStore } from "@/stores/use-theme-store";

import { CanvasNodeType, type CanvasNodeData } from "../types";
import { isCanvasImageNodeType } from "../utils/canvas-panorama";
import { useCanvasUiStore } from "../stores/use-canvas-ui-store";
import type { InsertAssetPayload } from "../types";
import { CanvasAssetBrowser } from "./canvas-asset-browser";

export { CANVAS_ASSET_DRAG_TYPE } from "./canvas-asset-browser";

const PANEL_MOTION_SECONDS = 0.5;
const PANEL_EASE = [0.22, 1, 0.36, 1] as const;
const PANEL_MIN_WIDTH = 280;
const PANEL_MAX_WIDTH = 480;
const PROMPT_CACHE_TIME = 24 * 60 * 60 * 1000;

type Props = {
    nodes: CanvasNodeData[];
    selectedNodeIds: Set<string>;
    open: boolean;
    width: number;
    onWidthChange: (width: number) => void;
    onClose: () => void;
    onFocusNode: (nodeId: string) => void;
    onAssetDragStart: (payload: InsertAssetPayload) => void;
    onAssetDragEnd: () => void;
    onInsertAsset: (payload: InsertAssetPayload) => void;
};

const NODE_TYPE_ICON = {
    [CanvasNodeType.Image]: ImageIcon,
    [CanvasNodeType.Panorama]: ImageIcon,
    [CanvasNodeType.Video]: Video,
    [CanvasNodeType.Audio]: Music2,
    [CanvasNodeType.Text]: Type,
    [CanvasNodeType.Config]: Settings2,
    [CanvasNodeType.Director]: Clapperboard,
    [CanvasNodeType.Group]: Group,
};

const NODE_TYPE_LABEL = {
    [CanvasNodeType.Image]: "图片",
    [CanvasNodeType.Panorama]: "全景图",
    [CanvasNodeType.Video]: "视频",
    [CanvasNodeType.Audio]: "音频",
    [CanvasNodeType.Text]: "文本",
    [CanvasNodeType.Config]: "生成配置",
    [CanvasNodeType.Director]: "导演台",
    [CanvasNodeType.Group]: "组",
};

const NODE_FILTER_OPTIONS = [
    { label: "全部", value: "all" },
    { label: "图片", value: CanvasNodeType.Image },
    { label: "全景图", value: CanvasNodeType.Panorama },
    { label: "文本", value: CanvasNodeType.Text },
    { label: "配置", value: CanvasNodeType.Config },
    { label: "视频", value: CanvasNodeType.Video },
    { label: "音频", value: CanvasNodeType.Audio },
    { label: "导演台", value: CanvasNodeType.Director },
    { label: "组", value: CanvasNodeType.Group },
];

const STATUS_COLOR: Record<string, string> = {
    success: "#22c55e",
    loading: "#f59e0b",
    error: "#ef4444",
};

export function CanvasSidePanel({ nodes, selectedNodeIds, open, width, onWidthChange, onClose, onFocusNode, onAssetDragStart, onAssetDragEnd, onInsertAsset }: Props) {
    const theme = canvasThemes[useThemeStore((state) => state.theme)];
    const tab = useCanvasUiStore(state => state.sidePanelTab);
    const setTab = useCanvasUiStore(state => state.setSidePanelTab);
    const [mounted, setMounted] = useState(open);
    const [closing, setClosing] = useState(false);
    const [resizing, setResizing] = useState(false);

    useEffect(() => {
        if (open) {
            setMounted(true);
            setClosing(false);
            return;
        }
        setClosing(true);
        const timer = window.setTimeout(() => {
            setMounted(false);
            setClosing(false);
        }, PANEL_MOTION_SECONDS * 1000);
        return () => window.clearTimeout(timer);
    }, [open]);

    const startResize = (event: ReactPointerEvent<HTMLButtonElement>) => {
        event.preventDefault();
        const startX = event.clientX;
        const startWidth = width;
        const onMove = (moveEvent: PointerEvent) => onWidthChange(Math.min(PANEL_MAX_WIDTH, Math.max(PANEL_MIN_WIDTH, startWidth + moveEvent.clientX - startX)));
        const onUp = () => {
            window.removeEventListener("pointermove", onMove);
            window.removeEventListener("pointerup", onUp);
            setResizing(false);
        };
        setResizing(true);
        window.addEventListener("pointermove", onMove);
        window.addEventListener("pointerup", onUp);
    };

    if (!mounted) return null;

    return (
        <motion.div
            className="absolute bottom-[92px] left-3 top-[72px] z-[60] flex"
            initial={{ width: 0, opacity: 0 }}
            animate={{ width: open ? width + 1 : 0, opacity: open ? 1 : 0 }}
            transition={{ duration: resizing ? 0 : PANEL_MOTION_SECONDS, ease: PANEL_EASE }}
            style={{ pointerEvents: closing ? "none" : undefined }}
        >
            <motion.aside
                className="relative flex h-full shrink-0 flex-col overflow-hidden rounded-[22px] border shadow-xl"
                initial={{ x: -48 }}
                animate={{ x: closing ? -28 : 0 }}
                transition={{ duration: resizing ? 0 : PANEL_MOTION_SECONDS, ease: PANEL_EASE }}
                style={{ width, maxWidth: "calc(100vw - 24px)", background: theme.node.panel, borderColor: theme.toolbar.border, color: theme.node.text }}
                aria-label="画布资源面板"
                data-canvas-no-zoom
            >
                <div className="flex h-[72px] shrink-0 items-center gap-2 px-4">
                    <button type="button" onClick={onClose} aria-label="收起资源面板" className="grid size-7 shrink-0 place-items-center rounded-lg opacity-60 transition hover:opacity-100 focus-visible:outline focus-visible:outline-2"><ChevronLeft className="size-4" /></button>
                    <h2 className="min-w-0 flex-1 text-xl font-semibold tracking-tight">{tab === "assets" ? "素材库" : tab === "canvas" ? "画布图层" : "提示词库"}</h2>
                    {tab === "assets" ? <button type="button" aria-label="新增素材" title="新增素材" onClick={() => useCanvasUiStore.setState({ assetSource: "mine", assetFormOpen: true })} className="grid size-9 shrink-0 place-items-center rounded-xl transition hover:opacity-80" style={{ background: theme.node.fill }}><Plus className="size-5" /></button> : null}
                </div>
                <div className="min-h-0 flex-1 overflow-hidden">
                    {tab === "canvas" ? (
                        <CanvasNodesTab nodes={nodes} selectedNodeIds={selectedNodeIds} onFocusNode={onFocusNode} theme={theme} />
                    ) : tab === "assets" ? (
                        <CanvasAssetBrowser theme={theme} onAssetDragStart={onAssetDragStart} onAssetDragEnd={onAssetDragEnd} onInsert={onInsertAsset} />
                    ) : (
                        <CanvasPromptsTab theme={theme} onInsert={onInsertAsset} />
                    )}
                </div>
                <nav aria-label="资源面板导航" className="flex h-10 shrink-0 items-center gap-1 px-4 pb-1">
                    <PanelTabButton label="素材" active={tab === "assets"} theme={theme} onClick={() => setTab("assets")} />
                    <PanelTabButton label="图层" active={tab === "canvas"} theme={theme} onClick={() => setTab("canvas")} />
                    <PanelTabButton label="提示词库" active={tab === "prompts"} theme={theme} onClick={() => setTab("prompts")} />
                </nav>
                <button type="button" className="absolute inset-y-0 right-0 z-40 w-4 translate-x-1/2 cursor-col-resize" onPointerDown={startResize} aria-label="调整左侧面板宽度" />
            </motion.aside>
        </motion.div>
    );
}

function PanelTabButton({ label, active, theme, onClick }: { label: string; active: boolean; theme: CanvasTheme; onClick: () => void }) {
    return (
        <button type="button" onClick={onClick} aria-pressed={active} className="flex-1 rounded-lg py-1.5 text-[11px] transition-opacity hover:opacity-100" style={{ color: theme.node.text, opacity: active ? 0.9 : 0.45 }}>
            {label}
        </button>
    );
}

function CanvasNodesTab({ nodes, selectedNodeIds, onFocusNode, theme }: { nodes: CanvasNodeData[]; selectedNodeIds: Set<string>; onFocusNode: (nodeId: string) => void; theme: CanvasTheme }) {
    const [keyword, setKeyword] = useState("");
    const [typeFilter, setTypeFilter] = useState<string>("all");
    const [collapsedGroups, setCollapsedGroups] = useState<Set<string>>(new Set());
    const rowRefs = useRef<Record<string, HTMLButtonElement | null>>({});

    const filtered = useMemo(() => {
        const query = keyword.trim().toLowerCase();
        return nodes.filter((node) => {
            if (typeFilter !== "all" && node.type !== typeFilter) return false;
            return !query || [node.title, NODE_TYPE_LABEL[node.type], node.metadata?.content, node.metadata?.prompt].filter(Boolean).join(" ").toLowerCase().includes(query);
        });
    }, [keyword, nodes, typeFilter]);
    const treeRows = useMemo(() => {
        const filteredIds = new Set(filtered.map((node) => node.id));
        const groups = new Set(nodes.filter((node) => node.type === CanvasNodeType.Group).map((node) => node.id));
        const children = new Map<string, CanvasNodeData[]>();
        filtered.forEach((node) => {
            const groupId = node.metadata?.groupId;
            if (groupId && groups.has(groupId)) children.set(groupId, [...(children.get(groupId) || []), node]);
        });
        return nodes.flatMap((node) => {
            if (node.metadata?.groupId && groups.has(node.metadata.groupId)) return [];
            if (node.type !== CanvasNodeType.Group) return filteredIds.has(node.id) ? [{ node, depth: 0, hasChildren: false }] : [];
            const groupChildren = children.get(node.id) || [];
            if (!filteredIds.has(node.id) && !groupChildren.length) return [];
            return [{ node, depth: 0, hasChildren: groupChildren.length > 0 }, ...(collapsedGroups.has(node.id) ? [] : groupChildren.map((child) => ({ node: child, depth: 1, hasChildren: false })))];
        });
    }, [collapsedGroups, filtered, nodes]);

    useEffect(() => {
        const selectedId = Array.from(selectedNodeIds)[0];
        if (selectedId) rowRefs.current[selectedId]?.scrollIntoView({ block: "nearest", behavior: "smooth" });
    }, [selectedNodeIds]);

    return (
        <div className="flex h-full flex-col">
            <div className="flex items-center gap-2 px-3 pb-2.5 pt-1">
                <span className="text-xs font-medium opacity-60">画布元素</span>
                <span className="text-xs opacity-35">{nodes.length}</span>
                <Select size="small" variant="borderless" className="w-auto" popupMatchSelectWidth={false} value={typeFilter} onChange={setTypeFilter} options={NODE_FILTER_OPTIONS} />
            </div>
            <div className="px-3 pb-2.5">
                <Input size="small" allowClear prefix={<Search className="size-3.5 text-stone-400" />} placeholder="搜索节点" value={keyword} onChange={(event) => setKeyword(event.target.value)} />
            </div>
            <div className="min-h-0 flex-1 overflow-y-auto px-2 pb-3">
                {treeRows.length ? (
                    <div className="space-y-1.5">
                        {treeRows.map(({ node, depth, hasChildren }) => {
                            const Icon = NODE_TYPE_ICON[node.type] || FileText;
                            const hasImage = isCanvasImageNodeType(node.type) && node.metadata?.content;
                            const active = selectedNodeIds.has(node.id);
                            return (
                                <div key={node.id} className={cn("relative flex items-center rounded-lg transition", depth && "ml-5", active ? "" : "hover:bg-black/5 dark:hover:bg-white/5")} style={active ? { background: theme.toolbar.activeBg } : undefined}>
                                    {depth ? <span className="pointer-events-none absolute -left-3 top-[calc(-50%-0.4rem)] h-[calc(100%+0.4rem)] w-3 rounded-bl-md border-b border-l opacity-45" style={{ borderColor: theme.node.stroke }} /> : null}
                                    {node.type === CanvasNodeType.Group && hasChildren ? (
                                        <button type="button" onClick={() => setCollapsedGroups((current) => (current.has(node.id) ? new Set([...current].filter((id) => id !== node.id)) : new Set(current).add(node.id)))} className="ml-1 grid size-6 shrink-0 place-items-center opacity-55 transition hover:opacity-100" aria-label={node.title}>
                                            <ChevronRight className={cn("size-3.5 transition-transform", !collapsedGroups.has(node.id) && "rotate-90")} />
                                        </button>
                                    ) : null}
                                    <button
                                        ref={(element) => {
                                            rowRefs.current[node.id] = element;
                                        }}
                                        type="button"
                                        onClick={() => onFocusNode(node.id)}
                                        className={cn("flex min-w-0 flex-1 items-center gap-3 py-2 pr-2 text-left", node.type === CanvasNodeType.Group && hasChildren ? "pl-0" : "pl-2")}
                                    >
                                        <span className="grid size-10 shrink-0 place-items-center overflow-hidden rounded-md">
                                            {hasImage ? <img src={node.metadata?.content} alt={node.title} className="size-full object-cover" /> : <Icon className="size-5 opacity-60" />}
                                        </span>
                                        <span className="min-w-0 flex-1 space-y-0.5">
                                            <span className="block truncate text-sm font-medium leading-snug">{node.title || NODE_TYPE_LABEL[node.type] || "未命名节点"}</span>
                                            <span className="block truncate text-xs leading-snug opacity-50">{node.type === CanvasNodeType.Text ? node.metadata?.content || node.metadata?.prompt || "" : NODE_TYPE_LABEL[node.type] || node.type}</span>
                                        </span>
                                        {node.metadata?.status && node.metadata.status !== "idle" ? <span className="size-1.5 shrink-0 rounded-full" style={{ background: STATUS_COLOR[node.metadata.status] || "transparent" }} /> : null}
                                    </button>
                                </div>
                            );
                        })}
                    </div>
                ) : (
                    <div className="pt-16 text-center text-sm opacity-40">{nodes.length ? "无匹配节点" : "画布暂无节点"}</div>
                )}
            </div>
        </div>
    );
}


const CanvasPromptsTab = memo(function CanvasPromptsTab({ theme, onInsert }: { theme: CanvasTheme; onInsert: (payload: InsertAssetPayload) => void }) {
    const copyText = useCopyText();
    const [keyword, setKeyword] = useState("");
    const [expanded, setExpanded] = useState<Record<string, boolean>>({ system: true });
    const [detail, setDetail] = useState<Prompt | null>(null);
    const categoryQuery = useQuery({
        queryKey: ["canvas-side-prompt-categories"],
        queryFn: () => fetchPrompts({ page: 1, pageSize: 1 }),
        retry: false,
    });
    const categories = useMemo(() => ["system", ...(categoryQuery.data?.categories.filter((category) => category !== "system") || [])], [categoryQuery.data?.categories]);

    return (
        <div className="flex h-full flex-col">
            <div className="px-3 pb-2.5 pt-1">
                <Input size="small" allowClear prefix={<Search className="size-3.5 text-stone-400" />} placeholder="搜索提示词" value={keyword} onChange={(event) => setKeyword(event.target.value)} />
            </div>
            <div className="min-h-0 flex-1 overflow-y-auto px-2 pb-3">
                {categoryQuery.isLoading ? <div className="flex justify-center pt-16"><Spin size="small" /></div> : (
                    <div className="space-y-2">
                        {categories.map((category) => {
                            const opened = Boolean(expanded[category]) || Boolean(keyword.trim());
                            return <PromptGroup key={category} category={category} keyword={keyword} open={opened} theme={theme} onToggle={() => setExpanded((current) => ({ ...current, [category]: !current[category] }))} onView={setDetail} onInsert={onInsert} />;
                        })}
                    </div>
                )}
            </div>
            <PromptDetailDialog prompt={detail} onClose={() => setDetail(null)} onCopy={(prompt) => copyText(prompt, "已复制提示词")} />
        </div>
    );
});

async function fetchPromptCategory(category: string) {
    const first = await fetchPrompts({ category, page: 1, pageSize: 500 });
    if (first.total <= first.items.length) return first.items;

    const pages = await Promise.all(
        Array.from(
            { length: Math.ceil(first.total / 500) - 1 },
            (_, index) => fetchPrompts({ category, page: index + 2, pageSize: 500 }),
        ),
    );

    return [...first.items, ...pages.flatMap((page) => page.items)];
}

function PromptGroup({ category, keyword, open, theme, onToggle, onView, onInsert }: { category: string; keyword: string; open: boolean; theme: CanvasTheme; onToggle: () => void; onView: (prompt: Prompt) => void; onInsert: (payload: InsertAssetPayload) => void }) {
    const label = category === "system" ? "系统提示词" : category;
    const query = useQuery({
        queryKey: ["canvas-side-prompt-category", category],
        queryFn: () => fetchPromptCategory(category),
        enabled: open,
        staleTime: PROMPT_CACHE_TIME,
        gcTime: PROMPT_CACHE_TIME,
        retry: false,
    });
    const items = useMemo(() => {
        const queryText = keyword.trim().toLowerCase();
        const cachedItems = query.data || [];
        return queryText ? cachedItems.filter((item) => [item.title, item.prompt].join(" ").toLowerCase().includes(queryText)) : cachedItems;
    }, [keyword, query.data]);
    return (
        <div>
            <button type="button" onClick={onToggle} className="flex w-full items-center gap-1.5 rounded-md px-1.5 py-1.5 text-left text-xs font-semibold opacity-75 transition hover:opacity-100">
                <ChevronRight className={cn("size-3.5 transition-transform", open && "rotate-90")} />
                <BookOpen className="size-3.5" />
                <span className="min-w-0 flex-1 truncate">{label}</span>
                {query.isSuccess && (category === "system" || open) ? <span className="opacity-50">{items.length}</span> : null}
            </button>
            {open ? (
                <div className="space-y-1.5 px-1 pb-2 pt-1">
                    {query.isLoading ? <div className="flex justify-center py-6"><Spin size="small" /></div> : query.isError ? (
                        <button type="button" onClick={() => void query.refetch()} className="block w-full py-4 text-center text-xs text-red-500 opacity-80 transition hover:opacity-100">
                            加载失败，点击重试
                        </button>
                    ) : items.length ? (
                        items.map((item) => <PromptRow key={item.id} item={item} theme={theme} onView={() => onView(item)} onInsert={() => onInsert({ kind: "text", content: item.prompt, title: item.title })} />)
                    ) : (
                        <div className="py-4 text-center text-xs opacity-40">{category === "system" ? "暂无提示词" : "该分类暂无提示词"}</div>
                    )}
                </div>
            ) : null}
        </div>
    );
}

function PromptRow({ item, theme, onView, onInsert }: { item: Prompt; theme: CanvasTheme; onView: () => void; onInsert: () => void }) {
    return (
        <div className="group relative flex items-center gap-2.5 rounded-lg px-2 py-2 transition hover:bg-black/5 dark:hover:bg-white/5">
            {item.coverUrl ? <img src={item.coverUrl} alt="" className="size-10 shrink-0 rounded-md object-cover" loading="lazy" /> : <span className="grid size-10 shrink-0 place-items-center rounded-md" style={{ background: theme.node.panel }}><FileText className="size-4 opacity-50" /></span>}
            <button type="button" onClick={onView} className="min-w-0 flex-1 text-left">
                <span className="block truncate text-sm font-medium leading-snug">{item.title}</span>
                <span className="mt-0.5 block truncate text-xs leading-snug opacity-50">{item.prompt}</span>
            </button>
            <div className="flex shrink-0 flex-col items-center gap-0.5">
                <button type="button" onClick={onView} className="grid size-6 place-items-center rounded-md opacity-60 transition hover:bg-black/10 hover:opacity-100 dark:hover:bg-white/10" aria-label="查看详情"><Eye className="size-3.5" /></button>
                <button type="button" onClick={onInsert} className="grid size-6 place-items-center rounded-md opacity-60 transition hover:bg-black/10 hover:opacity-100 dark:hover:bg-white/10" style={{ color: theme.toolbar.activeText }} aria-label="插入画布"><Plus className="size-3.5" /></button>
            </div>
        </div>
    );
}
