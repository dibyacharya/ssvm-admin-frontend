export const getPeriodLabel = (periodType) => {
  if (!periodType) return 'Period';
  return periodType.charAt(0).toUpperCase() + periodType.slice(1);
};
