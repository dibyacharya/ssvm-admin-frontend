export const calculateEndDate = (startDate, periodType) => {
  if (!startDate || !periodType) return null;
  const date = new Date(startDate);
  switch (periodType) {
    case 'semester':
      date.setMonth(date.getMonth() + 6);
      break;
    case 'term':
      date.setMonth(date.getMonth() + 3);
      break;
    case 'month':
      date.setDate(date.getDate() + 30);
      break;
    case 'week':
      date.setDate(date.getDate() + 5);
      break;
    case 'days':
      date.setDate(date.getDate() + 1);
      break;
    default:
      return null;
  }
  return date.toISOString().split('T')[0];
};

export const calculateBatchEndDate = (startDate, periodType, totalSemesters) => {
  if (!startDate || !periodType || !totalSemesters) return null;
  let current = startDate;
  for (let i = 0; i < totalSemesters; i++) {
    const next = calculateEndDate(current, periodType);
    if (!next) return null;
    current = next;
  }
  return current;
};

export const formatMonthYear = (dateString) => {
  if (!dateString) return '';
  const date = new Date(dateString);
  return date.toLocaleDateString('en-US', { month: 'short', year: 'numeric' });
};
