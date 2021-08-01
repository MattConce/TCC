import mongoose from 'mongoose';

const infoSchema = mongoose.Schema({
  x: { type: Number },
  y: { type: Number },
  timestampInit: { type: Number },
  timestampEnd: { type: Number },
});

const dataSchema = new mongoose.Schema({
  video: { type: String, required: true },
  os: { type: String, required: true },
  resolution: { type: String, required: true },
  gpu: { type: String, required: true },
  info: [infoSchema],
});

const dataModel = mongoose.model('Data', dataSchema);

export default dataModel;
