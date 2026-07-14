// All API calls use VITE_API_URL from .env / .env.production — never a hardcoded URL.
// Set the var in your environment files before running dev or building for production.
const API_URL = import.meta.env.VITE_API_URL;

// ── Image helpers ─────────────────────────────────────────────────────────────

export const getImageUrl = (imageId) => {
    if (!imageId) return 'https://placehold.co/400x500/000/FFF?text=No+Image';
    if (imageId.startsWith('http')) return imageId;
    return `https://lh3.googleusercontent.com/d/${imageId}`;
};

// ── Shared fetch util ─────────────────────────────────────────────────────────
//Post Call
const post = async (type, body) => {
    const res = await fetch(`${API_URL}?type=${type}`, {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify(body),
    });
    let data;
    try {
        data = await res.json();
    } catch {
        throw new Error(`Invalid JSON response from "${type}" (status ${res.status})`);
    }
    // Backend already returns a parseable { error: "..." } body on failures —
    // let that pass through so existing callers keep showing the specific
    // message. Only throw for failures with no usable error payload at all
    // (e.g. a gateway error page that still happened to be valid JSON).
    if (!res.ok && data?.error === undefined) {
        throw new Error(`Request "${type}" failed with status ${res.status}`);
    }
    return data;
};

// ── Catalog (GET — public, no auth) ──────────────────────────────────────────

let cachedData = null;

export const fetchAllData = async () => {
    if (cachedData) return cachedData;
    const res = await fetch(API_URL);
    if (!res.ok) throw new Error('Failed to fetch catalog data');
    cachedData = await res.json();
    return cachedData;
};

export const fetchBanners     = async () => (await fetchAllData()).banner     || [];
export const fetchProducts    = async () => (await fetchAllData()).product    || [];
export const fetchCollections = async () => (await fetchAllData()).collection || [];
export const fetchCategories  = async () => (await fetchAllData()).category   || [];

// Active store/branch locations, sorted by Display_Order. Cached per session
// so revisiting the homepage doesn't re-fetch.
let cachedBranches = null;

export const fetchBranches = async () => {
    if (cachedBranches) return cachedBranches;
    const res  = await fetch(`${API_URL}?type=branches`);
    const data = await res.json();
    cachedBranches = data.branches || [];
    return cachedBranches;
};

export const fetchProductById = async (id) => {
    const products = await fetchProducts();
    return products.find(p => p.ID === id);
};

// ── Feedback & ratings (public reads) ────────────────────────────────────────

export const fetchAllFeedback = async () => {
    const res  = await fetch(`${API_URL}?type=feedback`);
    const data = await res.json();
    return data.feedback || [];
};

// Top liked top-level comments — used for the homepage testimonials carousel.
export const fetchTestimonials = async (limit = 8) => {
    const res  = await fetch(`${API_URL}?type=testimonials&limit=${limit}`);
    const data = await res.json();
    return data.testimonials || [];
};

export const fetchProductFeedback = async (productId) => {
    const res  = await fetch(`${API_URL}?type=feedback&productId=${productId}`);
    const data = await res.json();
    return data.feedback || [];
};

export const fetchProductRating = async (productId) => {
    const res = await fetch(`${API_URL}?type=rating&productId=${productId}`);
    if (!res.ok) return null;
    return res.json();
};

// ── Feedback writes ───────────────────────────────────────────────────────────

// Post a top-level comment or a reply. idToken required (authenticated only).
export const postComment = async (commentData) => {
    const { idToken, commentParentId, productId, userDisplayName, phoneNo, comments } = commentData;
    return post('feedback', {
        idToken,
        commentParentId: commentParentId || null,
        productId,
        userDisplayName: userDisplayName || null,
        phoneNo,
        comments,
    });
};

export const postRating = async ({ idToken, productId, rating }) =>
    post('rating', { idToken, productId, rating });

// ── Customer / user (POST — requires idToken) ─────────────────────────────────

// Called on Google login. Creates the customer row if new; never overwrites
// phone/address so a re-login doesn't erase saved shipping details.
export const saveCustomer = async ({ idToken, email, name }) =>
    post('customer', { idToken, email, name });

// Called from Profile save and Checkout "Details" step.
// Updates name and phone only — addresses managed via address endpoints.
export const updateCustomer = async ({ idToken, name, phone }) =>
    post('updateCustomer', { idToken, name, phone });

// Fetch the authenticated user's profile. idToken is verified server-side.
export const fetchUserDetails = async (idToken) => {
    if (!idToken) return null;
    const data = await post('userDetails', { idToken });
    return data.success ? data.customer : null;
};

// ── Orders ────────────────────────────────────────────────────────────────────

// Place a new COD order. Backend recomputes amount from D1 prices — never trust client.
export const saveOrder = async (orderData) => post('order', orderData);

// Fetch only the calling user's own orders (backend filters by verified sub).
export const fetchMyOrders = async (idToken) => {
    if (!idToken) return [];
    const data = await post('myOrders', { idToken });
    return data.orders || [];
};

