import express from 'express';
import multer from 'multer';
import fs from 'fs';
import Data from '../models/dataModel';

const { google } = require('googleapis');
const timeout = require('connect-timeout');

const KEYFILEPATH = './credentials.json';
const SCOPES = ['https://www.googleapis.com/auth/drive'];

const auth = new google.auth.GoogleAuth({
  keyFile: KEYFILEPATH,
  scopes: SCOPES,
});

const upload = multer({ limits: { fieldSize: 1024 * 1024 * 1024 } });

// Express routes
const router = express.Router();
router.use(express.json());

router.post('/googleforms', async (req, res) => {
  let query = { email: req.body.email };
  let update = {
    email: req.body.email,
    name: req.body.name,
    birthday: req.body.birthday,
  };

  let options = { upsert: true, new: true, setDefaultsOnInsert: true };
  let newData = await Data.findOneAndUpdate(query, update, options);

  res.send('ok');
});

router.post('/save', upload.single('video'), async (req, res) => {
  const { video } = req.body;
  const { name } = req.body;
  const encoded = video.split(';base64,').pop();
  try {
    const path = `uploads/${name}.webm`;
    fs.appendFile(path, encoded, 'base64', (err) => {
      if (err) return console.log(err);
      return res.send(path);
    });
  } catch (err) {
    res.status(400).send(err);
  }
});

router.post(
  '/save/gdrive',
  timeout('180s'),
  upload.single('video'),
  async (req, res) => {
    const { video } = req.body;
    const { name } = req.body;
    const encoded = video.split(';base64,').pop();

    const drive = google.drive({ version: 'v3', auth });

    const buffer = new Buffer.from(encoded, 'base64');
    const Readable = require('stream').Readable;
    let bs = new Readable();
    bs.push(buffer);
    bs.push(null);

    let fileMetadata = {
      name: name,
      parents: ['16yRtSqkszRWPMfGnhJ12NQWzWx9f4oWW'],
    };
    let media = {
      mimeType: 'video/webm',
      body: bs,
    };

    let response = await drive.files.create({
      resource: fileMetadata,
      media: media,
      fields: 'id',
    });

    switch (response.status) {
      case 200:
        res.send(response.data.id);
        break;
      default:
        console.log('Error: ', response.errors);
        break;
    }
  }
);

router.post('/', async (req, res) => {
  const buffer = req.body.info;
  let infoArray = [];
  for (let b of buffer) {
    const info = {
      x: b.coord.x,
      y: b.coord.y,
      timestampInit: b.time.timestampInit,
      timestampEnd: b.time.timestampEnd,
    };
    infoArray.push(info);
  }
  let streamObj = {
    video: req.body.video,
    os: req.body.os,
    resolution: req.body.resolution,
    gpu: req.body.gpu,
    info: infoArray,
  };
  let query = { email: req.body.email };
  let update = {
    email: req.body.email,
    $push: { stream: streamObj },
  };

  let options = { upsert: true, new: true, setDefaultsOnInsert: true };
  let newData = await Data.findOneAndUpdate(query, update, options);

  if (newData) {
    return res.status(201).send({ message: 'New Data Created', data: newData });
  }
  return res.status(500).send({ message: ' Error in Creating Data.' });
});

export default router;
