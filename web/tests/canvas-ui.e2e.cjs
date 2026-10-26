const assert = require('node:assert/strict');
const { test, before, after } = require('node:test');
const { chromium } = require(process.env.PLAYWRIGHT_MODULE || 'playwright');

const base = process.env.CANVAS_URL || 'http://127.0.0.1:3310';
let browser;
before(async () => { browser = await chromium.launch({ channel: 'chrome', headless: true }); });
after(async () => { await browser?.close(); });

async function canvasPage() {
    const context = await browser.newContext({ viewport: { width: 1440, height: 960 } });
    const page = await context.newPage();
    page.setDefaultTimeout(30000);
    page.on('pageerror', error => console.error('Browser error:', error.stack || error.message));
    const response = await page.goto(`${base}/canvas`, { waitUntil: 'domcontentloaded', timeout: 120000 });
    // Next's dev server can race a manifest write on the first cold request.
    // Retry that HTTP failure once; interaction failures still fail normally.
    if (response?.status() >= 500) await page.reload({ waitUntil: 'domcontentloaded', timeout: 120000 });
    await page.getByRole('button', { name: '新建画布', exact: true }).first().click({ timeout: 60000 });
    await page.waitForURL(/\/canvas\/[^/]+$/, { timeout: 120000 });
    await page.getByRole('button', { name: '素材库', exact: true }).waitFor();
    await page.waitForFunction(() => {
        const panel = document.querySelector('aside[aria-label="画布资源面板"]');
        return panel && panel.parentElement.getBoundingClientRect().width >= panel.getBoundingClientRect().width;
    });
    return { context, page };
}

test('blank canvas right-click creates a text node and keeps its menu within the viewport', { timeout: 180000 }, async () => {
    const { context, page } = await canvasPage();
    try {
        await page.mouse.click(1390, 780, { button: 'right' });
        const menu = page.getByRole('menu', { name: '添加节点', exact: true });
        await menu.waitFor({ timeout: 4000 });
        const bounds = await menu.boundingBox();
        assert.ok(bounds.x >= 0 && bounds.y >= 0 && bounds.x + bounds.width <= 1440 && bounds.y + bounds.height <= 960);
        await menu.getByRole('menuitem', { name: '文本生成', exact: true }).click();
        await page.locator('[data-node-id]').first().waitFor();
        const node = await page.locator('[data-node-id]').first().boundingBox();
        assert.ok(Math.abs(node.x + node.width / 2 - 1390) < 3 && Math.abs(node.y + node.height / 2 - 780) < 3, `node should be created at the original right-click location: ${JSON.stringify(node)}`);
        assert.equal(await menu.count(), 0);
    } finally { await context.close(); }
});

test('my-assets entry opens a non-modal asset sidebar with a working close control', { timeout: 180000 }, async () => {
    const { context, page } = await canvasPage();
    try {
        await page.locator('button[aria-label="我的素材"]').click();
        const panel = page.getByRole('complementary', { name: '画布资源面板' });
        await panel.getByRole('heading', { name: '素材库', exact: true }).waitFor({ timeout: 4000 });
        await panel.getByRole('searchbox', { name: '搜索素材' }).waitFor();
        assert.equal(await page.getByRole('dialog', { name: '选择素材' }).count(), 0);
        await panel.getByRole('button', { name: '收起资源面板' }).click();
        await panel.waitFor({ state: 'hidden' });
    } finally { await context.close(); }
});

