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

const typeStyles = {
  folder: 'bg-amber-500/20 text-amber-400',
  object: 'bg-blue-500/20 text-blue-400',
  variable: 'bg-emerald-500/20 text-emerald-400',
} as const;

const typeLabels = { folder: 'F', object: 'O', variable: 'V' } as const;

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

  return (
    <div>
      <div
        className={`flex items-center gap-1.5 px-2 py-1 cursor-pointer rounded text-sm transition-colors duration-150 hover:bg-slate-800 ${
          isSelected ? 'bg-slate-800 text-blue-400' : ''
        }`}
        style={{ paddingLeft: `${depth * 16 + 8}px` }}
        onClick={() => onSelect(node.id)}
      >
        {canHaveChildren ? (
          <button
            className="text-slate-500 w-4 text-xs hover:text-slate-300 transition-colors duration-150"
            onClick={(e) => { e.stopPropagation(); setExpanded(!expanded); }}
          >
            {hasChildren ? (expanded ? '\u25BC' : '\u25B6') : ' '}
          </button>
        ) : (
          <span className="w-4" />
        )}
        <span className={`inline-flex items-center justify-center w-4 h-4 rounded text-[10px] flex-shrink-0 ${typeStyles[node.type]}`}>
          {typeLabels[node.type]}
        </span>
        <span className="flex-1">{node.name}</span>
        {node.type === 'variable' && (
          <span className="text-xs text-slate-500">{node.dataType}</span>
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
    <div className="bg-slate-900 border border-slate-800 rounded-lg">
      <div className="flex items-center justify-between border-b border-slate-800 px-3 py-2">
        <h3 className="text-sm font-semibold text-slate-200">Address Space</h3>
        <div className="flex gap-1">
          <button onClick={() => onAdd(selectedId, 'folder')} className="text-xs px-2 py-1 bg-slate-800 hover:bg-slate-700 rounded text-slate-300 transition-colors duration-150">+ Folder</button>
          <button onClick={() => onAdd(selectedId, 'object')} className="text-xs px-2 py-1 bg-slate-800 hover:bg-slate-700 rounded text-slate-300 transition-colors duration-150">+ Object</button>
          <button onClick={() => onAdd(selectedId, 'variable')} className="text-xs px-2 py-1 bg-slate-800 hover:bg-slate-700 rounded text-slate-300 transition-colors duration-150">+ Variable</button>
          {selectedId && (
            <button onClick={() => onRemove(selectedId)} className="text-xs px-2 py-1 bg-red-500/10 hover:bg-red-500/20 rounded text-red-400 transition-colors duration-150">Remove</button>
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
          <p className="text-slate-500 text-sm p-4">No nodes. Add a folder to get started.</p>
        )}
      </div>
    </div>
  );
}
