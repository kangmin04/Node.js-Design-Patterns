
import { EventEmitter } from 'node:events';
import http from 'node:http';
import https from 'node:https';
import fs from 'node:fs';
import { URL } from 'node:url';

/**
 * A production-ready file downloader.
 *
 * @param {string} urlString The URL of the file to download.
 * @param {string} dest The local filepath to save the file to.
 * @param {object} [options] Optional settings.
 * @param {number} [options.maxRedirects=5] Maximum number of redirects to follow.
 * @param {number} [options.maxRetries=3] Maximum number of retries on transient errors (network, 5xx).
 * @param {function} cb Callback function `(err, result) => {}`.
 * @returns {EventEmitter} An event emitter for 'progress' events.
 */
function download(urlString, dest, options, cb) {
  if (typeof options === 'function') {
    cb = options;
    options = {};
  }

  const { maxRedirects = 5, maxRetries = 3 } = options || {};
  const eventEmitter = new EventEmitter();
  let retries = 0;

  const attemptDownload = (currentUrl, redirectCount = 0) => {
    const urlObj = new URL(currentUrl);
    const transport = urlObj.protocol === 'https:' ? https : http;

    const req = transport.get(currentUrl, { headers: { 'User-Agent': 'Node.js-Downloader' } }, (res) => {
      // 1. Handle Redirects (3xx)
      if (res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) {
        if (redirectCount >= maxRedirects) {
          res.resume(); // Consume response data to free up memory.
          return cb(new Error(`Too many redirects (max: ${maxRedirects})`));
        }
        console.log(`Redirecting to: ${res.headers.location}`);
        res.resume();
        return attemptDownload(new URL(res.headers.location, currentUrl).toString(), redirectCount + 1);
      }

      // 3. Handle HTTP Errors (Client 4xx & Server 5xx)
      if (res.statusCode >= 400) {
        // For server errors (5xx), we can retry
        if (res.statusCode >= 500 && retries < maxRetries) {
          retries++;
          res.resume();
          console.log(`Server error (${res.statusCode}). Retrying... (${retries}/${maxRetries})`);
          return setTimeout(() => attemptDownload(currentUrl, redirectCount), 1500 * retries);
        }
        const err = new Error(`Download failed: Server responded with status code ${res.statusCode}`);
        res.resume();
        return cb(err);
      }
      
      if (res.statusCode !== 200) {
          const err = new Error(`Download failed: Server responded with unhandled status code ${res.statusCode}`);
          res.resume();
          return cb(err);
      }

      // 2. Stream to file instead of buffering in memory
      const fileStream = fs.createWriteStream(dest);
      res.pipe(fileStream);

      const totalBytes = parseInt(res.headers['content-length'], 10);
      let downloadedBytes = 0;

      res.on('data', (chunk) => {
        downloadedBytes += chunk.length;
        eventEmitter.emit('progress', { downloaded: downloadedBytes, total: totalBytes });
      });
      
      res.on('error', (err) => {
        fs.unlink(dest, () => cb(err)); // Clean up on error
      });

      fileStream.on('finish', () => {
        fileStream.close(() => {
            cb(null, { path: dest, size: downloadedBytes });
        });
      });

      fileStream.on('error', (err) => {
        fs.unlink(dest, () => cb(err)); // Clean up on error
      });
    });

    // 4. Handle network errors with retries
    req.on('error', (err) => {
        if (retries < maxRetries) {
            retries++;
            console.log(`Network error. Retrying... (${retries}/${maxRetries})`);
            return setTimeout(() => attemptDownload(currentUrl, redirectCount), 1500 * retries);
        }
        cb(err);
    });
    
    req.setTimeout(30000, () => {
        req.destroy(new Error('Request timed out after 30 seconds'));
    });
  };

  attemptDownload(urlString);
  return eventEmitter;
}

// --- Example Usage ---
/*
import path from 'node:path';

// A large, chunked response that would cause memory issues with the old method
const url = 'https://jsonplaceholder.typicode.com/posts'; 
const dest = path.join(process.cwd(), 'posts.json');

console.log(`Downloading from ${url} to ${dest}`);

const downloader = download(url, dest, (err, result) => {
  if (err) {
    console.error(`\nDownload failed: ${err.message}`);
    return;
  }
  console.log(`\nDownload complete. File saved to ${result.path} (${result.size} bytes).`);
});

downloader.on('progress', ({ downloaded, total }) => {
  // Handle cases where total size is unknown (chunked transfer)
  if (!isNaN(total)) {
    const percentage = ((downloaded / total) * 100).toFixed(2);
    process.stdout.write(`Downloading... ${percentage}% (${downloaded} / ${total} bytes)\r`);
  } else {
    process.stdout.write(`Downloading... ${downloaded} bytes\r`);
  }
});
*/
