
const crypto = require('crypto');
const PDFDocument = require('pdfkit');
const QRCode = require('qrcode');
const pool = require('../config/db');

const publicBackendUrl = (
    process.env.BACKEND_PUBLIC_URL
).replace(/\/+$/, '');

function isValidDate(value) {
    if (typeof value !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(value)) {
        return false;
    }

    const date = new Date(`${value}T00:00:00.000Z`);
    return !Number.isNaN(date.getTime()) &&
        date.toISOString().slice(0, 10) === value;
}

function certificateNumber() {
    const year = new Date().getFullYear();
    return `LOGOS-${year}-${crypto.randomBytes(4).toString('hex').toUpperCase()}`;
}

async function findCertificate(id) {
    const [rows] = await pool.execute(
        `SELECT
            c.id,
            c.registration_id,
            c.certificate_number,
            c.verification_token,
            c.completion_date,
            c.issue_date,
            c.status,
            c.issued_by,
            c.revoked_at,
            c.revocation_reason,
            s.first_name,
            s.last_name,
            s.id AS student_id,
            r.registration_number,
p.name AS program_name,
pf.public_slug AS portfolio_slug,
pf.status AS portfolio_status         FROM portfolio_certificates c
         JOIN registrations r ON r.id = c.registration_id
         JOIN students s ON s.id = r.student_id
JOIN program p ON p.id = r.program_id
LEFT JOIN portfolios pf ON pf.registration_id = r.id
WHERE c.id = ?         
         LIMIT 1`,
        [id]
    );

    return rows[0] || null;
}

function formatDate(value) {
    if (!value) return '';

    if (value instanceof Date) {
        return value.toISOString().slice(0, 10);
    }

    return String(value).slice(0, 10);
}

async function getAllCertificates(req, res) {
    try {
        const [rows] = await pool.execute(
            `SELECT
                c.id,
                c.registration_id,
                c.certificate_number,
                c.completion_date,
                c.issue_date,
                c.status,
                c.created_at,
                CONCAT(s.first_name, ' ', s.last_name) AS student_name,
                s.first_name,
                s.last_name,
                r.registration_number,
                p.name AS program_name
             FROM portfolio_certificates c
             JOIN registrations r ON r.id = c.registration_id
             JOIN students s ON s.id = r.student_id
             JOIN program p ON p.id = r.program_id
             ORDER BY c.created_at DESC`
        );

        return res.json({ certificates: rows });
    } catch (error) {
        console.error('Get certificates error:', error);
        return res.status(500).json({ error: 'Failed to fetch certificates' });
    }
}

async function issueCertificate(req, res) {
    try {
        const registrationId = Number(req.body.registration_id);
        const completionDate = req.body.completion_date;

        if (!Number.isInteger(registrationId) || registrationId < 1) {
            return res.status(400).json({ error: 'A valid registration_id is required' });
        }

        if (!isValidDate(completionDate)) {
            return res.status(400).json({
                error: 'completion_date must be a real date in YYYY-MM-DD format'
            });
        }

        const [registrations] = await pool.execute(
            `SELECT
                r.id,
                r.status,
                s.first_name,
                s.last_name,
                p.name AS program_name
             FROM registrations r
             JOIN students s ON s.id = r.student_id
             JOIN program p ON p.id = r.program_id
             WHERE r.id = ?
             LIMIT 1`,
            [registrationId]
        );

        const registration = registrations[0];

        if (!registration) {
            return res.status(404).json({ error: 'Registration not found' });
        }

        if (registration.status !== 'REGISTERED') {
            return res.status(400).json({
                error: 'A certificate can only be issued for a REGISTERED student',
                registration_status: registration.status
            });
        }

        const number = certificateNumber();
        const token = crypto.randomBytes(32).toString('hex');
        const issueDate = new Date().toISOString().slice(0, 10);

        const [result] = await pool.execute(
            `INSERT INTO portfolio_certificates
                (registration_id, certificate_number, verification_token,
                 completion_date, issue_date, status, issued_by)
             VALUES (?, ?, ?, ?, ?, 'ISSUED', ?)`,
            [registrationId, number, token, completionDate, issueDate, req.user.id]
        );

        return res.status(201).json({
            message: 'Certificate issued successfully',
            certificate: {
                id: result.insertId,
                certificate_number: number,
                registration_id: registrationId,
                student_name: `${registration.first_name} ${registration.last_name}`,
                program_name: registration.program_name,
                completion_date: completionDate,
                issue_date: issueDate,
                status: 'ISSUED',
                verification_url:
                    `${publicBackendUrl}/api/certificates/verify/${number}`,
                pdf_endpoint: `/api/certificates/${result.insertId}/pdf`
            }
        });
    } catch (error) {
        if (error.code === 'ER_DUP_ENTRY') {
            return res.status(409).json({
                error: 'This registration already has a certificate, or a unique value conflicted'
            });
        }

        console.error('Issue certificate error:', error);
        return res.status(500).json({ error: 'Failed to issue certificate' });
    }
}

