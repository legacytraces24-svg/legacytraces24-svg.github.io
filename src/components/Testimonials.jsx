import React, { useEffect, useState } from 'react';
import useEmblaCarousel from 'embla-carousel-react';
import Autoplay from 'embla-carousel-autoplay';
import { Star } from 'lucide-react';
import staticTestimonials from '../data/testimonials.json';
import { fetchTestimonials } from '../api/api';

const Testimonials = () => {
    const [testimonials, setTestimonials] = useState(staticTestimonials);

    useEffect(() => {
        fetchTestimonials(8).then(data => {
            if (data.length > 0) {
                setTestimonials(data.map((t, i) => {
                    let name = t.name || '';
                    if (name.includes('@')) {
                        const local = name.split('@')[0];
                        name = local
                            .replace(/[^a-zA-Z0-9]+/g, ' ')
                            .split(' ').filter(Boolean)
                            .map(w => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase())
                            .join(' ') || 'Verified Buyer';
                    }
                    return {
                        id:       i + 1,
                        name:     name || 'Verified Buyer',
                        location: 'Verified Buyer',
                        rating:   5,
                        text:     t.text,
                        image:    null,
                    };
                }));
            }
        }).catch(() => { /* keep static fallback */ });
    }, []);

    const [emblaRef] = useEmblaCarousel(
        {
            align: 'start',
            containScroll: 'trimSnaps',
            dragFree: false,
            loop: true,
        },
        [Autoplay({ delay: 5000, stopOnInteraction: false })]
    );

    return (
        <section className="container mx-auto px-4 mt-10 mb-10 md:mt-14 md:mb-14">
            <div className="text-center mb-8 md:mb-10">
                <h2 className="text-3xl md:text-4xl font-heading font-bold mb-4">Loved by Our Community</h2>
                <p className="text-gray-600 dark:text-gray-400 font-sans">Real stories from people who wear our culture.</p>
            </div>

            {/* Embla viewport */}
            <div className="overflow-hidden -mx-2" ref={emblaRef}>
                <div className="flex touch-pan-y">
                    {testimonials.slice(0, 7).map((testimonial) => (
                        <div
                            key={testimonial.id}
                            className="
                                flex-none px-2
                                w-[85%]
                                sm:w-[50%]
                                lg:w-[33.333%]
                            "
                        >
                            <div className="bg-white dark:bg-gray-800 p-6 md:p-8 rounded-2xl shadow-[0_4px_20px_rgba(0,0,0,0.06)] h-full flex flex-col items-center text-center">
                                <div className="flex mb-4">
                                    {[...Array(5)].map((_, i) => (
                                        <Star
                                            key={i}
                                            className={`w-5 h-5 ${i < testimonial.rating ? 'fill-primary text-primary' : 'text-gray-300'}`}
                                        />
                                    ))}
                                </div>

                                <p className="text-gray-700 dark:text-gray-300 italic mb-6 line-clamp-3 min-h-[4rem]" title={testimonial.text}>"{testimonial.text}"</p>

                                <div className="mt-auto flex flex-col items-center">
                                    {testimonial.image && (
                                        <img
                                            src={testimonial.image}
                                            alt={testimonial.name}
                                            className="w-14 h-14 rounded-full object-cover mb-3 grayscale hover:grayscale-0 transition-all duration-300 border-2 border-primary/10"
                                        />
                                    )}
                                    <h4 className="font-heading font-bold text-gray-900 dark:text-white">{testimonial.name}</h4>
                                    {testimonial.location && (
                                        <span className="text-sm text-gray-500">{testimonial.location}</span>
                                    )}
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            </div>
        </section>
    );
};

export default Testimonials;
