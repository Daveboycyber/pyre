import {
  Area,
  AreaChart,
  CartesianGrid,
  Line,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import type { DailyRow } from "@/lib/web3/analytics";
import { shortDay } from "@/components/stats/format";

const LIME = "#ccff00";
const WHITE = "#f4f4f0";
const AXIS = { fill: "#a3a3a3", fontSize: 12 };

/**
 * Recharts clones this element and injects its own props, including `label`
 * (the hovered x value). The formatter must use another name or it is overwritten.
 */
function ChartTooltip({
  active,
  payload,
  formatLabel,
}: {
  readonly formatLabel: (key: string) => string;
  readonly active?: boolean;
  readonly payload?: { payload: DailyRow }[];
}) {
  const row = payload?.[0]?.payload;
  if (!active || !row) return null;
  return (
    <div className="rounded-xl bg-card px-3 py-2 text-xs shadow-[var(--shadow-border-hover)]">
      <p className="font-semibold">{formatLabel(row.day)}</p>
      <p className="mt-1.5 flex items-center gap-2 text-muted-foreground">
        <span className="size-2 rounded-full bg-primary" /> Batch cleans
        <span className="ml-auto pl-4 text-foreground tabular-nums">{row.cleans}</span>
      </p>
      <p className="mt-1 flex items-center gap-2 text-muted-foreground">
        <span className="size-2 rounded-full bg-foreground" /> Wallets
        <span className="ml-auto pl-4 text-foreground tabular-nums">{row.wallets}</span>
      </p>
    </div>
  );
}

/**
 * Batch cleans (lime area) and distinct wallets (white line) per bucket.
 * Same unit, one axis; the two series differ by mark type as well as color.
 */
export function DailyChart({
  daily,
  title,
  caption,
  label = shortDay,
}: {
  readonly daily: DailyRow[];
  readonly title: string;
  readonly caption: string;
  readonly label?: (key: string) => string;
}) {
  const max = Math.max(1, ...daily.map((d) => Math.max(d.cleans, d.wallets)));
  return (
    <figure className="rounded-[28px] bg-black p-6 sm:p-8">
      <figcaption className="flex flex-wrap items-center justify-between gap-3">
        <span className="sr-only">{title}</span>
        <ul className="flex items-center gap-5 text-sm font-semibold">
          <li className="flex items-center gap-2">
            <span className="size-2.5 rounded-full bg-primary" /> Batch cleans
          </li>
          <li className="flex items-center gap-2">
            <span className="size-2.5 rounded-full bg-foreground" /> Wallets
          </li>
        </ul>
        <span className="text-xs text-muted-foreground">{caption}</span>
      </figcaption>
      <div className="mt-6 h-64">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={daily} margin={{ top: 8, right: 4, bottom: 0, left: -24 }}>
            <defs>
              <linearGradient id="stats-cleans" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor={LIME} stopOpacity={0.45} />
                <stop offset="100%" stopColor={LIME} stopOpacity={0} />
              </linearGradient>
            </defs>
            <CartesianGrid vertical={false} stroke="rgb(255 255 255 / 0.08)" />
            <XAxis
              dataKey="day"
              tickFormatter={label}
              tick={AXIS}
              tickLine={false}
              axisLine={false}
              interval="preserveStartEnd"
              minTickGap={28}
            />
            <YAxis
              allowDecimals={false}
              domain={[0, max]}
              tick={AXIS}
              tickLine={false}
              axisLine={false}
              width={48}
            />
            <Tooltip
              content={<ChartTooltip formatLabel={label} />}
              cursor={{ stroke: "rgb(255 255 255 / 0.2)" }}
              isAnimationActive={false}
            />
            <Area
              type="monotone"
              dataKey="cleans"
              stroke={LIME}
              strokeWidth={2}
              fill="url(#stats-cleans)"
              activeDot={{ r: 4, stroke: "#000", strokeWidth: 2 }}
              isAnimationActive={false}
            />
            <Line
              type="monotone"
              dataKey="wallets"
              stroke={WHITE}
              strokeWidth={2}
              dot={false}
              activeDot={{ r: 4, stroke: "#000", strokeWidth: 2 }}
              isAnimationActive={false}
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>
      <details className="mt-4 text-xs text-muted-foreground">
        <summary className="cursor-pointer select-none hover:text-foreground">
          View as table
        </summary>
        <table className="mt-3 w-full text-left tabular-nums">
          <thead>
            <tr>
              <th className="py-1 font-normal">Period</th>
              <th className="py-1 text-right font-normal">Batch cleans</th>
              <th className="py-1 text-right font-normal">Wallets</th>
            </tr>
          </thead>
          <tbody>
            {daily.map((d) => (
              <tr key={d.day} className="border-t border-white/10 text-foreground">
                <td className="py-1">{label(d.day)}</td>
                <td className="py-1 text-right">{d.cleans}</td>
                <td className="py-1 text-right">{d.wallets}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </details>
    </figure>
  );
}