test('menu accepts keyboard navigation and keeps its size after canvas zoom', { timeout: 180000 }, async () => {
    const { context, page } = await canvasPage();
    try {
        await page.mouse.click(900, 450, { button: 'right' });
        const menu = page.getByRole('menu', { name: '添加节点', exact: true });
        await menu.waitFor();
        assert.equal(await menu.getByRole('menuitem').first().evaluate(element => element === document.activeElement), true);
        const original = await menu.boundingBox();
        await page.keyboard.press('ArrowDown');
        assert.equal(await menu.getByRole('menuitem').nth(1).evaluate(element => element === document.activeElement), true);
        await page.keyboard.press('Escape');
        await menu.waitFor({ state: 'hidden' });
        await page.mouse.move(900, 450);
        await page.keyboard.down('Meta');
        await page.mouse.wheel(0, 500);
        await page.keyboard.up('Meta');
        await page.waitForFunction(() => {
            const transform = document.querySelector('[style*="--canvas-inverse-scale"]')?.style.transform || '';
            return /scale\(0\./.test(transform);
        });
        await page.mouse.click(900, 450, { button: 'right' });
        await menu.waitFor();
        assert.equal((await menu.boundingBox()).width, original.width);
    } finally { await context.close(); }
});

for (const pinch of [false, true]) {
    test(`${pinch ? 'trackpad pinch' : 'Command + mouse wheel'} zoom responds faster while preserving its anchor and limits`, { timeout: 180000 }, async () => {
        const { context, page } = await canvasPage();
        try {
            const transform = page.locator('[style*="--canvas-inverse-scale"]').first();
            const readViewport = () => transform.evaluate(element => {
                const matrix = new DOMMatrix(getComputedStyle(element).transform);
                return { x: matrix.e, y: matrix.f, k: matrix.a };
            });
            const initial = await readViewport();
            const stage = page.locator('div.select-none.overflow-hidden').first();
            const bounds = await stage.boundingBox();
            const point = { x: 900, y: 450 };
            const wheel = async deltaY => {
                if (pinch) await stage.dispatchEvent('wheel', { deltaY, ctrlKey: true, clientX: point.x, clientY: point.y, bubbles: true, cancelable: true });
                else {
                    await page.mouse.move(point.x, point.y);
                    await page.keyboard.down('Meta');
                    try { await page.mouse.wheel(0, deltaY); } finally { await page.keyboard.up('Meta'); }
                }
            };
            await wheel(-100);
            await page.waitForFunction(k => Number(document.querySelector('[style*="--canvas-inverse-scale"]').style.getPropertyValue('--canvas-inverse-scale')) < 1 / k, initial.k);
            const zoomed = await readViewport();
            assert.ok(zoomed.k / initial.k >= 1.18 && zoomed.k / initial.k <= 1.22, `expected about 20% zoom, got ${zoomed.k / initial.k}`);
            for (const axis of ['x', 'y']) {
                const local = point[axis] - bounds[axis];
                assert.ok(Math.abs((local - zoomed[axis]) / zoomed.k - (local - initial[axis]) / initial.k) < 0.01, 'world point under cursor must remain fixed');
            }
            await wheel(100);
            await page.waitForFunction(k => Math.abs(Number(document.querySelector('[style*="--canvas-inverse-scale"]').style.getPropertyValue('--canvas-inverse-scale')) - 1 / k) < 0.001, initial.k);
            await wheel(-100000);
            await page.waitForFunction(() => Number(document.querySelector('[style*="--canvas-inverse-scale"]').style.getPropertyValue('--canvas-inverse-scale')) === 0.2);
            await wheel(100000);
            await page.waitForFunction(() => Number(document.querySelector('[style*="--canvas-inverse-scale"]').style.getPropertyValue('--canvas-inverse-scale')) === 20);
        } finally { await context.close(); }
    });
}

test('two-finger scrolling pans in both axes without changing canvas scale', { timeout: 180000 }, async () => {
    const { context, page } = await canvasPage();
    try {
        const transform = page.locator('[style*="--canvas-inverse-scale"]').first();
        const before = await transform.evaluate(element => {
            const m = new DOMMatrix(getComputedStyle(element).transform);
            return { x: m.e, y: m.f, k: m.a };
        });
        const beforeTransform = await transform.evaluate(element => element.style.transform);
        await page.mouse.move(900, 450);
        await page.mouse.wheel(65, 90);
        await page.waitForFunction(original => document.querySelector('[style*="--canvas-inverse-scale"]').style.transform !== original, beforeTransform);
        const after = await transform.evaluate(element => {
            const m = new DOMMatrix(getComputedStyle(element).transform);
            return { x: m.e, y: m.f, k: m.a };
        });
        assert.equal(after.k, before.k, 'two-finger scrolling must not zoom');
        assert.ok(Math.abs(after.x - before.x + 65) < 0.01 && Math.abs(after.y - before.y + 90) < 0.01, 'scroll should pan by both input deltas');
    } finally { await context.close(); }
});

test('rapid trackpad scroll events accumulate instead of losing movement within one frame', { timeout: 180000 }, async () => {
    const { context, page } = await canvasPage();
    try {
        const stage = page.locator('div.select-none.overflow-hidden').first();
        const movement = await stage.evaluate(element => {
            const transformed = element.querySelector('[style*="--canvas-inverse-scale"]');
            const m = new DOMMatrix(getComputedStyle(transformed).transform);
            for (let i = 0; i < 8; i++) element.dispatchEvent(new WheelEvent('wheel', { deltaX: 3, deltaY: 5, clientX: 900, clientY: 450, bubbles: true, cancelable: true }));
            return { x: m.e - 24, y: m.f - 40, k: m.a };
        });
        await page.waitForFunction(expected => {
            const m = new DOMMatrix(getComputedStyle(document.querySelector('[style*="--canvas-inverse-scale"]')).transform);
            return Math.abs(m.e - expected.x) < 0.01 && Math.abs(m.f - expected.y) < 0.01 && m.a === expected.k;
        }, movement, { timeout: 4000 });
    } finally { await context.close(); }
});

test('text editing keeps its own scrolling and does not zoom the canvas on pinch', { timeout: 180000 }, async () => {
    const { context, page } = await canvasPage();
    try {
        await page.mouse.click(900, 300, { button: 'right' });
        await page.getByRole('menuitem', { name: '文本生成', exact: true }).click();
        const node = page.locator('[data-node-id^="text-"]').first();
        await node.getByText('双击编辑文字', { exact: true }).dblclick();
        const editor = node.locator('textarea');
        await editor.fill(Array.from({ length: 80 }, (_, index) => `编辑器滚动测试 ${index}`).join('\n'));
        await editor.evaluate(element => { element.scrollTop = 0; });
        const transform = page.locator('[style*="--canvas-inverse-scale"]').first();
        const before = await transform.getAttribute('style');
        await editor.hover();
        await page.mouse.wheel(0, 120);
        await page.waitForFunction(() => document.querySelector('[data-node-id] textarea').scrollTop > 0);
        await editor.dispatchEvent('wheel', { deltaY: -100, ctrlKey: true, bubbles: true, cancelable: true });
        await editor.dispatchEvent('wheel', { deltaY: -100, metaKey: true, bubbles: true, cancelable: true });
        await page.evaluate(() => new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve))));
        assert.equal(await transform.getAttribute('style'), before);
    } finally { await context.close(); }
});

