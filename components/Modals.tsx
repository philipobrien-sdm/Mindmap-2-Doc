
import React, { useState, useEffect, useRef, useMemo } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import * as d3 from 'd3';
import { 
    X, Sparkles, Lock, Unlock, Save, RotateCcw, Clock, Terminal, PenLine,
    LayoutList, GitGraph, Plus, Trash2, Download, Split, CornerDownRight, 
    ArrowDown, Bold, Italic, List, Heading, Code, RectangleVertical, 
    RectangleHorizontal, ZoomIn, ZoomOut, Edit3, CheckCircle, Octagon, History,
    Columns, Activity, AlertTriangle, Loader2
} from 'lucide-react';
import { ProcessStep, ProcessBranch, LogEntry, AppTheme, MindMapData } from '../types';
import { SesarLogo } from './SesarLogo';
import { exportSvgToPng } from '../utils/imageExporter';

// --- SHARED MODAL BASE ---
const ModalBase: React.FC<{ title: string, onClose: () => void, children: React.ReactNode, headerAction?: React.ReactNode }> = ({ title, onClose, children, headerAction }) => (
  <div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-900/50 backdrop-blur-sm p-4 animate-in fade-in duration-200">
    <div className="bg-white rounded-2xl shadow-2xl w-full max-w-7xl h-[95vh] transition-all duration-300 flex flex-col overflow-hidden animate-in zoom-in-95">
      <div className="p-4 border-b border-slate-100 flex justify-between items-center bg-slate-50/50 shrink-0">
        <h2 className="text-lg font-bold text-slate-800 flex items-center gap-2 truncate pr-4">{title}</h2>
        <div className="flex items-center gap-2 shrink-0">
            {headerAction}
            <button onClick={onClose} className="p-1 hover:bg-slate-200 rounded-full transition-colors text-slate-500">
                <X size={20} />
            </button>
        </div>
      </div>
      <div className="flex-1 overflow-hidden relative min-h-0">
        {children}
      </div>
    </div>
  </div>
);

// --- Idea Modal ---
export const IdeaModal: React.FC<{ 
    onConfirm: (idea: string) => void; 
    onClose: () => void 
}> = ({ onConfirm, onClose }) => {
    const [idea, setIdea] = useState('');

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (idea.trim()) {
            onConfirm(idea);
            onClose();
        }
    };

    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-900/50 backdrop-blur-sm p-4 animate-in fade-in">
            <div className="bg-white rounded-xl shadow-2xl w-full max-w-md animate-in zoom-in-95">
                <div className="p-4 border-b border-slate-100 flex justify-between items-center bg-slate-50/50 rounded-t-xl">
                    <h3 className="font-bold text-slate-800 flex items-center gap-2">
                        <Sparkles size={18} className="text-blue-600"/> Generate from Topic
                    </h3>
                    <button onClick={onClose} className="text-slate-400 hover:text-slate-600"><X size={20} /></button>
                </div>
                <form onSubmit={handleSubmit} className="p-6">
                    <p className="text-sm text-slate-600 mb-4">
                        Enter a topic below. The AI will generate a structured, 1000-word analytical deep-dive covering concepts, stakeholders, technology, benefits, and implementation pathways.
                    </p>
                    <label className="block text-xs font-bold text-slate-500 uppercase mb-2">Topic</label>
                    <textarea 
                        value={idea} 
                        onChange={(e) => setIdea(e.target.value)} 
                        className="w-full p-3 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none mb-6 h-24 resize-none text-sm font-medium"
                        placeholder="e.g. Advanced Air Mobility Integration"
                        autoFocus
                    />
                    <div className="flex gap-2">
                        <button type="button" onClick={onClose} className="flex-1 py-2 text-sm font-medium text-slate-600 hover:bg-slate-100 rounded-lg transition-colors">Cancel</button>
                        <button type="submit" disabled={!idea.trim()} className="flex-1 py-2 text-sm font-bold text-white bg-blue-600 hover:bg-blue-700 rounded-lg shadow-sm disabled:opacity-50 disabled:cursor-not-allowed">Generate Exploration</button>
                    </div>
                </form>
            </div>
        </div>
    );
};

// --- Details Modal (With Markdown) ---
interface DetailsModalProps {
    title: string;
    content: string;
    isLocked: boolean;
    onToggleLock: () => void;
    onSave: (newContent: string) => void;
    onClose: () => void;
}

export const DetailsModal: React.FC<DetailsModalProps> = ({ title, content, isLocked, onToggleLock, onSave, onClose }) => {
    const [value, setValue] = useState(content);
    const [isEditing, setIsEditing] = useState(false);
    const textareaRef = useRef<HTMLTextAreaElement>(null);

    // Auto-exit edit mode if locked externally
    useEffect(() => { if(isLocked) setIsEditing(false); }, [isLocked]);

    const insertFormat = (prefix: string, suffix: string = '') => {
        if (!textareaRef.current) return;
        const start = textareaRef.current.selectionStart;
        const end = textareaRef.current.selectionEnd;
        const text = value;
        const before = text.substring(0, start);
        const selection = text.substring(start, end);
        const after = text.substring(end);
        setValue(`${before}${prefix}${selection}${suffix}${after}`);
        setTimeout(() => {
            if (textareaRef.current) {
                textareaRef.current.focus();
                textareaRef.current.setSelectionRange(start + prefix.length, end + prefix.length);
            }
        }, 0);
    };

    return (
        <ModalBase 
            title={`Details: ${title}`} 
            onClose={onClose}
            headerAction={
                <div className="flex items-center gap-2">
                    <button onClick={onToggleLock} className={`p-2 rounded-lg text-sm font-medium flex items-center gap-2 transition-colors ${isLocked ? 'text-slate-500 bg-slate-100 hover:bg-slate-200' : 'text-slate-400 hover:text-slate-600'}`} title={isLocked ? "Unlock to Edit" : "Lock Content"}>
                        {isLocked ? <Lock size={16} /> : <Unlock size={16} />}
                    </button>
                    {!isLocked && (
                        <button 
                            onClick={() => {
                                if (isEditing) onSave(value);
                                setIsEditing(!isEditing);
                            }}
                            className={`p-2 rounded-lg text-sm font-medium flex items-center gap-2 transition-colors ${isEditing ? 'bg-blue-600 text-white hover:bg-blue-700' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'}`}
                        >
                            {isEditing ? <><Save size={16}/> Save</> : <><Edit3 size={16}/> Edit</>}
                        </button>
                    )}
                </div>
            }
        >
            <div className="h-full flex flex-col">
                {isEditing && !isLocked && (
                    <div className="flex items-center gap-1 p-2 border-b border-slate-100 bg-slate-50">
                        <button onClick={() => insertFormat('**', '**')} className="p-1.5 hover:bg-slate-200 rounded text-slate-600"><Bold size={16}/></button>
                        <button onClick={() => insertFormat('*', '*')} className="p-1.5 hover:bg-slate-200 rounded text-slate-600"><Italic size={16}/></button>
                        <button onClick={() => insertFormat('## ')} className="p-1.5 hover:bg-slate-200 rounded text-slate-600"><Heading size={16}/></button>
                        <button onClick={() => insertFormat('- ')} className="p-1.5 hover:bg-slate-200 rounded text-slate-600"><List size={16}/></button>
                        <button onClick={() => insertFormat('`', '`')} className="p-1.5 hover:bg-slate-200 rounded text-slate-600"><Code size={16}/></button>
                    </div>
                )}
                <div className="flex-1 overflow-hidden">
                    {isEditing && !isLocked ? (
                        <div className="flex h-full">
                            <div className="w-1/2 h-full border-r border-slate-200 flex flex-col">
                                <textarea 
                                    ref={textareaRef}
                                    className="w-full h-full p-4 focus:ring-0 outline-none font-mono text-sm leading-relaxed resize-none bg-slate-50"
                                    value={value}
                                    onChange={(e) => setValue(e.target.value)}
                                    placeholder="Enter markdown..."
                                />
                            </div>
                            <div className="w-1/2 h-full overflow-y-auto p-6 bg-white">
                                <div className="prose prose-sm max-w-none text-slate-600"><ReactMarkdown remarkPlugins={[remarkGfm]}>{value}</ReactMarkdown></div>
                            </div>
                        </div>
                    ) : (
                        <div className="h-full overflow-y-auto p-6 bg-white">
                            <div className="prose prose-sm max-w-none text-slate-700"><ReactMarkdown remarkPlugins={[remarkGfm]}>{value}</ReactMarkdown></div>
                        </div>
                    )}
                </div>
            </div>
        </ModalBase>
    );
};

