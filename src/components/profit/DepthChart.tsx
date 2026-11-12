import { useMemo, useRef, useState, type PointerEvent as ReactPointerEvent } from "react";
import { countOrders, getSpread, type OrderBook, type OrderLevel } from "../../services";
import { formatLargeNumber } from "../../utilities";

/*
 * Market depth chart, like the Steam Community Market's: price along the bottom, and for every
 * price the number of shards you could trade there. Buy orders build up to the left of the best
 * buy order ("wanted at this price or more"), sell offers to the right of the cheapest sell offer
 * ("for sale at this price or less"); the empty band in the middle is the spread.
 */

// Categorical slots 1 and 2 of the reference palette, dark steps; validated on the dialog surface.
const BUY_COLOR = "#3987e5";
const SELL_COLOR = "#d95926";

const WIDTH = 640;
const HEIGHT = 276;
// Bottom and left leave room for the tick labels plus the axis titles.
const PAD = { top: 12, right: 16, bottom: 44, left: 70 };
const PLOT_W = WIDTH - PAD.left - PAD.right;
const PLOT_H = HEIGHT - PAD.top - PAD.bottom;

/** Levels further than this factor from the best prices would squash the chart, so they're cut off. */
const RANGE_FACTOR = 2;

/** Cumulative depth: each level with the total amount at its price or better. */
interface Step {
  price: number;
  total: number;
}

const cumulate = (levels: OrderLevel[]): Step[] => {
  let total = 0;
  return levels.map((level) => ({ price: level.price, total: (total += level.amount) }));
};

/** About `count` round tick values covering 0..max (or min..max). */
const niceTicks = (min: number, max: number, count: number): number[] => {
  const span = max - min;
  if (span <= 0) return [min];
  const raw = span / count;
  const magnitude = 10 ** Math.floor(Math.log10(raw));
  const step = [1, 2, 2.5, 5, 10].map((f) => f * magnitude).find((s) => span / s <= count + 1) ?? 10 * magnitude;
  const ticks: number[] = [];
  for (let value = Math.ceil(min / step) * step; value <= max + step * 1e-9; value += step) ticks.push(value);
  return ticks;
};

/** One side's headline above the chart: best price, what it is, and how much is listed in total. */
const SideSummary = ({
  title,
  color,
  best,
  hint,
  levels,
  totalText,
  alignRight = false,
}: {
  title: string;
  color: string;
  best: number | undefined;
  hint: string;
  levels: OrderLevel[];
  totalText: string;
  alignRight?: boolean;
}) => {
  const orders = countOrders(levels);
  const amount = levels.reduce((sum, level) => sum + level.amount, 0);
  return (
    <div className={`min-w-0 space-y-0.5 ${alignRight ? "text-right" : ""}`}>
      <div className={`flex items-center gap-1.5 text-sm font-semibold text-white ${alignRight ? "justify-end" : ""}`}>
        <span className="w-3 h-3 rounded-sm shrink-0" style={{ backgroundColor: color }} />
        {title}
        {best !== undefined && <span className="font-normal text-slate-400">(best {formatLargeNumber(best)})</span>}
      </div>
      <p className="text-slate-400">{hint}</p>
      <p className="text-slate-300">
        {orders} orders, {amount.toLocaleString()} {totalText}
      </p>
    </div>
  );
};

interface Hover {
  x: number;
  price: number;
  text: string;
  color: string;
}

