import React, { useEffect, useState } from 'react';
import { fetchAllData } from '../api/api';
import ProductCard from '../components/ProductCard';
import { Filter, X } from 'lucide-react';
import SEO from '../components/SEO';
import { useSearchParams } from 'react-router-dom';



//   const [searchParams] = useSearchParams();

// console.log(searchParams)
// const id = params.get('collection'); // "123"
// console.log(id)
// const collection = id || 'All';
// console.log(collection)

var collection = 'All'

const Shop = () => {
    const [searchParams] = useSearchParams();
    const collectionParam = searchParams.get('collection') || "All";
    const categoryParam = searchParams.get('category') || "All";

    const [products, setProducts] = useState([]);
    const [collections, setCollections] = useState([]);
    const [categories, setCategories] = useState([]);
    const [loading, setLoading] = useState(true);
    const [loadError, setLoadError] = useState(false);
    const [selectedCollection, setSelectedCollection] = useState(collectionParam);
    const [selectedCategory, setSelectedCategory] = useState(categoryParam);
    const [sortOrder, setSortOrder] = useState('default'); // default, lowToHigh, highToLow
    const [isFilterOpen, setIsFilterOpen] = useState(false);

    const loadCatalog = () => {
        setLoading(true);
        setLoadError(false);
        fetchAllData().then(data => {
            setProducts(data.product || []);
            setCollections(data.collection || []);
            setCategories(data.category || []);
            setLoading(false);
        }).catch(() => {
            setLoadError(true);
            setLoading(false);
        });
    };

    useEffect(() => {
        loadCatalog();
    }, []);

    useEffect(() => {
        setSelectedCollection(searchParams.get('collection') || "All");
        setSelectedCategory(searchParams.get('category') || "All");
    }, [searchParams]);

    // Resolve URL-param category names to actual type IDs from DB.
    // Header links send names like "T-Shirt" but product.Type stores the DB type ID.
    useEffect(() => {
        if (categories.length === 0) return;
        const param = searchParams.get('category');
        if (!param || param === 'All') return;
        if (categories.some(c => c.ID === param)) return; // already a valid ID
        const clean = (s) => s?.toLowerCase().replace(/s$/, '').trim() || '';
        const matched = categories.find(c => clean(c.Name) === clean(param));
        if (matched) setSelectedCategory(matched.ID);
    }, [categories, searchParams]);

    // Filter and Sort Logic
    const filteredProducts = products
        .filter(product => {
            const matchCollection = selectedCollection === 'All' || product.Collection === selectedCollection;
            const matchCategory   = selectedCategory === 'All' || product.Type === selectedCategory;
            return matchCollection && matchCategory;
        })
        .sort((a, b) => {
            if (sortOrder === 'lowToHigh') return a.Price - b.Price;
            if (sortOrder === 'highToLow') return b.Price - a.Price;
            return 0;
        });

    if (loading) {
        return (
            <div className="min-h-screen flex items-center justify-center">
                <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary"></div>
            </div>
        );
    }

    if (loadError) {
        return (
            <div className="min-h-screen flex flex-col items-center justify-center gap-4 text-center px-4">
                <p className="text-gray-500 dark:text-gray-400">Couldn't load products. Please check your connection and try again.</p>
                <button onClick={loadCatalog} className="bg-primary text-black font-bold px-6 py-2.5 rounded-lg hover:brightness-90 transition-all">
                    Retry
                </button>
            </div>
        );
    }

    return (
        <div className="container mx-auto px-4 py-8">
            <SEO
                title="Buy T-Shirts &amp; Hoodies Online – Tamil Streetwear Collection"
                description="Browse 50+ Tamil culture graphic t-shirts, oversized hoodies &amp; streetwear at Legacy Traces. Regular &amp; oversized fits, premium quality. Shop online with fast delivery across India."
                keywords="buy t-shirts online India, graphic t-shirts, oversized t-shirts India, Tamil culture clothing, hoodie shop online, streetwear India, premium t-shirts"
                jsonLd={{
                    '@context': 'https://schema.org',
                    '@type': 'CollectionPage',
                    'name': 'Shop – T-Shirts & Hoodies | Legacy Traces',
                    'url': 'https://www.legacytraces.com/#/shop',
                    'description': 'Browse the full collection of Tamil culture t-shirts, oversized hoodies and graphic streetwear.',
                    'isPartOf': { '@id': 'https://www.legacytraces.com/#website' },
                    'breadcrumb': {
                        '@type': 'BreadcrumbList',
                        'itemListElement': [
                            { '@type': 'ListItem', 'position': 1, 'name': 'Home',  'item': 'https://www.legacytraces.com/' },
                            { '@type': 'ListItem', 'position': 2, 'name': 'Shop',  'item': 'https://www.legacytraces.com/#/shop' }
                        ]
                    }
                }}
            />
            {/* Active filter chips — always visible so the user knows what's applied */}
            {(selectedCollection !== 'All' || selectedCategory !== 'All') && (
                <div className="flex flex-wrap items-center gap-2 mb-4">
                    <span className="text-xs text-gray-500">Active filters:</span>
                    {selectedCollection !== 'All' && (
                        <button
                            onClick={() => setSelectedCollection('All')}
                            className="flex items-center gap-1 text-xs font-semibold bg-primary/10 text-primary px-3 py-1.5 rounded-full hover:bg-primary/20 transition-colors"
                        >
                            {collections.find(c => c.ID === selectedCollection)?.Name || selectedCollection} <X size={12} />
                        </button>
                    )}
                    {selectedCategory !== 'All' && (
                        <button
                            onClick={() => setSelectedCategory('All')}
                            className="flex items-center gap-1 text-xs font-semibold bg-primary/10 text-primary px-3 py-1.5 rounded-full hover:bg-primary/20 transition-colors"
                        >
                            {categories.find(c => c.ID === selectedCategory)?.Name || selectedCategory} <X size={12} />
                        </button>
                    )}
                    <button
                        onClick={() => { setSelectedCollection('All'); setSelectedCategory('All'); }}
                        className="text-xs text-gray-400 hover:text-red-500 underline transition-colors"
                    >
                        Clear all
                    </button>
                </div>
            )}

            <div className="flex flex-col md:flex-row gap-8">
                {/* Mobile Filter Toggle */}
                <button
                    className="md:hidden flex items-center gap-2 font-bold border p-2 rounded"
                    onClick={() => setIsFilterOpen(true)}
                >
                    <Filter size={20} /> Filters
                </button>

                {/* Backdrop — dims the (still visible) product grid behind the filter sheet */}
                {isFilterOpen && (
                    <div
                        className="fixed inset-0 bg-black/40 z-40 md:hidden"
                        onClick={() => setIsFilterOpen(false)}
                    />
                )}

                {/* Sidebar Filters — half-width left drawer on mobile so results stay visible behind it */}
                <aside className={`fixed inset-y-0 left-0 z-50 w-1/2 bg-white dark:bg-[#121212] shadow-2xl p-6 overflow-y-auto transition-transform duration-300 ease-out md:static md:z-0 md:w-1/4 md:bg-transparent md:shadow-none md:p-0 md:translate-x-0 ${isFilterOpen ? 'translate-x-0' : '-translate-x-full'}`}>
                    <div className="flex justify-between items-center mb-6 md:hidden">
                        <h2 className="text-lg font-bold">Filters · {filteredProducts.length}</h2>
                        <button onClick={() => setIsFilterOpen(false)}><X size={20} /></button>
                    </div>

                    <div className="space-y-8">
                        {/* Collections */}
                        <div>
                            <h3 className="font-bold text-lg mb-4 font-heading">Collections</h3>
                            <div className="space-y-2">
                                <label className="flex items-center gap-2 cursor-pointer">
                                    <input
                                        type="radio"
                                        name="collection"
                                        checked={selectedCollection === 'All'}
                                        onChange={() => setSelectedCollection('All')}
                                        className="accent-primary"
                                    />
                                    <span>All Collections</span>
                                </label>
                                {collections.map(col => (
                                    <label key={col.ID} className="flex items-center gap-2 cursor-pointer">
                                        <input
                                            type="radio"
                                            name="collection"
                                            checked={selectedCollection === col.ID}
                                            onChange={() => setSelectedCollection(col.ID)}
                                            className="accent-primary"
                                        />
                                        <span>{col.Name}</span>
                                    </label>
                                ))}
                            </div>
                        </div>

                        {/* Categories */}
                        <div>
                            <h3 className="font-bold text-lg mb-4 font-heading">Categories</h3>
                            <div className="space-y-2">
                                <label className="flex items-center gap-2 cursor-pointer">
                                    <input
                                        type="radio"
                                        name="category"
                                        checked={selectedCategory === 'All'}
                                        onChange={() => setSelectedCategory('All')}
                                        className="accent-primary"
                                    />
                                    <span>All Categories</span>
                                </label>
                                {categories.map(cat => (
                                    <label key={cat.ID} className="flex items-center gap-2 cursor-pointer">
                                        <input
                                            type="radio"
                                            name="category"
                                            checked={selectedCategory === cat.ID}
                                            onChange={() => setSelectedCategory(cat.ID)}
                                            className="accent-primary"
                                        />
                                        <span>{cat.Name}</span>
                                    </label>
                                ))}
                            </div>
                        </div>
                    </div>

                    <button
                        className="md:hidden mt-8 w-full bg-primary text-black font-bold py-3 rounded-lg sticky bottom-0"
                        onClick={() => setIsFilterOpen(false)}
                    >
                        Show {filteredProducts.length} Result{filteredProducts.length !== 1 ? 's' : ''}
                    </button>
                </aside>

                {/* Product Grid */}
                <div className="flex-1">
                    <div className="flex justify-between items-center mb-6">
                        <h1 className="text-2xl font-bold font-heading">All Products</h1>
                        <select
                            value={sortOrder}
                            onChange={(e) => setSortOrder(e.target.value)}
                            className="bg-white dark:bg-[#121212] text-black dark:text-white border border-gray-300 dark:border-gray-700 rounded px-3 py-2 text-xs sm:text-sm focus:outline-none focus:border-primary"
                        >
                            <option value="default" className="text-xs sm:text-sm text-black dark:text-white bg-white dark:bg-[#121212]">Sort by: Featured</option>
                            <option value="lowToHigh" className="text-xs sm:text-sm text-black dark:text-white bg-white dark:bg-[#121212]">Price: Low to High</option>
                            <option value="highToLow" className="text-xs sm:text-sm text-black dark:text-white bg-white dark:bg-[#121212]">Price: High to Low</option>
                        </select>
                    </div>

                    {filteredProducts.length === 0 ? (
                        <div className="text-center py-20 text-gray-500">
                            No products found matching your filters.
                        </div>
                    ) : (
                        <div className="grid grid-cols-2 lg:grid-cols-3 gap-6">
                            {filteredProducts.map(product => (
                                <ProductCard key={product.ID} product={product} />
                            ))}
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

export default Shop;
