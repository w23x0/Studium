import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { App } from './App.tsx';
import { initTheme } from './theme.ts';
import './styles.css';

initTheme();
const el = document.getElementById('root');
if (!el) throw new Error('页面缺 #root');
createRoot(el).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
