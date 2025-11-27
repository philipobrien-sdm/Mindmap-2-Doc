
export const USER_GUIDE = `
# 📖 User Guide

Welcome to **MindMap AI**, your intelligent Knowledge Architect. This tool transforms complex text into structured, interactive knowledge graphs and system architectures.

---

## 🚀 Getting Started

### 1. Interactive Tutorial 🎓
New to the tool? Click the **Tutorial** button on the home screen. This launches a guided, interactive tour using real sample data (ADS-C Protocols) to demonstrate:
*   How to navigate the graph.
*   How to trigger AI expansions.
*   How to export documents.

### 2. Create a Map
*   **Paste Text**: Simply paste your technical manual, process doc, or notes into the main input area.
*   **Upload File**: Click "Upload" to use \`.txt\`, \`.md\`, or \`.docx\` files.
*   **Tuning**: Use the "AI Tuning" panel to adjust the **Reader Role** (e.g., Pilot, Engineer) and **Detail Level**.

---

## ⚡ Core Features

### Mind Map Visualization
*   **Pan & Zoom**: Drag to move, scroll to zoom.
*   **Node Actions**: Click any node to open the Action Menu:
    *   **Expand 🌿**: Asks AI to break this node down into child concepts.
    *   **Details 📝**: Generates a technical explanation (editable Markdown).
    *   **Process 🔄**: Maps out a step-by-step workflow (editable Flowchart).
    *   **Doc ✍️**: Curate a specific summary for this node to be included in the final document export.

### ☁️ Concept Cloud
Click the **Tag Icon** in the sidebar to open the Concept Cloud.
*   **Theme Extraction**: The app analyzes your entire map to find recurring keywords and themes.
*   **Filtering**: Click any word in the cloud to instantly highlight *every* node in the map where that concept appears. This is perfect for seeing how a specific topic (e.g., "Safety") is distributed across your document.

---

## 🛠️ Process Mapping

The Process View turns text into logic flows:
*   **Views**: Switch between Standard Flowchart, Swimlane Diagram, or Sequence Diagram.
*   **Edit Mode**: Add steps, change types (Action vs. Decision), and link branches.
*   **End States**: Mark steps as "End States" (red octagon) to terminate a flow.

---

## 🌐 Systems View & Architecture

Click the **Systems View** button to generate a high-level architecture diagram.

### 1. Views
*   **Map View**: A visual tree layout of system actors.
*   **Mesh Table**: A matrix view showing specific data exchanged between actors.
*   **Sequence Generator**: In the table view, click the "Activity" icon on any row to generate a Mermaid.js Sequence Diagram for that specific interaction.

### 2. Integration Features
*   **Add to Mind Map**: You can "push" Actors or Interactions from the Systems View back into your main Mind Map.
    *   *From Map*: Click an Actor node -> "Add to Map".
    *   *From Table*: Hover over a column header or cell -> click the arrow icon.

---

## 💾 Saving & Exporting

*   **Save Session**: Downloads a \`.json\` file containing your entire workspace.
*   **Export Document**: Compiles all your nodes, summaries, and details into a single, formatted HTML report suitable for sharing.
*   **Export Images**: Download high-resolution PNGs of any view.
`;

export const TECH_SPEC = `
# ⚙️ Technical Specification

**MindMap AI** is a client-side Single Page Application (SPA) designed for zero-latency interaction, high data privacy, and robust offline capabilities.

---

## 🏗️ Architecture Stack

*   **Core**: React 19, TypeScript, Vite
*   **Styling**: Tailwind CSS for responsive, utility-first design.
*   **Visualization**:
    *   **D3.js**: Custom implementation of Reingold-Tilford tree algorithms for the Mind Map and Systems View.
    *   **Mermaid.js**: Dynamic rendering of sequence diagrams and flowcharts.
    *   **HTML-to-Image**: Client-side rasterization for high-res PNG exports.
*   **AI Engine**: Google Gemini API (\`gemini-2.5-flash\`) via \`@google/genai\` SDK.

---

## 🧠 AI Integration Strategy

The application uses a **"Human-in-the-Loop"** architecture. AI is an on-demand service triggered by specific user intents, not a black box.

### Key Workflows
1.  **Recursive Expansion**: The AI analyzes the *current* node context + original text to generate strictly typed JSON children.
2.  **Context-Aware Detailing**: Prompts include the full path (Root > Parent > Child) to ensure relevance.
3.  **Concept Extraction (NLP)**: The Concept Cloud uses client-side natural language processing to tokenize text, remove stop-words, and calculate frequency distributions locally, without API calls.

---

## 🎓 Tutorial Engine

The interactive tutorial is built using a custom overlay system:
*   **DOM Tracking**: Uses \`getBoundingClientRect\` to dynamically track the position of UI elements (buttons, nodes) even as the window resizes.
*   **Spotlight Effect**: Creates a visual "hole" or highlight box around the active target element to guide user focus.
*   **State Machine**: Manages the step sequence and ensures the tutorial can be dismissed or restarted at any time without affecting the main application state.

---

## 🔒 Security & Persistence

*   **Client-Side Processing**: Files are read in memory; raw text is sent to Gemini but not stored on any 3rd party server database.
*   **Session Management**: State is serialized to a local JSON file. No cloud login required.
*   **Tainted Canvas Handling**: Custom SVG export logic ensures diagrams can be downloaded without browser security errors.
`;
