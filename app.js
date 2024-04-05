const express = require('express');
const bodyParser = require('body-parser');
const { exec } = require('child_process');
const app = express();
const cors = require('cors');

app.use(cors());
app.use(express.json());

const basePath = process.env.BASE_PATH || ''; // Default to no base path if not defined

const BOOK2CHAPTERS = {
    '1 Chronicles': 29,
    '1 Corinthians': 16,
    '1 John': 5,
    '1 Kings': 22,
    '1 Peter': 5,
    '1 Samuel': 31,
    '1 Thessalonians': 5,
    '1 Timothy': 6,
    '2 Chronicles': 36,
    '2 Corinthians': 13,
    '2 John': 1,
    '2 Kings': 25,
    '2 Peter': 3,
    '2 Samuel': 24,
    '2 Thessalonians': 3,
    '2 Timothy': 4,
    '3 John': 1,
    'Acts': 28,
    'Amos': 9,
    'Colossians': 4,
    'Daniel': 12,
    'Deuteronomy': 34,
    'Ecclesiastes': 12,
    'Ephesians': 6,
    'Esther': 10,
    'Exodus': 40,
    'Ezekiel': 48,
    'Ezra': 10,
    'Galatians': 6,
    'Genesis': 50,
    'Habakkuk': 3,
    'Haggai': 2,
    'Hebrews': 13,
    'Hosea': 14,
    'Isaiah': 66,
    'James': 5,
    'Jeremiah': 52,
    'Job': 42,
    'Joel': 3,
    'John': 21,
    'Jonah': 4,
    'Joshua': 24,
    'Jude': 1,
    'Judges': 21,
    'Lamentations': 5,
    'Leviticus': 27,
    'Luke': 24,
    'Malachi': 4,
    'Mark': 16,
    'Matthew': 28,
    'Micah': 7,
    'Nahum': 3,
    'Nehemiah': 13,
    'Numbers': 36,
    'Obadiah': 1,
    'Philemon': 1,
    'Philippians': 4,
    'Proverbs': 31,
    'Psalms': 150,
    'Revelation': 22,
    'Romans': 16,
    'Ruth': 4,
    'Song of Solomon': 8,
    'Titus': 3,
    'Zechariah': 14,
    'Zephaniah': 3
};

let bibles = []; // Initialize bibles list

// Function to update the available Bibles list
function updateAvailableBibles() {
  exec('gbib -l', (error, stdout, stderr) => {
    if (error) {
        console.error(`exec error: ${error}`);
        bibles = []; // Keep bibles as an empty array on error
    } else {
        bibles = stdout.split('\n').filter(line => line).map(line => {
          const [code, name, local] = line.match(/^(.*?) - (.*?)\s*(\[local\])?$/).slice(1);
          return { code, name, local: !!local };
        });
    }
  });
}

function processGrepOutput(grepOutput) {
  const lines = grepOutput.split('\n').filter(line => line.trim());
  const htmlLines = lines.map(line => {
      const match = line.match(/.*\/([^\/]+)\/(\d+)\.txt:(\d+):(.*)/);
      if (!match) {
          console.error('Error parsing line:', line);
          return 'Error parsing line.';
      }

      const [, book, chapter, verse, text] = match;
      return `<b>${book} ${chapter}:${verse}</b> ${text}`;
  });

  return htmlLines.join('<br>');
}

function parseCitation(citation, callback) {
    exec(`gbib --parse '${citation}'`, (error, stdout, stderr) => {
      if (error) {
          console.error(`exec error: ${error}`);
          callback(null);
          return;
      }
      try {
          const parsedDetails = JSON.parse(stdout);
          callback(parsedDetails);
      } catch (parseError) {
          console.error(`Error parsing JSON output: ${parseError}`);
          callback(null);
      }
    });
  }

// Fetch the available bibles list once at the start
updateAvailableBibles();

app.set('view engine', 'ejs');
app.use(bodyParser.urlencoded({ extended: true }));

app.get('/', (req, res) => {
  res.render('index', { basePath, bibles }); // Pass the bibles list to the view
});

