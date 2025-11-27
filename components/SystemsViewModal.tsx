
import React, { useEffect, useRef, useState, useMemo } from 'react';
import * as d3 from 'd3';
import { SystemsViewData, SystemActor, MindMapData, SystemInteraction, AppTheme } from '../types';
import { X, Lock, Unlock, RefreshCw, Filter, User, Server, Globe, LayoutGrid, Network, ArrowRight, Plus, Trash2, Edit2, Download, FileText, GitBranch, ArrowUpRight, PlayCircle, MoreHorizontal, Activity, Workflow, Loader2, Code, BoxSelect, Tag, AlertTriangle } from 'lucide-react';
import { MindMapNode } from './MindMapNode';
import { SESAR_LOGO_STRING } from './SesarLogo';
import { generateSequenceDiagram } from '../services/geminiService';

interface SystemsViewModalProps {
  data: SystemsViewData;
  mindMap: MindMapData;
  isLocked: boolean;
  onClose: () => void;
  onToggleLock: () => void;
  onRegenerate: () => void;
  onUpdate: (newData: SystemsViewData) => void;
  onAddToMindMap: (parentId: string, newNodes: MindMapData[]) => void;
  onOpenDetails: (node: MindMapData) => void;
  onOpenProcess: (node: MindMapData) => void;
  isDevMode?: boolean;
  theme: AppTheme;
}

/**
 * Helper Component to render Mermaid diagrams dynamically
 */
const MermaidViewer: React.FC<{ code: string }> = ({ code }) => {
    const ref = useRef<HTMLDivElement>(null);
    const [svg, setSvg] = useState<string>('');
    const [error, setError] = useState<string | null>(null);
    
    useEffect(() => {
        const render = async () => {
            if (!code) return;
            try {
                setError(null);
                // Dynamic import from CDN to avoid heavy bundling
                const mermaid = (await import('https://cdn.jsdelivr.net/npm/mermaid@10/dist/mermaid.esm.min.mjs')).default;
                mermaid.initialize({ startOnLoad: false, theme: 'default', securityLevel: 'loose' });
                
                const id = `mermaid-${Math.random().toString(36).substr(2, 9)}`;
                // Attempt to parse first to catch errors early if possible, though render throws too
                const { svg } = await mermaid.render(id, code);
                setSvg(svg);
            } catch (e: any) {
                // Mermaid errors are often objects
                console.warn("Mermaid render warning:", e);
                setError(e.message || "Syntax Error");
            }
        };

        const timeoutId = setTimeout(render, 500); // Debounce typing
        return () => clearTimeout(timeoutId);
    }, [code]);

    if (error) {
        return (
            <div className="flex flex-col items-center justify-center p-8 text-red-500 bg-red-50 border border-red-100 rounded-lg">
                <AlertTriangle size={24} className="mb-2" />
                <p className="font-bold text-sm">Syntax Error</p>
                <p className="font-mono text-xs mt-1">{error}</p>
            </div>
        );
    }

    return <div ref={ref} dangerouslySetInnerHTML={{ __html: svg }} className="flex justify-center w-full mermaid-container" />;
};

/**
 * Helper to flatten the recursive Mind Map into a linear list.
 * Used for the "Target Selection" modal when adding system nodes to the map.
 */
const getAllNodes = (node: MindMapData, depth = 0): { id: string, label: string, depth: number }[] => {
    let list = [{ id: node.id, label: node.label, depth }];
    if (node.children) {
        node.children.forEach(child => {
            list = [...list, ...getAllNodes(child, depth + 1)];
        });
    }
    return list;
};

/**
 * Modal Component for selecting where to attach new nodes.
 */
const TargetParentModal: React.FC<{ 
    mindMap: MindMapData; 
    onConfirm: (parentId: string) => void; 
    onCancel: () => void 
}> = ({ mindMap, onConfirm, onCancel }) => {
    const nodes = useMemo(() => getAllNodes(mindMap), [mindMap]);
    const [selectedId, setSelectedId] = useState(mindMap.id);

    return (
        <div className="absolute inset-0 z-[60] flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
             <div className="bg-white rounded-xl shadow-2xl w-full max-w-sm p-6 animate-in zoom-in-95">
                 <h3 className="text-lg font-bold text-slate-800 mb-4 flex items-center gap-2">
                     <GitBranch size={20} className="text-blue-600" />
                     Select Parent Node
                 </h3>
                 <p className="text-sm text-slate-500 mb-4">
                     Choose where to attach this new content in the Mind Map.
                 </p>
                 <div className="max-h-60 overflow-y-auto border border-slate-200 rounded-lg p-2 bg-slate-50 mb-4">
                     {nodes.map(n => (
                         <div 
                            key={n.id} 
                            onClick={() => setSelectedId(n.id)}
                            className={`px-2 py-1.5 cursor-pointer rounded text-sm transition-colors flex items-center gap-2 ${selectedId === n.id ? 'bg-blue-100 text-blue-700 font-bold' : 'hover:bg-slate-200 text-slate-700'}`}
                            style={{ paddingLeft: `${(n.depth * 12) + 8}px` }}
                         >
                             {selectedId === n.id && <div className="w-1.5 h-1.5 rounded-full bg-blue-600 shrink-0" />}
                             <span className="truncate">{n.label}</span>
                         </div>
                     ))}
                 </div>
                 <div className="flex gap-2">
                     <button onClick={onCancel} className="flex-1 py-2 text-slate-600 font-medium hover:bg-slate-100 rounded-lg">Cancel</button>
                     <button onClick={() => onConfirm(selectedId)} className="flex-1 py-2 bg-blue-600 text-white font-bold rounded-lg hover:bg-blue-700">Add to Map</button>
                 </div>
             </div>
        </div>
    );
};

/**
 * Transforms the flat "Mesh" data (Actors + Interactions) into a Tree structure
 * for visualization in D3.
 */
