import { SWADE } from './config';

export const listenJournalDrop = function () {
  // Grabbing the image url from the journal entry
  function _onDragStart(event: any) {
    event.stopPropagation();
    const url = event.srcElement.style.backgroundImage
      .slice(4, -1)
      .replace(/"/g, '');
    const dragData = { type: 'image', src: url };
    event.dataTransfer.setData('text/plain', JSON.stringify(dragData));
  }

  // Create the tile with the gathered informations
  async function _onDropImage(event, data) {
    if (data.type == 'image') {
      // Projecting screen coords to the canvas
      const t = canvas.tiles.worldTransform;
      // Determine the tile size
      const tex = await loadTexture(data.src);

      const tileData = {
        img: data.src,
        width: (SWADE.imagedrop.height * tex.width) / tex.height,
        height: SWADE.imagedrop.height,
        x: (event.clientX - t.tx) / canvas.stage.scale.x,
        y: (event.clientY - t.ty) / canvas.stage.scale.y,
        scale: 1,
        z: 400,
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
};
