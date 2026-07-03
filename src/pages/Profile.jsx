import React, { useState, useEffect } from 'react';
import { useUser } from '../context/UserContext';
import {
    saveCustomer, updateCustomer, fetchUserDetails,
    addAddress, updateAddress, deleteAddress, setDefaultAddress,
} from '../api/api';
import { GoogleLogin } from '@react-oauth/google';
import { jwtDecode } from 'jwt-decode';
import { motion, AnimatePresence } from 'framer-motion';
import {
    User, Mail, Phone, MapPin, ShieldCheck, Loader2,
    LogOut, Package, Plus, Pencil, Trash2, Star,
} from 'lucide-react';
import { useNavigate, Link } from 'react-router-dom';

const LABELS = ['Home', 'Work', 'Other'];

const emptyAddrForm = { label: 'Home', address: '', pincode: '', isDefault: false };

const Profile = () => {
    const { user, setUser, logout } = useUser();
    const navigate = useNavigate();

    const [formData, setFormData] = useState({ name: '', phone: '' });
    const [isSaving, setIsSaving]   = useState(false);
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError]         = useState('');
    const [successMsg, setSuccessMsg] = useState('');

    // Address manager state
    const [addresses, setAddresses]     = useState([]);
    const [addrForm, setAddrForm]       = useState(emptyAddrForm);
    const [editingId, setEditingId]     = useState(null); // null = adding new
    const [showAddrForm, setShowAddrForm] = useState(false);
    const [addrError, setAddrError]     = useState('');
    const [addrSaving, setAddrSaving]   = useState(false);
    const [deletingId, setDeletingId]   = useState(null);

    // Effect 1: populate form fields from local state as soon as email is known
    useEffect(() => {
        if (!user) return;
        setFormData({ name: user.name || '', phone: user.phone || '' });
    }, [user?.email]);

    // Effect 2: fetch full profile + addresses once idToken is available.
    // This is split from Effect 1 because idToken arrives later on page reload
    // (SessionGate fires One-Tap after the first render), so calling
    // fetchUserDetails inside the email effect would get idToken=undefined
    // and return null — addresses would never appear until navigation.
    useEffect(() => {
        if (!user?.idToken) return;
        const fetchLatest = async () => {
            try {
                setIsLoading(true);
                const customer = await fetchUserDetails(user.idToken);
                if (customer) {
                    setFormData({
                        name:  customer.name    || user.name || '',
                        phone: customer.phoneNumber ? String(customer.phoneNumber) : '',
                    });
                    setUser({
                        name:    customer.name    || '',
                        phone:   customer.phoneNumber ? String(customer.phoneNumber) : '',
                        isAdmin: customer.isAdmin,
                    });
                    setAddresses(customer.addresses || []);
                }
            } catch { /* silent */ }
            finally { setIsLoading(false); }
        };
        fetchLatest();
    }, [user?.idToken]);

    const handleLoginSuccess = async (credentialResponse) => {
        try {
            const idToken = credentialResponse.credential;
            const decoded = jwtDecode(idToken);
            // Show name/email immediately for UX, but hold idToken until
            // saveCustomer resolves so isAdmin is set in the same render.
            setUser({ email: decoded.email, name: decoded.name, phone: '' });
            setError('');
            const result = await saveCustomer({ idToken, email: decoded.email, name: decoded.name });
            // Single atomic update: idToken + isAdmin arrive together so the
            // AdminDashboard guard never sees idToken without isAdmin.
            setUser({ idToken, isAdmin: result?.customer?.isAdmin ?? false });
        } catch {
            setError('Google Login failed. Please try again.');
        }
    };

    const handleSave = async (e) => {
        e.preventDefault();
        setError('');
        setSuccessMsg('');
        const cleanPhone = formData.phone.replace(/\D/g, '');
        if (cleanPhone.length !== 10) { setError('Phone number must be exactly 10 digits.'); return; }
        if (!formData.name.trim())    { setError('Name cannot be empty.'); return; }

        setIsSaving(true);
        try {
            await updateCustomer({ idToken: user.idToken, name: formData.name.trim(), phone: cleanPhone });
            setUser({ name: formData.name.trim(), phone: cleanPhone });
            setSuccessMsg('Profile updated successfully!');
            setTimeout(() => setSuccessMsg(''), 3000);
        } catch { setError('Failed to save profile. Please try again.'); }
        finally  { setIsSaving(false); }
    };

    const handleLogout = () => { logout(); navigate('/'); };

    // ── Address handlers ────────────────────────────────────────────────────────

    const openAdd = () => {
        setEditingId(null);
        setAddrForm(emptyAddrForm);
        setAddrError('');
        setShowAddrForm(true);
    };

    const openEdit = (addr) => {
        setEditingId(addr.id);
        setAddrForm({
            label:     addr.label,
            address:   addr.address,
            pincode:   addr.pincode,
            isDefault: Boolean(addr.is_default),
        });
        setAddrError('');
        setShowAddrForm(true);
    };

    const cancelAddrForm = () => { setShowAddrForm(false); setAddrError(''); };

    const handleAddrSave = async (e) => {
        e.preventDefault();
        setAddrError('');
        if (!addrForm.address.trim())             { setAddrError('Address is required.'); return; }
        if (!/^\d{6}$/.test(addrForm.pincode))    { setAddrError('Enter a valid 6-digit pincode.'); return; }

        setAddrSaving(true);
        try {
            if (editingId) {
                await updateAddress({
                    idToken:   user.idToken,
                    addressId: editingId,
                    ...addrForm,
                });
                setAddresses(prev => prev.map(a => {
                    if (addrForm.isDefault) return { ...a, is_default: a.id === editingId ? 1 : 0 };
                    return a.id === editingId
                        ? { ...a, label: addrForm.label, address: addrForm.address, pincode: addrForm.pincode }
                        : a;
                }));
            } else {
                const res = await addAddress({ idToken: user.idToken, ...addrForm });
                const newAddr = {
                    id:         res.id,
                    label:      addrForm.label,
                    address:    addrForm.address,
                    pincode:    addrForm.pincode,
                    is_default: addrForm.isDefault || addresses.length === 0 ? 1 : 0,
                };
                setAddresses(prev => {
                    const cleared = addrForm.isDefault || prev.length === 0
                        ? prev.map(a => ({ ...a, is_default: 0 }))
                        : prev;
                    return [...cleared, newAddr];
                });
            }
            setShowAddrForm(false);
        } catch { setAddrError('Failed to save address. Please try again.'); }
        finally  { setAddrSaving(false); }
    };

    const handleDelete = async (id) => {
        setDeletingId(id);
        try {
            await deleteAddress({ idToken: user.idToken, addressId: id });
            setAddresses(prev => {
                const remaining = prev.filter(a => a.id !== id);
                const wasDefault = prev.find(a => a.id === id)?.is_default;
                if (wasDefault && remaining.length > 0) {
                    return remaining.map((a, i) => ({ ...a, is_default: i === remaining.length - 1 ? 1 : 0 }));
                }
                return remaining;
            });
        } catch { /* silent */ }
        finally  { setDeletingId(null); }
    };

    const handleSetDefault = async (id) => {
        try {
            await setDefaultAddress({ idToken: user.idToken, addressId: id });
            setAddresses(prev => prev.map(a => ({ ...a, is_default: a.id === id ? 1 : 0 })));
        } catch { /* silent */ }
    };

    if (!user) {
        return (
            <div className="container mx-auto px-4 py-20 min-h-[60vh] flex flex-col items-center justify-center">
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="max-w-md w-full bg-white dark:bg-[#1e1e1e] p-8 rounded-3xl shadow-sm border border-gray-100 dark:border-gray-800 text-center"
                >
                    <div className="w-16 h-16 bg-primary/20 text-primary rounded-full flex items-center justify-center mx-auto mb-6">
                        <ShieldCheck size={32} />
                    </div>
                    <h1 className="text-3xl font-bold font-heading mb-3">Welcome Back</h1>
                    <p className="text-gray-500 dark:text-gray-400 mb-8">Sign in with Google to securely access your profile and order history.</p>
                    <div className="flex justify-center mb-4">
                        <GoogleLogin
                            onSuccess={handleLoginSuccess}
                            onError={() => setError('Google Sign-In failed.')}
                            useOneTap
                            theme="filled_black"
                            shape="pill"
                            size="large"
                        />
                    </div>
                    {error && <p className="text-red-500 text-sm mt-4">{error}</p>}
                </motion.div>
            </div>
        );
    }

    return (
        <div className="container mx-auto px-4 py-12 max-w-3xl min-h-[70vh]">
            <div className="flex justify-between items-start mb-8">
                <div>
                    <h1 className="text-4xl font-bold font-heading bg-clip-text text-transparent bg-gradient-to-r from-primary to-green-600 mb-2">My Profile</h1>
                    <p className="text-gray-500 dark:text-gray-400">Manage your account details and shipping addresses.</p>
                </div>
                <div className="flex flex-col sm:flex-row items-end sm:items-center gap-2">
                    {user?.isAdmin && (
                        <Link to="/admin" className="flex items-center gap-2 text-white font-bold px-4 py-2 rounded-xl bg-black dark:bg-white dark:text-black hover:opacity-80 transition-opacity border border-transparent shadow-md">
                            <ShieldCheck size={16} />
                            <span>Admin Board</span>
                        </Link>
                    )}
                    <Link to="/orders" className="flex items-center gap-2 text-gray-600 dark:text-gray-300 font-bold px-4 py-2 rounded-xl hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors border border-gray-200 dark:border-gray-700">
                        <Package size={16} />
                        <span className="hidden sm:inline">My Orders</span>
                    </Link>
                    <button onClick={handleLogout} className="flex items-center gap-2 text-red-500 hover:text-red-600 font-bold px-4 py-2 rounded-xl hover:bg-red-50 dark:hover:bg-red-500/10 transition-colors">
                        <LogOut size={18} />
                        <span className="hidden sm:inline">Logout</span>
                    </button>
                </div>
            </div>

            {/* ── Account Info Card ─────────────────────────────────────────── */}
            <div className="bg-white dark:bg-[#1e1e1e] rounded-3xl p-6 md:p-10 shadow-sm border border-gray-100 dark:border-gray-800 relative overflow-hidden mb-6">
                <div className="flex flex-col sm:flex-row items-center gap-6 mb-10 pb-10 border-b border-gray-100 dark:border-gray-800">
                    <div className="w-24 h-24 rounded-full bg-gradient-to-br from-primary to-green-400 text-black flex items-center justify-center text-4xl font-bold shadow-lg">
                        {user.name.charAt(0).toUpperCase()}
                    </div>
                    <div className="text-center sm:text-left">
                        <h2 className="text-2xl font-bold">{user.name}</h2>
                        <span className="inline-flex items-center gap-2 text-gray-500 bg-gray-50 dark:bg-gray-800 px-3 py-1 rounded-full text-sm mt-2">
                            <ShieldCheck size={14} className="text-primary" />
                            Verified Customer
                        </span>
                    </div>
                </div>

                {isLoading && (
                    <div className="absolute top-4 right-4 text-primary animate-spin">
                        <Loader2 size={24} />
                    </div>
                )}

                <form onSubmit={handleSave} className="space-y-6">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div className="space-y-4">
                            <div>
                                <label className="block text-sm font-bold text-gray-700 dark:text-gray-300 mb-2 flex items-center gap-2">
                                    <User size={16} /> Full Name
                                </label>
                                <input
                                    type="text"
                                    value={formData.name}
                                    onChange={(e) => setFormData(p => ({ ...p, name: e.target.value }))}
                                    placeholder="Enter your full name"
                                    className="w-full bg-white dark:bg-[#1a1a1a] border border-gray-200 dark:border-gray-700 rounded-xl py-3 px-4 focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all"
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-bold text-gray-700 dark:text-gray-300 mb-2 flex items-center gap-2">
                                    <Mail size={16} /> Email Address
                                </label>
                                <input
                                    type="email"
                                    value={user.email}
                                    readOnly
                                    className="w-full bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-xl py-3 px-4 text-gray-500 focus:outline-none cursor-not-allowed"
                                />
                            </div>
                        </div>
                        <div>
                            <label className="block text-sm font-bold text-gray-700 dark:text-gray-300 mb-2 flex items-center gap-2">
                                <Phone size={16} /> Mobile Number
                            </label>
                            <div className="relative">
                                <span className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500 font-medium">+91</span>
                                <input
                                    type="tel"
                                    value={formData.phone}
                                    onChange={(e) => {
                                        const val = e.target.value.replace(/\D/g, '');
                                        if (val.length <= 10) setFormData(p => ({ ...p, phone: val }));
                                    }}
                                    placeholder="10-digit mobile number"
                                    className="w-full bg-white dark:bg-[#1a1a1a] border border-gray-200 dark:border-gray-700 rounded-xl py-3 pl-14 pr-4 focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all"
                                />
                            </div>
                        </div>
                    </div>

                    {error && (
                        <div className="p-4 bg-red-50 text-red-600 dark:bg-red-500/10 dark:text-red-400 rounded-xl text-sm font-medium border border-red-100 dark:border-red-500/20">
                            {error}
                        </div>
                    )}
                    {successMsg && (
                        <div className="p-4 bg-green-50 text-green-600 dark:bg-green-500/10 dark:text-green-400 rounded-xl text-sm font-medium border border-green-100 dark:border-green-500/20">
                            {successMsg}
                        </div>
                    )}

                    <div className="pt-6 border-t border-gray-100 dark:border-gray-800 flex justify-end">
                        <button
                            type="submit"
                            disabled={isSaving}
                            className="bg-primary text-black font-bold py-3 px-8 rounded-xl hover:bg-green-400 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2 min-w-[140px] justify-center shadow-lg shadow-primary/20"
                        >
                            {isSaving ? <><Loader2 size={18} className="animate-spin" /> Saving...</> : 'Save Profile'}
                        </button>
                    </div>
                </form>
            </div>

            {/* ── Saved Addresses Card ──────────────────────────────────────── */}
            <div className="bg-white dark:bg-[#1e1e1e] rounded-3xl p-6 md:p-10 shadow-sm border border-gray-100 dark:border-gray-800">
                <div className="flex items-center justify-between mb-6">
                    <h2 className="text-xl font-bold flex items-center gap-2">
                        <MapPin size={20} className="text-primary" />
                        Saved Addresses
                    </h2>
                    {!showAddrForm && (
                        <button
                            onClick={openAdd}
                            className="flex items-center gap-1.5 text-sm font-bold text-primary hover:bg-primary/10 px-3 py-2 rounded-xl transition-colors"
                        >
                            <Plus size={16} /> Add Address
                        </button>
                    )}
                </div>

                {/* Inline add / edit form */}
                <AnimatePresence>
                    {showAddrForm && (
                        <motion.form
                            key="addrForm"
                            initial={{ opacity: 0, height: 0 }}
                            animate={{ opacity: 1, height: 'auto' }}
                            exit={{ opacity: 0, height: 0 }}
                            onSubmit={handleAddrSave}
                            className="overflow-hidden mb-6"
                        >
                            <div className="border border-primary/30 bg-primary/5 dark:bg-primary/10 rounded-2xl p-5 space-y-4">
                                <h3 className="font-bold text-sm text-gray-700 dark:text-gray-300">
                                    {editingId ? 'Edit Address' : 'New Address'}
                                </h3>

                                {/* Label */}
                                <div className="flex gap-2">
                                    {LABELS.map(l => (
                                        <button
                                            key={l}
                                            type="button"
                                            onClick={() => setAddrForm(p => ({ ...p, label: l }))}
                                            className={`px-4 py-1.5 rounded-full text-sm font-semibold border transition-colors ${
                                                addrForm.label === l
                                                    ? 'bg-primary text-black border-primary'
                                                    : 'bg-white dark:bg-gray-900 border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-400 hover:border-primary'
                                            }`}
                                        >
                                            {l}
                                        </button>
                                    ))}
                                </div>

                                {/* Address + Pincode */}
                                <div>
                                    <textarea
                                        value={addrForm.address}
                                        onChange={e => setAddrForm(p => ({ ...p, address: e.target.value }))}
                                        placeholder="Full address (street, area, city)"
                                        rows={3}
                                        className="w-full bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-xl py-3 px-4 focus:outline-none focus:ring-2 focus:ring-primary/20 resize-none text-sm"
                                    />
                                </div>
                                <div>
                                    <input
                                        type="text"
                                        value={addrForm.pincode}
                                        onChange={e => {
                                            const v = e.target.value.replace(/\D/g, '');
                                            if (v.length <= 6) setAddrForm(p => ({ ...p, pincode: v }));
                                        }}
                                        placeholder="6-digit Pincode"
                                        className="w-full bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-xl py-3 px-4 focus:outline-none focus:ring-2 focus:ring-primary/20 text-sm"
                                    />
                                </div>

                                {/* Default toggle */}
                                <label className="flex items-center gap-2 cursor-pointer select-none">
                                    <input
                                        type="checkbox"
                                        checked={addrForm.isDefault}
                                        onChange={e => setAddrForm(p => ({ ...p, isDefault: e.target.checked }))}
                                        className="w-4 h-4 accent-primary"
                                    />
                                    <span className="text-sm font-medium text-gray-700 dark:text-gray-300">Set as default address</span>
                                </label>

                                {addrError && (
                                    <p className="text-red-500 text-sm">{addrError}</p>
                                )}

                                <div className="flex gap-3 pt-1">
                                    <button
                                        type="button"
                                        onClick={cancelAddrForm}
                                        className="px-5 py-2.5 rounded-xl text-sm font-bold bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors"
                                    >
                                        Cancel
                                    </button>
                                    <button
                                        type="submit"
                                        disabled={addrSaving}
                                        className="px-5 py-2.5 rounded-xl text-sm font-bold bg-primary text-black hover:bg-green-400 transition-colors disabled:opacity-50 flex items-center gap-2"
                                    >
                                        {addrSaving ? <><Loader2 size={14} className="animate-spin" /> Saving…</> : 'Save Address'}
                                    </button>
                                </div>
                            </div>
                        </motion.form>
                    )}
                </AnimatePresence>

                {/* Address list */}
                {addresses.length === 0 && !showAddrForm ? (
                    <div className="text-center py-10 text-gray-400 dark:text-gray-600">
                        <MapPin size={36} className="mx-auto mb-3 opacity-40" />
                        <p className="text-sm">No saved addresses yet.</p>
                        <button onClick={openAdd} className="mt-3 text-sm text-primary font-semibold hover:underline">
                            + Add your first address
                        </button>
                    </div>
                ) : (
                    <div className="space-y-3">
                        {addresses.map(addr => (
                            <motion.div
                                key={addr.id}
                                layout
                                initial={{ opacity: 0, y: 10 }}
                                animate={{ opacity: 1, y: 0 }}
                                exit={{ opacity: 0, scale: 0.95 }}
                                className={`relative flex items-start gap-4 p-4 rounded-2xl border transition-colors ${
                                    addr.is_default
                                        ? 'border-primary/50 bg-primary/5 dark:bg-primary/10'
                                        : 'border-gray-100 dark:border-gray-800 hover:border-gray-200 dark:hover:border-gray-700'
                                }`}
                            >
                                <div className="flex-1 min-w-0">
                                    <div className="flex items-center gap-2 mb-1">
                                        <span className="font-bold text-sm">{addr.label}</span>
                                        {addr.is_default ? (
                                            <span className="inline-flex items-center gap-1 text-xs bg-primary/20 text-primary font-semibold px-2 py-0.5 rounded-full">
                                                <Star size={10} fill="currentColor" /> Default
                                            </span>
                                        ) : null}
                                    </div>
                                    <p className="text-sm text-gray-700 dark:text-gray-300 leading-snug">{addr.address}</p>
                                    <p className="text-xs text-gray-500 mt-0.5">Pincode: {addr.pincode}</p>
                                </div>

                                <div className="flex items-center gap-1 shrink-0">
                                    {!addr.is_default && (
                                        <button
                                            onClick={() => handleSetDefault(addr.id)}
                                            title="Set as default"
                                            className="p-2 rounded-lg hover:bg-primary/10 text-gray-400 hover:text-primary transition-colors"
                                        >
                                            <Star size={15} />
                                        </button>
                                    )}
                                    <button
                                        onClick={() => openEdit(addr)}
                                        title="Edit"
                                        className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 text-gray-400 hover:text-gray-700 dark:hover:text-gray-300 transition-colors"
                                    >
                                        <Pencil size={15} />
                                    </button>
                                    <button
                                        onClick={() => handleDelete(addr.id)}
                                        disabled={deletingId === addr.id}
                                        title="Delete"
                                        className="p-2 rounded-lg hover:bg-red-50 dark:hover:bg-red-500/10 text-gray-400 hover:text-red-500 transition-colors disabled:opacity-40"
                                    >
                                        {deletingId === addr.id
                                            ? <Loader2 size={15} className="animate-spin" />
                                            : <Trash2 size={15} />
                                        }
                                    </button>
                                </div>
                            </motion.div>
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
};

export default Profile;
