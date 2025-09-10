import React from 'react';
import { BarChart3 } from 'lucide-react';

interface VisualizationButtonProps {
  messageId: string;
  messageText: string;
  onCreateVisualization: (messageId: string, messageText: string) => void;
  onViewVisualization: (messageId: string) => void;
  visualizationState: any;
}

export const VisualizationButton: React.FC<VisualizationButtonProps> = ({
  messageId,
  messageText,
  onCreateVisualization,
  onViewVisualization,
  visualizationState
}) => {
  const handleClick = () => {
    if (visualizationState?.content) {
      onViewVisualization(messageId);
    } else {
      onCreateVisualization(messageId, messageText);
    }
  };

  const buttonText = visualizationState?.isGenerating
    ? 'Generating...'
    : visualizationState?.content
    ? 'View Visualization'
    : 'Create Visualization';

  return (
    <button
      onClick={handleClick}
      disabled={visualizationState?.isGenerating}
      className="flex items-center space-x-2 bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700 disabled:from-gray-400 disabled:to-gray-500 text-white px-4 py-2 rounded-lg text-sm font-medium transition-all duration-200 transform hover:scale-105 disabled:scale-100 disabled:cursor-not-allowed min-h-[44px] touch-manipulation"
    >
      <BarChart3 className={`w-4 h-4 ${visualizationState?.isGenerating ? 'animate-pulse' : ''}`} />
      <span>{buttonText}</span>
    </button>
  );
};