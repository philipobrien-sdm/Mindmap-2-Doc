
import React, { useState, useMemo } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { X, Sparkles, FileText, Play, Save, Edit3, Eye, Loader2, Flag, EyeOff, Plus, Trash2, GitBranch } from 'lucide-react';
import { MindMapData } from '../types';

interface DocumentEditorModalProps {
  node: MindMapData;
  root: MindMapData; // Needed for selector
  nodeNumber: string;
  onSave: (summary: string) => void;
  onUpdateDependencies: (watchedIds: string[]) => void;
  onClearFlag: () => void;
  onGenerate: (label: string, details?: string, process?: any) => Promise<string>;
  onClose: () => void;
}

// Helper to flatten tree for selector
const getAllNodes = (node: MindMapData, depth = 0): { id: string, label: string, depth: number }[] => {
    let list = [{ id: node.id, label: node.label, depth }];
    if (node.children) {
        node.children.forEach(child => {
            list = [...list, ...getAllNodes(child, depth + 1)];
        });
    }
    return list;
};

export const DocumentEditorModal: React.FC<DocumentEditorModalProps> = ({ 
    node, root, nodeNumber, onSave, onUpdateDependencies, onClearFlag, onGenerate, onClose 
}) => {
  const [summary, setSummary] = useState(node.userSummary || '');
  const [activeTab, setActiveTab] = useState<'details' | 'process'>('details');
  const [isGenerating, setIsGenerating] = useState(false);
  const [isEditing, setIsEditing] = useState(true);
  const [showNodeSelector, setShowNodeSelector] = useState(false);

  // Dependency State - Calculated directly from props for immediate reactivity
  // Removed useMemo to ensure updates flow through instantly
  const watchedIds = new Set(node.watchedNodeIds || []);
  const allNodes = useMemo(() => getAllNodes(root), [root]);
  
  // Get full objects for currently watched IDs
  const watchedNodes = allNodes.filter(n => watchedIds.has(n.id));

  // Determine flagged sources names
  const flaggedNames = useMemo(() => {
      if (!node.flaggedSourceIds || node.flaggedSourceIds.length === 0) return [];
      return node.flaggedSourceIds.map(id => {
          const found = allNodes.find(n => n.id === id);
          return found ? found.label : 'Unknown Node';
      });
  }, [node.flaggedSourceIds, allNodes]);

  const handleAutoGenerate = async () => {
      setIsGenerating(true);
      try {
          const generated = await onGenerate(node.label, node.cachedDetails, node.cachedProcess);
          setSummary(generated);
      } catch (e) {
          console.error(e);
          alert("Failed to generate summary.");
      } finally {
          setIsGenerating(false);
      }
  };

  const handleSave = () => {
      onSave(summary);
      onClose();
  };

  const toggleWatch = (targetId: string) => {
      const newSet = new Set(watchedIds);
      if (newSet.has(targetId)) {
          newSet.delete(targetId);
      } else {
          newSet.add(targetId);
      }
      onUpdateDependencies(Array.from(newSet));
  };

  return (
    <div className="fixed inset-0 z-[120] flex items-center justify-center bg-slate-900/50 backdrop-blur-sm p-4 animate-in fade-in">
        <div className="bg-white rounded-2xl shadow-2xl w-full max-w-7xl h-[90vh] flex flex-col animate-in zoom-in-95 overflow-hidden relative">
            
            {/* Node Selector Modal (Nested) */}
            {showNodeSelector && (
                <div className="absolute inset-0 z-[130] flex items-center justify-center bg-black/20 backdrop-blur-[1px]">
                    <div className="bg-white rounded-xl shadow-xl w-96 max-h-[500px] flex flex-col border border-slate-200">
                        <div className="p-3 border-b border-slate-100 flex justify-between items-center bg-slate-50 rounded-t-xl">
                            <h4 className="font-bold text-slate-700 text-sm flex items-center gap-2">
                                <GitBranch size={16} /> Select Dependencies
                            </h4>
                            <button onClick={() => setShowNodeSelector(false)}><X size={16} className="text-slate-400 hover:text-slate-600"/></button>
                        </div>
                        <div className="flex-1 overflow-y-auto p-2 space-y-1">
                            {allNodes.map(n => {
                                const isSelf = n.id === node.id;
                                const isWatched = watchedIds.has(n.id);
                                return (
                                    <button 
                                        key={n.id}
                                        disabled={isSelf}
                                        onClick={() => toggleWatch(n.id)}
                                        className={`w-full text-left px-2 py-1.5 rounded text-xs flex items-center gap-2 transition-colors ${
                                            isSelf ? 'opacity-50 cursor-not-allowed' : 'hover:bg-slate-100'
                                        } ${isWatched ? 'bg-blue-50 text-blue-700' : 'text-slate-600'}`}
                                        style={{ paddingLeft: `${(n.depth * 12) + 8}px` }}
                                    >
                                        <div className={`w-3 h-3 rounded border flex items-center justify-center ${isWatched ? 'bg-blue-600 border-blue-600' : 'border-slate-300 bg-white'}`}>
                                            {isWatched && <span className="text-white text-[8px] font-bold">✓</span>}
                                        </div>
                                        <span className="truncate">{n.label}</span>
                                    </button>
                                );
                            })}
                        </div>
                        <div className="p-2 border-t border-slate-100 bg-slate-50 rounded-b-xl">
                            <button onClick={() => setShowNodeSelector(false)} className="w-full py-1.5 bg-blue-600 text-white text-xs font-bold rounded hover:bg-blue-700">Done</button>
                        </div>
                    </div>
                </div>
            )}

            {/* Header */}
            <div className="p-4 border-b border-slate-200 flex justify-between items-center bg-slate-50 shrink-0">
                <div>
                    <div className="flex items-center gap-2 mb-1">
                        <span className="bg-slate-200 text-slate-600 text-xs font-bold px-2 py-0.5 rounded-full">{nodeNumber}</span>
                        <h2 className="text-lg font-bold text-slate-800">{node.label}</h2>
                    </div>
                    <p className="text-xs text-slate-500">Document Builder & Summary Editor</p>
                </div>
                <div className="flex gap-2">
                    <button onClick={onClose} className="p-2 text-slate-400 hover:text-slate-600 rounded-full hover:bg-slate-200 transition-colors">
                        <X size={20} />
                    </button>
                </div>
            </div>

            {/* Flag Alert Banner */}
            {node.isFlaggedForReview && (
                <div className="bg-red-50 border-b border-red-100 p-3 flex justify-between items-center px-6 animate-in slide-in-from-top-2">
                    <div className="flex flex-col gap-1">
                        <div className="flex items-center gap-2 text-red-800 text-sm font-bold">
                            <Flag size={16} fill="currentColor" />
                            <span>Dependency Alert</span>
                        </div>
                        <span className="text-xs text-red-700 font-medium">
                            Updates detected in: <span className="font-bold">{flaggedNames.length > 0 ? flaggedNames.join(', ') : 'Unknown Source'}</span>.
                        </span>
                    </div>
                    <button 
                        onClick={onClearFlag}
                        className="text-xs bg-white border border-red-200 text-red-700 px-3 py-1.5 rounded-md font-bold shadow-sm hover:bg-red-50 transition-colors"
                    >
                        Mark Resolved
                    </button>
                </div>
            )}

            <div className="flex-1 flex overflow-hidden">
                
                {/* LEFT PANE: Source Material */}
                <div className="w-1/3 border-r border-slate-200 flex flex-col bg-slate-50/50">
                    <div className="flex border-b border-slate-200 bg-white">
                        <button 
                            onClick={() => setActiveTab('details')}
                            className={`flex-1 py-3 text-xs font-bold flex items-center justify-center gap-2 transition-colors border-b-2 ${activeTab === 'details' ? 'border-blue-600 text-blue-600 bg-blue-50/50' : 'border-transparent text-slate-500 hover:bg-slate-50'}`}
                        >
                            <FileText size={14} /> Details
                        </button>
                        <button 
                            onClick={() => setActiveTab('process')}
                            className={`flex-1 py-3 text-xs font-bold flex items-center justify-center gap-2 transition-colors border-b-2 ${activeTab === 'process' ? 'border-amber-500 text-amber-600 bg-amber-50/50' : 'border-transparent text-slate-500 hover:bg-slate-50'}`}
                        >
                            <Play size={14} /> Process
                        </button>
                    </div>

                    <div className="flex-1 overflow-y-auto p-6">
                        {activeTab === 'details' ? (
                            node.cachedDetails ? (
                                <div className="prose prose-sm max-w-none text-slate-600">
                                    <ReactMarkdown remarkPlugins={[remarkGfm]}>{node.cachedDetails}</ReactMarkdown>
                                </div>
                            ) : (
                                <div className="flex flex-col items-center justify-center h-full text-slate-400 italic">
                                    <FileText size={32} className="mb-2 opacity-20" />
                                    No details generated yet.
                                </div>
                            )
                        ) : (
                            node.cachedProcess && node.cachedProcess.length > 0 ? (
                                <div className="space-y-3">
                                    {node.cachedProcess.map((step, idx) => (
                                        <div key={idx} className="bg-white border border-slate-200 p-3 rounded-lg shadow-sm">
                                            <div className="flex items-start gap-3">
                                                <div className="bg-amber-100 text-amber-700 w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold shrink-0">
                                                    {step.stepNumber}
                                                </div>
                                                <div>
                                                    <h4 className="text-sm font-bold text-slate-800">{step.action}</h4>
                                                    <p className="text-xs text-slate-500 mt-1">{step.description}</p>
                                                    {step.role && <span className="text-[10px] bg-slate-100 text-slate-500 px-1.5 py-0.5 rounded mt-2 inline-block font-medium">{step.role}</span>}
                                                </div>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            ) : (
                                <div className="flex flex-col items-center justify-center h-full text-slate-400 italic">
                                    <Play size={32} className="mb-2 opacity-20" />
                                    No process flow mapped.
                                </div>
                            )
                        )}
                    </div>
                </div>

                {/* MIDDLE PANE: Editor */}
                <div className="flex-1 flex flex-col bg-white">
                    <div className="p-3 border-b border-slate-100 flex justify-between items-center bg-slate-50/30">
                        <h3 className="text-xs font-bold text-slate-500 uppercase tracking-wide flex items-center gap-2">
                            <span className="w-2 h-2 rounded-full bg-indigo-500"></span>
                            Section Content
                        </h3>
                        <div className="flex gap-2">
                            {/* Toggle Switch */}
                            <div className="bg-slate-200 p-0.5 rounded-lg flex text-xs font-bold">
                                <button 
                                    onClick={() => setIsEditing(true)}
                                    className={`px-3 py-1 rounded-md transition-all flex items-center gap-1 ${isEditing ? 'bg-white shadow text-indigo-600' : 'text-slate-500 hover:text-slate-700'}`}
                                >
                                    <Edit3 size={12} /> Edit
                                </button>
                                <button 
                                    onClick={() => setIsEditing(false)}
                                    className={`px-3 py-1 rounded-md transition-all flex items-center gap-1 ${!isEditing ? 'bg-white shadow text-indigo-600' : 'text-slate-500 hover:text-slate-700'}`}
                                >
                                    <Eye size={12} /> Preview
                                </button>
                            </div>

                            {isEditing && (
                                <button 
                                    onClick={handleAutoGenerate}
                                    disabled={isGenerating}
                                    className="text-xs font-bold text-purple-600 bg-purple-50 hover:bg-purple-100 px-3 py-1.5 rounded-lg border border-purple-100 flex items-center gap-2 transition-all disabled:opacity-50"
                                >
                                    {isGenerating ? <Loader2 size={14} className="animate-spin" /> : <Sparkles size={14} />} 
                                    {isGenerating ? 'Building...' : 'AI Auto-Draft'}
                                </button>
                            )}
                        </div>
                    </div>
                    
                    <div className="flex-1 relative overflow-y-auto">
                        {isEditing ? (
                            <textarea 
                                value={summary}
                                onChange={(e) => setSummary(e.target.value)}
                                placeholder="Write your document section summary here..."
                                className="w-full h-full p-6 outline-none resize-none text-slate-700 leading-relaxed font-mono text-sm"
                                spellCheck={false}
                            />
                        ) : (
                            <div className="w-full h-full p-8 prose prose-sm max-w-none text-slate-700">
                                {summary ? (
                                    <ReactMarkdown remarkPlugins={[remarkGfm]}>{summary}</ReactMarkdown>
                                ) : (
                                    <p className="text-slate-400 italic">No content to preview.</p>
                                )}
                            </div>
                        )}
                    </div>

                    <div className="p-4 border-t border-slate-100 bg-slate-50 flex justify-end gap-3 shrink-0">
                        <button onClick={onClose} className="px-4 py-2 text-slate-600 font-medium hover:bg-slate-200 rounded-lg transition-colors">
                            Cancel
                        </button>
                        <button onClick={handleSave} className="px-6 py-2 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-lg flex items-center gap-2 shadow-md transition-all">
                            <Save size={16} /> Save Section
                        </button>
                    </div>
                </div>

                {/* RIGHT PANE: Dependencies */}
                <div className="w-64 border-l border-slate-200 bg-slate-50 flex flex-col">
                    <div className="p-3 border-b border-slate-200 bg-slate-100 flex justify-between items-center">
                        <h4 className="text-xs font-bold text-slate-500 uppercase tracking-wide">Dependencies</h4>
                        <button 
                            onClick={() => setShowNodeSelector(true)}
                            className="p-1 hover:bg-white rounded text-blue-600 transition-colors" 
                            title="Add Watched Node"
                        >
                            <Plus size={16} />
                        </button>
                    </div>
                    <div className="flex-1 overflow-y-auto p-2">
                        {watchedNodes.length === 0 ? (
                            <div className="text-center p-4">
                                <EyeOff size={24} className="text-slate-300 mx-auto mb-2" />
                                <p className="text-xs text-slate-400">No nodes being watched.</p>
                                <button onClick={() => setShowNodeSelector(true)} className="mt-2 text-xs text-blue-600 font-bold hover:underline">Add Watch</button>
                            </div>
                        ) : (
                            <div className="space-y-2">
                                {watchedNodes.map(watched => (
                                    <div key={watched.id} className="bg-white border border-slate-200 p-2 rounded text-xs shadow-sm flex justify-between items-start group">
                                        <div>
                                            <span className="font-bold text-slate-700 block truncate w-40" title={watched.label}>{watched.label}</span>
                                            <span className="text-[10px] text-slate-400">ID: {watched.id.substring(0,6)}...</span>
                                        </div>
                                        <button 
                                            onClick={() => toggleWatch(watched.id)}
                                            className="text-slate-300 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-all"
                                        >
                                            <Trash2 size={14} />
                                        </button>
                                    </div>
                                ))}
                            </div>
                        )}
                        
                        <div className="mt-4 px-2">
                            <p className="text-[10px] text-slate-400 leading-tight">
                                <strong>Info:</strong> If any watched node is updated or deleted, this section will be flagged for review.
                            </p>
                        </div>
                    </div>
                </div>

            </div>
        </div>
    </div>
  );
};
