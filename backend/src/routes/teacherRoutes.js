const express = require('express');
const router = express.Router();
const teacherController = require('../controllers/teacherController');
const auth = require('../middleware/authMiddleware');

router.get('/dashboard', auth, teacherController.getDashboardData);
router.get('/profile', auth, teacherController.getProfileData);
router.get('/courses', auth, teacherController.getAllCourses);
router.get('/courses/:id/detail', auth, teacherController.getCourseDetail);
router.get('/submissions', auth, teacherController.getSubmissionsForGrading);
router.post('/submissions/:id/grade', auth, teacherController.gradeSubmission);
router.get('/schedule', auth, teacherController.getSchedule);

router.get('/attendance', auth, teacherController.getAttendance);
router.patch('/schedule/:id/attendance-status', auth, teacherController.updateAttendanceStatus);

router.post('/courses/:id/tasks', auth, teacherController.createCourseTask);
router.patch('/courses/:courseId/tasks/:taskId/visibility', auth, teacherController.updateCourseTaskVisibility);
router.get('/tasks/:id', auth, teacherController.getTaskDetail);
router.patch('/tasks/:id', auth, teacherController.updateTaskDetail);

module.exports = router;