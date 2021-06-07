import React, { useRef, useState, useEffect } from 'react';
import Axios from 'axios';

function Game(props) {
  const canvasRef = useRef(null);
  const [gameFinished, setGameFinished] = useState(false);

  const [dimensions, setDimensions] = useState({
    height: window.innerHeight,
    width: window.innerWidth,
  });

  const sleep = (time) => {
    return new Promise((resolve) => setTimeout(resolve, time));
  };

  const startDrawing = async () => {
    if (canvasRef.current) {
      const canvas = canvasRef.current;
      canvas.width = dimensions.width;
      canvas.height = dimensions.height;
      const ctx = canvas.getContext('2d');
      ctx.fillStyle = 'black';
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      ctx.lineWidth = '1';
      const resolution = 200;
      const rows = Math.floor(canvas.height / resolution);
      const cols = Math.floor(canvas.width / resolution);
      const offsetX = canvas.width - cols * resolution;
      const offsetY = canvas.height - rows * resolution;
      console.log(`number: ${rows * cols}`);
      for (let i = 0; i < rows; i++) {
        for (let j = 0; j < cols; j++) {
          ctx.fillStyle = 'black';
          ctx.fillRect(0, 0, canvas.width, canvas.height);
          let x = j * resolution + offsetX / 2;
          let y = i * resolution + offsetY / 2;
          ctx.beginPath();
          ctx.strokeStyle = 'white';
          ctx.arc(
            x + resolution / 2,
            y + resolution / 2,
            resolution / 4,
            0,
            2 * Math.PI
          );
          ctx.fillStyle = 'white';
          ctx.fill();
          ctx.stroke();

          // Sleep animation
          await sleep(200);
          // Call facemesh API to detect the eye's landmarks
          props.getCurrentFrame().then((response) => {
            const num = j + i * cols;
            const frame = response;
            uploadFileHandler(frame.leftEyeImg, `leftEyeImg-${num}`)
              .then((response) => {
                return response;
              })
              .then((response) => {
                const pathLeftImg = response;
                uploadFileHandler(frame.rightEyeImg, `rightEyeImg-${num}`).then(
                  (response) => {
                    const pathRightImg = response;
                    // Save data to the database
                    saveTrainingData({
                      coordinates: { x: x, y: y },
                      pathLeftImg,
                      pathRightImg,
                    });
                  }
                );
              });
          });
        }
      }
      setGameFinished(true);
      props.onChange(gameFinished);
    }
  };

  const saveTrainingData = (trainData) => {
    Axios.post('/api/upload', trainData)
      .then((response) => {
        console.log('ok');
      })
      .catch((err) => {
        console.log(err);
      });
  };

  const uploadFileHandler = async (file, name) => {
    const bodyFormData = new FormData();
    bodyFormData.append('image', file);
    bodyFormData.append('name', name);
    const response = await Axios.post('/api/upload/save', bodyFormData);
    return response.data;
  };

  const handleResize = () => {
    setDimensions({
      height: window.innerHeight,
      width: window.innerWidth,
    });
    setTimeout(() => {
      if (canvasRef.current) {
        canvasRef.current.style.width = window.innerWidth + 'px';
        canvasRef.current.style.height = window.innerHeight + 'px';
      }
    }, 0);
    if (!gameFinished) {
      startDrawing();
    }
  };

  useEffect(() => {
    window.addEventListener('resize', handleResize);
    return () => {
      window.removeEventListener('resize', handleResize);
    };
  }, []);

  return (
    <div className="container-full">
      <canvas
        id="gameCanvas-id"
        key="gameCanvas"
        ref={canvasRef}
        width="854"
        height="480"
        style={{
          position: 'absolute',
          zIndex: 12,
        }}
      ></canvas>
    </div>
  );
}

export default Game;
