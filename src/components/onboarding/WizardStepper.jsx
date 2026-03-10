import React from 'react';
import { motion } from 'framer-motion';
import { Check } from 'lucide-react';

const WizardStepper = ({ currentStep, completedSteps, periodLabel, onStepClick }) => {
  const steps = [
    { number: 1, label: 'PROGRAM' },
    { number: 2, label: 'COURSES' },
    { number: 3, label: 'REVIEW' },
  ];
  return (
    <div className="sticky top-0 z-10 bg-white border-b border-gray-200 py-6">
      <div className="max-w-3xl mx-auto px-6">
        <div className="flex items-center justify-between">
          {steps.map((step, index) => {
            const isCompleted = completedSteps.has(step.number);
            const isCurrent = currentStep === step.number;
            const isPast = step.number < currentStep;

            return (
              <React.Fragment key={step.number}>
                {/* Step dot */}
                <button
                  type="button"
                  onClick={() => onStepClick?.(step.number)}
                  className="flex flex-col items-center cursor-pointer focus:outline-none"
                >
                  <motion.div
                    className={`
                      w-9 h-9 rounded-full flex items-center justify-center text-sm font-semibold
                      transition-colors duration-300
                      ${isCompleted || isPast
                        ? 'bg-blue-600 text-white'
                        : isCurrent
                          ? 'bg-blue-600 text-white ring-4 ring-blue-100'
                          : 'bg-gray-200 text-gray-500'
                      }
                    `}
                    animate={{ scale: isCurrent ? 1.15 : 1 }}
                    transition={{ type: 'spring', stiffness: 400, damping: 25 }}
                  >
                    {isCompleted || isPast ? (
                      <Check className="w-4 h-4" strokeWidth={3} />
                    ) : (
                      step.number
                    )}
                  </motion.div>
                  <span className={`
                    mt-2 text-[10px] uppercase tracking-widest font-medium
                    ${isCurrent ? 'text-blue-600' : isPast || isCompleted ? 'text-gray-500' : 'text-gray-400'}
                  `}>
                    {step.label}
                  </span>
                </button>

                {/* Connecting line */}
                {index < steps.length - 1 && (
                  <div className="flex-1 mx-3 h-0.5 bg-gray-200 rounded-full relative -mt-5">
                    <motion.div
                      className="absolute inset-y-0 left-0 bg-blue-600 rounded-full"
                      initial={{ width: '0%' }}
                      animate={{
                        width: step.number < currentStep ? '100%' : '0%'
                      }}
                      transition={{ duration: 0.4, ease: 'easeInOut' }}
                    />
                  </div>
                )}
              </React.Fragment>
            );
          })}
        </div>
      </div>
    </div>
  );
};

export default WizardStepper;
