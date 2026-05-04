/**
 * @fileoverview Root React component — the thin wrapper between React and Phaser.
 *
 * React's only job here is to:
 *  1. Render a full-screen `div#game-container` that Phaser can mount its canvas into.
 *  2. Create the Phaser.Game instance once on mount.
 *  3. Destroy the Phaser instance cleanly on unmount (e.g., hot-module reload).
 *
 * All actual game logic lives inside Phaser scenes — React doesn't drive the game loop.
 *
 * @module App
 */

import { useEffect, useRef } from 'react';
import Phaser from 'phaser';
import { createGameConfig } from './game/config';

/**
 * App — singleton root component.
 *
 * The `useRef` + `useEffect` pattern ensures Phaser.Game is constructed exactly
 * once per mount even in React 18 Strict Mode, which double-invokes effects in
 * development. The `if (gameRef.current) return` guard prevents a second game
 * instance from being created on the second invocation.
 *
 * @returns {JSX.Element} A full-viewport container div that Phaser attaches to.
 */
export default function App() {
  /** Holds the Phaser.Game instance so the cleanup function can destroy it. */
  const gameRef = useRef(null);

  useEffect(() => {
    // Guard against double-mount in React Strict Mode.
    if (gameRef.current) return;

    /**
     * Create the Phaser game and attach it to the div with id="game-container".
     * Phaser's Scale Manager (configured in createGameConfig) handles resizing
     * the canvas to fill the parent div.
     */
    gameRef.current = new Phaser.Game(createGameConfig('game-container'));

    /**
     * Cleanup: called when the component unmounts (e.g., during hot reload).
     * `destroy(true)` removes the canvas from the DOM and frees WebGL resources.
     */
    return () => {
      if (gameRef.current) {
        gameRef.current.destroy(true);
        gameRef.current = null;
      }
    };
  }, []); // Empty deps — run once on mount, clean up on unmount.

  return (
    /**
     * Outer div fills the entire viewport and centres the canvas.
     * The black background is visible in the letterbox/pillarbox areas
     * when the game's 5:3 aspect ratio doesn't match the browser window.
     */
    <div style={{
      width:           '100vw',
      height:          '100vh',
      background:      '#000',
      display:         'flex',
      alignItems:      'center',
      justifyContent:  'center',
      overflow:        'hidden', // Prevents scrollbars from appearing during resize.
    }}>
      {/**
       * Phaser injects its <canvas> element here.
       * width/height 100% lets the Scale Manager use the full available space.
       */}
      <div id="game-container" style={{ width: '100%', height: '100%' }} />
    </div>
  );
}
