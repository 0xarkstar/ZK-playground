"use client";

import { useCallback, useState } from "react";
import {
  ReactFlow,
  Node,
  Edge,
  Controls,
  Background,
  BackgroundVariant,
  useNodesState,
  useEdgesState,
  MarkerType,
  Handle,
  Position,
  NodeProps,
} from "@xyflow/react";
import "@xyflow/react/dist/style.css";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useTranslations } from "next-intl";

type CircuitNodeData = {
  label: string;
  type: "input" | "output" | "signal" | "constraint" | "template";
  value?: string;
  description?: string;
  descriptionKey?: string;
};

type CircuitNode = Node<CircuitNodeData>;

function SignalNode({ data }: NodeProps<CircuitNode>) {
  const colorClasses = {
    input: "bg-green-500/20 border-green-500 text-green-700 dark:text-green-300",
    output: "bg-blue-500/20 border-blue-500 text-blue-700 dark:text-blue-300",
    signal: "bg-gray-500/20 border-gray-500 text-gray-700 dark:text-gray-300",
    constraint: "bg-purple-500/20 border-purple-500 text-purple-700 dark:text-purple-300",
    template: "bg-orange-500/20 border-orange-500 text-orange-700 dark:text-orange-300",
  };

  const nodeData = data as unknown as CircuitNodeData;

  return (
    <div
      className={`px-4 py-2 rounded-lg border-2 min-w-[120px] ${colorClasses[nodeData.type]}`}
    >
      <Handle type="target" position={Position.Top} className="!bg-foreground" />
      <div className="text-xs font-medium uppercase opacity-60">{nodeData.type}</div>
      <div className="font-semibold">{nodeData.label}</div>
      {nodeData.value && (
        <div className="text-xs mt-1 font-mono">{nodeData.value}</div>
      )}
      <Handle type="source" position={Position.Bottom} className="!bg-foreground" />
    </div>
  );
}

function ConstraintNode({ data }: NodeProps<CircuitNode>) {
  const nodeData = data as unknown as CircuitNodeData;
  return (
    <div className="px-4 py-3 rounded-lg border-2 bg-purple-500/20 border-purple-500 min-w-[150px]">
      <Handle type="target" position={Position.Top} className="!bg-foreground" />
      <div className="text-xs font-medium uppercase opacity-60 text-purple-700 dark:text-purple-300">
        constraint
      </div>
      <div className="font-mono text-sm font-semibold text-purple-700 dark:text-purple-300">
        {nodeData.label}
      </div>
      {nodeData.description && (
        <div className="text-xs mt-1 opacity-70">{nodeData.description}</div>
      )}
      <Handle type="source" position={Position.Bottom} className="!bg-foreground" />
    </div>
  );
}

function TemplateNode({ data }: NodeProps<CircuitNode>) {
  const nodeData = data as unknown as CircuitNodeData;
  return (
    <div className="px-4 py-3 rounded-lg border-2 bg-orange-500/20 border-orange-500 min-w-[180px]">
      <Handle type="target" position={Position.Top} className="!bg-foreground" />
      <div className="text-xs font-medium uppercase opacity-60 text-orange-700 dark:text-orange-300">
        template
      </div>
      <div className="font-semibold text-orange-700 dark:text-orange-300">
        {nodeData.label}
      </div>
      {nodeData.description && (
        <div className="text-xs mt-1 opacity-70">{nodeData.description}</div>
      )}
      <Handle type="source" position={Position.Bottom} className="!bg-foreground" />
    </div>
  );
}

const nodeTypes = {
  signal: SignalNode,
  constraint: ConstraintNode,
  template: TemplateNode,
};

interface CircuitConfig {
  nameKey: string;
  descriptionKey: string;
  nodes: CircuitNode[];
  edges: Edge[];
}

