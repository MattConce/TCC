import mongoose from 'mongoose';

const infoSchema = mongoose.Schema({
  x: { type: Number },
  y: { type: Number },
  timestamp: { type: Number },
});

const dataSchema = new mongoose.Schema({
  video: { type: String, required: true },
  info: [infoSchema],
});

const dataModel = mongoose.model('Data', dataSchema);

export default dataModel;
