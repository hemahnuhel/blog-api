# Blogging API

A RESTful Blogging API built with **Node.js**, **Express**, **MongoDB** (via Mongoose), and **JWT** authentication.  
Follows the **MVC** pattern and includes user authentication, blog CRUD operations, ownership checks, reading time calculation, pagination, search/filter/sort, and basic testing.

**Live Demo:**  
https://blog-api-ujg3.onrender.com

## Features

- **User Authentication**
  - Register (signup) and login (signin)
  - Password hashing with bcrypt
  - JWT tokens (expires in 1 hour)

- **Blog Management**
  - Create blog (default: draft)
  - Update blog (title, body, tags, description) → recalculates reading time
  - Publish blog (draft → published) – only owner
  - Delete blog – only owner
  - List own blogs (drafts + published) – paginated
  - Get single published blog → increments read count, populates author

- **Public Endpoints**
  - Paginated list of published blogs (default 20 per page)
  - Search by title / author name / tags
  - Filter by state (published only for public)
  - Sort by read_count, reading_time, timestamp (descending)

- **Automatic Features**
  - Reading time calculation (≈ 200 words per minute, rounded up)
  - Read count tracking on published blog views

- **Security**
  - Ownership checks on edit/publish/delete
  - JWT-protected routes
  - Unique title constraint

## Tech Stack

- Node.js + Express
- MongoDB + Mongoose
- JWT (jsonwebtoken)
- Password hashing (bcryptjs)
- Environment variables (dotenv)
- Testing (Jest + Supertest)
