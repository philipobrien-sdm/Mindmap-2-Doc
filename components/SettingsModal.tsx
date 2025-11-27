
import React from 'react';
import { X, Settings, ToggleLeft, ToggleRight, ShieldCheck } from 'lucide-react';
import { AppSettings } from '../types';

interface SettingsModalProps {
  settings: AppSettings;
  onUpdate: (settings: AppSettings) => void;
  onClose: () => void;
}

export const SettingsModal: React.FC<SettingsModalProps> = ({ settings, onUpdate, onClose }) => {
  const toggle = (key: keyof AppSettings) => {
      onUpdate({ ...settings, [key]: !settings[key] });
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-900/50 backdrop-blur-sm p-4 animate-in fade-in">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-md animate-in zoom-in-95">
        <div className="p-4 border-b border-slate-100 flex justify-between items-center bg-slate-50/50 rounded-t-xl">
          <h3 className="text-lg font-bold text-slate-800 flex items-center gap-2">
            <Settings size={20} className="text-slate-600"/> Application Settings
          </h3>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600"><X size={20} /></button>
        </div>
        
        <div className="p-6 space-y-6">
            
            {/* Review Prompts Setting */}
            <div className="flex items-start gap-4">
                <button onClick={() => toggle('reviewPrompts')} className="mt-1 text-blue-600 transition-colors">
                    {settings.reviewPrompts ? <ToggleRight size={32} /> : <ToggleLeft size={32} className="text-slate-300" />}
                </button>
                <div>
                    <h4 className="font-bold text-slate-800 text-sm">Review AI Prompts (Debug Mode)</h4>
                    <p className="text-xs text-slate-500 mt-1 leading-relaxed">
                        When enabled, the application will pause before every AI request (Expansion, Details, Process) and allow you to review and edit the exact raw prompt being sent to the Gemini model.
                    </p>
                </div>
            </div>

            <div className="w-full h-px bg-slate-100"></div>

            {/* Auto Save Setting */}
            <div className="flex items-start gap-4">
                <button onClick={() => toggle('autoSave')} className="mt-1 text-blue-600 transition-colors">
                    {settings.autoSave ? <ToggleRight size={32} /> : <ToggleLeft size={32} className="text-slate-300" />}
                </button>
                <div>
                    <h4 className="font-bold text-slate-800 text-sm">Auto-Save to Downloads</h4>
                    <p className="text-xs text-slate-500 mt-1 leading-relaxed">
                        Automatically download a JSON backup of your session every time a major change occurs (Generation, Expansion, etc). Helpful for development.
                    </p>
                </div>
            </div>

            <div className="mt-6 bg-blue-50 border border-blue-100 p-3 rounded-lg flex gap-3 items-start">
                <ShieldCheck size={16} className="text-blue-600 mt-0.5 shrink-0" />
                <p className="text-xs text-blue-800">
                    All settings are stored temporarily in your current session.
                </p>
            </div>

        </div>
        
        <div className="p-4 bg-slate-50 rounded-b-xl flex justify-end">
            <button onClick={onClose} className="px-6 py-2 bg-slate-900 text-white font-bold rounded-lg hover:bg-slate-800">Done</button>
        </div>
      </div>
    </div>
  );
};
