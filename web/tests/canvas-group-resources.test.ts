import { expect, test } from "bun:test";
import { CanvasNodeType, type CanvasNodeData } from "../src/app/(user)/canvas/types";
import { getGenerationResourceNodes, buildNodeMentionReferences } from "../src/app/(user)/canvas/utils/canvas-resource-references";
import { buildNodeGenerationInputs } from "../src/app/(user)/canvas/components/canvas-node-generation";

function node(id: string, type: CanvasNodeType, content = "", groupId?: string): CanvasNodeData {
    return { id, type, title: id, position: { x: 0, y: 0 }, width: 340, height: 240, metadata: { content, groupId } };
}

test("a single group connection supplies all member resources to generation and mentions without duplicates", () => {
    const nodes = [node("group", CanvasNodeType.Group), node("brief", CanvasNodeType.Text, "测试需求", "group"), node("image", CanvasNodeType.Image, "data:image/png;base64,AA==", "group"), node("target", CanvasNodeType.Config), node("unrelated", CanvasNodeType.Text, "不应传入")];
    const connections = [{ id: "g", fromNodeId: "group", toNodeId: "target" }, { id: "direct", fromNodeId: "brief", toNodeId: "target" }];
    expect(getGenerationResourceNodes("target", nodes, connections).map(item => item.id)).toEqual(["brief", "image"]);
    expect(buildNodeGenerationInputs("target", nodes, connections).map(input => input.type)).toEqual(["text", "image"]);
    expect(buildNodeMentionReferences(nodes[3], nodes, connections).map(reference => reference.nodeId)).toEqual(["brief", "image"]);
});

test("groups supply current members, exclude the target itself, and preserve config resource routing", () => {
    const nodes = [node("group", CanvasNodeType.Group), node("brief", CanvasNodeType.Text, "测试需求", "group"), node("target", CanvasNodeType.Image, "data:image/png;base64,AA==", "group"), node("config", CanvasNodeType.Config)];
    const connections = [{ id: "g", fromNodeId: "group", toNodeId: "config" }, { id: "c", fromNodeId: "target", toNodeId: "config" }];
    expect(getGenerationResourceNodes("target", nodes, connections).map(item => item.id)).toEqual(["brief"]);
    expect(getGenerationResourceNodes("target", nodes.map(item => item.id === "brief" ? { ...item, metadata: { ...item.metadata, groupId: undefined } } : item), connections)).toEqual([]);
});
