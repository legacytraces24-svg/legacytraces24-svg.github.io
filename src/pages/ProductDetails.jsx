import React, { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { fetchProductById, fetchProducts, fetchAvailableCoupons, getImageUrl } from '../api/api';
import { ShoppingCart, Heart, Share2, Truck, Plus, Minus, Tag } from 'lucide-react';
import { useFavorites } from '../context/FavoritesContext';
import { useCart } from '../context/CartContext';
import { useUser } from '../context/UserContext';
import SizeChartDrawer from '../components/SizeChartDrawer';
import ProductCard from '../components/ProductCard';
import SEO from '../components/SEO';
import SharePopup from '../components/SharePopup';
import FeedbackSection from '../components/FeedbackSection';
import { motion, AnimatePresence } from 'framer-motion';

const ProductDetails = () => {
    const { id } = useParams();
    const [product, setProduct] = useState(null);
    const [loading, setLoading] = useState(true);
    const [selectedSize, setSelectedSize] = useState('');
    const [quantity, setQuantity] = useState(1);
    const [currentImageIndex, setCurrentImageIndex] = useState(0);
    const [isSizeChartOpen, setIsSizeChartOpen] = useState(false);
    const [relatedProducts, setRelatedProducts] = useState([]);
    const [isShareOpen, setIsShareOpen] = useState(false);
    const [pincode, setPincode] = useState('');
    const [pincodeStatus, setPincodeStatus] = useState(null); // 'success', 'error', 'failure'
    const [showCartToast, setShowCartToast] = useState(false);
    const [loadError, setLoadError] = useState(false);
    const [offers, setOffers] = useState([]);
    const { isFavorite, toggleFavorite } = useFavorites();
    const { addToCart } = useCart();
    const { user } = useUser();

    const decreaseQty = () => setQuantity(q => Math.max(1, q - 1));
    const increaseQty = () => setQuantity(q => Math.min(10, q + 1));

    const handlePincodeChange = (e) => {
        const val = e.target.value;
        // Allow numbers only, max 6 digits
        if (/^\d*$/.test(val) && val.length <= 6) {
            setPincode(val);
            if (pincodeStatus) setPincodeStatus(null);
        }
    };

    const checkPincode = (e) => {
        e.preventDefault();
        if (!pincode || pincode.length < 6) {
            setPincodeStatus('error');
            return;
        }

        // Availability Logic: 6 digits starting with 1-9 is available
        // 6 digits starting with 0 is "not available" to show failure state
        if (pincode.startsWith('0')) {
            setPincodeStatus('failure');
        } else {
            setPincodeStatus('success');
        }
    };

    useEffect(() => {
        setLoading(true);
        setLoadError(false);
        // Extract ID if it's in the slug--ID format
        const productId = id.includes('--') ? id.split('--').pop() : id;

        fetchProductById(productId).then((data) => {
            setProduct(data);
            if (data) {
                setCurrentImageIndex(0);
                // Fetch related products — best-effort, never blocks the page
                fetchProducts().then((allProducts) => {
                    const related = allProducts.filter(p =>
                        p.ID !== data.ID && (p.Type === data.Type || p.Collection === data.Collection)
                    ).slice(0, 4);
                    setRelatedProducts(related);
                }).catch(() => {});
            }
            setLoading(false);
        }).catch(() => {
            setLoadError(true);
            setLoading(false);
        });
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [id]);

    // Promote any offers this product is currently eligible for — shown to
    // guests too (backend treats a logged-out shopper as a "New" customer for
    // eligibility purposes), so the incentive to buy is visible before login,
    // not just at checkout. Re-runs if the user logs in/out, so an "Existing
    // customer" coupon appears/disappears correctly once we know who's asking.
    // Best-effort teaser only — checkout re-validates for real.
    //
    // Query with a high sentinel cartTotal rather than this product's price: a
    // coupon's min_order_value is a real cart-total threshold (e.g. ₹500), and
    // most products here are priced under that on their own — using the
    // per-product price would wrongly hide an otherwise-eligible coupon just
    // because this one item alone doesn't clear the minimum. We only read
    // percentage/minOrderValue from the result here (never discountAmount), so
    // an inflated cartTotal is safe; the real cart total is re-checked at
    // checkout regardless.
    //
    // Doesn't depend on `product` (eligibility isn't product-specific) so it
    // fires immediately alongside the product fetch instead of waiting for it
    // to resolve first — avoids the offer box visibly popping in after
    // everything else has already rendered.
    useEffect(() => {
        let cancelled = false;
        fetchAvailableCoupons(user?.idToken || null, 100000)
            .then(res => { if (!cancelled) setOffers(res?.success ? res.coupons : []); })
            .catch(() => { if (!cancelled) setOffers([]); });
        return () => { cancelled = true; };
    }, [user?.idToken]);

    if (loading) return <div className="min-h-screen flex items-center justify-center">Loading...</div>;
    if (loadError) {
        return (
            <div className="min-h-screen flex flex-col items-center justify-center gap-4 text-center px-4">
                <p className="text-gray-500 dark:text-gray-400">Couldn't load this product. Please check your connection and try again.</p>
                <button onClick={() => window.location.reload()} className="bg-primary text-black font-bold px-6 py-2.5 rounded-lg hover:brightness-90 transition-all">
                    Retry
                </button>
            </div>
        );
    }
    if (!product) return <div className="min-h-screen flex items-center justify-center">Product not found</div>;

    const favorite = isFavorite(product.ID);

    // Consolidate all images
    const allImages = [
        getImageUrl(product['Primary Image']),
        ...(product['Gallery Images']
            ? product['Gallery Images'].split(',').map(imgId => getImageUrl(imgId.trim()))
            : [])
    ].filter(Boolean);

    // Default sizes
    const sizes = ["S", "M", "L", "XL", "XXL"];

    // Show only the single best offer this shopper qualifies for — `offers`
    // already comes back from the backend filtered to whichever coupons match
    // their New/Existing/All eligibility; pick the highest percentage among
    // those rather than listing every eligible code.
    const bestOffer = offers.length
        ? offers.reduce((best, o) => o.percentage > best.percentage ? o : best, offers[0])
        : null;

    return (
        <div className="container mx-auto px-2 md:px-4 py-4 md:py-8 mt-2 md:mt-8">
            <SEO
                title={`${product.Name} – Buy Online India`}
                description={`${product['Short description'] || product.Description || ''} Shop ${product.Name} at Legacy Traces. Premium Tamil culture streetwear. Fast delivery across India.`.slice(0, 155)}
                keywords={`${product.Name}, buy ${product.Type || 't-shirt'} online India, Tamil culture ${product.Type || 't-shirt'}, Legacy Traces, ${product.Collection || 'graphic tee'}`}
                image={allImages[0]}
                type="product"
                jsonLd={{
                    '@context': 'https://schema.org',
                    '@type': 'Product',
                    'name': product.Name,
                    'description': product['Short description'] || product.Description || '',
                    'image': allImages,
                    'sku': String(product.ID),
                    'brand': {
                        '@type': 'Brand',
                        'name': 'Legacy Traces'
                    },
                    'category': product.Type || 'T-Shirt',
                    'offers': {
                        '@type': 'Offer',
                        'url': `https://www.legacytraces.com/#/product/${product.ID}`,
                        'priceCurrency': 'INR',
                        'price': String(product.Price || ''),
                        'priceValidUntil': new Date(Date.now() + 90 * 86400000).toISOString().slice(0, 10),
                        'availability': 'https://schema.org/InStock',
                        'seller': { '@id': 'https://www.legacytraces.com/#organization' },
                        'shippingDetails': {
                            '@type': 'OfferShippingDetails',
                            'shippingRate': { '@type': 'MonetaryAmount', 'currency': 'INR', 'value': '0' },
                            'shippingDestination': { '@type': 'DefinedRegion', 'addressCountry': 'IN' }
                        }
                    },
                    'breadcrumb': {
                        '@type': 'BreadcrumbList',
                        'itemListElement': [
                            { '@type': 'ListItem', 'position': 1, 'name': 'Home',    'item': 'https://www.legacytraces.com/' },
                            { '@type': 'ListItem', 'position': 2, 'name': 'Shop',    'item': 'https://www.legacytraces.com/#/shop' },
                            { '@type': 'ListItem', 'position': 3, 'name': product.Name, 'item': `https://www.legacytraces.com/#/product/${product.ID}` }
                        ]
                    }
                }}
            />
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 md:gap-12">
                {/* Images */}
                <div className="space-y-4">
                    <div className="aspect-[4/5] rounded-2xl overflow-hidden bg-gray-100 dark:bg-gray-800">
                        <img
                            src={allImages[currentImageIndex]}
                            alt={`${product.Name} – Tamil Culture T-Shirt`}
                            className="w-full h-full object-cover"
                            referrerPolicy="no-referrer"
                        />
                    </div>
                    <div className="flex gap-2 md:gap-4 overflow-x-auto pb-2 scrollbar-hide">
                        {allImages.map((img, index) => (
                            <button
                                key={index}
                                type="button"
                                onClick={() => setCurrentImageIndex(index)}
                                className={`flex-shrink-0 w-24 h-24 rounded-lg overflow-hidden border-2 transition-all ${currentImageIndex === index ? 'border-primary ring-2 ring-primary/20' : 'border-transparent'}`}
                            >
                                <img src={img} alt={`Gallery ${index}`} className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                            </button>
                        ))}
                    </div>
                </div>

                {/* Info */}
                <div className="lg:pl-8">
                    <div className="flex justify-between items-start mb-2 md:mb-4">
                        <h1 className="text-2xl md:text-4xl font-heading font-bold">{product.Name}</h1>
                        <div className="relative">
                            <button
                                onClick={() => setIsShareOpen(!isShareOpen)}
                                className={`p-2 rounded-full transition-colors ${isShareOpen ? 'bg-primary text-black' : 'bg-gray-100 dark:bg-gray-800 text-gray-500 hover:text-black dark:hover:text-white'}`}
                            >
                                <Share2 size={24} />
                            </button>
                            <SharePopup
                                isOpen={isShareOpen}
                                onClose={() => setIsShareOpen(false)}
                                productName={product.Name}
                                productUrl={window.location.href}
                            />
                        </div>
                    </div>
                    <div className="mb-3 md:mb-6">
                        <div className="flex items-end gap-3">
                            <span className="text-2xl md:text-3xl font-bold text-primary">₹{product.Price}</span>
                            {product.MaxPrice > product.Price && (
                                <span className="text-base md:text-lg text-gray-400 line-through mb-0.5 md:mb-1">₹{product.MaxPrice}</span>
                            )}
                            {/* Badge reflects the best coupon this shopper qualifies for, not a
                                static catalog markdown — it's the actual incentive to buy now. */}
                            {bestOffer && (
                                <span className="text-xs md:text-sm font-bold text-green-600 dark:text-green-400 mb-0.5 md:mb-1">
                                    {bestOffer.percentage}% OFF
                                </span>
                            )}
                        </div>
                        {product.MaxPrice > product.Price && (
                            <p className="text-xs md:text-sm text-green-600 dark:text-green-400 font-semibold mt-1">
                                You save ₹{(product.MaxPrice - product.Price).toFixed(0)}
                            </p>
                        )}
                    </div>

                    {bestOffer && (
                        <div className="mb-4 md:mb-6 bg-primary/5 border border-dashed border-primary/40 rounded-2xl p-3 md:p-4 space-y-1.5">
                            <p className="text-xs font-bold uppercase tracking-wider text-primary flex items-center gap-1.5">
                                <Tag size={13} /> Extra offer available — apply at checkout
                            </p>
                            <p className="text-xs md:text-sm text-gray-600 dark:text-gray-300">
                                Use code <span className="font-bold text-black dark:text-white">{bestOffer.code}</span> for an extra {bestOffer.percentage}% off
                                {bestOffer.minOrderValue > 0 ? ` on orders above ₹${bestOffer.minOrderValue}` : ''}
                            </p>
                        </div>
                    )}

                    <p className="text-gray-600 dark:text-gray-300 mb-4 md:mb-8 leading-relaxed whitespace-pre-line text-sm md:text-base">
                        {product.Description || product['Short description']}
                    </p>

                    {/* Size Selector */}
                    <div className="mb-4 md:mb-6">
                        <div className="flex justify-between items-center mb-2 md:mb-3">
                            <span className="font-bold text-sm md:text-base">Select Size</span>
                            {(product.Type === 'T-Shirt' || product.Name.toLowerCase().includes('shirt')) && (
                                <button
                                    type="button"
                                    onClick={() => setIsSizeChartOpen(true)}
                                    className="text-xs md:text-sm text-primary underline cursor-pointer hover:opacity-80 transition-opacity"
                                >
                                    Size Chart
                                </button>
                            )}
                        </div>
                        <div className="flex flex-wrap gap-2 md:gap-3">
                            {sizes.map((size) => (
                                <button
                                    key={size}
                                    onClick={() => setSelectedSize(size)}
                                    className={`w-10 h-10 md:w-12 md:h-12 rounded-lg border-2 flex items-center justify-center font-bold text-sm transition-all
                    ${selectedSize === size
                                            ? 'border-primary bg-primary/10 text-primary'
                                            : 'border-gray-200 dark:border-gray-700 hover:border-gray-400'}`}
                                >
                                    {size}
                                </button>
                            ))}
                        </div>
                    </div>

                    {/* Quantity Selector */}
                    <div className="mb-4 md:mb-6">
                        <span className="font-bold text-sm md:text-base block mb-2 md:mb-3">Quantity</span>
                        <div className="flex items-center gap-3">
                            <button
                                type="button"
                                onClick={decreaseQty}
                                disabled={quantity <= 1}
                                className="w-9 h-9 md:w-10 md:h-10 rounded-lg border-2 border-gray-200 dark:border-gray-700 flex items-center justify-center text-gray-600 dark:text-gray-300 hover:border-primary hover:text-primary transition-all disabled:opacity-40 disabled:cursor-not-allowed"
                            >
                                <Minus size={16} />
                            </button>
                            <span className="w-8 text-center font-bold text-lg">{quantity}</span>
                            <button
                                type="button"
                                onClick={increaseQty}
                                disabled={quantity >= 10}
                                className="w-9 h-9 md:w-10 md:h-10 rounded-lg border-2 border-gray-200 dark:border-gray-700 flex items-center justify-center text-gray-600 dark:text-gray-300 hover:border-primary hover:text-primary transition-all disabled:opacity-40 disabled:cursor-not-allowed"
                            >
                                <Plus size={16} />
                            </button>
                            <span className="text-xs text-gray-400">(max 10)</span>
                        </div>
                    </div>

                    {/* Actions */}
                    <div className="space-y-2 md:space-y-3 mb-4 md:mb-8">
                        <div className="flex gap-3">
                            <button
                                disabled={!selectedSize}
                                onClick={() => {
                                    if (selectedSize) {
                                        addToCart(product, selectedSize, quantity);
                                        setShowCartToast(true);
                                        setTimeout(() => setShowCartToast(false), 3000);
                                    }
                                }}
                                className={`flex-1 font-bold py-3 md:py-4 rounded-xl flex items-center justify-center gap-2 transition-all text-sm md:text-base ${selectedSize
                                    ? 'bg-primary text-black hover:brightness-90'
                                    : 'bg-gray-200 dark:bg-gray-800 text-gray-400 cursor-not-allowed opacity-50'
                                    }`}
                            >
                                <ShoppingCart size={18} /> {selectedSize ? 'ADD TO CART' : 'SELECT SIZE'}
                            </button>
                            <button
                                onClick={() => toggleFavorite(product)}
                                className={`w-12 h-12 md:w-14 md:h-14 rounded-xl border-2 flex items-center justify-center transition-colors shrink-0
                    ${favorite ? 'border-red-500 text-red-500 bg-red-500/10' : 'border-gray-200 dark:border-gray-700 hover:border-gray-400'}`}
                            >
                                <Heart size={20} fill={favorite ? "currentColor" : "none"} />
                            </button>
                        </div>
                        {!selectedSize && (
                            <p className="text-red-500 text-xs md:text-sm font-medium">
                                Please select a size to add this product to your cart.
                            </p>
                        )}
                    </div>

                    {/* Delivery */}
                    <div className="bg-gray-50 dark:bg-gray-800/50 p-4 md:p-6 rounded-2xl mb-4 md:mb-8 border border-gray-100 dark:border-gray-700/50">
                        <div className="flex items-center gap-2 font-bold mb-4">
                            <Truck size={20} className="text-primary" /> Delivery Availability
                        </div>
                        <form onSubmit={checkPincode} className="flex gap-2 mb-4">
                            <input
                                type="text"
                                value={pincode}
                                onChange={handlePincodeChange}
                                placeholder="Enter Pincode"
                                className={`flex-1 bg-white dark:bg-gray-900 border rounded-xl px-4 py-3 focus:outline-none focus:ring-2 focus:ring-primary/20 transition-all ${pincodeStatus === 'error' ? 'border-red-500' : 'border-gray-200 dark:border-gray-700'
                                    }`}
                                maxLength={6}
                                inputMode="numeric"
                            />
                            <button
                                type="submit"
                                className="px-8 py-3 bg-black dark:bg-white text-white dark:text-black font-bold rounded-xl hover:opacity-90 transition-opacity whitespace-nowrap"
                            >
                                CHECK
                            </button>
                        </form>

                        <AnimatePresence mode="wait">
                            {pincodeStatus === 'error' && (
                                <motion.div
                                    key="error"
                                    initial={{ opacity: 0, y: -10 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    exit={{ opacity: 0, y: -10 }}
                                    className="flex items-center gap-2 text-red-500 font-medium text-sm"
                                >
                                    <span>⚠️ Please enter a valid 6-digit pincode</span>
                                </motion.div>
                            )}
                            {pincodeStatus === 'success' && (
                                <motion.div
                                    key="success"
                                    initial={{ opacity: 0, y: -10 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    exit={{ opacity: 0, y: -10 }}
                                    className="flex items-center gap-2 text-green-600 dark:text-green-400 font-medium text-sm"
                                >
                                    <span>🚚 Delivery available to this location ✅</span>
                                </motion.div>
                            )}
                            {pincodeStatus === 'failure' && (
                                <motion.div
                                    key="failure"
                                    initial={{ opacity: 0, y: -10 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    exit={{ opacity: 0, y: -10 }}
                                    className="space-y-1"
                                >
                                    <div className="flex items-center gap-2 text-amber-600 dark:text-amber-400 font-medium text-sm">
                                        <span>Delivery not available to this location 😔</span>
                                    </div>
                                    <p className="text-xs text-gray-500 dark:text-gray-400 pl-0">
                                        Please reach our <Link to="/contact" className="text-primary underline font-bold">customer support</Link> for more information
                                    </p>
                                </motion.div>
                            )}
                        </AnimatePresence>
                    </div>

                    {/* Share moved to top */}
                </div>
            </div>

            {/* Size Chart Drawer */}
            <SizeChartDrawer
                isOpen={isSizeChartOpen}
                onClose={() => setIsSizeChartOpen(false)}
                productType={['TY001', 'TY002', 'TY003'].includes(product.Type) ? 'T-Shirt' : product.Type}
            />

            {/* Others Also Bought Section — shown ABOVE feedback */}
            {relatedProducts.length > 0 && (
                <div className="mt-8 md:mt-16 border-t pt-6 md:pt-12">
                    <h2 className="text-xl md:text-3xl font-heading font-bold mb-4 md:mb-8">Related Products</h2>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-3 md:gap-6">
                        {relatedProducts.map((p) => (
                            <ProductCard key={p.ID} product={p} />
                        ))}
                    </div>
                </div>
            )}

            {/* Feedback & Ratings — shown BELOW related products */}
            <FeedbackSection productId={product.ID} />

            {/* Add to Cart Toast Container */}
            <div className="fixed top-24 left-0 right-0 md:left-auto md:right-8 z-50 flex justify-center md:justify-end pointer-events-none px-4">
                <AnimatePresence>
                    {showCartToast && (
                        <motion.div
                            initial={{ opacity: 0, y: -20 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, y: -20 }}
                            transition={{ duration: 0.3 }}
                            className="bg-white dark:bg-gray-800 text-black dark:text-white px-6 py-4 rounded-xl shadow-xl border border-gray-100 dark:border-gray-700 pointer-events-auto flex items-center gap-3"
                        >
                            <span className="text-xl">✅</span>
                            <span className="font-medium text-sm md:text-base">Product added to cart successfully</span>
                        </motion.div>
                    )}
                </AnimatePresence>
            </div>
        </div>
    );
};

export default ProductDetails;
