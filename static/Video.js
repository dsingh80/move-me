'use strict';


const fs = require('fs'),
  path = require('path');

const Pose = require('./Pose');

/**
 * @class Video
 * @description Stores the processed poses from an entire video
 */
class Video {

  constructor(videoFileName, dirName) {
    this.poses = [];
    this.__processAllFrames(videoFileName, dirName);
  }


  /**
   * @private
   * @method __processAllFrames
   * @param {String} videoFileName - name of the original video file
   */
  __processAllFrames(videoFileName, dirName) {
    let dir = path.resolve(__dirname, dirName || 'output');
    // Iterate over every file in the directory
    // Process files matching the videoFileName
  }


  __processFrame(rawFrameData) {

  }

}


module.exports = Video;
