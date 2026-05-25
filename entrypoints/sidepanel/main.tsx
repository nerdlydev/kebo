import React from 'react';
import ReactDOM from 'react-dom/client';
import '../../assets/tailwind.css';
import { CommandBar } from '../../components/CommandBar';
import { ThemeProvider } from '../../components/ThemeProvider';

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <ThemeProvider>
      <div className="h-screen w-full bg-neutral-900/90 backdrop-blur-md">
        <CommandBar />
      </div>
    </ThemeProvider>
  </React.StrictMode>
);
