const express = require('express');
const rateLimit = require('express-rate-limit');

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
let activeSemanticSearchCount = 0;
const MAX_SEMANTIC_SEARCHES = 3;

function calculateServerBasePath(req) {
  return process.env.BASE_PATH || '';  // Default to empty if not defined
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

function executeGbib(query, versions, callback, options = {}) {
    let command = `gbib -c '${query}' -v ${versions}`;
    
    // Add -i flag if parallelLines is true
    if (options.parallelLines) {
        command += ' -i';
    }
    
    exec(command, (error, stdout, stderr) => {
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

// Helper function to get a random verse reference
async function getRandomVerseReference() {
    return new Promise((resolve, reject) => {
        exec('gbib -r', (error, stdout, stderr) => {
            if (error) {
                console.error(`exec error: ${error}`);
                reject("Error retrieving random verse reference.");
            } else {
                const reference = stdout.split('\n')[0].trim();
                console.log(`Random verse reference generated: ${reference}`);
                resolve(reference);
            }
        });
    });
}

// Random verse reference endpoint
app.get(`/random-verse-reference`, async (req, res) => {
    try {
        const reference = await getRandomVerseReference();
        res.json({ reference });
    } catch (error) {
        console.error(`Error in random-verse-reference:`, error);
        res.status(500).send("Error retrieving random verse reference.");
    }
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
    const parallelLines = req.query.parallelLines === 'true';
    
    let query = `${book} ${chapter}`;
    if (verses) {
        query += `:${verses}`;
    }
    const versions = version.split(',');
    executeGbib(query, versions, (result) => res.json(result), { parallelLines });
});

// New GET endpoint for search functionality
app.get(`/q/:version/:book/:chapter/:verses?`, (req, res) => {
    const { version, book, chapter, verses } = req.params;
    const parallelLines = req.query.parallel === 'true';
    
    let query = `${book} ${chapter}`;
    if (verses) {
        query += `:${verses}`;
    }

    const versions = version.split(',');
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
            res.render('index', { 
                basePath, 
                bibles, 
                results: result.quote,
                reference: query, 
                versions: versions, 
                BOOK2CHAPTERS,
                parallelLines  // Pass the parallel state to the template
            });
        }
    }, { parallelLines });
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

// Create a more restrictive rate limiter for semantic search
const semanticSearchLimiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 5, // limit each IP to 5 semantic searches per windowMs
    message: 'Too many semantic search requests, please try again later.',
    standardHeaders: true,
    legacyHeaders: false,
});

// Apply to semantic search routes
app.post('/search-text', (req, res, next) => {
    if (req.body.semantic === true || req.body.semantic === 'true') {
        return semanticSearchLimiter(req, res, next);
    }
    next();
});

app.post('/search-text', (req, res) => {
  const { query, version } = req.body;
  const caseInsensitive = req.body.caseInsensitive === true || req.body.caseInsensitive === 'true';
  const wholeWords = req.body.wholeWords === true || req.body.wholeWords === 'true';
  const flexible = req.body.flexible === true || req.body.flexible === 'true';
  const semantic = req.body.semantic === true || req.body.semantic === 'true';

  if (semantic) {
    if (activeSemanticSearchCount >= MAX_SEMANTIC_SEARCHES) {
        return res.status(503).json({ 
            error: 'Semantic search is temporarily overloaded. Please try again in a few minutes.' 
        });
    }
    activeSemanticSearchCount++;
    
    // Set a timeout to prevent stuck searches
    const searchTimeout = setTimeout(() => {
        activeSemanticSearchCount--;
        if (!res.headersSent) {
            res.status(504).json({ error: "Semantic search timed out. Please try again." });
        }
    }, 120000); // 2 minute timeout
    
    // Use gbib with RAG for semantic search
    exec(`gbib -s "${query}" -v ${version} --rag --grep`, (error, stdout, stderr) => {
      try {
        clearTimeout(searchTimeout); // Clear timeout if search completes normally
        if (error) {
          console.error(`exec error: ${error}`);
          // Check if the error message contains FileNotFoundError for RAG index
          if (stderr && stderr.includes('FileNotFoundError: No RAG index found')) {
            return res.status(400).json({ error: `Semantic search is not available for the '${version}' version. Please try with a different version or use regular search.` });
          }
          return res.status(500).json({ error: "Error performing semantic search." });
        }
        res.json({ results: processGrepOutput(stdout, version, req) || "No results found." });
      } finally {
        // Always decrease the counter, even if there was an error
        activeSemanticSearchCount--;
      }
    });
  } else if (flexible) {
    // Existing flexible search code
    exec(`gbib -s "${query}" -v ${version} --grep`, (error, stdout, stderr) => {
      if (error) {
        console.error(`exec error: ${error}`);
        return res.json({ error: "Error performing search." });
      }
      if (stderr) {
        console.error(`stderr: ${stderr}`);
        return res.json({ error: "Error performing search." });
      }
      res.json({ results: processGrepOutput(stdout, version, req) || "No results found." });
    });
  } else {
    // Original grep-based search
    let options = ['-nr']; // Default options

    if (caseInsensitive === true || caseInsensitive === 'true') {
      options.push('-i');
    }
    if (wholeWords === true || wholeWords === 'true') {
      options.push('-w');
    }

    const localBibleDir = process.env.LOCAL_BIBLE_DIR || `${process.env.HOME}/grepbible_data`;
    const versionDir = `${localBibleDir}/${version}`;

    const args = [...options, query, versionDir];

    execFile('grep', args, (error, stdout, stderr) => {
      if (error && error.code !== 1) {  // Ignore grep's exit code 1 (no matches)
        console.error(`exec error: ${error}`);
        return res.json({ error: "Error performing search." });
      }
      if (stderr) {
        console.error(`stderr: ${stderr}`);
        return res.json({ error: "Error performing search." });
      }
      res.json({ results: processGrepOutput(stdout, version, req) || "No results found." });
    });
  }
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
    
    // Extract checkbox parameters from query string
    const caseInsensitive = req.query.ci === '1';
    const wholeWords = req.query.ww === '1';
    const flexible = req.query.flex === '1';
    const semantic = req.query.sem === '1';
    
    const localBibleDir = process.env.LOCAL_BIBLE_DIR || `${process.env.HOME}/grepbible_data`;
    const versionDir = `${localBibleDir}/${version}`;

    if (semantic) {
        // Use gbib with RAG for semantic search
        exec(`gbib -s "${text}" -v ${version} --rag --grep`, (error, stdout, stderr) => {
            let basePath = calculateServerBasePath(req);
            if (error) {
                console.error(`exec error: ${error}`);
                res.render('index', { 
                    basePath, 
                    bibles, 
                    results: "Error performing semantic search.", 
                    reference: '', 
                    versions: [version], 
                    BOOK2CHAPTERS,
                    searchText: text,
                    caseInsensitive,
                    wholeWords,
                    flexible,
                    semantic
                });
            } else {
                res.render('index', { 
                    basePath, 
                    bibles, 
                    results: processGrepOutput(stdout, version, req) || "No results found.", 
                    reference: '', 
                    versions: [version], 
                    BOOK2CHAPTERS,
                    searchText: text,
                    caseInsensitive,
                    wholeWords,
                    flexible,
                    semantic
                });
            }
        });
    } else if (flexible) {
        // Use gbib flexible search
        exec(`gbib -s "${text}" -v ${version} --grep`, (error, stdout, stderr) => {
            let basePath = calculateServerBasePath(req);
            if (error) {
                console.error(`exec error: ${error}`);
                res.render('index', { 
                    basePath, 
                    bibles, 
                    results: "Error performing search.", 
                    reference: '', 
                    versions: [version], 
                    BOOK2CHAPTERS,
                    searchText: text,
                    caseInsensitive,
                    wholeWords,
                    flexible,
                    semantic
                });
            } else {
                res.render('index', { 
                    basePath, 
                    bibles, 
                    results: processGrepOutput(stdout, version, req) || "No results found.", 
                    reference: '', 
                    versions: [version], 
                    BOOK2CHAPTERS,
                    searchText: text,
                    caseInsensitive,
                    wholeWords,
                    flexible,
                    semantic
                });
            }
        });
    } else {
        // Use grep with appropriate options
        let options = ['-nr']; // Default options

        if (caseInsensitive) {
            options.push('-i');
        }
        if (wholeWords) {
            options.push('-w');
        }

        const args = [...options, text, versionDir];

        execFile('grep', args, (error, stdout, stderr) => {
            let basePath = calculateServerBasePath(req);
            if (error && error.code !== 1) {  // Ignore grep's exit code 1 (no matches)
                console.error(`exec error: ${error}`);
                res.render('index', { 
                    basePath, 
                    bibles, 
                    results: "Error performing search.", 
                    reference: '', 
                    versions: [version], 
                    BOOK2CHAPTERS,
                    searchText: text,
                    caseInsensitive,
                    wholeWords,
                    flexible,
                    semantic
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
                    searchText: text,
                    caseInsensitive,
                    wholeWords,
                    flexible,
                    semantic
                });
            } else {
                res.render('index', { 
                    basePath, 
                    bibles, 
                    results: processGrepOutput(stdout, version, req) || "No results found.", 
                    reference: '', 
                    versions: [version], 
                    BOOK2CHAPTERS,
                    searchText: text,
                    caseInsensitive,
                    wholeWords,
                    flexible,
                    semantic
                });
            }
        });
    }
});

// Handle /random with default version (KJV) by redirecting to /random/kj
app.get('/random', (req, res) => {
    const basePath = calculateServerBasePath(req);
    res.redirect(basePath + '/random/kj');
});

// Handle /random/:versions with specified versions
app.get('/random/:versions', async (req, res) => {
    const versions = req.params.versions;
    const basePath = calculateServerBasePath(req);
    
    try {
        // Use the shared function to get random verse reference
        const reference = await getRandomVerseReference();

        // Parse the reference
        const { book, chapter, lines } = await parseCitationAsync(reference);
        
        // Redirect to the verse view with specified versions using the same approach as elsewhere
        res.redirect(`${basePath}/q/${versions}/${book}/${chapter}/${lines}`);
    } catch (error) {
        console.error('Error:', error);
        res.status(500).send("Error retrieving random verse.");
    }
});

module.exports = app; // Make sure this is at the end of app.js