test('select-all can connect the selection as one group to a newly created downstream node', { timeout: 180000 }, async () => {
    const { context, page } = await canvasPage();
    try {
        const panel = page.getByRole('complementary', { name: '画布资源面板' });
        await panel.getByRole('button', { name: '收起资源面板' }).click();
        await panel.waitFor({ state: 'hidden' });
        for (const y of [250, 570]) {
            await page.mouse.click(480, y, { button: 'right' });
            await page.getByRole('menu', { name: '添加节点', exact: true }).getByRole('menuitem', { name: '文本生成', exact: true }).click();
            const node = page.locator('[data-node-id^="text-"]').last();
            await node.getByText('双击编辑文字', { exact: true }).dblclick();
            await node.locator('textarea').fill(`组内测试文案 ${y}`);
            await page.keyboard.press('Escape');
        }
        await page.mouse.click(850, 160);
        await page.keyboard.press('Meta+a');
        const connect = page.getByRole('button', { name: '编组并连接所选节点', exact: true });
        await connect.waitFor({ timeout: 4000 });
        const handle = await connect.boundingBox();
        await page.mouse.move(handle.x + handle.width / 2, handle.y + handle.height / 2);
        await page.mouse.down();
        await page.mouse.move(1120, 410, { steps: 12 });
        await page.mouse.up();
        const create = page.locator('[data-connection-create-menu]');
        await create.waitFor({ timeout: 4000 });
        await create.getByRole('button', { name: /图片生成/ }).click();
        await page.waitForFunction(() => document.querySelectorAll('[data-node-id]').length === 4 && document.querySelectorAll('[data-connection-id]').length === 1);
        const group = page.locator('[data-node-id^="group-"]');
        const groupOutput = page.locator('[data-group-output-node-id]').getByRole('button', { name: '输出连接点', exact: true });
        await groupOutput.waitFor();
        assert.equal(await page.locator('[data-node-id^="text-"]').count(), 2, 'original text nodes should remain separate');
        const disconnect = page.getByRole('button', { name: '断开参考连接', exact: true });
        await disconnect.first().waitFor({ timeout: 4000 });
        assert.equal(await disconnect.count(), 2, 'downstream reference bar should show both group members');
        await disconnect.first().click();
        const confirm = page.getByRole('dialog', { name: '断开整组参考？', exact: true });
        await confirm.getByRole('button', { name: /取\s*消/ }).click();
        assert.equal(await page.locator('[data-connection-id]').count(), 1);
        await disconnect.first().click();
        await confirm.getByRole('button', { name: '断开整组', exact: true }).click();
        await page.waitForFunction(() => document.querySelectorAll('[data-connection-id]').length === 0);
        await page.getByRole('button', { name: '撤销', exact: true }).click();
        await page.waitForFunction(() => document.querySelectorAll('[data-connection-id]').length === 1);
        await page.reload({ waitUntil: 'domcontentloaded' });
        await page.locator('[data-connection-id]').waitFor({ state: 'attached', timeout: 30000 });
        assert.equal(await page.locator('[data-node-id^="text-"]').count(), 2);
        await page.mouse.click(1120, 750, { button: 'right' });
        await page.getByRole('menuitem', { name: '配置节点', exact: true }).click();
        for (let attempt = 0; attempt < 2; attempt++) {
            const box = await group.boundingBox();
            await group.hover({ position: { x: box.width - 10, y: box.height / 2 } });
            const output = await groupOutput.boundingBox();
            const hit = await page.evaluate(({ x, y }) => {
                const element = document.elementFromPoint(x, y);
                return element?.closest('button')?.getAttribute('aria-label') || element?.getAttribute('data-connection-id') || element?.tagName;
            }, { x: output.x + output.width / 2, y: output.y + output.height / 2 });
            assert.equal(hit, '输出连接点', 'existing edges must not cover the group output handle');
            await page.mouse.move(output.x + output.width / 2, output.y + output.height / 2);
            await page.mouse.down();
            await page.mouse.move(1120, 750, { steps: 10 });
            await page.mouse.up();
            await page.waitForFunction(() => document.querySelectorAll('[data-connection-id]').length === 2);
        }
        assert.equal(await page.locator('[data-node-id^="group-"]').count(), 1, 'reusing a group connection should not create another group');
        if (process.env.CANVAS_SCREENSHOT_DIR) await page.screenshot({ path: `${process.env.CANVAS_SCREENSHOT_DIR}/canvas-group.png` });
    } finally { await context.close(); }
});

