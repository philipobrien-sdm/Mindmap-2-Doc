import React from 'react';
import { X, RotateCcw, Palette } from 'lucide-react';
import { AppTheme, ColorPalette } from '../types';
import { DEFAULT_THEME } from '../constants/theme';

interface ThemeEditorProps {
    theme: AppTheme;
    onUpdate: (theme: AppTheme) => void;
    onClose: () => void;
}

const ColorInput: React.FC<{ label: string, color: string, onChange: (val: string) => void }> = ({ label, color, onChange }) => (
    <div className="flex items-center gap-2 mb-2">
        <input 
            type="color" 
            value={color} 
            onChange={(e) => onChange(e.target.value)}
            className="w-8 h-8 p-0 border-0 rounded cursor-pointer shrink-0"
        />
        <span className="text-xs text-slate-600 font-medium w-12 uppercase">{color}</span>
        <span className="text-xs text-slate-500 flex-1">{label}</span>
    </div>
);

const PaletteSection: React.FC<{ title: string, palette: ColorPalette, onChange: (p: ColorPalette) => void }> = ({ title, palette, onChange }) => (
    <div className="bg-slate-50 p-3 rounded-lg border border-slate-200">
        <h4 className="text-xs font-bold text-slate-700 uppercase tracking-wide mb-3">{title}</h4>
        <ColorInput label="Background" color={palette.bg} onChange={(c) => onChange({ ...palette, bg: c })} />
        <ColorInput label="Border" color={palette.border} onChange={(c) => onChange({ ...palette, border: c })} />
        <ColorInput label="Text" color={palette.text} onChange={(c) => onChange({ ...palette, text: c })} />
    </div>
);

export const ThemeEditor: React.FC<ThemeEditorProps> = ({ theme, onUpdate, onClose }) => {
  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-900/50 backdrop-blur-sm p-4 animate-in fade-in">
        <div className="bg-white rounded-xl shadow-2xl w-full max-w-2xl h-[85vh] flex flex-col animate-in zoom-in-95">
             <div className="p-4 border-b border-slate-100 flex justify-between items-center bg-slate-50/50 rounded-t-xl shrink-0">
                <h2 className="text-lg font-bold text-slate-800 flex items-center gap-2">
                    <Palette size={20} className="text-purple-600"/> 
                    Theme Editor
                </h2>
                <div className="flex gap-2">
                    <button 
                        onClick={() => onUpdate(DEFAULT_THEME)} 
                        className="p-1.5 text-xs font-bold text-slate-500 hover:bg-slate-200 rounded flex items-center gap-1"
                        title="Reset to Default"
                    >
                        <RotateCcw size={14} /> Reset
                    </button>
                    <button onClick={onClose} className="p-1 hover:bg-slate-200 rounded-full transition-colors text-slate-500">
                        <X size={20} />
                    </button>
                </div>
            </div>

            <div className="flex-1 overflow-y-auto p-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="col-span-1 md:col-span-2 bg-slate-50 p-3 rounded-lg border border-slate-200 flex gap-6">
                         <div>
                            <h4 className="text-xs font-bold text-slate-700 uppercase tracking-wide mb-3">Global</h4>
                             <ColorInput label="Canvas Background" color={theme.canvasBg} onChange={(c) => onUpdate({ ...theme, canvasBg: c })} />
                             <ColorInput label="Link Lines" color={theme.link} onChange={(c) => onUpdate({ ...theme, link: c })} />
                         </div>
                         <div className="flex-1 flex items-center justify-center bg-white border border-slate-200 rounded p-4" style={{ backgroundColor: theme.canvasBg }}>
                             {/* Preview */}
                             <div style={{ backgroundColor: theme.process.bg, borderColor: theme.process.border, color: theme.process.text }} className="border-2 rounded px-4 py-2 text-sm font-bold shadow-sm">
                                 Process Node
                             </div>
                             <div className="w-8 h-0.5" style={{ backgroundColor: theme.link }}></div>
                             <div style={{ backgroundColor: theme.info.bg, borderColor: theme.info.border, color: theme.info.text }} className="border-2 rounded px-4 py-2 text-sm font-bold shadow-sm">
                                 Info Node
                             </div>
                         </div>
                    </div>

                    <PaletteSection 
                        title="Process Nodes" 
                        palette={theme.process} 
                        onChange={(p) => onUpdate({ ...theme, process: p })} 
                    />
                    <PaletteSection 
                        title="Info Nodes" 
                        palette={theme.info} 
                        onChange={(p) => onUpdate({ ...theme, info: p })} 
                    />
                    <PaletteSection 
                        title="Decision Gates (Process View)" 
                        palette={theme.decision} 
                        onChange={(p) => onUpdate({ ...theme, decision: p })} 
                    />
                    <PaletteSection 
                        title="End States (Process View)" 
                        palette={theme.endState} 
                        onChange={(p) => onUpdate({ ...theme, endState: p })} 
                    />
                </div>
            </div>
            
            <div className="p-4 border-t border-slate-100 bg-slate-50 rounded-b-xl shrink-0 flex justify-end">
                <button 
                    onClick={onClose}
                    className="bg-blue-600 hover:bg-blue-700 text-white font-bold py-2 px-6 rounded-lg shadow"
                >
                    Done
                </button>
            </div>
        </div>
    </div>
  );
};
