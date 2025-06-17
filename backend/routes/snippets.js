const express = require('express');
const { PrismaClient } = require('@prisma/client');
const { protect } = require('../middleware/authMiddleware');

const router = express.Router();
const prisma = new PrismaClient();

// All routes below are protected
router.use(protect);

// CREATE a new snippet
// POST /api/snippets
router.post('/', async (req, res) => {
    const { codeContent, language } = req.body;
    const authorId = req.userId; // Provided by 'protect' middleware

    if (!codeContent || !language) {
        return res.status(400).json({ message: 'Code content and language are required.' });
    }

    try {
        const newSnippet = await prisma.snippet.create({
            data: {
                codeContent,
                language,
                authorId, // Link the snippet to the logged-in user
            },
        });
        res.status(201).json(newSnippet);
    } catch (error) {
        res.status(500).json({ message: 'Error creating snippet.', error});
    }
});

// READ all snippets from the logged-in user
// GET /api/snippets
router.get('/', async (req, res) => {
    try {
        const snippets = await prisma.snippet.findMany({
            where: {
                authorId: req.userId,
            },
            orderBy: {
                createdAt: 'desc',
            },
        });
        res.status(200).json(snippets);
    } catch (error) {
        res.status(500).json({ message: 'Error fetching snippets.', error });
    }
});

// UPDATE a snippet (such as for AI analysis)
// PUT /api/snippets/:id
router.put('/:id', async (req, res) => {
    const { id } = req.params;
    const { codeContent, language, aiAnalysis } = req.body;

    try {
        // Verify user owns snippet
        const snippet = await prisma.snippet.findUnique({ where: {id: parseInt(id) } });

        if (!snippet || snippet.authorId !== req.userId) {
            return res.status(403).json({ message: 'User not authorized to update this snippet.' });
        }

        // Update snippet
        const updatedSnippet = await prisma.snippet.update({
            where: { id: parseInt(id) },
            data: {
                codeContent,
                language,
                aiAnalysis,
            },
        });
        res.status(200).json(updatedSnippet);
    } catch (error) {
        res.status(500).json({ message: 'Error updating snipipet', error });
    }
});

// DELETE a snippet
// DELETE /api/snippets/:id
router.delete('/:id', async (req, res) => {
    const { id } = req.params;

    try {
        // Verify user owns snippet
        const snippet = await prisma.snippet.findUnique({ where: { id: parseInt(id) } });

        if (!snippet || snippet.authorId !== req.userId) {
            return res.status(403).json({ message: 'User not authorized to delte this snippet.' });
        }

        // Delete it
        await prisma.snippet.delete({ where: { id: parseInt(id) } });
        res.status(200).json({ message: 'Snipped deleted successfully.' });
    } catch (error) {
        res.status(500).json({ message: 'Error deleting snippet.', error });
    }
});

module.exports = router;