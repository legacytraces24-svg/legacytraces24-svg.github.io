import React, { useEffect, useState } from 'react';
import Hero from '../components/Hero';
import ProductCarousel from '../components/ProductCarousel';
import Testimonials from '../components/Testimonials';
import WhyChooseUs from '../components/WhyChooseUs';
import { fetchProducts } from '../api/api';
import SEO from '../components/SEO';

const Home = () => {
    const [products, setProducts] = useState([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        fetchProducts().then(data => {
            setProducts(data);
            setLoading(false);
        });
    }, []);

    if (loading) {
        return (
            <div className="min-h-screen flex items-center justify-center">
                <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary"></div>
            </div>
        );
    }

    // Sort products by 'Order' ascending for Trending
    const trendingProducts = [...products].sort((a, b) => {
        const orderA = a.Order !== null && a.Order !== undefined ? a.Order : Infinity;
        const orderB = b.Order !== null && b.Order !== undefined ? b.Order : Infinity;
        return orderA - orderB;
    });

    return (
        <main>
            <SEO
                title="Tamil Culture T-Shirts, Hoodies &amp; Custom Streetwear Online"
                description="Shop authentic Tamil culture graphic t-shirts &amp; oversized hoodies at Legacy Traces. Premium streetwear celebrating Tamil heritage. Design your own custom t-shirt online. Free shipping above ₹499."
                keywords="Tamil culture t-shirts, graphic tees India, buy t-shirts online India, oversized t-shirts, Tamil streetwear, custom t-shirt shop"
                jsonLd={{
                    '@context': 'https://schema.org',
                    '@type': 'WebPage',
                    '@id': 'https://www.legacytraces.com/#webpage',
                    'name': 'Legacy Traces – Tamil Culture T-Shirts & Custom Streetwear',
                    'url': 'https://www.legacytraces.com/',
                    'description': 'Premium Tamil culture streetwear – t-shirts, hoodies and custom design online.',
                    'isPartOf': { '@id': 'https://www.legacytraces.com/#website' },
                    'about': { '@id': 'https://www.legacytraces.com/#organization' },
                    'breadcrumb': {
                        '@type': 'BreadcrumbList',
                        'itemListElement': [{ '@type': 'ListItem', 'position': 1, 'name': 'Home', 'item': 'https://www.legacytraces.com/' }]
                    }
                }}
            />
            <h1 className="sr-only">Legacy Traces – Premium Tamil Culture Streetwear</h1>
            <Hero />
            <ProductCarousel title="Trending Now" products={trendingProducts} />
            <ProductCarousel title="New Arrivals" products={products} />
            <Testimonials />
            <WhyChooseUs />
            {/* <ProductCarousel title="Best Sellers" products={products} /> */}
        </main>
    );
};

export default Home;
