import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { useUser } from '../context/UserContext';
import { getMyCustomOrders, fetchUserDetails, initCustomOrderPayment, checkPaymentStatus } from '../api/api';
import { ChevronLeft, CheckCircle2 } from 'lucide-react';
import SEO from '../components/SEO';

const CustomCheckout = () => {
    const { customOrderId } = useParams();
    const navigate = useNavigate();
    const { user } = useUser();

    const [step, setStep] = useState(1); // 1: address, 2: summary/pay
    const [order, setOrder] = useState(null);
    const [pageLoading, setPageLoading] = useState(true);
    const [notFound, setNotFound] = useState(false);

    const [formData, setFormData] = useState({ name: '', mobile: '', address: '', pincode: '' });
    const [errors, setErrors] = useState({});
    const [savedAddresses, setSavedAddresses] = useState([]);
    const [selectedAddressId, setSelectedAddressId] = useState(null);
    const [showManualAddress, setShowManualAddress] = useState(false);

    const [cashfree, setCashfree] = useState(null);
    const [isPaying, setIsPaying] = useState(false);
    const [payError, setPayError] = useState('');

    // Preload Cashfree SDK so checkout() runs without an async gap after the tap
    useEffect(() => {
        import('@cashfreepayments/cashfree-js')
            .then(({ load }) => load({ mode: import.meta.env.VITE_CASHFREE_ENV || 'sandbox' }))
            .then(cf => setCashfree(cf))
            .catch(() => {});
    }, []);

    // Load the specific custom order (must still be 'Quoted' to pay for)
    useEffect(() => {
        if (!user?.idToken) return;
        setPageLoading(true);
        getMyCustomOrders(user.idToken).then(res => {
            const found = (res.orders || []).find(o => String(o.id) === String(customOrderId));
            if (!found || found.status !== 'Quoted' || !found.quoted_price) {
                setNotFound(true);
            } else {
                setOrder(found);
            }
        }).catch(() => setNotFound(true))
          .finally(() => setPageLoading(false));
    }, [user?.idToken, customOrderId]);

    // Prefill name/phone/default address from the saved profile
    useEffect(() => {
        if (!user?.idToken) return;
        fetchUserDetails(user.idToken).then(customer => {
            setFormData(prev => ({
                ...prev,
                name:   customer?.name || user.name || '',
                mobile: customer?.phoneNumber ? String(customer.phoneNumber) : (user.phone || ''),
            }));
            const addrs = customer?.addresses || [];
            setSavedAddresses(addrs);
            if (addrs.length > 0) {
                const def = addrs.find(a => a.is_default) || addrs[0];
                setSelectedAddressId(def.id);
                setFormData(prev => ({ ...prev, address: def.address, pincode: def.pincode }));
            }
        }).catch(() => {});
    }, [user?.idToken]);

    const validateStep1 = () => {
        const e = {};
        if (!formData.name?.trim())               e.name   = 'Full Name is required';
        if (!/^\d{10}$/.test(formData.mobile))    e.mobile = 'Enter a valid 10-digit mobile number';
        if (!formData.address?.trim())            e.address = 'Address is required';
        if (!/^\d{6}$/.test(formData.pincode))    e.pincode = 'Enter a valid 6-digit pincode';
        setErrors(e);
        return Object.keys(e).length === 0;
    };

    const handleContinue = (e) => {
        e.preventDefault();
        if (validateStep1()) setStep(2);
    };

    // Cashfree's modal can show the user a success screen slightly before its
    // own backend finalises order_status and before the webhook fires — a
    // single immediate status check can still read PENDING/ACTIVE even though
    // the payment genuinely succeeded, which we'd otherwise wrongly report as
    // "cancelled". Poll briefly instead of checking only once.
    const pollPaymentStatus = async (orderId, attempts = 6, delayMs = 2000) => {
        for (let i = 0; i < attempts; i++) {
            const statusRes = await checkPaymentStatus({ idToken: user.idToken, orderId });
            if (statusRes?.status === 'SUCCESS' || statusRes?.status === 'FAILED') {
                return statusRes;
            }
            if (i < attempts - 1) {
                await new Promise(resolve => setTimeout(resolve, delayMs));
            }
        }
        return { status: 'PENDING' };
    };

    const handlePayNow = async () => {
        if (!cashfree) {
            setPayError('Payment system is not ready. Please refresh and try again.');
            return;
        }
        setIsPaying(true);
        setPayError('');
        try {
            const result = await initCustomOrderPayment({
                idToken:       user.idToken,
                customOrderId: order.id,
                name:          formData.name,
                mobile:        formData.mobile,
                address:       formData.address,
                pincode:       formData.pincode,
            });
            if (!result.success || !result.payment_session_id) {
                setPayError(result.error || 'Payment initialisation failed. Please try again.');
                return;
            }

            await cashfree.checkout({
                paymentSessionId: result.payment_session_id,
                redirectTarget:   '_modal',
            });

            // Cashfree JS SDK v1 always resolves checkout() regardless of outcome —
            // always verify the real status via the backend. Poll briefly rather
            // than checking once, since Cashfree/the webhook can lag a few seconds
            // behind what the modal already showed the user.
            const statusRes = await pollPaymentStatus(result.order_id);

            if (statusRes?.status === 'SUCCESS') {
                navigate('/orders', { state: { orderPlaced: true } });
            } else if (statusRes?.status === 'FAILED') {
                setPayError('Payment was declined or cancelled. Please try a different method.');
            } else {
                setPayError('Payment was cancelled. You can try again anytime.');
            }
        } catch {
            setPayError('Unable to process payment right now. Please refresh and try again.');
        } finally {
            setIsPaying(false);
        }
    };

    if (!user) {
        return (
            <div className="container mx-auto px-4 py-20 min-h-[60vh] flex flex-col items-center justify-center text-center">
                <h1 className="text-2xl font-bold mb-3">Sign In Required</h1>
                <p className="text-gray-500 dark:text-gray-400 mb-6">Please log in to continue.</p>
                <Link to="/profile" className="bg-primary text-black font-bold py-3 px-8 rounded-xl hover:brightness-90 transition-all">
                    Go to Login
                </Link>
            </div>
        );
    }

    if (pageLoading) {
        return (
            <div className="min-h-[60vh] flex items-center justify-center">
                <div className="animate-spin rounded-full h-10 w-10 border-t-2 border-b-2 border-primary" />
            </div>
        );
    }

    if (notFound) {
        return (
            <div className="container mx-auto px-4 py-20 min-h-[60vh] flex flex-col items-center justify-center text-center gap-4">
                <p className="text-gray-500 dark:text-gray-400">This custom order isn't available to pay for right now.</p>
                <Link to="/orders" className="bg-primary text-black font-bold py-3 px-8 rounded-xl hover:brightness-90 transition-all">
                    Back to Orders
                </Link>
            </div>
        );
    }

    const desc = `${order.order_type === 'jersey' ? 'Jersey Design' : 'Team Names Order'} · ${order.quantity} pcs · ${order.shirt_color} ${order.shirt_style === 'round' ? 'Regular' : 'Oversized'}`;

    return (
        <div className="container mx-auto px-4 py-8 mb-20 max-w-2xl min-h-[70vh]">
            <SEO title="Complete Your Custom Order Payment" noindex />

            <button
                onClick={() => navigate('/orders')}
                className="flex items-center gap-2 text-gray-500 hover:text-primary font-semibold mb-6 transition-colors"
            >
                <ChevronLeft size={20} /> Back to Orders
            </button>

            <h1 className="text-3xl font-heading font-bold mb-8 text-center">Custom Order Checkout</h1>

            {/* Progress stepper */}
            <div className="mb-10">
                <div className="relative flex items-center justify-between max-w-xs mx-auto">
                    <div className="absolute inset-x-5 top-1/2 h-1 -translate-y-1/2 bg-gray-200 dark:bg-gray-800 rounded-full" />
                    <div
                        className="absolute left-5 top-1/2 h-1 -translate-y-1/2 bg-primary rounded-full transition-all duration-500"
                        style={{ width: step === 2 ? 'calc(100% - 2.5rem)' : '0%' }}
                    />
                    {[1, 2].map(s => (
                        <div
                            key={s}
                            className={`relative z-10 w-10 h-10 shrink-0 rounded-full flex items-center justify-center font-bold text-sm transition-colors duration-300 ${
                                step >= s ? 'bg-primary text-black' : 'bg-white dark:bg-gray-800 border-2 border-gray-200 dark:border-gray-700 text-gray-400'
                            }`}
                        >
                            {step > s ? <CheckCircle2 size={20} /> : s}
                        </div>
                    ))}
                </div>
            </div>

            <div className="bg-white dark:bg-[#1e1e1e] rounded-2xl p-6 md:p-8 shadow-sm border border-gray-100 dark:border-gray-800">
                {step === 1 && (
                    <form onSubmit={handleContinue} className="space-y-4">
                        <h2 className="text-2xl font-bold mb-6">Delivery Details</h2>

                        <div>
                            <label className="block text-sm font-medium mb-1">Full Name</label>
                            <input
                                type="text"
                                value={formData.name}
                                onChange={e => setFormData(p => ({ ...p, name: e.target.value }))}
                                className={`w-full bg-gray-50 dark:bg-gray-900 border ${errors.name ? 'border-red-500' : 'border-gray-200 dark:border-gray-700'} rounded-xl py-3 px-4 focus:outline-none focus:ring-2 focus:ring-primary/20 transition-all`}
                            />
                            {errors.name && <p className="text-red-500 text-xs mt-1">{errors.name}</p>}
                        </div>

                        <div>
                            <label className="block text-sm font-medium mb-1">Mobile Number</label>
                            <div className="relative">
                                <span className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500 font-medium">+91</span>
                                <input
                                    type="tel"
                                    value={formData.mobile}
                                    onChange={e => {
                                        const v = e.target.value.replace(/\D/g, '');
                                        if (v.length <= 10) setFormData(p => ({ ...p, mobile: v }));
                                    }}
                                    placeholder="10-digit number"
                                    className={`w-full bg-gray-50 dark:bg-gray-900 border ${errors.mobile ? 'border-red-500' : 'border-gray-200 dark:border-gray-700'} rounded-xl py-3 pl-14 pr-4 focus:outline-none focus:ring-2 focus:ring-primary/20 transition-all`}
                                />
                            </div>
                            {errors.mobile && <p className="text-red-500 text-xs mt-1">{errors.mobile}</p>}
                        </div>

                        {/* Address: saved-address picker, same pattern as regular checkout */}
                        {savedAddresses.length > 0 && !showManualAddress ? (
                            <div>
                                <label className="block text-sm font-medium mb-2">Delivery Address</label>
                                <div className="space-y-2">
                                    {savedAddresses.map(addr => (
                                        <label
                                            key={addr.id}
                                            className={`flex items-start gap-3 p-3 rounded-xl border cursor-pointer transition-colors ${
                                                selectedAddressId === addr.id
                                                    ? 'border-primary bg-primary/5 dark:bg-primary/10'
                                                    : 'border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600'
                                            }`}
                                        >
                                            <input
                                                type="radio"
                                                name="savedAddress"
                                                checked={selectedAddressId === addr.id}
                                                onChange={() => {
                                                    setSelectedAddressId(addr.id);
                                                    setFormData(prev => ({ ...prev, address: addr.address, pincode: addr.pincode }));
                                                    if (errors.address || errors.pincode) setErrors(prev => ({ ...prev, address: '', pincode: '' }));
                                                }}
                                                className="mt-0.5 accent-primary"
                                            />
                                            <div className="min-w-0">
                                                <div className="flex items-center gap-1.5 mb-0.5">
                                                    <span className="text-sm font-semibold">{addr.label}</span>
                                                    {addr.is_default ? (
                                                        <span className="text-xs bg-primary/20 text-primary font-semibold px-1.5 py-0.5 rounded-full">Default</span>
                                                    ) : null}
                                                </div>
                                                <p className="text-sm text-gray-600 dark:text-gray-400 leading-snug">{addr.address}</p>
                                                <p className="text-xs text-gray-500 mt-0.5">Pincode: {addr.pincode}</p>
                                            </div>
                                        </label>
                                    ))}
                                </div>
                                <button
                                    type="button"
                                    onClick={() => { setShowManualAddress(true); setFormData(prev => ({ ...prev, address: '', pincode: '' })); }}
                                    className="mt-2 text-sm text-primary font-semibold hover:underline"
                                >
                                    + Add a new address
                                </button>
                                {errors.address && <p className="text-red-500 text-xs mt-1">{errors.address}</p>}
                            </div>
                        ) : (
                            <>
                                {savedAddresses.length > 0 && showManualAddress && (
                                    <button
                                        type="button"
                                        onClick={() => {
                                            setShowManualAddress(false);
                                            const sel = savedAddresses.find(a => a.id === selectedAddressId) || savedAddresses[0];
                                            if (sel) setFormData(prev => ({ ...prev, address: sel.address, pincode: sel.pincode }));
                                        }}
                                        className="text-sm text-gray-500 hover:text-gray-700 dark:hover:text-gray-300 font-medium"
                                    >
                                        ← Back to saved addresses
                                    </button>
                                )}
                                <div>
                                    <label className="block text-sm font-medium mb-1">Complete Address</label>
                                    <textarea
                                        value={formData.address}
                                        onChange={e => setFormData(p => ({ ...p, address: e.target.value }))}
                                        placeholder="House/Flat No., Street Name, Area..."
                                        rows="3"
                                        className={`w-full bg-gray-50 dark:bg-gray-900 border ${errors.address ? 'border-red-500' : 'border-gray-200 dark:border-gray-700'} rounded-xl py-3 px-4 focus:outline-none focus:ring-2 focus:ring-primary/20 transition-all resize-none`}
                                    />
                                    {errors.address && <p className="text-red-500 text-xs mt-1">{errors.address}</p>}
                                </div>
                                <div>
                                    <label className="block text-sm font-medium mb-1">Pincode</label>
                                    <input
                                        type="text"
                                        value={formData.pincode}
                                        onChange={e => {
                                            const v = e.target.value.replace(/\D/g, '');
                                            if (v.length <= 6) setFormData(p => ({ ...p, pincode: v }));
                                        }}
                                        placeholder="6-digit Pincode"
                                        className={`w-full bg-gray-50 dark:bg-gray-900 border ${errors.pincode ? 'border-red-500' : 'border-gray-200 dark:border-gray-700'} rounded-xl py-3 px-4 focus:outline-none focus:ring-2 focus:ring-primary/20 transition-all`}
                                    />
                                    {errors.pincode && <p className="text-red-500 text-xs mt-1">{errors.pincode}</p>}
                                </div>
                            </>
                        )}

                        <div className="pt-4">
                            <button
                                type="submit"
                                className="w-full py-4 bg-primary text-black font-bold rounded-xl hover:brightness-90 transition-all"
                            >
                                CONTINUE TO PAYMENT
                            </button>
                        </div>
                    </form>
                )}

                {step === 2 && (
                    <div className="space-y-6">
                        <h2 className="text-2xl font-bold mb-4">Order Summary</h2>

                        <div className="bg-gray-50 dark:bg-gray-900 rounded-xl p-4 border border-gray-100 dark:border-gray-800 text-sm">
                            <p className="font-bold text-gray-500 dark:text-gray-400 text-xs uppercase tracking-wider mb-2">Delivering to</p>
                            <p className="font-semibold">{formData.name}</p>
                            <p className="text-gray-600 dark:text-gray-400">{formData.address}, {formData.pincode}</p>
                            <p className="text-gray-600 dark:text-gray-400">+91 {formData.mobile}</p>
                        </div>

                        <div className="bg-gray-50 dark:bg-gray-900 rounded-xl p-4 border border-gray-100 dark:border-gray-800">
                            <h3 className="font-bold text-gray-500 dark:text-gray-400 text-sm mb-3 uppercase tracking-wider">Custom Order</h3>
                            <p className="font-semibold text-sm mb-2">{desc}</p>
                            <div className="mt-4 pt-4 border-t border-gray-200 dark:border-gray-700 flex justify-between items-center text-lg font-bold">
                                <span>Total Amount</span>
                                <span className="text-primary text-xl">₹{Number(order.quoted_price).toLocaleString('en-IN')}</span>
                            </div>
                        </div>

                        {payError && (
                            <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 text-red-700 dark:text-red-300 p-3 rounded-xl text-sm">
                                {payError}
                            </div>
                        )}

                        <div className="pt-2 flex flex-col sm:flex-row gap-3">
                            <button
                                type="button"
                                onClick={() => setStep(1)}
                                disabled={isPaying}
                                className="sm:w-auto px-6 py-4 bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 font-bold rounded-xl hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors disabled:opacity-40"
                            >
                                EDIT
                            </button>
                            <button
                                onClick={handlePayNow}
                                disabled={isPaying}
                                className="flex-1 py-4 bg-primary text-black font-bold rounded-xl hover:brightness-90 transition-all flex items-center justify-center gap-2 disabled:opacity-50"
                            >
                                {isPaying ? (
                                    <>
                                        <div className="w-5 h-5 border-2 border-black border-t-transparent rounded-full animate-spin" />
                                        VERIFYING...
                                    </>
                                ) : `PAY ₹${Number(order.quoted_price).toLocaleString('en-IN')} ONLINE`}
                            </button>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
};

export default CustomCheckout;
