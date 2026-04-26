"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useMemo, useState } from "react";

const CART_KEY = "tha-core-store-cart";
const PHONE = "18768842867";

type CartItem = {
  id: string;
  name: string;
  category: string;
  priceUsd: number;
  priceJmd: number;
  description: string;
  image: string;
  quantity: number;
  color?: string;
  size?: string;
};

function formatJMD(price: number) {
  return `JMD $${price.toLocaleString()}`;
}

function formatUSD(price: number) {
  return `USD $${price.toFixed(2)}`;
}

function loadCart(): CartItem[] {
  if (typeof window === "undefined") return [];

  const raw = localStorage.getItem(CART_KEY);
  if (!raw) return [];

  try {
    return JSON.parse(raw) as CartItem[];
  } catch {
    return [];
  }
}

function saveCart(cart: CartItem[]) {
  if (typeof window === "undefined") return;
  localStorage.setItem(CART_KEY, JSON.stringify(cart));
}

function CartImage({ src, alt }: { src: string; alt: string }) {
  const [error, setError] = useState(false);

  if (error) {
    return (
      <div className="flex h-full w-full items-center justify-center bg-white text-xs font-semibold text-zinc-500">
        No Image
      </div>
    );
  }

  return (
    <Image
      src={src}
      alt={alt}
      fill
      sizes="120px"
      className="object-cover scale-[1.2]"
      onError={() => setError(true)}
    />
  );
}

