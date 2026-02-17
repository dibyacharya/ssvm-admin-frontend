export const safeDisplay = (value, fallback = '---') => {
  if (value === null || value === undefined || value === '') return fallback;
  return value;
};

export const safeCourseType = (type) => {
  const types = { theory: 'Theory', practical: 'Practical', project: 'Project' };
  return types[type] || safeDisplay(type);
};

export const safeCohortLabel = (course) => {
  if (!course) return '---';
  return course.cohortLabel || course.courseCode || course.title || '---';
};

export const safeCredits = (cp) => {
  if (!cp) return 0;
  return (cp.lecture || 0) + (cp.tutorial || 0) + (cp.practical || 0);
};
