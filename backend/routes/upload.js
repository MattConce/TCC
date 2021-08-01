import express from 'express';
import multer from 'multer';
import fs from 'fs';
import Data from '../models/dataModel';

const { google } = require('googleapis');

const KEYFILEPATH = './credentials.json';
const SCOPES = ['https://www.googleapis.com/auth/drive'];

const auth = new google.auth.GoogleAuth({
  keyFile: KEYFILEPATH,
  scopes: SCOPES,
});

const drive = google.drive({ version: 'v3', auth });

const upload = multer({ limits: { fieldSize: 25 * 1024 * 1024 } });

// Express routes
const router = express.Router();
router.use(express.json());

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

router.post('/save/gdrive', upload.single('video'), async (req, res) => {
  const { video } = req.body;
  const { name } = req.body;
  const encoded = video.split(';base64,').pop();

  let fileMetadata = {
    name: name,
    parents: ['16yRtSqkszRWPMfGnhJ12NQWzWx9f4oWW'],
  };
  try {
    const path = `uploads/${name}.webm`;
    fs.appendFile(path, encoded, 'base64', (err) => {
      if (err) return console.log(err);
      let media = {
        mimeType: 'video/webm',
        body: fs.createReadStream(path),
      };
      drive.files.create(
        {
          resource: fileMetadata,
          media: media,
          fields: 'id',
        },
        (err, file) => {
          if (err) {
            // Handle error
            console.error(err);
          } else {
            res.send(file.data.id);
          }
        }
      );
    });
  } catch (err) {
    res.status(404).send(err);
  }
});

router.post('/', async (req, res) => {
  const buffer = req.body.info;
  let infoArray = [];
  for (let b of buffer) {
    const info = {
      x: b.coord.x,
      y: b.coord.y,
      timeStamp: b.time,
    };
    infoArray.push(info);
  }
  const data = new Data({ video: req.body.video, info: infoArray });
  const newData = await data.save();
  if (newData) {
    return res.status(201).send({ message: 'New Data Created', data: newData });
  }
  return res.status(500).send({ message: ' Error in Creating Data.' });
});

export default router;