test('local assets can be searched, filtered, clicked and dragged into the canvas', { timeout: 180000 }, async () => {
    const { context, page } = await canvasPage();
    try {
        const panel = page.getByRole('complementary', { name: '画布资源面板' });
        await panel.getByRole('button', { name: '新增素材', exact: true }).click();
        const form = page.getByRole('dialog', { name: '新增素材', exact: true });
        await form.getByLabel('标题', { exact: true }).fill('回归测试文案');
        await form.getByLabel('分类', { exact: true }).fill('角色');
        await form.getByLabel('文本内容', { exact: true }).fill('这是一段只保存在独立浏览器里的测试素材。');
        await form.getByRole('button', { name: /保\s*存/ }).click();
        await form.waitFor({ state: 'hidden' });
        const card = panel.getByRole('button', { name: '插入素材：回归测试文案', exact: true });
        await card.waitFor();
        await panel.getByRole('searchbox', { name: '搜索素材' }).fill('不存在的素材');
        await card.waitFor({ state: 'hidden' });
        await panel.getByRole('button', { name: '清空素材搜索' }).click();
        await card.waitFor();
        await panel.getByRole('button', { name: '角色', exact: true }).click();
        await card.waitFor({ state: 'hidden' });
        await panel.getByRole('button', { name: '场景', exact: true }).click();
        await panel.getByText('该文件夹暂无素材', { exact: true }).first().waitFor();
        await panel.getByRole('button', { name: '角色', exact: true }).click();
        await card.waitFor();
        await card.click();
        await page.waitForFunction(() => document.querySelectorAll('[data-node-id]').length === 1);
        const stage = page.locator('div.select-none.overflow-hidden').first();
        await card.dragTo(stage, { targetPosition: { x: 600, y: 350 } });
        await page.waitForFunction(() => document.querySelectorAll('[data-node-id]').length === 2);
        await panel.getByRole('button', { name: '全部素材', exact: true }).click();
        assert.equal(await card.count(), 1, 'all-assets view should not repeat the same card inside its folder');
        await panel.getByRole('button', { name: '全部素材', exact: true }).click();
        if (process.env.CANVAS_SCREENSHOT_DIR) {
            require('node:fs').mkdirSync(process.env.CANVAS_SCREENSHOT_DIR, { recursive: true });
            await page.mouse.click(1150, 600, { button: 'right' });
            await page.getByRole('menu', { name: '添加节点', exact: true }).waitFor();
            await page.screenshot({ path: `${process.env.CANVAS_SCREENSHOT_DIR}/canvas-dark.png` });
            await page.keyboard.press('Escape');
            await page.getByRole('button', { name: '画布外观', exact: true }).click();
            await page.getByRole('button', { name: '切换到浅色主题', exact: true }).last().click();
            await page.getByRole('button', { name: '画布外观', exact: true }).click();
            await page.screenshot({ path: `${process.env.CANVAS_SCREENSHOT_DIR}/canvas-light.png` });
        }
    } finally { await context.close(); }
});

