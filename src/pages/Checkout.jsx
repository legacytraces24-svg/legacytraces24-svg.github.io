import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { useCart } from '../context/CartContext';
import { CheckCircle2, Tag, X } from 'lucide-react';
import { GoogleLogin } from '@react-oauth/google';
import { jwtDecode } from 'jwt-decode';
import {
    saveCustomer, updateCustomer, saveOrder,
    fetchUserDetails, addAddress, initPayment, initCodPayment, checkPaymentStatus, validateCoupon, fetchAvailableCoupons,
} from '../api/api';

const COD_ADVANCE_AMOUNT = 100;
import { useUser } from '../context/UserContext';

const Checkout = () => {
    const navigate = useNavigate();
    const { cartItems, getCartTotal, clearCart } = useCart();
    const { user, setUser } = useUser();

    const [step, setStep] = useState(1);

    const [formData, setFormData] = useState({
        mobileNumber: '',
        fullName: '',
        email: '',
        address: '',
        pincode: '',
    });

    const [errors, setErrors]               = useState({});
    const [authError, setAuthError]         = useState('');
    const [isPlacingOrder, setIsPlacingOrder]   = useState(false);
    const [isPayingOnline, setIsPayingOnline]   = useState(false);
    const [isPayingCod, setIsPayingCod]         = useState(false);
    const [payError, setPayError]               = useState('');
    const [isSavingDetails, setIsSavingDetails] = useState(false);
    const [pageLoading, setPageLoading]         = useState(true);

    // ── Coupon state ──────────────────────────────────────────────────────────
    const [couponInput,    setCouponInput]    = useState('');
    const [appliedCoupon,  setAppliedCoupon]  = useState(null); // {code, percentage, discountAmount, maxDiscount}
    const [couponError,    setCouponError]    = useState('');
    const [couponApplying, setCouponApplying] = useState(false);
    const [availableCoupons, setAvailableCoupons] = useState([]);

    // Address picker state
    const [savedAddresses, setSavedAddresses]   = useState([]);
    const [selectedAddressId, setSelectedAddressId] = useState(null);
    const [showManualAddress, setShowManualAddress] = useState(false);

    // Preload Cashfree SDK at mount so checkout() is called with the SDK already
    // initialised — avoids losing the user-gesture context inside async handlers.
    const [cashfree, setCashfree] = useState(null);
    useEffect(() => {
        import('@cashfreepayments/cashfree-js')
            .then(({ load }) => load({ mode: import.meta.env.VITE_CASHFREE_ENV || 'sandbox' }))
            .then(cf => setCashfree(cf))
            .catch(() => {});
    }, []);

    useEffect(() => {
        setTimeout(() => setPageLoading(false), 600);
    }, []);

    useEffect(() => {
        if (cartItems.length === 0) navigate('/cart');
    }, [cartItems, navigate]);

    // Effect 1: as soon as the user's email is known (from localStorage or fresh
    // login) populate name/email/phone and advance to Step 2.
    useEffect(() => {
        if (!user?.email) return;
        setFormData(prev => ({
            ...prev,
            fullName:     user.name  || '',
            email:        user.email || '',
            mobileNumber: user.phone || '',
        }));
        setStep(2);
    }, [user?.email]);

    // Effect 2: fetch full profile (addresses, phone) once idToken is available.
    // Fires on first login AND after page-reload once SessionGate restores idToken.
    useEffect(() => {
        if (!user?.idToken) return;
        fetchUserDetails(user.idToken).then(customer => {
            if (!customer) return;
            setFormData(prev => ({
                ...prev,
                fullName:     customer.name        || prev.fullName,
                mobileNumber: customer.phoneNumber
                    ? String(customer.phoneNumber)
                    : prev.mobileNumber,
            }));
            const addrs = customer.addresses || [];
            setSavedAddresses(addrs);
            if (addrs.length > 0) {
                const def = addrs.find(a => a.is_default) || addrs[0];
                setSelectedAddressId(def.id);
                setFormData(prev => ({
                    ...prev,
                    address: def.address,
                    pincode: def.pincode,
                }));
            }
        }).catch(() => {});
    }, [user?.idToken]);

    // ── Delivery calculation ──────────────────────────────────────────────────

    const getDeliveryDetails = (pincode) => {
        if (!pincode) return { charge: 0, message: '', error: null };
        if (!/^\d{6}$/.test(pincode))
            return { error: 'Enter a valid 6-digit pincode', charge: 0, message: '' };
        const prefix = pincode.substring(0, 2);
        if (['60','61','62','63','64'].includes(prefix))
            return { charge: 0, message: 'Free Delivery available 🎉', isCod: true };
        if (['50','51','52','53','54','55','56','57','58','59',
             '66','67','68','69'].includes(prefix))
            return { charge: 50, message: '₹50 delivery charges applied 🚚', isCod: false };
        return {
            charge: 0,
            message: 'Additional courier charges may apply. Our agent will confirm the details.',
            isCod: false,
        };
    };

    const deliveryDetails  = getDeliveryDetails(formData.pincode);
    const isPincodeValid   = !deliveryDetails.error && /^\d{6}$/.test(formData.pincode);
    const deliveryCharge   = isPincodeValid ? deliveryDetails.charge : 0;
    const isFreeDelivery   = isPincodeValid && deliveryCharge === 0 && deliveryDetails.message?.includes('Free');
    const isCodAvailable   = isPincodeValid && deliveryDetails.isCod;
    const subtotal         = getCartTotal();
    // Server is the source of truth for the discount amount (it applies the Max_Discount
    // cap) — the client never recomputes the raw percentage itself.
    const couponDiscount   = appliedCoupon?.discountAmount || 0;
    const finalTotal       = subtotal + deliveryCharge - couponDiscount;

    // ── Handlers ──────────────────────────────────────────────────────────────

    const handleInputChange = (e) => {
        const { name, value } = e.target;
        setFormData(prev => ({ ...prev, [name]: value }));
        if (errors[name]) setErrors(prev => ({ ...prev, [name]: '' }));
    };

    // codeOverride lets a coupon chip apply itself directly (rather than going
    // through setCouponInput, which wouldn't be visible yet on this render pass).
    const handleApplyCoupon = async (codeOverride) => {
        const code = (codeOverride ?? couponInput).trim();
        if (!code) return;
        setCouponApplying(true);
        setCouponError('');
        try {
            const res = await validateCoupon(code.toUpperCase(), user?.idToken, subtotal);
            if (!res?.success) {
                setCouponError(res?.error || 'Invalid coupon code');
                setAppliedCoupon(null);
            } else {
                setAppliedCoupon({
                    code:           res.code,
                    percentage:     res.percentage,
                    discountAmount: res.discountAmount,
                    maxDiscount:    res.maxDiscount,
                });
                setCouponError('');
            }
        } catch {
            setCouponError('Could not validate coupon. Please try again.');
        } finally {
            setCouponApplying(false);
        }
    };

    // Fetch coupons the customer is currently eligible for once they reach the
    // summary step — powers the clickable chips. Server re-validates on click
    // (and again at order time) so this list is only ever a convenience.
    useEffect(() => {
        if (step !== 3) return;
        fetchAvailableCoupons(user?.idToken, subtotal)
            .then(res => setAvailableCoupons(res?.success ? res.coupons : []))
            .catch(() => setAvailableCoupons([]));
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [step]);

    const handleRemoveCoupon = () => {
        setAppliedCoupon(null);
        setCouponInput('');
        setCouponError('');
    };

    const handleLoginSuccess = async (credentialResponse) => {
        try {
            const idToken = credentialResponse.credential;
            const decoded = jwtDecode(idToken);
            // Show name/email immediately (no idToken yet — keeps AdminDashboard
            // guard from seeing idToken without isAdmin during the saveCustomer call).
            setUser({ email: decoded.email, name: decoded.name, phone: '' });
            setFormData(prev => ({ ...prev, fullName: decoded.name, email: decoded.email }));
            const result = await saveCustomer({ idToken, email: decoded.email, name: decoded.name });
            // Atomic: idToken and isAdmin land in the same render.
            setUser({ idToken, isAdmin: result?.customer?.isAdmin ?? false });
            setAuthError('');
        } catch {
            setAuthError('Authentication failed. Please try again.');
        }
    };

    const validateStep2 = () => {
        const e = {};
        if (!formData.fullName?.trim())                            e.fullName     = 'Full Name is required';
        if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email))  e.email        = 'Please enter a valid email address';
        if (!/^\d{10}$/.test(formData.mobileNumber))              e.mobileNumber = 'Please enter a valid 10-digit mobile number';
        if (!formData.address?.trim())                            e.address      = 'Address is required';
        if (!/^\d{6}$/.test(formData.pincode))                   e.pincode      = 'Enter a valid 6-digit pincode';
        setErrors(e);
        return Object.keys(e).length === 0;
    };

    const handleDetailsSubmit = async (ev) => {
        ev.preventDefault();
        if (!validateStep2()) return;

        setIsSavingDetails(true);
        try {
            // Save name + phone
            await updateCustomer({
                idToken: user.idToken,
                name:    formData.fullName,
                phone:   formData.mobileNumber,
            });
            setUser({ name: formData.fullName, phone: formData.mobileNumber });

            // Save address to DB if the user typed it manually
            const isManual = showManualAddress || savedAddresses.length === 0;
            if (isManual && formData.address.trim() && /^\d{6}$/.test(formData.pincode)) {
                const alreadySaved = savedAddresses.some(
                    a => a.address.trim() === formData.address.trim() && a.pincode === formData.pincode
                );
                if (!alreadySaved) {
                    const res = await addAddress({
                        idToken:   user.idToken,
                        label:     'Home',
                        address:   formData.address.trim(),
                        pincode:   formData.pincode,
                        isDefault: savedAddresses.length === 0,
                    });
                    if (res.id) {
                        const newAddr = {
                            id:         res.id,
                            label:      'Home',
                            address:    formData.address.trim(),
                            pincode:    formData.pincode,
                            is_default: savedAddresses.length === 0 ? 1 : 0,
                        };
                        setSavedAddresses(prev =>
                            savedAddresses.length === 0
                                ? [newAddr]
                                : [...prev, newAddr]
                        );
                        setSelectedAddressId(res.id);
                        setShowManualAddress(false);
                    }
                }
            }

            setStep(3);
        } finally {
            setIsSavingDetails(false);
        }
    };

    // Backend recomputes price from D1 — never trust client amount. This path is
    // only used when COD isn't available for the pincode (no advance payment).
    const handlePlaceOrder = async () => {
        setIsPlacingOrder(true);
        try {
            const cart = cartItems.map(i => ({
                productId: i.ID,
                size:      i.size,
                quantity:  i.quantity,
            }));
            const result = await saveOrder({
                idToken:    user.idToken,
                cart,
                email:      formData.email,
                name:       formData.fullName,
                mobile:     formData.mobileNumber,
                address:    formData.address,
                pincode:    formData.pincode,
                cod:        'No',
                couponCode: appliedCoupon?.code || null,
            });
            if (!result.success) {
                alert(result.error || 'Failed to place order. Please try again.');
                return;
            }
            clearCart();
            navigate('/orders', { state: { orderPlaced: true } });
        } catch {
            alert('Failed to place order. Please try again.');
        } finally {
            setIsPlacingOrder(false);
        }
    };

    const handlePayNow = async () => {
        if (!cashfree) {
            setPayError('Payment system is not ready. Please refresh and try again.');
            return;
        }
        if (!user?.idToken) {
            setPayError('Your session has expired. Please sign out and sign in again to pay.');
            return;
        }
        setIsPayingOnline(true);
        setPayError('');
        try {
            const cart = cartItems.map(i => ({
                productId: i.ID,
                size:      i.size,
                quantity:  i.quantity,
            }));
            const result = await initPayment({
                idToken:    user.idToken,
                cart,
                name:       formData.fullName,
                email:      formData.email,
                phone:      formData.mobileNumber,
                address:    formData.address,
                pincode:    formData.pincode,
                couponCode: appliedCoupon?.code || null,
            });
            if (!result.success || !result.payment_session_id) {
                const msg = result.error === 'Unauthorized'
                    ? 'Session expired. Please sign out and sign in again.'
                    : (result.error || 'Payment initialisation failed. Please try again.');
                setPayError(msg);
                setIsPayingOnline(false);
                return;
            }

            // SDK was preloaded at mount — checkout() is now called without any
            // async gap, keeping the browser user-gesture context intact so the
            // modal is not blocked on mobile.
            // Note: Cashfree JS SDK v1 always resolves checkout() with null —
            // we cannot trust cfResult to determine success. Always verify via backend.
            await cashfree.checkout({
                paymentSessionId: result.payment_session_id,
                redirectTarget:   '_modal',
            });

            // Modal closed (payment done, cancelled, or failed).
            // Verify real status via backend — backend calls Cashfree's GET /orders
            // API directly so we get the answer even before the webhook fires.
            const statusRes = await checkPaymentStatus({
                idToken:  user.idToken,
                orderId:  result.order_id,
            });

            if (statusRes?.status === 'SUCCESS') {
                clearCart();
                navigate('/orders', { state: { orderPlaced: true } });
            } else if (statusRes?.status === 'FAILED') {
                setPayError('Payment was declined or cancelled. Please try a different method.');
            } else {
                // PENDING — modal was closed before payment completed
                setPayError('Payment was cancelled. You can try again anytime.');
            }
        } catch {
            setPayError('Unable to process payment right now. Please refresh and try again.');
        } finally {
            setIsPayingOnline(false);
        }
    };

    // Charges the fixed ₹100 COD advance via Cashfree; the remaining balance is
    // collected on delivery. Mirrors handlePayNow's checkout+verify flow.
    const handleCodAdvancePayment = async () => {
        if (!cashfree) {
            setPayError('Payment system is not ready. Please refresh and try again.');
            return;
        }
        if (!user?.idToken) {
            setPayError('Your session has expired. Please sign out and sign in again to pay.');
            return;
        }
        setIsPayingCod(true);
        setPayError('');
        try {
            const cart = cartItems.map(i => ({
                productId: i.ID,
                size:      i.size,
                quantity:  i.quantity,
            }));
            const result = await initCodPayment({
                idToken:    user.idToken,
                cart,
                name:       formData.fullName,
                email:      formData.email,
                phone:      formData.mobileNumber,
                address:    formData.address,
                pincode:    formData.pincode,
                couponCode: appliedCoupon?.code || null,
            });
            if (!result.success || !result.payment_session_id) {
                const msg = result.error === 'Unauthorized'
                    ? 'Session expired. Please sign out and sign in again.'
                    : (result.error || 'Could not start COD advance payment. Please try again.');
                setPayError(msg);
                setIsPayingCod(false);
                return;
            }

            await cashfree.checkout({
                paymentSessionId: result.payment_session_id,
                redirectTarget:   '_modal',
            });

            const statusRes = await checkPaymentStatus({
                idToken:  user.idToken,
                orderId:  result.order_id,
            });

            if (statusRes?.status === 'SUCCESS') {
                clearCart();
                navigate('/orders', { state: { orderPlaced: true } });
            } else if (statusRes?.status === 'FAILED') {
                setPayError('Advance payment was declined or cancelled. Please try again.');
            } else {
                setPayError('Advance payment was cancelled. You can try again anytime.');
            }
        } catch {
            setPayError('Unable to process payment right now. Please refresh and try again.');
        } finally {
            setIsPayingCod(false);
        }
    };

    // ── Render ────────────────────────────────────────────────────────────────

    const steps = [
        { id: 1, title: 'Login' },
        { id: 2, title: 'Details' },
        { id: 3, title: 'Summary' },
    ];

    if (cartItems.length === 0) return null;

    return (
        <div className="container mx-auto px-4 py-8 mb-20 max-w-2xl min-h-[70vh]">
            <h1 className="text-3xl font-heading font-bold mb-8 text-center bg-clip-text text-transparent bg-gradient-to-r from-primary to-cyan-500">
                Secure Checkout
            </h1>

            {/* Progress stepper */}
            <div className="mb-12">
                {/* Circle row — line runs through the center of the circles */}
                <div className="relative flex items-center justify-between">
                    {/* Track (inset-x-5 = half circle width, so line starts/ends at circle centres) */}
                    <div className="absolute inset-x-5 top-1/2 h-1 -translate-y-1/2 bg-gray-200 dark:bg-gray-800 rounded-full" />
                    {/* Progress fill */}
                    <div
                        className="absolute left-5 top-1/2 h-1 -translate-y-1/2 bg-primary rounded-full transition-all duration-500"
                        style={{ width: `calc((100% - 2.5rem) * ${(step - 1) / (steps.length - 1)})` }}
                    />
                    {steps.map(s => (
                        <div
                            key={s.id}
                            className={`relative z-10 w-10 h-10 shrink-0 rounded-full flex items-center justify-center font-bold text-sm transition-colors duration-300 ${
                                step >= s.id
                                    ? 'bg-primary text-black'
                                    : 'bg-white dark:bg-gray-800 border-2 border-gray-200 dark:border-gray-700 text-gray-400'
                            }`}
                        >
                            {step > s.id ? <CheckCircle2 size={20} /> : s.id}
                        </div>
                    ))}
                </div>
                {/* Labels row */}
                <div className="flex justify-between mt-2">
                    {steps.map(s => (
                        <span
                            key={s.id}
                            className={`text-xs font-semibold w-10 text-center hidden md:block transition-colors duration-300 ${
                                step >= s.id ? 'text-black dark:text-white' : 'text-gray-400'
                            }`}
                        >
                            {s.title}
                        </span>
                    ))}
                </div>
            </div>

            <div className="bg-white dark:bg-[#1e1e1e] rounded-2xl p-6 md:p-8 shadow-sm border border-gray-100 dark:border-gray-800 overflow-hidden relative min-h-[400px]">
                {pageLoading ? (
                    <div className="flex flex-col items-center justify-center h-full min-h-[300px] animate-pulse">
                        <div className="w-16 h-16 bg-gray-200 dark:bg-gray-800 rounded-full mb-4" />
                        <div className="w-48 h-6 bg-gray-200 dark:bg-gray-800 rounded-md mb-2" />
                        <div className="w-32 h-4 bg-gray-200 dark:bg-gray-800 rounded-md" />
                    </div>
                ) : (
                <AnimatePresence mode="wait">

                    {/* ── Step 1: Login ── */}
                    {step === 1 && (
                        <motion.div
                            key="step1"
                            initial={{ opacity: 0, x: 50 }}
                            animate={{ opacity: 1, x: 0 }}
                            exit={{ opacity: 0, x: -50 }}
                            transition={{ duration: 0.3 }}
                            className="space-y-6 flex flex-col items-center justify-center min-h-[300px]"
                        >
                            <div className="text-center mb-6">
                                <h2 className="text-2xl font-bold mb-2">Login or Signup</h2>
                                <p className="text-gray-500 dark:text-gray-400">Continue with Google to auto-fill your details.</p>
                            </div>
                            <div className="w-full flex justify-center mt-4">
                                <GoogleLogin
                                    onSuccess={handleLoginSuccess}
                                    onError={() => setAuthError('Google Sign-In failed. Please try again.')}
                                    useOneTap
                                    shape="rectangular"
                                    size="large"
                                    text="continue_with"
                                />
                            </div>
                            {authError && <p className="text-red-500 text-sm mt-4 text-center">{authError}</p>}
                        </motion.div>
                    )}

                    {/* ── Step 2: Shipping Details ── */}
                    {step === 2 && (
                        <motion.form
                            key="step2"
                            initial={{ opacity: 0, x: 50 }}
                            animate={{ opacity: 1, x: 0 }}
                            exit={{ opacity: 0, x: -50 }}
                            transition={{ duration: 0.3 }}
                            onSubmit={handleDetailsSubmit}
                            className="space-y-4"
                        >
                            <h2 className="text-2xl font-bold mb-6">Shipping Details</h2>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                {/* Full Name */}
                                <div>
                                    <label className="block text-sm font-medium mb-1">Full Name</label>
                                    <input
                                        type="text"
                                        name="fullName"
                                        value={formData.fullName}
                                        onChange={handleInputChange}
                                        className={`w-full bg-gray-50 dark:bg-gray-900 border ${errors.fullName ? 'border-red-500' : 'border-gray-200 dark:border-gray-700'} rounded-xl py-3 px-4 focus:outline-none focus:ring-2 focus:ring-primary/20 transition-all`}
                                    />
                                    {errors.fullName && <p className="text-red-500 text-xs mt-1">{errors.fullName}</p>}
                                </div>

                                {/* Email — read-only (from Google) */}
                                <div>
                                    <label className="block text-sm font-medium mb-1">Email Address</label>
                                    <input
                                        type="email"
                                        value={formData.email}
                                        readOnly
                                        className="w-full bg-gray-100 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl py-3 px-4 focus:outline-none text-gray-500 cursor-not-allowed"
                                    />
                                </div>
                            </div>

                            {/* Mobile */}
                            <div>
                                <label className="block text-sm font-medium mb-1">Mobile Number</label>
                                <div className="relative">
                                    <span className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500 font-medium">+91</span>
                                    <input
                                        type="tel"
                                        name="mobileNumber"
                                        value={formData.mobileNumber}
                                        onChange={(e) => {
                                            const val = e.target.value.replace(/\D/g, '');
                                            if (val.length <= 10)
                                                handleInputChange({ target: { name: 'mobileNumber', value: val } });
                                        }}
                                        placeholder="10-digit number"
                                        className={`w-full bg-gray-50 dark:bg-gray-900 border ${errors.mobileNumber ? 'border-red-500' : 'border-gray-200 dark:border-gray-700'} rounded-xl py-3 pl-14 pr-4 focus:outline-none focus:ring-2 focus:ring-primary/20 transition-all`}
                                    />
                                </div>
                                {errors.mobileNumber && <p className="text-red-500 text-xs mt-1">{errors.mobileNumber}</p>}
                            </div>

                            {/* ── Address: picker (saved) or manual input ── */}
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
                                                        setFormData(prev => ({
                                                            ...prev,
                                                            address: addr.address,
                                                            pincode: addr.pincode,
                                                        }));
                                                        if (errors.address || errors.pincode)
                                                            setErrors(prev => ({ ...prev, address: '', pincode: '' }));
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
                                        onClick={() => {
                                            setShowManualAddress(true);
                                            setFormData(prev => ({ ...prev, address: '', pincode: '' }));
                                        }}
                                        className="mt-2 text-sm text-primary font-semibold hover:underline"
                                    >
                                        + Add a new address
                                    </button>
                                    {errors.address && <p className="text-red-500 text-xs mt-1">{errors.address}</p>}
                                    <AnimatePresence>
                                        {isPincodeValid && deliveryDetails.message && (
                                            <motion.p
                                                initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                                                className={`text-sm mt-2 font-medium ${isFreeDelivery ? 'text-green-500' : 'text-orange-500'}`}
                                            >
                                                {deliveryDetails.message}
                                            </motion.p>
                                        )}
                                    </AnimatePresence>
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
                                            name="address"
                                            value={formData.address}
                                            onChange={handleInputChange}
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
                                            name="pincode"
                                            value={formData.pincode}
                                            onChange={(e) => {
                                                const val = e.target.value.replace(/\D/g, '');
                                                if (val.length <= 6)
                                                    handleInputChange({ target: { name: 'pincode', value: val } });
                                            }}
                                            placeholder="6-digit Pincode"
                                            className={`w-full bg-gray-50 dark:bg-gray-900 border ${errors.pincode ? 'border-red-500' : 'border-gray-200 dark:border-gray-700'} rounded-xl py-3 px-4 focus:outline-none focus:ring-2 focus:ring-primary/20 transition-all`}
                                        />
                                        <AnimatePresence>
                                            {isPincodeValid && !errors.pincode && deliveryDetails.message && (
                                                <motion.div
                                                    initial={{ opacity: 0, height: 0 }}
                                                    animate={{ opacity: 1, height: 'auto' }}
                                                    exit={{ opacity: 0, height: 0 }}
                                                    className="overflow-hidden"
                                                >
                                                    <p className={`text-sm mt-2 font-medium ${isFreeDelivery ? 'text-green-500' : 'text-orange-500'}`}>
                                                        {deliveryDetails.message}
                                                    </p>
                                                </motion.div>
                                            )}
                                            {formData.pincode.length > 0 && !isPincodeValid && !errors.pincode && (
                                                <motion.div
                                                    initial={{ opacity: 0, height: 0 }}
                                                    animate={{ opacity: 1, height: 'auto' }}
                                                    exit={{ opacity: 0, height: 0 }}
                                                    className="overflow-hidden"
                                                >
                                                    <p className="text-red-500 text-xs mt-1">{deliveryDetails.error}</p>
                                                </motion.div>
                                            )}
                                        </AnimatePresence>
                                        {errors.pincode && <p className="text-red-500 text-xs mt-1">{errors.pincode}</p>}
                                    </div>
                                </>
                            )}

                            <div className="pt-4">
                                <button
                                    type="submit"
                                    disabled={isSavingDetails}
                                    className="w-full py-4 bg-primary text-black font-bold rounded-xl hover:brightness-90 transition-all flex justify-center items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                                >
                                    {isSavingDetails ? (
                                        <>
                                            <div className="w-5 h-5 border-2 border-black border-t-transparent rounded-full animate-spin" />
                                            SAVING...
                                        </>
                                    ) : 'PROCEED TO SUMMARY'}
                                </button>
                            </div>
                        </motion.form>
                    )}

                    {/* ── Step 3: Order Summary ── */}
                    {step === 3 && (
                        <motion.div
                            key="step3"
                            initial={{ opacity: 0, x: 50 }}
                            animate={{ opacity: 1, x: 0 }}
                            exit={{ opacity: 0, x: -50 }}
                            transition={{ duration: 0.3 }}
                            className="space-y-6"
                        >
                            <h2 className="text-2xl font-bold mb-4">Order Summary</h2>

                            {/* Delivery address display */}
                            <div className="bg-gray-50 dark:bg-gray-900 rounded-xl p-4 border border-gray-100 dark:border-gray-800 text-sm">
                                <p className="font-bold text-gray-500 dark:text-gray-400 text-xs uppercase tracking-wider mb-2">Delivering to</p>
                                <p className="font-semibold">{formData.fullName}</p>
                                <p className="text-gray-600 dark:text-gray-400">{formData.address}, {formData.pincode}</p>
                                <p className="text-gray-600 dark:text-gray-400">+91 {formData.mobileNumber}</p>
                            </div>

                            {/* Coupon Code */}
                            <div className="bg-gray-50 dark:bg-gray-900 rounded-xl p-4 border border-gray-100 dark:border-gray-800">
                                <h3 className="font-bold text-gray-500 dark:text-gray-400 text-sm mb-3 uppercase tracking-wider flex items-center gap-2">
                                    <Tag size={14} /> Coupon Code
                                </h3>
                                {appliedCoupon ? (
                                    <motion.div
                                        initial={{ opacity: 0, y: -6 }}
                                        animate={{ opacity: 1, y: 0 }}
                                        className="flex items-center justify-between bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-xl px-4 py-3"
                                    >
                                        <div>
                                            <p className="text-sm font-bold text-green-700 dark:text-green-400">🎉 Coupon applied successfully!</p>
                                            <p className="text-xs text-green-600 dark:text-green-500">{appliedCoupon.code} ({appliedCoupon.percentage}% off) → you saved ₹{couponDiscount.toFixed(2)}</p>
                                        </div>
                                        <button onClick={handleRemoveCoupon} className="p-1.5 rounded-lg hover:bg-green-100 dark:hover:bg-green-900/40 text-green-700 dark:text-green-400 transition-colors">
                                            <X size={16} />
                                        </button>
                                    </motion.div>
                                ) : (
                                    <>
                                        {availableCoupons.length > 0 && (
                                            <div className="flex flex-wrap gap-2 mb-3">
                                                {availableCoupons.map(c => (
                                                    <button
                                                        key={c.code}
                                                        type="button"
                                                        onClick={() => handleApplyCoupon(c.code)}
                                                        disabled={couponApplying}
                                                        className="text-left px-3 py-2 rounded-xl border border-dashed border-primary/50 bg-primary/5 hover:bg-primary/10 transition-colors disabled:opacity-50"
                                                    >
                                                        <span className="block text-xs font-bold text-primary">{c.code} · {c.percentage}% OFF</span>
                                                        <span className="block text-[11px] text-gray-500 dark:text-gray-400">Save ₹{c.discountAmount.toFixed(2)} · tap to apply</span>
                                                    </button>
                                                ))}
                                            </div>
                                        )}
                                        <div className="flex gap-2">
                                            <input
                                                type="text"
                                                value={couponInput}
                                                onChange={e => { setCouponInput(e.target.value.toUpperCase()); setCouponError(''); }}
                                                onKeyDown={e => e.key === 'Enter' && handleApplyCoupon()}
                                                placeholder="Enter coupon code"
                                                className="flex-1 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl py-2.5 px-4 text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 uppercase placeholder:normal-case"
                                            />
                                            <button
                                                onClick={() => handleApplyCoupon()}
                                                disabled={!couponInput.trim() || couponApplying}
                                                className="px-4 py-2.5 bg-primary text-black font-bold rounded-xl text-sm hover:brightness-90 transition-all disabled:opacity-50"
                                            >
                                                {couponApplying ? '...' : 'Apply'}
                                            </button>
                                        </div>
                                    </>
                                )}
                                <AnimatePresence mode="wait">
                                    {couponError && (
                                        <motion.p
                                            key="coupon-error"
                                            initial={{ opacity: 0, y: -4 }}
                                            animate={{ opacity: 1, y: 0 }}
                                            exit={{ opacity: 0 }}
                                            className="text-red-500 text-xs mt-2"
                                        >
                                            ⚠️ {couponError}
                                        </motion.p>
                                    )}
                                </AnimatePresence>
                            </div>

                            {/* Products */}
                            <div className="bg-gray-50 dark:bg-gray-900 rounded-xl p-4 border border-gray-100 dark:border-gray-800">
                                <h3 className="font-bold text-gray-500 dark:text-gray-400 text-sm mb-3 uppercase tracking-wider">Products</h3>
                                <div className="space-y-3 divide-y divide-gray-200 dark:divide-gray-800">
                                    {cartItems.map((item, idx) => (
                                        <div key={idx} className="flex justify-between py-2 first:pt-0 last:pb-0">
                                            <div className="flex-1">
                                                <p className="font-semibold text-sm line-clamp-1">{item.Name}</p>
                                                <p className="text-xs text-gray-500">Size: {item.size} × {item.quantity}</p>
                                            </div>
                                            <p className="font-bold whitespace-nowrap ml-4">₹{item.Price * item.quantity}</p>
                                        </div>
                                    ))}
                                </div>

                                <div className="mt-4 pt-4 border-t border-gray-200 dark:border-gray-700 space-y-2 text-sm">
                                    <div className="flex justify-between items-center text-gray-600 dark:text-gray-400">
                                        <span>Subtotal</span>
                                        <span className="font-bold text-black dark:text-white">₹{subtotal}</span>
                                    </div>
                                    <div className="flex justify-between items-center text-gray-600 dark:text-gray-400">
                                        <span>Delivery Charge {isFreeDelivery ? '🎉' : (deliveryCharge > 0 ? '🚚' : '')}</span>
                                        <span className={`font-bold ${isFreeDelivery ? 'text-green-500' : 'text-black dark:text-white'}`}>
                                            {isFreeDelivery ? 'Free' : (deliveryCharge > 0 ? `₹${deliveryCharge}` : 'TBD')}
                                        </span>
                                    </div>

                                    {appliedCoupon && (
                                        <div className="flex justify-between items-center text-green-600 dark:text-green-400">
                                            <span>Coupon ({appliedCoupon.code}) -{appliedCoupon.percentage}%</span>
                                            <span className="font-bold">-₹{couponDiscount.toFixed(2)}</span>
                                        </div>
                                    )}

                                </div>

                                <div className="mt-4 pt-4 border-t border-gray-200 dark:border-gray-700 flex justify-between items-center text-lg font-bold">
                                    <span>Total Amount</span>
                                    <span className="text-primary text-xl">₹{finalTotal.toFixed(2)}</span>
                                </div>

                                {isCodAvailable && (
                                    <div className="mt-3 pt-3 border-t border-dashed border-gray-200 dark:border-gray-700 space-y-1 text-xs text-gray-500 dark:text-gray-500">
                                        <div className="flex justify-between">
                                            <span>Pay now (COD advance, via Cashfree)</span>
                                            <span className="font-bold text-black dark:text-white">₹{COD_ADVANCE_AMOUNT}</span>
                                        </div>
                                        <div className="flex justify-between">
                                            <span>Balance due on delivery</span>
                                            <span className="font-bold text-black dark:text-white">₹{(finalTotal - COD_ADVANCE_AMOUNT).toFixed(2)}</span>
                                        </div>
                                    </div>
                                )}
                            </div>

                            {payError && (
                                <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 text-red-700 dark:text-red-300 p-3 rounded-xl text-sm">
                                    {payError}
                                </div>
                            )}

                            {!user?.idToken && (
                                <div className="bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 text-amber-800 dark:text-amber-300 p-3 rounded-xl text-sm text-center">
                                    <p className="mb-2 font-medium">Your session has expired. Sign in again to pay.</p>
                                    <div className="flex justify-center">
                                        {/* useOneTap=false prevents conflict with SessionGate's One-Tap instance */}
                                        <GoogleLogin onSuccess={handleLoginSuccess} onError={() => {}} useOneTap={false} />
                                    </div>
                                </div>
                            )}

                            {isCodAvailable && (
                                <div className="bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 text-amber-800 dark:text-amber-300 p-3 rounded-xl text-sm flex items-start gap-2">
                                    <span className="text-lg leading-none mt-0.5">ℹ️</span>
                                    <p><span className="font-semibold">COD Notice:</span> Cash on Delivery orders require a ₹{COD_ADVANCE_AMOUNT} advance paid online now (via Cashfree) to confirm your order. The remaining balance is collected on delivery.</p>
                                </div>
                            )}

                            <div className="pt-2 flex flex-col sm:flex-row gap-3">
                                <button
                                    type="button"
                                    onClick={() => setStep(2)}
                                    disabled={isPlacingOrder || isPayingOnline || isPayingCod}
                                    className="sm:w-auto px-6 py-4 bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 font-bold rounded-xl hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors disabled:opacity-40"
                                >
                                    EDIT
                                </button>
                                <button
                                    onClick={handlePayNow}
                                    disabled={isPayingOnline || isPlacingOrder || isPayingCod || !user?.idToken}
                                    className="flex-1 py-4 bg-primary text-black font-bold rounded-xl hover:brightness-90 transition-all flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                                >
                                    {isPayingOnline ? (
                                        <>
                                            <div className="w-5 h-5 border-2 border-black border-t-transparent rounded-full animate-spin" />
                                            VERIFYING...
                                        </>
                                    ) : `PAY ₹${finalTotal} ONLINE`}
                                </button>
                                {isCodAvailable ? (
                                    <button
                                        onClick={handleCodAdvancePayment}
                                        disabled={isPlacingOrder || isPayingOnline || isPayingCod || !user?.idToken}
                                        className="flex-1 py-4 bg-gray-900 dark:bg-white text-white dark:text-black font-bold rounded-xl hover:opacity-80 transition-opacity flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                                    >
                                        {isPayingCod ? (
                                            <>
                                                <div className="w-5 h-5 border-2 border-white dark:border-black border-t-transparent rounded-full animate-spin" />
                                                VERIFYING...
                                            </>
                                        ) : `PAY ₹${COD_ADVANCE_AMOUNT} ADVANCE (COD)`}
                                    </button>
                                ) : (
                                    <button
                                        onClick={handlePlaceOrder}
                                        disabled={isPlacingOrder || isPayingOnline || !user?.idToken}
                                        className="flex-1 py-4 bg-gray-900 dark:bg-white text-white dark:text-black font-bold rounded-xl hover:opacity-80 transition-opacity flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                                    >
                                        {isPlacingOrder ? (
                                            <>
                                                <div className="w-5 h-5 border-2 border-white dark:border-black border-t-transparent rounded-full animate-spin" />
                                                PLACING...
                                            </>
                                        ) : 'PLACE ORDER'}
                                    </button>
                                )}
                            </div>
                        </motion.div>
                    )}

                </AnimatePresence>
                )}
            </div>
        </div>
    );
};

export default Checkout;