const circuitsConfig: Record<string, CircuitConfig> = {
  multiplier: {
    nameKey: "multiplier.name",
    descriptionKey: "multiplier.description",
    nodes: [
      { id: "a", type: "signal", position: { x: 100, y: 50 }, data: { label: "a", type: "input", value: "private" } },
      { id: "b", type: "signal", position: { x: 300, y: 50 }, data: { label: "b", type: "input", value: "private" } },
      { id: "mul", type: "constraint", position: { x: 200, y: 180 }, data: { label: "a * b = c", type: "constraint" } },
      { id: "c", type: "signal", position: { x: 200, y: 320 }, data: { label: "c", type: "output", value: "public" } },
    ] as CircuitNode[],
    edges: [
      { id: "a-mul", source: "a", target: "mul", animated: true },
      { id: "b-mul", source: "b", target: "mul", animated: true },
      { id: "mul-c", source: "mul", target: "c", animated: true, markerEnd: { type: MarkerType.ArrowClosed } },
    ] as Edge[],
  },
  rangeCheck: {
    nameKey: "rangeCheck.name",
    descriptionKey: "rangeCheck.description",
    nodes: [
      { id: "value", type: "signal", position: { x: 200, y: 50 }, data: { label: "value", type: "input", value: "private" } },
      { id: "bits", type: "template", position: { x: 200, y: 150 }, data: { label: "Num2Bits(n)", type: "template", descriptionKey: "decomposeToBits" } },
      { id: "bit0", type: "signal", position: { x: 50, y: 280 }, data: { label: "bit[0]", type: "signal" } },
      { id: "bit1", type: "signal", position: { x: 150, y: 280 }, data: { label: "bit[1]", type: "signal" } },
      { id: "bitn", type: "signal", position: { x: 350, y: 280 }, data: { label: "bit[n-1]", type: "signal" } },
      { id: "check0", type: "constraint", position: { x: 50, y: 400 }, data: { label: "b*(b-1)=0", type: "constraint", descriptionKey: "binaryCheck" } },
      { id: "check1", type: "constraint", position: { x: 150, y: 400 }, data: { label: "b*(b-1)=0", type: "constraint", descriptionKey: "binaryCheck" } },
      { id: "checkn", type: "constraint", position: { x: 350, y: 400 }, data: { label: "b*(b-1)=0", type: "constraint", descriptionKey: "binaryCheck" } },
    ] as CircuitNode[],
    edges: [
      { id: "v-bits", source: "value", target: "bits", animated: true },
      { id: "bits-0", source: "bits", target: "bit0" },
      { id: "bits-1", source: "bits", target: "bit1" },
      { id: "bits-n", source: "bits", target: "bitn" },
      { id: "b0-c0", source: "bit0", target: "check0", animated: true },
      { id: "b1-c1", source: "bit1", target: "check1", animated: true },
      { id: "bn-cn", source: "bitn", target: "checkn", animated: true },
    ] as Edge[],
  },
  voting: {
    nameKey: "voting.name",
    descriptionKey: "voting.description",
    nodes: [
      { id: "secret", type: "signal", position: { x: 100, y: 50 }, data: { label: "identitySecret", type: "input", value: "private" } },
      { id: "path", type: "signal", position: { x: 300, y: 50 }, data: { label: "pathElements", type: "input", value: "private" } },
      { id: "poseidon", type: "template", position: { x: 100, y: 150 }, data: { label: "Poseidon(1)", type: "template", descriptionKey: "hashIdentity" } },
      { id: "commitment", type: "signal", position: { x: 100, y: 260 }, data: { label: "commitment", type: "signal" } },
      { id: "merkle", type: "template", position: { x: 250, y: 260 }, data: { label: "MerkleChecker", type: "template", descriptionKey: "verifyMembership" } },
      { id: "root", type: "signal", position: { x: 250, y: 380 }, data: { label: "merkleRoot", type: "output", value: "public" } },
      { id: "nullifier", type: "template", position: { x: 450, y: 150 }, data: { label: "Poseidon(2)", type: "template", descriptionKey: "nullifierHash" } },
      { id: "extNull", type: "signal", position: { x: 550, y: 50 }, data: { label: "externalNull", type: "input", value: "public" } },
      { id: "nullHash", type: "signal", position: { x: 450, y: 260 }, data: { label: "nullifierHash", type: "output", value: "public" } },
      { id: "vote", type: "signal", position: { x: 600, y: 260 }, data: { label: "vote", type: "input", value: "public" } },
      { id: "voteCheck", type: "constraint", position: { x: 600, y: 380 }, data: { label: "v*(v-1)=0", type: "constraint", descriptionKey: "binaryVote" } },
    ] as CircuitNode[],
    edges: [
      { id: "s-p", source: "secret", target: "poseidon", animated: true },
      { id: "p-c", source: "poseidon", target: "commitment" },
      { id: "c-m", source: "commitment", target: "merkle", animated: true },
      { id: "path-m", source: "path", target: "merkle", animated: true },
      { id: "m-r", source: "merkle", target: "root", markerEnd: { type: MarkerType.ArrowClosed } },
      { id: "s-n", source: "secret", target: "nullifier", animated: true },
      { id: "en-n", source: "extNull", target: "nullifier", animated: true },
      { id: "n-nh", source: "nullifier", target: "nullHash", markerEnd: { type: MarkerType.ArrowClosed } },
      { id: "v-vc", source: "vote", target: "voteCheck", animated: true },
    ] as Edge[],
  },
};