// Admin only — backend verifies idToken then checks against ADMIN_SUB secret.
export const fetchAdminOrders = async (idToken) => {
    if (!idToken) return [];
    const data = await post('adminOrders', { idToken });
    return data.orders || [];
};

// Admin only — update order status, tracking ID, shipping company, and/or dates.
export const updateOrderStatus = async (idToken, orderId, status, trackingId, shippingCompany, shippedAt, deliveredAt) =>
    post('updateStatus', { idToken, orderId, status, trackingId, shippingCompany, shippedAt, deliveredAt });

// ── Addresses ────────────────────────────────────────────────────────────────

export const addAddress = ({ idToken, label, address, pincode, isDefault }) =>
    post('addAddress', { idToken, label, address, pincode, isDefault });

export const updateAddress = ({ idToken, addressId, label, address, pincode, isDefault }) =>
    post('updateAddress', { idToken, addressId, label, address, pincode, isDefault });

export const deleteAddress = ({ idToken, addressId }) =>
    post('deleteAddress', { idToken, addressId });

export const setDefaultAddress = ({ idToken, addressId }) =>
    post('setDefaultAddress', { idToken, addressId });

// ── Payments ──────────────────────────────────────────────────────────────────

// Amount is always calculated server-side from D1 prices — never trust client amount.
export const initPayment = ({ idToken, cart, name, email, phone, address, pincode, couponCode }) =>
    post('initPayment', { idToken, cart, name, email, phone, address, pincode, couponCode });

// COD advance: charges a fixed ₹100 via Cashfree; the rest is collected on delivery.
export const initCodPayment = ({ idToken, cart, name, email, phone, address, pincode, couponCode }) =>
    post('initCodPayment', { idToken, cart, name, email, phone, address, pincode, couponCode });

// Verify payment result after the Cashfree modal closes.
// Backend calls Cashfree's GET /orders API directly when webhook has not yet fired.
export const checkPaymentStatus = ({ idToken, orderId }) =>
    post('paymentStatus', { idToken, orderId });

// ── Coupons ────────────────────────────────────────────────────────────────────

// Validate a coupon code against the cart subtotal. idToken is optional — only
// needed to resolve New/Existing customer type for user-type-restricted coupons.
// Returns {success, code, percentage, discountAmount, maxDiscount, minOrderValue} or {error}.
export const validateCoupon = (code, idToken, cartTotal) =>
    post('validateCoupon', { code, idToken, cartTotal });

// List active coupons the current cart/customer is eligible for (already-used,
// wrong user-type, and below-minimum coupons are filtered out server-side).
// Returns {success, coupons: [{code, percentage, minOrderValue, maxDiscount, discountAmount}]}.
export const fetchAvailableCoupons = (idToken, cartTotal) =>
    post('availableCoupons', { idToken, cartTotal });

// ── Custom Orders ─────────────────────────────────────────────────────────────

// Submit a quote request. designImage is a compressed base64 JPEG/PNG/WebP string (jersey only).
// orderDetails is a JSON object or array describing sizes/quantities.
export const submitCustomOrder = ({ idToken, orderType, shirtColor, shirtStyle, designImage, orderDetails, notes }) =>
    post('submitCustomOrder', { idToken, orderType, shirtColor, shirtStyle, designImage, orderDetails, notes });

export const getMyCustomOrders = (idToken) =>
    post('myCustomOrders', { idToken });

export const getAdminCustomOrders = (idToken) =>
    post('adminCustomOrders', { idToken });

// Admin: set quoted price and/or status. quotedPrice is a number; status is a string.
export const updateCustomQuote = ({ idToken, customOrderId, quotedPrice, status }) =>
    post('updateCustomQuote', { idToken, customOrderId, quotedPrice, status });

// User confirms a quoted custom order (creates a COD order).
export const confirmCustomOrder = ({ idToken, customOrderId, name, mobile, address }) =>
    post('confirmCustomOrder', { idToken, customOrderId, name, mobile, address });

// User accepts a quoted custom order and pays for it online via Cashfree.
// Amount is always the admin's quoted_price — never client-supplied.
// Returns {success, payment_session_id, order_id, amount} or {error}.
export const initCustomOrderPayment = ({ idToken, customOrderId, name, mobile, address, pincode }) =>
    post('initCustomOrderPayment', { idToken, customOrderId, name, mobile, address, pincode });

// COD advance for a custom order: charges a fixed ₹100 via Cashfree; the rest
// (the full quoted price) is collected on delivery — mirrors initCodPayment.
export const initCustomOrderCodPayment = ({ idToken, customOrderId, name, mobile, address, pincode }) =>
    post('initCustomOrderCodPayment', { idToken, customOrderId, name, mobile, address, pincode });

// ── Contact ("Get in Touch" form — public, no auth) ────────────────────────────

export const submitContactMessage = ({ name, email, subject, message }) =>
    post('contactMessage', { name, email, subject, message });

// Admin only — backend verifies idToken then checks against ADMIN_SUB secret.
export const fetchAdminContactMessages = async (idToken) => {
    if (!idToken) return [];
    const data = await post('adminContactMessages', { idToken });
    return data.messages || [];
};

