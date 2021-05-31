import { SWADE } from './config';
import { getCanvas } from './util';

export function listenJournalDrop() {
  // Grabbing the image url from the journal entry
  function _onDragStart(event) {
    event.stopPropagation();
    const url = event.srcElement.style.backgroundImage
      .slice(4, -1)
      .replace(/"/g, '');
    const dragData = { type: 'image', src: url };
    event.dataTransfer.setData('text/plain', JSON.stringify(dragData));
  }

  // Create the tile with the gathered informations
  async function _onDropImage(event, data: { type: string; src: string }) {
    if (data.type == 'image') {
      // Projecting screen coords to the canvas
      const t = getCanvas().tiles.worldTransform;
      // Determine the tile size
      const tex = await loadTexture(data.src);

      const tileData = {
        img: data.src as string,
        width: (SWADE.imagedrop.height * tex.width) / tex.height,
        height: SWADE.imagedrop.height,
        x: (event.clientX - t.tx) / getCanvas().stage.scale.x,
        y: (event.clientY - t.ty) / getCanvas().stage.scale.y,
        z: 400,
        scale: 1,
        hidden: false,
        locked: false,
        rotation: 0,
      };

      Tile.create(tileData);
    }
  }

  // Add the listener to the board html element
  Hooks.once('canvasReady', () => {
    document.getElementById('board').addEventListener('drop', (event) => {
      // Try to extract the data (type + src)
      let data: any;
      try {
        data = JSON.parse(event.dataTransfer.getData('text/plain'));
      } catch (err) {
        return;
      }
      // Create the tile
      _onDropImage(event, data);
    });
  });

  // Add the listener for draggable event from the journal image
  Hooks.on('renderJournalSheet', (sheet: any, html: any) => {
    html.find('.lightbox-image').each((i: number, div: Element) => {
      div.setAttribute('draggable', 'true');
      div.addEventListener('dragstart', _onDragStart, false);
    });
  });
}
