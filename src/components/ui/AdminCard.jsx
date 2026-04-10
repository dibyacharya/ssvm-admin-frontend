import React from 'react';
import { motion } from 'framer-motion';

const AdminCard = ({
  children,
  className = '',
  padding = 'p-5',
  hover = false,
  animate = true,
  delay = 0,
  onClick,
  ...props
}) => {
  const Wrapper = animate ? motion.div : 'div';
  const animProps = animate ? {
    initial: { opacity: 0, y: 10 },
    animate: { opacity: 1, y: 0 },
    transition: { duration: 0.3, delay, ease: 'easeOut' },
  } : {};

  return (
    <Wrapper
      className={`
        admin-card ${padding}
        ${hover ? 'hover:border-[rgba(255,255,255,0.12)] hover:bg-[#F8FAFC] cursor-pointer' : ''}
        ${className}
      `}
      onClick={onClick}
      {...animProps}
      {...props}
    >
      {children}
    </Wrapper>
  );
};

export default AdminCard;
