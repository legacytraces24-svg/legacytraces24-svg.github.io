import React from 'react';
import { ShoppingCart, Heart } from 'lucide-react';
import { Link } from 'react-router-dom';
import { useFavorites } from '../context/FavoritesContext';
import { getImageUrl } from '../api/api';
import { slugify } from '../utils/seoUtils';

const ProductCard = ({ product }) => {
    const { isFavorite, toggleFavorite } = useFavorites();
    const favorite = isFavorite(product.ID);

    return (
        <div className="group bg-white dark:bg-[#1e1e1e] rounded-xl overflow-hidden border border-gray-200 dark:border-gray-800 transition-all duration-300 hover:-translate-y-1 hover:shadow-lg relative h-full flex flex-col">
            <button
                onClick={(e) => {
                    e.preventDefault();
                    toggleFavorite(product);
                }}
                className={`absolute top-3 right-3 z-10 p-2 rounded-full bg-white/80 dark:bg-black/50 backdrop-blur-sm transition-colors ${favorite ? 'text-red-500' : 'text-gray-500 hover:text-red-500'}`}
            >
                <Heart size={18} fill={favorite ? "currentColor" : "none"} />
            </button>

            <Link to={`/product/${slugify(product.Name)}--${product.ID}`} className="block relative pt-[125%] overflow-hidden group/img">
                <img
                    src={getImageUrl(product['Primary Image'])}
                    alt={`${product.Name} – Tamil Culture T-Shirt`}
                    className="absolute top-0 left-0 w-full h-full object-cover transition-transform duration-700 group-hover/img:scale-110"
                    loading="lazy"
                    referrerPolicy="no-referrer"
                />
                {/* Desktop Hover Overlay */}
                <div className="absolute inset-0 bg-black/5 opacity-0 group-hover/img:opacity-100 transition-opacity duration-300 hidden md:flex items-center justify-center">
                    <span className="bg-white text-black px-6 py-2 rounded-full font-bold shadow-lg transform translate-y-4 group-hover/img:translate-y-0 transition-transform duration-300">
                        View Product
                    </span>
                </div>
            </Link>

            <div className="p-4 flex flex-col flex-grow">
                <Link to={`/product/${slugify(product.Name)}--${product.ID}`} className="block">
                    <h3 className="font-heading font-bold text-lg mb-2 truncate group-hover:text-primary transition-colors">{product.Name}</h3>
                </Link>

                <div className="flex items-center justify-between mt-auto mb-4">
                    <div className="flex items-baseline gap-2">
                        <span className="font-bold text-lg">₹{product.Price}</span>
                    </div>
                </div>

                {/* Mobile View Product Button */}
                <Link
                    to={`/product/${slugify(product.Name)}--${product.ID}`}
                    className="md:hidden w-full py-3 bg-black dark:bg-white text-white dark:text-black font-bold rounded-lg flex items-center justify-center gap-2 hover:opacity-90 transition-opacity"
                >
                    View Product
                </Link>
            </div>
        </div>
    );
};

export default ProductCard;
