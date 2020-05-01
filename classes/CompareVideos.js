const Video = require('./Video'),
  Pose = require('./Pose');



//
// Compare frames between videos
//
function getComparisonScores(proper, improper) {
  if (!proper || !improper.frames) { throw 'getComparisonScores: proper cannot be undefined!'; }
  if (!improper || !improper.frames) { throw 'getComparisonScores: improper cannot be undefined!'; }
  let comparisonScoreMatrix = [];

  improper.frames.forEach((improperFrame, improperFrameNum) => {
    let comparisonScores = [];
    proper.frames.forEach((properFrame, properFrameNum) => {
      let shouldLog = false; // improperFrameNum === 0 && properFrameNum === 30;
      comparisonScores.push(improperFrame.compare(properFrame, shouldLog).totalComparisonScore);
    });
    comparisonScoreMatrix.push(comparisonScores);
  });

  return comparisonScoreMatrix;
}



//
// Normalize the proper video dimensions a bit
//
function removeExcessProperFrames(proper, improper) {
  if (!proper || !improper.frames) { throw 'removeExcessProperFrames: proper cannot be undefined!'; }
  if (!improper || !improper.frames) { throw 'removeExcessProperFrames: improper cannot be undefined!'; }
  let properFrames = proper.getFrameCount();
  let improperFrames = improper.getFrameCount();
  let numExcessFrames = properFrames - improperFrames;

  if (numExcessFrames <= 0) { return proper.frames; } // no excesss frames to remove

  let numFramesToSkip = Math.ceil(properFrames / numExcessFrames);
  // let numFramesRemaining = properFrames - Math.floor(properFrames / numFramesToSkip);
  let newProperFrames = [];
  for (let i = 0; i<properFrames; i++) {
    if ((i + 1) % numFramesToSkip != 0) {
      newProperFrames.push(proper.frames[i]);
    }
  }

  return newProperFrames;
}


//
// Crop improper frames down based on best comparison scores
// This function will also auto-update the dimensions of comparisonScores
//
function removeExcessImproperFrames(proper, improper, comparisonScores) {
  if (!proper || !improper.frames) { throw 'removeExcessImproperFrames: proper cannot be undefined!'; }
  if (!improper || !improper.frames) { throw 'removeExcessImproperFrames: improper cannot be undefined!'; }
  let properFrames = proper.getFrameCount();
  let improperFrames = improper.getFrameCount();
  let numExcessFrames = improperFrames - properFrames;

  if (numExcessFrames <= 0) { return improper.frames; } // no excess frames exist

  // Compute average comparison scores for each frame
  let avgScores = comparisonScores.map((row) => {
    let avg = 0;
    row.forEach((score) => avg += score);
    avg /= row.length;
    return avg;
  });

  // Identify frames with the worst comparison scores
  let framesToRemove = [];
  let prevHighestScore = null;
  for (let i=0; i<numExcessFrames; i++) {
    let maxScore = 0;
    let maxScoreFrame = 0;
    avgScores.forEach((score, frameIndex) => {
      if (prevHighestScore && score >= prevHighestScore) { return; } // previous highest scores have already been marked. Don't bother checking them
      if (score > maxScore) {
        maxScore = score;
        maxScoreFrame = frameIndex;
      }
    });
    framesToRemove.push(maxScoreFrame);
    prevHighestScore = maxScore;
  }

  // sort smallest -> largest for efficiency
  framesToRemove.sort((a, b) => a-b);
  let removeIndex = 0; // Index in framesToRemove of next frame to remove

  // Use information above to remove worst frames
  let newComparisonScores = [];
  let newImproperFrames = improper.frames.map((frame, index) => {
    if (removeIndex < improperFrames && index == framesToRemove[removeIndex]) {
      removeIndex += 1;
      return null;
    }

    newComparisonScores.push(comparisonScores[index]);
    return frame;
  });

  // Delete the nullified frames
  newImproperFrames = newImproperFrames.filter(function(el) {
    return el != null;
  });

  comparisonScores = newComparisonScores;
  return newImproperFrames;
}



//
// Match frames based on comparison scores
//
function matchFramesBetweenVideos(proper, improper, comparisonScores) {
  if (!proper || !improper.frames) { throw 'matchFramesBetweenVideos: proper cannot be undefined!'; }
  if (!improper || !improper.frames) { throw 'matchFramesBetweenVideos: improper cannot be undefined!'; }
  if (!comparisonScores) { throw 'matchFramesBetweenVideos: comparisonScores cannot be undefined!'; }

  // Choose the matching strategy with the lowest average comparison score
  let bestStrategy = matchStrategy_Diagonal(proper, improper, comparisonScores);

  let diagonalSpaced = matchStrategy_DiagonalSpaced(proper, improper, comparisonScores);
  if (diagonalSpaced.averageScore < bestStrategy.averageScore) { bestStrategy = diagonalSpaced; }

  let boundedMinimum = matchStrategy_BoundedMinimum(proper, improper, comparisonScores);
  if (boundedMinimum.averageScore < bestStrategy.averageScore) { bestStrategy = boundedMinimum; }

  console.log('Using', bestStrategy.name, 'to match frames. Average comparison score:', bestStrategy.averageScore);
  return bestStrategy.frameMap;
}


