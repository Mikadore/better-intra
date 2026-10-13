import {
  Chart,
  DoughnutController,
  ArcElement,
  Tooltip,
  type ChartConfiguration,
} from "chart.js";

Chart.register(DoughnutController, ArcElement, Tooltip);

export function createDoughnutChart(
  canvas: HTMLCanvasElement,
  config: ChartConfiguration<"doughnut">,
): Chart {
  return new Chart(canvas, config);
}
