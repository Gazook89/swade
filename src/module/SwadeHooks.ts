/* eslint-disable no-unused-vars */
import Bennies from './bennies';
import * as chat from './chat';
import { formatRoll } from './chat';
import DiceSettings from './DiceSettings';
import SwadeActor from './entities/SwadeActor';
import SwadeItem from './entities/SwadeItem';
import SwadeTemplate from './entities/SwadeTemplate';
import { ActorType } from './enums/ActorTypeEnum';
import { ItemType } from './enums/ItemTypeEnum';
import { TemplatePreset } from './enums/TemplatePresetEnum';
import { SwadeSetup } from './setup/setupHandler';
import SwadeCharacterSheet from './sheets/SwadeCharacterSheet';
import SwadeNPCSheet from './sheets/SwadeNPCSheet';
import SwadeVehicleSheet from './sheets/SwadeVehicleSheet';
import { createActionCardTable, createSwadeMacro } from './util';

export default class SwadeHooks {
  public static onSetup() {
    // Do anything after initialization but before ready
    // Localize CONFIG objects once up-front
    const toLocalize = [];
    for (let o of toLocalize) {
      CONFIG.SWADE[o] = Object.entries(CONFIG.SWADE[o]).reduce(
        (obj, e: any) => {
          obj[e[0]] = game.i18n.localize(e[1]);
          return obj;
        },
        {},
      );
    }
  }

  public static async onReady() {
    let packChoices = {};
    game.packs
      .filter((p) => p.entity === 'JournalEntry')
      .forEach((p) => {
        packChoices[
          p.collection
        ] = `${p.metadata.label} (${p.metadata.package})`;
      });

    game.settings.register('swade', 'cardDeck', {
      name: 'Card Deck to use for Initiative',
      scope: 'world',
      type: String,
      config: true,
      default: CONFIG.SWADE.init.defaultCardCompendium,
      choices: packChoices,
      onChange: async (choice) => {
        console.log(
          `Repopulating action cards Table with cards from deck ${choice}`,
        );
        await createActionCardTable(true, choice);
        ui.notifications.info('Table re-population complete');
      },
    });
    await SwadeSetup.setup();
    Hooks.on('hotbarDrop', (bar, data, slot) => createSwadeMacro(data, slot));
  }

  public static onPreCreateItem(createData: any, options: any, userId: string) {
    //Set default image if no image already exists
    if (!createData.img) {
      createData.img = `systems/swade/assets/icons/${createData.type}.svg`;
    }
  }

  public static onPreCreateOwnedItem(
    actor: SwadeActor,
    createData: any,
    options: any,
    userId: string,
  ) {
    //Set default image if no image already exists
    if (!createData.img) {
      createData.img = `systems/swade/assets/icons/${createData.type}.svg`;
    }
    if (createData.type === ItemType.Skill && options.renderSheet !== null) {
      options.renderSheet = true;
    }
  }

  public static onPreCreateActor(
    createData: any,
    options: any,
    userId: string,
  ) {
    //NO-OP
  }

  public static async onCreateActor(
    actor: SwadeActor,
    options: any,
    userId: string,
  ) {
    // Return early if we are NOT a GM OR we are not the player that triggered the update AND that player IS a GM
    const user = game.users.get(userId) as User;
    if (!game.user.isGM || (game.userId !== userId && user.isGM)) {
      return;
    }

    // Return early if the actor is not a player character
    if (actor.data.type !== ActorType.Character) {
      return;
    }
    const coreSkills = [
      'Athletics',
      'Common Knowledge',
      'Notice',
      'Persuasion',
      'Stealth',
      'Untrained',
    ];

    //Get and map the existing skills on the actor to an array of names
    const existingSkills = actor.items
      .filter((i: SwadeItem) => i.type === ItemType.Skill)
      .map((i: SwadeItem) => i.name);

    //Filter the expected
    const skillsToAdd = coreSkills.filter((s) => !existingSkills.includes(s));

    const skillIndex = (await game.packs
      .get('swade.skills')
      .getContent()) as SwadeItem[];

    actor.createEmbeddedEntity(
      'OwnedItem',
      skillIndex.filter((i) => skillsToAdd.includes(i.data.name)),
      { renderSheet: null },
    );
  }

