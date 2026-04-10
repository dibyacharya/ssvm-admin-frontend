import React, { useState, useEffect } from 'react';
import { createCourse } from '../services/courses.service';
import { getAllSemester } from '../services/semester.services';
import { useParams, useNavigate } from 'react-router-dom';
import { getPeriodLabel } from '../utils/periodLabel';

const CreateCourse = () => {
  const { codeid } = useParams();
  const navigate = useNavigate();
  console.log("Course Code ID from URL:", codeid);

  const [formData, setFormData] = useState({
    title: '',
    aboutCourse: '',
    courseCode: '',
    semester: '',
    courseType: '',
    learningOutcomes: [''],
    courseSchedule: {
      classStartDate: '',
      classEndDate: '',
      midSemesterExamDate: '',
      endSemesterExamDate: '',
      classDaysAndTimes: [{ day: '', time: '' }]
    },
    weeklyPlan: [{ weekNumber: 1, topics: [''] }],
    creditPoints: {
      lecture: 0,
      tutorial: 0,
      practical: 0,
    },
    syllabus: {
      modules: [{
        moduleNumber: 1,
        moduleTitle: '',
        description: ''
      }]
    }
  });

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitMessage, setSubmitMessage] = useState('');
  const [semesters, setSemesters] = useState([]);
  const [loadingSemesters, setLoadingSemesters] = useState(true);
  const [semesterError, setSemesterError] = useState(null);

  // Computed total credits (read-only)
  const totalCredits = (formData.creditPoints.lecture || 0) +
    (formData.creditPoints.tutorial || 0) +
    (formData.creditPoints.practical || 0);

  // Derive period label from selected semester's program
  const selectedSem = semesters.find((s) => s._id === formData.semester);
  const periodLabel = getPeriodLabel(selectedSem?.batch?.program?.periodType);

  // Fetch semesters and teachers when component mounts
  useEffect(() => {
    const fetchSemesters = async () => {
      try {
        setLoadingSemesters(true);
        setSemesterError(null);
        const semesterData = await getAllSemester();
        setSemesters(Array.isArray(semesterData) ? semesterData : semesterData.semesters || []);
      } catch (error) {
        setSemesterError('Failed to load semesters');
        console.error('Error fetching semesters:', error);
      } finally {
        setLoadingSemesters(false);
      }
    };

    fetchSemesters();
  }, []);

  // Set the course code from URL parameter when component mounts
  useEffect(() => {
    if (codeid) {
      setFormData(prev => ({
        ...prev,
        courseCode: codeid
      }));
    }
  }, [codeid]);

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleNestedInputChange = (section, field, value) => {
    setFormData(prev => ({
      ...prev,
      [section]: {
        ...prev[section],
        [field]: value
      }
    }));
  };

  const handleArrayInputChange = (field, index, value) => {
    setFormData(prev => ({
      ...prev,
      [field]: prev[field].map((item, i) => i === index ? value : item)
    }));
  };

  const addArrayItem = (field, defaultValue = '') => {
    setFormData(prev => ({
      ...prev,
      [field]: [...prev[field], defaultValue]
    }));
  };

  const removeArrayItem = (field, index) => {
    setFormData(prev => ({
      ...prev,
      [field]: prev[field].filter((_, i) => i !== index)
    }));
  };

  const handleClassDayTimeChange = (index, field, value) => {
    setFormData(prev => ({
      ...prev,
      courseSchedule: {
        ...prev.courseSchedule,
        classDaysAndTimes: prev.courseSchedule.classDaysAndTimes.map((item, i) => 
          i === index ? { ...item, [field]: value } : item
        )
      }
    }));
  };

  const addClassDayTime = () => {
    setFormData(prev => ({
      ...prev,
      courseSchedule: {
        ...prev.courseSchedule,
        classDaysAndTimes: [...prev.courseSchedule.classDaysAndTimes, { day: '', time: '' }]
      }
    }));
  };

  const removeClassDayTime = (index) => {
    setFormData(prev => ({
      ...prev,
      courseSchedule: {
        ...prev.courseSchedule,
        classDaysAndTimes: prev.courseSchedule.classDaysAndTimes.filter((_, i) => i !== index)
      }
    }));
  };

  const handleWeeklyPlanChange = (index, field, value) => {
    setFormData(prev => ({
      ...prev,
      weeklyPlan: prev.weeklyPlan.map((week, i) => 
        i === index ? { ...week, [field]: value } : week
      )
    }));
  };

  const handleWeeklyTopicChange = (weekIndex, topicIndex, value) => {
    setFormData(prev => ({
      ...prev,
      weeklyPlan: prev.weeklyPlan.map((week, i) => 
        i === weekIndex ? {
          ...week,
          topics: week.topics.map((topic, j) => j === topicIndex ? value : topic)
        } : week
      )
    }));
  };

  const addWeeklyPlan = () => {
    setFormData(prev => ({
      ...prev,
      weeklyPlan: [...prev.weeklyPlan, { 
        weekNumber: prev.weeklyPlan.length + 1, 
        topics: [''] 
      }]
    }));
  };

  const addTopicToWeek = (weekIndex) => {
    setFormData(prev => ({
      ...prev,
      weeklyPlan: prev.weeklyPlan.map((week, i) => 
        i === weekIndex ? { ...week, topics: [...week.topics, ''] } : week
      )
    }));
  };

  const handleModuleChange = (index, field, value) => {
    setFormData(prev => ({
      ...prev,
      syllabus: {
        ...prev.syllabus,
        modules: prev.syllabus.modules.map((module, i) => 
          i === index ? { ...module, [field]: value } : module
        )
      }
    }));
  };

  const addModule = () => {
    setFormData(prev => ({
      ...prev,
      syllabus: {
        ...prev.syllabus,
        modules: [...prev.syllabus.modules, {
          moduleNumber: prev.syllabus.modules.length + 1,
          moduleTitle: '',
          description: ''
        }]
      }
    }));
  };

  const handleSubmit = async () => {
    setIsSubmitting(true);
    setSubmitMessage('');

    try {
      // Filter out empty learning outcomes and topics
      const cleanedData = {
        ...formData,
        courseType: formData.courseType || undefined,
        learningOutcomes: formData.learningOutcomes.filter(outcome => outcome.trim() !== ''),
        weeklyPlan: formData.weeklyPlan.map(week => ({
          ...week,
          topics: week.topics.filter(topic => topic.trim() !== '')
        })).filter(week => week.topics.length > 0),
        courseSchedule: {
          ...formData.courseSchedule,
          classDaysAndTimes: formData.courseSchedule.classDaysAndTimes.filter(
            item => item.day && item.time
          )
        },
        syllabus: {
          modules: formData.syllabus.modules.filter(
            module => module.moduleTitle.trim() !== '' || module.description.trim() !== ''
          ).map(module => ({
            ...module,
            videos: [],
            links: [],
            pdfs: [],
            ppts: []
          }))
        },
        attendance: { sessions: {} }
      };

      const response = await createCourse(cleanedData);
      const createdCourseId = response?.course?._id;
      if (createdCourseId) {
        navigate(`/courses/${createdCourseId}?tab=description`, { replace: true });
      } else {
        navigate('/courses/list', { replace: true });
      }
    } catch (error) {
      const msg = error.response?.data?.error || error.response?.data?.message || 'Error creating course. Please try again.';
      setSubmitMessage(msg);
      console.error('Error:', error);
    } finally {
      setIsSubmitting(false);
    }
  };

  const formatDate = (dateString) => {
    if (!dateString) return '';
    try {
      return new Date(dateString).toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'short',
        day: 'numeric'
      });
    } catch {
      return dateString;
    }
  };

  return (
    <div className="max-w-4xl mx-auto p-6 bg-white rounded-lg">
      <div className="mb-4 rounded-md border border-[rgba(245,158,11,0.3)] bg-[rgba(245,158,11,0.1)] px-4 py-2 text-sm text-[#F59E0B]">
        Legacy Create Page. After creation, continue in the Course Details tabs.
      </div>
      <h1 className="text-3xl font-bold mb-8 text-[#1E293B]">Create New Course</h1>
      
      <div className="space-y-8">
        {/* Basic Information */}
        <div className="bg-white p-6 rounded-lg">
          <h2 className="text-xl font-semibold mb-4 text-[#94A3B8]">Basic Information</h2>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
            <div>
              <label className="block text-sm font-medium text-[#94A3B8] mb-1">Course Title *</label>
              <input
                type="text"
                name="title"
                value={formData.title}
                onChange={handleInputChange}
                required
                className="w-full px-3 py-2 border border-[rgba(0,0,0,0.08)] rounded-md bg-white text-[#1E293B] focus:outline-none focus:ring-2 focus:ring-[#F97316]"
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium text-[#94A3B8] mb-1">Course Code</label>
              <input
                type="text"
                name="courseCode"
                value={formData.courseCode}
                disabled
                className="w-full px-3 py-2 border border-[rgba(0,0,0,0.08)] rounded-md bg-white text-[#94A3B8] cursor-not-allowed"
              />
              <p className="text-xs text-[#94A3B8] mt-1">Course code is fixed and cannot be modified</p>
            </div>
          </div>

          <div className="mb-4">
            <label className="block text-sm font-medium text-[#94A3B8] mb-1">{periodLabel} *</label>
            {loadingSemesters ? (
              <div className="w-full px-3 py-2 border border-[rgba(0,0,0,0.08)] rounded-md bg-white text-[#94A3B8]">
                Loading {periodLabel.toLowerCase()}s...
              </div>
            ) : semesterError ? (
              <div className="w-full px-3 py-2 border border-[rgba(239,68,68,0.3)] rounded-md bg-[rgba(220,38,38,0.08)] text-[#EF4444]">
                {semesterError}
              </div>
            ) : (
              <select
                name="semester"
                value={formData.semester}
                onChange={handleInputChange}
                required
                className="w-full px-3 py-2 border border-[rgba(0,0,0,0.08)] rounded-md bg-white text-[#1E293B] focus:outline-none focus:ring-2 focus:ring-[#F97316]"
              >
                <option value="">Select a {periodLabel.toLowerCase()}</option>
                {semesters.map((semester) => (
                  <option key={semester._id} value={semester._id}>
                    {semester.name} ({formatDate(semester.startDate)} - {formatDate(semester.endDate)})
                  </option>
                ))}
              </select>
            )}
            {!loadingSemesters && !semesterError && semesters.length === 0 && (
              <p className="text-xs text-[#F97316] mt-1">No {periodLabel.toLowerCase()}s available. Please create a {periodLabel.toLowerCase()} first.</p>
            )}
          </div>

          <div>
            <label className="block text-sm font-medium text-[#94A3B8] mb-1">Course Type</label>
            <select
              name="courseType"
              value={formData.courseType}
              onChange={handleInputChange}
              className="w-full px-3 py-2 border border-[rgba(0,0,0,0.08)] rounded-md bg-white text-[#1E293B] focus:outline-none focus:ring-2 focus:ring-[#F97316]"
            >
              <option value="">Select Type</option>
              <option value="theory">Theory</option>
              <option value="practical">Practical</option>
              <option value="project">Project</option>
            </select>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          </div>

          <div>
            <label className="block text-sm font-medium text-[#94A3B8] mb-1">About Course *</label>
            <textarea
              name="aboutCourse"
              value={formData.aboutCourse}
              onChange={handleInputChange}
              required
              rows="4"
              className="w-full px-3 py-2 border border-[rgba(0,0,0,0.08)] rounded-md bg-white text-[#1E293B] focus:outline-none focus:ring-2 focus:ring-[#F97316]"
            />
          </div>
        </div>

        {/* Learning Outcomes */}
        <div className="bg-white p-6 rounded-lg">
          <h2 className="text-xl font-semibold mb-4 text-[#94A3B8]">Learning Outcomes</h2>
          {formData.learningOutcomes.map((outcome, index) => (
            <div key={index} className="mb-2 flex gap-2">
              <input
                type="text"
                value={outcome}
                onChange={(e) => handleArrayInputChange('learningOutcomes', index, e.target.value)}
                placeholder={`Learning outcome ${index + 1}`}
                className="flex-1 px-3 py-2 border border-[rgba(0,0,0,0.08)] rounded-md bg-white text-[#1E293B] focus:outline-none focus:ring-2 focus:ring-[#F97316]"
              />
              {index > 0 && (
                <button
                  type="button"
                  onClick={() => removeArrayItem('learningOutcomes', index)}
                  className="px-3 py-2 bg-[rgba(220,38,38,0.08)]0 text-white rounded-md hover:bg-red-600"
                >
                  Remove
                </button>
              )}
            </div>
          ))}
          <button
            type="button"
            onClick={() => addArrayItem('learningOutcomes')}
            className="mt-2 px-4 py-2 bg-[#F97316] text-white rounded-md hover:bg-[#EA580C]"
          >
            Add Learning Outcome
          </button>
        </div>

        {/* Course Schedule */}
        <div className="bg-white p-6 rounded-lg">
          <h2 className="text-xl font-semibold mb-4 text-[#94A3B8]">Course Schedule</h2>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
            <div>
              <label className="block text-sm font-medium text-[#94A3B8] mb-1">Class Start Date</label>
              <input
                type="date"
                value={formData.courseSchedule.classStartDate}
                onChange={(e) => handleNestedInputChange('courseSchedule', 'classStartDate', e.target.value)}
                className="w-full px-3 py-2 border border-[rgba(0,0,0,0.08)] rounded-md bg-white text-[#1E293B] focus:outline-none focus:ring-2 focus:ring-[#F97316]"
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium text-[#94A3B8] mb-1">Class End Date</label>
              <input
                type="date"
                value={formData.courseSchedule.classEndDate}
                onChange={(e) => handleNestedInputChange('courseSchedule', 'classEndDate', e.target.value)}
                className="w-full px-3 py-2 border border-[rgba(0,0,0,0.08)] rounded-md bg-white text-[#1E293B] focus:outline-none focus:ring-2 focus:ring-[#F97316]"
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium text-[#94A3B8] mb-1">Mid Exam Date</label>
              <input
                type="date"
                value={formData.courseSchedule.midSemesterExamDate}
                onChange={(e) => handleNestedInputChange('courseSchedule', 'midSemesterExamDate', e.target.value)}
                className="w-full px-3 py-2 border border-[rgba(0,0,0,0.08)] rounded-md bg-white text-[#1E293B] focus:outline-none focus:ring-2 focus:ring-[#F97316]"
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium text-[#94A3B8] mb-1">End Exam Date</label>
              <input
                type="date"
                value={formData.courseSchedule.endSemesterExamDate}
                onChange={(e) => handleNestedInputChange('courseSchedule', 'endSemesterExamDate', e.target.value)}
                className="w-full px-3 py-2 border border-[rgba(0,0,0,0.08)] rounded-md bg-white text-[#1E293B] focus:outline-none focus:ring-2 focus:ring-[#F97316]"
              />
            </div>
          </div>

          <h3 className="text-lg font-medium mb-2 text-[#94A3B8]">Class Days and Times</h3>
          {formData.courseSchedule.classDaysAndTimes.map((classTime, index) => (
            <div key={index} className="mb-2 flex gap-2">
              <select
                value={classTime.day}
                onChange={(e) => handleClassDayTimeChange(index, 'day', e.target.value)}
                className="px-3 py-2 border border-[rgba(0,0,0,0.08)] rounded-md bg-white text-[#1E293B] focus:outline-none focus:ring-2 focus:ring-[#F97316]"
              >
                <option value="">Select Day</option>
                <option value="Monday">Monday</option>
                <option value="Tuesday">Tuesday</option>
                <option value="Wednesday">Wednesday</option>
                <option value="Thursday">Thursday</option>
                <option value="Friday">Friday</option>
                <option value="Saturday">Saturday</option>
                <option value="Sunday">Sunday</option>
              </select>
              <input
                type="text"
                value={classTime.time}
                onChange={(e) => handleClassDayTimeChange(index, 'time', e.target.value)}
                placeholder="e.g., 10:00-11:30"
                className="flex-1 px-3 py-2 border border-[rgba(0,0,0,0.08)] rounded-md bg-white text-[#1E293B] focus:outline-none focus:ring-2 focus:ring-[#F97316]"
              />
              {index > 0 && (
                <button
                  type="button"
                  onClick={() => removeClassDayTime(index)}
                  className="px-3 py-2 bg-[rgba(220,38,38,0.08)]0 text-white rounded-md hover:bg-red-600"
                >
                  Remove
                </button>
              )}
            </div>
          ))}
          <button
            type="button"
            onClick={addClassDayTime}
            className="mt-2 px-4 py-2 bg-[#F97316] text-white rounded-md hover:bg-[#EA580C]"
          >
            Add Class Time
          </button>
        </div>

        {/* Credit Points (L/T/P) */}
        <div className="bg-white p-6 rounded-lg">
          <h2 className="text-xl font-semibold mb-4 text-[#94A3B8]">Credit Points (L/T/P)</h2>
          <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-4 gap-4">
            <div>
              <label className="block text-sm font-medium text-[#94A3B8] mb-1">L (Lecture)</label>
              <input
                type="number"
                min="0"
                value={formData.creditPoints.lecture}
                onChange={(e) => handleNestedInputChange('creditPoints', 'lecture', parseInt(e.target.value) || 0)}
                className="w-full px-3 py-2 border border-[rgba(0,0,0,0.08)] rounded-md bg-white text-[#1E293B] focus:outline-none focus:ring-2 focus:ring-[#F97316]"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-[#94A3B8] mb-1">T (Tutorial)</label>
              <input
                type="number"
                min="0"
                value={formData.creditPoints.tutorial}
                onChange={(e) => handleNestedInputChange('creditPoints', 'tutorial', parseInt(e.target.value) || 0)}
                className="w-full px-3 py-2 border border-[rgba(0,0,0,0.08)] rounded-md bg-white text-[#1E293B] focus:outline-none focus:ring-2 focus:ring-[#F97316]"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-[#94A3B8] mb-1">P (Practical)</label>
              <input
                type="number"
                min="0"
                value={formData.creditPoints.practical}
                onChange={(e) => handleNestedInputChange('creditPoints', 'practical', parseInt(e.target.value) || 0)}
                className="w-full px-3 py-2 border border-[rgba(0,0,0,0.08)] rounded-md bg-white text-[#1E293B] focus:outline-none focus:ring-2 focus:ring-[#F97316]"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-[#94A3B8] mb-1">C (Total)</label>
              <input
                type="number"
                value={totalCredits}
                disabled
                className="w-full px-3 py-2 border border-[rgba(0,0,0,0.08)] rounded-md bg-white text-[#94A3B8] font-semibold"
              />
            </div>
          </div>
        </div>

        {/* Weekly Plan */}
        <div className="bg-white p-6 rounded-lg">
          <h2 className="text-xl font-semibold mb-4 text-[#94A3B8]">Weekly Plan</h2>
          {formData.weeklyPlan.map((week, weekIndex) => (
            <div key={weekIndex} className="mb-6 p-4 border border-[rgba(0,0,0,0.08)] rounded-md">
              <h3 className="text-lg font-medium mb-2">Week {week.weekNumber}</h3>
              {week.topics.map((topic, topicIndex) => (
                <div key={topicIndex} className="mb-2 flex gap-2">
                  <input
                    type="text"
                    value={topic}
                    onChange={(e) => handleWeeklyTopicChange(weekIndex, topicIndex, e.target.value)}
                    placeholder={`Topic ${topicIndex + 1}`}
                    className="flex-1 px-3 py-2 border border-[rgba(0,0,0,0.08)] rounded-md bg-white text-[#1E293B] focus:outline-none focus:ring-2 focus:ring-[#F97316]"
                  />
                  {topicIndex > 0 && (
                    <button
                      type="button"
                      onClick={() => {
                        setFormData(prev => ({
                          ...prev,
                          weeklyPlan: prev.weeklyPlan.map((w, i) => 
                            i === weekIndex ? {
                              ...w,
                              topics: w.topics.filter((_, j) => j !== topicIndex)
                            } : w
                          )
                        }));
                      }}
                      className="px-3 py-2 bg-[rgba(220,38,38,0.08)]0 text-white rounded-md hover:bg-red-600"
                    >
                      Remove
                    </button>
                  )}
                </div>
              ))}
              <button
                type="button"
                onClick={() => addTopicToWeek(weekIndex)}
                className="mt-2 px-3 py-1 bg-[#F97316] text-white rounded-md hover:bg-[#F97316] text-sm"
              >
                Add Topic
              </button>
            </div>
          ))}
          <button
            type="button"
            onClick={addWeeklyPlan}
            className="px-4 py-2 bg-[#F97316] text-white rounded-md hover:bg-[#EA580C]"
          >
            Add Week
          </button>
        </div>

        {/* Syllabus Modules */}
        <div className="bg-white p-6 rounded-lg">
          <h2 className="text-xl font-semibold mb-4 text-[#94A3B8]">Syllabus Modules</h2>
          {formData.syllabus.modules.map((module, index) => (
            <div key={index} className="mb-6 p-4 border border-[rgba(0,0,0,0.08)] rounded-md">
              <h3 className="text-lg font-medium mb-2">Module {module.moduleNumber}</h3>
              <div className="mb-4">
                <label className="block text-sm font-medium text-[#94A3B8] mb-1">Module Title</label>
                <input
                  type="text"
                  value={module.moduleTitle}
                  onChange={(e) => handleModuleChange(index, 'moduleTitle', e.target.value)}
                  className="w-full px-3 py-2 border border-[rgba(0,0,0,0.08)] rounded-md bg-white text-[#1E293B] focus:outline-none focus:ring-2 focus:ring-[#F97316]"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-[#94A3B8] mb-1">Module Description</label>
                <textarea
                  value={module.description}
                  onChange={(e) => handleModuleChange(index, 'description', e.target.value)}
                  rows="3"
                  className="w-full px-3 py-2 border border-[rgba(0,0,0,0.08)] rounded-md bg-white text-[#1E293B] focus:outline-none focus:ring-2 focus:ring-[#F97316]"
                />
              </div>
            </div>
          ))}
          <button
            type="button"
            onClick={addModule}
            className="px-4 py-2 bg-[#F97316] text-white rounded-md hover:bg-[#EA580C]"
          >
            Add Module
          </button>
        </div>

        {/* Submit Button */}
        <div className="flex justify-center">
          <button
            onClick={handleSubmit}
            disabled={isSubmitting}
            className={`px-8 py-3 rounded-md text-white font-semibold ${
              isSubmitting 
                ? 'bg-[#64748B] cursor-not-allowed' 
                : 'bg-[#F97316] hover:bg-[#EA580C]'
            }`}
          >
            {isSubmitting ? 'Creating Course...' : 'Create Course'}
          </button>
        </div>

        {/* Submit Message */}
        {submitMessage && (
          <div className={`text-center p-3 rounded-md ${
            submitMessage.includes('Error') 
              ? 'bg-[rgba(239,68,68,0.15)] text-[#EF4444]' 
              : 'bg-[rgba(5,150,105,0.1)] text-[#10B981]'
          }`}>
            {submitMessage}
          </div>
        )}
      </div>
    </div>
  );
};

export default CreateCourse;
