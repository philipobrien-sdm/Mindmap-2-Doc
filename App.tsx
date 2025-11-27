
import React, { useState, useCallback, useRef, useEffect } from 'react';
import mammoth from 'mammoth';
import { Brain, Sparkles, Loader2, Upload, Download, FileJson, AlertCircle, FileText, X, BookOpen, Code, RotateCcw, RotateCw, History, Terminal, Bug, Share2, Sliders, Clock, AlertTriangle, Palette, PenLine, Tag, Settings, FileBox, GraduationCap, Menu } from 'lucide-react';
import { generateMindMap, expandNode, getNodeDetails, generateProcessFlow, generateSystemsView, generateSeedText, constructDetailsPrompt, constructProcessPrompt, generateNodeSummary } from './services/geminiService';
import { generateHTMLReport, generateStructuredDocument } from './utils/reportGenerator';
import { MindMap } from './components/MindMap';
import { DetailsModal, ProcessModal, InfoModal, HistoryModal, LogModal, RenameModal, IdeaModal } from './components/Modals';
import { EditNodeModal } from './components/EditNodeModal';
import { ExpandModal } from './components/ExpandModal';
import { SystemsViewModal } from './components/SystemsViewModal';
import { GenerationModal } from './components/GenerationModal';
import { ResetNodeModal } from './components/ResetNodeModal';
import { QuotaModal } from './components/QuotaModal';
import { ThemeEditor } from './components/ThemeEditor';
import { ConceptCloud } from './components/ConceptCloud';
import { SettingsModal } from './components/SettingsModal';
import { PromptDebugModal } from './components/PromptDebugModal';
import { DocumentEditorModal } from './components/DocumentEditorModal';
import { TutorialOverlay } from './components/TutorialOverlay';
import { MindMapData, LoadingState, ProcessStep, LogEntry, SystemsViewData, TuningOptions, AppTheme, AppSettings } from './types';
import { USER_GUIDE, TECH_SPEC } from './constants/docs';
import { DEFAULT_THEME } from './constants/theme';
import { TUTORIAL_SESSION } from './constants/tutorialData';
import { logger } from './utils/logger';

/**
 * Main Application Component
 * 
 * Manages the global state, including:
 * - The current Mind Map data tree
 * - User session history (Undo/Redo)
 * - active modals and overlays
 * - Interactions with the Gemini Service
 */

// --- Utility Functions ---

/**
 * Recursively finds a node by ID and reconstructs its path from the root.
 * This is crucial for providing context to the AI (e.g., expanding a node requires knowing its parent).
 */
const findNodeAndPath = (root: MindMapData, targetId: string, currentPath: string[] = []): { node: MindMapData; path: string[]; parent: MindMapData | null } | null => {
  if (root.id === targetId) return { node: root, path: [...currentPath, root.label], parent: null };
  if (root.children) {
    for (const child of root.children) {
        if (child.id === targetId) return { node: child, path: [...currentPath, root.label, child.label], parent: root };
        const result = findNodeAndPath(child, targetId, [...currentPath, root.label]);
        if (result) return result;
    }
  }
  return null;
};

// Calculate hierarchical number (1.0, 1.1, 1.2.1) dynamically
const calculateNodeNumber = (root: MindMapData, targetId: string, currentNumber: string = "1.0"): string | null => {
    if (root.id === targetId) return currentNumber;
    if (root.children) {
        for (let i = 0; i < root.children.length; i++) {
            const child = root.children[i];
            const childNumber = `${currentNumber === "1.0" ? "1" : currentNumber}.${i + 1}`;
            const result = calculateNodeNumber(child, targetId, childNumber);
            if (result) return result;
        }
    }
    return null;
};

// Helper to trigger browser download of a Blob
const downloadFile = (blob: Blob, filename: string) => {
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
};

/**
 * Post-process AI generated steps to link "Happy Paths".
 * If a decision step has a "Success" or "Yes" branch but no target, 
 * we automatically link it to the immediate next step for better UX.
 */
const autoLinkDecisions = (steps: ProcessStep[]): ProcessStep[] => {
    return steps.map((step, index) => {
        if (step.type === 'decision' && step.branches && step.branches.length > 0) {
            const nextStep = steps[index + 1];
            if (nextStep) {
                const positiveKeywords = ['yes', 'success', 'pass', 'ok', 'true', 'confirmed', 'valid'];
                const hasLink = step.branches.some(b => !!b.targetStepId);
                
                if (!hasLink) {
                    // Find the branch that looks like a positive outcome
                    const bestBranchIndex = step.branches.findIndex(b => positiveKeywords.some(k => b.label.toLowerCase().includes(k)));
                    const targetIndex = bestBranchIndex !== -1 ? bestBranchIndex : 0; 
                    
                    const newBranches = [...step.branches];
                    newBranches[targetIndex] = {
                        ...newBranches[targetIndex],
                        targetStepId: nextStep.id
                    };
                    return { ...step, branches: newBranches };
                }
            }
        }
        return step;
    });
};

/**
 * DEPENDENCY TRACKING ENGINE
 * Scans the entire tree. If any node "watches" the changedNodeId,
 * mark that watcher node as flagged for review.
 */
const checkDependencies = (root: MindMapData, changedNodeId: string): MindMapData => {
    const traverse = (node: MindMapData): MindMapData => {
        const newNode = { ...node };
        
        // Check if this node is watching the changed node
        if (newNode.watchedNodeIds?.includes(changedNodeId)) {
            newNode.isFlaggedForReview = true;
            // Record specific reason
            const currentFlags = newNode.flaggedSourceIds || [];
            if (!currentFlags.includes(changedNodeId)) {
                newNode.flaggedSourceIds = [...currentFlags, changedNodeId];
            }
        }

        // Recursively check children
        if (newNode.children) {
            newNode.children = newNode.children.map(traverse);
        }
        return newNode;
    };
    return traverse(root);
};

const SAMPLE_TEXT = `ADS-C (Automatic Dependent Surveillance – Contract) is a system that lets air traffic control (ATC) automatically receive position and flight-intent reports from the aircraft's avionics system.
Unlike ADS-B (Broadcast), which broadcasts data to any receiver, ADS-C reports are sent only to specific ATC units that have set up a "contract" with the aircraft.
Key Concepts:
- Contracts: Periodic (time-based), Event (waypoint change, deviation), or Demand (immediate request).
- FANS 1/A: The avionics package that typically supports ADS-C and CPDLC.
- SatCom: Primary communication link for oceanic/remote operations.
- Benefits: Reduced separation standards in oceanic airspace, improved situational awareness for ATC.`;

// History stack entry
interface HistoryEntry {
    data: MindMapData;
    description: string;
    timestamp: number;
}

const DEFAULT_TUNING: TuningOptions = {
    readerRole: 'General Technical',
    aiPersona: 'Helpful Expert',
    detailLevel: 'Balanced'
};

const DEFAULT_SETTINGS: AppSettings = {
    reviewPrompts: false,
    autoSave: false
};

