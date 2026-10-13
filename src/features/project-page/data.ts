import { getConfig } from "../../config.ts";
import { fetchCampusList } from "../campus/campus.ts";

export interface ProjectAttachment {
  name: string;
  href: string;
  external: boolean;
}

export interface ProjectCounts {
  attempts: number | null;
  distinctStudents: number | null;
  finished: number | null;
  retries: number | null;
  currentlyDoing: number | null;
  waitingEval: number | null;
}

export interface ProjectInfo {
  slug: string;
  name: string;
  kind: string | null;
  hours: number | null;
  xp: number | null;
  status: string | null;
  statusCount: string | null;
  attachments: ProjectAttachment[];
  myPageHref: string | null;
  canRegisterHref: string | null;
  description: string | null;
  skills: string[];
  counts: ProjectCounts;
}

export interface StatsJson {
  success?: { true?: number; false?: number; none?: number };
  average_team_lifespan?: { none?: number; true?: number; false?: number };
  final_mark_by_campus?: { name: string; data: [number, number][] }[];
  flags?: { name: string; y: number }[];
}

export interface OutcomeStat {
  count: number;
  pct: number;
}

export interface FlagStat {
  name: string;
  count: number;
  pct: number;
}

export interface CampusMarks {
  name: string;
  marks: { mark: number; pct: number }[];
}

export interface DerivedStats {
  totalTeams: number | null;
  success: OutcomeStat | null;
  fail: OutcomeStat | null;
  noGrade: OutcomeStat | null;
  lifespanNone: number | null;
  lifespanSuccess: number | null;
  lifespanFail: number | null;
  flags: FlagStat[];
  campuses: CampusMarks[];
}

export function currentSlug(): string | null {
  const m = location.pathname.match(/^\/projects\/([^/]+)\/?$/);
  return m ? m[1] : null;
}

function toNum(raw: string | undefined | null): number | null {
  if (!raw) return null;
  const digits = raw.replace(/[^\d]/g, "");
  if (!digits) return null;
  const n = Number(digits);
  return Number.isFinite(n) ? n : null;
}

function descriptionText(): string | null {
  for (const item of document.querySelectorAll<HTMLElement>(
    ".project-desc-item",
  )) {
    const heading = item.querySelector("h4");
    if (heading?.textContent?.trim().toLowerCase() !== "description") continue;
    const text = item.querySelector("p")?.textContent?.trim();
    if (text) return text;
  }
  return null;
}

export function collectProjectInfo(): ProjectInfo {
  const slug = currentSlug() ?? "";
  const name =
    document.querySelector(".project-header h3")?.textContent?.trim() || slug;

  let kind: string | null = null;
  let hours: number | null = null;
  let xp: number | null = null;
  for (const item of document.querySelectorAll<HTMLElement>(
    ".project-summary-item",
  )) {
    const text = (item.textContent || "").replace(/\s+/g, " ").trim();
    if (!/about\s+\d+\s*hours/i.test(text)) continue;
    kind = text.split(/[–-]/)[0]?.trim() || null;
    hours = toNum(text.match(/about\s+([\d ]+?)\s*hours/i)?.[1]);
    xp = toNum(text.match(/([\d ]+?)\s*XP/i)?.[1]);
    break;
  }

  const statusBox = document.querySelector<HTMLElement>(".project-status-box");
  const status = statusBox?.getAttribute("data-status") ?? null;
  const statusCount =
    statusBox?.querySelector("span")?.textContent?.trim() ?? null;

  const attachments: ProjectAttachment[] = Array.from(
    document.querySelectorAll<HTMLAnchorElement>(
      ".project-attachments-list .project-attachment-item a",
    ),
  ).map((a) => ({
    name: a.textContent?.trim() || a.href,
    href: a.href,
    external:
      a.target === "_blank" || /^https?:/.test(a.getAttribute("href") || ""),
  }));

  const myPageHref =
    document.querySelector<HTMLAnchorElement>(
      '.project-summary a[href$="/mine"]',
    )?.href ?? null;
  const canRegisterHref =
    document.querySelector<HTMLAnchorElement>(
      '#projects_registrations_stats a[href*="can_register"]',
    )?.href ?? null;

  const skills = (
    document.querySelector<HTMLElement>(".skill-list")?.innerText ?? ""
  )
    .split("\n")
    .map((s) => s.trim())
    .filter(Boolean);

  const statsText =
    document.querySelector<HTMLElement>("#projects_registrations_stats")
      ?.innerText ?? "";
  const counts: ProjectCounts = {
    attempts: toNum(statsText.match(/([\d ]+)\s*attempts/i)?.[1]),
    distinctStudents: toNum(
      statsText.match(/by\s+([\d ]+)\s*distinct students/i)?.[1],
    ),
    finished: toNum(statsText.match(/Finished\s+([\d ]+)\s*times/i)?.[1]),
    retries: toNum(statsText.match(/\(([\d ]+)\s*retries\)/i)?.[1]),
    currentlyDoing: toNum(
      statsText.match(/([\d ]+)\s*students currently doing/i)?.[1],
    ),
    waitingEval: toNum(
      statsText.match(/([\d ]+)\s*teams waiting for evaluation/i)?.[1],
    ),
  };

  return {
    slug,
    name,
    kind,
    hours,
    xp,
    status,
    statusCount,
    attachments,
    myPageHref,
    canRegisterHref,
    description: descriptionText(),
    skills,
    counts,
  };
}

