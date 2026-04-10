import React, { useEffect, useState } from 'react';
import { motion } from 'framer-motion';

const AdminStatCard = ({
  title,
  value,
  subtitle,
  icon: Icon,
  trend,
  trendValue,
  color = 'orange',
  delay = 0,
  className = '',
}) => {
  const [displayValue, setDisplayValue] = useState(0);
  const numericValue = typeof value === 'number' ? value : parseInt(value) || 0;

  useEffect(() => {
    if (typeof value !== 'number') { setDisplayValue(value); return; }
    const duration = 1200;
    const steps = 50;
    const increment = numericValue / steps;
    let current = 0;
    const timer = setInterval(() => {
      current += increment;
      if (current >= numericValue) {
        setDisplayValue(numericValue);
        clearInterval(timer);
      } else {
        setDisplayValue(Math.floor(current));
      }
    }, duration / steps);
    return () => clearInterval(timer);
  }, [numericValue, value]);

  const colorMap = {
    orange: { iconBg: 'bg-orange-500/10', iconColor: 'text-orange-400', accent: 'border-l-orange-500' },
    cyan: { iconBg: 'bg-cyan-500/10', iconColor: 'text-cyan-400', accent: 'border-l-cyan-500' },
    emerald: { iconBg: 'bg-emerald-500/10', iconColor: 'text-emerald-400', accent: 'border-l-emerald-500' },
    rose: { iconBg: 'bg-rose-500/10', iconColor: 'text-rose-400', accent: 'border-l-rose-500' },
    indigo: { iconBg: 'bg-indigo-500/10', iconColor: 'text-indigo-400', accent: 'border-l-indigo-500' },
  };

  const c = colorMap[color] || colorMap.orange;

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3, delay }}
      className={`
        admin-stat-card border-l-2 ${c.accent}
        ${className}
      `}
    >
      <div className="flex items-start justify-between">
        <div>
          <p className="text-[#94A3B8] text-xs font-medium uppercase tracking-wider">{title}</p>
          <p className="text-2xl font-bold text-[#1E293B] mt-1 font-mono">{displayValue}</p>
          {subtitle && <p className="text-[#94A3B8] text-xs mt-1">{subtitle}</p>}
          {trend && (
            <span className={`inline-flex items-center gap-1 mt-2 text-xs font-medium ${trend === 'up' ? 'text-emerald-400' : 'text-rose-400'}`}>
              <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3"
                className={trend === 'down' ? 'rotate-180' : ''}>
                <polyline points="18 15 12 9 6 15" />
              </svg>
              {trendValue}
            </span>
          )}
        </div>
        {Icon && (
          <div className={`flex items-center justify-center w-10 h-10 rounded-lg ${c.iconBg} ${c.iconColor}`}>
            <Icon size={20} />
          </div>
        )}
      </div>
    </motion.div>
  );
};

export default AdminStatCard;
