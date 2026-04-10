import React from 'react';
import { motion } from 'framer-motion';

const GanttBar = ({ label, startDate, endDate, timelineStart, timelineEnd, color = 'bg-purple-500', className = '' }) => {
  const totalSpan = timelineEnd - timelineStart;
  const left = ((new Date(startDate) - timelineStart) / totalSpan) * 100;
  const width = ((new Date(endDate) - new Date(startDate)) / totalSpan) * 100;

  // Clamp values to stay within bounds
  const clampedLeft = Math.max(0, Math.min(100, left));
  const clampedWidth = Math.max(0, Math.min(100 - clampedLeft, width));

  return (
    <motion.div
      className={`relative h-8 rounded-md flex items-center px-2 text-white text-xs font-medium overflow-hidden cursor-default ${color} ${className}`}
      style={{
        marginLeft: `${clampedLeft}%`,
        width: `${clampedWidth}%`,
      }}
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.4 }}
      title={label}
    >
      <span className="truncate">{label}</span>
    </motion.div>
  );
};

export default GanttBar;
