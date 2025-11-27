
import React, { useState } from 'react';
import { X, Save, Plus } from 'lucide-react';
import { MindMapData, NodeType, NodeNature } from '../types';

interface EditNodeModalProps {
  node: MindMapData;
  nodeNumber?: string;
  onSave: (updatedNode: Partial<MindMapData>) => void;
  onClose: () => void;
  onAddChild: () => void;
}

export const EditNodeModal: React.FC<EditNodeModalProps> = ({ node, nodeNumber, onSave, onClose, onAddChild }) => {
  const [label, setLabel] = useState(node.label);
  const [description, setDescription] = useState(node.description || '');
  const [nodeType, setNodeType] = useState<NodeType>(node.nodeType);
  const [nature, setNature] = useState<NodeNature>(node.nature);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSave({ label, description, nodeType, nature });
    onClose();
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-900/50 backdrop-blur-sm p-4 animate-in fade-in duration-200">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-md animate-in zoom-in-95 duration-200">
        <div className="p-4 border-b border-slate-100 flex justify-between items-center bg-slate-50/50 rounded-t-xl">
          <div className="flex items-center gap-2">
              <h2 className="text-lg font-bold text-slate-800">Edit Node</h2>
              {nodeNumber && (
                  <span className="text-xs font-mono font-bold bg-slate-200 text-slate-600 px-2 py-0.5 rounded-full">{nodeNumber}</span>
              )}
          </div>
          <button onClick={onClose} className="p-1 hover:bg-slate-200 rounded-full transition-colors text-slate-500">
            <X size={20} />
          </button>
        </div>
        
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div>
            <label className="block text-sm font-semibold text-slate-700 mb-1">Label</label>
            <input 
              type="text" 
              value={label} 
              onChange={(e) => setLabel(e.target.value)}
              className="w-full p-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
              required 
            />
          </div>
          
          <div>
            <label className="block text-sm font-semibold text-slate-700 mb-1">Description</label>
            <textarea 
              value={description} 
              onChange={(e) => setDescription(e.target.value)}
              className="w-full p-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none h-24 resize-none"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
             <div>
                <label className="block text-sm font-semibold text-slate-700 mb-1">Type</label>
                <select 
                    value={nodeType}
                    onChange={(e) => setNodeType(e.target.value as NodeType)}
                    className="w-full p-2 border border-slate-300 rounded-lg"
                >
                    <option value="info">Info</option>
                    <option value="process">Process</option>
                </select>
             </div>
             <div>
                <label className="block text-sm font-semibold text-slate-700 mb-1">Nature</label>
                <select 
                    value={nature}
                    onChange={(e) => setNature(e.target.value as NodeNature)}
                    className="w-full p-2 border border-slate-300 rounded-lg"
                >
                    <option value="fact">Fact</option>
                    <option value="opinion">Opinion</option>
                </select>
             </div>
          </div>

          <div className="pt-4 flex gap-3">
             <button 
               type="button" 
               onClick={() => { onAddChild(); onClose(); }}
               className="flex-1 bg-white border border-slate-300 hover:bg-slate-50 text-slate-700 font-medium py-2 rounded-lg flex items-center justify-center gap-2"
             >
                <Plus size={16} /> Add Manual Child
             </button>
             <button 
               type="submit" 
               className="flex-1 bg-blue-600 hover:bg-blue-700 text-white font-medium py-2 rounded-lg flex items-center justify-center gap-2"
             >
                <Save size={16} /> Save Changes
             </button>
          </div>
        </form>
      </div>
    </div>
  );
};
