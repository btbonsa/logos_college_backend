const db = require('../config/db');
const crypto = require('crypto');
const { uploadIMage, deleteImage } = require('../utils/uploadImages');

function makeSlug(registrationNumber) {
    const base = registrationNumber
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/^-|-$/g, '');

    return `${base}-${crypto.randomBytes(8).toString('hex')}`;
}

// ADMIN: Get all portfolios
async function getAllPortfolios(req, res) {
    try {
        const [rows] = await db.execute(`
            SELECT
                pf.id,
                pf.registration_id,
                pf.public_slug,
                pf.title,
                pf.status,
                pf.created_at,
                s.first_name AS student_name,
                s.last_name,
                r.registration_number,
                r.status AS registration_status,
                p.name AS program_name
            FROM portfolios pf
            JOIN registrations r ON pf.registration_id = r.id
            JOIN students s ON r.student_id = s.id
            JOIN program p ON r.program_id = p.id
            ORDER BY pf.created_at DESC
        `);

        return res.json(rows);
    } catch (error) {
        console.error('Get portfolios error:', error);
        return res.status(500).json({ message: 'Failed to fetch portfolios' });
    }
}

// ADMIN: Create a portfolio for an existing registration
async function createPortfolio(req, res) {
    try {
        const { registration_id, title, bio_override } = req.body;

        if (!registration_id) {
            return res.status(400).json({
                message: 'registration_id is required'
            });
        }

        const [registrations] = await db.execute(`
            SELECT id, registration_number, status
            FROM registrations
            WHERE id = ?
        `, [registration_id]);

        if (!registrations.length) {
            return res.status(404).json({
                message: 'Registration not found'
            });
        }

        const registration = registrations[0];

        if (registration.status !== 'REGISTERED') {
            return res.status(400).json({
                message: 'A portfolio can only be created for a registered student'
            });
        }

        const [existing] = await db.execute(
            'SELECT id FROM portfolios WHERE registration_id = ?',
            [registration_id]
        );

        if (existing.length) {
            return res.status(409).json({
                message: 'A portfolio already exists for this registration'
            });
        }

        const publicSlug = makeSlug(registration.registration_number);

        const [result] = await db.execute(`
            INSERT INTO portfolios
                (registration_id, public_slug, title, bio_override)
            VALUES (?, ?, ?, ?)
        `, [
            registration_id,
            publicSlug,
            title || null,
            bio_override || null
        ]);

        return res.status(201).json({
            message: 'Portfolio created successfully',
            portfolio: {
                id: result.insertId,
                registration_id: Number(registration_id),
                public_slug: publicSlug,
                status: 'DRAFT'
            }
        });
    } catch (error) {
        console.error('Create portfolio error:', error);
        return res.status(500).json({
            message: 'Failed to create portfolio'
        });
    }
}

// ADMIN: Update portfolio details
async function updatePortfolio(req, res) {
    try {
        const { id } = req.params;

        if (!id) {
            return res.status(400).json({ message: 'Portfolio ID is required' });
        }

        const { title, bio_override } = req.body;

        const [existing] = await db.execute(
            'SELECT id FROM portfolios WHERE id = ?',
            [id]
        );

        if (!existing.length) {
            return res.status(404).json({ message: 'Portfolio not found' });
        }

        if (title === undefined && bio_override === undefined) {
            return res.status(400).json({
                message: 'Provide title or bio_override to update'
            });
        }

        await db.execute(`
            UPDATE portfolios
            SET title = COALESCE(?, title),
                bio_override = COALESCE(?, bio_override)
            WHERE id = ?
        `, [
            title === undefined ? null : title,
            bio_override === undefined ? null : bio_override,
            id
        ]);

        return res.json({ message: 'Portfolio updated successfully' });
    } catch (error) {
        console.error('Update portfolio error:', error);
        return res.status(500).json({
            message: 'Failed to update portfolio'
        });
    }
}

