const express = require('express');
const bodyParser = require('body-parser');
const { exec, execFile } = require('child_process');
const app = express();
const cors = require('cors');
const BOOK2CHAPTERS = require('./src/scripts/constants.js');

app.use(cors());
app.use(express.json());

const basePath = process.env.BASE_PATH || ''; // Default to no base path if not defined

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

function processGrepOutput(grepOutput, version) {
  const lines = grepOutput.split('\n').filter(line => line.trim());
  const htmlLines = lines.map(line => {
      const match = line.match(/.*\/([^\/]+)\/(\d+)\.txt:(\d+):(.*)/);
      if (!match) {
          console.error('Error parsing line:', line);
          return 'Error parsing line.';
      }

      const [, book, chapter, verse, text] = match;
      const url = `/q/${version}/${book}/${chapter}/${verse || ''}`;
      return `<b><a href="${url}">${book} ${chapter}:${verse}</a></b> ${text}`;
  });

  return htmlLines.join('<br>');
}

function param2query(params) {
  const { version, book, chapter, verses } = params;
  let query = `${book} ${chapter}`;
  if (verses) {
      query += `:${verses}`;
  }
  return query;
}

function executeGbib(query, versions, callback) {
  exec(`gbib -c '${query}' -v ${versions}`, (error, stdout, stderr) => {
      if (error) {
          console.error(`exec error: ${error}`);
          callback({ error: "Error retrieving verse. Make sure your query is correct." });
      } else {
          callback({ quote: stdout.trim() });
      }
  });
}

// Fetch the available bibles list once at the start
updateAvailableBibles();

app.set('view engine', 'ejs');
app.use(bodyParser.urlencoded({ extended: true }));

app.get('/', (req, res) => {
  res.render('index', { basePath, bibles, results: '', reference: '' }); // Pass the bibles list to the view
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

app.post(`/search`,  async (req, res) => {
  const { query } = req.body;
  console.log(`Search query: ${query}`);

    const versionsArray = [
        req.body.version,
        req.body.version2,
        req.body.version3
    ].filter(Boolean); // Filter out any falsy values to ignore unselected versions

  // Join the versions array into a comma-separated string
  const versions = versionsArray.join(',');
  console.log(`Versions: ${versions}`);
  try {
      const { book, chapter, lines } = await parseCitationAsync(query);
      console.log(`Parsed citation: ${book} ${chapter}:${lines}`);
      const getUrl = `/q/${versions}/${book}/${chapter}/${lines || ''}`;
      res.status(200).json({ redirectUrl: getUrl });

    } catch (error) {
      console.error("Error occurred in /search:", error.message);
      console.error("Stack trace:", error.stack);
      res.status(500).json({ error: "error.message", details: error.message });
  }
});

// Existing GET endpoint for API calls
app.get(`/api/q/:version/:book/:chapter/:verses?`, (req, res) => {
  const { version, book, chapter, verses } = req.params;
  let query = `${book} ${chapter}`;
  if (verses) {
      query += `:${verses}`;
  }
  const versions = version.split(',').join(',');
  executeGbib(query, versions, (result) => res.json(result));
});

// New GET endpoint for search functionality
app.get(`/q/:version/:book/:chapter/:verses?`, (req, res) => {
  const { version, book, chapter, verses } = req.params;
  let query = `${book} ${chapter}`;
  
  if (verses) {
      query += `:${verses}`;
  }
  console.log(`Query: ${query}`);
  const versions = version.split(',').join(',');

  executeGbib(query, versions, (result) => {
      if (result.error) {
          // Handle error for non-AJAX requests differently if necessary
          res.render('index', { basePath, bibles, results: result.error, reference: ''});
      } else {
          // Send response or render view as needed
          console.log(`Quote: ${result.quote}`);
          //res.json({ quote: result.quote });
          res.render('index', { basePath, bibles, results: result.quote, reference: query});
      }
  });
});



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
    res.json({ results: processGrepOutput(stdout, version) || "No results found." });
  });
});

function parseCitationAsync(citation) {
  return new Promise((resolve, reject) => {
    exec(`gbib -c "${citation}" --parse`, (error, stdout, stderr) => {
      if (error) {
        console.error(`exec error: ${error}`);
        reject("Error retrieving citation details.");
      } else {
        try {
          const [book, chapter, lines] = JSON.parse(stdout);
          resolve({ book, chapter, lines });
        } catch (err) {
          console.error(`Error parsing JSON: ${err}`);
          reject("Error parsing citation details.");
        }
      }
    });
  });
}

app.post(`/parse`, async (req, res) => {
  const citation = req.body.citation; // Assume the citation is sent from the client
  
  try {
    // Await the result from the parseCitationAsync function
    const parsedResult = await parseCitationAsync(citation);
    res.json(parsedResult); // Send the parsed result back
  } catch (error) {
    // Handle any errors that might occur during parsing
    console.error(`Error while parsing citation: ${error}`);
    res.json({ error: "Error parsing citation details." });
  }
});

module.exports = app; // Make sure this is at the end of app.js