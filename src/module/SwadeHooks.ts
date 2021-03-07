/* eslint-disable @typescript-eslint/no-unused-vars */
import { SysItemData } from '../interfaces/item-data';
import Bennies from './bennies';
import * as chat from './chat';
import { formatRoll } from './chat';
import { SWADE } from './config';
import DiceSettings from './DiceSettings';
import SwadeActor from './entities/SwadeActor';
import SwadeItem from './entities/SwadeItem';
import SwadeTemplate from './entities/SwadeTemplate';
import { TemplatePreset } from './enums/TemplatePresetEnum';
import { SwadeSetup } from './setup/setupHandler';
import CharacterSheet from './sheets/official/CharacterSheet';
import SwadeCharacterSheet from './sheets/SwadeCharacterSheet';
import SwadeNPCSheet from './sheets/SwadeNPCSheet';
import SwadeVehicleSheet from './sheets/SwadeVehicleSheet';
import { createActionCardTable, createSwadeMacro } from './util';

export default class SwadeHooks {
  public static onSetup() {
    // Do anything after initialization but before ready
    // Localize CONFIG objects once up-front
    const toLocalize = [];
    for (const o of toLocalize) {
      SWADE[o] = Object.entries(SWADE[o]).reduce((obj, e: any) => {
        obj[e[0]] = game.i18n.localize(e[1]);
        return obj;
      }, {});
    }
  }

