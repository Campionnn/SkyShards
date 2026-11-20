import { useState } from "react";
import { X } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { Modal } from "../ui";
import type { OrderBook, OrderLevel } from "../../services";
import { formatLargeNumber } from "../../utilities";
import type { Data } from "../../types/types";
import { DepthChart } from "./DepthChart";
import { ShardName } from "./controls";

/** One side of an order book, with a running total so you can see how deep each price goes. */
const OrderSide = ({ title, levels }: { title: string; levels: OrderLevel[] }) => {
  let total = 0;
  return (
    <div className="min-w-0 space-y-1">
      <h3 className="text-sm font-semibold text-white">{title}</h3>
      {levels.length === 0 ? (
        <p className="text-sm text-slate-500 py-4">No orders.</p>
      ) : (
        <div className="overflow-y-auto max-h-[50vh]">
          <table className="w-full text-xs">
            <thead className="sticky top-0 bg-slate-900 border-b border-slate-700 text-slate-400">
              <tr>
                <th className="px-2 py-1.5 text-right font-medium">Price</th>
                <th className="px-2 py-1.5 text-right font-medium">Amount</th>
                <th className="px-2 py-1.5 text-right font-medium" title="Number of orders at this price">
                  Orders
                </th>
                <th className="px-2 py-1.5 text-right font-medium" title="Amount at this price or better">
                  Total
                </th>
              </tr>
            </thead>
            <tbody>
              {levels.map((level) => {
                total += level.amount;
                return (
                  <tr key={level.price} className="border-b border-slate-700/50">
                    <td className="px-2 py-1 text-right text-slate-200">{formatLargeNumber(level.price)}</td>
                    <td className="px-2 py-1 text-right text-slate-300">{level.amount.toLocaleString()}</td>
                    <td className="px-2 py-1 text-right text-slate-400">{level.orders}</td>
                    <td className="px-2 py-1 text-right text-slate-400">{total.toLocaleString()}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
};

export const OrderBookModal = ({ data, shardId, book, onClose }: { data: Data; shardId: string | null; book: OrderBook | undefined; onClose: () => void }) => {
  const navigate = useNavigate();
  const [showList, setShowList] = useState(false);
  // Clicking the shard in the heading (the second click) goes to the Shards page, showing only that shard.
  const openOnShardsPage = (id: string) => navigate(`/shards?shard=${encodeURIComponent(id)}`);
  return (
    <Modal
      open={shardId !== null}
      onClose={onClose}
      labelledBy="order-book-title"
      panelClassName="bg-slate-900 border border-slate-700 rounded-lg shadow-2xl max-w-3xl w-full max-h-[85vh] overflow-y-auto p-4 space-y-4"
    >
      {shardId && (
        <>
          <div className="flex items-center justify-between gap-2">
            <h2 id="order-book-title" className="flex items-center gap-2 text-lg font-semibold text-white">
              Order book: <ShardName data={data} shardId={shardId} onOpen={openOnShardsPage} openLabel="Open on the Shards page" />
            </h2>
            <button type="button" onClick={onClose} className="p-1 text-slate-400 hover:text-white cursor-pointer" aria-label="Close">
              <X className="w-5 h-5" />
            </button>
          </div>
          {book ? (
            <>
              <DepthChart book={book} />
              <button type="button" onClick={() => setShowList((current) => !current)} className="text-xs text-emerald-300 hover:underline cursor-pointer">
                {showList ? "Hide order list" : "Show order list"}
              </button>
              {showList && (
                <div className="grid gap-4 sm:grid-cols-2">
                  <OrderSide title="Buy orders" levels={book.buyOrders} />
                  <OrderSide title="Sell offers" levels={book.sellOffers} />
                </div>
              )}
            </>
          ) : (
            <p className="text-sm text-slate-400">This shard isn't on the Bazaar.</p>
          )}
          <p className="text-xs text-slate-500">
            The Bazaar API shows the top 30 price levels per side, as of when this page loaded. Click the shard's name above to open it on the Shards page.
          </p>
        </>
      )}
    </Modal>
  );
};
