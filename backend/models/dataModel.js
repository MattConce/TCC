import mongoose from 'mongoose';

const dataSchema = new mongoose.Schema({
  x: { type: Number, required: true },
  y: { type: Number, required: true },
  leftEye: { type: String, required: true },
  rightEye: { type: String, required: true },
});

const dataModel = mongoose.model('data', dataSchema);

export default dataModel;
