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


export const isDescendant = (childId: string, parentNode: NodeData): boolean => {
  if (parentNode.children.some(child => child.id === childId)) {
    return true;
  }
  for (const child of parentNode.children) {
    if (isDescendant(childId, child)) {
      return true;
    }
  }
  return false;
};


export const detachNodeFromTree = (rootNode: NodeData, nodeId: string): { newTree: NodeData, detachedNode: NodeData | null } => {
    let detachedNode: NodeData | null = null;
    const searchAndRemove = (node: NodeData): NodeData => {
        const newChildren = [];
        for (const child of node.children) {
            if (child.id === nodeId) {
                detachedNode = child;
            } else {
                newChildren.push(searchAndRemove(child));
            }
        }
        return { ...node, children: newChildren };
    };
    const newTree = searchAndRemove(rootNode);
    return { newTree, detachedNode };
};