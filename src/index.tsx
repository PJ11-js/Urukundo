import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';

// Bloquer la navigation arrière sur mobile
history.pushState(null, '', window.location.href);
window.addEventListener('popstate', () => {
  history.pushState(null, '', window.location.href);
});

const rootElement = document.getElementById('root');
if (!rootElement) throw new Error('Could not find root element');

ReactDOM.createRoot(rootElement).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
