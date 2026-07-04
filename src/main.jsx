import React from 'react';
import ReactDOM from 'react-dom/client';
import { HashRouter } from 'react-router-dom';
import { GoogleOAuthProvider } from '@react-oauth/google';
import { ThemeProvider as MuiThemeProvider } from '@mui/material/styles';
import CssBaseline from '@mui/material/CssBaseline';
import App from './App.jsx';
import { ThemeProvider } from './context/ThemeContext';
import { FavoritesProvider } from './context/FavoritesContext';
import muiTheme from './theme/muiTheme';
import './styles/index.css';

const clientId = import.meta.env.VITE_GOOGLE_CLIENT_ID || "YOUR_GOOGLE_CLIENT_ID";

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <HashRouter>
      <GoogleOAuthProvider clientId={clientId}>
        <MuiThemeProvider theme={muiTheme}>
          <CssBaseline />
          <ThemeProvider>
            <FavoritesProvider>
              <App />
            </FavoritesProvider>
          </ThemeProvider>
        </MuiThemeProvider>
      </GoogleOAuthProvider>
    </HashRouter>
  </React.StrictMode>,
);