export async function fetchProjectStats(
  slug: string,
): Promise<StatsJson | null> {
  if (!slug) return null;
  const key = `ft-project-stats:${slug}`;
  try {
    const cached = sessionStorage.getItem(key);
    if (cached) return JSON.parse(cached) as StatsJson;
  } catch {
    /* ignore */
  }
  try {
    const res = await fetch(`/projects/${slug}/stats.json`, {
      credentials: "same-origin",
      headers: { Accept: "application/json" },
    });
    if (!res.ok) return null;
    const json = (await res.json()) as StatsJson;
    try {
      sessionStorage.setItem(key, JSON.stringify(json));
    } catch {
      /* ignore */
    }
    return json;
  } catch {
    return null;
  }
}

const pct = (n: number, total: number): number =>
  total > 0 ? (n / total) * 100 : 0;

export function deriveStats(stats: StatsJson | null): DerivedStats {
  const empty: DerivedStats = {
    totalTeams: null,
    success: null,
    fail: null,
    noGrade: null,
    lifespanNone: null,
    lifespanSuccess: null,
    lifespanFail: null,
    flags: [],
    campuses: [],
  };
  if (!stats) return empty;

  const s = stats.success ?? {};
  const ok = s["true"] ?? 0;
  const ko = s["false"] ?? 0;
  const none = s.none ?? 0;
  const total = ok + ko + none;

  const life = stats.average_team_lifespan ?? {};

  const flags = (stats.flags ?? [])
    .filter((f) => f.name && f.y > 0)
    .map((f) => ({ name: f.name, count: f.y }));
  const flagTotal = flags.reduce((a, f) => a + f.count, 0) || 1;

  const campuses: CampusMarks[] = (stats.final_mark_by_campus ?? []).map(
    (c) => ({
      name: c.name,
      marks: [...(c.data ?? [])]
        .map(([mark, p]) => ({ mark, pct: p }))
        .sort((a, b) => a.mark - b.mark),
    }),
  );

  return {
    totalTeams: total || null,
    success: total ? { count: ok, pct: pct(ok, total) } : null,
    fail: total ? { count: ko, pct: pct(ko, total) } : null,
    noGrade: total ? { count: none, pct: pct(none, total) } : null,
    lifespanNone: life.none ?? null,
    lifespanSuccess: life["true"] ?? null,
    lifespanFail: life["false"] ?? null,
    flags: flags
      .map((f) => ({ ...f, pct: (f.count / flagTotal) * 100 }))
      .sort((a, b) => b.count - a.count),
    campuses,
  };
}

const normalizeName = (s: string): string =>
  s.toLowerCase().replace(/[^a-z0-9]/g, "");

export function groupFlags(flags: FlagStat[], thresholdPct = 1): FlagStat[] {
  if (flags.length === 0) return [];
  const major: FlagStat[] = [];
  let otherCount = 0;
  let otherPct = 0;
  for (const f of flags) {
    if (f.pct >= thresholdPct) major.push(f);
    else {
      otherCount += f.count;
      otherPct += f.pct;
    }
  }
  if (otherPct > 0)
    major.push({ name: "Other", count: otherCount, pct: otherPct });
  return major;
}

export interface MarkStat {
  mark: number | "Other";
  pct: number;
}

export function groupMarks(
  marks: { mark: number; pct: number }[],
  thresholdPct = 1,
): MarkStat[] {
  const major: MarkStat[] = [];
  let otherPct = 0;
  for (const m of marks) {
    if (m.pct >= thresholdPct) major.push({ mark: m.mark, pct: m.pct });
    else otherPct += m.pct;
  }
  if (otherPct > 0) major.push({ mark: "Other", pct: otherPct });
  return major;
}

export function findCampus(
  derived: DerivedStats,
  name: string | null,
): CampusMarks | null {
  if (!name) return null;
  const target = normalizeName(name);
  return derived.campuses.find((c) => normalizeName(c.name) === target) ?? null;
}

export async function resolveUserCampusName(): Promise<string | null> {
  try {
    const id = await getConfig("CLUSTERS_CAMPUS");
    if (!id) return null;
    const manifest = await fetchCampusList();
    return manifest.campuses.find((c) => c.id === id)?.name ?? null;
  } catch {
    return null;
  }
}
