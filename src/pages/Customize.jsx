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
    ArrowUpCircle, ArrowDownCircle,
} from 'lucide-react';

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
    const buildComposite = () => new Promise((resolve) => {
        const fc = fabricRef.current;

        const renderDesign = (ctx, w, h) => {
            if (!fc) { resolve(null); return; }
            const prevZoom = fc.getZoom();
            const prevW    = fc.getWidth();
            const prevH    = fc.getHeight();
            fc.setZoom(1);
            fc.setWidth(CANVAS_W);
            fc.setHeight(CANVAS_H);
            // Hide print area guide temporarily
            const guides = fc.getObjects().filter(o => o._isPrintArea);
            guides.forEach(g => g.set('opacity', 0));
            fc.renderAll();

            const designUrl = fc.toDataURL({ format: 'png', multiplier: 1 });

            guides.forEach(g => g.set('opacity', 1));
            fc.setZoom(prevZoom);
            fc.setWidth(prevW);
            fc.setHeight(prevH);
            fc.renderAll();

            const dImg = new Image();
            dImg.onload = () => {
                ctx.drawImage(dImg, 0, 0, w, h);
                resolve(ctx.canvas.toDataURL('image/jpeg', 0.85));
            };
            dImg.onerror = () => resolve(ctx.canvas.toDataURL('image/jpeg', 0.85));
            dImg.src = designUrl;
        };

        const tmpC    = document.createElement('canvas');
        tmpC.width    = CANVAS_W;
        tmpC.height   = CANVAS_H;
        const ctx     = tmpC.getContext('2d');
        const shirtEl = shirtImgRef.current;

        const drawShirt = () => {
            ctx.drawImage(shirtEl, 0, 0, CANVAS_W, CANVAS_H);
            renderDesign(ctx, CANVAS_W, CANVAS_H);
        };

        if (shirtEl?.complete && shirtEl.naturalWidth > 0) {
            drawShirt();
        } else if (shirtEl) {
            shirtEl.onload = drawShirt;
            shirtEl.onerror = () => renderDesign(ctx, CANVAS_W, CANVAS_H);
        } else {
            renderDesign(ctx, CANVAS_W, CANVAS_H);
        }
    });

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
            const designImage = composite ? await compressDataUrl(composite, 500, 0.75) : null;

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
    // Selection controls — shared across all three tabs, shown when an object is selected
    const renderSelectionControls = () => (
        activeObj && !activeObj._isPrintArea && (
            <div className="border-t border-gray-700 pt-3">
                <p className="text-[10px] text-gray-400 font-semibold uppercase tracking-widest mb-2">Selection</p>
                <div className="flex gap-2 flex-wrap">
                    <button onClick={bringForward} className="flex items-center gap-1.5 px-3 py-1.5 bg-gray-800 rounded-lg text-xs hover:bg-gray-700 transition-colors">
                        <ArrowUpCircle size={12} /> Forward
                    </button>
                    <button onClick={sendBackward} className="flex items-center gap-1.5 px-3 py-1.5 bg-gray-800 rounded-lg text-xs hover:bg-gray-700 transition-colors">
                        <ArrowDownCircle size={12} /> Backward
                    </button>
                    <button onClick={deleteSelected} className="flex items-center gap-1.5 px-3 py-1.5 bg-red-900/50 rounded-lg text-xs hover:bg-red-900/80 text-red-300 transition-colors">
                        <Trash2 size={12} /> Delete
                    </button>
                </div>
            </div>
        )
    );

    const renderShirtPanel = () => (
        <>
            <div>
                <p className="text-[10px] text-gray-400 font-semibold uppercase tracking-widest mb-2">Color</p>
                <div className="flex gap-2 flex-wrap">
                    {COLOR_SWATCHES.map(c => (
                        <button
                            key={c.id}
                            title={c.label}
                            onClick={() => setColor(c.id)}
                            className={`w-8 h-8 rounded-full border-2 transition-all ${color === c.id ? 'border-blue-400 scale-110 shadow-lg shadow-blue-900/50' : 'border-gray-600 hover:border-gray-300'}`}
                            style={{ backgroundColor: c.hex }}
                        />
                    ))}
                </div>
            </div>

            <div>
                <p className="text-[10px] text-gray-400 font-semibold uppercase tracking-widest mb-2">Quantity per Size</p>
                <div className="space-y-2">
                    {SIZES.map(sz => (
                        <div key={sz} className="flex items-center gap-2">
                            <span className="text-sm w-8 font-mono text-gray-300">{sz}</span>
                            <button
                                onClick={() => setSizes(p => ({ ...p, [sz]: Math.max(0, p[sz] - 1) }))}
                                className="w-7 h-7 bg-gray-800 rounded-lg flex items-center justify-center hover:bg-gray-700 active:scale-90 transition-all"
                            >
                                <Minus size={11} />
                            </button>
                            <span className="w-6 text-center text-sm font-mono">{sizes[sz]}</span>
                            <button
                                onClick={() => setSizes(p => ({ ...p, [sz]: p[sz] + 1 }))}
                                className="w-7 h-7 bg-gray-800 rounded-lg flex items-center justify-center hover:bg-gray-700 active:scale-90 transition-all"
                            >
                                <Plus size={11} />
                            </button>
                        </div>
                    ))}
                </div>
                <p className="text-xs text-gray-500 mt-2">Total: <span className="text-gray-300 font-mono">{totalPcs}</span> pcs</p>
            </div>

            <div>
                <p className="text-[10px] text-gray-400 font-semibold uppercase tracking-widest mb-2">Notes to Admin</p>
                <textarea
                    value={notes}
                    onChange={e => setNotes(e.target.value)}
                    rows={3}
                    placeholder="Special instructions, references, deadline…"
                    className="w-full bg-gray-800 rounded-lg px-3 py-2 text-sm text-gray-200 placeholder-gray-500 resize-none focus:outline-none focus:ring-1 focus:ring-blue-500"
                />
            </div>
            {renderSelectionControls()}
        </>
    );

    const renderTextPanel = () => (
        <>
            {/* ── Add text input ── */}
            <div className="bg-gray-800 rounded-xl p-3 border border-gray-700">
                <p className="text-sm font-bold text-white mb-2 flex items-center gap-1.5">
                    <Type size={14} className="text-blue-400" /> Add Text to Design
                </p>
                <input
                    type="text"
                    value={textInput}
                    onChange={e => setTextInput(e.target.value)}
                    onKeyDown={e => e.key === 'Enter' && addText()}
                    placeholder="Type your text here…"
                    className="w-full bg-gray-900 rounded-lg px-3 py-2.5 text-sm text-gray-100 placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500 mb-2"
                />
                <button
                    onClick={addText}
                    disabled={!textInput.trim()}
                    className="w-full py-2.5 bg-blue-600 hover:bg-blue-500 disabled:opacity-40 disabled:cursor-not-allowed text-white font-bold rounded-lg text-sm transition-colors flex items-center justify-center gap-2"
                >
                    <Plus size={15} /> Add Text to Canvas
                </button>
                <p className="text-xs text-gray-500 mt-1.5 text-center">Tip: Double-click text on canvas to edit it directly</p>
            </div>

            {/* ── Font ── */}
            <div>
                <p className="text-xs text-gray-400 font-semibold uppercase tracking-widest mb-1.5">Font</p>
                <select
                    value={fontFamily}
                    onChange={e => setFontFamily(e.target.value)}
                    className="w-full bg-gray-800 rounded-lg px-3 py-2 text-sm text-gray-200 focus:outline-none focus:ring-1 focus:ring-blue-500"
                >
                    {FONTS.map(f => <option key={f} value={f} style={{ fontFamily: f }}>{f}</option>)}
                </select>
            </div>

            {/* ── Size ── */}
            <div>
                <p className="text-xs text-gray-400 font-semibold uppercase tracking-widest mb-1.5">Size — <span className="text-white font-mono">{fontSize}px</span></p>
                <div className="flex items-center gap-2">
                    <button onClick={() => setFontSize(s => Math.max(10, s - 2))} className="w-8 h-8 bg-gray-800 rounded-lg flex items-center justify-center hover:bg-gray-700"><Minus size={12} /></button>
                    <input type="range" min={10} max={120} value={fontSize} onChange={e => setFontSize(Number(e.target.value))} className="flex-1 accent-blue-500" />
                    <button onClick={() => setFontSize(s => Math.min(200, s + 2))} className="w-8 h-8 bg-gray-800 rounded-lg flex items-center justify-center hover:bg-gray-700"><Plus size={12} /></button>
                </div>
            </div>

            {/* ── Style ── */}
            <div>
                <p className="text-xs text-gray-400 font-semibold uppercase tracking-widest mb-1.5">Style</p>
                <div className="flex gap-2">
                    <button
                        onClick={() => setIsBold(b => !b)}
                        className={`flex-1 py-2 rounded-lg text-sm font-bold transition-colors ${isBold ? 'bg-blue-600 text-white' : 'bg-gray-800 text-gray-300 hover:bg-gray-700'}`}
                    >Bold</button>
                    <button
                        onClick={() => setIsItalic(i => !i)}
                        className={`flex-1 py-2 rounded-lg text-sm italic transition-colors ${isItalic ? 'bg-blue-600 text-white' : 'bg-gray-800 text-gray-300 hover:bg-gray-700'}`}
                    >Italic</button>
                    <button
                        onClick={() => setIsUnderline(u => !u)}
                        className={`flex-1 py-2 rounded-lg text-sm underline transition-colors ${isUnderline ? 'bg-blue-600 text-white' : 'bg-gray-800 text-gray-300 hover:bg-gray-700'}`}
                    >Under</button>
                </div>
            </div>

            {/* ── Color ── */}
            <div>
                <p className="text-xs text-gray-400 font-semibold uppercase tracking-widest mb-1.5">Text Color</p>
                <div className="flex items-center gap-3 bg-gray-800 rounded-lg px-3 py-2">
                    <input
                        type="color"
                        value={textColor}
                        onChange={e => setTextColor(e.target.value)}
                        className="w-9 h-9 rounded cursor-pointer border-0 bg-transparent"
                    />
                    <span className="text-sm text-gray-200 font-mono">{textColor.toUpperCase()}</span>
                </div>
            </div>
            {renderSelectionControls()}
        </>
    );

    const renderImagePanel = () => (
        <>
            <div>
                <p className="text-[10px] text-gray-400 font-semibold uppercase tracking-widest mb-2">Upload Image</p>
                <label className="flex flex-col items-center gap-2 px-4 py-5 bg-gray-800 rounded-xl cursor-pointer hover:bg-gray-700 transition-colors border border-dashed border-gray-600 hover:border-blue-500">
                    <Upload size={20} className="text-blue-400" />
                    <span className="text-sm text-gray-300 font-medium">Choose file</span>
                    <span className="text-xs text-gray-500">PNG, JPG, SVG</span>
                    <input type="file" accept="image/*" className="hidden" onChange={handleImageUpload} />
                </label>
                <p className="text-xs text-gray-500 mt-2">Tip: Use PNG with transparent background for best results</p>
            </div>
            {renderSelectionControls()}
        </>
    );

    // ─────────────────────────────────────────────────────────────────────────
    // SELECT VIEW
    // ─────────────────────────────────────────────────────────────────────────
    if (view === 'select') {
        return (
            <div className="min-h-screen bg-gray-950 text-white flex flex-col items-center justify-center px-4 py-16">
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
                    <p className="text-gray-400 text-center text-sm mb-10">
                        Place your text & images on a shirt, then get a custom quote from us.
                    </p>

                    <div className="grid grid-cols-2 gap-4 mb-6">
                        {[
                            { id: 'tshirt', icon: '👕', label: 'T-Shirt', sub: 'Oversized Fit' },
                            { id: 'hoodie', icon: '🧥', label: 'Hoodie',  sub: 'Pullover style' },
                        ].map(p => (
                            <button
                                key={p.id}
                                onClick={() => { setProduct(p.id); setView('editor'); setIsBack(false); frontJsonRef.current = null; backJsonRef.current = null; }}
                                className="flex flex-col items-center gap-3 py-8 px-4 bg-gray-900 border border-gray-700 rounded-2xl hover:border-blue-500 hover:bg-gray-800 active:scale-[0.97] transition-all"
                            >
                                <span className="text-4xl">{p.icon}</span>
                                <span className="font-semibold text-lg">{p.label}</span>
                                <span className="text-xs text-gray-400">{p.sub}</span>
                            </button>
                        ))}
                    </div>
                </div>
            </div>
        );
    }

    // ─────────────────────────────────────────────────────────────────────────
    // SUCCESS VIEW
    // ─────────────────────────────────────────────────────────────────────────
    if (view === 'success') {
        return (
            <div className="min-h-screen bg-gray-950 flex items-center justify-center p-4">
                <div className="max-w-sm w-full bg-gray-900 rounded-2xl p-8 text-center border border-gray-700">
                    <div className="w-14 h-14 bg-green-900/40 rounded-full flex items-center justify-center mx-auto mb-4">
                        <CheckCircle size={28} className="text-green-400" />
                    </div>
                    <h2 className="text-xl font-bold text-white mb-2">Quote Submitted!</h2>
                    {submittedId && <p className="text-xs text-gray-500 mb-3">Order #{submittedId}</p>}
                    <p className="text-sm text-gray-400 mb-6">
                        Our team will review your design and reply with a price via WhatsApp soon.
                    </p>
                    <div className="flex flex-col gap-3">
                        <button
                            onClick={() => {
                                setView('editor');
                                setIsBack(false);
                                setSubmittedId(null);
                                setSizes({ S:0, M:0, L:0, XL:0, XXL:0 });
                                setNotes('');
                                frontJsonRef.current = null;
                                backJsonRef.current  = null;
                            }}
                            className="py-2.5 bg-blue-600 rounded-xl text-sm font-medium hover:bg-blue-700 transition-colors"
                        >
                            Design Another
                        </button>
                        <button
                            onClick={() => navigate('/')}
                            className="py-2.5 bg-gray-800 rounded-xl text-sm text-gray-300 hover:bg-gray-700 transition-colors"
                        >
                            Back to Home
                        </button>
                    </div>
                </div>
            </div>
        );
    }

    // ─────────────────────────────────────────────────────────────────────────
    // EDITOR VIEW
    // ─────────────────────────────────────────────────────────────────────────
    return (
        <div className="min-h-screen bg-gray-950 text-white flex flex-col" style={{ height: '100dvh' }}>

            {/* Top bar */}
            <div className="flex items-center gap-3 px-3 py-2.5 border-b border-gray-800 bg-gray-950 flex-shrink-0 z-10">
                <button onClick={() => setView('select')} className="p-1.5 rounded-lg hover:bg-gray-800 transition-colors">
                    <ArrowLeft size={17} />
                </button>
                <div className="flex gap-1.5 ml-auto">
                    {[['tshirt','👕 T-Shirt'],['hoodie','🧥 Hoodie']].map(([id, label]) => (
                        <button
                            key={id}
                            onClick={() => setProduct(id)}
                            className={`px-3 py-1 rounded-full text-xs font-medium transition-colors ${product === id ? 'bg-blue-600 text-white' : 'bg-gray-800 text-gray-300 hover:bg-gray-700'}`}
                        >
                            {label}
                        </button>
                    ))}
                </div>
            </div>

            {/* Body — canvas FIRST on mobile, tools below; row on desktop with tools left */}
            <div className="flex flex-col-reverse lg:flex-row flex-1 min-h-0">

                {/* ── Left panel (desktop) / Bottom panel (mobile) ─────────────── */}
                <div className="w-full lg:w-72 flex-shrink-0 flex flex-col border-t lg:border-t-0 lg:border-r border-gray-800 bg-gray-950">
                    {/* Tab row */}
                    <div className="flex border-b border-gray-800">
                        {[
                            ['shirt', <Shirt size={13}/>, 'Shirt'],
                            ['text',  <Type  size={13}/>, 'Text'],
                            ['image', <ImageIcon size={13}/>, 'Image'],
                        ].map(([id, icon, label]) => (
                            <button
                                key={id}
                                onClick={() => {
                                    setToolTab(id);
                                    toolSwiperRef.current?.slideTo(TOOL_TABS.indexOf(id));
                                }}
                                className={`flex-1 py-2.5 text-[10px] font-semibold flex flex-col items-center gap-1 transition-colors ${toolTab === id ? 'text-blue-400 border-b-2 border-blue-500 bg-gray-900' : 'text-gray-500 hover:text-gray-200 hover:bg-gray-900/50'}`}
                            >
                                {icon}
                                {label}
                            </button>
                        ))}
                    </div>

                    {/* Panel — swipeable on mobile, scrollable on desktop */}
                    <div className="lg:flex-1 lg:overflow-y-auto">
                        <Swiper
                            onSwiper={s => (toolSwiperRef.current = s)}
                            initialSlide={TOOL_TABS.indexOf(toolTab)}
                            onSlideChange={s => setToolTab(TOOL_TABS[s.activeIndex])}
                            slidesPerView={1}
                            spaceBetween={0}
                        >
                            <SwiperSlide><div className="p-3 space-y-5">{renderShirtPanel()}</div></SwiperSlide>
                            <SwiperSlide><div className="p-3 space-y-5">{renderTextPanel()}</div></SwiperSlide>
                            <SwiperSlide><div className="p-3 space-y-5">{renderImagePanel()}</div></SwiperSlide>
                        </Swiper>
                    </div>
                </div>

                {/* ── Canvas area ───────────────────────────────────────────── */}
                <div className="flex-1 flex flex-col items-center justify-start p-3 gap-3 overflow-y-auto bg-gray-900">

                    {/* Canvas wrapper: shirt img + fabric canvas stacked */}
                    <div ref={containerRef} className="relative w-full" style={{ maxWidth: CANVAS_W }}>
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
                                            className="flex items-center gap-2 px-4 py-2 bg-gray-800 rounded-full text-xs font-medium hover:bg-gray-700 active:scale-95 transition-all"
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
                        <div className="flex items-center gap-2 text-red-400 text-xs bg-red-900/20 rounded-xl p-3 w-full" style={{ maxWidth: CANVAS_W }}>
                            <AlertCircle size={14} className="shrink-0" />
                            <span>{formError}</span>
                        </div>
                    )}

                    {/* Get Quote CTA */}
                    <button
                        onClick={handleGetQuote}
                        disabled={submitting || totalPcs < 1}
                        className="w-full py-3.5 bg-blue-600 rounded-2xl text-white font-semibold text-sm hover:bg-blue-700 active:scale-[0.98] transition-all disabled:opacity-40"
                        style={{ maxWidth: CANVAS_W }}
                    >
                        {submitting
                            ? 'Submitting…'
                            : totalPcs < 1
                                ? 'Add quantity in Shirt tab to quote'
                                : `Get Quote — ${totalPcs} pc${totalPcs !== 1 ? 's' : ''}`}
                    </button>
                </div>
            </div>
        </div>
    );
}