test('public asset filters use public tags rather than the personal library tags', { timeout: 180000 }, async () => {
    const { context, page } = await canvasPage();
    try {
        const asset = { id: 'public-ui-fixture', title: '公共测试素材', type: 'text', coverUrl: '', tags: ['公共标签'], category: '角色', description: '公共素材筛选测试', content: '只用于浏览器测试的公共素材响应', url: '', createdAt: '2020-01-01T00:00:00Z', updatedAt: '2020-01-01T00:00:00Z' };
        await page.route(/\/api\/assets(?:\?|$)/, route => route.fulfill({ json: { code: 0, data: { items: [asset], tags: ['公共标签'], categories: ['角色'], total: 1 }, msg: '' } }));
        const panel = page.getByRole('complementary', { name: '画布资源面板' });
        await panel.getByRole('button', { name: '公共', exact: true }).click();
        await panel.getByRole('button', { name: '插入素材：公共测试素材', exact: true }).waitFor();
        await panel.locator('summary[aria-label="筛选素材"]').click();
        const tags = panel.getByRole('combobox', { name: '按素材标签筛选' });
        await tags.waitFor({ timeout: 4000 });
        await tags.click();
        const filteredRequest = page.waitForResponse(response => response.url().includes('/api/assets?') && response.url().includes(encodeURIComponent('公共标签')));
        await tags.press('ArrowDown');
        await tags.press('Enter');
        await filteredRequest;
        await panel.getByRole('button', { name: '插入素材：公共测试素材', exact: true }).waitFor();
    } finally { await context.close(); }
});

