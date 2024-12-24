const request = require('supertest');
const app = require('../app');

describe('Version Routes', () => {
    test('GET /version/kj should return 200 and render index with KJV version', async () => {
        const response = await request(app)
            .get('/version/kj')
            .expect(200);
        
        // Check that the response contains expected HTML elements
        expect(response.text).toContain('grepbible WebUI');
    });

    test('GET /version/vg should return 200 and render index with Vulgate version', async () => {
        const response = await request(app)
            .get('/version/vg')
            .expect(200);
        
        expect(response.text).toContain('grepbible WebUI');
    });

    test('Random verse endpoint should be accessible from /version/kj path', async () => {
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

describe('Multiple Version Quote Tests', () => {
    test('Job 20:5 in four versions (KJV, German, Latin, Italian)', async () => {
        const response = await request(app)
            .get('/q/kj,de,vg,it/Job/20/5')
            .expect(200);

        // Check that we got a response with content
        expect(response.text).toBeTruthy();

        // Test for each version's text
        const expectedVerses = [
            "That the triumphing of the wicked is short, and the joy of the hypocrite but for a moment?",
            "daß das Frohlocken der Gottlosen nicht lange währt und die Freude des Ruchlosen nur einen Augenblick?",
            "quod laus impiorum brevis sit et gaudium hypocritae ad instar puncti",
            "e la gioia degli empi non dura che un istante?"
        ];

        expectedVerses.forEach(verse => {
            expect(response.text).toContain(verse);
        });

        // Test that the versions are in the correct order
        const verseIndex = {};
        expectedVerses.forEach(verse => {
            verseIndex[verse] = response.text.indexOf(verse);
        });

        // Verify order: KJV -> German -> Latin -> Italian
        for (let i = 0; i < expectedVerses.length - 1; i++) {
            expect(verseIndex[expectedVerses[i]]).toBeLessThan(verseIndex[expectedVerses[i + 1]]);
        }
    });
}); 