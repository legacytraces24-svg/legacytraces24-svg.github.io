import React, { lazy, Suspense } from 'react';
import { Routes, Route } from 'react-router-dom';
import { GoogleLogin } from '@react-oauth/google';
import { jwtDecode } from 'jwt-decode';
import Header from './components/Header';
import Footer from './components/Footer';
import Home from './pages/Home';
import Shop from './pages/Shop';
import ProductDetails from './pages/ProductDetails';
const Customize = lazy(() => import('./pages/Customize'));
import Favorites from './pages/Favorites';
import Cart from './pages/Cart';
import About from './pages/About';
import Contact from './pages/Contact';
import ShippingPolicy from './pages/ShippingPolicy';
import Checkout from './pages/Checkout';
import { CartProvider } from './context/CartContext';
import { UserProvider, useUser } from './context/UserContext';
import { saveCustomer } from './api/api';
import ScrollToTop from './components/ScrollToTop';
import Profile from './pages/Profile';
import Orders from './pages/Orders';
import AdminDashboard from './pages/AdminDashboard';

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

    // Only active when there is a known user but the session token expired
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
      <div className="app min-h-screen flex flex-col bg-white dark:bg-[#121212] text-black dark:text-white transition-colors duration-300">
        <Header />
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/shop" element={<Shop />} />
          <Route path="/product/:id" element={<ProductDetails />} />
          <Route path="/customize" element={<Suspense fallback={<div className="flex-1 flex items-center justify-center min-h-screen bg-gray-950 text-gray-400 text-sm">Loading designer…</div>}><Customize /></Suspense>} />
          <Route path="/favorites" element={<Favorites />} />
          <Route path="/cart" element={<Cart />} />
          <Route path="/checkout" element={<Checkout />} />
          <Route path="/profile" element={<Profile />} />
          <Route path="/orders" element={<Orders />} />
          <Route path="/admin" element={<AdminDashboard />} />
          <Route path="/about" element={<About />} />
          <Route path="/contact" element={<Contact />} />
          <Route path="/shipping-policy" element={<ShippingPolicy />} />
        </Routes>
        <Footer />
      </div>
      </CartProvider>
    </UserProvider>
  );
}

export default App;
