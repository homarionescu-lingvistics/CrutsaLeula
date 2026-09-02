export type NeighborhoodRank = {
  title: string;
  badge: string;
  progressPercent: number;
  nextTitle: string | null;
  xpCurrent: number;
  xpNext: number | null;
};

export function getNeighborhoodRank(xp: number): NeighborhoodRank {
  if (xp > 500) {
    return {
      title: "Baron de Cartier",
      badge: "👑",
      progressPercent: 100,
      nextTitle: null,
      xpCurrent: xp,
      xpNext: null,
    };
  }

  if (xp > 100) {
    const span = 500 - 101;
    const progress = Math.min(100, Math.round(((xp - 101) / span) * 100));
    return {
      title: "Gospodar de Zonă",
      badge: "🚜",
      progressPercent: progress,
      nextTitle: "Baron de Cartier",
      xpCurrent: xp,
      xpNext: 501,
    };
  }

  const progress = Math.min(100, Math.round((xp / 100) * 100));
  return {
    title: "Ucenic de Cătun",
    badge: "🌱",
    progressPercent: progress,
    nextTitle: "Gospodar de Zonă",
    xpCurrent: xp,
    xpNext: 101,
  };
}

export function buildWalletQrToken(userId: string, balance: number): string {
  const payload = {
    v: 1,
    uid: userId,
    bal: balance,
    iat: Date.now(),
  };
  return Buffer.from(JSON.stringify(payload)).toString("base64url");
}
