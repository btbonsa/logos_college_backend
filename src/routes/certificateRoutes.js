
const express = require('express');
const authenticate = require('../middlewares/authmiddleware');
const authorize = require('../middlewares/rolemiddleware');

const {
    getAllCertificates,
    issueCertificate,
    downloadCertificatePdf,
    verifyCertificate,
    revokeCertificate
} = require('../controllers/certificateController');

const router = express.Router();

router.get('/verify/:certificateNumber', verifyCertificate);

router.get('/admin/all', authenticate, authorize('ADMIN', ''), getAllCertificates);
router.post('/', authenticate, authorize('ADMIN', ''), issueCertificate);
router.get('/:id/pdf', authenticate, authorize('ADMIN', ''), downloadCertificatePdf);
router.patch('/:id/revoke', authenticate, authorize('ADMIN', ''), revokeCertificate);

module.exports = router;
