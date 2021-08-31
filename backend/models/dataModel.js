import mongoose from 'mongoose';

const infoSchema = mongoose.Schema({
  x: { type: Number },
  y: { type: Number },
  timestampInit: { type: Number },
  timestampEnd: { type: Number },
});

const videoSchema = mongoose.Schema({
  video: { type: String },
  os: { type: String },
  resolution: { type: String },
  gpu: { type: String },
  info: [infoSchema],
});

const dataSchema = new mongoose.Schema({
  name: { type: String },
  email: { type: String },
  birthday: { type: String },
  stream: [videoSchema],
});

const dataModel = mongoose.model('Data', dataSchema);

export default dataModel;
