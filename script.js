document.addEventListener('DOMContentLoaded', () => {
  const map = document.getElementById('map');
  const tank = document.getElementById('tank');
  const tankImage = document.getElementById('tank-image');
  const frame = document.getElementById('frame');
  const turret = document.getElementById('turret');
  const tankSpeed = 5;
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
      bullet.style.left = `${startX + deltaX * progress}px`;
      bullet.style.top = `${startY + deltaY * progress}px`;

      // Collision detection with turret edges
      const bulletRect = bullet.getBoundingClientRect();
      const turretRect = turret.getBoundingClientRect();

      if (bulletRect.left >= turretRect.left && bulletRect.right <= turretRect.right &&
          bulletRect.top >= turretRect.top && bulletRect.bottom <= turretRect.bottom) {
        bullet.remove();
        return;
      }

      if (progress < 1) {
        requestAnimationFrame(animateBullet);
      } else {
        bullet.remove();
      }
    }

    requestAnimationFrame(animateBullet);
  }

  map.addEventListener('click', (e) => {
    const mapRect = map.getBoundingClientRect();
    const tankRect = tankImage.getBoundingClientRect();
    targetX = e.clientX - mapRect.left - tankRect.width / 2;
    targetY = e.clientY - mapRect.top - tankRect.height / 2;
    fireBullet();
  });

  tank.style.left = `${tankX}px`;
  tank.style.top = `${tankY}px`;

  moveTank();
});
