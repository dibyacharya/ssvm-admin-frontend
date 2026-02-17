import React, { useEffect, useState } from "react";
import { Navigate } from "react-router-dom";
import { getAllCourses } from "../services/courses.service";

const hasCourseId = (course, id) => course?._id === id;

const firstAvailableCourseId = (courses) => {
  for (const course of courses) {
    if (course?._id) {
      return course._id;
    }
  }
  return "";
};

const CourseManagementEntry = () => {
  const [loading, setLoading] = useState(true);
  const [targetCourseId, setTargetCourseId] = useState("");

  useEffect(() => {
    let mounted = true;

    const resolveTarget = async () => {
      try {
        const response = await getAllCourses();
        const courses = Array.isArray(response?.courses)
          ? response.courses
          : [];

        const lastVisitedCourseId =
          typeof window !== "undefined"
            ? localStorage.getItem("lastManagedCourseId") || ""
            : "";

        const canUseLastVisited =
          !!lastVisitedCourseId &&
          courses.some((course) =>
            hasCourseId(course, lastVisitedCourseId)
          );

        const selectedCourseId = canUseLastVisited
          ? lastVisitedCourseId
          : firstAvailableCourseId(courses);

        if (!mounted) return;
        setTargetCourseId(selectedCourseId);
      } catch {
        if (!mounted) return;
        setTargetCourseId("");
      } finally {
        if (mounted) setLoading(false);
      }
    };

    resolveTarget();
    return () => {
      mounted = false;
    };
  }, []);

  if (loading) {
    return (
      <div className="bg-white rounded-lg border border-gray-200 p-6">
        <p className="text-sm text-gray-500">Opening Course Management...</p>
      </div>
    );
  }

  if (targetCourseId) {
    return (
      <Navigate to={`/courses/${targetCourseId}?tab=description`} replace />
    );
  }

  return <Navigate to="/courses/list" replace />;
};

export default CourseManagementEntry;
