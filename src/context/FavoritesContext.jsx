import React, { createContext, useContext, useState, useEffect } from 'react';

const FavoritesContext = createContext();

export const FavoritesProvider = ({ children }) => {
    const [favorites, setFavorites] = useState([]);

    useEffect(() => {
        const savedFavorites = JSON.parse(localStorage.getItem('favorites')) || [];
        setFavorites(savedFavorites);
    }, []);

    const addToFavorites = (product) => {
        const updatedFavorites = [...favorites, product];
        setFavorites(updatedFavorites);
        localStorage.setItem('favorites', JSON.stringify(updatedFavorites));
    };

    const removeFromFavorites = (productId) => {
        const updatedFavorites = favorites.filter(item => item.ID !== productId);
        setFavorites(updatedFavorites);
        localStorage.setItem('favorites', JSON.stringify(updatedFavorites));
    };

    const isFavorite = (productId) => {
        return favorites.some(item => item.ID === productId);
    };

    const toggleFavorite = (product) => {
        if (isFavorite(product.ID)) {
            removeFromFavorites(product.ID);
        } else {
            addToFavorites(product);
        }
    };

    return (
        <FavoritesContext.Provider value={{ favorites, addToFavorites, removeFromFavorites, isFavorite, toggleFavorite }}>
            {children}
        </FavoritesContext.Provider>
    );
};

export const useFavorites = () => useContext(FavoritesContext);
