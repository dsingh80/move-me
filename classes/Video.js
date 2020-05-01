'use strict';

const _ = require('lodash'),
  fs = require('fs'),
  path = require('path');

const Pose = require('./Pose');


class Video {

  constructor(modelOutputDir, isClone) {
    this.frames = [];
    if (isClone) { return; } // the clone method will assign the frames

    let dir = fs.opendirSync(modelOutputDir);
    if (!dir) { throw 'Invalid directory passed to video'; }
    this.processVideo(dir);
  }


  clone() {
    let newVideo = new Video(null, true);
    newVideo.frames = _.cloneDeep(this.frames, function customizer(value) {
      return value.clone();
    });
    return newVideo;
  }


  processVideo(dir) {
    const MIN_FRAME_COUNT = 24;
    let numFrames = 0;
    let frameData;
    let dirent;
    while (dirent = dir.readSync()) {
      if (dirent.isFile()) {
        numFrames++;
        frameData = fs.readFileSync(path.resolve(dir.path, dirent.name));
        frameData = JSON.parse(frameData);
        frameData = new Pose(frameData, Video.getFrameNum(dirent.name));
        this.frames[frameData.frameNum] = frameData; // Add frames to array in order
      }
    }

    dir.close();

    this.frames = this.frames.map((frame) => {
      return frame; // Remove any frames that could not be parsed
    });

    if (numFrames < MIN_FRAME_COUNT) {
      throw `Input video does not have enough frames. Required ${MIN_FRAME_COUNT}, Received ${numFrames}`;
    }
  }


  getFrameCount() {
    return this.frames.length;
  }


  compare(other, frameMap) {
    if(!frameMap.length) { throw 'Video.compare() received an empty frameMap'; }
    if (!other || !other.frames) { throw 'Video.compare() requires another video to compare to. Received ' + other; }
    if (!frameMap || frameMap.length != this.getFrameCount()) { throw 'Video.compare() received an invalid frameMap. Received ' + frameMap; }
    console.log('Video.compare() received frameMap of', frameMap.length, 'frames');


    let frameDifferences = []; // {};
    let diff;
    for (let i=0; i<frameMap.length; i++) {
      diff = this.frames[i].compare(other.frames[frameMap[i]]);
      diff.frameNum = this.frames[i].frameNum;
      delete diff.totalComparisonScore;

      // Re-format the Pose comparison into another shallow object
      // Each entry tracks the joint and its angular differences over time
      // eslint-disable-next-line no-loop-func
      // Object.keys(diff).forEach((joint) => {
      //   if (!frameDifferences[joint]) { frameDifferences[joint] = []; }
      //   frameDifferences[joint].push(diff[joint]);
      // });

      frameDifferences.push(diff);
    }

    return frameDifferences;
  }


  static getFrameNum(fileName) {
    const MAX_FRAME_DIGITS = 12;
    let endIndex = fileName.indexOf('_keypoints');
    let startIndex = endIndex - MAX_FRAME_DIGITS;
    return parseInt(fileName.substring(startIndex, endIndex));
  }

}


module.exports = Video;