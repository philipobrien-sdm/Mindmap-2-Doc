
import React, { useEffect, useRef, useState, useMemo, useCallback } from 'react';
import * as d3 from 'd3';
import { ZoomIn, ZoomOut, Maximize, Download, Search, X } from 'lucide-react';
import { MindMapData, AppTheme, LoadingState } from '../types';
import { MindMapNode } from './MindMapNode';
import { ActionMenu } from './ActionMenu';
import { SesarLogo, SESAR_LOGO_STRING } from './SesarLogo';

/**
 * MindMap Component
 * 
 * This is the core visualization component. It uses D3.js to calculate the 
 * tree layout (x/y coordinates) but uses React to render the actual DOM elements.
 * This "hybrid" approach gives us the math power of D3 with the component lifecycle of React.
 */

interface MindMapProps {
  data: MindMapData | null;
  onNodeAction: (action: 'expand' | 'details' | 'process' | 'edit' | 'delete' | 'report' | 'reset' | 'document', node: MindMapData) => void;
  onSearchReveal?: (idsToExpand: string[]) => void;
  loading: LoadingState;
  isDevMode?: boolean;
  theme: AppTheme;
  sessionName?: string;
  externalSearchQuery?: string | null; // NEW: Allow parent to control search
}

export const MindMap: React.FC<MindMapProps> = ({ data, onNodeAction, onSearchReveal, loading, isDevMode, theme, sessionName, externalSearchQuery }) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const svgRef = useRef<SVGSVGElement>(null);
  const contentRef = useRef<HTMLDivElement>(null); // Wraps the nodes and svg for export targeting
  
  // Interaction State
  const [selectedNode, setSelectedNode] = useState<MindMapData | null>(null);
  const [transform, setTransform] = useState({ x: 0, y: 0, k: 1 }); // Pan/Zoom state
  const zoomBehavior = useRef<d3.ZoomBehavior<SVGSVGElement, unknown> | null>(null);
  
  // Search State
  const [internalSearchQuery, setInternalSearchQuery] = useState('');
  
  // Derived effective query (external wins if present)
  const searchQuery = externalSearchQuery !== undefined ? (externalSearchQuery || '') : internalSearchQuery;
  
  // Track the root ID to know when to auto-fit (e.g., new map loaded)
  const prevRootIdRef = useRef<string | null>(null);
  
  /**
   * Search Logic
   * Recursively scans the entire tree for matches in Label, Description, Details, or Process steps.
   * Returns a Set of matched Node IDs for O(1) lookup during render.
   */
  const searchResults = useMemo(() => {
      const matches = new Set<string>();
      if (!data || !searchQuery.trim()) return matches;
      
      const lowerQuery = searchQuery.toLowerCase();
      
      const traverse = (node: MindMapData) => {
          let isMatch = false;
          // 1. Check basic metadata
          if (node.label.toLowerCase().includes(lowerQuery)) isMatch = true;
          else if (node.description?.toLowerCase().includes(lowerQuery)) isMatch = true;
          
          // 2. Check cached AI content (Details)
          else if (node.cachedDetails?.toLowerCase().includes(lowerQuery)) isMatch = true;
          
          // 3. Check cached AI content (Process)
          else if (node.cachedProcess?.some(step => 
              step.action.toLowerCase().includes(lowerQuery) || 
              step.description.toLowerCase().includes(lowerQuery) ||
              step.role?.toLowerCase().includes(lowerQuery)
          )) isMatch = true;

          if (isMatch) matches.add(node.id);
          
          if (node.children) node.children.forEach(traverse);
      };
      
      traverse(data);
      return matches;
  }, [data, searchQuery]);

  // Effect to auto-expand hidden matches
  // This uses a debounce to avoid rapid state updates while typing
  useEffect(() => {
      if (!data || !searchQuery.trim() || !onSearchReveal) return;
      
      const handler = setTimeout(() => {
          const idsToExpand = new Set<string>();
          const lowerQuery = searchQuery.toLowerCase();

          // Helper to check if a node itself is a match
          const isMatch = (n: MindMapData) => {
              return n.label.toLowerCase().includes(lowerQuery) ||
                     n.description?.toLowerCase().includes(lowerQuery) ||
                     n.cachedDetails?.toLowerCase().includes(lowerQuery) ||
                     n.cachedProcess?.some(s => s.action.toLowerCase().includes(lowerQuery));
          };

          // Recursive DFS traversal
          // Returns true if this node OR any descendant contains a match
          const traverse = (node: MindMapData): boolean => {
              let containsMatch = isMatch(node);
              
              if (node.children) {
                  for (const child of node.children) {
                      const childHasMatch = traverse(child);
                      if (childHasMatch) {
                          containsMatch = true;
                          // CRITICAL: If a child has a match, this parent MUST be expanded to show it.
                          if (node._collapsed) {
                              idsToExpand.add(node.id);
                          }
                      }
                  }
              }
              return containsMatch;
          };

          traverse(data);

          if (idsToExpand.size > 0) {
              onSearchReveal(Array.from(idsToExpand));
          }
      }, 500); // 500ms debounce

      return () => clearTimeout(handler);
  }, [data, searchQuery, onSearchReveal]); 

  /**
   * Node Numbering Calculation
   * Pre-calculates the hierarchical number (1.0, 1.1, 1.1.1) for every node
   * to ensure consistency regardless of visual layout splitting.
   */
  const nodeNumberMap = useMemo(() => {
      const map = new Map<string, string>();
      if (!data) return map;

      const traverse = (node: MindMapData, prefix: string) => {
          map.set(node.id, prefix);
          if (node.children) {
              node.children.forEach((child, index) => {
                  const childPrefix = `${prefix === '1.0' ? '1' : prefix}.${index + 1}`;
                  traverse(child, childPrefix);
              });
          }
      };

      traverse(data, "1.0");
      return map;
  }, [data]);

  /**
   * Layout Calculation
   * 
   * We use a "Bi-Directional Tree" layout. 
   * Standard D3 trees go strictly Left-to-Right or Top-to-Down.
   * To simulate a "Mind Map", we split the children into two groups (Left and Right)
   * and calculate two separate trees, then join them at the root.
   */
  const { nodes, links } = useMemo(() => {
    if (!data) return { nodes: [], links: [] };

    // 1. Separate children into left and right groups
    const children = data.children || [];
    const rightDataChildren: MindMapData[] = [];
    const leftDataChildren: MindMapData[] = [];
    
    children.forEach((child, index) => {
        // Alternate balancing strategy
        if (index % 2 === 0) rightDataChildren.push(child);
        else leftDataChildren.push(child);
    });

    // 2. Prepare Data Objects for D3
    // Explicitly type as MindMapData to satisfy d3.hierarchy requirements
    const rightData: MindMapData = { ...data, children: rightDataChildren };
    const leftData: MindMapData = { ...data, children: leftDataChildren };
    
    // 3. Layout Configuration
    const nodeWidth = 340; 
    const nodeHeight = 180;
    
    const treeLayout = d3.tree<MindMapData>().nodeSize([nodeHeight, nodeWidth]);
    
    // 4. Generate Right Tree Coordinates
    const rightRoot = d3.hierarchy(rightData, d => d._collapsed ? null : d.children);
    const rightNodesRaw = treeLayout(rightRoot).descendants();
    
    // 5. Generate Left Tree Coordinates (Mirroring x-axis later)
    const leftRoot = d3.hierarchy(leftData, d => d._collapsed ? null : d.children);
    const leftNodesRaw = leftDataChildren.length > 0 ? treeLayout(leftRoot).descendants() : [];

    // 6. Process & Merge
    const allNodes: any[] = [];
    const allLinks: { source: any; target: any }[] = [];
    const nodeIdMap = new Map<string, any>();

    const processNodes = (rawNodes: d3.HierarchyPointNode<MindMapData>[], direction: 1 | -1) => {
        rawNodes.forEach(d => {
            // Skip root duplicate on the left side
            if (direction === -1 && d.depth === 0) return;
            
            // Flip X coordinate for left side
            const finalX = d.y * direction; 
            const finalY = d.x;             
            
            const nodePayload = {
                id: d.data.id,
                x: finalX,
                y: finalY,
                data: d.data,
                depth: d.depth,
                number: nodeNumberMap.get(d.data.id) || "" // Attach number here
            };
            
            if (d.depth === 0) {
                 allNodes.push(nodePayload);
                 nodeIdMap.set(d.data.id, nodePayload);
                 return;
            }

            allNodes.push(nodePayload);
            nodeIdMap.set(d.data.id, nodePayload);

            if (d.parent) {
                let sourceId = d.parent.data.id;
                allLinks.push({ 
                    source: sourceId, 
                    target: d.data.id 
                });
            }
        });
    };

    processNodes(rightNodesRaw, 1);
    processNodes(leftNodesRaw, -1);

    const resolvedLinks = allLinks.map(l => {
        const source = nodeIdMap.get(l.source);
        const target = nodeIdMap.get(l.target);
        if (source && target) return { source, target };
        return null;
    }).filter(Boolean) as { source: any, target: any }[];

    return { nodes: allNodes, links: resolvedLinks };
  }, [data, nodeNumberMap]);

  // --- Zoom & Pan Handling ---
  useEffect(() => {
    if (!svgRef.current || !containerRef.current) return;
    
    const zoom = d3.zoom<SVGSVGElement, unknown>()
      .scaleExtent([0.1, 3])
      .on('zoom', (event) => {
        setTransform(event.transform);
      });
      
    zoomBehavior.current = zoom;
    d3.select(svgRef.current).call(zoom);
    // Disable double click zoom as it interferes with UI
    d3.select(svgRef.current).on("dblclick.zoom", null);

  }, []);
  
  /**
   * Calculates the bounding box of all nodes and centers the view.
   */
  const fitToScreen = useCallback(() => {
      if (!nodes.length || !svgRef.current || !zoomBehavior.current || !containerRef.current) return;

      const padding = 100;
      const width = containerRef.current.clientWidth;
      const height = containerRef.current.clientHeight;

      let minX = Infinity, maxX = -Infinity, minY = Infinity, maxY = -Infinity;
      nodes.forEach(node => {
          const nodeW = 300; 
          const nodeH = 150;
          if (node.x - nodeW/2 < minX) minX = node.x - nodeW/2;
          if (node.x + nodeW/2 > maxX) maxX = node.x + nodeW/2;
          if (node.y - nodeH/2 < minY) minY = node.y - nodeH/2;
          if (node.y + nodeH/2 > maxY) maxY = node.y + nodeH/2;
      });

      const contentWidth = maxX - minX;
      const contentHeight = maxY - minY;
      const midX = (minX + maxX) / 2;
      const midY = (minY + maxY) / 2;

      if (contentWidth <= 0 || contentHeight <= 0) return;

      const scaleX = (width - padding * 2) / contentWidth;
      const scaleY = (height - padding * 2) / contentHeight;
      let k = Math.min(scaleX, scaleY);
      if (k > 1) k = 1; 
      if (k < 0.2) k = 0.2;

      const t = d3.zoomIdentity
          .translate(width / 2 - midX * k, height / 2 - midY * k)
          .scale(k);

      d3.select(svgRef.current)
        .transition()
        .duration(750)
        .call(zoomBehavior.current.transform, t);

  }, [nodes]);
  
  // Auto-fit when root ID changes (new map loaded)
  useEffect(() => {
      if (data && data.id !== prevRootIdRef.current) {
          prevRootIdRef.current = data.id;
          const timeout = setTimeout(() => {
            if (nodes.length > 0) fitToScreen();
          }, 300);
          return () => clearTimeout(timeout);
      }
  }, [data, nodes.length, fitToScreen]);

  const handleZoom = (factor: number) => {
      if (!svgRef.current || !zoomBehavior.current) return;
      d3.select(svgRef.current).transition().duration(300).call(zoomBehavior.current.scaleBy, factor);
  };

  /**
   * High Resolution PNG Export
   * Uses `html-to-image` to rasterize the DOM elements.
   * We perform a cloning operation to remove UI controls (zoom buttons) 
   * and ensure the full map is visible regardless of current zoom level.
   */
  const handleExport = useCallback(async () => {
      if (!contentRef.current || !nodes.length) return;
      
      // 1. Calculate Total Bounds
      let minX = Infinity, maxX = -Infinity, minY = Infinity, maxY = -Infinity;
      nodes.forEach(node => {
          const nodeW = 320; 
          const nodeH = 150; 
          const tlX = node.x - nodeW/2;
          const tlY = node.y - nodeH/2;
          const brX = node.x + nodeW/2;
          const brY = node.y + nodeH/2;

          if (tlX < minX) minX = tlX;
          if (brX > maxX) maxX = brX;
          if (tlY < minY) minY = tlY;
          if (brY > maxY) maxY = brY;
      });

      const name = sessionName || data?.label || 'MindMap';
      const cleanLabel = name.replace(/[^a-z0-9]/gi, '_').substring(0, 40);
      const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
      const filename = `${cleanLabel}-${timestamp}.png`;
      const padding = 120; 
      
      const width = maxX - minX + (padding * 2);
      const height = maxY - minY + (padding * 2);

      // 2. Generate Image
      const pixelRatio = (width * height > 16000000) ? 1 : 2; // Reduce quality for massive maps

      try {
        const { toPng } = await import('html-to-image');
        
        const dataUrl = await toPng(contentRef.current, {
            backgroundColor: theme.canvasBg, // Use theme background
            width: width,
            height: height,
            pixelRatio: pixelRatio,
            style: {
                overflow: 'visible',
                transform: 'none', 
                position: 'relative',
                left: '0',
                top: '0',
                width: `${width}px`,
                height: `${height}px`
            },
            onClone: (clonedNode) => {
                // Reposition content to top-left + padding
                const element = clonedNode as HTMLElement;
                element.style.width = `${width}px`;
                element.style.height = `${height}px`;

                const shiftX = -minX + padding;
                const shiftY = -minY + padding;
                
                const svgG = element.querySelector('.mindmap-svg-group');
                if (svgG) {
                    svgG.setAttribute('transform', `translate(${shiftX}, ${shiftY}) scale(1)`);
                }
                
                const nodesDiv = element.querySelector('.mindmap-nodes-layer') as HTMLElement;
                if (nodesDiv) {
                    nodesDiv.style.transform = `translate(${shiftX}px, ${shiftY}px) scale(1)`;
                }

                // Inject Watermark
                const logoContainer = document.createElement('div');
                logoContainer.innerHTML = SESAR_LOGO_STRING;
                logoContainer.style.position = 'absolute';
                logoContainer.style.bottom = '40px';
                logoContainer.style.right = '40px';
                logoContainer.style.width = '200px';
                logoContainer.style.opacity = '0.8';
                logoContainer.style.zIndex = '1000';
                element.appendChild(logoContainer);
            }
        });
        
        // 3. Trigger Download
        const link = document.createElement('a');
        link.download = filename;
        link.href = dataUrl;
        link.click();
        
      } catch (e) {
          console.error(e);
          alert("Export failed.");
      }

  }, [data, nodes, theme, sessionName]);

  // Helper to position the ActionMenu near the selected node
  const getSelectedNodePos = () => {
    if (!selectedNode || !nodes.length) return null;
    const node = nodes.find(n => n.id === selectedNode.id);
    if (!node) return null;
    
    // Apply current zoom transform to get screen coordinates
    return {
        x: node.x * transform.k + transform.x, 
        y: node.y * transform.k + transform.y
    };
  };

  // Calculate how many matches are actually visible on screen (i.e., not inside collapsed nodes)
  const visibleMatchesCount = useMemo(() => {
      if (searchResults.size === 0) return 0;
      return nodes.reduce((count, node) => searchResults.has(node.id) ? count + 1 : count, 0);
  }, [nodes, searchResults]);

  if (!data) return null;

  return (
    <div ref={containerRef} className="w-full h-full overflow-hidden relative cursor-move" style={{ backgroundColor: theme.canvasBg }}>
      
      {/* Search HUD - Conditional on externalSearchQuery being missing or matches being found */}
      {/* MOVED TO TOP RIGHT (right-6) to avoid menu conflict */}
      <div className={`absolute top-6 right-6 z-40 no-export animate-in slide-in-from-top-4 duration-300 ${externalSearchQuery ? 'pointer-events-none' : ''}`}>
          <div className={`bg-white rounded-xl shadow-lg border border-slate-200 p-2 flex items-center gap-2 min-w-[300px] ${externalSearchQuery ? 'ring-2 ring-purple-400 bg-purple-50' : ''}`}>
              <div className="text-slate-400 pl-2">
                  <Search size={18} className={externalSearchQuery ? "text-purple-600" : ""} />
              </div>
              <input 
                  type="text" 
                  value={searchQuery}
                  onChange={(e) => !externalSearchQuery && setInternalSearchQuery(e.target.value)}
                  readOnly={!!externalSearchQuery}
                  placeholder="Search nodes, details, processes..."
                  className={`flex-1 bg-transparent outline-none text-sm font-medium ${externalSearchQuery ? "text-purple-700 pointer-events-none" : "text-slate-700"} placeholder:text-slate-400`}
              />
              {searchQuery && !externalSearchQuery && (
                  <div className="flex items-center gap-2">
                      <div className="text-[10px] font-bold text-slate-400 bg-slate-100 px-2 py-1 rounded-full whitespace-nowrap">
                          {searchResults.size} found {searchResults.size !== visibleMatchesCount ? `(${visibleMatchesCount} visible)` : ''}
                      </div>
                      <button onClick={() => setInternalSearchQuery('')} className="p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-600 rounded-full">
                          <X size={14} />
                      </button>
                  </div>
              )}
          </div>
          {/* Status Message when filtered by Concept Cloud */}
          {externalSearchQuery && (
             <div className="mt-2 text-[10px] text-purple-600 font-bold bg-white/90 backdrop-blur px-2 py-1 rounded shadow-sm inline-block border border-purple-100 animate-in fade-in">
                 Filtered by Concept Cloud: {searchResults.size} matches
             </div>
          )}
          {searchResults.size > visibleMatchesCount && !externalSearchQuery && (
              <div className="mt-2 text-[10px] text-slate-500 bg-white/80 backdrop-blur px-2 py-1 rounded shadow-sm inline-block border border-slate-100 animate-in fade-in">
                  * Expanding nodes to show matches...
              </div>
          )}
      </div>

      {/* Zoom Controls - Positioned at bottom right */}
      <div className="absolute bottom-6 right-6 flex flex-col gap-2 z-40 no-export">
        <button onClick={() => handleZoom(1.2)} className="bg-white p-2 rounded-lg shadow-md border border-slate-200 text-slate-600 hover:bg-slate-50 hover:text-blue-600 transition-colors" title="Zoom In"><ZoomIn size={20} /></button>
        <button onClick={() => handleZoom(0.8)} className="bg-white p-2 rounded-lg shadow-md border border-slate-200 text-slate-600 hover:bg-slate-50 hover:text-blue-600 transition-colors" title="Zoom Out"><ZoomOut size={20} /></button>
        <button onClick={fitToScreen} className="bg-white p-2 rounded-lg shadow-md border border-slate-200 text-slate-600 hover:bg-slate-50 hover:text-blue-600 transition-colors" title="Fit to Screen"><Maximize size={20} /></button>
        <button onClick={handleExport} className="bg-slate-900 p-2 rounded-lg shadow-md border border-slate-800 text-white hover:bg-slate-800 transition-colors" title="Export as PNG"><Download size={20} /></button>
      </div>

      {/* Watermark */}
      <div className="absolute bottom-4 right-20 z-0 pointer-events-none opacity-40">
        <SesarLogo className="h-12 w-auto grayscale" />
      </div>

      {/* Action Menu (Popup) */}
      {selectedNode && (
        <div className="no-export">
            <ActionMenu 
                node={selectedNode}
                position={getSelectedNodePos()}
                loading={loading}
                onExpand={() => { onNodeAction('expand', selectedNode); setSelectedNode(null); }}
                onDetails={() => { onNodeAction('details', selectedNode); setSelectedNode(null); }}
                onProcess={() => { onNodeAction('process', selectedNode); setSelectedNode(null); }}
                onEdit={() => { onNodeAction('edit', selectedNode); setSelectedNode(null); }}
                onDelete={() => {
                    if (confirm('Are you sure you want to delete this node and all its children?')) {
                        onNodeAction('delete', selectedNode);
                        setSelectedNode(null);
                    }
                }}
                onReport={() => { onNodeAction('report', selectedNode); setSelectedNode(null); }}
                onReset={() => { onNodeAction('reset', selectedNode); setSelectedNode(null); }}
                onDocument={() => { onNodeAction('document', selectedNode); setSelectedNode(null); }}
                onClose={() => setSelectedNode(null)}
            />
        </div>
      )}
      
      {/* Content Container (Target for Export) */}
      <div ref={contentRef} className="w-full h-full relative pointer-events-none">
          {/* Layer 1: SVG Curves for Links */}
          <svg ref={svgRef} className="absolute inset-0 w-full h-full pointer-events-auto">
            <g className="mindmap-svg-group" transform={`translate(${transform.x},${transform.y}) scale(${transform.k})`}>
              {links.map((link) => {
                 const sourceX = link.source.x;
                 const sourceY = link.source.y;
                 const targetX = link.target.x;
                 const targetY = link.target.y;
                 
                 // Cubic Bezier Curve for smooth connections
                 const d = `M${sourceX},${sourceY} 
                            C${(sourceX + targetX) / 2},${sourceY} 
                             ${(sourceX + targetX) / 2},${targetY} 
                             ${targetX},${targetY}`;
                             
                 return (<path key={`${link.source.id}-${link.target.id}`} d={d} fill="none" stroke={theme.link} strokeWidth="2" opacity="0.6"/>)
              })}
            </g>
          </svg>

          {/* Layer 2: HTML Nodes */}
          <div 
            className="mindmap-nodes-layer absolute top-0 left-0 w-full h-full origin-top-left"
            style={{
                transform: `translate(${transform.x}px, ${transform.y}px) scale(${transform.k})`
            }}
          >
            {nodes.map((node) => (
                <div key={node.id} className="pointer-events-auto">
                     <MindMapNode
                        x={node.x} 
                        y={node.y}
                        node={node.data}
                        nodeNumber={node.number} // PASS THE NUMBER
                        selected={selectedNode?.id === node.id}
                        isMatch={searchResults.has(node.data.id)}
                        onSelect={setSelectedNode}
                        onExpand={(n) => {
                             // Delegate back to App.tsx to handle recursion
                             onNodeAction('expand', n); 
                             setSelectedNode(null); // Close menu on arrow click too? Usually nice
                        }}
                        hasHiddenChildren={!!node.data.children && !!node.data._collapsed}
                        isDevMode={isDevMode}
                        theme={theme}
                     />
                </div>
            ))}
          </div>
      </div>
    </div>
  );
};
