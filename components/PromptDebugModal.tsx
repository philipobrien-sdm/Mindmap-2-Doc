
import React, { useState } from 'react';
import { Terminal, Send, X, AlertTriangle } from 'lucide-react';

interface PromptDebugModalProps {
  promptType: string;
  systemPrompt?: string;
  userPrompt: string;
  onConfirm: (finalPrompt: string) => void;
  onCancel: () => void;
}

export const PromptDebugModal: React.FC<PromptDebugModalProps> = ({ promptType, systemPrompt, userPrompt, onConfirm, onCancel }) => {
  const [editablePrompt, setEditablePrompt] = useState(userPrompt);

  return (
    <div className="fixed inset-0 z-[150] flex items-center justify-center bg-black/50 backdrop-blur-sm p-4 animate-in fade-in">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-3xl h-[80vh] flex flex-col animate-in zoom-in-95">
        <div className="p-4 border-b border-slate-200 flex justify-between items-center bg-slate-50 rounded-t-xl">
          <div className="flex items-center gap-2 text-slate-800 font-bold">
            <Terminal size={20} className="text-purple-600" />
            Review AI Request: {promptType}
          </div>
          <button onClick={onCancel} className="p-1 hover:bg-slate-200 rounded-full text-slate-500">
            <X size={20} />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-6 space-y-6 bg-slate-50/50">
          {/* Info Banner */}
          <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 flex items-start gap-3 text-sm text-amber-800">
             <AlertTriangle size={16} className="mt-0.5 shrink-0" />
             <p>You are in <strong>Review Mode</strong>. This is the exact instruction set that will be sent to the Gemini model. You can edit the User Prompt below to refine the request.</p>
          </div>

          {/* System Prompt Display (Read Only) */}
          {systemPrompt && (
              <div>
                  <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">System Instruction (Immutable)</label>
                  <div className="bg-slate-100 border border-slate-200 rounded-lg p-4 font-mono text-xs text-slate-600 whitespace-pre-wrap">
                      {systemPrompt}
                  </div>
              </div>
          )}

          {/* User Prompt Editor */}
          <div className="flex-1 flex flex-col">
              <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">User Prompt (Editable)</label>
              <textarea 
                  value={editablePrompt}
                  onChange={(e) => setEditablePrompt(e.target.value)}
                  className="w-full min-h-[300px] p-4 font-mono text-xs bg-white border border-slate-300 rounded-lg focus:ring-2 focus:ring-purple-500 outline-none resize-none shadow-sm"
                  spellCheck={false}
              />
          </div>
        </div>

        <div className="p-4 border-t border-slate-200 bg-white rounded-b-xl flex justify-end gap-3">
            <button onClick={onCancel} className="px-4 py-2 text-slate-600 font-medium hover:bg-slate-100 rounded-lg">
                Cancel
            </button>
            <button 
                onClick={() => onConfirm(editablePrompt)}
                className="px-6 py-2 bg-purple-600 hover:bg-purple-700 text-white font-bold rounded-lg flex items-center gap-2 shadow-md"
            >
                <Send size={16} /> Send to AI
            </button>
        </div>
      </div>
    </div>
  );
};
