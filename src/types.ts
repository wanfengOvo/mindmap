// 定义思维导图节点的数据结构
export interface MindMapNode {
  id: string;          // 唯一标识符
  text: string;        // 节点显示的文本
  position: {         // 节点的位置 (x, y)
    x: number;
    y: number;
  };
  children: MindMapNode[]; // 子节点数组
  parentId?: string;      // 父节点ID (根节点没有)
  isCollapsed?: boolean;
  icon?: string; // 用于存储图标的标识符 (例如 Emoji)
  style?: {
    backgroundColor?: string;
    color?: string;
    fontSize?: number;
  };

  edgeStyle?: {
    type?: 'curved' | 'straight'; // 连线类型
    dashed?: boolean;            // 是否为虚线
  };

  size?: {
    width: number;
    height: number;
  };
  notes?: string;
  edgeLabel?: string;
}