const buildSystemTree = (data: SystemsViewData, rootId: string, dataFilter?: string) => {
    const rootActor = data.actors.find(a => a.id === rootId);
    if (!rootActor) return null;

    // If filtering by data type, first find which actors are involved with that data
    const relevantActors = new Set<string>();
    if (dataFilter) {
        data.interactions.forEach(i => {
            if (i.data === dataFilter) {
                relevantActors.add(typeof i.source === 'object' ? (i.source as any).id : i.source);
                relevantActors.add(typeof i.target === 'object' ? (i.target as any).id : i.target);
            }
        });
    }

    const visited = new Set<string>();
    visited.add(rootId);

    const buildNode = (actor: SystemActor): any => {
        const childrenActors: { actor: SystemActor, interaction: string }[] = [];
        
        data.interactions.forEach(link => {
             // Apply Data Filter
             if (dataFilter && link.data !== dataFilter) return;

             const s = typeof link.source === 'object' ? (link.source as any).id || (link.source as any).name : link.source;
             const t = typeof link.target === 'object' ? (link.target as any).id || (link.target as any).name : link.target;
             
             // Check connections
             let targetId: string | null = null;
             let prefix = "";
             
             if (s === actor.id && !visited.has(t)) {
                 targetId = t;
                 prefix = "→ ";
             } else if (t === actor.id && !visited.has(s)) {
                 targetId = s;
                 prefix = "← ";
             }

             if (targetId) {
                 const targetActor = data.actors.find(a => a.id === targetId);
                 if (targetActor) {
                     // If filtering, ensure target is relevant
                     if (!dataFilter || relevantActors.has(targetId)) {
                         visited.add(targetId);
                         childrenActors.push({ actor: targetActor, interaction: `${prefix}${link.data}` });
                     }
                 }
             }
        });

        return {
            id: actor.id,
            label: actor.name,
            nodeType: actor.type === 'person' ? 'info' : 'process', 
            nature: 'fact',
            source: 'ai',
            description: actor.type,
            children: childrenActors.map(c => {
                const node = buildNode(c.actor);
                node.linkLabel = c.interaction; 
                return node;
            })
        };
    };

    return buildNode(rootActor);
};

