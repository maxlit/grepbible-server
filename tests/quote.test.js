const request = require('supertest');
const app = require('../app'); // Adjust the path as necessary to import your Express app

// curl http://localhost:4628:/q/kj/Joshua/10/29`
describe('GET /api/q/:version/:book/:chapter/:verses?', () => {
    it('should return the correct quote for Joshua 10:29 in KJV', async () => {
        const version = 'kj';
        const book = 'Joshua';
        const chapter = '10';
        const verses = '29';

        const response = await request(app)
            .get(`/api/q/${version}/${book}/${chapter}/${verses}`)
            .expect('Content-Type', /json/)
            .expect(200);

        // Adjust the expected response according to the actual CLI tool output format
        expect(response.body).toEqual({
            quote: "Then Joshua passed from Makkedah, and all Israel with him, unto Libnah, and fought against Libnah:"
        });
    });
});
