import {
  OPCUAServer,
  AddressSpace,
  UAVariable,
  DataType,
  Variant,
  StatusCodes,
  AccessLevelFlag,
  coerceNodeId,
  MessageSecurityMode,
  SecurityPolicy,
} from 'node-opcua';
import type { INamespace } from 'node-opcua-address-space-base';
import { OpcuaNodeConfig, ActivityLogEntry } from './types.js';
import { EventEmitter } from 'events';

type NodeMap = Map<string, UAVariable>;

export class OpcuaServerWrapper extends EventEmitter {
  private server: OPCUAServer | null = null;
  private namespace: INamespace | null = null;
  private addressSpace: AddressSpace | null = null;
  private nodeMap: NodeMap = new Map();
  private port: number;
  private _running = false;
  private _securityMode: MessageSecurityMode = MessageSecurityMode.None;
  private _securityPolicy: SecurityPolicy = SecurityPolicy.None;

  get running(): boolean {
    return this._running;
  }

  get securityMode(): string {
    return MessageSecurityMode[this._securityMode];
  }

  get securityPolicy(): string {
    const entry = Object.entries(SecurityPolicy).find(([, v]) => v === this._securityPolicy);
    return entry?.[0] ?? 'None';
  }

  constructor(port = 4840) {
    super();
    this.port = port;
  }

  configure(options: { port?: number; securityMode?: string; securityPolicy?: string }): void {
    if (options.port) this.port = options.port;
    if (options.securityMode) {
      this._securityMode = MessageSecurityMode[options.securityMode as keyof typeof MessageSecurityMode] ?? MessageSecurityMode.None;
    }
    if (options.securityPolicy) {
      this._securityPolicy = SecurityPolicy[options.securityPolicy as keyof typeof SecurityPolicy] ?? SecurityPolicy.None;
    }
  }

  async start(nodes: OpcuaNodeConfig[]): Promise<void> {
    if (this._running) return;

    this.server = new OPCUAServer({
      port: this.port,
      resourcePath: '/UA/Sandbox',
      securityModes: [this._securityMode],
      securityPolicies: [this._securityPolicy],
      buildInfo: {
        productName: 'OPC/MQTT Sandbox',
        buildNumber: '1.0.0',
        buildDate: new Date(),
      },
    });

    await this.server.initialize();
    this.addressSpace = this.server.engine.addressSpace!;
    this.namespace = this.addressSpace.registerNamespace('urn:opc-mqtt-sandbox');

    this.buildNodes(nodes, this.addressSpace.rootFolder.objects);

    await this.server.start();
    this._running = true;
    this.log('connect', `OPC UA server started on port ${this.port}`);
  }

  async stop(): Promise<void> {
    if (!this._running || !this.server) return;
    await this.server.shutdown(1000);
    this.nodeMap.clear();
    this.server = null;
    this.namespace = null;
    this.addressSpace = null;
    this._running = false;
    this.log('disconnect', 'OPC UA server stopped');
  }

  private buildNodes(nodes: OpcuaNodeConfig[], parent: any): void {
    if (!this.namespace) return;

    for (const node of nodes) {
      const nsIdx = this.namespace.index;
      const nodeId = `ns=${nsIdx};s=${node.id}`;

      if (node.type === 'folder') {
        const folder = this.namespace.addFolder(parent, {
          browseName: node.name,
          nodeId,
        });
        if (node.children) {
          this.buildNodes(node.children, folder);
        }
      } else if (node.type === 'object') {
        const obj = this.namespace.addObject({
          organizedBy: parent,
          browseName: node.name,
          nodeId,
        });
        if (node.children) {
          this.buildNodes(node.children, obj);
        }
      } else if (node.type === 'variable') {
        const dataType = this.mapDataType(node.dataType ?? 'Double');
        const variable = this.namespace.addVariable({
          componentOf: parent,
          browseName: node.name,
          nodeId,
          dataType,
          accessLevel: AccessLevelFlag.CurrentRead | AccessLevelFlag.CurrentWrite,
          userAccessLevel: AccessLevelFlag.CurrentRead | AccessLevelFlag.CurrentWrite,
        });

        if (node.initialValue !== undefined) {
          variable.setValueFromSource(
            new Variant({ dataType, value: node.initialValue }),
            StatusCodes.Good,
            new Date()
          );
        }

        this.nodeMap.set(node.id, variable);
      }
    }
  }

  private mapDataType(dt: string): DataType {
    switch (dt) {
      case 'Double': return DataType.Double;
      case 'Int32': return DataType.Int32;
      case 'String': return DataType.String;
      case 'Boolean': return DataType.Boolean;
      default: return DataType.Double;
    }
  }

  setValue(nodeId: string, value: number | string | boolean): void {
    const variable = this.nodeMap.get(nodeId);
    if (!variable) return;

    const dataType = variable.dataType.value as number;
    variable.setValueFromSource(
      new Variant({ dataType, value }),
      StatusCodes.Good,
      new Date()
    );
    this.log('write', `${nodeId} = ${value}`);
  }

  getValue(nodeId: string): { value: any; timestamp: Date } | null {
    const variable = this.nodeMap.get(nodeId);
    if (!variable) return null;

    const dv = variable.readValue();
    return {
      value: dv.value?.value,
      timestamp: dv.sourceTimestamp ?? new Date(),
    };
  }

  getAllValues(): Record<string, { value: any; timestamp: string }> {
    const result: Record<string, { value: any; timestamp: string }> = {};
    for (const [id, variable] of this.nodeMap) {
      const dv = variable.readValue();
      result[id] = {
        value: dv.value?.value,
        timestamp: (dv.sourceTimestamp ?? new Date()).toISOString(),
      };
    }
    return result;
  }

  addNode(node: OpcuaNodeConfig, parentId?: string): void {
    if (!this.namespace || !this.addressSpace) return;

    let parent: any;
    if (parentId) {
      const nsIdx = this.namespace.index;
      parent = this.addressSpace.findNode(coerceNodeId(`ns=${nsIdx};s=${parentId}`));
    }
    if (!parent) {
      parent = this.addressSpace.rootFolder.objects;
    }

    this.buildNodes([node], parent);
  }

  removeNode(nodeId: string): void {
    if (!this.addressSpace || !this.namespace) return;
    const nsIdx = this.namespace.index;
    const node = this.addressSpace.findNode(coerceNodeId(`ns=${nsIdx};s=${nodeId}`));
    if (node) {
      this.addressSpace.deleteNode(node);
      this.nodeMap.delete(nodeId);
    }
  }

  getNodeIds(): string[] {
    return Array.from(this.nodeMap.keys());
  }

  getConnectedSessionCount(): number {
    if (!this.server) return 0;
    return this.server.currentSessionCount ?? 0;
  }

  private log(type: ActivityLogEntry['type'], detail: string): void {
    this.emit('activity', {
      timestamp: new Date().toISOString(),
      protocol: 'opcua',
      type,
      detail,
    } satisfies ActivityLogEntry);
  }
}
