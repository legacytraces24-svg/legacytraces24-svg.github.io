import React, { useState, useRef, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useUser } from '../context/UserContext';
import { fabric } from 'fabric';
import { submitCustomOrder } from '../api/api';
import SEO from '../components/SEO';
import { Swiper, SwiperSlide } from 'swiper/react';
import { Pagination } from 'swiper/modules';
import 'swiper/css';
import 'swiper/css/pagination';
import {
    Upload, Type, Trash2, ArrowLeft, AlertCircle,
    CheckCircle, RotateCw, Shirt, Plus, Minus, Image as ImageIcon,
    ArrowUpCircle, ArrowDownCircle, Bold, Italic, Underline,
} from 'lucide-react';
import { ThemeProvider } from '@mui/material/styles';
import AppBar from '@mui/material/AppBar';
import Toolbar from '@mui/material/Toolbar';
import Tabs from '@mui/material/Tabs';
import Tab from '@mui/material/Tab';
import Paper from '@mui/material/Paper';
import Box from '@mui/material/Box';
import IconButton from '@mui/material/IconButton';
import Button from '@mui/material/Button';
import TextField from '@mui/material/TextField';
import Select from '@mui/material/Select';
import MenuItem from '@mui/material/MenuItem';
import Slider from '@mui/material/Slider';
import ToggleButton from '@mui/material/ToggleButton';
import ToggleButtonGroup from '@mui/material/ToggleButtonGroup';
import Fade from '@mui/material/Fade';
import Typography from '@mui/material/Typography';
import Card from '@mui/material/Card';
import CardActionArea from '@mui/material/CardActionArea';
import customizeTheme from './customizeTheme';

const TOOL_TABS = ['shirt', 'text', 'image'];

// ── Constants ──────────────────────────────────────────────────────────────────

const CANVAS_W = 500;
const CANVAS_H = 600;

const SHIRT_PHOTOS = {
    tshirt: {
        white:  { front: '/assets/Men/T-Shirts/white-oversize-tshirt-front.jpg',  back: '/assets/Men/T-Shirts/white-oversize-tshirt-back.jpg' },
        black:  { front: '/assets/Men/T-Shirts/black-oversize-tshirt-front.jpg',  back: '/assets/Men/T-Shirts/black-oversize-tshirt-back.jpg' },
        blue:   { front: '/assets/Men/T-Shirts/blue-oversize-tshirt-front.jpg',   back: '/assets/Men/T-Shirts/blue-oversize-tshirt-back.jpg' },
        grey:   { front: '/assets/Men/T-Shirts/grey-oversize-tshirt-front.jpg',   back: '/assets/Men/T-Shirts/grey-oversize-tshirt-back.jpg' },
        orange: { front: '/assets/Men/T-Shirts/orange-oversize-tshirt-front.jpg', back: '/assets/Men/T-Shirts/orange-oversize-tshirt-back.jpg' },
        red:    { front: '/assets/Men/T-Shirts/red-oversize-tshirt-front.jpg',    back: '/assets/Men/T-Shirts/red-oversize-tshirt-back.jpg' },
    },
    hoodie: {
        white:  { front: '/assets/Men/Hoodie/white-hoodie-front.jpg',  back: '/assets/Men/Hoodie/white-hoodie-back.jpg' },
        black:  { front: '/assets/Men/Hoodie/black-hoodie-front.jpg',  back: '/assets/Men/Hoodie/black-hoodie-back.jpg' },
        blue:   { front: '/assets/Men/Hoodie/blue-hoodie-front.jpg',   back: '/assets/Men/Hoodie/blue-hoodie-back.jpg' },
        grey:   { front: '/assets/Men/Hoodie/grey-hoodie-front.jpg',   back: '/assets/Men/Hoodie/grey-hoodie-back.jpg' },
        orange: { front: '/assets/Men/Hoodie/orange-hoodie-front.jpg', back: '/assets/Men/Hoodie/orange-hoodie-back.jpg' },
        red:    { front: '/assets/Men/Hoodie/red-hoodie-front.jpg',    back: '/assets/Men/Hoodie/red-hoodie-back.jpg' },
    },
};

const COLOR_SWATCHES = [
    { id: 'white',  hex: '#efefef', label: 'White' },
    { id: 'black',  hex: '#1a1a1a', label: 'Black' },
    { id: 'blue',   hex: '#1565c0', label: 'Royal Blue' },
    { id: 'grey',   hex: '#757575', label: 'Grey' },
    { id: 'orange', hex: '#e65100', label: 'Orange' },
    { id: 'red',    hex: '#c62828', label: 'Cherry Red' },
];

const FONTS = ['Arial','Georgia','Impact','Times New Roman','Courier New','Verdana','Trebuchet MS','Comic Sans MS'];
const SIZES = ['S','M','L','XL','XXL'];

// ── Helpers ────────────────────────────────────────────────────────────────────

function getShirtSrc(product, color, side) {
    return SHIRT_PHOTOS[product]?.[color]?.[side]
        ?? SHIRT_PHOTOS.tshirt.white.front;
}