export default function StoreCartPage() {
  const [cart, setCart] = useState<CartItem[]>([]);
  const [cartLoaded, setCartLoaded] = useState(false);
  const [status, setStatus] = useState("Cart ready.");

  const [checkoutForm, setCheckoutForm] = useState({
    customerName: "",
    customerPhone: "",
    deliveryArea: "",
    deliveryMethod: "Pickup",
    paymentMethod: "Cash on Delivery",
    notes: "",
  });

  useEffect(() => {
    setCart(loadCart());
    setCartLoaded(true);
  }, []);

  useEffect(() => {
    if (!cartLoaded) return;
    saveCart(cart);
  }, [cart, cartLoaded]);

  const orderId = useMemo(() => {
    return `CORE-${Date.now().toString().slice(-6)}`;
  }, []);

  const totalJmd = useMemo(() => {
    return cart.reduce((sum, item) => sum + item.priceJmd * item.quantity, 0);
  }, [cart]);

  const totalUsd = useMemo(() => {
    return cart.reduce((sum, item) => sum + item.priceUsd * item.quantity, 0);
  }, [cart]);

  const itemCount = useMemo(() => {
    return cart.reduce((sum, item) => sum + item.quantity, 0);
  }, [cart]);

  const updateCheckoutForm = (
    field: keyof typeof checkoutForm,
    value: string
  ) => {
    setCheckoutForm((prev) => ({
      ...prev,
      [field]: value,
    }));
  };

  const increaseQty = (target: CartItem) => {
    setCart((prev) =>
      prev.map((item) =>
        item.id === target.id &&
        item.color === target.color &&
        item.size === target.size
          ? { ...item, quantity: item.quantity + 1 }
          : item
      )
    );
  };

  const decreaseQty = (target: CartItem) => {
    setCart((prev) =>
      prev
        .map((item) =>
          item.id === target.id &&
          item.color === target.color &&
          item.size === target.size
            ? { ...item, quantity: Math.max(0, item.quantity - 1) }
            : item
        )
        .filter((item) => item.quantity > 0)
    );
  };

  const removeItem = (target: CartItem) => {
    setCart((prev) =>
      prev.filter(
        (item) =>
          !(
            item.id === target.id &&
            item.color === target.color &&
            item.size === target.size
          )
      )
    );

    setStatus("Item removed.");
  };

  const clearCart = () => {
    setCart([]);
    setStatus("Cart cleared.");
  };

  const sendWhatsAppOrder = () => {
    if (cart.length === 0) {
      setStatus("Your cart is empty.");
      return;
    }

    if (!checkoutForm.customerName.trim()) {
      setStatus("Please enter customer name.");
      return;
    }

    if (!checkoutForm.customerPhone.trim()) {
      setStatus("Please enter customer phone.");
      return;
    }

    const itemsText = cart
      .map((item, index) => {
        const lineJmd = item.priceJmd * item.quantity;
        const lineUsd = item.priceUsd * item.quantity;

        return `${index + 1}. ${item.name}
Category: ${item.category}
Color / Option: ${item.color || "Default"}
Size / Package: ${item.size || "Standard"}
Quantity: ${item.quantity}
Price Each: ${formatJMD(item.priceJmd)} / ${formatUSD(item.priceUsd)}
Line Total: ${formatJMD(lineJmd)} / ${formatUSD(lineUsd)}`;
      })
      .join("\n\n");

    const message = `Blessings, I want to place an order.

Order ID: ${orderId}

CUSTOMER DETAILS:
Name: ${checkoutForm.customerName}
Phone: ${checkoutForm.customerPhone}
Delivery Area: ${checkoutForm.deliveryArea}
Delivery Method: ${checkoutForm.deliveryMethod}
Payment Method: ${checkoutForm.paymentMethod}
Notes: ${checkoutForm.notes}

ITEMS:
${itemsText}

ORDER TOTAL:
${formatJMD(totalJmd)} / ${formatUSD(totalUsd)}

Payment Options:
- Cash on Delivery
- Bank Transfer
- PayPal
- WiPay / Lynk

Please confirm availability and payment instructions.`;

    window.open(
      `https://wa.me/${PHONE}?text=${encodeURIComponent(message)}`,
      "_blank"
    );

    setStatus("WhatsApp order opened.");
  };

  return (
    <main className="min-h-screen bg-black text-white">
      <div className="mx-auto max-w-7xl px-4 py-6 lg:px-6">
        <div className="mb-5 flex flex-wrap gap-3">
          <Link
            href="/store"
            className="rounded-2xl border border-white/10 px-5 py-3 font-semibold hover:bg-white/5"
          >
            Back To Store
          </Link>

          <Link
            href="/"
            className="rounded-2xl border border-white/10 px-5 py-3 font-semibold hover:bg-white/5"
          >
            Home
          </Link>
        </div>

        <section className="rounded-[32px] border border-white/10 bg-zinc-950 p-6">
          <p className="text-xs uppercase tracking-[0.35em] text-red-400">
            Tha Core Checkout
          </p>

          <h1 className="mt-4 text-5xl font-black">Your Cart</h1>

          <p className="mt-3 text-sm text-zinc-400">
            {status} {itemCount > 0 ? `You have ${itemCount} item(s).` : ""}
          </p>
        </section>

        <div className="mt-5 grid gap-5 lg:grid-cols-[minmax(0,1fr)_420px]">
          <section className="rounded-3xl border border-white/10 bg-zinc-950 p-5">
            {cart.length === 0 ? (
              <div className="rounded-3xl border border-white/10 bg-black px-6 py-16 text-center">
                <h2 className="text-2xl font-black">Your cart is empty.</h2>

                <p className="mt-3 text-zinc-400">
                  Go back to the store and add products.
                </p>

                <Link
                  href="/store"
                  className="mt-6 inline-block rounded-2xl bg-red-600 px-6 py-4 font-bold text-white hover:bg-red-500"
                >
                  Shop Now
                </Link>
              </div>
            ) : (
              <div className="space-y-4">
                {cart.map((item) => (
                  <div
                    key={`${item.id}-${item.color}-${item.size}`}
                    className="rounded-3xl border border-white/10 bg-black p-5"
                  >
                    <div className="grid gap-4 md:grid-cols-[120px_1fr_auto]">
                      <div className="relative h-32 overflow-hidden rounded-2xl bg-white">
                        <CartImage src={item.image} alt={item.name} />
                      </div>

                      <div>
                        <p className="text-xs uppercase tracking-[0.25em] text-red-400">
                          {item.category}
                        </p>

                        <h2 className="mt-2 text-2xl font-black">
                          {item.name}
                        </h2>

                        <p className="mt-2 text-sm text-zinc-400">
                          Color / Option: {item.color || "Default"}
                        </p>

                        <p className="text-sm text-zinc-400">
                          Size / Package: {item.size || "Standard"}
                        </p>

                        <p className="mt-2 text-sm text-zinc-500">
                          {item.description}
                        </p>
                      </div>

                      <div className="flex flex-col items-start gap-3 md:items-end">
                        <p className="text-xl font-black text-red-400">
                          {formatJMD(item.priceJmd * item.quantity)}
                        </p>

                        <p className="text-sm font-semibold text-emerald-300">
                          {formatUSD(item.priceUsd * item.quantity)}
                        </p>

                        <div className="flex items-center gap-3">
                          <button
                            type="button"
                            onClick={() => decreaseQty(item)}
                            className="rounded-2xl border border-white/10 px-4 py-2"
                          >
                            -
                          </button>

                          <span className="min-w-[30px] text-center font-black">
                            {item.quantity}
                          </span>

                          <button
                            type="button"
                            onClick={() => increaseQty(item)}
                            className="rounded-2xl border border-white/10 px-4 py-2"
                          >
                            +
                          </button>
                        </div>

                        <button
                          type="button"
                          onClick={() => removeItem(item)}
                          className="rounded-2xl border border-red-400/30 px-4 py-2 text-sm text-red-200"
                        >
                          Remove
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </section>

          <aside className="rounded-3xl border border-white/10 bg-zinc-950 p-5">
            <p className="text-xs uppercase tracking-[0.3em] text-red-400">
              Checkout Summary
            </p>

            <p className="mt-5 text-3xl font-black text-red-400">
              {formatJMD(totalJmd)}
            </p>

            <p className="text-xl font-bold text-emerald-300">
              {formatUSD(totalUsd)}
            </p>

            <div className="mt-5 rounded-2xl border border-white/10 bg-black p-4 text-sm text-zinc-300">
              <p className="font-bold text-white">Payment Options</p>
              <p className="mt-2">Cash on Delivery</p>
              <p>Bank Transfer</p>
              <p>PayPal</p>
              <p>WiPay / Lynk</p>
            </div>

            <div className="mt-5 space-y-3">
              <input
                value={checkoutForm.customerName}
                onChange={(e) =>
                  updateCheckoutForm("customerName", e.target.value)
                }
                placeholder="Customer Name"
                className="w-full rounded-2xl border border-white/10 bg-black px-4 py-4 outline-none"
              />

              <input
                value={checkoutForm.customerPhone}
                onChange={(e) =>
                  updateCheckoutForm("customerPhone", e.target.value)
                }
                placeholder="Customer Phone"
                className="w-full rounded-2xl border border-white/10 bg-black px-4 py-4 outline-none"
              />

              <input
                value={checkoutForm.deliveryArea}
                onChange={(e) =>
                  updateCheckoutForm("deliveryArea", e.target.value)
                }
                placeholder="Delivery Area"
                className="w-full rounded-2xl border border-white/10 bg-black px-4 py-4 outline-none"
              />

              <select
                value={checkoutForm.deliveryMethod}
                onChange={(e) =>
                  updateCheckoutForm("deliveryMethod", e.target.value)
                }
                className="w-full rounded-2xl border border-white/10 bg-black px-4 py-4 outline-none"
              >
                <option>Pickup</option>
                <option>Delivery</option>
                <option>Meet Up</option>
              </select>

              <select
                value={checkoutForm.paymentMethod}
                onChange={(e) =>
                  updateCheckoutForm("paymentMethod", e.target.value)
                }
                className="w-full rounded-2xl border border-white/10 bg-black px-4 py-4 outline-none"
              >
                <option>Cash on Delivery</option>
                <option>Bank Transfer</option>
                <option>PayPal</option>
                <option>WiPay / Lynk</option>
                <option>Other</option>
              </select>

              <textarea
                rows={4}
                value={checkoutForm.notes}
                onChange={(e) => updateCheckoutForm("notes", e.target.value)}
                placeholder="Notes / special request"
                className="w-full rounded-2xl border border-white/10 bg-black px-4 py-4 outline-none"
              />

              <button
                type="button"
                onClick={sendWhatsAppOrder}
                className="w-full rounded-2xl bg-green-600 px-4 py-4 font-black hover:bg-green-500"
              >
                Send Order On WhatsApp
              </button>

              <button
                type="button"
                onClick={clearCart}
                className="w-full rounded-2xl border border-white/10 px-4 py-4 font-semibold hover:bg-white/5"
              >
                Clear Cart
              </button>
            </div>
          </aside>
        </div>
      </div>
    </main>
  );
}