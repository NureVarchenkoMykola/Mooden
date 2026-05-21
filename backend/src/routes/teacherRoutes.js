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

module.exports = router;