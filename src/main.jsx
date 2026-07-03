import React from 'react';
import ReactDOM from 'react-dom/client';
import { HashRouter } from 'react-router-dom';
import { GoogleOAuthProvider } from '@react-oauth/google';
import App from './App.jsx';
import { ThemeProvider } from './context/ThemeContext';
import { FavoritesProvider } from './context/FavoritesContext';
import './styles/index.css';

const clientId = import.meta.env.VITE_GOOGLE_CLIENT_ID || "YOUR_GOOGLE_CLIENT_ID";

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <HashRouter>
      <GoogleOAuthProvider clientId={clientId}>
        <ThemeProvider>
          <FavoritesProvider>
            <App />
          </FavoritesProvider>
        </ThemeProvider>
      </GoogleOAuthProvider>
    </HashRouter>
  </React.StrictMode>,
);
