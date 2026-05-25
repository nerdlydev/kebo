import React from 'react';
import ReactDOM from 'react-dom/client';
import '../../assets/tailwind.css';
import { CommandBar } from '../../components/CommandBar';

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <div className="h-screen w-full bg-neutral-900/90 backdrop-blur-md">
      <CommandBar />
    </div>
  </React.StrictMode>
);
