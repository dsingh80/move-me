'use strict';

module.exports.dotProduct = function(a, b) {
  let dot = 0;
  for (let i = 0; i < a.length; i++) {
    dot += a[i] * b[i];
  }
  return dot;
};


module.exports.magnitude = function(vec) {
  let length = 0;
  for (let i = 0; i < vec.length; i++) {
    length += vec[i] * vec[i];
  }
  return Math.sqrt(length);
};


module.exports.angleBetween = function(a, b) {
  let dot = module.exports.dotProduct(a, b);
  let mag = module.exports.magnitude(a) * module.exports.magnitude(b);
  return Math.acos(dot / mag);
};


module.exports.radToDeg = function(angle) {
  return Math.ceil(angle * 180 / Math.PI);
};
