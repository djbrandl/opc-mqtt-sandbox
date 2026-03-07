import { useState, useMemo, useRef, useEffect } from 'react';

interface MqttTopic {
	id: string;
	topic: string;
	payloadSchema: { key: string; type: 'number' | 'string' | 'boolean' | 'timestamp'; generation?: any; staticValue?: any }[];
	qos: 0 | 1 | 2;
	publishOnChange: boolean;
	publishRateMs?: number;
}

interface TopicTreeNode {
	segment: string;
	path: string;
	topicId: string | null;
	children: TopicTreeNode[];
}

interface TopicTreeProps {
	topics: MqttTopic[];
	selectedTopicId: string | null;
	onSelect: (id: string) => void;
	onAddTopic: (parentPath: string) => void;
	onRemoveTopic: (id: string) => void;
}

function buildTree(topics: MqttTopic[]): TopicTreeNode[] {
	const root: TopicTreeNode[] = [];

	for (const topic of topics) {
		const segments = topic.topic.split('/').filter((s) => s.length > 0);
		if (segments.length === 0) continue;
		let currentChildren = root;
		let currentPath = '';

		for (let i = 0; i < segments.length; i++) {
			const segment = segments[i];
			currentPath = currentPath ? `${currentPath}/${segment}` : segment;
			const isLeaf = i === segments.length - 1;

			let existing = currentChildren.find((n) => n.segment === segment);
			if (!existing) {
				existing = {
					segment,
					path: currentPath,
					topicId: isLeaf ? topic.id : null,
					children: [],
				};
				currentChildren.push(existing);
			} else if (isLeaf) {
				existing.topicId = topic.id;
			}

			currentChildren = existing.children;
		}
	}

	const sortNodes = (nodes: TopicTreeNode[]): TopicTreeNode[] => {
		return nodes.sort((a, b) => {
			const aIsFolder = a.children.length > 0;
			const bIsFolder = b.children.length > 0;
			if (aIsFolder !== bIsFolder) return aIsFolder ? -1 : 1;
			return a.segment.localeCompare(b.segment);
		}).map((node) => ({
			...node,
			children: sortNodes(node.children),
		}));
	};

	return sortNodes(root);
}

function TreeGuides({ guides, isLast }: { guides: boolean[]; isLast: boolean }) {
	return (
		<span className="inline-flex font-mono text-slate-600 select-none" style={{ fontSize: '13px' }}>
			{guides.map((hasSibling, i) => (
				<span key={i} className="inline-block w-4 text-center">
					{hasSibling ? '\u2502' : ' '}
				</span>
			))}
			<span className="inline-block w-4 text-center">
				{isLast ? '\u2514' : '\u251C'}
			</span>
			<span className="inline-block w-2 text-center">{'\u2500'}</span>
		</span>
	);
}