app.get(`/random-verse-reference`, (req, res) => {
    exec('gbib -r', (error, stdout, stderr) => {
        if (error) {
            console.error(`exec error: ${error}`);
            res.status(500).send("Error retrieving random verse reference.");
        } else {
            // Assuming the first line contains the reference
            const reference = stdout.split('\n')[0].trim();
            console.log(`Random verse reference: ${reference}`);
            res.json({ reference });
        }
    });
});


app.post(`/search`, (req, res) => {
    //const { query, version } = req.body;
    const { query } = req.body;

    const versionsArray = [
        req.body.version,
        req.body.version2,
        req.body.version3
    ].filter(Boolean); // Filter out any falsy values to ignore unselected versions

  // Join the versions array into a comma-separated string
  const versions = versionsArray.join(',');

    exec(`gbib -c '${query}' -v ${versions}`, (error, stdout, stderr) => {
        if (error) {
            console.error(`exec error: ${error}`);
            if (req.xhr || req.headers.accept.includes('application/json')) {
                // Respond with JSON in case of an AJAX request
                res.json({ error: "Error retrieving verse. Make sure your query is correct." });
            } else {
                // For non-AJAX requests, keep the original behavior
                res.render('index', { basePath, bibles, results: "Error retrieving verse. Make sure your query is correct." });
            }
        } else {
            if (req.xhr || req.headers.accept.includes('application/json')) {
                // Send the quote as JSON for AJAX requests
                res.json({ quote: stdout.trim() });
            } else {
                // Render the index view with the search results for non-AJAX requests
                res.render('index', { basePath, bibles, results: stdout });
            }
        }
    });
});

app.get(`/q/:version/:book/:chapter/:verses?`, (req, res) => {
  const { version, book, chapter, verses } = req.params;
  // Construct the query using the book, chapter, and verses
  let query = `${book} ${chapter}`;
  if (verses) {
      query += `:${verses}`;
  }

  // Convert the version string into an array and join with commas for the CLI command
  const versions = version.split(',').join(',');

  exec(`gbib -c '${query}' -v ${versions}`, (error, stdout, stderr) => {
      if (error) {
          console.error(`exec error: ${error}`);
          return res.json({ error: "Error retrieving verse. Make sure your query is correct." });
      }

      // Assuming CLI output is the desired response format
      // Adjust as necessary for your application's response format needs
      res.json({ quote: stdout.trim() });
  });
});


const { execFile } = require('child_process');

app.post(`/search-text`, (req, res) => {
  const { query, version, caseInsensitive, wholeWords } = req.body;
  const localBibleDir = process.env.LOCAL_BIBLE_DIR || `${process.env.HOME}/grepbible_data`;
  const versionDir = `${localBibleDir}/${version}`;

  // Prepare grep options
  let options = ['-nr']; // Default options

  if (caseInsensitive === true || caseInsensitive === 'true') {
    options.push('-i');
  }
  if (wholeWords === true || wholeWords === 'true') {
    options.push('-w');
  }

  // Safely construct the grep command with sanitized inputs
  const args = [...options, query, versionDir];

  execFile('grep', args, (error, stdout, stderr) => {
    if (error) {
      console.error(`exec error: ${error}`);
      return res.json({ error: "Error performing search." });
    }
    if (stderr) {
      console.error(`stderr: ${stderr}`);
      return res.json({ error: "Error performing search." });
    }
    console.log(`stdout: ${stdout}`);
    res.json({ results: processGrepOutput(stdout) || "No results found." });
  });
});



app.post(`/parse`, (req, res) => {
  const citation = req.body.citation; // Assume the citation is sent from the client
  
  exec(`gbib -c "${citation}" --parse`, (error, stdout, stderr) => {
    if (error) {
      console.error(`exec error: ${error}`);
      res.json({ error: "Error retrieving citation details." });
      return;
    }
    try {
      const [book, chapter, lines] = JSON.parse(stdout);
      //console.log({ book, chapter, lines }); // Temporarily log the values
      res.json({ book, chapter, lines });
    } catch (err) {
      console.error(`Error parsing JSON: ${err}`);
      res.json({ error: "Error parsing citation details." });
    }
  });
});

module.exports = app; // Make sure this is at the end of app.js