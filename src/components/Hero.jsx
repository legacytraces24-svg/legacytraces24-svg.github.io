import React, { useEffect, useState } from 'react';
import { Swiper, SwiperSlide } from 'swiper/react';
import { Autoplay, Pagination, Navigation } from 'swiper/modules';
import 'swiper/css';
import 'swiper/css/pagination';
import 'swiper/css/navigation';
import { fetchBanners } from '../api/api';
import { useNavigate } from 'react-router-dom';
import { containsCSSVariable } from 'framer-motion';

// Helper to extract Drive ID and format URL safely
const getBannerImageUrl = (imgStr) => {
    if (!imgStr) return '';
    let id = imgStr;
    const match = imgStr.match(/[-\w]{25,}/);
    if (match) {
        id = match[0];
    }
    
    // Temporarily log URL for debugging
    const url = `https://lh3.googleusercontent.com/d/${id}`;
    console.log('Generated Banner Image URL:', url);
    return url;
};

const Hero = () => {
    const [banners, setBanners] = useState([]);
    const [loading, setLoading] = useState(true);
    const navigate = useNavigate();

    useEffect(() => {
        let isMounted = true;
        fetchBanners()
            .then((data) => {
                if (!isMounted) return;
                let activeBanners = [];
                if (data && Array.isArray(data)) {
                    activeBanners = data
                        .filter(b => b.Active === true || b.Active === 'TRUE' || b.Active === 'true' || b.Active === 1)
                        .sort((a, b) => {
                            const orderA = parseInt(a.Order) || 99;
                            const orderB = parseInt(b.Order) || 99;
                            return orderA - orderB;
                        });
                }
                setBanners(activeBanners);
                setLoading(false);
            })
            .catch((err) => {
                console.error("Failed to fetch banners", err);
                if (isMounted) setLoading(false);
            });
            
        return () => {
            isMounted = false;
        };
    }, []);

    // Handle Loading Skeleton
    if (loading) {
        return (
            <div className="container mx-auto px-4 mt-6">
                <div className="w-full h-[300px] md:h-[400px] lg:h-[500px] bg-gray-200 dark:bg-gray-800 rounded-2xl animate-pulse"></div>
            </div>
        );
    }

    console.log("Banners:", banners);

    // Fallback if API fails or returns no active banners
    if (banners.length === 0) {
        return (
            <div className="container mx-auto px-4 mt-6">
                <div className="relative w-full min-h-[380px] md:min-h-[460px] lg:min-h-[540px] rounded-2xl overflow-hidden flex items-end justify-start bg-gradient-to-b from-sky-300 via-sky-200 to-white dark:from-sky-900 dark:via-slate-900 dark:to-[#121212] border border-gray-200 dark:border-gray-800">
                    {/* Decorative cloud blobs */}
                    <div className="absolute -top-10 -left-10 w-56 h-56 bg-white/60 dark:bg-white/5 rounded-full blur-2xl pointer-events-none" />
                    <div className="absolute bottom-0 right-0 w-72 h-40 bg-white/50 dark:bg-white/5 rounded-full blur-2xl pointer-events-none" />

                    {/* Corner meta labels */}
                    <span className="absolute top-5 left-5 md:top-8 md:left-8 text-xs md:text-sm font-semibold text-black/60 dark:text-white/60 uppercase tracking-widest">Legacy 2026</span>
                    <span className="absolute top-5 right-5 md:top-8 md:right-8 text-xs md:text-sm font-semibold text-black/60 dark:text-white/60 uppercase tracking-widest">Community</span>

                    {/* Solid scrim (no blur) so text stays readable over the sky gradient */}
                    <div className="absolute inset-x-0 bottom-0 h-2/3 bg-gradient-to-t from-white via-white/80 to-transparent dark:from-black dark:via-black/70 pointer-events-none" />

                    <div className="relative text-left px-6 md:px-10 pb-8 md:pb-12 pt-6 max-w-2xl">
                        <h2 className="font-heading font-black uppercase leading-[0.95] tracking-tight text-4xl sm:text-5xl md:text-7xl lg:text-8xl mb-6 text-black dark:text-white">
                            New <span className="text-primary">Collection</span>
                        </h2>
                        <p className="text-black/70 dark:text-gray-300 mb-8 max-w-lg text-sm md:text-base">
                            Discover the latest trends in Tamil inspired streetwear. Bold, authentic, and premium.
                        </p>
                        <button onClick={() => navigate('/shop')} className="bg-primary text-black px-8 py-3.5 rounded-full font-bold uppercase tracking-wide hover:brightness-90 transition-all shadow-lg shadow-black/10 inline-flex items-center gap-2">
                            Explore Collection →
                        </button>
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className="container mx-auto px-4 mt-6">
            <div className="rounded-2xl overflow-hidden shadow-xl relative group hero-container bg-gray-100 dark:bg-gray-900 border border-gray-100 dark:border-gray-800">
                <Swiper
                    spaceBetween={0}
                    centeredSlides={true}
                    speed={800}
                    loop={banners.length > 1}
                    autoplay={{
                        delay: 4000,
                        disableOnInteraction: false,
                    }}
                    pagination={{
                        clickable: true,
                        dynamicBullets: true,
                    }}
                    navigation={false}
                    modules={[Autoplay, Pagination]}
                    className="mySwiper h-[300px] md:h-[400px] lg:h-[500px] w-full"
                >
                    {banners.filter(b => b.Image).map((banner, index) => {
                        // Safe Redirection Path
                        let redirectPath = banner.Redirection || '/shop';
                        if (!redirectPath.startsWith('/')) {
                            redirectPath = '/' + redirectPath; // Ensure it's a relative path just in case
                        }

                        const imgUrl = getBannerImageUrl(banner.Image);
                        console.log(imgUrl)
                        if (!imgUrl) return null;

                        return (
                            <SwiperSlide key={banner.ID || index}>
                                <div 
                                    onClick={() => navigate(redirectPath)}
                                    className="relative w-full h-full block cursor-pointer group/slide overflow-hidden"
                                >
                                    {/* Image with preloading for first slide */}
                                    <img 
                                        src={'https://lh3.googleusercontent.com/d/' + banner.Image} 
                                        alt={banner.Title || `Banner ${index + 1}`} 
                                        className="w-full h-full object-cover transition-transform duration-[2000ms] ease-out group-hover/slide:scale-105" 
                                        loading={index === 0 ? "eager" : "lazy"} 
                                        fetchpriority={index === 0 ? "high" : "auto"}
                                        onError={(e) => {
                                            e.target.onerror = null;
                                            e.target.src = 'https://placehold.co/1920x500/111/FFF?text=Image+Load+Failed';
                                        }}
                                    />
                                    
                                    {/* Premium Gradient Overlay — solid scrim (no blur), strong enough for any image */}
                                    <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/50 to-transparent flex flex-col justify-end p-6 md:p-12 lg:p-16 pb-8 md:pb-14 pointer-events-none">
                                        <div className="max-w-3xl transform translate-y-2 group-hover/slide:translate-y-0 transition-transform duration-500 ease-out">
                                            {/* Text Overlay */}
                                            <h2 className="text-3xl md:text-5xl lg:text-6xl font-heading font-bold mb-3 md:mb-4 text-white drop-shadow-[0_2px_8px_rgba(0,0,0,0.8)]">
                                                {banner.BannerText1 || "Legacy Traces Collection"}
                                            </h2>
                                            <p className="text-sm md:text-lg lg:text-xl mb-6 md:mb-8 text-gray-100 line-clamp-2 md:line-clamp-none drop-shadow-[0_2px_6px_rgba(0,0,0,0.8)]">
                                                {banner.BannerText2 || "Premium Tamil streetwear built to last. Wear your culture."}
                                            </p>

                                            {/* CTA Button */}
                                            <span className="inline-block bg-primary text-black px-6 md:px-8 py-2 md:py-3 rounded-xl font-bold transition-all duration-300 shadow-lg shadow-primary/20 pointer-events-auto hover:brightness-90">
                                                {banner.ButtonText || "Shop Now"}
                                            </span>
                                        </div>
                                    </div>
                                </div>
                            </SwiperSlide>
                        );
                    })}
                </Swiper>
            </div>
        </div>
    );
};

export default Hero;
