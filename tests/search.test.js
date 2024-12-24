const request = require('supertest');
const app = require('../app');

describe('Text Search', () => {
    test('Search for "molten" in KJV should return results including Psalms 106:19', async () => {
        const response = await request(app)
            .post('/search-text')
            .send({
                query: 'molten',
                version: 'kj',
                caseInsensitive: false,
                wholeWords: true
            })
            .expect(200);

        // Check that response has results
        expect(response.body).toHaveProperty('results');
        
        // Results should be a string containing HTML
        expect(typeof response.body.results).toBe('string');
        
        // Should contain the specific verse reference
        expect(response.body.results).toContain('Psalms 106:19');
        
        // Should contain the word "molten"
        expect(response.body.results).toContain('molten');

        expect(response.body.results).toContain('Iron is taken out of the earth, and brass is molten out of the stone.');
        
        // Should be formatted as a link
        expect(response.body.results).toMatch(/<a href="[^"]*\/q\/kj\/Psalms\/106\/19[^"]*">/);
    });

    test('Search with case insensitive flag', async () => {
        const response = await request(app)
            .post('/search-text')
            .send({
                query: 'MOLTEN',
                version: 'kj',
                caseInsensitive: true,
                wholeWords: true
            })
            .expect(200);

        expect(response.body.results).toContain('molten');
        expect(response.body.results).toContain('Psalms 106:19');
    });

    test('Search with whole words flag', async () => {
        const response = await request(app)
            .post('/search-text')
            .send({
                query: 'molten',
                version: 'kj',
                caseInsensitive: false,
                wholeWords: true
            })
            .expect(200);

        // Should not match words that just contain "molten" as a substring
        expect(response.body.results).not.toContain('unmolten');
    });
}); 