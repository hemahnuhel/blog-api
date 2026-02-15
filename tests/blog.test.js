const request = require('supertest');
const mongoose = require('mongoose');
const app = require('../server');
const User = require('../models/User');
const Blog = require('../models/Blog');
const dotenv = require('dotenv');

dotenv.config();

describe('Blog API', () => {
  let token;
  let userId;
  let secondToken;     
  let secondUserId;
  let blogId;

  // Setup: create two test users
  beforeAll(async () => {
    await mongoose.connect(process.env.MONGO_URI);

    // Test user 1 (owner)
    let user = await User.create({
      first_name: 'Emmanuel',
      last_name: 'Test',
      email: 'owner@example.com',
      password: 'password123',
    });
    userId = user._id;

    const loginRes = await request(app)
      .post('/api/users/signin')
      .send({ email: 'owner@example.com', password: 'password123' });
    token = loginRes.body.token;

    // Test user 2 (for unauthorized tests)
    let secondUser = await User.create({
      first_name: 'Other',
      last_name: 'User',
      email: 'other@example.com',
      password: 'password123',
    });
    secondUserId = secondUser._id;

    const secondLoginRes = await request(app)
      .post('/api/users/signin')
      .send({ email: 'other@example.com', password: 'password123' });
    secondToken = secondLoginRes.body.token;
  });

  // Clean up blogs after each test (users persist)
  afterEach(async () => {
    await Blog.deleteMany({});
  });

  afterAll(async () => {
    await User.deleteMany({ email: { $in: ['owner@example.com', 'other@example.com'] } });
    await mongoose.connection.close();
  });

  // CREATE BLOG
  it('should create a new draft blog and calculate reading_time', async () => {
    const blogData = {
      title: 'My First Blog',
      description: 'A test blog',
      body: 'This is a sample body with enough words. '.repeat(60), // ~60 words
      tags: ['test', 'node'],
    };

    const res = await request(app)
      .post('/api/blogs')
      .set('x-auth-token', token)
      .send(blogData);

    expect(res.status).toBe(201);
    expect(res.body.title).toBe(blogData.title);
    expect(res.body.state).toBe('draft');
    expect(res.body.author.toString()).toBe(userId.toString());
    expect(res.body.reading_time).toBeGreaterThanOrEqual(1); // ~60 words / 200 wpm ≈ 1 min

    blogId = res.body._id;
  });

  // PUBLISH BLOG
  it('should publish a blog (owner)', async () => {
    // Create draft first
    const createRes = await request(app)
      .post('/api/blogs')
      .set('x-auth-token', token)
      .send({
        title: `Publish Test ${Date.now()}`,
        body: 'Body content here. '.repeat(50),
      });
    const draftId = createRes.body._id;

    const res = await request(app)
      .put(`/api/blogs/${draftId}/publish`)
      .set('x-auth-token', token);

    expect(res.status).toBe(200);
    expect(res.body.state).toBe('published');
  });

  it('should return 401 when non-owner tries to publish', async () => {
    const createRes = await request(app)
      .post('/api/blogs')
      .set('x-auth-token', token)
      .send({
        title: `Unauthorized Publish ${Date.now()}`,
        body: 'Body',
      });
    const draftId = createRes.body._id;

    const res = await request(app)
      .put(`/api/blogs/${draftId}/publish`)
      .set('x-auth-token', secondToken);

    expect(res.status).toBe(401);
    expect(res.body.msg).toMatch(/Not authorized/i);
  });

  // EDIT BLOG
  it('should edit blog and update reading_time when body changes', async () => {
    const createRes = await request(app)
      .post('/api/blogs')
      .set('x-auth-token', token)
      .send({
        title: 'Edit Test',
        body: 'Long body. '.repeat(100), // ~100 words → ~1 min
      });
    const editBlogId = createRes.body._id;

    const newBody = 'Very short now.';
    const res = await request(app)
      .put(`/api/blogs/${editBlogId}`)
      .set('x-auth-token', token)
      .send({ body: newBody, title: 'Updated Title' });

    expect(res.status).toBe(200);
    expect(res.body.title).toBe('Updated Title');
    expect(res.body.body).toBe(newBody);
    expect(res.body.reading_time).toBe(1); // ceil(3 words / 200) = 1
  });

  // DELETE BLOG
  it('should delete own blog', async () => {
    const createRes = await request(app)
      .post('/api/blogs')
      .set('x-auth-token', token)
      .send({ title: 'To Delete', body: 'Body' });
    const deleteId = createRes.body._id;

    const res = await request(app)
      .delete(`/api/blogs/${deleteId}`)
      .set('x-auth-token', token);

    expect(res.status).toBe(200);
    expect(res.body.msg).toBe('Blog deleted');

    // Confirm gone
    const check = await request(app).get(`/api/blogs/${deleteId}`);
    expect(check.status).toBe(404);
  });

  it('should return 401 when non-owner tries to delete', async () => {
    const createRes = await request(app)
      .post('/api/blogs')
      .set('x-auth-token', token)
      .send({ title: 'Cannot Delete', body: 'Body' });
    const deleteId = createRes.body._id;

    const res = await request(app)
      .delete(`/api/blogs/${deleteId}`)
      .set('x-auth-token', secondToken);

    expect(res.status).toBe(401);
    expect(res.body.msg).toMatch(/Not authorized/i);
  });

  // GET OWN BLOGS
  it('should get own blogs including drafts and published', async () => {
    // Create one draft and one published
    await request(app)
      .post('/api/blogs')
      .set('x-auth-token', token)
      .send({ title: 'My Draft', body: 'Draft content' });

    const pubCreate = await request(app)
      .post('/api/blogs')
      .set('x-auth-token', token)
      .send({ title: 'My Published', body: 'Published content' });

    await request(app)
      .put(`/api/blogs/${pubCreate.body._id}/publish`)
      .set('x-auth-token', token);

    const res = await request(app)
      .get('/api/blogs/my-blogs?limit=10')
      .set('x-auth-token', token);

    expect(res.status).toBe(200);
    expect(res.body.blogs.length).toBeGreaterThanOrEqual(2);
    expect(res.body.blogs.some(b => b.state === 'draft')).toBe(true);
    expect(res.body.blogs.some(b => b.state === 'published')).toBe(true);
  });

  // PUBLIC: GET PUBLISHED BLOGS + READ COUNT
  it('should get published blogs and increment read_count on view', async () => {
    // Create and publish
    const createRes = await request(app)
      .post('/api/blogs')
      .set('x-auth-token', token)
      .send({
        title: 'Public Blog',
        body: 'Content for public view. '.repeat(50),
      });

    const pubRes = await request(app)
      .put(`/api/blogs/${createRes.body._id}/publish`)
      .set('x-auth-token', token);

    // View once → read_count should become 1
    const viewRes = await request(app).get(`/api/blogs/${pubRes.body._id}`);
    expect(viewRes.status).toBe(200);
    expect(viewRes.body.read_count).toBe(1);
    expect(viewRes.body.author.first_name).toBe('Emmanuel'); // populated
  });

  it('should return 404 for non-published or non-existent blog', async () => {
    const res = await request(app).get(`/api/blogs/1234567890abcdef12345678`);
    expect(res.status).toBe(404);
  });
});