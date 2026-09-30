import React, { createContext, useContext, useMemo, useState } from 'react';

const CartContext = createContext(null);

// Holds the order being built, shared by Home, Cart and Checkout.
// It lives in memory only: closing the app empties the cart.
export function CartProvider({ children }) {
  const [items, setItems] = useState([]);
  const [note, setNote] = useState('');

  const value = useMemo(() => {
    const changeQuantity = (id, change) => {
      setItems((current) =>
        current.map((item) =>
          item.id === id
            ? { ...item, quantity: Math.max(1, item.quantity + change) }
            : item
        )
      );
    };

    return {
      items,
      note,
      setNote,

      // `product` is a product card: { id, name, price, image, isBulk }.
      addItem: (product) => {
        setItems((current) => {
          const existing = current.find((item) => item.id === product.id);

          if (existing) {
            return current.map((item) =>
              item.id === product.id
                ? { ...item, quantity: item.quantity + 1 }
                : item
            );
          }

          return [
            ...current,
            {
              id: product.id,
              name: product.name,
              price: product.price,
              image: product.image,
              isBulk: product.isBulk,
              quantity: 1,
            },
          ];
        });
      },

      increaseQuantity: (id) => changeQuantity(id, 1),
      decreaseQuantity: (id) => changeQuantity(id, -1),

      removeItem: (id) => {
        setItems((current) => current.filter((item) => item.id !== id));
      },

      clear: () => {
        setItems([]);
        setNote('');
      },

      // Shown to the customer only. The backend recalculates every total.
      subtotal: items.reduce(
        (total, item) => total + item.price * item.quantity,
        0
      ),
    };
  }, [items, note]);

  return <CartContext.Provider value={value}>{children}</CartContext.Provider>;
}

export function useCart() {
  const cart = useContext(CartContext);

  if (cart === null) {
    throw new Error('useCart must be used inside a CartProvider');
  }

  return cart;
}
