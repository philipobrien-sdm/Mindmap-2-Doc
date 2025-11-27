
import React, { useMemo, useState } from 'react';
import { X, Tag, Filter, MapPin } from 'lucide-react';
import { MindMapData } from '../types';

interface ConceptCloudProps {
  data: MindMapData;
  onSelectNode: (nodeId: string) => void;
  onClose: () => void;
  onHoverConcept: (concept: string | null) => void;
}

// Simple stop words list to filter out common noise
const STOP_WORDS = new Set(['the', 'and', 'a', 'an', 'in', 'on', 'at', 'to', 'for', 'of', 'with', 'by', 'is', 'are', 'was', 'were', 'be', 'been', 'this', 'that', 'it', 'as', 'or', 'if', 'but', 'not', 'from', 'process', 'system', 'data', 'step']);

export const ConceptCloud: React.FC<ConceptCloudProps> = ({ data, onSelectNode, onClose, onHoverConcept }) => {
  const [selectedConcept, setSelectedConcept] = useState<string | null>(null);

  // 1. Extract Concepts (Client-side NLP Lite)
  const { concepts, conceptMap } = useMemo(() => {
    const map = new Map<string, { count: number; nodes: { id: string; label: string; context: string }[] }>();
    
    const traverse = (node: MindMapData) => {
        // Combine label and description for extraction
        const text = `${node.label} ${node.description || ''}`.toLowerCase();
        // Remove punctuation and split
        const words = text.replace(/[.,/#!$%^&*;:{}=\-_`~()]/g, "").split(/\s+/);
        
        const uniqueNodeWords = new Set<string>();

        words.forEach(word => {
            if (word.length > 3 && !STOP_WORDS.has(word) && !uniqueNodeWords.has(word)) {
                // Heuristic: Only care about words that look like nouns or specialized terms
                uniqueNodeWords.add(word);
                
                if (!map.has(word)) {
                    map.set(word, { count: 0, nodes: [] });
                }
                const entry = map.get(word)!;
                entry.count++;
                entry.nodes.push({ 
                    id: node.id, 
                    label: node.label, 
                    context: node.description?.substring(0, 50) + '...' || 'No description'
                });
            }
        });

        if (node.children) node.children.forEach(traverse);
    };

    traverse(data);

    // Filter for significant concepts (appear more than once, or distinct enough)
    // Sort by frequency
    const sortedConcepts = Array.from(map.entries())
        .filter(([_, data]) => data.count > 1) // Only show recurring themes
        .sort((a, b) => b[1].count - a[1].count)
        .slice(0, 40); // Top 40 concepts

    return { concepts: sortedConcepts, conceptMap: map };
  }, [data]);

  const matchingNodes = selectedConcept ? conceptMap.get(selectedConcept)?.nodes || [] : [];

  return (
    <div className="absolute top-0 right-0 h-full w-80 bg-white/95 backdrop-blur shadow-2xl border-l border-slate-200 z-[60] flex flex-col animate-in slide-in-from-right duration-300">
        <div className="p-4 border-b border-slate-100 flex justify-between items-center bg-slate-50/80">
            <h3 className="font-bold text-slate-800 flex items-center gap-2">
                <Tag size={18} className="text-purple-600" /> Concept Cloud
            </h3>
            <button onClick={onClose} className="p-1 hover:bg-slate-200 rounded-full text-slate-500">
                <X size={18} />
            </button>
        </div>

        {/* Cloud Area */}
        <div className="p-4 flex-shrink-0 border-b border-slate-100 bg-slate-50/30">
            <div className="flex flex-wrap gap-2 justify-center">
                {concepts.length === 0 ? (
                    <p className="text-sm text-slate-400 italic py-4">Not enough content to extract themes yet.</p>
                ) : (
                    concepts.map(([word, meta]) => {
                        // Dynamic sizing based on frequency
                        const fontSize = Math.min(1 + (meta.count * 0.1), 2) + 'rem';
                        const opacity = Math.min(0.5 + (meta.count * 0.1), 1);
                        const isSelected = selectedConcept === word;

                        return (
                            <button
                                key={word}
                                onClick={() => {
                                    const newSelection = isSelected ? null : word;
                                    setSelectedConcept(newSelection);
                                    onHoverConcept(newSelection); // Use search highlight mechanism
                                }}
                                onMouseEnter={() => !selectedConcept && onHoverConcept(word)}
                                onMouseLeave={() => !selectedConcept && onHoverConcept(null)}
                                className={`px-2 py-0.5 rounded-lg transition-all capitalize font-bold leading-tight ${
                                    isSelected 
                                    ? 'bg-purple-600 text-white scale-110 shadow-md' 
                                    : 'bg-white border border-slate-200 text-slate-600 hover:text-purple-600 hover:border-purple-200'
                                }`}
                                style={{ fontSize: `clamp(0.75rem, ${0.7 + (meta.count * 0.05)}rem, 1.2rem)` }}
                            >
                                {word} <span className="text-[9px] opacity-50 align-top">{meta.count}</span>
                            </button>
                        );
                    })
                )}
            </div>
        </div>

        {/* List Area */}
        <div className="flex-1 overflow-y-auto p-0">
            {selectedConcept ? (
                <div>
                    <div className="p-3 bg-purple-50 border-b border-purple-100 text-xs font-bold text-purple-800 uppercase tracking-wider flex justify-between items-center sticky top-0 backdrop-blur-sm z-10">
                        <span>{matchingNodes.length} Occurrences of "{selectedConcept}"</span>
                        <button onClick={() => { setSelectedConcept(null); onHoverConcept(null); }} className="text-purple-400 hover:text-purple-700">Clear</button>
                    </div>
                    <div className="divide-y divide-slate-100">
                        {matchingNodes.map((node, idx) => (
                            <div 
                                key={`${node.id}-${idx}`}
                                onClick={() => onSelectNode(node.id)}
                                className="p-4 hover:bg-blue-50 cursor-pointer group transition-colors"
                            >
                                <div className="flex items-start gap-3">
                                    <MapPin size={16} className="text-slate-300 group-hover:text-blue-500 mt-1 shrink-0" />
                                    <div>
                                        <h4 className="text-sm font-bold text-slate-800 group-hover:text-blue-700 mb-1">{node.label}</h4>
                                        <p className="text-xs text-slate-500 line-clamp-2 leading-relaxed">
                                            {/* Simple highlight of the word in context */}
                                            {node.context.split(new RegExp(`(${selectedConcept})`, 'gi')).map((part, i) => 
                                                part.toLowerCase() === selectedConcept 
                                                ? <span key={i} className="bg-yellow-200 text-yellow-900 font-bold px-0.5 rounded">{part}</span> 
                                                : part
                                            )}
                                        </p>
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            ) : (
                <div className="flex flex-col items-center justify-center h-full text-slate-400 p-8 text-center">
                    <Filter size={32} className="mb-3 opacity-20" />
                    <p className="text-sm">Select a concept above to see where it appears in the knowledge graph.</p>
                </div>
            )}
        </div>
    </div>
  );
};
