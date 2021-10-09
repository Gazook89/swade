import { MeasuredTemplateConstructorDataData } from '../../interfaces/TemplateConfig';
import { TemplatePreset } from '../enums/TemplatePresetEnum';
import { getCanvas } from '../util';

declare global {
  interface ObjectClassConfig {
    MeasuredTemplate: SwadeMeasuredTemplate;
  }
}

export default class SwadeMeasuredTemplate extends MeasuredTemplate {
  moveTime = 0;
  //The initially active CanvasLayer to re-activate after the workflow is complete
  initialLayer: CanvasLayer;
  handlers: MouseInterActionHandlers = {
    mm: () => {},
    rc: () => {},
    lc: () => {},
    mw: () => {},
  };

  /**
   * A factory method to create a SwadeMeasuredTemplate instance using provided preset
   * @param preset the preset to use.
   * @returns The constructed template object or null if no preset was found
   */
  static fromPreset(preset: TemplatePreset | string) {
    if (CONFIG.SWADE.activeTemplate) {
      CONFIG.SWADE.activeTemplate.destroy();
      CONFIG.SWADE.activeTemplate = null;
    }
    CONFIG.SWADE.activeTemplate = this._constructPreset(preset);
    if (CONFIG.SWADE.activeTemplate) CONFIG.SWADE.activeTemplate.drawPreview();
  }

  static _constructPreset(preset: TemplatePreset | string) {
    // Prepare template data
    const templateBaseData: MeasuredTemplateConstructorDataData = {
      user: game.user!.id,
      distance: 0,
      direction: 0,
      x: 0,
      y: 0,
      fillColor: game.user!.data.color,
    };

    const presetProtype = CONFIG.SWADE.templates.find(
      (c) => c.button.name === preset,
    );
    if (!presetProtype) return null;

    //Set template data based on preset option

    const document = CONFIG.MeasuredTemplate.documentClass;
    const template = new document(
      foundry.utils.mergeObject(templateBaseData, presetProtype.data),
      {
        parent: getCanvas().scene as Scene,
      },
    );

    //Return the template constructed from the item data
    return new this(template);
  }

  /* -------------------------------------------- */
  /**
   * Creates a preview of the template
   * @param {Event} event   The initiating click event
   */
  drawPreview() {
    this.layer?.preview?.removeChildren();
    this.initialLayer = getCanvas().activeLayer!;
    this.layer?.preview?.addChild(this);
    this.activatePreviewListeners();
    this.draw();
    this.layer.activate();
  }
  /* -------------------------------------------- */
  /**
   * Activate listeners for the template preview
   */
  activatePreviewListeners() {
    // Update placement (mouse-move)
    this.handlers.mm = (event) => {
      event.stopPropagation();
      const now = Date.now(); // Apply a 20ms throttle
      if (now - this.moveTime <= 20) return;
      const center = event.data.getLocalPosition(this.layer);
      const snapped = getCanvas().grid?.getSnappedPosition(
        center.x,
        center.y,
        2,
      );
      this.data.update({ x: snapped?.x, y: snapped?.y });
      this.refresh();
      this.moveTime = now;
    };

    // Cancel the workflow (right-click)
    this.handlers.rc = () => {
      this.layer?.preview?.removeChildren();
      getCanvas()!.stage!.off('mousemove', this.handlers.mm);
      getCanvas()!.stage!.off('mousedown', this.handlers.lc);
      getCanvas()!.app!.view.oncontextmenu = null;
      getCanvas()!.app!.view.onwheel = null;
      this.initialLayer.activate();
    };

    // Confirm the workflow (left-click)
    this.handlers.lc = async (event) => {
      event.stopPropagation();
      this.handlers.rc(event);
      // Confirm final snapped position
      const destination = getCanvas().grid?.getSnappedPosition(
        this.data.x,
        this.data.y,
        2,
      );
      this.data.update(destination);
      // Create the template
      await getCanvas().scene?.createEmbeddedDocuments('MeasuredTemplate', [
        this.data.toObject(),
      ]);
      this.destroy();
    };

    // Rotate the template by 3 degree increments (mouse-wheel)
    this.handlers.mw = (event) => {
      if (event.ctrlKey) event.preventDefault(); // Avoid zooming the browser window
      event.stopPropagation();
      const delta = getCanvas().grid!.type > CONST.GRID_TYPES.SQUARE ? 30 : 15;
      const snap = event.shiftKey ? delta : 5;
      this.data.update({
        direction: this.data.direction + snap * Math.sign(event.deltaY),
      });
      this.refresh();
    };
    // Activate listeners
    getCanvas()!.stage!.on('mousemove', this.handlers.mm);
    getCanvas()!.stage!.on('mousedown', this.handlers.lc);
    getCanvas()!.app!.view.oncontextmenu = this.handlers.rc;
    getCanvas()!.app!.view.onwheel = this.handlers.mw;
  }

  destroy(...args) {
    super.destroy(...args);
    this.handlers.rc();
  }

  protected _getConeShape(
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

interface MouseInterActionHandlers {
  mm: (...args) => void;
  rc: (...args) => void;
  lc: (...args) => void;
  mw: (...args) => void;
}
