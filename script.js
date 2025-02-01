document.addEventListener('DOMContentLoaded', () => {
  const map = document.getElementById('map');
  const tank = document.getElementById('tank');
  const teamColor = tank.classList.contains('red') ? 'red' : 'blue';
  const enemyColor = teamColor == 'red' ? 'blue' : 'red';
  const tankImage = document.getElementById('tank-image');
  const frameImage = document.getElementById('frame-image');
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

  let tankX = 20;
  let tankY = map.offsetHeight - 400;
  let tankMaxHP = 200;
  let tankCurrentHP = tankMaxHP;
  let tankArmor = 0.15;
  let tankDamage = 10;
  let turretArmor = 0.10;
  let skillCounts = [1, 1, 1];

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
          const distance = Math.sqrt(deltaX * deltaX + deltaY * deltaY);

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

    scrollTop = updateCameraPosition();
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
            const distance = Math.sqrt(deltaX * deltaX + deltaY * deltaY);
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
        delete turretCollisionVertices[turrets[turretIndex].id];
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

    function rotateGun(gun, turret, originalGunRotation) {
        if (isWithinRange(turretFireRange, turret) && turret.classList.contains(enemyColor)) {
            const tankCenterX = tankX + tankImage.offsetWidth / 2;
            const tankCenterY = tankY + tankImage.offsetHeight / 2;
            const gunCenterX = turret.offsetLeft + 19;
            const gunCenterY = turret.offsetTop + 19;

            const deltaX = tankCenterX - gunCenterX;
            const deltaY = tankCenterY - gunCenterY;
            const targetAngle = Math.atan2(deltaY, deltaX) - Math.PI / 2;
            rotateElement(gun, targetAngle, 0.01);
        } else {
          rotateElement(gun, originalGunRotation, 0.01);
        }
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
      const hpPercentage = (tankCurrentHP / tankMaxHP) * 100;
      tankHPBar.style.width = `${hpPercentage}%`;
      hpDisplay.textContent = `${Math.round(tankCurrentHP)}/${tankMaxHP}`;
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
    if (tankLevel < 28)
      upgradePoints += 1;
    tankDamage += 2;
    tankMaxHP += 5;
    tankCurrentHP += 5;
    tankArmor += 0.00;
    updateTankHPBar();
    damageInput.textContent = tankDamage + " DPS";
    rangeInput.textContent = tankFireRange + " meters";
    armorInput.textContent = Math.round(tankArmor*100) + "%";
    speedInput.textContent = tankSpeed * SPEED_DISPLAY_MULTIPLIER  + " kph";
    usernameInput.textContent = username + "\u00A0" + tankLevel;
  }

  function updateTankHPBar() {
    const hpPercentage = Math.max(tankCurrentHP / tankMaxHP, 0) * 100;
    tankHPBar.style.width = `${hpPercentage}%`;
    healthHPBar.style.width = `${hpPercentage}%`;
    document.getElementById('hp-value').textContent = `${Math.round(tankCurrentHP)}/${tankMaxHP}`;
  }

    function findClosestTurret() {
        let closestTurret = null;
        let closestDistance = Infinity;
        const tankCenterX = tankX + tankImage.offsetWidth / 2;
        const tankCenterY = tankY + tankImage.offsetHeight / 2;

        turrets.forEach((turret, index) => {
          if (turretCurrentHPs[index] <= 0 || turret.classList.contains(teamColor)) 
            return;

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

        return [closestTurret, closestDistance];
    }

    const turretCollisionVertices = {};
    turrets.forEach((turret) => {
        const turretCenterX = turret.offsetLeft + turret.offsetWidth / 2;
        const turretCenterY = turret.offsetTop + turret.offsetHeight / 2;
        const vertices = calculateOctagonVertices(19, turretCenterX-2, turretCenterY-2);
        turretCollisionVertices[turret.id] = vertices;
        // displayVertices(vertices, 3);
    });

  setInterval(() => {
    gainExp(1);
  }, expIncrementInterval);
    
    let tankFireCounter = 0;

    function gameLoop() {
        moveTank();
        const [closestTurret, closestDistance] = findClosestTurret();
        
        // Handle tank rotation
        if (closestTurret && closestDistance <= tankFireRange) {
            // When in range of turret, aim at it
            const turretCenterX = closestTurret.offsetLeft + closestTurret.offsetWidth / 2;
            const turretCenterY = closestTurret.offsetTop + closestTurret.offsetHeight / 2;
            const tankTopX = tankX + tankImage.offsetWidth / 2;
            const tankTopY = tankY + tankImage.offsetHeight / 2;
            const deltaX = turretCenterX - tankTopX;
            const deltaY = turretCenterY - tankTopY;
            const targetAngle = Math.atan2(deltaY, deltaX) + Math.PI / 2;
            
            isUpperFrameRotating = true;
            rotateElement(tankImage, targetAngle, tankRotationSpeed);
            
            // Fire at turret when in range
            if (tankFireCounter % tankFireInterval === 0)
                fireBullet(tankTopX, tankTopY, turretCenterX, turretCenterY, 'tank-bullet');
              
        } else if (isUpperFrameRotating) {
            // When out of range, align tank with frame
            const deltaX = targetX - tankX;
            const deltaY = targetY - tankY;
            const targetAngle = Math.atan2(deltaY, deltaX) + Math.PI / 2;
            isUpperFrameRotating = false;
            rotateElement(tankImage, targetAngle, tankRotationSpeed, () => {
            });
        }

        tankFireCounter++;

        guns.forEach((gun, index) => {
            rotateGun(gun, turrets[index], originalGunRotations[index]);
        });

        setTimeout(gameLoop, frameInterval);
    }
    
    turrets.forEach((turret, index) => {
        setInterval(() => {
            if (isWithinRange(turretFireRange, turret) && turret.classList.contains(enemyColor)) {
                const tankCenterX = tankX + tankImage.offsetWidth / 2;
                const tankCenterY = tankY + tankImage.offsetHeight / 2;
                const turretCenterX = turret.offsetLeft + turret.offsetWidth / 2;
                const turretCenterY = turret.offsetTop + turret.offsetHeight / 2;
                fireBullet(turretCenterX, turretCenterY, tankCenterX, tankCenterY, 'tower-bullet');
            }
        }, turretFireInterval);
    });

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

    function handleUpgrade(skillName) {
      if (upgradePoints > 0 && skillLevels[skillName] < MAX_SKILL_LEVEL) {
        upgradePoints--;
        skillLevels[skillName]++;
        skillCounts[skillName].textContent = skillLevels[skillName];
        updateUpgradeVisibility();
      }
    }

    upgradeImages[0].addEventListener('click', () => handleUpgrade('upgrade1'));
    upgradeImages[1].addEventListener('click', () => handleUpgrade('upgrade2'));
    upgradeImages[2].addEventListener('click', () => handleUpgrade('upgrade3'));

    tank.style.left = `${tankX}px`;
    tank.style.top = `${tankY}px`;


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
                imgElement.classList.add('upgrade-image');
                upgradeElement.appendChild(imgElement);
            }
        });
    }
    
    updateCameraPosition();
    gameLoop();
});