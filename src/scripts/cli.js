#!/usr/bin/env node
const { exec } = require('child_process');

// Executes 'npm start' command
exec('npm start', (error, stdout, stderr) => {
  if (error) {
    console.error(`exec error: ${error}`);
    return;
  }
  console.log(`stdout: ${stdout}`);
  console.error(`stderr: ${stderr}`);
});
