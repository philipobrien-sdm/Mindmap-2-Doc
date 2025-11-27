
import { MindMapData, ProcessStep } from '../types';

/**
 * Standard HTML Report (Debugging/Quick View)
 */
export const generateHTMLReport = (rootNode: MindMapData): string => {
  const timestamp = new Date().toLocaleString();
  
  const processToMermaid = (steps: ProcessStep[]): string => {
    if (!steps || steps.length === 0) return '';
    let graph = 'graph TD\n';
    const idMap = new Map<string, string>();
    
    steps.forEach((s, i) => idMap.set(s.id, `S${i}`));

    steps.forEach((step, i) => {
      const safeId = idMap.get(step.id);
      const safeLabel = step.action.replace(/["\n]/g, '');
      
      if (step.type === 'decision') {
        graph += `    ${safeId}{"${safeLabel}"}\n`;
        if (step.branches) {
          step.branches.forEach(b => {
            const targetId = b.targetStepId ? idMap.get(b.targetStepId) : null;
            if (targetId) {
              graph += `    ${safeId} -->|"${b.label}"| ${targetId}\n`;
            }
          });
        }
      } else {
        graph += `    ${safeId}["${safeLabel}"]\n`;
        const nextStep = steps.find(s => s.stepNumber === step.stepNumber + 1);
        if (nextStep) {
           const nextId = idMap.get(nextStep.id);
           graph += `    ${safeId} --> ${nextId}\n`;
        }
      }
    });
    return graph;
  };

  const renderNode = (node: MindMapData, depth: number): string => {
    const margin = depth * 20;
    const hasDetails = !!node.cachedDetails;
    const hasProcess = !!node.cachedProcess && node.cachedProcess.length > 0;
    
    let html = `
      <details class="node-accordion" ${depth === 0 ? 'open' : ''} style="margin-left: ${margin}px">
        <summary class="node-summary">
          <span class="node-icon ${node.nodeType}">${node.nodeType === 'process' ? '⚙️' : 'ℹ️'}</span>
          <span class="node-label">${node.label}</span>
          <span class="node-nature">${node.nature}</span>
        </summary>
        <div class="node-content">
          <p class="description"><strong>Description:</strong> ${node.description || 'No description available.'}</p>
          
          ${hasDetails ? `
            <div class="section details-section">
              <h4>📝 Detailed Knowledge</h4>
              <div class="markdown-body">${node.cachedDetails?.replace(/\n/g, '<br/>')}</div>
            </div>
          ` : ''}

          ${hasProcess ? `
            <div class="section process-section">
              <h4>🔄 Process Flow</h4>
              <div class="mermaid">
                ${processToMermaid(node.cachedProcess!)}
              </div>
              <ul class="process-list">
                ${node.cachedProcess!.map(s => `
                  <li>
                    <strong>Step ${s.stepNumber}: ${s.action}</strong> (${s.role || 'User'})
                    <br/>${s.description}
                  </li>
                `).join('')}
              </ul>
            </div>
          ` : ''}
        </div>
        
        ${node.children?.map(child => renderNode(child, depth + 1)).join('') || ''}
      </details>
    `;
    return html;
  };

  return `
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Report: ${rootNode.label}</title>
    <script src="https://cdn.tailwindcss.com"></script>
    <style>
      body { font-family: system-ui, -apple-system, sans-serif; background: #f8fafc; color: #1e293b; padding: 2rem; }
      .container { max-width: 1000px; margin: 0 auto; background: white; padding: 2rem; border-radius: 1rem; box-shadow: 0 4px 6px -1px rgb(0 0 0 / 0.1); }
      h1 { font-size: 2rem; font-weight: 800; margin-bottom: 0.5rem; color: #0f172a; }
      .meta { color: #64748b; font-size: 0.875rem; margin-bottom: 2rem; border-bottom: 1px solid #e2e8f0; padding-bottom: 1rem; }
      
      details.node-accordion { margin-bottom: 0.5rem; border: 1px solid #e2e8f0; border-radius: 0.5rem; overflow: hidden; background: white; }
      summary.node-summary { padding: 0.75rem; background: #f1f5f9; cursor: pointer; font-weight: 600; list-style: none; display: flex; items-center; gap: 0.5rem; transition: background 0.2s; }
      summary.node-summary:hover { background: #e2e8f0; }
      summary.node-summary::-webkit-details-marker { display: none; }
      
      .node-content { padding: 1rem; border-top: 1px solid #e2e8f0; }
      .node-icon { font-size: 1.2em; }
      .node-icon.process { color: #2563eb; }
      .node-icon.info { color: #059669; }
      .node-nature { font-size: 0.7em; text-transform: uppercase; padding: 2px 6px; background: #e2e8f0; border-radius: 4px; color: #64748b; margin-left: auto; }
      
      .section { margin-top: 1rem; padding: 1rem; background: #f8fafc; border-radius: 0.5rem; border: 1px solid #cbd5e1; }
      .section h4 { margin: 0 0 0.5rem 0; font-size: 0.9rem; text-transform: uppercase; letter-spacing: 0.05em; color: #475569; }
      
      .process-list { list-style: none; padding: 0; margin-top: 1rem; font-size: 0.9rem; }
      .process-list li { margin-bottom: 0.5rem; padding-left: 1rem; border-left: 2px solid #cbd5e1; }
      
      .mermaid { margin: 1rem 0; text-align: center; }
    </style>
</head>
<body>
    <div class="container">
        <h1>${rootNode.label}</h1>
        <div class="meta">Generated: ${timestamp}</div>
        ${renderNode(rootNode, 0)}
    </div>
    
    <script type="module">
      import mermaid from 'https://cdn.jsdelivr.net/npm/mermaid@10/dist/mermaid.esm.min.mjs';
      mermaid.initialize({ startOnLoad: true, theme: 'neutral' });
    </script>
</body>
</html>
  `;
};

/**
 * Structured Document Generator (For Final Export)
 * Uses hierarchical numbering (1.0, 1.1, 1.1.1)
 */
export const generateStructuredDocument = (rootNode: MindMapData): string => {
    const timestamp = new Date().toLocaleString();
    
    const renderNodeStructured = (node: MindMapData, numberPrefix: string): string => {
        // Fallback: If userSummary is empty, try cachedDetails, else description
        const content = node.userSummary || node.cachedDetails || node.description || "No content provided.";
        
        // Determine Heading Level based on depth (number of dots + 1)
        // 1 -> H2, 1.1 -> H3, 1.1.1 -> H4
        const level = Math.min(numberPrefix.split('.').length + 1, 6);

        let html = `
            <div class="section" id="sec-${numberPrefix}">
                <h${level} class="header">
                    <span class="number">${numberPrefix}</span> ${node.label}
                </h${level}>
                <div class="content markdown-content">
                    ${content}
                </div>
            </div>
        `;

        if (node.children) {
            node.children.forEach((child, index) => {
                html += renderNodeStructured(child, `${numberPrefix}.${index + 1}`);
            });
        }
        
        return html;
    };

    // 1. Prepare Root Content (Introduction / Executive Summary)
    const rootContent = rootNode.userSummary || rootNode.cachedDetails || rootNode.description || "";

    // 2. Generate Body (Children as main numbered sections starting at 1, 2, 3...)
    let bodyHtml = '';
    if (rootNode.children) {
        rootNode.children.forEach((child, index) => {
            bodyHtml += renderNodeStructured(child, `${index + 1}`);
        });
    }

    return `
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Document: ${rootNode.label}</title>
    <script src="https://cdn.tailwindcss.com"></script>
    <script src="https://cdn.jsdelivr.net/npm/marked/marked.min.js"></script>
    <style>
        @import url('https://fonts.googleapis.com/css2?family=Inter:wght@300;400;600;800&display=swap');
        body { font-family: 'Inter', sans-serif; background: #fff; color: #1e293b; line-height: 1.6; }
        .page { max-width: 800px; margin: 0 auto; padding: 4rem 2rem; }
        
        /* Typography */
        h1.title { font-size: 2.5rem; font-weight: 800; color: #0f172a; border-bottom: 2px solid #0f172a; padding-bottom: 1rem; margin-bottom: 2rem; }
        .meta { color: #64748b; font-size: 0.875rem; margin-bottom: 4rem; }
        
        .header { margin-top: 3rem; color: #334155; font-weight: 700; display: flex; align-items: baseline; gap: 0.75rem; }
        .header .number { color: #94a3b8; font-family: monospace; font-size: 0.8em; }
        
        h2.header { font-size: 1.75rem; border-bottom: 1px solid #e2e8f0; padding-bottom: 0.5rem; margin-top: 4rem; }
        h3.header { font-size: 1.4rem; }
        h4.header { font-size: 1.15rem; }
        h5.header { font-size: 1rem; }

        .content { margin-top: 1rem; color: #475569; }
        
        /* Markdown Styles */
        .markdown-content p { margin-bottom: 1em; }
        .markdown-content ul { list-style: disc; padding-left: 1.5rem; margin-bottom: 1rem; }
        .markdown-content ol { list-style: decimal; padding-left: 1.5rem; margin-bottom: 1rem; }
        .markdown-content blockquote { border-left: 4px solid #cbd5e1; padding-left: 1rem; font-style: italic; color: #64748b; }
        .markdown-content table { width: 100%; border-collapse: collapse; margin: 1.5rem 0; font-size: 0.9rem; }
        .markdown-content th, .markdown-content td { border: 1px solid #e2e8f0; padding: 0.75rem; text-align: left; }
        .markdown-content th { background: #f8fafc; font-weight: 600; color: #334155; }
        
        /* Print optimizations */
        @media print {
            body { background: white; font-size: 11pt; }
            .page { padding: 0; max-width: none; }
            h2.header { page-break-before: always; }
        }
    </style>
</head>
<body>
    <div class="page">
        <h1 class="title">${rootNode.label}</h1>
        <div class="meta">Generated: ${timestamp} | MindMap 2 Doc</div>
        
        <!-- Root Intro / Executive Summary -->
        <div class="content markdown-content">
            ${rootContent}
        </div>
        
        <!-- Recursive Sections -->
        ${bodyHtml}
    </div>

    <script>
        // Render all markdown content client-side
        document.querySelectorAll('.markdown-content').forEach(el => {
            el.innerHTML = marked.parse(el.textContent.trim());
        });
    </script>
</body>
</html>
    `;
}
