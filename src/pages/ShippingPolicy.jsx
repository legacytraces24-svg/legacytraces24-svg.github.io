import React from 'react';
import { motion } from 'framer-motion';
import {
    Truck,
    Clock,
    Globe,
    MapPin,
    Wallet,
    Handshake,
    AlertCircle,
    Edit3,
    ShieldCheck,
    Mail,
    Building2,
    Calendar,
    ArrowRight
} from 'lucide-react';
import SEO from '../components/SEO';

const ShippingPolicy = () => {
    return (
        <div className="pt-20 pb-16 bg-white dark:bg-[#121212] transition-colors duration-300">
            <SEO
                title="Shipping Policy – Fast Delivery Across India"
                description="Legacy Traces ships t-shirts &amp; hoodies across India. Learn about processing times, delivery timelines, free shipping threshold and return policy."
                keywords="Legacy Traces shipping, t-shirt delivery India, free shipping t-shirts"
                noindex={false}
            />

            {/* Hero Section */}
            <section className="py-20 bg-gray-50 dark:bg-gray-900/50">
                <div className="container mx-auto px-4 text-center">
                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.6 }}
                    >
                        <div className="inline-flex p-4 bg-primary/10 rounded-2xl mb-6 text-primary">
                            <Truck size={48} />
                        </div>
                        <h1 className="text-4xl md:text-6xl font-bold font-heading mb-6 text-black dark:text-white">
                            Shipping Policy
                        </h1>
                        <p className="text-xl text-gray-600 dark:text-gray-400 max-w-2xl mx-auto leading-relaxed">
                            Everything you need to know about how your order reaches you—from our warehouse to your doorstep.
                        </p>
                    </motion.div>
                </div>
            </section>

            <section className="py-16">
                <div className="container mx-auto px-4 max-w-5xl">
                    <div className="grid gap-12">

                        {/* Order Processing */}
                        <div className="bg-white dark:bg-[#1a1a1a] p-8 rounded-3xl border border-gray-100 dark:border-gray-800 shadow-sm hover:shadow-md transition-shadow">
                            <div className="flex items-start gap-6">
                                <div className="p-3 bg-blue-50 dark:bg-blue-900/20 rounded-xl text-blue-600 dark:text-blue-400">
                                    <Clock size={28} />
                                </div>
                                <div className="flex-1">
                                    <h2 className="text-2xl font-bold mb-4 font-heading">Order Processing</h2>
                                    <p className="text-gray-600 dark:text-gray-400 leading-relaxed mb-4">
                                        We work fast to get your order ready. Standard orders are typically processed within:
                                    </p>
                                    <div className="bg-blue-50 dark:bg-blue-900/20 p-4 rounded-xl border border-blue-100 dark:border-blue-800 inline-block font-bold text-blue-700 dark:text-blue-300">
                                        1–2 Business Days
                                    </div>
                                    <p className="mt-4 text-sm text-gray-500 italic">
                                        *Customized or made-to-order products may require additional time as specified on the product page.
                                    </p>
                                </div>
                            </div>
                        </div>

                        {/* Shipping Coverage */}
                        <div className="grid md:grid-cols-2 gap-8">
                            <div className="bg-white dark:bg-[#1a1a1a] p-8 rounded-3xl border border-gray-100 dark:border-gray-800 shadow-sm">
                                <div className="flex items-center gap-4 mb-6">
                                    <MapPin className="text-primary" size={32} />
                                    <h3 className="text-xl font-bold font-heading">Domestic (India)</h3>
                                </div>
                                <p className="text-gray-600 dark:text-gray-400 leading-relaxed">
                                    We ship across India, reaching almost every pin code through our reliable network.
                                </p>
                            </div>
                            <div className="bg-white dark:bg-[#1a1a1a] p-8 rounded-3xl border border-gray-100 dark:border-gray-800 shadow-sm">
                                <div className="flex items-center gap-4 mb-6">
                                    <Globe className="text-primary" size={32} />
                                    <h3 className="text-xl font-bold font-heading">International</h3>
                                </div>
                                <p className="text-gray-600 dark:text-gray-400 leading-relaxed mb-4">
                                    We deliver globally! Connect with your roots anywhere in the world.
                                </p>
                                <div className="bg-amber-50 dark:bg-amber-900/20 p-3 rounded-lg border border-amber-100 dark:border-amber-800 text-sm text-amber-800 dark:text-amber-300">
                                    <strong>Note:</strong> Customs duties and international taxes are the responsibility of the customer.
                                </div>
                            </div>
                        </div>

                        {/* Delivery Timelines */}
                        <div className="bg-white dark:bg-[#1a1a1a] p-8 rounded-3xl border border-gray-100 dark:border-gray-800 shadow-sm">
                            <div className="flex items-start gap-6">
                                <div className="p-3 bg-green-50 dark:bg-green-900/20 rounded-xl text-green-600 dark:text-green-400">
                                    <Truck size={28} />
                                </div>
                                <div className="flex-1">
                                    <h2 className="text-2xl font-bold mb-6 font-heading">Delivery Timelines</h2>
                                    <div className="grid md:grid-cols-2 gap-6">
                                        <div className="space-y-4">
                                            <div className="flex items-center gap-3">
                                                <div className="w-2 h-2 rounded-full bg-primary"></div>
                                                <span className="font-bold">Metro / Tier-1 Cities</span>
                                            </div>
                                            <p className="text-gray-600 dark:text-gray-400 ml-5">3 – 5 Business Days</p>
                                        </div>
                                        <div className="space-y-4">
                                            <div className="flex items-center gap-3">
                                                <div className="w-2 h-2 rounded-full bg-primary"></div>
                                                <span className="font-bold">Tier-2 / Tier-3 / Rural areas</span>
                                            </div>
                                            <p className="text-gray-600 dark:text-gray-400 ml-5">5 – 8 Business Days</p>
                                        </div>
                                    </div>
                                    <div className="mt-8 p-4 bg-gray-50 dark:bg-gray-800/50 rounded-xl border border-gray-200 dark:border-gray-700 text-sm">
                                        <strong>Pre-Booking:</strong> For items labeled "Pre-Booking", orders will be dispatched strictly on the dates mentioned in the product description.
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Shipping Charges */}
                        <div className="bg-primary text-black p-8 rounded-3xl shadow-xl shadow-primary/20">
                            <div className="flex items-start gap-6">
                                <div className="p-3 bg-white rounded-xl text-black">
                                    <Wallet size={28} />
                                </div>
                                <div className="flex-1">
                                    <h2 className="text-2xl font-bold mb-6 font-heading text-black">Shipping Charges</h2>
                                    <div className="grid md:grid-cols-2 gap-4">
                                        <div className="flex justify-between items-center bg-white/20 p-4 rounded-xl backdrop-blur-sm border border-black/10">
                                            <span className="font-medium">Within Tamil Nadu</span>
                                            <span className="text-xl font-bold">₹60</span>
                                        </div>
                                        <div className="flex justify-between items-center bg-white/20 p-4 rounded-xl backdrop-blur-sm border border-black/10">
                                            <span className="font-medium">Rest of India</span>
                                            <span className="text-xl font-bold">₹100</span>
                                        </div>
                                    </div>
                                    <p className="mt-6 text-sm font-medium opacity-80">
                                        *Shipping fees may vary during promotional periods or based on order weight. Final shipping costs will be visible at checkout.
                                    </p>
                                </div>
                            </div>
                        </div>

                        {/* Shipping Partners */}
                        <div className="text-center py-8">
                            <h3 className="text-lg font-bold mb-8 uppercase tracking-widest text-gray-400 flex items-center justify-center gap-4">
                                <span className="h-px w-12 bg-gray-200 dark:bg-gray-800"></span>
                                <Handshake size={20} className="text-primary" /> Our Delivery Partners
                                <span className="h-px w-12 bg-gray-200 dark:bg-gray-800"></span>
                            </h3>
                            <div className="flex flex-wrap justify-center gap-4 md:gap-8">
                                {['Blue Dart', 'ST Courier', 'DTDC', 'India Post', 'Professional', 'EKart'].map(partner => (
                                    <div key={partner} className="px-6 py-3 rounded-full bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 font-bold text-gray-600 dark:text-gray-300">
                                        {partner}
                                    </div>
                                ))}
                            </div>
                        </div>

                        {/* Order Tracking */}
                        <div className="bg-white dark:bg-[#1a1a1a] p-8 rounded-3xl border border-gray-100 dark:border-gray-800 shadow-sm">
                            <div className="flex items-start gap-6">
                                <div className="p-3 bg-primary/10 rounded-xl text-primary">
                                    <MapPin size={28} />
                                </div>
                                <div className="flex-1">
                                    <h2 className="text-2xl font-bold mb-8 font-heading">Track Your Order</h2>
                                    <div className="space-y-8">
                                        <div className="flex gap-4">
                                            <div className="w-8 h-8 rounded-full bg-primary text-black font-bold flex items-center justify-center flex-shrink-0">1</div>
                                            <p className="text-gray-600 dark:text-gray-400">Once your order is dispatched, you’ll receive an SMS and email notification.</p>
                                        </div>
                                        <div className="flex gap-4">
                                            <div className="w-8 h-8 rounded-full bg-primary text-black font-bold flex items-center justify-center flex-shrink-0">2</div>
                                            <p className="text-gray-600 dark:text-gray-400">Follow the tracking link provided in the message to see the real-time location of your parcel.</p>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Failed Deliveries & Address Accuracy */}
                        <div className="grid md:grid-cols-2 gap-8">
                            <div className="bg-red-50 dark:bg-red-900/10 p-8 rounded-3xl border border-red-100 dark:border-red-800/20">
                                <div className="flex items-center gap-4 mb-6">
                                    <AlertCircle className="text-red-500" size={32} />
                                    <h3 className="text-xl font-bold font-heading text-red-900 dark:text-red-400">Failed Deliveries</h3>
                                </div>
                                <p className="text-red-800/70 dark:text-red-400/70 leading-relaxed">
                                    Incomplete or incorrect addresses may result in failed delivery. If an order returns to us, re-shipping charges of ₹100 will apply for the second attempt.
                                </p>
                            </div>
                            <div className="bg-gray-50 dark:bg-gray-800/50 p-8 rounded-3xl border border-gray-200 dark:border-gray-700">
                                <div className="flex items-center gap-4 mb-6">
                                    <Edit3 className="text-gray-700 dark:text-gray-400" size={32} />
                                    <h3 className="text-xl font-bold font-heading">Address Accuracy</h3>
                                </div>
                                <p className="text-gray-600 dark:text-gray-400 leading-relaxed font-bold">
                                    It is exclusively the customer's responsibility to provide an accurate delivery address and contact number.
                                </p>
                            </div>
                        </div>

                        {/* Modification & Cancellation */}
                        <div className="bg-white dark:bg-[#1a1a1a] p-8 rounded-3xl border border-gray-100 dark:border-gray-800 shadow-sm">
                            <div className="flex items-start gap-6">
                                <div className="p-3 bg-purple-50 dark:bg-purple-900/20 rounded-xl text-purple-600 dark:text-purple-400">
                                    <Edit3 size={28} />
                                </div>
                                <div className="flex-1">
                                    <h2 className="text-2xl font-bold mb-6 font-heading">Modification & Cancellation</h2>
                                    <div className="grid md:grid-cols-2 gap-8">
                                        <div className="p-6 rounded-2xl bg-green-50 dark:bg-green-900/10 border border-green-100 dark:border-green-800/20">
                                            <h4 className="font-bold mb-2 flex items-center gap-2 text-green-800 dark:text-green-400">
                                                <ShieldCheck size={18} /> Allowed
                                            </h4>
                                            <p className="text-sm text-green-700 dark:text-green-400/70">Changes are only possible BEFORE the order is dispatched.</p>
                                        </div>
                                        <div className="p-6 rounded-2xl bg-red-50 dark:bg-red-900/10 border border-red-100 dark:border-red-800/20">
                                            <h4 className="font-bold mb-2 flex items-center gap-2 text-red-800 dark:text-red-400">
                                                <AlertCircle size={18} /> Not Allowed
                                            </h4>
                                            <p className="text-sm text-red-700 dark:text-red-400/70">Once dispatched, we cannot modify or cancel the order.</p>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Grievance Redressal */}
                        <div className="bg-gray-900 text-white p-10 rounded-3xl relative overflow-hidden">
                            <div className="absolute top-0 right-0 w-64 h-64 bg-primary/20 rounded-full blur-[100px] -mr-32 -mt-32"></div>
                            <div className="relative z-10">
                                <h2 className="text-3xl font-bold mb-8 font-heading flex items-center gap-3">
                                    <ShieldCheck className="text-primary" size={32} /> Grievance Redressal
                                </h2>
                                <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
                                    <div className="space-y-4">
                                        <div className="flex items-center gap-3 text-gray-400 uppercase tracking-widest text-xs font-bold">
                                            <Mail size={16} className="text-primary" /> Support Email
                                        </div>
                                        <a href="mailto:legacytraces24@gmail.com" className="text-xl font-bold hover:text-primary transition-colors">
                                            legacytraces24@gmail.com
                                        </a>
                                    </div>
                                    <div className="space-y-4">
                                        <div className="flex items-center gap-3 text-gray-400 uppercase tracking-widest text-xs font-bold">
                                            <Building2 size={16} className="text-primary" /> Office Address
                                        </div>
                                        <p className="font-bold">Ramanathapuram, Coimbatore, TN</p>
                                    </div>
                                    <div className="space-y-4">
                                        <div className="flex items-center gap-3 text-gray-400 uppercase tracking-widest text-xs font-bold">
                                            <Calendar size={16} className="text-primary" /> Office Hours
                                        </div>
                                        <p className="font-bold">Mon – Fri | 10 AM – 6 PM</p>
                                    </div>
                                </div>
                                <p className="mt-12 pt-8 border-t border-white/10 text-gray-400 text-sm italic">
                                    In case of unforeseen circumstances like natural disasters, festive rushes, or extreme weather, deliveries may experience delays beyond our control. We appreciate your patience.
                                </p>
                            </div>
                        </div>

                    </div>
                </div>
            </section>
        </div>
    );
};

export default ShippingPolicy;