async function downloadCertificatePdf(req, res) {
    try {
        const id = Number(req.params.id);

        if (!Number.isInteger(id) || id < 1) {
            return res.status(400).json({ error: 'Invalid certificate ID' });
        }

        const certificate = await findCertificate(id);

        if (!certificate) {
            return res.status(404).json({ error: 'Certificate not found' });
        }

        const portfolioBaseUrl = (
            process.env.PUBLIC_PORTFOLIO_URL
        ).replace(/\/+$/, '');

        if (!certificate.portfolio_slug) {
            return res.status(404).json({
                error: 'This student does not have a portfolio yet.'
            });
        }

        if (certificate.portfolio_status !== 'PUBLISHED') {
            return res.status(400).json({
                error: 'The student portfolio must be published before generating this QR code.'
            });
        }

        const portfolioUrl =
            `${portfolioBaseUrl}/portfolio/${encodeURIComponent(certificate.portfolio_slug)}`;

        const qrDataUrl = await QRCode.toDataURL(portfolioUrl, {
            width: 120,
            margin: 1,
            color: { dark: '#000000', light: '#ffffff' }
        });

        const qrBuffer = Buffer.from(
            qrDataUrl.replace(/^data:image\/png;base64,/, ''),
            'base64'
        );

        res.setHeader('Content-Type', 'application/pdf');
        res.setHeader(
            'Content-Disposition',
            `attachment; filename="${certificate.certificate_number}.pdf"`
        );

        const doc = new PDFDocument({
            size: 'A4',
            layout: 'landscape',
            margins: { top: 45, bottom: 45, left: 55, right: 55 }
        });

        doc.on('error', (error) => {
            console.error('PDF generation error:', error);
            if (!res.headersSent) res.status(500).end();
            else res.end();
        });

        doc.pipe(res);

        const pageWidth = doc.page.width;
        const pageHeight = doc.page.height;

        doc.save();
        
        doc.rect(0, 0, pageWidth, pageHeight).fill('#f8fafc');

        doc.fillColor('#0284c7');
        doc.polygon([0, 0], [180, 0], [0, 110]);
        doc.fill();

        doc.fillColor('#38bdf8');
        doc.polygon([0, 0], [110, 0], [0, 70]);
        doc.fill();

        doc.fillColor('#0284c7');
        doc.polygon([pageWidth, pageHeight], [pageWidth - 180, pageHeight], [pageWidth, pageHeight - 110]);
        doc.fill();

        doc.fillColor('#38bdf8');
        doc.polygon([pageWidth, pageHeight], [pageWidth - 110, pageHeight], [pageWidth, pageHeight - 70]);
        doc.fill();

        doc.lineWidth(2)
            .strokeColor('#0284c7')
            .rect(20, 20, pageWidth - 40, pageHeight - 40)
            .stroke();

        doc.lineWidth(1)
            .strokeColor('#cbd5e1')
            .rect(28, 28, pageWidth - 56, pageHeight - 56)
            .stroke();

        doc.restore();
        doc.fillColor('#1d4ed8')
            .font('Helvetica-Bold')
            .fontSize(30)
            .text('LOGOS COLLEGE', 55, 65, {
                align: 'center',
                width: pageWidth - 110
            });

        doc.fillColor('#b45309')
            .font('Helvetica-Bold')
            .fontSize(22)
            .text('CERTIFICATE OF COMPLETION', 55, 112, {
                align: 'center',
                width: pageWidth - 110
            });

        doc.fillColor('#374151')
            .font('Helvetica')
            .fontSize(13)
            .text('This certificate is proudly presented to', 55, 160, {
                align: 'center',
                width: pageWidth - 110
            });

        doc.fillColor('#111827')
            .font('Helvetica-Bold')
            .fontSize(27)
            .text(`${certificate.first_name} ${certificate.last_name}`, 55, 187, {
                align: 'center',
                width: pageWidth - 110
            });

        doc.moveTo(170, 225)
            .lineTo(pageWidth - 170, 225)
            .lineWidth(1)
            .strokeColor('#d1d5db')
            .stroke();

        doc.fillColor('#374151')
            .font('Helvetica')
            .fontSize(13)
            .text('for successfully completing the program', 55, 242, {
                align: 'center',
                width: pageWidth - 110
            });

        doc.fillColor('#1d4ed8')
            .font('Helvetica-Bold')
            .fontSize(20)
            .text(certificate.program_name, 75, 269, {
                align: 'center',
                width: pageWidth - 150
            });

        doc.fillColor('#374151')
            .font('Helvetica')
            .fontSize(11)
            .text(
                `Completion date: ${formatDate(certificate.completion_date)}     |     Issue date: ${formatDate(certificate.issue_date)}`,
                55,
                310,
                { align: 'center', width: pageWidth - 110 }
            );

        doc.fillColor('#111827')
            .font('Helvetica-Bold')
            .fontSize(10)
            .text(`Certificate No: ${certificate.certificate_number}`, 55, 355);

        doc.font('Helvetica')
            .fontSize(9)
            .fillColor('#4b5563')
            .text('Scan the QR code to veiw student portfolio.', 55, 375);

        doc.image(qrBuffer, pageWidth - 155, 335, { fit: [90, 90] });

        doc.font('Helvetica')
            .fontSize(8)
            .fillColor('#6b7280')
            .text('Official certificate • Verify online before relying on this document', 55, pageHeight - 58, {
                align: 'center',
                width: pageWidth - 110
            });

        doc.end();
    } catch (error) {
        console.error('Download certificate PDF error:', error);
        if (!res.headersSent) {
            return res.status(500).json({ error: 'Failed to generate certificate PDF' });
        }
    }
}

