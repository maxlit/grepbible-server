const request = require('supertest');
const app = require('../app'); // Adjust the path to where your Express app is exported

describe('POST /parse', () => {
  it('parses citation "Joshua 10:29"', async () => {
    const response = await request(app)
      .post('/parse')
      .send({ citation: 'Joshua 10:29' })
      .set('Content-Type', 'application/json') // Explicitly set the Content-Type
      .expect('Content-Type', /json/)
      .expect(200);
    
    //console.log(response.body);
    expect(response.body).toEqual({
      book: 'Joshua',
      chapter: '10',
      lines: ['29']
    });
  });
});
