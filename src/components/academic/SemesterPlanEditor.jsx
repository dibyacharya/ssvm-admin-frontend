import React, { useState } from 'react';
import { Plus, Save, Trash2, CalendarDays, ChevronDown, ChevronUp, Video, MapPin } from 'lucide-react';
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
  semesterPlan = { startDate: null, endDate: null, items: [], weeklyOffDays: [] },
  semesterRange = {},
  courses = [],
  slotTemplates = [],
  onAddItem,
  onUpdateItem,
  onRemoveItem,
  onUpdateWeeklyOffDays,
  onSave,
  onScheduleExamVConf,
  saving = false,
  periodLabel = 'Semester',
}) => {
  const [collapsed, setCollapsed] = useState(false);
  const items = semesterPlan?.items || [];
  const weeklyOffDays = Array.isArray(semesterPlan?.weeklyOffDays)
    ? semesterPlan.weeklyOffDays
    : [];

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

  // Filter slot templates by exam type for dropdown
  const getExamSlots = (examType) => {
    if (!examType) return slotTemplates.filter((s) => s.type === 'MID_EXAM' || s.type === 'END_EXAM');
    return slotTemplates.filter((s) => s.type === examType);
  };

  // All schedulable slots (for events — can use any non-BREAK slot)
  const getEventSlots = () => slotTemplates.filter((s) => s.type !== 'BREAK');

  const handleSlotSelect = (index, slotId) => {
    const slot = slotTemplates.find((s) => String(s._id) === String(slotId));
    if (slot) {
      onUpdateItem(index, 'slotTemplateId', slotId);
      onUpdateItem(index, 'startTime', slot.startTime);
      onUpdateItem(index, 'endTime', slot.endTime);
    } else {
      onUpdateItem(index, 'slotTemplateId', '');
      onUpdateItem(index, 'startTime', '');
      onUpdateItem(index, 'endTime', '');
    }
  };

  const isExamOrEvent = (type) => {
    const t = String(type || '').toUpperCase();
    return t === 'EXAM' || t === 'EVENT';
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
            const itemType = String(item.type || '').toUpperCase();
            const showExpanded = isExamOrEvent(itemType);
            const availableSlots = itemType === 'EXAM'
              ? getExamSlots(item.examType)
              : getEventSlots();

            return (
              <div
                key={item.itemId || `plan-item-${index}`}
                className={`border rounded-lg overflow-hidden ${
                  itemType === 'EXAM' ? 'border-orange-200' :
                  itemType === 'EVENT' ? 'border-blue-200' :
                  'border-red-200'
                }`}
              >
                {/* Card Header Row */}
                <div className={`px-3 py-2 flex items-center gap-2 flex-wrap ${
                  itemType === 'EXAM' ? 'bg-orange-50' :
                  itemType === 'EVENT' ? 'bg-blue-50' :
                  'bg-red-50'
                }`}>
                  {/* Type */}
                  <select
                    value={itemType}
                    className={`border rounded-md px-2 py-1 text-xs font-medium focus:ring-1 focus:ring-blue-400 outline-none ${typeConfig.color}`}
                    onChange={(e) => {
                      onUpdateItem(index, 'type', e.target.value);
                      // Reset enhanced fields when switching to HOLIDAY
                      if (e.target.value === 'HOLIDAY') {
                        onUpdateItem(index, 'course', null);
                        onUpdateItem(index, 'slotTemplateId', '');
                        onUpdateItem(index, 'startTime', '');
                        onUpdateItem(index, 'endTime', '');
                        onUpdateItem(index, 'mode', '');
                        onUpdateItem(index, 'roomNo', '');
                        onUpdateItem(index, 'campusNo', '');
                        onUpdateItem(index, 'examType', '');
                      }
                    }}
                  >
                    {PLAN_ITEM_TYPES.map((pt) => (
                      <option key={pt.value} value={pt.value}>{pt.label}</option>
                    ))}
                  </select>

                  {/* Title */}
                  <input
                    type="text"
                    value={item.title || ''}
                    placeholder={
                      itemType === 'EXAM' ? 'e.g., Mid Semester Exam - Physics' :
                      itemType === 'EVENT' ? 'e.g., Guest Lecture - AI' :
                      'e.g., Diwali Holiday'
                    }
                    className="flex-1 min-w-[150px] border border-gray-300 rounded-md px-2 py-1 text-xs focus:ring-1 focus:ring-blue-400 outline-none"
                    onChange={(e) => onUpdateItem(index, 'title', e.target.value)}
                  />

                  {/* Date */}
                  <input
                    type="date"
                    value={formatDateKey(item.date) || ''}
                    min={minDate}
                    max={maxDate}
                    className="border border-gray-300 rounded-md px-2 py-1 text-xs focus:ring-1 focus:ring-blue-400 outline-none"
                    onChange={(e) => onUpdateItem(index, 'date', e.target.value)}
                  />

                  {/* Delete */}
                  <button
                    type="button"
                    className="text-red-500 hover:text-red-700 transition p-1"
                    title="Remove item"
                    onClick={() => onRemoveItem(index)}
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>

                {/* Expanded Section for EXAM / EVENT */}
                {showExpanded && (
                  <div className="px-3 py-2.5 space-y-2.5 bg-white">
                    {/* Row 1: Exam Type (only for EXAM) + Course + Slot Template */}
                    <div className="flex items-center gap-2 flex-wrap">
                      {itemType === 'EXAM' && (
                        <div className="flex items-center gap-1">
                          <label className="text-[10px] text-gray-500 font-medium">Exam Type:</label>
                          <div className="flex gap-1">
                            {['MID_EXAM', 'END_EXAM'].map((et) => (
                              <button
                                key={et}
                                type="button"
                                onClick={() => {
                                  onUpdateItem(index, 'examType', et);
                                  // Reset slot selection when exam type changes
                                  onUpdateItem(index, 'slotTemplateId', '');
                                  onUpdateItem(index, 'startTime', '');
                                  onUpdateItem(index, 'endTime', '');
                                }}
                                className={`px-2 py-1 text-[10px] font-medium rounded border transition ${
                                  item.examType === et
                                    ? et === 'MID_EXAM'
                                      ? 'bg-orange-100 border-orange-300 text-orange-800'
                                      : 'bg-red-100 border-red-300 text-red-800'
                                    : 'bg-white border-gray-300 text-gray-500 hover:bg-gray-50'
                                }`}
                              >
                                {et === 'MID_EXAM' ? 'Mid Exam' : 'End Exam'}
                              </button>
                            ))}
                          </div>
                        </div>
                      )}

                      {/* Course */}
                      <div className="flex items-center gap-1 flex-1 min-w-[180px]">
                        <label className="text-[10px] text-gray-500 font-medium whitespace-nowrap">Course:</label>
                        <select
                          value={item.course || ''}
                          className="flex-1 border border-gray-300 rounded-md px-2 py-1 text-xs focus:ring-1 focus:ring-blue-400 outline-none"
                          onChange={(e) => onUpdateItem(index, 'course', e.target.value || null)}
                        >
                          <option value="">Select Course</option>
                          {courses.map((c) => (
                            <option key={c._id} value={c._id}>
                              {c.courseCode ? `${c.courseCode} - ` : ''}{c.title || c.name || 'Untitled'}
                            </option>
                          ))}
                        </select>
                      </div>

                      {/* Slot Template (Time) */}
                      <div className="flex items-center gap-1 min-w-[180px]">
                        <label className="text-[10px] text-gray-500 font-medium whitespace-nowrap">Time Slot:</label>
                        <select
                          value={item.slotTemplateId || ''}
                          className="flex-1 border border-gray-300 rounded-md px-2 py-1 text-xs focus:ring-1 focus:ring-blue-400 outline-none"
                          onChange={(e) => handleSlotSelect(index, e.target.value)}
                        >
                          <option value="">Select Slot</option>
                          {availableSlots.map((s) => (
                            <option key={s._id} value={s._id}>
                              {s.title || s.label || 'Slot'} ({s.startTime} - {s.endTime})
                            </option>
                          ))}
                        </select>
                      </div>
                    </div>

                    {/* Time display (if slot selected) */}
                    {item.startTime && item.endTime && (
                      <div className="text-[10px] text-gray-500">
                        ⏰ Scheduled: {item.startTime} - {item.endTime}
                      </div>
                    )}

                    {/* Row 2: Mode Toggle + Location/Virtual */}
                    <div className="flex items-center gap-2 flex-wrap">
                      <label className="text-[10px] text-gray-500 font-medium">Mode:</label>
                      <div className="flex gap-1">
                        <button
                          type="button"
                          onClick={() => onUpdateItem(index, 'mode', 'PHYSICAL')}
                          className={`inline-flex items-center gap-1 px-2 py-1 text-[10px] font-medium rounded border transition ${
                            item.mode === 'PHYSICAL'
                              ? 'bg-green-100 border-green-300 text-green-800'
                              : 'bg-white border-gray-300 text-gray-500 hover:bg-gray-50'
                          }`}
                        >
                          <MapPin className="w-3 h-3" /> Physical
                        </button>
                        <button
                          type="button"
                          onClick={() => onUpdateItem(index, 'mode', 'VIRTUAL')}
                          className={`inline-flex items-center gap-1 px-2 py-1 text-[10px] font-medium rounded border transition ${
                            item.mode === 'VIRTUAL'
                              ? 'bg-purple-100 border-purple-300 text-purple-800'
                              : 'bg-white border-gray-300 text-gray-500 hover:bg-gray-50'
                          }`}
                        >
                          <Video className="w-3 h-3" /> Virtual
                        </button>
                      </div>

                      {/* Physical fields */}
                      {item.mode === 'PHYSICAL' && (
                        <>
                          <input
                            type="text"
                            value={item.roomNo || ''}
                            placeholder="Room No"
                            className="border border-gray-300 rounded-md px-2 py-1 text-xs focus:ring-1 focus:ring-blue-400 outline-none w-24"
                            onChange={(e) => onUpdateItem(index, 'roomNo', e.target.value)}
                          />
                          <input
                            type="text"
                            value={item.campusNo || ''}
                            placeholder="Campus"
                            className="border border-gray-300 rounded-md px-2 py-1 text-xs focus:ring-1 focus:ring-blue-400 outline-none w-24"
                            onChange={(e) => onUpdateItem(index, 'campusNo', e.target.value)}
                          />
                        </>
                      )}

                      {/* Virtual meeting button */}
                      {item.mode === 'VIRTUAL' && (
                        <div className="flex items-center gap-2">
                          {item.isVconfScheduled ? (
                            <span className="inline-flex items-center gap-1 px-2 py-1 text-[10px] font-medium rounded bg-green-100 text-green-700 border border-green-200">
                              ✓ VConf Scheduled
                            </span>
                          ) : (
                            <button
                              type="button"
                              onClick={() => onScheduleExamVConf && onScheduleExamVConf(item.itemId)}
                              disabled={!item.startTime || !item.endTime || !item.date}
                              className="inline-flex items-center gap-1 px-2 py-1 text-[10px] font-medium rounded bg-purple-600 text-white hover:bg-purple-700 disabled:opacity-50 disabled:cursor-not-allowed transition"
                              title={!item.startTime || !item.endTime ? 'Select a time slot first' : !item.date ? 'Set a date first' : 'Schedule virtual meeting'}
                            >
                              <Video className="w-3 h-3" /> Schedule VConf
                            </button>
                          )}
                          {item.virtualLink && (
                            <span className="text-[10px] text-purple-600 truncate max-w-[150px]">
                              {item.virtualLink}
                            </span>
                          )}
                        </div>
                      )}
                    </div>

                    {/* Description */}
                    <input
                      type="text"
                      value={item.description || ''}
                      placeholder="Description (optional)"
                      className="w-full border border-gray-300 rounded-md px-2 py-1 text-xs focus:ring-1 focus:ring-blue-400 outline-none"
                      onChange={(e) => onUpdateItem(index, 'description', e.target.value)}
                    />
                  </div>
                )}

                {/* Simple description for HOLIDAY (no expanded section) */}
                {!showExpanded && (
                  <div className="px-3 py-2 bg-white">
                    <input
                      type="text"
                      value={item.description || ''}
                      placeholder="Description (optional)"
                      className="w-full border border-gray-300 rounded-md px-2 py-1 text-xs focus:ring-1 focus:ring-blue-400 outline-none"
                      onChange={(e) => onUpdateItem(index, 'description', e.target.value)}
                    />
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default SemesterPlanEditor;
