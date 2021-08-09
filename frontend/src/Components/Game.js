import React, { useRef, useState, useEffect } from 'react';

function Game(props) {
  const canvasRef = useRef(null);
  const [gameFinished, setGameFinished] = useState(false);
  const [ready, setReady] = useState(false);
  const [score, setScore] = useState(0);
  const [maxScore, setMaxScore] = useState('0');
  const [buffer, setBuffer] = useState([]);

  // Annotations for trainning section
  const states = [
    {
      state: 'unpressed',
      remark: 'Clique na bola vermelha e mantenha pressionado',
    },
    { state: 'pressed', remark: 'Arraste a bola para dentro da caixa' },
    { state: 'ontarget', remark: 'Bom trabalho!' },
  ];

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
  let curState = 'unpressed';
  let trainningTargets = 0;

  const [dimensions, setDimensions] = useState({
    width: window.innerWidth,
    height: window.screen.height,
  });

  const startDrawing = () => {
    if (canvasRef.current) {
      const canvas = canvasRef.current;
      canvas.width = dimensions.width;
      canvas.height = dimensions.height;

      // Get context
      const ctx = canvas.getContext('2d');

      ctx.fillStyle = '#FEF5E7';
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      ctx.lineWidth = '1';
      // Canvas dimensions
      // const resolution = 200;
      // const rows = Math.floor(canvas.height / resolution);
      // const cols = Math.floor(canvas.width / resolution);
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

      // First trainning target
      let x = 4 * resolutionX + offsetX / 2;
      let y = 2 * resolutionY + offsetY / 4;
      positions.unshift([x + resolutionX / 3, y + resolutionY / 3]);

      // Second trainning target
      x = 5 * resolutionX + offsetX / 2;
      y = 3 * resolutionY + offsetY / 4;
      positions.unshift([x + resolutionX / 3, y + resolutionY / 3]);

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

      trainningMode = true;
      curState = states[0];
      if (canvasRef.current && trainningMode) {
        let canvas = canvasRef.current;
        let ctx = canvas.getContext('2d');
        ctx.font = '40px Arial';
        ctx.fillStyle = 'black';
        ctx.fillText(curState.remark, 100, 100);
      }
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
        if (canvasRef.current && trainningMode) {
          let canvas = canvasRef.current;
          let ctx = canvas.getContext('2d');
          ctx.font = '40px Arial';
          ctx.fillStyle = 'black';
          ctx.fillText(curState.remark, 100, 100);
        }
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
    curState = states[1];
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
      if (canvasRef.current && trainningMode) {
        let canvas = canvasRef.current;
        let ctx = canvas.getContext('2d');
        ctx.font = '40px Arial';
        ctx.fillStyle = 'black';
        ctx.fillText(curState.remark, 100, 100);
      }
    }
  };

  const handleMouseUp = (e) => {
    if (actionBlocked) return;
    let canvas = canvasRef.current;
    if (!canvas) return;
    curState = states[0];
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
          setScore(fscore);
          setGameFinished(true);
        } else {
          const coord = { x: ball.pos[0], y: ball.pos[1] };
          const timeInit = props.videoRef.currentTime;
          const color = ball.color;
          const radius = ball.rad;
          ctx.clearRect(0, 0, canvas.width, canvas.height);
          box.draw(ctx);
          let t = 0;
          let id = setInterval(() => {
            curState = states[2];
            ball.rad = radius / 3;
            if (t % 3 === 0) ball.color = 'yellow';
            if (t % 3 === 1) ball.color = 'lightYellow';
            else ball.color = color;
            t++;
            ball.draw(ctx);
            if (canvasRef.current && trainningMode) {
              let canvas = canvasRef.current;
              let ctx = canvas.getContext('2d');
              ctx.font = '40px Arial';
              ctx.fillStyle = 'green';
              ctx.fillText(curState.remark, 300, 300);
            }
          }, 50);
          setTimeout(() => {
            curState = states[0];
            // Save the data for the current target
            const timeEnd = props.videoRef.currentTime;
            const time = { timestampInit: timeInit, timestampEnd: timeEnd };
            const data = { coord: coord, time: time };
            if (!trainningMode) setBuffer((prev) => prev.concat(data));
            // Spawn new position
            let x = positions[cur][0];
            let y = positions[cur][1];
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
            if (canvasRef.current && trainningMode) {
              trainningTargets++;
              if (trainningTargets > 1) trainningMode = false;
              else {
                let canvas = canvasRef.current;
                let ctx = canvas.getContext('2d');
                ctx.font = '40px Arial';
                ctx.fillStyle = 'black';
                ctx.fillText(curState.remark, 100, 100);
              }
            }
            gameStart();
          }, 500);
        }
      }
      curState = states[0];
      if (canvasRef.current && trainningMode) {
        let canvas = canvasRef.current;
        let ctx = canvas.getContext('2d');
        ctx.font = '40px Arial';
        ctx.fillStyle = 'black';
        ctx.fillText(curState.remark, 100, 100);
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
      {!ready ? (
        <div className="modal-content shadow">
          <h1 className="Mono">Guarde a bola na caixa</h1>
          <ul className="instructions">
            <li>Arraste a bola até a caixa com o mouse.</li>
            <li>
              São 35 caixas, para cada caixa você tem 5 segundos antes que ela
              mude de lugar.
            </li>
          </ul>
          <img
            src="/tutorial.png"
            alt="ball and box"
            width="500"
            height="400"
          />
          <button className="button-alt-2" onClick={handleInitialDialog}>
            Começar
          </button>
        </div>
      ) : gameFinished ? (
        <div className="modal-content shadow">
          <h1 className="Mono">
            Pontuação: <span className="score">{score}</span> / {maxScore}
          </h1>
          <button className="button-alt-2" onClick={handleInitialDialog}>
            Voltar
          </button>
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
