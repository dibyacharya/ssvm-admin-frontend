import React from 'react';
import { Plus, Save, Trash2 } from 'lucide-react';

const SLOT_TYPE_OPTIONS = ['CLASS', 'BREAK'];

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
    <div className="border border-gray-200 rounded-lg p-3 space-y-3">
      <div className="flex items-center justify-between gap-2 flex-wrap">
        <h5 className="text-sm font-medium text-gray-800">Slot Templates</h5>
        <div className="flex items-center gap-2">
          <button
            type="button"
            className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-medium rounded-md bg-gray-100 text-gray-700 hover:bg-gray-200 transition"
            onClick={onAddTemplate}
          >
            <Plus className="w-3.5 h-3.5" /> Add Slot
          </button>
          <button
            type="button"
            className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-medium rounded-md bg-blue-600 text-white hover:bg-blue-700 disabled:opacity-50 transition"
            onClick={onSave}
            disabled={saving}
          >
            <Save className="w-3.5 h-3.5" />
            {saving ? 'Saving...' : 'Save Templates'}
          </button>
        </div>
      </div>
      <div className="space-y-2">
        {slotTemplates.map((template, templateIndex) => (
          <div
            key={template._id || `slot-template-${templateIndex}`}
            className="grid grid-cols-1 lg:grid-cols-7 gap-2 items-center"
          >
            {/* Title */}
            <input
              type="text"
              value={template.title || ''}
              placeholder="Title"
              className="border border-gray-300 rounded-md px-2 py-1.5 text-xs focus:ring-1 focus:ring-blue-400 outline-none"
              onChange={(e) => onUpdateTemplate(templateIndex, 'title', e.target.value)}
            />
            {/* Type */}
            <select
              value={template.type || 'CLASS'}
              className="border border-gray-300 rounded-md px-2 py-1.5 text-xs focus:ring-1 focus:ring-blue-400 outline-none"
              onChange={(e) => onUpdateTemplate(templateIndex, 'type', e.target.value)}
            >
              {SLOT_TYPE_OPTIONS.map((opt) => (
                <option key={opt} value={opt}>{opt}</option>
              ))}
            </select>
            {/* Start Time */}
            <input
              type="time"
              value={template.startTime || ''}
              className="border border-gray-300 rounded-md px-2 py-1.5 text-xs focus:ring-1 focus:ring-blue-400 outline-none"
              onChange={(e) => onUpdateTemplate(templateIndex, 'startTime', e.target.value)}
            />
            {/* End Time */}
            <input
              type="time"
              value={template.endTime || ''}
              className="border border-gray-300 rounded-md px-2 py-1.5 text-xs focus:ring-1 focus:ring-blue-400 outline-none"
              onChange={(e) => onUpdateTemplate(templateIndex, 'endTime', e.target.value)}
            />
            {/* Label (BREAK only) */}
            <input
              type="text"
              value={template.label || ''}
              placeholder={template.type === 'BREAK' ? 'Label' : '—'}
              disabled={template.type !== 'BREAK'}
              className="border border-gray-300 rounded-md px-2 py-1.5 text-xs focus:ring-1 focus:ring-blue-400 outline-none disabled:bg-gray-50 disabled:text-gray-400"
              onChange={(e) => onUpdateTemplate(templateIndex, 'label', e.target.value)}
            />
            {/* Order */}
            <input
              type="number"
              value={template.order || ''}
              placeholder="#"
              min={1}
              className="border border-gray-300 rounded-md px-2 py-1.5 text-xs focus:ring-1 focus:ring-blue-400 outline-none w-16"
              onChange={(e) => onUpdateTemplate(templateIndex, 'order', Number(e.target.value) || 1)}
            />
            {/* Delete */}
            <button
              type="button"
              className="text-red-500 hover:text-red-700 transition p-1"
              title="Remove template"
              onClick={() => onRemoveTemplate(templateIndex)}
            >
              <Trash2 className="w-4 h-4" />
            </button>
          </div>
        ))}
        {slotTemplates.length === 0 && (
          <p className="text-xs text-gray-400 text-center py-3">
            No slot templates defined. Click "Add Slot" to create time slot templates.
          </p>
        )}
      </div>
    </div>
  );
};

export default SlotTemplateEditor;
