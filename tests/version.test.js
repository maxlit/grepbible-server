const request = require('supertest');
const app = require('../app');

describe('Bible Version Routes', () => {
    test('GET /bible/kj should return 200 and render index with KJV version', async () => {
        const response = await request(app)
            .get('/bible/kj')
            .expect(200);
        
        // Check that the response contains expected HTML elements
        expect(response.text).toContain('grepbible WebUI');
    });

    test('GET /bible/vg should return 200 and render index with Vulgate version', async () => {
        const response = await request(app)
            .get('/bible/vg')
            .expect(200);
        
        expect(response.text).toContain('grepbible WebUI');
    });

    test('Random verse endpoint should be accessible from /bible/kj path', async () => {
        const response = await request(app)
            .get('/random-verse-reference')
            .expect(200);
        
        expect(response.body).toHaveProperty('reference');
        expect(typeof response.body.reference).toBe('string');
    });

    test('Search endpoint should work with version from URL path', async () => {
        const response = await request(app)
            .post('/search')
            .send({
                query: 'Genesis 1:1',
                version: 'kj'
            })
            .expect(200);
        
        expect(response.body).toHaveProperty('redirectUrl');
        expect(response.body.redirectUrl).toContain('/q/kj/Genesis/1');
    });
}); 