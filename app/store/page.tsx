"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { products } from "./products";

const WHATSAPP_NUMBER = "18768842867";

function Stars() {
  return <div className="text-green-400 text-lg">★★★★★</div>;
}

export default function StorePage() {
  const [selected, setSelected] = useState<any | null>(null);
  const [cart, setCart] = useState<any[]>([]);
  const [size, setSize] = useState("M");
  const [color, setColor] = useState("Black");
  const [qty, setQty] = useState(1);
  const [search, setSearch] = useState("");

  const active = selected || products[0];

  const filteredProducts = products.filter((product: any) =>
    product.name.toLowerCase().includes(search.toLowerCase()) ||
    product.category.toLowerCase().includes(search.toLowerCase())
  );

  const recommended = useMemo(() => {
    if (!active) return products.slice(0, 6);
    const same = products.filter(
      (item: any) => item.category === active.category && item.id !== active.id
    );
    return same.length ? same.slice(0, 6) : products.slice(0, 6);
  }, [active]);

  const total = cart.reduce((sum, item) => sum + item.price * item.qty, 0);

  function openProduct(product: any) {
    setSelected(product);
    setSize(product?.sizes?.[2] || "M");
    setColor(product?.colors?.[0] || "Black");
    setQty(1);
  }

  function addProductToCart(product: any) {
    setCart((prev) => [
      ...prev,
      {
        ...product,
        size: product?.sizes?.[2] || "M",
        color: product?.colors?.[0] || "Black",
        qty: 1,
      },
    ]);
  }

  function addSelectedToCart() {
    if (!active) return;
    setCart((prev) => [...prev, { ...active, size, color, qty }]);
  }

  const cartMessage = encodeURIComponent(
    "Hello Tha Core, I want to order:\n\n" +
      cart
        .map(
          (item) =>
            `${item.name} | Size: ${item.size} | Color: ${item.color} | Qty: ${item.qty}`
        )
        .join("\n") +
      `\n\nTotal: JMD $${total.toLocaleString()}`
  );

  return (
    <main className="min-h-screen bg-black px-6 py-8 pb-40 text-white">
      <section className="mx-auto max-w-7xl">
        <div className="mb-8 rounded-3xl border border-red-700 bg-zinc-950 p-4">
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
            <Link href="/" className="rounded-2xl bg-red-700 px-5 py-4 text-center font-black hover:bg-red-800">Play Live</Link>
            <Link href="/chat" className="rounded-2xl border border-red-700 px-5 py-4 text-center font-black hover:bg-red-950">Chat</Link>
            <Link href="/upload" className="rounded-2xl border border-red-700 px-5 py-4 text-center font-black hover:bg-red-950">Upload</Link>
            <Link href="/news" className="rounded-2xl border border-red-700 px-5 py-4 text-center font-black hover:bg-red-950">News</Link>
            <Link href="/" className="rounded-2xl bg-white px-5 py-4 text-center font-black text-black hover:bg-gray-200">Home</Link>
          </div>
        </div>

        <div className="rounded-[2rem] border-2 border-red-600 bg-gradient-to-br from-red-950 to-black p-8">
          <h1 className="text-5xl font-black md:text-7xl">Tha Core Store</h1>
          <p className="mt-3 text-gray-300">
            Shop products, printing, radio promos, ads, and custom services.
          </p>

          <div className="mt-6 grid gap-4 md:grid-cols-[1fr_220px]">
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search products, shirts, cups, radio promos..."
              className="rounded-2xl bg-white px-5 py-4 font-bold text-black outline-none"
            />
            <button className="rounded-2xl bg-red-700 px-5 py-4 font-black">
              Search Store
            </button>
          </div>
        </div>

        <div className="mt-6 flex flex-wrap gap-3">
          {["All", "Clothing", "Accessories", "Printing", "Radio"].map((cat) => (
            <button
              key={cat}
              onClick={() => setSearch(cat === "All" ? "" : cat)}
              className="rounded-full border border-red-700 bg-zinc-950 px-5 py-3 font-black hover:bg-red-950"
            >
              {cat}
            </button>
          ))}
        </div>

        <div className="mt-8 grid gap-6 lg:grid-cols-[1.45fr_.55fr]">
          <div className="grid gap-6 sm:grid-cols-2 xl:grid-cols-3">
            {filteredProducts.map((product: any) => (
              <div
                key={product.id}
                className="rounded-3xl border border-zinc-800 bg-gradient-to-br from-yellow-200 via-amber-300 to-yellow-500 p-4 text-black shadow-lg"
              >
                <button onClick={() => openProduct(product)} className="block w-full text-left">
                  <div className="overflow-hidden rounded-2xl bg-gradient-to-br from-yellow-200 via-amber-300 to-yellow-500">
                    <div
                      className="h-[650px] rounded-2xl bg-cover bg-center bg-no-repeat"
                      style={{ backgroundImage: `url(${product.image})` }}
                    />
                  </div>

                  <p className="mt-4 text-xs font-black uppercase tracking-widest text-red-700">
                    {product.category}
                  </p>

                  <h2 className="mt-2 text-2xl font-black text-black">
                    {product.name}
                  </h2>

                  <div className="mt-2 flex items-center gap-3">
                    <Stars />
                    <span className="text-sm font-bold text-blue-700">24 reviews</span>
                  </div>

                  <p className="mt-2 text-2xl font-black text-red-700">
                    JMD ${product.price.toLocaleString()}
                  </p>

                  <p className="mt-2 text-sm font-bold text-gray-800">
                    Sizes: XS - XL • Multiple colors available
                  </p>
                </button>

                <div className="mt-3 rounded-xl bg-zinc-950 p-3">
                  <p className="text-sm font-bold text-gray-300">
                    “Great quality and fast service.”
                  </p>
                  <p className="mt-1 text-xs font-black text-green-400">
                    Verified customer review
                  </p>
                </div>

                <button
                  onClick={() => openProduct(product)}
                  className="mt-4 w-full rounded-xl bg-red-700 px-5 py-3 text-center font-black text-white"
                >
                  View Item
                </button>

                <button
                  onClick={() => addProductToCart(product)}
                  className="mt-3 w-full rounded-xl bg-black px-5 py-3 text-center font-black text-white hover:bg-zinc-800"
                >
                  Add To Cart
                </button>
              </div>
            ))}
          </div>

          <div className="sticky top-6 h-fit rounded-3xl border border-red-700 bg-zinc-950 p-6">
            <h2 className="text-3xl font-black text-red-400">Shopping Cart</h2>

            {cart.length === 0 ? (
              <p className="mt-4 text-gray-300">No items added yet.</p>
            ) : (
              <div className="mt-4 space-y-3">
                {cart.map((item: any, index: number) => (
                  <div key={index} className="rounded-xl bg-black p-4">
                    <p className="font-black">{item.name}</p>
                    <p className="text-sm text-gray-400">
                      {item.size} • {item.color} • Qty {item.qty}
                    </p>
                    <p className="font-black text-red-400">
                      JMD ${(item.price * item.qty).toLocaleString()}
                    </p>
                  </div>
                ))}
              </div>
            )}

            <div className="mt-6 rounded-2xl bg-black p-5">
              <p className="text-gray-400">Total</p>
              <p className="text-4xl font-black text-red-400">
                JMD ${total.toLocaleString()}
              </p>
            </div>

            <a
              href={`https://wa.me/${WHATSAPP_NUMBER}?text=${cartMessage}`}
              target="_blank"
              className="mt-5 block rounded-xl bg-red-700 px-6 py-4 text-center font-black"
            >
              Checkout On WhatsApp
            </a>

            <button
              onClick={() => setCart([])}
              className="mt-3 w-full rounded-xl border border-red-700 px-6 py-4 font-black"
            >
              Clear Cart
            </button>
          </div>
        </div>
      </section>

      {selected && (
        <div className="fixed inset-0 z-50 overflow-auto bg-black/95 p-6">
          <div className="mx-auto max-w-7xl rounded-3xl border border-red-700 bg-zinc-950 p-6">
            <div className="flex items-center justify-between gap-4">
              <h2 className="text-4xl font-black text-red-500">{active.name}</h2>
              <button onClick={() => setSelected(null)} className="rounded-xl bg-red-700 px-5 py-3 font-black">
                Close
              </button>
            </div>

            <div className="mt-6 grid gap-8 lg:grid-cols-[1.2fr_.8fr]">
              <div className="overflow-hidden rounded-3xl bg-gradient-to-br from-yellow-200 via-amber-300 to-yellow-500 p-0">
                <div
                  className="h-[780px] rounded-3xl bg-cover bg-center bg-no-repeat"
                  style={{ backgroundImage: `url(${active.image})` }}
                />
              </div>

              <div>
                <p className="text-sm font-black uppercase tracking-[0.35em] text-red-300">
                  {active.category}
                </p>

                <div className="mt-4 flex items-center gap-3">
                  <Stars />
                  <span className="font-bold text-blue-400">24 verified reviews</span>
                </div>

                <p className="mt-4 text-5xl font-black text-red-400">
                  JMD ${active.price.toLocaleString()}
                </p>

                <div className="mt-5 rounded-2xl bg-black p-4">
                  <p className="font-black text-red-400">Customer Review</p>
                  <p className="mt-2 text-gray-300">
                    “This product looks clean, feels premium, and the service was fast.”
                  </p>
                </div>

                <label className="mt-6 block font-black">Size</label>
                <select value={size} onChange={(e) => setSize(e.target.value)} className="mt-2 w-full rounded-xl bg-black p-4">
                  {(active.sizes || ["XS", "S", "M", "L", "XL"]).map((s: string) => <option key={s}>{s}</option>)}
                </select>

                <label className="mt-5 block font-black">Color</label>
                <select value={color} onChange={(e) => setColor(e.target.value)} className="mt-2 w-full rounded-xl bg-black p-4">
                  {(active.colors || ["Black", "White", "Red", "Blue", "Pink", "Green", "Yellow", "Purple"]).map((c: string) => <option key={c}>{c}</option>)}
                </select>

                <label className="mt-5 block font-black">Quantity</label>
                <input type="number" min="1" value={qty} onChange={(e) => setQty(Math.max(1, Number(e.target.value)))} className="mt-2 w-full rounded-xl bg-black p-4" />

                <button onClick={addSelectedToCart} className="mt-6 w-full rounded-xl bg-red-700 px-6 py-4 font-black">
                  Add To Cart
                </button>
              </div>
            </div>

            <div className="mt-10">
              <h3 className="text-3xl font-black text-red-500">Recommended Items</h3>

              <div className="mt-6 grid gap-5 sm:grid-cols-2 xl:grid-cols-3">
                {recommended.map((item: any) => (
                  <button key={item.id} onClick={() => openProduct(item)} className="rounded-3xl bg-gradient-to-br from-yellow-200 via-amber-300 to-yellow-500 p-4 text-left text-black">
                    <div
                      className="h-[420px] rounded-2xl bg-cover bg-center bg-no-repeat"
                      style={{ backgroundImage: `url(${item.image})` }}
                    />
                    <h4 className="mt-4 text-2xl font-black">{item.name}</h4>
                    <Stars />
                    <p className="font-black text-red-700">
                      JMD ${item.price.toLocaleString()}
                    </p>
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}
    </main>
  );
}

