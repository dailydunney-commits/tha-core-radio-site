import Link from "next/link";

export default function StoreCancelPage() {
  return (
    <main className="min-h-screen bg-black text-white">
      <div className="mx-auto flex min-h-screen max-w-3xl items-center px-4 py-10">
        <section className="w-full rounded-[32px] border border-white/10 bg-zinc-950 p-8 text-center">
          <p className="text-xs uppercase tracking-[0.35em] text-red-400">
            Payment Cancelled
          </p>

          <h1 className="mt-4 text-5xl font-black">
            Checkout Not Completed
          </h1>

          <p className="mt-4 text-zinc-400">
            Your payment was not completed. You can go back to the cart and try
            again.
          </p>

          <div className="mt-8 flex flex-wrap justify-center gap-3">
            <Link
              href="/store/cart"
              className="rounded-2xl bg-red-600 px-6 py-4 font-bold hover:bg-red-500"
            >
              Back To Cart
            </Link>

            <Link
              href="/store"
              className="rounded-2xl border border-white/10 px-6 py-4 font-bold hover:bg-white/5"
            >
              Back To Store
            </Link>
          </div>
        </section>
      </div>
    </main>
  );
}