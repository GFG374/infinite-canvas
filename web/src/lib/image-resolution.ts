// 分辨率档位与画布/image-settings-panel 的宽高比选项保持一致：界面选了什么档位，就发对应像素尺寸。
const RATIO_SIZE_PRESETS: Record<string, Record<string, string>> = {
    "1k": {
        "1:1": "1024x1024",
        "3:2": "1536x1024",
        "2:3": "1024x1536",
        "4:3": "1024x768",
        "3:4": "768x1024",
        "16:9": "1920x1080",
        "9:16": "1080x1920",
        "21:9": "1568x672",
    },
    "2k": {
        "1:1": "2048x2048",
        "16:9": "2048x1152",
        "9:16": "1152x2048",
        "21:9": "3136x1344",
    },
    "4k": {
        "1:1": "3840x3840",
        "16:9": "3840x2160",
        "9:16": "2160x3840",
        "21:9": "6272x2688",
    },
};

const SHORT_SIDE: Record<string, number> = { "1k": 1024, "2k": 2048, "4k": 2688 };

export const imageResolutionOptions = [
    { value: "auto", label: "自动" },
    { value: "1k", label: "1K" },
    { value: "2k", label: "2K" },
    { value: "4k", label: "4K" },
] as const;

export type ImageResolution = (typeof imageResolutionOptions)[number]["value"];

function gcd(a: number, b: number) {
    a = Math.round(a);
    b = Math.round(b);
    while (b) {
        const remainder = a % b;
        a = b;
        b = remainder;
    }
    return a || 1;
}

function ratioOf(size: string) {
    const value = size.trim();
    if (!value || value === "auto") return null;
    const match = value.match(/^(\d+)x(\d+)$/);
    if (!match) return value.includes(":") ? value : null;
    const width = Number(match[1]);
    const height = Number(match[2]);
    if (!width || !height) return null;
    const divisor = gcd(width, height);
    return `${width / divisor}:${height / divisor}`;
}

function alignToStep(value: number) {
    return Math.max(16, Math.round(value / 16) * 16);
}

function sizeForRatio(ratio: string, resolution: Exclude<ImageResolution, "auto">) {
    const preset = RATIO_SIZE_PRESETS[resolution]?.[ratio];
    if (preset) return preset;
    const parts = ratio.split(":");
    const w = Number(parts[0]) || 1;
    const h = Number(parts[1]) || 1;
    const shortSide = SHORT_SIDE[resolution];
    const longSide = alignToStep((shortSide * Math.max(w, h)) / Math.min(w, h));
    return w >= h ? `${longSide}x${shortSide}` : `${shortSide}x${longSide}`;
}

/** 从当前尺寸推断分辨率档位；"auto" 视为自动。 */
export function inferImageResolution(size: string): ImageResolution {
    const value = size.trim().toLowerCase();
    if (!value || value === "auto") return "auto";
    const ratio = ratioOf(value);
    if (!ratio) return "1k";
    const match = value.match(/^(\d+)x(\d+)$/);
    const edge = match ? Math.max(Number(match[1]), Number(match[2])) : Number(sizeForRatio(ratio, "1k").split("x")[0]);
    if (edge <= 1280) return "1k";
    if (edge <= 2560) return "2k";
    return "4k";
}

/** 按档位换算尺寸，保留当前宽高比。 */
export function applyImageResolution(size: string, resolution: ImageResolution) {
    if (resolution === "auto") return "auto";
    const ratio = ratioOf(size) || "1:1";
    return sizeForRatio(ratio, resolution);
}
