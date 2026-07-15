import React, { useEffect, useState } from 'react';
import { Navigate, useNavigate } from 'react-router-dom';
import { useUser } from '../context/UserContext';
import {
    fetchAdminOrders, updateOrderStatus,
    getAdminCustomOrders, updateCustomQuote,
    saveCustomer
} from '../api/api';
import { GoogleLogin } from '@react-oauth/google';
import { jwtDecode } from 'jwt-decode';
import {
    Package, DollarSign, ShoppingCart,
    CreditCard, Truck, RefreshCcw, CheckCircle, Shirt, Eye, X,
    ChevronUp, ChevronDown, ChevronsUpDown, Search, ChevronLeft, ChevronRight,
    MessageCircle, Printer, FileText, FileType, SlidersHorizontal, Plus
} from 'lucide-react';
import { SENDER, exportLabelsAsPdf, exportLabelsAsWord } from '../utils/shippingLabels';

// Indian 10-digit mobile → wa.me link (backend validates mobile as ^\d{10}$)
const whatsappLink = (mobile) => `https://wa.me/91${String(mobile || '').replace(/\D/g, '')}`;

// D1 stores timestamps as 'YYYY-MM-DD HH:MM:SS' (UTC, no offset) — append Z so
// the browser parses it as UTC instead of local time before formatting.
const formatDate = (ts) => {
    if (!ts) return null;
    const d = new Date(ts.includes('T') ? ts : ts.replace(' ', 'T') + 'Z');
    if (isNaN(d)) return null;
    return d.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });
};

// D1 timestamps start with 'YYYY-MM-DD' — slicing gives the value an
// <input type="date"> expects, regardless of separator/time portion.
const toDateInputValue = (ts) => (ts ? ts.slice(0, 10) : '');

// Today as an <input type="date"> value.
const todayDateInputValue = () => new Date().toISOString().slice(0, 10);

// Adds `days` working days (Mon–Fri) to a 'YYYY-MM-DD' date string — mirrors
// the backend's own projection (updateOrderStatus in backend.js) so the admin
// sees the same computed delivery date immediately, before saving.
const addWorkingDays = (dateStr, days) => {
    const d = new Date(`${dateStr}T00:00:00Z`);
    let added = 0;
    while (added < days) {
        d.setUTCDate(d.getUTCDate() + 1);
        const day = d.getUTCDay(); // 0 = Sun, 6 = Sat
        if (day !== 0 && day !== 6) added++;
    }
    return d.toISOString().slice(0, 10);
};

const ALL_ORDER_STATUSES = ['New', 'Processing', 'Ready to dispatch', 'Shipped', 'Delivered', 'Cancelled', 'Pending Payment', 'Payment Failed'];

// ── ServiceNow-style condition filter ─────────────────────────────────────────
// Each filterable field declares its type; the operator list and value input
// are derived from it. `get` normalizes the raw order-row value so conditions
// compare against what the admin actually sees in the table (e.g. COD 'Yes'
// reads as 'COD', a null status reads as 'New').
const FILTER_FIELDS = {
    id:              { label: 'Order ID',         type: 'number', get: o => Number(o.id) },
    Name:            { label: 'Customer Name',    type: 'text',   get: o => o.Name || '' },
    Email:           { label: 'Email',            type: 'text',   get: o => o.Email || '' },
    Mobile:          { label: 'Mobile',           type: 'text',   get: o => String(o.Mobile || '') },
    AmountPaid:      { label: 'Amount',           type: 'number', get: o => Number(o.AmountPaid || 0) },
    OrderStatus:     { label: 'Status',           type: 'select', options: ALL_ORDER_STATUSES,  get: o => o.OrderStatus || 'New' },
    COD:             { label: 'Payment Type',     type: 'select', options: ['COD', 'Prepaid'],  get: o => o.COD === 'Yes' ? 'COD' : 'Prepaid' },
    TrackingId:      { label: 'Tracking ID',      type: 'text',   get: o => o.TrackingId || '' },
    ShippingCompany: { label: 'Shipping Company', type: 'text',   get: o => o.ShippingCompany || '' },
    CfOrderId:       { label: 'CF Order ID',      type: 'text',   get: o => o.CfOrderId || '' },
};

const OPERATORS_BY_TYPE = {
    text:   ['contains', 'does not contain', 'is', 'is not', 'starts with', 'ends with', 'is empty', 'is not empty'],
    number: ['=', '≠', '>', '≥', '<', '≤'],
    select: ['is', 'is not'],
};

const NO_VALUE_OPERATORS = ['is empty', 'is not empty'];

const evalCondition = (order, { field, operator, value }) => {
    const def = FILTER_FIELDS[field];
    if (!def) return true;
    const raw = def.get(order);
    if (def.type === 'number') {
        const target = Number(value);
        if (isNaN(target)) return true;
        switch (operator) {
            case '=': return raw === target;
            case '≠': return raw !== target;
            case '>': return raw > target;
            case '≥': return raw >= target;
            case '<': return raw < target;
            case '≤': return raw <= target;
            default:  return true;
        }
    }
    const a = String(raw).toLowerCase();
    const b = String(value ?? '').toLowerCase();
    switch (operator) {
        case 'contains':         return a.includes(b);
        case 'does not contain': return !a.includes(b);
        case 'is':               return a === b;
        case 'is not':           return a !== b;
        case 'starts with':      return a.startsWith(b);
        case 'ends with':        return a.endsWith(b);
        case 'is empty':         return a === '';
        case 'is not empty':     return a !== '';
        default:                 return true;
    }
};

const DATE_FILTER_FIELDS = { CreatedAt: 'Created', ShippedAt: 'Shipped', DeliveredAt: 'Delivered' };

const CUSTOM_STATUSES = [
    'Pending Quote', 'Quoted', 'Accepted',
    'In Production', 'Shipped', 'Delivered', 'Cancelled'
];

const CUSTOM_STATUS_COLOR = {
    'Pending Quote': 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400',
    'Quoted':        'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400',
    'Accepted':      'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400',
    'In Production': 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400',
    'Shipped':       'bg-cyan-100 text-cyan-700 dark:bg-cyan-900/30 dark:text-cyan-400',
    'Delivered':     'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400',
    'Cancelled':     'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400',
};

