"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useMemo, useState } from "react";

type Product = {
  id: string;
  name: string;
  category: string;
  priceUsd: number;
  priceJmd: number;
  description: string;
  badge?: string;
  image: string;
};

type CartItem = Product & {
  quantity: number;
};

const CART_KEY = "tha-core-store-cart";
const PRODUCT_IMAGE_OVERRIDES_KEY = "tha-core-store-image-overrides";

const products: Product[] = [
  {
    id: "shirt-001",
    name: "Tha Core T-Shirt",
    category: "Apparel",
    priceUsd: 16,
    priceJmd: 2500,
    description: "Classic branded t-shirt for listeners and supporters.",
    badge: "Hot",
    image: "/products/tshirt.jpg",
  },
  {
    id: "tights-001",
    name: "High Waist Tights",
    category: "Apparel",
    priceUsd: 20,
    priceJmd: 3100,
    description: "Comfortable high waist tights for active and casual wear.",
    badge: "Popular",
    image: "/products/high-waist-tights.jpg",
  },
  {
    id: "shorts-001",
    name: "Tha Core Biker Shorts",
    category: "Apparel",
    priceUsd: 18,
    priceJmd: 2800,
    description: "Branded biker shorts with a clean sporty look.",
    badge: "New",
    image: "/products/biker-shorts.jpg",
  },
  {
    id: "tights-002",
    name: "Wide Leg Tights",
    category: "Apparel",
    priceUsd: 21,
    priceJmd: 3300,
    description: "Wide leg tights with a premium everyday style.",
    image: "/products/wide-leg-tights.jpg",
  },
  {
    id: "polo-001",
    name: "Plain Polo Shirt",
    category: "Apparel",
    priceUsd: 18,
    priceJmd: 2800,
    description: "Clean polo shirt option for business or brand wear.",
    image: "/products/polo-shirt.jpg",
  },
  {
    id: "cap-001",
    name: "Tha Core Cap",
    category: "Caps",
    priceUsd: 14,
    priceJmd: 2200,
    description: "Clean everyday cap with Tha Core branding.",
    image: "/products/cap.jpg",
  },
  {
    id: "cup-001",
    name: "Custom Printed Cup",
    category: "Cups",
    priceUsd: 10,
    priceJmd: 1600,
    description: "Branded cup for your desk, car, or studio.",
    image: "/products/cup.jpg",
  },
  {
    id: "cushion-001",
    name: "Custom Cushion Print",
    category: "Cups",
    priceUsd: 15,
    priceJmd: 2300,
    description: "Printed cushion option for gifts, decor, or promo.",
    image: "/products/cushion.jpg",
  },
  {
    id: "logo-001",
    name: "Simple Logo Design",
    category: "Graphics & Printing",
    priceUsd: 38,
    priceJmd: 6000,
    description: "Clean starter logo design for a small brand.",
    badge: "Popular",
    image: "/products/logo-design.jpg",
  },
  {
    id: "cards-001",
    name: "Business Card Design",
    category: "Graphics & Printing",
    priceUsd: 18,
    priceJmd: 2800,
    description: "Print-ready business card design.",
    image: "/products/business-cards.jpg",
  },
  {
    id: "flyer-001",
    name: "Flyer Design",
    category: "Graphics & Printing",
    priceUsd: 24,
    priceJmd: 3800,
    description: "Business or event flyer design.",
    image: "/products/flyer-design.jpg",
  },
  {
    id: "poster-001",
    name: "Poster Design",
    category: "Graphics & Printing",
    priceUsd: 28,
    priceJmd: 4400,
    description: "Poster design for events, businesses, and promotions.",
    image: "/products/poster-design.jpg",
  },
  {
    id: "banner-001",
    name: "Banner / Sign Setup",
    category: "Graphics & Printing",
    priceUsd: 75,
    priceJmd: 11800,
    description: "Design setup and coordination for signs or banners.",
    image: "/products/banner-sign.jpg",
  },
  {
    id: "invite-001",
    name: "Invitation Design",
    category: "Graphics & Printing",
    priceUsd: 18,
    priceJmd: 2800,
    description: "Invitation design for events and special occasions.",
    image: "/products/invitation-design.jpg",
  },
  {
    id: "ticket-001",
    name: "Ticket Design",
    category: "Graphics & Printing",
    priceUsd: 16,
    priceJmd: 2500,
    description: "Event ticket design for parties and promotions.",
    image: "/products/ticket-design.jpg",
  },
  {
    id: "menu-001",
    name: "Menu Design",
    category: "Graphics & Printing",
    priceUsd: 24,
    priceJmd: 3800,
    description: "Menu design for restaurants, bars, and food spots.",
    image: "/products/menu-design.jpg",
  },
  {
    id: "label-001",
    name: "Label / Sticker Design",
    category: "Graphics & Printing",
    priceUsd: 20,
    priceJmd: 3100,
    description: "Labels and stickers for products and small brands.",
    image: "/products/label-sticker.jpg",
  },
  {
    id: "promo-graphics-001",
    name: "Promo Graphic",
    category: "Graphics & Printing",
    priceUsd: 15,
    priceJmd: 2300,
    description: "Quick promo graphic for WhatsApp, social, or events.",
    image: "/products/promo-graphic.jpg",
  },
  {
    id: "promo-001",
    name: "Featured Chat Message",
    category: "Promo Packages",
    priceUsd: 8,
    priceJmd: 1200,
    description: "Get your message featured inside the live chat.",
    badge: "Promo",
    image: "/products/featured-message.jpg",
  },
  {
    id: "promo-002",
    name: "Song Promotion",
    category: "Promo Packages",
    priceUsd: 25,
    priceJmd: 3900,
    description: "Promote your song to the Tha Core audience.",
    badge: "Artist",
    image: "/products/song-promotion.jpg",
  },
  {
    id: "ads-001",
    name: "Radio Ad Slot",
    category: "Ads",
    priceUsd: 40,
    priceJmd: 6200,
    description: "Reserve an ad slot for your business or brand.",
    badge: "Business",
    image: "/products/radio-ad.jpg",
  },
  {
    id: "ads-002",
    name: "Sponsored Shoutout",
    category: "Ads",
    priceUsd: 16,
    priceJmd: 2500,
    description: "Have your business or message shouted out live.",
    image: "/products/sponsored-shoutout.jpg",
  },
];