export const SystemsViewModal: React.FC<SystemsViewModalProps> = ({ 
  data, mindMap, isLocked, onClose, onToggleLock, onRegenerate, onUpdate, onAddToMindMap, onOpenDetails, onOpenProcess, isDevMode, theme
}) => {
  const [viewMode, setViewMode] = useState<'map' | 'table' | 'dataflow'>('map');
  const [rootId, setRootId] = useState<string | null>(null);
  
  // Interaction Editor State
  const [editingCell, setEditingCell] = useState<{ source: string, target: string } | null>(null);
  const [addingActor, setAddingActor] = useState(false);
  const [newActorName, setNewActorName] = useState('');
  const [newActivity, setNewActivity] = useState('');
  const [newData, setNewData] = useState('');

  // Sequence Diagram State
  const [sequenceLoading, setSequenceLoading] = useState(false);
  const [sequenceCode, setSequenceCode] = useState<string | null>(null);
  // Track active interaction ID for regeneration
  const [activeInteractionId, setActiveInteractionId] = useState<string | null>(null);
  const sequenceRef = useRef<HTMLDivElement>(null);

  // Node Selection State
  const [targetSelectionMode, setTargetSelectionMode] = useState<{ 
      type: 'actor' | 'interaction' | 'concept', 
      payload: any 
  } | null>(null);

  // Data Flow State
  const [selectedDataFlow, setSelectedDataFlow] = useState<string | null>(null);

  // Actor Menu State
  const [activeActorMenu, setActiveActorMenu] = useState<string | null>(null);

  // D3 Refs
  const svgRef = useRef<SVGSVGElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [transform, setTransform] = useState({ x: 0, y: 0, k: 1 });

  // Default Root Detection
  useEffect(() => {
    if (!data || rootId) return;
    // Heuristic: Prefer "Aircraft" or "Pilot" as root if found
    const preferred = data.actors.find(a => /aircraft/i.test(a.name) || /pilot/i.test(a.name));
    if (preferred) setRootId(preferred.id);
    else if (data.actors.length > 0) setRootId(data.actors[0].id);
  }, [data]);

  // Extract unique data types for Data Flow view
  const uniqueDataTypes = useMemo(() => {
      const types = new Set<string>();
      data.interactions.forEach(i => types.add(i.data));
      return Array.from(types).sort();
  }, [data]);

  // Auto-select first data type if switching to dataflow view
  useEffect(() => {
      if (viewMode === 'dataflow' && !selectedDataFlow && uniqueDataTypes.length > 0) {
          setSelectedDataFlow(uniqueDataTypes[0]);
      }
  }, [viewMode, uniqueDataTypes]);

  // Tree Generation
  const treeData = useMemo(() => {
      if (!data || !rootId) return null;
      // If in dataflow mode, use the filter
      const filter = viewMode === 'dataflow' ? selectedDataFlow : undefined;
      return buildSystemTree(data, rootId, filter || undefined);
  }, [data, rootId, viewMode, selectedDataFlow]);

  // D3 Layout Logic
  const { nodes, links } = useMemo(() => {
      if (!treeData) return { nodes: [], links: [] };
      const root = d3.hierarchy(treeData);
      const nodeWidth = 320; 
      const nodeHeight = 180;
      const tree = d3.tree().nodeSize([nodeHeight, nodeWidth]);
      const layoutRoot = tree(root);
      const finalNodes: any[] = [];
      
      // Swap x/y for horizontal layout
      layoutRoot.descendants().forEach((d: any) => {
          const temp = d.x;
          d.x = d.y;
          d.y = temp;
          finalNodes.push(d);
      });
      return { nodes: finalNodes, links: layoutRoot.links() };
  }, [treeData]);

  // D3 Rendering & Zoom Setup
  useEffect(() => {
      if ((viewMode !== 'map' && viewMode !== 'dataflow') || !svgRef.current || !nodes.length) return;
      const zoom = d3.zoom<SVGSVGElement, unknown>()
          .scaleExtent([0.1, 3])
          .on('zoom', (event) => setTransform(event.transform));
      d3.select(svgRef.current).call(zoom);
      
      // Center initial view
      if (containerRef.current) {
         const { clientWidth, clientHeight } = containerRef.current;
         const t = d3.zoomIdentity.translate(clientWidth/2 - 100, clientHeight/2).scale(0.8);
         d3.select(svgRef.current).call(zoom.transform, t);
      }
  }, [viewMode, nodes.length, selectedDataFlow]); // Re-center when data flow changes

  // --- HELPER: Find existing node in mind map by label ---
  const findMatchingNode = (label: string) => {
      const allNodes = getAllNodes(mindMap);
      return allNodes.find(n => n.label.toLowerCase() === label.toLowerCase());
  };

  // Opens Details/Process modals from inside Systems View
  const handleOpenLinkedNode = (label: string, type: 'details' | 'process') => {
      const findFullNode = (root: MindMapData): MindMapData | null => {
          if (root.label.toLowerCase() === label.toLowerCase()) return root;
          if (root.children) {
              for (const child of root.children) {
                  const found = findFullNode(child);
                  if (found) return found;
              }
          }
          return null;
      };
      
      const node = findFullNode(mindMap);
      if (node) {
          if (type === 'details') onOpenDetails(node);
          else onOpenProcess(node);
      }
  };

  // --- ACTIONS ---
  const handleAddActor = () => {
      if (!newActorName.trim()) return;
      const id = newActorName.trim().replace(/\s+/g, '-').toLowerCase();
      const newActor: SystemActor = { id, name: newActorName.trim(), type: 'system' };
      onUpdate({ ...data, actors: [...data.actors, newActor] });
      setAddingActor(false);
      setNewActorName('');
  };

  const handleAddInteraction = () => {
      if (!editingCell || !newActivity.trim()) return;
      const interaction = {
          id: crypto.randomUUID(),
          source: editingCell.source,
          target: editingCell.target,
          activity: newActivity.trim(),
          data: newData.trim() || 'Signal'
      };
      onUpdate({ ...data, interactions: [...data.interactions, interaction] });
      setNewActivity('');
      setNewData('');
  };

  const handleDeleteInteraction = (id: string) => {
      onUpdate({ ...data, interactions: data.interactions.filter(i => i.id !== id) });
  };

  const handleDeleteActor = (actorId: string) => {
      const updatedActors = data.actors.filter(a => a.id !== actorId);
      const updatedInteractions = data.interactions.filter(i => {
          const s = typeof i.source === 'object' ? (i.source as any).id : i.source;
          const t = typeof i.target === 'object' ? (i.target as any).id : i.target;
          return s !== actorId && t !== actorId;
      });
      onUpdate({ actors: updatedActors, interactions: updatedInteractions, activities: data.activities });
      setActiveActorMenu(null);
  };

  const handleLinkClick = (linkData: any) => {
      // Find source and target IDs from the link data provided by D3
      // D3 links are objects { source: Node, target: Node }
      const sId = linkData.source.data.id;
      const tId = linkData.target.data.id;
      setEditingCell({ source: sId, target: tId });
  };

  // Sequence Generator
  const handleGenerateSequence = async (interaction: SystemInteraction, forceRegenerate = false) => {
      setActiveInteractionId(interaction.id);

      // Cached Check
      if (interaction.sequenceDiagram && !forceRegenerate) {
          setSequenceCode(interaction.sequenceDiagram);
          return;
      }

      setSequenceLoading(true);
      try {
          const source = data.actors.find(a => a.id === (typeof interaction.source === 'string' ? interaction.source : (interaction.source as any).id));
          const target = data.actors.find(a => a.id === (typeof interaction.target === 'string' ? interaction.target : (interaction.target as any).id));
          
          // Pass a reconstructed context
          const context = {
              sourceName: source?.name || 'Source',
              targetName: target?.name || 'Target',
              activity: interaction.activity,
              data: interaction.data
          };
          
          const contextText = getAllNodes(mindMap).map(n => n.label).join(", ");
          
          const systemContext = data.interactions.map(i => {
              const s = data.actors.find(a => a.id === (typeof i.source === 'string' ? i.source : (i.source as any).id))?.name;
              const t = data.actors.find(a => a.id === (typeof i.target === 'string' ? i.target : (i.target as any).id))?.name;
              return `${s} -> ${t}: ${i.activity} (${i.data})`;
          }).join("\n");

          const code = await generateSequenceDiagram(context, systemContext, { readerRole: 'Technical', aiPersona: 'Expert', detailLevel: 'Detailed' });
          setSequenceCode(code);

          // Persist the generated code to the interaction model
          const updatedInteractions = data.interactions.map(i => 
              i.id === interaction.id ? { ...i, sequenceDiagram: code } : i
          );
          onUpdate({ ...data, interactions: updatedInteractions });

      } catch (e) {
          alert("Failed to generate sequence diagram.");
      } finally {
          setSequenceLoading(false);
      }
  };

  // Export Sequence Diagram to PNG
  const handleExportSequencePng = async () => {
      if (!sequenceRef.current) return;
      try {
          const { toPng } = await import('html-to-image');
          // Target the specific inner content to avoid capturing scrollbars or padding issues
          const content = sequenceRef.current.querySelector('.mermaid-container') as HTMLElement;
          if (!content) return;

          const dataUrl = await toPng(content, { backgroundColor: '#ffffff', pixelRatio: 2 });
          const link = document.createElement('a');
          link.download = `SequenceDiagram-${Date.now()}.png`;
          link.href = dataUrl;
          link.click();
      } catch (e) {
          console.error("Export failed", e);
          alert("Failed to export image.");
      }
  };

  // Finalizes adding content to the main map
  const confirmAddToMindMap = (parentId: string) => {
      if (!targetSelectionMode) return;

      if (targetSelectionMode.type === 'concept') {
          // Add abstract data type concept
          const conceptLabel = targetSelectionMode.payload;
          const node: MindMapData = {
              id: crypto.randomUUID(),
              label: conceptLabel,
              description: "Data Type / System Concept",
              nodeType: 'info',
              nature: 'fact',
              source: 'ai',
              children: []
          };
          onAddToMindMap(parentId, [node]);

      } else if (targetSelectionMode.type === 'actor') {
          // Add Actor Node AND its interactions as children
          const actor = targetSelectionMode.payload as SystemActor;
          
          // Find interactions
          const related = data.interactions.filter(i => {
             const s = typeof i.source === 'object' ? (i.source as any).id : i.source;
             const t = typeof i.target === 'object' ? (i.target as any).id : i.target;
             return s === actor.id || t === actor.id;
          });

          const children: MindMapData[] = related.map(rel => {
             const isSource = (typeof rel.source === 'object' ? (rel.source as any).id : rel.source) === actor.id;
             // Construct label
             const otherId = isSource ? (typeof rel.target === 'object' ? (rel.target as any).id : rel.target) : (typeof rel.source === 'object' ? (rel.source as any).id : rel.source);
             const otherActor = data.actors.find(a => a.id === otherId);
             
             return {
                 id: crypto.randomUUID(),
                 label: rel.data,
                 description: `${rel.activity} ${isSource ? 'to' : 'from'} ${otherActor?.name || 'Unknown'}`,
                 nodeType: 'process',
                 nature: 'fact',
                 source: 'ai',
                 children: []
             };
          });

          const actorNode: MindMapData = {
              id: crypto.randomUUID(),
              label: actor.name,
              description: `System Actor: ${actor.type}`,
              nodeType: 'info',
              nature: 'fact',
              source: 'ai',
              children: children
          };

          onAddToMindMap(parentId, [actorNode]);

      } else if (targetSelectionMode.type === 'interaction') {
          // Add single interaction
          const interaction = targetSelectionMode.payload as SystemInteraction;
          const node: MindMapData = {
              id: crypto.randomUUID(),
              label: interaction.data,
              description: `Activity: ${interaction.activity}`,
              nodeType: 'process',
              nature: 'fact',
              source: 'ai',
              children: []
          };
          onAddToMindMap(parentId, [node]);
      }

      setTargetSelectionMode(null);
      setActiveActorMenu(null);
  };

  // --- TABLE MODE DATA ---
  // Transforms graph into Adjacency Matrix
  const matrixData = useMemo(() => {
      if (!data) return { rows: [], cols: [], cellMap: new Map() };
      const sortedActors = [...data.actors].sort((a, b) => a.name.localeCompare(b.name));
      const cellMap = new Map<string, any[]>();
      data.interactions.forEach(link => {
             const s = typeof link.source === 'object' ? (link.source as any).id : link.source;
             const t = typeof link.target === 'object' ? (link.target as any).id : link.target;
             const key = `${s}-${t}`;
             if (!cellMap.has(key)) cellMap.set(key, []);
             cellMap.get(key)?.push(link);
      });
      return { rows: sortedActors, cols: sortedActors, cellMap };
  }, [data]);

  // Exports Table as CSV
  const handleExportCsv = () => {
      if (!data) return;
      const { rows, cols, cellMap } = matrixData;
      
      // Build Header
      const header = ['Initiator \\ Target', ...cols.map(c => `"${c.name.replace(/"/g, '""')}"`)].join(',');
      
      // Build Rows
      const body = rows.map(row => {
          const rowName = `"${row.name.replace(/"/g, '""')}"`;
          const cells = cols.map(col => {
              const key = `${row.id}-${col.id}`;
              const interactions = cellMap.get(key);
              if (!interactions || interactions.length === 0) return '""';
              
              // Format: [Activity] Data; ...
              const content = interactions.map(i => `[${i.activity}] ${i.data}`).join('; ');
              return `"${content.replace(/"/g, '""')}"`;
          });
          return [rowName, ...cells].join(',');
      }).join('\n');
      
      const csv = `${header}\n${body}`;
      
      const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
      
      link.href = url;
      link.setAttribute('download', `SystemsMesh-${timestamp}.csv`);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
  };

  const handleExportPng = async () => {
      try {
          const { toPng } = await import('html-to-image');
          const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
          
          if (viewMode === 'map' || viewMode === 'dataflow') {
              if (!containerRef.current) return;
              
              // 1. Calculate content bounds including full node dimensions
              let minX = Infinity, maxX = -Infinity, minY = Infinity, maxY = -Infinity;
              nodes.forEach((node: any) => {
                  const x = node.x;
                  const y = node.y;
                  const hw = 160; 
                  const hh = 100;
                  
                  if (x - hw < minX) minX = x - hw;
                  if (x + hw > maxX) maxX = x + hw;
                  if (y - hh < minY) minY = y - hh;
                  if (y + hh > maxY) maxY = y + hh;
              });
              
              const padding = 80;
              const width = maxX - minX + (padding * 2);
              const height = maxY - minY + (padding * 2);
              
              const dataUrl = await toPng(containerRef.current, {
                  backgroundColor: theme.canvasBg, // Use theme
                  width: width,
                  height: height,
                  style: {
                      overflow: 'visible',
                      width: `${width}px`,
                      height: `${height}px`,
                      transform: 'none',
                      left: '0',
                      top: '0'
                  },
                  onClone: (clonedNode) => {
                      const node = clonedNode as HTMLElement;
                      // Force container size
                      node.style.width = `${width}px`;
                      node.style.height = `${height}px`;

                      const svgG = node.querySelector('svg > g');
                      const divContainer = node.querySelector('.systems-nodes-container') as HTMLElement;
                      
                      // Reposition content to top-left with padding
                      const shiftX = -minX + padding;
                      const shiftY = -minY + padding;
                      const transform = `translate(${shiftX}px, ${shiftY}px) scale(1)`;
                      
                      if (svgG) svgG.setAttribute('transform', transform);
                      if (divContainer) divContainer.style.transform = transform;

                      // Inject Watermark
                      const logoContainer = document.createElement('div');
                      logoContainer.innerHTML = SESAR_LOGO_STRING;
                      logoContainer.style.position = 'absolute';
                      logoContainer.style.bottom = '40px';
                      logoContainer.style.right = '40px';
                      logoContainer.style.width = '200px';
                      logoContainer.style.opacity = '0.8';
                      logoContainer.style.zIndex = '1000';
                      node.appendChild(logoContainer);
                  }
              });
              
              const link = document.createElement('a');
              link.download = `SystemsMap-${timestamp}.png`;
              link.href = dataUrl;
              link.click();

          } else {
              // Table View - Export entire table
              const tableEl = containerRef.current?.querySelector('table');
              if (!tableEl) return;
              
              const dataUrl = await toPng(tableEl as HTMLElement, {
                  backgroundColor: '#ffffff'
              });
               
              const link = document.createElement('a');
              link.download = `SystemsTable-${timestamp}.png`;
              link.href = dataUrl;
              link.click();
          }

      } catch (err) {
          console.error(err);
          alert("Failed to export image.");
      }
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-900/50 backdrop-blur-sm p-4 animate-in fade-in">
        <div className="bg-white rounded-2xl shadow-2xl w-full max-w-7xl h-[90vh] flex flex-col overflow-hidden animate-in zoom-in-95 relative">
            
            {/* Target Selection Modal */}
            {targetSelectionMode && (
                <TargetParentModal 
                    mindMap={mindMap}
                    onConfirm={confirmAddToMindMap}
                    onCancel={() => setTargetSelectionMode(null)}
                />
            )}

            {/* Sequence Diagram Modal */}
            {(sequenceLoading || sequenceCode) && (
                <div className="absolute inset-0 z-[70] flex items-center justify-center bg-white/95 backdrop-blur-md p-8 animate-in fade-in">
                    <div className="w-full max-w-6xl h-full flex flex-col">
                        <div className="flex justify-between items-center mb-6">
                            <h3 className="text-xl font-bold text-slate-800 flex items-center gap-2">
                                <Activity size={24} className="text-blue-600" /> Sequence Diagram Editor
                            </h3>
                            <div className="flex gap-2">
                                {/* Regenerate Button */}
                                <button 
                                    onClick={() => {
                                        const interaction = data.interactions.find(i => i.id === activeInteractionId);
                                        if (interaction) handleGenerateSequence(interaction, true);
                                    }}
                                    className="p-2 bg-slate-100 hover:bg-slate-200 text-slate-600 rounded-lg flex items-center gap-2 font-bold text-xs" 
                                    title="Regenerate with AI"
                                    disabled={sequenceLoading}
                                >
                                    <RefreshCw size={16} className={sequenceLoading ? "animate-spin" : ""} /> Regenerate
                                </button>

                                <button onClick={handleExportSequencePng} className="p-2 bg-blue-50 hover:bg-blue-100 text-blue-600 rounded-lg flex items-center gap-2 font-bold text-xs" title="Export PNG">
                                    <Download size={16} /> Export Image
                                </button>
                                <button onClick={() => { setSequenceCode(null); setSequenceLoading(false); }} className="p-2 bg-slate-100 hover:bg-slate-200 rounded-full text-slate-500">
                                    <X size={24} />
                                </button>
                            </div>
                        </div>
                        
                        <div className="flex-1 overflow-hidden flex gap-4">
                            {sequenceLoading ? (
                                <div className="w-full flex flex-col items-center justify-center gap-4 text-slate-400">
                                    <Loader2 size={48} className="animate-spin text-blue-500" />
                                    <p className="font-medium">Generating sequence logic...</p>
                                </div>
                            ) : (
                                <>
                                    {/* Editor Pane */}
                                    <div className="w-1/3 flex flex-col bg-slate-50 rounded-xl border border-slate-200 overflow-hidden">
                                        <div className="p-3 border-b border-slate-200 bg-slate-100 text-xs font-bold text-slate-500 uppercase tracking-wider flex justify-between items-center">
                                            <span className="flex items-center gap-2"><Code size={14} /> Mermaid Syntax</span>
                                        </div>
                                        <textarea 
                                            value={sequenceCode || ''}
                                            onChange={(e) => setSequenceCode(e.target.value)}
                                            className="flex-1 w-full p-4 font-mono text-xs bg-slate-50 resize-none outline-none focus:bg-white transition-colors"
                                            spellCheck={false}
                                        />
                                    </div>

                                    {/* Preview Pane */}
                                    <div ref={sequenceRef} className="flex-1 bg-white rounded-xl border border-slate-200 shadow-inner overflow-auto p-8 flex items-center justify-center relative">
                                         <div className="absolute top-4 right-4 z-10 opacity-50 hover:opacity-100 no-export pointer-events-none">
                                             <span className="text-xs font-bold text-slate-300 uppercase tracking-wider bg-white px-2 py-1 rounded border border-slate-100 shadow-sm">Live Preview</span>
                                         </div>
                                         <div className="w-full">
                                            {sequenceCode && <MermaidViewer code={sequenceCode} />}
                                         </div>
                                    </div>
                                </>
                            )}
                        </div>
                    </div>
                </div>
            )}

            {/* Header */}
            <div className="p-4 border-b border-slate-100 flex justify-between items-center bg-slate-50">
                <div className="flex items-center gap-4">
                    <h2 className="text-lg font-bold text-slate-800">Systems View</h2>
                    <div className="h-6 w-px bg-slate-200"></div>
                    <div className="flex bg-slate-200 rounded-lg p-1">
                        <button onClick={() => setViewMode('map')} className={`flex items-center gap-2 px-3 py-1.5 rounded-md text-xs font-bold transition-all ${viewMode === 'map' ? 'bg-white text-blue-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}>
                            <Network size={14} /> Map
                        </button>
                        <button onClick={() => setViewMode('table')} className={`flex items-center gap-2 px-3 py-1.5 rounded-md text-xs font-bold transition-all ${viewMode === 'table' ? 'bg-white text-blue-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}>
                            <LayoutGrid size={14} /> Mesh Table
                        </button>
                        <button onClick={() => setViewMode('dataflow')} className={`flex items-center gap-2 px-3 py-1.5 rounded-md text-xs font-bold transition-all ${viewMode === 'dataflow' ? 'bg-white text-blue-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}>
                            <Workflow size={14} /> Data Flow
                        </button>
                    </div>

                    {viewMode === 'map' && (
                        <div className="flex items-center gap-2 ml-4">
                            <span className="text-xs text-slate-400 font-bold uppercase">Center On:</span>
                            <select value={rootId || ''} onChange={(e) => setRootId(e.target.value)} className="bg-white border border-slate-300 rounded-md text-xs py-1 px-2 outline-none focus:ring-2 focus:ring-blue-500 max-w-[150px]">
                                {data.actors.map(a => <option key={a.id} value={a.id}>{a.name}</option>)}
                            </select>
                        </div>
                    )}
                </div>
                
                <div className="flex items-center gap-2">
                    {viewMode === 'table' && (
                        <button onClick={handleExportCsv} className="p-2 rounded-lg bg-emerald-50 text-emerald-600 hover:bg-emerald-100 transition-colors mr-2" title="Export as CSV">
                            <FileText size={18} />
                        </button>
                    )}
                    <button onClick={handleExportPng} className="p-2 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-600 transition-colors" title="Export PNG">
                        <Download size={18} />
                    </button>
                    <div className="h-6 w-px bg-slate-200 mx-1"></div>
                    <button onClick={onToggleLock} className={`p-2 rounded-lg transition-colors ${isLocked ? 'bg-slate-100 text-slate-500' : 'bg-white text-slate-400 hover:text-slate-600'}`} title={isLocked ? "Unlock to Regenerate" : "Locked"}>
                        {isLocked ? <Lock size={18} /> : <Unlock size={18} />}
                    </button>
                    {!isLocked && (
                        <button onClick={onRegenerate} className="p-2 rounded-lg bg-blue-50 text-blue-600 hover:bg-blue-100 transition-colors flex items-center gap-1 text-sm font-medium">
                            <RefreshCw size={16} /> Regenerate
                        </button>
                    )}
                    <button onClick={onClose} className="p-2 hover:bg-red-50 hover:text-red-500 rounded-full transition-colors text-slate-400">
                        <X size={20} />
                    </button>
                </div>
            </div>

            {/* Content Area */}
            <div className="flex-1 flex relative bg-slate-50 overflow-hidden">
                
                {/* Data Flow Sidebar */}
                {viewMode === 'dataflow' && (
                    <div className="w-64 bg-white border-r border-slate-200 overflow-y-auto p-2 z-10">
                        <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wide px-2 py-3 mb-2">Data Types</h4>
                        <div className="space-y-1">
                            {uniqueDataTypes.map(type => (
                                <div key={type} className="flex items-center gap-1 group">
                                    <button
                                        onClick={() => setSelectedDataFlow(type)}
                                        className={`flex-1 text-left px-3 py-2 rounded-lg text-xs font-medium transition-all truncate ${
                                            selectedDataFlow === type 
                                            ? 'bg-blue-600 text-white shadow-md' 
                                            : 'text-slate-600 hover:bg-slate-100'
                                        }`}
                                    >
                                        {type}
                                    </button>
                                    {selectedDataFlow === type && (
                                        <button 
                                            onClick={() => setTargetSelectionMode({ type: 'concept', payload: type })}
                                            className="p-1.5 bg-white text-blue-600 shadow-sm border border-blue-200 rounded-lg hover:bg-blue-50"
                                            title="Add Data Concept to Mind Map"
                                        >
                                            <ArrowUpRight size={14} />
                                        </button>
                                    )}
                                </div>
                            ))}
                            {uniqueDataTypes.length === 0 && (
                                <p className="text-xs text-slate-400 px-2 italic">No interactions found.</p>
                            )}
                        </div>
                    </div>
                )}

                <div className="flex-1 relative h-full overflow-hidden" ref={containerRef} style={{ backgroundColor: (viewMode === 'map' || viewMode === 'dataflow') ? theme.canvasBg : '#f8fafc' }}>
                    
                    {(viewMode === 'map' || viewMode === 'dataflow') && (
                        <>
                            <svg ref={svgRef} className="w-full h-full cursor-grab active:cursor-grabbing">
                                 <g transform={`translate(${transform.x},${transform.y}) scale(${transform.k})`}>
                                    {links.map((link: any, i) => {
                                        const sourceX = link.source.x;
                                        const sourceY = link.source.y;
                                        const targetX = link.target.x;
                                        const targetY = link.target.y;
                                        const d = `M${sourceX},${sourceY} C${(sourceX + targetX) / 2},${sourceY} ${(sourceX + targetX) / 2},${targetY} ${targetX},${targetY}`;
                                        const label = link.target.data.linkLabel;
                                        
                                        // Use foreignObject for wrapped text labels on lines
                                        return (
                                            <g key={i} onClick={() => handleLinkClick(link)} className="group cursor-pointer">
                                                <path d={d} stroke={theme.link} fill="none" strokeWidth="2" className="transition-colors group-hover:stroke-blue-400 group-hover:stroke-[3px]" />
                                                {label && (
                                                    <foreignObject 
                                                        x={(sourceX + targetX)/2 - 75} 
                                                        y={(sourceY + targetY)/2 - 20} 
                                                        width="150" 
                                                        height="40"
                                                        className="pointer-events-none"
                                                    >
                                                        <div className="w-full h-full flex items-center justify-center">
                                                             <div className={`text-[10px] text-center px-1.5 py-0.5 border rounded shadow-sm text-balance max-h-full overflow-hidden leading-tight transition-all group-hover:scale-105 group-hover:shadow-md ${
                                                                 viewMode === 'dataflow' 
                                                                 ? 'bg-blue-100 border-blue-200 text-blue-800 font-bold' 
                                                                 : 'bg-white/90 border-slate-200 text-slate-600'
                                                             }`}>
                                                                {label}
                                                             </div>
                                                        </div>
                                                    </foreignObject>
                                                )}
                                            </g>
                                        );
                                    })}
                                 </g>
                            </svg>
                            <div className="absolute top-0 left-0 w-full h-full pointer-events-none origin-top-left systems-nodes-container" style={{ transform: `translate(${transform.x}px, ${transform.y}px) scale(${transform.k})` }}>
                                {nodes.map((node: any) => (
                                    <div key={node.data.id} className="pointer-events-auto" onClick={() => setActiveActorMenu(node.data.id)}>
                                         <MindMapNode 
                                            x={node.x} 
                                            y={node.y} 
                                            node={node.data} 
                                            selected={activeActorMenu === node.data.id} 
                                            onSelect={() => setActiveActorMenu(node.data.id)} 
                                            onExpand={() => {}} 
                                            hasHiddenChildren={false} 
                                            isDevMode={isDevMode} 
                                            theme={theme}
                                         />
                                         {/* Actor Action Menu */}
                                         {activeActorMenu === node.data.id && (
                                             <div className="absolute z-50 bg-white shadow-xl rounded-lg p-1.5 flex flex-col gap-1 min-w-[140px] animate-in zoom-in-95" style={{ top: node.y + 40, left: node.x }}>
                                                 <button 
                                                    onClick={(e) => { e.stopPropagation(); setTargetSelectionMode({ type: 'actor', payload: data.actors.find(a => a.id === node.data.id) }); }}
                                                    className="text-xs font-semibold text-slate-700 hover:bg-slate-100 p-2 rounded flex items-center gap-2"
                                                 >
                                                     <ArrowUpRight size={14} className="text-blue-600" /> Add to Map
                                                 </button>
                                                 <button 
                                                    onClick={(e) => { e.stopPropagation(); handleDeleteActor(node.data.id); }}
                                                    className="text-xs font-semibold text-red-600 hover:bg-red-50 p-2 rounded flex items-center gap-2"
                                                 >
                                                     <Trash2 size={14} /> Delete Actor
                                                 </button>
                                             </div>
                                         )}
                                    </div>
                                ))}
                            </div>
                        </>
                    )}

                    {viewMode === 'table' && (
                        <div className="w-full h-full overflow-auto p-8 relative">
                             <div className="inline-block min-w-full align-middle">
                                 <table className="min-w-full divide-y divide-slate-200 border-collapse bg-white shadow-sm">
                                     <thead>
                                         <tr>
                                             <th className="sticky top-0 left-0 z-20 bg-slate-100 p-3 text-left text-xs font-bold text-slate-500 uppercase tracking-wider border-b border-r border-slate-200 min-w-[150px] flex items-center justify-between">
                                                 <span>Initiator \ Target</span>
                                                 <button onClick={() => setAddingActor(true)} className="p-1 hover:bg-slate-200 rounded text-blue-600" title="Add Actor"><Plus size={14} /></button>
                                             </th>
                                             {matrixData.cols.map(col => (
                                                 <th key={col.id} className="sticky top-0 z-10 bg-slate-50 p-3 text-center text-xs font-bold text-slate-700 uppercase tracking-wider border-b border-slate-200 min-w-[200px] group cursor-pointer relative">
                                                     <div className="flex items-center justify-center gap-1">
                                                         {col.name}
                                                     </div>
                                                     {/* Header Actions - Simple inline for v1 */}
                                                      <div className="absolute top-1 right-1 opacity-0 group-hover:opacity-100 flex">
                                                         <button 
                                                            onClick={(e) => { e.stopPropagation(); setTargetSelectionMode({ type: 'actor', payload: col }); }}
                                                            className="p-1 bg-white shadow rounded hover:text-blue-600" title="Add to Map"
                                                         >
                                                             <ArrowUpRight size={10} />
                                                         </button>
                                                      </div>
                                                 </th>
                                             ))}
                                         </tr>
                                     </thead>
                                     <tbody className="bg-white divide-y divide-slate-200">
                                         {matrixData.rows.map(row => (
                                             <tr key={row.id}>
                                                 <td className="sticky left-0 z-10 bg-slate-50 p-3 text-xs font-bold text-slate-700 border-r border-slate-200 group relative">
                                                     {row.name}
                                                      <div className="absolute top-3 right-2 opacity-0 group-hover:opacity-100 flex">
                                                         <button 
                                                            onClick={(e) => { e.stopPropagation(); setTargetSelectionMode({ type: 'actor', payload: row }); }}
                                                            className="p-1 bg-white shadow rounded hover:text-blue-600" title="Add to Map"
                                                         >
                                                             <ArrowUpRight size={10} />
                                                         </button>
                                                      </div>
                                                 </td>
                                                 {matrixData.cols.map(col => {
                                                     const key = `${row.id}-${col.id}`;
                                                     const interactions = matrixData.cellMap.get(key);
                                                     return (
                                                         <td 
                                                            key={col.id} 
                                                            onClick={() => setEditingCell({ source: row.id, target: col.id })}
                                                            className={`p-3 text-xs text-slate-600 border-l border-slate-100 align-top transition-colors cursor-pointer ${interactions ? 'bg-blue-50/30 hover:bg-blue-100/50' : 'hover:bg-slate-50'}`}
                                                         >
                                                             {interactions ? (
                                                                 <div className="flex flex-col gap-1">
                                                                     {interactions.map((link, i) => (
                                                                         <span key={i} className="bg-blue-100 text-blue-700 px-2 py-1 rounded block truncate" title={`${link.activity}: ${link.data}`}>
                                                                             {link.data}
                                                                         </span>
                                                                     ))}
                                                                 </div>
                                                             ) : (
                                                                 <span className="text-slate-300 flex justify-center opacity-0 hover:opacity-100">+</span>
                                                             )}
                                                         </td>
                                                     );
                                                 })}
                                             </tr>
                                         ))}
                                     </tbody>
                                 </table>
                             </div>
                        </div>
                    )}
                </div>
            </div>

            {/* Editing Modals */}
            {addingActor && (
                <div className="absolute inset-0 z-50 flex items-center justify-center bg-black/20 backdrop-blur-[2px]">
                    <div className="bg-white p-4 rounded-xl shadow-xl w-72">
                        <h3 className="text-sm font-bold mb-3">Add New Actor</h3>
                        <input autoFocus type="text" value={newActorName} onChange={(e) => setNewActorName(e.target.value)} placeholder="Actor Name" className="w-full border p-2 rounded mb-3 text-sm" />
                        <div className="flex gap-2">
                            <button onClick={() => setAddingActor(false)} className="flex-1 py-1 text-xs font-medium text-slate-500 hover:bg-slate-100 rounded">Cancel</button>
                            <button onClick={handleAddActor} className="flex-1 py-1 text-xs font-bold text-white bg-blue-600 hover:bg-blue-700 rounded">Add</button>
                        </div>
                    </div>
                </div>
            )}

            {editingCell && (
                <div className="absolute inset-0 z-50 flex items-center justify-center bg-black/20 backdrop-blur-[2px]">
                    <div className="bg-white p-6 rounded-xl shadow-xl w-[480px] animate-in zoom-in-95">
                        <div className="flex justify-between items-center mb-4">
                            <h3 className="font-bold text-slate-800">Edit Interactions</h3>
                            <button onClick={() => setEditingCell(null)} className="text-slate-400 hover:text-slate-600"><X size={18}/></button>
                        </div>
                        
                        <div className="bg-slate-50 p-3 rounded-lg text-xs text-slate-600 mb-4 flex items-center justify-between">
                            <div className="flex items-center gap-2">
                                <span className="font-bold">{data.actors.find(a => a.id === editingCell.source)?.name}</span>
                                <button onClick={() => setTargetSelectionMode({ type: 'actor', payload: data.actors.find(a => a.id === editingCell.source) })} className="p-1 hover:bg-slate-200 rounded text-blue-600" title="Add Source Actor to Map"><ArrowUpRight size={12} /></button>
                            </div>
                            <ArrowRight size={14} />
                            <div className="flex items-center gap-2">
                                <span className="font-bold">{data.actors.find(a => a.id === editingCell.target)?.name}</span>
                                <button onClick={() => setTargetSelectionMode({ type: 'actor', payload: data.actors.find(a => a.id === editingCell.target) })} className="p-1 hover:bg-slate-200 rounded text-blue-600" title="Add Target Actor to Map"><ArrowUpRight size={12} /></button>
                            </div>
                        </div>

                        <div className="space-y-2 mb-4 max-h-60 overflow-y-auto">
                            {(matrixData.cellMap.get(`${editingCell.source}-${editingCell.target}`) || []).map(link => {
                                const matchingNode = findMatchingNode(link.data);
                                return (
                                <div key={link.id} className="flex justify-between items-center bg-white border border-slate-200 p-2 rounded text-xs">
                                    <div className="flex-1 mr-2">
                                        <div className="font-bold text-slate-700 truncate" title={link.data}>{link.data}</div>
                                        <div className="text-slate-400 truncate">{link.activity}</div>
                                    </div>
                                    <div className="flex items-center gap-1">
                                        <button 
                                            onClick={() => handleGenerateSequence(link)} 
                                            className={`p-1.5 rounded flex items-center gap-1 transition-colors ${link.sequenceDiagram ? 'bg-indigo-100 text-indigo-700 shadow-sm' : 'bg-indigo-50 text-indigo-600 hover:bg-indigo-100'}`} 
                                            title={link.sequenceDiagram ? "View Saved Sequence" : "Generate Sequence"}
                                        >
                                            <Activity size={14} fill={link.sequenceDiagram ? "currentColor" : "none"} />
                                        </button>
                                        <div className="w-px h-3 bg-slate-200 mx-1"></div>
                                        {matchingNode && (
                                            <>
                                            <button onClick={() => handleOpenLinkedNode(link.data, 'details')} className="p-1.5 text-emerald-600 hover:bg-emerald-50 rounded" title="View Details"><FileText size={14}/></button>
                                            <button onClick={() => handleOpenLinkedNode(link.data, 'process')} className="p-1.5 text-amber-600 hover:bg-amber-50 rounded" title="View Process"><PlayCircle size={14}/></button>
                                            </>
                                        )}
                                        <button 
                                            onClick={() => setTargetSelectionMode({ type: 'interaction', payload: link })} 
                                            className="p-1.5 text-blue-600 hover:bg-blue-50 rounded" 
                                            title="Add Interaction to Map"
                                        >
                                            <ArrowUpRight size={14}/>
                                        </button>
                                        <button onClick={() => handleDeleteInteraction(link.id)} className="text-red-400 hover:bg-red-50 p-1.5 rounded"><Trash2 size={14}/></button>
                                    </div>
                                </div>
                            )})}
                            {!(matrixData.cellMap.get(`${editingCell.source}-${editingCell.target}`)?.length) && (
                                <p className="text-center text-xs text-slate-400 py-2">No interactions yet.</p>
                            )}
                        </div>

                        <div className="border-t pt-4">
                            <h4 className="text-xs font-bold text-slate-500 uppercase mb-2">Add Interaction</h4>
                            <input value={newActivity} onChange={(e) => setNewActivity(e.target.value)} placeholder="Activity (e.g., Handshake)" className="w-full border p-2 rounded mb-2 text-xs" />
                            <input value={newData} onChange={(e) => setNewData(e.target.value)} placeholder="Data/Message (e.g., Login Request)" className="w-full border p-2 rounded mb-3 text-xs" />
                            <button onClick={handleAddInteraction} className="w-full py-2 bg-blue-600 text-white rounded text-xs font-bold hover:bg-blue-700">Add Interaction</button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    </div>
  );
};
