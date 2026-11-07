import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import '@fontsource/bebas-neue/400.css';
import '@fontsource/inter/400.css';
import '@fontsource/inter/600.css';
import '@fontsource/inter/800.css';
import './styles/game.css';
import { GameScreen } from './components/GameScreen';

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <GameScreen />
  </StrictMode>,
);
