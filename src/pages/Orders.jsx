import React, { useState, useEffect } from 'react';
import { useUser } from '../context/UserContext';
import { fetchMyOrders, postComment } from '../api/api';
import { motion, AnimatePresence } from 'framer-motion';
import { Link, useNavigate, useLocation, useSearchParams } from 'react-router-dom';
import {
    Package, ChevronRight, ChevronLeft, Star,
    ShieldCheck, MapPin, Phone, Mail, User,
    ShoppingBag, Truck, CheckCircle2, Clock, AlertCircle
} from 'lucide-react';

const statusConfig = {
    'New':             { color: 'bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300',       icon: <Clock size={12} />,        label: 'New' },
    'Processing':      { color: 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/40 dark:text-yellow-300', icon: <Package size={12} />,      label: 'Processing' },
    'Shipped':         { color: 'bg-purple-100 text-purple-700 dark:bg-purple-900/40 dark:text-purple-300', icon: <Truck size={12} />,        label: 'Shipped' },
    'Delivered':       { color: 'bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-300',    icon: <CheckCircle2 size={12} />, label: 'Delivered' },
    'Cancelled':       { color: 'bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-300',            icon: <AlertCircle size={12} />,  label: 'Cancelled' },
    'Pending Payment': { color: 'bg-orange-100 text-orange-700 dark:bg-orange-900/40 dark:text-orange-300', icon: <Clock size={12} />,        label: 'Pending Payment' },
    'Payment Failed':  { color: 'bg-red-100 text-red-800 dark:bg-red-900/40 dark:text-red-400',            icon: <AlertCircle size={12} />,  label: 'Payment Failed' },
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
                        {cfg.icon} {status}
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
                className="bg-primary text-black font-bold py-2.5 px-6 rounded-xl hover:bg-green-400 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
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
    const orderPlaced = !!location.state?.orderPlaced;
    const [orders, setOrders] = useState([]);
    const [loading, setLoading] = useState(true);
    const [selectedOrder, setSelectedOrder] = useState(null);
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
                <Link to="/profile" className="bg-primary text-black font-bold py-3 px-8 rounded-xl hover:bg-green-400 transition-colors">
                    Go to Login
                </Link>
            </div>
        );
    }

    // ── Order Details View ────────────────────────────────────────
    if (selectedOrder) {
        const feedbackKey = selectedOrder.TrackingId || selectedOrder.Email + selectedOrder.AmountPaid;
        const alreadySubmitted = submittedFeedback.includes(feedbackKey);

        return (
            <div className="container mx-auto px-4 py-8 max-w-2xl min-h-[70vh]">
                <button
                    onClick={() => setSelectedOrder(null)}
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
                            {c.icon} {s}
                        </span>
                    );
                })()}

                {/* Info Card */}
                <div className="bg-white dark:bg-[#1e1e1e] rounded-2xl border border-gray-100 dark:border-gray-800 p-6 mb-4 space-y-4">
                    <h2 className="font-bold text-gray-500 dark:text-gray-400 text-xs uppercase tracking-wider mb-3">Customer Details</h2>
                    {[
                        { icon: <User size={15} />, label: 'Name', value: selectedOrder.Name },
                        { icon: <Mail size={15} />, label: 'Email', value: selectedOrder.Email },
                        { icon: <Phone size={15} />, label: 'Mobile', value: selectedOrder.Mobile ? `+91 ${selectedOrder.Mobile}` : 'N/A' },
                        { icon: <MapPin size={15} />, label: 'Address', value: selectedOrder.Address },
                    ].map(({ icon, label, value }) => (
                        <div key={label} className="flex items-start gap-3">
                            <span className="mt-0.5 text-primary">{icon}</span>
                            <div>
                                <p className="text-xs text-gray-400 font-medium">{label}</p>
                                <p className="text-sm font-semibold dark:text-gray-200">{value || 'N/A'}</p>
                            </div>
                        </div>
                    ))}
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
                    <h1 className="text-4xl font-bold font-heading bg-clip-text text-transparent bg-gradient-to-r from-primary to-green-600">My Orders</h1>
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

            {loading ? (
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
                    <Link to="/shop" className="bg-primary text-black font-bold py-3 px-8 rounded-xl hover:bg-green-400 transition-colors">
                        Start Shopping
                    </Link>
                </motion.div>
            ) : (
                <div className="space-y-3">
                    {orders.map((order, idx) => (
                        <OrderCard
                            key={idx}
                            order={order}
                            onClick={() => setSelectedOrder(order)}
                        />
                    ))}
                </div>
            )}
        </div>
    );
};

export default Orders;
