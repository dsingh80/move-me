'use strict';


/**
 * @class Pose
 * @description
 * Takes raw output from the machine learning model and transforms it into a controllable object
 * The joints are reorganized into the following trees structure:
 *  Core
 *    Chest
 *      RS
 *        RE
 *          RW
 *      LS
 *        LE
 *          LW
 *      H
 *        REye
 *          REar
 *        LEye
 *          LEar
 *    RH
 *      RK
 *        RAnkle
 *          RHeel
 *          RFoot
 *            RToe
 *    LH
 *      LK
 *        LAnkle
 *          LHeel
 *          LFoot
 *            LToe
 */
class Pose {

  constructor(modelOutput) {
    this.pose = {};
    if (modelOutput) { this.pose = this._processRawPoseData(modelOutput); }
  }

  fromPoseObject(obj) {
    this.pose = {};
    Object.assign(this.pose, obj.pose);
    return this;
  }

  getPose() {
    return this.pose;
  }

  getCore() {
    return this.pose.core;
  }



  compare(poseObject) {
    let correctedPose = new Pose().fromPoseObject(this);
    let compScore = 0;
    let iter = (mine, other) => {
      if (!mine.found || !other.found) { return; }
      if (mine.name != 'Core') {
        let myJoint = [mine.x - mine.parent.x,
          mine.y - mine.parent.y];
        let otherJoint = [other.x - other.parent.x,
          other.y - other.parent.y];
        let baseVector = [-1, 0];
        if (this._isDescendantOf(mine, 'Chest')) {
          baseVector[0] = 1;
        }
        let angleDiff = this.__angleBetween(myJoint, baseVector) - this.__angleBetween(otherJoint, baseVector);
        compScore += Math.abs(this.__radToDeg(angleDiff));
        console.log(mine.name, compScore);
        if (Math.abs(this.__radToDeg(angleDiff)) >= 5) {
          console.log('Angular difference of', mine.name, ':', this.__radToDeg(angleDiff), 'degrees');
        }
        correctedPose.rotate(mine, -angleDiff, mine.parent);
      }
      if (mine.joints && mine.joints.length > 0) {
        Object.keys(mine.joints).forEach((joint) => {
          iter(mine.joints[joint], other.joints[joint]);
        });
      }
    };

    iter(correctedPose.getCore(), poseObject.getCore());
    console.log('Total Angular Difference:', compScore);
  }



  __dotProduct(a, b) {
    let dot = 0;
    for (let i=0; i<a.length; i++) {
      dot += a[i]*b[i];
    }
    return dot;
  }



  __magnitude(vec) {
    let length = 0;
    for (let i=0; i<vec.length; i++) {
      length += vec[i]*vec[i];
    }
    return Math.sqrt(length);
  }



  __angleBetween(a, b) {
    let dot = this.__dotProduct(a, b);
    let mag = this.__magnitude(a) * this.__magnitude(b);
    return Math.acos(dot / mag);
  }



  __radToDeg(angle) {
    return Math.ceil(angle * 180 / Math.PI);
  }



  _isDescendantOf(joint, parentJointName) {
    if (joint.name == parentJointName) { return true; }
    let currJoint = joint;
    while (currJoint.parent) {
      if (currJoint.parent.name == parentJointName) { return true; }
      currJoint = currJoint.parent;
    }

    return false;
  }




  /**
   * @private
   * @method processRawPoseData
   * @param {Object} modelOutput - raw output of the machine learning model
   * @returns {Object} Organized object of joints stored in a tree structure
   */
  _processRawPoseData(modelOutput) {
    const jointNames = ['Head', 'Chest', 'RightShoulder', 'RightElbow', 'RightWrist', 'LeftShoulder',
      'LeftElbow', 'LeftWrist', 'Core', 'RightHip', 'RightKnee', 'RightAnkle', 'LeftHip',
      'LeftKnee', 'LeftAnkle', 'RightEye', 'LeftEye', 'RightEar', 'LeftEar', 'LeftToe',
      'LeftFoot', 'LeftHeel', 'RightToe', 'RightFoot', 'RightHeel'];
    let input = modelOutput.people[0].pose_keypoints_2d;
    let output = {
      width: null,
      height: null,
      boundingBox: {},
      core: {}
    };
    let labeledJoints = {};
    let jointName = '',
      jointNameIndex = 0;

    for (let i=0; i<input.length; i+=3) {
      let joint = {
        x: null,
        y: null,
        name: '',
        found: true,
        parent: null
      };
      jointName = jointNames[jointNameIndex];
      joint.name = jointName;
      joint.x = input[i];
      joint.y = input[i+1];

      if (joint.x == 0 && joint.y == 0) {
        joint.found = false;
        console.log(jointName, 'coordinates not found');
      }

      labeledJoints[jointName] = joint;
      jointNameIndex++;
    }

    output.core = this._organizeJoints(labeledJoints);
    this._normalizeJointCoords(output.core);
    let boundaries = this.getPoseBoundaries(output);
    output.width = boundaries[0];
    output.height = boundaries[1];
    output.boundingBox = boundaries[2];
    return output;
  }