  public static onRenderActorDirectory(
    app: ActorDirectory,
    html: JQuery<HTMLElement>,
    options: any,
  ) {
    // Mark all Wildcards in the Actors sidebars with an icon
    const found = html.find('.entity-name');

    let wildcards = app.entities.filter(
      (a: SwadeActor) => a.isWildcard && a.hasPlayerOwner,
    ) as SwadeActor[];

    //if the player is not a GM, then don't mark the NPC wildcards
    if (!game.settings.get('swade', 'hideNPCWildcards') || game.user.isGM) {
      const npcWildcards = app.entities.filter(
        (a: SwadeActor) => a.isWildcard && !a.hasPlayerOwner,
      ) as SwadeActor[];
      wildcards = wildcards.concat(npcWildcards);
    }

    for (let i = 0; i < found.length; i++) {
      const element = found[i];
      const enitityId = element.parentElement.dataset.entityId;
      let wildcard = wildcards.find((a) => a._id === enitityId);

      if (wildcard) {
        element.innerHTML = `
					<a><img src="systems/swade/assets/ui/wildcard.svg" class="wildcard-icon">${wildcard.data.name}</a>
					`;
      }
    }
  }

  public static async onRenderCompendium(
    app: Compendium,
    html: JQuery<HTMLElement>,
    data: any,
  ) {
    //Mark Wildcards in the compendium
    if (app.entity === 'Actor') {
      const content = await app.getContent();
      const wildcards = content.filter(
        (entity: SwadeActor) => entity.isWildcard,
      );
      const ids: string[] = wildcards.map((e) => e._id);

      const found = html.find('.directory-item');
      found.each((i, el) => {
        let entryId = el.dataset.entryId;
        if (ids.includes(entryId)) {
          const entityName = el.children[1];
          entityName.children[0].insertAdjacentHTML(
            'afterbegin',
            '<img src="systems/swade/assets/ui/wildcard-dark.svg" class="wildcard-icon">',
          );
        }
      });
      return false;
    }
  }

  public static onPreUpdateActor(
    actor: SwadeActor,
    updateData: any,
    options: any,
    userId: string,
  ) {
    //wildcards will be linked, extras unlinked
    if (
      updateData.data &&
      typeof updateData.data.wildcard !== 'undefined' &&
      game.settings.get('swade', 'autoLinkWildcards')
    ) {
      updateData.token = { actorLink: updateData.data.wildcard };
    }
  }

  public static onUpdateActor(
    actor: SwadeActor,
    updateData: any,
    options: any,
    userId: string,
  ) {
    if (actor.data.type === ActorType.NPC) {
      ui.actors.render();
    }
    // Update the player list to display new bennies values
    if (updateData?.data?.bennies) {
      ui['players'].render(true);
    }
  }

  public static onRenderCombatTracker(
    app: CombatTracker,
    html: JQuery<HTMLElement>,
    data: any,
  ) {
    const currentCombat: Combat =
      data.combats[data.currentIndex - 1] || data.combat;
    html.find('.combatant').each((i, el) => {
      const combId = el.getAttribute('data-combatant-id');
      const combatant = currentCombat.combatants.find((c) => c._id == combId);
      const initdiv = el.getElementsByClassName('token-initiative');
      if (combatant.initiative && combatant.initiative !== 0) {
        initdiv[0].innerHTML = `<span class="initiative">${combatant.flags.swade.cardString}</span>`;
      } else if (!game.user.isGM) {
        initdiv[0].innerHTML = '';
      }
    });
  }

