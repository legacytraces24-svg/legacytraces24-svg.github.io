import React from 'react';
import { Facebook, Instagram } from 'lucide-react';
import { Link } from 'react-router-dom';

const Footer = () => {
    return (
        <footer className="bg-gray-50 dark:bg-[#1e1e1e] border-t border-gray-200 dark:border-gray-800 mt-auto pt-10 pb-8 transition-colors duration-300">
            <div className="container mx-auto px-3 md:px-4">
                {/* Mobile: 2-col grid, Desktop: flex row */}
                <div className="grid grid-cols-2 md:flex md:flex-row md:justify-between gap-6 md:gap-8 mb-8 md:mb-12">
                    {/* Brand + Socials — col 1 on mobile, spans across on desktop */}
                    <div className="col-span-2 md:col-span-1 md:w-1/3">
                        <h3 className="text-xl md:text-2xl font-bold font-heading mb-3 md:mb-4">LEGACY TRACES</h3>
                        <p className="text-gray-500 mb-4 md:mb-6 leading-relaxed text-sm md:text-base">
                            Premium streetwear for the modern generation. Quality, style, and comfort in every stitch.
                        </p>
                        <div className="flex gap-3">
                            <a href="#" className="p-2 rounded-full bg-gray-200 dark:bg-gray-800 hover:bg-primary hover:text-white transition-colors"><Facebook size={18} /></a>
                            <a href="https://www.instagram.com/legacytraces_?igsh=MXFhMXYydTNrNHpmMQ==" target='_blank' rel="noopener noreferrer" className="p-2 rounded-full bg-gray-200 dark:bg-gray-800 hover:bg-primary hover:text-white transition-colors"><Instagram size={18} /></a>
                            <a href="https://wa.me/919360685192" target="_blank" rel="noopener noreferrer" className="p-2 rounded-full bg-gray-200 dark:bg-gray-800 hover:bg-[#25D366] hover:text-white transition-colors">
                                <svg stroke="currentColor" fill="currentColor" strokeWidth="0" viewBox="0 0 448 512" height="18" width="18" xmlns="http://www.w3.org/2000/svg"><path d="M380.9 97.1C339 55.1 283.2 32 223.9 32c-122.4 0-222 99.6-222 222 0 39.1 10.2 77.3 29.6 111L0 480l117.7-30.9c32.4 17.7 68.9 27 106.1 27h.1c122.3 0 224.1-99.6 224.1-222 0-59.3-25.2-115-67.1-157.1zm-157 341.6c-33.2 0-65.7-8.9-94-25.7l-6.7-4-69.8 18.3L72 359.2l-4.4-7c-18.5-29.4-28.2-63.3-28.2-98.2 0-101.7 82.8-184.5 184.6-184.5 49.3 0 95.6 19.2 130.4 54.1 34.8 34.9 56.2 81.2 56.1 130.5 0 101.8-84.9 184.6-186.6 184.6zm101.2-138.2c-5.5-2.8-32.8-16.2-37.9-18-5.1-1.9-8.8-2.8-12.5 2.8-3.7 5.6-14.3 18-17.6 21.8-3.2 3.7-6.5 4.2-12 1.4-32.6-16.3-54-29.1-75.5-66-5.7-9.8 5.7-9.1 16.3-30.3 1.8-3.7 .9-6.9-.5-9.7-1.4-2.8-12.5-30.1-17.1-41.2-4.5-10.8-9.1-9.3-12.5-9.5-3.2-.2-6.9-.2-10.6-.2-3.7 0-9.7 1.4-14.8 6.9-5.1 5.6-19.4 19-19.4 46.3 0 27.3 19.9 53.7 22.6 57.4 2.8 3.7 39.1 59.7 94.8 83.8 35.2 15.2 49 16.5 66.6 13.9 10.7-1.6 32.8-13.4 37.4-26.4 4.6-13 4.6-24.1 3.2-26.4-1.3-2.5-5-3.9-10.5-6.6z"></path></svg>
                            </a>
                        </div>
                    </div>

                    {/* Shop Links — col 1 on mobile */}
                    <div className="md:w-1/6">
                        <h4 className="font-bold mb-3 md:mb-4 uppercase tracking-wider text-xs md:text-sm">Shop</h4>
                        <ul className="space-y-2 text-gray-500 text-sm">
                            <li><Link to="/shop" className="hover:text-primary transition-colors">Men</Link></li>
                            <li><Link to="/shop" className="hover:text-primary transition-colors">Women</Link></li>
                            <li><Link to="/shop" className="hover:text-primary transition-colors">New Arrivals</Link></li>
                            <li><Link to="/shop" className="hover:text-primary transition-colors">Best Sellers</Link></li>
                        </ul>
                    </div>

                    {/* Support Links — col 2 on mobile */}
                    <div className="md:w-1/6">
                        <h4 className="font-bold mb-3 md:mb-4 uppercase tracking-wider text-xs md:text-sm">Support</h4>
                        <ul className="space-y-2 text-gray-500 text-sm">
                            <li><Link to="/orders" className="hover:text-primary transition-colors">Track Order</Link></li>
                            <li><a href="#/orders" className="hover:text-primary transition-colors">Returns</a></li>
                            <li><Link to="/shipping-policy" className="hover:text-primary transition-colors">Shipping Policy</Link></li>
                            <li><Link to="/contact" className="hover:text-primary transition-colors">Contact Us</Link></li>
                        </ul>
                    </div>

                    {/* Newsletter — full width on mobile */}
                    <div className="col-span-2 md:col-span-1 md:w-1/3">
                        <h4 className="font-bold mb-3 md:mb-4 uppercase tracking-wider text-xs md:text-sm">Newsletter</h4>
                        <p className="text-gray-500 mb-3 md:mb-4 text-xs md:text-sm">Subscribe to get special offers, free giveaways, and once-in-a-lifetime deals.</p>
                        <div className="flex gap-2">
                            <input
                                type="email"
                                placeholder="Enter your email"
                                className="w-full p-2.5 md:p-3 rounded-lg border border-gray-300 dark:border-gray-700 bg-transparent focus:outline-none focus:border-primary text-sm"
                            />
                            <button className="bg-primary text-black px-4 md:px-6 py-2.5 md:py-3 rounded-lg font-bold hover:bg-green-400 transition-colors text-sm whitespace-nowrap">
                                JOIN
                            </button>
                        </div>
                    </div>
                </div>

                <div className="border-t border-gray-200 dark:border-gray-800 pt-6 text-center text-gray-500 text-xs md:text-sm">
                    &copy; {new Date().getFullYear()} Legacy Traces. All rights reserved.
                </div>
            </div>
        </footer>
    );
};

export default Footer;

