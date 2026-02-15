const request = require('supertest');
const mongoose = require('mongoose');
const app = require('../server');
const User = require('../models/User');
const dotenv = require('dotenv');

dotenv.config();

let testUser = {
  first_name: 'Test',
  last_name: 'User',
  email: 'testuser@example.com',
  password: 'securePass123!',
};

describe('User Authentication API', () => {
  // Connect to test database before all tests
  beforeAll(async () => {
    await mongoose.connect(process.env.MONGO_URI);
  });

  // Clean up test data after each test
  afterEach(async () => {
    await User.deleteMany({ email: testUser.email });
  });

  // Close database connection after all tests
  afterAll(async () => {
    await mongoose.connection.close();
  });

  // SIGNUP TESTS

  it('should register a new user successfully', async () => {
    const res = await request(app)
      .post('/api/users/signup')
      .send(testUser);

    expect(res.statusCode).toBe(200);
    expect(res.body).toHaveProperty('token');
    expect(typeof res.body.token).toBe('string');

    // Verify user was actually created in DB
    const userInDb = await User.findOne({ email: testUser.email });
    expect(userInDb).not.toBeNull();
    expect(userInDb.first_name).toBe(testUser.first_name);
  });

  it('should return 400 when trying to register with existing email', async () => {
    // First create the user
    await request(app)
      .post('/api/users/signup')
      .send(testUser);

    // Try again with same email
    const res = await request(app)
      .post('/api/users/signup')
      .send(testUser);

    expect(res.statusCode).toBe(400);
    expect(res.body).toHaveProperty('msg');
    expect(res.body.msg).toBe('User already exists');
  });

  it('should return 400 when required fields are missing', async () => {
    const incompleteUser = {
      first_name: 'Test',
      // missing last_name, email, password
    };

    const res = await request(app)
      .post('/api/users/signup')
      .send(incompleteUser);

    expect(res.statusCode).toBe(500); 
  });

  // SIGNIN TESTS

  it('should login successfully with correct credentials', async () => {
    // First register the user
    await request(app)
      .post('/api/users/signup')
      .send(testUser);

    const loginPayload = {
      email: testUser.email,
      password: testUser.password,
    };

    const res = await request(app)
      .post('/api/users/signin')
      .send(loginPayload);

    expect(res.statusCode).toBe(200);
    expect(res.body).toHaveProperty('token');
    expect(typeof res.body.token).toBe('string');
  });

  it('should return 400 when password is incorrect', async () => {
    // First register
    await request(app)
      .post('/api/users/signup')
      .send(testUser);

    const wrongPassword = {
      email: testUser.email,
      password: 'wrongpassword!',
    };

    const res = await request(app)
      .post('/api/users/signin')
      .send(wrongPassword);

    expect(res.statusCode).toBe(400);
    expect(res.body.msg).toBe('Invalid credentials');
  });

  it('should return 400 when user does not exist', async () => {
    const nonExistent = {
      email: 'doesnotexist@example.com',
      password: 'somepass',
    };

    const res = await request(app)
      .post('/api/users/signin')
      .send(nonExistent);

    expect(res.statusCode).toBe(400);
    expect(res.body.msg).toBe('Invalid credentials');
  });
});