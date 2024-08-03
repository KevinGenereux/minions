document.addEventListener('DOMContentLoaded', () => {
  const map = document.getElementById('map');
  const tank = document.getElementById('tank');
  const tankImage = document.getElementById('tank-image');
  const frameImage = document.getElementById('frame-image');
  const frame = document.getElementById('frame');
  const turret = document.getElementById('turret');
  const gun = document.getElementById('gun-image');
  const tankHPBar = document.getElementById('tank-hp').querySelector('.hp-bar-inner');
  const turretHPBar = document.getElementById('turret-hp').querySelector('.hp-bar-inner');
  const username = document.getElementById('username');
  const tankSpeed = 0.5;
  const tankRotationSpeed = 0.005;
  const frameRotationSpeed = 0.005;
  const tankFireInterval = 2000;
  const tankFireRange = 100;
  const turretFireInterval = 2000;
  const turretFireRange = 120;
  const turretHP = 400;
  const tankHP = 100;
  let tankCurrentHP = tankHP;
  let turretCurrentHP = turretHP;
  let tankX = 200;
  let tankY = map.offsetHeight - 30;
  let targetX = tankX;
  let targetY = tankY;
  let tankRotation = 0;
  let isRotating = false;
  let isMoving = false;
  let originalGunRotation = 0;
  let tankLevel = 1;
  let tankExp = 0;
  let tankArmor = 10;
  let tankHealthRegeneration = 1;
  let lastHitTime = 0;

  // Create walls
  const walls = [];
  for (let i = 1; i <= 4; i++) {
    const wall = document.getElementById(`wall${i}`);
    wall.style.left = `${Math.random() * (map.offsetWidth - 100)}px`;
    wall.style.top = `${Math.random() * (map.offsetHeight - 100)}px`;
    wall.style.transform = `rotate(${i * 90}deg)`;
    walls.push(wall);
  }

  function moveTank() {
    if (!isRotating && isMoving) {
      const deltaX = targetX - tankX;
      const deltaY = targetY - tankY;
      const distance = Math.sqrt(deltaX * deltaX + deltaY * deltaY);

      if (distance > tankSpeed) {
        const newX = tankX + (deltaX / distance) * tankSpeed;
        const newY = tankY + (deltaY / distance) * tankSpeed;

        if (!checkCollision(newX, newY)) {
          tankX = newX;
          tankY = newY;
        } else {
          isMoving = false;
        }
      } else {
        if (!checkCollision(targetX, targetY)) {
          tankX = targetX;
          tankY = targetY;
        }
        isMoving = false;
      }

      tank.style.left = `${tankX}px`;
      tank.style.top = `${tankY}px`;
    }

    updateCameraPosition();
    requestAnimationFrame(moveTank);
  }

  function checkCollision(x, y) {
    const tankRect = {
      left: x,
      top: y,
      right: x + tankImage.offsetWidth,
      bottom: y + tankImage.offsetHeight
    };

    // Check collision with turret
    const turretRect = turret.getBoundingClientRect();
    if (
      tankRect.left < turretRect.right &&
      tankRect.right > turretRect.left &&
      tankRect.top < turretRect.bottom &&
      tankRect.bottom > turretRect.top
    ) {
      return true;
    }

    // Check collision with walls
    for (const wall of walls) {
      const wallRect = wall.getBoundingClientRect();
      if (
        tankRect.left < wallRect.right &&
        tankRect.right > wallRect.left &&
        tankRect.top < wallRect.bottom &&
        tankRect.bottom > wallRect.top
      ) {
        return true;
      }
    }

    return false;
  }

  function updateCameraPosition() {
    let newScrollTop = tankY - frame.clientHeight / 2 + tank.offsetHeight / 2;
    if (newScrollTop < 0) {
      newScrollTop = 0;
    } else if (newScrollTop > map.offsetHeight - frame.clientHeight) {
      newScrollTop = map.offsetHeight - frame.clientHeight;
    }
    frame.scrollTop = newScrollTop;
  }

  function fireBullet(startX, startY, targetX, targetY, bulletType) {
    const bullet = document.createElement('div');
    bullet.className = `bullet ${bulletType}`;
    map.appendChild(bullet);

    bullet.style.left = `${startX}px`;
    bullet.style.top = `${startY}px`;

    const bulletSpeed = 10;

    let startTime = null;

    function animateBullet(timestamp) {
      if (!startTime) startTime = timestamp;
      const elapsed = timestamp - startTime;

      let currentTargetX = targetX;
      let currentTargetY = targetY;

      if (bulletType === 'tower-bullet') {
        currentTargetX = tankX + tankImage.offsetWidth / 2;
        currentTargetY = tankY + tankImage.offsetHeight / 2;
      }

      const deltaX = currentTargetX - startX;
      const deltaY = currentTargetY - startY;
      const distance = Math.sqrt(deltaX * deltaX + deltaY * deltaY);
      const duration = distance / bulletSpeed;
      const progress = Math.min(elapsed / (duration * 100), 1);

      let x = startX + (deltaX * progress);
      let y = startY + (deltaY * progress);

      bullet.style.left = `${x}px`;
      bullet.style.top = `${y}px`;

      if ((bulletType === 'tower-bullet' && !checkTankCollisionWithBullet(x, y)) ||
          (bulletType === 'tank-bullet' && !checkTowerCollisionWithBullet([x, y], octaVertices))) {
        requestAnimationFrame(animateBullet);
      } else {
        bullet.remove();
        if (bulletType === 'tower-bullet' && checkTankCollisionWithBullet(x, y)) {
          takeDamage('tank', 30);
          lastHitTime = Date.now();
        }
        if (bulletType === 'tank-bullet' && checkTowerCollisionWithBullet([x, y], octaVertices)) {
          takeDamage('turret', 10 + (tankLevel - 1) * 2);
          lastHitTime = Date.now();
        }
      }
    }

    requestAnimationFrame(animateBullet);
  }

  function rotateElement(element, targetAngle, speed, callback) {
    const startAngle = parseFloat(element.style.transform.replace(/rotate\(([^)]+)rad\)/, '$1')) || 0;
    const deltaAngle = targetAngle - startAngle;
    const duration = Math.abs(deltaAngle) / speed;
    let startTime = null;

    function animateRotation(timestamp) {
      if (!startTime) startTime = timestamp;
      const elapsed = timestamp - startTime;
      const progress = Math.min(elapsed / duration, 1);
      const angle = startAngle + deltaAngle * progress;
      element.style.transform = `rotate(${angle}rad)`;

      if (progress < 1) {
        requestAnimationFrame(animateRotation);
      } else if (callback) {
        callback();
      }
    }

    requestAnimationFrame(animateRotation);
  }

  function rotateTankAndFrame(targetAngle) {
    isRotating = true;
    rotateElement(tankImage, targetAngle, tankRotationSpeed, () => {
      setTimeout(() => {
        rotateElement(frameImage, targetAngle, frameRotationSpeed, () => {
          isRotating = false;
          isMoving = true;
        });
      }, 50);
    });
  }

  function takeDamage(target, damage) {
    if (target === 'tank') {
      const actualDamage = Math.max(damage - tankArmor, 1);
      tankCurrentHP -= actualDamage;
      const hpPercentage = Math.max(tankCurrentHP / tankHP, 0) * 100;
      tankHPBar.style.width = `${hpPercentage}%`;
      if (tankCurrentHP <= 0) {
        respawnTank();
      }
    } else if (target === 'turret') {
      turretCurrentHP -= damage;
      const hpPercentage = Math.max(turretCurrentHP / turretHP, 0) * 100;
      turretHPBar.style.width = `${hpPercentage}%`;
    }
  }

  function respawnTank() {
    tankCurrentHP = tankHP;
    tankHPBar.style.width = '100%';
    tankX = 200;
    tankY = map.offsetHeight - 30;
    targetX = tankX;
    targetY = tankY;
    tankImage.style.transform = `rotate(${tankRotation}rad)`;
    frameImage.style.transform = `rotate(${tankRotation}rad)`;
    updateCameraPosition();
  }

  function rotateGun() {
    if (isWithinRange(turretFireRange)) {
      const tankCenterX = tankX + tankImage.offsetWidth / 2;
      const tankCenterY = tankY + tankImage.offsetHeight / 2;
      const gunCenterX = turret.offsetLeft + 19;
      const gunCenterY = turret.offsetTop + 19;

      const deltaX = tankCenterX - gunCenterX;
      const deltaY = tankCenterY - gunCenterY;
      const angle = Math.atan2(deltaY, deltaX);

      gun.style.transform = `rotate(${angle - Math.PI / 2}rad)`;
    } else {
      gun.style.transform = `rotate(${originalGunRotation}rad)`;
    }

    requestAnimationFrame(rotateGun);
  }

  function isWithinRange(fireRange) {
    const tankCenterX = tankX + tankImage.offsetWidth / 2;
    const tankCenterY = tankY + tankImage.offsetHeight / 2;
    const turretCenterX = turret.offsetLeft + turret.offsetWidth / 2;
    const turretCenterY = turret.offsetTop + turret.offsetHeight / 2;

    const deltaX = turretCenterX - tankCenterX;
    const deltaY = turretCenterY - tankCenterY;
    const distance = Math.sqrt(deltaX * deltaX + deltaY * deltaY);

    return distance <= fireRange;
  }

  function checkTankCollisionWithBullet(bulletX, bulletY) {
    const tankRect = tankImage.getBoundingClientRect();
    const mapRect = map.getBoundingClientRect();
    const tankLeft = tankRect.left - mapRect.left;
    const tankTop = tankRect.top - mapRect.top;
    const tankRight = tankLeft + tankImage.offsetWidth;
    const tankBottom = tankTop + tankImage.offsetHeight;

    return bulletX >= tankLeft && bulletX <= tankRight && bulletY >= tankTop && bulletY <= tankBottom;
  }

  function checkTowerCollisionWithBullet(point, polygon) {
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

  function updateExp() {
    const currentTime = Date.now();
    if (currentTime - lastHitTime < 1200) {
      tankExp += 3;
    } else {
      tankExp += 1;
    }

    if (tankExp >= tankLevel * 30) {
      levelUp();
    }

    username.textContent = `Player   ${tankLevel}`;
  }

  function levelUp() {
    tankLevel++;
    tankHP += 10;
    tankCurrentHP = tankHP;
    tankHPBar.style.width = '100%';
    tankExp = 0;
  }

  function regenerateHealth() {
    if (tankCurrentHP < tankHP) {
      tankCurrentHP = Math.min(tankCurrentHP + tankHealthRegeneration, tankHP);
      const hpPercentage = (tankCurrentHP / tankHP) * 100;
      tankHPBar.style.width = `${hpPercentage}%`;
    }
  }

  setInterval(() => {
    if (isWithinRange(tankFireRange)) {
      const tankCenterX = tankX + tankImage.offsetWidth / 2;
      const tankCenterY = tankY + tankImage.offsetHeight / 2;
      const turretCenterX = turret.offsetLeft + turret.offsetWidth / 2;
      const turretCenterY = turret.offsetTop + turret.offsetHeight / 2;
      fireBullet(tankCenterX, tankCenterY, turretCenterX, turretCenterY, 'tank-bullet');
    }
  }, tankFireInterval);

  setInterval(() => {
    if (isWithinRange(turretFireRange)) {
      const tankCenterX = tankX + tankImage.offsetWidth / 2;
      const tankCenterY = tankY + tankImage.offsetHeight / 2;
      const turretCenterX = turret.offsetLeft + turret.offsetWidth / 2;
      const turretCenterY = turret.offsetTop + turret.offsetHeight / 2;
      fireBullet(turretCenterX, turretCenterY, tankCenterX, tankCenterY, 'tower-bullet');
    }
  }, turretFireInterval);

  setInterval(updateExp, 1200);
  setInterval(regenerateHealth, 1000);

  map.addEventListener('click', (e) => {
    const mapRect = map.getBoundingClientRect();
    const tankRect = tankImage.getBoundingClientRect();
    targetX = e.clientX - mapRect.left - tankRect.width / 2;
    targetY = e.clientY - mapRect.top - tankRect.height / 2;

    const deltaX = targetX - tankX;
    const deltaY = targetY - tankY;
    const targetAngle = Math.atan2(deltaY, deltaX) + Math.PI / 2;
    rotateTankAndFrame(targetAngle);
  });

  map.addEventListener('mousedown', (e) => {
    e.preventDefault();
  });

  document.addEventListener('mousedown', (e) => {
    e.preventDefault();
  });

  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
      isMoving = false;
      targetX = tankX;
      targetY = tankY;
    }
  });

  tank.style.left = `${tankX}px`;
  tank.style.top = `${tankY}px`;

  const octaVertices = calculateOctagonVertices(13, 135+19, 365);

  originalGunRotation = parseFloat(gun.style.transform.replace(/rotate\(([^)]+)rad\)/, '$1')) || 0;

  updateCameraPosition();
  moveTank();
  rotateGun();
});

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