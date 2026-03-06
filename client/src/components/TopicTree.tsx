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

// Renders the tree guide lines (│, ├──, └──) for a given depth
function TreeGuides({ guides, isLast }: { guides: boolean[]; isLast: boolean }) {
	return (
		<span className="inline-flex font-mono text-gray-600 select-none" style={{ fontSize: '13px' }}>
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
				className="flex items-center px-2 py-0.5 cursor-pointer text-gray-600 hover:text-gray-400 text-xs"
				onClick={() => setEditing(true)}
			>
				{depth > 0 && <TreeGuides guides={guides} isLast={true} />}
				<span className="border border-dashed border-gray-700 rounded px-1.5 py-0.5 ml-1">
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
				className="bg-gray-800 border border-gray-700 rounded px-2 py-0.5 text-sm text-gray-200 outline-none focus:border-purple-500 w-48 ml-1"
				placeholder={`name under ${parentLabel}`}
			/>
		</div>
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
	guides: boolean[];  // for each ancestor depth, whether that ancestor has more siblings below
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

	// Guides for this node's children: current guides + whether this node has more siblings
	const childGuides = depth > 0
		? [...guides, !isLast]
		: (isLast ? [] : [true]);

	// Total items under this node (children + the "+ add" row)
	const totalChildItems = node.children.length + 1; // +1 for the InlineAddInput

	return (
		<div>
			<div
				className={`group flex items-center px-2 py-1 rounded text-sm ${
					isSelectable ? 'cursor-pointer' : ''
				} hover:bg-gray-800 ${
					isSelected ? 'bg-gray-800 text-purple-400' : ''
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
						className="text-gray-500 w-4 text-xs ml-1"
						onClick={(e) => { e.stopPropagation(); setExpanded(!expanded); }}
					>
						{expanded ? '\u25BC' : '\u25B6'}
					</button>
				) : (
					<span className="w-4 ml-1" />
				)}
				<span className="ml-0.5">{hasChildren ? '\uD83D\uDCC1' : '\uD83D\uDCE8'}</span>
				<span className="flex-1 ml-1">{node.segment}</span>
				{isSelectable && node.topicId && (
					<button
						className="text-xs text-red-400 hover:text-red-300 opacity-0 group-hover:opacity-100 ml-1"
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

	// +1 for the root-level InlineAddInput
	const totalRootItems = tree.length + 1;

	return (
		<div className="bg-gray-900 border border-gray-800 rounded-lg">
			<div className="flex items-center justify-between border-b border-gray-800 px-3 py-2">
				<h3 className="text-sm font-semibold">Topic Tree</h3>
				{selectedTopicId && (
					<button
						onClick={() => onRemoveTopic(selectedTopicId)}
						className="text-xs px-2 py-1 bg-red-900 hover:bg-red-800 rounded text-red-300"
					>
						Remove
					</button>
				)}
			</div>
			<div className="border-b border-gray-800 px-3 py-2">
				{selectedTopic ? (
					<code className="text-sm font-mono text-green-400">{selectedTopic.topic}</code>
				) : (
					<span className="text-sm text-gray-500">No topic selected</span>
				)}
			</div>
			<div className="py-1 max-h-[500px] overflow-y-auto">
				{tree.length === 0 && topics.length === 0 ? (
					<p className="text-gray-500 text-sm p-4">No topics. Use + add to create one.</p>
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
