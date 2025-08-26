import type { MindMapNode as NodeData } from '../types';

export const getAllNodes = (node: NodeData): NodeData[] => {
    let nodes = [node];
    if (node.children && !node.isCollapsed) {
        node.children.forEach(child => {
            nodes = nodes.concat(getAllNodes(child));
        });
    }
    return nodes;
};