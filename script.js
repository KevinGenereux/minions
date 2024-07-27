document.addEventListener('DOMContentLoaded', () => {
  const map = document.getElementById('map');
  const tank = document.getElementById('tank');
  const tankImage = document.getElementById('tank-image');
  const frame = document.getElementById('frame');
  const turret = document.getElementById('turret');
  const tankSpeed = 5;
  const fireInterval = 500; // Fire bullet every 500ms
  const fireRange = 200; // Range within which the tank can fire
  let tankX = 50; // Starting X position
  let tankY = map.offsetHeight - 80; // Starting Y position
  let targetX = tankX;
  let targetY = tankY;

  function moveTank() {
    const deltaX = targetX - tankX;
    const deltaY = targetY - tankY;
    const distance = Math.sqrt(deltaX * deltaX + deltaY * deltaY);

    if (distance > tankSpeed) {
      tankX += (deltaX / distance) * tankSpeed;
      tankY += (deltaY / distance) * tankSpeed;
    } else {
      tankX = targetX;
      tankY = targetY;
    }

    tank.style.left = `${tankX}px`;
    tank.style.top = `${tankY}px`;

    let newScrollTop = tankY - frame.clientHeight / 2 + tank.offsetHeight / 2;
    if (newScrollTop < 0) {
      newScrollTop = 0;
    } else if (newScrollTop > map.offsetHeight - frame.clientHeight) {
      newScrollTop = map.offsetHeight - frame.clientHeight;
    }
    frame.scrollTop = newScrollTop;

    requestAnimationFrame(moveTank);
  }

  function calculateOctagonVertices(sideLength, centerX, centerY) {
    const radius = sideLength / 2 * (1 + Math.sqrt(2));
    const vertices = [];
    for (let i = 0; i < 8; i++) {
        const angle = -Math.PI / 8 + Math.PI / 4 * i;
        const x = centerX + radius * Math.cos(angle);
        const y = centerY + radius * Math.sin(angle);
        vertices.push([x, y]);
    }
    return vertices;
  }

  function fireBullet() {
    const bullet = document.createElement('div');
    bullet.className = 'bullet';
    map.appendChild(bullet);

    const startX = tankX + tankImage.offsetWidth / 2;
    const startY = tankY + tankImage.offsetHeight / 2;
    const endX = turret.offsetLeft + turret.offsetWidth / 2;
    const endY = turret.offsetTop + turret.offsetHeight / 2;

    bullet.style.left = `${startX}px`;
    bullet.style.top = `${startY}px`;

    const deltaX = endX - startX;
    const deltaY = endY - startY;
    const distance = Math.sqrt(deltaX * deltaX + deltaY * deltaY);
    const bulletSpeed = 10;
    const duration = distance / bulletSpeed;

    let startTime = null;

    function animateBullet(timestamp) {
      if (!startTime) startTime = timestamp;
      const elapsed = timestamp - startTime;

      const progress = Math.min(elapsed / (duration * 100), 1);
      let x = startX + deltaX * progress;
      let y = startY + deltaY * progress;
      let point = [x, y];
      bullet.style.left = `${startX + deltaX * progress}px`;
      bullet.style.top = `${startY + deltaY * progress}px`;

      if (!isPointInPolygon(point, octaVertices)) {
        requestAnimationFrame(animateBullet);
      } else {
        bullet.remove();
      }
    }

    requestAnimationFrame(animateBullet);
  }

  function isWithinRange() {
    const tankCenterX = tankX + tankImage.offsetWidth / 2;
    const tankCenterY = tankY + tankImage.offsetHeight / 2;
    const turretCenterX = turret.offsetLeft + turret.offsetWidth / 2;
    const turretCenterY = turret.offsetTop + turret.offsetHeight / 2;

    const deltaX = turretCenterX - tankCenterX;
    const deltaY = turretCenterY - tankCenterY;
    const distance = Math.sqrt(deltaX * deltaX + deltaY * deltaY);

    return distance <= fireRange;
  }

  function isPointInPolygon(point, polygon) {
    let x = point[0], y = point[1];

    let inside = false;
    for (let i = 0, j = polygon.length - 1; i < polygon.length; j = i++) {
        let xi = polygon[i][0], yi = polygon[i][1];
        let xj = polygon[j][0], yj = polygon[j][1];

        let intersect = ((yi > y) != (yj > y))
            && (x < (xj - xi) * (y - yi) / (yj - yi) + xi);
        if (intersect) inside = !inside;
    }

    return inside;
}

  function displayVertices(vertices, size) {
    const map = document.getElementById('map');
    vertices.forEach(vertex => {
        const dot = document.createElement('div');
        dot.classList.add('dot');
        dot.style.width = `${size}px`;
        dot.style.height = `${size}px`;
        dot.style.backgroundColor = 'red';
        dot.style.position = 'absolute';
        dot.style.left = `${vertex[0]}px`;
        dot.style.top = `${vertex[1]}px`;
        dot.style.zIndex = 1000;
        map.appendChild(dot);
    });
  }

  setInterval(() => {
    if (isWithinRange()) {
      fireBullet();
    }
  }, fireInterval);

  map.addEventListener('click', (e) => {
    const mapRect = map.getBoundingClientRect();
    const tankRect = tankImage.getBoundingClientRect();
    targetX = e.clientX - mapRect.left - tankRect.width / 2;
    targetY = e.clientY - mapRect.top - tankRect.height / 2;
  });

  tank.style.left = `${tankX}px`;
  tank.style.top = `${tankY}px`;

  const octaVertices = calculateOctagonVertices(13, 135+19, 365);
  // displayVertices(octaVertices, 3)

  moveTank();
});
