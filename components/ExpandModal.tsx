
import React, { useState, useEffect } from 'react';
import { X, Sparkles, Lightbulb } from 'lucide-react';
import { MindMapData } from '../types';

interface ExpandModalProps {
  node: MindMapData;
  onConfirm: (guidance: string) => void;
  onClose: () => void;
}

export const ExpandModal: React.FC<ExpandModalProps> = ({ node, onConfirm, onClose }) => {
  const [guidance, setGuidance] = useState('');
  
  // Initialize with AI suggestion if available
  useEffect(() => {
      if (node.suggestedPrompts?.expand) {
          setGuidance(node.suggestedPrompts.expand);
      }
  }, [node]);

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-900/50 backdrop-blur-sm p-4 animate-in fade-in duration-200">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-md animate-in zoom-in-95 duration-200">
        <div className="p-4 border-b border-slate-100 flex justify-between items-center bg-slate-50/50 rounded-t-xl">
          <h2 className="text-lg font-bold text-slate-800 flex items-center gap-2">
            <Sparkles size={18} className="text-blue-600"/> 
            Expand Node
          </h2>
          <button onClick={onClose} className="p-1 hover:bg-slate-200 rounded-full transition-colors text-slate-500">
            <X size={20} />
          </button>
        </div>
        
        <div className="p-6 space-y-4">
          <div>
            <p className="text-sm text-slate-600 mb-3 leading-relaxed">
                You are about to expand <strong>"{node.label}"</strong>.<br/>
                You can let the AI decide how to break it down, or edit the guidance below.
            </p>
            
            <div className="flex justify-between items-end mb-1.5">
                <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider">
                    Focus / Guidance
                </label>
                {node.suggestedPrompts?.expand && (
                    <span className="text-[10px] flex items-center gap-1 text-purple-600 bg-purple-50 px-1.5 py-0.5 rounded border border-purple-100">
                        <Lightbulb size={10} /> AI Suggestion
                    </span>
                )}
            </div>
            
            <textarea 
              value={guidance} 
              onChange={(e) => setGuidance(e.target.value)}
              placeholder="Leave empty for automatic expansion..."
              className="w-full p-3 bg-slate-50 border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 outline-none h-32 resize-none placeholder:text-slate-400"
              autoFocus
            />
          </div>

          <div className="flex gap-3 pt-2">
             <button 
               onClick={onClose}
               className="flex-1 px-4 py-2 border border-slate-200 text-slate-600 font-medium rounded-lg hover:bg-slate-50 transition-colors"
             >
                Cancel
             </button>
             <button 
               onClick={() => onConfirm(guidance)}
               className="flex-1 bg-slate-900 hover:bg-slate-800 text-white font-medium py-2 rounded-lg flex items-center justify-center gap-2 shadow-lg hover:shadow-xl transition-all"
             >
                <Sparkles size={16} />
                {guidance.trim() ? "Expand with Guidance" : "Auto-Expand"}
             </button>
          </div>
        </div>
      </div>
    </div>
  );
};
