import React, { lazy, Suspense, useEffect } from 'react';
import { Routes, Route } from 'react-router-dom';
import { GoogleLogin } from '@react-oauth/google';
import { jwtDecode } from 'jwt-decode';
import Header from './components/Header';
import Footer from './components/Footer';
import Home from './pages/Home';
import Shop from './pages/Shop';
// Route-level code splitting — only Home/Shop stay in the main bundle since
// they're the most common landing pages; everything else loads on demand to
// keep the initial page weight down (SEO "Reduce total Page File Size").
const ProductDetails = lazy(() => import('./pages/ProductDetails'));
const Stores         = lazy(() => import('./pages/Stores'));
const Customize      = lazy(() => import('./pages/Customize'));
const Favorites      = lazy(() => import('./pages/Favorites'));
const Cart           = lazy(() => import('./pages/Cart'));
const About          = lazy(() => import('./pages/About'));
const Contact        = lazy(() => import('./pages/Contact'));
const ShippingPolicy = lazy(() => import('./pages/ShippingPolicy'));
const Checkout       = lazy(() => import('./pages/Checkout'));
const Profile        = lazy(() => import('./pages/Profile'));
const Orders         = lazy(() => import('./pages/Orders'));
const AdminDashboard = lazy(() => import('./pages/AdminDashboard'));
import { CartProvider } from './context/CartContext';
import { UserProvider, useUser } from './context/UserContext';
import { saveCustomer } from './api/api';
import ScrollToTop from './components/ScrollToTop';
import AnalyticsTracker from './components/AnalyticsTracker';

// Silently re-authenticates via Google One-Tap when the user is known from
// localStorage but the idToken was lost on page reload (it is never persisted).
const SessionGate = () => {
    const { user, setUser } = useUser();

    const handleReAuth = async (credentialResponse) => {
        try {
            const idToken = credentialResponse.credential;
            const decoded = jwtDecode(idToken);
            const result = await saveCustomer({ idToken, email: decoded.email, name: decoded.name });
            // Atomic: idToken and isAdmin land in the same render so the
            // AdminDashboard guard never sees idToken without isAdmin.
            setUser({ idToken, isAdmin: result?.customer?.isAdmin ?? false });
        } catch { /* silent */ }
    };

    // Google ID tokens are short-lived (~1 hour, set by Google — not something
    // a relying party can extend). Without this, a still-present-but-expired
    // idToken sits in state indefinitely and every authenticated call starts
    // silently failing until the user does a full page reload. Instead, clear
    // it 2 minutes before it actually expires so the block below remounts the
    // hidden One-Tap prompt and transparently gets a fresh token — extending
    // the effective session for as long as the tab stays open.
    useEffect(() => {
        if (!user?.idToken) return;
        let exp;
        try {
            ({ exp } = jwtDecode(user.idToken));
        } catch {
            return;
        }
        if (!exp) return;
        const msUntilRefresh = Math.max(0, exp * 1000 - Date.now() - 2 * 60 * 1000);
        const timer = setTimeout(() => {
            setUser(prev => ({ ...prev, idToken: null }));
        }, msUntilRefresh);
        return () => clearTimeout(timer);
    }, [user?.idToken]);

    // Only active when there is a known user but the session token is missing/expired
    if (!user?.email || user?.idToken) return null;

    return (
        <div style={{ position: 'fixed', bottom: 0, right: 0, opacity: 0, pointerEvents: 'none', height: 0, overflow: 'hidden' }}>
            <GoogleLogin
                onSuccess={handleReAuth}
                onError={() => {}}
                useOneTap
                auto_select
            />
        </div>
    );
};

function App() {
  return (
    <UserProvider>
      <SessionGate />
      <CartProvider>
        <ScrollToTop />
        <AnalyticsTracker />
      <div className="app min-h-screen flex flex-col bg-white dark:bg-[#121212] text-black dark:text-white transition-colors duration-300">
        <Header />
        <Suspense fallback={<div className="flex-1 flex items-center justify-center min-h-[60vh] text-gray-400 text-sm">Loading…</div>}>
          <Routes>
            <Route path="/" element={<Home />} />
            <Route path="/shop" element={<Shop />} />
            <Route path="/product/:id" element={<ProductDetails />} />
            <Route path="/stores" element={<Stores />} />
            <Route path="/customize" element={<Customize />} />
            <Route path="/favorites" element={<Favorites />} />
            <Route path="/cart" element={<Cart />} />
            <Route path="/checkout" element={<Checkout />} />
            <Route path="/checkout/custom/:customOrderId" element={<Checkout />} />
            <Route path="/profile" element={<Profile />} />
            <Route path="/orders" element={<Orders />} />
            <Route path="/orders/:orderId" element={<Orders />} />
            <Route path="/admin" element={<AdminDashboard />} />
            <Route path="/about" element={<About />} />
            <Route path="/contact" element={<Contact />} />
            <Route path="/shipping-policy" element={<ShippingPolicy />} />
          </Routes>
        </Suspense>
        <Footer />
      </div>
      </CartProvider>
    </UserProvider>
  );
}

export default App;
