const request = require('supertest');
const app = require('../app');

describe('Navigation Tests', () => {
    test('Navigation from text search to verse quote works', async () => {
        // First get the text search page
        const textSearchResponse = await request(app)
            .get('/f/kj/molten')
            .expect(200);
        
        // Verify we're on the text search page
        expect(textSearchResponse.text).toContain('value="molten"');
        
        // Now simulate searching for a specific verse from this page
        const verseSearchResponse = await request(app)
            .post('/search')
            .send({
                query: 'Psalms 106:19',
                version: 'kj'
            })
            .expect(200);
        
        // Verify we get the correct redirect URL
        expect(verseSearchResponse.body).toHaveProperty('redirectUrl');
        expect(verseSearchResponse.body.redirectUrl).toContain('/q/kj/Psalms/106/19');
        
        // Follow the redirect and check the content
        const finalResponse = await request(app)
            .get(verseSearchResponse.body.redirectUrl)
            .expect(200);
        
        // Check that the verse content is correct
        expect(finalResponse.text).toContain('worshipped the molten image');
        
        // Verify the verse reference is displayed
        expect(finalResponse.text).toContain('Psalms 106:19');
    });

    test('Navigation from text search to random verse works', async () => {
        // First get the text search page
        const textSearchResponse = await request(app)
            .get('/f/kj/molten')
            .expect(200);
        
        // Verify we're on the text search page
        expect(textSearchResponse.text).toContain('value="molten"');
        
        // Verify the random verse button is present
        expect(textSearchResponse.text).toContain('id="randomVerseBtn"');
        expect(textSearchResponse.text).toContain('Random Verse');
        
        // Mock a random verse by first getting a known verse
        const verseSearchResponse = await request(app)
            .post('/search')
            .send({
                query: 'Genesis 1:1',  // Use a known verse instead of random
                version: 'kj'
            })
            .expect(200);
        
        // Verify we get a redirect URL
        expect(verseSearchResponse.body).toHaveProperty('redirectUrl');
        
        // Follow the redirect
        const finalResponse = await request(app)
            .get(verseSearchResponse.body.redirectUrl)
            .expect(200);
        
        // Verify we landed on a verse page
        expect(finalResponse.text).toContain('id="citationInput"');
        // Verify there is some citation value in the input
        expect(finalResponse.text).toMatch(/value="[^"]+"/);
        // Verify there is some verse text content
        expect(finalResponse.text).toMatch(/<[^>]+>.+<\/[^>]+>/);
    });

    test('Navigation to random verse with default version works', async () => {
        // Test the redirect from /random to /random/kj
        const randomResponse = await request(app)
            .get('/random')
            .expect(302); // Expect redirect status
        
        // Verify redirect URL contains /random/kj
        expect(randomResponse.headers.location).toContain('/random/kj');
        
        // Follow the redirect
        const finalResponse = await request(app)
            .get(randomResponse.headers.location)
            .expect(200);
        
        // Verify we landed on a verse page
        expect(finalResponse.text).toContain('id="citationInput"');
        // Verify there is some citation value in the input
        expect(finalResponse.text).toMatch(/value="[^"]+"/);
        // Verify there is some verse text content
        expect(finalResponse.text).toMatch(/<[^>]+>.+<\/[^>]+>/);
    });

    test('Navigation to random verse with multiple versions works', async () => {
        const response = await request(app)
            .get('/random/kj,vg,de')
            .expect(200);
        
        // Verify we landed on a verse page
        expect(response.text).toContain('id="citationInput"');
        
        // Verify there is some citation value in the input
        expect(response.text).toMatch(/value="[^"]+"/);
        
        // Verify there is verse text content
        expect(response.text).toMatch(/<[^>]+>.+<\/[^>]+>/);
    });
}); 