export function CircuitGraph() {
  const t = useTranslations("visualization.circuit");
  const tCircuits = useTranslations("visualization.circuits");
  const tNodes = useTranslations("visualization.circuitNodes");
  const [selectedCircuit, setSelectedCircuit] = useState<keyof typeof circuitsConfig>("multiplier");
  const circuit = circuitsConfig[selectedCircuit];

  const [nodes, setNodes, onNodesChange] = useNodesState(circuit.nodes);
  const [edges, setEdges, onEdgesChange] = useEdgesState(circuit.edges);
  const [selectedNode, setSelectedNode] = useState<CircuitNode | null>(null);

  const onCircuitChange = useCallback((value: string) => {
    const key = value as keyof typeof circuitsConfig;
    setSelectedCircuit(key);
    setNodes(circuitsConfig[key].nodes);
    setEdges(circuitsConfig[key].edges);
    setSelectedNode(null);
  }, [setNodes, setEdges]);

  const onNodeClick = useCallback((_: React.MouseEvent, node: Node) => {
    setSelectedNode(node as CircuitNode);
  }, []);

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-4">
        <div className="flex-1">
          <Select value={selectedCircuit} onValueChange={onCircuitChange}>
            <SelectTrigger className="w-[200px]">
              <SelectValue placeholder={t("circuitSelect.placeholder")} />
            </SelectTrigger>
            <SelectContent>
              {Object.entries(circuitsConfig).map(([key, c]) => (
                <SelectItem key={key} value={key}>
                  {tCircuits(c.nameKey)}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="text-sm text-muted-foreground">{tCircuits(circuit.descriptionKey)}</div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-4">
        <div className="lg:col-span-3 h-[500px] border rounded-lg bg-background">
          <ReactFlow
            nodes={nodes}
            edges={edges}
            onNodesChange={onNodesChange}
            onEdgesChange={onEdgesChange}
            onNodeClick={onNodeClick}
            nodeTypes={nodeTypes}
            fitView
            className="bg-muted/30"
          >
            <Background variant={BackgroundVariant.Dots} gap={16} size={1} />
            <Controls />
          </ReactFlow>
        </div>

        <div className="space-y-4">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm">{t("legend.title")}</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2 text-sm">
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded bg-green-500" />
                <span>{t("legend.inputSignal")}</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded bg-blue-500" />
                <span>{t("legend.outputSignal")}</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded bg-gray-500" />
                <span>{t("legend.intermediateSignal")}</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded bg-purple-500" />
                <span>{t("legend.constraint")}</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded bg-orange-500" />
                <span>{t("legend.templateComponent")}</span>
              </div>
            </CardContent>
          </Card>

          {selectedNode && (
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm">{t("nodeInfo.selectedNode")}</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                <div>
                  <Badge>{(selectedNode.data as unknown as CircuitNodeData).type}</Badge>
                </div>
                <div className="font-semibold">{(selectedNode.data as unknown as CircuitNodeData).label}</div>
                {(selectedNode.data as unknown as CircuitNodeData).value && (
                  <div className="text-sm text-muted-foreground">
                    {t("nodeInfo.visibility")}: {(selectedNode.data as unknown as CircuitNodeData).value}
                  </div>
                )}
                {((selectedNode.data as unknown as CircuitNodeData).description || (selectedNode.data as unknown as CircuitNodeData).descriptionKey) && (
                  <div className="text-sm text-muted-foreground">
                    {(selectedNode.data as unknown as CircuitNodeData).descriptionKey
                      ? tNodes((selectedNode.data as unknown as CircuitNodeData).descriptionKey!)
                      : (selectedNode.data as unknown as CircuitNodeData).description}
                  </div>
                )}
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}
