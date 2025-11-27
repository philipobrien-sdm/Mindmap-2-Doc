
import React from 'react';
import { GitBranch, FileText, PlayCircle, X, Trash2, Edit2, FileJson, Eraser, FilePen } from 'lucide-react';
import { MindMapData, LoadingState } from '../types';

interface ActionMenuProps {
  node: MindMapData | null;
  position: { x: number; y: number } | null;
  onExpand: () => void;
  onDetails: () => void;
  onProcess: () => void;
  onEdit: () => void;
  onDelete: () => void;
  onReport: () => void;
  onReset: () => void;
  onDocument: () => void;
  onClose: () => void;
  loading: LoadingState;
}

export const ActionMenu: React.FC<ActionMenuProps> = ({ 
  node, position, onExpand, onDetails, onProcess, onEdit, onDelete, onReport, onReset, onDocument, onClose, loading 
}) => {
  if (!node || !position) return null;

  const isLoading = loading !== 'idle';
  const hasChildren = node.children && node.children.length > 0;
  const hasDataToClear = !!node.cachedDetails || (!!node.cachedProcess && node.cachedProcess.length > 0);

  return (
    <div 
      className="absolute bg-slate-900/90 backdrop-blur-sm text-white rounded-xl shadow-2xl p-1.5 flex gap-1 transform -translate-x-1/2 z-50 animate-in fade-in zoom-in duration-200"
      style={{
        top: position.y - 85, 
        left: position.x
      }}
    >
      <button 
        onClick={onExpand}
        disabled={isLoading || !!hasChildren}
        className="flex flex-col items-center gap-1 p-2 rounded-lg hover:bg-white/10 transition-colors disabled:opacity-30 disabled:cursor-not-allowed min-w-[50px]"
        title={hasChildren ? "Already Expanded" : "Generate Child Nodes"}
      >
        <GitBranch size={16} className={hasChildren ? "text-slate-500" : "text-blue-400"} />
        <span className="text-[9px] font-medium">Expand</span>
      </button>

      <div className="w-px bg-white/10 my-1" />

      <button 
        onClick={onDetails}
        disabled={isLoading}
        className="flex flex-col items-center gap-1 p-2 rounded-lg hover:bg-white/10 transition-colors disabled:opacity-50 min-w-[50px]"
        title="View Detailed Explanation"
      >
        <FileText size={16} className="text-emerald-400" />
        <span className="text-[9px] font-medium">Details</span>
      </button>

      <div className="w-px bg-white/10 my-1" />

      <button 
        onClick={onProcess}
        disabled={isLoading}
        className="flex flex-col items-center gap-1 p-2 rounded-lg hover:bg-white/10 transition-colors disabled:opacity-50 min-w-[50px]"
        title="Map Process Flow"
      >
        <PlayCircle size={16} className="text-amber-400" />
        <span className="text-[9px] font-medium">Process</span>
      </button>
      
      <div className="w-px bg-white/10 my-1" />
      
      <button 
        onClick={onDocument}
        disabled={isLoading}
        className="flex flex-col items-center gap-1 p-2 rounded-lg hover:bg-white/10 transition-colors disabled:opacity-50 min-w-[50px] relative"
        title="Edit Document Section"
      >
        <FilePen size={16} className="text-indigo-400" />
        {node.userSummary && <span className="absolute top-1 right-2 w-1.5 h-1.5 bg-indigo-400 rounded-full"></span>}
        <span className="text-[9px] font-medium">Doc</span>
      </button>

      <div className="w-px bg-white/10 my-1" />

      <button 
        onClick={onReport}
        disabled={isLoading}
        className="flex flex-col items-center gap-1 p-2 rounded-lg hover:bg-white/10 transition-colors disabled:opacity-50 min-w-[50px]"
        title="Quick HTML Report"
      >
        <FileJson size={16} className="text-purple-400" />
        <span className="text-[9px] font-medium">Export</span>
      </button>

      <div className="w-px bg-white/10 my-1" />

      {/* Editing Actions */}
      <button 
        onClick={onEdit}
        disabled={isLoading}
        className="flex flex-col items-center gap-1 p-2 rounded-lg hover:bg-white/10 transition-colors disabled:opacity-50 min-w-[40px]"
        title="Edit Node"
      >
        <Edit2 size={16} className="text-slate-300" />
        <span className="text-[9px] font-medium">Edit</span>
      </button>

      {hasDataToClear && (
          <button 
            onClick={onReset}
            disabled={isLoading}
            className="flex flex-col items-center gap-1 p-2 rounded-lg hover:bg-white/10 transition-colors disabled:opacity-50 min-w-[40px]"
            title="Clear Generated Data"
          >
            <Eraser size={16} className="text-amber-300" />
            <span className="text-[9px] font-medium">Clear</span>
          </button>
      )}

      <button 
        onClick={onDelete}
        disabled={isLoading}
        className="flex flex-col items-center gap-1 p-2 rounded-lg hover:bg-red-900/50 transition-colors disabled:opacity-50 min-w-[40px] text-red-400"
        title="Delete Node"
      >
        <Trash2 size={16} />
        <span className="text-[9px] font-medium">Delete</span>
      </button>

       <button 
        onClick={onClose}
        className="absolute -top-2 -right-2 bg-slate-500 hover:bg-slate-600 text-white rounded-full p-0.5 shadow-md"
      >
        <X size={12} />
      </button>
    </div>
  );
};
