import { useCallback, useRef } from 'react'
import {
  ReactFlow,
  Background,
  Controls,
  useReactFlow,
  useNodesState,
  useEdgesState,
  addEdge,
  type Connection,
  type Edge,
  type Node,
  type ReactFlowInstance,
} from '@xyflow/react'
import '@xyflow/react/dist/style.css'
import type { WorkflowDefinition, WorkflowNodeData, NodeDefinition } from './types'
import WorkflowNode from './CustomNode'

const nodeTypes = {
  workflowNode: WorkflowNode,
} as any

interface FlowCanvasProps {
  workflow: WorkflowDefinition
  onNodeSelect: (node: WorkflowNodeData | null) => void
  onNodesChange?: (nodes: Node[]) => void
  onEdgesChange?: (edges: Edge[]) => void
  onInit?: (instance: ReactFlowInstance) => void
}

export default function FlowCanvas({
  workflow,
  onNodeSelect,
  onNodesChange,
  onEdgesChange,
  onInit,
}: FlowCanvasProps) {
  const [nodes, setNodes, onNodesChangeInternal] = useNodesState(
    workflow.nodes.map((n) => ({ ...n, type: 'workflowNode' }))
  )
  const [edges, setEdges, onEdgesChangeInternal] = useEdgesState(
    workflow.edges.map((e) => ({
      ...e,
      type: 'smoothstep',
      animated: true,
      style: { stroke: '#94A3B8', strokeWidth: 2 },
      markerEnd: { type: 'arrowclosed', color: '#94A3B8', width: 10, height: 10 },
    }))
  )
  const reactFlowInstance = useReactFlow()
  const reactFlowWrapper = useRef<HTMLDivElement>(null)
  const initRef = useRef(false)

  // Call onInit once
  if (!initRef.current && onInit) {
    initRef.current = true
    // Defer to ensure instance is ready
    setTimeout(() => {
      if (reactFlowInstance) {
        onInit(reactFlowInstance as unknown as ReactFlowInstance)
      }
    }, 0)
  }

  const onConnect = useCallback(
    (params: Connection) => {
      const newEdges = addEdge(
        {
          ...params,
          type: 'smoothstep',
          animated: true,
          style: { stroke: '#94A3B8', strokeWidth: 2 },
          markerEnd: { type: 'arrowclosed' as const, color: '#94A3B8', width: 10, height: 10 },
        },
        edges
      )
      setEdges(newEdges)
      onEdgesChange?.(newEdges)
    },
    [edges, setEdges, onEdgesChange]
  )

  const onNodeClick = useCallback(
    (_event: React.MouseEvent, node: Node) => {
      onNodeSelect(node.data as unknown as WorkflowNodeData)
    },
    [onNodeSelect]
  )

  const onPaneClick = useCallback(() => {
    onNodeSelect(null)
  }, [onNodeSelect])

  const onDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    e.dataTransfer.dropEffect = 'move'
  }, [])

  const onDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault()
      if (!reactFlowWrapper.current || !reactFlowInstance) return

      const reactFlowBounds = reactFlowWrapper.current.getBoundingClientRect()
      const dataStr = e.dataTransfer.getData('application/reactflow')
      if (!dataStr) return

      try {
        const nodeDef: NodeDefinition = JSON.parse(dataStr)
        const position = reactFlowInstance.screenToFlowPosition({
          x: e.clientX - reactFlowBounds.left,
          y: e.clientY - reactFlowBounds.top,
        })

        const newNode: Node = {
          id: `${nodeDef.type}-${Date.now()}`,
          type: 'workflowNode',
          position,
          data: {
            label: nodeDef.label,
            type: nodeDef.type,
            category: nodeDef.category,
            status: 'idle',
            color: nodeDef.color,
            icon: nodeDef.icon,
            description: nodeDef.description,
            config: {
              label: nodeDef.label,
              description: nodeDef.description,
              notes: '',
            },
          } as unknown as Record<string, unknown>,
        }

        const newNodes = nodes.concat(newNode as unknown as typeof nodes[0])
        setNodes(newNodes)
        onNodesChange?.(newNodes)
      } catch {
        // ignore parse errors
      }
    },
    [reactFlowInstance, nodes, setNodes, onNodesChange]
  )

  const onNodesDelete = useCallback(
    (deletedNodes: Node[]) => {
      const newNodes = nodes.filter((n) => !deletedNodes.find((dn) => dn.id === n.id))
      setNodes(newNodes)
      onNodesChange?.(newNodes)
    },
    [nodes, setNodes, onNodesChange]
  )

  const onEdgesDelete = useCallback(
    (deletedEdges: Edge[]) => {
      const newEdges = edges.filter((e) => !deletedEdges.find((de) => de.id === e.id))
      setEdges(newEdges)
      onEdgesChange?.(newEdges)
    },
    [edges, setEdges, onEdgesChange]
  )

  return (
    <div ref={reactFlowWrapper} className="flex-1 relative overflow-hidden">
      <ReactFlow
        nodes={nodes}
        edges={edges}
        onNodesChange={onNodesChangeInternal}
        onEdgesChange={onEdgesChangeInternal}
        onConnect={onConnect}
        onNodeClick={onNodeClick}
        onPaneClick={onPaneClick}
        onDragOver={onDragOver}
        onDrop={onDrop}
        onNodesDelete={onNodesDelete}
        onEdgesDelete={onEdgesDelete}
        nodeTypes={nodeTypes}
        fitView
        fitViewOptions={{ padding: 0.2 }}
        minZoom={0.25}
        maxZoom={2}
        defaultEdgeOptions={{
          type: 'smoothstep',
          animated: true,
          style: { stroke: '#94A3B8', strokeWidth: 2 },
        }}
        deleteKeyCode="Delete"
        selectionKeyCode="Shift"
        multiSelectionKeyCode="Control"
        proOptions={{ hideAttribution: true }}
        style={{ backgroundColor: '#0A0E17' }}
      >
        <Background
          gap={20}
          size={1}
          color="rgba(148, 163, 184, 0.06)"
          style={{ backgroundColor: '#0A0E17' }}
        />
        <Controls
          className="!bg-[#111827] !border-[rgba(148,163,184,0.08)]"
        />
      </ReactFlow>
    </div>
  )
}
