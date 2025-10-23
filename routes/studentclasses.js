const express = require("express");
const router = express.Router();
const { ClassEnrollment } = require("../models/class");
const { ClassLesson } = require("../models/lesson");
const Assignment = require("../models/assignments");
const Submission = require("../models/submission");

function requireLogin(req, res, next) {
  if (!global.currentUser) return res.redirect("/auth/login");
  next();
}

function parseDate(value) {
  if (!value) return null;
  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
}

function formatForDisplay(value) {
  const parsed = parseDate(value);
  return parsed ? parsed.toLocaleString() : "";
}

function buildAccessInfo(classroom) {
  const opensAt = parseDate(classroom?.availableFrom);
  const closesAt = parseDate(classroom?.availableUntil);
  const now = new Date();

  const info = {
    locked: false,
    reason: "",
    opensAt,
    closesAt,
    opensText: formatForDisplay(opensAt),
    closesText: formatForDisplay(closesAt)
  };

  if (opensAt && now < opensAt) {
    info.locked = true;
    info.reason = "before";
  } else if (closesAt && now > closesAt) {
    info.locked = true;
    info.reason = "after";
  }

  return info;
}

// show all the classes that a student is enrolled in
router.get("/classes", requireLogin, async (req, res) => {
  try {
    const me = global.currentUser;
    const filterCourseId = req.query.course ? String(req.query.course) : "";
    const message = req.query.msg || "";

    const enrolls = await ClassEnrollment.find({ student: me._id })
      .populate({
        path: "classroom",
        populate: [
          { path: "course", model: "Course" },
          { path: "instructor", model: "User", select: "name email" }
        ]
      })
      .lean();

    const classObjectIds = enrolls
      .map((e) => e.classroom && e.classroom._id)
      .filter(Boolean);

    const lessonsByClass = new Map();

    if (classObjectIds.length > 0) {
      const links = await ClassLesson.find({ classroom: { $in: classObjectIds } })
        .populate({ path: "lesson", select: "_id" })
        .lean();

      links.forEach((link) => {
        if (!link || !link.classroom) return;
        const key = typeof link.classroom === "string"
          ? link.classroom
          : link.classroom.toString();
        const entry = lessonsByClass.get(key) || { count: 0 };
        entry.count += 1;
        lessonsByClass.set(key, entry);
      });
    }

    const allClasses = enrolls
      .map((e) => {
        const c = e.classroom || {};
        const course = c.course || {};
        const instructor = c.instructor || {};
        const id = c._id ? c._id.toString() : "";
        const courseId = course && course._id ? course._id.toString() : "";

        if (!id) return null;

        return {
          id,
          title: c.title || "(Untitled class)",
          term: c.term || "",
          courseId,
          courseCode: course.code || "",
          courseTitle: course.title || "",
          instructorName: instructor.name || "TBA",
          instructorEmail: instructor.email || "",
          lessonCount: (lessonsByClass.get(id)?.count) || 0
        };
      })
      .filter(Boolean);

    const filteredClasses = filterCourseId
      ? allClasses.filter((c) => c.courseId === filterCourseId)
      : allClasses;

    const selectedCourse = filterCourseId
      ? allClasses.find((c) => c.courseId === filterCourseId)
      : null;

    res.render("student-classes", {
      user: me,
      classes: filteredClasses,
      message,
      selectedCourse,
      hasFilter: Boolean(filterCourseId)
    });
  } catch (err) {
    console.error("Failed to load student classes", err);
    res.status(500).send("Error loading classes");
  }
});

// show a single class with copied lesson content and assignments
router.get("/classes/:classId", requireLogin, async (req, res) => {
  try {
    const me = global.currentUser;
    const { classId } = req.params;

    const enrollment = await ClassEnrollment.findOne({
      student: me._id,
      classroom: classId
    })
      .populate({
        path: "classroom",
        populate: [
          { path: "course", model: "Course" },
          { path: "instructor", model: "User", select: "name email" }
        ]
      })
      .lean();

    if (!enrollment || !enrollment.classroom) {
      return res.redirect(`/student/classes?msg=${encodeURIComponent("Class not found")}`);
    }

    const classroom = enrollment.classroom;
    const classAccess = buildAccessInfo(classroom);
    const course = classroom.course || {};
    const instructor = classroom.instructor || {};

    const links = await ClassLesson.find({ classroom: classId })
      .populate("lesson")
      .lean();

    const lessons = (await Promise.all(
      links.map(async (link) => {
        const lesson = link.lesson;
        if (!lesson) return null;

        const assignments = await Assignment.find({ lessonId: String(lesson._id) }).lean();

        let assignmentsWithStatus = assignments;
        if (assignments.length > 0) {
          const submissionIds = assignments.map((a) => a._id);
          const submissions = await Submission.find({
            student: me._id,
            assignment: { $in: submissionIds }
          })
            .select("assignment")
            .lean();

          const submittedSet = new Set(submissions.map((s) => String(s.assignment)));
          assignmentsWithStatus = assignments.map((assignment) => ({
            ...assignment,
            isSubmitted: submittedSet.has(String(assignment._id))
          }));
        }

        return {
          id: lesson._id.toString(),
          title: lesson.title,
          content: lesson.content,
          assignments: assignmentsWithStatus
        };
      })
    )).filter(Boolean);

    const classroomView = {
      id: classroom._id.toString(),
      title: classroom.title || "(Untitled class)",
      term: classroom.term || "",
      courseCode: course.code || "",
      courseTitle: course.title || "",
      courseId: course._id ? course._id.toString() : "",
      instructorName: instructor.name || "",
      instructorEmail: instructor.email || ""
    };

    res.render("student-class", {
      user: me,
      classroom: classroomView,
      lessons,
      accessInfo: classAccess,
      canViewContent: !classAccess.locked
    });
  } catch (err) {
    console.error("Failed to load class detail", err);
    res.redirect(`/student/classes?msg=${encodeURIComponent("Could not open that class")}`);
  }
});

module.exports = router;
