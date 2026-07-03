import React from 'react';
import { useCart } from '../context/CartContext';
import { Trash2, Plus, Minus, ShoppingBag } from 'lucide-react';
import { getImageUrl } from '../api/api';
import { Link } from 'react-router-dom';

const Cart = () => {
    const { cartItems, removeFromCart, updateQuantity, getCartTotal, clearCart } = useCart();

    if (cartItems.length === 0) {
        return (
            <div className="min-h-[60vh] flex flex-col items-center justify-center gap-4">
                <ShoppingBag size={64} className="text-gray-300" />
                <h2 className="text-2xl font-bold text-gray-500">Your cart is empty</h2>
                <Link to="/shop" className="px-6 py-3 bg-primary text-black font-bold rounded-lg hover:bg-green-400 transition-colors">
                    Start Shopping
                </Link>
            </div>
        );
    }

    return (
        <div className="container mx-auto px-4 py-8">
            <h1 className="text-3xl font-bold font-heading mb-8">Shopping Cart</h1>

            <div className="bg-white dark:bg-[#1e1e1e] rounded-xl shadow-sm overflow-hidden border border-gray-200 dark:border-gray-800">
                <div className="overflow-x-auto">
                    <table className="w-full text-left">
                        <thead className="bg-gray-50 dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700">
                            <tr>
                                <th className="p-4 font-bold text-sm uppercase tracking-wider">Product</th>
                                <th className="p-4 font-bold text-sm uppercase tracking-wider">Size</th>
                                <th className="p-4 font-bold text-sm uppercase tracking-wider">Price</th>
                                <th className="p-4 font-bold text-sm uppercase tracking-wider">Quantity</th>
                                <th className="p-4 font-bold text-sm uppercase tracking-wider">Total</th>
                                <th className="p-4 font-bold text-sm uppercase tracking-wider">Actions</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-200 dark:divide-gray-800">
                            {cartItems.map((item) => (
                                <tr key={`${item.id}-${item.size}`} className="hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors">
                                    <td className="p-4">
                                        <div className="flex items-center gap-4">
                                            <div className="w-16 h-16 rounded-lg overflow-hidden bg-gray-100 flex-shrink-0">
                                                <img
                                                    src={getImageUrl(item['Primary Image'])}
                                                    alt={item.Name}
                                                    className="w-full h-full object-cover"
                                                    referrerPolicy="no-referrer"
                                                />
                                            </div>
                                            <span className="font-medium">{item.Name}</span>
                                        </div>
                                    </td>
                                    <td className="p-4 font-medium">{item.size}</td>
                                    <td className="p-4">₹{item.Price}</td>
                                    <td className="p-4">
                                        <div className="flex items-center gap-2">
                                            <button
                                                onClick={() => updateQuantity(item.id, item.size, item.quantity - 1)}
                                                className="p-1 rounded-md hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors"
                                                disabled={item.quantity <= 1}
                                            >
                                                <Minus size={16} />
                                            </button>
                                            <span className="w-8 text-center font-medium">{item.quantity}</span>
                                            <button
                                                onClick={() => updateQuantity(item.id, item.size, item.quantity + 1)}
                                                className="p-1 rounded-md hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors"
                                            >
                                                <Plus size={16} />
                                            </button>
                                        </div>
                                    </td>
                                    <td className="p-4 font-bold">₹{item.Price * item.quantity}</td>
                                    <td className="p-4">
                                        <button
                                            onClick={() => removeFromCart(item.id, item.size)}
                                            className="text-red-500 hover:text-red-600 transition-colors p-2 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg"
                                        >
                                            <Trash2 size={20} />
                                        </button>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>

            <div className="mt-8 flex flex-col items-end gap-4">
                <div className="bg-white dark:bg-[#1e1e1e] p-6 rounded-xl shadow-sm border border-gray-200 dark:border-gray-800 w-full md:w-96">
                    <div className="flex justify-between items-center mb-4 text-lg font-bold">
                        <span>Total</span>
                        <span className="text-primary">₹{getCartTotal()}</span>
                    </div>
                    <p className="text-xs text-gray-500 mb-6">Shipping and taxes calculated at checkout.</p>
                    <Link
                        to="/checkout"
                        className="w-full py-4 bg-primary text-black font-bold rounded-xl hover:bg-green-400 transition-colors flex items-center justify-center gap-2 text-center"
                    >
                        PROCEED TO CHECKOUT
                    </Link>
                </div>
            </div>
        </div>
    );
};

export default Cart;
