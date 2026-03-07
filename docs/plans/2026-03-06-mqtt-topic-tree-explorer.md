# MQTT Topic Tree Explorer Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Replace the flat MQTT topic list with a hierarchical tree explorer that derives folder structure from topic path segments.

**Architecture:** A new `TopicTree.tsx` component computes a tree from flat `MqttTopicConfig[]` by splitting each `topic` string on `/`. Folder nodes are virtual (not stored), leaf nodes map 1:1 to topic configs. The existing `MqttConfig.tsx` swaps the flat list for this tree and removes the topic path text input (since the path is defined by position in the tree).

**Tech Stack:** React, TypeScript, Tailwind CSS (matching existing patterns from `TreeEditor.tsx`)

---

### Task 1: Create `TopicTree.tsx` — Tree data structure & rendering

**Files:**
- Create: `client/src/components/TopicTree.tsx`

**Step 1: Create the component with tree-building logic and rendering**

The component needs:
1. A `buildTree` function that takes `MqttTopic[]` and returns a tree structure
2. A recursive `TreeNode` renderer with expand/collapse, icons, selection
3. Inline "+ add" nodes at each level
4. A topic path preview bar at the top

```tsx
// Types for the computed tree
interface TopicTreeNode {
  segment: string;       // this level's name (e.g., "machine1")
  path: string;          // full path to this node (e.g., "spc/machine1")
  topicId: string | null; // non-null = this is a leaf with a config
  children: TopicTreeNode[];
}

interface TopicTreeProps {
  topics: MqttTopic[];    // reuse the MqttTopic interface from MqttConfig
  selectedTopicId: string | null;
  onSelect: (id: string) => void;
  onAddTopic: (parentPath: string) => void;
  onRemoveTopic: (id: string) => void;
}
```

Key behaviors:
- `buildTree`: iterate topics, split each `topic` on `/`, walk/create intermediate nodes, mark the final segment with `topicId`
- Folder nodes (topicId === null): show 📁, expand/collapse, no select action
- Leaf nodes (topicId !== null): show 📨, clicking calls `onSelect(topicId)`
- Each folder's children list ends with a subtle `+ add` row
- Root level also has `+ add` at the bottom
- `+ add` click: shows inline text input, Enter creates either a folder (if more levels needed) or calls `onAddTopic(parentPath + "/" + name)`
- Preview bar at top: shows selected topic's full path in green monospace, or "No topic selected" in gray

Visual patterns to match from `TreeEditor.tsx`:
- Indentation: `paddingLeft: ${depth * 16 + 8}px`
- Selected state: `bg-gray-800 text-purple-400`
- Hover: `hover:bg-gray-800`
- Expand/collapse: `▼`/`▶` arrows
- Container: `bg-gray-900 border border-gray-800 rounded-lg`

**Step 2: Verify it compiles**

Run: `npx tsc --noEmit`
Expected: No errors related to TopicTree

**Step 3: Commit**

```bash
git add client/src/components/TopicTree.tsx
git commit -m "feat: add TopicTree component for MQTT topic hierarchy"
```

---

### Task 2: Integrate `TopicTree` into `MqttConfig.tsx`

**Files:**
- Modify: `client/src/pages/MqttConfig.tsx`

**Step 1: Replace the flat topic list with TopicTree**

Changes needed:
1. Import `TopicTree` from `@/components/TopicTree`
2. Replace the left panel (the `bg-gray-900` div containing the flat topic list, lines ~138-163) with `<TopicTree>` component
3. Update `handleAddTopic` to accept a `parentPath` string parameter:
   - The new topic's `topic` field = `parentPath + "/newTopic"` (or just `parentPath` if adding a leaf directly)
   - Keep the same default payload schema and settings
4. Remove the "Topic Path" text input from the right panel (lines ~171-178) since the path is now defined by position in the tree
5. Keep everything else in the right panel (QoS, publish rate, payload schema)

The grid layout stays `grid-cols-1 lg:grid-cols-3` — the tree just replaces what's in the first column.

**Step 2: Verify it compiles and renders**

Run: `npx tsc --noEmit`
Then open http://localhost:9433/mqtt and verify:
- Tree shows the default topic `spc/machine1/measurements` as a hierarchy
- Clicking the leaf selects it and shows properties on the right
- `+ add` nodes appear at each level
- Preview bar shows the selected path

**Step 3: Commit**

```bash
git add client/src/pages/MqttConfig.tsx
git commit -m "feat: integrate TopicTree into MQTT config page"
```

---

### Task 3: Test inline add flow and edge cases

**Files:**
- Modify: `client/src/components/TopicTree.tsx` (if fixes needed)
- Modify: `client/src/pages/MqttConfig.tsx` (if fixes needed)

**Step 1: Manual testing checklist**

Verify in browser:
- [ ] Default config shows tree: `📁 spc > 📁 machine1 > 📨 measurements`
- [ ] Clicking `measurements` leaf selects it, right panel shows QoS/schema
- [ ] Preview bar shows `spc/machine1/measurements` in green
- [ ] `+ add` under `machine1` folder: type "status", press Enter → creates new topic `spc/machine1/status`
- [ ] `+ add` at root: type "sensors", press Enter → creates folder, then can add under it
- [ ] Remove topic via right panel or tree → topic disappears, tree updates
- [ ] Save Config → persists the new topics
- [ ] Multiple topics with shared prefixes render correctly as shared folders
- [ ] Single-segment topics (e.g., "alerts") render as a leaf at root level

**Step 2: Fix any issues found**

**Step 3: Final commit**

```bash
git add -u
git commit -m "fix: polish TopicTree interactions and edge cases"
```
