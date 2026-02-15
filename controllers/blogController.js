const Blog = require('../models/Blog');
const User = require('../models/User');
const calculateReadingTime = require('../utils/readingTime');

// Get paginated published blogs (public)
exports.getPublishedBlogs = async (req, res) => {
  const { page = 1, limit = 20, search, state, orderBy } = req.query;
  const query = { state: 'published' }; // Default to published

  // Search by title, author (first/last name), tags
  if (search) {
    const users = await User.find({
      $or: [{ first_name: { $regex: search, $options: 'i' } }, { last_name: { $regex: search, $options: 'i' } }],
    });
    const userIds = users.map(u => u._id);
    query.$or = [
      { title: { $regex: search, $options: 'i' } },
      { author: { $in: userIds } },
      { tags: { $regex: search, $options: 'i' } },
    ];
  }

  // Filter by state (if provided, but only published for public)
  if (state) query.state = state;

  // Order by: read_count, reading_time, timestamp
  let sort = {};
  if (orderBy === 'read_count') sort.read_count = -1; // Descending
  else if (orderBy === 'reading_time') sort.reading_time = -1;
  else if (orderBy === 'timestamp') sort.timestamp = -1;

  try {
    const blogs = await Blog.find(query)
      .populate('author', 'first_name last_name') // Get author info
      .sort(sort)
      .limit(limit * 1)
      .skip((page - 1) * limit)
      .exec();

    const count = await Blog.countDocuments(query);
    res.json({
      blogs,
      totalPages: Math.ceil(count / limit),
      currentPage: page,
    });
  } catch (err) {
    res.status(500).json({ msg: 'Server error' });
  }
};

// Get single published blog (public)
exports.getSingleBlog = async (req, res) => {
  try {
    const blog = await Blog.findById(req.params.id).populate('author', 'first_name last_name');
    if (!blog || blog.state !== 'published') return res.status(404).json({ msg: 'Blog not found' });

    // Increment read_count
    blog.read_count += 1;
    await blog.save();

    res.json(blog);
  } catch (err) {
    res.status(500).json({ msg: 'Server error' });
  }
};

// Create blog (logged-in)
exports.createBlog = async (req, res) => {
  const { title, description, tags, body } = req.body;
  try {
    const reading_time = calculateReadingTime(body);
    const blog = new Blog({
      title,
      description,
      author: req.user.id, // From auth middleware
      tags,
      body,
      reading_time,
    });
    await blog.save();
    res.status(201).json(blog);
  } catch (err) {
    res.status(500).json({ msg: 'Server error' });
  }
};

// Update blog state to published (owner)
exports.publishBlog = async (req, res) => {
  try {
    const blog = await Blog.findById(req.params.id);
    if (!blog) return res.status(404).json({ msg: 'Blog not found' });
    if (blog.author.toString() !== req.user.id) return res.status(401).json({ msg: 'Not authorized' });

    blog.state = 'published';
    await blog.save();
    res.json(blog);
  } catch (err) {
    res.status(500).json({ msg: 'Server error' });
  }
};

// Edit blog (owner)
exports.editBlog = async (req, res) => {
  const { title, description, tags, body } = req.body;
  try {
    const blog = await Blog.findById(req.params.id);
    if (!blog) return res.status(404).json({ msg: 'Blog not found' });
    if (blog.author.toString() !== req.user.id) return res.status(401).json({ msg: 'Not authorized' });

    blog.title = title || blog.title;
    blog.description = description || blog.description;
    blog.tags = tags || blog.tags;
    blog.body = body || blog.body;
    if (body) blog.reading_time = calculateReadingTime(body); // Recalculate if body changes

    await blog.save();
    res.json(blog);
  } catch (err) {
    res.status(500).json({ msg: 'Server error' });
  }
};

// Delete blog (owner)
exports.deleteBlog = async (req, res) => {
  try {
    const blog = await Blog.findById(req.params.id);
    if (!blog) return res.status(404).json({ msg: 'Blog not found' });
    if (blog.author.toString() !== req.user.id) return res.status(401).json({ msg: 'Not authorized' });

    await blog.remove();
    res.json({ msg: 'Blog deleted' });
  } catch (err) {
    res.status(500).json({ msg: 'Server error' });
  }
};

// Get own blogs (logged-in)
exports.getOwnBlogs = async (req, res) => {
  const { page = 1, limit = 20, state } = req.query;
  const query = { author: req.user.id };
  if (state) query.state = state;

  try {
    const blogs = await Blog.find(query)
      .sort({ timestamp: -1 })
      .limit(limit * 1)
      .skip((page - 1) * limit)
      .exec();

    const count = await Blog.countDocuments(query);
    res.json({
      blogs,
      totalPages: Math.ceil(count / limit),
      currentPage: page,
    });
  } catch (err) {
    res.status(500).json({ msg: 'Server error' });
  }
};