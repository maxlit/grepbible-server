const express = require('express');

const bodyParser = require('body-parser');
const { exec, execFile } = require('child_process');
const app = express();
const path = require('path');
const cors = require('cors');
const BOOK2CHAPTERS = require('./src/scripts/constants.js');
require('dotenv').config();

app.use(cors());
app.use(express.json());
app.use('/js', express.static(path.join(__dirname, 'node_modules/jquery/dist')));

const basePath = process.env.BASE_PATH || ''; // Default to no base path if not defined

let bibles = []; // Initialize bibles list

function calculateServerBasePath(req) {
  console.log('calculateServerBasePath called with path:', req.path);
  console.log('basePath value:', basePath);
  return basePath;
}

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

function processGrepOutput(grepOutput, version, req) {
  let basePath = calculateServerBasePath(req);
  const lines = grepOutput.split('\n').filter(line => line.trim());
  const htmlLines = lines.map(line => {
      const match = line.match(/.*\/([^\/]+)\/(\d+)\.txt:(\d+):(.*)/);
      if (!match) {
          console.error('Error parsing line:', line);
          return 'Error parsing line.';
      }

      const [, book, chapter, verse, text] = match;
      const protocol = req.protocol;
      let host = req.get('host');
      
      // Get base URL from request headers set by reverse proxy
      const xForwardedPrefix = req.get('X-Forwarded-Prefix') || '';
      const xOriginalUrl = req.get('X-Original-URL') || '';
      const baseUrl = req.baseUrl || '';
      
      // Try different methods to detect the proxy path prefix
      const prefix = xForwardedPrefix || xOriginalUrl || baseUrl || '';
      
      // Build URL with detected prefix
      const url = `${protocol}://${host}${prefix}/q/${version}/${book}/${chapter}/${verse || ''}`;
      
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
  let basePath = calculateServerBasePath(req);
  res.render('index', { basePath, bibles, results: '', reference: '', versions: ['kj'], BOOK2CHAPTERS }); // Pass the bibles list to the view
});

app.get(`/random-verse-reference`, (req, res) => {
    console.log('Random verse reference endpoint called');
    console.log('Request path:', req.path);
    exec('gbib -r', (error, stdout, stderr) => {
        if (error) {
            console.error(`exec error: ${error}`);
            res.status(500).send("Error retrieving random verse reference.");
        } else {
            const reference = stdout.split('\n')[0].trim();
            console.log(`Random verse reference generated: ${reference}`);
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
      let basePath = calculateServerBasePath(req);
      console.log(`Base path: ${basePath}`);
      const getUrl = basePath + `/q/${versions}/${book}/${chapter}/${lines || ''}`;
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
  const versions = version.split(',');//.join(',');
  executeGbib(query, versions, (result) => res.json(result));
});

// New GET endpoint for search functionality
app.get(`/q/:version/:book/:chapter/:verses?`, (req, res) => {
    const { version, book, chapter, verses } = req.params;
    let query = `${book} ${chapter}`;
    
    if (verses) {
        query += `:${verses}`;
    }

    const versions = version.split(',');
    console.log(`Versions: ${versions}`);

    executeGbib(query, versions, (result) => {
        let basePath = calculateServerBasePath(req);
        if (result.error) {
            res.render('index', { 
                basePath, 
                bibles, 
                results: result.error, 
                reference: '', 
                versions: versions, 
                BOOK2CHAPTERS
            });
        } else {
            // Instead of rendering the full page, just send the quote
            res.render('index', { 
                basePath, 
                bibles, 
                results: result.quote,  // This is the quote text
                reference: query, 
                versions: versions, 
                BOOK2CHAPTERS
            });
        }
    });
});

app.get('/version/:version', (req, res) => {
    const versions = req.params.version.split(',').filter(v => v); // Split by comma and remove empty strings
    const basePath = calculateServerBasePath(req);
    console.log('Calculated basePath:', basePath);
    console.log('Versions:', versions);
    
    res.render('index', {
        BOOK2CHAPTERS,
        bibles,
        basePath,
        results: null,
        reference: '',
        versions: versions  // Pass array of versions to the template
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
    res.json({ results: processGrepOutput(stdout, version, req) || "No results found." });
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

// Add new GET endpoint for text search
app.get('/f/:version/:text', (req, res) => {
    const { version, text } = req.params;
    const localBibleDir = process.env.LOCAL_BIBLE_DIR || `${process.env.HOME}/grepbible_data`;
    const versionDir = `${localBibleDir}/${version}`;

    // Use the same grep options as in the POST endpoint
    const args = ['-nr', text, versionDir];

    execFile('grep', args, (error, stdout, stderr) => {
        let basePath = calculateServerBasePath(req);
        if (error && error.code !== 1) {  // grep returns 1 when no matches found
            console.error(`exec error: ${error}`);
            res.render('index', { 
                basePath, 
                bibles, 
                results: "Error performing search.", 
                reference: '', 
                versions: [version], 
                BOOK2CHAPTERS,
                searchText: text  // Pass the search text to highlight it
            });
        } else if (stderr) {
            console.error(`stderr: ${stderr}`);
            res.render('index', { 
                basePath, 
                bibles, 
                results: "Error performing search.", 
                reference: '', 
                versions: [version], 
                BOOK2CHAPTERS,
                searchText: text
            });
        } else {
            res.render('index', { 
                basePath, 
                bibles, 
                results: processGrepOutput(stdout, version, req) || "No results found.", 
                reference: '', 
                versions: [version], 
                BOOK2CHAPTERS,
                searchText: text
            });
        }
    });
});

module.exports = app; // Make sure this is at the end of app.js