test('asset controls and empty state remain reachable in a short window', { timeout: 180000 }, async () => {
    const { context, page } = await canvasPage();
    try {
        await page.setViewportSize({ width: 900, height: 600 });
        const panel = page.getByRole('complementary', { name: '画布资源面板' });
        const content = panel.getByRole('region', { name: '素材内容', exact: true });
        await content.waitFor({ timeout: 4000 });
        assert.ok((await content.boundingBox()).height > 200);
        await content.evaluate(element => { element.scrollTop = element.scrollHeight; });
        const bounds = await panel.getByRole('button', { name: '其他', exact: true }).boundingBox();
        assert.ok(bounds && bounds.y >= 0 && bounds.y + bounds.height <= 600);
        await page.setViewportSize({ width: 900, height: 450 });
        await panel.locator('summary[aria-label="筛选素材"]').click();
        const popup = panel.getByRole('group', { name: '素材类型', exact: true }).locator('..');
        const popupBounds = await popup.boundingBox();
        const panelBounds = await panel.boundingBox();
        assert.ok(popupBounds.y + popupBounds.height <= panelBounds.y + panelBounds.height, 'filter popup should fit inside a short panel');
    } finally { await context.close(); }
});

test('public folder metadata errors can be retried without reopening the panel', { timeout: 180000 }, async () => {
    const { context, page } = await canvasPage();
    try {
        let failMetadata = true;
        await page.route(/\/api\/assets(?:\?|$)/, route => {
            if (new URL(route.request().url()).searchParams.get('pageSize') === '1' && failMetadata) return route.fulfill({ status: 500, json: { code: 500, msg: 'test metadata error' } });
            return route.fulfill({ json: { code: 0, data: { items: [], tags: [], categories: ['自定义分类'], total: 0 }, msg: '' } });
        });
        const panel = page.getByRole('complementary', { name: '画布资源面板' });
        await panel.getByRole('button', { name: '公共', exact: true }).click();
        const retry = panel.getByRole('button', { name: '分类加载失败，点击重试', exact: true });
        await retry.waitFor({ timeout: 4000 });
        failMetadata = false;
        await retry.click();
        await panel.getByRole('button', { name: '自定义分类', exact: true }).waitFor({ timeout: 4000 });
        await retry.waitFor({ state: 'hidden' });
    } finally { await context.close(); }
});

test('canvas uses a floating rounded resource panel over a neutral dot background', { timeout: 180000 }, async () => {
    const { context, page } = await canvasPage();
    try {
        const panel = page.getByRole('complementary', { name: '画布资源面板' });
        const bounds = await panel.boundingBox();
        assert.ok(bounds.x >= 8 && bounds.y >= 64 && bounds.y + bounds.height < 900, `panel should float above the canvas: ${JSON.stringify(bounds)}`);
        const radius = await panel.evaluate(element => parseFloat(getComputedStyle(element).borderTopLeftRadius));
        assert.ok(radius >= 18);
        const stage = page.locator('div.select-none.overflow-hidden').first();
        assert.equal(await stage.evaluate(element => getComputedStyle(element).backgroundColor), 'rgb(8, 8, 8)');
        const dots = stage.locator('[data-canvas-grid]');
        await dots.waitFor();
        assert.ok((await dots.evaluate(element => getComputedStyle(element).backgroundImage)).includes('radial-gradient'));
        assert.equal(await panel.getByRole('button', { name: '角色', exact: true }).getAttribute('aria-expanded'), 'true');
    } finally { await context.close(); }
});
