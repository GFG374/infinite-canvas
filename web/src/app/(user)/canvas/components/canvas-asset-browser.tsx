"use client";

import { useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { useQuery } from "@tanstack/react-query";
import { Pagination, Select } from "antd";
import { ChevronRight, FileText, ImageIcon, Library, Music2, Search, SlidersHorizontal, Video, X } from "lucide-react";

import { AssetFormModal } from "@/components/assets/asset-form-modal";
import type { CanvasTheme } from "@/lib/canvas-theme";
import { fetchAssetLibrary, type AssetLibraryItem } from "@/services/api/assets";
import { useAssetStore, type Asset } from "@/stores/use-asset-store";
import { useCanvasUiStore } from "../stores/use-canvas-ui-store";
import type { InsertAssetPayload } from "../types";

export const CANVAS_ASSET_DRAG_TYPE = "application/x-infinite-canvas-asset";
const PAGE_SIZE = 12;
const DEFAULT_CATEGORIES = ["角色", "场景", "道具", "风格", "音效"];
const TYPES = [{ value: "", label: "全部" }, { value: "image", label: "图片" }, { value: "video", label: "视频" }, { value: "audio", label: "音频" }, { value: "text", label: "文本" }];
type AssetActions = {
    onInsert: (payload: InsertAssetPayload) => void;
    onAssetDragStart: (payload: InsertAssetPayload) => void;
    onAssetDragEnd: () => void;
};
type AssetFilters = { keyword: string; type: string; tags: string[] };

export function CanvasAssetBrowser({ theme, ...actions }: { theme: CanvasTheme } & AssetActions) {
    const source = useCanvasUiStore(state => state.assetSource);
    const setSource = useCanvasUiStore(state => state.setAssetSource);
    const formOpen = useCanvasUiStore(state => state.assetFormOpen);
    const setFormOpen = useCanvasUiStore(state => state.setAssetFormOpen);
    const [filters, setFilters] = useState<AssetFilters>({ keyword: "", type: "", tags: [] });
    const assets = useAssetStore(state => state.assets);
    const localTags = useMemo(() => [...new Set(assets.flatMap(asset => asset.tags || []))], [assets]);
    const publicMetadata = useQuery({ queryKey: ["canvas-public-asset-folders"], queryFn: () => fetchAssetLibrary({ page: 1, pageSize: 1 }), enabled: source === "library", retry: false });
    const availableTags = source === "mine" ? localTags : publicMetadata.data?.tags || [];
    return (
        <div className="flex h-full min-h-0 flex-col">
            <div role="group" aria-label="素材来源" className="mx-4 mb-3 flex h-10 shrink-0 rounded-full border p-1" style={{ background: theme.node.fill, borderColor: theme.node.stroke }}>
                {[{ value: "mine" as const, label: "个人" }, { value: "library" as const, label: "公共" }].map(item => (
                    <button key={item.value} type="button" aria-pressed={source === item.value} onClick={() => { if (source !== item.value) { setSource(item.value); setFilters(current => ({ ...current, tags: [] })); } }} className="min-w-0 flex-1 rounded-full text-sm font-semibold transition-colors" style={{ background: source === item.value ? theme.toolbar.activeBg : "transparent", color: source === item.value ? theme.node.text : theme.node.label }}>{item.label}</button>
                ))}
            </div>
            <div className="mx-4 mb-3 flex h-9 shrink-0 items-center gap-2 rounded-full border px-3" style={{ borderColor: theme.node.stroke }}>
                <Search className="size-4 shrink-0" style={{ color: theme.node.faint }} />
                <input type="search" aria-label="搜索素材" placeholder="搜索" value={filters.keyword} onChange={event => setFilters(current => ({ ...current, keyword: event.target.value }))} className="min-w-0 flex-1 bg-transparent text-sm outline-none" />
                {filters.keyword ? <button type="button" aria-label="清空素材搜索" onClick={() => setFilters(current => ({ ...current, keyword: "" }))} className="grid size-5 place-items-center"><X className="size-3" /></button> : null}
                <details className="relative shrink-0">
                    <summary aria-label="筛选素材" title="筛选素材" className="cursor-pointer list-none [&::-webkit-details-marker]:hidden" style={{ display: "flex", color: filters.type || filters.tags.length ? theme.node.text : theme.node.label }}><SlidersHorizontal className="size-3.5" /></summary>
                    <div className="absolute right-0 top-7 z-30 w-56 overflow-y-auto rounded-xl border p-3 shadow-xl" style={{ background: theme.node.panel, borderColor: theme.node.stroke, maxHeight: "max(72px, calc(100dvh - 350px))" }}>
                        <p className="mb-2 text-xs" style={{ color: theme.node.label }}>素材类型</p>
                        <div role="group" aria-label="素材类型" className="grid grid-cols-3 gap-1">
                            {TYPES.map(item => <button key={item.value} type="button" aria-pressed={filters.type === item.value} onClick={() => setFilters(current => ({ ...current, type: item.value }))} className="rounded-lg py-1.5 text-xs" style={{ background: filters.type === item.value ? theme.toolbar.activeBg : theme.node.fill }}>{item.label}</button>)}
                        </div>
                        {availableTags.length ? <Select mode="multiple" size="small" className="mt-3 w-full" aria-label="按素材标签筛选" value={filters.tags} placeholder="按标签筛选" allowClear maxTagCount={1} onChange={tags => setFilters(current => ({ ...current, tags }))} options={availableTags.map(tag => ({ label: tag, value: tag }))} /> : null}
                    </div>
                </details>
            </div>
            {source === "library" && publicMetadata.isLoading ? <p className="mx-5 mb-2 text-xs" style={{ color: theme.node.faint }}>正在加载分类…</p> : null}
            {source === "library" && publicMetadata.isError ? <button type="button" onClick={() => void publicMetadata.refetch()} className="mx-5 mb-2 text-left text-xs" style={{ color: theme.node.label }}>分类加载失败，点击重试</button> : null}
            {source === "mine" ? <MyAssets theme={theme} filters={filters} {...actions} /> : <PublicAssets theme={theme} filters={filters} categories={publicMetadata.data?.categories || []} {...actions} />}
            <AssetFormModal open={formOpen} onClose={() => setFormOpen(false)} />
        </div>
    );
}

function FolderIcon({ theme }: { theme: CanvasTheme }) {
    return <span aria-hidden="true" className="relative block h-5 w-6 shrink-0"><span className="absolute left-0.5 top-0 h-2 w-3 rounded-t-[3px]" style={{ background: theme.node.faint }} /><span className="absolute inset-x-0 bottom-0 top-[3px] rounded-[3px] border" style={{ background: "linear-gradient(120deg, " + theme.node.muted + ", " + theme.node.faint + " 55%, " + theme.node.stroke + ")", borderColor: theme.node.faint, boxShadow: "inset 0 1px 2px " + theme.node.muted }} /></span>;
}

function AssetFolders({ theme, folders, searching, allContent, renderFolder }: {
    theme: CanvasTheme; folders: string[]; searching: boolean; allContent: ReactNode; renderFolder: (folder: string) => ReactNode;
}) {
    const [expanded, setExpanded] = useState<Set<string>>(() => new Set(["角色"]));
    const [showAll, setShowAll] = useState(false);
    return (
        <div role="region" aria-label="素材内容" className="min-h-0 flex-1 overflow-y-auto px-4 pb-4">
            <button type="button" aria-pressed={showAll} onClick={() => setShowAll(current => !current)} className="mb-3 flex h-9 w-full items-center gap-3 rounded-lg px-1.5 text-left text-sm font-medium" style={{ color: showAll ? theme.node.text : theme.node.label }}><Library className="size-4" />全部素材</button>
            {showAll || searching ? <div className="pb-4">{allContent}</div> : null}
            {!searching ? <>
                <div className="mb-4 border-t" style={{ borderColor: theme.node.stroke }} />
                <p className="mb-2 px-1.5 text-xs font-medium" style={{ color: theme.node.faint }}>文件夹</p>
                <div className="space-y-1">
                    {folders.map(folder => {
                        const open = !showAll && expanded.has(folder);
                        return <div key={folder}>
                            <button type="button" aria-label={folder} aria-expanded={open} onClick={() => { setShowAll(false); setExpanded(current => { const next = new Set(current); !showAll && next.has(folder) ? next.delete(folder) : next.add(folder); return next; }); }} className="flex h-9 w-full items-center gap-3 rounded-lg px-1.5 text-left transition-opacity hover:opacity-80" style={{ color: open ? theme.node.text : theme.node.label }}>
                                <ChevronRight className={"size-3.5 shrink-0 transition-transform " + (open ? "rotate-90" : "")} />
                                <FolderIcon theme={theme} /><span className={"truncate text-sm " + (open ? "font-semibold" : "font-medium")}>{folder}</span>
                            </button>
                            {open ? <div className="pb-2 pl-10 pr-1 pt-1">{renderFolder(folder)}</div> : null}
                        </div>;
                    })}
                </div>
            </> : null}
        </div>
    );
}

function MyAssets({ theme, filters, ...actions }: { theme: CanvasTheme; filters: AssetFilters } & AssetActions) {
    const assets = useAssetStore(state => state.assets);
    const folders = useMemo(() => [...new Set([...DEFAULT_CATEGORIES, ...assets.map(asset => asset.category?.trim() || "其他"), "其他"])], [assets]);
    const filtered = useMemo(() => {
        const search = filters.keyword.trim().toLowerCase();
        return assets.filter(asset => (!filters.type || asset.kind === filters.type) && (!filters.tags.length || filters.tags.some(tag => asset.tags.includes(tag))) && (!search || [asset.title, asset.category || "", ...asset.tags].join(" ").toLowerCase().includes(search)));
    }, [assets, filters]);
    return <AssetFolders theme={theme} folders={folders} searching={Boolean(filters.keyword.trim())} allContent={<LocalAssetGrid theme={theme} items={filtered} {...actions} />} renderFolder={folder => <LocalAssetGrid theme={theme} items={filtered.filter(asset => (asset.category?.trim() || "其他") === folder)} {...actions} />} />;
}

function LocalAssetGrid({ theme, items, ...actions }: { theme: CanvasTheme; items: Asset[] } & AssetActions) {
    const [page, setPage] = useState(1);
    const signature = items.map(asset => asset.id).join(",");
    useEffect(() => setPage(1), [signature]);
    if (!items.length) return <p className="py-1.5 text-xs leading-5" style={{ color: theme.node.faint }}>该文件夹暂无素材</p>;
    return <>
        <div className="grid grid-cols-2 gap-2">{items.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE).map(asset => <AssetCard key={asset.id} theme={theme} title={asset.title} payload={assetPayload(asset)} cover={asset.coverUrl || (asset.kind === "image" ? asset.data.dataUrl : "")} mediaUrl={asset.kind === "video" ? asset.data.url : ""} text={asset.kind === "text" ? asset.data.content : ""} {...actions} />)}</div>
        {items.length > PAGE_SIZE ? <Pagination className="!mt-3 flex justify-center" size="small" current={page} pageSize={PAGE_SIZE} total={items.length} showSizeChanger={false} onChange={setPage} /> : null}
    </>;
}

