
import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';

/**
 * Entry Point
 * 
 * This file mounts the React application to the DOM.
 * It looks for the <div id="root"> element in index.html.
 */

const rootElement = document.getElementById('root');
if (!rootElement) {
  throw new Error("Could not find root element to mount to");
}

const root = ReactDOM.createRoot(rootElement);
root.render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