// --- Mermaid Viewer (Local Definition) ---
const MermaidViewer: React.FC<{ code: string }> = ({ code }) => {
    const [svg, setSvg] = useState<string>('');
    const [error, setError] = useState<string | null>(null);
    
    useEffect(() => {
        // Clean up previous state immediately to prevent flicker or stale SVG
        setSvg('');
        setError(null);

        if (!code) return;

        const render = async () => {
            try {
                // Dynamic import
                const mermaid = (await import('https://cdn.jsdelivr.net/npm/mermaid@10/dist/mermaid.esm.min.mjs')).default;
                // Initialize carefully
                mermaid.initialize({ 
                    startOnLoad: false, 
                    theme: 'default', 
                    securityLevel: 'loose',
                    suppressErrorRendering: true // We handle errors manually
                });
                
                const id = `mermaid-${Math.random().toString(36).substr(2, 9)}`;
                const { svg } = await mermaid.render(id, code);
                setSvg(svg);
            } catch (e: any) {
                console.warn("Mermaid render error:", e);
                setError(e.message || "Syntax Error");
            }
        };
        
        // 200ms debounce helps prevent "svg element not in render tree" 
        // by ensuring the container is mounted and stable before Mermaid acts
        const timeoutId = setTimeout(render, 200); 
        return () => clearTimeout(timeoutId);
    }, [code]);

    if (error) {
        return (
            <div className="flex flex-col items-center justify-center p-8 text-red-500 bg-red-50 border border-red-100 rounded-lg">
                <AlertTriangle size={24} className="mb-2" />
                <p className="font-bold text-sm">Diagram Syntax Error</p>
                <p className="font-mono text-xs mt-1 max-w-md break-words text-center">{error}</p>
            </div>
        );
    }

    if (!svg && code) {
        return (
            <div className="flex flex-col items-center justify-center h-64 text-slate-400">
                <Loader2 size={32} className="animate-spin mb-2" />
                <p className="text-xs font-medium">Rendering Diagram...</p>
            </div>
        );
    }

    return <div dangerouslySetInnerHTML={{ __html: svg }} className="flex justify-center w-full mermaid-container" />;
};


// --- PROCESS VISUALIZATION & EDITING ---

interface DisplayNode {
    id: string;
    data: any; 
    children?: DisplayNode[];
    type: 'step' | 'placeholder';
    label?: string; 
}

