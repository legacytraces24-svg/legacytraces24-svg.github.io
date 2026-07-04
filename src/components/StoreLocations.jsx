import React, { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { MapPin, Phone, Mail, Navigation } from 'lucide-react';
import { fetchBranches, getImageUrl } from '../api/api';

const PLACEHOLDER_IMAGE = 'https://placehold.co/640x360/000/FFF?text=Legacy+Traces';

const BranchCard = ({ branch, index }) => {
    const fullAddress = [branch.Address, branch.City, branch.State, branch.Pincode]
        .filter(Boolean)
        .join(', ');

    return (
        <motion.div
            initial={{ opacity: 0, y: 24 }}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: (index % 3) * 0.1 }}
            viewport={{ once: true, margin: '-50px' }}
            whileHover={{ scale: 1.02 }}
            className="bg-white dark:bg-[#1e1e1e] rounded-2xl border border-gray-100 dark:border-gray-800 shadow-sm hover:shadow-xl transition-shadow duration-300 overflow-hidden h-full flex flex-col"
        >
            <div className="relative w-full aspect-video overflow-hidden bg-gray-100 dark:bg-gray-900">
                <img
                    src={getImageUrl(branch.Store_Image)}
                    alt={branch.Branch_Name}
                    className="w-full h-full object-cover"
                    loading="lazy"
                    referrerPolicy="no-referrer"
                    onError={(e) => {
                        e.target.onerror = null;
                        e.target.src = PLACEHOLDER_IMAGE;
                    }}
                />
            </div>

            <div className="p-6 flex flex-col flex-grow">
                <h3 className="font-heading font-bold text-xl mb-2">{branch.Branch_Name}</h3>

                {branch.Description && (
                    <p className="text-gray-600 dark:text-gray-400 text-sm leading-relaxed mb-4">
                        {branch.Description}
                    </p>
                )}

                <div className="space-y-2 text-sm mb-6">
                    {fullAddress && (
                        <div className="flex items-start gap-2 text-gray-700 dark:text-gray-300">
                            <MapPin size={15} className="mt-0.5 shrink-0 text-primary" />
                            <span>{fullAddress}</span>
                        </div>
                    )}
                    {branch.Phone && (
                        <div className="flex items-center gap-2 text-gray-700 dark:text-gray-300">
                            <Phone size={15} className="shrink-0 text-primary" />
                            <span>{branch.Phone}</span>
                        </div>
                    )}
                    {branch.Email && (
                        <div className="flex items-center gap-2 text-gray-700 dark:text-gray-300">
                            <Mail size={15} className="shrink-0 text-primary" />
                            <span className="truncate">{branch.Email}</span>
                        </div>
                    )}
                </div>

                <div className="mt-auto grid grid-cols-1 sm:grid-cols-3 gap-2">
                    {branch.Google_Map_URL && (
                        <a
                            href={branch.Google_Map_URL}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="flex items-center justify-center gap-1.5 text-xs font-bold px-3 py-2.5 rounded-lg bg-primary text-black hover:brightness-90 transition-all"
                        >
                            <Navigation size={14} /> Directions
                        </a>
                    )}
                    {branch.Phone && (
                        <a
                            href={`tel:${branch.Phone}`}
                            className="flex items-center justify-center gap-1.5 text-xs font-bold px-3 py-2.5 rounded-lg border border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
                        >
                            <Phone size={14} /> Call
                        </a>
                    )}
                    {branch.Email && (
                        <a
                            href={`mailto:${branch.Email}`}
                            className="flex items-center justify-center gap-1.5 text-xs font-bold px-3 py-2.5 rounded-lg border border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
                        >
                            <Mail size={14} /> Email
                        </a>
                    )}
                </div>
            </div>
        </motion.div>
    );
};

const StoreLocations = () => {
    const [branches, setBranches] = useState([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        let cancelled = false;
        fetchBranches().then((data) => {
            if (cancelled) return;
            const sorted = [...data].sort((a, b) => (a.Display_Order ?? 0) - (b.Display_Order ?? 0));
            setBranches(sorted);
            setLoading(false);
        }).catch(() => {
            if (!cancelled) setLoading(false);
        });
        return () => { cancelled = true; };
    }, []);

    return (
        <section className="container mx-auto px-4 py-10 md:py-12">
            <motion.div
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.6 }}
                viewport={{ once: true }}
                className="text-center mb-8 md:mb-10"
            >
                <h2 className="text-3xl md:text-5xl font-heading font-black uppercase tracking-tight mb-3">
                    Visit Our <span className="text-primary">Stores</span>
                </h2>
                <p className="text-gray-600 dark:text-gray-400 max-w-2xl mx-auto">
                    Experience Legacy Traces in person. Visit any of our stores to explore premium
                    Tamil-inspired streetwear, exclusive collections, and personalized assistance.
                </p>
            </motion.div>

            {loading ? (
                <div className="flex justify-center py-10">
                    <div className="animate-spin rounded-full h-10 w-10 border-t-2 border-b-2 border-primary"></div>
                </div>
            ) : branches.length === 0 ? (
                <p className="text-center text-gray-500 dark:text-gray-400 py-6">
                    New Legacy Traces stores are coming soon. Stay tuned!
                </p>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 md:gap-8 max-w-6xl mx-auto items-stretch">
                    {branches.map((branch, index) => (
                        <BranchCard key={branch.Branch_ID} branch={branch} index={index} />
                    ))}
                </div>
            )}
        </section>
    );
};

export default StoreLocations;
