// script.js — snake + simple GitHub stats (public events)
(() => {
  const usernameEl = document.getElementById('gh-username');
  const fetchBtn = document.getElementById('fetch');
  const openGh = document.getElementById('open-gh');
  const eventsCountEl = document.getElementById('events-count');
  const pushCountEl = document.getElementById('push-count');
  const prCountEl = document.getElementById('pr-count');
  const issueCountEl = document.getElementById('issue-count');
  const topReposEl = document.getElementById('top-repos');

  fetchBtn.onclick = () => loadStats(usernameEl.value.trim() || 'SyedMaaz786');

  openGh.onclick = (e) => {
    const u = usernameEl.value.trim() || 'SyedMaaz786';
    openGh.href = `https://github.com/${u}`;
  };

  async function loadStats(u) {
    eventsCountEl.textContent = '…';
    const endpoint = `https://api.github.com/users/${u}/events/public`;
    try {
      const resp = await fetch(endpoint);
      if (!resp.ok) throw new Error('Failed to fetch (rate limit?)');
      const events = await resp.json();
      const totals = { pushes:0, prs:0, issues:0 };
      const repoCounts = {};
      for (const ev of events) {
        const type = ev.type;
        const repo = ev.repo?.name || 'unknown';
        repoCounts[repo] = (repoCounts[repo]||0) + 1;
        if (type === 'PushEvent') totals.pushes++;
        if (type.includes('PullRequest')) totals.prs++;
        if (type.includes('Issue') || type.includes('IssueComment')) totals.issues++;
      }
      eventsCountEl.textContent = events.length;
      pushCountEl.textContent = totals.pushes;
      prCountEl.textContent = totals.prs;
      issueCountEl.textContent = totals.issues;

      // top repos
      topReposEl.innerHTML = '';
      const sorted = Object.entries(repoCounts).sort((a,b)=>b[1]-a[1]).slice(0,8);
      for (const [repo, cnt] of sorted) {
        const li = document.createElement('li');
        li.innerHTML = `<strong>${repo}</strong> <span style="float:right;color:#9aa6b2">${cnt}</span>`;
        topReposEl.appendChild(li);
      }
    } catch(err){
      eventsCountEl.textContent = 'err';
      pushCountEl.textContent = '--';
      prCountEl.textContent = '--';
      issueCountEl.textContent = '--';
      topReposEl.innerHTML = `<li style="color:#ff9b9b">Error: ${err.message}. Try again later (GitHub rate limit).</li>`;
      console.error(err);
    }
  }

  // init load
  loadStats(usernameEl.value);

  // ---------- SNAKE GAME ----------
  const canvas = document.getElementById('snakeCanvas');
  const ctx = canvas.getContext('2d');
  const GRID = 20;
  let tileCount = canvas.width / GRID;
  let snake = [{x:10,y:10}];
  let vx = 0, vy = 0, food = null, score=0, speed=7;
  let gameLoopId = null;
  let paused = false;

  function placeFood(){
    food = { x: Math.floor(Math.random()*tileCount), y: Math.floor(Math.random()*tileCount) };
    if (snake.find(s=>s.x===food.x && s.y===food.y)) placeFood();
  }

  function resetGame(){
    snake = [{x:Math.floor(tileCount/2), y:Math.floor(tileCount/2)}];
    vx = 0; vy = 0; score=0; speed=7; updateScore();
    placeFood(); draw();
  }

  function updateScore(){
    document.getElementById('score').textContent = score;
    const high = +localStorage.getItem('maaz_high') || 0;
    if (score > high) {
      localStorage.setItem('maaz_high', score);
      document.getElementById('highscore').textContent = score;
    } else document.getElementById('highscore').textContent = high;
  }

  function draw(){
    // clear
    ctx.fillStyle='#07121a';
    ctx.fillRect(0,0,canvas.width,canvas.height);

    // draw food
    if (food){
      ctx.fillStyle = '#ef4444';
      ctx.fillRect(food.x*GRID+2, food.y*GRID+2, GRID-4, GRID-4);
      ctx.fillStyle = '#ffb4b4';
      ctx.fillRect(food.x*GRID+6, food.y*GRID+6, GRID-12, GRID-12);
    }

    // draw snake
    for (let i=snake.length-1;i>=0;i--){
      const s = snake[i];
      ctx.fillStyle = i===0 ? '#36bcf7' : '#0ea5a1';
      ctx.fillRect(s.x*GRID+2, s.y*GRID+2, GRID-4, GRID-4);
    }
  }

  function step(){
    if (paused) return;
    // move head
    const head = { x: (snake[0].x + vx + tileCount) % tileCount, y: (snake[0].y + vy + tileCount) % tileCount };
    // collision with self
    if (snake.some((p,i)=>i>0 && p.x===head.x && p.y===head.y)){
      // game over
      paused = true;
      cancelAnimationFrame(gameLoopId);
      navigator.vibrate?.(200);
      return;
    }
    snake.unshift(head);

    // eat
    if (food && head.x===food.x && head.y===food.y){
      score += 10;
      speed = Math.min(20, speed + 0.5);
      placeFood();
    } else {
      snake.pop();
    }
    updateScore();
    draw();
  }

  // animation loop with fixed FPS control
  let lastTime = 0;
  function loop(ts){
    const interval = 1000 / speed;
    if (!lastTime) lastTime = ts;
    if (ts - lastTime >= interval){
      step();
      lastTime = ts;
    }
    gameLoopId = requestAnimationFrame(loop);
  }

  // keyboard
  window.addEventListener('keydown',(e)=>{
    const k=e.key;
    if (k==='ArrowUp'||k==='w' || k==='W'){ if (vy===1) return; vx=0; vy=-1; }
    if (k==='ArrowDown'||k==='s' || k==='S'){ if (vy===-1) return; vx=0; vy=1; }
    if (k==='ArrowLeft'||k==='a' || k==='A'){ if (vx===1) return; vx=-1; vy=0; }
    if (k==='ArrowRight'||k==='d' || k==='D'){ if (vx===-1) return; vx=1; vy=0; }
    if (k===' '){ paused = !paused; if (!paused) requestAnimationFrame(loop); }
  });

  // touch-friendly crude controls on canvas edges
  canvas.addEventListener('touchstart', (ev)=>{
    ev.preventDefault();
    const t = ev.touches[0];
    const rect = canvas.getBoundingClientRect();
    const x = t.clientX - rect.left;
    const y = t.clientY - rect.top;
    const cx = rect.width/2, cy = rect.height/2;
    const dx = x-cx, dy = y-cy;
    if (Math.abs(dx) > Math.abs(dy)){
      if (dx>0 && vx!==-1){ vx=1; vy=0; } else if (dx<0 && vx!==1){ vx=-1; vy=0; }
    } else {
      if (dy>0 && vy!==-1){ vx=0; vy=1; } else if (dy<0 && vy!==1){ vx=0; vy=-1; }
    }
  }, {passive:false});

  document.getElementById('start').onclick = () => { paused=false; if (!gameLoopId) requestAnimationFrame(loop); };
  document.getElementById('pause').onclick = () => { paused=!paused; };
  document.getElementById('reset').onclick = () => { resetGame(); paused=false; requestAnimationFrame(loop); };

  document.getElementById('tweet').onclick = () => {
    const scoreTxt = `I just scored ${score} on Syed Maaz' GitHub Contributions Snake! Play at ${location.href}`;
    window.open(`https://twitter.com/intent/tweet?text=${encodeURIComponent(scoreTxt)}`, '_blank');
  };

  document.getElementById('copyScore').onclick = async () => {
    await navigator.clipboard.writeText(`My score: ${score} — Syed Maaz Contributions Snake`);
    alert('Score copied to clipboard!');
  };

  // init
  resetGame();
  requestAnimationFrame(loop);

})();
