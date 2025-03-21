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
  '.mjs': 'text/javascript', // Explicitly handle ES modules
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
  
  // Parse URL to handle query parameters
  const urlObj = new URL(req.url, `http://localhost:${PORT}`);
  
  // Handle root URL
  let url = urlObj.pathname;
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
  
  // Check if the path is a directory
  fs.stat(filePath, (err, stats) => {
    if (err) {
      // Handle file not found
      if (err.code === 'ENOENT') {
        console.error(`File not found: ${filePath}`);
        res.statusCode = 404;
        res.end('Not Found');
      } else {
        console.error(`Server error: ${err}`);
        res.statusCode = 500;
        res.end('Internal Server Error');
      }
      return;
    }
    
    // If it's a directory, look for index.html
    if (stats.isDirectory()) {
      const indexPath = path.join(filePath, 'index.html');
      if (fs.existsSync(indexPath)) {
        serveFile(indexPath, res);
      } else {
        // Generate directory listing
        fs.readdir(filePath, (err, files) => {
          if (err) {
            res.statusCode = 500;
            res.end('Internal Server Error');
            return;
          }
          
          res.statusCode = 200;
          res.setHeader('Content-Type', 'text/html');
          
          const listing = `
            <!DOCTYPE html>
            <html>
              <head>
                <title>Directory Listing</title>
                <style>
                  body { font-family: Arial, sans-serif; margin: 20px; }
                  h1 { color: #333; }
                  ul { list-style-type: none; padding: 0; }
                  li { margin: 5px 0; }
                  a { color: #0066cc; text-decoration: none; }
                  a:hover { text-decoration: underline; }
                </style>
              </head>
              <body>
                <h1>Directory Listing: ${url}</h1>
                <ul>
                  ${url !== '/' ? '<li><a href="..">..</a></li>' : ''}
                  ${files.map(file => `<li><a href="${path.join(url, file)}">${file}</a></li>`).join('')}
                </ul>
              </body>
            </html>
          `;
          
          res.end(listing);
        });
      }
    } else {
      // It's a file, serve it
      serveFile(filePath, res);
    }
  });
  
  function serveFile(filePath, res) {
    // Get the file extension
    const extname = path.extname(filePath);
    
    // Set content type based on file extension
    const contentType = MIME_TYPES[extname] || 'application/octet-stream';
    
    // Read the file
    fs.readFile(filePath, (err, content) => {
      if (err) {
        res.statusCode = 500;
        res.end('Internal Server Error');
        return;
      }
      
      // Success! Set proper headers and return content
      res.statusCode = 200;
      res.setHeader('Content-Type', contentType);
      
      // Disable caching for development purposes
      res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
      res.setHeader('Pragma', 'no-cache');
      res.setHeader('Expires', '0');
      res.setHeader('Surrogate-Control', 'no-store');
      
      // For JavaScript modules, ensure the correct MIME type and add CORS headers
      if (extname === '.js' || extname === '.mjs') {
        res.setHeader('Content-Type', 'text/javascript');
        // Add CORS headers to allow modules to load properly
        res.setHeader('Access-Control-Allow-Origin', '*');
      }
      
      res.end(content);
    });
  }
});

// Start the server
server.listen(PORT, () => {
  console.log(`Server running at http://localhost:${PORT}/`);
  console.log(`- Main application: http://localhost:${PORT}/`);
  console.log(`- Test grid component: http://localhost:${PORT}/test-grid.html`);
  console.log(`- Test suite: http://localhost:${PORT}/run-tests.html`);
  console.log(`\nPress Ctrl+C to stop`);
});
