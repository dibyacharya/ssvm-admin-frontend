import React, { useState, useEffect } from 'react';
import { GitBranch } from 'lucide-react';
import { getProgramsDropdown } from '../services/program.service';
import { getBatchesDropdown, getBatchGanttData } from '../services/batch.service';
import GanttTimeline from '../components/gantt/GanttTimeline';
import GanttBar from '../components/gantt/GanttBar';
import GanttExamMarker from '../components/gantt/GanttExamMarker';

const courseColorMap = {
  theory: 'bg-blue-500',
  practical: 'bg-green-500',
  project: 'bg-orange-500',
};

const GanttChart = () => {
  const [programs, setPrograms] = useState([]);
  const [batches, setBatches] = useState([]);
  const [selectedProgram, setSelectedProgram] = useState('');
  const [selectedBatch, setSelectedBatch] = useState('');
  const [ganttData, setGanttData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  // Fetch programs on mount
  useEffect(() => {
    fetchPrograms();
  }, []);

  // Fetch batches when program changes
  useEffect(() => {
    if (selectedProgram) {
      fetchBatches(selectedProgram);
    } else {
      setBatches([]);
      setSelectedBatch('');
      setGanttData(null);
    }
  }, [selectedProgram]);

  // Fetch gantt data when batch changes
  useEffect(() => {
    if (selectedBatch) {
      fetchGanttData(selectedBatch);
    } else {
      setGanttData(null);
    }
  }, [selectedBatch]);

  const fetchPrograms = async () => {
    try {
      const res = await getProgramsDropdown();
      setPrograms(res || []);
    } catch (err) {
      setError('Failed to load programs');
    }
  };

  const fetchBatches = async (programId) => {
    try {
      setBatches([]);
      setSelectedBatch('');
      setGanttData(null);
      const res = await getBatchesDropdown(programId);
      setBatches(res || []);
    } catch (err) {
      setError('Failed to load batches');
    }
  };

  const fetchGanttData = async (batchId) => {
    try {
      setLoading(true);
      setError(null);
      const res = await getBatchGanttData(batchId);
      setGanttData(res || null);
    } catch (err) {
      setError('Failed to load Gantt chart data');
      setGanttData(null);
    } finally {
      setLoading(false);
    }
  };

  // Timeline boundaries
  const timelineStart = ganttData ? new Date(ganttData.batch.startDate) : null;
  const timelineEnd = ganttData ? new Date(ganttData.batch.expectedEndDate) : null;

  // Compute month count for scrollable min-width
  const monthCount = (() => {
    if (!timelineStart || !timelineEnd) return 0;
    const current = new Date(timelineStart.getFullYear(), timelineStart.getMonth(), 1);
    let count = 0;
    while (current <= timelineEnd) {
      count++;
      current.setMonth(current.getMonth() + 1);
    }
    return count;
  })();

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-indigo-100 rounded-lg">
            <GitBranch className="w-6 h-6 text-indigo-600" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Gantt Chart</h1>
            <p className="text-sm text-gray-500">Visualize batch schedule with semesters, courses, and exams</p>
          </div>
        </div>
      </div>

      {/* Cascading Selectors */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Program Select */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Program</label>
            <select
              value={selectedProgram}
              onChange={(e) => setSelectedProgram(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 text-sm"
            >
              <option value="">Select a program</option>
              {programs.map((p) => (
                <option key={p._id} value={p._id}>
                  {p.name}
                </option>
              ))}
            </select>
          </div>

          {/* Batch Select */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Batch</label>
            <select
              value={selectedBatch}
              onChange={(e) => setSelectedBatch(e.target.value)}
              disabled={!selectedProgram}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 text-sm disabled:bg-gray-100 disabled:cursor-not-allowed"
            >
              <option value="">Select a batch</option>
              {batches.map((b) => (
                <option key={b._id} value={b._id}>
                  {b.name}
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* Error */}
      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <p className="text-sm text-red-800">{error}</p>
        </div>
      )}

      {/* Loading */}
      {loading && (
        <div className="flex justify-center py-12">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600" />
        </div>
      )}

      {/* Gantt Chart */}
      {!loading && ganttData && timelineStart && timelineEnd && (
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 space-y-4">
          {/* Batch title */}
          <div className="flex items-center justify-between mb-2">
            <h2 className="text-lg font-semibold text-gray-900">{ganttData.batch.name}</h2>
            <span className="text-xs text-gray-500">
              {new Date(ganttData.batch.startDate).toLocaleDateString('en-IN', { month: 'short', year: 'numeric' })}
              {' - '}
              {new Date(ganttData.batch.expectedEndDate).toLocaleDateString('en-IN', { month: 'short', year: 'numeric' })}
            </span>
          </div>

          {/* Scrollable chart area */}
          <div className="overflow-x-auto overflow-y-hidden">
            <div style={{ minWidth: `${monthCount * 80}px` }}>
              {/* Timeline header */}
              <GanttTimeline startDate={ganttData.batch.startDate} endDate={ganttData.batch.expectedEndDate} />

              {/* Semesters */}
              <div className="space-y-6">
                {ganttData.semesters.map((semester) => (
                  <div key={semester._id} className="space-y-2">
                    {/* Semester label */}
                    <div className="text-sm font-semibold text-gray-700 pl-1">{semester.name}</div>

                    {/* Semester bar */}
                    <div className="relative">
                      <GanttBar
                        label={semester.name}
                        startDate={semester.startDate}
                        endDate={semester.endDate}
                        timelineStart={timelineStart}
                        timelineEnd={timelineEnd}
                        color="bg-slate-400"
                      />
                    </div>

                    {/* Course bars (indented) */}
                    <div className="pl-6 space-y-1">
                      {semester.courses && semester.courses.map((course) => {
                        const schedule = course.courseSchedule;
                        if (!schedule || !schedule.classStartDate || !schedule.classEndDate) return null;

                        const colorClass = courseColorMap[course.courseType] || 'bg-blue-500';

                        return (
                          <div key={course._id} className="relative">
                            <GanttBar
                              label={course.title}
                              startDate={schedule.classStartDate}
                              endDate={schedule.classEndDate}
                              timelineStart={timelineStart}
                              timelineEnd={timelineEnd}
                              color={colorClass}
                            />
                          </div>
                        );
                      })}
                    </div>

                    {/* Exam markers */}
                    <div className="relative h-6 pl-6">
                      {semester.midTermExamDate && (
                        <GanttExamMarker
                          date={semester.midTermExamDate}
                          label="Mid Exam"
                          timelineStart={timelineStart}
                          timelineEnd={timelineEnd}
                        />
                      )}
                      {semester.endTermExamDate && (
                        <GanttExamMarker
                          date={semester.endTermExamDate}
                          label="End Exam"
                          timelineStart={timelineStart}
                          timelineEnd={timelineEnd}
                        />
                      )}
                    </div>
                  </div>
                ))}
              </div>

              {/* Legend */}
              <div className="flex items-center gap-6 pt-4 border-t border-gray-200 mt-4">
                <span className="text-xs font-medium text-gray-500 uppercase tracking-wide">Legend:</span>
                <div className="flex items-center gap-2">
                  <span className="w-3 h-3 rounded-full bg-blue-500 inline-block" />
                  <span className="text-xs text-gray-600">Theory</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="w-3 h-3 rounded-full bg-green-500 inline-block" />
                  <span className="text-xs text-gray-600">Practical</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="w-3 h-3 rounded-full bg-orange-500 inline-block" />
                  <span className="text-xs text-gray-600">Project</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="w-3 h-3 bg-red-500 rotate-45 inline-block" />
                  <span className="text-xs text-gray-600">Exam</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Placeholder when no data */}
      {!loading && !ganttData && !error && (
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-12 text-center">
          <GitBranch className="w-12 h-12 text-gray-300 mx-auto mb-4" />
          <p className="text-gray-500 text-sm">Select a program and batch to view the Gantt chart</p>
        </div>
      )}
    </div>
  );
};

export default GanttChart;