function PublicAssets({ theme, filters, categories, ...actions }: { theme: CanvasTheme; filters: AssetFilters; categories: string[] } & AssetActions) {
    const folders = useMemo(() => [...new Set([...DEFAULT_CATEGORIES, ...categories.filter(Boolean)])], [categories]);
    return <AssetFolders theme={theme} folders={folders} searching={Boolean(filters.keyword.trim())} allContent={<PublicAssetGrid theme={theme} filters={filters} {...actions} />} renderFolder={category => <PublicAssetGrid theme={theme} filters={filters} category={category} {...actions} />} />;
}

function PublicAssetGrid({ theme, filters, category, ...actions }: { theme: CanvasTheme; filters: AssetFilters; category?: string } & AssetActions) {
    const [page, setPage] = useState(1);
    const query = useQuery({
        queryKey: ["canvas-public-assets", category, filters.keyword, filters.type, filters.tags, page],
        queryFn: () => fetchAssetLibrary({ category, keyword: filters.keyword, type: filters.type, tag: filters.tags, page, pageSize: PAGE_SIZE }),
        retry: false,
    });
    useEffect(() => setPage(1), [category, filters.keyword, filters.type, filters.tags]);
    if (query.isLoading) return <div aria-label="正在加载素材" className="h-16 animate-pulse rounded-lg motion-reduce:animate-none" style={{ background: theme.node.fill }} />;
    if (query.isError) return <button type="button" onClick={() => void query.refetch()} className="py-2 text-xs" style={{ color: theme.node.label }}>加载失败，点击重试</button>;
    const items = query.data?.items || [];
    if (!items.length) return <p className="py-1.5 text-xs leading-5" style={{ color: theme.node.faint }}>该文件夹暂无素材</p>;
    return <>
        <div className="grid grid-cols-2 gap-2">{items.map(asset => <AssetCard key={asset.id} theme={theme} title={asset.title} payload={libraryPayload(asset)} cover={asset.coverUrl || (asset.type === "image" ? asset.url : "")} mediaUrl={asset.type === "video" ? asset.url : ""} text={asset.content || asset.description} {...actions} />)}</div>
        {(query.data?.total || 0) > PAGE_SIZE ? <Pagination className="!mt-3 flex justify-center" size="small" current={page} pageSize={PAGE_SIZE} total={query.data?.total} showSizeChanger={false} onChange={setPage} /> : null}
    </>;
}