function InlineAddInput({
	parentPath,
	depth,
	guides,
	onAddTopic,
}: {
	parentPath: string;
	depth: number;
	guides: boolean[];
	onAddTopic: (fullPath: string) => void;
}) {
	const [editing, setEditing] = useState(false);
	const [value, setValue] = useState('');
	const inputRef = useRef<HTMLInputElement>(null);
	const submittingRef = useRef(false);

	useEffect(() => {
		if (editing && inputRef.current) {
			inputRef.current.focus();
		}
	}, [editing]);

	const handleSubmit = () => {
		const trimmed = value.trim().replace(/\//g, '');
		if (trimmed) {
			submittingRef.current = true;
			const fullPath = parentPath ? `${parentPath}/${trimmed}` : trimmed;
			onAddTopic(fullPath);
		}
		setValue('');
		setEditing(false);
		submittingRef.current = false;
	};

	const handleCancel = () => {
		if (submittingRef.current) return;
		setValue('');
		setEditing(false);
	};

	const parentLabel = parentPath ? parentPath.split('/').pop() : 'root';

	if (!editing) {
		return (
			<div
				className="flex items-center px-2 py-0.5 cursor-pointer text-slate-600 hover:text-slate-400 text-xs transition-colors duration-150"
				onClick={() => setEditing(true)}
			>
				{depth > 0 && <TreeGuides guides={guides} isLast={true} />}
				<span className="border border-dashed border-slate-700 rounded px-1.5 py-0.5 ml-1">
					+ add under {parentLabel}
				</span>
			</div>
		);
	}

	return (
		<div className="flex items-center gap-1 px-2 py-0.5 text-xs">
			{depth > 0 && <TreeGuides guides={guides} isLast={true} />}
			<input
				ref={inputRef}
				type="text"
				value={value}
				onChange={(e) => setValue(e.target.value)}
				onKeyDown={(e) => {
					if (e.key === 'Enter') handleSubmit();
					if (e.key === 'Escape') handleCancel();
				}}
				onBlur={handleCancel}
				className="bg-slate-800 border border-slate-700 rounded px-2 py-0.5 text-sm text-slate-200 outline-none focus:border-blue-500 w-48 ml-1 transition-colors duration-150"
				placeholder={`name under ${parentLabel}`}
			/>
		</div>
	);
}

function NodeIcon({ isFolder }: { isFolder: boolean }) {
	if (isFolder) {
		return (
			<span className="inline-flex items-center justify-center w-4 h-4 rounded text-[10px] bg-amber-500/20 text-amber-400 ml-0.5 flex-shrink-0">
				D
			</span>
		);
	}
	return (
		<span className="inline-flex items-center justify-center w-4 h-4 rounded text-[10px] bg-purple-500/20 text-purple-400 ml-0.5 flex-shrink-0">
			T
		</span>
	);
}

function TreeNodeItem({
	node,
	depth,
	guides,
	isLast,
	selectedTopicId,
	onSelect,
	onAddTopic,
	onRemoveTopic,
}: {
	node: TopicTreeNode;
	depth: number;
	guides: boolean[];
	isLast: boolean;
	selectedTopicId: string | null;
	onSelect: (id: string) => void;
	onAddTopic: (parentPath: string) => void;
	onRemoveTopic: (id: string) => void;
}) {
	const [expanded, setExpanded] = useState(true);
	const hasChildren = node.children.length > 0;
	const isSelectable = node.topicId !== null;
	const isSelected = isSelectable && selectedTopicId === node.topicId;
	const canExpand = hasChildren;

	const childGuides = depth > 0
		? [...guides, !isLast]
		: (isLast ? [] : [true]);

	const totalChildItems = node.children.length + 1;

	return (
		<div>
			<div
				className={`group flex items-center px-2 py-1 rounded text-sm transition-colors duration-150 ${
					isSelectable ? 'cursor-pointer' : ''
				} hover:bg-slate-800 ${
					isSelected ? 'bg-slate-800 text-blue-400' : ''
				}`}
				onClick={() => {
					if (isSelectable && node.topicId) {
						onSelect(node.topicId);
					}
				}}
			>
				{depth > 0 && <TreeGuides guides={guides} isLast={isLast} />}
				{canExpand ? (
					<button
						className="text-slate-500 w-4 text-xs ml-1 hover:text-slate-300 transition-colors duration-150"
						onClick={(e) => { e.stopPropagation(); setExpanded(!expanded); }}
					>
						{expanded ? '\u25BC' : '\u25B6'}
					</button>
				) : (
					<span className="w-4 ml-1" />
				)}
				<NodeIcon isFolder={hasChildren} />
				<span className="flex-1 ml-1.5">{node.segment}</span>
				{isSelectable && node.topicId && (
					<button
						className="text-xs text-red-400 hover:text-red-300 opacity-0 group-hover:opacity-100 ml-1 transition-all duration-150"
						onClick={(e) => {
							e.stopPropagation();
							onRemoveTopic(node.topicId!);
						}}
						title="Remove topic"
					>
						✕
					</button>
				)}
			</div>
			{canExpand && expanded && (
				<>
					{node.children.map((child, i) => (
						<TreeNodeItem
							key={child.path}
							node={child}
							depth={depth + 1}
							guides={childGuides}
							isLast={i === node.children.length - 1 && totalChildItems === node.children.length}
							selectedTopicId={selectedTopicId}
							onSelect={onSelect}
							onAddTopic={onAddTopic}
							onRemoveTopic={onRemoveTopic}
						/>
					))}
					<InlineAddInput
						parentPath={node.path}
						depth={depth + 1}
						guides={childGuides}
						onAddTopic={onAddTopic}
					/>
				</>
			)}
		</div>
	);
}

export default function TopicTree({ topics, selectedTopicId, onSelect, onAddTopic, onRemoveTopic }: TopicTreeProps) {
	const tree = useMemo(() => buildTree(topics), [topics]);

	const selectedTopic = selectedTopicId
		? topics.find((t) => t.id === selectedTopicId)
		: null;

	const totalRootItems = tree.length + 1;

	return (
		<div className="bg-slate-900 border border-slate-800 rounded-lg">
			<div className="flex items-center justify-between border-b border-slate-800 px-3 py-2">
				<h3 className="text-sm font-semibold text-slate-200">Topic Tree</h3>
				{selectedTopicId && (
					<button
						onClick={() => onRemoveTopic(selectedTopicId)}
						className="text-xs px-2 py-1 bg-red-500/10 hover:bg-red-500/20 rounded text-red-400 transition-colors duration-150"
					>
						Remove
					</button>
				)}
			</div>
			<div className="border-b border-slate-800 px-3 py-2">
				{selectedTopic ? (
					<code className="text-sm font-mono text-emerald-400">{selectedTopic.topic}</code>
				) : (
					<span className="text-sm text-slate-500">No topic selected</span>
				)}
			</div>
			<div className="py-1 max-h-[500px] overflow-y-auto">
				{tree.length === 0 && topics.length === 0 ? (
					<p className="text-slate-500 text-sm p-4">No topics. Use + add to create one.</p>
				) : (
					tree.map((node, i) => (
						<TreeNodeItem
							key={node.path}
							node={node}
							depth={0}
							guides={[]}
							isLast={i === tree.length - 1 && totalRootItems === tree.length}
							selectedTopicId={selectedTopicId}
							onSelect={onSelect}
							onAddTopic={onAddTopic}
							onRemoveTopic={onRemoveTopic}
						/>
					))
				)}
				<InlineAddInput
					parentPath=""
					depth={0}
					guides={[]}
					onAddTopic={onAddTopic}
				/>
			</div>
		</div>
	);
}
