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

router.post('/googleforms', async (req, res) => {
  let query = { email: req.body.email };
  let update = {
    email: req.body.email,
    name: req.body.name,
    birthday: req.body.birthday,
    eyeHealth: req.body.eyeHealth,
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

router.post('/save/gdrive', upload.single('video'), async (req, res) => {
  const { video } = req.body;
  const { name } = req.body;
  const encoded = video.split(';base64,').pop();

  const buffer = new Buffer.from(encoded, 'base64');
  var Readable = require('stream').Readable;
  var bs = new Readable();
  bs.push(buffer);
  bs.push(null);

  try {
    let fileMetadata = {
      name: name,
      parents: ['16yRtSqkszRWPMfGnhJ12NQWzWx9f4oWW'],
    };
    let media = {
      mimeType: 'video/webm',
      body: bs,
    };
    drive.files.create(
      {
        resource: fileMetadata,
        media: media,
        fields: 'id',
      },
      (err, file) => {
        if (err) {
          res.status(500).send(err);
        } else {
          res.send(file.data.id);
        }
      }
    );
  } catch (err) {
    res.status(404).send(err.message);
  }
  // const path = `uploads/${name}.webm`;
  // fs.appendFile(path, encoded, 'base64', (err) => {
  //   if (err) return console.log(err);
  //   let media = {
  //     mimeType: 'video/webm',
  //     body: fs.createReadStream(path),
  //   };
  //   drive.files.create(
  //     {
  //       resource: fileMetadata,
  //       media: media,
  //       fields: 'id',
  //     },
  //     (err, file) => {
  //       if (err) {
  //         console.error(err);
  //       } else {
  //         res.send(file.data.id);
  //       }
  //     }
  //   );
  // });
});

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
