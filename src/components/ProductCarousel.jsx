import React, { useCallback } from 'react';
import useEmblaCarousel from 'embla-carousel-react';
import ProductCard from './ProductCard';
import { Link } from 'react-router-dom';

const ProductCarousel = ({ title, products = [] }) => {
    const [emblaRef] = useEmblaCarousel({
        align: 'start',
        containScroll: 'trimSnaps',
        dragFree: false,
        slidesToScroll: 1,
    });

    if (!products.length) return null;

    return (
        <section className="container mx-auto px-4 mt-8 md:mt-10">
            <div className="flex justify-between items-end mb-5 md:mb-6">
                <h2 className="text-2xl md:text-3xl font-heading font-black uppercase tracking-tight">{title}</h2>
                <Link to="/shop" className="text-primary font-bold hover:underline text-sm md:text-base uppercase tracking-wide">View All →</Link>
            </div>

            {/* Embla viewport */}
            <div className="overflow-hidden -mx-1" ref={emblaRef}>
                <div className="flex touch-pan-y">
                    {products.map((product) => (
                        <div
                            key={product.ID}
                            className="
                                flex-none pl-2
                                w-[48%]
                                sm:w-[38%]
                                md:w-[30%]
                                lg:w-[25%]
                            "
                        >
                            <ProductCard product={product} />
                        </div>
                    ))}
                </div>
            </div>
        </section>
    );
};

export default ProductCarousel;