function AssetCard({ theme, title, payload, cover, mediaUrl, text, onInsert, onAssetDragStart, onAssetDragEnd }: {
    theme: CanvasTheme; title: string; payload: InsertAssetPayload; cover: string; mediaUrl: string; text: string;
} & AssetActions) {
    const [failed, setFailed] = useState(false);
    const dragging = useRef(false);
    const kind = payload.kind;
    const Icon = kind === "audio" ? Music2 : kind === "video" ? Video : kind === "image" ? ImageIcon : FileText;
    useEffect(() => setFailed(false), [cover, mediaUrl]);
    return (
        <button type="button" draggable aria-label={"插入素材：" + title} title={title + " · 点击插入，或拖到画布"} onClick={() => { if (!dragging.current) onInsert(payload); }}
            onDragStart={event => { dragging.current = true; event.dataTransfer.setData(CANVAS_ASSET_DRAG_TYPE, "asset"); event.dataTransfer.effectAllowed = "copy"; onAssetDragStart(payload); }}
            onDragEnd={() => { dragging.current = false; onAssetDragEnd(); }}
            className="group min-w-0 cursor-grab overflow-hidden rounded-lg border text-left transition-[border-color,transform] duration-150 hover:-translate-y-0.5 focus-visible:outline focus-visible:outline-2 active:cursor-grabbing motion-reduce:transform-none"
            style={{ borderColor: theme.node.stroke, background: theme.node.fill }}>
            <div className="relative aspect-[4/3] overflow-hidden">
                {cover && !failed ? <img src={cover} alt={title} loading="lazy" draggable={false} onError={() => setFailed(true)} className="size-full object-cover" /> : kind === "video" && mediaUrl && !failed ? <video src={mediaUrl + "#t=0.1"} muted playsInline preload="metadata" onError={() => setFailed(true)} className="size-full object-cover" /> : kind === "text" ? <div className="line-clamp-4 whitespace-pre-wrap break-words p-2 text-[10px] leading-4" style={{ color: theme.node.label }}>{text}</div> : <span className="grid size-full place-items-center" style={{ color: theme.node.label }}><Icon className="size-6" strokeWidth={1.25} /></span>}
                <span className="absolute bottom-1 left-1 grid size-5 place-items-center rounded" style={{ color: theme.node.text, background: theme.toolbar.panel }}><Icon className="size-3" /></span>
            </div>
            <span className="block truncate px-2 py-2 text-[10px] font-medium">{title || "未命名素材"}</span>
        </button>
    );
}

