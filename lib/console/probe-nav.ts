/**

 * Resolve the Live Probe Run path for an engagement.

 * Probe route is the canonical launch target (legacy `/verify/[sessionId]` is deprecated).

 */

export async function resolveEngagementLaunchPath(

  engagementId: string

): Promise<{ path: string; usedFallback: boolean }> {

  return {

    path: `/engagements/${engagementId}/probe`,

    usedFallback: false,

  };

}


