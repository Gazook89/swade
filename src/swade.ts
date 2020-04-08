/**
 * This is your TypeScript entry file for Foundry VTT.
 * Register custom settings, sheets, and constants using the Foundry API.
 * Change this heading to be more descriptive to your system, or remove it.
 * Author: FloRad
 * Content License: [copyright and-or license] If using an existing system
 * 					you may want to put a (link to a) license or copyright
 * 					notice here (e.g. the OGL).
 * Software License: [your license] Put your desired license here, which
 * 					 determines how others may use and modify your system
 */

// Import TypeScript modules
import { registerSettings } from './module/settings';
import { registerCustomHelpers } from './module/handlebarsHelpers'
import { preloadHandlebarsTemplates } from './module/preloadTemplates';
import { SwadeCharacterSheet } from './module/character-sheet';
import { SwadeNPCSheet } from './module/npc-sheet';
import { SwadeItemSheet } from './module/item-sheet';
import { SWADE } from './module/config'
import { isIncapacitated, setIncapacitationSymbol } from './module/util';
import { swadeSetup } from './module/setup/setupHandler';
import { rollInitiative } from './module/init/swadeInit';
import { compile } from 'handlebars';

/* ------------------------------------ */
/* Initialize system					*/
/* ------------------------------------ */
Hooks.once('init', async function () {
	console.log(`SWADE | Initializing Savage Worlds Adventure Edition\n${SWADE.ASCII}`);

	// Record Configuration Values
	CONFIG.SWADE = SWADE;
	//CONFIG.debug.hooks = true;
	//CONFIG.Combat.entityClass = SwadeCombat;
	Combat.prototype.rollInitiative = rollInitiative;
	//Combat.prototype.setupTurns = setupTurns;


	//Register custom Handlebars helpers
	registerCustomHelpers();

	// Register custom system settings
	registerSettings();

	// Register custom sheets (if any)
	Actors.unregisterSheet('core', ActorSheet);
	Actors.registerSheet('swade', SwadeCharacterSheet, { types: ['character'], makeDefault: true });
	Actors.registerSheet('swade', SwadeNPCSheet, { types: ['npc'], makeDefault: true });
	Items.unregisterSheet('core', ItemSheet);
	Items.registerSheet('swade', SwadeItemSheet, { makeDefault: true });

	// Preload Handlebars templates
	await preloadHandlebarsTemplates();
});

/* ------------------------------------ */
/* Setup system							*/
/* ------------------------------------ */
Hooks.once('setup', function () {
	// Do anything after initialization but before
	// ready

});

/* ------------------------------------ */
/* When ready							*/
/* ------------------------------------ */
Hooks.once('ready', async () => {
	await swadeSetup();
});

// Add any additional hooks if necessary
Hooks.on('preCreateItem', function (items: Items, item: any, options: any) {
	//Set default image if no image already exists
	if (!item.img) {
		item.img = `systems/swade/assets/icons/${item.type}.svg`;
	}
});

// Mark all Wildcards in the Actors sidebars with an icon
Hooks.on('renderActorDirectory', (app, html: JQuery<HTMLElement>, data) => {

	const wildcards: Actor[] = app.entities.filter((a: Actor) => a.data.type === 'character' || a.getFlag('swade', 'isWildcard'));
	const found = html.find(".entity-name");

	wildcards.forEach((wc: Actor) => {
		for (let i = 0; i < found.length; i++) {
			const element = found[i];
			if (element.innerText === wc.data.name) {
				element.innerHTML = `
					<a><img src="systems/swade/assets/ui/wildcard.svg" class="wildcard-icon">${wc.data.name}</a>
					`
			}
		}
	});
});

Hooks.on('renderCompendium', async (app, html: JQuery<HTMLElement>, data) => {
	if (app.metadata.entity !== 'Actor') {
		return
	}
	const content = await app.getContent();
	const wildcards = content.filter((entity: Actor) => entity.data.type === 'character' || entity.getFlag('swade', 'isWildcard'));
	const names: string[] = wildcards.map(e => e.data.name);

	const found = html.find('.entry-name');
	found.each((i, el) => {
		const name = names.find(name => name === el.innerText)
		if (!name) {
			return;
		}
		el.innerHTML = `<a><img src="systems/swade/assets/ui/wildcard-dark.svg" class="wildcard-icon">${name}</a>`
	});
});

Hooks.on('renderActorSheet', (app, html: JQuery<HTMLElement>, data) => {
	const actor = data.actor;
	const wounds = actor.data.wounds;
	const fatigue = actor.data.fatigue;
	const isIncap = isIncapacitated(wounds, fatigue);

	if (isIncap) {
		html.find('.incap-img').addClass('fade-in-05');
	}
});

Hooks.on('updateActor', (actor: Actor, updates: any, object: Object, id: string) => {
	if (actor.data.type === 'npc') {
		ui.actors.render();
	}
});

Hooks.on('renderCombatTracker ', (app, html: JQuery<HTMLElement>, data) => {
	console.log('###################################');
	const currentCombat = data.combats[data.combatCount - 1];
	console.log(currentCombat);
	html.find('.combatant').each((i, el) => {
		const combId = el.getAttribute('data-combatant-id');
		console.log(combId);
		const combatant = currentCombat.data.combatants.find(c => c.id = combId);
		console.log(combatant);
		// if (combatant.flags.actionCard && combatant.flags.actionCard.cardString) {
		// 	el.children[3].innerHTML = `<span class="initiative">${combatant.flags.actionCard.cardString}</span>`
		// }
	});
});
