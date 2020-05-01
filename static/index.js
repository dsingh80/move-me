'use strict';

const canvas1 = document.querySelector('#canvas-1');
const canvas2 = document.querySelector('#canvas-2');
const canvas3 = document.querySelector('#canvas-3');

const jointNames = ['Head', 'Chest', 'RightShoulder', 'RightElbow', 'RightWrist', 'LeftShoulder',
'LeftElbow', 'LeftWrist', 'Core', 'RightHip', 'RightKnee', 'RightAnkle', 'LeftHip',
'LeftKnee', 'LeftAnkle', 'RightEye', 'LeftEye', 'RightEar', 'LeftEar', 'LeftToe',
'LeftFoot', 'LeftHeel', 'RightToe', 'RightFoot', 'RightHeel'];

/**
 * @function drawPose
 * @param {Object} pose - Normalized joint coordinates
 * @param {DOMElement<Canvas>} canv - optional canvas to draw the pose onto
 * @description Draws the pose onto an HTML canvas
 */
function drawPose(frame, canvas, offsetX, offsetY, pointSize, color) {
  let pose = frame.pose;
  canvas = canvas || document.querySelector('canvas');
  offsetX = offsetX || pose.width/2;
  offsetY = offsetY || pose.height/2;
  pointSize = pointSize || 3;
  color = color || '#FF0000';

  let drawJoints = (currJoint, origin) => {
    if (!currJoint.found) { return; }
    let x = currJoint.x + offsetX,
      y = currJoint.y + offsetY;
    ctx.moveTo(origin.x + offsetX, origin.y + offsetY);
    ctx.lineTo(x, y);
    ctx.moveTo(x, y);
    ctx.arc(x, y, pointSize, startAngle, endAngle, false);
    if (currJoint.joints && currJoint.joints.length > 0) {
      for (let joint of currJoint.joints) {
        if (joint.found) { drawJoints(joint, currJoint); }
      }
    }
  };

  let startAngle = 0,
    endAngle = Math.PI*2;
  let ctx = canvas.getContext('2d');
  ctx.font = '20px Arial';
  ctx.fillText(frame.frameNum, 10, 20);
  ctx.fillStyle = color;
  ctx.strokeStyle = color;
  ctx.lineWidth = 2;
  ctx.beginPath();
  drawJoints(pose.core, pose.core);
  ctx.fill();
  ctx.stroke();
}


function drawComparisonScores(scores, canvas, offsetX, offsetY) {
  canvas = canvas || document.querySelector('canvas');
  offsetX = offsetX || canvas.width - 300;
  offsetY = offsetY || 30;

  let padding = 5;
  let fontSize = 20;
  let ctx = canvas.getContext('2d');
  ctx.font = fontSize + 'px Arial';

  let currOffsetY = offsetY;

  jointNames.forEach((jointName) => {
    let str = jointName + ': ';
    str += scores[jointName] || '-';
    ctx.fillText(str, offsetX, currOffsetY);
    currOffsetY += fontSize + padding;
  });
}

function clearCanvas(canvas) {
  const context = canvas.getContext('2d');
  context.clearRect(0, 0, canvas.width, canvas.height);
}

function getComparisonData() {
  return new Promise((resolve, reject) => {
    fetch('http://localhost:3000/compare')
      .then((data) => resolve(data.json()))
      .catch(reject);
  });
}

function drawVideo(canvas, video, color, comparisonScores) {
  let currFrame = 0;
  setInterval(() => {
    clearCanvas(canvas);
    if(comparisonScores) {
      drawComparisonScores(comparisonScores[currFrame], canvas);
    }
    drawPose(video.frames[currFrame], canvas, canvas.width / 3, canvas.height / 2, 3, color || '#FF0000');
    currFrame++;
    if (currFrame >= video.frames.length) { currFrame = 0; }
  }, 24);
}

getComparisonData()
  .then((data) => {
    let proper = data[0],
      improper = data[1],
      output = data[2],
      comparisonScores = data[3];
    console.log(comparisonScores);
    drawVideo(canvas1, proper, '#00FF00');
    drawVideo(canvas2, improper, '#FF0000', comparisonScores);
    drawVideo(canvas3, output, '#FF0000');
  })
  .catch((err) => {
    console.error('Failed to get data from server',err);
  });