// 1. STANDARD FLOW CHART
const ProcessFlowChart: React.FC<{ steps: ProcessStep[]; orientation: 'vertical' | 'horizontal'; title: string; theme: AppTheme }> = ({ steps, orientation, title, theme }) => {
    const svgRef = useRef<SVGSVGElement>(null);
    const gRef = useRef<SVGGElement>(null);
    const wrapperRef = useRef<HTMLDivElement>(null);

    const { root, minX, maxX, minY, maxY } = useMemo(() => {
        if (!steps.length) return { root: null, width: 0, height: 0, minX: 0, maxX: 0, minY: 0, maxY: 0 };
        const idMap = new Map<string, ProcessStep>();
        steps.forEach(s => idMap.set(s.id, s));

        // Recursive tree builder with cycle detection
        const buildTree = (step: ProcessStep, visited: Set<string>): DisplayNode => {
            // Cycle detected? Return a terminal "Loop" node
            if (visited.has(step.id)) {
                return { 
                    id: `loop-${step.id}-${Math.random().toString(36).substr(2, 9)}`, 
                    data: { ...step, action: `↩ Loop to Step ${step.stepNumber}`, role: 'Process Cycle' }, 
                    type: 'step', 
                    children: [] 
                };
            }

            const newVisited = new Set(visited);
            newVisited.add(step.id);

            const node: DisplayNode = { id: step.id, data: step, type: 'step', children: [] };
            
            // IF it is a decision
            if (step.type === 'decision' && step.branches) {
                step.branches.forEach(branch => {
                    if (branch.targetStepId) {
                        const targetStep = idMap.get(branch.targetStepId);
                        if (targetStep) {
                            const childNode = buildTree(targetStep, newVisited);
                            childNode.label = branch.label; 
                            node.children?.push(childNode);
                        }
                    } else {
                        node.children?.push({ id: `missing-${branch.id}`, data: { action: "Undefined Path" }, type: 'placeholder', label: branch.label, children: [] });
                    }
                });
            } else {
                // Standard Action Step
                // Only continue if NOT an end state
                if (!step.isEndState) {
                    const next = steps.find(s => s.stepNumber === step.stepNumber + 1);
                    if (next) node.children?.push(buildTree(next, newVisited));
                }
            }
            return node;
        };
        const firstStep = steps.reduce((prev, curr) => prev.stepNumber < curr.stepNumber ? prev : curr);
        const treeData = buildTree(firstStep, new Set());
        const hierarchy = d3.hierarchy(treeData);
        const isPortrait = orientation === 'vertical';
        const nodeW = 240, nodeH = 150; // Increased spacing for labels
        const tree = d3.tree<DisplayNode>().nodeSize(isPortrait ? [nodeW, nodeH] : [nodeH, nodeW]); 
        const root = tree(hierarchy);
        
        // Calculate Bounding Box of NODES (not just centers)
        let minX = Infinity, maxX = -Infinity, minY = Infinity, maxY = -Infinity;
        
        root.each((d: any) => {
            const realX = isPortrait ? d.x : d.y;
            const realY = isPortrait ? d.y : d.x;
            
            // Explicitly account for node visual dimensions to prevent clipping
            const halfWidth = 110; 
            const halfHeight = 70; 

            if (realX - halfWidth < minX) minX = realX - halfWidth;
            if (realX + halfWidth > maxX) maxX = realX + halfWidth;
            if (realY - halfHeight < minY) minY = realY - halfHeight;
            if (realY + halfHeight > maxY) maxY = realY + halfHeight;
        });

        return { root, minX, minY, maxX, maxY };
    }, [steps, orientation]);

    useEffect(() => {
        if (!svgRef.current || !gRef.current || !root) return;
        const zoom = d3.zoom<SVGSVGElement, unknown>().scaleExtent([0.1, 4]).on('zoom', (e) => { d3.select(gRef.current).attr('transform', e.transform.toString()); });
        const svg = d3.select(svgRef.current);
        svg.call(zoom);
        if (wrapperRef.current) {
             const { clientWidth } = wrapperRef.current;
             const contentWidth = maxX - minX + 200; // + padding
             const initialScale = Math.min(clientWidth / contentWidth, 1) * 0.9;
             // Center initial view
             const midX = (minX + maxX) / 2;
             const midY = (minY + maxY) / 2; 
             
             // Reset transform
             svg.call(zoom.transform, d3.zoomIdentity.translate(clientWidth/2 - midX*initialScale, 80 - minY*initialScale).scale(initialScale));
        }
    }, [root, orientation]);

    useEffect(() => {
        if (!gRef.current || !root) return;
        const isPortrait = orientation === 'vertical';
        const g = d3.select(gRef.current);
        g.selectAll("*").remove();
        
        const linkGenerator = isPortrait ? d3.linkVertical().x((d: any) => d.x).y((d: any) => d.y) : d3.linkHorizontal().x((d: any) => d.y).y((d: any) => d.x);
        
        // Draw Links
        g.selectAll(".link").data(root.links()).enter().append("path").attr("d", linkGenerator as any).attr("fill", "none").attr("stroke", (d: any) => d.target.data.type === 'placeholder' ? "#94a3b8" : theme.link).attr("stroke-width", 2).attr("stroke-dasharray", (d: any) => d.target.data.type === 'placeholder' ? "5,5" : "none");
        
        // Draw Link Labels using pure SVG text
        const labelGroups = g.selectAll(".link-label-group")
            .data(root.links().filter((d: any) => d.target.data.label))
            .enter().append("g")
            .attr("transform", (d: any) => {
                const x = isPortrait ? (d.source.x + d.target.x) / 2 : (d.source.y + d.target.y) / 2;
                const y = isPortrait ? (d.source.y + d.target.y) / 2 : (d.source.x + d.target.x) / 2;
                return `translate(${x},${y})`;
            });

        labelGroups.each(function(d: any) {
            const group = d3.select(this);
            const text = d.target.data.label;
            // Manual wrap logic
            const words = text.split(/\s+/);
            let lines = [];
            let currentLine = words[0];
            
            for(let i=1; i<words.length; i++) {
                if((currentLine + " " + words[i]).length > 18) {
                    lines.push(currentLine);
                    currentLine = words[i];
                } else {
                    currentLine += " " + words[i];
                }
            }
            lines.push(currentLine);
            
            const lineHeight = 11;
            const padding = 4;
            const boxWidth = 110;
            const boxHeight = (lines.length * lineHeight) + (padding * 2) + 4;
            
            // Background
            group.append("rect")
                .attr("x", -boxWidth/2)
                .attr("y", -boxHeight/2)
                .attr("width", boxWidth)
                .attr("height", boxHeight)
                .attr("rx", 4)
                .attr("fill", "white")
                .attr("stroke", theme.link)
                .attr("stroke-width", 1);
            
            // Text lines
            const textEl = group.append("text")
                .attr("text-anchor", "middle")
                .attr("fill", "#ea580c")
                .attr("font-size", "10px")
                .attr("font-weight", "bold")
                .attr("y", -((lines.length - 1) * lineHeight) / 2 + 3);
                
            lines.forEach((line, i) => {
                textEl.append("tspan")
                    .attr("x", 0)
                    .attr("dy", i === 0 ? 0 : lineHeight)
                    .text(line);
            });
        });

        // Draw Nodes
        const nodes = g.selectAll(".node").data(root.descendants()).enter().append("g").attr("transform", (d: any) => isPortrait ? `translate(${d.x},${d.y})` : `translate(${d.y},${d.x})`);
        
        nodes.each(function(d: any) {
            const el = d3.select(this);
            const isPlaceholder = d.data.type === 'placeholder';
            const isDecision = d.data.data.type === 'decision';
            const isEndState = d.data.data.isEndState;

            if (isPlaceholder) {
                el.append("rect").attr("x", -60).attr("y", -20).attr("width", 120).attr("height", 40).attr("rx", 6).attr("fill", "#f1f5f9").attr("stroke", "#94a3b8").attr("stroke-width", 2).attr("stroke-dasharray", "4,4");
                el.append("text").attr("dy", "5px").attr("text-anchor", "middle").text("Undefined Path").attr("font-size", "11px").attr("fill", "#64748b").attr("font-style", "italic");
            } else if (isDecision) {
                const colors = theme.decision;
                el.append("polygon").attr("points", "0,-40 60,0 0,40 -60,0").attr("fill", colors.bg).attr("stroke", colors.border).attr("stroke-width", 2);
                el.append("text").attr("dy", "-5px").attr("text-anchor", "middle").text(d.data.data.action.substring(0, 20) + (d.data.data.action.length > 20 ? "..." : "")).attr("font-size", "12px").attr("font-weight", "bold").attr("fill", colors.text);
                el.append("text").attr("dy", "15px").attr("text-anchor", "middle").text(d.data.data.role || "Decision Gate").attr("font-size", "10px").attr("fill", colors.text).attr("opacity", 0.8); 
            } else {
                // Action Node
                const colors = isEndState ? theme.endState : theme.process;
                
                el.append("rect").attr("x", -90).attr("y", -30).attr("width", 180).attr("height", 60).attr("rx", 6).attr("fill", colors.bg).attr("stroke", colors.border).attr("stroke-width", isEndState ? 3 : 2);
                
                if (isEndState) {
                    el.append("circle").attr("cx", 0).attr("cy", -30).attr("r", 8).attr("fill", colors.border);
                    el.append("rect").attr("x", -3).attr("y", -33).attr("width", 6).attr("height", 6).attr("fill", "white");
                }

                el.append("text").attr("dy", "-5px").attr("text-anchor", "middle").text(d.data.data.action.substring(0, 25) + (d.data.data.action.length > 25 ? "..." : "")).attr("font-size", "12px").attr("font-weight", "bold").attr("fill", colors.text);
                el.append("text").attr("dy", "15px").attr("text-anchor", "middle").text(d.data.data.role || "").attr("font-size", "10px").attr("fill", colors.text).attr("opacity", 0.7);
            }
        });
    }, [root, orientation, theme]);

    const handleExport = () => {
        if (!svgRef.current) return;
        const cleanTitle = (title || 'Process').replace(/[^a-z0-9]/gi, '_').substring(0, 30);
        const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
        const filename = `Process-${cleanTitle}-${timestamp}.png`;
        
        const bounds = {
            minX: minX,
            maxX: maxX,
            minY: minY,
            maxY: maxY
        };
        exportSvgToPng(svgRef.current, bounds, filename, 60);
    };

    return (
        <div ref={wrapperRef} className="w-full h-full overflow-hidden flex justify-center relative cursor-move" style={{ backgroundColor: theme.canvasBg }}>
            <svg ref={svgRef} className="w-full h-full"><g ref={gRef} /></svg>
            <div className="absolute bottom-4 left-4 flex gap-2">
                <button onClick={() => { d3.select(svgRef.current as any).transition().call(d3.zoom().scaleBy as any, 1.2) }} className="p-2 bg-white shadow rounded hover:bg-slate-50"><ZoomIn size={16}/></button>
                <button onClick={() => { d3.select(svgRef.current as any).transition().call(d3.zoom().scaleBy as any, 0.8) }} className="p-2 bg-white shadow rounded hover:bg-slate-50"><ZoomOut size={16}/></button>
            </div>
            <div className="absolute bottom-4 right-4 flex gap-2 items-end opacity-50 pointer-events-none"><SesarLogo className="h-8 w-auto grayscale" /></div>
            <button onClick={handleExport} className="absolute bottom-4 right-4 bg-slate-900 text-white p-2 rounded shadow ml-2 pointer-events-auto hover:bg-slate-800" title="Export High-Res PNG"><Download size={16} /></button>
        </div>
    );
};

