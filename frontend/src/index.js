// frontend/src/index.js
import React from 'react';
import ReactDOM from 'react-dom/client';
import './index.css';
import App from './App';

import { ThemeProvider, createTheme } from '@mui/material/styles';
import { StylesProvider } from '@mui/styles'; // 🔥 importante
import CssBaseline from '@mui/material/CssBaseline';

// 👇 Define spacing explícitamente
const theme = createTheme({
  spacing: 8,
});

const root = ReactDOM.createRoot(document.getElementById('root'));

root.render(
  <React.StrictMode>
    <StylesProvider injectFirst> {/* ✅ Esto asegura que theme funcione con makeStyles */}
      <ThemeProvider theme={theme}>
        <CssBaseline />
        <App />
      </ThemeProvider>
    </StylesProvider>
  </React.StrictMode>
);