async function compressFile(file, maxPx = 500, quality = 0.78) {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = ({ target: { result } }) => {
            const img = new Image();
            img.onload = () => {
                const scale = Math.min(1, maxPx / Math.max(img.width, img.height));
                const c = document.createElement('canvas');
                c.width  = Math.round(img.width  * scale);
                c.height = Math.round(img.height * scale);
                c.getContext('2d').drawImage(img, 0, 0, c.width, c.height);
                resolve(c.toDataURL('image/jpeg', quality));
            };
            img.onerror = reject;
            img.src = result;
        };
        reader.onerror = reject;
        reader.readAsDataURL(file);
    });
}

async function compressDataUrl(dataUrl, maxPx = 500, quality = 0.75) {
    return new Promise((resolve) => {
        const img = new Image();
        img.onload = () => {
            const scale = Math.min(1, maxPx / Math.max(img.width, img.height));
            const c = document.createElement('canvas');
            c.width  = Math.round(img.width  * scale);
            c.height = Math.round(img.height * scale);
            c.getContext('2d').drawImage(img, 0, 0, c.width, c.height);
            resolve(c.toDataURL('image/jpeg', quality));
        };
        img.src = dataUrl;
    });
}

// ── Main Component ─────────────────────────────────────────────────────────────

export default function Customize() {
    const navigate  = useNavigate();
    const { user }  = useUser();

    // ── Views ─────────────────────────────────────────────────────────────────
    const [view, setView] = useState('select'); // 'select' | 'editor' | 'success'

    // ── Shirt options ─────────────────────────────────────────────────────────
    const [product, setProduct] = useState('tshirt');
    const [color,   setColor]   = useState('white');
    const [isBack,  setIsBack]  = useState(false);

    // ── Fabric.js refs ────────────────────────────────────────────────────────
    const canvasElRef  = useRef(null);
    const fabricRef    = useRef(null);
    const containerRef = useRef(null);
    const shirtImgRef  = useRef(null);
    const frontJsonRef = useRef(null);
    const backJsonRef  = useRef(null);

    // ── Selection state ───────────────────────────────────────────────────────
    const [activeObj, setActiveObj] = useState(null);

    // ── Tool tabs ─────────────────────────────────────────────────────────────
    const [toolTab, setToolTab] = useState('shirt'); // 'shirt' | 'text' | 'image'
    const toolSwiperRef = useRef(null);

    // ── Text controls ─────────────────────────────────────────────────────────
    const [textInput,   setTextInput]   = useState('');
    const [fontSize,    setFontSize]    = useState(40);
    const [fontFamily,  setFontFamily]  = useState('Arial');
    const [textColor,   setTextColor]   = useState('#000000');
    const [isBold,      setIsBold]      = useState(false);
    const [isItalic,    setIsItalic]    = useState(false);
    const [isUnderline, setIsUnderline] = useState(false);

    // ── Sizes ─────────────────────────────────────────────────────────────────
    const [sizes, setSizes] = useState({ S:0, M:0, L:0, XL:0, XXL:0 });
    const totalPcs = SIZES.reduce((sum, sz) => sum + sizes[sz], 0);

    // ── Notes ─────────────────────────────────────────────────────────────────
    const [notes, setNotes] = useState('');

    // ── Submit ────────────────────────────────────────────────────────────────
    const [submitting,   setSubmitting]   = useState(false);
    const [formError,    setFormError]    = useState('');
    const [submittedId,  setSubmittedId]  = useState(null);

    // ── Derived ───────────────────────────────────────────────────────────────
    const shirtSrc = getShirtSrc(product, color, isBack ? 'back' : 'front');

    // ── Fabric.js init ────────────────────────────────────────────────────────
    useEffect(() => {
        if (view !== 'editor') return;
        if (fabricRef.current) return;

        const fc = new fabric.Canvas(canvasElRef.current, {
            width:  CANVAS_W,
            height: CANVAS_H,
            preserveObjectStacking: true,
            selection: true,
        });

        fc.on('selection:created', e => {
            const obj = e.selected[0];
            if (obj._isPrintArea) return;
            setActiveObj(obj);
            if (obj.type === 'i-text') setToolTab('text');
        });
        fc.on('selection:updated', e => {
            const obj = e.selected[0];
            if (!obj._isPrintArea) setActiveObj(obj);
        });
        fc.on('selection:cleared',  () => setActiveObj(null));
        fc.on('object:modified',    e  => { if (!e.target._isPrintArea) setActiveObj(e.target); });

        // Print area guide
        fc.add(new fabric.Rect({
            left: 125, top: 140, width: 250, height: 240,
            fill: 'transparent',
            stroke: 'rgba(100,149,237,0.55)',
            strokeWidth: 1.5,
            strokeDashArray: [6, 4],
            selectable: false,
            evented: false,
            _isPrintArea: true,
        }));

        fabricRef.current = fc;
        requestAnimationFrame(() => resizeCanvas(fc));

        return () => {
            fc.dispose();
            fabricRef.current = null;
        };
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [view]);

    // ── Resize handler ────────────────────────────────────────────────────────
    const resizeCanvas = useCallback((fc) => {
        const el = containerRef.current;
        if (!fc || !el) return;
        const w = el.clientWidth;
        if (!w) return;
        const scale = Math.min(w / CANVAS_W, 1);
        fc.setZoom(scale);
        fc.setWidth(Math.round(CANVAS_W * scale));
        fc.setHeight(Math.round(CANVAS_H * scale));
        fc.renderAll();
    }, []);

    useEffect(() => {
        if (view !== 'editor' || !containerRef.current) return;
        const ro = new ResizeObserver(() => {
            if (fabricRef.current) resizeCanvas(fabricRef.current);
        });
        ro.observe(containerRef.current);
        return () => ro.disconnect();
    }, [view, resizeCanvas]);

    // ── Front / Back flip ─────────────────────────────────────────────────────
    const handleFlip = useCallback(() => {
        const fc = fabricRef.current;
        if (!fc) return;

        const designObjects = fc.getObjects().filter(o => !o._isPrintArea);
        const json = JSON.stringify(fc.toJSON(['_isPrintArea']));

        if (!isBack) {
            frontJsonRef.current = json;
            designObjects.forEach(o => fc.remove(o));
            if (backJsonRef.current) {
                const parsed = JSON.parse(backJsonRef.current);
                parsed.objects = (parsed.objects || []).filter(o => !o._isPrintArea);
                fc.loadFromJSON(JSON.stringify(parsed), () => fc.renderAll());
            }
        } else {
            backJsonRef.current = json;
            designObjects.forEach(o => fc.remove(o));
            if (frontJsonRef.current) {
                const parsed = JSON.parse(frontJsonRef.current);
                parsed.objects = (parsed.objects || []).filter(o => !o._isPrintArea);
                fc.loadFromJSON(JSON.stringify(parsed), () => fc.renderAll());
            }
        }
        setIsBack(p => !p);
        setActiveObj(null);
    }, [isBack]);

    // ── Add text ──────────────────────────────────────────────────────────────
    const addText = () => {
        const fc = fabricRef.current;
        if (!fc || !textInput.trim()) return;
        const text = new fabric.IText(textInput, {
            left: CANVAS_W / 2,
            top:  CANVAS_H / 2,
            originX: 'center',
            originY: 'center',
            fontFamily,
            fontSize,
            fill: textColor,
            fontWeight:  isBold      ? 'bold'   : 'normal',
            fontStyle:   isItalic    ? 'italic' : 'normal',
            underline:   isUnderline,
            hasRotatingPoint: true,
        });
        fc.add(text);
        fc.setActiveObject(text);
        fc.renderAll();
        setActiveObj(text);
        setTextInput('');
    };

    // Update selected text when format controls change
    useEffect(() => {
        const obj = activeObj;
        if (!obj || obj.type !== 'i-text' || !fabricRef.current) return;
        obj.set({
            fontFamily,
            fontSize,
            fill:       textColor,
            fontWeight: isBold      ? 'bold'   : 'normal',
            fontStyle:  isItalic    ? 'italic' : 'normal',
            underline:  isUnderline,
        });
        fabricRef.current.renderAll();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [fontFamily, fontSize, textColor, isBold, isItalic, isUnderline]);

    // Sync format controls when text selected
    useEffect(() => {
        if (!activeObj || activeObj.type !== 'i-text') return;
        setFontFamily(activeObj.fontFamily || 'Arial');
        setFontSize(activeObj.fontSize    || 40);
        setTextColor(activeObj.fill       || '#000000');
        setIsBold(activeObj.fontWeight    === 'bold');
        setIsItalic(activeObj.fontStyle   === 'italic');
        setIsUnderline(!!activeObj.underline);
    }, [activeObj]);

    // ── Image upload ──────────────────────────────────────────────────────────
    const handleImageUpload = async (e) => {
        const file = e.target.files?.[0];
        e.target.value = '';
        if (!file || !fabricRef.current) return;
        try {
            const dataUrl = await compressFile(file, 500, 0.78);
            addImageToCanvas(dataUrl);
        } catch { /* ignore */ }
    };

    const addImageToCanvas = (src) => {
        const fc = fabricRef.current;
        if (!fc) return;
        fabric.Image.fromURL(src, (img) => {
            const maxSide = 200;
            const scale   = Math.min(maxSide / img.width, maxSide / img.height);
            img.set({
                left: CANVAS_W / 2, top: CANVAS_H / 2,
                originX: 'center',  originY: 'center',
                scaleX: scale,      scaleY: scale,
                hasRotatingPoint: true,
            });
            fc.add(img);
            fc.setActiveObject(img);
            fc.renderAll();
            setActiveObj(img);
        }, { crossOrigin: 'anonymous' });
    };

    // ── Layer controls ────────────────────────────────────────────────────────
    const deleteSelected = () => {
        const fc  = fabricRef.current;
        const obj = fc?.getActiveObject();
        if (!obj || obj._isPrintArea) return;
        fc.remove(obj);
        fc.discardActiveObject();
        fc.renderAll();
        setActiveObj(null);
    };
    const bringForward = () => {
        const obj = fabricRef.current?.getActiveObject();
        if (obj && !obj._isPrintArea) { obj.bringForward(); fabricRef.current.renderAll(); }
    };
    const sendBackward = () => {
        const obj = fabricRef.current?.getActiveObject();
        if (obj && !obj._isPrintArea) { obj.sendBackwards(); fabricRef.current.renderAll(); }
    };

    // ── Build composite preview image ─────────────────────────────────────────
    const loadImageAsync = (src) => new Promise((resolve, reject) => {
        const img = new Image();
        img.onload  = () => resolve(img);
        img.onerror = reject;
        img.src = src;
    });

    // Renders ONE side (shirt photo + that side's saved design JSON) onto an
    // offscreen canvas, independent of whatever is currently loaded on the live
    // editor canvas — so the front's design isn't lost when the back is active.
    const renderSideComposite = async (side) => {
        const outC = document.createElement('canvas');
        outC.width  = CANVAS_W;
        outC.height = CANVAS_H;
        const ctx = outC.getContext('2d');

        const shirtImg = await loadImageAsync(getShirtSrc(product, color, side)).catch(() => null);
        if (shirtImg) ctx.drawImage(shirtImg, 0, 0, CANVAS_W, CANVAS_H);

        const json = side === 'front' ? frontJsonRef.current : backJsonRef.current;
        if (json) {
            const offscreenEl = document.createElement('canvas');
            const staticCanvas = new fabric.StaticCanvas(offscreenEl, { width: CANVAS_W, height: CANVAS_H });
            const parsed = JSON.parse(json);
            parsed.objects = (parsed.objects || []).filter(o => !o._isPrintArea);
            await new Promise(resolve => staticCanvas.loadFromJSON(JSON.stringify(parsed), resolve));
            staticCanvas.renderAll();
            const designUrl = staticCanvas.toDataURL({ format: 'png', multiplier: 1 });
            staticCanvas.dispose();

            const designImg = await loadImageAsync(designUrl).catch(() => null);
            if (designImg) ctx.drawImage(designImg, 0, 0, CANVAS_W, CANVAS_H);
        }
        return outC;
    };

    // Combines front + back into a single side-by-side image so admin always
    // sees both sides regardless of which one was active when the quote was submitted.
    const buildComposite = async () => {
        const [frontCanvas, backCanvas] = await Promise.all([
            renderSideComposite('front'),
            renderSideComposite('back'),
        ]);

        const gap = 16;
        const combined = document.createElement('canvas');
        combined.width  = CANVAS_W * 2 + gap;
        combined.height = CANVAS_H;
        const ctx = combined.getContext('2d');
        ctx.fillStyle = '#111827';
        ctx.fillRect(0, 0, combined.width, combined.height);
        ctx.drawImage(frontCanvas, 0, 0);
        ctx.drawImage(backCanvas, CANVAS_W + gap, 0);

        return combined.toDataURL('image/jpeg', 0.85);
    };

    // ── Submit quote ──────────────────────────────────────────────────────────
    const handleGetQuote = async () => {
        if (!user?.idToken) { navigate('/login'); return; }
        if (totalPcs < 1) { setFormError('Please specify at least 1 piece.'); return; }
        setFormError('');
        setSubmitting(true);

        try {
            // Save current side
            const fc = fabricRef.current;
            if (fc) {
                const json = JSON.stringify(fc.toJSON(['_isPrintArea']));
                if (!isBack) frontJsonRef.current = json;
                else         backJsonRef.current  = json;
            }

            const composite = await buildComposite();
            // Wider max size since this is now front+back side-by-side, not a single shirt
            const designImage = composite ? await compressDataUrl(composite, 900, 0.75) : null;

            const orderDetails = JSON.stringify({
                type: 'customizer',
                product,
                color,
                sizes: SIZES.filter(s => sizes[s] > 0).map(s => ({ size: s, qty: sizes[s] })),
                frontJson: frontJsonRef.current || null,
                backJson:  backJsonRef.current  || null,
            });

            const res = await submitCustomOrder({
                idToken:    user.idToken,
                orderType:  'jersey',
                shirtColor: color,
                shirtStyle: 'oversized',
                designImage,
                orderDetails,
                notes,
            });

            if (!res?.success) throw new Error(res?.error || 'Submission failed');
            setSubmittedId(res.id);
            setView('success');
        } catch (err) {
            setFormError(err.message || 'Something went wrong. Please try again.');
        } finally {
            setSubmitting(false);
        }
    };

    // ── Tool panel content ────────────────────────────────────────────────────
    // Floating Canva-style context toolbar — appears over the canvas whenever an
    // object is selected, instead of being buried inside each side-panel tab.
    const showFloatingToolbar = !!activeObj && !activeObj._isPrintArea;
    const renderFloatingToolbar = () => (
        <Fade in={showFloatingToolbar} unmountOnExit>
            <Paper
                elevation={6}
                sx={{
                    position: 'absolute', top: 8, left: '50%', transform: 'translateX(-50%)',
                    zIndex: 20, display: 'flex', gap: 0.5, p: 0.5, borderRadius: 999,
                    bgcolor: 'rgba(17,24,39,0.92)', backdropFilter: 'blur(6px)',
                }}
            >
                <IconButton size="small" title="Bring forward" onClick={bringForward} sx={{ color: 'grey.300' }}>
                    <ArrowUpCircle size={16} />
                </IconButton>
                <IconButton size="small" title="Send backward" onClick={sendBackward} sx={{ color: 'grey.300' }}>
                    <ArrowDownCircle size={16} />
                </IconButton>
                <IconButton size="small" title="Delete" onClick={deleteSelected} sx={{ color: 'error.light' }}>
                    <Trash2 size={16} />
                </IconButton>
            </Paper>
        </Fade>
    );

    const renderShirtPanel = () => (
        <>
            <Box>
                <Typography variant="caption" sx={{ color: 'grey.500', fontWeight: 700, letterSpacing: 1, textTransform: 'uppercase', mb: 1, display: 'block' }}>Color</Typography>
                <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
                    {COLOR_SWATCHES.map(c => (
                        <Box
                            key={c.id}
                            component="button"
                            title={c.label}
                            onClick={() => setColor(c.id)}
                            sx={{
                                width: 32, height: 32, borderRadius: '50%', cursor: 'pointer',
                                bgcolor: c.hex, border: '2px solid',
                                borderColor: color === c.id ? 'primary.main' : 'grey.300',
                                transform: color === c.id ? 'scale(1.12)' : 'none',
                                boxShadow: color === c.id ? '0 0 0 3px rgba(0,230,118,0.25)' : 'none',
                                transition: 'all .15s',
                            }}
                        />
                    ))}
                </Box>
            </Box>

            <Box>
                <Typography variant="caption" sx={{ color: 'grey.500', fontWeight: 700, letterSpacing: 1, textTransform: 'uppercase', mb: 1, display: 'block' }}>Quantity per Size</Typography>
                <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
                    {SIZES.map(sz => (
                        <Box key={sz} sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                            <Typography sx={{ width: 32, fontFamily: 'monospace', fontSize: 14, color: 'grey.700' }}>{sz}</Typography>
                            <IconButton size="small" onClick={() => setSizes(p => ({ ...p, [sz]: Math.max(0, p[sz] - 1) }))} sx={{ bgcolor: 'grey.100', borderRadius: 2, '&:hover': { bgcolor: 'grey.200' } }}>
                                <Minus size={11} />
                            </IconButton>
                            <Typography sx={{ width: 24, textAlign: 'center', fontFamily: 'monospace', fontSize: 14 }}>{sizes[sz]}</Typography>
                            <IconButton size="small" onClick={() => setSizes(p => ({ ...p, [sz]: p[sz] + 1 }))} sx={{ bgcolor: 'grey.100', borderRadius: 2, '&:hover': { bgcolor: 'grey.200' } }}>
                                <Plus size={11} />
                            </IconButton>
                        </Box>
                    ))}
                </Box>
                <Typography variant="caption" sx={{ color: 'grey.500', mt: 1, display: 'block' }}>
                    Total: <Box component="span" sx={{ color: 'grey.700', fontFamily: 'monospace' }}>{totalPcs}</Box> pcs
                </Typography>
            </Box>

            <TextField
                label="Notes to Admin"
                value={notes}
                onChange={e => setNotes(e.target.value)}
                multiline
                minRows={3}
                fullWidth
                size="small"
                placeholder="Special instructions, references, deadline…"
            />
        </>
    );

    const renderTextPanel = () => (
        <>
            {/* ── Add text input ── */}
            <Paper variant="outlined" sx={{ p: 1.5, borderColor: 'grey.200', bgcolor: '#ffffff' }}>
                <Typography variant="body2" sx={{ fontWeight: 700, display: 'flex', alignItems: 'center', gap: 0.75, mb: 1 }}>
                    <Type size={14} color="#00e676" /> Add Text to Design
                </Typography>
                <TextField
                    value={textInput}
                    onChange={e => setTextInput(e.target.value)}
                    onKeyDown={e => e.key === 'Enter' && addText()}
                    placeholder="Type your text here…"
                    fullWidth
                    size="small"
                    sx={{ mb: 1.5 }}
                />
                <Button
                    onClick={addText}
                    disabled={!textInput.trim()}
                    variant="contained"
                    fullWidth
                    startIcon={<Plus size={15} />}
                >
                    Add Text to Canvas
                </Button>
                <Typography variant="caption" sx={{ color: 'grey.500', display: 'block', textAlign: 'center', mt: 1 }}>
                    Tip: Double-click text on canvas to edit it directly
                </Typography>
            </Paper>

            {/* ── Font ── */}
            <Box>
                <Typography variant="caption" sx={{ color: 'grey.500', fontWeight: 700, letterSpacing: 1, textTransform: 'uppercase', mb: 1, display: 'block' }}>Font</Typography>
                <Select value={fontFamily} onChange={e => setFontFamily(e.target.value)} fullWidth size="small">
                    {FONTS.map(f => <MenuItem key={f} value={f} sx={{ fontFamily: f }}>{f}</MenuItem>)}
                </Select>
            </Box>

            {/* ── Size ── */}
            <Box>
                <Typography variant="caption" sx={{ color: 'grey.500', fontWeight: 700, letterSpacing: 1, textTransform: 'uppercase', mb: 1, display: 'block' }}>
                    Size — <Box component="span" sx={{ color: 'grey.900', fontFamily: 'monospace' }}>{fontSize}px</Box>
                </Typography>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                    <IconButton size="small" onClick={() => setFontSize(s => Math.max(10, s - 2))} sx={{ bgcolor: 'grey.100' }}><Minus size={12} /></IconButton>
                    <Slider
                        value={fontSize}
                        min={10}
                        max={120}
                        onChange={(e, v) => setFontSize(v)}
                        size="small"
                        sx={{ flex: 1 }}
                    />
                    <IconButton size="small" onClick={() => setFontSize(s => Math.min(200, s + 2))} sx={{ bgcolor: 'grey.100' }}><Plus size={12} /></IconButton>
                </Box>
            </Box>

            {/* ── Style ── */}
            <Box>
                <Typography variant="caption" sx={{ color: 'grey.500', fontWeight: 700, letterSpacing: 1, textTransform: 'uppercase', mb: 1, display: 'block' }}>Style</Typography>
                <ToggleButtonGroup fullWidth size="small" sx={{ '& .MuiToggleButton-root': { flex: 1 } }}>
                    <ToggleButton value="bold" selected={isBold} onChange={() => setIsBold(b => !b)}>
                        <Bold size={15} />
                    </ToggleButton>
                    <ToggleButton value="italic" selected={isItalic} onChange={() => setIsItalic(i => !i)}>
                        <Italic size={15} />
                    </ToggleButton>
                    <ToggleButton value="underline" selected={isUnderline} onChange={() => setIsUnderline(u => !u)}>
                        <Underline size={15} />
                    </ToggleButton>
                </ToggleButtonGroup>
            </Box>

            {/* ── Color ── */}
            <Box>
                <Typography variant="caption" sx={{ color: 'grey.500', fontWeight: 700, letterSpacing: 1, textTransform: 'uppercase', mb: 1, display: 'block' }}>Text Color</Typography>
                <Paper variant="outlined" sx={{ display: 'flex', alignItems: 'center', gap: 1.5, px: 1.5, py: 1, borderColor: 'grey.200', bgcolor: '#ffffff' }}>
                    <Box
                        component="input"
                        type="color"
                        value={textColor}
                        onChange={e => setTextColor(e.target.value)}
                        sx={{ width: 36, height: 36, borderRadius: 1, cursor: 'pointer', border: 0, bgcolor: 'transparent', p: 0 }}
                    />
                    <Typography variant="body2" sx={{ fontFamily: 'monospace' }}>{textColor.toUpperCase()}</Typography>
                </Paper>
            </Box>
        </>
    );

    const renderImagePanel = () => (
        <>
            <Box>
                <Typography variant="caption" sx={{ color: 'grey.500', fontWeight: 700, letterSpacing: 1, textTransform: 'uppercase', mb: 1, display: 'block' }}>Upload Image</Typography>
                <Button
                    component="label"
                    fullWidth
                    sx={{
                        flexDirection: 'column', gap: 1, py: 3, bgcolor: 'grey.100',
                        border: '1px dashed', borderColor: 'grey.300', color: 'grey.600',
                        '&:hover': { bgcolor: 'grey.200', borderColor: 'primary.main' },
                    }}
                >
                    <Upload size={20} color="#00e676" />
                    <Typography variant="body2" sx={{ fontWeight: 600 }}>Choose file</Typography>
                    <Typography variant="caption" sx={{ color: 'grey.500' }}>PNG, JPG, SVG</Typography>
                    <input type="file" accept="image/*" hidden onChange={handleImageUpload} />
                </Button>
                <Typography variant="caption" sx={{ color: 'grey.500', mt: 1, display: 'block' }}>
                    Tip: Use PNG with transparent background for best results
                </Typography>
            </Box>
        </>
    );

    // ─────────────────────────────────────────────────────────────────────────
    // SELECT VIEW
    // ─────────────────────────────────────────────────────────────────────────
    if (view === 'select') {
        return (
            <ThemeProvider theme={customizeTheme}>
            <div className="min-h-[60vh] bg-gray-50 text-gray-900 flex flex-col items-center justify-center px-4 py-8">
            <SEO
                title="Design Custom T-Shirts &amp; Hoodies Online – Free Quote"
                description="Create your own custom t-shirt or hoodie with our online design tool. Add text, logos &amp; images. Place print on front &amp; back. Get a free price quote. Perfect for teams, events &amp; gifts. Ships across India."
                keywords="custom t-shirt design online, design your own t-shirt, custom hoodie printing, t-shirt printing India, custom t-shirt maker, personalised t-shirts, bulk t-shirt printing, custom jersey design"
                jsonLd={{
                    '@context': 'https://schema.org',
                    '@type': 'Service',
                    'name': 'Custom T-Shirt & Hoodie Design Service',
                    'url': 'https://www.legacytraces.com/#/customize',
                    'provider': { '@id': 'https://www.legacytraces.com/#organization' },
                    'description': 'Design your own custom t-shirt or hoodie online. Add text and images, choose colours, and get a personalised price quote from Legacy Traces.',
                    'serviceType': 'Custom T-Shirt Printing',
                    'areaServed': { '@type': 'Country', 'name': 'India' },
                    'availableChannel': {
                        '@type': 'ServiceChannel',
                        'serviceUrl': 'https://www.legacytraces.com/#/customize',
                        'serviceType': 'Online Designer Tool'
                    },
                    'breadcrumb': {
                        '@type': 'BreadcrumbList',
                        'itemListElement': [
                            { '@type': 'ListItem', 'position': 1, 'name': 'Home',      'item': 'https://www.legacytraces.com/' },
                            { '@type': 'ListItem', 'position': 2, 'name': 'Customize', 'item': 'https://www.legacytraces.com/#/customize' }
                        ]
                    }
                }}
            />
                <div className="w-full max-w-lg">
                    <h1 className="text-3xl font-bold text-center mb-2">Design Your Own</h1>
                    <p className="text-gray-500 text-center text-sm mb-10">
                        Place your text & images on a shirt, then get a custom quote from us.
                    </p>

                    <Box sx={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 2, mb: 3 }}>
                        {[
                            { id: 'tshirt', icon: '👕', label: 'T-Shirt', sub: 'Oversized Fit' },
                            { id: 'hoodie', icon: '🧥', label: 'Hoodie',  sub: 'Pullover style' },
                        ].map(p => (
                            <Card key={p.id} variant="outlined" sx={{ bgcolor: '#ffffff', borderColor: 'grey.200', borderRadius: 4 }}>
                                <CardActionArea
                                    onClick={() => { setProduct(p.id); setView('editor'); setIsBack(false); frontJsonRef.current = null; backJsonRef.current = null; }}
                                    sx={{
                                        display: 'flex', flexDirection: 'column', gap: 1.5, py: 4, px: 2,
                                        '&:hover': { bgcolor: 'grey.100' },
                                    }}
                                >
                                    <Typography sx={{ fontSize: 40 }}>{p.icon}</Typography>
                                    <Typography sx={{ fontWeight: 700, fontSize: 18 }}>{p.label}</Typography>
                                    <Typography variant="caption" sx={{ color: 'grey.500' }}>{p.sub}</Typography>
                                </CardActionArea>
                            </Card>
                        ))}
                    </Box>
                </div>
            </div>
            </ThemeProvider>
        );
    }

    // ─────────────────────────────────────────────────────────────────────────
    // SUCCESS VIEW
    // ─────────────────────────────────────────────────────────────────────────
    if (view === 'success') {
        return (
            <ThemeProvider theme={customizeTheme}>
            <div className="min-h-[60vh] bg-gray-50 flex items-center justify-center p-4">
                <Paper variant="outlined" sx={{ maxWidth: 384, width: '100%', p: 4, textAlign: 'center', borderColor: 'grey.200', bgcolor: '#ffffff' }}>
                    <Box sx={{ width: 56, height: 56, bgcolor: 'rgba(0,230,118,0.15)', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', mx: 'auto', mb: 2 }}>
                        <CheckCircle size={28} color="#00e676" />
                    </Box>
                    <Typography variant="h6" sx={{ fontWeight: 700, mb: 1 }}>Quote Submitted!</Typography>
                    {submittedId && <Typography variant="caption" sx={{ color: 'grey.500', display: 'block', mb: 1 }}>Order #{submittedId}</Typography>}
                    <Typography variant="body2" sx={{ color: 'grey.600', mb: 3 }}>
                        Our team will review your design and reply with a price via WhatsApp soon.
                    </Typography>
                    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5 }}>
                        <Button
                            variant="contained"
                            onClick={() => {
                                setView('editor');
                                setIsBack(false);
                                setSubmittedId(null);
                                setSizes({ S:0, M:0, L:0, XL:0, XXL:0 });
                                setNotes('');
                                frontJsonRef.current = null;
                                backJsonRef.current  = null;
                            }}
                        >
                            Design Another
                        </Button>
                        <Button variant="outlined" color="inherit" onClick={() => navigate('/')}>
                            Back to Home
                        </Button>
                    </Box>
                </Paper>
            </div>
            </ThemeProvider>
        );
    }

    // ─────────────────────────────────────────────────────────────────────────
    // EDITOR VIEW
    // ─────────────────────────────────────────────────────────────────────────
    return (
        <ThemeProvider theme={customizeTheme}>
        <div className="min-h-screen bg-gray-50 text-gray-900 flex flex-col" style={{ height: '100dvh' }}>

            {/* Top bar */}
            <AppBar position="static" elevation={0} sx={{ bgcolor: '#ffffff', borderBottom: '1px solid', borderColor: 'grey.200' }}>
                <Toolbar variant="dense" sx={{ gap: 1.5 }}>
                    <IconButton edge="start" onClick={() => setView('select')} sx={{ color: 'grey.800' }}>
                        <ArrowLeft size={18} />
                    </IconButton>
                    <ToggleButtonGroup
                        value={product}
                        exclusive
                        onChange={(e, v) => v && setProduct(v)}
                        size="small"
                        sx={{ ml: 'auto' }}
                    >
                        <ToggleButton value="tshirt" sx={{ px: 2, borderRadius: 999 }}>👕 T-Shirt</ToggleButton>
                        <ToggleButton value="hoodie" sx={{ px: 2, borderRadius: 999 }}>🧥 Hoodie</ToggleButton>
                    </ToggleButtonGroup>
                </Toolbar>
            </AppBar>

            {/* Body — canvas FIRST on mobile, tools below; row on desktop with tools left */}
            <div className="flex flex-col-reverse lg:flex-row flex-1 min-h-0">

                {/* ── Left panel (desktop) / Bottom panel (mobile) ─────────────── */}
                <Paper square elevation={0} sx={{ width: { xs: '100%', lg: 288 }, flexShrink: 0, display: 'flex', flexDirection: 'column', borderTop: { xs: '1px solid', lg: 'none' }, borderRight: { lg: '1px solid' }, borderColor: 'grey.200', bgcolor: 'grey.50' }}>
                    {/* Tab row */}
                    <Tabs
                        value={toolTab}
                        onChange={(e, v) => { setToolTab(v); toolSwiperRef.current?.slideTo(TOOL_TABS.indexOf(v)); }}
                        variant="fullWidth"
                        sx={{ borderBottom: '1px solid', borderColor: 'grey.200', minHeight: 0 }}
                    >
                        <Tab value="shirt" icon={<Shirt size={15}/>} label="Shirt" iconPosition="top" />
                        <Tab value="text"  icon={<Type  size={15}/>} label="Text"  iconPosition="top" />
                        <Tab value="image" icon={<ImageIcon size={15}/>} label="Image" iconPosition="top" />
                    </Tabs>

                    {/* Panel — swipeable on mobile, scrollable on desktop */}
                    <div className="lg:flex-1 lg:overflow-y-auto">
                        <Swiper
                            onSwiper={s => (toolSwiperRef.current = s)}
                            initialSlide={TOOL_TABS.indexOf(toolTab)}
                            onSlideChange={s => setToolTab(TOOL_TABS[s.activeIndex])}
                            slidesPerView={1}
                            spaceBetween={0}
                        >
                            <SwiperSlide><Box sx={{ p: 1.5, display: 'flex', flexDirection: 'column', gap: 2.5 }}>{renderShirtPanel()}</Box></SwiperSlide>
                            <SwiperSlide><Box sx={{ p: 1.5, display: 'flex', flexDirection: 'column', gap: 2.5 }}>{renderTextPanel()}</Box></SwiperSlide>
                            <SwiperSlide><Box sx={{ p: 1.5, display: 'flex', flexDirection: 'column', gap: 2.5 }}>{renderImagePanel()}</Box></SwiperSlide>
                        </Swiper>
                    </div>
                </Paper>

                {/* ── Canvas area ───────────────────────────────────────────── */}
                <div className="flex-1 flex flex-col items-center justify-start p-3 gap-3 overflow-y-auto bg-gray-100">

                    {/* Canvas wrapper: shirt img + fabric canvas stacked */}
                    <div ref={containerRef} className="relative w-full" style={{ maxWidth: CANVAS_W }}>
                        {renderFloatingToolbar()}

                        {/* Shirt photo (visual background) */}
                        <img
                            ref={shirtImgRef}
                            src={shirtSrc}
                            alt="shirt"
                            className="absolute inset-0 w-full h-full object-cover rounded-xl pointer-events-none select-none"
                            style={{ zIndex: 0 }}
                        />

                        {/* Aspect-ratio spacer */}
                        <div style={{ paddingBottom: `${(CANVAS_H / CANVAS_W) * 100}%` }} />

                        {/* Fabric.js canvas overlay */}
                        <div
                            className="absolute inset-0 rounded-xl overflow-hidden"
                            style={{ zIndex: 1, touchAction: 'none' }}
                        >
                            <canvas ref={canvasElRef} />
                        </div>

                        {/* Side label */}
                        <div className="absolute top-2 left-2 z-10 text-[10px] font-semibold px-2 py-0.5 bg-black/50 rounded-full text-gray-300 pointer-events-none">
                            {isBack ? 'BACK' : 'FRONT'}
                        </div>
                    </div>

                    {/* Controls row — tap the button or swipe this strip to flip sides */}
                    <div className="w-full" style={{ maxWidth: CANVAS_W }}>
                        <Swiper
                            modules={[Pagination]}
                            loop
                            slidesPerView={1}
                            pagination={{ clickable: true }}
                            initialSlide={isBack ? 1 : 0}
                            onSlideChange={s => {
                                const wantBack = s.realIndex === 1;
                                if (wantBack !== isBack) handleFlip();
                            }}
                            className="!pb-6"
                        >
                            {['front', 'back'].map(side => (
                                <SwiperSlide key={side}>
                                    <div className="flex items-center gap-3">
                                        <button
                                            onClick={handleFlip}
                                            className="flex items-center gap-2 px-4 py-2 bg-gray-200 rounded-full text-xs font-medium hover:bg-gray-300 active:scale-95 transition-all"
                                        >
                                            <RotateCw size={13} />
                                            {isBack ? 'View Front' : 'View Back'}
                                        </button>
                                        <span className="text-xs text-gray-600 ml-auto hidden sm:inline">
                                            Print area shown by dashed outline
                                        </span>
                                        <span className="text-xs text-gray-600 ml-auto sm:hidden">
                                            Swipe to flip sides
                                        </span>
                                    </div>
                                </SwiperSlide>
                            ))}
                        </Swiper>
                    </div>

                    {/* Error */}
                    {formError && (
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, color: 'error.light', fontSize: 12, bgcolor: 'rgba(127,29,29,0.2)', borderRadius: 3, p: 1.5, width: '100%' }} style={{ maxWidth: CANVAS_W }}>
                            <AlertCircle size={14} className="shrink-0" />
                            <span>{formError}</span>
                        </Box>
                    )}

                    {/* Get Quote CTA */}
                    <Button
                        onClick={handleGetQuote}
                        disabled={submitting || totalPcs < 1}
                        variant="contained"
                        size="large"
                        fullWidth
                        sx={{ maxWidth: CANVAS_W, borderRadius: 4, py: 1.5 }}
                    >
                        {submitting
                            ? 'Submitting…'
                            : totalPcs < 1
                                ? 'Add quantity in Shirt tab to quote'
                                : `Get Quote — ${totalPcs} pc${totalPcs !== 1 ? 's' : ''}`}
                    </Button>
                </div>
            </div>
        </div>
        </ThemeProvider>
    );
}
