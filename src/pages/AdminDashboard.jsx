import React, { useEffect, useState } from 'react';
import { Navigate, useNavigate } from 'react-router-dom';
import { useUser } from '../context/UserContext';
import {
    fetchAdminOrders, updateOrderStatus,
    getAdminCustomOrders, updateCustomQuote
} from '../api/api';
import {
    Package, DollarSign, ShoppingCart,
    CreditCard, Truck, RefreshCcw, CheckCircle, Shirt, Eye, X,
    ChevronUp, ChevronDown, ChevronsUpDown, Search, ChevronLeft, ChevronRight,
    MessageCircle, Printer, FileText, FileType
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

const ALL_ORDER_STATUSES = ['New', 'Processing', 'Shipped', 'Delivered', 'Cancelled', 'Pending Payment', 'Payment Failed'];

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
    const { user }   = useUser();
    const navigate   = useNavigate();

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

    // Still waiting for One-Tap to restore idToken + isAdmin
    if (user?.email && !user?.idToken) {
        return (
            <div className="min-h-screen flex items-center justify-center">
                <div className="animate-spin rounded-full h-10 w-10 border-t-2 border-primary"></div>
            </div>
        );
    }

    if (!user?.isAdmin) return <Navigate to="/" />;

    // ── Data loading ──────────────────────────────────────────────────────────

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
                        deliveryEta:     toDateInputValue(o.DeliveryEta),
                        deliveredAt:     toDateInputValue(o.DeliveredAt),
                    };
                });
                setOrderEditState(init);
            } catch {}
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
            } catch {}
            setLoadingCustom(false);
        };
        load();
    }, [activeTab, user?.idToken]);

    // ── Regular orders ────────────────────────────────────────────────────────

    // Revenue only counts orders that were actually confirmed — a "Pending
    // Payment"/"Payment Failed"/"Cancelled" row's amount_paid was never really
    // collected, even though it's set at order-creation time for later display.
    const UNPAID_STATUSES = ['Pending Payment', 'Payment Failed', 'Cancelled'];
    const totalOrders   = orders.length;
    const totalRevenue  = orders
        .filter(o => !UNPAID_STATUSES.includes(o.OrderStatus || 'New'))
        .reduce((s, o) => s + Number(o.AmountPaid || 0), 0);
    const totalItems    = orders.reduce((s, o) => s + Number(o.TotalTshirts || 0), 0);
    const codOrders     = orders.filter(o => o.COD === 'Yes').length;
    const prepaidOrders = orders.filter(o => o.COD !== 'Yes').length;

    const statusCount = {
        New:       orders.filter(o => !o.OrderStatus || o.OrderStatus === 'New').length,
        Shipped:   orders.filter(o => o.OrderStatus === 'Shipped').length,
        Delivered: orders.filter(o => o.OrderStatus === 'Delivered').length,
    };

    const handleOrderEdit = (id, field, value) =>
        setOrderEditState(prev => ({ ...prev, [id]: { ...prev[id], [field]: value } }));

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
                toTs(e.deliveryEta),
                toTs(e.deliveredAt),
            );
            if (res?.error) {
                alert(res.error);
            } else {
                setOrders(prev => prev.map(o => o.id === orderId
                    ? {
                        ...o,
                        OrderStatus:     e.status,
                        TrackingId:      e.trackingId,
                        ShippingCompany: e.shippingCompany,
                        ShippedAt:       toTs(e.shippedAt)   || o.ShippedAt,
                        DeliveryEta:     toTs(e.deliveryEta) || o.DeliveryEta,
                        DeliveredAt:     toTs(e.deliveredAt) || o.DeliveredAt,
                    }
                    : o));
            }
        } catch {
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
                    {/* Summary Cards */}
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-10">
                        <div className="bg-white dark:bg-gray-800 p-6 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700">
                            <div className="flex items-center justify-between mb-4">
                                <h3 className="text-gray-500 dark:text-gray-400 font-medium">Total Orders</h3>
                                <Package className="text-blue-500" size={24} />
                            </div>
                            <p className="text-3xl font-bold">{totalOrders}</p>
                        </div>
                        <div className="bg-white dark:bg-gray-800 p-6 rounded-2xl shadow-[0_0_15px_rgba(34,197,94,0.1)] border border-primary/20">
                            <div className="flex items-center justify-between mb-4">
                                <h3 className="text-gray-500 dark:text-gray-400 font-medium">Total Revenue</h3>
                                <DollarSign className="text-primary" size={24} />
                            </div>
                            <p className="text-3xl font-bold text-primary">₹{totalRevenue.toLocaleString()}</p>
                        </div>
                        <div className="bg-white dark:bg-gray-800 p-6 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700">
                            <div className="flex items-center justify-between mb-4">
                                <h3 className="text-gray-500 dark:text-gray-400 font-medium">Items Sold</h3>
                                <ShoppingCart className="text-purple-500" size={24} />
                            </div>
                            <p className="text-3xl font-bold">{totalItems}</p>
                        </div>
                        <div className="bg-white dark:bg-gray-800 p-6 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700">
                            <div className="flex items-center justify-between mb-4">
                                <h3 className="text-gray-500 dark:text-gray-400 font-medium">Payment Breakup</h3>
                                <CreditCard className="text-orange-500" size={24} />
                            </div>
                            <div className="flex justify-between items-center mt-2">
                                <div><p className="text-sm text-gray-500">COD</p><p className="text-xl font-bold">{codOrders}</p></div>
                                <div className="h-8 w-px bg-gray-200 dark:bg-gray-700" />
                                <div><p className="text-sm text-gray-500">Prepaid</p><p className="text-xl font-bold">{prepaidOrders}</p></div>
                            </div>
                        </div>
                    </div>

                    {/* Status Breakdown */}
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-10">
                        <div className="bg-yellow-50 dark:bg-yellow-900/20 p-6 rounded-xl border border-yellow-200 dark:border-yellow-800 flex items-center justify-between">
                            <div>
                                <p className="text-yellow-600 dark:text-yellow-400 font-medium mb-1">New Orders</p>
                                <p className="text-2xl font-bold text-yellow-700 dark:text-yellow-300">{statusCount.New}</p>
                            </div>
                            <div className="bg-yellow-100 dark:bg-yellow-800/50 p-3 rounded-full">
                                <RefreshCcw className="text-yellow-600 dark:text-yellow-400" size={24} />
                            </div>
                        </div>
                        <div className="bg-blue-50 dark:bg-blue-900/20 p-6 rounded-xl border border-blue-200 dark:border-blue-800 flex items-center justify-between">
                            <div>
                                <p className="text-blue-600 dark:text-blue-400 font-medium mb-1">Shipped</p>
                                <p className="text-2xl font-bold text-blue-700 dark:text-blue-300">{statusCount.Shipped}</p>
                            </div>
                            <div className="bg-blue-100 dark:bg-blue-800/50 p-3 rounded-full">
                                <Truck className="text-blue-600 dark:text-blue-400" size={24} />
                            </div>
                        </div>
                        <div className="bg-green-50 dark:bg-green-900/20 p-6 rounded-xl border border-green-200 dark:border-green-800 flex items-center justify-between">
                            <div>
                                <p className="text-green-600 dark:text-green-400 font-medium mb-1">Delivered</p>
                                <p className="text-2xl font-bold text-green-700 dark:text-green-300">{statusCount.Delivered}</p>
                            </div>
                            <div className="bg-green-100 dark:bg-green-800/50 p-3 rounded-full">
                                <CheckCircle className="text-green-600 dark:text-green-400" size={24} />
                            </div>
                        </div>
                    </div>

                    {/* Orders Table */}
                    {(() => {
                        // Derived filtered + sorted + paginated list (computed inline to access state)
                        const filtered = orders
                            .filter(o => !searchId   || String(o.id).includes(searchId.trim()))
                            .filter(o => !searchName || (o.Name || '').toLowerCase().includes(searchName.toLowerCase()))
                            .filter(o => !searchMobile || String(o.Mobile || '').includes(searchMobile.trim()))
                            .filter(o => !filterStatus || (o.OrderStatus || 'New') === filterStatus)
                            .filter(o => !filterType  || (filterType === 'COD' ? o.COD === 'Yes' : o.COD !== 'Yes'))
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
                                        {(searchId || searchName || searchMobile || filterStatus || filterType) && (
                                            <button
                                                onClick={() => { setSearchId(''); setSearchName(''); setSearchMobile(''); setFilterStatus(''); setFilterType(''); setPage(1); }}
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

                                <div className="overflow-x-auto">
                                    <table className="w-full text-left border-collapse">
                                        <thead>
                                            <tr className="bg-gray-50 dark:bg-gray-900/50 text-gray-500 dark:text-gray-400 text-sm">
                                                <th className="p-2.5 font-medium">
                                                    <button onClick={() => toggleSort('id')} className="flex items-center gap-1 hover:text-gray-900 dark:hover:text-gray-100">
                                                        Order ID <SortIcon col="id" />
                                                    </button>
                                                </th>
                                                <th className="p-2.5 font-medium">
                                                    <button onClick={() => toggleSort('name')} className="flex items-center gap-1 hover:text-gray-900 dark:hover:text-gray-100">
                                                        Customer <SortIcon col="name" />
                                                    </button>
                                                </th>
                                                <th className="p-2.5 font-medium">Mobile</th>
                                                <th className="p-2.5 font-medium">
                                                    <button onClick={() => toggleSort('amount')} className="flex items-center gap-1 hover:text-gray-900 dark:hover:text-gray-100">
                                                        Amount <SortIcon col="amount" />
                                                    </button>
                                                </th>
                                                <th className="p-2.5 font-medium">Type</th>
                                                <th className="p-2.5 font-medium">
                                                    <button onClick={() => toggleSort('status')} className="flex items-center gap-1 hover:text-gray-900 dark:hover:text-gray-100">
                                                        Status <SortIcon col="status" />
                                                    </button>
                                                </th>
                                                <th className="p-2.5 font-medium">
                                                    <button onClick={() => toggleSort('created')} className="flex items-center gap-1 hover:text-gray-900 dark:hover:text-gray-100">
                                                        Created <SortIcon col="created" />
                                                    </button>
                                                </th>
                                                <th className="p-2.5 font-medium">Details</th>
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
                                                const edit     = orderEditState[id] || { trackingId: '', shippingCompany: '', status: 'New', shippedAt: '', deliveryEta: '', deliveredAt: '' };
                                                const needsShippingFields = edit.status === 'Shipped' && (!edit.trackingId?.trim() || !edit.shippingCompany?.trim());
                                                return (
                                                <React.Fragment key={id}>
                                                    <tr className="border-b border-gray-100 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors">
                                                        <td className="p-2.5 font-mono font-semibold text-primary">LT-{id}</td>
                                                        <td className="p-2.5">
                                                            <div className="font-medium">{name}</div>
                                                            {order.Email && <div className="text-xs text-gray-400 truncate max-w-[160px]">{order.Email}</div>}
                                                        </td>
                                                        <td className="p-2.5">
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
                                                        <td className="p-2.5 font-semibold text-primary">₹{amount}</td>
                                                        <td className="p-2.5">
                                                            <span className={`px-2.5 py-1 text-xs font-medium rounded-full ${isCOD ? 'bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400' : 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400'}`}>
                                                                {isCOD ? 'COD' : 'Prepaid'}
                                                            </span>
                                                        </td>
                                                        <td className="p-2.5">
                                                            <span className={`px-2.5 py-1 text-xs font-medium rounded-full ${
                                                                status === 'New' ? 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400' :
                                                                status === 'Processing' ? 'bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400' :
                                                                status === 'Shipped' ? 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400' :
                                                                status === 'Delivered' ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400' :
                                                                status === 'Cancelled' || status === 'Payment Failed' ? 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400' :
                                                                'bg-gray-100 text-gray-700 dark:bg-gray-900/30 dark:text-gray-400'
                                                            }`}>
                                                                {status}
                                                            </span>
                                                        </td>
                                                        <td className="p-2.5 text-sm whitespace-nowrap">
                                                            {formatDate(order.CreatedAt) || <span className="text-gray-400">—</span>}
                                                        </td>
                                                        <td className="p-2.5">
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
                                                        <tr className="bg-gray-50 dark:bg-gray-900/40 border-b border-gray-100 dark:border-gray-700">
                                                            <td colSpan="7" className="p-5">
                                                                <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                                                                    <div>
                                                                        <p className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-1">Shipping Address</p>
                                                                        <p className="text-sm">{order.Address || '—'}</p>
                                                                        <p className="text-xs font-bold text-gray-400 uppercase tracking-wider mt-3 mb-1">Products</p>
                                                                        <p className="text-sm whitespace-pre-line">{order.ProductList || '—'}</p>
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
                                                                                <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-1">Delivery ETA</label>
                                                                                <input
                                                                                    type="date"
                                                                                    value={edit.deliveryEta}
                                                                                    onChange={ev => handleOrderEdit(id, 'deliveryEta', ev.target.value)}
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
                                                    <td colSpan="7" className="p-8 text-center text-gray-500">
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
                                                    const shipEdit = orderEditState[order.confirmed_order_id] || { trackingId: '', shippingCompany: '', status: 'New', shippedAt: '', deliveryEta: '', deliveredAt: '' };
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
                                                                    <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-1">Delivery ETA</label>
                                                                    <input
                                                                        type="date"
                                                                        value={shipEdit.deliveryEta}
                                                                        onChange={ev => handleOrderEdit(order.confirmed_order_id, 'deliveryEta', ev.target.value)}
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