function matchStrategy_Diagonal(proper, improper, comparisonScores) {
  let numOutputFrames = improper.getFrameCount();

  let matchedFrameIndices = new Array(numOutputFrames);
  let matchedFrameScores = new Array(numOutputFrames);
  let averageScore = 0;
  for (let i=0; i<numOutputFrames; i++) {
    matchedFrameIndices[i] = i;
    matchedFrameScores[i] = comparisonScores[i][i];
    averageScore += matchedFrameScores[i];
  }
  averageScore /= numOutputFrames;

  console.log('\tDiagonal - Average Overall Comparison Score:', averageScore);
  return {
    name: 'Diagonal',
    frameMap: matchedFrameIndices,
    averageScore: averageScore
  };
}




function matchStrategy_DiagonalSpaced(proper, improper, comparisonScores) {
  let numOutputFrames = improper.getFrameCount();
  let numSkipEveryFrame = proper.getFrameCount() - numOutputFrames;
  numSkipEveryFrame = Math.floor(proper.getFrameCount() / numSkipEveryFrame);
  numSkipEveryFrame = numSkipEveryFrame < 1 ? 1 : numSkipEveryFrame;

  // console.info('\tDiagonalSpaced - using every', numSkipEveryFrame, 'frame(s)');

  let matchedFrameIndices = new Array(numOutputFrames);
  let matchedFrameScores = new Array(numOutputFrames);
  let averageScore = 0;
  let currFrame = 0;
  for (let i=0; i<numOutputFrames; i++) {
    if ((i+1) % numSkipEveryFrame == 0) {
      currFrame++;
    }
    matchedFrameIndices[i] = currFrame;
    matchedFrameScores[i] = comparisonScores[i][currFrame];
    averageScore += matchedFrameScores[i];
    currFrame++;
  }
  averageScore /= numOutputFrames;

  console.log('\tDiagonalSpaced - Average Overall Comparison Score:', averageScore);
  return {
    name: 'DiagonalSpaced',
    frameMap: matchedFrameIndices,
    averageScore: averageScore
  };
}




function matchStrategy_GlobalMinimum(proper, improper, comparisonScores) {
  let numOutputFrames = comparisonScores.length;

  let matchedFrameIndices = new Array(numOutputFrames);
  let matchedFrameScores = new Array(numOutputFrames);
  let averageScore = 0;
  let minScoreFrame = 0;
  for (let i=0; i<numOutputFrames; i++) {
    for (let j=0; j < comparisonScores[i].length; j++) {
      if (comparisonScores[i][j] < comparisonScores[i][minScoreFrame]) {
        minScoreFrame = j;
      }
    }
    matchedFrameIndices[i] = minScoreFrame;
    matchedFrameScores[i] = comparisonScores[i][minScoreFrame];
    minScoreFrame += 1;
    averageScore += matchedFrameScores[i];
  }
  averageScore /= numOutputFrames;

  console.log('\tGlobalMinimum - Average Overall Comparison Score:', averageScore);
  return {
    name: 'GlobalMinimum',
    frameMap: matchedFrameIndices,
    averageScore: averageScore
  };
}




function matchStrategy_BoundedMinimum(proper, improper, comparisonScores) {
  let numOutputFrames = comparisonScores.length;

  let matchedFrameIndices = new Array(numOutputFrames);
  let matchedFrameScores = new Array(numOutputFrames);
  let averageScore = 0;
  let minScoreFrame = 0;
  for (let i=0; i<numOutputFrames; i++) {
    for (let j=minScoreFrame + 1; j < comparisonScores[i].length - numOutputFrames + i; j++) {
      if (comparisonScores[i][j] < comparisonScores[i][minScoreFrame]) {
        minScoreFrame = j;
      }
    }
    matchedFrameIndices[i] = minScoreFrame;
    matchedFrameScores[i] = comparisonScores[i][minScoreFrame];
    
    minScoreFrame += 1;
    averageScore += matchedFrameScores[i];
  }
  averageScore /= numOutputFrames;

  console.log('\tBoundedMinimum - Average Overall Comparison Score:', averageScore);
  return {
    name: 'BoundedMinimum',
    frameMap: matchedFrameIndices,
    averageScore: averageScore
  };
}


module.exports = function(proper, improper) {
  let newProper = proper.clone();
  let newImproper = improper.clone();
  let strategy = [];
  let comparisonScoreMatrix = getComparisonScores(newProper, newImproper);

  if (newImproper.getFrameCount() > newProper.getFrameCount()) {
    console.log('Trimming excess improper frames...');
    console.log('Old improper frame count:', newImproper.getFrameCount());
    newImproper.frames = removeExcessImproperFrames(newProper, newImproper, comparisonScoreMatrix);
    console.log('New improper frame count:', newImproper.getFrameCount());
  }
  else if (newImproper.getFrameCount() < newProper.getFrameCount()) {
    console.log('Trimming excess proper frames...');
    newProper.frames = removeExcessProperFrames(newProper, newImproper);
    console.log('New proper frame count:', newProper.getFrameCount());
    console.log('Recomputing comparison scores...');
    comparisonScoreMatrix = getComparisonScores(newProper, newImproper);  // Need to recompute comparison scores with new dimensions
  }
  
  console.log('Comparison Score Matrix Dimensions:', comparisonScoreMatrix.length, 'x', comparisonScoreMatrix[0].length);

  // Skip a bunch of computation if the frame counts match
  if (newImproper.getFrameCount() == newProper.getFrameCount()) {
    strategy = matchStrategy_Diagonal(newProper, newImproper, comparisonScoreMatrix);
  }
  else {
    strategy = matchFramesBetweenVideos(newProper, newImproper, comparisonScoreMatrix);
  }

  return [newProper, newImproper, newImproper.compare(newProper, strategy.frameMap)];
};