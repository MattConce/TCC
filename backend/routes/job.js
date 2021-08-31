import kue from 'kue';
import Data from '../models/dataModel';
import dotenv from 'dotenv';
dotenv.config();

let REDIS_URL = process.env.REDIS_URL || 'redis://127.0.0.1:6379';

const Queue = kue.createQueue({
  redis: REDIS_URL,
});
const { google } = require('googleapis');

const KEYFILEPATH = './credentials.json';
const SCOPES = ['https://www.googleapis.com/auth/drive'];

const auth = new google.auth.GoogleAuth({
  keyFile: KEYFILEPATH,
  scopes: SCOPES,
});
const drive = google.drive({ version: 'v3', auth });

Queue.process('saveVideo', async (job, done) => {
  let { name, kueId, video, email } = job.data;
  console.log('name: ', name);
  console.log('name: ', email);
  if (!video) done(new Error('Empty video'));
  let encoded = video.split(';base64,').pop();
  let buffer = new Buffer.from(encoded, 'base64');
  const Readable = require('stream').Readable;
  let bs = new Readable();
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
      async (err, file) => {
        try {
          let query = { email: email, 'stream.kueId': kueId };
          let update = {
            $set: { 'stream.$.video': file.data.id },
          };
          let newData = await Data.updateOne(query, update);
          done();
        } catch (err) {
          consele.log('error: ', err);
        }
      }
    );
  } catch (err) {
    return done(new Error('Something went wrong'));
  }
});

Queue.on('error', function (err) {
  console.log('Oops... ', err);
});

module.exports = Queue;
