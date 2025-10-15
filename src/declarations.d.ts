declare module 'react-native-foreground-service' {
  export interface NotificationConfig {
    id?: number;
    title: string;
    message: string;      // supersami 버전은 message가 아니라 text
    icon?: string;
    importance?: number;
  }

  interface ForegroundService {
    startService(config: NotificationConfig): Promise<void>;
    stopService(): Promise<void>;
  }

  const foregroundService: ForegroundService;
  export default foregroundService;
}