// ADMIN: Publish a portfolio
async function publishPortfolio(req, res) {
    try {
        const { id } = req.params;

        if (!id) {
            return res.status(400).json({ message: 'Portfolio ID is required' });
        }

        const [result] = await db.execute(`
            UPDATE portfolios
            SET status = 'PUBLISHED', published_at = CURRENT_TIMESTAMP
            WHERE id = ?
        `, [id]);

        if (!result.affectedRows) {
            return res.status(404).json({ message: 'Portfolio not found' });
        }

        return res.json({ message: 'Portfolio published successfully' });
    } catch (error) {
        console.error('Publish portfolio error:', error);
        return res.status(500).json({
            message: 'Failed to publish portfolio'
        });
    }
}

// ADMIN: Unpublish a portfolio
async function unpublishPortfolio(req, res) {
    try {
        const { id } = req.params;

        if (!id) {
            return res.status(400).json({ message: 'Portfolio ID is required' });
        }

        const [result] = await db.execute(`
            UPDATE portfolios
            SET status = 'UNPUBLISHED'
            WHERE id = ?
        `, [id]);

        if (!result.affectedRows) {
            return res.status(404).json({ message: 'Portfolio not found' });
        }

        return res.json({ message: 'Portfolio unpublished successfully' });
    } catch (error) {
        console.error('Unpublish portfolio error:', error);
        return res.status(500).json({
            message: 'Failed to unpublish portfolio'
        });
    }
}

// ADMIN: Add a project to a portfolio
async function addProject(req, res) {
    const connection = await db.getConnection();
    let cloudinaryResult = null;
    try {
        await connection.beginTransaction();

        const { id } = req.params;

        if (!id) {
            await connection.rollback();
            return res.status(400).json({ message: 'Portfolio ID is required' });
        }

        const {
            title,
            description,
            technologies,
            project_url,
            image_url,
            start_date,
            completion_date,
            display_order
        } = req.body;

        const project_image = req.file;

        if (!title || !title.trim()) {
            await connection.rollback();
            return res.status(400).json({ message: 'Project title is required' });
        }

        const [portfolios] = await connection.query(
            'SELECT id FROM portfolios WHERE id = ?',
            [id]
        );

        if (!portfolios.length) {
            await connection.rollback();
            return res.status(404).json({ message: 'Portfolio not found' });
        }

        let finalImageUrl = image_url || null;

        if (project_image) {
            cloudinaryResult = await uploadIMage(project_image, "logos-college/portfolio-projects");
            finalImageUrl = cloudinaryResult.url;
        }

        const [result] = await connection.query(`
            INSERT INTO portfolio_projects (
                portfolio_id, title, description, technologies,
                project_url, image_url, start_date, completion_date,
                display_order
            )
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
        `, [
            id,
            title.trim(),
            description || null,
            technologies || null,
            project_url || null,
            finalImageUrl,
            start_date || null,
            completion_date || null,
            Number.isInteger(display_order) ? display_order : 0
        ]);

        await connection.commit();

        return res.status(201).json({
            message: 'Project added successfully',
            project_id: result.insertId,
            image_url: finalImageUrl
        });
    } catch (error) {
        await connection.rollback();
        if (cloudinaryResult && cloudinaryResult.publicId) {
            try {
                await deleteImage(cloudinaryResult.publicId);
            } catch (deleteError) {
                console.warn('Failed to rollback image upload:', deleteError.message);
            }
        }
        console.error('Add project error:', error);
        return res.status(500).json({ message: 'Failed to add project' });
    } finally {
        connection.release();
    }
}

