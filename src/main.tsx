import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import '@fontsource/bodoni-moda/latin-400.css';
import '@fontsource/bodoni-moda/latin-600.css';
import '@fontsource/public-sans/latin-400.css';
import '@fontsource/public-sans/latin-500.css';
import '@fontsource/public-sans/latin-600.css';
import '@fontsource/dm-mono/latin-400.css';
import '@fontsource/dm-mono/latin-500.css';
import './styles/app.css';
import App from './App';

const root = document.getElementById('root');
if (!root) throw new Error('Root element not found');

createRoot(root).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
