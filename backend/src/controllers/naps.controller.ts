import type { Request, Response } from "express";

import {
  createNap,
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

export function getNapHistoryController(_req: Request, res: Response) {
  const naps = listNaps();

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

  const summary = getNapSummary();

  res.status(200).json({
    summary: {
      monthlyCount: summary.monthlyCount,
      avgMinutes: summary.avgMinutes,
      avgWakeRating: summary.avgWakeRating,
    },
    days,
  });
}

export function createNapController(req: Request, res: Response) {
  res.status(201).json(createNap(req.body as NapInput));
}
