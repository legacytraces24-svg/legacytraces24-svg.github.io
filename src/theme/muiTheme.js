import { createTheme } from '@mui/material/styles';

// App-wide MUI theme (light only) — mirrors the Tailwind brand tokens in
// tailwind.config.js / src/styles/index.css so any MUI component dropped
// into a page matches the rest of the site.
const muiTheme = createTheme({
    palette: {
        mode: 'light',
        primary:   { main: '#65A30D', contrastText: '#000000' },
        secondary: { main: '#1565c0' },
        background: {
            default: '#ffffff',
            paper:   '#ffffff',
        },
    },
    typography: {
        fontFamily: ['Inter', 'sans-serif'].join(','),
        button: { textTransform: 'none', fontWeight: 600 },
    },
    shape: { borderRadius: 12 },
});

export default muiTheme;
