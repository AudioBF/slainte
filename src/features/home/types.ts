export type InsightSeverity = 'info' | 'success' | 'warning';

export type DailyInsight = {
  id: string;
  severity: InsightSeverity;
  title: string;
  message: string;
  actionLabel?: string;
  actionRoute?: string;
};
