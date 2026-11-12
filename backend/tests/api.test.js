import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import request from 'supertest';
import { app } from '../src/index.js';
import connectDB from '../src/lib/db.js';
import User from '../src/models/user.model.js';
import mongoose from 'mongoose';

describe('Auth & API Integration Tests', () => {
    const testEmail = `vitest_${Date.now()}@example.com`;
    const testPassword = 'TestPassword123!';
    let authCookie = null;
    let createdUserId = null;

    beforeAll(async () => {
        await connectDB();
    });

    afterAll(async () => {
        if (createdUserId) {
            await User.findByIdAndDelete(createdUserId);
        }
        await mongoose.connection.close();
    });

    it('should reject checkAuth when unauthenticated', async () => {
        const res = await request(app).get('/api/auth/check');
        expect(res.status).toBe(401);
        expect(res.body.success).toBe(false);
    });

    it('should reject signup with missing fields', async () => {
        const res = await request(app)
            .post('/api/auth/signup')
            .send({ userName: 'Test' });
        expect(res.status).toBe(400);
        expect(res.body.success).toBe(false);
    });

    it('should reject signup with password shorter than 8 chars', async () => {
        const res = await request(app)
            .post('/api/auth/signup')
            .send({ userName: 'ShortPass', email: 'short@test.com', password: '123' });
        expect(res.status).toBe(400);
        expect(res.body.message).toContain('8 characters');
    });

    it('should successfully create a new user and return user object with jwt cookie', async () => {
        const res = await request(app)
            .post('/api/auth/signup')
            .send({
                userName: 'VitestUser',
                email: testEmail,
                password: testPassword,
            });

        expect(res.status).toBe(201);
        expect(res.body._id).toBeDefined();
        expect(res.body.email).toBe(testEmail.toLowerCase());
        expect(res.body.password).toBeUndefined(); // Password hash must NEVER be exposed
        createdUserId = res.body._id;

        const cookies = res.headers['set-cookie'];
        expect(cookies).toBeDefined();
        const jwtCookie = cookies.find((c) => c.startsWith('jwt='));
        expect(jwtCookie).toBeDefined();
        authCookie = jwtCookie.split(';')[0];
    });

    it('should reject duplicate email registration', async () => {
        const res = await request(app)
            .post('/api/auth/signup')
            .send({
                userName: 'DuplicateUser',
                email: testEmail,
                password: testPassword,
            });

        expect(res.status).toBe(400);
        expect(res.body.message).toContain('already exists');
    });

    it('should successfully log in with valid credentials', async () => {
        const res = await request(app)
            .post('/api/auth/login')
            .send({
                email: testEmail,
                password: testPassword,
            });

        expect(res.status).toBe(200);
        expect(res.body._id).toBe(createdUserId);
        expect(res.body.email).toBe(testEmail.toLowerCase());
    });

    it('should reject login with wrong password', async () => {
        const res = await request(app)
            .post('/api/auth/login')
            .send({
                email: testEmail,
                password: 'WrongPassword123!',
            });

        expect(res.status).toBe(400);
        expect(res.body.message).toBe('Invalid Credentials');
    });

    it('should authenticate protected checkAuth endpoint with JWT cookie', async () => {
        const res = await request(app)
            .get('/api/auth/check')
            .set('Cookie', [authCookie]);

        expect(res.status).toBe(200);
        expect(res.body._id).toBe(createdUserId);
    });

    it('should successfully log out and clear cookie', async () => {
        const res = await request(app).post('/api/auth/logout');
        expect(res.status).toBe(200);
        expect(res.body.success).toBe(true);
        const cookies = res.headers['set-cookie'];
        expect(cookies[0]).toContain('jwt=;');
    });
});
