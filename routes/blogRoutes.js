const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth');
const blogController = require('../controllers/blogController');

// Get the current user's own blogs (drafts + published)
router.get('/my-blogs', auth, blogController.getOwnBlogs);

// Get a single published blog (increments read_count)
router.get('/:id', blogController.getSingleBlog);

// List all published blogs
router.get('/', blogController.getPublishedBlogs);

// Protected routes
router.post('/', auth, blogController.createBlog);
router.put('/:id/publish', auth, blogController.publishBlog);
router.put('/:id', auth, blogController.editBlog);
router.delete('/:id', auth, blogController.deleteBlog);

module.exports = router;