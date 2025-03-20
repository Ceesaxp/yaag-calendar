/**
 * serve-tests.js - Simple HTTP server for running browser tests
 * 
 * Run with: node serve-tests.js
 * Then open http://localhost:8080/run-tests.html in your browser
 */

const http = require('http');
const fs = require('fs');
const path = require('path');

const PORT = 8080;
const BASE_DIR = __dirname;

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

const server = http.createServer((req, res) => {
  console.log(`${req.method} ${req.url}`);
  
  // Parse URL
  let url = req.url;
  if (url === '/') {
    url = '/run-tests.html';
  }
  
  // Normalize file path
  const filePath = path.normalize(path.join(BASE_DIR, url));
  
  // Security check to prevent directory traversal
  if (!filePath.startsWith(BASE_DIR)) {
    res.statusCode = 403;
    res.end('Forbidden');
    return;
  }
  
  // Determine content type based on file extension
  const ext = path.extname(filePath);
  const contentType = MIME_TYPES[ext] || 'application/octet-stream';
  
  // Read file
  fs.readFile(filePath, (err, data) => {
    if (err) {
      if (err.code === 'ENOENT') {
        // File not found
        res.statusCode = 404;
        res.end('Not Found');
      } else {
        // Server error
        res.statusCode = 500;
        res.end('Internal Server Error');
      }
    } else {
      // Success
      res.statusCode = 200;
      res.setHeader('Content-Type', contentType);
      
      // Special handling for JavaScript modules
      if (ext === '.js') {
        res.setHeader('Content-Type', 'text/javascript');
      }
      
      res.end(data);
    }
  });
});

server.listen(PORT, () => {
  console.log(`Test server running at http://localhost:${PORT}/`);
  console.log(`- Full test suite: http://localhost:${PORT}/run-tests.html`);
  console.log(`- App tests only: http://localhost:${PORT}/test-app.html`);
  console.log(`- EventPositionCalculator test: http://localhost:${PORT}/components/test-event-rendering.html`);
  console.log(`\nPress Ctrl+C to stop the server`);
});