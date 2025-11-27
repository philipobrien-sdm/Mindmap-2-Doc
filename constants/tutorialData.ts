
import { MindMapData, SystemsViewData, TuningOptions, AppTheme, AppSettings } from '../types';
import { DEFAULT_THEME } from './theme';

export const TUTORIAL_SESSION = {
  timestamp: "2025-11-27T13:27:00.524Z",
  sessionName: "Tutorial: ADS-C Protocol",
  originalText: "ADS-C (Automatic Dependent Surveillance – Contract) is a system that lets air traffic control (ATC) automatically receive position and flight-intent reports from the aircraft's avionics system...",
  mindMap: {
    id: "e7b0c8d1-f2a3-4e5b-8c9d-1a2b3c4d5e6f",
    label: "ADS-C System Overview",
    description: "Automatic Dependent Surveillance – Contract for ATC position and flight-intent reports.",
    nodeType: "info",
    nature: "fact",
    isProcessCandidate: false,
    suggestedPrompts: {
      expand: "Provide a comprehensive technical overview of ADS-C components and architecture.",
      details: "Explain the underlying data structures and communication protocols used in ADS-C.",
      process: ""
    },
    source: "ai",
    children: [
      {
        id: "a1b2c3d4-e5f6-7a8b-9c0d-1e2f3a4b5c6d",
        label: "ADS-C Definition & Function",
        description: "ATC receives automatic position and flight-intent reports from aircraft avionics system.",
        nodeType: "info",
        nature: "fact",
        isProcessCandidate: true,
        source: "ai",
        children: []
      },
      {
        id: "b2c3d4e5-f6a7-8b9c-0d1e-2f3a4b5c6d7e",
        label: "ADS-C vs. ADS-B",
        description: "ADS-C reports are specific to contracted ATC units; ADS-B broadcasts data to any receiver.",
        nodeType: "info",
        nature: "fact",
        isProcessCandidate: false,
        source: "ai",
        children: []
      }
    ]
  } as MindMapData,
  systemsView: null as SystemsViewData | null,
  tuning: {
    readerRole: "General Technical",
    aiPersona: "Helpful Expert",
    detailLevel: "Balanced"
  } as TuningOptions,
  theme: DEFAULT_THEME,
  settings: {
    reviewPrompts: false,
    autoSave: false
  } as AppSettings
};
