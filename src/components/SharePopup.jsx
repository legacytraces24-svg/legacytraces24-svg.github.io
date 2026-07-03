import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
    X,
    Copy,
    Check,
    MessageCircle,
    Twitter,
    Facebook,
    Send,
    Instagram
} from 'lucide-react';

const SharePopup = ({ isOpen, onClose, productName, productUrl }) => {
    const [copied, setCopied] = useState(false);

    useEffect(() => {
        if (copied) {
            const timer = setTimeout(() => setCopied(false), 2000);
            return () => clearTimeout(timer);
        }
    }, [copied]);

    const shareLinks = [
        {
            name: 'WhatsApp',
            icon: <MessageCircle size={24} />,
            color: 'bg-[#25D366]',
            url: `https://api.whatsapp.com/send?text=${encodeURIComponent(productName + ' ' + productUrl)}`
        },
        {
            name: 'Twitter',
            icon: <Twitter size={24} />,
            color: 'bg-[#1DA1F2]',
            url: `https://twitter.com/intent/tweet?url=${encodeURIComponent(productUrl)}&text=${encodeURIComponent(productName)}`
        },
        {
            name: 'Facebook',
            icon: <Facebook size={24} />,
            color: 'bg-[#1877F2]',
            url: `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(productUrl)}`
        },
        {
            name: 'Telegram',
            icon: <Send size={24} />,
            color: 'bg-[#0088cc]',
            url: `https://t.me/share/url?url=${encodeURIComponent(productUrl)}&text=${encodeURIComponent(productName)}`
        }
    ];

    const copyToClipboard = async () => {
        try {
            await navigator.clipboard.writeText(productUrl);
            setCopied(true);
        } catch (err) {
            console.error('Failed to copy: ', err);
        }
    };

    const handleShare = (url) => {
        window.open(url, '_blank', 'noopener,noreferrer');
    };

    const handleInstagramShare = () => {
        copyToClipboard();
        // Instagram doesn't support direct URL sharing on web easily, 
        // so we prompt the user that the link is copied for their story.
    };

    return (
        <AnimatePresence>
            {isOpen && (
                <>
                    {/* Backdrop */}
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        onClick={onClose}
                        className="fixed inset-0 bg-black/5 z-[60] backdrop-blur-[2px]"
                    />

                    {/* Popup Container */}
                    <div className="fixed inset-x-4 bottom-8 md:bottom-auto md:absolute md:right-0 md:top-full md:mt-4 md:w-80 md:inset-x-auto z-[70]">
                        <motion.div
                            initial={{ opacity: 0, scale: 0.9, y: 20 }}
                            animate={{ opacity: 1, scale: 1, y: 0 }}
                            exit={{ opacity: 0, scale: 0.9, y: 20 }}
                            transition={{ type: 'spring', damping: 25, stiffness: 300 }}
                            className="bg-white dark:bg-[#1a1a1a] rounded-3xl shadow-2xl border border-gray-100 dark:border-gray-800 p-6"
                        >
                            <div className="flex justify-between items-center mb-6">
                                <h3 className="font-heading font-bold text-lg">Share Product</h3>
                                <button
                                    onClick={onClose}
                                    className="p-1 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-full transition-colors"
                                >
                                    <X size={20} />
                                </button>
                            </div>

                            <div className="grid grid-cols-4 gap-4 mb-8">
                                {shareLinks.map((link) => (
                                    <button
                                        key={link.name}
                                        onClick={() => handleShare(link.url)}
                                        className="flex flex-col items-center gap-2 group"
                                    >
                                        <div className={`${link.color} text-white p-3 rounded-2xl group-hover:scale-110 transition-transform shadow-lg shadow-gray-200 dark:shadow-none`}>
                                            {link.icon}
                                        </div>
                                        <span className="text-[10px] font-bold uppercase tracking-widest text-gray-500">{link.name}</span>
                                    </button>
                                ))}
                                <button
                                    onClick={handleInstagramShare}
                                    className="flex flex-col items-center gap-2 group"
                                >
                                    <div className="bg-gradient-to-tr from-[#f9ce34] via-[#ee2a7b] to-[#6228d7] text-white p-3 rounded-2xl group-hover:scale-110 transition-transform shadow-lg shadow-gray-200 dark:shadow-none">
                                        <Instagram size={24} />
                                    </div>
                                    <span className="text-[10px] font-bold uppercase tracking-widest text-gray-500">Instagram</span>
                                </button>
                            </div>

                            <div className="space-y-2">
                                <p className="text-xs font-bold text-gray-400 uppercase tracking-widest ml-1">Or Copy Link</p>
                                <div className="flex items-center gap-2 p-2 bg-gray-50 dark:bg-gray-800/50 rounded-2xl border border-gray-100 dark:border-gray-700">
                                    <input
                                        type="text"
                                        readOnly
                                        value={productUrl}
                                        className="flex-1 bg-transparent text-sm px-2 outline-none text-gray-500 truncate"
                                    />
                                    <button
                                        onClick={copyToClipboard}
                                        className={`p-2 rounded-xl transition-all ${copied ? 'bg-green-500 text-white' : 'bg-black dark:bg-white text-white dark:text-black hover:opacity-80'}`}
                                    >
                                        {copied ? <Check size={18} /> : <Copy size={18} />}
                                    </button>
                                </div>
                                {copied && (
                                    <motion.p
                                        initial={{ opacity: 0, y: -10 }}
                                        animate={{ opacity: 1, y: 0 }}
                                        className="text-[10px] font-bold text-green-600 dark:text-green-400 text-center uppercase tracking-widest mt-2"
                                    >
                                        Link Copied to Clipboard!
                                    </motion.p>
                                )}
                            </div>
                        </motion.div>
                    </div>
                </>
            )}
        </AnimatePresence>
    );
};

export default SharePopup;
