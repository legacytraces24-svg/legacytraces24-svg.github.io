import React, { useState, useEffect } from 'react';
import { useUser } from '../context/UserContext';
import { fetchMyOrders, getMyCustomOrders, postComment } from '../api/api';
import { motion, AnimatePresence } from 'framer-motion';
import { Link, useNavigate, useLocation, useSearchParams, useParams } from 'react-router-dom';
import {
    Package, ChevronRight, ChevronLeft, Star,
    ShieldCheck, MapPin, User, Check,
    ShoppingBag, Truck, CheckCircle2, Clock, AlertCircle, Shirt
} from 'lucide-react';

// DB status (left) → customer-facing label (right). Only these four statuses
// participate in the step tracker below; anything else (Cancelled, Pending
// Payment, Payment Failed) just shows as a plain badge with no stepper.
const statusConfig = {
    'New':             { color: 'bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300',       icon: <Clock size={12} />,        label: 'Confirmed' },
    'Processing':      { color: 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/40 dark:text-yellow-300', icon: <Package size={12} />,      label: 'Under Packaging' },
    'Shipped':         { color: 'bg-purple-100 text-purple-700 dark:bg-purple-900/40 dark:text-purple-300', icon: <Truck size={12} />,        label: 'Shipped' },
    'Delivered':       { color: 'bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-300',    icon: <CheckCircle2 size={12} />, label: 'Delivered' },
    'Cancelled':       { color: 'bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-300',            icon: <AlertCircle size={12} />,  label: 'Cancelled' },
    'Pending Payment': { color: 'bg-orange-100 text-orange-700 dark:bg-orange-900/40 dark:text-orange-300', icon: <Clock size={12} />,        label: 'Pending Payment' },
    'Payment Failed':  { color: 'bg-red-100 text-red-800 dark:bg-red-900/40 dark:text-red-400',            icon: <AlertCircle size={12} />,  label: 'Payment Failed' },
};

// The four DB statuses that form the linear tracking flow, in order — used to
// render the step tracker and to know how many steps are "done" for a given
// status (Delivered means all four are complete, not just the last one).
const ORDER_STEPS = [
    { key: 'New',        label: 'Confirmed' },
    { key: 'Processing', label: 'Under Packaging' },
    { key: 'Shipped',    label: 'Shipped' },
    { key: 'Delivered',  label: 'Delivered' },
];

// Cancelled (and any pre-confirmation status like Pending Payment/Payment
// Failed) doesn't fit a linear progress flow, so no stepper is shown for it —
// the status badge above already communicates it clearly.
const OrderStatusStepper = ({ status }) => {
    const currentIndex = ORDER_STEPS.findIndex(s => s.key === status);
    if (currentIndex === -1) return null;

    return (
        <div className="flex items-start">
            {ORDER_STEPS.map((step, i) => {
                const isDone = i <= currentIndex;
                return (
                    <React.Fragment key={step.key}>
                        <div className="flex flex-col items-center gap-1.5 w-16 shrink-0">
                            <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold border-2 transition-colors ${
                                isDone
                                    ? 'bg-primary border-primary text-black'
                                    : 'border-gray-300 dark:border-gray-600 text-gray-400'
                            }`}>
                                {isDone ? <Check size={16} /> : i + 1}
                            </div>
                            <span className={`text-[10px] font-semibold text-center leading-tight ${isDone ? 'text-black dark:text-white' : 'text-gray-400'}`}>
                                {step.label}
                            </span>
                        </div>
                        {i < ORDER_STEPS.length - 1 && (
                            <div className={`flex-1 h-0.5 mt-4 ${i < currentIndex ? 'bg-primary' : 'bg-gray-200 dark:bg-gray-700'}`} />
                        )}
                    </React.Fragment>
                );
            })}
        </div>
    );
};

// Custom (jersey / team-name design) order statuses — mirrors AdminDashboard's CUSTOM_STATUS_COLOR
const customStatusConfig = {
    'Pending Quote': { color: 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/40 dark:text-yellow-300', icon: <Clock size={12} /> },
    'Quoted':        { color: 'bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300',         icon: <Package size={12} /> },
    'Accepted':      { color: 'bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-300',     icon: <CheckCircle2 size={12} /> },
    'In Production': { color: 'bg-purple-100 text-purple-700 dark:bg-purple-900/40 dark:text-purple-300', icon: <Package size={12} /> },
    'Shipped':       { color: 'bg-cyan-100 text-cyan-700 dark:bg-cyan-900/40 dark:text-cyan-300',         icon: <Truck size={12} /> },
    'Delivered':     { color: 'bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-300',     icon: <CheckCircle2 size={12} /> },
    'Cancelled':     { color: 'bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-300',             icon: <AlertCircle size={12} /> },
};

const CustomOrderCard = ({ order, onClick }) => {
    const cfg = customStatusConfig[order.status] || customStatusConfig['Pending Quote'];
    const canAccept = order.status === 'Quoted' && order.quoted_price;

    return (
        <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            whileHover={{ y: -2, boxShadow: '0 8px 30px rgba(0,0,0,0.08)' }}
            onClick={onClick}
            className="bg-white dark:bg-[#1e1e1e] border border-gray-100 dark:border-gray-800 rounded-2xl p-5 cursor-pointer transition-shadow"
        >
            <div className="flex items-start justify-between gap-3 mb-2">
                <div className="flex items-center gap-2 flex-wrap min-w-0">
                    <span className="font-bold text-sm font-mono">CO-{order.id}</span>
                    <span className={`inline-flex items-center gap-1 text-xs font-bold px-2 py-0.5 rounded-full ${cfg.color}`}>
                        {cfg.icon} {order.status}
                    </span>
                </div>
                {order.quoted_price != null && (
                    <span className="font-bold text-primary shrink-0">₹{Number(order.quoted_price).toLocaleString('en-IN')}</span>
                )}
            </div>
            <p className="text-sm text-gray-700 dark:text-gray-300 mb-1">
                {order.order_type === 'jersey' ? 'Jersey Design' : 'Team Names List'} · {order.quantity} pcs · {order.shirt_color} {order.shirt_style === 'round' ? 'Regular' : 'Oversized'}
            </p>
            {order.status === 'Pending Quote' && (
                <p className="text-xs text-gray-500 dark:text-gray-400">We'll send you a price quote soon.</p>
            )}
            {order.status === 'Quoted' && (
                <p className="text-xs text-blue-600 dark:text-blue-400 font-medium">Quote ready — accept below to checkout and pay.</p>
            )}
            {order.confirmed_order_id && (
                <p className="text-xs text-green-600 dark:text-green-400 font-semibold mt-1 flex items-center gap-1">
                    Confirmed → Order LT-{order.confirmed_order_id} · View shipping status <ChevronRight size={12} />
                </p>
            )}

            {canAccept && (
                <Link
                    to={`/checkout/custom/${order.id}`}
                    onClick={e => e.stopPropagation()}
                    className="mt-3 block w-full text-center bg-primary text-black font-bold py-2.5 rounded-xl hover:brightness-90 transition-all text-sm"
                >
                    Accept &amp; Pay ₹{Number(order.quoted_price).toLocaleString('en-IN')}
                </Link>
            )}

            {!canAccept && (
                <div className="flex justify-end mt-2">
                    <span className="text-xs text-primary font-semibold flex items-center gap-1">View details <ChevronRight size={13} /></span>
                </div>
            )}
        </motion.div>
    );
};

const CustomOrderDetailsView = ({ order, onBack }) => {
    const cfg = customStatusConfig[order.status] || customStatusConfig['Pending Quote'];
    let detailsParsed = [];
    try { detailsParsed = JSON.parse(order.order_details || '[]'); } catch {}
    const createdDate = order.created_at
        ? new Date(order.created_at.replace(' ', 'T') + 'Z').toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })
        : null;
    const hasDesignImage = order.order_type === 'jersey' && order.design_image &&
        ['data:image/jpeg;base64,', 'data:image/png;base64,', 'data:image/webp;base64,'].some(m => order.design_image.startsWith(m));

    return (
        <div className="container mx-auto px-4 py-8 max-w-2xl min-h-[70vh]">
            <button
                onClick={onBack}
                className="flex items-center gap-2 text-gray-500 hover:text-primary font-semibold mb-6 transition-colors"
            >
                <ChevronLeft size={20} /> Back to Orders
            </button>

            <div className="flex items-baseline gap-3 mb-6">
                <h1 className="text-3xl font-bold font-heading">Custom Order Details</h1>
                <span className="text-lg font-mono font-semibold text-primary">CO-{order.id}</span>
            </div>

            <span className={`inline-flex items-center gap-1.5 text-sm font-bold px-3 py-1.5 rounded-full mb-6 ${cfg.color}`}>
                {cfg.icon} {order.status}
            </span>

            <div className="bg-white dark:bg-[#1e1e1e] rounded-2xl border border-gray-100 dark:border-gray-800 p-6 mb-4">
                <h2 className="font-bold text-gray-500 dark:text-gray-400 text-xs uppercase tracking-wider mb-4">Design Details</h2>

                {hasDesignImage && (
                    <img
                        src={order.design_image}
                        alt="Your design"
                        className="w-32 h-32 object-contain rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900 mb-4"
                    />
                )}

                <div className="space-y-2 text-sm mb-4">
                    <div className="flex justify-between">
                        <span className="text-gray-500">Type</span>
                        <span className="font-bold">{order.order_type === 'jersey' ? 'Jersey Design' : 'Team Names'}</span>
                    </div>
                    <div className="flex justify-between">
                        <span className="text-gray-500">Shirt</span>
                        <span className="font-bold capitalize">{order.shirt_color} · {order.shirt_style === 'round' ? 'Regular' : 'Oversized'}</span>
                    </div>
                    <div className="flex justify-between">
                        <span className="text-gray-500">Total Qty</span>
                        <span className="font-bold">{order.quantity} pcs</span>
                    </div>
                    <div className="flex justify-between">
                        <span className="text-gray-500">Requested On</span>
                        <span className="font-bold">{createdDate || 'N/A'}</span>
                    </div>
                </div>

                {detailsParsed.length > 0 && (
                    <div className="mb-4">
                        <p className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-2">
                            {order.order_type === 'jersey' ? 'Sizes' : 'Names List'}
                        </p>
                        {order.order_type === 'jersey' ? (
                            <div className="flex flex-wrap gap-2">
                                {detailsParsed.map((r, i) => (
                                    <span key={i} className="px-3 py-1 bg-gray-100 dark:bg-gray-800 rounded-full text-xs font-semibold">
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
                                            <tr key={i} className="border-t border-gray-100 dark:border-gray-800">
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
                    <p className="text-xs text-gray-500 italic mb-4">Note: {order.notes}</p>
                )}

                <div className="pt-4 border-t border-gray-200 dark:border-gray-700 flex justify-between items-center">
                    <span className="font-bold text-gray-500 text-sm">Quoted Price</span>
                    <span className="font-bold text-primary text-lg">
                        {order.quoted_price != null ? `₹${Number(order.quoted_price).toLocaleString('en-IN')}` : 'Awaiting quote'}
                    </span>
                </div>
            </div>

            {order.status === 'Pending Quote' && (
                <div className="bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 text-yellow-800 dark:text-yellow-300 p-4 rounded-xl text-sm">
                    We're preparing your quote — you'll be notified once it's ready.
                </div>
            )}

            {order.status === 'Quoted' && order.quoted_price && (
                <Link
                    to={`/checkout/custom/${order.id}`}
                    className="block w-full text-center bg-primary text-black font-bold py-3 rounded-xl hover:brightness-90 transition-all"
                >
                    Accept &amp; Pay ₹{Number(order.quoted_price).toLocaleString('en-IN')}
                </Link>
            )}

            {order.status === 'Cancelled' && (
                <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 text-red-700 dark:text-red-300 p-4 rounded-xl text-sm">
                    This custom order was cancelled.
                </div>
            )}
        </div>
    );
};

const StarRating = ({ value, onChange, readonly = false }) => {
    const [hovered, setHovered] = useState(0);
    return (
        <div className="flex gap-1">
            {[1, 2, 3, 4, 5].map(star => (
                <button
                    key={star}
                    type="button"
                    disabled={readonly}
                    onClick={() => !readonly && onChange(star)}
                    onMouseEnter={() => !readonly && setHovered(star)}
                    onMouseLeave={() => !readonly && setHovered(0)}
                    className={`transition-transform ${!readonly ? 'hover:scale-110 cursor-pointer' : 'cursor-default'}`}
                >
                    <Star
                        size={24}
                        className={`transition-colors ${(hovered || value) >= star
                            ? 'fill-yellow-400 text-yellow-400'
                            : 'text-gray-300 dark:text-gray-600'
                        }`}
                    />
                </button>
            ))}
        </div>
    );
};

const OrderCard = ({ order, onClick }) => {
    const status   = order.OrderStatus || "New";
    const amount   = order.AmountPaid === null ? 0 : Number(order.AmountPaid);
    const cod      = order.COD === "Yes";
    const cfg      = statusConfig[status] || statusConfig['New'];
    const orderId  = `LT-${order.id}`;
    // First line of product_list gives a quick summary
    const firstItem = (order.ProductList || '').split('\n')[0] || 'Custom order';

    return (
        <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            whileHover={{ y: -2, boxShadow: '0 8px 30px rgba(0,0,0,0.08)' }}
            onClick={onClick}
            className="bg-white dark:bg-[#1e1e1e] border border-gray-100 dark:border-gray-800 rounded-2xl p-5 cursor-pointer transition-shadow"
        >
            <div className="flex items-start justify-between gap-3 mb-2">
                <div className="flex items-center gap-2 flex-wrap min-w-0">
                    <span className="font-bold text-sm font-mono">{orderId}</span>
                    <span className={`inline-flex items-center gap-1 text-xs font-bold px-2 py-0.5 rounded-full ${cfg.color}`}>
                        {cfg.icon} {cfg.label}
                    </span>
                    <span className="text-xs text-gray-400">{cod ? 'COD' : 'Prepaid'}</span>
                </div>
                <span className="font-bold text-primary shrink-0">₹{amount}</span>
            </div>
            <p className="text-sm text-gray-700 dark:text-gray-300 truncate mb-1">{firstItem}</p>
            {order.Address && (
                <p className="text-xs text-gray-500 dark:text-gray-400 truncate flex items-center gap-1">
                    <MapPin size={11} className="shrink-0" /> {order.Address}
                </p>
            )}
            <div className="flex justify-end mt-2">
                <span className="text-xs text-primary font-semibold flex items-center gap-1">View details <ChevronRight size={13} /></span>
            </div>
        </motion.div>
    );
};

const FeedbackForm = ({ order, onSubmitted }) => {
    const { user } = useUser();
    const [rating, setRating] = useState(0);
    const [comment, setComment] = useState('');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (rating === 0) { setError('Please select a star rating.'); return; }
        if (!comment.trim()) { setError('Please write a comment.'); return; }

        setLoading(true);
        setError('');

        try {
            await postComment({
                idToken:         user.idToken,
                productId:       order.TrackingId || 'general',
                userDisplayName: user.name || user.email,
                phoneNo:         order.Mobile || '',
                comments:        comment.trim(),
            });
            onSubmitted();
        } catch {
            setError('Failed to submit feedback. Please try again.');
        } finally {
            setLoading(false);
        }
    };

    return (
        <form onSubmit={handleSubmit} className="space-y-4">
            <div>
                <label className="block text-sm font-bold mb-2">Your Rating</label>
                <StarRating value={rating} onChange={setRating} />
            </div>
            <div>
                <label className="block text-sm font-bold mb-2">Your Review</label>
                <textarea
                    value={comment}
                    onChange={e => setComment(e.target.value)}
                    placeholder="How was your experience with this order?"
                    rows={3}
                    className="w-full bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-xl py-3 px-4 focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all resize-none text-sm"
                />
            </div>
            {error && <p className="text-red-500 text-sm">{error}</p>}
            <button
                type="submit"
                disabled={loading}
                className="bg-primary text-black font-bold py-2.5 px-6 rounded-xl hover:brightness-90 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
            >
                {loading ? (
                    <><div className="w-4 h-4 border-2 border-black border-t-transparent rounded-full animate-spin" /> Submitting...</>
                ) : 'Submit Feedback'}
            </button>
        </form>
    );
};

const Orders = () => {
    const { user } = useUser();
    const navigate = useNavigate();
    const location = useLocation();
    const [searchParams] = useSearchParams();
    const { orderId } = useParams(); // present on /orders/:orderId — deep link to one order's details
    const orderPlaced = !!location.state?.orderPlaced;
    const [orders, setOrders] = useState([]);
    const [loading, setLoading] = useState(true);
    const [selectedOrder, setSelectedOrder] = useState(null);
    const [selectedCustomOrder, setSelectedCustomOrder] = useState(null);
    const [activeTab, setActiveTab] = useState('orders'); // 'orders' | 'custom'
    const [customOrders, setCustomOrders] = useState([]);
    const [loadingCustom, setLoadingCustom] = useState(true);
    const [submittedFeedback, setSubmittedFeedback] = useState(() => {
        const stored = localStorage.getItem('submittedFeedback');
        return stored ? JSON.parse(stored) : [];
    });

    // Cashfree redirect handler — Cashfree appends ?order_status=PAID|CANCELLED|ACTIVE
    // to return_url after redirect-based payments (net banking, some UPI apps).
    useEffect(() => {
        const cfStatus = searchParams.get('order_status');
        if (!cfStatus) return;
        if (cfStatus === 'PAID') {
            // Remove query params, show the success banner via router state
            navigate('/orders', { replace: true, state: { orderPlaced: true } });
        } else {
            // CANCELLED, ACTIVE (incomplete), EXPIRED — go back to checkout to retry
            navigate('/checkout', { replace: true });
        }
    }, [searchParams, navigate]);

    useEffect(() => {
        if (!user?.idToken) return;
        const fetchOrders = async () => {
            setLoading(true);
            try {
                const orders = await fetchMyOrders(user.idToken);
                setOrders(orders); // backend already returns newest-first (ORDER BY id DESC)
            } catch {
                // silent — UI already shows empty state
            } finally {
                setLoading(false);
            }
        };
        fetchOrders();
    }, [user?.idToken]);

    // Deep link support: /orders/:orderId opens straight to that order's
    // detail view once the list has loaded (e.g. from a WhatsApp tracking link).
    useEffect(() => {
        if (!orderId || orders.length === 0) return;
        const match = orders.find(o => String(o.id) === String(orderId));
        if (match) setSelectedOrder(match);
    }, [orderId, orders]);

    useEffect(() => {
        if (!user?.idToken) return;
        const fetchCustom = async () => {
            setLoadingCustom(true);
            try {
                const res = await getMyCustomOrders(user.idToken);
                setCustomOrders(res.orders || []);
            } catch {
                // silent — UI already shows empty state
            } finally {
                setLoadingCustom(false);
            }
        };
        fetchCustom();
    }, [user?.idToken]);

    const handleFeedbackSubmitted = (orderId) => {
        const updated = [...submittedFeedback, orderId];
        setSubmittedFeedback(updated);
        localStorage.setItem('submittedFeedback', JSON.stringify(updated));
    };

    if (!user) {
        return (
            <div className="container mx-auto px-4 py-20 min-h-[60vh] flex flex-col items-center justify-center text-center">
                <div className="w-16 h-16 bg-primary/20 text-primary rounded-full flex items-center justify-center mx-auto mb-6">
                    <ShieldCheck size={32} />
                </div>
                <h1 className="text-3xl font-bold font-heading mb-3">Sign In Required</h1>
                <p className="text-gray-500 dark:text-gray-400 mb-6">Please log in to view your order history.</p>
                <Link to="/profile" className="bg-primary text-black font-bold py-3 px-8 rounded-xl hover:brightness-90 transition-all">
                    Go to Login
                </Link>
            </div>
        );
    }

    // ── Custom Order Details View ─────────────────────────────────
    if (selectedCustomOrder) {
        return (
            <CustomOrderDetailsView
                order={selectedCustomOrder}
                onBack={() => setSelectedCustomOrder(null)}
            />
        );
    }

    // ── Order Details View ────────────────────────────────────────
    if (selectedOrder) {
        const feedbackKey = selectedOrder.TrackingId || selectedOrder.Email + selectedOrder.AmountPaid;
        const alreadySubmitted = submittedFeedback.includes(feedbackKey);

        return (
            <div className="container mx-auto px-4 py-8 max-w-2xl min-h-[70vh]">
                <button
                    onClick={() => { setSelectedOrder(null); navigate('/orders'); }}
                    className="flex items-center gap-2 text-gray-500 hover:text-primary font-semibold mb-6 transition-colors"
                >
                    <ChevronLeft size={20} /> Back to Orders
                </button>

                <div className="flex items-baseline gap-3 mb-6">
                    <h1 className="text-3xl font-bold font-heading">Order Details</h1>
                    <span className="text-lg font-mono font-semibold text-primary">LT-{selectedOrder.id}</span>
                </div>

                {/* Status Badge */}
                {(() => {
                    const s = selectedOrder.OrderStatus || 'New';
                    const c = statusConfig[s] || statusConfig['New'];
                    return (
                        <span className={`inline-flex items-center gap-1.5 text-sm font-bold px-3 py-1.5 rounded-full mb-6 ${c.color}`}>
                            {c.icon} {c.label}
                        </span>
                    );
                })()}

                {/* Track Order — step tracker for the 4 statuses that form a
                    linear flow; Cancelled/Pending Payment/Payment Failed don't
                    get one (OrderStatusStepper returns null for those). */}
                {(() => {
                    const s = selectedOrder.OrderStatus || 'New';
                    if (s === 'Cancelled') {
                        return (
                            <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-2xl p-5 mb-4 flex items-center gap-3 text-red-700 dark:text-red-300">
                                <AlertCircle size={20} className="shrink-0" />
                                <p className="font-semibold text-sm">This order was cancelled.</p>
                            </div>
                        );
                    }
                    return (
                        <div className="bg-white dark:bg-[#1e1e1e] rounded-2xl border border-gray-100 dark:border-gray-800 p-6 mb-4">
                            <h2 className="font-bold text-gray-500 dark:text-gray-400 text-xs uppercase tracking-wider mb-5">Track Order</h2>
                            <OrderStatusStepper status={s} />
                        </div>
                    );
                })()}

                {/* Delivery Address */}
                <div className="bg-white dark:bg-[#1e1e1e] rounded-2xl border border-gray-100 dark:border-gray-800 p-6 mb-4">
                    <h2 className="font-bold text-gray-500 dark:text-gray-400 text-xs uppercase tracking-wider mb-3 flex items-center gap-1.5">
                        <MapPin size={13} /> Delivery Address
                    </h2>
                    <p className="text-sm leading-relaxed">{selectedOrder.Address || 'No address on file'}</p>
                </div>

                {/* Order Summary */}
                <div className="bg-white dark:bg-[#1e1e1e] rounded-2xl border border-gray-100 dark:border-gray-800 p-6 mb-4">
                    <h2 className="font-bold text-gray-500 dark:text-gray-400 text-xs uppercase tracking-wider mb-4">Order Summary</h2>
                    <div className="bg-gray-50 dark:bg-gray-900 rounded-xl p-4 text-sm mb-4 whitespace-pre-line leading-relaxed font-mono">
                        {selectedOrder.ProductList || 'No product details'}
                    </div>
                    <div className="space-y-2 text-sm">
                        <div className="flex justify-between">
                            <span className="text-gray-500">Total Items</span>
                            <span className="font-bold">{selectedOrder.TotalTshirts || 'N/A'}</span>
                        </div>
                        <div className="flex justify-between">
                            <span className="text-gray-500">Amount Paid</span>
                            <span className="font-bold text-primary">₹{selectedOrder.AmountPaid === null ? 0 : Number(selectedOrder.AmountPaid)}</span>
                        </div>
                        <div className="flex justify-between">
                            <span className="text-gray-500">Payment Mode</span>
                            <span className="font-bold">{selectedOrder.COD === 'Yes' ? 'Cash on Delivery' : 'Prepaid'}</span>
                        </div>
                        <div className="flex justify-between">
                            <span className="text-gray-500">Tracking ID</span>
                            <span className="font-bold font-mono">{selectedOrder.TrackingId || 'N/A'}</span>
                        </div>
                    </div>
                </div>

                {/* Feedback */}
                <div className="bg-white dark:bg-[#1e1e1e] rounded-2xl border border-gray-100 dark:border-gray-800 p-6">
                    <h2 className="font-bold text-gray-500 dark:text-gray-400 text-xs uppercase tracking-wider mb-4">Rate This Order</h2>
                    {alreadySubmitted ? (
                        <div className="flex items-center gap-3 text-green-600 dark:text-green-400 font-semibold">
                            <CheckCircle2 size={20} />
                            Thank you! Your feedback has been submitted.
                        </div>
                    ) : (
                        <FeedbackForm
                            order={selectedOrder}
                            onSubmitted={() => handleFeedbackSubmitted(feedbackKey)}
                        />
                    )}
                </div>
            </div>
        );
    }

    // ── Orders List View ─────────────────────────────────────────
    return (
        <div className="container mx-auto px-4 py-8 max-w-2xl min-h-[70vh]">
            {/* Header */}
            <div className="flex items-center justify-between mb-8">
                <div>
                    <h1 className="text-4xl font-bold font-heading bg-clip-text text-transparent bg-gradient-to-r from-primary to-cyan-500">My Orders</h1>
                    <p className="text-gray-500 dark:text-gray-400 mt-1 text-sm">Track and manage your purchase history.</p>
                </div>
                <Link to="/profile" className="text-sm font-semibold text-gray-500 hover:text-primary transition-colors flex items-center gap-1">
                    <User size={15} /> Profile
                </Link>
            </div>

            {orderPlaced && (
                <motion.div
                    initial={{ opacity: 0, y: -10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="flex items-center gap-3 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-2xl px-5 py-4 text-green-700 dark:text-green-300"
                >
                    <CheckCircle2 size={20} className="shrink-0" />
                    <div>
                        <p className="font-bold">Order placed successfully!</p>
                        <p className="text-sm opacity-80">Our team will reach out to confirm delivery details.</p>
                    </div>
                </motion.div>
            )}

            {/* Tab Switcher */}
            <div className="flex gap-1 my-6 bg-gray-100 dark:bg-gray-800 p-1 rounded-xl w-fit">
                <button
                    onClick={() => setActiveTab('orders')}
                    className={`px-5 py-2 rounded-lg font-semibold text-sm transition-all flex items-center gap-2 ${activeTab === 'orders' ? 'bg-white dark:bg-gray-700 shadow-sm' : 'text-gray-500 hover:text-gray-700 dark:hover:text-gray-300'}`}
                >
                    <Package size={15} /> Orders
                </button>
                <button
                    onClick={() => setActiveTab('custom')}
                    className={`px-5 py-2 rounded-lg font-semibold text-sm transition-all flex items-center gap-2 ${activeTab === 'custom' ? 'bg-white dark:bg-gray-700 shadow-sm' : 'text-gray-500 hover:text-gray-700 dark:hover:text-gray-300'}`}
                >
                    <Shirt size={15} /> Custom Designs
                    {customOrders.length > 0 && (
                        <span className="bg-primary text-black text-xs rounded-full px-1.5 py-0.5 leading-none font-bold">
                            {customOrders.length}
                        </span>
                    )}
                </button>
            </div>

            {activeTab === 'orders' ? (loading ? (
                <div className="space-y-4">
                    {[1, 2, 3].map(i => (
                        <div key={i} className="bg-white dark:bg-[#1e1e1e] rounded-2xl p-5 animate-pulse border border-gray-100 dark:border-gray-800">
                            <div className="flex items-center gap-4">
                                <div className="w-12 h-12 bg-gray-200 dark:bg-gray-800 rounded-xl" />
                                <div className="flex-1 space-y-2">
                                    <div className="h-4 bg-gray-200 dark:bg-gray-800 rounded w-1/3" />
                                    <div className="h-3 bg-gray-200 dark:bg-gray-800 rounded w-1/2" />
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            ) : orders.length === 0 ? (
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="text-center py-20"
                >
                    <div className="w-20 h-20 bg-gray-100 dark:bg-gray-800 rounded-full flex items-center justify-center mx-auto mb-5">
                        <Package size={36} className="text-gray-400" />
                    </div>
                    <h2 className="text-2xl font-bold mb-2">No orders yet</h2>
                    <p className="text-gray-500 dark:text-gray-400 mb-6">You haven't placed any orders with us yet.</p>
                    <Link to="/shop" className="bg-primary text-black font-bold py-3 px-8 rounded-xl hover:brightness-90 transition-all">
                        Start Shopping
                    </Link>
                </motion.div>
            ) : (
                <div className="space-y-3">
                    {orders.map((order, idx) => (
                        <OrderCard
                            key={idx}
                            order={order}
                            onClick={() => navigate(`/orders/${order.id}`)}
                        />
                    ))}
                </div>
            )) : (
                loadingCustom ? (
                    <div className="space-y-4">
                        {[1, 2].map(i => (
                            <div key={i} className="bg-white dark:bg-[#1e1e1e] rounded-2xl p-5 animate-pulse border border-gray-100 dark:border-gray-800">
                                <div className="h-4 bg-gray-200 dark:bg-gray-800 rounded w-1/3 mb-2" />
                                <div className="h-3 bg-gray-200 dark:bg-gray-800 rounded w-1/2" />
                            </div>
                        ))}
                    </div>
                ) : customOrders.length === 0 ? (
                    <div className="text-center py-20">
                        <div className="w-20 h-20 bg-gray-100 dark:bg-gray-800 rounded-full flex items-center justify-center mx-auto mb-5">
                            <Shirt size={36} className="text-gray-400" />
                        </div>
                        <h2 className="text-2xl font-bold mb-2">No custom designs yet</h2>
                        <p className="text-gray-500 dark:text-gray-400 mb-6">Design your own jersey or team order and track its status here.</p>
                        <Link to="/customize" className="bg-primary text-black font-bold py-3 px-8 rounded-xl hover:brightness-90 transition-all">
                            Start Designing
                        </Link>
                    </div>
                ) : (
                    <div className="space-y-3">
                        {customOrders.map(order => (
                            <CustomOrderCard
                                key={order.id}
                                order={order}
                                onClick={() => {
                                    if (order.confirmed_order_id) {
                                        navigate(`/orders/${order.confirmed_order_id}`);
                                        return;
                                    }
                                    setSelectedCustomOrder(order);
                                }}
                            />
                        ))}
                    </div>
                )
            )}
        </div>
    );
};

export default Orders;
