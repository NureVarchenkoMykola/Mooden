const express = require('express');
const router = express.Router();
const studentController = require('../controllers/studentController');
const auth = require('../middleware/authMiddleware');
const uploadSubmission = require('../middleware/uploadSubmission');

router.get('/dashboard', auth, studentController.getDashboardData);
router.post('/announcements/:id/read', auth, studentController.markAsRead);
router.patch('/settings', auth, studentController.updateSettings);
router.get('/profile', auth, studentController.getProfileData);
router.get('/courses', auth, studentController.getAllCourses);
router.get('/tasks', auth, studentController.getAllTasks);
router.get('/schedule', auth, studentController.getSchedule);
router.get('/grades', auth, studentController.getGradesPageData)
router.get('/tasks/:id', auth, studentController.getTaskDetail);
router.post('/attendance/mark', auth, studentController.markAttendance);
router.get('/courses/:id/detail', auth, studentController.getCourseDetail);
router.get('/courses/:id/attendance', auth, studentController.getCourseAttendance);
router.post('/tasks/:id/submit', auth, uploadSubmission.single('file'), studentController.submitTask);

module.exports = router;