const express = require('express');

const { createStudentProfile, getAllStudents, editRegistration, suspendStudent, updateStudentProfile, getStudentProfile } = require('../controllers/studentController');

const authenticate = require('../middlewares/authmiddleware');
const authorize = require('../middlewares/rolemiddleware');
const upload = require('../middlewares/uploadmiddleware');
const router = express.Router();

router.post('/profile', authenticate, authorize('STUDENT'), createStudentProfile);
router.get('/profile', authenticate, authorize('STUDENT'), getStudentProfile);
router.put('/profile', authenticate, authorize('STUDENT'), upload.single('profile_photo'), updateStudentProfile);
router.get('/all', authenticate, authorize('ADMIN'), getAllStudents);
router.put('/registration/edit', authenticate, authorize('ADMIN'), editRegistration);
router.put('/suspend', authenticate, authorize('ADMIN'), suspendStudent);

module.exports = router;
