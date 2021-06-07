import express from 'express';
import multer from 'multer';
import fs from 'fs';
import Data from '../models/dataModel';

const upload = multer();

const router = express.Router();

router.use(express.json());

router.post('/save', upload.single('image'), (req, res) => {
  const { image } = req.body;
  const { name } = req.body;
  const encoded = image.split(';base64,').pop();
  try {
    const path = `uploads/${name}.png`;
    fs.writeFile(path, encoded, 'base64', (err) => {
      if (err) return console.log(err);
      return res.send(path);
    });
  } catch (err) {
    res.status(400).send(err);
  }
});

router.post('/', async (req, res) => {
  const data = new Data({
    x: req.body.coordinates.x,
    y: req.body.coordinates.y,
    leftEye: req.body.pathLeftImg,
    rightEye: req.body.pathRightImg,
  });
  const newData = await data.save();
  if (newData) {
    return res.status(201).send({ message: 'New Data Created', data: newData });
  }
  return res.status(500).send({ message: ' Error in Creating Data.' });
});

export default router;