// ADMIN: Update a project
async function updateProject(req, res) {
    const connection = await db.getConnection();
    let cloudinaryResult = null;
    try {
        await connection.beginTransaction();

        const { projectId } = req.params;

        if (!projectId) {
            await connection.rollback();
            return res.status(400).json({ message: 'Project ID is required' });
        }

        const {
            title,
            description,
            technologies,
            project_url,
            image_url,
            start_date,
            completion_date,
            display_order
        } = req.body;

        const project_image = req.file;

        const allowedFields = [
            'title',
            'description',
            'technologies',
            'project_url',
            'start_date',
            'completion_date',
            'display_order'
        ];

        const fields = [];
        const values = [];

        for (const field of allowedFields) {
            if (req.body[field] !== undefined) {
                fields.push(`${field} = ?`);
                values.push(req.body[field] === '' ? null : req.body[field]);
            }
        }

        if (project_image) {
            cloudinaryResult = await uploadIMage(project_image, "logos-college/portfolio-projects");
            fields.push('image_url = ?');
            values.push(cloudinaryResult.url);

            // Delete old image if exists
            const [existingProject] = await connection.query(
                'SELECT image_url FROM portfolio_projects WHERE id = ?',
                [projectId]
            );

            if (existingProject.length > 0 && existingProject[0].image_url) {
                try {
                    const publicId = existingProject[0].image_url.split('/').pop().split('.')[0];
                    await deleteImage(`logos-college/portfolio-projects/${publicId}`);
                } catch (deleteError) {
                    console.warn('Failed to delete old image:', deleteError.message);
                }
            }
        } else if (image_url !== undefined) {
            fields.push('image_url = ?');
            values.push(image_url === '' ? null : image_url);
        }

        if (!fields.length) {
            await connection.rollback();
            return res.status(400).json({
                message: 'Provide at least one project field to update'
            });
        }

        const [result] = await connection.query(
            `UPDATE portfolio_projects SET ${fields.join(', ')} WHERE id = ?`,
            [...values, projectId]
        );

        if (!result.affectedRows) {
            await connection.rollback();
            return res.status(404).json({ message: 'Project not found' });
        }

        await connection.commit();

        return res.json({ message: 'Project updated successfully' });
    } catch (error) {
        await connection.rollback();
        if (cloudinaryResult && cloudinaryResult.publicId) {
            try {
                await deleteImage(cloudinaryResult.publicId);
            } catch (deleteError) {
                console.warn('Failed to rollback image upload:', deleteError.message);
            }
        }
        console.error('Update project error:', error);
        return res.status(500).json({ message: 'Failed to update project' });
    } finally {
        connection.release();
    }
}

// ADMIN: Delete a project
async function deleteProject(req, res) {
    try {
        const { projectId } = req.params;

        if (!projectId) {
            return res.status(400).json({ message: 'Project ID is required' });
        }

        const [result] = await db.execute(
            'DELETE FROM portfolio_projects WHERE id = ?',
            [projectId]
        );

        if (!result.affectedRows) {
            return res.status(404).json({ message: 'Project not found' });
        }

        return res.json({ message: 'Project deleted successfully' });
    } catch (error) {
        console.error('Delete project error:', error);
        return res.status(500).json({ message: 'Failed to delete project' });
    }
}

// PUBLIC: View a published portfolio
async function getPublicPortfolio(req, res) {
    try {
        const { slug } = req.params;

        const [portfolios] = await db.execute(`
            SELECT
                pf.id,
                pf.public_slug,
                pf.title,
                COALESCE(pf.bio_override, sp.bio) AS bio,
                sp.profile_photo_url,
                s.first_name,
                s.last_name,
                r.registration_number,
                p.name AS program_name,
                p.description AS program_description,
                pf.published_at
            FROM portfolios pf
            JOIN registrations r ON pf.registration_id = r.id
            JOIN students s ON r.student_id = s.id
            JOIN program p ON r.program_id = p.id
            LEFT JOIN student_profiles sp ON sp.student_id = s.id
            WHERE pf.public_slug = ? AND pf.status = 'PUBLISHED'
            LIMIT 1
        `, [slug]);

        if (!portfolios.length) {
            return res.status(404).json({
                message: 'Published portfolio not found'
            });
        }

        const portfolio = portfolios[0];

        const [projects] = await db.execute(`
            SELECT
                id, title, description, technologies,
                project_url, image_url, start_date, completion_date
            FROM portfolio_projects
            WHERE portfolio_id = ?
            ORDER BY display_order ASC, id DESC
        `, [portfolio.id]);

        return res.json({
            portfolio: {
                ...portfolio,
                full_name: `${portfolio.first_name} ${portfolio.last_name}`,
                projects
            }
        });
    } catch (error) {
        console.error('Get public portfolio error:', error);
        return res.status(500).json({
            message: 'Failed to load portfolio'
        });
    }
}

module.exports = {
    getAllPortfolios,
    createPortfolio,
    updatePortfolio,
    publishPortfolio,
    unpublishPortfolio,
    addProject,
    updateProject,
    deleteProject,
    getPublicPortfolio
};