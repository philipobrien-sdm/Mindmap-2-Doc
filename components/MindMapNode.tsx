
import React from 'react';
import { Settings, Info, CheckCircle2, MessageSquare, ChevronRight, MoreHorizontal, FileText, PlayCircle, Bot, User, Workflow, Flag, BookOpen, Eye } from 'lucide-react';
import { MindMapData, AppTheme } from '../types';

interface MindMapNodeProps {
  node: MindMapData;
  nodeNumber?: string; // Passed from parent
  x: number;
  y: number;
  selected: boolean;
  isMatch?: boolean; // New prop for search results
  onSelect: (node: MindMapData) => void;
  onExpand: (node: MindMapData) => void;
  hasHiddenChildren?: boolean;
  isDevMode?: boolean;
  theme: AppTheme;
}

export const MindMapNode: React.FC<MindMapNodeProps> = ({ 
  node, nodeNumber, x, y, selected, isMatch, onSelect, onExpand, hasHiddenChildren, isDevMode, theme
}) => {
  
  // Icon Logic
  const TypeIcon = node.nodeType === 'process' ? Settings : Info;
  const NatureIcon = node.nature === 'fact' ? CheckCircle2 : MessageSquare;
  
  // Theme Logic
  const palette = node.nodeType === 'process' ? theme.process : theme.info;
  
  // Dynamic Styles for Search Highlighting
  const borderColor = isMatch 
    ? '#a855f7' // Purple-500
    : selected 
        ? '#3b82f6' // Blue-500
        : palette.border;

  const borderWidth = isMatch || selected ? '2px' : '1px';
  
  const shadowClass = isMatch
    ? 'shadow-xl ring-4 ring-purple-300 scale-105 z-50' // Pop out search results
    : selected 
        ? 'shadow-xl ring-2 ring-offset-2 ring-blue-400 z-40' 
        : 'shadow-sm hover:shadow-md z-10';

  const nodeStyle: React.CSSProperties = {
      backgroundColor: palette.bg,
      borderColor: borderColor,
      color: palette.text,
      transform: `translate(${x}px, ${y}px) translate(-50%, -50%)`,
      borderWidth: borderWidth,
      // Ensure transition encompasses search effects
      transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
  };

  // Cached State Check
  const hasCachedDetails = !!node.cachedDetails;
  const hasCachedProcess = !!node.cachedProcess && node.cachedProcess.length > 0;
  const isProcessCandidate = !!node.isProcessCandidate;
  const hasUserSummary = !!node.userSummary && node.userSummary.trim().length > 0;
  const hasDependencies = !!node.watchedNodeIds && node.watchedNodeIds.length > 0;

  // Root Detection for Tutorial
  const isRoot = !nodeNumber || nodeNumber === '1.0';

  return (
    <div
      onClick={(e) => {
        e.stopPropagation();
        onSelect(node);
      }}
      // Add data-tutorial-id for the tutorial overlay to find the root node
      data-tutorial-id={isRoot ? "node-root" : undefined}
      className={`absolute cursor-pointer group rounded-lg border p-3 w-64 ${shadowClass}`}
      style={nodeStyle}
    >
      {/* Review Flag - Top Center (Floating) */}
      {node.isFlaggedForReview && (
          <div className="absolute -top-3 left-1/2 transform -translate-x-1/2 z-30 animate-in bounce-in duration-500">
              <div className="bg-red-500 text-white p-1 rounded-full shadow-md border border-white" title="Flagged: Dependencies Changed">
                  <Flag size={12} fill="currentColor" />
              </div>
          </div>
      )}

      <div className="flex items-start justify-between mb-2">
        <div className="flex gap-1">
          <span className="p-1 rounded-md bg-white/50 border border-black/5" title={node.nodeType}>
            <TypeIcon size={14} />
          </span>
          <span className="p-1 rounded-md bg-white/50 border border-black/5" title={node.nature}>
            <NatureIcon size={14} />
          </span>
          
          {/* Intelligent Flag: Process Candidate */}
          {isProcessCandidate && (
             <span className="p-1 rounded-md bg-amber-100 text-amber-700 border border-amber-200" title="Process Candidate: This node represents a workflow">
                <Workflow size={14} />
             </span>
          )}

          {/* Cache Indicators */}
          {(hasCachedDetails || hasCachedProcess) && (
             <div className="flex gap-1 ml-1 pl-1 border-l border-black/10">
                {hasCachedDetails && (
                    <span className="p-1 rounded-md bg-emerald-100 text-emerald-700" title="Details available locally">
                        <FileText size={14} />
                    </span>
                )}
                {hasCachedProcess && (
                    <span className="p-1 rounded-md bg-amber-100 text-amber-700" title="Process map available locally">
                        <PlayCircle size={14} />
                    </span>
                )}
             </div>
          )}

          {/* Doc & Dependency Indicators */}
          {(hasUserSummary || hasDependencies) && (
             <div className="flex gap-1 ml-1 pl-1 border-l border-black/10">
                {hasUserSummary && (
                    <span className="p-1 rounded-md bg-indigo-100 text-indigo-700" title="Document Content Present">
                        <BookOpen size={14} />
                    </span>
                )}
                {hasDependencies && (
                    <span className="p-1 rounded-md bg-slate-200 text-slate-700" title="Watching Dependencies">
                        <Eye size={14} />
                    </span>
                )}
             </div>
          )}
        </div>
        
        {/* Source Badge (Dev Mode) */}
        {isDevMode && (
             <div className="absolute -top-2 -right-2 bg-slate-800 text-white text-[10px] px-1.5 py-0.5 rounded-full flex items-center gap-1 shadow-md z-20">
                 {node.source === 'ai' ? <Bot size={10} className="text-purple-300" /> : <User size={10} className="text-blue-300" />}
                 <span className="font-mono uppercase tracking-tighter">{node.source || 'UNK'}</span>
             </div>
        )}
        
        {node.children && node.children.length > 0 && (
          <button 
            onClick={(e) => {
               e.stopPropagation();
               onExpand(node);
            }}
            className="text-black/40 hover:text-black/80 transition-colors"
          >
             <ChevronRight size={16} className={`transform transition-transform ${node._collapsed ? '' : 'rotate-90'}`} />
          </button>
        )}
      </div>

      <h3 className="text-sm font-semibold leading-tight mb-1" style={{ color: palette.text }}>
        {nodeNumber && <span className="opacity-60 mr-1.5">{nodeNumber}</span>}
        {node.label}
      </h3>
      
      {node.description && (
        <p className="text-xs opacity-80 line-clamp-2 leading-relaxed" style={{ color: palette.text }}>
          {node.description}
        </p>
      )}

      {/* Explicit Search Match Indicator if description is clamped or match is deep */}
      {isMatch && (
          <div className="absolute -top-2 -left-2 bg-purple-600 text-white text-[9px] font-bold px-1.5 py-0.5 rounded-full shadow-sm">
              MATCH
          </div>
      )}

      {hasHiddenChildren && (
        <div className="absolute -bottom-3 left-1/2 transform -translate-x-1/2">
            <div className="bg-white text-slate-500 text-[10px] px-2 py-0.5 rounded-full border border-slate-200 shadow-sm flex items-center gap-1">
               <MoreHorizontal size={10} />
            </div>
        </div>
      )}
    </div>
  );
};
