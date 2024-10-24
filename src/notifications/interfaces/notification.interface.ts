export interface Notification {
  userId: string;
  title: string;
  body: string;
  data?: Record<string, any>;
  isRead?: boolean;
  iconUrl?: string;
}
