'use strict';

const express = require('express'),
  bodyParser = require('body-parser'),
  http = require('http'),
  path = require('path'),
  spawn = require('child_process').spawn,
  exec = require('child_process').exec,
  Video = require('./classes/Video'),
  CompareVideos = require('./classes/CompareVideos'),
  EMD = require('./classes/EarthMoversDistance');

const technique = 'volleyball_jump_serve';
console.log('Selected comparison technique: ', technique);
let proper = new Video(path.resolve(__dirname, 'proper', technique));
console.log('Proper has', proper.getFrameCount(), 'frames');

let improper = new Video(path.resolve(__dirname, 'output_improper'));
console.log('Improper has', improper.getFrameCount(), 'frames');

let comparison = CompareVideos(proper, improper);

let modelOutput;

function runModelAtStartup() {
  return new Promise((resolve, reject) => {
    EMD.writeModelInputWithTraining(comparison[1], comparison[0], comparison[1])
      .then(() => {
        runModelScript()
          .then(resolve)
          .catch(reject);
      })
      .catch((err) => {
        console.error('Failed to write model files');
        reject(err);
      });
  });
}


function runModelScript() {
  return new Promise((resolve, reject) => {
    console.log('Starting model script...');
    let modelScriptInstance = spawn('python', [path.resolve(__dirname, 'emd', 'main.py')]);
    modelScriptInstance.stdout.on('data', (data) => {
      console.log(`Model: ${data}`);
    });
    modelScriptInstance.stderr.on('data', (data) => {
      console.log(`Model: ${data}`);
    });
    modelScriptInstance.on('close', () => {
      console.log('Model script finished');
      EMD.parseModelOutput(path.resolve(__dirname, 'emd', 'output.csv'))
        .then((vid) => {
          console.log('Parsed model output.');
          modelOutput = vid;
          resolve();
        })
        .catch((err) => {
          console.error('Failed to parse model output');
          reject(err);
        });
    });
  });
}


/**
 *
 * TODO: Add file upload, spawn process to frontend (choose which activity to compare to)
 *
 */



const app = express();
app.set('development', process.env.NODE_ENV);
app.set('port', process.env.PORT || 3000);
app.set('working_dir', __dirname);

//
// Middleware
//
app.use(bodyParser.urlencoded({ extended: false }));    // parse form data and assign to req.body
app.use(bodyParser.json({ limit: '25mb' }));
// ------==========   Disable X-Powered-By   ==========------
app.use(function setPoweredByHeader(req, res, next) {
  app.disable('X-Powered-By');
  res.setHeader('X-Powered-By', 'CSV-Filer');
  next();
});
// ------==========   Enable CORS   ==========------
app.use(function setAccessControlHeaders(req, res, next) {
  const origin = req.get('origin');
  if (origin) res.header('Access-Control-Allow-Credentials', 'true');
  res.header('Access-Control-Allow-Origin', '*');    // origin || '*');
  res.header('Access-Control-Allow-Headers', req.get('access-control-request-headers') || '*');
  res.header('Access-Control-Allow-Methods', 'POST, GET, PUT, PATCH, DELETE, OPTIONS');
  if (req.method == 'OPTIONS') return res.status(200).end();
  next();
});


app.use('/ping(.html)?', function(req, res) { res.status(200).send('pong'); });   // Status check
app.use(express.static(path.join(__dirname, 'static')));   // Static assets
app.get('/compare', function(req, res) {
  let payload = [comparison[0], comparison[1], modelOutput, comparison[2]]; // comparison
  res.json(payload).end();
});
/**
 * =====================================================
 * Start Server
 * =====================================================
 */
console.assert('Starting server...');
console.assert('NODE_ENV=', process.env.NODE_ENV);

let server = http.createServer(app);
console.log('---------------------------------------------------------------');
console.log('\tDON\'T FORGET TO ACTIVATE THE PYTHON ENVIRONMENT!');
console.log('---------------------------------------------------------------');
exec('source ./move-me/bin/activate', () => {
  console.log('Activated python environment');
  runModelAtStartup()
    .then(() => {
      startServer(server)
        .catch(() => shutdownServer());
    })
    .catch(console.error);
});

// Handle any outstanding events
process.on('message', function(msg) {
  if (msg && msg.cmd == 'shutdown') {
    shutdownServer();
  }
});
process.on('uncaughtException', function(err) {
  console.error('UNCAUGHT EXCEPTION: ', err); // Don't shutdown the server here. This event will fire many times throughout the server's lifetime
});

async function startServer(server) {
  server.listen(app.get('port'), function(err) {
    if (err) return console.error('Server failed to start on port', app.get('port'));
    console.log('Express server started on port', app.get('port'));
  });
}

/**
 * @function shutdownServer
 * @description Helper method to gracefully shutdown the server and any open connections
 */
async function shutdownServer() {
  console.assert('Server shutting down...');
  if (server) {
    server.close();
    console.assert('Server is down.');
  }
}
/**
 * =====================================================
 * End Server
 * =====================================================
 */



module.exports = app;