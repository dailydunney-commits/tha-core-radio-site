"use client";

import { useMemo, useState } from "react";
import { products } from "../store/products";

const ADMIN_PASSWORD = "coreadmin123";

export default function OwnerPage() {
  const [loggedIn, setLoggedIn] = useState(false);
  const [password, setPassword] = useState("");

  const [orders, setOrders] = useState([
    { id: "#1001", customer: "WhatsApp Order", item: "T-Shirt", amount: 2500, status: "Confirmed" },
    { id: "#1002", customer: "Store Order", item: "Banner Print", amount: 8500, status: "Printing" },
    { id: "#1003", customer: "Radio Client", item: "Radio Promo 30s", amount: 8000, status: "Ready" },
  ]);

  const [schedule, setSchedule] = useState([
    "Sunday - Gospel Morning • Family Vibes • Sunday Talk",
    "Monday - Money Moves • Business Promo • Fresh Start Mix",
    "Tuesday - Dancehall Drive • Listener Requests",
    "Wednesday - Midweek Motivation • Community Talk",
    "Thursday - Throwback Night • Old School Mix",
    "Friday - Weekend Warm Up • Party Mix",
    "Saturday - Live From Tha Core • DJ Special",
  ]);

  const [nowPlaying, setNowPlaying] = useState("Tha Core Live Mix");
  const [streamStatus, setStreamStatus] = useState("Ready");

  const revenue = useMemo(
    () => orders.reduce((sum, order) => sum + order.amount, 0),
    [orders]
  );

  function login() {
    if (password === ADMIN_PASSWORD) {
      setLoggedIn(true);
    } else {
      alert("Wrong password");
    }
  }

  function updateOrderStatus(index: number, status: string) {
    const copy = [...orders];
    copy[index].status = status;
    setOrders(copy);
  }

  if (!loggedIn) {
    return (
      <main className="min-h-screen bg-black px-6 py-10 text-white">
        <section className="mx-auto max-w-xl rounded-3xl border border-red-700 bg-zinc-950 p-8">
          <h1 className="text-5xl font-black text-red-500">Owner Login</h1>
          <p className="mt-3 text-gray-300">Control panel access only.</p>

          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="Owner Password"
            className="mt-6 w-full rounded-xl bg-black p-4"
          />

          <button
            onClick={login}
            className="mt-4 w-full rounded-xl bg-red-700 px-6 py-4 font-black"
          >
            Enter Control Panel
          </button>
        </section>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-black px-6 py-10 pb-40 text-white">
      <section className="mx-auto max-w-7xl">
        <div className="rounded-[2rem] border-2 border-red-600 bg-gradient-to-br from-red-950 to-black p-8">
          <p className="text-sm tracking-[0.35em] text-red-300">
            THA CORE OWNER PANEL
          </p>

          <h1 className="mt-4 text-6xl font-black text-white">
            Control Center
          </h1>

          <p className="mt-4 max-w-4xl text-gray-200">
            Manage radio, store, orders, uploads, ads, schedule, products and live stats.
          </p>
        </div>

        <div className="mt-8 grid gap-6 md:grid-cols-4">
          <Stat title="Stream" value={streamStatus} />
          <Stat title="Orders" value={orders.length.toString()} />
          <Stat title="Revenue" value={`JMD $${revenue.toLocaleString()}`} />
          <Stat title="Products" value={products.length.toString()} />
        </div>

        <div className="mt-8 grid gap-6 lg:grid-cols-[1.1fr_.9fr]">
          <Panel title="Radio Control">
            <label className="font-black">Now Playing</label>
            <input
              value={nowPlaying}
              onChange={(e) => setNowPlaying(e.target.value)}
              className="mt-2 w-full rounded-xl bg-black p-4"
            />

            <div className="mt-4 grid gap-3 sm:grid-cols-3">
              <button onClick={() => setStreamStatus("Live")} className="rounded-xl bg-red-700 p-4 font-black">
                Start
              </button>
              <button onClick={() => setStreamStatus("Paused")} className="rounded-xl bg-zinc-800 p-4 font-black">
                Pause
              </button>
              <button onClick={() => setStreamStatus("Stopped")} className="rounded-xl bg-black p-4 font-black">
                Stop
              </button>
            </div>

            <p className="mt-4 font-black text-red-400">{nowPlaying}</p>
          </Panel>

          <Panel title="Money Moves">
            <div className="grid gap-3">
              <ControlButton text="Store Orders" />
              <ControlButton text="Sponsor Slots" />
              <ControlButton text="Radio Promos" />
              <ControlButton text="Ad Manager" />
            </div>
          </Panel>
        </div>

        <Panel title="Order Inbox">
          <div className="grid gap-4">
            {orders.map((order, index) => (
              <div key={order.id} className="rounded-2xl bg-black p-4">
                <div className="flex flex-wrap items-center justify-between gap-4">
                  <div>
                    <p className="text-xl font-black">
                      {order.id} - {order.customer}
                    </p>
                    <p className="text-gray-300">{order.item}</p>
                    <p className="font-black text-red-400">
                      JMD ${order.amount.toLocaleString()}
                    </p>
                  </div>

                  <select
                    value={order.status}
                    onChange={(e) => updateOrderStatus(index, e.target.value)}
                    className="rounded-xl bg-zinc-900 p-3"
                  >
                    <option>Confirmed</option>
                    <option>Printing</option>
                    <option>Ready</option>
                    <option>Shipped</option>
                    <option>Completed</option>
                  </select>
                </div>
              </div>
            ))}
          </div>
        </Panel>

        <Panel title="Weekly Radio Schedule">
          <div className="grid gap-3">
            {schedule.map((item, index) => (
              <input
                key={index}
                value={item}
                onChange={(e) => {
                  const copy = [...schedule];
                  copy[index] = e.target.value;
                  setSchedule(copy);
                }}
                className="w-full rounded-xl bg-black p-4"
              />
            ))}
          </div>
        </Panel>

        <Panel title="Products In Store">
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            {products.slice(0, 16).map((product: any) => (
              <div key={product.id} className="rounded-2xl bg-black p-4">
                <div
                  className="h-56 rounded-xl bg-contain bg-center bg-no-repeat"
                  style={{ backgroundImage: `url(${product.image})` }}
                />
                <p className="mt-3 font-black">{product.name}</p>
                <p className="font-black text-red-400">
                  JMD ${product.price.toLocaleString()}
                </p>
              </div>
            ))}
          </div>
        </Panel>
      </section>
    </main>
  );
}

function Stat({ title, value }: { title: string; value: string }) {
  return (
    <div className="rounded-3xl bg-zinc-900 p-6">
      <p className="text-gray-400">{title}</p>
      <h2 className="mt-2 text-4xl font-black text-red-400">{value}</h2>
    </div>
  );
}

function Panel({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="rounded-3xl border border-red-700 bg-zinc-950 p-6">
      <h2 className="mb-5 text-3xl font-black text-red-500">{title}</h2>
      {children}
    </div>
  );
}

function ControlButton({ text }: { text: string }) {
  return (
    <button className="rounded-xl bg-black p-4 text-left font-black hover:bg-red-950">
      {text}
    </button>
  );
}