async function verifyCertificate(req, res) {
    try {
        const { certificateNumber } = req.params;

        const [rows] = await pool.execute(
            `SELECT
                c.certificate_number,
                c.completion_date,
                c.issue_date,
                c.status,
                c.revoked_at,
                c.revocation_reason,
                s.first_name,
                s.last_name,
                p.name AS program_name
             FROM portfolio_certificates c
             JOIN registrations r ON r.id = c.registration_id
             JOIN students s ON s.id = r.student_id
             JOIN program p ON p.id = r.program_id
             WHERE c.certificate_number = ?
             LIMIT 1`,
            [certificateNumber]
        );

        const certificate = rows[0];

        if (!certificate) {
            return res.status(404).json({
                valid: false,
                message: 'Certificate not found'
            });
        }

        return res.json({
            valid: certificate.status === 'ISSUED',
            message: certificate.status === 'ISSUED'
                ? 'This certificate is valid.'
                : 'This certificate has been revoked.',
            certificate: {
                certificate_number: certificate.certificate_number,
                student_name: `${certificate.first_name} ${certificate.last_name}`,
                program_name: certificate.program_name,
                completion_date: formatDate(certificate.completion_date),
                issue_date: formatDate(certificate.issue_date),
                status: certificate.status,
                ...(certificate.status === 'REVOKED'
                    ? {
                        revoked_at: certificate.revoked_at,
                        revocation_reason: certificate.revocation_reason
                    }
                    : {})
            }
        });
    } catch (error) {
        console.error('Verify certificate error:', error);
        return res.status(500).json({ error: 'Failed to verify certificate' });
    }
}

async function revokeCertificate(req, res) {
    try {
        const id = Number(req.params.id);
        const reason = typeof req.body.reason === 'string'
            ? req.body.reason.trim()
            : '';

        if (!Number.isInteger(id) || id < 1) {
            return res.status(400).json({ error: 'Invalid certificate ID' });
        }

        if (!reason) {
            return res.status(400).json({
                error: 'A reason is required to revoke a certificate'
            });
        }

        const [result] = await pool.execute(
            `UPDATE portfolio_certificates
             SET status = 'REVOKED',
                 revoked_at = CURRENT_TIMESTAMP,
                 revocation_reason = ?
             WHERE id = ? AND status = 'ISSUED'`,
            [reason, id]
        );

        if (result.affectedRows === 0) {
            const [existing] = await pool.execute(
                'SELECT id, status FROM portfolio_certificates WHERE id = ?',
                [id]
            );

            if (!existing.length) {
                return res.status(404).json({ error: 'Certificate not found' });
            }

            return res.status(409).json({ error: 'Certificate is already revoked' });
        }

        return res.json({ message: 'Certificate revoked successfully' });
    } catch (error) {
        console.error('Revoke certificate error:', error);
        return res.status(500).json({ error: 'Failed to revoke certificate' });
    }
}

module.exports = {
    getAllCertificates,
    issueCertificate,
    downloadCertificatePdf,
    verifyCertificate,
    revokeCertificate
};