const App: React.FC = () => {
  // --- State Management ---
  const [textInput, setTextInput] = useState('');
  const [mindMap, setMindMap] = useState<MindMapData | null>(null);
  const [loading, setLoading] = useState<LoadingState>('idle');
  const [originalText, setOriginalText] = useState('');
  const [tuning, setTuning] = useState<TuningOptions>(DEFAULT_TUNING);
  const [theme, setTheme] = useState<AppTheme>(DEFAULT_THEME);
  const [settings, setSettings] = useState<AppSettings>(DEFAULT_SETTINGS);
  const [sessionName, setSessionName] = useState('Untitled Session');

  // Sidebar Menu State
  const [isMenuOpen, setIsMenuOpen] = useState(false);

  // Tutorial State
  const [isTutorialMode, setIsTutorialMode] = useState(false);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const sessionInputRef = useRef<HTMLInputElement>(null);

  // History & Persistence
  const [history, setHistory] = useState<HistoryEntry[]>([]);
  const [historyIndex, setHistoryIndex] = useState(-1);
  const [unsavedChanges, setUnsavedChanges] = useState(false);

  // Developer Mode (shows raw logs and AI source badges)
  const [isDevMode, setIsDevMode] = useState(false);
  const [logs, setLogs] = useState<LogEntry[]>([]);

  // Systems View State (Architectural Mesh)
  const [systemsViewData, setSystemsViewData] = useState<SystemsViewData | null>(null);
  const [systemsViewLocked, setSystemsViewLocked] = useState(true);
  const [showSystemsView, setShowSystemsView] = useState(false);
  
  // Concept Cloud State
  const [showConceptCloud, setShowConceptCloud] = useState(false);
  const [conceptFilter, setConceptFilter] = useState<string | null>(null);

  // Countdown Timer State (Estimated wait time)
  const [timeLeft, setTimeLeft] = useState<number | null>(null);
  const [maxTime, setMaxTime] = useState<number>(0);

  // --- Modals Management ---
  const [detailsContent, setDetailsContent] = useState<{ id: string, title: string; content: string, isLocked: boolean } | null>(null);
  const [processContent, setProcessContent] = useState<{ id: string, title: string; steps: ProcessStep[], isLocked: boolean, startEditing?: boolean } | null>(null);
  const [editNodeData, setEditNodeData] = useState<{ node: MindMapData, number: string } | null>(null);
  const [expandNodeData, setExpandNodeData] = useState<MindMapData | null>(null);
  const [activeInfoModal, setActiveInfoModal] = useState<'userGuide' | 'techSpec' | 'history' | 'logs' | null>(null);
  const [showCloseConfirmation, setShowCloseConfirmation] = useState(false);
  const [generationModal, setGenerationModal] = useState<{ node: MindMapData, type: 'details' | 'process' } | null>(null);
  const [resetNodeData, setResetNodeData] = useState<MindMapData | null>(null);
  const [showThemeEditor, setShowThemeEditor] = useState(false);
  const [showSettingsModal, setShowSettingsModal] = useState(false);
  const [showQuotaModal, setShowQuotaModal] = useState(false);
  const [showRenameModal, setShowRenameModal] = useState(false);
  const [showIdeaModal, setShowIdeaModal] = useState(false);
  
  // Document Editor Modal
  const [documentEditorData, setDocumentEditorData] = useState<{ node: MindMapData, number: string } | null>(null);
  
  // Prompt Debugging State
  const [promptDebug, setPromptDebug] = useState<{
      active: boolean;
      type: string;
      userPrompt: string;
      onConfirm: (finalPrompt: string) => void;
  } | null>(null);

  // Subscribe to the global logger to display events in DevMode
  useEffect(() => {
    const unsubscribe = logger.subscribe((entry) => {
        setLogs(prev => [...prev, entry]);
    });
    return unsubscribe;
  }, []);

  // --- Countdown Logic ---
  // Estimates how long an AI operation will take based on type
  const getEstimatedDuration = (state: LoadingState): number => {
    switch (state) {
        case 'generating-map': return 15;
        case 'generating-systems': return 20;
        case 'mapping-process': return 12;
        case 'detailing': return 10;
        case 'expanding': return 8;
        case 'generating-summary': return 8;
        case 'reading-file': return 2;
        default: return 0;
    }
  };

  // Timer effect
  useEffect(() => {
    if (loading === 'idle') {
        setTimeLeft(null);
        return;
    }

    const duration = getEstimatedDuration(loading);
    setMaxTime(duration);
    setTimeLeft(duration);

    const timer = setInterval(() => {
        setTimeLeft((prev) => {
            if (prev === null || prev <= 0) return 0;
            return prev - 1;
        });
    }, 1000);

    return () => clearInterval(timer);
  }, [loading]);

  // --- History System ---
  
  /**
   * Pushes a new state to the history stack.
   * If we are in the middle of the stack (due to undo), it truncates the "future".
   */
  const commitToHistory = useCallback((newData: MindMapData, description: string) => {
      setMindMap(newData);
      setUnsavedChanges(true);

      setHistory(prev => {
          const currentHistory = prev.slice(0, historyIndex + 1);
          const newHistory = [...currentHistory, { data: newData, description, timestamp: Date.now() }];
          // Limit history size to prevent memory bloat
          if (newHistory.length > 10) newHistory.shift();
          return newHistory;
      });
      logger.info("Committed State to History", { description });
  }, [historyIndex]);

  useEffect(() => {
      setHistoryIndex(history.length - 1);
  }, [history]);

  const restoreFromHistory = (index: number) => {
      if (index >= 0 && index < history.length) {
          setMindMap(history[index].data);
          setHistoryIndex(index);
          setActiveInfoModal(null);
          logger.info("Restored State from History", { index });
      }
  };

  /**
   * Save Session Logic
   * Defined before updateNodeInTree so it can be called from there.
   */
  const saveSessionFile = (data: MindMapData, systemsDataOverride?: SystemsViewData) => {
      const sessionData = {
          timestamp: new Date().toISOString(),
          sessionName, 
          originalText,
          mindMap: data,
          systemsView: systemsDataOverride || systemsViewData,
          tuning,
          theme,
          settings
      };
      
      const safeName = sessionName.replace(/[^a-z0-9]/gi, '-').substring(0, 50) || 'session';
      const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
      const filename = `${safeName}-${timestamp}.json`;
      
      const blob = new Blob([JSON.stringify(sessionData, null, 2)], { type: "application/json" });
      downloadFile(blob, filename);
      setUnsavedChanges(false);
      logger.success("Session Saved", { filename });
  };

  /**
   * Helper to update a specific node deeply within the tree.
   * It clones the tree, finds the node, applies changes, and commits to history.
   * Added triggerDependencyCheck parameter.
   */
  const updateNodeInTree = (
      nodeId: string, 
      updateFn: (node: MindMapData) => MindMapData, 
      actionDescription: string = "Update node",
      shouldAutoSave: boolean = false,
      triggerDependencyCheck: boolean = false
  ) => {
      if (!mindMap) return;
      let clone = JSON.parse(JSON.stringify(mindMap));
      const target = findNodeAndPath(clone, nodeId);
      if (target) {
          Object.assign(target.node, updateFn(target.node));
          
          // Dependency Logic: If this node was updated, check if any others are watching it
          if (triggerDependencyCheck) {
              clone = checkDependencies(clone, nodeId);
          }

          commitToHistory(clone, actionDescription);
          
          if (shouldAutoSave && (settings.autoSave || isDevMode)) {
              saveSessionFile(clone);
          }
      }
  };

  // New Helper for batch updates without infinite history loop
  const handleSearchReveal = useCallback((idsToExpand: string[]) => {
      setMindMap(prev => {
          if (!prev) return null;
          const clone = JSON.parse(JSON.stringify(prev));
          
          let changed = false;
          // Perform batch update on clone
          idsToExpand.forEach(id => {
              const target = findNodeAndPath(clone, id);
              if (target && target.node._collapsed) {
                  target.node._collapsed = false;
                  changed = true;
              }
          });

          if (!changed) return prev; // No update needed
          return clone; 
      });
  }, []);

  // --- Error Handling ---
  const handleAppError = (e: any) => {
      if (e.message === 'QUOTA_EXCEEDED') {
          setShowQuotaModal(true);
      } else {
          alert(`Error: ${e.message}`);
      }
      setLoading('idle');
  };

  // --- Core Actions ---

  const handleStartTutorial = () => {
      const data = TUTORIAL_SESSION;
      setMindMap(data.mindMap);
      setOriginalText(data.originalText);
      setTextInput(data.originalText);
      setTuning(data.tuning);
      setTheme(data.theme);
      setSessionName(data.sessionName);
      setHistory([{ data: data.mindMap, description: "Tutorial Start", timestamp: Date.now() }]);
      setIsTutorialMode(true);
  };

  const handleEndTutorial = () => {
      setIsTutorialMode(false);
      setMindMap(null);
      setHistory([]);
      setSessionName('Untitled Session');
      setOriginalText('');
      setTextInput('');
  };

  const handleGenerate = async () => {
    if (!textInput.trim()) return;
    setLoading('generating-map');
    setOriginalText(textInput);
    // Reset Systems View on new generation to avoid stale data
    setSystemsViewData(null);
    setSystemsViewLocked(true);
    
    try {
      const data = await generateMindMap(textInput, tuning);
      // Initial state reset
      setMindMap(data);
      setHistory([{ data, description: "Initial Generation", timestamp: Date.now() }]);
      setHistoryIndex(0);
      setUnsavedChanges(true);
      setLoading('idle');
      
      // Set default name if not set
      if (sessionName === 'Untitled Session' || !sessionName.trim()) {
          setSessionName(`Map: ${data.label}`);
      }
      
      // Auto-save initial generation
      if (settings.autoSave || isDevMode) {
          saveSessionFile(data);
      }

    } catch (e: any) {
      handleAppError(e);
    }
  };

  // Opens the Architectural Systems View
  const handleSystemsView = async () => {
      // If cached and locked, just show it
      if (systemsViewData && systemsViewLocked) {
          setShowSystemsView(true);
          return;
      }

      setLoading('generating-systems');
      try {
          const data = await generateSystemsView(originalText, tuning);
          setSystemsViewData(data);
          setSystemsViewLocked(true);
          setShowSystemsView(true);
          setLoading('idle');
          
          // Auto-save systems view generation
          if (mindMap && (settings.autoSave || isDevMode)) {
              saveSessionFile(mindMap, data);
          }

      } catch (e: any) {
          handleAppError(e);
      }
  };

  // Logic for adding nodes from the Systems View into the main Mind Map
  const handleAddToMindMap = (parentId: string, newNodes: MindMapData[]) => {
      updateNodeInTree(
          parentId,
          (node) => ({
              ...node,
              children: [...(node.children || []), ...newNodes]
          }),
          `Added ${newNodes.length} nodes from Systems View`
      );
      logger.success(`Added nodes to map`, { count: newNodes.length, parent: parentId });
  };

  // --- File IO ---

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (!file) return;

      setLoading('reading-file');
      try {
          let text = "";
          if (file.name.endsWith('.docx')) {
              // Use mammoth for Word doc extraction
              const arrayBuffer = await file.arrayBuffer();
              const result = await mammoth.extractRawText({ arrayBuffer });
              text = result.value;
          } else {
              text = await file.text();
          }
          setTextInput(text);
          setSessionName(file.name.replace(/\.[^/.]+$/, ""));
          logger.success("File Uploaded", { name: file.name, type: file.type });
      } catch (err: any) {
          console.error(err);
          logger.error("File Read Error", { error: err.message });
          alert(`Failed to read file: ${err.message || 'Unknown error'}`);
      } finally {
          setLoading('idle');
          if (fileInputRef.current) fileInputRef.current.value = '';
      }
  };

  const handleImportSession = async (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (!file) return;
      try {
          const text = await file.text();
          const json = JSON.parse(text);
          if (json.mindMap) {
              const importedMap = json.mindMap;
              
              // UI LOGIC: Recursively collapse all nodes to save screen space on load
              const collapseRecursive = (node: MindMapData) => {
                  if (node.children) {
                      node.children.forEach(collapseRecursive);
                  }
                  node._collapsed = true;
              };
              
              collapseRecursive(importedMap);
              // Keep root expanded so we see Level 1 immediate children
              importedMap._collapsed = false;

              setMindMap(importedMap);
              setOriginalText(json.originalText || '');
              setTextInput(json.originalText || '');
              if (json.tuning) setTuning(json.tuning);
              if (json.theme) setTheme(json.theme);
              if (json.settings) setSettings(json.settings);
              if (json.sessionName) setSessionName(json.sessionName);
              
              setHistory([{ data: importedMap, description: "Imported Session", timestamp: Date.now() }]);
              setUnsavedChanges(false);
              if (json.systemsView) {
                  setSystemsViewData(json.systemsView);
                  setSystemsViewLocked(true);
              }
              logger.success("Session Imported", { nodes: 1 });
          } else {
              alert("Invalid session file.");
          }
      } catch (err: any) {
          logger.error("Session Import Failed", { error: err.message });
          alert(`Failed to load session: ${err.message}`);
      } finally {
        if (sessionInputRef.current) sessionInputRef.current.value = '';
      }
  };

  const handleExportSession = () => {
    if (mindMap) saveSessionFile(mindMap);
  };

  const handleExportDocument = () => {
      if (!mindMap) return;
      const html = generateStructuredDocument(mindMap);
      const blob = new Blob([html], { type: "text/html;charset=utf-8" });
      const safeName = sessionName.replace(/[^a-z0-9]/gi, '_');
      downloadFile(blob, `Document-${safeName}.html`);
      logger.success("Document Generated", { sessionName });
  };

  const handleLoadSample = () => {
    setTextInput(SAMPLE_TEXT);
    setSessionName("ADS-C Protocol Analysis");
  };

  const handleGenerateSeedText = async (idea: string) => {
      setLoading('generating-map'); // Reuse loader state
      try {
          const text = await generateSeedText(idea, tuning);
          setTextInput(text);
          setSessionName(idea.substring(0, 50));
      } catch (e: any) {
          handleAppError(e);
      } finally {
          setLoading('idle');
      }
  };

  // --- Main Node Interaction Handler ---
  // Handles clicks from the ActionMenu (Expand, Details, Process, etc.)
  const handleNodeAction = useCallback(async (action: 'expand' | 'details' | 'process' | 'edit' | 'delete' | 'report' | 'reset' | 'document', node: MindMapData) => {
    if (!mindMap) return;

    logger.info(`Node Action: ${action}`, { nodeId: node.id, label: node.label });

    // Determine hierarchical context for AI
    const found = findNodeAndPath(mindMap, node.id);
    const contextPath = found ? found.path : [node.label];

    if (action === 'delete') {
         if (mindMap.id === node.id) {
             // If deleting root, reset app
             setMindMap(null);
             setHistory([]);
             logger.info("Deleted Root Node (Map Reset)");
             return;
         }
         let clone = JSON.parse(JSON.stringify(mindMap));
         const target = findNodeAndPath(clone, node.id);
         if (target && target.parent) {
             target.parent.children = target.parent.children?.filter(c => c.id !== node.id);
             
             // Dependency Check: Flag all nodes watching this deleted node
             clone = checkDependencies(clone, node.id);

             commitToHistory(clone, `Deleted node: ${node.label}`);
         }
         return;
    }

    if (action === 'edit') {
        const number = calculateNodeNumber(mindMap, node.id) || "1.0";
        setEditNodeData({ node, number });
        return;
    }

    if (action === 'reset') {
        setResetNodeData(node);
        return;
    }

    if (action === 'report') {
        const html = generateHTMLReport(node);
        const blob = new Blob([html], { type: "text/html;charset=utf-8" });
        downloadFile(blob, `Report-${node.label.replace(/[^a-z0-9]/gi, '_')}.html`);
        logger.success(`Report Generated: ${node.label}`);
        return;
    }

    if (action === 'document') {
        // Calculate number (e.g., 1.2.1)
        const number = calculateNodeNumber(mindMap, node.id) || "1.0";
        setDocumentEditorData({ node, number });
        return;
    }

    if (action === 'expand') {
      // COLLAPSE LOGIC: If children exist, toggle visibility instead of re-expanding
      if (node.children && node.children.length > 0) {
          updateNodeInTree(node.id, (n) => ({ ...n, _collapsed: !n._collapsed }), `Toggled visibility: ${node.label}`);
          return;
      }
      // Otherwise, show modal to confirm expansion
      setExpandNodeData(node);
      return;

    } else if (action === 'details') {
      // CACHE CHECK: Don't call AI if we already have text
      if (node.cachedDetails && node.cachedDetails.length > 0) {
          setDetailsContent({ 
              id: node.id, 
              title: node.label, 
              content: node.cachedDetails, 
              isLocked: node.detailsLocked ?? true 
          });
          logger.info("Loaded Cached Details", { nodeId: node.id });
          return;
      }

      // Show Generation Modal to ask preference
      setGenerationModal({ node, type: 'details' });

    } else if (action === 'process') {
      // CACHE CHECK
      if (node.cachedProcess && node.cachedProcess.length > 0) {
          setProcessContent({ 
              id: node.id, 
              title: node.label, 
              steps: node.cachedProcess, 
              isLocked: node.processLocked ?? true 
          });
          logger.info("Loaded Cached Process", { nodeId: node.id });
          return;
      }
      
      // Show Generation Modal to ask preference
      setGenerationModal({ node, type: 'process' });
    }
  }, [mindMap, originalText, historyIndex, tuning, isDevMode]); 

  // Helper to execute API calls, optionally intercepting for review
  const executeOrReview = (promptType: string, userPrompt: string, executeFn: (finalPrompt: string) => Promise<void>) => {
      if (settings.reviewPrompts) {
          setPromptDebug({
              active: true,
              type: promptType,
              userPrompt: userPrompt,
              onConfirm: async (finalPrompt) => {
                  setPromptDebug(null);
                  await executeFn(finalPrompt);
              }
          });
      } else {
          executeFn(userPrompt);
      }
  };

  // Handles outcome of "Generation Modal" (replacing old ProcessSource logic)
  const handleGenerationSelect = async (mode: 'auto' | 'guided' | 'manual', guidance?: string) => {
      const { node, type } = generationModal || {};
      setGenerationModal(null);
      if (!node || !type || !mindMap) return;

      const found = findNodeAndPath(mindMap, node.id);
      const contextPath = found ? found.path : [node.label];

      if (mode === 'manual') {
          if (type === 'process') {
               const initialSteps: ProcessStep[] = [{ 
                  id: crypto.randomUUID(), 
                  stepNumber: 1, 
                  type: 'action', 
                  action: 'Start', 
                  description: 'Initial step', 
                  role: 'User',
                  isEndState: false
              }];
              updateNodeInTree(node.id, (n) => ({ ...n, cachedProcess: initialSteps, processLocked: false }), `Created manual process for ${node.label}`, false, true);
              setProcessContent({ id: node.id, title: node.label, steps: initialSteps, isLocked: false, startEditing: true });
          } else {
              // Manual Details
              updateNodeInTree(node.id, (n) => ({ ...n, cachedDetails: "Start typing here...", detailsLocked: false }), `Created manual details for ${node.label}`, false, true);
              setDetailsContent({ id: node.id, title: node.label, content: "Start typing here...", isLocked: false });
          }
          return;
      }

      // AI Generation (Auto or Guided)
      const userGuidance = (mode === 'guided' || mode === 'auto') ? guidance : undefined;

      if (type === 'details') {
          const runDetails = async (finalGuidance?: string) => {
              setLoading('detailing');
              try {
                 const text = await getNodeDetails(node.label, contextPath, originalText, tuning, finalGuidance);
                 updateNodeInTree(
                    node.id, 
                    (n) => ({ ...n, cachedDetails: text, detailsLocked: true }), 
                    `Generated details for ${node.label}`,
                    true,
                    true // Trigger dependencies
                 );
                 setDetailsContent({ id: node.id, title: node.label, content: text, isLocked: true });
              } catch (e: any) {
                 handleAppError(e);
              } finally {
                 setLoading('idle');
              }
          };

          // If review mode is on, we intercept here.
          if (settings.reviewPrompts) {
              const previewPrompt = constructDetailsPrompt(node.label, contextPath, userGuidance);
              executeOrReview('Details', previewPrompt, async (approvedPrompt) => {
                  await runDetails(userGuidance);
              });
          } else {
              runDetails(userGuidance);
          }

      } else if (type === 'process') {
          const runProcess = async (finalGuidance?: string) => {
              setLoading('mapping-process');
              try {
                 let steps = await generateProcessFlow(node.label, contextPath, originalText, tuning, node.cachedDetails, finalGuidance);
                 steps = autoLinkDecisions(steps);
                 updateNodeInTree(
                    node.id, 
                    (n) => ({ ...n, cachedProcess: steps, processLocked: true }), 
                    `Mapped process for ${node.label}`,
                    true,
                    true // Trigger dependencies
                 );
                 setProcessContent({ id: node.id, title: node.label, steps, isLocked: true });
              } catch (e: any) {
                 handleAppError(e);
              } finally {
                 setLoading('idle');
              }
          };
          
          if (settings.reviewPrompts) {
              const preview = constructProcessPrompt(node.label, contextPath, node.cachedDetails, userGuidance);
              executeOrReview('Process', preview, async () => runProcess(userGuidance));
          } else {
              runProcess(userGuidance);
          }
      }
  };

  // Logic to finalize expansion from the modal
  const handleConfirmExpand = async (guidance: string) => {
      if (!expandNodeData || !mindMap) return;
      
      const node = expandNodeData;
      setExpandNodeData(null); 
      
      const found = findNodeAndPath(mindMap, node.id);
      const contextPath = found ? found.path : [node.label];

      const runExpand = async (finalGuidance: string) => {
          setLoading('expanding');
          try {
            const newChildren = await expandNode(node.label, contextPath, originalText, tuning, finalGuidance);
            updateNodeInTree(
                node.id, 
                (n) => ({ ...n, children: newChildren, _collapsed: false }), 
                `Expanded node: ${node.label}`,
                true 
            );
            setLoading('idle');
          } catch (e: any) {
            handleAppError(e);
          }
      };

      if (settings.reviewPrompts) {
          const previewPrompt = `
Context Path: ${contextPath.join(" > ")}
Node: "${node.label}"
Guidance: ${guidance}
          `;
          executeOrReview('Expand', previewPrompt, async () => runExpand(guidance));
      } else {
          runExpand(guidance);
      }
  };

  // Handles Concept Cloud filtering logic
  const handleConceptHover = useCallback((concept: string | null) => {
      setConceptFilter(concept);
      if (concept) {
          handleSearchReveal([/* handled internally via search effect */]);
      }
  }, [handleSearchReveal]);

  // Handle pan to node from Concept Cloud list
  const handleSelectNodeFromCloud = (nodeId: string) => {
      // Reveal the node
      handleSearchReveal([nodeId]);
      
      setTimeout(() => {
          const found = findNodeAndPath(mindMap!, nodeId);
          if (found) {
              // Optional: trigger select logic visually if needed
          }
      }, 100);
  };

  return (
    <div className="flex h-screen w-screen overflow-hidden font-sans relative" style={{ backgroundColor: theme.canvasBg }}>
      {/* Widgets, Sidebar, Canvas, and Modals are rendered here */}
      
      {/* Tutorial Overlay */}
      {isTutorialMode && (
          <TutorialOverlay onComplete={handleEndTutorial} />
      )}

      {/* Countdown Timer Widget */}
      {loading !== 'idle' && timeLeft !== null && (
        <div className="fixed top-4 right-4 z-[1000] bg-white/90 backdrop-blur-md border border-blue-200 shadow-xl rounded-xl p-4 flex items-center gap-4 animate-in slide-in-from-top-10 fade-in duration-300 min-w-[280px]">
            <div className="relative">
                <svg className="transform -rotate-90 w-12 h-12">
                    <circle cx="24" cy="24" r="18" stroke="currentColor" strokeWidth="4" fill="transparent" className="text-slate-100" />
                    <circle cx="24" cy="24" r="18" stroke="currentColor" strokeWidth="4" fill="transparent" className="text-blue-600 transition-all duration-1000 ease-linear" strokeDasharray={113} strokeDashoffset={113 - (113 * timeLeft) / maxTime} />
                </svg>
                <div className="absolute inset-0 flex items-center justify-center">
                    <span className="text-xs font-bold text-blue-700">{timeLeft}s</span>
                </div>
            </div>
            <div>
                <h4 className="font-bold text-slate-800 text-sm flex items-center gap-2">
                    <Sparkles size={14} className="text-blue-500 animate-pulse" />
                    AI Working...
                </h4>
                <p className="text-xs text-slate-500 mt-1">
                    Estimated time remaining
                </p>
            </div>
        </div>
      )}

      {/* Sidebar Area */}
      <div className={`flex flex-col bg-white border-r border-slate-200 transition-all duration-300 z-20 shadow-xl ${mindMap ? 'w-16 items-center py-4' : 'w-full max-w-2xl mx-auto border-r-0 h-screen justify-center'}`} data-tutorial-id={mindMap ? "sidebar-tools" : undefined}>
        
        {mindMap ? (
            // Collapsed Toolbar Mode -> NOW Fold-out Menu Mode
            <div className="flex flex-col h-full w-full items-center relative pt-4">
                 {/* Main Trigger */}
                 <button 
                    onClick={() => setIsMenuOpen(!isMenuOpen)}
                    className={`p-3 rounded-xl transition-all duration-200 ${isMenuOpen ? 'bg-blue-600 text-white shadow-lg shadow-blue-200' : 'bg-white text-blue-600 hover:bg-blue-50 shadow-sm border border-slate-100'}`}
                    title="Menu"
                 >
                    {isMenuOpen ? <X size={24} /> : <Brain size={24} />}
                 </button>

                 {/* The Menu Panel */}
                 {isMenuOpen && (
                    <div className="absolute top-0 left-full ml-4 bg-white/95 backdrop-blur-xl border border-slate-200/60 rounded-2xl shadow-2xl p-2 min-w-[260px] animate-in slide-in-from-left-2 fade-in duration-200 flex flex-col gap-1 max-h-[90vh] overflow-y-auto z-[100]">
                        
                        {/* File Operations */}
                        <div className="px-3 py-2 text-[10px] font-bold text-slate-400 uppercase tracking-wider">File</div>
                        <button onClick={() => { setShowRenameModal(true); setIsMenuOpen(false); }} className="flex items-center gap-3 p-2 rounded-lg hover:bg-slate-100 text-slate-700 text-sm font-medium transition-colors w-full text-left">
                            <PenLine size={18} className="text-slate-400" /> Rename Session
                        </button>
                        <button onClick={() => { handleExportSession(); setIsMenuOpen(false); }} className={`flex items-center gap-3 p-2 rounded-lg hover:bg-slate-100 text-slate-700 text-sm font-medium transition-colors w-full text-left ${unsavedChanges ? 'text-blue-600' : ''}`}>
                            <Download size={18} className="text-slate-400" /> Save JSON
                        </button>
                        <button onClick={() => { handleExportDocument(); setIsMenuOpen(false); }} className="flex items-center gap-3 p-2 rounded-lg hover:bg-slate-100 text-slate-700 text-sm font-medium transition-colors w-full text-left">
                            <FileBox size={18} className="text-slate-400" /> Export HTML Doc
                        </button>

                        <div className="h-px bg-slate-100 my-1"></div>

                        {/* Views */}
                        <div className="px-3 py-2 text-[10px] font-bold text-slate-400 uppercase tracking-wider">Views & Tools</div>
                        <button onClick={() => { handleSystemsView(); setIsMenuOpen(false); }} className="flex items-center gap-3 p-2 rounded-lg hover:bg-slate-100 text-slate-700 text-sm font-medium transition-colors w-full text-left">
                            <Share2 size={18} className="text-purple-500" /> Systems View
                        </button>
                        <button onClick={() => { setShowConceptCloud(!showConceptCloud); setIsMenuOpen(false); }} className="flex items-center gap-3 p-2 rounded-lg hover:bg-slate-100 text-slate-700 text-sm font-medium transition-colors w-full text-left">
                            <Tag size={18} className="text-emerald-500" /> Concept Cloud
                        </button>
                        <button onClick={() => { setShowThemeEditor(true); setIsMenuOpen(false); }} className="flex items-center gap-3 p-2 rounded-lg hover:bg-slate-100 text-slate-700 text-sm font-medium transition-colors w-full text-left">
                            <Palette size={18} className="text-pink-500" /> Theme
                        </button>

                        <div className="h-px bg-slate-100 my-1"></div>

                        {/* History */}
                        <div className="px-3 py-2 text-[10px] font-bold text-slate-400 uppercase tracking-wider">History</div>
                        <div className="flex gap-1 px-2">
                            <button onClick={() => restoreFromHistory(historyIndex - 1)} disabled={historyIndex <= 0} className="flex-1 p-2 rounded-lg hover:bg-slate-100 text-slate-600 disabled:opacity-30 flex justify-center bg-slate-50 border border-slate-100"><RotateCcw size={16} /></button>
                            <button onClick={() => restoreFromHistory(historyIndex + 1)} disabled={historyIndex >= history.length - 1} className="flex-1 p-2 rounded-lg hover:bg-slate-100 text-slate-600 disabled:opacity-30 flex justify-center bg-slate-50 border border-slate-100"><RotateCw size={16} /></button>
                            <button onClick={() => { setActiveInfoModal('history'); setIsMenuOpen(false); }} className="flex-1 p-2 rounded-lg hover:bg-slate-100 text-slate-600 flex justify-center bg-slate-50 relative border border-slate-100">
                                <History size={16} />
                                <span className="absolute -top-1 -right-1 w-2 h-2 bg-blue-500 rounded-full"></span>
                            </button>
                        </div>

                        <div className="h-px bg-slate-100 my-1"></div>

                        {/* App */}
                        <div className="px-3 py-2 text-[10px] font-bold text-slate-400 uppercase tracking-wider">Application</div>
                        <button onClick={() => { setShowSettingsModal(true); setIsMenuOpen(false); }} className="flex items-center gap-3 p-2 rounded-lg hover:bg-slate-100 text-slate-700 text-sm font-medium transition-colors w-full text-left">
                            <Settings size={18} className="text-slate-400" /> Settings
                        </button>
                        <button onClick={() => { setActiveInfoModal('userGuide'); setIsMenuOpen(false); }} className="flex items-center gap-3 p-2 rounded-lg hover:bg-slate-100 text-slate-700 text-sm font-medium transition-colors w-full text-left">
                            <BookOpen size={18} className="text-slate-400" /> User Guide
                        </button>
                        <button onClick={() => { setActiveInfoModal('techSpec'); setIsMenuOpen(false); }} className="flex items-center gap-3 p-2 rounded-lg hover:bg-slate-100 text-slate-700 text-sm font-medium transition-colors w-full text-left">
                            <Code size={18} className="text-slate-400" /> Tech Spec
                        </button>

                        <div className="h-px bg-slate-100 my-1"></div>

                        <button onClick={() => { setShowCloseConfirmation(true); setIsMenuOpen(false); }} className="flex items-center gap-3 p-2 rounded-lg hover:bg-red-50 text-red-600 text-sm font-medium transition-colors mt-1 w-full text-left">
                            <X size={18} /> Close Map
                        </button>
                    </div>
                 )}
            </div>
        ) : (
            // Full Landing Mode
            <div className="p-6 w-full relative">
                <div className="absolute top-0 right-0 p-4 flex gap-2">
                     <button 
                        onClick={() => setActiveInfoModal('userGuide')}
                        className="p-2 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                        title="User Guide"
                     >
                        <BookOpen size={20} />
                     </button>
                     <button 
                        onClick={() => setActiveInfoModal('techSpec')}
                        className="p-2 text-slate-400 hover:text-slate-800 hover:bg-slate-100 rounded-lg transition-colors"
                        title="Technical Specification"
                     >
                        <Code size={20} />
                     </button>
                     {/* Developer Toggle */}
                     <button 
                        onClick={() => setIsDevMode(!isDevMode)}
                        className={`p-2 rounded-lg transition-colors ${isDevMode ? 'text-purple-600 bg-purple-50 ring-1 ring-purple-200' : 'text-slate-300 hover:text-purple-500'}`}
                        title="Toggle Developer Mode"
                     >
                        <Bug size={20} />
                     </button>
                </div>

                <div className="flex items-center gap-3 mb-6">
                    <div className="bg-blue-600 p-2 rounded-xl text-white shadow-lg shadow-blue-200">
                    <Brain size={24} />
                    </div>
                    <div>
                        <h1 className="font-bold text-xl text-slate-800 tracking-tight">MindMap 2 Doc</h1>
                        <p className="text-xs text-slate-500 font-medium">From brainstorming to documented</p>
                    </div>
                </div>

                <div className="space-y-4">
                    <div className="flex gap-2">
                        <input type="file" ref={sessionInputRef} className="hidden" accept=".json" onChange={handleImportSession} />
                        <button 
                            onClick={() => sessionInputRef.current?.click()}
                            className="flex-1 bg-slate-100 hover:bg-slate-200 text-slate-600 text-xs font-bold py-2 rounded-md flex items-center justify-center gap-2"
                        >
                            <Upload size={14} /> Load Session
                        </button>
                        <button 
                            onClick={handleStartTutorial}
                            className="flex-1 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 border border-indigo-200 text-xs font-bold py-2 rounded-md flex items-center justify-center gap-2"
                        >
                            <GraduationCap size={16} /> Tutorial
                        </button>
                    </div>
                    
                    {/* Tuning Panel */}
                    <div className="bg-slate-50 border border-slate-200 rounded-lg p-3">
                        <div className="flex items-center gap-2 mb-2 text-slate-700 font-bold text-xs uppercase tracking-wide">
                            <Sliders size={12} />
                            AI Tuning
                        </div>
                        <div className="grid grid-cols-3 gap-2">
                            <div>
                                <label className="block text-[10px] font-bold text-slate-500 mb-1">Reader Role</label>
                                <select 
                                    className="w-full text-xs p-1.5 rounded border border-slate-300 bg-white focus:ring-1 focus:ring-blue-500 outline-none"
                                    value={tuning.readerRole}
                                    onChange={(e) => setTuning(prev => ({ ...prev, readerRole: e.target.value }))}
                                >
                                    <option>Pilot</option>
                                    <option>Air Traffic Controller</option>
                                    <option>Engineer</option>
                                    <option>Policy Maker</option>
                                    <option>Legislator</option>
                                    <option>CTO</option>
                                    <option>CEO</option>
                                    <option>Student</option>
                                    <option>General Technical</option>
                                </select>
                            </div>
                             <div>
                                <label className="block text-[10px] font-bold text-slate-500 mb-1">AI Persona</label>
                                <select 
                                    className="w-full text-xs p-1.5 rounded border border-slate-300 bg-white focus:ring-1 focus:ring-blue-500 outline-none"
                                    value={tuning.aiPersona}
                                    onChange={(e) => setTuning(prev => ({ ...prev, aiPersona: e.target.value }))}
                                >
                                    <option>Helpful Assistant</option>
                                    <option>Strictly Factual</option>
                                    <option>Teacher/Mentor</option>
                                    <option>Technical Expert</option>
                                    <option>Concise Briefer</option>
                                </select>
                            </div>
                             <div>
                                <label className="block text-[10px] font-bold text-slate-500 mb-1">Detail Level</label>
                                <select 
                                    className="w-full text-xs p-1.5 rounded border border-slate-300 bg-white focus:ring-1 focus:ring-blue-500 outline-none"
                                    value={tuning.detailLevel}
                                    onChange={(e) => setTuning(prev => ({ ...prev, detailLevel: e.target.value }))}
                                >
                                    <option>Broad Strokes</option>
                                    <option>Balanced</option>
                                    <option>Detailed</option>
                                    <option>Very Fine Detail</option>
                                </select>
                            </div>
                        </div>
                    </div>

                    <div className="border-t border-slate-100 pt-2">
                        <div className="flex justify-between items-center mb-2">
                            <span className="text-sm font-semibold text-slate-700">Start New Map</span>
                            <div className="flex gap-2">
                                <button onClick={() => setShowIdeaModal(true)} className="text-purple-600 hover:text-purple-700 text-xs flex items-center gap-1 bg-purple-50 px-2 py-0.5 rounded border border-purple-100 font-bold" title="Generate from Idea">
                                    <Sparkles size={10} /> Generate Idea
                                </button>
                                <button onClick={handleLoadSample} className="text-emerald-600 hover:text-emerald-700 text-xs flex items-center gap-1 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-100" title="Load ADS-C Example">
                                    <FileText size={10} /> Sample
                                </button>
                                <button onClick={() => fileInputRef.current?.click()} className="text-blue-600 hover:text-blue-700 text-xs flex items-center gap-1 bg-blue-50 px-2 py-0.5 rounded border border-blue-100">
                                    <Upload size={10} /> Upload
                                </button>
                            </div>
                            <input type="file" ref={fileInputRef} className="hidden" accept=".txt,.md,.docx" onChange={handleFileUpload} />
                        </div>
                        
                        {/* Session Name Input */}
                        <div className="mb-2">
                            <input 
                                type="text" 
                                value={sessionName}
                                onChange={(e) => setSessionName(e.target.value)}
                                placeholder="Session Name (e.g., Project Alpha)..."
                                className="w-full p-2 text-xs font-medium bg-white border border-slate-300 rounded focus:ring-1 focus:ring-blue-500 outline-none text-slate-700"
                            />
                        </div>
                    
                        <textarea
                            className="w-full h-40 p-3 bg-slate-50 border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none resize-none transition-all"
                            placeholder="Paste onboarding docs, technical manuals, or process descriptions here..."
                            value={textInput}
                            onChange={(e) => setTextInput(e.target.value)}
                            disabled={loading !== 'idle'}
                        />
                    </div>

                    <button
                        onClick={handleGenerate}
                        disabled={loading !== 'idle' || !textInput.trim()}
                        className="w-full bg-slate-900 hover:bg-slate-800 text-white font-medium py-3 px-4 rounded-lg flex items-center justify-center gap-2 transition-all disabled:opacity-50 disabled:cursor-not-allowed shadow-lg hover:shadow-xl"
                    >
                        {loading === 'generating-map' ? (
                            <>
                            <Loader2 className="animate-spin" size={18} />
                            <span>Analyzing Structure...</span>
                            </>
                        ) : (
                            <>
                            <Sparkles size={18} />
                            <span>Generate Mind Map</span>
                            </>
                        )}
                    </button>
                </div>
            </div>
        )}
      </div>

      {/* Main Map Content Area - Fixed missing rendering */}
      {mindMap && (
        <div className="flex-1 relative h-full overflow-hidden" style={{ backgroundColor: theme.canvasBg }}>
             
             <MindMap 
                data={mindMap} 
                onNodeAction={handleNodeAction}
                onSearchReveal={handleSearchReveal}
                loading={loading}
                isDevMode={isDevMode}
                theme={theme}
                sessionName={sessionName}
             />
        </div>
      )}
      
      {/* Concept Cloud Panel */}
      {showConceptCloud && mindMap && (
          <ConceptCloud 
              data={mindMap}
              onSelectNode={handleSelectNodeFromCloud}
              onClose={() => setShowConceptCloud(false)}
              onHoverConcept={handleConceptHover}
          />
      )}

      {/* Developer Mode Ticker */}
      {isDevMode && logs.length > 0 && (
          <div 
             onClick={() => setActiveInfoModal('logs')}
             className="fixed bottom-0 left-0 right-0 bg-slate-900 text-slate-300 font-mono text-xs p-2 flex items-center justify-between cursor-pointer hover:bg-slate-800 transition-colors z-[100] border-t border-slate-700 shadow-2xl"
          >
             <div className="flex items-center gap-2 overflow-hidden">
                 <Terminal size={12} className="text-blue-400" />
                 <span className="truncate">{logs[logs.length - 1].message}</span>
                 {logs[logs.length - 1].level === 'error' && <AlertCircle size={12} className="text-red-500" />}
             </div>
             <span className="text-[10px] text-slate-500 bg-slate-950 px-1 rounded ml-2">{logs.length} events</span>
          </div>
      )}

      {/* Modals */}
      {showThemeEditor && (
          <ThemeEditor
            theme={theme}
            onUpdate={setTheme}
            onClose={() => setShowThemeEditor(false)}
          />
      )}

      {showSettingsModal && (
          <SettingsModal
             settings={settings}
             onUpdate={setSettings}
             onClose={() => setShowSettingsModal(false)}
          />
      )}

      {promptDebug && promptDebug.active && (
          <PromptDebugModal
             promptType={promptDebug.type}
             userPrompt={promptDebug.userPrompt}
             onConfirm={promptDebug.onConfirm}
             onCancel={() => setPromptDebug(null)}
          />
      )}

      {showQuotaModal && (
          <QuotaModal
             onClose={() => setShowQuotaModal(false)}
          />
      )}
      
      {showRenameModal && (
          <RenameModal 
             currentName={sessionName}
             onRename={setSessionName}
             onClose={() => setShowRenameModal(false)}
          />
      )}

      {showIdeaModal && (
          <IdeaModal
             onConfirm={handleGenerateSeedText}
             onClose={() => setShowIdeaModal(false)}
          />
      )}

      {showCloseConfirmation && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/40 backdrop-blur-sm p-4 animate-in fade-in">
              <div className="bg-white rounded-xl shadow-2xl w-full max-w-sm p-6 animate-in zoom-in-95">
                  <h3 className="text-lg font-bold text-slate-800 mb-2 flex items-center gap-2">
                      <AlertTriangle size={20} className="text-amber-500" /> Close Map?
                  </h3>
                  <p className="text-sm text-slate-600 mb-4">
                      You are about to close the current map. Any unsaved progress will be lost unless you save the session now.
                  </p>
                  <div className="flex flex-col gap-2">
                      <button 
                          onClick={() => {
                              if (mindMap) saveSessionFile(mindMap);
                              setMindMap(null);
                              setHistory([]);
                              setOriginalText('');
                              setTextInput('');
                              setSystemsViewData(null);
                              setSessionName('Untitled Session');
                              setShowCloseConfirmation(false);
                              logger.info("Map Closed");
                          }}
                          className="w-full py-2 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-lg flex items-center justify-center gap-2"
                      >
                          <Download size={16} /> Save & Start New
                      </button>
                      <button 
                          onClick={() => {
                              setMindMap(null);
                              setHistory([]);
                              setOriginalText('');
                              setTextInput('');
                              setSystemsViewData(null);
                              setSessionName('Untitled Session');
                              setShowCloseConfirmation(false);
                              logger.info("Map Closed (Discarded)");
                          }}
                          className="w-full py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold rounded-lg"
                      >
                          Discard & Start New
                      </button>
                      <button 
                          onClick={() => setShowCloseConfirmation(false)}
                          className="w-full py-2 text-slate-500 hover:text-slate-800 text-sm font-medium"
                      >
                          Cancel
                      </button>
                  </div>
              </div>
          </div>
      )}

      {/* Reset Node Modal */}
      {resetNodeData && (
          <ResetNodeModal 
             node={resetNodeData}
             onConfirm={(details, process) => {
                 // Update logic for clearing data
                 updateNodeInTree(resetNodeData.id, (n) => ({
                    ...n,
                    cachedDetails: details ? undefined : n.cachedDetails,
                    cachedProcess: process ? undefined : n.cachedProcess,
                    detailsLocked: details ? false : n.detailsLocked,
                    processLocked: process ? false : n.processLocked
                 }), `Cleared content for ${resetNodeData.label}`, false, true); // Added true for dependency check
                 setResetNodeData(null);
             }}
             onClose={() => setResetNodeData(null)}
          />
      )}

      {/* Unified Generation Modal (Replaces ProcessSourceModal) */}
      {generationModal && (
          <GenerationModal 
             node={generationModal.node}
             type={generationModal.type}
             onSelect={handleGenerationSelect}
             onClose={() => setGenerationModal(null)}
          />
      )}

      {/* Document Editor Modal */}
      {documentEditorData && mindMap && (
          <DocumentEditorModal
             // CRITICAL FIX: Pass the fresh node from the mindMap state, not the stale one captured in documentEditorData
             node={findNodeAndPath(mindMap, documentEditorData.node.id)?.node || documentEditorData.node}
             root={mindMap}
             nodeNumber={documentEditorData.number}
             onSave={(summary) => {
                 // Fix: explicit dependency check = true
                 updateNodeInTree(documentEditorData.node.id, (n) => ({ ...n, userSummary: summary }), `Updated summary for ${documentEditorData.node.label}`, true, true);
             }}
             onUpdateDependencies={(watchedIds) => {
                 updateNodeInTree(documentEditorData.node.id, (n) => ({ ...n, watchedNodeIds: watchedIds }), `Updated dependencies for ${documentEditorData.node.label}`);
             }}
             onClearFlag={() => {
                 // Fix: Clear flag AND the source IDs list
                 updateNodeInTree(documentEditorData.node.id, (n) => ({ ...n, isFlaggedForReview: false, flaggedSourceIds: [] }), `Cleared flag for ${documentEditorData.node.label}`);
             }}
             onGenerate={async (label, details, process) => {
                 return await generateNodeSummary(label, details, process, tuning);
             }}
             onClose={() => setDocumentEditorData(null)}
          />
      )}

      {showSystemsView && systemsViewData && mindMap && (
          <SystemsViewModal
             data={systemsViewData}
             mindMap={mindMap}
             isLocked={systemsViewLocked}
             onToggleLock={() => setSystemsViewLocked(!systemsViewLocked)}
             onRegenerate={() => {
                 setSystemsViewLocked(false);
                 handleSystemsView(); // Re-trigger generation
             }}
             onClose={() => setShowSystemsView(false)}
             onUpdate={(newData) => setSystemsViewData(newData)} // Handle updates
             onAddToMindMap={handleAddToMindMap}
             // Helper to open details from systems view interactions
             onOpenDetails={(node) => handleNodeAction('details', node)}
             onOpenProcess={(node) => handleNodeAction('process', node)}
             isDevMode={isDevMode} // Pass debug state
             theme={theme}
          />
      )}

      {detailsContent && (
        <DetailsModal 
            title={detailsContent.title} 
            content={detailsContent.content}
            isLocked={detailsContent.isLocked}
            onToggleLock={() => {
                const newState = !detailsContent.isLocked;
                updateNodeInTree(detailsContent.id, (n) => ({ ...n, detailsLocked: newState }), `Toggled lock for details: ${detailsContent.title}`);
                setDetailsContent(prev => prev ? { ...prev, isLocked: newState } : null);
            }}
            onSave={(newContent) => {
                updateNodeInTree(detailsContent.id, (n) => ({ ...n, cachedDetails: newContent }), `Updated details for ${detailsContent.title}`, true, true);
                setDetailsContent(prev => prev ? { ...prev, content: newContent } : null);
            }}
            onClose={() => setDetailsContent(null)} 
        />
      )}
      
      {processContent && (
        <ProcessModal 
            title={processContent.title} 
            steps={processContent.steps} 
            isLocked={processContent.isLocked}
            startEditing={processContent.startEditing}
            onToggleLock={() => {
                const newState = !processContent.isLocked;
                updateNodeInTree(processContent.id, (n) => ({ ...n, processLocked: newState }), `Toggled lock for process: ${processContent.title}`);
                setProcessContent(prev => prev ? { ...prev, isLocked: newState } : null);
            }}
            onSave={(newSteps) => {
                updateNodeInTree(processContent.id, (n) => ({ ...n, cachedProcess: newSteps }), `Updated process for ${processContent.title}`, true, true);
                setProcessContent(prev => prev ? { ...prev, steps: newSteps } : null);
            }}
            onClose={() => setProcessContent(null)} 
            theme={theme}
        />
      )}

      {editNodeData && (
          <EditNodeModal
            node={editNodeData.node}
            nodeNumber={editNodeData.number}
            onClose={() => setEditNodeData(null)}
            onSave={(updates) => updateNodeInTree(editNodeData.node.id, (n) => ({ ...n, ...updates }), `Edited node: ${editNodeData.node.label}`, false, true)}
            onAddChild={() => {
                const newChild: MindMapData = {
                    id: crypto.randomUUID(),
                    label: "New Child Node",
                    description: "User added node",
                    nodeType: 'info',
                    nature: 'fact',
                    source: 'user', // Mark as user generated
                    children: []
                };
                updateNodeInTree(editNodeData.node.id, (n) => ({ ...n, children: [...(n.children || []), newChild] }), `Added child to: ${editNodeData.node.label}`);
            }}
          />
      )}

      {expandNodeData && (
          <ExpandModal
             node={expandNodeData}
             onClose={() => setExpandNodeData(null)}
             onConfirm={handleConfirmExpand}
          />
      )}
      
      {activeInfoModal === 'userGuide' && (
          <InfoModal 
             title="User Guide" 
             content={USER_GUIDE} 
             onClose={() => setActiveInfoModal(null)} 
          />
      )}

      {activeInfoModal === 'techSpec' && (
          <InfoModal 
             title="Technical Specification" 
             content={TECH_SPEC} 
             onClose={() => setActiveInfoModal(null)} 
          />
      )}

      {activeInfoModal === 'history' && (
          <HistoryModal
              history={history}
              currentIndex={historyIndex}
              onRestore={restoreFromHistory}
              onClose={() => setActiveInfoModal(null)}
          />
      )}

      {activeInfoModal === 'logs' && (
          <LogModal
             logs={logs}
             onClose={() => setActiveInfoModal(null)}
          />
      )}

    </div>
  );
};

export default App;
