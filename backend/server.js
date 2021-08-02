import express from 'express';
import path from 'path';
import mongoose from 'mongoose';
import bodyParser from 'body-parser';
import dotenv from 'dotenv';
import upload from './routes/upload';

dotenv.config();

const mongodbUrl = process.env.MONGO_URL || 'mongodb://localhost/eye-tracker';
const port = process.env.PORT || 5000;

mongoose
  .connect(mongodbUrl, {
    useNewUrlParser: true,
    useCreateIndex: true,
    useUnifiedTopology: true,
    useFindAndModify: false,
  })
  .catch((err) => console.log(err.reason));

const app = express();
app.use((req, res, next) => {
  res.header('Access-Control-Allow-Origin', req.headers.origin);
  res.header(
    'Access-Control-Allow-Headers',
    'Access-Control-Allow-Origin',
    'Origin, X-Requested-With, Content-Type, Accept'
  );
  next();
});

app.use('/api/upload', upload);

app.use(bodyParser.json());
app.use('/uploads', express.static(path.join(__dirname, '/../uploads')));
app.use(express.static(path.join(__dirname, '/../frontend/build')));

app.get('*', (req, res) => {
  res.sendFile(path.join(`${__dirname}/../frontend/build/index.html`));
});

let server = app.listen(port, () => {
  console.log(`Server serves at http://localhost:${port}`);
});

server.timeout = 120000;
