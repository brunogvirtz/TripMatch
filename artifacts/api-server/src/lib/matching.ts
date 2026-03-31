import { db, swipesTable, groupMembersTable, destinationsTable } from "@workspace/db";
import { eq, and } from "drizzle-orm";

export interface DestinationScore {
  destinationId: number;
  destinationName: string;
  country: string;
  imageUrl: string;
  groupScore: number;
  matchPercentage: number;
  consensusLevel: "high" | "medium" | "low";
  likeCount: number;
  dislikeCount: number;
  superlikeCount: number;
  totalVotes: number;
}

export async function computeGroupScores(groupId: number): Promise<DestinationScore[]> {
  const members = await db
    .select()
    .from(groupMembersTable)
    .where(eq(groupMembersTable.groupId, groupId));

  const totalMembers = members.length;
  if (totalMembers === 0) return [];

  const swipes = await db
    .select()
    .from(swipesTable)
    .where(eq(swipesTable.groupId, groupId));

  const destinations = await db.select().from(destinationsTable);

  const destMap = new Map(destinations.map((d) => [d.id, d]));

  const byDest = new Map<number, number[]>();
  for (const s of swipes) {
    if (!byDest.has(s.destinationId)) byDest.set(s.destinationId, []);
    byDest.get(s.destinationId)!.push(s.value);
  }

  const results: DestinationScore[] = [];

  for (const [destId, values] of byDest.entries()) {
    const dest = destMap.get(destId);
    if (!dest) continue;

    const likeCount = values.filter((v) => v === 1).length;
    const dislikeCount = values.filter((v) => v === -1).length;
    const superlikeCount = values.filter((v) => v === 2).length;
    const totalVotes = values.length;

    const rawAvg = values.reduce((a, b) => a + b, 0) / totalVotes;

    const mean = rawAvg;
    const variance =
      values.reduce((acc, v) => acc + Math.pow(v - mean, 2), 0) / totalVotes;
    const stdDev = Math.sqrt(variance);

    const groupScore = mean - stdDev * 0.5;

    const positiveVotes = likeCount + superlikeCount;
    const matchPercentage = Math.round((positiveVotes / totalVotes) * 100);

    let consensusLevel: "high" | "medium" | "low";
    if (stdDev < 0.5) consensusLevel = "high";
    else if (stdDev < 1.0) consensusLevel = "medium";
    else consensusLevel = "low";

    results.push({
      destinationId: destId,
      destinationName: dest.name,
      country: dest.country,
      imageUrl: dest.imageUrl,
      groupScore,
      matchPercentage,
      consensusLevel,
      likeCount,
      dislikeCount,
      superlikeCount,
      totalVotes,
    });
  }

  results.sort((a, b) => b.groupScore - a.groupScore);
  return results;
}

export async function getSingleDestinationScore(
  groupId: number,
  destinationId: number
): Promise<DestinationScore | null> {
  const scores = await computeGroupScores(groupId);
  return scores.find((s) => s.destinationId === destinationId) ?? null;
}
