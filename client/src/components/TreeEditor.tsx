import { useState } from 'react';

interface TreeNode {
  id: string;
  name: string;
  type: 'folder' | 'object' | 'variable';
  dataType?: string;
  children?: TreeNode[];
  generation?: any;
  initialValue?: any;
}

interface TreeEditorProps {
  nodes: TreeNode[];
  selectedId: string | null;
  onSelect: (id: string) => void;
  onAdd: (parentId: string | null, type: TreeNode['type']) => void;
  onRemove: (id: string) => void;
}

function TreeNodeItem({
  node,
  depth,
  selectedId,
  onSelect,
  onAdd,
  onRemove,
}: {
  node: TreeNode;
  depth: number;
  selectedId: string | null;
  onSelect: (id: string) => void;
  onAdd: (parentId: string | null, type: TreeNode['type']) => void;
  onRemove: (id: string) => void;
}) {
  const [expanded, setExpanded] = useState(true);
  const hasChildren = node.children && node.children.length > 0;
  const isSelected = selectedId === node.id;
  const canHaveChildren = node.type !== 'variable';

  const iconMap = { folder: '\u{1F4C1}', object: '\u{1F4E6}', variable: '\u{1F4CA}' };

  return (
    <div>
      <div
        className={`flex items-center gap-1 px-2 py-1 cursor-pointer hover:bg-gray-800 rounded text-sm ${
          isSelected ? 'bg-gray-800 text-blue-400' : ''
        }`}
        style={{ paddingLeft: `${depth * 16 + 8}px` }}
        onClick={() => onSelect(node.id)}
      >
        {canHaveChildren ? (
          <button
            className="text-gray-500 w-4 text-xs"
            onClick={(e) => { e.stopPropagation(); setExpanded(!expanded); }}
          >
            {hasChildren ? (expanded ? '\u25BC' : '\u25B6') : ' '}
          </button>
        ) : (
          <span className="w-4" />
        )}
        <span>{iconMap[node.type]}</span>
        <span className="flex-1">{node.name}</span>
        {node.type === 'variable' && (
          <span className="text-xs text-gray-500">{node.dataType}</span>
        )}
      </div>
      {expanded && node.children?.map((child) => (
        <TreeNodeItem
          key={child.id}
          node={child}
          depth={depth + 1}
          selectedId={selectedId}
          onSelect={onSelect}
          onAdd={onAdd}
          onRemove={onRemove}
        />
      ))}
    </div>
  );
}

export default function TreeEditor({ nodes, selectedId, onSelect, onAdd, onRemove }: TreeEditorProps) {
  return (
    <div className="bg-gray-900 border border-gray-800 rounded-lg">
      <div className="flex items-center justify-between border-b border-gray-800 px-3 py-2">
        <h3 className="text-sm font-semibold">Address Space</h3>
        <div className="flex gap-1">
          <button onClick={() => onAdd(selectedId, 'folder')} className="text-xs px-2 py-1 bg-gray-800 hover:bg-gray-700 rounded">+ Folder</button>
          <button onClick={() => onAdd(selectedId, 'object')} className="text-xs px-2 py-1 bg-gray-800 hover:bg-gray-700 rounded">+ Object</button>
          <button onClick={() => onAdd(selectedId, 'variable')} className="text-xs px-2 py-1 bg-gray-800 hover:bg-gray-700 rounded">+ Variable</button>
          {selectedId && (
            <button onClick={() => onRemove(selectedId)} className="text-xs px-2 py-1 bg-red-900 hover:bg-red-800 rounded text-red-300">Remove</button>
          )}
        </div>
      </div>
      <div className="py-1 max-h-[500px] overflow-y-auto">
        {nodes.map((node) => (
          <TreeNodeItem
            key={node.id}
            node={node}
            depth={0}
            selectedId={selectedId}
            onSelect={onSelect}
            onAdd={onAdd}
            onRemove={onRemove}
          />
        ))}
        {nodes.length === 0 && (
          <p className="text-gray-500 text-sm p-4">No nodes. Add a folder to get started.</p>
        )}
      </div>
    </div>
  );
}
