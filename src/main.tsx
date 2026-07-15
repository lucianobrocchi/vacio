import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import App from './App';
import { seedConfig } from './db/config';
import './index.css';

// La config se seedea antes de montar para que App nunca la vea vacía.
seedConfig().then(() => {
  createRoot(document.getElementById('root')!).render(
    <StrictMode>
      <App />
    </StrictMode>,
  );
});