// 2. SWIMLANE CHART
const SwimlaneChart: React.FC<{ steps: ProcessStep[]; title: string; theme: AppTheme }> = ({ steps, title, theme }) => {
    const svgRef = useRef<SVGSVGElement>(null);
    const gRef = useRef<SVGGElement>(null);
    const wrapperRef = useRef<HTMLDivElement>(null);

    const { lanes, nodes, links, width, height } = useMemo(() => {
        if (!steps.length) return { lanes: [], nodes: [], links: [], width: 0, height: 0 };
        
        const uniqueRoles = Array.from(new Set(steps.map(s => s.role || 'Unassigned'))).sort();
        const laneHeight = 180;
        const startX = 150;
        const stepX = 240;
        
        const calculatedNodes = steps.map(step => {
            const roleIndex = uniqueRoles.indexOf(step.role || 'Unassigned');
            return {
                ...step,
                x: startX + (step.stepNumber * stepX),
                y: (roleIndex * laneHeight) + (laneHeight / 2),
                roleIndex
            };
        });
        
        const calculatedLinks: {source: typeof calculatedNodes[0], target: typeof calculatedNodes[0], label?: string}[] = [];
        const nodeMap = new Map(calculatedNodes.map(n => [n.id, n]));

        calculatedNodes.forEach(node => {
             // Action -> Next Action logic
            if (node.type === 'action' && !node.isEndState) {
                // Find next step by number
                const next = calculatedNodes.find(n => n.stepNumber === node.stepNumber + 1);
                if (next) {
                    calculatedLinks.push({ source: node, target: next });
                }
            }
            // Decision -> Branch targets
            if (node.type === 'decision' && node.branches) {
                node.branches.forEach(b => {
                    if (b.targetStepId) {
                        const target = nodeMap.get(b.targetStepId);
                        if (target) {
                             calculatedLinks.push({ source: node, target: target, label: b.label });
                        }
                    }
                });
            }
        });

        const maxX = calculatedNodes.length > 0 ? Math.max(...calculatedNodes.map(n => n.x)) + 200 : 0;
        const totalHeight = Math.max(uniqueRoles.length * laneHeight, 400);

        return { 
            lanes: uniqueRoles, 
            nodes: calculatedNodes, 
            links: calculatedLinks,
            width: maxX, 
            height: totalHeight 
        };
    }, [steps]);

    useEffect(() => {
        if (!svgRef.current || !gRef.current) return;
        const zoom = d3.zoom<SVGSVGElement, unknown>()
            .scaleExtent([0.1, 3])
            .on('zoom', (e) => d3.select(gRef.current).attr('transform', e.transform.toString()));
        d3.select(svgRef.current).call(zoom);
        
        if (wrapperRef.current && width > 0) {
            const { clientWidth, clientHeight } = wrapperRef.current;
            const scale = Math.min(clientWidth / width, 1);
            // Center horizontally if possible, or start at left
            const t = d3.zoomIdentity.translate(20, 20).scale(scale);
            d3.select(svgRef.current).call(zoom.transform, t);
        }
    }, [width, height]);

    const handleExport = () => {
         if (!svgRef.current) return;
        const cleanTitle = (title || 'Process').replace(/[^a-z0-9]/gi, '_').substring(0, 30);
        const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
        const filename = `Swimlane-${cleanTitle}-${timestamp}.png`;
        const bounds = { minX: 0, maxX: width, minY: 0, maxY: height };
        exportSvgToPng(svgRef.current, bounds, filename, 60);
    };

    const getPath = (s: {x: number, y: number}, t: {x: number, y: number}) => {
        const midX = (s.x + t.x) / 2;
        return `M${s.x},${s.y} C${midX},${s.y} ${midX},${t.y} ${t.x},${t.y}`;
    };

    return (
        <div ref={wrapperRef} className="w-full h-full relative overflow-hidden" style={{ backgroundColor: theme.canvasBg }}>
             <svg ref={svgRef} className="w-full h-full cursor-move">
                 <g ref={gRef}>
                     {lanes.map((role, i) => (
                         <g key={role} transform={`translate(0, ${i * 180})`}>
                             <rect x={0} y={0} width={Math.max(width, 2000)} height={180} fill={i % 2 === 0 ? 'white' : '#f8fafc'} stroke="#f1f5f9" />
                             <text x={20} y={90} className="font-bold text-slate-300 text-sm uppercase tracking-wider" style={{ writingMode: 'vertical-rl', textOrientation: 'mixed' }}>{role}</text>
                         </g>
                     ))}
                     {links.map((link, i) => (
                         <g key={i}>
                             <path d={getPath(link.source, link.target)} fill="none" stroke={theme.link} strokeWidth="2" />
                             {link.label && (
                                 <g transform={`translate(${(link.source.x + link.target.x)/2}, ${(link.source.y + link.target.y)/2})`}>
                                     <rect x="-30" y="-10" width="60" height="20" rx="4" fill="white" stroke={theme.link} opacity="0.9" />
                                     <text x="0" y="4" textAnchor="middle" fontSize="9" fill="#64748b">{link.label}</text>
                                 </g>
                             )}
                         </g>
                     ))}
                     {nodes.map(node => {
                         const isDec = node.type === 'decision';
                         const palette = isDec ? theme.decision : (node.isEndState ? theme.endState : theme.process);
                         return (
                             <g key={node.id} transform={`translate(${node.x}, ${node.y})`}>
                                 {isDec ? (
                                     <>
                                        <polygon points="0,-30 40,0 0,30 -40,0" fill={palette.bg} stroke={palette.border} strokeWidth="2" />
                                        <text y="4" textAnchor="middle" fontSize="10" fontWeight="bold" fill={palette.text}>{node.action.substring(0,12)}</text>
                                     </>
                                 ) : (
                                     <>
                                        <rect x="-60" y="-25" width="120" height="50" rx="6" fill={palette.bg} stroke={palette.border} strokeWidth={node.isEndState ? 3 : 2} />
                                        <text y="-5" textAnchor="middle" fontSize="11" fontWeight="bold" fill={palette.text}>{node.action.length > 18 ? node.action.substring(0,16)+'...' : node.action}</text>
                                        <text y="12" textAnchor="middle" fontSize="9" fill={palette.text} opacity="0.8">Step {node.stepNumber}</text>
                                     </>
                                 )}
                             </g>
                         );
                     })}
                 </g>
             </svg>
             <button onClick={handleExport} className="absolute bottom-4 right-4 bg-slate-900 text-white p-2 rounded shadow ml-2 hover:bg-slate-800" title="Export PNG"><Download size={16} /></button>
        </div>
    );
};

