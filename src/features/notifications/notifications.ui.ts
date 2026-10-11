import { html, render } from "lit-html";
import { unsafeHTML } from "lit-html/directives/unsafe-html.js";
import { ref } from "lit-html/directives/ref.js";
import { renderDiscordPanel } from "../discord/discord.ui.ts";
import { generateQrDataUrl } from "../calendar/qr.ts";
import SMARTPHONE_SVG from "../../assets/svg/smartphone.svg?raw";

const MOBILE_URL = "https://mobile.betterintra.com";

const icon = (size: number) =>
  unsafeHTML(
    SMARTPHONE_SVG.replace("<svg", `<svg width="${size}" height="${size}"`),
  );

function renderMobileCard(el: Element | undefined) {
  if (!el) return;
  const container = el as HTMLElement;
  const qr = generateQrDataUrl(MOBILE_URL, 200);

  render(
    html`
      <details
        class="collapse collapse-arrow bg-base-200 shadow-sm col-span-full"
        open
      >
        <summary
          class="collapse-title text-base font-medium flex items-center gap-2"
        >
          <span class="size-5 flex items-center justify-center"
            >${icon(20)}</span
          >
          <span>Mobile (PWA)</span>
        </summary>
        <div class="collapse-content">
          <p class="text-sm opacity-60 mt-1 mb-4">
            Install Better Intra on your phone for evaluation push
            notifications, your dashboard, friends, and clusters.
          </p>
          <div class="flex flex-col sm:flex-row items-center gap-5">
            <img
              src="${qr}"
              alt="Mobile app QR code"
              width="180"
              height="180"
              class="rounded-lg bg-white p-2"
            />
            <div class="flex-1 flex flex-col gap-3 w-full">
              <a
                href="${MOBILE_URL}"
                target="_blank"
                rel="noopener noreferrer"
                class="btn btn-primary gap-2"
              >
                ${icon(18)} Open mobile.betterintra.com
              </a>
              <div class="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
                <div class="bg-base-100 rounded-lg p-2.5">
                  <span class="font-semibold">iPhone / iPad</span>
                  <p class="opacity-60 mt-0.5">
                    Open in Safari → Share → Add to Home Screen.
                  </p>
                </div>
                <div class="bg-base-100 rounded-lg p-2.5">
                  <span class="font-semibold">Android</span>
                  <p class="opacity-60 mt-0.5">
                    Open in Chrome → menu → Install app.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </details>
    `,
    container,
  );
}

export function renderNotificationsPanel() {
  return html`<div ${ref(renderMobileCard)} class="col-span-full"></div>
    ${renderDiscordPanel()}`;
}
