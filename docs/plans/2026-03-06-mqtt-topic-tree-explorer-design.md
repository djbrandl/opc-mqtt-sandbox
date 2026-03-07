# MQTT Topic Tree Explorer

## Overview
Replace the flat topic list (left panel) on the MQTT config page with a hierarchical tree view. The tree is derived by splitting all configured topic paths on `/`. Intermediate segments become folder nodes, leaf segments become topic nodes. Clicking a leaf selects that topic for editing in the right panel.

## Tree Structure
Given topics `spc/machine1/measurements` and `spc/machine1/status`:
```
📁 spc
  📁 machine1
    📨 measurements    ← clickable, selects topic-1
    📨 status          ← clickable, selects topic-2
```
- **Folder nodes**: auto-derived from shared path segments. Not stored separately; computed from topic strings. Expandable/collapsible.
- **Leaf nodes**: correspond 1:1 to a `MqttTopicConfig`. Clicking selects it and loads properties in the right panel.

## Inline "+ Add" Nodes
- Each folder level shows a subtle `+ add` entry at the bottom of its children.
- Clicking reveals an inline text input. Type a name and press Enter.
  - At intermediate levels, creates a new folder (path prefix — no config until a leaf exists).
  - A `+ add topic` action creates a leaf (actual `MqttTopicConfig`) at that level.
- Root level also has `+ add` for new top-level namespaces.

## Topic Path Preview
- Preview bar at top of tree panel shows the full path of the currently selected topic in green monospace.
- Updates live as you navigate.

## Data Flow
- **No schema changes.** `MqttTopicConfig.topic` remains a plain string.
- Tree is a **view-layer concern** — built by splitting `topics[].topic` on `/` and grouping.
- Creating a new leaf via the tree creates a `MqttTopicConfig` with the composed path.
- Renaming a segment updates the `topic` string of all topics sharing that prefix.

## Component Structure
- **`TopicTree.tsx`** (new): tree component. Props: `topics`, `selectedTopicId`, `onSelect`, `onAddTopic`, `onRemoveTopic`. Computes tree from flat topic list.
- **`MqttConfig.tsx`**: swap flat list for `<TopicTree>`. Remove topic path text input from right panel (path is now set via tree).

## Visual Style
- Match existing `TreeEditor.tsx` patterns: indentation, expand/collapse arrows, hover/selected states.
- `📁` for intermediate levels, `📨` for topic leaves.
- Selected leaf: `bg-gray-800 text-purple-400`.
- `+ add` entries: `text-gray-600 hover:text-gray-400`, subtle dashed style.
