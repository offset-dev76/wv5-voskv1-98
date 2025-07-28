export interface Task {
  type: 'none' | 'open_app' | 'timer' | 'environment_control' | 'service_request';
  payload?: {
    name?: string;
    duration?: string;
    device?: string;
    action?: string;
    value?: string;
    request?: string;
    search_query?: string;
    query?: string;
    quantity?: string;
    items?: Array<{
      name: string;
      quantity: string;
    }>;
  };
}

export interface TranscriptionResult {
  transcription: string;
  task: Task;
}