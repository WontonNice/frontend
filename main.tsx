// src/main.tsx
import React from 'react';
import ReactDOM from 'react-dom/client';
import AppWrapper from './App'; // Make sure your export matches this name
import './index.css';

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <AppWrapper />
  </React.StrictMode>
);