  public static async onReady() {
    const packChoices = {};
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
      default: SWADE.init.defaultCardCompendium,
      choices: packChoices,
      onChange: async (choice: string) => {
        console.log(
          `Repopulating action cards Table with cards from deck ${choice}`,
        );
        await createActionCardTable(true, choice);
        ui.notifications.info('Table re-population complete');
      },
    });
    await SwadeSetup.setup();
    Hooks.on('hotbarDrop', (bar, data, slot) => createSwadeMacro(data, slot));

    SWADE.diceConfig.flags = {
      dsnShowBennyAnimation: {
        type: Boolean,
        default: true,
        label: game.i18n.localize('SWADE.ShowBennyAnimation'),
        hint: game.i18n.localize('SWADE.ShowBennyAnimationDesc'),
      },
      dsnWildDie: {
        type: String,
        default: 'none',
        label: game.i18n.localize('SWADE.WildDiePreset'),
        hint: game.i18n.localize('SWADE.WildDiePresetDesc'),
      },
      dsnCustomWildDieColors: {
        type: Object,
        default: {
          labelColor: '#000000',
          diceColor: game.user['color'],
          outlineColor: game.user['color'],
          edgeColor: game.user['color'],
        },
      },
      dsnCustomWildDieOptions: {
        type: Object,
        default: {
          font: 'auto',
          material: 'auto',
          texture: 'none',
        },
      },
    };
  }

  public static onPreCreateItem(createData: any, options: any, userId: string) {
    //Set default image if no image already exists
    if (!createData.img) {
      createData.img = `systems/swade/assets/icons/${createData.type}.svg`;
    }
  }

  public static onPreCreateScene(
    createData: any,
    options: any,
    userId: string,
  ) {
    if (!createData.gridType) {
      createData.gridType = CONST.GRID_TYPES.GRIDLESS;
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
    if (createData.type === 'skill' && options.renderSheet !== null) {
      options.renderSheet = true;
    }

    if (createData.type === 'ability' && createData.data.subtype === 'race') {
      return false;
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
    if (actor.data.type !== 'character') {
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
      .filter((i: SwadeItem) => i.type === 'skill')
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
      const wildcard = wildcards.find((a) => a._id === enitityId);

      if (wildcard) {
        element.innerHTML = `
					<a><img src="${SWADE.wildCardIcons.regular}" class="wildcard-icon">${wildcard.data.name}</a>
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
        const entryId = el.dataset.entryId;
        if (ids.includes(entryId)) {
          const entityName = el.children[1];
          entityName.children[0].insertAdjacentHTML(
            'afterbegin',
            `<img src="${SWADE.wildCardIcons.compendium}" class="wildcard-icon">`,
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
    if (actor.data.type === 'npc') {
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
        const cardString = getProperty(
          combatant,
          'flags.swade.cardString',
        ) as string;
        initdiv[0].innerHTML = `<span class="initiative">${cardString}</span>`;
      } else if (!game.user.isGM) {
        initdiv[0].innerHTML = '';
      }
    });
  }

  public static onUpdateCombat(
    combat: Combat | any,
    updateData,
    options,
    userId: string,
  ) {
    //NO-OP
  }

  public static onUpdateCombatant(
    combat: Combat,
    combatant: any,
    updateData: any,
    options: any,
    userId: string,
  ) {
    // Return early if we are NOT a GM OR we are not the player that triggered the update AND that player IS a GM
    const user = game.users.get(userId) as User;
    if (!game.user.isGM || (game.userId !== userId && user.isGM)) {
      return;
    }

    if (
      !getProperty(updateData, 'flags.swade') ||
      combatant.actor.data.type !== 'character'
    )
      return;
    if (
      getProperty(combatant, 'flags.swade.hasJoker') &&
      game.settings.get('swade', 'jokersWild')
    ) {
      renderTemplate(SWADE.bennies.templates.joker, {
        speaker: game.user,
      })
        .then((template: string) => {
          const createData = { user: game.user, content: template };
          ChatMessage.create(createData);
        })
        .then(() => {
          const combatants = combat.combatants.filter(
            (c) => c.actor.data.type === 'character',
          );
          for (const combatant of combatants) {
            const actor = combatant.actor as SwadeActor;
            actor.getBenny();
          }
        });
    }
  }

  public static onDeleteCombat(combat: Combat, options: any, userId: string) {
    if (!game.user.isGM || !game.users.get(userId).isGM) {
      return;
    }

    const jokerDrawn = combat.combatants.some((v) =>
      getProperty(v, 'flags.swade.hasJoker'),
    );

    //return early if no Jokers have been drawn
    if (!jokerDrawn) return;

    //reset the deck when combat is ended
    game.tables
      .getName(SWADE.init.cardTable)
      .reset()
      .then(() => {
        ui.notifications.info('Card Deck automatically reset');
      });
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

  public static onGetChatLogEntryContext(
    html: JQuery<HTMLElement>,
    options: any[],
  ) {
    const canApply = (li: JQuery<HTMLElement>) => {
      const message = game.messages.get(li.data('messageId'));
      const actor = ChatMessage.getSpeakerActor(message.data['speaker']);
      const isRightMessageType =
        message?.isRoll &&
        message?.isContentVisible &&
        !message.getFlag('core', 'RollTable');
      return isRightMessageType && !!actor && (game.user.isGM || actor.owner);
    };
    options.push(
      {
        name: game.i18n.localize('SWADE.RerollWithBenny'),
        icon: '<i class="fas fa-dice"></i>',
        condition: canApply,
        callback: (li) => chat.rerollFromChat(li, true),
      },
      {
        name: game.i18n.localize('SWADE.FreeReroll'),
        icon: '<i class="fas fa-dice"></i>',
        condition: canApply,
        callback: (li) => chat.rerollFromChat(li, false),
      },
    );
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
    const players = html.find('#players');
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
              (selectedUser.getFlag('swade', 'bennies') as number) + 1,
            )
            .then(async () => {
              ui['players'].render(true);
              if (game.settings.get('swade', 'notifyBennies')) {
                //In case one GM gives another GM a benny a different message should be displayed
                const givenEvent = selectedUser !== game.user;
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
          if (template) template.destroy();
          template = SwadeTemplate.fromPreset(TemplatePreset.CONE);
          if (template) template.drawPreview();
        },
      },
      {
        name: 'sbt',
        title: 'SWADE.SBT',
        icon: 'sbt far fa-circle',
        visible: true,
        button: true,
        onClick: () => {
          if (template) template.destroy();
          template = SwadeTemplate.fromPreset(TemplatePreset.SBT);
          if (template) template.drawPreview();
        },
      },
      {
        name: 'mbt',
        title: 'SWADE.MBT',
        icon: 'mbt far fa-circle',
        visible: true,
        button: true,
        onClick: () => {
          if (template) template.destroy();
          template = SwadeTemplate.fromPreset(TemplatePreset.MBT);
          if (template) template.drawPreview();
        },
      },
      {
        name: 'lbt',
        title: 'SWADE.LBT',
        icon: 'lbt far fa-circle',
        visible: true,
        button: true,
        onClick: () => {
          if (template) template.destroy();
          template = SwadeTemplate.fromPreset(TemplatePreset.LBT);
          if (template) template.drawPreview();
        },
      },
    ];
    measure.tools.splice(measure.tools.length - 1, 0, ...newButtons);
  }

  public static async onDropActorSheetData(
    actor: SwadeActor,
    sheet:
      | SwadeCharacterSheet
      | SwadeNPCSheet
      | SwadeVehicleSheet
      | CharacterSheet,
    data: any,
  ) {
    if (data.type === 'Actor' && actor.data.type === 'vehicle') {
      const vehicleSheet = sheet as SwadeVehicleSheet;
      const activeTab = getProperty(vehicleSheet, '_tabs')[0].active;
      if (activeTab === 'summary') {
        vehicleSheet.setDriver(data.id);
      }
      return false;
    }
    if (data.type === 'Item' && !(sheet instanceof SwadeVehicleSheet)) {
      let item: SwadeItem;
      if ('pack' in data) {
        const pack = game.packs.get(data.pack) as Compendium;
        item = (await pack.getEntity(data.id)) as SwadeItem;
      } else if ('actorId' in data) {
        item = new SwadeItem(data.data, {});
      } else {
        item = game.items.get(data.id) as SwadeItem;
      }

      if (item.type !== 'ability' && item.data.data.subtype !== 'race') {
        return false;
      } else {
        //set name
        await actor.update({ 'data.details.species.name': item.name });
        //process embedded entities
        const map = new Map<string, any>(
          (item.getFlag('swade', 'embeddedAbilities') as any[]) || [],
        );
        const creationData = [];
        for (const entry of map.values()) {
          //if the item isn't a skill, then push it to the new items
          if (entry.type !== 'skill') {
            creationData.push(entry);
          } else {
            //else, check if there's already a skill like that that exists
            const skill = actor.items.find(
              (i: Item) => i.type === 'skill' && i.name === entry.name,
            ) as Item;
            if (skill) {
              //if the skill exists, set it to the value of the skill from the item
              const skillDie = getProperty(entry, 'data.die');
              await actor.updateOwnedItem({
                _id: skill.id,
                'data.die': skillDie,
              });
            } else {
              //else, add it to the new items
              creationData.push(entry);
            }
          }
        }
        if (creationData.length > 0) {
          await actor.createOwnedItem(creationData, { renderSheet: null });
        }

        //copy active effects
        const effects = Array.from(item.effects.values()).map(
          (ae: ActiveEffect) => {
            const retVal = ae.data;
            delete retVal._id;
            return retVal;
          },
        );
        if (!!effects && effects.length > 0) {
          await actor.createEmbeddedEntity('ActiveEffect', effects);
        }
      }
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
    const cards = (await cardPack.getContent()).sort(
      (a: JournalEntry, b: JournalEntry) => {
        const cardA = a.getFlag('swade', 'cardValue') as number;
        const cardB = b.getFlag('swade', 'cardValue') as number;
        const card = cardA - cardB;
        if (card !== 0) return card;
        const suitA = a.getFlag('swade', 'suitValue') as number;
        const suitB = b.getFlag('swade', 'suitValue') as number;
        const suit = suitA - suitB;
        return suit;
      },
    ) as JournalEntry[];

    //prep list of cards for selection
    const cardTable = game.tables.getName(SWADE.init.cardTable);

    const cardList = [];
    for (const card of cards) {
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
      const hasJoker = selectedCard.data().isJoker as boolean;
      const cardString = selectedCard.val() as String;
      game.combat.updateEmbeddedEntity('Combatant', {
        _id: options.object._id,
        initiative: suitValue + cardValue,
        flags: { swade: { cardValue, suitValue, hasJoker, cardString } },
      });
    });
    return false;
  }

  public static onDiceSoNiceInit(dice3d: any) {
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
    //@ts-ignore
    import('/modules/dice-so-nice/DiceColors.js')
      .then((obj) => {
        SWADE.dsnColorSets = obj.COLORSETS;
        SWADE.dsnTextureList = obj.TEXTURELIST;
      })
      .catch((err) => console.log(err));

    const customWilDieColors =
      game.user.getFlag('swade', 'dsnCustomWildDieColors') ||
      getProperty(SWADE, 'diceConfig.flags.dsnCustomWildDieColors.default');

    const customWilDieOptions =
      game.user.getFlag('swade', 'dsnCustomWildDieOptions') ||
      getProperty(SWADE, 'diceConfig.flags.dsnCustomWildDieOptions.default');

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
        labels: [SWADE.bennies.textures.front, SWADE.bennies.textures.back],
        system: 'standard',
        colorset: 'black',
      },
      'd2',
    );
  }
}
