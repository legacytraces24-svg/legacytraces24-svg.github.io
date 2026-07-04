import React, { useState, useRef } from 'react';
import { Mail, Phone, MapPin, Send, Instagram, Facebook, CheckCircle2, AlertCircle } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import SEO from '../components/SEO';

const Contact = () => {
    const form = useRef();
    const [status, setStatus] = useState({ type: '', message: '' });
    const [isSending, setIsSending] = useState(false);

    const validateEmail = (email) => {
        return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
    };

    const handleSubmit = (e) => {
        e.preventDefault();
        setStatus({ type: '', message: '' });

        const formData = new FormData(form.current);
        const name = formData.get('user_name');
        const email = formData.get('user_email');
        const subject = formData.get('subject');
        const message = formData.get('message');

        if (!name || !email || !subject || !message) {
            setStatus({ type: 'error', message: 'All fields are mandatory. Please fill in everything.' });
            return;
        }

        if (!validateEmail(email)) {
            setStatus({ type: 'error', message: 'Please enter a valid email address' });
            return;
        }

        setIsSending(true);

        try {
            const recipient = 'legacytraces24@gmail.com';
            const body = `Name: ${name}\nEmail: ${email}\n\nMessage:\n${message}`;
            const mailtoUrl = `mailto:${recipient}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;

            window.location.href = mailtoUrl;

            setStatus({ type: 'success', message: 'Opening your email client...' });
            form.current.reset();
        } catch (error) {
            console.error('Mailto Error:', error);
            setStatus({ type: 'error', message: 'Failed to open email client. Please try again or email us directly at legacytraces24@gmail.com' });
        } finally {
            setIsSending(false);
        }
    };

    return (
        <div className="container mx-auto px-4 py-16 mt-8 max-w-6xl">
            <SEO
                title="Contact Us – Orders, Custom T-Shirts &amp; Support"
                description="Get in touch with Legacy Traces for order help, custom t-shirt &amp; hoodie inquiries, bulk orders and sizing questions. Reach us on WhatsApp, email or social media."
                keywords="contact Legacy Traces, custom t-shirt inquiry, bulk order t-shirts, t-shirt printing inquiry, WhatsApp support"
                jsonLd={{
                    '@context': 'https://schema.org',
                    '@type': 'ContactPage',
                    'name': 'Contact Legacy Traces',
                    'url': 'https://www.legacytraces.com/#/contact',
                    'description': 'Contact page for orders, custom t-shirt inquiries and support.',
                    'isPartOf': { '@id': 'https://www.legacytraces.com/#website' },
                    'breadcrumb': {
                        '@type': 'BreadcrumbList',
                        'itemListElement': [
                            { '@type': 'ListItem', 'position': 1, 'name': 'Home',    'item': 'https://www.legacytraces.com/' },
                            { '@type': 'ListItem', 'position': 2, 'name': 'Contact', 'item': 'https://www.legacytraces.com/#/contact' }
                        ]
                    }
                }}
            />
            {/* Heading Section */}
            <div className="text-center mb-16">
                <h1 className="text-4xl md:text-5xl font-heading font-bold mb-4">GET IN TOUCH</h1>
                <p className="text-gray-600 dark:text-gray-400 max-w-2xl mx-auto text-lg leading-relaxed">
                    Have a question about your order, sizing, or a custom request? Shoot us a message.
                </p>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-16">
                {/* Contact Information & Socials */}
                <div className="space-y-12">
                    <div className="space-y-8">
                        <div className="flex gap-6">
                            <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center text-primary flex-shrink-0">
                                <MapPin size={24} />
                            </div>
                            <div>
                                <h3 className="font-bold text-lg mb-2">Address</h3>
                                <p className="text-gray-600 dark:text-gray-400 leading-relaxed">
                                    20/60, Sakthi Nagar, T Nagar, Ramanathapuram,<br />
                                    Coimbatore, Tamil Nadu 641045
                                </p>
                            </div>
                        </div>

                        <div className="flex gap-6">
                            <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center text-primary flex-shrink-0">
                                <Mail size={24} />
                            </div>
                            <div>
                                <h3 className="font-bold text-lg mb-2">Email</h3>
                                <a href="mailto:legacytraces24@gmail.com" className="text-gray-600 dark:text-gray-400 hover:text-primary transition-colors">
                                    legacytraces24@gmail.com
                                </a>
                            </div>
                        </div>

                        <div className="flex gap-6">
                            <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center text-primary flex-shrink-0">
                                <svg stroke="currentColor" fill="currentColor" strokeWidth="0" viewBox="0 0 448 512" height="22" width="22" xmlns="http://www.w3.org/2000/svg"><path d="M380.9 97.1C339 55.1 283.2 32 223.9 32c-122.4 0-222 99.6-222 222 0 39.1 10.2 77.3 29.6 111L0 480l117.7-30.9c32.4 17.7 68.9 27 106.1 27h.1c122.3 0 224.1-99.6 224.1-222 0-59.3-25.2-115-67.1-157.1zm-157 341.6c-33.2 0-65.7-8.9-94-25.7l-6.7-4-69.8 18.3L72 359.2l-4.4-7c-18.5-29.4-28.2-63.3-28.2-98.2 0-101.7 82.8-184.5 184.6-184.5 49.3 0 95.6 19.2 130.4 54.1 34.8 34.9 56.2 81.2 56.1 130.5 0 101.8-84.9 184.6-186.6 184.6zm101.2-138.2c-5.5-2.8-32.8-16.2-37.9-18-5.1-1.9-8.8-2.8-12.5 2.8-3.7 5.6-14.3 18-17.6 21.8-3.2 3.7-6.5 4.2-12 1.4-32.6-16.3-54-29.1-75.5-66-5.7-9.8 5.7-9.1 16.3-30.3 1.8-3.7 .9-6.9-.5-9.7-1.4-2.8-12.5-30.1-17.1-41.2-4.5-10.8-9.1-9.3-12.5-9.5-3.2-.2-6.9-.2-10.6-.2-3.7 0-9.7 1.4-14.8 6.9-5.1 5.6-19.4 19-19.4 46.3 0 27.3 19.9 53.7 22.6 57.4 2.8 3.7 39.1 59.7 94.8 83.8 35.2 15.2 49 16.5 66.6 13.9 10.7-1.6 32.8-13.4 37.4-26.4 4.6-13 4.6-24.1 3.2-26.4-1.3-2.5-5-3.9-10.5-6.6z"></path></svg>
                            </div>
                            <div>
                                <h3 className="font-bold text-lg mb-2">WhatsApp</h3>
                                <a href="https://wa.me/919360685192" target="_blank" rel="noopener noreferrer" className="text-gray-600 dark:text-gray-400 hover:text-primary transition-colors">
                                    Chat with us on WhatsApp
                                </a>
                            </div>
                        </div>
                    </div>

                    <div className="pt-8 border-t border-gray-100 dark:border-gray-800">
                        <h3 className="font-bold text-lg mb-6">Social Media</h3>
                        <div className="flex gap-6">
                            <a
                                href="https://www.instagram.com/legacy_traces_?utm_source=ig_web_button_share_sheet&igsh=ZDNlZDc0MzIxNw=="
                                target="_blank"
                                rel="noopener noreferrer"
                                className="w-12 h-12 rounded-xl bg-gray-50 dark:bg-gray-800/50 flex items-center justify-center text-gray-600 dark:text-gray-400 hover:bg-primary hover:text-black transition-all group"
                            >
                                <Instagram size={24} className="group-hover:scale-110 transition-transform" />
                            </a>
                            <a
                                href="https://facebook.com/legacytraces"
                                target="_blank"
                                rel="noopener noreferrer"
                                className="w-12 h-12 rounded-xl bg-gray-50 dark:bg-gray-800/50 flex items-center justify-center text-gray-600 dark:text-gray-400 hover:bg-primary hover:text-black transition-all group"
                            >
                                <Facebook size={24} className="group-hover:scale-110 transition-transform" />
                            </a>
                            <a
                                href="https://wa.me/919360685192"
                                target="_blank"
                                rel="noopener noreferrer"
                                className="w-12 h-12 rounded-xl bg-gray-50 dark:bg-gray-800/50 flex items-center justify-center text-gray-600 dark:text-gray-400 hover:bg-[#25D366] hover:text-white transition-all group"
                            >
                                <svg stroke="currentColor" fill="currentColor" strokeWidth="0" viewBox="0 0 448 512" height="22" width="22" xmlns="http://www.w3.org/2000/svg" className="group-hover:scale-110 transition-transform"><path d="M380.9 97.1C339 55.1 283.2 32 223.9 32c-122.4 0-222 99.6-222 222 0 39.1 10.2 77.3 29.6 111L0 480l117.7-30.9c32.4 17.7 68.9 27 106.1 27h.1c122.3 0 224.1-99.6 224.1-222 0-59.3-25.2-115-67.1-157.1zm-157 341.6c-33.2 0-65.7-8.9-94-25.7l-6.7-4-69.8 18.3L72 359.2l-4.4-7c-18.5-29.4-28.2-63.3-28.2-98.2 0-101.7 82.8-184.5 184.6-184.5 49.3 0 95.6 19.2 130.4 54.1 34.8 34.9 56.2 81.2 56.1 130.5 0 101.8-84.9 184.6-186.6 184.6zm101.2-138.2c-5.5-2.8-32.8-16.2-37.9-18-5.1-1.9-8.8-2.8-12.5 2.8-3.7 5.6-14.3 18-17.6 21.8-3.2 3.7-6.5 4.2-12 1.4-32.6-16.3-54-29.1-75.5-66-5.7-9.8 5.7-9.1 16.3-30.3 1.8-3.7 .9-6.9-.5-9.7-1.4-2.8-12.5-30.1-17.1-41.2-4.5-10.8-9.1-9.3-12.5-9.5-3.2-.2-6.9-.2-10.6-.2-3.7 0-9.7 1.4-14.8 6.9-5.1 5.6-19.4 19-19.4 46.3 0 27.3 19.9 53.7 22.6 57.4 2.8 3.7 39.1 59.7 94.8 83.8 35.2 15.2 49 16.5 66.6 13.9 10.7-1.6 32.8-13.4 37.4-26.4 4.6-13 4.6-24.1 3.2-26.4-1.3-2.5-5-3.9-10.5-6.6z"></path></svg>
                            </a>
                        </div>
                    </div>
                </div>

                {/* Contact Form */}
                <div className="bg-white dark:bg-gray-900/50 p-8 md:p-10 rounded-3xl border border-gray-100 dark:border-gray-800 shadow-xl shadow-gray-100/50 dark:shadow-none">
                    <form ref={form} onSubmit={handleSubmit} className="space-y-6">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <div className="space-y-2">
                                <label htmlFor="user_name" className="text-sm font-bold ml-1">Name</label>
                                <input
                                    type="text"
                                    id="user_name"
                                    name="user_name"
                                    required
                                    placeholder="Your full name"
                                    className="w-full px-5 py-4 rounded-xl border border-gray-200 dark:border-gray-700 bg-transparent focus:outline-none focus:border-primary focus:ring-4 focus:ring-primary/10 transition-all"
                                />
                            </div>
                            <div className="space-y-2">
                                <label htmlFor="user_email" className="text-sm font-bold ml-1">Email</label>
                                <input
                                    type="text"
                                    id="user_email"
                                    name="user_email"
                                    required
                                    placeholder="Your email address"
                                    className={`w-full px-5 py-4 rounded-xl border bg-transparent focus:outline-none focus:border-primary focus:ring-4 focus:ring-primary/10 transition-all ${status.message === 'Please enter a valid email address' ? 'border-red-500' : 'border-gray-200 dark:border-gray-700'}`}
                                />
                            </div>
                        </div>

                        <div className="space-y-2">
                            <label htmlFor="subject" className="text-sm font-bold ml-1">Subject</label>
                            <input
                                type="text"
                                id="subject"
                                name="subject"
                                required
                                placeholder="What is this regarding?"
                                className="w-full px-5 py-4 rounded-xl border border-gray-200 dark:border-gray-700 bg-transparent focus:outline-none focus:border-primary focus:ring-4 focus:ring-primary/10 transition-all"
                            />
                        </div>

                        <div className="space-y-2">
                            <label htmlFor="message" className="text-sm font-bold ml-1">Message</label>
                            <textarea
                                id="message"
                                name="message"
                                required
                                rows="5"
                                placeholder="Tell us more about your inquiry..."
                                className="w-full px-5 py-4 rounded-xl border border-gray-200 dark:border-gray-700 bg-transparent focus:outline-none focus:border-primary focus:ring-4 focus:ring-primary/10 transition-all resize-none"
                            ></textarea>
                        </div>

                        <AnimatePresence mode="wait">
                            {status.message && (
                                <motion.div
                                    key={status.message}
                                    initial={{ opacity: 0, y: -10 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    exit={{ opacity: 0, y: -10 }}
                                    className={`p-4 rounded-xl flex items-center gap-3 ${status.type === 'success' ? 'bg-green-50 text-green-700 border border-green-100' : 'bg-red-50 text-red-700 border border-red-100'}`}
                                >
                                    {status.type === 'success' ? <CheckCircle2 size={18} /> : <AlertCircle size={18} />}
                                    <p className="text-sm font-medium">{status.message}</p>
                                </motion.div>
                            )}
                        </AnimatePresence>

                        <button
                            type="submit"
                            disabled={isSending}
                            className={`w-full py-5 rounded-2xl bg-black dark:bg-primary text-white dark:text-black font-bold flex items-center justify-center gap-3 hover:scale-[1.02] active:scale-[0.98] transition-all disabled:opacity-50 disabled:cursor-not-allowed`}
                        >
                            {isSending ? (
                                <>
                                    <div className="w-5 h-5 border-2 border-white/30 dark:border-black/30 border-t-white dark:border-t-black rounded-full animate-spin"></div>
                                    PREPARING EMAIL...
                                </>
                            ) : (
                                <>
                                    <Send size={18} />
                                    SEND MESSAGE
                                </>
                            )}
                        </button>
                    </form>
                </div>
            </div>
        </div>
    );
};

export default Contact;
