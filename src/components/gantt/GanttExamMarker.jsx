import React, { useState } from 'react';

const GanttExamMarker = ({ date, label, timelineStart, timelineEnd }) => {
  const [showTooltip, setShowTooltip] = useState(false);

  const totalSpan = timelineEnd - timelineStart;
  const left = ((new Date(date) - timelineStart) / totalSpan) * 100;
  const clampedLeft = Math.max(0, Math.min(100, left));

  const formattedDate = new Date(date).toLocaleDateString('en-IN', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });

  return (
    <div
      className="absolute top-1/2 -translate-y-1/2"
      style={{ left: `${clampedLeft}%` }}
      onMouseEnter={() => setShowTooltip(true)}
      onMouseLeave={() => setShowTooltip(false)}
    >
      {/* Diamond marker */}
      <div className="w-3 h-3 bg-red-500 rotate-45 cursor-pointer shadow-sm" />

      {/* Tooltip */}
      {showTooltip && (
        <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 z-50 pointer-events-none">
          <div className="bg-gray-900 text-white text-xs rounded-md px-3 py-2 whitespace-nowrap shadow-lg">
            <div className="font-medium">{label}</div>
            <div className="text-gray-300">{formattedDate}</div>
          </div>
          {/* Tooltip arrow */}
          <div className="w-2 h-2 bg-gray-900 rotate-45 mx-auto -mt-1" />
        </div>
      )}
    </div>
  );
};

export default GanttExamMarker;
