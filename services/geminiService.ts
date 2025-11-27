
import { GoogleGenAI, Type } from "@google/genai";
import { MindMapData, TuningOptions, ProcessStep, SystemsViewData, NodeType, NodeNature, DataSource } from "../types";
import { logger } from "../utils/logger";

const MODEL_NAME = "gemini-2.5-flash";

// Initialize Gemini Client
const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

const buildSystemInstruction = (tuning: TuningOptions, format: 'json' | 'markdown' | 'text' = 'json'): string => {
  let instruction = `
    You are an advanced Knowledge Architect AI.
    Role: ${tuning.readerRole}
    Persona: ${tuning.aiPersona}
    Detail Level: ${tuning.detailLevel}
    
    Your goal is to structure complex information into clear, hierarchical knowledge graphs.
  `;

  if (format === 'json') {
      instruction += `
    CRITICAL: You must look ahead. For every node you create, you must suggest specific prompts for future actions (Expansion, Details, Process) to maintain context and focus.
    Output valid JSON only.`;
  } else if (format === 'markdown') {
      instruction += `
    Output structured Markdown. 
    CRITICAL: Do NOT include JSON, metadata, "suggested prompts", or "future actions" in your output. Only provide the requested content.`;
  } else {
      instruction += `
    Output plain text.`;
  }
  
  return instruction;
};

const handleGeminiError = (error: any, context: string) => {
  logger.error(`Gemini Error [${context}]`, { message: error.message });
  console.error(error);
  if (error.message?.includes("429") || error.message?.includes("Quota exceeded")) {
    throw new Error("QUOTA_EXCEEDED");
  }
};

export const generateSeedText = async (idea: string, tuning: TuningOptions): Promise<string> => {
  logger.info("Generating Seed Text", { idea });
  // Request plain text, do not force JSON
  const systemInstruction = buildSystemInstruction(tuning, 'text');
  
  const prompt = `
    Write a 1000-word analytical and explanatory exploration of the topic: ${idea}.
    Structure the text so that it is clear, comprehensive, and useful as a basis for a later deep-dive.
    Output plain text.
  `;

  try {
    const response = await ai.models.generateContent({
      model: MODEL_NAME,
      contents: prompt,
      config: { systemInstruction }
    });
    const text = response.text || "";
    logger.success("Seed Text Generated", { length: text.length });
    return text;
  } catch (error: any) {
    handleGeminiError(error, "Seed Text Generation");
    throw error;
  }
};

export const generateMindMap = async (text: string, tuning: TuningOptions): Promise<MindMapData> => {
  logger.info("Generating Mind Map Structure");
  const systemInstruction = buildSystemInstruction(tuning, 'json');
  
  const prompt = `
    Analyze the following text and generate a hierarchical mind map structure.
    
    Text:
    "${text.substring(0, 30000)}"

    Output a JSON object matching this TypeScript interface:
    interface MindMapData {
      id: string; // Generate a unique UUID
      label: string; // Short concise title (max 5 words)
      description: string; // Brief summary (max 20 words)
      nodeType: 'process' | 'info'; // Actionable vs Informational
      nature: 'fact' | 'opinion';
      isProcessCandidate: boolean; // Set to TRUE if this node describes a "how-to", workflow, method, technique, or sequence of actions.
      
      // AI INTELLIGENCE LAYER
      // Suggest what the user should ask for next to deepen the analysis of THIS node.
      suggestedPrompts: {
         expand: string; // e.g., "Break down the specific safety protocols involved."
         details: string; // e.g., "Explain the technical specifications of the communication bus."
         process: string; // e.g., "Map the sequence of events from initialization to connection." (Only if isProcessCandidate is true)
      };

      source: 'ai';
      children: MindMapData[]; // Recursive, break down to 2-3 levels of depth if possible.
    }
    
    Ensure the root node represents the main topic.
    Limit the total nodes to around 20-30 for this initial pass.
    Ensure the children are ordered logically (e.g. chronological steps, or most important concepts first).
  `;

  try {
    const response = await ai.models.generateContent({
      model: MODEL_NAME,
      contents: prompt,
      config: { 
        systemInstruction,
        responseMimeType: "application/json"
      }
    });
    
    const jsonStr = response.text || "{}";
    const data = JSON.parse(jsonStr) as MindMapData;
    
    // Post-process to ensure IDs exist
    const enrich = (node: MindMapData) => {
        if (!node.id) node.id = crypto.randomUUID();
        node.source = 'ai';
        if (node.children) node.children.forEach(enrich);
    };
    enrich(data);

    logger.success("Mind Map Generated", { label: data.label });
    return data;
  } catch (error: any) {
    handleGeminiError(error, "Mind Map Generation");
    throw error;
  }
};

