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
                <div className="w-full h-[300px] md:h-[400px] lg:h-[500px] bg-gray-100 dark:bg-[#1a1a1a] rounded-2xl flex items-center justify-center border border-gray-200 dark:border-gray-800">
                    <div className="text-center p-8">
                        <h2 className="text-3xl md:text-5xl font-heading font-bold mb-4">New Collection</h2>
                        <p className="text-gray-600 dark:text-gray-400 mb-6 max-w-lg mx-auto">Discover the latest trends in Tamil inspired streetwear. Bold, authentic, and premium.</p>
                        <button onClick={() => navigate('/shop')} className="bg-primary text-black px-8 py-3 rounded-lg font-bold hover:bg-green-400 transition-colors">
                            Shop Now
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
                                    
                                    {/* Premium Gradient Overlay */}
                                    <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/30 to-transparent flex flex-col justify-end p-6 md:p-12 lg:p-16 text-white pb-10 md:pb-16 pointer-events-none">
                                        <div className="max-w-3xl transform translate-y-2 group-hover/slide:translate-y-0 transition-transform duration-500 ease-out">
                                            {/* Text Overlay */}
                                            <h2 className="text-3xl md:text-5xl lg:text-6xl font-heading font-bold mb-3 md:mb-4 drop-shadow-2xl text-white">
                                                {banner.BannerText1 || "Legacy Traces Collection"}
                                            </h2>
                                            <p className="text-sm md:text-lg lg:text-xl mb-6 md:mb-8 drop-shadow-xl text-gray-200 line-clamp-2 md:line-clamp-none">
                                                {banner.BannerText2 || "Premium Tamil streetwear built to last. Wear your culture."}
                                            </p>
                                            
                                            {/* CTA Button */}
                                            <span className="inline-block bg-primary text-black px-6 md:px-8 py-2 md:py-3 rounded-xl font-bold transition-all duration-300 shadow-lg shadow-primary/20 pointer-events-auto hover:bg-green-400">
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
