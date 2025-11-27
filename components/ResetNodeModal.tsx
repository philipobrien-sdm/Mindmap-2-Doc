import React, { useState } from 'react';
import { X, Eraser, Trash2, FileText, PlayCircle } from 'lucide-react';
import { MindMapData } from '../types';

interface ResetNodeModalProps {
  node: MindMapData;
  onConfirm: (clearDetails: boolean, clearProcess: boolean) => void;
  onClose: () => void;
}

export const ResetNodeModal: React.FC<ResetNodeModalProps> = ({ node, onConfirm, onClose }) => {
  const hasDetails = !!node.cachedDetails;
  const hasProcess = !!node.cachedProcess && node.cachedProcess.length > 0;

  const [clearDetails, setClearDetails] = useState(hasDetails);
  const [clearProcess, setClearProcess] = useState(hasProcess);

  const handleConfirm = () => {
    onConfirm(clearDetails, clearProcess);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-900/50 backdrop-blur-sm p-4 animate-in fade-in">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-sm animate-in zoom-in-95">
        <div className="p-4 border-b border-slate-100 flex justify-between items-center bg-slate-50/50 rounded-t-xl">
          <h3 className="font-bold text-slate-800 flex items-center gap-2">
            <Eraser size={18} className="text-amber-500"/> Reset Node Content
          </h3>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600"><X size={20} /></button>
        </div>
        
        <div className="p-6">
          <p className="text-sm text-slate-600 mb-4">
            Select the content you want to remove from <strong>"{node.label}"</strong>. 
            This cannot be undone.
          </p>
          
          <div className="space-y-3">
            {hasDetails && (
                <label className="flex items-center gap-3 p-3 border border-slate-200 rounded-lg cursor-pointer hover:bg-slate-50 transition-colors group">
                    <input type="checkbox" checked={clearDetails} onChange={e => setClearDetails(e.target.checked)} className="w-4 h-4 text-blue-600 rounded focus:ring-blue-500" />
                    <div className="flex items-center gap-2 text-sm font-medium text-slate-700 group-hover:text-slate-900">
                        <FileText size={16} className="text-emerald-500" />
                        Detailed Info
                    </div>
                </label>
            )}
            
            {hasProcess && (
                <label className="flex items-center gap-3 p-3 border border-slate-200 rounded-lg cursor-pointer hover:bg-slate-50 transition-colors group">
                    <input type="checkbox" checked={clearProcess} onChange={e => setClearProcess(e.target.checked)} className="w-4 h-4 text-blue-600 rounded focus:ring-blue-500" />
                    <div className="flex items-center gap-2 text-sm font-medium text-slate-700 group-hover:text-slate-900">
                        <PlayCircle size={16} className="text-amber-500" />
                        Process Flow
                    </div>
                </label>
            )}

            {!hasDetails && !hasProcess && (
                <div className="text-center py-4 bg-slate-50 rounded-lg border border-dashed border-slate-200 text-slate-400 text-sm italic">
                    No generated content to clear.
                </div>
            )}
          </div>

          <div className="mt-6 flex gap-2">
            <button onClick={onClose} className="flex-1 py-2 text-sm font-medium text-slate-600 hover:bg-slate-100 rounded-lg transition-colors">Cancel</button>
            <button 
                onClick={handleConfirm}
                disabled={!clearDetails && !clearProcess} 
                className="flex-1 py-2 text-sm font-bold text-white bg-amber-600 hover:bg-amber-700 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 transition-all shadow-sm"
            >
                <Trash2 size={16} /> Clear Selected
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};