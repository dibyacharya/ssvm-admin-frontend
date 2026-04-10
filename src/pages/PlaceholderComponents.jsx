import React from 'react';
import { BarChart3, Award, MessageSquare, Settings as SettingsIcon } from 'lucide-react';

// Course Management Component


// Analytics Component
export const Analytics = () => {
  return (
    <div className="space-y-6">
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
        <div className="text-center py-12">
          <BarChart3 className="w-16 h-16 text-gray-400 mx-auto mb-4" />
          <h2 className="text-xl font-semibold text-[#1E293B] mb-2">Analytics & Reports</h2>
          <p className="text-gray-600">
            View analytics, usage reports, and system insights from this module.
          </p>
        </div>
      </div>
    </div>
  );
};

// Settings Component
export const Settings = () => {
  return (
    <div className="space-y-6">
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
        <div className="text-center py-12">
          <SettingsIcon className="w-16 h-16 text-gray-400 mx-auto mb-4" />
          <h2 className="text-xl font-semibold text-[#1E293B] mb-2">System Settings</h2>
          <p className="text-gray-600">
            Configure system settings, preferences, and general configurations from this module.
          </p>
        </div>
      </div>
    </div>
  );
};



// Certificates Component
export const Certificates = () => {
  return (
    <div className="space-y-6">
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
        <div className="text-center py-12">
          <Award className="w-16 h-16 text-gray-400 mx-auto mb-4" />
          <h2 className="text-xl font-semibold text-[#1E293B] mb-2">Certificate Management</h2>
          <p className="text-gray-600">
            Issue, manage, and track certificates and achievements from this module.
          </p>
        </div>
      </div>
    </div>
  );
};

// Forums Component
export const Forums = () => {
  return (
    <div className="space-y-6">
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
        <div className="text-center py-12">
          <MessageSquare className="w-16 h-16 text-gray-400 mx-auto mb-4" />
          <h2 className="text-xl font-semibold text-[#1E293B] mb-2">Forums & Discussions</h2>
          <p className="text-gray-600">
            Manage community forums, discussions, and student engagement from this module.
          </p>
        </div>
      </div>
    </div>
  );
};