  /**
   * @private
   * @method organizeJoints
   * @param {Object} labeledJoints - an object with joints as keys and their coordinates as the values
   * @returns {Object} A hierachical tree organized from the Core joint going outwards to the limbs
   */
  _organizeJoints(labeledJoints) {
    const structure = {
      Core: ['Chest', 'RightHip', 'LeftHip'],
      Chest: ['Head', 'RightShoulder', 'LeftShoulder'],
      RightHip: ['RightKnee'],
      LeftHip: ['LeftKnee'],
      Head: ['RightEye', 'LeftEye'],
      RightShoulder: ['RightElbow'],
      LeftShoulder: ['LeftElbow'],
      RightKnee: ['RightAnkle'],
      LeftKnee: ['LeftAnkle'],
      RightEye: ['RightEar'],
      LeftEye: ['LeftEar'],
      RightElbow: ['RightWrist'],
      LeftElbow: ['LeftWrist'],
      RightAnkle: ['RightHeel', 'RightFoot'],
      LeftAnkle: ['LeftHeel', 'LeftFoot'],
      RightFoot: ['RightToe'],
      LeftFoot: ['LeftToe']
    };

    let recursiveOrganize = (jointName, parentJoint) => {
      let retVal = labeledJoints[jointName];
      retVal.parent = parentJoint;

      if (structure[jointName]) {    // If the joint has child joints
        retVal.joints = [];
        for (let joint of structure[jointName]) { // Add each of the child joints to the current joint
          retVal.joints.push(recursiveOrganize(joint, retVal));
        }
      }

      return retVal;
    };

    // console.log(recursiveOrganize('Core'));

    return recursiveOrganize('Core');
  }


  _normalizeJointCoords(core, origin) {
    if (!origin) { origin = core; }

    let normalizeJoints = (joints, origin) => {
      for (let joint of joints) {
        // console.log(joint);
        if (!joint.found) { return; }
        if (joint.joints && joint.joints.length > 0) {
          normalizeJoints(joint.joints, origin);
        }
        joint.x -= origin.x;
        joint.y -= origin.y;
      }
    };

    normalizeJoints(core.joints, origin);
    core.x = 0;
    core.y = 0;
  }



  /**
   * @method getPoseBoundaries
   * @param {Object} organizedPose
   * @returns {Array} - [width, height, boundingBox] where boundingBox is an object with the min/max X/Y coordinates
   */
  getPoseBoundaries(organizedPose) {
    let recursiveBoundCheck = (joint, bounds) => {
      if (!joint.found) {
        return bounds;
      }
      if (joint.joints && joint.joints.length > 0) {
        for (let childJoint of joint.joints) {
          bounds = recursiveBoundCheck(childJoint, bounds);
        }
      }
      if (joint.x < bounds.minX) {
        bounds.minX = joint.x;
      }
      if (joint.y < bounds.minY) {
        bounds.minY = joint.y;
      }
      if (joint.x > bounds.maxX) {
        bounds.maxX = joint.x;
      }
      if (joint.y > bounds.maxY) {
        bounds.maxY = joint.y;
      }

      return bounds;
    };

    let bounds = {
      minX: 0,
      minY: 0,
      maxX: 0,
      maxY: 0
    };

    bounds = recursiveBoundCheck(organizedPose.core, bounds);
    let width = bounds.maxX - bounds.minX,
      height = bounds.maxY - bounds.minY;

    return [width, height, bounds];
  }


  rotate(joint, angleInRadians, origin) {
    if (!origin) { origin = this.pose.core; }
    if (!joint.found) { return; }
    if (joint.joints && joint.joints.length > 0) {
      for (let childJoint of joint.joints) {
        this.rotate(childJoint, angleInRadians, origin);
      }
    }

    let x = joint.x - origin.x,
      y = joint.y - origin.y;
    let cosTheta = Math.cos(-angleInRadians),
      sinTheta = Math.sin(-angleInRadians);

    joint.x = x*cosTheta - y*sinTheta;
    joint.y = y*cosTheta + x*sinTheta;

    joint.x += origin.x;
    joint.y += origin.y;
  }


  rotateUpperBody(angleInRadians) {
    this.rotate(this.getCore().joints[0], angleInRadians, this.getCore());
  }


  rotateLowerBody(angleInRadians) {
    this.rotate(this.getCore().joints[1], angleInRadians, this.getCore());
    this.rotate(this.getCore().joints[2], angleInRadians, this.getCore());
  }

}


module.exports = Pose;
