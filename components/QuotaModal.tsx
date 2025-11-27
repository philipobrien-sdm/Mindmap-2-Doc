import React from 'react';
import { AlertTriangle, Clock, ShieldAlert } from 'lucide-react';

export const QuotaModal: React.FC<{ onClose: () => void }> = ({ onClose }) => (
  <div className="fixed inset-0 z-[200] flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4 animate-in fade-in duration-300">
    <div className="bg-white rounded-xl shadow-2xl w-full max-w-md overflow-hidden animate-in zoom-in-95 duration-300">
      <div className="bg-amber-50 p-6 border-b border-amber-100 flex items-center gap-4">
        <div className="p-3 bg-amber-100 rounded-full text-amber-600 shadow-sm">
            <ShieldAlert size={32} />
        </div>
        <div>
            <h3 className="text-lg font-bold text-slate-800">High Traffic</h3>
            <p className="text-sm text-amber-700 font-medium">Usage limit reached</p>
        </div>
      </div>
      
      <div className="p-6">
        <p className="text-slate-600 mb-6 leading-relaxed text-sm">
          The AI service is currently experiencing high demand or you have momentarily exceeded the rate limit.
        </p>
        
        <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 mb-6 flex gap-4">
          <Clock size={24} className="text-blue-500 shrink-0" />
          <div>
              <h4 className="text-sm font-bold text-slate-700 mb-1">Cool Down Required</h4>
              <p className="text-xs text-slate-500 leading-relaxed">
                  Please wait about <strong>30-60 seconds</strong> before making another request. This allows the quota to reset.
              </p>
          </div>
        </div>

        <button 
          onClick={onClose}
          className="w-full py-3 bg-slate-900 hover:bg-slate-800 text-white font-bold rounded-lg transition-all shadow-lg hover:shadow-xl"
        >
          I Understand
        </button>
      </div>
    </div>
  </div>
);