export const expandNode = async (label: string, contextPath: string[], fullText: string, tuning: TuningOptions, guidance?: string): Promise<MindMapData[]> => {
  logger.info("Expanding Node", { label });
  const systemInstruction = buildSystemInstruction(tuning, 'json');

  const prompt = `
    Context Path: ${contextPath.join(" > ")}
    Node to Expand: "${label}"
    Original Source Text Context: ...${fullText.substring(0, 5000)}...
    
    User Guidance: ${guidance || "Break this down into logical sub-components or steps."}
    
    Generate a JSON array of children nodes (MindMapData[]) for this node.
    Do not include the parent node, only the children array.
    
    **CRITICAL ORDERING INSTRUCTION:**
    Order the returned children in a specific, logical sequence (e.g., Step 1, Step 2, or High Priority -> Low Priority).
    This order will be used for document numbering (1.1, 1.2, 1.3).
    
    interface MindMapData {
      id: string; 
      label: string;
      description: string;
      nodeType: 'process' | 'info';
      nature: 'fact' | 'opinion';
      isProcessCandidate: boolean;
      
      // AI INTELLIGENCE LAYER
      suggestedPrompts: {
         expand: string; 
         details: string; 
         process: string; 
      };

      source: 'ai';
      children: []; // Keep children empty for these new nodes
    }
  `;

  try {
    const response = await ai.models.generateContent({
      model: MODEL_NAME,
      contents: prompt,
      config: { 
        systemInstruction,
        responseMimeType: "application/json"
      }
    });
    
    const jsonStr = response.text || "[]";
    let children = JSON.parse(jsonStr);
    if (!Array.isArray(children) && (children as any).children) {
        children = (children as any).children;
    }
    
    children.forEach((c: any) => {
        c.id = crypto.randomUUID();
        c.source = 'ai';
    });

    logger.success("Node Expanded", { count: children.length });
    return children as MindMapData[];
  } catch (error: any) {
    handleGeminiError(error, "Expand Node");
    throw error;
  }
};

// Helper to expose the raw prompt construction for the "Review Prompt" feature
export const constructDetailsPrompt = (label: string, contextPath: string[], guidance?: string) => {
    return `
    Context Path: ${contextPath.join(" > ")}
    Topic: "${label}"
    ${guidance ? `Specific User Guidance/Focus: "${guidance}"` : ''}
    
    Based on the context, write a detailed technical explanation (Markdown).
    Include key concepts, purpose, and relevant data points.
    Keep it under 500 words.
    
    Do NOT output JSON. Output raw Markdown.
    Do NOT include sections like "Suggested Prompts" or "Next Steps". Just the content.
  `;
};

export const getNodeDetails = async (label: string, contextPath: string[], fullText: string, tuning: TuningOptions, guidance?: string): Promise<string> => {
  logger.info("Generating Details", { label });
  const systemInstruction = buildSystemInstruction(tuning, 'markdown');
  const prompt = constructDetailsPrompt(label, contextPath, guidance);

  try {
    const response = await ai.models.generateContent({
      model: MODEL_NAME,
      contents: prompt,
      config: { systemInstruction }
    });
    
    const text = response.text || "";
    logger.success("Details Generated", { length: text.length });
    return text;
  } catch (error: any) {
    handleGeminiError(error, "Get Node Details");
    throw error;
  }
};

// Helper for prompt review
export const constructProcessPrompt = (label: string, contextPath: string[], contextDetails?: string, guidance?: string) => {
    return `
    Context: ${contextPath.join(" > ")}
    Task: "${label}"
    Additional Context: ${contextDetails || ""}
    ${guidance ? `Specific User Guidance/Focus: "${guidance}"` : ''}
    
    Generate a step-by-step process flow for this task.
    Output a JSON array of ProcessStep objects.
    
    interface ProcessStep {
      id: string; // UUID
      stepNumber: number;
      type: 'action' | 'decision';
      action: string; // Short title
      description: string; // Instruction
      role: string; // Who performs it
      branches?: { label: string; targetStepId?: string }[]; // For decisions. targetStepId can be null initially.
    }
  `;
};

export const generateProcessFlow = async (label: string, contextPath: string[], fullText: string, tuning: TuningOptions, contextDetails?: string, guidance?: string): Promise<ProcessStep[]> => {
  logger.info("Generating Process Flow", { label });
  const systemInstruction = buildSystemInstruction(tuning, 'json');
  const prompt = constructProcessPrompt(label, contextPath, contextDetails, guidance);

  try {
    const response = await ai.models.generateContent({
      model: MODEL_NAME,
      contents: prompt,
      config: { 
        systemInstruction,
        responseMimeType: "application/json"
      }
    });
    
    const jsonStr = response.text || "[]";
    let steps = JSON.parse(jsonStr);
    
    // Fix IDs
    steps.forEach((s: any) => {
        if(!s.id) s.id = crypto.randomUUID();
    });

    logger.success("Process Flow Generated", { steps: steps.length });
    return steps as ProcessStep[];
  } catch (error: any) {
    handleGeminiError(error, "Process Flow Generation");
    throw error;
  }
};

