
export interface Activity {
  id: string;
  caseId: string;
  activityType: string;
  note: string | null;
  startingStatus: string | null;
  endingStatus: string | null;
  startedAt: string;
  endedAt: string | null;
  durationSeconds: number;
}
