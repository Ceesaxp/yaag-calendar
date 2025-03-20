/**
 * Simple HTTP server for testing the Year Planner application
 * Run with: node js/serve.js
 */

const http = require('http');
const fs = require('fs');
const path = require('path');

const PORT = 3000;
// Use project root as the base directory instead of /js
const BASE_DIR = path.join(__dirname, '..');

// MIME types for different file extensions
const MIME_TYPES = {
  '.html': 'text/html',
  '.js': 'text/javascript',
  '.css': 'text/css',
  '.json': 'application/json',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.gif': 'image/gif',
  '.svg': 'image/svg+xml',
  '.ico': 'image/x-icon',
};

// Create the server
const server = http.createServer((req, res) => {
  console.log(`${req.method} ${req.url}`);
  
  // Handle root URL
  let url = req.url;
  if (url === '/') {
    url = '/index.html';
  }
  
  // Normalize the file path
  const filePath = path.normalize(path.join(BASE_DIR, url));
  
  // Security check - make sure the path doesn't leave the base directory
  if (!filePath.startsWith(BASE_DIR)) {
    res.statusCode = 403;
    res.end('Forbidden');
    return;
  }
  
  // Get the file extension
  const extname = path.extname(filePath);
  
  // Set content type based on file extension
  const contentType = MIME_TYPES[extname] || 'application/octet-stream';
  
  // Read the file
  fs.readFile(filePath, (err, content) => {
    if (err) {
      if (err.code === 'ENOENT') {
        // File not found
        console.error(`File not found: ${filePath}`);
        res.statusCode = 404;
        res.end('Not Found');
      } else {
        // Server error
        console.error(`Server error: ${err}`);
        res.statusCode = 500;
        res.end('Internal Server Error');
      }
    } else {
      // Success! Set proper headers and return content
      res.statusCode = 200;
      res.setHeader('Content-Type', contentType);
      
      // For JavaScript modules, make sure the correct MIME type is set
      if (extname === '.js' && (url.includes('/components/') || url.includes('/services/'))) {
        res.setHeader('Content-Type', 'text/javascript');
      }
      
      res.end(content);
    }
  });
});

// Start the server
server.listen(PORT, () => {
  console.log(`Server running at http://localhost:${PORT}/`);
  console.log(`- Main application: http://localhost:${PORT}/`);
  console.log(`- Test grid component: http://localhost:${PORT}/test-grid.html`);
  console.log(`- Test suite: http://localhost:${PORT}/run-tests.html`);
  console.log(`\nPress Ctrl+C to stop`);
});