export const DepthChart = ({ book }: { book: OrderBook }) => {
  const { buyOrders, sellOffers } = book;
  const svgRef = useRef<SVGSVGElement>(null);
  const [hover, setHover] = useState<Hover | null>(null);

  const chart = useMemo(() => {
    const bestBuy = buyOrders[0]?.price;
    const bestSell = sellOffers[0]?.price;
    if (bestBuy === undefined && bestSell === undefined) return null;

    // Price window: around the spread, at most RANGE_FACTOR away from the best prices.
    const low = (bestBuy ?? bestSell!) / RANGE_FACTOR;
    const high = (bestSell ?? bestBuy!) * RANGE_FACTOR;
    const buyShown = buyOrders.filter((level) => level.price >= low);
    const sellShown = sellOffers.filter((level) => level.price <= high);
    const hidden = buyOrders.length - buyShown.length + sellOffers.length - sellShown.length;

    const buy = cumulate(buyShown);
    const sell = cumulate(sellShown);
    const prices = [...buy, ...sell].map((step) => step.price);
    // A little room on both sides so the outermost steps are visible as steps.
    const minPrice = Math.min(...prices);
    const maxPrice = Math.max(...prices);
    const margin = (maxPrice - minPrice) * 0.05 || maxPrice * 0.05 || 1;
    const xMin = Math.max(0, minPrice - margin);
    const xMax = maxPrice + margin;
    const yMax = Math.max(buy.at(-1)?.total ?? 0, sell.at(-1)?.total ?? 0, 1) * 1.1;

    const x = (price: number) => PAD.left + ((price - xMin) / (xMax - xMin)) * PLOT_W;
    const y = (amount: number) => PAD.top + PLOT_H - (amount / yMax) * PLOT_H;
    const base = y(0);

    /**
     * The step outline from the best price outwards to `edge`, plus the same shape closed
     * along the baseline for the fill. Only the outline is stroked, like on Steam.
     */
    const stepShape = (steps: Step[], edge: number) => {
      if (steps.length === 0) return null;
      let line = `M ${x(steps[0].price)} ${base}`;
      steps.forEach((step, i) => {
        const next = steps[i + 1];
        line += ` L ${x(step.price)} ${y(step.total)} L ${next ? x(next.price) : edge} ${y(step.total)}`;
      });
      return { line, area: `${line} L ${edge} ${base} Z` };
    };
    // Buy orders step down to the left edge, sell offers up to the right edge.
    const buyShape = stepShape(buy, PAD.left);
    const sellShape = stepShape(sell, PAD.left + PLOT_W);

    return {
      // Spread and "10% of spread" offer; null unless both sides have orders.
      spread: getSpread(book),
      buy,
      sell,
      bestBuy,
      bestSell,
      hidden,
      xMin,
      xMax,
      x,
      y,
      buyShape,
      sellShape,
      xTicks: niceTicks(xMin, xMax, 6).filter((tick) => tick >= xMin && tick <= xMax),
      yTicks: niceTicks(0, yMax, 4).filter((tick) => tick <= yMax),
    };
  }, [book, buyOrders, sellOffers]);

  if (!chart) return <p className="text-sm text-slate-400 py-6">No orders on either side.</p>;
  const tenPercentX = chart.spread ? chart.x(chart.spread.tenPercentOffer) : null;

  const onMove = (event: ReactPointerEvent<SVGSVGElement>) => {
    const rect = svgRef.current?.getBoundingClientRect();
    if (!rect) return;
    const svgX = ((event.clientX - rect.left) / rect.width) * WIDTH;
    if (svgX < PAD.left || svgX > PAD.left + PLOT_W) return setHover(null);
    const price = chart.xMin + ((svgX - PAD.left) / PLOT_W) * (chart.xMax - chart.xMin);

    if (chart.bestBuy !== undefined && price <= chart.bestBuy) {
      // Buy orders at this price or higher.
      const total = chart.buy.filter((step) => step.price >= price).at(-1)?.total ?? 0;
      setHover({ x: svgX, price, color: BUY_COLOR, text: `${total.toLocaleString()} shards wanted at ${formatLargeNumber(price)} or more` });
    } else if (chart.bestSell !== undefined && price >= chart.bestSell) {
      // Sell offers at this price or lower.
      const total = chart.sell.filter((step) => step.price <= price).at(-1)?.total ?? 0;
      setHover({ x: svgX, price, color: SELL_COLOR, text: `${total.toLocaleString()} shards for sale at ${formatLargeNumber(price)} or less` });
    } else {
      setHover({ x: svgX, price, color: "#94a3b8", text: `${formatLargeNumber(price)}: inside the spread, no orders` });
    }
  };

  return (
    <div className="space-y-2">
      {/* Buy side on the left, the spread in the middle, sell side on the right: the same order as the chart. */}
      <div className="grid grid-cols-[1fr_auto_1fr] items-start gap-3 text-xs">
        <SideSummary
          title="Buy orders"
          color={BUY_COLOR}
          best={chart.bestBuy}
          hint="What instant sells fill, highest first."
          levels={buyOrders}
          totalText="total shards can be bought"
        />
        <div className="text-center">
          <div className="text-slate-400">Spread</div>
          {chart.spread ? (
            <>
              <div className="text-sm font-semibold text-white">{formatLargeNumber(chart.spread.spread)}</div>
              <div className="text-slate-300">{`${(chart.spread.percent * 100).toFixed(1)}%`}</div>
              <div
                className="mt-1 inline-flex items-center gap-1.5 text-slate-400"
                title='The in-game "10% of spread" sell offer: the cheapest sell offer minus a tenth of the spread'
              >
                <span className="w-3 border-t-2 border-dashed" style={{ borderColor: SELL_COLOR }} />
                10% offer {formatLargeNumber(chart.spread.tenPercentOffer)}
              </div>
            </>
          ) : (
            <div className="text-slate-500">–</div>
          )}
        </div>
        <SideSummary
          title="Sell offers"
          color={SELL_COLOR}
          best={chart.bestSell}
          hint="What instant buys take, cheapest first."
          levels={sellOffers}
          totalText="total shards can be sold"
          alignRight
        />
      </div>

      <div className="relative">
        <svg
          ref={svgRef}
          viewBox={`0 0 ${WIDTH} ${HEIGHT}`}
          className="w-full h-auto touch-pan-y select-none"
          role="img"
          aria-label="Market depth chart: buy orders and sell offers by price"
          onPointerMove={onMove}
          onPointerLeave={() => setHover(null)}
        >
          {/* Recessive grid and axes. */}
          {chart.yTicks.map((tick) => (
            <g key={`y${tick}`}>
              <line x1={PAD.left} x2={PAD.left + PLOT_W} y1={chart.y(tick)} y2={chart.y(tick)} stroke="#334155" strokeWidth={1} />
              <text x={PAD.left - 6} y={chart.y(tick)} textAnchor="end" dominantBaseline="middle" fontSize={11} fill="#94a3b8">
                {formatLargeNumber(tick)}
              </text>
            </g>
          ))}
          {chart.xTicks.map((tick) => (
            <text key={`x${tick}`} x={chart.x(tick)} y={PAD.top + PLOT_H + 18} textAnchor="middle" fontSize={11} fill="#94a3b8">
              {formatLargeNumber(tick)}
            </text>
          ))}
          <line x1={PAD.left} x2={PAD.left + PLOT_W} y1={chart.y(0)} y2={chart.y(0)} stroke="#475569" strokeWidth={1} />

          {/* Axis titles. */}
          <text x={PAD.left + PLOT_W / 2} y={HEIGHT - 4} textAnchor="middle" fontSize={11} fill="#cbd5e1">
            Price per shard (coins)
          </text>
          <text x={14} y={PAD.top + PLOT_H / 2} textAnchor="middle" fontSize={11} fill="#cbd5e1" transform={`rotate(-90 14 ${PAD.top + PLOT_H / 2})`}>
            Shards (total)
          </text>

          {[
            { shape: chart.buyShape, color: BUY_COLOR },
            { shape: chart.sellShape, color: SELL_COLOR },
          ].map(
            ({ shape, color }) =>
              shape && (
                <g key={color}>
                  <path d={shape.area} fill={color} fillOpacity={0.25} />
                  <path d={shape.line} fill="none" stroke={color} strokeWidth={2} strokeLinejoin="round" />
                </g>
              ),
          )}

          {tenPercentX !== null && (
            <g>
              <line x1={tenPercentX} x2={tenPercentX} y1={PAD.top} y2={chart.y(0)} stroke={SELL_COLOR} strokeWidth={1.5} strokeDasharray="6 4" />
              {/* The label sits left of the line, or right of it when the line is near the left edge. */}
              <text
                x={tenPercentX + (tenPercentX < PAD.left + 100 ? 4 : -4)}
                y={PAD.top + 10}
                textAnchor={tenPercentX < PAD.left + 100 ? "start" : "end"}
                fontSize={11}
                fill="#cbd5e1"
              >
                10% of spread
              </text>
            </g>
          )}
          {hover && <line x1={hover.x} x2={hover.x} y1={PAD.top} y2={chart.y(0)} stroke="#e2e8f0" strokeWidth={1} strokeDasharray="3 3" />}
        </svg>

        {hover && (
          <div
            className="absolute top-2 pointer-events-none px-2 py-1 rounded-md bg-slate-800 border border-slate-600 text-xs text-slate-100 whitespace-nowrap shadow-lg"
            // Keep the tooltip on the side of the crosshair that has room.
            style={hover.x / WIDTH < 0.5 ? { left: `calc(${(hover.x / WIDTH) * 100}% + 8px)` } : { right: `calc(${(1 - hover.x / WIDTH) * 100}% + 8px)` }}
          >
            <span className="inline-block w-2 h-2 rounded-sm mr-1.5 align-middle" style={{ backgroundColor: hover.color }} />
            {hover.text}
          </div>
        )}
      </div>

      {chart.hidden > 0 && (
        <p className="text-xs text-slate-500">
          {chart.hidden} price {chart.hidden === 1 ? "level lies" : "levels lie"} far from the spread and {chart.hidden === 1 ? "isn't" : "aren't"} drawn; the
          order list has them.
        </p>
      )}
    </div>
  );
};
