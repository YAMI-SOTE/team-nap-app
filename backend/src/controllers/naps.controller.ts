import type { Request, Response } from "express";

import { firstParam } from "../lib/params.js";
import { requireUserId } from "../lib/request-user.js";
import {
  createNap,
  getNap,
  getNapSummary,
  listNaps,
  type NapEntry,
  type NapInput,
} from "../services/naps.service.js";

const STARS = (n: number) => "★".repeat(n) + "☆".repeat(Math.max(0, 5 - n));

function toRecord(nap: NapEntry) {
  return {
    id: nap.id,
    time: `${nap.start}〜${nap.end}`,
    detail: `${nap.minutes}分 ・ 目覚め ${STARS(nap.wakeStars)} ・ 集中度 +${nap.focusDeltaPt}pt`,
  };
}

export async function getNapHistoryController(req: Request, res: Response) {
  const userId = requireUserId(req);
  const naps = await listNaps(userId);

  const byDay = new Map<string, { dateLabel: string; records: NapEntry[] }>();
  for (const nap of naps) {
    const bucket = byDay.get(nap.date) ?? { dateLabel: nap.dateLabel, records: [] };
    bucket.records.push(nap);
    byDay.set(nap.date, bucket);
  }

  const days = [...byDay.entries()]
    .sort((a, b) => (a[0] < b[0] ? 1 : -1))
    .map(([, bucket]) => ({
      dateLabel: bucket.dateLabel,
      records: bucket.records.map(toRecord),
    }));

  const summary = await getNapSummary(userId);

  res.status(200).json({
    summary: {
      monthlyCount: summary.monthlyCount,
      avgMinutes: summary.avgMinutes,
      avgWakeRating: summary.avgWakeRating,
    },
    days,
  });
}

/** `GET /naps/:id` — one record + its stored AI advice (ふりかえり screen). */
export async function getNapController(req: Request, res: Response) {
  const nap = await getNap(requireUserId(req), firstParam(req, "id"));
  res.status(200).json({
    id: nap.id,
    date: nap.date,
    dateLabel: nap.dateLabel,
    start: nap.start,
    end: nap.end,
    minutes: nap.minutes,
    wakeStars: nap.wakeStars,
    focusDeltaPt: nap.focusDeltaPt,
    summaryLabel: `${nap.minutes}分の仮眠 ・ ${nap.start}〜${nap.end}`,
    aiAdvice: nap.aiAdvice,
  });
}

export async function createNapController(req: Request, res: Response) {
  const nap = await createNap(requireUserId(req), req.body as NapInput);
  res.status(201).json({
    id: nap.id,
    date: nap.date,
    dateLabel: nap.dateLabel,
    start: nap.start,
    end: nap.end,
    minutes: nap.minutes,
    wakeStars: nap.wakeStars,
    focusDeltaPt: nap.focusDeltaPt,
    aiAdvice: nap.aiAdvice,
  });
}
