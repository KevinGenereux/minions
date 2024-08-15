document.addEventListener('DOMContentLoaded', () => {
  const map = document.getElementById('map');
  const tank = document.getElementById('tank');
  const tankImage = document.getElementById('tank-image');
  const frameImage = document.getElementById('frame-image');
  const frame = document.getElementById('frame');
  const turrets = document.querySelectorAll('.turret');
  const guns = document.querySelectorAll('.gun-image');
  const tankHPBar = document.getElementById('tank-hp').querySelector('.hp-bar-inner');
  const turretHPBars = document.querySelectorAll('.turret-hp .hp-bar-inner');
  const healthHPBar = document.getElementById('hp-stats-bar').querySelector('.hp-bar-inner');
  const expBar = document.getElementById('exp-bar').querySelector('.hp-bar-inner');
  const miniMapContainer = document.getElementById('mini-map-container');
  const scaleFactorX = miniMapContainer.offsetWidth / map.offsetWidth;
  const scaleFactorY = miniMapContainer.offsetHeight / map.offsetHeight;

  let tankX = 200; // Starting X position
  let tankY = map.offsetHeight - 30; // Starting Y position
  let tankHP = 200;
  let tankCurrentHP = tankHP;
  let tankArmor = 0.15;
  let tankDamage = 10;
  let turretArmor = 0.10;
  
  const tankSpeed = 5;
  const tankRotationSpeed = 0.005;
  const frameRotationSpeed = 0.005;
  const tankHealthRegeneration = 1;
  const tankFireInterval = 2000;
  const tankFireRange = 140;

  const turretFireInterval = 2000;
  const turretFireRange = 160;
  const turretHP = 400;
  const turretDamage = 30;
  let turretCurrentHPs = Array.from(turrets).map(() => turretHP);
  
  let targetX = tankX;
  let targetY = tankY;
  let tankRotation = 0;
  let isRotating = false;
  let isMoving = false;
  let originalGunRotations = Array.from(guns).map(gun => parseFloat(gun.style.transform.replace(/rotate\(([^)]+)rad\)/, '$1')) || 0);

  let username = "howitzer";
  let tankExp = 0;
  let tankLevel = 1;
  let expIncrementInterval = 500; // 1 second
  const expPerLevel = 10;
  const expForTurretHit = 3;

  const damageInput = document.getElementById('damage-value');
  const rangeInput = document.getElementById('range-value');
  const armorInput = document.getElementById('armor-value');
  const speedInput = document.getElementById('speed-value');
  const usernameInput = document.getElementById('username');

  damageInput.textContent = tankDamage + " DPS";
  rangeInput.textContent = tankFireRange + " meters";
  armorInput.textContent = Math.round(tankArmor * 100) + "%";
  speedInput.textContent = tankSpeed + " kph";

  const walls = [
    { x1: 100, x2: 205, y1: 728, y2: 770 },
    { x1: 150, x2: 205, y1: 728, y2: 825 },
    { x1: 353, x2: 408, y1: 728, y2: 825 },
    { x1: 353, x2: 458, y1: 728, y2: 770 },
    { x1: 100, x2: 205, y1: 143, y2: 198 },
    { x1: 150, x2: 205, y1: 98,  y2: 198 },
    { x1: 353, x2: 458, y1: 143, y2: 193 },
    { x1: 353, x2: 408, y1: 98,  y2: 193 },
  ];
  
  function createWallMarker(wall) {
    const marker = document.createElement('div');
    marker.className = 'mini-map-wall';
    marker.style.left = `${wall.x1 * scaleFactorX}px`;
    marker.style.top = `${wall.y1 * scaleFactorY}px`;
    marker.style.width = `${(wall.x2 - wall.x1) * scaleFactorX}px`;
    marker.style.height = `${(wall.y2 - wall.y1) * scaleFactorY}px`;
    miniMapContainer.appendChild(marker);
  }

  function createCameraViewMarker() {
    const marker = document.createElement('div');
    marker.className = 'mini-map-camera-view';
    miniMapContainer.appendChild(marker);
    return marker;
  }

  function createMarker(classNames, x, y) {
    const marker = document.createElement('div');
    marker.className = classNames;
    marker.style.left = `${x * scaleFactorX}px`;
    marker.style.top = `${y * scaleFactorY}px`;
    miniMapContainer.appendChild(marker);
    return marker;
  }

  const tankMarker = createMarker('mini-map-tank-turret mini-map-red', tankX, tankY);
  turrets.forEach(turret => {
    const turretColor = turret.classList.contains('red') ? 'mini-map-red' : 'mini-map-blue';
    createMarker(`mini-map-tank-turret ${turretColor}`, turret.offsetLeft, turret.offsetTop);
  });
  const cameraViewMarker = createCameraViewMarker();
  walls.forEach(createWallMarker);

  function updateMiniMap(scrollTop) {
    tankMarker.style.left = `${tankX * scaleFactorX}px`;
    tankMarker.style.top = `${tankY * scaleFactorY}px`;

    cameraViewMarker.style.top = `${scrollTop * scaleFactorY}px`;
    cameraViewMarker.style.width = `${frame.clientWidth * scaleFactorX}px`;
    cameraViewMarker.style.height = `${frame.clientHeight * scaleFactorY}px`;
  }

  function isCollidingWithWall(tankCenterX, tankCenterY) {
    for (let wall of walls) {
      if (
        tankCenterX >= wall.x1 &&
        tankCenterX <= wall.x2 &&
        tankCenterY >= wall.y1 &&
        tankCenterY <= wall.y2
      ) {
        return true;
      }
    }
    return false;
  }

  function moveTank() {
    if (!isRotating && isMoving) {
      const deltaX = targetX - tankX;
      const deltaY = targetY - tankY;
      const distance = Math.sqrt(deltaX * deltaX + deltaY * deltaY);
  
      if (distance > tankSpeed) {
        const newTankX = tankX + (deltaX / distance) * tankSpeed;
        const newTankY = tankY + (deltaY / distance) * tankSpeed;
        const tankCenterX = newTankX + tankImage.offsetWidth / 2;
        const tankCenterY = newTankY + tankImage.offsetHeight / 2;
  
        if (!isCollidingWithWall(tankCenterX, tankCenterY)) {
          tankX = newTankX;
          tankY = newTankY;
        } else {
          isMoving = false;
        }
      } else {
        tankX = targetX;
        tankY = targetY;
        isMoving = false;
      }
  
      tank.style.left = `${tankX}px`;
      tank.style.top = `${tankY}px`;
    }
  
    scrollTop = updateCameraPosition();
    updateMiniMap(scrollTop);
    requestAnimationFrame(moveTank);
  }

  function updateCameraPosition() {
    let newScrollTop = tankY - frame.clientHeight / 2 + tank.offsetHeight / 2;
    if (newScrollTop < 0) {
      newScrollTop = 0;
    } else if (newScrollTop > map.offsetHeight - frame.clientHeight) {
      newScrollTop = map.offsetHeight - frame.clientHeight;
    }
    frame.scrollTop = newScrollTop;
    return newScrollTop;
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
          takeDamage('tank', tankDamage);
        }
        if (bulletType === 'tank-bullet' && checkTowerCollisionWithBullet([x, y], octaVertices)) {
          takeDamage('turret', turretDamage);
          gainExp(expForTurretHit);
        }
      }
    }

    requestAnimationFrame(animateBullet);
  }

  function rotateElement(element, targetAngle, speed, callback) {
    const startAngle = parseFloat(element.style.transform.replace(/rotate\(([^)]+)rad\)/, '$1')) || 0;
  
    let deltaAngle = targetAngle - startAngle;
    if (deltaAngle > Math.PI) {
      deltaAngle -= 2 * Math.PI;
    } else if (deltaAngle < -Math.PI) {
      deltaAngle += 2 * Math.PI;
    }
  
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
      }, 50); // Delay frame rotation by 100ms
    });
  }

  function takeDamage(target, damage, turretIndex = null) {
    if (target === 'tank') {
      tankCurrentHP -= damage * (1 - tankArmor);
      updateTankHPBar();
      if (tankCurrentHP <= 0) {
        respawnTank();
      }
    } else if (target === 'turret' && turretIndex !== null) {
      turretCurrentHPs[turretIndex] -= damage * (1 - turretArmor);
      const hpPercentage = Math.max(turretCurrentHPs[turretIndex] / turretHP, 0) * 100;
      turretHPBars[turretIndex].style.width = `${hpPercentage}%`;
      if (turretCurrentHPs[turretIndex] <= 0) {
        turrets[turretIndex].remove();
        guns[turretIndex].remove();
      }
    }
  }

  function respawnTank() {
    
    tankX = 200;
    tankY = map.offsetHeight - 30;
    targetX = tankX;
    targetY = tankY;
    tankRotation = 0;
    tankImage.style.transform = `rotate(${tankRotation}rad)`;
    frameImage.style.transform = `rotate(${tankRotation}rad)`;
    tank.style.left = `${tankX}px`;
    tank.style.top = `${tankY}px`;
    tankCurrentHP = tankHP;
    updateTankHPBar();
    updateCameraPosition();
  }

  function rotateGun(gun, turret, originalGunRotation) {
    if (isWithinRange(turretFireRange, turret)) {
      const tankCenterX = tankX + tankImage.offsetWidth / 2;
      const tankCenterY = tankY + tankImage.offsetHeight / 2;
      const gunCenterX = turret.offsetLeft + 19; // Center X of the gun image
      const gunCenterY = turret.offsetTop + 19; // Center Y of the gun image

      const deltaX = tankCenterX - gunCenterX;
      const deltaY = tankCenterY - gunCenterY;
      const angle = Math.atan2(deltaY, deltaX);

      gun.style.transform = `rotate(${angle - Math.PI / 2}rad)`;
    } else {
      gun.style.transform = `rotate(${originalGunRotation}rad)`;
    }

    requestAnimationFrame(() => rotateGun(gun, turret, originalGunRotation));
  }

  function isWithinRange(fireRange, turret) {
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

  function regenerateHealth() {
    if (tankCurrentHP < tankHP) {
      tankCurrentHP = Math.min(tankCurrentHP + tankHealthRegeneration, tankHP);
      const hpPercentage = (tankCurrentHP / tankHP) * 100;
      tankHPBar.style.width = `${hpPercentage}%`;
    }
  }

  function gainExp(amount) {
    tankExp += amount;
    if (tankExp >= expPerLevel) {
      tankExp -= expPerLevel;
      levelUp();
    }
    const expPercentage = Math.max((tankExp % expPerLevel) / expPerLevel, 0) * 100;
    expBar.style.width = `${expPercentage}%`;
  }
  
  function levelUp() {
    tankLevel += 1;
    tankDamage += 2;
    tankHP += 5;
    tankCurrentHP += 5;
    tankArmor += 0.01;
    updateTankHPBar();
    damageInput.textContent = tankDamage + " DPS";
    rangeInput.textContent = tankFireRange + " meters";
    armorInput.textContent = Math.round(tankArmor*100) + "%";
    speedInput.textContent = tankSpeed + " kph";
    usernameInput.textContent = username + "\u00A0\u00A0\u00A0" + tankLevel;
  }

  function updateTankHPBar() {
    const hpPercentage = Math.max(tankCurrentHP / tankHP, 0) * 100;
    tankHPBar.style.width = `${hpPercentage}%`;
    healthHPBar.style.width = `${hpPercentage}%`;
    document.getElementById('hp-value').textContent = `${Math.round(tankCurrentHP)}/${tankHP}`;
  }

  function findClosestTurret() {
    let closestTurret = null;
    let closestDistance = Infinity;
    const tankCenterX = tankX + tankImage.offsetWidth / 2;
    const tankCenterY = tankY + tankImage.offsetHeight / 2;
  
    turrets.forEach((turret, index) => {
      if (turretCurrentHPs[index] <= 0) return; // Skip destroyed turrets
  
      const turretCenterX = turret.offsetLeft + turret.offsetWidth / 2;
      const turretCenterY = turret.offsetTop + turret.offsetHeight / 2;
      const deltaX = turretCenterX - tankCenterX;
      const deltaY = turretCenterY - tankCenterY;
      const distance = Math.sqrt(deltaX * deltaX + deltaY * deltaY);
  
      if (distance <= tankFireRange && distance < closestDistance) {
        closestTurret = turret;
        closestDistance = distance;
      }
    });
  
    return closestTurret;
  }

  setInterval(() => {
    gainExp(1);
  }, expIncrementInterval);

  setInterval(() => {
    const closestTurret = findClosestTurret();
    if (closestTurret) {
      const tankCenterX = tankX + tankImage.offsetWidth / 2;
      const tankCenterY = tankY + tankImage.offsetHeight / 2;
      const turretCenterX = closestTurret.offsetLeft + closestTurret.offsetWidth / 2;
      const turretCenterY = closestTurret.offsetTop + closestTurret.offsetHeight / 2;
  
      const deltaX = turretCenterX - tankX;
      const deltaY = turretCenterY - tankY;
      const targetAngle = Math.atan2(deltaY, deltaX) + Math.PI / 2;
      rotateElement(tankImage, targetAngle, tankRotationSpeed, () => {
        fireBullet(tankCenterX, tankCenterY, turretCenterX, turretCenterY, 'tank-bullet')
      });
    }
  }, tankFireInterval);

  turrets.forEach((turret) => {
    setInterval(() => {
      if (isWithinRange(turretFireRange, turret)) {
        const tankCenterX = tankX + tankImage.offsetWidth / 2;
        const tankCenterY = tankY + tankImage.offsetHeight / 2;
        const turretCenterX = turret.offsetLeft + turret.offsetWidth / 2;
        const turretCenterY = turret.offsetTop + turret.offsetHeight / 2;
        fireBullet(turretCenterX, turretCenterY, tankCenterX, tankCenterY, 'tower-bullet');
      }
    }, turretFireInterval);
  });

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

  // Prevent text selection when dragging the tank
  map.addEventListener('mousedown', (e) => {
    e.preventDefault(); 
  });

  // Prevent the blinking cursor effect
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

  const octaVertices = calculateOctagonVertices(18, 142 + 18, map.offsetHeight - 520 - 20);
  // displayVertices(octaVertices, 3)

  originalGunRotations.forEach((originalGunRotation, index) => {
    rotateGun(guns[index], turrets[index], originalGunRotation);
  });

  updateCameraPosition();
  moveTank();
});