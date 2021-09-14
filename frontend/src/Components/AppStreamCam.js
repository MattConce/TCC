import React, { useCallback, useState, useRef, useEffect } from 'react';
import { FullScreen, useFullScreenHandle } from 'react-full-screen';
import LoadingOverlay from 'react-loading-overlay';
import Webcam from 'react-webcam';
import Game from './Game';
import Axios from 'axios';

function AppStreamCam() {
  const webcamRef = useRef(null);
  const canvasRef = useRef(null);
  const mediaRecorderRef = useRef(null);
  const [capturing, setCapturing] = useState(false);
  const [recordedChunks, setRecordedChunks] = useState([]);
  const [gameStarted, setGameStarted] = useState(false);
  const [gameFinished, setGameFinished] = useState(false);
  const [buffer, setBuffer] = useState([]);
  const [email, setEmail] = useState('');
  const [cameraOn, setCameraOn] = useState('');
  const [isActive, setActive] = useState(false);
  const [saved, setSaved] = useState('idle');

  const screenFull = useFullScreenHandle();

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

  const saveDataOnServer = () => {
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
  };

  const saveTrainingData = (trainData) => {
    Axios.post('/api/upload', trainData)
      .then((response) => {
        console.log('ok');
        setActive(false);
        setSaved('saved');
      })
      .catch((err) => {
        console.log(err);
        setActive(false);
        alert('Ocorreu um erro!');
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

    const response = await Axios.post('/api/upload/save/gdrive', bodyFormData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
    // const response = await Axios.post('/api/upload/save', bodyFormData);
    return response.data;
  };

  const handleButtonStart = () => {
    setRecordedChunks([]);
    setGameStarted(true);
    setGameFinished(false);
    handleFullScreen();
    setSaved('idle');
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
    setActive(true);
  };

  const handleSendBuffer = (data) => {
    setBuffer((prev) => prev.concat(data));
  };

  useEffect(() => {
    if (
      gameFinished &&
      !capturing &&
      recordedChunks.length > 0 &&
      saved == 'idle'
    ) {
      saveDataOnServer();
      setSaved('saving');
    }
  }, [gameFinished, isActive, recordedChunks, capturing, saved]);

  return (
    <div className={gameStarted ? 'container-full' : 'container'}>
      {isActive ? (
        <LoadingOverlay
          active={isActive}
          spinner
          text="Salvando video..."
        ></LoadingOverlay>
      ) : (
        <div></div>
      )}
      <Webcam
        ref={webcamRef}
        audio={false}
        videoConstraints={{
          width: { ideal: 4096 },
          height: { ideal: 2160 },
        }}
        style={{
          position: 'absolute',
          marginLeft: 'auto',
          marginRight: 'auto',
          left: 0,
          right: 0,
          top: '10%',
          textAlign: 'center',
          zIndex: 5,
          width: 640,
          height: 480,
        }}
        onUserMediaError={() => {
          alert('Webcam precisa estar ligada, dê permissão antes de continuar');
        }}
        onUserMedia={() => {
          setCameraOn(true);
        }}
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
          <div
            style={{
              position: 'relative',
              display: 'flex',
              flexDirection: 'column',
            }}
          >
            {cameraOn ? (
              <div></div>
            ) : (
              <div>
                <h3 style={{ color: 'Red' }}>
                  {' '}
                  Sua câmera não está ligada, dê permissão antes de continuar
                </h3>
              </div>
            )}

            <form
              style={{
                position: 'absolute',
                top: '500px',
                left: '0',
              }}
            >
              <label
                style={{
                  fontSize: '20px',
                  fontStyle: 'italic',
                }}
              >
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
            <div className="container-button">
              <button
                disabled={!email || !cameraOn}
                className="button alt"
                style={{
                  margin: 'auto',
                  fontSize: '20px',
                  width: '160px',
                  height: '50px',
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
                    width: '160px',
                    height: '50px',
                  }}
                  onClick={handleDownload}
                >
                  Download
                </button>
              )}
            </div>
          </div>
        )}
      </FullScreen>
    </div>
  );
}

export default AppStreamCam;
