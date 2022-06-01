import { MeasuredTemplateConstructorDataData } from '../../interfaces/TemplateConfig.interface';

declare global {
  interface PlaceableObjectClassConfig {
    MeasuredTemplate: typeof SwadeMeasuredTemplate;
  }
}

export default class SwadeMeasuredTemplate extends MeasuredTemplate {
  handlers: Record<string, (...args) => void> = {};

  /**
   * A factory method to create a SwadeMeasuredTemplate instance using provided preset
   * @param preset the preset to use.
   * @returns SwadeTemplate | null
   */
  static fromPreset(preset: string) {
    const existingPreview = CONFIG.SWADE.activeMeasuredTemplatePreview;
    if (existingPreview && !existingPreview._destroyed) {
      existingPreview.destroy({ children: true });
    }

    CONFIG.SWADE.activeMeasuredTemplatePreview = this._constructPreset(preset);
    if (CONFIG.SWADE.activeMeasuredTemplatePreview)
      CONFIG.SWADE.activeMeasuredTemplatePreview.drawPreview();
  }

  protected static _constructPreset(preset: string) {
    // Prepare template data
    const templateBaseData: MeasuredTemplateConstructorDataData = {
      user: game.user?.id,
      distance: 0,
      direction: 0,
      x: 0,
      y: 0,
      fillColor: game.user!.data.color,
    };

    const presetPrototype = CONFIG.SWADE.measuredTemplatePresets.find(
      (c) => c.button.name === preset,
    );
    if (!presetPrototype) return null;

    //Set template data based on preset option
    const template = new CONFIG.MeasuredTemplate.documentClass(
      foundry.utils.mergeObject(templateBaseData, presetPrototype.data),
      {
        parent: canvas.scene ?? undefined,
      },
    );

    //Return the template constructed from the item data
    return new this(template);
  }

  /** Creates a preview of the template */
  drawPreview() {
    const initialLayer = canvas.activeLayer!;
    // Draw the template and switch to the template layer
    this.draw();
    this.layer.activate();
    this.layer.preview?.addChild(this);
    // Activate interactivity
    this.activatePreviewListeners(initialLayer);
  }

  /** Activate listeners for the template preview */
  activatePreviewListeners(initialLayer: CanvasLayer) {
    let moveTime = 0;

    // Update placement (mouse-move)
    this.handlers.mm = (event) => {
      event.stopPropagation();
      const now = Date.now(); // Apply a 20ms throttle
      if (now - moveTime <= 20) return;
      const center = event.data.getLocalPosition(this.layer);
      const snapped = canvas.grid?.getSnappedPosition(center.x, center.y, 2);
      this.data.update({ x: snapped?.x, y: snapped?.y });
      this.refresh();
      moveTime = now;
    };

    // Cancel the workflow (right-click)
    this.handlers.rc = (event) => {
      //@ts-expect-error DND5e does this and Atropos probably knows what he's doing
      this.layer._onDragLeftCancel(event);
      this._removeListenersFromCanvas();
      initialLayer.activate();
    };

    // Confirm the workflow (left-click)
    this.handlers.lc = (event) => {
      this.handlers.rc(event);
      const dest = canvas.grid?.getSnappedPosition(this.data.x, this.data.y, 2);
      this.data.update(dest);
      canvas.scene?.createEmbeddedDocuments('MeasuredTemplate', [
        this.data.toObject(),
      ]);
    };

    // Rotate the template by 3 degree increments (mouse-wheel)
    this.handlers.mw = (event) => {
      if (event.ctrlKey) event.preventDefault(); // Avoid zooming the browser window
      event.stopPropagation();
      const delta = canvas.grid!.type > CONST.GRID_TYPES.SQUARE ? 30 : 15;
      const snap = event.shiftKey ? delta : 5;
      this.data.update({
        direction: this.data.direction + snap * Math.sign(event.deltaY),
      });
      this.refresh();
    };

    // Activate listeners
    canvas.stage!.on('mousemove', this.handlers.mm);
    canvas.stage!.on('mousedown', this.handlers.lc);
    canvas.app!.view.oncontextmenu = this.handlers.rc;
    canvas.app!.view.onwheel = this.handlers.mw;
  }

  override destroy(...args) {
    CONFIG.SWADE.activeMeasuredTemplatePreview = null;
    this._removeListenersFromCanvas();
    return super.destroy(...args);
  }

  /** Remove the mouse listeners from the canvas */
  protected _removeListenersFromCanvas() {
    canvas.stage!.off('mousemove', this.handlers.mm);
    canvas.stage!.off('mousedown', this.handlers.lc);
    canvas.app!.view.oncontextmenu = null;
    canvas.app!.view.onwheel = null;
  }

  protected override _getConeShape(
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

  override highlightGrid() {
    //return early if te object doesn't actually exist yet
    if (!this.id || !this.shape) return;

    const highlightRAW = game.settings.get('swade', 'highlightTemplate');
    //defer to the core highlighting if the setting is off
    if (!highlightRAW) return super.highlightGrid();

    const grid = canvas.grid!;
    const color = Number(this.fillColor);
    const border = Number(this.borderColor);

    //get the highlight layer and prep it
    const layer = grid.getHighlightLayer(`Template.${this.id}`)!;
    layer.clear();

    //get the shape of the template and prep it
    const shape = this.shape.clone();
    if ('points' in shape) {
      shape.points = shape.points.map((p, i) => {
        if (i % 2) return this.y + p;
        else return this.x + p;
      });
    } else {
      shape.x += this.x;
      shape.y += this.y;
    }

    //draw the actual shape
    this._highlightGridArea(layer, { color, border, shape });
  }

  /** A re-implementation of `BaseGrid#highlightGridPosition()` to force gridless behavior */
  private _highlightGridArea(
    layer: GridHighlight,
    { color, border, alpha = 0.25, shape }: IGridHighLightOptions,
  ) {
    layer.beginFill(color, alpha);
    if (border) layer.lineStyle(2, border, Math.min(alpha * 1.5, 1.0));
    layer.drawShape(shape).endFill();
  }
}

interface IGridHighLightOptions {
  color: number;
  border?: number;
  alpha?: number;
  shape:
    | PIXI.Circle
    | PIXI.Ellipse
    | PIXI.Polygon
    | PIXI.Rectangle
    | PIXI.RoundedRectangle;
}
