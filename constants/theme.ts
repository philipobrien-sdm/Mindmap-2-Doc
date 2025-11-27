import { AppTheme } from "../types";

export const DEFAULT_THEME: AppTheme = {
    name: "Standard",
    process: { 
        bg: "#eff6ff",      // blue-50
        border: "#3b82f6",  // blue-500
        text: "#1e3a8a"     // blue-900
    },
    info: { 
        bg: "#ecfdf5",      // emerald-50
        border: "#10b981",  // emerald-500
        text: "#064e3b"     // emerald-900
    },
    decision: { 
        bg: "#fff7ed",      // orange-50
        border: "#f97316",  // orange-500
        text: "#7c2d12"     // orange-900
    },
    endState: { 
        bg: "#fef2f2",      // red-50
        border: "#ef4444",  // red-500
        text: "#7f1d1d"     // red-900
    },
    link: "#cbd5e1",        // slate-300
    canvasBg: "#f8fafc"     // slate-50
};