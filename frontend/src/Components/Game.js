import React, { useRef, useState, useEffect } from 'react';

function Game(props) {
  const canvasRef = useRef(null);
  const [gameFinished, setGameFinished] = useState(false);
  const [gameStarted, setGameStarted] = useState(false);
  const [trainningFinished, setTrainningFinished] = useState(false);
  const [ready, setReady] = useState(false);
  const [score, setScore] = useState(0);
  const [maxScore, setMaxScore] = useState('0');
  const [buffer, setBuffer] = useState([]);
  const [timeInitGame, setInitTime] = useState('');

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
  let actionBlocked = false;

  let trainningMode = false;

  const [dimensions, setDimensions] = useState({
    width: window.innerWidth,
    height: window.screen.height,
  });

  const startDrawing = () => {
    if (canvasRef.current) {
      const canvas = canvasRef.current;
      canvas.width = dimensions.width;
      canvas.height = dimensions.height;

      isDrawing = false;
      mouseX = 0;
      mouseY = 0;
      moveX = 0;
      moveY = 0;
      first = true;
      fscore = 0;
      actionBlocked = false;
      positions = [];

      // Get context
      const ctx = canvas.getContext('2d');
      ctx.fillStyle = '#FEF5E7';
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      ctx.lineWidth = '1';

      // Canvas dimensions
      const rows = 5;
      const cols = 7;
      const resolutionY = Math.floor(canvas.height / rows);
      const resolutionX = Math.floor((1.1 * canvas.width) / cols);
      const offsetX = canvas.width - cols * resolutionX;
      const offsetY = canvas.height - rows * resolutionY;
      const resolution = resolutionY;

      setMaxScore(rows * cols);

      for (let i = 0; i < rows; i++) {
        for (let j = 0; j < cols; j++) {
          let x = j * resolutionX + offsetX / 2;
          let y = i * resolutionY + offsetY / 4;
          positions.push([x + resolutionX / 3, y + resolutionY / 4]);
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
      // Drawn a ball from positions vector and make sure it's not the same as box position
      let init = [-1, -1];
      do {
        init = Math.floor(Math.random() * (positions.length - 1));
      } while (
        positions[init][0] === box.pos[0] &&
        positions[init][1] === box.pos[1]
      );
      // Start game as trainning
      trainningMode = !gameStarted;
      // Draw the select ball
      ball = new Ball(
        positions[init][0] + box.w / 2,
        positions[init][1] + box.h / 2,
        resolution / 10,
        trainningMode ? 3 : 35
      );
      box.draw(ctx);
      ball.draw(ctx);
      if (ready) gameStart();
    }
  };

  const gameStart = () => {
    intervalId = setInterval(() => {
      if (cur >= positions.length) {
        setScore(fscore);
        clearInterval(intervalId);
        setGameFinished(true);
      } else if (first) {
        first = false;
      } else if (trainningMode && cur >= 3 && canvasRef.current) {
        clearInterval(intervalId);
        setTrainningFinished(true);
        setReady(false);
      } else if (!onTarget && canvasRef.current) {
        let canvas = canvasRef.current;
        let ctx = canvas.getContext('2d');
        ball.pos = [box.cx, box.cy];
        let x = positions[cur][0];
        let y = positions[cur][1];
        ball.num = trainningMode ? 3 - cur : 35 - cur;
        cur++;
        box = new Box(x, y, box.w, box.h);
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        box.draw(ctx);
        ball.draw(ctx);
      }
    }, 5000);
  };

  const insideCanvas = (x, y) => {
    if (!canvasRef.current) return;
    return (
      x >= 0 &&
      x < canvasRef.current.width &&
      y >= 0 &&
      y < canvasRef.current.height
    );
  };

  const Area2 = (a, b, c) => {
    return (b[0] - a[0]) * (c[1] - a[1]) - (c[0] - a[0]) * (b[1] - a[1]);
  };

  const leftOn = (a, b, c) => {
    return Area2(a, b, c) >= 0;
  };

  class Ball {
    constructor(x, y, r, num = 0) {
      this.pos = [x, y];
      this.rad = r;
      this.color = 'rgb(205, 97, 85, 1)';
      this.alpha = 'rgb(205, 97, 85, 0.7)';
      this.num = num;
    }
    draw(ctx, alpha = false) {
      ctx.fillStyle = alpha ? this.alpha : this.color;
      ctx.beginPath();
      ctx.arc(this.pos[0], this.pos[1], this.rad, 0, 2 * Math.PI);
      ctx.fill();
      if (!onTarget) {
        ctx.fillStyle = 'black';
        ctx.font = `${this.rad}px Arial`;
        ctx.fillText(
          this.num,
          this.num > 9
            ? this.pos[0] - this.rad / 2
            : this.pos[0] - this.rad / 4,
          this.pos[1] + this.rad / 4
        );
      }
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

  const circleInsideRect = (circle, box) => {
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

  const handleStartGame = () => {
    props.handleStartCaptureClick();
    setInitTime(props.videoRef.currentTime);
    setTrainningFinished(false);
    setGameStarted(true);
    setReady(true);
  };

  const handleRestartTrainning = () => {
    setTrainningFinished(false);
    setGameStarted(false);
    setReady(true);
  };

  const handleInitialDialog = () => {
    if (gameFinished) {
      props.onChange(gameFinished);
      props.sendBuffer(buffer);
    } else {
      setReady(true);
    }
  };

  const handleMouseDown = (e) => {
    if (actionBlocked) return;
    e.preventDefault();
    if (!insideCanvas(e.offsetX, e.offsetY)) return;
    mouseX = e.offsetX;
    mouseY = e.offsetY;
    if (ball.isInside(mouseX, mouseY)) {
      isDrawing = true;
    }
  };

  const handleMouseMove = (e) => {
    if (actionBlocked) return;
    e.preventDefault();
    let canvas = canvasRef.current;
    if (!canvas) return;
    let ctx = canvas.getContext('2d');
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
  };

  const handleMouseUp = (e) => {
    if (actionBlocked) return;
    let canvas = canvasRef.current;
    if (!canvas) return;
    let ctx = canvas.getContext('2d');
    if (insideCanvas(e.offsetX, e.offsetY)) {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      isDrawing = false;
      if (circleInsideRect(ball, box, ctx)) box.draw(ctx, true);
      else box.draw(ctx);
      ball.draw(ctx, false);
      if (onTarget) {
        actionBlocked = true;

        if (!trainningMode) fscore++;

        clearInterval(intervalId);
        if (cur >= positions.length) {
          const coord = { x: ball.pos[0], y: ball.pos[1] };
          const timeInit = props.videoRef.currentTime - timeInitGame;
          // Set the score of the user
          setScore(fscore);
          const color = ball.color;
          const radius = ball.rad;
          let t = 0;
          ctx.clearRect(0, 0, canvas.width, canvas.height);
          box.draw(ctx);
          let id = setInterval(() => {
            ball.rad = radius / 3;
            if (t % 3 === 0) ball.color = 'yellow';
            if (t % 3 === 1) ball.color = 'lightYellow';
            else ball.color = color;
            t++;
            ball.draw(ctx);
          }, 50);
          setTimeout(() => {
            const timeEnd = props.videoRef.currentTime - timeInitGame;
            const time = { timestampInit: timeInit, timestampEnd: timeEnd };
            const data = { coord: coord, time: time };
            if (!trainningMode) setBuffer((prev) => prev.concat(data));
            clearInterval(id);
            setGameFinished(true);
          }, 1000);
        } else if (trainningMode && cur >= 3) {
          trainningMode = false;
          const color = ball.color;
          const radius = ball.rad;
          let t = 0;
          ctx.clearRect(0, 0, canvas.width, canvas.height);
          box.draw(ctx);
          let id = setInterval(() => {
            ball.rad = radius / 3;
            if (t % 3 === 0) ball.color = 'yellow';
            if (t % 3 === 1) ball.color = 'lightYellow';
            else ball.color = color;
            t++;
            ball.draw(ctx);
          }, 50);
          setTimeout(() => {
            clearInterval(id);
            setTrainningFinished(true);
            setReady(false);
          }, 1000);
        } else {
          const coord = { x: ball.pos[0], y: ball.pos[1] };
          const timeInit = props.videoRef.currentTime - timeInitGame;
          const color = ball.color;
          const radius = ball.rad;
          let t = 0;
          ctx.clearRect(0, 0, canvas.width, canvas.height);
          box.draw(ctx);
          let id = setInterval(() => {
            ball.rad = radius / 3;
            if (t % 3 === 0) ball.color = 'yellow';
            if (t % 3 === 1) ball.color = 'lightYellow';
            else ball.color = color;
            t++;
            ball.draw(ctx);
          }, 50);
          setTimeout(() => {
            // Save the data for the current target
            const timeEnd = props.videoRef.currentTime - timeInitGame;
            const time = { timestampInit: timeInit, timestampEnd: timeEnd };
            const data = { coord: coord, time: time };
            if (!trainningMode) setBuffer((prev) => prev.concat(data));
            // Spawn new position
            let x = positions[cur][0];
            let y = positions[cur][1];
            ball.num = trainningMode ? 3 - cur : 35 - cur;
            cur++;
            box = new Box(x, y, box.w, box.h);
            ball.rad = radius;
            onTarget = false;
            ball.color = color;
            ctx.clearRect(0, 0, canvas.width, canvas.height);
            box.draw(ctx);
            ball.draw(ctx);
            clearInterval(id);
            actionBlocked = false;
            gameStart();
          }, 1000);
        }
      }
    }
  };

  useEffect(() => {
    window.addEventListener('resize', handleResize);
    window.addEventListener('mousedown', handleMouseDown);
    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseup', handleMouseUp);

    if (ready) startDrawing();
    return () => {
      window.removeEventListener('resize', handleResize);
      window.removeEventListener('mousedown', handleMouseDown);
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    };
  }, [ready]);

  return (
    <div id="gameMain" className="container-full back">
      {!ready && !trainningFinished ? (
        <div className="modal-content shadow" style={{ top: '10%' }}>
          <h1 className="Mono">Guarde a bola na caixa</h1>
          <ol className="instructions">
            <li>Arraste a bola até a caixa com o mouse.</li>
            <li>
              A tarefa consiste em arrastar 35 bolas, para cada bola você tem 5
              segundos antes que ela mude de lugar.
            </li>
            <li>
              Não tem problema estorar o tempo de 5 segundos para algumas bolas,
              apenas faça a tarefa com atenção.
            </li>
            <li>
              A bola seguinte sempre aparece na posição da caixa anterior.
            </li>
          </ol>
          <img
            src="/tutorial.png"
            alt="ball and box"
            width="30%"
            height="40%"
          />
          <button
            className="button-alt-2"
            style={{
              margin: 'auto',
              fontSize: '50%',
              width: '10%',
              height: '8%',
            }}
            onClick={handleInitialDialog}
          >
            Começar treino
          </button>
          <span></span>
        </div>
      ) : trainningFinished ? (
        <div className="modal-content shadow" style={{ top: '10%' }}>
          <h1 className="Mono"> Você está pronto ?</h1>
          <img
            src="/tutorial.png"
            alt="ball and box"
            width="30%"
            height="40%"
          />
          <div
            style={{
              display: 'flex',
              flexDirection: 'row',
              width: '50%',
              justifyContent: 'space-between',
              marginBottom: '10rem',
            }}
          >
            <button
              className="button-alt-2"
              style={{
                margin: 'auto',
                fontSize: '50%',
                width: '180px',
                height: '70px',
              }}
              onClick={handleRestartTrainning}
            >
              Repetir treinamento
            </button>
            <button
              className="button-alt-2"
              style={{
                margin: 'auto',
                fontSize: '50%',
                width: '180px',
                height: '70px',
              }}
              onClick={handleStartGame}
            >
              Começar coleta
            </button>
            <span></span>
          </div>
        </div>
      ) : gameFinished ? (
        <div
          className="modal-content shadow"
          style={{ height: '60%', top: '10%' }}
        >
          <h1 className="Mono">
            Pontuação: <span className="score">{score}</span> / {maxScore}
          </h1>
          <button
            className="button-alt-2"
            style={{ width: '180px', height: '70px' }}
            onClick={handleInitialDialog}
          >
            Voltar e salvar
          </button>
          <span></span>
        </div>
      ) : (
        <canvas
          id="gameCanvas-id"
          key="gameCanvas"
          ref={canvasRef}
          style={{
            background: '#FEF5E7',
            position: 'absolute',
            textAlign: 'center',
            zIndex: 12,
            left: 0,
            right: 0,
          }}
        ></canvas>
      )}
    </div>
  );
}

export default Game;
