//TODO Come back and check on this code before release for the migrations
export async function migrateWorld() {
  ui.notifications.info(
    `Applying SWADE System Migration for version ${game.system.data.version}. Please be patient and do not close your game or shut down your server.`,
    { permanent: true },
  );

  // Migrate World Actors
  for (const a of game.actors.entities) {
    try {
      const updateData = migrateActorData(a.data);
      if (!isObjectEmpty(updateData)) {
        console.log(`Migrating Actor entity ${a.name}`);
        await a.update(updateData, { enforceTypes: false });
      }
    } catch (err) {
      err.message = `Failed swade system migration for Actor ${a.name}: ${err.message}`;
      console.error(err);
    }
  }

  // Migrate World Items
  for (const i of game.items.entities) {
    try {
      const updateData = migrateItemData(i.data);
      if (!isObjectEmpty(updateData)) {
        console.log(`Migrating Item entity ${i.name}`);
        await i.update(updateData, { enforceTypes: false });
      }
    } catch (err) {
      err.message = `Failed swade system migration for Item ${i.name}: ${err.message}`;
      console.error(err);
    }
  }

  // Migrate World Compendium Packs
  for (const p of game.packs) {
    if (!(p instanceof Compendium)) continue;
    if (p.metadata.package !== 'world') continue;
    if (!['Actor', 'Item', 'Scene'].includes(p.metadata.entity)) continue;
    await migrateCompendium(p);
  }

  // Set the migration as complete
  game.settings.set(
    'swade',
    'systemMigrationVersion',
    game.system.data.version,
  );
  ui.notifications.info(
    `SWADE System Migration to version ${game.system.data.version} completed!`,
    { permanent: true },
  );
}

/**
 * Apply migration rules to all Entities within a single Compendium pack
 * @param pack The compendium to migrate. Only Actor, Item or Scene compendiums are processed
 */
export async function migrateCompendium(pack: Compendium) {
  const entity = pack.metadata.entity;
  if (!['Actor', 'Item', 'Scene'].includes(entity)) return;

  // Unlock the pack for editing
  const wasLocked = pack.locked;
  await pack.configure({ locked: false });

  // Begin by requesting server-side data model migration and get the migrated content
  await pack.migrate({});
  const content = await pack.getContent();

  // Iterate over compendium entries - applying fine-tuned migration functions
  for (const ent of content) {
    let updateData = {};
    try {
      switch (entity) {
        case 'Actor':
          updateData = migrateActorData(ent.data);
          break;
        case 'Item':
          updateData = migrateItemData(ent.data);
          break;
        case 'Scene':
          updateData = migrateSceneData(ent.data);
          break;
      }
      if (isObjectEmpty(updateData)) continue;

      // Save the entry, if data was changed
      updateData['_id'] = ent._id;
      await pack.updateEntity(updateData);
      console.log(
        `Migrated ${entity} entity ${ent.name} in Compendium ${pack.collection}`,
      );
    } catch (err) {
      // Handle migration failures
      err.message = `Failed swade system migration for entity ${ent.name} in pack ${pack.collection}: ${err.message}`;
      console.error(err);
    }
  }

  // Apply the original locked status for the pack
  pack.configure({ locked: wasLocked });
  console.log(
    `Migrated all ${entity} entities from Compendium ${pack.collection}`,
  );
}

/* -------------------------------------------- */
/*  Entity Type Migration Helpers               */
/* -------------------------------------------- */

/**
 * Migrate a single Actor entity to incorporate latest data model changes
 * Return an Object of updateData to be applied
 * @param {object} actorData    The actor data object to update
 * @return {Object}         The updateData to apply
 */
export function migrateActorData(actorData) {
  const updateData = {};

  // Actor Data Updates
  _migrateVehicleOperator(actorData, updateData);

  // Migrate Owned Items
  if (!actorData.items) return updateData;
  let hasItemUpdates = false;
  const items = actorData.items.map((i) => {
    // Migrate the Owned Item
    const itemUpdate = migrateItemData(i);

    // Update the Owned Item
    if (!isObjectEmpty(itemUpdate)) {
      hasItemUpdates = true;
      return mergeObject(i, itemUpdate, {
        enforceTypes: false,
        inplace: false,
      });
    } else return i;
  });
  if (hasItemUpdates) updateData['items'] = items;
  return updateData;
}

export function migrateItemData(itemData) {
  console.log(itemData);
  const updateData = {};
  return updateData;
}

/**
 * Migrate a single Scene entity to incorporate changes to the data model of it's actor data overrides
 * Return an Object of updateData to be applied
 * @param {Object} sceneData  The Scene data to Update
 * @return {Object}       The updateData to apply
 */
export function migrateSceneData(sceneData) {
  const tokens = sceneData.tokens.map((token) => {
    const t = token.toJSON();
    if (!t.actorId || t.actorLink) {
      t.actorData = {};
    } else if (!game.actors.has(t.actorId)) {
      t.actorId = null;
      t.actorData = {};
    } else if (!t.actorLink) {
      const actorData = duplicate(t.actorData);
      actorData.type = token.actor?.type;
      const update = migrateActorData(actorData);
      ['items', 'effects'].forEach((embeddedName) => {
        if (!update[embeddedName]?.length) return;
        const updates = new Map(update[embeddedName].map((u) => [u._id, u]));
        t.actorData[embeddedName].forEach((original) => {
          const update = updates.get(original._id);
          if (update) mergeObject(original, update);
        });
        delete update[embeddedName];
      });

      mergeObject(t.actorData, update);
    }
    return t;
  });
  return { tokens };
}

/**
 * Purge the data model of any inner objects which have been flagged as _deprecated.
 * @param {object} data   The data to clean
 * @private
 */
export function removeDeprecatedObjects(data) {
  for (const [k, v] of Object.entries(data)) {
    if (getType(v) === 'Object') {
      if (v['_deprecated'] === true) {
        console.log(`Deleting deprecated object key ${k}`);
        delete data[k];
      } else removeDeprecatedObjects(v);
    }
  }
  return data;
}

function _migrateVehicleOperator(actorData, updateData) {
  if (actorData.type !== 'vehicle') return updateData;
  const driverId = actorData.data.driver.id;
  const hasOldID = !!driverId && driverId.split('.').length === 1;
  if (hasOldID) {
    updateData['data.driver.id'] = `Actor.${driverId}`;
  }
  return updateData;
}
