# Move-Me
A self-teaching aid that provides feedback on movements using pose estimation & analysis through machine learning.  

# How to use
`cd move-me`  
Activate the python environment  
`source ./move-me/bin/activate`  
`npm run start`  
Wait til server is completely launched...  
Open a browser window and navigate to http://localhost:3000  

## How to run pose estimation model
You must build OpenPose on your own machine for this work!  
The working directory must contain the 'models' directory or OpenPose will error
`cd openpose-master`  
`/build/examples/openpose/openpose.bin --video VIDEO_FILE_PATH --write_json PATH_TO_PROJECT_DIR/output_improper --display 0 --render_pose 0 --number_people_max 1`


# Requirements
CUDA 10.1  
Python3  
  * Tensorflow  
  * Scipy  
  * Numpy  
  * Pandas  
NodeJS (I used v12.13.1)  


## Authors
Damanveer Singh

# Credit
OpenPose for Pose Estimation (https://github.com/CMU-Perceptual-Computing-Lab/openpose)  

## License
This project is not open to community modification.
