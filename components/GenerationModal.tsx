
import React, { useState, useEffect } from 'react';
import { X, Sparkles, User, MessageSquare, Play, FileText, Bot, Lightbulb } from 'lucide-react';
import { MindMapData } from '../types';

interface GenerationModalProps {
  node: MindMapData;
  type: 'details' | 'process';
  onSelect: (mode: 'auto' | 'guided' | 'manual', guidance?: string) => void;
  onClose: () => void;
}

export const GenerationModal: React.FC<GenerationModalProps> = ({ node, type, onSelect, onClose }) => {
  const [mode, setMode] = useState<'select' | 'guided'>('select');
  const [guidance, setGuidance] = useState('');

  const isProcess = type === 'process';
  const Icon = isProcess ? Play : FileText;
  const title = isProcess ? 'Process Flow' : 'Detailed Explanation';

  // Pre-fill suggestion
  useEffect(() => {
      const suggestion = isProcess ? node.suggestedPrompts?.process : node.suggestedPrompts?.details;
      if (suggestion) {
          setGuidance(suggestion);
      }
  }, [node, isProcess]);

  const handleGuidedSubmit = () => {
      onSelect('guided', guidance);
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-900/50 backdrop-blur-sm p-4 animate-in fade-in duration-200">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-lg animate-in zoom-in-95 duration-200">
        <div className="p-4 border-b border-slate-100 flex justify-between items-center bg-slate-50/50 rounded-t-xl">
          <h2 className="text-lg font-bold text-slate-800 flex items-center gap-2">
            <Icon size={18} className="text-blue-600"/> 
            Generate {title}
          </h2>
          <button onClick={onClose} className="p-1 hover:bg-slate-200 rounded-full transition-colors text-slate-500">
            <X size={20} />
          </button>
        </div>
        
        <div className="p-6">
            {mode === 'select' ? (
                <>
                  <p className="text-sm text-slate-600 mb-6 leading-relaxed">
                    How would you like to create the content for <strong>"{node.label}"</strong>?
                  </p>

                  <div className="grid grid-cols-1 gap-3">
                      <button 
                        onClick={() => onSelect('auto')}
                        className="flex items-center gap-4 p-4 rounded-xl border border-slate-200 hover:border-blue-400 hover:bg-blue-50 transition-all group text-left"
                      >
                          <div className="w-10 h-10 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center group-hover:scale-110 transition-transform shrink-0">
                              <Sparkles size={20} />
                          </div>
                          <div>
                              <h3 className="font-bold text-slate-800 text-sm">AI Auto-Generate</h3>
                              <p className="text-xs text-slate-500">Analyze context and generate automatically.</p>
                          </div>
                      </button>

                      <button 
                        onClick={() => setMode('guided')}
                        className="flex items-center gap-4 p-4 rounded-xl border border-slate-200 hover:border-purple-400 hover:bg-purple-50 transition-all group text-left"
                      >
                          <div className="w-10 h-10 rounded-full bg-purple-100 text-purple-600 flex items-center justify-center group-hover:scale-110 transition-transform shrink-0">
                              <Bot size={20} />
                          </div>
                          <div className="flex-1">
                              <div className="flex justify-between items-center">
                                <h3 className="font-bold text-slate-800 text-sm">AI with Guidance</h3>
                                {((isProcess && node.suggestedPrompts?.process) || (!isProcess && node.suggestedPrompts?.details)) && (
                                    <span className="text-[10px] flex items-center gap-1 text-purple-600 bg-purple-50 px-1.5 py-0.5 rounded border border-purple-100 font-bold">
                                        <Lightbulb size={10} /> Suggestion Available
                                    </span>
                                )}
                              </div>
                              <p className="text-xs text-slate-500 mt-0.5">Provide specific instructions or focus areas.</p>
                          </div>
                      </button>

                      <button 
                        onClick={() => onSelect('manual')}
                        className="flex items-center gap-4 p-4 rounded-xl border border-slate-200 hover:border-emerald-400 hover:bg-emerald-50 transition-all group text-left"
                      >
                          <div className="w-10 h-10 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center group-hover:scale-110 transition-transform shrink-0">
                              <User size={20} />
                          </div>
                           <div>
                              <h3 className="font-bold text-slate-800 text-sm">Manual Creation</h3>
                              <p className="text-xs text-slate-500">Start from scratch with a blank template.</p>
                          </div>
                      </button>
                  </div>
                </>
            ) : (
                <>
                    <div className="flex justify-between items-end mb-2">
                        <p className="text-sm text-slate-600">
                            Provide instructions for the AI. What specific aspects should it focus on?
                        </p>
                        {((isProcess && node.suggestedPrompts?.process) || (!isProcess && node.suggestedPrompts?.details)) && (
                            <span className="text-[10px] flex items-center gap-1 text-purple-600 bg-purple-50 px-1.5 py-0.5 rounded border border-purple-100 whitespace-nowrap">
                                <Lightbulb size={10} /> AI Suggestion Loaded
                            </span>
                        )}
                    </div>
                    <textarea 
                        autoFocus
                        value={guidance}
                        onChange={(e) => setGuidance(e.target.value)}
                        placeholder={isProcess ? "e.g., Focus on safety checks and include a rollback step..." : "e.g., Explain the historical context and key stakeholders..."}
                        className="w-full h-32 p-3 border border-slate-300 rounded-lg focus:ring-2 focus:ring-purple-500 outline-none text-sm resize-none mb-4"
                    />
                    <div className="flex gap-2">
                        <button onClick={() => setMode('select')} className="px-4 py-2 text-slate-600 hover:bg-slate-100 rounded-lg text-sm font-medium">Back</button>
                        <button 
                            onClick={handleGuidedSubmit}
                            disabled={!guidance.trim()}
                            className="flex-1 bg-purple-600 hover:bg-purple-700 text-white font-bold py-2 rounded-lg text-sm disabled:opacity-50"
                        >
                            Generate
                        </button>
                    </div>
                </>
            )}
        </div>
      </div>
    </div>
  );
};
