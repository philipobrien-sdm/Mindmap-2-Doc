
# MindMap 2 Doc - Intelligent Knowledge Architect

## Overview
**MindMap 2 Doc** is an advanced knowledge management application designed to transform unstructured technical text into structured, interactive visualizations and professional documentation. Powered by **Google's Gemini 2.5 Flash** model, it acts as an intelligent partner, helping you break down complex documentation (like onboarding manuals, technical specs, or regulations) into hierarchical mind maps, actionable process flows, and system architecture diagrams.

Beyond visualization, it now features a robust **Document Builder** and **Dependency Tracker**, allowing you to curate content node-by-node and ensure consistency across evolving data.

---

## ⚡ Key Features
<img width="800" height="400" alt="Screenshot 2025-12-04 144337" src="https://github.com/user-attachments/assets/69b2248e-b837-4338-8857-58a1bf8ec4b3" />
<img width="500" height="400" alt="Screenshot 2025-12-04 144254" src="https://github.com/user-attachments/assets/8058540a-1520-46ec-bb91-517103bfc2f1" />

### 🧠 Intelligent Visualization
*   **Automated Mind Mapping**: Instantly converts text into a node-based tree structure. Nodes are intelligently classified as "Process" (actionable) or "Info" (knowledge).
*   **Recursive Expansion**: Select any node and ask the AI to "Expand" it, generating a new layer of sub-concepts based on the original text context.
*   **Concept Cloud**: Client-side NLP analysis extracts recurring themes. Click any concept to instantly filter and highlight relevant nodes across the entire tree.

### 📝 Document Builder & Editor
*   **Section-by-Section Drafting**: Open the **Doc** editor on any node to write or AI-generate summaries specific to that section.
*   **Structured Export**: Compiles your entire map hierarchy, including user-written summaries, AI-generated details, and process diagrams, into a single, formatted HTML report suitable for sharing.

### 🛡️ Dependency Tracking (New)
*   **Watch Logic**: Link nodes together (e.g., a "Summary" node watching a "Technical Spec" node).
*   **Auto-Flagging**: If a source node is updated or deleted, dependent nodes are automatically flagged for review to ensure data consistency.
*   **Visual Indicators**: Nodes show specific icons when they have content or active dependencies.

### 🔄 Process Engineering
*   **Multi-View Process Maps**: Transform static procedures into:
    *   **Standard Flowcharts**: With decision gates and loops.
    *   **Swimlane Diagrams**: organized by Role/Actor.
    *   **Sequence Diagrams**: visualized via Mermaid.js.
*   **Interactive Editing**: Manually refine steps, change roles, or toggle "End States".

### 🌐 Systems Architecture
*   **Mesh Table & Graph**: Generates a high-level architectural view identifying "Actors" (People, Systems) and their "Interactions".
*   **Sequence Diagram Generator**: Select any interaction in the table to auto-generate a Mermaid.js Sequence Diagram describing the data exchange. *Includes persistence to save diagrams between sessions.*
*   **Data Flow Analysis**: Filter the map by specific data types (e.g., "Login Credentials", "Flight Plan").

### 🛠️ Professional Tools
*   **Session Management**: Save/Load your workspace via JSON. Full Undo/Redo history.
*   **High-Res Export**: Download PNG snapshots of maps, flowcharts, and architecture diagrams (with watermark).
*   **Themes**: Customizable color palettes for accessibility and presentation.

---

## 🚀 Installation and Setup in Google AI Studio

Follow these steps to download the code and run your own instance of the application in Google AI Studio.

### Prerequisites
1.  **Google Account**: You need a Google account to use Google AI Studio.
2.  **Gemini API Key**: The application requires your own Gemini API key to function.
    *   Go to [Google AI Studio](https://aistudio.google.com/).
    *   Click on "Get API key" in the top-left menu.
    *   Follow the instructions to create a new API key.
    *   **Copy and save this key.** You will need it in Step 3.

### Step 1: Download the Project
1.  Download the project files from the repository.
2.  Ensure you have the following file structure:
    *   `index.html`
    *   `index.tsx`
    *   `App.tsx`
    *   `types.ts`
    *   `metadata.json`
    *   `components/` (Folder containing all .tsx components)
    *   `services/` (Folder containing geminiService.ts)
    *   `utils/` (Folder containing utility scripts)
    *   `constants/` (Folder containing theme and docs)

### Step 2: Prepare the ZIP for AI Studio
This is the most important step. AI Studio requires the `index.html` file to be at the **root** of the zip file.

1.  Select **all** the project files and folders mentioned above.
2.  Right-click and choose:
    *   **Windows**: "Send to" > "Compressed (zipped) folder".
    *   **Mac**: "Compress [X] items".
3.  Rename the new ZIP file to something clear, like `mindmap-2-doc-upload.zip`.

### Step 3: Upload and Run in AI Studio
1.  Go to the [Google AI Studio App Gallery](https://aistudio.google.com/app).
2.  Click **"Create new"** and select **"Zip upload"**.
3.  **Upload Your ZIP**: Select the `mindmap-2-doc-upload.zip` file you created. AI Studio will build the project and launch the application.
4.  **Add Your API Key**:
    *   Once the project is loaded, locate the **"Secrets"** panel on the left-hand side (it looks like a key icon 🔑).
    *   Click "Add new secret".
    *   For the **Name**, enter `API_KEY` (this must be exact).
    *   For the **Value**, paste the Gemini API key you obtained in the Prerequisites step.
    *   Click Save.

Your application is now set up and ready to use!

---

## 🔒 Privacy & Architecture

*   **Client-Side Processing**: All file parsing, NLP analysis, and graph rendering happen in your browser.
*   **Stateless AI**: Text is sent to the Gemini API solely for processing. No data is stored on external servers to train models.
*   **Local Storage**: Your sessions are saved locally to your device as JSON files. No cloud login is required.

## ⚙️ Tech Stack

*   **Core**: React 19, TypeScript, Vite
*   **Visuals**: D3.js (Tree/Force layouts), Mermaid.js (Sequence/Flowcharts), Tailwind CSS.
*   **AI**: Google GenAI SDK (`@google/genai`).