  public static async onPreUpdateCombat(
    combat: any | Combat,
    updateData: any,
    options: any,
    userId: string,
  ) {
    // Return early if we are NOT a GM OR we are not the player that triggered the update AND that player IS a GM
    const user = game.users.get(userId) as User;
    if (!game.user.isGM || (game.userId !== userId && user.isGM)) {
      return;
    }

    // Return if this update does not contains a round
    if (!updateData.round) {
      return;
    }

    if (combat instanceof CombatEncounters) {
      combat = game.combats.get(updateData._id) as Combat;
    }

    // If we are not moving forward through the rounds, return
    if (updateData.round < 1 || updateData.round < combat.previous.round) {
      return;
    }

    // If Combat has just started, return
    if (
      (!combat.previous.round || combat.previous.round === 0) &&
      updateData.round === 1
    ) {
      return;
    }

    let jokerDrawn = false;

    // Reset the Initiative of all combatants
    combat.combatants.forEach((c) => {
      if (c.flags.swade && c.flags.swade.hasJoker) {
        jokerDrawn = true;
      }
    });

    const resetComs = combat.combatants.map((c) => {
      c.initiative = 0;
      c.hasRolled = false;
      c.flags.swade.cardValue = null;
      c.flags.swade.suitValue = null;
      c.flags.swade.hasJoker = null;
      return c;
    });

    updateData.combatants = resetComs;

    // Reset the deck if any combatant has had a Joker
    if (jokerDrawn) {
      const deck = game.tables.getName(
        CONFIG.SWADE.init.cardTable,
      ) as RollTable;
      await deck.reset();
      ui.notifications.info('Card Deck automatically reset');
    }

    //Init autoroll
    if (game.settings.get('swade', 'autoInit')) {
      const combatantIds = combat.combatants.map((c) => c._id);
      await combat.rollInitiative(combatantIds);
    }
  }

  public static onUpdateCombat(
    combat: Combat,
    updateData,
    options,
    userId: string,
  ) {
    let string = `Round ${combat.round} - Turn ${combat.turn}\n`;
    for (let i = 0; i < combat.turns.length; i++) {
      const element = combat.turns[i];
      string = string.concat(`${i}) ${element['token']['name']}\n`);
    }
    console.log(string);
  }

  public static onDeleteCombat(combat: Combat, options: any, userId: string) {
    if (!game.user.isGM || !game.users.get(userId).isGM) {
      return;
    }
    const jokers = combat.combatants.filter(
      (c) => c.flags.swade && c.flags.swade.hasJoker,
    );

    //reset the deck when combat is ended in a round that a Joker was drawn in
    if (jokers.length > 0) {
      const deck = game.tables.getName(
        CONFIG.SWADE.init.cardTable,
      ) as RollTable;
      deck.reset().then(() => {
        ui.notifications.info('Card Deck automatically reset');
      });
    }
  }

  public static async onRenderChatMessage(
    message: ChatMessage,
    html: JQuery<HTMLElement>,
    data: any,
  ) {
    if (message.isRoll && message.isContentVisible) {
      await formatRoll(message, html, data);
    }

    chat.hideChatActionButtons(message, html, data);
  }

  public static async onRenderPlayerList(
    list: any,
    html: JQuery<HTMLElement>,
    options: any,
  ) {
    html.find('.player').each((id, player) => {
      Bennies.append(player, options);
    });
  }

  public static onRenderChatLog(app, html: JQuery<HTMLElement>, data: any) {
    chat.chatListeners(html);
  }

  public static onGetUserContextOptions(
    html: JQuery<HTMLElement>,
    context: any[],
  ) {
    let players = html.find('#players');
    if (!players) return;
    context.push(
      {
        name: game.i18n.localize('SWADE.BenniesGive'),
        icon: '<i class="fas fa-plus"></i>',
        condition: (li) =>
          game.user.isGM && game.users.get(li[0].dataset.userId).isGM,
        callback: (li) => {
          const selectedUser = game.users.get(li[0].dataset.userId);
          selectedUser
            .setFlag(
              'swade',
              'bennies',
              selectedUser.getFlag('swade', 'bennies') + 1,
            )
            .then(async () => {
              ui['players'].render(true);
              if (game.settings.get('swade', 'notifyBennies')) {
                //In case one GM gives another GM a benny a different message should be displayed
                let givenEvent = selectedUser !== game.user;
                chat.createGmBennyAddMessage(selectedUser, givenEvent);
              }
            });
        },
      },
      {
        name: game.i18n.localize('SWADE.BenniesRefresh'),
        icon: '<i class="fas fa-sync"></i>',
        condition: (li) => game.user.isGM,
        callback: (li) => {
          const user = game.users.get(li[0].dataset.userId);
          Bennies.refresh(user);
        },
      },
      {
        name: game.i18n.localize('SWADE.AllBenniesRefresh'),
        icon: '<i class="fas fa-sync"></i>',
        condition: (li) => game.user.isGM,
        callback: (li) => {
          Bennies.refreshAll();
        },
      },
    );
  }

