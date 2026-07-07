import React from 'react';

interface InfoTooltipProps {
  text: string;
  position?: 'up' | 'down';
}

export const InfoTooltip: React.FC<InfoTooltipProps> = ({ text, position = 'down' }) => {
  return (
    <span className="info-tooltip-wrapper">
      <span className="info-tooltip-icon">i</span>
      <span className={`info-tooltip-content ${position === 'up' ? 'tooltip-up' : ''}`}>{text}</span>
    </span>
  );
};
