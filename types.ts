export interface FileItem {
  id: string;
  path: string;
  content: string;
}

export type GeminiMode = 'thinking' | 'low-latency';

export interface ChatMessage {
  role: 'user' | 'model';
  text: string;
}

export interface ScaffoldFile {
  path: string;
  content: string;
}

export interface ScaffoldResponse {
  files: ScaffoldFile[];
}
