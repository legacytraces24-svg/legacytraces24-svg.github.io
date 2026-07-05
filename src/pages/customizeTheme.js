import { createTheme } from '@mui/material/styles';

// Scoped to the Customize page only — rest of the app stays Tailwind.
// Mirrors the site's brand color (tailwind.config.js `primary: #00e676`) and fonts,
// light-mode base to match the editor's light background.
const customizeTheme = createTheme({
    palette: {
        mode: 'light',
        primary:   { main: '#00e676', contrastText: '#000000' },
        secondary: { main: '#1565c0' },
        background: {
            default: '#f9fafb', // gray-50
            paper:   '#ffffff',
        },
    },
    typography: {
        fontFamily: ['Inter', 'sans-serif'].join(','),
        button: { textTransform: 'none', fontWeight: 600 },
    },
    shape: { borderRadius: 12 },
    components: {
        MuiPaper: {
            styleOverrides: {
                root: { backgroundImage: 'none' },
            },
        },
        MuiTab: {
            styleOverrides: {
                root: { minHeight: 56, fontSize: '0.7rem', fontWeight: 600 },
            },
        },
    },
});

export default customizeTheme;
