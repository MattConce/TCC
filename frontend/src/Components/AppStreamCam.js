import React, { useCallback, useState, useRef, useEffect } from 'react';
import * as tf from '@tensorflow/tfjs';

import * as facemesh from '@tensorflow-models/face-landmarks-detection';
import { FullScreen, useFullScreenHandle } from 'react-full-screen';
import Webcam from 'react-webcam';
import Game from './Game';
import { drawMesh } from './utilities';

function AppStreamCam() {
  const webcamRef = useRef(null);
  const canvasRef = useRef(null);

  const [gameStarted, setGameStarted] = useState(false);
  const [gameFinished, setGameFinished] = useState(false);
  const [trackingStatus, setTrackingStatus] = useState(false);
  const [intervalId, setIntervalId] = useState('');
  const [netFacemesh, setNetFacemesh] = useState('');

  const screenFull = useFullScreenHandle();

  const getCol = (matrix, col) => {
    var column = [];
    for (var i = 0; i < matrix.length; i++) {
      column.push(matrix[i][col]);
    }
    return column;
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
    setGameStarted(true);
    setGameFinished(false);
    handleFullScreen();
  };

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
    screenFull.exit();
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
    if (!netFacemesh) loadFacemesh();
  }, [gameFinished]);

  return (
    <div className={gameStarted ? 'container-full' : 'container'}>
      <Webcam
        ref={webcamRef}
        style={{
          position: 'absolute',
          marginLeft: 'auto',
          marginRight: 'auto',
          left: 0,
          right: 0,
          textAlign: 'center',
          zindex: 5,
          width: 640,
          height: 480,
        }}
      />
      <FullScreen handle={screenFull} onChange={reportChange}>
        <canvas
          id="videoCaptureCanvas-id"
          key="videoCaptureCanvas"
          ref={canvasRef}
          style={
            gameStarted && !gameFinished
              ? {
                  background: '#FEF5E7',
                  position: 'absolute',
                  left: 0,
                  right: 0,
                  top: 0,
                  textAlign: 'center',
                  zindex: 100,
                  width: '100%',
                  height: '100vh',
                }
              : {
                  background: 'transparent',
                  position: 'absolute',
                  marginLeft: 'auto',
                  marginRight: 'auto',
                  left: 0,
                  right: 0,
                  textAlign: 'center',
                  zindex: 5,
                  width: 640,
                  height: 480,
                }
          }
        />
        {gameStarted && !gameFinished ? (
          <Game
            getCurrentFrame={getCurrentFrameFromVideo}
            onChange={reportGameChange}
          ></Game>
        ) : (
          <div className="container-button">
            {/* <button */}
            {/*   disabled={!netFacemesh} */}
            {/*   id="trackingButton" */}
            {/*   onClick={startTracking} */}
            {/*   className="button alt" */}
            {/* > */}
            {/*   {' '} */}
            {/*   Start Tracking */}
            {/* </button> */}
            <button
              disabled={!netFacemesh}
              className="button alt"
              onClick={handleButtonStart}
            >
              {' '}
              Start Game
            </button>
          </div>
        )}
      </FullScreen>
    </div>
  );
}

export default AppStreamCam;
