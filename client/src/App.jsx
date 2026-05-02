import { useEffect, useRef } from 'react';
import Phaser from 'phaser';
import { createGameConfig } from './game/config';

export default function App() {
  const gameRef = useRef(null);

  useEffect(() => {
    if (gameRef.current) return;
    gameRef.current = new Phaser.Game(createGameConfig('game-container'));

    return () => {
      if (gameRef.current) {
        gameRef.current.destroy(true);
        gameRef.current = null;
      }
    };
  }, []);

  return (
    <div style={{
      width: '100vw',
      height: '100vh',
      background: '#000',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      overflow: 'hidden',
    }}>
      <div id="game-container" style={{ width: '100%', height: '100%' }} />
    </div>
  );
}
