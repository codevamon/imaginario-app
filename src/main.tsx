// src/main.tsx
import React from 'react';
import { createRoot } from 'react-dom/client';
import App from './App';
import { Capacitor } from '@capacitor/core';
import { CapacitorSQLite } from '@capacitor-community/sqlite';

if (Capacitor.getPlatform() === 'web') {
  window.addEventListener('DOMContentLoaded', async () => {
    const el = document.querySelector('jeep-sqlite') as any;
    await el?.componentOnReady?.();
    await CapacitorSQLite.initWebStore();
    console.log('[sqlite] web store inicializado');
  });
}

const container = document.getElementById('root')!;
createRoot(container).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