// 3. SEQUENCE CHART (NEW)
const ProcessSequenceChart: React.FC<{ steps: ProcessStep[]; title: string; theme: AppTheme }> = ({ steps, title, theme }) => {
    const [mermaidCode, setMermaidCode] = useState('');
    const [customCode, setCustomCode] = useState<string | null>(null);
    const [isEditing, setIsEditing] = useState(false);
    const contentRef = useRef<HTMLDivElement>(null);

    // Helper to sanitize text for Mermaid
    const sanitizeText = (text: string, maxLength = 35) => {
        if (!text) return '';
        // Remove brackets, colons, quotes which break syntax
        let clean = text.replace(/[:;"\[\](){}<>]/g, ' ').trim();
        // Collapse spaces
        clean = clean.replace(/\s+/g, ' ');
        
        if (clean.length > maxLength) {
            clean = clean.substring(0, maxLength) + '...';
        }
        return clean;
    };

    useEffect(() => {
        // Generate Mermaid Code from Steps
        if (!steps || steps.length === 0) {
            setMermaidCode('');
            return;
        }

        const roles = Array.from(new Set(steps.map(s => s.role || "User"))) as string[];
        let code = `sequenceDiagram\n\tautonumber\n`;
        
        // Map roles to safe IDs (P0, P1, ...)
        const roleIdMap = new Map<string, string>();
        
        roles.forEach((role, index) => {
            const safeId = `P${index}`;
            roleIdMap.set(role, safeId);
            // Sanitize participant alias
            const alias = sanitizeText(role, 20); 
            code += `\tparticipant ${safeId} as ${alias}\n`;
        });
        code += '\n';

        const sorted = [...steps].sort((a,b) => a.stepNumber - b.stepNumber);
        
        // Initialize with first step's role
        let lastRole = sorted[0]?.role || "User";

        sorted.forEach((step, index) => {
            const currentRole = step.role || "User";
            const currentId = roleIdMap.get(currentRole) || 'P0';
            const lastId = roleIdMap.get(lastRole) || 'P0';
            
            // Sanitize label for message
            const safeLabel = sanitizeText(step.action, 40);
            
            if (index === 0) {
                 code += `\tNote over ${currentId}: ${safeLabel}\n`;
            } else {
                 if (currentRole !== lastRole) {
                     // Role change implies message/handoff
                     code += `\t${lastId}->>${currentId}: ${safeLabel}\n`;
                 } else {
                     // Internal action
                     code += `\tNote over ${currentId}: ${safeLabel}\n`;
                 }
            }

            // Decisions
            if (step.type === 'decision' && step.branches?.length) {
                // Use a shorter version for the Alt Header
                code += `\talt ${sanitizeText(step.action, 20)}?\n`;
                
                step.branches.forEach((b, i) => {
                    // Shorten branch label heavily for the side bar
                    const safeBranchLabel = sanitizeText(b.label, 15);
                    
                    if (i > 0) code += `\telse ${safeBranchLabel}\n`;
                    
                    // Add a Note inside the block to ensure it has height and visibility
                    // This fixes empty blocks collapsing and looking like overlapping lines
                    code += `\t\tNote over ${currentId}: [${safeBranchLabel} Path]\n`;
                });
                code += `\tend\n`;
            }

            lastRole = currentRole;
        });
        
        setMermaidCode(code);
    }, [steps]);

    // Effective code to display
    const effectiveCode = customCode !== null ? customCode : mermaidCode;

    const handleExport = async () => {
        if (!contentRef.current) return;
        try {
            const { toPng } = await import('html-to-image');
            const target = contentRef.current.querySelector('.mermaid-container') as HTMLElement;
            if (!target) return;
            
            const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
            const dataUrl = await toPng(target, { backgroundColor: '#ffffff', pixelRatio: 2 });
            const link = document.createElement('a');
            link.download = `Sequence-${title.replace(/[^a-z0-9]/gi, '_')}-${timestamp}.png`;
            link.href = dataUrl;
            link.click();
        } catch (e) {
            console.error(e);
            alert("Export failed.");
        }
    };

    return (
        <div ref={contentRef} className="w-full h-full flex flex-col relative bg-white">
             {/* Toolbar for edit mode */}
             <div className="flex justify-end p-2 px-6 gap-2 border-b border-slate-100 bg-slate-50/50">
                 {isEditing ? (
                     <>
                        <button onClick={() => { setCustomCode(null); setIsEditing(false); }} className="text-xs font-bold text-slate-500 hover:text-slate-700 px-3 py-1 rounded hover:bg-slate-200">Reset to Default</button>
                        <button onClick={() => setIsEditing(false)} className="text-xs font-bold text-white bg-blue-600 px-3 py-1 rounded hover:bg-blue-700">Apply & View</button>
                     </>
                 ) : (
                     <button onClick={() => { setCustomCode(effectiveCode); setIsEditing(true); }} className="text-xs font-bold text-blue-600 hover:text-blue-800 px-3 py-1 rounded hover:bg-blue-50 flex items-center gap-1">
                         <Code size={12} /> Edit Diagram Code
                     </button>
                 )}
             </div>

             <div className="flex-1 overflow-hidden relative flex">
                 {/* Editor Panel */}
                 {isEditing && (
                     <div className="w-1/3 h-full border-r border-slate-200 bg-slate-50 flex flex-col animate-in slide-in-from-left">
                         <div className="p-2 bg-slate-100 border-b border-slate-200 text-[10px] font-bold text-slate-500 uppercase">Mermaid Source</div>
                         <textarea 
                             className="flex-1 w-full p-4 font-mono text-xs outline-none resize-none bg-slate-50 focus:bg-white transition-colors"
                             value={customCode || ''}
                             onChange={(e) => setCustomCode(e.target.value)}
                             spellCheck={false}
                         />
                     </div>
                 )}

                 {/* Viewer Panel */}
                 <div className={`h-full overflow-auto p-8 flex justify-center ${isEditing ? 'w-2/3 bg-slate-100' : 'w-full bg-white'}`}>
                    <div className="w-full max-w-4xl">
                        <MermaidViewer code={effectiveCode} />
                    </div>
                 </div>
             </div>
             
             <button onClick={handleExport} className="absolute bottom-4 right-4 bg-slate-900 text-white p-2 rounded shadow ml-2 pointer-events-auto hover:bg-slate-800" title="Export PNG"><Download size={16} /></button>
        </div>
    );
};

export const ProcessModal: React.FC<{ 
    title: string; 
    steps: ProcessStep[]; 
    isLocked: boolean;
    startEditing?: boolean;
    onSave: (steps: ProcessStep[]) => void;
    onToggleLock: () => void;
    onClose: () => void;
    theme: AppTheme;
}> = ({ title, steps: initialSteps, onSave, isLocked, startEditing, onToggleLock, onClose, theme }) => {
  const [steps, setSteps] = useState(initialSteps);
  const [view, setView] = useState<'list' | 'flow' | 'swimlane' | 'sequence'>('flow'); // Added 'sequence'
  const [orientation, setOrientation] = useState<'vertical' | 'horizontal'>('vertical');
  const [isEditing, setIsEditing] = useState(startEditing || false);

  useEffect(() => { if (isLocked) setIsEditing(false); }, [isLocked]);
  const handleUpdateStep = (id: string, field: keyof ProcessStep, value: any) => setSteps(prev => prev.map(s => s.id === id ? { ...s, [field]: value } : s));
  const handleInsertStepAfter = (index: number) => { const newSteps = [...steps]; newSteps.splice(index + 1, 0, { id: crypto.randomUUID(), stepNumber: 0, type: 'action', action: "New Step", description: "Describe step...", role: "User" }); newSteps.forEach((s, i) => s.stepNumber = i + 1); setSteps(newSteps); };
  const handleDeleteStep = (id: string) => { const newSteps = steps.filter(s => s.id !== id); newSteps.forEach((s, i) => s.stepNumber = i + 1); setSteps(newSteps); };
  const addBranch = (stepId: string) => setSteps(prev => prev.map(s => s.id === stepId ? { ...s, branches: [...(s.branches || []), { id: crypto.randomUUID(), label: 'New Condition' }] } : s));
  const updateBranch = (stepId: string, branchId: string, field: keyof ProcessBranch, value: string) => setSteps(prev => prev.map(s => s.id === stepId && s.branches ? { ...s, branches: s.branches.map(b => b.id === branchId ? { ...b, [field]: value } : b) } : s));

  useEffect(() => {
    if (startEditing) setView('list');
  }, [startEditing]);

  return (
    <ModalBase title={`Process: ${title}`} onClose={onClose} headerAction={
            <div className="flex gap-2 mr-2">
                 <div className="bg-slate-100 p-1 rounded-lg flex gap-1">
                    <button onClick={() => setView('list')} className={`p-1.5 rounded-md transition-colors ${view === 'list' ? 'bg-white shadow-sm text-blue-600' : 'text-slate-500 hover:bg-slate-200'}`} title="List View"><LayoutList size={16} /></button>
                    <button onClick={() => setView('flow')} className={`p-1.5 rounded-md transition-colors ${view === 'flow' ? 'bg-white shadow-sm text-blue-600' : 'text-slate-500 hover:bg-slate-200'}`} title="Flow Diagram"><GitGraph size={16} /></button>
                    <button onClick={() => setView('swimlane')} className={`p-1.5 rounded-md transition-colors ${view === 'swimlane' ? 'bg-white shadow-sm text-blue-600' : 'text-slate-500 hover:bg-slate-200'}`} title="Swimlane View"><Columns size={16} /></button>
                    <button onClick={() => setView('sequence')} className={`p-1.5 rounded-md transition-colors ${view === 'sequence' ? 'bg-white shadow-sm text-blue-600' : 'text-slate-500 hover:bg-slate-200'}`} title="Sequence Diagram"><Activity size={16} /></button>
                 </div>
                 {view === 'flow' && (<div className="bg-slate-100 p-1 rounded-lg flex gap-1"><button onClick={() => setOrientation('vertical')} className={`p-1.5 rounded-md transition-colors ${orientation === 'vertical' ? 'bg-white shadow-sm text-blue-600' : 'text-slate-500 hover:bg-slate-200'}`} title="Portrait"><RectangleVertical size={16} /></button><button onClick={() => setOrientation('horizontal')} className={`p-1.5 rounded-md transition-colors ${orientation === 'horizontal' ? 'bg-white shadow-sm text-blue-600' : 'text-slate-500 hover:bg-slate-200'}`} title="Landscape"><RectangleHorizontal size={16} /></button></div>)}
                 <div className="w-px bg-slate-200 mx-1"></div>
                 <button onClick={onToggleLock} className={`p-2 rounded-lg text-sm font-medium flex items-center gap-2 transition-colors ${isLocked ? 'text-slate-500 bg-slate-100 hover:bg-slate-200' : 'text-slate-400 hover:text-slate-600'}`} title={isLocked ? "Unlock to Edit" : "Lock Content"}>{isLocked ? <Lock size={16} /> : <Unlock size={16} />}</button>
                 {!isLocked && (<button onClick={() => { if (isEditing) { onSave(steps); setIsEditing(false); } else setIsEditing(true); }} className={`p-2 rounded-lg text-sm font-medium flex items-center gap-2 transition-colors ${isEditing ? 'bg-blue-600 text-white hover:bg-blue-700' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'}`}>{isEditing ? <><Save size={16}/> Save</> : <><Edit3 size={16}/> Edit</>}</button>)}
            </div>
        }>
        <div className="h-full overflow-y-auto bg-white scrollbar-thin">
            {view === 'flow' ? (<ProcessFlowChart steps={steps} orientation={orientation} title={title} theme={theme} />) : 
             view === 'swimlane' ? (<SwimlaneChart steps={steps} title={title} theme={theme} />) : 
             view === 'sequence' ? (<ProcessSequenceChart steps={steps} title={title} theme={theme} />) :
            (
                <div className="p-6 pb-20 scale-90 origin-top">
                    {/* List view / Editing Form */}
                    <div className="flex flex-col gap-0">{steps.map((step, idx) => (<div key={step.id} className="relative group"><div className="flex gap-4">{idx !== steps.length - 1 && <div className="absolute left-[19px] top-10 bottom-[-20px] w-0.5 bg-slate-200 -z-10" />}<div className={`flex-shrink-0 w-10 h-10 rounded-full border-2 flex items-center justify-center font-bold z-10 ${step.type === 'decision' ? 'bg-orange-100 border-orange-500 text-orange-700' : step.isEndState ? 'bg-red-100 border-red-500 text-red-700' : 'bg-blue-100 border-blue-500 text-blue-700'}`}>{step.type === 'decision' ? <Split size={18} /> : step.isEndState ? <Octagon size={18} /> : step.stepNumber}</div><div className="pb-8 flex-1"><div className={`bg-slate-50 rounded-lg p-4 border transition-all ${isEditing ? 'border-blue-200 ring-2 ring-blue-50/50' : 'border-slate-100'}`}>{isEditing ? (<div className="space-y-3"><div className="flex gap-2 items-center"><select value={step.type || 'action'} onChange={(e) => handleUpdateStep(step.id, 'type', e.target.value)} className="text-xs font-bold bg-white border border-slate-300 rounded px-2 py-1"><option value="action">Action</option><option value="decision">Decision</option></select><input value={step.action} onChange={(e) => handleUpdateStep(step.id, 'action', e.target.value)} className="flex-1 font-semibold text-slate-800 bg-white border border-slate-300 rounded px-2 py-1 text-sm focus:ring-2 focus:ring-blue-500 outline-none" placeholder="Step Title" />
                    
                    {/* ALLOW ROLE EDITING FOR ALL TYPES (Including Decisions) */}
                    <input value={step.role || ''} placeholder="Role" onChange={(e) => handleUpdateStep(step.id, 'role', e.target.value)} className="w-24 text-xs font-bold bg-slate-200 text-slate-600 rounded px-2 py-1 border-none focus:ring-2 focus:ring-blue-500 outline-none" />
                    
                    <button onClick={() => handleDeleteStep(step.id)} className="p-1.5 bg-red-50 text-red-500 hover:bg-red-100 rounded-md transition-colors"><Trash2 size={16} /></button></div><textarea value={step.description} onChange={(e) => handleUpdateStep(step.id, 'description', e.target.value)} className="w-full text-sm text-slate-600 bg-white border border-slate-300 rounded px-2 py-1 focus:ring-2 focus:ring-blue-500 outline-none resize-none" rows={2} />
                    
                    {/* End State Toggle */}
                    {step.type === 'action' && (
                        <div className="flex items-center gap-2 mt-1">
                             <input 
                                type="checkbox" 
                                id={`endstate-${step.id}`}
                                checked={!!step.isEndState} 
                                onChange={(e) => handleUpdateStep(step.id, 'isEndState', e.target.checked)}
                                className="rounded border-slate-300 text-red-600 focus:ring-red-500" 
                             />
                             <label htmlFor={`endstate-${step.id}`} className="text-xs font-bold text-slate-500 flex items-center gap-1">
                                 <Octagon size={12} className={step.isEndState ? "text-red-500" : ""} /> End State (Terminate Branch)
                             </label>
                        </div>
                    )}

                    {step.type === 'decision' && (<div className="mt-2 pl-2 border-l-2 border-orange-200"><label className="text-xs font-bold text-orange-600 uppercase tracking-wide">Branches</label><div className="space-y-2 mt-1">{(step.branches || []).map((branch) => (<div key={branch.id} className="flex gap-2 items-center"><CornerDownRight size={14} className="text-orange-400" /><input value={branch.label} onChange={(e) => updateBranch(step.id, branch.id, 'label', e.target.value)} className="w-32 text-xs bg-white border border-slate-300 rounded px-2 py-1" placeholder="Condition" /><span className="text-xs text-slate-400">→</span><select value={branch.targetStepId || ''} onChange={(e) => updateBranch(step.id, branch.id, 'targetStepId', e.target.value)} className="flex-1 text-xs bg-white border border-slate-300 rounded px-2 py-1"><option value="">Select Target Step...</option>{steps.filter(s => s.id !== step.id).map(s => (<option key={s.id} value={s.id}>{s.stepNumber}. {s.action}</option>))}</select></div>))}<button onClick={() => addBranch(step.id)} className="text-xs text-orange-600 hover:text-orange-800 flex items-center gap-1 mt-1"><Plus size={12} /> Add Condition</button></div></div>)}<div className="flex justify-center pt-2"><button onClick={() => handleInsertStepAfter(idx)} className="text-xs text-blue-500 hover:text-blue-700 flex items-center gap-1 opacity-50 hover:opacity-100 transition-opacity"><ArrowDown size={12} /> Insert Step Below</button></div></div>) : (<><div className="flex justify-between items-start mb-1"><h3 className={`font-semibold ${step.isEndState ? 'text-red-700' : 'text-slate-800'}`}>{step.action}</h3>
                    {/* Display badges for Types and Roles */}
                    <div className="flex gap-1">
                        {step.role && <span className="text-[10px] uppercase tracking-wider font-bold bg-slate-200 text-slate-600 px-2 py-0.5 rounded-full">{step.role}</span>}
                        {step.type === 'decision' ? <span className="text-[10px] uppercase tracking-wider font-bold bg-orange-100 text-orange-600 px-2 py-0.5 rounded-full border border-orange-200">Decision</span> : step.isEndState ? <span className="text-[10px] uppercase tracking-wider font-bold bg-red-100 text-red-600 px-2 py-0.5 rounded-full border border-red-200">End State</span> : null}
                    </div>
                    </div><p className="text-sm text-slate-600">{step.description}</p>{step.type === 'decision' && step.branches && (<div className="mt-2 text-xs text-slate-500 flex flex-wrap gap-2">{step.branches.map(b => (<div key={b.id} className="flex items-center gap-1 bg-white border border-slate-200 px-2 py-1 rounded"><span className="font-bold text-orange-500">{b.label}</span><span>→</span><span>Step {steps.find(s => s.id === b.targetStepId)?.stepNumber || '?'}</span></div>))}</div>)}</>)}</div></div></div></div>))}
                    {isEditing && <button onClick={() => handleInsertStepAfter(steps.length - 1)} className="ml-14 mb-8 py-3 px-4 border-2 border-dashed border-slate-300 rounded-lg text-slate-400 hover:text-blue-500 hover:border-blue-400 hover:bg-blue-50 transition-all flex items-center justify-center gap-2 font-medium"><Plus size={20} /> Add Final Step</button>}
                    <div className="flex gap-4"><div className="flex-shrink-0 w-10 h-10 rounded-full bg-emerald-100 border-2 border-emerald-500 text-emerald-700 flex items-center justify-center z-10"><CheckCircle size={20} /></div><div className="pt-2"><span className="font-medium text-slate-500">End of Process</span></div></div>
                    </div>
                </div>
            )}
        </div>
    </ModalBase>
  );
};

// --- Info Modal ---
export const InfoModal: React.FC<{ title: string; content: string; onClose: () => void }> = ({ title, content, onClose }) => (
    <ModalBase title={title} onClose={onClose}>
        <div className="h-full overflow-y-auto p-6 bg-white">
            <div className="prose prose-sm max-w-none text-slate-700">
                <ReactMarkdown remarkPlugins={[remarkGfm]}>{content}</ReactMarkdown>
            </div>
        </div>
    </ModalBase>
);

// --- History Modal ---
export const HistoryModal: React.FC<{ 
    history: { description: string, timestamp: number }[]; 
    currentIndex: number; 
    onRestore: (index: number) => void; 
    onClose: () => void 
}> = ({ history, currentIndex, onRestore, onClose }) => (
    <ModalBase title="Version History" onClose={onClose}>
        <div className="h-full overflow-y-auto p-4 bg-slate-50">
            <div className="space-y-2">
                {history.map((entry, idx) => (
                    <div 
                        key={idx} 
                        className={`p-4 rounded-lg border flex justify-between items-center transition-all ${
                            idx === currentIndex 
                            ? 'bg-blue-50 border-blue-200 shadow-sm' 
                            : 'bg-white border-slate-200 hover:border-slate-300'
                        }`}
                    >
                        <div>
                            <div className="flex items-center gap-2">
                                <span className={`text-sm font-bold ${idx === currentIndex ? 'text-blue-700' : 'text-slate-700'}`}>
                                    {entry.description}
                                </span>
                                {idx === currentIndex && (
                                    <span className="text-[10px] bg-blue-100 text-blue-700 px-2 py-0.5 rounded-full font-bold uppercase tracking-wider">
                                        Current
                                    </span>
                                )}
                            </div>
                            <p className="text-xs text-slate-500 mt-1">
                                {new Date(entry.timestamp).toLocaleTimeString()} • {new Date(entry.timestamp).toLocaleDateString()}
                            </p>
                        </div>
                        {idx !== currentIndex && (
                            <button 
                                onClick={() => onRestore(idx)}
                                className="px-3 py-1.5 text-xs font-bold text-slate-600 bg-slate-100 hover:bg-slate-200 rounded-lg flex items-center gap-1"
                            >
                                <RotateCcw size={12} /> Restore
                            </button>
                        )}
                    </div>
                ))}
                {history.length === 0 && (
                    <p className="text-center text-slate-400 py-8">No history recorded yet.</p>
                )}
            </div>
        </div>
    </ModalBase>
);

// --- Log Modal ---
export const LogModal: React.FC<{ logs: LogEntry[]; onClose: () => void }> = ({ logs, onClose }) => {
    const endRef = useRef<HTMLDivElement>(null);
    useEffect(() => { endRef.current?.scrollIntoView({ behavior: 'smooth' }); }, [logs]);

    return (
        <ModalBase title="System Logs" onClose={onClose}>
            <div className="h-full overflow-y-auto p-4 bg-slate-900 font-mono text-xs text-slate-300">
                {logs.map((log) => (
                    <div key={log.id} className="mb-2 border-b border-slate-800 pb-2">
                        <div className="flex items-center gap-2 mb-1">
                            <span className={`font-bold uppercase ${
                                log.level === 'error' ? 'text-red-500' : 
                                log.level === 'warn' ? 'text-amber-500' : 
                                log.level === 'success' ? 'text-emerald-500' : 'text-blue-400'
                            }`}>[{log.level}]</span>
                            <span className="opacity-50">{new Date(log.timestamp).toLocaleTimeString()}</span>
                        </div>
                        <p className="text-slate-100">{log.message}</p>
                        {log.details && (
                            <pre className="mt-1 bg-slate-950 p-2 rounded text-slate-400 overflow-x-auto">
                                {JSON.stringify(log.details, null, 2)}
                            </pre>
                        )}
                    </div>
                ))}
                <div ref={endRef} />
            </div>
        </ModalBase>
    );
};

// --- Rename Modal ---
export const RenameModal: React.FC<{ 
    currentName: string; 
    onRename: (name: string) => void; 
    onClose: () => void 
}> = ({ currentName, onRename, onClose }) => {
    const [name, setName] = useState(currentName);

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (name.trim()) {
            onRename(name);
            onClose();
        }
    };

    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-900/50 backdrop-blur-sm p-4 animate-in fade-in">
            <div className="bg-white rounded-xl shadow-2xl w-full max-w-sm animate-in zoom-in-95">
                <div className="p-4 border-b border-slate-100 flex justify-between items-center bg-slate-50/50 rounded-t-xl">
                    <h3 className="font-bold text-slate-800 flex items-center gap-2">
                        <PenLine size={18} className="text-blue-600"/> Rename Session
                    </h3>
                    <button onClick={onClose} className="text-slate-400 hover:text-slate-600"><X size={20} /></button>
                </div>
                <form onSubmit={handleSubmit} className="p-6">
                    <label className="block text-xs font-bold text-slate-500 uppercase mb-2">Session Name</label>
                    <input 
                        type="text" 
                        value={name} 
                        onChange={(e) => setName(e.target.value)} 
                        className="w-full p-3 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none mb-6 text-sm font-medium"
                        placeholder="Enter new name..."
                        autoFocus
                    />
                    <div className="flex gap-2">
                        <button type="button" onClick={onClose} className="flex-1 py-2 text-sm font-medium text-slate-600 hover:bg-slate-100 rounded-lg transition-colors">Cancel</button>
                        <button type="submit" disabled={!name.trim()} className="flex-1 py-2 text-sm font-bold text-white bg-blue-600 hover:bg-blue-700 rounded-lg shadow-sm disabled:opacity-50">Save</button>
                    </div>
                </form>
            </div>
        </div>
    );
};
