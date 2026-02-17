import React from 'react';
import { Clock } from 'lucide-react';

const ComingSoon = () => {
  return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] text-center">
      <div className="w-20 h-20 bg-blue-50 rounded-full flex items-center justify-center mb-6">
        <Clock className="w-10 h-10 text-blue-500" />
      </div>
      <h1 className="text-3xl font-bold text-gray-900 mb-3">Coming Soon</h1>
      <p className="text-gray-500 max-w-md">
        This feature is currently under development. We're working hard to bring it to you soon.
      </p>
    </div>
  );
};

export default ComingSoon;