  public static onGetSceneControlButtons(sceneControlButtons: any[]) {
    const measure = sceneControlButtons.find((a) => a.name === 'measure');
    let template: SwadeTemplate = null;
    const newButtons = [
      {
        name: 'swcone',
        title: 'SWADE.Cone',
        icon: 'cone far fa-circle',
        visible: true,
        button: true,
        onClick: () => {
          template = SwadeTemplate.fromPreset(TemplatePreset.CONE);
          if (template) template.drawPreview(event);
        },
      },
      {
        name: 'sbt',
        title: 'SWADE.SBT',
        icon: 'sbt far fa-circle',
        visible: true,
        button: true,
        onClick: () => {
          template = SwadeTemplate.fromPreset(TemplatePreset.SBT);
          if (template) template.drawPreview(event);
        },
      },
      {
        name: 'mbt',
        title: 'SWADE.MBT',
        icon: 'mbt far fa-circle',
        visible: true,
        button: true,
        onClick: () => {
          template = SwadeTemplate.fromPreset(TemplatePreset.MBT);
          if (template) template.drawPreview(event);
        },
      },
      {
        name: 'lbt',
        title: 'SWADE.LBT',
        icon: 'lbt far fa-circle',
        visible: true,
        button: true,
        onClick: () => {
          template = SwadeTemplate.fromPreset(TemplatePreset.LBT);
          if (template) template.drawPreview(event);
        },
      },
    ];
    measure.tools.splice(measure.tools.length - 1, 0, ...newButtons);
  }

  public static onDropActorSheetData(
    actor: SwadeActor,
    sheet: SwadeCharacterSheet | SwadeNPCSheet | SwadeVehicleSheet,
    data: any,
  ) {
    if (data.type === 'Actor' && actor.data.type === ActorType.Vehicle) {
      const vehicleSheet = sheet as SwadeVehicleSheet;
      const activeTab = getProperty(vehicleSheet, '_tabs')[0].active;
      if (activeTab === 'summary') {
        vehicleSheet.setDriver(data.id);
      }
      return false;
    }
  }

  public static async onRenderCombatantConfig(
    app: FormApplication,
    html: JQuery<HTMLElement>,
    options: any,
  ) {
    // resize the element so it'll fit the new stuff
    html.css({ height: 'auto' });

    //remove the old initiative input
    html.find('input[name="initiative"]').parents('div.form-group').remove();

    //grab cards and sort them
    const cardPack = game.packs.get(
      game.settings.get('swade', 'cardDeck'),
    ) as Compendium;
    let cards = (await cardPack.getContent()).sort((a, b) => {
      const cardA = a.getFlag('swade', 'cardValue');
      const cardB = b.getFlag('swade', 'cardValue');
      let card = cardA - cardB;
      if (card !== 0) return card;
      const suitA = a.getFlag('swade', 'suitValue');
      const suitB = b.getFlag('swade', 'suitValue');
      let suit = suitA - suitB;
      return suit;
    }) as JournalEntry[];

    //prep list of cards for selection
    let cardTable = game.tables.getName(CONFIG.SWADE.init.cardTable);

    let cardList = [];
    for (let card of cards) {
      const cardValue = card.getFlag('swade', 'cardValue') as number;
      const suitValue = card.getFlag('swade', 'suitValue') as number;
      const color =
        suitValue === 2 || suitValue === 3 ? 'color: red;' : 'color: black;';
      const isDealt =
        options.object.flags.swade &&
        options.object.flags.swade.cardValue === cardValue &&
        options.object.flags.swade.suitValue === suitValue;
      const isAvailable = cardTable.results.find((r) => r.text === card.name)
        .drawn
        ? 'text-decoration: line-through;'
        : '';

      cardList.push({
        cardValue,
        suitValue,
        isDealt,
        color,
        isAvailable,
        name: card.name,
        cardString: getProperty(card, 'data.content'),
        isJoker: card.getFlag('swade', 'isJoker'),
      });
    }
    const numberOfJokers = cards.filter((c) => c.getFlag('swade', 'isJoker'))
      .length;

    //render and inject new HTML
    const path = 'systems/swade/templates/combatant-config-cardlist.html';
    $(await renderTemplate(path, { cardList, numberOfJokers })).insertBefore(
      `#${options.options.id} footer`,
    );

    //Attach click event to button which will call the combatant update as we can't easily modify the submit function of the FormApplication
    html.find('footer button').on('click', (ev) => {
      const selectedCard = html.find('input[name=ActionCard]:checked');
      if (selectedCard.length === 0) {
        return;
      }
      const cardValue = selectedCard.data().cardValue as number;
      const suitValue = selectedCard.data().suitValue as number;
      const hasJoker = selectedCard.data().isJoker;

      game.combat.updateEmbeddedEntity('Combatant', {
        _id: options.object._id,
        initiative: suitValue + cardValue,
        'flags.swade': {
          cardValue,
          suitValue,
          hasJoker,
          cardString: selectedCard.val(),
        },
      });
    });
    return false;
  }

