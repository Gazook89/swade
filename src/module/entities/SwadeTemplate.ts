import { TemplatePreset } from '../enums/TemplatePresetEnum';
import { getCanvas } from '../util';

/**
 * A helper class for building MeasuredTemplates for SWADE Burst Templates
 * @noInheritDoc
 */
export default class SwadeTemplate extends MeasuredTemplate {
  moveTime = 0;

  //The initially active CanvasLayer to re-activate after the workflow is complete
  initialLayer: CanvasLayer = null;

  handlers = {
    mm: null,
    rc: null,
    lc: null,
    mw: null,
  };

  /**
   * A factory method to create a SwadeTemplate instance using provided preset
   * @param preset the preset to use.
   * @returns SwadeTemplate | null
   */
  static fromPreset(preset: TemplatePreset) {
    // Prepare template data
    const templateData: Partial<MeasuredTemplate.Data> = {
      user: game.user.id,
      distance: 0,
      direction: 0,
      x: 0,
      y: 0,
      fillColor: game.user.color,
    };

    //Set template data based on preset option
    switch (preset) {
      case TemplatePreset.CONE:
        templateData.t = 'cone';
        templateData.distance = 9;
        break;
      case TemplatePreset.SBT:
        templateData.t = 'circle';
        templateData.distance = 1;
        break;
      case TemplatePreset.MBT:
        templateData.t = 'circle';
        templateData.distance = 2;
        break;
      case TemplatePreset.LBT:
        templateData.t = 'circle';
        templateData.distance = 3;
        break;
      default:
        return null;
    }

    // Return the template constructed from the item data

    const cls = CONFIG.MeasuredTemplate.documentClass;

    const template = new cls(templateData, { parent: canvas.scene });
    const object = new this(template);
    return object;
  }

  /* -------------------------------------------- */

  /**
   * Creates a preview of the template
   * @param {Event} event   The initiating click event
   */
  drawPreview() {
    this.layer.preview.removeChildren();
    this.initialLayer = getCanvas().activeLayer;
    this.layer.preview.addChild(this);
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
      const snapped = getCanvas().grid.getSnappedPosition(
        center.x,
        center.y,
        2,
      );

      this.data.update({ x: snapped.x, y: snapped.y });
      this.refresh();
      this.moveTime = now;
    };

    // Cancel the workflow (right-click)
    this.handlers.rc = () => {
      this.layer.preview.removeChildren();
      getCanvas().stage.off('mousemove', this.handlers.mm);
      getCanvas().stage.off('mousedown', this.handlers.lc);
      getCanvas().app.view.oncontextmenu = null;
      getCanvas().app.view.onwheel = null;
      this.initialLayer.activate();
    };

    // Confirm the workflow (left-click)
    this.handlers.lc = (event) => {
      event.stopPropagation();
      this.handlers.rc(event);

      // Confirm final snapped position
      const destination = getCanvas().grid.getSnappedPosition(
        this.data.x,
        this.data.y,
        2,
      );

      this.data.update(destination);

      // Create the template
      getCanvas()
        .scene.createEmbeddedDocuments('MeasuredTemplate', [this.data])
        .then(() => this.destroy());
    };

    // Rotate the template by 3 degree increments (mouse-wheel)
    this.handlers.mw = (event) => {
      if (event.ctrlKey) event.preventDefault(); // Avoid zooming the browser window
      event.stopPropagation();
      const delta = getCanvas().grid.type > CONST.GRID_TYPES.SQUARE ? 30 : 15;
      const snap = event.shiftKey ? delta : 5;

      this.data.update({
        direction: this.data.direction + snap * Math.sign(event.deltaY),
      });
      this.refresh();
    };

    // Activate listeners
    getCanvas().stage.on('mousemove', this.handlers.mm);
    getCanvas().stage.on('mousedown', this.handlers.lc);
    getCanvas().app.view.oncontextmenu = this.handlers.rc;
    getCanvas().app.view.onwheel = this.handlers.mw;
  }

  destroy(...args) {
    super.destroy(...args);
    this.handlers.rc();
  }
}
