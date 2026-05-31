const express = require('express');
const router = express.Router();
const moderatorController = require('../controllers/moderatorController');
const auth = require('../middleware/authMiddleware');

router.get('/dashboard', auth, moderatorController.getDashboardData);
router.get('/profile', auth, moderatorController.getProfileData);
router.patch('/profile', auth, moderatorController.updateProfileData);
router.get('/users', auth, moderatorController.getUsers);
router.post('/users', auth, moderatorController.createUser);
router.patch('/users/:id', auth, moderatorController.updateUser);
router.patch('/users/:id/role', auth, moderatorController.updateUserRole);
router.patch('/users/:id/block', auth, moderatorController.updateUserBlockStatus);
router.get('/courses', auth, moderatorController.getCourses);
router.post('/courses', auth, moderatorController.createCourse);
router.patch('/courses/:id', auth, moderatorController.updateCourse);
router.patch('/courses/:id/visibility', auth, moderatorController.updateCourseVisibility);
router.get('/courses/:id/members', auth, moderatorController.getCourseMembers);
router.post('/courses/:id/students', auth, moderatorController.addStudentToCourse);
router.delete('/courses/:id/students/:studentId', auth, moderatorController.removeStudentFromCourse);
router.post('/courses/:id/teachers', auth, moderatorController.addTeacherToCourse);
router.delete('/courses/:id/teachers/:teacherId', auth, moderatorController.removeTeacherFromCourse);
router.get('/activity', auth, moderatorController.getActivity);

module.exports = router;
