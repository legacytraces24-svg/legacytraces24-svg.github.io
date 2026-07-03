import React from 'react';
import { useFavorites } from '../context/FavoritesContext';
import ProductCard from '../components/ProductCard';
import { Link } from 'react-router-dom';

const Favorites = () => {
    const { favorites } = useFavorites();

    return (
        <div className="container mx-auto px-4 py-8">
            <h1 className="text-3xl font-heading font-bold mb-8">Your Favorites</h1>

            {favorites.length === 0 ? (
                <div className="text-center py-20">
                    <p className="text-xl text-gray-500 mb-4">You haven't added any favorites yet.</p>
                    <Link to="/shop" className="inline-block px-6 py-3 bg-primary text-black font-bold rounded-lg hover:bg-green-400 transition-colors">
                        Start Shopping
                    </Link>
                </div>
            ) : (
                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
                    {favorites.map(product => (
                        <ProductCard key={product.ID} product={product} />
                    ))}
                </div>
            )}
        </div>
    );
};

export default Favorites;
