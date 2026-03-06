import React, { useState } from 'react';
import { Plus, Save, Trash2, CalendarDays, ChevronDown, ChevronUp } from 'lucide-react';
import { PLAN_ITEM_TYPES, getPlanItemTypeConfig, formatDateKey } from '../../utils/timetableUtils';

const WEEK_DAYS_CONFIG = [
  { key: 'monday', label: 'Mon' },
  { key: 'tuesday', label: 'Tue' },
  { key: 'wednesday', label: 'Wed' },
  { key: 'thursday', label: 'Thu' },
  { key: 'friday', label: 'Fri' },
  { key: 'saturday', label: 'Sat' },
  { key: 'sunday', label: 'Sun' },
];

const SemesterPlanEditor = ({
  semesterPlan = { startDate: null, endDate: null, items: [], weeklyOffDays: ['sunday'] },
  semesterRange = {},
  onAddItem,
  onUpdateItem,
  onRemoveItem,
  onUpdateWeeklyOffDays,
  onSave,
  saving = false,
  periodLabel = 'Semester',
}) => {
  const [collapsed, setCollapsed] = useState(false);
  const items = semesterPlan?.items || [];
  const weeklyOffDays = Array.isArray(semesterPlan?.weeklyOffDays)
    ? semesterPlan.weeklyOffDays
    : ['sunday'];

  const minDate = semesterRange?.startDate || '';
  const maxDate = semesterRange?.endDate || '';

  const holidayCount = items.filter((i) => String(i.type || '').toUpperCase() === 'HOLIDAY').length;
  const eventCount = items.filter((i) => String(i.type || '').toUpperCase() === 'EVENT').length;
  const examCount = items.filter((i) => String(i.type || '').toUpperCase() === 'EXAM').length;

  const toggleWeeklyOff = (dayKey) => {
    const updated = weeklyOffDays.includes(dayKey)
      ? weeklyOffDays.filter((d) => d !== dayKey)
      : [...weeklyOffDays, dayKey];
    if (onUpdateWeeklyOffDays) onUpdateWeeklyOffDays(updated);
  };

  return (
    <div className="border border-gray-200 rounded-lg overflow-hidden">
      {/* Header */}
      <div
        className="px-3 py-2 bg-gray-50 border-b border-gray-200 flex items-center justify-between cursor-pointer select-none"
        onClick={() => setCollapsed((prev) => !prev)}
      >
        <div className="flex items-center gap-2">
          <CalendarDays className="w-4 h-4 text-gray-600" />
          <span className="text-sm font-medium text-gray-800">
            {periodLabel} Plan (Holidays, Events, Exams)
          </span>
          <div className="flex items-center gap-1 ml-2">
            {holidayCount > 0 && (
              <span className="px-1.5 py-0.5 text-[10px] font-medium rounded bg-red-100 text-red-700">
                {holidayCount} Holiday{holidayCount > 1 ? 's' : ''}
              </span>
            )}
            {eventCount > 0 && (
              <span className="px-1.5 py-0.5 text-[10px] font-medium rounded bg-blue-100 text-blue-700">
                {eventCount} Event{eventCount > 1 ? 's' : ''}
              </span>
            )}
            {examCount > 0 && (
              <span className="px-1.5 py-0.5 text-[10px] font-medium rounded bg-orange-100 text-orange-700">
                {examCount} Exam{examCount > 1 ? 's' : ''}
              </span>
            )}
          </div>
        </div>
        <div className="flex items-center gap-2">
          {!collapsed && (
            <>
              <button
                type="button"
                className="inline-flex items-center gap-1 px-2 py-1 text-xs font-medium rounded-md bg-gray-100 text-gray-700 hover:bg-gray-200 transition"
                onClick={(e) => {
                  e.stopPropagation();
                  onAddItem({ type: 'HOLIDAY', title: '', description: '', date: '' });
                }}
              >
                <Plus className="w-3.5 h-3.5" /> Add Item
              </button>
              <button
                type="button"
                className="inline-flex items-center gap-1 px-2 py-1 text-xs font-medium rounded-md bg-blue-600 text-white hover:bg-blue-700 disabled:opacity-50 transition"
                onClick={(e) => {
                  e.stopPropagation();
                  onSave();
                }}
                disabled={saving}
              >
                <Save className="w-3 h-3" />
                {saving ? 'Saving...' : 'Save Plan'}
              </button>
            </>
          )}
          {collapsed ? (
            <ChevronDown className="w-4 h-4 text-gray-500" />
          ) : (
            <ChevronUp className="w-4 h-4 text-gray-500" />
          )}
        </div>
      </div>

      {/* Content */}
      {!collapsed && (
        <div className="p-3 space-y-4">
          {/* ── Weekly Off Days ── */}
          <div className="border border-gray-200 rounded-lg p-3 bg-gray-50">
            <p className="text-xs font-medium text-gray-700 mb-2">
              Weekly Off Days
            </p>
            <div className="flex flex-wrap gap-2">
              {WEEK_DAYS_CONFIG.map((day) => {
                const isOff = weeklyOffDays.includes(day.key);
                return (
                  <button
                    key={day.key}
                    type="button"
                    onClick={() => toggleWeeklyOff(day.key)}
                    className={`px-3 py-1.5 text-xs font-medium rounded-lg border transition ${
                      isOff
                        ? 'bg-red-100 border-red-300 text-red-800 shadow-sm'
                        : 'bg-white border-gray-300 text-gray-600 hover:bg-gray-100'
                    }`}
                  >
                    {isOff ? '🚫 ' : ''}{day.label}
                  </button>
                );
              })}
            </div>
            <p className="text-[10px] text-gray-500 mt-1.5">
              Selected days will be off every week. Classes won't be scheduled on these days.
            </p>
          </div>

          {/* ── Plan Items (Holidays, Events, Exams) ── */}
          {items.length === 0 && (
            <p className="text-xs text-gray-400 text-center py-3">
              No plan items yet. Add holidays, events, or exams to the {periodLabel.toLowerCase()} plan.
            </p>
          )}
          {items.map((item, index) => {
            const typeConfig = getPlanItemTypeConfig(item.type);
            return (
              <div
                key={item.itemId || `plan-item-${index}`}
                className="grid grid-cols-1 lg:grid-cols-12 gap-2 items-center"
              >
                {/* Type (2 cols) */}
                <div className="lg:col-span-2">
                  <select
                    value={String(item.type || 'HOLIDAY').toUpperCase()}
                    className={`w-full border rounded-md px-2 py-1.5 text-xs font-medium focus:ring-1 focus:ring-blue-400 outline-none ${typeConfig.color}`}
                    onChange={(e) => onUpdateItem(index, 'type', e.target.value)}
                  >
                    {PLAN_ITEM_TYPES.map((pt) => (
                      <option key={pt.value} value={pt.value}>{pt.label}</option>
                    ))}
                  </select>
                </div>

                {/* Title (3 cols) */}
                <div className="lg:col-span-3">
                  <input
                    type="text"
                    value={item.title || ''}
                    placeholder="Title (e.g., Diwali Holiday)"
                    className="w-full border border-gray-300 rounded-md px-2 py-1.5 text-xs focus:ring-1 focus:ring-blue-400 outline-none"
                    onChange={(e) => onUpdateItem(index, 'title', e.target.value)}
                  />
                </div>

                {/* Date (2 cols) */}
                <div className="lg:col-span-2">
                  <input
                    type="date"
                    value={formatDateKey(item.date) || ''}
                    min={minDate}
                    max={maxDate}
                    className="w-full border border-gray-300 rounded-md px-2 py-1.5 text-xs focus:ring-1 focus:ring-blue-400 outline-none"
                    onChange={(e) => onUpdateItem(index, 'date', e.target.value)}
                  />
                </div>

                {/* Description (4 cols) */}
                <div className="lg:col-span-4">
                  <input
                    type="text"
                    value={item.description || ''}
                    placeholder="Description (optional)"
                    className="w-full border border-gray-300 rounded-md px-2 py-1.5 text-xs focus:ring-1 focus:ring-blue-400 outline-none"
                    onChange={(e) => onUpdateItem(index, 'description', e.target.value)}
                  />
                </div>

                {/* Delete (1 col) */}
                <div className="lg:col-span-1 flex justify-center">
                  <button
                    type="button"
                    className="text-red-500 hover:text-red-700 transition p-1"
                    title="Remove item"
                    onClick={() => onRemoveItem(index)}
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default SemesterPlanEditor;
