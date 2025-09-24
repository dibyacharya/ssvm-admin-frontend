import React from 'react';
import { BookOpen, Calendar, BarChart3,  Award, MessageSquare } from 'lucide-react';

// Course Management Component


// Analytics Component
export const Analytics = () => {
  return (
    <div className="space-y-6">
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
        <div className="text-center py-12">
          <BarChart3 className="w-16 h-16 text-gray-400 mx-auto mb-4" />
          <h2 className="text-xl font-semibold text-gray-900 mb-2">Analytics & Reports</h2>
          <p className="text-gray-600">
            View detailed analytics, usage reports, and system insights. This feature is coming soon.
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
          <Settings className="w-16 h-16 text-gray-400 mx-auto mb-4" />
          <h2 className="text-xl font-semibold text-gray-900 mb-2">System Settings</h2>
          <p className="text-gray-600">
            Configure system settings, preferences, and general configurations. This feature is coming soon.
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
          <h2 className="text-xl font-semibold text-gray-900 mb-2">Certificate Management</h2>
          <p className="text-gray-600">
            Issue, manage, and track certificates and achievements. This feature is coming soon.
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
          <h2 className="text-xl font-semibold text-gray-900 mb-2">Forums & Discussions</h2>
          <p className="text-gray-600">
            Manage community forums, discussions, and student engagement. This feature is coming soon.
          </p>
        </div>
      </div>
    </div>
  );
};