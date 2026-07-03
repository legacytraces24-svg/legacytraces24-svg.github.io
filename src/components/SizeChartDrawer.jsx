import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Ruler, Info } from 'lucide-react';

const SizeChartDrawer = ({ isOpen, onClose, productType }) => {
    const [activeTab, setActiveTab] = useState('chart');
    const [unit, setUnit] = useState('inches');

    const chartData = {
        inches: [
            { size: 'XS', chest: '36', shoulder: '16.25', length: '26' },
            { size: 'S', chest: '38', shoulder: '16.75', length: '27' },
            { size: 'M', chest: '40', shoulder: '17.25', length: '28' },
            { size: 'L', chest: '42', shoulder: '17.75', length: '29' },
            { size: 'XL', chest: '45', shoulder: '18.75', length: '30' },
            { size: 'XXL', chest: '47', shoulder: '19.25', length: '30.5' },
            { size: 'XXXL', chest: '49', shoulder: '19.75', length: '30.5' },
        ],
        cm: [
            { size: 'XS', chest: '91.4', shoulder: '41', length: '66' },
            { size: 'S', chest: '96', shoulder: '42', length: '69' },
            { size: 'M', chest: '101', shoulder: '43', length: '71' },
            { size: 'L', chest: '106', shoulder: '44', length: '74' },
            { size: 'XL', chest: '114', shoulder: '48', length: '76' },
            { size: 'XXL', chest: '119', shoulder: '49', length: '77' },
            { size: 'XXXL', chest: '124', shoulder: '50', length: '77' },
        ]
    };

    if (productType !== 'T-Shirt') return null;

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
                        className="fixed inset-0 bg-black/30 backdrop-blur-sm z-[60]"
                    />

                    {/* Drawer */}
                    <motion.div
                        initial={{ x: '100%' }}
                        animate={{ x: 0 }}
                        exit={{ x: '100%' }}
                        transition={{ type: 'spring', damping: 25, stiffness: 200 }}
                        className="fixed right-0 top-0 h-full w-full max-w-md bg-white dark:bg-[#1a1a1a] dark:text-white z-[70] shadow-2xl flex flex-col"
                    >
                        {/* Header */}
                        <div className="flex justify-between items-center p-6 border-b dark:border-gray-800">
                            <h2 className="text-2xl font-heading font-bold">Size Chart – T-Shirts</h2>
                            <button
                                onClick={onClose}
                                className="p-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-full transition-colors"
                            >
                                <X size={24} />
                            </button>
                        </div>

                        {/* Tabs */}
                        <div className="flex border-b dark:border-gray-800">
                            <button
                                onClick={() => setActiveTab('chart')}
                                className={`flex-1 py-4 font-bold flex items-center justify-center gap-2 transition-colors ${activeTab === 'chart' ? 'text-primary border-b-2 border-primary' : 'text-gray-500 hover:text-black dark:hover:text-white'}`}
                            >
                                <Ruler size={18} /> Size Chart
                            </button>
                            <button
                                onClick={() => setActiveTab('measure')}
                                className={`flex-1 py-4 font-bold flex items-center justify-center gap-2 transition-colors ${activeTab === 'measure' ? 'text-primary border-b-2 border-primary' : 'text-gray-500 hover:text-black dark:hover:text-white'}`}
                            >
                                <Info size={18} /> How To Measure
                            </button>
                        </div>

                        {/* Content */}
                        <div className="flex-1 overflow-y-auto p-6">
                            {activeTab === 'chart' ? (
                                <div className="space-y-6">
                                    {/* Unit Toggle */}
                                    <div className="flex justify-center p-1 bg-gray-100 dark:bg-gray-800 rounded-lg max-w-[200px] mx-auto">
                                        <button
                                            onClick={() => setUnit('inches')}
                                            className={`flex-1 py-1 px-3 text-xs font-bold rounded-md transition-all ${unit === 'inches' ? 'bg-white dark:bg-gray-700 shadow-sm text-black dark:text-white' : 'text-gray-500'}`}
                                        >
                                            SIZE IN INCHES
                                        </button>
                                        <button
                                            onClick={() => setUnit('cm')}
                                            className={`flex-1 py-1 px-3 text-xs font-bold rounded-md transition-all ${unit === 'cm' ? 'bg-white dark:bg-gray-700 shadow-sm text-black dark:text-white' : 'text-gray-500'}`}
                                        >
                                            SIZE IN CM
                                        </button>
                                    </div>

                                    {/* Table */}
                                    <div className="overflow-x-auto rounded-xl border border-gray-200 dark:border-gray-800">
                                        <table className="w-full text-sm text-left">
                                            <thead className="bg-gray-50 dark:bg-gray-800/50 border-b dark:border-gray-800 sticky top-0">
                                                <tr>
                                                    <th className="px-4 py-3 font-bold text-black dark:text-white">Size</th>
                                                    <th className="px-4 py-3 font-bold text-black dark:text-white">Chest</th>
                                                    <th className="px-4 py-3 font-bold text-black dark:text-white">Shoulder</th>
                                                    <th className="px-4 py-3 font-bold text-black dark:text-white">Length</th>
                                                </tr>
                                            </thead>
                                            <tbody>
                                                {chartData[unit].map((row) => (
                                                    <tr key={row.size} className="border-b dark:border-gray-800 last:border-0 hover:bg-gray-50 dark:hover:bg-gray-800/50">
                                                        <td className="px-4 py-3 font-bold text-black dark:text-white">{row.size}</td>
                                                        <td className="px-4 py-3 text-gray-600 dark:text-gray-300">{row.chest}</td>
                                                        <td className="px-4 py-3 text-gray-600 dark:text-gray-300">{row.shoulder}</td>
                                                        <td className="px-4 py-3 text-gray-600 dark:text-gray-300">{row.length}</td>
                                                    </tr>
                                                ))}
                                            </tbody>
                                        </table>
                                    </div>
                                </div>
                            ) : (
                                <div className="space-y-8">
                                    <div className="bg-blue-50 dark:bg-blue-900/20 p-4 rounded-xl text-blue-800 dark:text-blue-300 text-sm leading-relaxed flex gap-3">
                                        <Info className="flex-shrink-0 w-5 h-5 mt-0.5" />
                                        <p>The measurements in the size chart are based on body measurements, not the garment.</p>
                                    </div>

                                    {/* Illustration placeholder */}
                                    <div className="aspect-square bg-gray-50 dark:bg-gray-800 rounded-2xl flex items-center justify-center p-8 border-2 border-dashed border-gray-200 dark:border-gray-700">
                                        <div className="relative w-full h-full">
                                            {/* Simple SVG T-shirt shape for visual guidance */}
                                            <svg viewBox="0 0 100 100" className="w-full h-full text-gray-400">
                                                <path fill="currentColor" opacity="0.1" d="M20,20 L30,20 L30,10 L70,10 L70,20 L80,20 L95,40 L85,45 L80,40 L80,90 L20,90 L20,40 L15,45 L5,40 Z" />
                                                {/* Measuring Lines */}
                                                <line x1="30" y1="12" x2="70" y2="12" stroke="currentColor" strokeWidth="1" strokeDasharray="2" />
                                                <text x="50" y="8" fontSize="4" textAnchor="middle" fill="currentColor">Shoulder</text>

                                                <line x1="20" y1="45" x2="80" y2="45" stroke="currentColor" strokeWidth="1" strokeDasharray="2" />
                                                <text x="50" y="42" fontSize="4" textAnchor="middle" fill="currentColor">Chest</text>

                                                <line x1="22" y1="10" x2="22" y2="90" stroke="currentColor" strokeWidth="1" strokeDasharray="2" />
                                                <text x="18" y="50" fontSize="4" textAnchor="middle" fill="currentColor" transform="rotate(-90 18,50)">Length</text>
                                            </svg>
                                        </div>
                                    </div>

                                    {/* Instructions */}
                                    <div className="space-y-6">
                                        <div>
                                            <h4 className="font-bold mb-2 flex items-center gap-2 dark:text-white">
                                                <span className="w-6 h-6 rounded-full bg-primary text-black flex items-center justify-center text-xs">1</span>
                                                Shoulder
                                            </h4>
                                            <p className="text-gray-600 dark:text-gray-400 text-sm pl-8">Place the measuring tape on shoulder seam & measure it edge to edge.</p>
                                        </div>
                                        <div>
                                            <h4 className="font-bold mb-2 flex items-center gap-2 dark:text-white">
                                                <span className="w-6 h-6 rounded-full bg-primary text-black flex items-center justify-center text-xs">2</span>
                                                Chest
                                            </h4>
                                            <p className="text-gray-600 dark:text-gray-400 text-sm pl-8">Lift your arms slightly and measure around your body, crossing over the fullest part of your bust.</p>
                                        </div>
                                        <div>
                                            <h4 className="font-bold mb-2 flex items-center gap-2 dark:text-white">
                                                <span className="w-6 h-6 rounded-full bg-primary text-black flex items-center justify-center text-xs">3</span>
                                                Length
                                            </h4>
                                            <p className="text-gray-600 dark:text-gray-400 text-sm pl-8">Measure from highest point of the shoulder to the bottom edge.</p>
                                        </div>
                                    </div>
                                </div>
                            )}
                        </div>

                        {/* Footer */}
                        <div className="p-6 border-t dark:border-gray-800 bg-gray-50 dark:bg-gray-800/50">
                            <button
                                onClick={onClose}
                                className="w-full bg-black dark:bg-white text-white dark:text-black font-bold py-4 rounded-xl hover:bg-gray-800 dark:hover:bg-gray-200 transition-colors"
                            >
                                CLOSE
                            </button>
                        </div>
                    </motion.div>
                </>
            )}
        </AnimatePresence>
    );
};

export default SizeChartDrawer;
