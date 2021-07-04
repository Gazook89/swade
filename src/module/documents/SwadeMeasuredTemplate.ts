declare global {
  interface DocumentClassConfig {
    MeasuredTemplate: typeof SwadeMeasuredTemplate;
  }
}

export default class SwadeMeasuredTemplate extends MeasuredTemplate {
  _getConeShape(
    direction: number,
    angle: number,
    distance: number,
  ): PIXI.Polygon {
    angle = angle || 90;
    const coneType = game.settings.get('core', 'coneTemplateType') as string;
    const coneWidth = (1.5 / 9) * distance;
    const coneLength = (7.5 / 9) * distance;
    let angles: number[];
    let points: number[];
    let rays: Ray[];

    const toRadians = function (degrees: number): number {
      return degrees * (Math.PI / 180);
    };

    // For round cones - approximate the shape with a ray every 3 degrees
    if (coneType === 'round') {
      const da = Math.min(angle, 3);
      const c = Ray.fromAngle(0, 0, direction, coneLength);
      angles = Array.fromRange(180 / da)
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
}
