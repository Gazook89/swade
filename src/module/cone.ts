export function fromRange(n) {
  return Array.from(new Array(parseInt(n)).keys());
}

export function getSwadeConeShape(
  direction: number,
  angle: number,
  distance: number,
): PIXI.Polygon {
  angle = angle || 90;
  const coneType = game.settings.get('core', 'coneTemplateType');
  let coneWidth = (1.5 / 9) * distance;
  let coneLength = (7.5 / 9) * distance;
  let angles;
  let rays;
  let points;

  // For round cones - approximate the shape with a ray every 3 degrees
  if (coneType === 'round') {
    const da = Math.min(angle, 3);
    const c = Ray.fromAngle(0, 0, direction, coneLength);
    angles = fromRange(180 / da)
      .map((a) => 180 / -2 + a * da)
      .concat([180 / 2]);
    // Get the cone shape as a polygon
    rays = angles.map((a) =>
      Ray.fromAngle(0, 0, direction + toRadians(a), coneWidth),
    );
    points = rays
      .reduce(
        (arr, r) => {
          return arr.concat([c.B.x + r.B.x, c.B.y + r.B.y]);
        },
        [0, 0],
      )
      .concat([0, 0]);
  } else {
    //For flat cones, direct point-to-point
    angles = [angle / -2, angle / 2];
    distance /= Math.cos(toRadians(angle / 2));
    // Get the cone shape as a polygon
    rays = angles.map((a) =>
      Ray.fromAngle(0, 0, direction + toRadians(a), distance + 1),
    );
    points = rays
      .reduce(
        (arr, r) => {
          return arr.concat([r.B.x, r.B.y]);
        },
        [0, 0],
      )
      .concat([0, 0]);
  }

  return new PIXI.Polygon(points);
}
