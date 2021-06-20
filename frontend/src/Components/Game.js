import React, { useRef, useState, useEffect } from 'react';
import Axios from 'axios';

function Game(props) {
  const canvasRef = useRef(null);
  const [gameFinished, setGameFinished] = useState(false);
  const [ready, setReady] = useState(false);
  const [score, setScore] = useState(0);
  const [maxScore, setMaxScore] = useState(0);

  let buffer = [];
  let onTarget;
  let box;
  let ball;
  let cur;
  let intervalId;
  let positions = [];
  let isDrawing = false;
  let mouseX = 0;
  let mouseY = 0;
  let moveX = 0;
  let moveY = 0;
  let first = true;
  let fscore = 0;

  const [dimensions, setDimensions] = useState({
    width: window.innerWidth,
    height: window.screen.height,
  });

  const startDrawing = () => {
    if (canvasRef.current) {
      const canvas = canvasRef.current;
      canvas.width = dimensions.width;
      canvas.height = dimensions.height;

      const ctx = canvas.getContext('2d');

      ctx.fillStyle = '#FEF5E7';
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      ctx.lineWidth = '1';
      // Canvas dimensions
      const resolution = 200;
      const rows = Math.floor(canvas.height / resolution);
      const cols = Math.floor(canvas.width / resolution);
      const offsetX = canvas.width - cols * resolution;
      const offsetY = canvas.height - rows * resolution;

      setMaxScore(rows * cols - 1);
      console.log(`number: ${rows * cols}`);

      for (let i = 0; i < rows; i++) {
        for (let j = 0; j < cols; j++) {
          let x = j * resolution + offsetX / 2;
          let y = i * resolution + offsetY / 4;
          positions.push([x + resolution / 2, y + resolution / 2]);
        }
      }

      cur = 0;
      onTarget = false;
      positions.sort(() => 0.5 - Math.random());

      box = new Box(
        positions[cur][0],
        positions[cur][1],
        (2 * resolution) / 5,
        (2 * resolution) / 5
      );
      cur++;

      let init = Math.floor(Math.random() * (positions.length - 1));
      ball = new Ball(positions[init][0], positions[init][1], resolution / 10);

      box.draw(ctx);
      ball.draw(ctx);

      canvas.addEventListener('mousedown', (e) => {
        e.preventDefault();
        if (!insideCanvas(e.offsetX, e.offsetY)) return;
        mouseX = e.offsetX;
        mouseY = e.offsetY;
        if (ball.isInside(mouseX, mouseY)) {
          isDrawing = true;
        }
      });

      canvas.addEventListener('mousemove', (e) => {
        e.preventDefault();
        if (!onTarget && isDrawing && insideCanvas(e.offsetX, e.offsetY)) {
          ctx.clearRect(0, 0, canvas.width, canvas.height);
          moveX = parseFloat(e.offsetX);
          moveY = parseFloat(e.offsetY);

          ball.pos = [moveX, moveY];
          if (circleInsideRect(ball, box, ctx)) {
            box.draw(ctx, true);
            ball.pos = [box.cx, box.cy];
            onTarget = true;
          } else {
            box.draw(ctx);
          }
          ball.draw(ctx, true);
        }
      });

      canvas.addEventListener('mouseup', (e) => {
        if (insideCanvas(e.offsetX, e.offsetY)) {
          ctx.clearRect(0, 0, canvas.width, canvas.height);
          isDrawing = false;
          if (circleInsideRect(ball, box, ctx)) box.draw(ctx, true);
          else box.draw(ctx);
          ball.draw(ctx, false);
          if (onTarget) {
            clearInterval(intervalId);
            if (cur >= positions.length) {
              setScore(fscore);
              setGameFinished(true);
              for (let data of buffer) {
                const { num, frame, coord } = data;
                // upload all images and save the data
                uploadFileHandler(frame.leftEyeImg, `leftEyeImg-${num}`)
                  .then((response) => {
                    return response;
                  })
                  .then((response) => {
                    const pathLeftImg = response;
                    uploadFileHandler(
                      frame.rightEyeImg,
                      `rightEyeImg-${num}`
                    ).then((response) => {
                      const pathRightImg = response;
                      // Save data to the database
                      saveTrainingData({
                        coordinates: { x: coord.x, y: coord.y },
                        pathLeftImg,
                        pathRightImg,
                      });
                    });
                  });
              }
            } else {
              props.getCurrentFrame().then((response) => {
                const coord = { x: ball.pos[0], y: ball.pos[1] };
                const data = { num: cur, frame: response, coord: coord };
                buffer.push(data);
              });
              setTimeout(() => {
                let x = positions[cur][0];
                let y = positions[cur][1];
                cur++;
                box = new Box(x, y, box.w - 1, box.h - 1);
                ball.rad -= 0.15;
                fscore++;
                onTarget = false;
                ctx.clearRect(0, 0, canvas.width, canvas.height);
                box.draw(ctx);
                ball.draw(ctx);
                requestAnimationFrame(gameStart);
              }, 100);
            }
          }
        }
      });
    }
    if (ready) gameStart();
  };

  const gameStart = () => {
    intervalId = setInterval(() => {
      if (cur >= positions.length) {
        setScore(fscore);
        clearInterval(intervalId);
        setGameFinished(true);
        for (let data of buffer) {
          const { num, frame, coord } = data;
          // upload all images and save the data
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
                    coordinates: { x: coord.x, y: coord.y },
                    pathLeftImg,
                    pathRightImg,
                  });
                }
              );
            });
        }
      } else if (first) {
        first = false;
      } else if (!onTarget && canvasRef.current) {
        let canvas = canvasRef.current;
        let ctx = canvas.getContext('2d');
        ball.pos = [box.cx, box.cy];
        let x = positions[cur][0];
        let y = positions[cur][1];
        cur++;
        box = new Box(x, y, box.w, box.h);
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        box.draw(ctx);
        ball.draw(ctx);
      }
    }, 2300);
  };

  const insideCanvas = (x, y) => {
    let canvas = canvasRef.current;
    return x >= 0 && x < canvas.width && y >= 0 && y < canvas.height;
  };

  const Area2 = (a, b, c) => {
    return (b[0] - a[0]) * (c[1] - a[1]) - (c[0] - a[0]) * (b[1] - a[1]);
  };

  // const left = (a, b, c) => {
  //   return Area2(a, b, c) > 0;
  // };

  // const right = (a, b, c) => {
  //   return Area2(a, b, c) < 0;
  // };

  const leftOn = (a, b, c) => {
    return Area2(a, b, c) >= 0;
  };

  // const collinear = (a, b, c) => {
  //   return Area2(a, b, c) == 0;
  // };

  class Ball {
    constructor(x, y, r) {
      this.pos = [x, y];
      this.rad = r;
      this.color = 'rgb(205, 97, 85, 1)';
      this.alpha = 'rgb(205, 97, 85, 0.7)';
    }
    draw(ctx, alpha = false) {
      ctx.fillStyle = alpha ? this.alpha : this.color;
      ctx.beginPath();
      ctx.arc(this.pos[0], this.pos[1], this.rad, 0, 2 * Math.PI);
      ctx.fill();
    }
    isInside(x, y) {
      return (
        Math.pow(this.pos[0] - x, 2) + Math.pow(this.pos[1] - y, 2) <=
        this.rad * this.rad
      );
    }
  }

  class Box {
    constructor(x, y, w, h) {
      this.pos = [x, y];
      this.w = w;
      this.h = h;
      this.cx = x + this.w / 2;
      this.cy = y + this.h / 2;
      this.color = 'darkGrey';
    }
    draw(ctx, intersect = false) {
      if (intersect) {
        ctx.lineWidth = 5;
        ctx.strokeStyle = 'lightGreen';
      } else {
        ctx.lineWidth = 3;
        ctx.strokeStyle = 'black';
      }
      ctx.fillStyle = this.color;
      ctx.fillRect(this.pos[0], this.pos[1], this.w, this.h);
      ctx.strokeRect(this.pos[0], this.pos[1], this.w, this.h);
    }
  }

  const circleInsideRect = (circle, box, ctx) => {
    let leftPoint = [circle.pos[0] - circle.rad, circle.pos[1]];
    let rightPoint = [circle.pos[0] + circle.rad, circle.pos[1]];
    let topPoint = [circle.pos[0], circle.pos[1] - circle.rad];
    let bottomPoint = [circle.pos[0], circle.pos[1] + circle.rad];

    let points = [leftPoint, rightPoint, topPoint, bottomPoint];

    let leftSide = [
      [box.pos[0], box.pos[1]],
      [box.pos[0], box.pos[1] + box.h],
    ];
    let rightSide = [
      [box.pos[0] + box.w, box.pos[1] + box.h],
      [box.pos[0] + box.w, box.pos[1]],
    ];
    let topSide = [
      [box.pos[0] + box.w, box.pos[1]],
      [box.pos[0], box.pos[1]],
    ];
    let bottomSide = [
      [box.pos[0], box.pos[1] + box.h],
      [box.pos[0] + box.w, box.pos[1] + box.h],
    ];

    let good = true;
    for (let point of points) {
      good =
        good &&
        leftOn(leftSide[1], leftSide[0], point) &&
        leftOn(rightSide[1], rightSide[0], point) &&
        leftOn(topSide[1], topSide[0], point) &&
        leftOn(bottomSide[1], bottomSide[0], point);
    }
    return good;
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
  };

  const handleInitialDialog = () => {
    if (gameFinished) {
      props.onChange(gameFinished);
    } else {
      setReady(true);
    }
  };

  useEffect(() => {
    window.addEventListener('resize', handleResize);
    if (ready) startDrawing();
    return () => {
      window.removeEventListener('resize', handleResize);
    };
  }, [ready]);

  return (
    <div id="gameMain" className="container-full">
      {!ready ? (
        <div className="modal-content">
          <h1>Guarde a bola na caixa</h1>
          <img
            src="/tutorial.png"
            alt="ball and box"
            width="500"
            height="400"
          />
          <button className="button-alt" onClick={handleInitialDialog}>
            Começar
          </button>
        </div>
      ) : gameFinished ? (
        <div className="modal-content">
          <h1>
            Pontuação: <span className="score">{score}</span> / {maxScore}
          </h1>
          <button className="button-alt" onClick={handleInitialDialog}>
            Voltar
          </button>
        </div>
      ) : (
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
      )}
    </div>
  );
}

export default Game;
