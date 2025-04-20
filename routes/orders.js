import React, { useState, useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import axios from 'axios';
import { FaUtensils, FaSpinner } from 'react-icons/fa';

function Menu() {
  const location = useLocation();
  const navigate = useNavigate();
  const tableId = new URLSearchParams(location.search).get('table');
  const sessionToken = new URLSearchParams(location.search).get('session');
  const [menuItems, setMenuItems] = useState([]);
  const [cart, setCart] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    const fetchMenu = async () => {
      try {
        console.log('Fetching menu for table:', tableId, 'session:', sessionToken);
        const response = await axios.get(`${process.env.REACT_APP_API_URL}/api/menu`);
        console.log('Menu response:', response.data);
        setMenuItems(response.data);
      } catch (err) {
        console.error('Error fetching menu:', {
          message: err.message,
          response: err.response?.data,
          status: err.response?.status
        });
        setError('Failed to load menu. Please try again.');
      } finally {
        setIsLoading(false);
      }
    };
    fetchMenu();
  }, []);

  const addToCart = (item) => {
    setCart((prevCart) => {
      const existingItem = prevCart.find((cartItem) => cartItem._id === item._id);
      if (existingItem) {
        return prevCart.map((cartItem) =>
          cartItem._id === item._id
            ? { ...cartItem, quantity: cartItem.quantity + 1 }
            : cartItem
        );
      }
      return [...prevCart, { ...item, quantity: 1 }];
    });
  };

  const removeFromCart = (itemId) => {
    setCart((prevCart) => {
      const existingItem = prevCart.find((cartItem) => cartItem._id === itemId);
      if (existingItem.quantity > 1) {
        return prevCart.map((cartItem) =>
          cartItem._id === itemId
            ? { ...cartItem, quantity: cartItem.quantity - 1 }
            : cartItem
        );
      }
      return prevCart.filter((cartItem) => cartItem._id !== itemId);
    });
  };

  const placeOrder = async () => {
    if (cart.length === 0) {
      setError('Your cart is empty.');
      return;
    }

    setIsSubmitting(true);
    try {
      console.log('Placing order for table:', tableId, 'session:', sessionToken);
      const items = cart.map((item) => ({
        itemId: item._id,
        quantity: item.quantity
      }));
      const response = await axios.post(`${process.env.REACT_APP_API_URL}/api/orders`, {
        tableId: parseInt(tableId),
        items,
        sessionToken
      });
      console.log('Order response:', response.data);
      setCart([]);
      setError(null);
      console.log('Navigating to order-confirmation:', `/order-confirmation?table=${tableId}&session=${sessionToken}`);
      navigate(`/order-confirmation?table=${tableId}&session=${sessionToken}`);
    } catch (err) {
      console.error('Error placing order:', {
        message: err.message,
        response: err.response?.data,
        status: err.response?.status
      });
      const errorMessage = err.response?.data?.error || 'Failed to place order. Please try again.';
      setError(errorMessage);
      if (errorMessage.includes('session is')) {
        setError(`${errorMessage} Scan a new QR code to start a new session.`);
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  const categories = [...new Set(menuItems.map((item) => item.category))];

  return (
    <div className="min-h-screen bg-orange-50 p-4">
      <div className="container mx-auto">
        <h1 className="text-2xl sm:text-3xl font-bold mb-4 sm:mb-6 text-center flex items-center justify-center" style={{ color: '#92400e' }}>
          <FaUtensils className="mr-2" /> GSaheb Cafe - Table {tableId}
        </h1>
        {isLoading ? (
          <div className="text-center text-gray-600">
            <FaSpinner className="animate-spin text-3xl mb-4" />
            <p>Loading menu...</p>
          </div>
        ) : error ? (
          <div className="text-center text-red-600">
            <p>{error}</p>
            <button
              className="mt-4 px-4 py-2 rounded-lg text-white"
              style={{ backgroundColor: '#b45309' }}
              onClick={() => window.location.reload()}
            >
              Retry
            </button>
          </div>
        ) : (
          <>
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4 sm:gap-6">
              {categories.map((category) => (
                <div key={category} className="mb-8">
                  <h2 className="text-xl sm:text-2xl font-semibold mb-4 capitalize" style={{ color: '#92400e' }}>
                    {category}
                  </h2>
                  {menuItems
                    .filter((item) => item.category === category && item.isAvailable)
                    .map((item) => (
                      <div key={item._id} className="bg-white rounded-lg shadow-md p-4 mb-4 flex items-center">
                        {item.image && (
                          <img
                            src={`${process.env.REACT_APP_API_URL}${item.image}`}
                            alt={item.name}
                            className="w-16 h-16 sm:w-20 sm:h-20 object-cover rounded-lg mr-4"
                          />
                        )}
                        <div className="flex-1">
                          <h3 className="text-lg sm:text-xl font-semibold">{item.name}</h3>
                          <p className="text-gray-600 text-sm sm:text-base">{item.description}</p>
                          <p className="text-lg font-bold" style={{ color: '#92400e' }}>
                            ₹{item.price.toFixed(2)}
                          </p>
                          <button
                            className="mt-2 px-3 py-1 sm:px-4 sm:py-2 rounded-lg text-white text-sm sm:text-base"
                            style={{ backgroundColor: '#b45309' }}
                            onClick={() => addToCart(item)}
                          >
                            Add to Cart
                          </button>
                        </div>
                      </div>
                    ))}
                </div>
              ))}
            </div>
            {cart.length > 0 && (
              <div className="fixed bottom-0 left-0 right-0 bg-white p-4 shadow-lg sm:p-6">
                <h2 className="text-lg sm:text-xl font-semibold mb-4">Your Cart</h2>
                {cart.map((item) => (
                  <div key={item._id} className="flex justify-between items-center mb-2">
                    <span>
                      {item.name} (x{item.quantity})
                    </span>
                    <div className="flex items-center">
                      <button
                        className="px-2 py-1 text-white rounded-lg mr-2"
                        style={{ backgroundColor: '#b45309' }}
                        onClick={() => removeFromCart(item._id)}
                      >
                        -
                      </button>
                      <span>₹{(item.price * item.quantity).toFixed(2)}</span>
                      <button
                        className="px-2 py-1 text-white rounded-lg ml-2"
                        style={{ backgroundColor: '#b45309' }}
                        onClick={() => addToCart(item)}
                      >
                        +
                      </button>
                    </div>
                  </div>
                ))}
                <button
                  className="w-full mt-4 px-4 py-2 sm:py-3 rounded-lg text-white text-sm sm:text-base"
                  style={{ backgroundColor: '#92400e' }}
                  onClick={placeOrder}
                  disabled={isSubmitting}
                >
                  {isSubmitting ? 'Placing Order...' : `Place Order (₹${cart.reduce((total, item) => total + item.price * item.quantity, 0).toFixed(2)})`}
                </button>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}

export default Menu;