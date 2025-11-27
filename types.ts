
/**
 * Core Data Types for MindMap AI
 * 
 * This file defines the TypeScript interfaces used throughout the application
 * to ensure type safety for the Knowledge Graph, Process Maps, and System Views.
 */

// Classifications for Mind Map Nodes
export type NodeType = 'process' | 'info'; // Is this actionable (process) or informational (info)?
export type NodeNature = 'fact' | 'opinion'; // Is this objective (fact) or subjective (opinion)?
export type DataSource = 'ai' | 'user'; // Did the AI generate this, or did the user manually add it?

/**
 * Color Palette Structure
 * Used for theming nodes based on their type.
 */
export interface ColorPalette {
  bg: string;     // Background color (Tailwind class or hex)
  border: string; // Border color
  text: string;   // Text color
}

/**
 * Application Theme Configuration
 * Defines the color schemes for the entire visualization layer.
 */
export interface AppTheme {
  name: string;
  process: ColorPalette;
  info: ColorPalette;
  decision: ColorPalette;
  endState: ColorPalette;
  link: string;      // Color of connecting lines
  canvasBg: string;  // Background color of the infinite canvas
}

/**
 * AI Tuning Options
 * Parameters that alter the system prompt to change the AI's output style.
 */
export interface TuningOptions {
  readerRole: string; // Target audience (e.g., 'Pilot', 'Engineer')
  aiPersona: string;  // Tone of voice (e.g., 'Teacher', 'Factual')
  detailLevel: string; // Granularity (e.g., 'High Level', 'Detailed')
}

/**
 * App Settings
 * Global configuration for application behavior.
 */
export interface AppSettings {
  reviewPrompts: boolean; // If true, show full prompt before sending to API
  autoSave: boolean;
}

/**
 * Suggested Prompts
 * AI-generated ideas for future actions on this node.
 */
export interface SuggestedPrompts {
  expand?: string;   // Suggestion for how to break this node down
  details?: string;  // Suggestion for what technical details to focus on
  process?: string;  // Suggestion for the scope of the process flow
}

/**
 * Mind Map Node Data Structure
 * Recursive structure representing the knowledge tree.
 */
export interface MindMapData {
  id: string;           // UUID
  label: string;        // Short title
  description?: string; // Brief summary
  nodeType: NodeType;
  nature: NodeNature;
  source?: DataSource; 
  children?: MindMapData[]; // Recursive children
  
  // Intelligent Features
  isProcessCandidate?: boolean; // AI Flag: Does this node represent a workflow/procedure?
  suggestedPrompts?: SuggestedPrompts; // AI guidance for future interactions

  // Local Caching - Stores AI responses to prevent re-fetching
  cachedDetails?: string;        // Markdown text for "Details" view
  cachedProcess?: ProcessStep[]; // Steps for "Process" view
  
  // Document Building
  userSummary?: string;          // The final curated content for the generated document report
  
  // Dependency Tracking (New)
  watchedNodeIds?: string[];     // IDs of other nodes that this content relies on
  isFlaggedForReview?: boolean;  // True if a watched node has been updated/deleted
  flaggedSourceIds?: string[];   // List of IDs that triggered the flag (for UI feedback)
  
  // Locking State - Prevents AI from overwriting user edits
  detailsLocked?: boolean;
  processLocked?: boolean;
  
  // UI state - purely for display logic (collapsed/expanded)
  _collapsed?: boolean;
}

/**
 * Process Map - Branch Logic
 * Represents a decision path in a flowchart.
 */
export interface ProcessBranch {
  id: string;
  label: string; // The condition (e.g., "Yes", "No", "Failed")
  targetStepId?: string; // UUID of the step this branch leads to
}

/**
 * Process Map - Step Logic
 * A single step in a linear or branching workflow.
 */
export interface ProcessStep {
  id: string; 
  stepNumber: number; 
  type: 'action' | 'decision';
  isEndState?: boolean; // If true, this is a terminal node (e.g., "Mission Abort")
  action: string;       // Short title
  description: string;  // Detailed instruction
  role?: string;        // Who performs this? (e.g., "Pilot")
  branches?: ProcessBranch[]; // Only present if type === 'decision'
}

/**
 * Context for AI Prompts
 * Used to tell the AI where a node sits in the hierarchy.
 */
export interface NodeContext {
  id: string;
  label: string;
  fullPath: string[]; // e.g., ["Root", "Chapter 1", "Section A"]
}

// Application Loading States
export type LoadingState = 'idle' | 'generating-map' | 'expanding' | 'detailing' | 'mapping-process' | 'reading-file' | 'generating-systems' | 'generating-summary';

// Logging Levels for the internal debug console
export type LogLevel = 'info' | 'warn' | 'error' | 'success';

export interface LogEntry {
  id: string;
  timestamp: number;
  level: LogLevel;
  message: string;
  details?: any;
}

// --- Systems View (Architecture) Data Types ---

export interface SystemActor {
  id: string;
  name: string;
  type: 'person' | 'system' | 'external';
}

export interface SystemInteraction {
  id: string;
  source: string; // ID or Name of the Initiator
  target: string; // ID or Name of the Receiver
  activity: string; // The action (e.g., "Sends Request")
  data: string;     // The payload (e.g., "Flight Plan")
  sequenceDiagram?: string; // Cached Mermaid code for this interaction
}

export interface SystemsViewData {
  actors: SystemActor[];
  activities: string[];
  interactions: SystemInteraction[];
}