const AdminDashboard = () => {
    const { user, setUser } = useUser();
    const navigate   = useNavigate();

    // Falls back to a visible Google Sign-In button if the silent One-Tap
    // re-auth (SessionGate, App.jsx) hasn't restored idToken within a few
    // seconds — otherwise a blocked/expired One-Tap leaves this page spinning
    // forever with no way out except logging out and back in from Profile.
    const [oneTapTimedOut, setOneTapTimedOut] = useState(false);
    const [reAuthError,    setReAuthError]    = useState('');

    const [activeTab, setActiveTab]   = useState('orders');
    const [orders, setOrders]         = useState([]);
    const [customOrders, setCustomOrders] = useState([]);
    const [loading, setLoading]       = useState(true);
    const [loadingCustom, setLoadingCustom] = useState(false);

    // Design preview modal
    const [previewImage, setPreviewImage] = useState(null);

    // Custom order inline edit state: { [id]: { price, status } }
    const [editState, setEditState] = useState({});
    const [savingId, setSavingId]   = useState(null);

    // ── Orders table: search / filter / sort / pagination ─────────────────────
    const [searchName,    setSearchName]    = useState('');
    const [searchId,      setSearchId]      = useState('');
    const [searchMobile,  setSearchMobile]  = useState('');
    const [filterStatus,  setFilterStatus]  = useState('');
    const [filterType,    setFilterType]    = useState(''); // '' | 'COD' | 'Prepaid'
    // Clicking a summary/status card below narrows the table to that slice —
    // click the same card again to clear it back to "all orders".
    const [cardFilter,    setCardFilter]    = useState(null);
    // Advanced (ServiceNow-style) condition builder + date range
    const [showAdvanced,  setShowAdvanced]  = useState(false);
    const [conditions,    setConditions]    = useState([]);      // [{ field, operator, value }]
    const [conditionJoin, setConditionJoin] = useState('AND');   // 'AND' | 'OR'
    const [dateField,     setDateField]     = useState('CreatedAt');
    const [dateFrom,      setDateFrom]      = useState('');
    const [dateTo,        setDateTo]        = useState('');
    const [sortCol,       setSortCol]       = useState('id');
    const [sortDir,       setSortDir]       = useState('desc');
    const [page,          setPage]          = useState(1);
    const [pageSize,      setPageSize]      = useState(20);
    const [showExportMenu, setShowExportMenu] = useState(false);
    const [exporting,      setExporting]      = useState(false);

    // Expandable row detail (address, product list, tracking/shipping edit)
    const [expandedOrderId,  setExpandedOrderId]  = useState(null);
    const [orderEditState,   setOrderEditState]   = useState({}); // { [id]: { trackingId, shippingCompany } }
    const [savingOrderId,    setSavingOrderId]    = useState(null);

    // ── Auth guard — isAdmin is state-only (never stored in localStorage) ─────
    // When user.email exists but idToken is absent the session is being restored
    // via Google One-Tap (SessionGate in App.jsx). Redirect only once idToken is
    // confirmed and isAdmin is still false, to avoid a premature redirect on reload.

    useEffect(() => {
        if (user?.idToken && !user?.isAdmin) {
            navigate('/');
        }
        if (!user) {
            navigate('/');
        }
    }, [user, navigate]);

    // Waiting-for-One-Tap is only ever "stuck" once — reset the timer if we
    // leave that state (idToken arrives, or user disappears) so a later
    // logout/login doesn't inherit a stale timeout.
    useEffect(() => {
        if (!(user?.email && !user?.idToken)) {
            setOneTapTimedOut(false);
            return;
        }
        const timer = setTimeout(() => setOneTapTimedOut(true), 4000);
        return () => clearTimeout(timer);
    }, [user?.email, user?.idToken]);

    // Manual fallback for the hidden SessionGate One-Tap — a real, user-initiated
    // Google sign-in always succeeds even when silent re-auth is blocked
    // (third-party cookies disabled, One-Tap cooldown after a prior dismissal, etc).
    const handleManualSignIn = async (credentialResponse) => {
        try {
            const idToken = credentialResponse.credential;
            const decoded = jwtDecode(idToken);
            const result = await saveCustomer({ idToken, email: decoded.email, name: decoded.name });
            setUser({ idToken, isAdmin: result?.customer?.isAdmin ?? false });
            setReAuthError('');
        } catch {
            setReAuthError('Sign-in failed. Please try again.');
        }
    };

    // ── Data loading ──────────────────────────────────────────────────────────
    // These effects (and every hook above) must run unconditionally on every
    // render — the "waiting for session restore" / "not admin" checks used to
    // sit between hook declarations as early `return`s, so on first render
    // after a browser refresh (idToken not yet restored) React skipped these
    // two effects entirely, then called them on the next render once idToken
    // arrived — a change in the number of Hooks called between renders, which
    // React errors on and which left the Orders page blank. Conditional
    // returns now happen only after every hook has been declared, below.

    useEffect(() => {
        const load = async () => {
            if (!user?.idToken) return;
            try {
                const data = await fetchAdminOrders(user.idToken);
                const rows = Array.isArray(data) ? data : [];
                setOrders(rows);
                const init = {};
                rows.forEach(o => {
                    init[o.id] = {
                        trackingId:      o.TrackingId || '',
                        shippingCompany: o.ShippingCompany || '',
                        status:          o.OrderStatus || 'New',
                        shippedAt:       toDateInputValue(o.ShippedAt),
                        deliveredAt:     toDateInputValue(o.DeliveredAt),
                    };
                });
                setOrderEditState(init);
            } catch (err) {
                console.error('Failed to load admin orders:', err);
            }
            setLoading(false);
        };
        load();
    }, [user?.idToken]);

    useEffect(() => {
        if (activeTab !== 'custom' || !user?.idToken) return;
        const load = async () => {
            setLoadingCustom(true);
            try {
                const res = await getAdminCustomOrders(user.idToken);
                const rows = res.orders || [];
                setCustomOrders(rows);
                const init = {};
                rows.forEach(o => {
                    init[o.id] = {
                        price:  o.quoted_price != null ? String(o.quoted_price) : '',
                        status: o.status,
                    };
                });
                setEditState(init);
            } catch (err) {
                console.error('Failed to load custom orders:', err);
            }
            setLoadingCustom(false);
        };
        load();
    }, [activeTab, user?.idToken]);

    // ── Auth guard renders — now safely after every hook above has run ────────

    // Still waiting for One-Tap to restore idToken + isAdmin
    if (user?.email && !user?.idToken) {
        if (!oneTapTimedOut) {
            return (
                <div className="min-h-screen flex items-center justify-center">
                    <div className="animate-spin rounded-full h-10 w-10 border-t-2 border-primary"></div>
                </div>
            );
        }
        // Silent One-Tap didn't come back in time (cooldown, blocked
        // third-party cookies, etc.) — offer a real sign-in right here
        // instead of leaving the admin stuck until they log out/in elsewhere.
        return (
            <div className="min-h-screen flex flex-col items-center justify-center gap-4 px-4 text-center">
                <p className="text-gray-500 dark:text-gray-400">Session restore is taking longer than expected. Please sign in again.</p>
                <GoogleLogin
                    onSuccess={handleManualSignIn}
                    onError={() => setReAuthError('Google Sign-In failed.')}
                    theme="filled_black"
                    shape="pill"
                    size="large"
                />
                {reAuthError && <p className="text-red-500 text-sm">{reAuthError}</p>}
            </div>
        );
    }

    if (!user?.isAdmin) return <Navigate to="/" />;

    // ── Regular orders ────────────────────────────────────────────────────────

    // Revenue only counts orders that actually went out the door — Shipped or
    // Delivered. Earlier statuses (New/Processing/Ready to dispatch) may still
    // be cancelled or refunded, so their amount_paid isn't realized revenue yet.
    const REVENUE_STATUSES = ['Shipped', 'Delivered'];
    const totalOrders   = orders.length;
    const totalRevenue  = orders
        .filter(o => REVENUE_STATUSES.includes(o.OrderStatus))
        .reduce((s, o) => s + Number(o.AmountPaid || 0), 0);
    const totalItems    = orders.reduce((s, o) => s + Number(o.TotalTshirts || 0), 0);
    const codOrders     = orders.filter(o => o.COD === 'Yes').length;
    const prepaidOrders = orders.filter(o => o.COD !== 'Yes').length;

    const statusCount = {
        New:             orders.filter(o => !o.OrderStatus || o.OrderStatus === 'New').length,
        ReadyToDispatch: orders.filter(o => o.OrderStatus === 'Ready to dispatch').length,
        Shipped:         orders.filter(o => o.OrderStatus === 'Shipped').length,
        Delivered:       orders.filter(o => o.OrderStatus === 'Delivered').length,
    };

    // Predicate for whichever summary/status card is currently selected —
    // null means no card is active (show everything). 'orders'/'items' both
    // clear back to "all orders" since neither maps to a specific slice.
    const CARD_FILTER_LABELS = {
        revenue:         'Total Revenue (Shipped + Delivered)',
        cod:             'COD orders',
        prepaid:         'Prepaid orders',
        new:             'New orders',
        readyToDispatch: 'Ready to Dispatch orders',
        shipped:         'Shipped orders',
        delivered:       'Delivered orders',
    };
    const matchesCardFilter = (o) => {
        switch (cardFilter) {
            case 'revenue':         return REVENUE_STATUSES.includes(o.OrderStatus);
            case 'cod':             return o.COD === 'Yes';
            case 'prepaid':         return o.COD !== 'Yes';
            case 'new':             return !o.OrderStatus || o.OrderStatus === 'New';
            case 'readyToDispatch': return o.OrderStatus === 'Ready to dispatch';
            case 'shipped':         return o.OrderStatus === 'Shipped';
            case 'delivered':       return o.OrderStatus === 'Delivered';
            default:                return true;
        }
    };
    // Clicking the already-active card clears the filter instead of re-applying it.
    const toggleCardFilter = (key) => { setCardFilter(prev => (prev === key ? null : key)); setPage(1); };

    const handleOrderEdit = (id, field, value) =>
        setOrderEditState(prev => {
            const current = prev[id] || {};
            const next = { ...current, [field]: value };
            // Live preview of the same auto-fill the backend applies on save:
            // switching status to Shipped fills today's date into Shipped Date
            // and projects Delivered Date as +2 working days from it — right
            // in the form, without needing a save round-trip. Never overwrites
            // a date the admin already set.
            if (field === 'status' && value === 'Shipped') {
                const shippedAt = current.shippedAt || todayDateInputValue();
                next.shippedAt = shippedAt;
                if (!current.deliveredAt) {
                    next.deliveredAt = addWorkingDays(shippedAt, 2);
                }
            }
            return { ...prev, [id]: next };
        });

    // Saves status + shipping company + tracking ID + all three dates in one
    // call. Blocks the save client-side (mirroring the server-side guard) when
    // moving to Shipped without a tracking ID and shipping company on file.
    const saveOrderShipping = async (orderId) => {
        const e = orderEditState[orderId];
        if (!e) return;
        if (e.status === 'Shipped' && (!e.trackingId?.trim() || !e.shippingCompany?.trim())) {
            alert('Tracking ID and Shipping Company are required before marking an order as Shipped.');
            return;
        }
        setSavingOrderId(orderId);
        try {
            const toTs = (dateStr) => dateStr ? `${dateStr} 00:00:00` : null;
            const res = await updateOrderStatus(
                user.idToken, orderId,
                e.status || null,
                e.trackingId || null,
                e.shippingCompany || null,
                toTs(e.shippedAt),
                toTs(e.deliveredAt),
            );
            if (res?.error) {
                alert(res.error);
            } else {
                // Sync from the row the backend actually wrote (includes any
                // auto-filled shipped_at/delivered_at) instead of re-deriving it
                // client-side, so state never drifts from D1.
                const fresh = res?.order;
                setOrders(prev => prev.map(o => o.id === orderId
                    ? {
                        ...o,
                        OrderStatus:     fresh?.OrderStatus     ?? e.status,
                        TrackingId:      fresh?.TrackingId      ?? e.trackingId,
                        ShippingCompany: fresh?.ShippingCompany ?? e.shippingCompany,
                        ShippedAt:       fresh?.ShippedAt       ?? o.ShippedAt,
                        DeliveredAt:     fresh?.DeliveredAt     ?? o.DeliveredAt,
                    }
                    : o));

                // Also sync the edit-form fields themselves — shippedAt/deliveredAt
                // may have just been auto-filled server-side (e.g. delivered_at
                // projected to +2 working days on the Shipped transition), and
                // without this the date inputs keep showing blank/stale values
                // until a full page reload even though D1 was updated correctly.
                setOrderEditState(prev => ({
                    ...prev,
                    [orderId]: {
                        ...prev[orderId],
                        status:          fresh?.OrderStatus     ?? prev[orderId]?.status,
                        trackingId:      fresh?.TrackingId      ?? prev[orderId]?.trackingId,
                        shippingCompany: fresh?.ShippingCompany ?? prev[orderId]?.shippingCompany,
                        shippedAt:       fresh?.ShippedAt   ? toDateInputValue(fresh.ShippedAt)   : prev[orderId]?.shippedAt,
                        deliveredAt:     fresh?.DeliveredAt ? toDateInputValue(fresh.DeliveredAt) : prev[orderId]?.deliveredAt,
                    },
                }));

                // notificationSent is null when this update didn't cross into
                // Shipped/Delivered (no notification applicable); true/false
                // otherwise. Surface a delivery failure instead of pretending
                // the customer was notified.
                if (res?.notificationSent === false) {
                    console.error(`Order ${orderId} updated, but the customer notification failed to send.`);
                    alert('Order updated, but the customer notification failed to send.');
                } else {
                    alert('Order updated successfully.');
                }
            }
        } catch (err) {
            console.error('Failed to update order:', err);
            alert('Failed to update order.');
        }
        setSavingOrderId(null);
    };

    // ── Custom orders ─────────────────────────────────────────────────────────

    const handleCustomEdit = (id, field, value) =>
        setEditState(prev => ({ ...prev, [id]: { ...prev[id], [field]: value } }));

    const saveCustomQuote = async (id) => {
        const e = editState[id];
        if (!e) return;
        const priceNum = e.price !== '' ? parseFloat(e.price) : null;
        if (e.price !== '' && (isNaN(priceNum) || priceNum < 0)) {
            alert('Enter a valid price.');
            return;
        }
        setSavingId(id);
        try {
            const res = await updateCustomQuote({
                idToken:       user.idToken,
                customOrderId: id,
                quotedPrice:   priceNum,
                status:        e.status,
            });
            if (res.success) {
                setCustomOrders(prev =>
                    prev.map(o => o.id === id
                        ? { ...o, quoted_price: priceNum, status: e.status }
                        : o)
                );

                // Setting this status to Shipped/Delivered mirrors the same
                // transition into the linked regular order (backend.js,
                // updateCustomQuote) — sync its auto-filled shipped/delivered
                // dates into the Shipping sub-section below so it doesn't keep
                // showing stale values until a full page reload.
                const confirmedOrderId = customOrders.find(o => o.id === id)?.confirmed_order_id;
                const fresh = res.shippingOrder;
                if (confirmedOrderId && fresh) {
                    setOrders(prev => prev.map(o => o.id === confirmedOrderId
                        ? { ...o, OrderStatus: fresh.OrderStatus, ShippedAt: fresh.ShippedAt, DeliveredAt: fresh.DeliveredAt }
                        : o));
                    setOrderEditState(prev => ({
                        ...prev,
                        [confirmedOrderId]: {
                            ...prev[confirmedOrderId],
                            status:      fresh.OrderStatus,
                            shippedAt:   fresh.ShippedAt   ? toDateInputValue(fresh.ShippedAt)   : prev[confirmedOrderId]?.shippedAt,
                            deliveredAt: fresh.DeliveredAt ? toDateInputValue(fresh.DeliveredAt) : prev[confirmedOrderId]?.deliveredAt,
                        },
                    }));
                }

                if (res.notificationSent === false) {
                    alert('Custom order updated, but the customer notification failed to send.');
                } else if (confirmedOrderId && (e.status === 'Shipped' || e.status === 'Delivered')) {
                    alert('Custom order updated successfully.');
                }
            } else {
                alert(res.error || 'Update failed.');
            }
        } catch {
            alert('Update failed.');
        }
        setSavingId(null);
    };

    if (loading) {
        return (
            <div className="flex justify-center items-center min-h-[60vh]">
                <div className="animate-spin rounded-full h-12 w-12 border-4 border-primary border-t-transparent" />
            </div>
        );
    }

    return (
        <main className="container mx-auto px-4 py-8">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8">
                <h1 className="text-3xl font-bold font-heading">Admin Dashboard</h1>
                <p className="text-gray-500 dark:text-gray-400 mt-2 md:mt-0">
                    Logged in as: <span className="font-semibold text-primary">{user.email}</span>
                </p>
            </div>

            {/* Tab Navigation */}
            <div className="flex gap-1 mb-8 bg-gray-100 dark:bg-gray-800 p-1 rounded-xl w-fit">
                <button
                    onClick={() => setActiveTab('orders')}
                    className={`px-5 py-2.5 rounded-lg font-semibold text-sm transition-all flex items-center gap-2 ${activeTab === 'orders' ? 'bg-white dark:bg-gray-700 shadow-sm' : 'text-gray-500 hover:text-gray-700 dark:hover:text-gray-300'}`}
                >
                    <Package size={16} /> Orders
                </button>
                <button
                    onClick={() => setActiveTab('custom')}
                    className={`px-5 py-2.5 rounded-lg font-semibold text-sm transition-all flex items-center gap-2 ${activeTab === 'custom' ? 'bg-white dark:bg-gray-700 shadow-sm' : 'text-gray-500 hover:text-gray-700 dark:hover:text-gray-300'}`}
                >
                    <Shirt size={16} /> Custom Orders
                    {customOrders.filter(o => o.status === 'Pending Quote').length > 0 && (
                        <span className="bg-red-500 text-white text-xs rounded-full px-1.5 py-0.5 leading-none">
                            {customOrders.filter(o => o.status === 'Pending Quote').length}
                        </span>
                    )}
                </button>
            </div>

            {/* ── ORDERS TAB ─────────────────────────────────────────────────────── */}
            {activeTab === 'orders' && (
                <>
                    {/* Summary Cards — click a card to filter the table below by that
                        slice; click it again (or "Clear filter") to go back to all orders. */}
                    {cardFilter && (
                        <div className="flex items-center gap-2 mb-4 text-sm">
                            <span className="text-gray-500 dark:text-gray-400">Showing:</span>
                            <span className="px-2.5 py-1 rounded-full bg-primary/10 text-primary font-semibold">
                                {CARD_FILTER_LABELS[cardFilter]}
                            </span>
                            <button
                                onClick={() => toggleCardFilter(cardFilter)}
                                className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 underline"
                            >
                                Clear filter
                            </button>
                        </div>
                    )}
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-10">
                        <button
                            type="button"
                            onClick={() => toggleCardFilter(null)}
                            className={`text-left bg-white dark:bg-gray-800 p-6 rounded-2xl shadow-sm border-2 transition-colors hover:border-primary/50 ${!cardFilter ? 'border-primary' : 'border-gray-200 dark:border-gray-700'}`}
                        >
                            <div className="flex items-center justify-between mb-4">
                                <h3 className="text-gray-500 dark:text-gray-400 font-medium">Total Orders</h3>
                                <Package className="text-blue-500" size={24} />
                            </div>
                            <p className="text-3xl font-bold">{totalOrders}</p>
                        </button>
                        <button
                            type="button"
                            onClick={() => toggleCardFilter('revenue')}
                            className={`text-left bg-white dark:bg-gray-800 p-6 rounded-2xl shadow-[0_0_15px_rgba(34,197,94,0.1)] border-2 transition-colors hover:border-primary ${cardFilter === 'revenue' ? 'border-primary' : 'border-primary/20'}`}
                        >
                            <div className="flex items-center justify-between mb-4">
                                <h3 className="text-gray-500 dark:text-gray-400 font-medium">Total Revenue</h3>
                                <DollarSign className="text-primary" size={24} />
                            </div>
                            <p className="text-3xl font-bold text-primary">₹{totalRevenue.toLocaleString()}</p>
                            <p className="text-xs text-gray-400 mt-1">Shipped + Delivered orders only</p>
                        </button>
                        <div className="bg-white dark:bg-gray-800 p-6 rounded-2xl shadow-sm border-2 border-gray-200 dark:border-gray-700">
                            <div className="flex items-center justify-between mb-4">
                                <h3 className="text-gray-500 dark:text-gray-400 font-medium">Items Sold</h3>
                                <ShoppingCart className="text-purple-500" size={24} />
                            </div>
                            <p className="text-3xl font-bold">{totalItems}</p>
                        </div>
                        <div className="bg-white dark:bg-gray-800 p-6 rounded-2xl shadow-sm border-2 border-gray-200 dark:border-gray-700">
                            <div className="flex items-center justify-between mb-4">
                                <h3 className="text-gray-500 dark:text-gray-400 font-medium">Payment Breakup</h3>
                                <CreditCard className="text-orange-500" size={24} />
                            </div>
                            <div className="flex justify-between items-center mt-2">
                                <button
                                    type="button"
                                    onClick={() => toggleCardFilter('cod')}
                                    className={`flex-1 text-left rounded-lg px-2 py-1 -ml-2 transition-colors hover:bg-orange-50 dark:hover:bg-orange-900/20 ${cardFilter === 'cod' ? 'ring-2 ring-primary' : ''}`}
                                >
                                    <p className="text-sm text-gray-500">COD</p><p className="text-xl font-bold">{codOrders}</p>
                                </button>
                                <div className="h-8 w-px bg-gray-200 dark:bg-gray-700" />
                                <button
                                    type="button"
                                    onClick={() => toggleCardFilter('prepaid')}
                                    className={`flex-1 text-left rounded-lg px-2 py-1 -mr-2 transition-colors hover:bg-orange-50 dark:hover:bg-orange-900/20 ${cardFilter === 'prepaid' ? 'ring-2 ring-primary' : ''}`}
                                >
                                    <p className="text-sm text-gray-500">Prepaid</p><p className="text-xl font-bold">{prepaidOrders}</p>
                                </button>
                            </div>
                        </div>
                    </div>

                    {/* Status Breakdown */}
                    <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-10">
                        <button
                            type="button"
                            onClick={() => toggleCardFilter('new')}
                            className={`text-left bg-yellow-50 dark:bg-yellow-900/20 p-6 rounded-xl border-2 flex items-center justify-between transition-colors hover:border-yellow-400 ${cardFilter === 'new' ? 'border-yellow-500' : 'border-yellow-200 dark:border-yellow-800'}`}
                        >
                            <div>
                                <p className="text-yellow-600 dark:text-yellow-400 font-medium mb-1">New Orders</p>
                                <p className="text-2xl font-bold text-yellow-700 dark:text-yellow-300">{statusCount.New}</p>
                            </div>
                            <div className="bg-yellow-100 dark:bg-yellow-800/50 p-3 rounded-full">
                                <RefreshCcw className="text-yellow-600 dark:text-yellow-400" size={24} />
                            </div>
                        </button>
                        <button
                            type="button"
                            onClick={() => toggleCardFilter('readyToDispatch')}
                            className={`text-left bg-indigo-50 dark:bg-indigo-900/20 p-6 rounded-xl border-2 flex items-center justify-between transition-colors hover:border-indigo-400 ${cardFilter === 'readyToDispatch' ? 'border-indigo-500' : 'border-indigo-200 dark:border-indigo-800'}`}
                        >
                            <div>
                                <p className="text-indigo-600 dark:text-indigo-400 font-medium mb-1">Ready to Dispatch</p>
                                <p className="text-2xl font-bold text-indigo-700 dark:text-indigo-300">{statusCount.ReadyToDispatch}</p>
                            </div>
                            <div className="bg-indigo-100 dark:bg-indigo-800/50 p-3 rounded-full">
                                <Package className="text-indigo-600 dark:text-indigo-400" size={24} />
                            </div>
                        </button>
                        <button
                            type="button"
                            onClick={() => toggleCardFilter('shipped')}
                            className={`text-left bg-blue-50 dark:bg-blue-900/20 p-6 rounded-xl border-2 flex items-center justify-between transition-colors hover:border-blue-400 ${cardFilter === 'shipped' ? 'border-blue-500' : 'border-blue-200 dark:border-blue-800'}`}
                        >
                            <div>
                                <p className="text-blue-600 dark:text-blue-400 font-medium mb-1">Shipped</p>
                                <p className="text-2xl font-bold text-blue-700 dark:text-blue-300">{statusCount.Shipped}</p>
                            </div>
                            <div className="bg-blue-100 dark:bg-blue-800/50 p-3 rounded-full">
                                <Truck className="text-blue-600 dark:text-blue-400" size={24} />
                            </div>
                        </button>
                        <button
                            type="button"
                            onClick={() => toggleCardFilter('delivered')}
                            className={`text-left bg-green-50 dark:bg-green-900/20 p-6 rounded-xl border-2 flex items-center justify-between transition-colors hover:border-green-400 ${cardFilter === 'delivered' ? 'border-green-500' : 'border-green-200 dark:border-green-800'}`}
                        >
                            <div>
                                <p className="text-green-600 dark:text-green-400 font-medium mb-1">Delivered</p>
                                <p className="text-2xl font-bold text-green-700 dark:text-green-300">{statusCount.Delivered}</p>
                            </div>
                            <div className="bg-green-100 dark:bg-green-800/50 p-3 rounded-full">
                                <CheckCircle className="text-green-600 dark:text-green-400" size={24} />
                            </div>
                        </button>
                    </div>

                    {/* Orders Table */}
                    {(() => {
                        // A condition whose operator needs a value but has none typed yet is
                        // incomplete — skip it so a half-built row doesn't blank out the table.
                        const activeConditions = conditions.filter(c =>
                            c.field && c.operator &&
                            (NO_VALUE_OPERATORS.includes(c.operator) || String(c.value ?? '').trim() !== ''));
                        const matchesConditions = (o) =>
                            activeConditions.length === 0 ||
                            (conditionJoin === 'AND'
                                ? activeConditions.every(c => evalCondition(o, c))
                                : activeConditions.some(c => evalCondition(o, c)));
                        // D1 timestamps start with 'YYYY-MM-DD', so string comparison against
                        // the <input type="date"> values is a correct date comparison.
                        const matchesDateRange = (o) => {
                            if (!dateFrom && !dateTo) return true;
                            const d = (o[dateField] || '').slice(0, 10);
                            if (!d) return false;
                            if (dateFrom && d < dateFrom) return false;
                            if (dateTo && d > dateTo) return false;
                            return true;
                        };

                        const addCondition = () =>
                            setConditions(prev => [...prev, { field: 'Name', operator: 'contains', value: '' }]);
                        const updateCondition = (i, patch) => {
                            setConditions(prev => prev.map((c, j) => {
                                if (j !== i) return c;
                                const next = { ...c, ...patch };
                                // Switching field resets operator/value — the old ones may not
                                // apply to the new field's type.
                                if (patch.field && patch.field !== c.field) {
                                    next.operator = OPERATORS_BY_TYPE[FILTER_FIELDS[patch.field].type][0];
                                    next.value = '';
                                }
                                return next;
                            }));
                            setPage(1);
                        };
                        const removeCondition = (i) => {
                            setConditions(prev => prev.filter((_, j) => j !== i));
                            setPage(1);
                        };
                        const clearAllFilters = () => {
                            setSearchId(''); setSearchName(''); setSearchMobile('');
                            setFilterStatus(''); setFilterType(''); setCardFilter(null);
                            setConditions([]); setDateFrom(''); setDateTo('');
                            setPage(1);
                        };
                        const anyFilterActive = searchId || searchName || searchMobile || filterStatus ||
                            filterType || cardFilter || conditions.length > 0 || dateFrom || dateTo;

                        // Derived filtered + sorted + paginated list (computed inline to access state)
                        const filtered = orders
                            .filter(matchesCardFilter)
                            .filter(o => !searchId   || String(o.id).includes(searchId.trim()))
                            .filter(o => !searchName || (o.Name || '').toLowerCase().includes(searchName.toLowerCase()))
                            .filter(o => !searchMobile || String(o.Mobile || '').includes(searchMobile.trim()))
                            .filter(o => !filterStatus || (o.OrderStatus || 'New') === filterStatus)
                            .filter(o => !filterType  || (filterType === 'COD' ? o.COD === 'Yes' : o.COD !== 'Yes'))
                            .filter(matchesConditions)
                            .filter(matchesDateRange)
                            .sort((a, b) => {
                                let av, bv;
                                if (sortCol === 'id')     { av = a.id;           bv = b.id; }
                                else if (sortCol === 'amount') { av = Number(a.AmountPaid || 0); bv = Number(b.AmountPaid || 0); }
                                else if (sortCol === 'name')   { av = (a.Name || '').toLowerCase(); bv = (b.Name || '').toLowerCase(); }
                                else if (sortCol === 'status') { av = a.OrderStatus || 'New'; bv = b.OrderStatus || 'New'; }
                                else if (sortCol === 'created') { av = a.CreatedAt || ''; bv = b.CreatedAt || ''; }
                                else if (sortCol === 'shipped') { av = a.ShippedAt || ''; bv = b.ShippedAt || ''; }
                                else { av = a.id; bv = b.id; }
                                if (av === bv) return 0;
                                return sortDir === 'asc' ? (av > bv ? 1 : -1) : (av < bv ? 1 : -1);
                            });
                        const totalPages  = Math.max(1, Math.ceil(filtered.length / pageSize));
                        const safePage    = Math.min(page, totalPages);
                        const paginated   = filtered.slice((safePage - 1) * pageSize, safePage * pageSize);

                        const SortIcon = ({ col }) => {
                            if (sortCol !== col) return <ChevronsUpDown size={13} className="text-gray-400" />;
                            return sortDir === 'asc'
                                ? <ChevronUp size={13} className="text-primary" />
                                : <ChevronDown size={13} className="text-primary" />;
                        };
                        const toggleSort = (col) => {
                            if (sortCol === col) setSortDir(d => d === 'asc' ? 'desc' : 'asc');
                            else { setSortCol(col); setSortDir('desc'); }
                            setPage(1);
                        };

                        return (
                            <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700 overflow-hidden">
                                {/* Table header + filters */}
                                <div className="p-4 border-b border-gray-100 dark:border-gray-700 space-y-3">
                                    <div className="flex flex-wrap items-center justify-between gap-2">
                                        <h2 className="text-xl font-bold font-heading">
                                            Orders
                                            <span className="ml-2 text-sm font-normal text-gray-400">
                                                {filtered.length} of {orders.length}
                                            </span>
                                        </h2>
                                        <div className="flex items-center gap-2">
                                            <label className="text-xs text-gray-500">Rows:</label>
                                            <select
                                                value={pageSize}
                                                onChange={e => { setPageSize(Number(e.target.value)); setPage(1); }}
                                                className="bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 text-sm rounded-lg px-2 py-1.5 focus:ring-primary focus:border-primary"
                                            >
                                                {[10, 20, 50, 100].map(n => <option key={n} value={n}>{n}</option>)}
                                            </select>
                                        </div>
                                    </div>

                                    {/* Column-level search + advanced filters */}
                                    <div className="flex flex-wrap gap-2">
                                        <div className="relative">
                                            <Search size={13} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
                                            <input
                                                type="text"
                                                placeholder="Order ID…"
                                                value={searchId}
                                                onChange={e => { setSearchId(e.target.value); setPage(1); }}
                                                className="bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 text-sm rounded-lg pl-7 pr-3 py-1.5 w-28 focus:outline-none focus:ring-1 focus:ring-primary"
                                            />
                                        </div>
                                        <div className="relative">
                                            <Search size={13} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
                                            <input
                                                type="text"
                                                placeholder="Customer name…"
                                                value={searchName}
                                                onChange={e => { setSearchName(e.target.value); setPage(1); }}
                                                className="bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 text-sm rounded-lg pl-7 pr-3 py-1.5 w-44 focus:outline-none focus:ring-1 focus:ring-primary"
                                            />
                                        </div>
                                        <div className="relative">
                                            <Search size={13} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
                                            <input
                                                type="text"
                                                placeholder="Phone number…"
                                                value={searchMobile}
                                                onChange={e => { setSearchMobile(e.target.value); setPage(1); }}
                                                className="bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 text-sm rounded-lg pl-7 pr-3 py-1.5 w-36 focus:outline-none focus:ring-1 focus:ring-primary"
                                            />
                                        </div>
                                        <select
                                            value={filterStatus}
                                            onChange={e => { setFilterStatus(e.target.value); setPage(1); }}
                                            className="bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 text-sm rounded-lg px-3 py-1.5 focus:ring-primary focus:border-primary"
                                        >
                                            <option value="">All Statuses</option>
                                            {ALL_ORDER_STATUSES.map(s => <option key={s} value={s}>{s}</option>)}
                                        </select>
                                        <select
                                            value={filterType}
                                            onChange={e => { setFilterType(e.target.value); setPage(1); }}
                                            className="bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 text-sm rounded-lg px-3 py-1.5 focus:ring-primary focus:border-primary"
                                        >
                                            <option value="">All Types</option>
                                            <option value="COD">COD</option>
                                            <option value="Prepaid">Prepaid</option>
                                        </select>
                                        <button
                                            onClick={() => setShowAdvanced(s => !s)}
                                            className={`text-xs font-semibold flex items-center gap-1 px-2 py-1.5 border rounded-lg transition-colors ${
                                                showAdvanced || activeConditions.length > 0 || dateFrom || dateTo
                                                    ? 'text-primary border-primary/40 bg-primary/5'
                                                    : 'text-gray-500 border-gray-200 dark:border-gray-700 hover:text-gray-700 dark:hover:text-gray-300'
                                            }`}
                                            title="Multi-field condition filters and date range"
                                        >
                                            <SlidersHorizontal size={12} /> Advanced
                                            {(activeConditions.length > 0 || dateFrom || dateTo) && (
                                                <span className="bg-primary text-black text-[10px] font-bold rounded-full px-1.5 py-0.5 leading-none">
                                                    {activeConditions.length + ((dateFrom || dateTo) ? 1 : 0)}
                                                </span>
                                            )}
                                            {showAdvanced ? <ChevronUp size={12} /> : <ChevronDown size={12} />}
                                        </button>
                                        {anyFilterActive && (
                                            <button
                                                onClick={clearAllFilters}
                                                className="text-xs text-red-500 hover:text-red-700 flex items-center gap-1 px-2 py-1.5 border border-red-200 dark:border-red-800 rounded-lg"
                                            >
                                                <X size={12} /> Clear
                                            </button>
                                        )}
                                        <div className="relative">
                                            <button
                                                onClick={() => setShowExportMenu(o => !o)}
                                                disabled={filtered.length === 0 || exporting}
                                                className="text-xs font-semibold text-primary hover:brightness-90 flex items-center gap-1 px-2 py-1.5 border border-primary/40 rounded-lg disabled:opacity-40 disabled:cursor-not-allowed"
                                                title="Export shipping address labels for the currently filtered orders"
                                            >
                                                <Printer size={12} /> Export Labels ({filtered.length}) <ChevronDown size={12} />
                                            </button>
                                            {showExportMenu && (
                                                <>
                                                    <div className="fixed inset-0 z-10" onClick={() => setShowExportMenu(false)} />
                                                    <div className="absolute right-0 mt-1 w-44 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg shadow-lg z-20 overflow-hidden">
                                                        <button
                                                            onClick={() => { setShowExportMenu(false); window.print(); }}
                                                            className="w-full text-left px-3 py-2 text-xs font-medium hover:bg-gray-100 dark:hover:bg-gray-700 flex items-center gap-2"
                                                        >
                                                            <Printer size={13} /> Print (Browser)
                                                        </button>
                                                        <button
                                                            onClick={async () => { setShowExportMenu(false); setExporting(true); try { await exportLabelsAsPdf(filtered); } finally { setExporting(false); } }}
                                                            className="w-full text-left px-3 py-2 text-xs font-medium hover:bg-gray-100 dark:hover:bg-gray-700 flex items-center gap-2 border-t border-gray-100 dark:border-gray-700"
                                                        >
                                                            <FileText size={13} /> Export as PDF
                                                        </button>
                                                        <button
                                                            onClick={async () => { setShowExportMenu(false); setExporting(true); try { await exportLabelsAsWord(filtered); } finally { setExporting(false); } }}
                                                            className="w-full text-left px-3 py-2 text-xs font-medium hover:bg-gray-100 dark:hover:bg-gray-700 flex items-center gap-2 border-t border-gray-100 dark:border-gray-700"
                                                        >
                                                            <FileType size={13} /> Export as Word
                                                        </button>
                                                    </div>
                                                </>
                                            )}
                                        </div>
                                    </div>

                                    {/* Advanced condition builder + date range (ServiceNow-style) */}
                                    {showAdvanced && (
                                        <div className="rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900/50 p-3 space-y-2">
                                            <div className="flex flex-wrap items-center gap-2 text-xs font-semibold text-gray-500 dark:text-gray-400">
                                                <span>Match</span>
                                                <select
                                                    value={conditionJoin}
                                                    onChange={e => { setConditionJoin(e.target.value); setPage(1); }}
                                                    className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 text-xs rounded-lg px-2 py-1 focus:ring-primary focus:border-primary"
                                                >
                                                    <option value="AND">all (AND)</option>
                                                    <option value="OR">any (OR)</option>
                                                </select>
                                                <span>of the following conditions:</span>
                                            </div>

                                            {conditions.map((c, i) => {
                                                const def = FILTER_FIELDS[c.field];
                                                return (
                                                    <div key={i} className="flex flex-wrap items-center gap-2">
                                                        <select
                                                            value={c.field}
                                                            onChange={ev => updateCondition(i, { field: ev.target.value })}
                                                            className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 text-xs rounded-lg px-2 py-1.5 focus:ring-primary focus:border-primary"
                                                        >
                                                            {Object.entries(FILTER_FIELDS).map(([k, f]) => (
                                                                <option key={k} value={k}>{f.label}</option>
                                                            ))}
                                                        </select>
                                                        <select
                                                            value={c.operator}
                                                            onChange={ev => updateCondition(i, { operator: ev.target.value })}
                                                            className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 text-xs rounded-lg px-2 py-1.5 focus:ring-primary focus:border-primary"
                                                        >
                                                            {OPERATORS_BY_TYPE[def.type].map(op => (
                                                                <option key={op} value={op}>{op}</option>
                                                            ))}
                                                        </select>
                                                        {!NO_VALUE_OPERATORS.includes(c.operator) && (
                                                            def.type === 'select' ? (
                                                                <select
                                                                    value={c.value}
                                                                    onChange={ev => updateCondition(i, { value: ev.target.value })}
                                                                    className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 text-xs rounded-lg px-2 py-1.5 focus:ring-primary focus:border-primary"
                                                                >
                                                                    <option value="">— select —</option>
                                                                    {def.options.map(opt => <option key={opt} value={opt}>{opt}</option>)}
                                                                </select>
                                                            ) : (
                                                                <input
                                                                    type={def.type === 'number' ? 'number' : 'text'}
                                                                    value={c.value}
                                                                    onChange={ev => updateCondition(i, { value: ev.target.value })}
                                                                    placeholder="Value…"
                                                                    className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 text-xs rounded-lg px-2 py-1.5 w-40 focus:outline-none focus:ring-1 focus:ring-primary"
                                                                />
                                                            )
                                                        )}
                                                        <button
                                                            onClick={() => removeCondition(i)}
                                                            className="p-1.5 rounded-lg text-gray-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20"
                                                            title="Remove condition"
                                                        >
                                                            <X size={13} />
                                                        </button>
                                                    </div>
                                                );
                                            })}

                                            <button
                                                onClick={addCondition}
                                                className="text-xs font-semibold text-primary hover:brightness-90 flex items-center gap-1"
                                            >
                                                <Plus size={13} /> Add condition
                                            </button>

                                            <div className="flex flex-wrap items-center gap-2 pt-2 border-t border-gray-200 dark:border-gray-700">
                                                <span className="text-xs font-semibold text-gray-500 dark:text-gray-400">Date range:</span>
                                                <select
                                                    value={dateField}
                                                    onChange={e => { setDateField(e.target.value); setPage(1); }}
                                                    className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 text-xs rounded-lg px-2 py-1.5 focus:ring-primary focus:border-primary"
                                                >
                                                    {Object.entries(DATE_FILTER_FIELDS).map(([k, label]) => (
                                                        <option key={k} value={k}>{label} date</option>
                                                    ))}
                                                </select>
                                                <input
                                                    type="date"
                                                    value={dateFrom}
                                                    onChange={e => { setDateFrom(e.target.value); setPage(1); }}
                                                    className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 text-xs rounded-lg px-2 py-1.5 focus:outline-none focus:ring-1 focus:ring-primary"
                                                />
                                                <span className="text-xs text-gray-400">to</span>
                                                <input
                                                    type="date"
                                                    value={dateTo}
                                                    onChange={e => { setDateTo(e.target.value); setPage(1); }}
                                                    className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 text-xs rounded-lg px-2 py-1.5 focus:outline-none focus:ring-1 focus:ring-primary"
                                                />
                                                {(dateFrom || dateTo) && (
                                                    <button
                                                        onClick={() => { setDateFrom(''); setDateTo(''); setPage(1); }}
                                                        className="p-1.5 rounded-lg text-gray-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20"
                                                        title="Clear date range"
                                                    >
                                                        <X size={13} />
                                                    </button>
                                                )}
                                            </div>
                                        </div>
                                    )}
                                </div>

                                {/* Print-only shipping labels — mirrors whatever the search/filter
                                    controls above currently narrow `filtered` down to, so printing
                                    a subset (e.g. only "Shipped" orders) just works. Hidden on
                                    screen; the @media print rule below hides everything else and
                                    shows only this. */}
                                <style>{`
                                    #print-labels { display: none; }
                                    @media print {
                                        body * { visibility: hidden; }
                                        #print-labels, #print-labels * { visibility: visible; }
                                        #print-labels { display: block; position: absolute; left: 0; top: 0; width: 100%; }
                                    }
                                `}</style>
                                <div id="print-labels">
                                    {filtered.map(order => (
                                        <div
                                            key={order.id}
                                            style={{
                                                display: 'flex', gap: '10mm',
                                                padding: '3mm 2mm', borderBottom: '1px dashed #999',
                                                fontSize: '10.5px', lineHeight: 1.35,
                                                breakInside: 'avoid',
                                            }}
                                        >
                                            <div style={{ flex: 1 }}>
                                                <div style={{ fontWeight: 700 }}>FROM:</div>
                                                <div style={{ fontWeight: 700 }}>{SENDER.name}</div>
                                                {SENDER.addressLines.map((line, i) => (
                                                    <div key={i} style={{ whiteSpace: 'nowrap' }}>{line}</div>
                                                ))}
                                                <div>☎ {SENDER.phone}</div>
                                            </div>
                                            <div style={{ flex: 1 }}>
                                                <div style={{ fontWeight: 700 }}>TO:</div>
                                                <div style={{ fontWeight: 700 }}>{order.Name || 'N/A'}</div>
                                                {(order.Address || '').split(',').map(part => part.trim()).filter(Boolean).map((line, i) => (
                                                    <div key={i}>{line}</div>
                                                ))}
                                                <div>☎ {order.Mobile || 'N/A'}</div>
                                            </div>
                                        </div>
                                    ))}
                                </div>

                                <div className="overflow-x-auto border-2 border-gray-200 dark:border-gray-700 rounded-lg">
                                    <table className="w-full text-left border-collapse text-sm">
                                        <thead>
                                            <tr className="bg-gray-50 dark:bg-gray-900/50 text-gray-500 dark:text-gray-400">
                                                <th className="py-1.5 px-2.5 font-medium border border-gray-200 dark:border-gray-700">
                                                    <button onClick={() => toggleSort('id')} className="flex items-center gap-1 hover:text-gray-900 dark:hover:text-gray-100">
                                                        Order ID <SortIcon col="id" />
                                                    </button>
                                                </th>
                                                <th className="py-1.5 px-2.5 font-medium border border-gray-200 dark:border-gray-700">
                                                    <button onClick={() => toggleSort('name')} className="flex items-center gap-1 hover:text-gray-900 dark:hover:text-gray-100">
                                                        Customer <SortIcon col="name" />
                                                    </button>
                                                </th>
                                                <th className="py-1.5 px-2.5 font-medium border border-gray-200 dark:border-gray-700">Mobile</th>
                                                <th className="py-1.5 px-2.5 font-medium border border-gray-200 dark:border-gray-700">
                                                    <button onClick={() => toggleSort('amount')} className="flex items-center gap-1 hover:text-gray-900 dark:hover:text-gray-100">
                                                        Amount <SortIcon col="amount" />
                                                    </button>
                                                </th>
                                                <th className="py-1.5 px-2.5 font-medium border border-gray-200 dark:border-gray-700">Type</th>
                                                <th className="py-1.5 px-2.5 font-medium border border-gray-200 dark:border-gray-700">
                                                    <button onClick={() => toggleSort('status')} className="flex items-center gap-1 hover:text-gray-900 dark:hover:text-gray-100">
                                                        Status <SortIcon col="status" />
                                                    </button>
                                                </th>
                                                <th className="py-1.5 px-2.5 font-medium border border-gray-200 dark:border-gray-700">
                                                    <button onClick={() => toggleSort('created')} className="flex items-center gap-1 hover:text-gray-900 dark:hover:text-gray-100">
                                                        Created <SortIcon col="created" />
                                                    </button>
                                                </th>
                                                <th className="py-1.5 px-2.5 font-medium border border-gray-200 dark:border-gray-700">Details</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {paginated.length > 0 ? paginated.map(order => {
                                                const id       = order.id;
                                                const name     = order.Name   || 'N/A';
                                                const amount   = order.AmountPaid || 0;
                                                const isCOD    = order.COD === 'Yes';
                                                const status   = order.OrderStatus || 'New';
                                                const isOpen   = expandedOrderId === id;
                                                const edit     = orderEditState[id] || { trackingId: '', shippingCompany: '', status: 'New', shippedAt: '', deliveredAt: '' };
                                                const needsShippingFields = edit.status === 'Shipped' && (!edit.trackingId?.trim() || !edit.shippingCompany?.trim());
                                                return (
                                                <React.Fragment key={id}>
                                                    <tr className="odd:bg-white even:bg-gray-50 dark:odd:bg-gray-800 dark:even:bg-gray-900/30 hover:bg-primary/5 dark:hover:bg-primary/10 transition-colors">
                                                        <td className="py-1.5 px-2.5 border border-gray-200 dark:border-gray-700 font-mono font-semibold text-primary">
                                                            LT-{id}
                                                            {order.CfOrderId && (
                                                                <div className="text-[10px] font-normal text-gray-400 truncate max-w-[120px]" title={`Cashfree Order ID: ${order.CfOrderId}`}>
                                                                    CF: {order.CfOrderId}
                                                                </div>
                                                            )}
                                                        </td>
                                                        <td className="py-1.5 px-2.5 border border-gray-200 dark:border-gray-700">
                                                            <div className="font-medium">{name}</div>
                                                            {order.Email && <div className="text-xs text-gray-400 truncate max-w-[160px]">{order.Email}</div>}
                                                        </td>
                                                        <td className="py-1.5 px-2.5 border border-gray-200 dark:border-gray-700">
                                                            {order.Mobile ? (
                                                                <a
                                                                    href={whatsappLink(order.Mobile)}
                                                                    target="_blank"
                                                                    rel="noopener noreferrer"
                                                                    title="Message on WhatsApp"
                                                                    className="flex items-center gap-1.5 text-green-600 dark:text-green-400 font-medium hover:underline"
                                                                >
                                                                    <MessageCircle size={14} /> {order.Mobile}
                                                                </a>
                                                            ) : <span className="text-gray-400">—</span>}
                                                        </td>
                                                        <td className="py-1.5 px-2.5 border border-gray-200 dark:border-gray-700 font-semibold text-primary">₹{amount}</td>
                                                        <td className="py-1.5 px-2.5 border border-gray-200 dark:border-gray-700">
                                                            <span className={`px-2.5 py-1 text-xs font-medium rounded-full ${isCOD ? 'bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400' : 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400'}`}>
                                                                {isCOD ? 'COD' : 'Prepaid'}
                                                            </span>
                                                        </td>
                                                        <td className="py-1.5 px-2.5 border border-gray-200 dark:border-gray-700">
                                                            <span className={`px-2.5 py-1 text-xs font-medium rounded-full ${
                                                                status === 'New' ? 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400' :
                                                                status === 'Processing' ? 'bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400' :
                                                                status === 'Ready to dispatch' ? 'bg-indigo-100 text-indigo-700 dark:bg-indigo-900/30 dark:text-indigo-400' :
                                                                status === 'Shipped' ? 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400' :
                                                                status === 'Delivered' ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400' :
                                                                status === 'Cancelled' || status === 'Payment Failed' ? 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400' :
                                                                'bg-gray-100 text-gray-700 dark:bg-gray-900/30 dark:text-gray-400'
                                                            }`}>
                                                                {status}
                                                            </span>
                                                        </td>
                                                        <td className="py-1.5 px-2.5 border border-gray-200 dark:border-gray-700 whitespace-nowrap">
                                                            {formatDate(order.CreatedAt) || <span className="text-gray-400">—</span>}
                                                        </td>
                                                        <td className="py-1.5 px-2.5 border border-gray-200 dark:border-gray-700">
                                                            <button
                                                                onClick={() => setExpandedOrderId(isOpen ? null : id)}
                                                                className="p-1.5 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-500"
                                                                title="View order details"
                                                            >
                                                                {isOpen ? <ChevronUp size={16} /> : <Eye size={16} />}
                                                            </button>
                                                        </td>
                                                    </tr>
                                                    {isOpen && (
                                                        <tr className="bg-gray-50 dark:bg-gray-900/40">
                                                            <td colSpan="8" className="p-5 border border-gray-200 dark:border-gray-700">
                                                                <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                                                                    <div>
                                                                        <p className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-1">Shipping Address</p>
                                                                        <p className="text-sm">{order.Address || '—'}</p>
                                                                        <p className="text-xs font-bold text-gray-400 uppercase tracking-wider mt-3 mb-1">Products</p>
                                                                        <p className="text-sm whitespace-pre-line">{order.ProductList || '—'}</p>
                                                                        <p className="text-xs font-bold text-gray-400 uppercase tracking-wider mt-3 mb-1">Cashfree Order ID</p>
                                                                        <p className="text-sm font-mono break-all">{order.CfOrderId || '—'}</p>
                                                                    </div>
                                                                    <div className="flex flex-col gap-3">
                                                                        <div className="grid grid-cols-2 gap-3">
                                                                            <div>
                                                                                <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-1">Order Status</label>
                                                                                <select
                                                                                    value={edit.status}
                                                                                    onChange={ev => handleOrderEdit(id, 'status', ev.target.value)}
                                                                                    className="w-full px-3 py-2 rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
                                                                                >
                                                                                    {ALL_ORDER_STATUSES.map(s => <option key={s} value={s}>{s}</option>)}
                                                                                </select>
                                                                            </div>
                                                                            <div>
                                                                                <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-1">Shipping Company</label>
                                                                                <input
                                                                                    type="text"
                                                                                    value={edit.shippingCompany}
                                                                                    onChange={ev => handleOrderEdit(id, 'shippingCompany', ev.target.value)}
                                                                                    placeholder="e.g. Delhivery, Blue Dart…"
                                                                                    className="w-full px-3 py-2 rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
                                                                                />
                                                                            </div>
                                                                            <div>
                                                                                <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-1">Tracking ID</label>
                                                                                <input
                                                                                    type="text"
                                                                                    value={edit.trackingId}
                                                                                    onChange={ev => handleOrderEdit(id, 'trackingId', ev.target.value)}
                                                                                    placeholder="Courier tracking number"
                                                                                    className="w-full px-3 py-2 rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
                                                                                />
                                                                            </div>
                                                                            <div>
                                                                                <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-1">Shipped Date</label>
                                                                                <input
                                                                                    type="date"
                                                                                    value={edit.shippedAt}
                                                                                    onChange={ev => handleOrderEdit(id, 'shippedAt', ev.target.value)}
                                                                                    className="w-full px-3 py-2 rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
                                                                                />
                                                                            </div>
                                                                            <div>
                                                                                <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-1">Delivered Date</label>
                                                                                <input
                                                                                    type="date"
                                                                                    value={edit.deliveredAt}
                                                                                    onChange={ev => handleOrderEdit(id, 'deliveredAt', ev.target.value)}
                                                                                    className="w-full px-3 py-2 rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
                                                                                />
                                                                            </div>
                                                                        </div>
                                                                        {needsShippingFields && (
                                                                            <p className="text-xs text-red-500 font-medium">
                                                                                Tracking ID and Shipping Company are required to mark this order as Shipped.
                                                                            </p>
                                                                        )}
                                                                        <button
                                                                            onClick={() => saveOrderShipping(id)}
                                                                            disabled={savingOrderId === id || needsShippingFields}
                                                                            className="self-start px-5 py-2 bg-primary text-black rounded-lg font-bold text-sm hover:brightness-90 transition-all disabled:opacity-60"
                                                                        >
                                                                            {savingOrderId === id ? 'Saving…' : 'Save Order Details'}
                                                                        </button>
                                                                    </div>
                                                                </div>
                                                            </td>
                                                        </tr>
                                                    )}
                                                </React.Fragment>
                                                );
                                            }) : (
                                                <tr>
                                                    <td colSpan="8" className="p-8 text-center text-gray-500 border border-gray-200 dark:border-gray-700">
                                                        {orders.length === 0 ? 'No orders yet.' : 'No orders match your filters.'}
                                                    </td>
                                                </tr>
                                            )}
                                        </tbody>
                                    </table>
                                </div>

                                {/* Pagination */}
                                {totalPages > 1 && (
                                    <div className="flex items-center justify-between px-4 py-3 border-t border-gray-100 dark:border-gray-700 text-sm text-gray-500">
                                        <span>
                                            Showing {Math.min((safePage - 1) * pageSize + 1, filtered.length)}–{Math.min(safePage * pageSize, filtered.length)} of {filtered.length}
                                        </span>
                                        <div className="flex items-center gap-1">
                                            <button
                                                onClick={() => setPage(p => Math.max(1, p - 1))}
                                                disabled={safePage === 1}
                                                className="p-1.5 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 disabled:opacity-40 disabled:cursor-not-allowed"
                                            >
                                                <ChevronLeft size={16} />
                                            </button>
                                            {Array.from({ length: Math.min(7, totalPages) }, (_, i) => {
                                                // Show pages around current
                                                let p;
                                                if (totalPages <= 7) {
                                                    p = i + 1;
                                                } else if (safePage <= 4) {
                                                    p = i < 5 ? i + 1 : i === 5 ? null : totalPages;
                                                } else if (safePage >= totalPages - 3) {
                                                    p = i === 0 ? 1 : i === 1 ? null : totalPages - (6 - i);
                                                } else {
                                                    p = i === 0 ? 1 : i === 1 ? null : i === 5 ? null : i === 6 ? totalPages : safePage + (i - 3);
                                                }
                                                if (p === null) return <span key={i} className="px-1">…</span>;
                                                return (
                                                    <button
                                                        key={i}
                                                        onClick={() => setPage(p)}
                                                        className={`w-8 h-8 rounded-lg text-sm font-medium transition-colors ${safePage === p ? 'bg-primary text-black' : 'hover:bg-gray-100 dark:hover:bg-gray-700'}`}
                                                    >
                                                        {p}
                                                    </button>
                                                );
                                            })}
                                            <button
                                                onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                                                disabled={safePage === totalPages}
                                                className="p-1.5 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 disabled:opacity-40 disabled:cursor-not-allowed"
                                            >
                                                <ChevronRight size={16} />
                                            </button>
                                        </div>
                                    </div>
                                )}
                            </div>
                        );
                    })()}
                </>
            )}

            {/* ── CUSTOM ORDERS TAB ──────────────────────────────────────────────── */}
            {activeTab === 'custom' && (
                <div>
                    {loadingCustom ? (
                        <div className="flex justify-center py-20">
                            <div className="animate-spin rounded-full h-10 w-10 border-4 border-primary border-t-transparent" />
                        </div>
                    ) : customOrders.length === 0 ? (
                        <div className="text-center py-20 text-gray-500">
                            <Shirt size={48} className="mx-auto mb-4 opacity-30" />
                            <p>No custom orders yet.</p>
                        </div>
                    ) : (
                        <div className="space-y-6">
                            {customOrders.map(order => {
                                const e = editState[order.id] || { price: '', status: order.status };
                                let detailsParsed = [];
                                try { detailsParsed = JSON.parse(order.order_details || '[]'); } catch {}

                                return (
                                    <div key={order.id} className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-100 dark:border-gray-700 shadow-sm overflow-hidden">
                                        {/* Card header */}
                                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-5 border-b border-gray-100 dark:border-gray-700">
                                            <div className="flex items-center gap-3">
                                                <span className="font-bold text-lg">#{order.id}</span>
                                                <span className={`px-3 py-1 rounded-full text-xs font-bold ${CUSTOM_STATUS_COLOR[order.status] || ''}`}>
                                                    {order.status}
                                                </span>
                                                <span className="text-sm text-gray-500 hidden sm:block">
                                                    {new Date(order.created_at.replace(' ', 'T') + 'Z').toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}
                                                </span>
                                            </div>
                                            <div className="flex items-center gap-3 text-sm text-gray-600 dark:text-gray-400">
                                                <span>
                                                    <span className="font-semibold">{order.customer_name || 'Unknown'}</span>
                                                    {order.customer_email && (
                                                        <span className="ml-2 text-gray-400">({order.customer_email})</span>
                                                    )}
                                                </span>
                                                {order.customer_phone && (
                                                    <>
                                                        <span className="font-mono text-xs">{order.customer_phone}</span>
                                                        <a
                                                            href={whatsappLink(order.customer_phone)}
                                                            target="_blank"
                                                            rel="noopener noreferrer"
                                                            title="Message on WhatsApp"
                                                            className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400 font-semibold text-xs hover:bg-green-200 dark:hover:bg-green-900/50 transition-colors"
                                                        >
                                                            <MessageCircle size={13} /> WhatsApp
                                                        </a>
                                                    </>
                                                )}
                                            </div>
                                        </div>

                                        <div className="flex flex-col lg:flex-row gap-0">
                                            {/* Design image (jersey only) — only render safe MIME types */}
                                            {order.order_type === 'jersey' && order.design_image &&
                                             ['data:image/jpeg;base64,','data:image/png;base64,','data:image/webp;base64,'].some(m => order.design_image.startsWith(m)) && (
                                                <div className="lg:w-48 shrink-0 p-5 flex flex-col items-center gap-3 border-b lg:border-b-0 lg:border-r border-gray-100 dark:border-gray-700">
                                                    <p className="text-xs font-bold text-gray-400 uppercase tracking-wider self-start lg:self-auto">Design</p>
                                                    <img
                                                        src={order.design_image}
                                                        alt="Customer design"
                                                        className="w-32 h-32 object-contain rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900 cursor-zoom-in"
                                                        onClick={() => setPreviewImage(order.design_image)}
                                                    />
                                                    <button
                                                        onClick={() => setPreviewImage(order.design_image)}
                                                        className="flex items-center gap-1 text-xs text-primary font-semibold hover:underline"
                                                    >
                                                        <Eye size={12} /> Full view
                                                    </button>
                                                </div>
                                            )}

                                            {/* Order details */}
                                            <div className="flex-1 p-5">
                                                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-5 text-sm">
                                                    <div>
                                                        <p className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-1">Type</p>
                                                        <p className="font-semibold capitalize">{order.order_type === 'jersey' ? 'Jersey Design' : 'Team Names'}</p>
                                                    </div>
                                                    <div>
                                                        <p className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-1">Shirt</p>
                                                        <p className="font-semibold capitalize">{order.shirt_color} · {order.shirt_style === 'round' ? 'Regular' : 'Oversized'}</p>
                                                    </div>
                                                    <div>
                                                        <p className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-1">Total Qty</p>
                                                        <p className="font-semibold">{order.quantity} pcs</p>
                                                    </div>
                                                    <div>
                                                        <p className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-1">Current Quote</p>
                                                        <p className="font-semibold text-primary">
                                                            {order.quoted_price != null ? `₹${Number(order.quoted_price).toLocaleString('en-IN')}` : '—'}
                                                        </p>
                                                    </div>
                                                </div>

                                                {/* Order details breakdown */}
                                                {detailsParsed.length > 0 && (
                                                    <div className="mb-5">
                                                        <p className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-2">
                                                            {order.order_type === 'jersey' ? 'Sizes' : 'Names List'}
                                                        </p>
                                                        {order.order_type === 'jersey' ? (
                                                            <div className="flex flex-wrap gap-2">
                                                                {detailsParsed.map((r, i) => (
                                                                    <span key={i} className="px-3 py-1 bg-gray-100 dark:bg-gray-700 rounded-full text-xs font-semibold">
                                                                        {r.size} × {r.qty}
                                                                    </span>
                                                                ))}
                                                            </div>
                                                        ) : (
                                                            <div className="max-h-40 overflow-y-auto">
                                                                <table className="text-xs w-full">
                                                                    <thead>
                                                                        <tr className="text-gray-400">
                                                                            <th className="text-left pb-1 font-bold uppercase tracking-wider">Name</th>
                                                                            <th className="text-left pb-1 font-bold uppercase tracking-wider pl-4">Size</th>
                                                                            <th className="text-left pb-1 font-bold uppercase tracking-wider pl-4">Qty</th>
                                                                        </tr>
                                                                    </thead>
                                                                    <tbody>
                                                                        {detailsParsed.map((r, i) => (
                                                                            <tr key={i} className="border-t border-gray-100 dark:border-gray-700">
                                                                                <td className="py-1 font-medium">{r.name}</td>
                                                                                <td className="py-1 pl-4">{r.size}</td>
                                                                                <td className="py-1 pl-4">{r.qty}</td>
                                                                            </tr>
                                                                        ))}
                                                                    </tbody>
                                                                </table>
                                                            </div>
                                                        )}
                                                    </div>
                                                )}

                                                {order.notes && (
                                                    <p className="text-xs text-gray-500 italic mb-5">Note: {order.notes}</p>
                                                )}

                                                {/* Quote + Status update */}
                                                <div className="flex flex-wrap items-end gap-3 pt-4 border-t border-gray-100 dark:border-gray-700">
                                                    <div>
                                                        <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-1">
                                                            Set Quoted Price (₹)
                                                        </label>
                                                        <input
                                                            type="number"
                                                            min="0"
                                                            step="1"
                                                            value={e.price}
                                                            onChange={ev => handleCustomEdit(order.id, 'price', ev.target.value)}
                                                            placeholder="e.g. 2500"
                                                            className="w-36 px-3 py-2 rounded-lg border border-gray-200 dark:border-gray-700 bg-transparent text-sm focus:outline-none focus:ring-2 focus:ring-primary"
                                                        />
                                                    </div>
                                                    <div>
                                                        <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-1">Status</label>
                                                        <select
                                                            value={e.status}
                                                            onChange={ev => handleCustomEdit(order.id, 'status', ev.target.value)}
                                                            className="px-3 py-2 rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
                                                        >
                                                            {CUSTOM_STATUSES.map(s => (
                                                                <option key={s} value={s}>{s}</option>
                                                            ))}
                                                        </select>
                                                    </div>
                                                    <button
                                                        onClick={() => saveCustomQuote(order.id)}
                                                        disabled={savingId === order.id}
                                                        className="px-5 py-2 bg-primary text-black rounded-lg font-bold text-sm hover:brightness-90 transition-all disabled:opacity-60"
                                                    >
                                                        {savingId === order.id ? 'Saving…' : 'Save'}
                                                    </button>

                                                    {order.confirmed_order_id && (
                                                        <span className="text-xs text-green-600 dark:text-green-400 font-semibold ml-2">
                                                            → Regular Order #{order.confirmed_order_id}
                                                        </span>
                                                    )}
                                                </div>

                                                {/* Shipping — only once the customer has paid and the custom
                                                    order became a real order (orders.id === confirmed_order_id) */}
                                                {order.confirmed_order_id && (() => {
                                                    const shipEdit = orderEditState[order.confirmed_order_id] || { trackingId: '', shippingCompany: '', status: 'New', shippedAt: '', deliveredAt: '' };
                                                    const needsShippingFields = shipEdit.status === 'Shipped' && (!shipEdit.trackingId?.trim() || !shipEdit.shippingCompany?.trim());
                                                    return (
                                                        <div className="mt-4 pt-4 border-t border-gray-100 dark:border-gray-700">
                                                            <p className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-3">
                                                                Shipping — Order #{order.confirmed_order_id}
                                                            </p>
                                                            <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                                                                <div>
                                                                    <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-1">Order Status</label>
                                                                    <select
                                                                        value={shipEdit.status}
                                                                        onChange={ev => handleOrderEdit(order.confirmed_order_id, 'status', ev.target.value)}
                                                                        className="w-full px-3 py-2 rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
                                                                    >
                                                                        {ALL_ORDER_STATUSES.map(s => <option key={s} value={s}>{s}</option>)}
                                                                    </select>
                                                                </div>
                                                                <div>
                                                                    <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-1">Shipping Company</label>
                                                                    <input
                                                                        type="text"
                                                                        value={shipEdit.shippingCompany}
                                                                        onChange={ev => handleOrderEdit(order.confirmed_order_id, 'shippingCompany', ev.target.value)}
                                                                        placeholder="e.g. Delhivery, Blue Dart…"
                                                                        className="w-full px-3 py-2 rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
                                                                    />
                                                                </div>
                                                                <div>
                                                                    <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-1">Tracking ID</label>
                                                                    <input
                                                                        type="text"
                                                                        value={shipEdit.trackingId}
                                                                        onChange={ev => handleOrderEdit(order.confirmed_order_id, 'trackingId', ev.target.value)}
                                                                        placeholder="Courier tracking number"
                                                                        className="w-full px-3 py-2 rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
                                                                    />
                                                                </div>
                                                                <div>
                                                                    <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-1">Shipped Date</label>
                                                                    <input
                                                                        type="date"
                                                                        value={shipEdit.shippedAt}
                                                                        onChange={ev => handleOrderEdit(order.confirmed_order_id, 'shippedAt', ev.target.value)}
                                                                        className="w-full px-3 py-2 rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
                                                                    />
                                                                </div>
                                                                <div>
                                                                    <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-1">Delivered Date</label>
                                                                    <input
                                                                        type="date"
                                                                        value={shipEdit.deliveredAt}
                                                                        onChange={ev => handleOrderEdit(order.confirmed_order_id, 'deliveredAt', ev.target.value)}
                                                                        className="w-full px-3 py-2 rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
                                                                    />
                                                                </div>
                                                            </div>
                                                            {needsShippingFields && (
                                                                <p className="text-xs text-red-500 font-medium mt-2">
                                                                    Tracking ID and Shipping Company are required to mark this order as Shipped.
                                                                </p>
                                                            )}
                                                            <button
                                                                onClick={() => saveOrderShipping(order.confirmed_order_id)}
                                                                disabled={savingOrderId === order.confirmed_order_id || needsShippingFields}
                                                                className="mt-3 px-5 py-2 bg-primary text-black rounded-lg font-bold text-sm hover:brightness-90 transition-all disabled:opacity-60"
                                                            >
                                                                {savingOrderId === order.confirmed_order_id ? 'Saving…' : 'Save Shipping Details'}
                                                            </button>
                                                        </div>
                                                    );
                                                })()}
                                            </div>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    )}
                </div>
            )}

            {/* Design Image Full Preview Modal */}
            {previewImage && (
                <div
                    className="fixed inset-0 bg-black/80 z-50 flex items-center justify-center p-4"
                    onClick={() => setPreviewImage(null)}
                >
                    <div className="relative max-w-xl w-full" onClick={e => e.stopPropagation()}>
                        <button
                            onClick={() => setPreviewImage(null)}
                            className="absolute -top-3 -right-3 w-8 h-8 bg-white rounded-full flex items-center justify-center shadow-lg hover:bg-gray-100 z-10"
                        >
                            <X size={16} />
                        </button>
                        <img
                            src={previewImage}
                            alt="Design full view"
                            className="w-full rounded-2xl shadow-2xl object-contain max-h-[80vh]"
                        />
                    </div>
                </div>
            )}
        </main>
    );
};

export default AdminDashboard;