const categories = [
  "All",
  "Apparel",
  "Caps",
  "Cups",
  "Graphics & Printing",
  "Promo Packages",
  "Ads",
];

function loadCart(): CartItem[] {
  if (typeof window === "undefined") return [];
  const raw = window.localStorage.getItem(CART_KEY);
  if (!raw) return [];
  try {
    return JSON.parse(raw) as CartItem[];
  } catch {
    return [];
  }
}

function saveCart(cart: CartItem[]) {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(CART_KEY, JSON.stringify(cart));
}

function loadImageOverrides(): Record<string, string> {
  if (typeof window === "undefined") return {};
  const raw = window.localStorage.getItem(PRODUCT_IMAGE_OVERRIDES_KEY);
  if (!raw) return {};
  try {
    return JSON.parse(raw) as Record<string, string>;
  } catch {
    return {};
  }
}

function saveImageOverrides(overrides: Record<string, string>) {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(
    PRODUCT_IMAGE_OVERRIDES_KEY,
    JSON.stringify(overrides)
  );
}

function ProductImage({ src, alt }: { src: string; alt: string }) {
  const [imgError, setImgError] = useState(false);

  useEffect(() => {
    setImgError(false);
  }, [src]);

  if (imgError) {
    return (
      <div className="flex h-full w-full items-center justify-center bg-zinc-900 text-center text-sm font-semibold text-zinc-500">
        Image not found
      </div>
    );
  }

  return (
    <Image
      src={src}
      alt={alt}
      fill
      className="object-cover"
      onError={() => setImgError(true)}
      unoptimized={src.startsWith("data:")}
    />
  );
}

