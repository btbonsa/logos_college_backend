const express = require('express');

const authenticate = require('../middlewares/authmiddleware');
const authorize = require('../middlewares/rolemiddleware');
const upload = require('../middlewares/uploadmiddleware');

const {
    getAllPortfolios,
    createPortfolio,
    updatePortfolio,
    publishPortfolio,
    unpublishPortfolio,
    addProject,
    updateProject,
    deleteProject,
    getPublicPortfolio
} = require('../controllers/portifolioController');

const router = express.Router();

router.get('/public/:slug', getPublicPortfolio);

router.get(
    '/admin/all',
    authenticate,
    authorize('ADMIN', 'SUPER_ADMIN'),
    getAllPortfolios
);

router.post(
    '/',
    authenticate,
    authorize('ADMIN', 'SUPER_ADMIN'),
    createPortfolio
);

router.put(
    '/:id',
    authenticate,
    authorize('ADMIN', 'SUPER_ADMIN'),
    updatePortfolio
);

router.post(
    '/:id/publish',
    authenticate,
    authorize('ADMIN', 'SUPER_ADMIN'),
    publishPortfolio
);

router.post(
    '/:id/unpublish',
    authenticate,
    authorize('ADMIN', 'SUPER_ADMIN'),
    unpublishPortfolio
);

router.post(
    '/:id/projects',
    authenticate,
    authorize('ADMIN', 'SUPER_ADMIN'),
    upload.single('project_image'),
    addProject
);

router.put(
    '/projects/:projectId',
    authenticate,
    authorize('ADMIN', 'SUPER_ADMIN'),
    upload.single('project_image'),
    updateProject
);

router.delete(
    '/projects/:projectId',
    authenticate,
    authorize('ADMIN', 'SUPER_ADMIN'),
    deleteProject
);

module.exports = router;