function assetPayload(asset: Asset): InsertAssetPayload {
    if (asset.kind === "text") return { kind: "text", content: asset.data.content, title: asset.title, assetId: asset.id, source: "asset" };
    if (asset.kind === "image") return { kind: "image", dataUrl: asset.data.dataUrl, storageKey: asset.data.storageKey, title: asset.title, assetId: asset.id, width: asset.data.width, height: asset.data.height, bytes: asset.data.bytes, mimeType: asset.data.mimeType, source: "asset" };
    if (asset.kind === "video") return { kind: "video", url: asset.data.url, storageKey: asset.data.storageKey, title: asset.title, assetId: asset.id, width: asset.data.width, height: asset.data.height, bytes: asset.data.bytes, mimeType: asset.data.mimeType, source: "asset" };
    return { kind: "audio", url: asset.data.url, storageKey: asset.data.storageKey, title: asset.title, assetId: asset.id, bytes: asset.data.bytes, mimeType: asset.data.mimeType, durationMs: asset.data.durationMs, source: "asset" };
}

function libraryPayload(asset: AssetLibraryItem): InsertAssetPayload {
    if (asset.type === "text") return { kind: "text", content: asset.content, title: asset.title, assetId: asset.id, source: "library" };
    if (asset.type === "image") return { kind: "image", dataUrl: asset.url, title: asset.title, assetId: asset.id, source: "library" };
    if (asset.type === "video") return { kind: "video", url: asset.url, title: asset.title, assetId: asset.id, source: "library" };
    return { kind: "audio", url: asset.url, title: asset.title, assetId: asset.id, source: "library" };
}