export default function StoreClient() {
  const [selectedCategory, setSelectedCategory] = useState("All");
  const [cart, setCart] = useState<CartItem[]>([]);
  const [status, setStatus] = useState("Store ready.");
  const [search, setSearch] = useState("");
  const [imageOverrides, setImageOverrides] = useState<Record<string, string>>(
    {}
  );

  useEffect(() => {
    setCart(loadCart());
    setImageOverrides(loadImageOverrides());
  }, []);

  useEffect(() => {
    saveCart(cart);
  }, [cart]);

  useEffect(() => {
    saveImageOverrides(imageOverrides);
  }, [imageOverrides]);

  const filteredProducts = useMemo(() => {
    return products.filter((product) => {
      const matchesCategory =
        selectedCategory === "All" || product.category === selectedCategory;

      const query = search.trim().toLowerCase();
      const matchesSearch =
        query.length === 0 ||
        product.name.toLowerCase().includes(query) ||
        product.description.toLowerCase().includes(query) ||
        product.category.toLowerCase().includes(query);

      return matchesCategory && matchesSearch;
    });
  }, [selectedCategory, search]);

  const cartCount = useMemo(
    () => cart.reduce((sum, item) => sum + item.quantity, 0),
    [cart]
  );

  const cartTotalUsd = useMemo(
    () => cart.reduce((sum, item) => sum + item.quantity * item.priceUsd, 0),
    [cart]
  );

  const cartTotalJmd = useMemo(
    () => cart.reduce((sum, item) => sum + item.quantity * item.priceJmd, 0),
    [cart]
  );

  const addToCart = (product: Product) => {
    const productWithImage = {
      ...product,
      image: imageOverrides[product.id] || product.image,
    };

    setCart((prev) => {
      const existing = prev.find((item) => item.id === product.id);

      if (existing) {
        return prev.map((item) =>
          item.id === product.id
            ? { ...item, quantity: item.quantity + 1, image: productWithImage.image }
            : item
        );
      }

      return [...prev, { ...productWithImage, quantity: 1 }];
    });

    setStatus(`${product.name} added to cart.`);
  };

  const handleImageUpload = (productId: string, file: File | null) => {
    if (!file) return;

    const reader = new FileReader();

    reader.onload = () => {
      const result = typeof reader.result === "string" ? reader.result : "";
      if (!result) return;

      setImageOverrides((prev) => ({
        ...prev,
        [productId]: result,
      }));

      setStatus("Product image updated.");
    };

    reader.readAsDataURL(file);
  };

  const removeUploadedImage = (productId: string) => {
    setImageOverrides((prev) => {
      const next = { ...prev };
      delete next[productId];
      return next;
    });

    setStatus("Uploaded image removed.");
  };

  return (
    <main className="min-h-screen bg-black text-white">
      <div className="mx-auto max-w-7xl px-4 py-6 lg:px-6">
        <div className="mb-4 flex flex-wrap gap-3">
          <Link
            href="/"
            className="rounded-2xl border border-white/10 px-5 py-3 font-semibold transition hover:bg-white/5"
          >
            Back Home
          </Link>

          <Link
            href="/chat"
            className="rounded-2xl border border-white/10 px-5 py-3 font-semibold transition hover:bg-white/5"
          >
            Live Chat
          </Link>

          <Link
            href="/store/cart"
            className="rounded-2xl border border-white/10 px-5 py-3 font-semibold transition hover:bg-white/5"
          >
            Cart ({cartCount})
          </Link>
        </div>

        <div className="grid gap-4 lg:grid-cols-[320px_minmax(0,1fr)]">
          <aside className="rounded-3xl border border-white/10 bg-zinc-950/80 p-5">
            <p className="text-xs uppercase tracking-[0.3em] text-red-400">
              Tha Core Store
            </p>

            <h1 className="mt-3 text-4xl font-black leading-tight">
              Merch + Print + Promo
            </h1>

            <p className="mt-4 text-zinc-400">
              Merch, printing services, promo packages, and ad slots in one
              storefront.
            </p>

            <p className="mt-6 text-sm text-red-400">{status}</p>

            <div className="mt-6 rounded-2xl border border-emerald-500/20 bg-emerald-500/10 p-4">
              <p className="text-xs uppercase tracking-[0.2em] text-emerald-300">
                Cart Total
              </p>
              <p className="mt-2 text-2xl font-black">
                USD ${cartTotalUsd.toFixed(2)}
              </p>
              <p className="mt-1 text-xl font-black text-emerald-200">
                JMD ${cartTotalJmd.toFixed(0)}
              </p>
              <p className="mt-2 text-sm text-emerald-200">
                {cartCount} item{cartCount === 1 ? "" : "s"} in cart
              </p>
            </div>

            <div className="mt-6">
              <p className="text-xs uppercase tracking-[0.2em] text-zinc-500">
                Search
              </p>

              <input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search products"
                className="mt-3 w-full rounded-2xl border border-white/10 bg-zinc-900 px-4 py-3 text-white outline-none placeholder:text-zinc-500"
              />
            </div>

            <div className="mt-6">
              <p className="text-xs uppercase tracking-[0.2em] text-zinc-500">
                Categories
              </p>

              <div className="mt-3 space-y-2">
                {categories.map((category) => {
                  const active = selectedCategory === category;

                  return (
                    <button
                      key={category}
                      type="button"
                      onClick={() => setSelectedCategory(category)}
                      className={`w-full rounded-2xl px-4 py-3 text-left text-sm font-semibold transition ${
                        active
                          ? "bg-red-600 text-white"
                          : "border border-white/10 bg-white/5 text-zinc-200 hover:bg-white/10"
                      }`}
                    >
                      {category}
                    </button>
                  );
                })}
              </div>
            </div>
          </aside>

          <section className="rounded-3xl border border-white/10 bg-zinc-950/80 p-5">
            <div className="mb-5 flex items-center justify-between gap-4">
              <div>
                <h2 className="text-3xl font-black">Storefront</h2>
                <p className="mt-1 text-sm text-zinc-400">
                  Merch, graphics, print jobs, promo packages, and ad slots.
                </p>
              </div>

              <Link
                href="/store/cart"
                className="rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-sm font-semibold transition hover:bg-white/10"
              >
                View Cart
              </Link>
            </div>

            {filteredProducts.length === 0 ? (
              <div className="rounded-3xl border border-white/10 bg-black/20 px-6 py-10 text-center text-zinc-500">
                No products found.
              </div>
            ) : (
              <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
                {filteredProducts.map((product) => {
                  const imageSrc = imageOverrides[product.id] || product.image;

                  return (
                    <div
                      key={product.id}
                      className="rounded-3xl border border-white/10 bg-black/20 p-5 shadow-lg"
                    >
                      <div className="mb-4 flex items-start justify-between gap-3">
                        <div>
                          <p className="text-xs uppercase tracking-[0.2em] text-zinc-500">
                            {product.category}
                          </p>
                          <h3 className="mt-2 text-xl font-black">
                            {product.name}
                          </h3>
                        </div>

                        {product.badge ? (
                          <span className="rounded-full bg-red-600/20 px-3 py-1 text-[10px] font-bold uppercase tracking-[0.15em] text-red-300">
                            {product.badge}
                          </span>
                        ) : null}
                      </div>

                      <div className="relative mb-4 h-48 overflow-hidden rounded-3xl border border-white/10 bg-zinc-900">
                        <ProductImage src={imageSrc} alt={product.name} />
                      </div>

                      <div className="mb-4 flex flex-wrap gap-2">
                        <label className="cursor-pointer rounded-2xl border border-white/10 px-3 py-2 text-xs font-semibold transition hover:bg-white/5">
                          Upload Image
                          <input
                            type="file"
                            accept="image/*"
                            className="hidden"
                            onChange={(e) =>
                              handleImageUpload(
                                product.id,
                                e.target.files?.[0] || null
                              )
                            }
                          />
                        </label>

                        {imageOverrides[product.id] ? (
                          <button
                            type="button"
                            onClick={() => removeUploadedImage(product.id)}
                            className="rounded-2xl border border-red-400/30 px-3 py-2 text-xs font-semibold text-red-200 transition hover:bg-red-500/10"
                          >
                            Remove Upload
                          </button>
                        ) : null}
                      </div>

                      <p className="min-h-[72px] text-sm leading-6 text-zinc-400">
                        {product.description}
                      </p>

                      <div className="mt-5 space-y-1">
                        <p className="text-2xl font-black">
                          USD ${product.priceUsd.toFixed(2)}
                        </p>
                        <p className="text-sm font-semibold text-emerald-300">
                          JMD ${product.priceJmd.toFixed(0)}
                        </p>
                      </div>

                      <div className="mt-5">
                        <button
                          type="button"
                          onClick={() => addToCart(product)}
                          className="w-full rounded-2xl bg-red-600 px-4 py-3 text-sm font-semibold text-white transition hover:bg-red-500"
                        >
                          Add To Cart
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </section>
        </div>
      </div>
    </main>
  );
}