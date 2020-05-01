import os

# TensorFlow and tf.keras
import tensorflow as tf
import tensorflow.keras.backend as K
from tensorflow import keras
from tensorflow.keras import Sequential
from tensorflow.keras.layers import Input, Flatten, Dense, Reshape, Conv1D

# Earth Mover's Distance
from scipy.stats import wasserstein_distance

# Helper libraries
import numpy as np
import pandas as pd
# import matplotlib.pyplot as plt

import random
random.seed(1492)

# Hide verbose logging
os.environ['TF_CPP_MIN_LOG_LEVEL']='2'
print('Using Tensorflow version', tf.__version__)

# Load Input Data
input = pd.read_csv('emd/input.csv', header=None).to_numpy()
weightsMatrix = pd.read_csv('emd/weights.csv', header=None).to_numpy()

def tf_wasserstein_dist(label, predicted):
  u_values = K.flatten(predicted)
  v_values = K.flatten(label)
  u_weights = weightsMatrix[0]
  v_weights = weightsMatrix[0]

  u_sorter = tf.argsort(u_values)
  v_sorter = tf.argsort(v_values)

  all_values = tf.concat((u_values, v_values), axis=0)
  all_values = tf.sort(all_values)

  def tf_diff_axis_0(a):
    return a[1:]-a[:-1]

  deltas = tf_diff_axis_0(all_values)

  u_cdf_indices = tf.gather(u_values, u_sorter)
  u_cdf_indices = tf.searchsorted(u_cdf_indices, all_values[:-1], 'right')
  v_cdf_indices = tf.gather(v_values, v_sorter)
  v_cdf_indices = tf.searchsorted(v_cdf_indices, all_values[:-1], 'right')
  
  u_sorted_weights = K.cumsum(tf.gather(u_weights, u_sorter))
  u_sorted_weights = tf.concat(([0], u_sorted_weights), axis=0)
  u_cdf = tf.gather(u_sorted_weights, u_cdf_indices) / u_sorted_weights[-1]

  v_sorted_weights = K.cumsum(tf.gather(v_weights, v_sorter))
  v_sorted_weights = tf.concat(([0], v_sorted_weights), axis=0)
  v_cdf = tf.gather(v_sorted_weights, v_cdf_indices) / v_sorted_weights[-1]

  result = tf.cast(K.abs(u_cdf - v_cdf), tf.float32)
  return K.sum(tf.math.multiply(result, deltas))

# Load Data
improperSigMatrix = pd.read_csv('emd/signature_improper.csv', header=None).to_numpy()
properSigMatrix = pd.read_csv('emd/signature_proper.csv', header=None).to_numpy()

print(improperSigMatrix.shape, properSigMatrix.shape, weightsMatrix.shape)
numFeatures = improperSigMatrix.shape[1]
numOutputs = properSigMatrix.shape[1]
# Define model
model = Sequential()
model.add(Input(shape=(numFeatures), name='Input'))
model.add(Reshape((int(numFeatures/2), 2)))
model.add(Conv1D(int(numFeatures/2), kernel_size=4, strides=2, kernel_initializer='ones'))
model.add(Conv1D(int(numFeatures/2), kernel_size=2, strides=1, kernel_initializer='ones'))
model.add(Flatten())
model.add(Dense(numFeatures*4, kernel_initializer='ones'))
model.add(Dense(numFeatures*2, kernel_initializer='ones', activation="relu"))
model.add(Dense(numOutputs, kernel_initializer='ones'))

model.compile(loss=tf_wasserstein_dist, optimizer='adam')
model.summary()

# Train model
model.fit(improperSigMatrix, properSigMatrix, batch_size=1, epochs=30, validation_split=.1)

# Predict on input
output = pd.DataFrame(model.predict(input))
print('Predicted on input')
print('Writing output file...')
# Write to filesystem
output.to_csv('emd/output.csv', index=False, header=False)
print('Done!')
