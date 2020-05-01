'use strict';

const fs = require('fs'),
  path = require('path');

const Video = require('./Video'),
  Pose = require('./Pose');


/**
 * ==========================
 * Create Model Input
 * ==========================
 */

module.exports.writeModelInputWithTraining = function(input, proper, improper) {
  let inputReformatted = reformatVideoFrames(input);
  let inputSignature = inputReformatted.map((reform) => reform[0]);

  let properReformatted = reformatVideoFrames(proper);
  let improperReformatted = reformatVideoFrames(improper);

  let properSignature = properReformatted.map((reformatted) => reformatted[0]);
  let improperSignature = improperReformatted.map((reformatted) => reformatted[0]);
  let weightsMatrix = properReformatted.map((reformatted) => reformatted[1]); // Proper & Improper have the same weights

  // Normalize weights to sum to 1
  weightsMatrix = weightsMatrix.map((weights) => normalizeWeights(weights));

  return new Promise(async(resolve, reject) => {
    // console.log('Writing input signature');
    await writeToFS('input', inputSignature);
    // console.log('Finished writing input signature');
    // console.log('Writing weights signature');
    await writeToFS('weights', weightsMatrix);
    // console.log('Finished writing weights signature');
    // console.log('Writing training_proper signature');
    await writeToFS('signature_proper', properSignature);
    // console.log('Finished writing training_proper signature');
    // console.log('Writing training_improper signature');
    await writeToFS('signature_improper', improperSignature);
    // console.log('Finished writing training_improper signature');
    resolve();
  });
};


function writeToFS(filename, matrix) {
  return new Promise((resolve, reject) => {
    let matrixCSV = '';
    matrix.forEach((frame) => {
      frame.forEach((frameVal) => {
        matrixCSV += frameVal + ',';
      });
      matrixCSV = matrixCSV.substring(0, matrixCSV.length - 1);
      matrixCSV += '\n';
    });
    // remove the trailing comma;
    let writeStream = fs.createWriteStream(path.resolve(__dirname, '..', 'emd', filename + '.csv'));
    writeStream.write(matrixCSV);
    writeStream.on('drain', resolve);
  });
}


function reformatVideoFrames(vid) {
  return vid.frames.map((frame) => {
    return reformatPose(frame.getCore()); // [signature, weights]
  });
}


function normalizeWeights(weights) {
  let normalized = [];
  let weightsSum = weights.reduce((accumulated, curr) => accumulated + curr);
  normalized = weights.map((weight) => weight /= weightsSum);
  return normalized;
}


function reformatPose(pose) {
  if (!pose.joints) { throw 'reformatPose received pose with no joints'; }
  let signature = [];
  let weights = []; // Based on the joint-distance from the core (basically, Core=1, and every layer of joints after is +1);
  let jointOrder = ['Head', 'Chest', 'RightShoulder', 'RightElbow', 'RightWrist', 'LeftShoulder',
    'LeftElbow', 'LeftWrist', 'Core', 'RightHip', 'RightKnee', 'RightAnkle', 'LeftHip',
    'LeftKnee', 'LeftAnkle', 'RightEye', 'LeftEye', 'RightEar', 'LeftEar', 'LeftToe',
    'LeftFoot', 'LeftHeel', 'RightToe', 'RightFoot', 'RightHeel']; // Same order as the OpenPose model output

  let shallowPose = {};

  // Recursively transform the Pose into a shallow object with jointNames as keys and various data points as values
  let iter = function(joint, jointWeight) {
    shallowPose[joint.name] = [joint.x, joint.y, jointWeight, joint.found];
    if (joint.found && joint.joints) {
      for (let childJoint of joint.joints) {
        iter(childJoint, jointWeight+1);
      }
    }
  };
  iter(pose, 1);

  // Use the shallow object to form a 1-D distribution over the joints using the jointOrder
  jointOrder.forEach((jointName) => {
    if (!shallowPose[jointName] || !shallowPose[jointName][3]) {
      signature.push(0); // default x
      signature.push(0); // default y
      weights.push(0);
      weights.push(0);
      return;
    }
    signature.push(shallowPose[jointName][0]); // x
    signature.push(shallowPose[jointName][1]); // y
    weights.push(shallowPose[jointName][2]); // Need a weight per member of the signature
    weights.push(shallowPose[jointName][2]);
  });

  return [signature, weights];
}




/**
 * ==========================
 * Parse Model Output
 * ==========================
 */

module.exports.parseModelOutput = function(csvPath) {
  return new Promise((resolve, reject) => {
    let data = fs.readFileSync(csvPath, 'utf8');
    resolve(parseVideoCSVData(data));
  });
};


function parseVideoCSVData(csvData) {
  let frameRows = csvData.split('\n');
  let frames = [];
  frameRows.forEach((frameRow) => {
    let vals = frameRow.split(',');
    let pose = parsePose(vals);
    if (pose) {
      frames.push(pose);
    }
  });
  let vid = new Video(null, true);
  vid.frames = frames;
  return vid;
}


function parsePose(signature) {
  let keypoints = [];
  for (let i=0; i<signature.length - (signature.length % 2); i++) {
    keypoints.push(parseFloat(signature[i]));
    if (i%2 == 1) {
      keypoints.push(1); // dummy confidence score
    }
  }

  if (keypoints.length < 75) { return; } // Invalid output file
  let modelOutput = {
    people: [
      {
        pose_keypoints_2d: keypoints
      }
    ]
  };

  return new Pose(modelOutput);
}