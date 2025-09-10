export interface Message {
  id: string;
  text: string;
  isUser: boolean;
  timestamp: Date;
  isExpanded?: boolean;
  visualization?: string;
  isCentered?: boolean;
}

export interface VisualizationState {
  messageId: string;
  isGenerating: boolean;
  content: string | null;
  isVisible: boolean;
}