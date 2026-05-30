// routes/auth.js
'use strict';
const router = require('express').Router();
const ctrl   = require('../controllers/authController');
const { protect } = require('../middleware/auth');

router.post('/register', ctrl.registerValidation, ctrl.register);
router.post('/login',    ctrl.loginValidation,    ctrl.login);
router.post('/logout',   protect,                 ctrl.logout);
router.get ('/me',       protect,                 ctrl.getMe);
router.patch('/profile', protect,                 ctrl.updateProfile);
router.patch('/password',protect,                 ctrl.changePassword);

module.exports = router;
