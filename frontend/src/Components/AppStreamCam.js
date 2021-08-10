import React, { useCallback, useState, useRef, useEffect } from 'react';
import Axios from 'axios';
import * as tf from '@tensorflow/tfjs';

import * as facemesh from '@tensorflow-models/face-landmarks-detection';
import { FullScreen, useFullScreenHandle } from 'react-full-screen';
import Webcam from 'react-webcam';
import Game from './Game';
import { drawMesh } from './utilities';

function AppStreamCam() {
  const webcamRef = useRef(null);
  const canvasRef = useRef(null);

  const mediaRecorderRef = useRef(null);
  const [capturing, setCapturing] = useState(false);
  const [recordedChunks, setRecordedChunks] = useState([]);
  const [gameStarted, setGameStarted] = useState(false);
  const [gameFinished, setGameFinished] = useState(false);
  const [trackingStatus, setTrackingStatus] = useState(false);
  const [intervalId, setIntervalId] = useState('');
  const [netFacemesh, setNetFacemesh] = useState('');
  const [buffer, setBuffer] = useState([]);
  const [email, setEmail] = useState('');

  const screenFull = useFullScreenHandle();

  const getCol = (matrix, col) => {
    var column = [];
    for (let i = 0; i < matrix.length; i++) {
      column.push(matrix[i][col]);
    }
    return column;
  };

  const handleEmail = (e) => {
    setEmail(e.target.value);
  };

  const handleFullScreen = () => {
    try {
      screenFull.enter();
    } catch (err) {
      console.log(err);
    }
  };

  const runFacemesh = async () => {
    // Load facemesh model
    const net = netFacemesh;
    const id = setInterval(() => {
      detect(net);
    }, 10);
    setIntervalId(id);
  };

  const handleStartCaptureClick = useCallback(() => {
    setCapturing(true);
    mediaRecorderRef.current = new MediaRecorder(webcamRef.current.stream, {
      mimeType: 'video/webm',
    });
    mediaRecorderRef.current.addEventListener(
      'dataavailable',
      handleDataAvailable
    );
    mediaRecorderRef.current.start();
  }, [webcamRef, setCapturing, mediaRecorderRef]);

  const handleDataAvailable = useCallback(
    ({ data }) => {
      if (data.size > 0) {
        setRecordedChunks((prev) => prev.concat(data));
      }
    },
    [setRecordedChunks]
  );

  const handleStopCaptureClick = useCallback(() => {
    mediaRecorderRef.current.stop();
    setCapturing(false);
  }, [mediaRecorderRef, webcamRef, setCapturing]);

  const saveDataOnServer = useCallback(() => {
    if (recordedChunks.length) {
      const blob = new Blob(recordedChunks, {
        type: 'video/webm',
      });
      let canvas = canvasRef.current;
      let gpu = 'null';
      if (canvas) {
        let webgl = canvas.getContext('webgl2');
        let debugInfo = webgl.getExtension('webgl_debug_renderer_info');
        gpu = webgl.getParameter(debugInfo.UNMASKED_RENDERER_WEBGL);
        console.log('gpu: ', gpu);
      }
      let osType = 'null';
      if (navigator.appVersion.indexOf('Win') !== -1) osType = 'Windows OS';
      if (navigator.appVersion.indexOf('Mac') !== -1) osType = 'MacOS';
      if (navigator.appVersion.indexOf('X11') !== -1) osType = 'UNIX OS';
      if (navigator.appVersion.indexOf('Linux') !== -1) osType = 'Linux OS';
      console.log('OS:', osType);
      uploadFileHandler(blob, `video-${Date.now()}`).then((response) => {
        saveTrainingData({
          email: email,
          video: response,
          os: osType,
          resolution: `${window.screen.width}x${window.screen.height}`,
          gpu: gpu,
          info: buffer,
        });
      });
    } else {
      console.log('error');
    }
  }, [recordedChunks]);

  const saveTrainingData = (trainData) => {
    Axios.post('/api/upload', trainData)
      .then((response) => {
        console.log('ok');
      })
      .catch((err) => {
        console.log(err);
      });
  };

  const blobToBase64 = async (blob) => {
    return new Promise((resolve, _) => {
      const reader = new FileReader();
      reader.onloadend = () => resolve(reader.result);
      reader.readAsDataURL(blob);
    });
  };

  const uploadFileHandler = async (file, name) => {
    const bodyFormData = new FormData();
    const video = await blobToBase64(file);
    bodyFormData.append('video', video);
    bodyFormData.append('name', name);

    const response = await Axios.post('/api/upload/save/gdrive', bodyFormData);
    // const response = await Axios.post('/api/upload/save', bodyFormData);
    return response.data;
  };

  const getCurrentFrameFromVideo = async () => {
    // Get canvas
    const canvas = canvasRef.current;
    // Get canvas context
    const ctx = canvas.getContext('2d');
    // Get video
    const video = webcamRef.current.video;
    // Load the facemesh model
    const net = netFacemesh;
    // Run the model
    const face = await detect(net, false);

    let leftEye = [];
    leftEye.push(face[0].annotations.leftEyeLower0);
    leftEye.push(face[0].annotations.leftEyeLower1);
    leftEye.push(face[0].annotations.leftEyeLower2);
    leftEye.push(face[0].annotations.leftEyeLower3);
    leftEye.push(face[0].annotations.leftEyeUpper0);
    leftEye.push(face[0].annotations.leftEyeUpper1);
    leftEye.push(face[0].annotations.leftEyeUpper2);

    let leftMinX = canvas.width;
    let leftMaxX = -1;
    let leftMinY = canvas.height;
    let leftMaxY = -1;

    for (let region of leftEye) {
      let xValuesLeft = getCol(region, 0);
      let yValuesLeft = getCol(region, 1);

      leftMinX = Math.min(Math.min.apply(null, xValuesLeft), leftMinX);
      leftMaxX = Math.max(Math.max.apply(null, xValuesLeft), leftMaxX);

      leftMinY = Math.min(Math.min.apply(null, yValuesLeft), leftMinY);
      leftMaxY = Math.max(Math.max.apply(null, yValuesLeft), leftMaxY);
    }

    let width = leftMaxX - leftMinX;
    let height = leftMaxY - leftMinY;

    let imgData = ctx.getImageData(0, 0, canvas.width, canvas.height);

    ctx.drawImage(
      video,
      leftMinX,
      leftMinY,
      width,
      height,
      0,
      0,
      canvas.width,
      canvas.height
    );

    const leftEyeImg = canvas.toDataURL('image/png');

    ctx.putImageData(imgData, 0, 0);

    let rightEye = [];
    rightEye.push(face[0].annotations.rightEyeLower0);
    rightEye.push(face[0].annotations.rightEyeLower1);
    rightEye.push(face[0].annotations.rightEyeLower2);
    rightEye.push(face[0].annotations.rightEyeLower3);
    rightEye.push(face[0].annotations.rightEyeUpper0);
    rightEye.push(face[0].annotations.rightEyeUpper1);
    rightEye.push(face[0].annotations.rightEyeUpper2);

    let rightMinX = canvas.width;
    let rightMaxX = -1;
    let rightMinY = canvas.height;
    let rightMaxY = -1;

    for (let region of rightEye) {
      let xValuesRight = getCol(region, 0);
      let yValuesRight = getCol(region, 1);

      rightMinX = Math.min(Math.min.apply(null, xValuesRight), rightMinX);
      rightMaxX = Math.max(Math.max.apply(null, xValuesRight), rightMaxX);

      rightMinY = Math.min(Math.min.apply(null, yValuesRight), rightMinY);
      rightMaxY = Math.max(Math.max.apply(null, yValuesRight), rightMaxY);
    }

    width = rightMaxX - rightMinX;
    height = rightMaxY - rightMinY;

    ctx.clearRect(0, 0, canvas.width, canvas.height);

    imgData = ctx.getImageData(0, 0, canvas.width, canvas.height);

    ctx.drawImage(
      video,
      rightMinX,
      rightMinY,
      width,
      height,
      0,
      0,
      canvas.width,
      canvas.height
    );

    const rightEyeImg = canvas.toDataURL('image/png');

    ctx.putImageData(imgData, 0, 0);

    return { leftEyeImg: leftEyeImg, rightEyeImg: rightEyeImg };
  };

  const handleButtonStart = () => {
    setRecordedChunks([]);
    setGameStarted(true);
    setGameFinished(false);
    handleFullScreen();
  };

  const handleDownload = React.useCallback(() => {
    if (recordedChunks.length) {
      const blob = new Blob(recordedChunks, {
        type: 'video/webm',
      });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      document.body.appendChild(a);
      a.style = 'display: none';
      a.href = url;
      a.download = 'react-webcam-stream-capture.webm';
      a.click();
      window.URL.revokeObjectURL(url);
    }
  }, [recordedChunks]);

  const loadFacemesh = async () => {
    const net = await facemesh.load(
      facemesh.SupportedPackages.mediapipeFacemesh
    );
    setNetFacemesh(net);
  };

  const detect = async (net, draw = true) => {
    if (
      typeof webcamRef.current !== 'undefined' &&
      webcamRef.current !== null &&
      webcamRef.current.video.readyState === 4
    ) {
      // Get Video Properties
      const video = webcamRef.current.video;
      const videoWidth = webcamRef.current.video.videoWidth;
      const videoHeight = webcamRef.current.video.videoHeight;

      // Set video width
      webcamRef.current.video.width = videoWidth;
      webcamRef.current.video.height = videoHeight;

      // Set canvas width
      canvasRef.current.width = videoWidth;
      canvasRef.current.height = videoHeight;

      // Make Detections
      const face = await net.estimateFaces({ input: video });
      // console.log(face);

      // Get canvas context
      if (canvasRef.current && draw) {
        const ctx = canvasRef.current.getContext('2d');
        requestAnimationFrame(() => {
          drawMesh(face, ctx);
        });
      }
      return face;
    }
  };

  const reportChange = useCallback(
    (state, handle) => {
      if (handle === screenFull && state === false) {
        setGameStarted(false);
      }
    },
    [screenFull]
  );

  const reportGameChange = () => {
    setGameFinished(true);
    handleStopCaptureClick();
    screenFull.exit();
  };

  const handleSendBuffer = (data) => {
    setBuffer((prev) => prev.concat(data));
  };

  const startTracking = () => {
    if (!trackingStatus) {
      setTrackingStatus(true);
      runFacemesh();
      document.getElementById('trackingButton').innerHTML = 'Stop tracking';
    } else {
      setTrackingStatus(false);
      clearInterval(intervalId);
      setIntervalId('');
      document.getElementById('trackingButton').innerHTML = 'Start tracking';
      window.location.reload();
    }
  };

  useEffect(() => {
    // Load model at the begin
    // if (!netFacemesh) loadFacemesh();
    if (gameFinished && !capturing && recordedChunks.length > 0)
      saveDataOnServer();
  }, [gameFinished, capturing, recordedChunks]);

  return (
    <div className={gameStarted ? 'container-full' : 'container'}>
      <Webcam
        ref={webcamRef}
        audio={false}
        style={{
          position: 'absolute',
          marginLeft: 'auto',
          marginRight: 'auto',
          left: 0,
          right: 0,
          textAlign: 'center',
          zIndex: 5,
          width: 640,
          height: 480,
        }}
      />
      <canvas
        id="videoCaptureCanvas-id"
        key="videoCaptureCanvas"
        ref={canvasRef}
        style={
          gameStarted && !gameFinished
            ? {
                background: 'transparent',
                position: 'absolute',
                left: 0,
                right: 0,
                textAlign: 'center',
                zIndex: 1,
                width: 640,
                height: 480,
              }
            : {
                background: 'transparent',
                position: 'absolute',
                marginLeft: 'auto',
                marginRight: 'auto',
                left: 0,
                right: 0,
                textAlign: 'center',
                zIndex: 5,
                width: 640,
                height: 480,
              }
        }
      />
      <FullScreen handle={screenFull} onChange={reportChange}>
        {gameStarted && !gameFinished ? (
          <Game
            sendBuffer={handleSendBuffer}
            getRecordedChunks={saveDataOnServer}
            videoRef={webcamRef.current.video}
            onChange={reportGameChange}
            handleStartCaptureClick={handleStartCaptureClick}
          ></Game>
        ) : (
          <div className="container-button">
            <form>
              <label style={{ fontSize: '20px', fontStyle: 'bold' }}>
                {' '}
                Insira o email utilizado no formulário:{'   '}
                <input
                  className="shadow"
                  style={{ height: '30px', fontSize: '15px' }}
                  size="50"
                  type="email"
                  value={email}
                  onChange={handleEmail}
                  placeholder="Email"
                />
              </label>
            </form>
            <button
              disabled={!email}
              className="button alt"
              style={{
                margin: 'auto',
                fontSize: '20px',
                width: '180px',
                height: '70px',
              }}
              onClick={handleButtonStart}
            >
              {' '}
              Ir para coleta
            </button>
            {recordedChunks.length > 0 && (
              <button
                className="button alt"
                style={{
                  margin: 'auto',
                  fontSize: '20px',
                  width: '180px',
                  height: '70px',
                }}
                onClick={handleDownload}
              >
                Download
              </button>
            )}
          </div>
        )}
      </FullScreen>
    </div>
  );
}

export default AppStreamCam;
