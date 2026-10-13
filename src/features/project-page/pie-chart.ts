import type { ChartConfiguration } from "chart.js";

export interface PieSlice {
  label: string;
  value: number;
  tooltip: string;
}

let chart: { destroy(): void } | null = null;
let seq = 0;

export function resolveCssColor(el: Element, value: string): string {
  const m = value.match(/^var\((--[^,)]+)(?:,\s*([^)]+))?\s*\)$/);
  if (!m) return value;
  const computed = getComputedStyle(el).getPropertyValue(m[1]).trim();
  return computed || m[2]?.trim() || value;
}

export function destroyPieChart(): void {
  seq++;
  chart?.destroy();
  chart = null;
}

export async function mountPieChart(
  canvas: HTMLCanvasElement,
  slices: PieSlice[],
  colors: string[],
  animate: boolean,
): Promise<void> {
  destroyPieChart();
  const mine = seq;
  if (slices.length === 0) return;

  const mod = await import("./pie-chart-impl.ts");
  if (mine !== seq || !canvas.isConnected) return;

  const config: ChartConfiguration<"doughnut"> = {
    type: "doughnut",
    data: {
      labels: slices.map((s) => s.label),
      datasets: [
        {
          data: slices.map((s) => s.value),
          backgroundColor: slices.map((_, i) => colors[i % colors.length]),
          borderWidth: 0,
          hoverOffset: 6,
        },
      ],
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      cutout: "62%",
      animation: animate ? undefined : false,
      plugins: {
        legend: { display: false },
        tooltip: {
          callbacks: {
            label: (ctx) => ` ${slices[ctx.dataIndex].tooltip}`,
          },
        },
      },
    },
  };

  chart = mod.createDoughnutChart(canvas, config);
}