export const generateSystemsView = async (text: string, tuning: TuningOptions): Promise<SystemsViewData> => {
  logger.info("Generating Systems View");
  const systemInstruction = buildSystemInstruction(tuning, 'json');

  const prompt = `
    Analyze the text and extract the System Architecture.
    Identify all Actors (People, Systems, External Entities) and their Interactions.
    
    Text: ${text.substring(0, 30000)}
    
    Output JSON:
    interface SystemsViewData {
      actors: { id: string; name: string; type: 'person'|'system'|'external' }[];
      activities: string[]; // List of unique activity names found
      interactions: { 
        id: string;
        source: string; // Actor ID
        target: string; // Actor ID
        activity: string; 
        data: string; // The info exchanged
      }[];
    }
  `;

  try {
    const response = await ai.models.generateContent({
      model: MODEL_NAME,
      contents: prompt,
      config: { 
         systemInstruction,
         responseMimeType: "application/json"
      }
    });
    
    const data = JSON.parse(response.text || "{}");
    // Ensure IDs
    if(data.interactions) {
        data.interactions.forEach((i: any) => { if(!i.id) i.id = crypto.randomUUID(); });
    }
    
    logger.success("Systems View Generated", { actors: data.actors?.length });
    return data as SystemsViewData;
  } catch (error: any) {
    handleGeminiError(error, "Systems View Generation");
    throw error;
  }
};

export const generateSequenceDiagram = async (
    interaction: { sourceName: string, targetName: string, activity: string, data: string }, 
    fullText: string, 
    tuning: TuningOptions
): Promise<string> => {
    logger.info("Generating Sequence Diagram", { activity: interaction.activity });
    const systemInstruction = buildSystemInstruction(tuning, 'text');

    const prompt = `
      Context Text: ...${fullText.substring(0, 10000)}...
      
      Focus Interaction:
      Source: ${interaction.sourceName}
      Target: ${interaction.targetName}
      Activity: ${interaction.activity}
      Data Payload: ${interaction.data}
      
      Generate a Mermaid.js sequence diagram code block that visualizes this specific interaction.
      CRITICAL INSTRUCTIONS:
      1. Expand the sequence to include likely preceding steps (setup) and succeeding steps (response/ack) found in the context text.
      2. Use standard Mermaid 'sequenceDiagram' syntax.
      3. Do NOT include markdown code fences (like \`\`\`mermaid). Just output the raw mermaid code.
      4. Use simple participant names (no spaces if possible, or use aliases).
      
      Example Output:
      sequenceDiagram
          participant P as Pilot
          participant ATC
          P->>ATC: Request Clearance
          ATC-->>P: Standby
          ATC->>ATC: Verify Route
          ATC->>P: Cleared to Destination
    `;

    try {
        const response = await ai.models.generateContent({
            model: MODEL_NAME,
            contents: prompt,
            config: { systemInstruction }
        });
        
        let code = response.text || "";
        // Clean up markdown if AI added it despite instructions
        code = code.replace(/```mermaid/g, '').replace(/```/g, '').trim();
        
        logger.success("Sequence Diagram Generated");
        return code;
    } catch (error: any) {
        handleGeminiError(error, "Sequence Diagram Generation");
        throw error;
    }
};

export const constructSummaryPrompt = (label: string, details?: string, processSteps?: ProcessStep[]) => {
    return `
    Node: "${label}"
    
    Raw Technical Details:
    "${details || 'None provided.'}"
    
    Process Data (JSON):
    ${processSteps ? JSON.stringify(processSteps) : 'None provided.'}
    
    Task:
    Create a polished "Document Section Summary" for this node.
    1. Synthesize the technical details into a clear, professional paragraph.
    2. If Process Data exists, convert it into a clean Markdown Table (columns: Step, Role, Action, Description).
    3. Do NOT invent new facts. Use the provided context.
    4. Output clean Markdown.
    5. CRITICAL: Do NOT include any meta-commentary, suggested prompts, or "Next Steps". Only output the subject matter.
    `;
};

export const generateNodeSummary = async (label: string, details?: string, processSteps?: ProcessStep[], tuning?: TuningOptions): Promise<string> => {
    logger.info("Generating Node Summary", { label });
    // Use 'markdown' format here to suppress prompts in system instruction
    const systemInstruction = buildSystemInstruction(tuning || { readerRole: 'Technical Reader', aiPersona: 'Professional Editor', detailLevel: 'Summary' }, 'markdown');
    const prompt = constructSummaryPrompt(label, details, processSteps);

    try {
        const response = await ai.models.generateContent({
            model: MODEL_NAME,
            contents: prompt,
            config: { systemInstruction }
        });
        
        const text = response.text || "";
        logger.success("Summary Generated", { length: text.length });
        return text;
    } catch (error: any) {
        handleGeminiError(error, "Node Summary Generation");
        throw error;
    }
};