  public static onDiceSoNiceInit(dice3d: any) {
    game.settings.register('swade', 'dsnShowBennyAnimation', {
      name: game.i18n.localize('SWADE.ShowBennyAnimation'),
      hint: game.i18n.localize('SWADE.ShowBennyAnimationDesc'),
      default: true,
      scope: 'client',
      type: Boolean,
      config: false,
    });

    game.settings.register('swade', 'dsnWildDie', {
      name: game.i18n.localize('SWADE.WildDiePreset'),
      hint: game.i18n.localize('SWADE.WildDiePresetDesc'),
      default: 'none',
      scope: 'client',
      type: String,
      config: false,
    });

    game.settings.register('swade', 'dsnCustomWildDieOptions', {
      default: {
        font: 'auto',
        material: 'auto',
        texture: 'none',
      },
      scope: 'client',
      type: Object,
      config: false,
    });

    game.settings.register('swade', 'dsnCustomWildDieColors', {
      default: {
        labelColor: '#000000',
        diceColor: game.user['color'],
        outlineColor: game.user['color'],
        edgeColor: game.user['color'],
      },
      scope: 'client',
      type: Object,
      config: false,
    });

    game.settings.registerMenu('swade', 'dice-config', {
      name: game.i18n.localize('SWADE.DiceConf'),
      label: game.i18n.localize('SWADE.DiceConfLabel'),
      hint: game.i18n.localize('SWADE.DiceConfDesc'),
      icon: 'fas fa-dice',
      type: DiceSettings,
      restricted: false,
    });
  }

  public static onDiceSoNiceReady(dice3d: any) {
    const customWilDieColors = game.settings.get(
      'swade',
      'dsnCustomWildDieColors',
    );

    const customWilDieOptions = game.settings.get(
      'swade',
      'dsnCustomWildDieOptions',
    );

    dice3d.addColorset(
      {
        name: 'customWildDie',
        description: 'DICESONICE.ColorCustom',
        category: 'DICESONICE.Colors',
        foreground: customWilDieColors.labelColor,
        background: customWilDieColors.diceColor,
        outline: customWilDieColors.outlineColor,
        edge: customWilDieColors.edgeColor,
        texture: customWilDieOptions.texture,
        material: customWilDieOptions.material,
        font: customWilDieOptions.font,
      },
      'no',
    );

    dice3d.addDicePreset(
      {
        type: 'db',
        labels: [
          CONFIG.SWADE.bennyTextures.front,
          CONFIG.SWADE.bennyTextures.back,
        ],
        system: 'standard',
        colorset: 'black',
      },
      'd2',
    );
  }
}
