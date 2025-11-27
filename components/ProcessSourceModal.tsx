
import React from 'react';
import { X, Sparkles, User, PenTool, AlertCircle, Play } from 'lucide-react';
import { MindMapData } from '../types';

interface ProcessSourceModalProps {
  node: MindMapData;
  onSelect: (source: 'ai' | 'user') => void;
  onClose: () => void;
}

export const ProcessSourceModal: React.FC<ProcessSourceModalProps> = ({ node, onSelect, onClose }) => {
  const isCandidate = !!node.isProcessCandidate;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-900/50 backdrop-blur-sm p-4 animate-in fade-in duration-200">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-lg animate-in zoom-in-95 duration-200">
        <div className="p-4 border-b border-slate-100 flex justify-between items-center bg-slate-50/50 rounded-t-xl">
          <h2 className="text-lg font-bold text-slate-800 flex items-center gap-2">
            <PenTool size={18} className="text-blue-600"/> 
            Define Process
          </h2>
          <button onClick={onClose} className="p-1 hover:bg-slate-200 rounded-full transition-colors text-slate-500">
            <X size={20} />
          </button>
        </div>
        
        <div className="p-6">
          <p className="text-sm text-slate-600 mb-6 leading-relaxed">
            How would you like to create the process flow for <strong>"{node.label}"</strong>?
          </p>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <button 
                onClick={() => onSelect('ai')}
                className={`flex flex-col items-center justify-center gap-3 p-6 rounded-xl border-2 transition-all group text-center cursor-pointer ${
                    isCandidate 
                    ? 'border-slate-100 hover:border-blue-500 hover:bg-blue-50' 
                    : 'border-amber-100 bg-amber-50/30 hover:bg-amber-50 hover:border-amber-300'
                }`}
              >
                  <div className={`w-12 h-12 rounded-full flex items-center justify-center transition-transform ${
                      isCandidate 
                      ? 'bg-blue-100 text-blue-600 group-hover:scale-110' 
                      : 'bg-amber-100 text-amber-600 group-hover:scale-110'
                  }`}>
                      {isCandidate ? <Sparkles size={24} /> : <Play size={24} />}
                  </div>
                  <div>
                      <h3 className={`font-bold mb-1 ${isCandidate ? 'text-slate-800' : 'text-slate-700'}`}>
                          {isCandidate ? 'AI Auto-Generate' : 'Force AI Generation'}
                      </h3>
                      {isCandidate ? (
                          <p className="text-xs text-slate-500">Analyze context and generate flow automatically.</p>
                      ) : (
                          <p className="text-xs text-amber-600 flex items-center justify-center gap-1 font-medium mt-1">
                              <AlertCircle size={10} /> Not a detected process
                          </p>
                      )}
                  </div>
              </button>

              <button 
                onClick={() => onSelect('user')}
                className="flex flex-col items-center justify-center gap-3 p-6 rounded-xl border-2 border-slate-100 hover:border-emerald-500 hover:bg-emerald-50 transition-all group text-center"
              >
                  <div className="w-12 h-12 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center group-hover:scale-110 transition-transform">
                      <User size={24} />
                  </div>
                   <div>
                      <h3 className="font-bold text-slate-800 mb-1">Manual Creation</h3>
                      <p className="text-xs text-slate-500">Start with a blank canvas and define steps manually.</p>
                  </div>
              </button>
          </div>
          
          {!isCandidate && (
              <div className="mt-4 p-3 bg-amber-50 text-amber-800 text-xs rounded-lg border border-amber-100">
                  <strong>Note:</strong> The AI did not flag this node as a standard procedure. "Force AI Generation" will attempt to create a process anyway, but results may be abstract.
              </div>
          )}
        </div>
      </div>
    </div>
  );
};
