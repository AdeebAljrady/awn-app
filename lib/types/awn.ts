export enum ViewState {
  HOME = "HOME",
  QUIZ_ACTIVE = "QUIZ_ACTIVE",
  SUMMARY = "SUMMARY",
}

export interface FileData {
  name: string;
  content: string;
  type: string;
  base64?: string;
  url?: string; // Public URL from Supabase Storage
}

export interface SavedSummary {
  id: string;
  fileName: string;
  unit: string;
  content: string;
  date: string;
  drawingData?: string;
}

export interface ChatMessage {
  id: string;
  role: "user" | "model";
  text: string;
  timestamp: Date;
}

export interface MindMapNode {
  id?: string;
  label: string;
  children?: MindMapNode[];
}

export interface QuizQuestion {
  question: string;
  options: string[];
  correctAnswer: number;
  justification: string;
  example: string;
}

export interface GeneratedQuiz {
  questions: QuizQuestion[];
}

