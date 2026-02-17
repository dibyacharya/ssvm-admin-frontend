import React from 'react';

const MONTH_ABBR = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

const GanttTimeline = ({ startDate, endDate }) => {
  const start = new Date(startDate);
  const end = new Date(endDate);

  // Build array of months between start and end
  const months = [];
  const current = new Date(start.getFullYear(), start.getMonth(), 1);

  while (current <= end) {
    months.push({
      label: MONTH_ABBR[current.getMonth()],
      year: current.getFullYear(),
    });
    current.setMonth(current.getMonth() + 1);
  }

  if (months.length === 0) return null;

  return (
    <div className="flex flex-row bg-gray-100 rounded-t-lg border-b border-gray-200">
      {months.map((month, index) => (
        <div
          key={index}
          className="flex-1 text-center py-2 border-r border-gray-200 last:border-r-0"
        >
          <span className="text-xs text-gray-600 font-medium">
            {month.label}
          </span>
          <span className="text-xs text-gray-400 ml-1">
            {month.year}
          </span>
        </div>
      ))}
    </div>
  );
};

export default GanttTimeline;
