document.addEventListener('DOMContentLoaded', () => {
  const map = document.getElementById('map');
  const tank = document.getElementById('tank');
  const teamColor = tank.classList.contains('red') ? 'red' : 'blue';
  const enemyColor = teamColor == 'red' ? 'blue' : 'red';
  const tankImage = document.getElementById('tank-image');
  const frameImage = document.getElementById('frame-image');
  const skillDescription = document.getElementById('skill-description');
  const frame = document.getElementById('frame');
  const turrets = document.querySelectorAll('.turret');
  const guns = document.querySelectorAll('.gun-image');
  const hpDisplay = document.getElementById('hp-value');
  const tankHPBar = document.getElementById('tank-hp').querySelector('.hp-bar-inner');
  const turretHPBars = document.querySelectorAll('.turret-hp .hp-bar-inner');
  const healthHPBar = document.getElementById('hp-stats-bar').querySelector('.hp-bar-inner');
  const expBar = document.getElementById('exp-bar').querySelector('.hp-bar-inner');
  const upgradeImages = document.querySelectorAll('.upgrade-image');
  const miniMapContainer = document.getElementById('mini-map-container');
  const scaleFactorX = miniMapContainer.offsetWidth / map.offsetWidth;
  const scaleFactorY = miniMapContainer.offsetHeight / map.offsetHeight;

  const frameRate = 40;
  const frameInterval = 1000 / frameRate;

  let tankX = 10;
  let tankY = map.offsetHeight - 430;
  let tankMaxHP = 200;
  let tankCurrentHP = tankMaxHP;
  let tankArmor = 0.15;
  let tankDamage = 1000;
  let turretArmor = 0.10;
  let skillLevels = [1, 1, 1];

  const tankType = 'shouty';
  const tankSpeed = 0.5;
  const tankRotationSpeed = 0.012;
  const frameRotationSpeed = 0.006;
  const tankHealthRegeneration = 1;
  const tankHealthRegenerationInterval = 200;
  const tankFireInterval = 40;
  const tankFireRange = 160;
  let isTankInvulnerable = false;
  const invulnerabilityDuration = 3000;

  const turretFireInterval = 30 * frameRate;
  const turretFireRange = 160;
  const BASE_TURRET_HP = 400;
  const SPECIAL_TURRET_HP = 1500;
  const turretDamage = 30;
  let turretCurrentHPs = Array.from(turrets).map((turret) => {
    if (turret.id === 'blue-turret-1' || turret.id === 'red-turret-1') {
      return SPECIAL_TURRET_HP;
    }
    return BASE_TURRET_HP;
  });

  let targetX = tankX;
  let targetY = tankY;
  let tankRotation = 0;
  let isUpperFrameRotating = false;
  let isMoving = false;
  let originalGunRotations = Array.from(guns).map(gun => parseFloat(gun.style.transform.replace(/rotate\(([^)]+)rad\)/, '$1')) || 0);

  let username = "Player";
  let tankExp = 0;
  let tankLevel = 1;
  let upgradePoints = 0;
  let missileRange = 100;
  let missileDamage = 50;
  let mortarRange = 100;
  let mortarDamage = 50;
  let expIncrementInterval = 500;
  const expPerLevel = 30;
  const expForTurretHit = 3;

  let cameraLocked = false;
  
  const damageInput = document.getElementById('damage-value');
  const rangeInput = document.getElementById('range-value');
  const armorInput = document.getElementById('armor-value');
  const speedInput = document.getElementById('speed-value');
  const usernameInput = document.getElementById('username');
  const usernameLabel = document.getElementById('username-label');

  const SPEED_DISPLAY_MULTIPLIER = 60;
  damageInput.textContent = tankDamage + " DPS";
  rangeInput.textContent = tankFireRange + " meters";
  armorInput.textContent = Math.round(tankArmor * 100) + "%";
  speedInput.textContent = tankSpeed * SPEED_DISPLAY_MULTIPLIER + " kph";
  usernameInput.textContent = username + "\u00A0" + tankLevel;
  usernameLabel.textContent = username;
  hpDisplay.textContent = `${Math.round(tankCurrentHP)}/${tankMaxHP}`;

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
  const cameraViewMarker = createCameraViewMarker();
  walls.forEach(createWallMarker);

  function updateMiniMap(scrollTop) {
    tankMarker.style.left = `${tankX * scaleFactorX}px`;
    tankMarker.style.top = `${tankY * scaleFactorY}px`;
    if (!cameraLocked) {
      cameraViewMarker.style.top = `${scrollTop * scaleFactorY}px`;
      cameraViewMarker.style.height = `${frame.clientHeight * scaleFactorY}px`;
    }
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

  // Add collision detection function
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

  function isCollidingWithTurret(tankCenterX, tankCenterY) {
    for (let turret of turrets) {
      if (turretCurrentHPs[Array.from(turrets).indexOf(turret)] <= 0) continue;
      if (isPointInPolygon([tankCenterX, tankCenterY], turretCollisionVertices[turret.id])) {
        return true;
      }
    }
    return false;
  }

  function moveTank() {
    if (isMoving) {
      const deltaX = targetX - tankX;
      const deltaY = targetY - tankY;
      const distance = Math.hypot(deltaX, deltaY);

      if (distance > tankSpeed) {
        const newTankX = tankX + (deltaX / distance) * tankSpeed;
        const newTankY = tankY + (deltaY / distance) * tankSpeed;
        const tankCenterX = newTankX + tankImage.offsetWidth / 2;
        const tankCenterY = newTankY + tankImage.offsetHeight / 2;

        if (!isCollidingWithWall(tankCenterX, tankCenterY) && 
            !isCollidingWithTurret(tankCenterX, tankCenterY)) {
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

    if (!cameraLocked){
      scrollTop = updateCameraPosition();
    }
    updateMiniMap(scrollTop);
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
      const distance = Math.hypot(deltaX, deltaY);
      const duration = distance / bulletSpeed;
      const progress = Math.min(elapsed / (duration * 100), 1);

      let x = startX + (deltaX * progress);
      let y = startY + (deltaY * progress);

      bullet.style.left = `${x}px`;
      bullet.style.top = `${y}px`;

      if (bulletType === 'tower-bullet') {
        if (tankCurrentHP <= 0 || isTankInvulnerable) {
          bullet.remove();
          return;
        }
        if (checkTankCollisionWithBullet(x, y)) {
          bullet.remove();
          takeDamage('tank', turretDamage);
          return;
        }
      } else if (bulletType === 'tank-bullet') {
        let hitTurret = false;
        turrets.forEach((turret, index) => {
          if (turretCurrentHPs[index] > 0 && isPointInPolygon([x, y], turretCollisionVertices[turret.id])) {
            bullet.remove();
            takeDamage('turret', tankDamage, index);
            gainExp(expForTurretHit);
            hitTurret = true;
          }
        });
        if (hitTurret) return;
      }

      if (progress < 1) {
        requestAnimationFrame(animateBullet);
      } else {
        bullet.remove();
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
    isMoving = false;
    rotateElement(tankImage, targetAngle, tankRotationSpeed);
    rotateElement(frameImage, targetAngle, frameRotationSpeed, () => {
      isMoving = true;
    });  
  }

  function takeDamage(target, damage, turretIndex = null) {
    if (isTankInvulnerable)
      return;
    if (target === 'tank') {
      tankCurrentHP -= damage * (1 - tankArmor);
      updateTankHPBar();
      if (tankCurrentHP <= 0) {
        respawnTank();
      }
    } else if (target === 'turret' && turretIndex !== null) {
      turretCurrentHPs[turretIndex] -= damage * (1 - turretArmor);
      const maxHP = (turrets[turretIndex].id === 'blue-turret-1' || 
                    turrets[turretIndex].id === 'red-turret-1') 
                    ? SPECIAL_TURRET_HP 
                    : BASE_TURRET_HP;
      const hpPercentage = Math.max(turretCurrentHPs[turretIndex] / maxHP, 0) * 100;
      turretHPBars[turretIndex].style.width = `${hpPercentage}%`;
      if (turretCurrentHPs[turretIndex] <= 0) {
        const turretId = turrets[turretIndex].id;
        const miniMapMarker = document.querySelector(`#mini-map-${turretId}`);
        if (miniMapMarker) 
          miniMapMarker.remove();
        turrets[turretIndex].remove();
        guns[turretIndex].remove();
        delete turretCollisionVertices[turretId];
      }
    }
  }

  function respawnTank() {
    tankImage.style.transform = `rotate(${tankRotation}rad)`;
    frameImage.style.transform = `rotate(${tankRotation}rad)`;
    isUpperFrameRotating = false;
    isTankInvulnerable = true;
    tankX = 200;
    tankY = map.offsetHeight - 30;
    targetX = tankX;
    targetY = tankY;
    tankRotation = 0;
    tank.style.left = `${tankX}px`;
    tank.style.top = `${tankY}px`;
    tankCurrentHP = tankMaxHP;
    updateTankHPBar();
    updateCameraPosition();
    setTimeout(() => {
      isTankInvulnerable = false;
    }, invulnerabilityDuration);
  }

  let targets = [];

  function updateTargetInfo() {
    targets = [];

    const tankCenterX = tankX + tankImage.offsetWidth / 2;
    const tankCenterY = tankY + tankImage.offsetHeight / 2;
    const teamColour = tank.classList.contains('red') ? 'red' : 'blue';
    targets.push({ target: tank, centerX: tankCenterX, centerY: tankCenterY, team: teamColour });

    turretObjects.forEach(turret => {
      targets.push({ target: turret.element, centerX: turret.centerX, centerY: turret.centerY, team: turret.team });
    });
  }

  function findClosestTarget(source){
    let closestTarget = null;
    let closestDistance = Infinity;
    let targetCenterX, targetCenterY;
    let sourceCenterX = source.offsetLeft + source.offsetWidth / 2;
    let sourceCenterY = source.offsetTop + source.offsetHeight / 2;
    let sourceEnemyColor = source.classList.contains('red') ? 'blue' : 'red';

    targets.forEach(target => {
      if(target.team === sourceEnemyColor) {
        let dx = target.centerX - sourceCenterX;
        let dy = target.centerY - sourceCenterY;
        let distance = Math.hypot(dx, dy);
        if (distance < closestDistance){
          closestDistance = distance;
          closestTarget = target.target;
          targetCenterX = target.centerX;
          targetCenterY = target.centerY;
        }
      }
    });

    targetInfo = closestTarget ? { target: closestTarget, centerX: targetCenterX, centerY: targetCenterY, distance: closestDistance } : null;
    return targetInfo;
  }

  function isWithinRange(fireRange, turret) {
    const tankCenterX = tankX + tankImage.offsetWidth / 2;
    const tankCenterY = tankY + tankImage.offsetHeight / 2;
    const turretCenterX = turret.offsetLeft + turret.offsetWidth / 2;
    const turretCenterY = turret.offsetTop + turret.offsetHeight / 2;

    const deltaX = turretCenterX - tankCenterX;
    const deltaY = turretCenterY - tankCenterY;
    const distance = Math.hypot(deltaX, deltaY);

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

  // Utility collision check for any element (used for mini collision)
  function checkCollisionWithElement(element, bulletX, bulletY) {
    const rect = element.getBoundingClientRect();
    const mapRect = map.getBoundingClientRect();
    const left = rect.left - mapRect.left;
    const top = rect.top - mapRect.top;
    const right = left + rect.width;
    const bottom = top + rect.height;
    return bulletX >= left && bulletX <= right && bulletY >= top && bulletY <= bottom;
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
    if (tankCurrentHP < tankMaxHP) {
      tankCurrentHP = Math.min(tankCurrentHP + tankHealthRegeneration, tankMaxHP);
      updateTankHPBar();
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
    upgradePoints += 1;
    tankDamage += 2;
    tankMaxHP += 5;
    tankCurrentHP += 5;
    tankArmor += 0.00;
    updateTankHPBar();
    damageInput.textContent = tankDamage + " DPS";
    rangeInput.textContent = tankFireRange + " meters";
    armorInput.textContent = Math.round(tankArmor * 100) + "%";
    speedInput.textContent = tankSpeed * SPEED_DISPLAY_MULTIPLIER  + " kph";
    usernameInput.textContent = username + "\u00A0" + tankLevel;
    updateUpgradeImagesVisibility();
  }

  function updateUpgradeImagesVisibility() {
    if (upgradePoints === 0) {
      upgradeImages.forEach(img => img.style.visibility = 'hidden');
      return;
    }
    
    upgradeImages.forEach((img, index) => {
      if (skillLevels[index] === 10) {
        img.style.visibility = 'hidden';
      } else {
        img.style.visibility = 'visible';
      }
    });
  }

  updateUpgradeImagesVisibility();

  function updateTankHPBar() {
    const hpPercentage = Math.max(tankCurrentHP / tankMaxHP, 0) * 100;
    tankHPBar.style.width = `${hpPercentage}%`;
    healthHPBar.style.width = `${hpPercentage}%`;
    document.getElementById('hp-value').textContent = `${Math.round(tankCurrentHP)}/${tankMaxHP}`;
  }

  const turretCollisionVertices = {};
  turrets.forEach((turret) => {
    const turretCenterX = turret.offsetLeft + turret.offsetWidth / 2;
    const turretCenterY = turret.offsetTop + turret.offsetHeight / 2;
    const vertices = calculateOctagonVertices(19, turretCenterX - 2, turretCenterY - 2);
    turretCollisionVertices[turret.id] = vertices;
    // displayVertices(vertices, 3);
  });

  setInterval(() => {
    gainExp(1);
  }, expIncrementInterval);

  let tankFireCounter = 0;

  function gameLoop() {
    moveTank();
    updateTargetInfo();
    const targetInfo = findClosestTarget(tank);
    
    // Handle tank rotation
    if (targetInfo && targetInfo.distance <= tankFireRange) {
      // When in range of turret, aim at it
      const tankTopX = tankX + tankImage.offsetWidth / 2;
      const tankTopY = tankY + tankImage.offsetHeight / 2;
      const deltaX = targetInfo.centerX - tankTopX;
      const deltaY = targetInfo.centerY - tankTopY;
      const targetAngle = Math.atan2(deltaY, deltaX) + Math.PI / 2;
      
      isUpperFrameRotating = true;
      rotateElement(tankImage, targetAngle, tankRotationSpeed);
      
      // Fire at turret when in range
      if (tankFireCounter % tankFireInterval === 0)
        fireBullet(tankTopX, tankTopY, targetInfo.centerX, targetInfo.centerY, 'tank-bullet');
      
    } else if (isUpperFrameRotating) {
      // When out of range, align tank with frame
      const deltaX = targetX - tankX;
      const deltaY = targetY - tankY;
      const targetAngle = Math.atan2(deltaY, deltaX) + Math.PI / 2;
      isUpperFrameRotating = false;
      rotateElement(tankImage, targetAngle, tankRotationSpeed, () => {});
    }

    tankFireCounter++;

    turretObjects.forEach(turret => {
      turret.rotateGun()
      turret.framesSinceShot++;
      if (turret.framesSinceShot > turret.fireInterval) {
        if (isWithinRange(turret.fireRange, turret.element)) {
          fireBullet(turret.centerX, turret.centerY, tankX + tankImage.offsetWidth / 2, tankY + tankImage.offsetHeight / 2, 'tower-bullet');
          turret.framesSinceShot = 0;
        }
      }
    });

    setTimeout(gameLoop, frameInterval);
  }
  
  // turrets.forEach((turret, index) => {
  //   setInterval(() => {
  //     if (isWithinRange(turretFireRange, turret) && turret.classList.contains(enemyColor)) {
  //       const tankCenterX = tankX + tankImage.offsetWidth / 2;
  //       const tankCenterY = tankY + tankImage.offsetHeight / 2;
  //       const turretCenterX = turret.offsetLeft + turret.offsetWidth / 2;
  //       const turretCenterY = turret.offsetTop + turret.offsetHeight / 2;
  //       fireBullet(turretCenterX, turretCenterY, tankCenterX, tankCenterY, 'tower-bullet');
  //     }
  //   }, turretFireInterval);
  // });

  setInterval(() => {
    regenerateHealth();
  }, tankHealthRegenerationInterval);

  let lastClickTime = 0;
  const CLICK_DELAY = 100; // 100ms minimum delay between clicks

  map.addEventListener('click', (e) => {
    const currentTime = Date.now();
    if (currentTime - lastClickTime < CLICK_DELAY) {
      return; // Ignore clicks that are too close together
    }
    lastClickTime = currentTime;

    const mapRect = map.getBoundingClientRect();
    const tankRect = tankImage.getBoundingClientRect();
    targetX = e.clientX - mapRect.left - tankRect.width / 2;
    targetY = e.clientY - mapRect.top - tankRect.height / 2;

    const deltaX = targetX - tankX;
    const deltaY = targetY - tankY;
    const targetAngle = Math.atan2(deltaY, deltaX) + Math.PI / 2;
    if (!isUpperFrameRotating){
      rotateTankAndFrame(targetAngle);
    } 
    else {
      isMoving = false;
      rotateElement(frameImage, targetAngle, frameRotationSpeed, () => {
        isMoving = true;
      });
    }
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

  let shiftPressed = false;
  document.addEventListener("keydown", (event) => {
    if (event.shiftKey) {
      switch (event.code) {
        case "Digit1":
          handleUpgrade(1);
          break;
        case "Digit2":
          handleUpgrade(2);
          break;
        case "Digit3":
          handleUpgrade(3);
          break;
      }
    }
  });
  document.addEventListener("keyup", (e) => {
      if (e.key === "Shift") {
          shiftPressed = false;
      }
  });

  function handleUpgrade(skillIdx) {
    if (upgradePoints > 0 && skillLevels[skillIdx-1] < 10) {
      upgradePoints--;
      skillLevels[skillIdx-1]++;
      
      // Update skill count display
      const skillCountElement = document.getElementById(`upgrade-count-${skillIdx}`);
      if (skillCountElement) {
        skillCountElement.textContent = skillLevels[skillIdx-1];
      }
      
      updateUpgradeImagesVisibility();
    }
  }

  if (tankType === 'shouty') {
    const upgrades = [
      { id: 'item-1', imageSrc: 'imgs/shouty-skill-1.png' },
      { id: 'item-2', imageSrc: 'imgs/shouty-skill-2.png' },
      { id: 'item-3', imageSrc: 'imgs/shouty-skill-3.png' }
    ];

    upgrades.forEach(upgrade => {
      const upgradeElement = document.getElementById(upgrade.id);
      if (upgradeElement) {
        const imgElement = document.createElement('img');
        imgElement.src = upgrade.imageSrc;
        imgElement.classList.add('upgrade-image', 'skill-image');
        upgradeElement.appendChild(imgElement);
      }
    });
  }

  function bindMessageToImages(messageKeys, imageNodeList, defaultMessage) {
    imageNodeList.forEach((img, index) => {
      img.addEventListener("mouseover", () => {
        skillDescription.innerHTML = skillMessages[tankType][messageKeys[index]];
      });
      img.addEventListener("mouseout", () => {
        skillDescription.innerHTML = defaultMessage;
      });
    });
  }
  
  const originalSkillDescription = skillDescription.innerHTML;
  const upgradeMessageKeys = ["upgrade-1", "upgrade-2", "upgrade-3"];
  const skillMessageKeys = ["skill-1", "skill-2", "skill-3"];
  const skillImages = document.querySelectorAll('.skill-image');
  bindMessageToImages(upgradeMessageKeys, upgradeImages, originalSkillDescription);
  bindMessageToImages(skillMessageKeys, skillImages, originalSkillDescription);

  tank.style.left = `${tankX}px`;
  tank.style.top = `${tankY}px`;

  class Turret {
    constructor(element) {
      this.element = element;
      this.id = element.id;
      this.team = element.classList.contains('red') ? 'red' : 'blue';
      if (element.classList.contains('front')) {
        this.maxHP = 400;
      } else if (element.classList.contains('back')) {
        this.maxHP = 800;
      } else if (element.classList.contains('main')) {
        this.maxHP = 1600;
      }
      this.currentHP = this.maxHP;
      this.armor = 0.10;
      this.collisionVertices = [];
      this.fireRange = 160;
      this.fireInterval = 30 * frameRate;
      this.fireDamage = 30;
      this.gun = this.element.querySelector('.gun-image');
      this.originalGunRotation = this.element.style.transform.replace(/rotate\(([^)]+)rad\)/, '$1') || 0;
      this.framesSinceShot = 0;
      this.centerX = this.element.offsetLeft + this.element.offsetWidth / 2;
      this.centerY = this.element.offsetTop + this.element.offsetHeight / 2;
      this.miniMapMarker = createMarker(`mini-map-turret ${this.team}`, this.element.offsetLeft, this.element.offsetTop);
    }

    takeDamage(damage) {
      if (this.currentHP <= 0) return;
      this.currentHP -= damage * (1 - this.armor);
      if (this.currentHP <= 0) {
        this.currentHP = 0;
        this.destroy();
      }
    }

    destroy() {
      this.element.remove();
      delete turretCollisionVertices[this.id];
      this.miniMapMarker.remove();
      turretObjects = turretObjects.filter(turret => turret !== this);
      // Optional: clean up related collision data
    }

    updateCollisionVertices(calculateVertices) {
      this.collisionVertices = calculateVertices(this.centerX, this.centerY);
    }
  
    fire() {
      fireBullet(turretCenterX, turretCenterY, tankCenterX, tankCenterY, 'tower-bullet');
    }
  
    rotateGun() {
      const targetInfo = findClosestTarget(this.element);
      if (targetInfo && targetInfo.distance <= this.fireRange) {
        const gunCenterX = this.element.offsetLeft + 19;
        const gunCenterY = this.element.offsetTop + 19;
        const deltaX = targetInfo.centerX - gunCenterX;
        const deltaY = targetInfo.centerY - gunCenterY;
        const targetAngle = Math.atan2(deltaY, deltaX) - Math.PI / 2;
        rotateElement(this.gun, targetAngle, 0.01);
      } else {
        rotateElement(this.gun, this.originalGunRotation, 0.01);
      }
    }
  }

  let turretObjects = Array.from(turrets).map(turretElement =>
    new Turret(turretElement)
  );
  
  updateCameraPosition();
  gameLoop();

  function animateCameraScroll(targetScrollTop, velocity = 900) {
    const startScrollTop = frame.scrollTop;
    const delta = targetScrollTop - startScrollTop;
    const startTime = performance.now();
  
    function animate(time) {
      const elapsed = (time - startTime) / 1000; // convert ms to seconds
      const displacement = velocity * elapsed;
      if (displacement >= Math.abs(delta)) {
        frame.scrollTop = targetScrollTop;
        updateMiniMap(frame.scrollTop);
        return;
      }
      frame.scrollTop = startScrollTop + Math.sign(delta) * displacement;
      updateMiniMap(frame.scrollTop);
      requestAnimationFrame(animate);
    }
    requestAnimationFrame(animate);
  }

  // When clicking the mini map, update the camera view gradually.
  miniMapContainer.addEventListener('click', (e) => {
    cameraLocked = true;
    e.stopPropagation(); // Prevent interfering with other click events
    const rect = miniMapContainer.getBoundingClientRect();
    const clickY = e.clientY - rect.top; // Y coordinate within mini-map
    // Convert mini-map Y coordinate to map scrollTop value.
    let targetScrollTop = clickY / scaleFactorY - frame.clientHeight / 2;
    targetScrollTop = Math.max(0, Math.min(targetScrollTop, map.offsetHeight - frame.clientHeight));
    animateCameraScroll(targetScrollTop, 900);
  });

  // When user presses "x", return the camera view to the default view (around the tank) gradually.
  document.addEventListener('keydown', (e) => {
    if (e.key.toLowerCase() === 'x' && cameraLocked) {
      cameraLocked = false;
      const defaultScrollTop = tankY - frame.clientHeight / 2 + tank.offsetHeight / 2;
      animateCameraScroll(defaultScrollTop, 900);
    }
  });
});

const skillMessages = {
  "splodge": {
    "skill-1": "Increases your unit's armor by <b>4</b> armor for three secs. <b>20 secs</b> cooldown.",
    "skill-2": "Repairs your unit by <b>20hp</b> over <b>10 secs</b>. <b>20 secs</b> cooldown.",
    "skill-3": "Pernamently increases the sight range of your unit by <b>10m</b>.",
    "upgrade-1": "Increases armor by a further <b>2</b> armor.",
    "upgrade-2": "Increases heal by a further <b>20hp</b>.",
    "upgrade-3": "Increases sight by <b>2.5m</b>"
  },

  "basher": {
    "skill-1": "Increases your unit's attack speed by <b>20%</b> over <b>6 secs</b>. <b>12 secs</b> cooldown.",
    "skill-2": "Equips your unit with armor piercing shells for <b>5 secs</b> seconds. <b>20 secs</b> cooldown.",
    "skill-3": "Permanently increases the shot damage of your unit by <b>1.5</b> damage.",
    "upgrade-1": "Increases attack speed by a further +<b>5%</b>.",
    "upgrade-2": "Increases armor piercing by <b>1 armor piercing</b>.",
    "upgrade-3": "Increases damage by <b>1.5</b> damage."
  },

  "doc": {
    "skill-1": "Repairs all allied units within <b>70m</b> by <b>30hp</b> over <b>3 secs</b>. <b>15 secs</b> cooldown.",
    "skill-2": "Increases your unit's sight range to <b>50m</b> for <b>5 secs</b>. <b>15 secs</b> cooldown.",
    "skill-3": "Permanently increases the speed of your unit by <b>1.5kph</b>.",
    "upgrade-1": "Increases heal by a further <b>6hp</b> and range by a further <b>1m</b>.",
    "upgrade-2": "Increases sight by a further <b>5m</b>. Reduces cooldown by <b>0.5 secs</b>.",
    "upgrade-3": "Increases speed by <b>1.2kph</b>."
  },

  "stinger": {
    "skill-1": "A hard hitting projectile that stuns an enemy for <b>2 secs</b> seconds. <b>20 secs</b> cooldown.",
    "skill-2": "Slows enemy movement by -<b>26%</b> and attack speed by -<b>20%</b>. Lasts <b>5 secs</b>. <b>20 secs</b> cooldown.",
    "skill-3": "Increases your unit's attack by +<b>15%</b> and speed by <b>4.5kph</b> for <b>5 secs</b>. <b>15 secs</b> cooldown.",
    "upgrade-1": "Increases duration by <b>0.1 secs</b>. Reduces cooldown by <b>1 secs</b>.",
    "upgrade-2": "Increases slow by -<b>10%</b> and reduces attack speed by a further +<b>5%</b>.",
    "upgrade-3": "Increases attack speed by a further +<b>4%</b> and move speed by a further <b>0.9kph</b>."
  },

  "shouty": {
    "skill-1": "Long range missile with <b>30</b> damage and <b>130m</b> range. Ignores armor. <b>0.82 secs</b> cooldown.",
    "skill-2": "A long range mortar with <b>30</b> damage, <b>150m</b> range and a <b>40</b> radius. <b>20 secs</b> cooldown.",
    "skill-3": "Instantly reloads the Missile and Mortar. <b>60 secs</b> cooldown.",
    "upgrade-1": "Increase damage by <b>6</b> damage.",
    "upgrade-2": "Increases mortar damage by <b>9</b> damage and splash by <b>5</b> radius.",
    "upgrade-3": "Reduces cooldown by <b>4 secs</b>."
  },

  "sneaky": {
    "skill-1": "A short range grenade with <b>49</b> damage and <b>74m</b> range. <b>8 secs</b> cooldown.",
    "skill-2": "Teleports you <b>120m</b> in the direction you choose. <b>28 secs</b> cooldown.",
    "skill-3": "Pernamently inceases the armor level of your tank by <b>10%</b>.",
    "upgrade-1": "Increases danage by <b>6m</b> and range by <b>1m</b>.",
    "upgrade-2": "Reduces cooldown by <b>2 secs</b>.",
    "upgrade-3": "Increases armor level by <b>1.5</b>"
  },

  "dash": {
    "skill-1": "Massively increases your unit's attack speed by +<b>100%</b> for <b>2.5 secs</b>. <b>30 secs</b> cooldown.",
    "skill-2": "Makes you invisible and move more quickly for <b>3 secs</b>, or until you attack an enemy. <b>20 secs</b> cooldown.",
    "skill-3": "Permanently improves the repair ability of your unit by <b>0.4hp</b> per second.",
    "upgrade-1": "Increase attack speed by a further <b>+20%</b>. Reduces cooldown by <b>1 secs</b>.",
    "upgrade-2": "Increases duration by <b>0.4 secs</b>. Reduces cooldown by <b>1 secs</b>.",
    "upgrade-3": "Increases repair by <b>0.2hp</b> per second."
  },

  "cutter": {
    "skill-1": "Increases your unit's speed by <b>30kph</b> and attack by <b>5</b>damage for <b>1.5 secs</b> seconds. <b>5 secs</b> cooldown.",
    "skill-2": "Releases a burst of energy that stuns enemies within <b>60m</b> for <b>2 secs</b>. <b>12 secs</b> cooldown.",
    "skill-3": "Permanently enables your unit to steal energy when it attacks. <b>5%</b> of this energy will repair you.",
    "upgrade-1": "Increases duration by a further <b>0.1 secs</b> and attack by a further <b>2</b>damage.",
    "upgrade-2": "Increases duration by <b>0.2 secs</b>. Reduces cooldown by <b>0.5 secs</b>.",
    "upgrade-3": "Increases percentage by <b>4%</b>."
  }


};