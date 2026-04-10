import React from 'react';
import { Plus, Save, Trash2, Clock, GripVertical } from 'lucide-react';

const SLOT_TYPE_OPTIONS = ['CLASS', 'BREAK', 'MID_EXAM', 'END_EXAM'];

const SLOT_TYPE_LABELS = {
  CLASS: 'Class',
  BREAK: 'Break',
  MID_EXAM: 'Mid Exam',
  END_EXAM: 'End Exam',
};

const SLOT_ROW_COLORS = {
  MID_EXAM: 'bg-orange-50 border border-orange-200',
  END_EXAM: 'bg-red-50 border border-red-200',
  BREAK: 'bg-amber-50 border border-amber-200',
  CLASS: 'bg-white border border-gray-200',
};

const SlotTemplateEditor = ({
  slotTemplates = [],
  onUpdateTemplate,
  onAddTemplate,
  onRemoveTemplate,
  onSave,
  saving = false,
  periodLabel = 'Semester',
}) => {
  return (
    <div className="border border-gray-200 rounded-lg p-4 space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between gap-2 flex-wrap">
        <div>
          <h5 className="text-sm font-semibold text-gray-800 flex items-center gap-1.5">
            <Clock className="w-4 h-4 text-purple-500" />
            Slot Templates
          </h5>
          <p className="text-[11px] text-gray-400 mt-0.5">
            Define daily time slots for the timetable. Each slot represents a period in the day.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            type="button"
            className="inline-flex items-center gap-1 px-3 py-1.5 text-xs font-medium rounded-md bg-gray-100 text-gray-700 hover:bg-gray-200 transition"
            onClick={onAddTemplate}
          >
            <Plus className="w-3.5 h-3.5" /> Add Slot
          </button>
          <button
            type="button"
            className="inline-flex items-center gap-1 px-3 py-1.5 text-xs font-medium rounded-md bg-purple-600 text-white hover:bg-purple-700 disabled:opacity-50 transition"
            onClick={onSave}
            disabled={saving}
          >
            <Save className="w-3.5 h-3.5" />
            {saving ? 'Saving...' : 'Save Templates'}
          </button>
        </div>
      </div>

      {/* Column Headers (visible on lg+) */}
      <div className="hidden lg:grid grid-cols-[1fr_100px_110px_110px_1fr_60px_40px] gap-2 px-2 pb-1 border-b border-gray-100">
        <span className="text-[11px] font-medium text-gray-500 uppercase tracking-wide">Slot Name</span>
        <span className="text-[11px] font-medium text-gray-500 uppercase tracking-wide">Type</span>
        <span className="text-[11px] font-medium text-gray-500 uppercase tracking-wide">Start Time</span>
        <span className="text-[11px] font-medium text-gray-500 uppercase tracking-wide">End Time</span>
        <span className="text-[11px] font-medium text-gray-500 uppercase tracking-wide">Label <span className="normal-case font-normal text-gray-400">(for breaks)</span></span>
        <span className="text-[11px] font-medium text-gray-500 uppercase tracking-wide">Order</span>
        <span />
      </div>

      {/* Slot Rows */}
      <div className="space-y-2">
        {slotTemplates.map((template, templateIndex) => (
          <div
            key={template._id || `slot-template-${templateIndex}`}
            className={`grid grid-cols-1 lg:grid-cols-[1fr_100px_110px_110px_1fr_60px_40px] gap-2 items-center rounded-lg px-3 py-2 transition-colors ${SLOT_ROW_COLORS[template.type] || SLOT_ROW_COLORS.CLASS}`}
          >
            {/* Title */}
            <div>
              <label className="lg:hidden text-[10px] font-medium text-gray-500 uppercase mb-0.5 block">Slot Name</label>
              <input
                type="text"
                value={template.title || ''}
                placeholder="e.g. Slot 1, Lunch Break"
                className="w-full border border-gray-300 rounded-md px-2.5 py-1.5 text-xs focus:ring-1 focus:ring-purple-400 focus:border-purple-400 outline-none bg-white"
                onChange={(e) => onUpdateTemplate(templateIndex, 'title', e.target.value)}
              />
            </div>
            {/* Type */}
            <div>
              <label className="lg:hidden text-[10px] font-medium text-gray-500 uppercase mb-0.5 block">Type</label>
              <select
                value={template.type || 'CLASS'}
                className="w-full border border-gray-300 rounded-md px-2 py-1.5 text-xs focus:ring-1 focus:ring-purple-400 focus:border-purple-400 outline-none bg-white"
                onChange={(e) => onUpdateTemplate(templateIndex, 'type', e.target.value)}
              >
                {SLOT_TYPE_OPTIONS.map((opt) => (
                  <option key={opt} value={opt}>{SLOT_TYPE_LABELS[opt] || opt}</option>
                ))}
              </select>
            </div>
            {/* Start Time */}
            <div>
              <label className="lg:hidden text-[10px] font-medium text-gray-500 uppercase mb-0.5 block">Start Time</label>
              <input
                type="time"
                value={template.startTime || ''}
                className="w-full border border-gray-300 rounded-md px-2 py-1.5 text-xs focus:ring-1 focus:ring-purple-400 focus:border-purple-400 outline-none bg-white"
                onChange={(e) => onUpdateTemplate(templateIndex, 'startTime', e.target.value)}
              />
            </div>
            {/* End Time */}
            <div>
              <label className="lg:hidden text-[10px] font-medium text-gray-500 uppercase mb-0.5 block">End Time</label>
              <input
                type="time"
                value={template.endTime || ''}
                className="w-full border border-gray-300 rounded-md px-2 py-1.5 text-xs focus:ring-1 focus:ring-purple-400 focus:border-purple-400 outline-none bg-white"
                onChange={(e) => onUpdateTemplate(templateIndex, 'endTime', e.target.value)}
              />
            </div>
            {/* Label */}
            <div>
              <label className="lg:hidden text-[10px] font-medium text-gray-500 uppercase mb-0.5 block">Label</label>
              <input
                type="text"
                value={template.label || ''}
                placeholder={['BREAK', 'MID_EXAM', 'END_EXAM'].includes(template.type) ? 'e.g. Lunch Break, Tea Break' : 'N/A for class slots'}
                disabled={!['BREAK', 'MID_EXAM', 'END_EXAM'].includes(template.type)}
                className="w-full border border-gray-300 rounded-md px-2.5 py-1.5 text-xs focus:ring-1 focus:ring-purple-400 focus:border-purple-400 outline-none bg-white disabled:bg-gray-50 disabled:text-gray-400 disabled:cursor-not-allowed"
                onChange={(e) => onUpdateTemplate(templateIndex, 'label', e.target.value)}
              />
            </div>
            {/* Order */}
            <div>
              <label className="lg:hidden text-[10px] font-medium text-gray-500 uppercase mb-0.5 block">Order</label>
              <input
                type="number"
                value={template.order || ''}
                placeholder="#"
                min={1}
                title="Display order — slots are shown in this sequence in the timetable"
                className="w-full border border-gray-300 rounded-md px-2 py-1.5 text-xs focus:ring-1 focus:ring-purple-400 focus:border-purple-400 outline-none bg-white w-16"
                onChange={(e) => onUpdateTemplate(templateIndex, 'order', Number(e.target.value) || 1)}
              />
            </div>
            {/* Delete */}
            <div className="flex justify-center">
              <button
                type="button"
                className="text-red-400 hover:text-red-600 hover:bg-red-50 rounded-md transition p-1.5"
                title="Remove this slot"
                onClick={() => onRemoveTemplate(templateIndex)}
              >
                <Trash2 className="w-4 h-4" />
              </button>
            </div>
          </div>
        ))}
        {slotTemplates.length === 0 && (
          <div className="text-center py-8 text-gray-400">
            <Clock className="w-8 h-8 mx-auto mb-2 opacity-40" />
            <p className="text-xs">
              No slot templates defined yet.
            </p>
            <p className="text-[11px] mt-1">
              Click <span className="font-medium text-gray-600">"+ Add Slot"</span> to create time slots for your timetable.
            </p>
          </div>
        )}
      </div>
    </div>
  );
};

export default SlotTemplateEditor;
