import React, { useState, useEffect } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { ArrowLeft, Save } from 'lucide-react';
import { getCoursesById, updateCourse } from '../services/courses.service';
import { getPeriodLabel } from '../utils/periodLabel';

const EditCourse = () => {
  const { codeid } = useParams();
  const navigate = useNavigate();
  const [courseData, setCourseData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const totalCredits = courseData ? (
    (courseData.creditPoints?.lecture || 0) +
    (courseData.creditPoints?.tutorial || 0) +
    (courseData.creditPoints?.practical || 0)
  ) : 0;

  const periodLabel = getPeriodLabel(courseData?.semester?.batch?.program?.periodType);

  useEffect(() => {
    const fetchCourseData = async () => {
      try {
        const response = await getCoursesById(codeid);
        setCourseData(response.course);
      } catch (error) {
        console.error('Error fetching course data:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchCourseData();
  }, [codeid]);

  const handleSave = async () => {
    setSaving(true);
    try {
      await updateCourse(codeid, courseData);
      navigate('/courses/list');
    } catch (error) {
      console.error('Error updating course:', error);
      alert('Failed to update course');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="p-6">
        <h1 className="text-2xl font-bold mb-4">Loading...</h1>
      </div>
    );
  }

  if (!courseData) {
    return (
      <div className="p-6">
        <h1 className="text-2xl font-bold mb-4">Course not found</h1>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      <div className="rounded-md border border-amber-300 bg-amber-50 px-4 py-2 text-sm text-amber-800">
        Legacy Edit Page. Prefer using the Course Details tabs from Course Management.
      </div>
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-4">
          <Link to="/courses/list" className="text-purple-600 hover:text-purple-800">
            <ArrowLeft className="w-5 h-5" />
          </Link>
          <h1 className="text-2xl font-bold">Edit Course - {codeid}</h1>
        </div>
        <button
          onClick={handleSave}
          disabled={saving}
          className="flex items-center px-4 py-2 bg-purple-600 text-white rounded hover:bg-purple-700 disabled:opacity-50"
        >
          <Save className="w-4 h-4 mr-2" />
          {saving ? 'Saving...' : 'Save'}
        </button>
      </div>

      {/* Basic Info */}
      <div className="bg-white p-4 rounded border">
        <h2 className="text-lg font-semibold mb-4">Basic Information</h2>
        
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium mb-1">Title</label>
            <input
              type="text"
              value={courseData.title || ''}
              onChange={(e) => setCourseData({...courseData, title: e.target.value})}
              className="w-full p-2 border rounded"
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-1">About Course</label>
            <textarea
              value={courseData.aboutCourse || ''}
              onChange={(e) => setCourseData({...courseData, aboutCourse: e.target.value})}
              rows={3}
              className="w-full p-2 border rounded"
            />
          </div>

          <div className="flex items-center">
            <input
              type="checkbox"
              checked={courseData.isActive || false}
              onChange={(e) => setCourseData({...courseData, isActive: e.target.checked})}
              className="mr-2"
            />
            <label>Active</label>
          </div>

          <div>
            <label className="block text-sm font-medium mb-1">Course Type</label>
            <select
              value={courseData.courseType || ''}
              onChange={(e) => setCourseData({...courseData, courseType: e.target.value})}
              className="w-full p-2 border rounded"
            >
              <option value="">Select Type</option>
              <option value="theory">Theory</option>
              <option value="practical">Practical</option>
              <option value="project">Project</option>
            </select>
          </div>

        </div>
      </div>

      {/* Learning Outcomes */}
      <div className="bg-white p-4 rounded border">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-lg font-semibold">Learning Outcomes</h2>
          <button
            onClick={() => setCourseData({
              ...courseData, 
              learningOutcomes: [...(courseData.learningOutcomes || []), '']
            })}
            className="px-3 py-1 bg-green-600 text-white rounded text-sm"
          >
            Add
          </button>
        </div>
        
        <div className="space-y-2">
          {(courseData.learningOutcomes || []).map((outcome, index) => (
            <div key={index} className="flex items-start space-x-2">
              <span className="text-sm pt-2">{index + 1}.</span>
              <textarea
                value={outcome}
                onChange={(e) => {
                  const newOutcomes = [...courseData.learningOutcomes];
                  newOutcomes[index] = e.target.value;
                  setCourseData({...courseData, learningOutcomes: newOutcomes});
                }}
                rows={2}
                className="flex-1 p-2 border rounded"
              />
              <button
                onClick={() => {
                  const newOutcomes = courseData.learningOutcomes.filter((_, i) => i !== index);
                  setCourseData({...courseData, learningOutcomes: newOutcomes});
                }}
                className="px-2 py-1 bg-red-600 text-white rounded text-sm"
              >
                Remove
              </button>
            </div>
          ))}
        </div>
      </div>

      {/* Weekly Plan */}
      <div className="bg-white p-4 rounded border">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-lg font-semibold">Weekly Plan</h2>
          <button
            onClick={() => {
              const newWeek = { 
                weekNumber: (courseData.weeklyPlan || []).length + 1, 
                topics: [''] 
              };
              setCourseData({
                ...courseData, 
                weeklyPlan: [...(courseData.weeklyPlan || []), newWeek]
              });
            }}
            className="px-3 py-1 bg-green-600 text-white rounded text-sm"
          >
            Add Week
          </button>
        </div>

        <div className="space-y-4">
          {(courseData.weeklyPlan || []).map((week, weekIndex) => (
            <div key={weekIndex} className="border p-3 rounded">
              <div className="flex justify-between items-center mb-2">
                <h3 className="font-medium">Week {week.weekNumber}</h3>
                <button
                  onClick={() => {
                    const newWeeklyPlan = courseData.weeklyPlan.filter((_, i) => i !== weekIndex);
                    setCourseData({...courseData, weeklyPlan: newWeeklyPlan});
                  }}
                  className="px-2 py-1 bg-red-600 text-white rounded text-sm"
                >
                  Remove Week
                </button>
              </div>
              
              <div className="space-y-2">
                {(week.topics || []).map((topic, topicIndex) => (
                  <div key={topicIndex} className="flex items-center space-x-2">
                    <input
                      type="text"
                      value={topic}
                      onChange={(e) => {
                        const newWeeklyPlan = [...courseData.weeklyPlan];
                        newWeeklyPlan[weekIndex].topics[topicIndex] = e.target.value;
                        setCourseData({...courseData, weeklyPlan: newWeeklyPlan});
                      }}
                      className="flex-1 p-2 border rounded"
                      placeholder="Topic"
                    />
                    <button
                      onClick={() => {
                        const newWeeklyPlan = [...courseData.weeklyPlan];
                        newWeeklyPlan[weekIndex].topics.push('');
                        setCourseData({...courseData, weeklyPlan: newWeeklyPlan});
                      }}
                      className="px-2 py-1 bg-green-600 text-white rounded text-sm"
                    >
                      +
                    </button>
                    <button
                      onClick={() => {
                        const newWeeklyPlan = [...courseData.weeklyPlan];
                        newWeeklyPlan[weekIndex].topics = newWeeklyPlan[weekIndex].topics.filter((_, i) => i !== topicIndex);
                        setCourseData({...courseData, weeklyPlan: newWeeklyPlan});
                      }}
                      className="px-2 py-1 bg-red-600 text-white rounded text-sm"
                    >
                      -
                    </button>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Credit Points (L/T/P) */}
      <div className="bg-white p-4 rounded border">
        <h2 className="text-lg font-semibold mb-4">Credit Points (L/T/P)</h2>
        <div className="grid grid-cols-4 lg:grid-cols-4 gap-4">
          <div>
            <label className="block text-sm font-medium mb-1">L (Lecture)</label>
            <input
              type="number"
              value={courseData.creditPoints?.lecture || 0}
              onChange={(e) => setCourseData({
                ...courseData,
                creditPoints: { ...courseData.creditPoints, lecture: parseInt(e.target.value) || 0 }
              })}
              className="w-full p-2 border rounded"
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">T (Tutorial)</label>
            <input
              type="number"
              value={courseData.creditPoints?.tutorial || 0}
              onChange={(e) => setCourseData({
                ...courseData,
                creditPoints: { ...courseData.creditPoints, tutorial: parseInt(e.target.value) || 0 }
              })}
              className="w-full p-2 border rounded"
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">P (Practical)</label>
            <input
              type="number"
              value={courseData.creditPoints?.practical || 0}
              onChange={(e) => setCourseData({
                ...courseData,
                creditPoints: { ...courseData.creditPoints, practical: parseInt(e.target.value) || 0 }
              })}
              className="w-full p-2 border rounded"
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">C (Total)</label>
            <input
              type="number"
              value={totalCredits}
              disabled
              className="w-full p-2 border rounded bg-gray-100 text-gray-600 font-semibold"
            />
          </div>
        </div>
      </div>

      {/* Course Schedule */}
      <div className="bg-white p-4 rounded border">
        <h2 className="text-lg font-semibold mb-4">Course Schedule</h2>
        
        <div className="grid grid-cols-2 gap-4 mb-4">
          <div>
            <label className="block text-sm font-medium mb-1">Class Start Date</label>
            <input
              type="date"
              value={courseData.courseSchedule?.classStartDate ? new Date(courseData.courseSchedule.classStartDate).toISOString().split('T')[0] : ''}
              onChange={(e) => setCourseData({
                ...courseData,
                courseSchedule: {
                  ...courseData.courseSchedule,
                  classStartDate: e.target.value
                }
              })}
              className="w-full p-2 border rounded"
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Class End Date</label>
            <input
              type="date"
              value={courseData.courseSchedule?.classEndDate ? new Date(courseData.courseSchedule.classEndDate).toISOString().split('T')[0] : ''}
              onChange={(e) => setCourseData({
                ...courseData,
                courseSchedule: {
                  ...courseData.courseSchedule,
                  classEndDate: e.target.value
                }
              })}
              className="w-full p-2 border rounded"
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Mid Exam Date</label>
            <input
              type="date"
              value={courseData.courseSchedule?.midSemesterExamDate ? new Date(courseData.courseSchedule.midSemesterExamDate).toISOString().split('T')[0] : ''}
              onChange={(e) => setCourseData({
                ...courseData,
                courseSchedule: {
                  ...courseData.courseSchedule,
                  midSemesterExamDate: e.target.value
                }
              })}
              className="w-full p-2 border rounded"
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">End Exam Date</label>
            <input
              type="date"
              value={courseData.courseSchedule?.endSemesterExamDate ? new Date(courseData.courseSchedule.endSemesterExamDate).toISOString().split('T')[0] : ''}
              onChange={(e) => setCourseData({
                ...courseData,
                courseSchedule: {
                  ...courseData.courseSchedule,
                  endSemesterExamDate: e.target.value
                }
              })}
              className="w-full p-2 border rounded"
            />
          </div>
        </div>

        <div>
          <div className="flex justify-between items-center mb-2">
            <label className="block text-sm font-medium">Class Days and Times</label>
            <button
              onClick={() => {
                const newClassTime = { day: '', time: '' };
                setCourseData({
                  ...courseData,
                  courseSchedule: {
                    ...courseData.courseSchedule,
                    classDaysAndTimes: [...(courseData.courseSchedule?.classDaysAndTimes || []), newClassTime]
                  }
                });
              }}
              className="px-3 py-1 bg-green-600 text-white rounded text-sm"
            >
              Add Time
            </button>
          </div>
          
          <div className="space-y-2">
            {(courseData.courseSchedule?.classDaysAndTimes || []).map((classTime, index) => (
              <div key={index} className="flex items-center space-x-2">
                <select
                  value={classTime.day}
                  onChange={(e) => {
                    const newTimes = [...courseData.courseSchedule.classDaysAndTimes];
                    newTimes[index].day = e.target.value;
                    setCourseData({
                      ...courseData,
                      courseSchedule: {
                        ...courseData.courseSchedule,
                        classDaysAndTimes: newTimes
                      }
                    });
                  }}
                  className="flex-1 p-2 border rounded"
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
                  onChange={(e) => {
                    const newTimes = [...courseData.courseSchedule.classDaysAndTimes];
                    newTimes[index].time = e.target.value;
                    setCourseData({
                      ...courseData,
                      courseSchedule: {
                        ...courseData.courseSchedule,
                        classDaysAndTimes: newTimes
                      }
                    });
                  }}
                  placeholder="10:00-11:30"
                  className="flex-1 p-2 border rounded"
                />
                <button
                  onClick={() => {
                    const newTimes = courseData.courseSchedule.classDaysAndTimes.filter((_, i) => i !== index);
                    setCourseData({
                      ...courseData,
                      courseSchedule: {
                        ...courseData.courseSchedule,
                        classDaysAndTimes: newTimes
                      }
                    });
                  }}
                  className="px-2 py-1 bg-red-600 text-white rounded text-sm"
                >
                  Remove
                </button>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

export default EditCourse;
