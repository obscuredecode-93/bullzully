/**
 * @fileoverview React application entry point.
 *
 * Mounts the React tree into the `#root` div defined in index.html.
 * StrictMode is kept enabled in development to surface side-effects and
 * deprecated API usage early, at the cost of double-invoking lifecycle hooks.
 * The App component handles this with a ref-guard on the Phaser instance.
 *
 * @module main
 */

import React     from 'react';
import ReactDOM  from 'react-dom/client';
import App       from './App.jsx';
import './index.css'; // Global resets and canvas pixel-art rendering rules.

/**
 * `createRoot` is the React 18 concurrent-mode API.
 * It replaces the legacy `ReactDOM.render` and enables automatic batching
 * and concurrent rendering features.
 */
ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
