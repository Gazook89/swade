# Change Log

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](http://keepachangelog.com/) and this project adheres to [Semantic Versioning](http://semver.org/)

<!--
## [Unreleased]

### Added

### Changed

### Deprecated

### Removed

### Fixed

### Security
-->

## [Unreleased v0.18.0]

### Added

- Added missing translation keys for vehicles

## [v0.17.2]

### Changed

- Renamed Community character sheet to Legacy character sheet
- Legacy character sheets and NPC sheets now properly display the powers tab when the actor has a special ability that grants powers

### Fixed

- Removed polish language definition from system manifest

## [v0.17.1]

### Added

- Added `main-grid` class as the parent element for the official character sheet

### Changed

- Changed the order of edges and hindrances on the official character sheet
- Removed restrictions on what can be added to a race as a racial ability. Now the only thing that cannot be added is another race
- Changed the layout of the Ability item sheet, putting the description above the active effects/racial abilities
- Special Abilities can now act like Arcane Backgrounds, unlocking the powers tab
- Item sheets can now scroll
- Active Effects and Actions lists on Item sheets now scroll when they become too long

### Fixed

- Fixed a small bug which would cause toughness not to be calculated correctly
- Fixed a small bug which would cause natural armor not to be calculated when no actual armor is equipped

## [v0.17.0]

### Added

- Added an option to automatically hide NPC Item Chatcards. This setting is on by default and can be found in the System Settings. You can still make a card public by right-click it and selecting the right option from the context menu
- The system now grants a Benny to all player characters when one of them is dealt a Joker. This can be turned off in the Setting Configurator
- Added the ability to automatically calculate parry. This option can be set in actor Tweaks and will default to on for all newly created actors after this point. The calculation also takes any shields which are equipped into account
- Added a new Field to the setting configurator which lets you set the name of the Skill which will be used as the base to calculate Parry. It will default to _Fighting_. Changing this setting will require you to reload the world to have the change take effect
- Added Active Effect to the Defend status which adds +4 Parry
- Added new Status _Protection_ which adds an Active Effect that adds 0 to both toughness and armor, making it easy to apply the power. All you need to do is to put the modifier (4 or 6) into the appropriate Active Effect change.
- Added new Item type `ability`. This item type has two subtypes, `race` and `special`. If the item has the subtype `race` you can drag&drop the following items onto it to create racial abilities:

  - Skills
  - Edges
  - Hindrances
  - Ability items with the subtype `special`

  You can delete these embedded racial abilities from the race item but not edit them.

  When you have prepared the race you can then drag&drop it onto any non-vehicle actor.

  Once that is done, several things happen:

  - The racial abilities are taken from the race and added to the actor
  - Any active effects that were added to the race are copied to the actor
  - The actors race is set to the name of the race item that was dropped onto the actors
    - If one of the racial abilities is a skill and the skill is already present on the actor, the die and modifier are set to the value of the racial ability. Otherwise a new skill is created
  - The race item itself is _not_ added to the actor, it merely acts as a carrier.

- Added blank option to linked attribute selection on skills
- Added new translation keys

### Changed

- Improved permission control for the reroll options
- Newly created Scenes will now default to ther gridless option. This only applies to scenes created in the Sidebar. Scenes imported from compendiums or other sources will retain their scene config
- Set default value of Benny animation to true
- Refactored some of the new turn combat logic
- Set minimum Toughness to 1 when auto-calculating
- Changed the font size of the cards in the Combat Tracker to `20px` for easier readability
- [BREAKING] Refactored the underlying structure of the official sheet so it is easier to modify and skin
- Changed the path of the icons used to describe dice in the roll cards to be relative
- Moved running die roll to a button next to the Pace input which also displays the current running die as an image
- Changed the way the skills display on the official character sheet. They are now more in line with the rest of the sheet. Thanks a lot to Kristian Serrano for that.
- Renamed most of the tabs on the character sheet to be more in line with Savage Worlds terminology
- Actor sheets now display Active Effects which come from Items they own. Item sheets now have _all_ interactions with Active Effects removed when the item is owned by an Actor as they cannot be interacted with anyway.
- Changed the colors of active/inactve tabs on the item sheets and community sheet.

### Removed

- Consolidated the quickaccess item cards into a single file. Thanks a lot to Kristian Serrano for that.
- Removed the polish translation, as announced with v0.16.0

### Fixed

gioness if it is marked as natural armor, has at least the torso location and is equipped

- Fixed a small issue where roll shortcuts would not properly work with multiplications and divisions
- Fixed a bug which would cause preset templates to behave eratically. Many thanks go out to Moerill who was instrumental in solving this.
- Fixed a small bug which would prevent the toughness auto-calculation from taking into account AE that adjust the size of the character

## [v0.16.2]

### Added

- Added missing translations on the official sheet
- Added the ability to reroll rolls in chat by right-clicking the roll in chat and selecting the right option from the context-menu.

### Changed

- Moved the carry capacity calculation to the `Actor` class and adjusted sheet classes accordingly. This should keep it consistent between all sheets.
- Moved the DSN integration settings away from a `client` setting to a flag on the user. This will make these settings consistent across all browsers, but not all worlds.
- Moved URL for the benny image asset on the official sheet to `CONFIG.SWADE.bennies.sheetImage`
- Updated benny assets

### Fixed

- Fixed a bug which would cause chatcards to reopen again after being closed and updated from the chatlog,
- Added missing translation key for Power Trappings
- Added missing labels for major and minor hindrances on the official character sheet
- Fixed a bug which would cause NPC and Vehicle ammo tracking not to behave correctly

## [v0.16.1]

### Changed

- Updated german translation

### Fixed

- Fixed a bug which would stop the system from loading if Dice So Nice was not installed
- Fixed a spelling mistake in the english translation

## [v0.16.0]

### Added

- Added warnings to all item types which display when any action related to an Active Effect is taken on an owned Item
- Added Benny spending animation to all sheets as well as to the player view
- Added a new Configuration Submenu for _Dice So Nice!_ related settings.
- Added option to toggle whether the Benny spending animation should be played. This setting can be found in the new Dice Configuration system settings submenu and is only available if DSN is installed
- Added the ability to set a custom Wild Die color theme. This setting can be found in the new Dice Configuration system settings submenu and is only available if DSN is installed
- Added Ammo Management. Ammo management is a system option that is turned off by default. When activated it allows you to to track how many shots are expended by an attack as well as reload the gun if it's empty. When active you cannot perform an action unless you have enough ammunition in the magazine. Weapons have recieved 2 new options. One marks the weapon if it doesn't need to be reloaded, such as bows. The other is a text field that lets you enter the name of an item that is used as ammunition. There are also options to which enable the usage of ammo from the inventory. Say you have a gun which is missing 10 shots from a magazine while this feature is enabled. Reloading the weapon will pull 10 shots from the appropriate item that you set as ammunition on the weapon from the characters inventory. A warning is displayed if not enough ammunition for a full reload is available.
- Expanded Power Chat Card to now include options to directly adjust PP. This can be used to easily spend PP without having to do it via the character sheet
- Added Shaken icon
- Added Incapacitated icon
- Added additional translation options

### Changed

- Changed background color of SVG skill and `Item` to be more in line with the _Savage Worlds_ color scheme
- Increased width of Power Point input fields on the Official CHaracter sheet.
- Turned the `SwadeCombat` file into a proper class that extends `Combat`
- Skills will now always open their sheet when created on an actor, even when drag&dropped onto the sheet from somewhere.
- Generalized the operation skill dropdown on vehicles by adding the possible skills as an array to the `CONFIG.SWADE.vehicles` object
- Moved paths to Wild Card icon files to `CONFIG.SWADE.wildCardIcons` which means modules can now add their own custom wildcard icons. Testing showed the ideal place is the `setup` Hook.
- Parametrized paths to the benny textures in `CONFIG.SWADE.bennies.textures`. Can be used the same way as the wildcard icons
- Updated a few strings in the german translation

### Deprecated

- Started deprecation of the polish translation as I cannot maintain it. It will be removed from the game system with v0.17.0

### Removed

- Removed ability to interact with Active Effects on skill Items
- Removed ability to interact with Active Effects on owned Items entirely
- Removed Translations with `SSO` prefix and unified translation under the `SWADE` prefix. Adjusted Official sheet accordingly
- Removed unused gradient definitions from skill and `Item` SVG icons

### Fixed

- Fixed maximum wound penalty for pace
- Checkbox styles are properly scoped to the system now
- Fixed a small bug which would not reset initiative properly when clicking the `Reset All` button in the Combat Tracker

## [v0.15.3]

### Added

- Added Drag&Drop functionality to Misc items in the Inventory of the character sheet

### Changed

- Restricted autopopulation of core skills to player characters only

### Fixed

- Implicit dice such as `d4` now explode properly again
- Fixed an unintentional linebreak on the community character sheet
- Fixed a small issue where using the `suppressChat` option on a damage roll would break the roll

## [v0.15.2]

### Added

- Added compatability for Foundry 0.7.9

### Fixed

- Fixed a small error in the token status effects

## [v0.15.1]

### Added

- Added the getter `hasArcaneBackground` accessor to the `SwadeActor` class which returns a boolean
- Added SWADE-Specific status icons
- Added additional translation options

### Changed

- Changed the color scheme of the community sheets to more closely resemble the official sheet

### Fixed

- Fixed a small bug which would prevent chat cards to be posted from vehicle actors
- Fixed a small issue that would cause multiple instances of Core Skills to be created on an actor when multiple GMs are logged in

## [v0.15.0]

### Added

- Added official character sheet. For more information visit `<insert link here>`
- Added Actions to `Shield` type items
- Added ability to define skill override in an action, so the action uses an alternative skill
- Added ability to record how many shots are fired by using this action. This does nothing for now, but can be used by macros or features down the line
- Added additional translation options

### Changed

- Changed unknown driver display to black icon to differentiate from an actor that has the default icon
- Changed Roll Data (the shortcuts with the `@` notation). You can now easily access the following values:
  - all attributes of the selected token (@str, @agi, etc),
  - all skills of the selected token. Names are all lower case, spaces are replaced with dashes and all non-alphanumeric characters (everything that isn't a number or a to z) is removed. E.g. `Language (Native)` can be called with `@language-native`
  - Traits will also include their modifier shoud they have one
  - Current Wounds
  - Current Fatige

### Removed

- Removed spanish translation from core game system because a properly maintained community translation is available here: https://foundryvtt.com/packages/swade-es/

### Fixed

- Fixed a small bug that would cause rolls to crash when attributes had a modifier with value `null`
- Fixed a small bug which would prevent vehicle sheets from rendering under certain circumstances.
- Fixed a small bug which would prevent items on the vehicle sheet from dragging
- Fixed several spelling mistakes

## [v0.14.1]

### Added

- Added additional translation options

### Changed

- Changed the way dice results are displayed. The chat message now displays the rolls as following
  - If applicable, Modifiers are displayed as a list in the flavour text
  - In the middle the adjusted dice rolls, with all the modifiers already applied. Should a roll contain a natural 1 the result will be colored red so you can at a glance tell if you're dealing with snake eyes or Innocent Bystander
  - When clicking to expand the roll you can now see the unmodified dice rolls, in case you want to reference them
- Changed version compatability for Foundry VTT `0.7.7`
- Refactored the dice rolling logic to take more advantage of the Foundry VTT Dice API. This should also take care of most parsing issues for rolls triggered via the sheet and chat cards

## [v0.14]

### Added

- Added Skill and Attribute names to dice when rolling
- Added `SwadeEntityTweaks` class to game object as `game.swade.SwadeEntityTweaks`.
- Added labels to the various Sheet classes
- Added natural armor capabilities
- Added Localization for Actor and Item types (english only)
- Added `suppressChat` option to `Actor.rollSkill`, `Actor.rollAttribute` and `Item.RollDamage` options. When this option is set to true, the method returns an unroll `Roll` class instead of opening the Dialog and rolling. Example: `actor.rollSkill(randomSkillID, {suppressChat: true})`
- Added logic that will optionally adjust pace with the wounds
- Added support for active effects, including UI.
  - **Attention** Should an active effect that modifies something like parry or pace not work it may because the data is still saved as a string. To fix this first enter some bogus value into the field and then the proper base value. This will force the field to update the datatype correctly and the Active Effect should now work properly.
  - **Attention** Editing an Active Effect on an item that is owned by a character is not currently possible as it isn't directly supported in Foundry Core
- Added two new modifier fields to the data model for `character` and `npc` type actors. Both are primarily meant for active effects
  - `data.strength.encumbranceSteps` - Used for Edges which modify the strength die for the purpose of calculating encumbrance. setting this value to 1 means the strength die is considered 1 step higher for the purpose of encumbrance (up to a maximum of a d12)
  - `data.spirit.unShakeBonus` - Should be used for edges which give a bonus or penalty to the unshaking test

### Changed

- Added package name to Action deck selection
- Simplified explosion syntax from `x=` to `x`
- Refactored `getData` of all actor sheets take out duplicate or unused sections
- [POTENTIALLY BREAKING] Changed data types of input fields for attributes and derived values to `Number`. This was a necessary step in order to make Active Effects work properly.
- Changed display text of the Red and Black Joker action cards to "Red J" and "Blk J" respectively to improve readability

### Fixed

- Fixed a small bug which would cause Group Rolls not to behave properly
- Fixed a styling error with Item sheets
- Fixed a bug which caused sheet-inline item creation dialogs to not work properly
- Fixed a bug which would cause skill rolls to throw a permission error when players were making an unskilled attempt
- Fixed a small bug which would cause some token values of actors to be overwritten on import

### Removed

- Removed Handlebars helpers that overwrote helpers defined by Foundry core

## [v0.13]

### Added

- Added support for chat message popout for item chat cards
- Added more localization to Item Chat Cards
- Added ability to assign any card to a combatant via combatant config
- Added image to Action Cards Table. Won't apply to currently existing tables, so either delete the table and re-load the world or set it manually

### Changed

- Changed all the listeners on the sheet classes to no longer use depreceated jQuery Methods
- Updated the Vehicle sheet driver logic to use the new `dropActorSheetData` drop
- Updated Combatant sorting in Combat tracker to be in line with the new method structure
- Moved template presets up in menu so the `Delete All` button is last
- Replaced all instances of the now depreceated `Actor#isPC` with the new `Entity#hasPlayerOwner` property
- Turned on toughness calculation by default for PCs/NPCs made after this patch

### Deprecated

- Finished the deprecation of the util functions `isIncapacitated` and `setIncapacitationSymbol`

### Fixed

- Fix roll dialogs
- Fix item creation dialog
- Fix macro creation drag handler
- Fixed a small bug which could lead to the wrong modifiers on a running die
- Fixed dice roll formatting in the chatlog
- Fixed initiative display
- Fixed a bug which would cause an infinite update cycle when opening actor sheets from a compendium

## [v0.12.1]

### Fixed

- Fixed a bug which would overwrite actor creation data

## [v0.12.0]

### Added

- Added TypeDoc to the repository and configured two scripts to generate the documentation as either a standard web page or in Markdown format.
- Added a way to render sheets only after the templaes are fully loaded. this should help with slower connections.
- Added ability to set a d1 for traits
- Added toggle for Animal smarts
- Option to roll the Running Die. Adjust the die the Tweaks. Set a die type and a modifier as necessary. Click _Pace_ on the actor sheet to roll the running die, including dialog, or shift-click to skip the dialog. **Attention** For existing actors you may need to go into the tweaks, set the proper die and then hit _Save Changes_. Actors created after this patch will have a d6 automatically.
- Added the ability to create chat cards for edges and inventory items. (Thanks to U~Man for that)
- Added the ability to add a skill and modifiers to a weapon or power
- Added the ability to define actions on a weapon or item. There are two types of actions; skill and damage, each allowing you to pre-define some custom shortcuts for attacks
- Additional stats are now present on all items and actors
- Added the ability for players to spend bennies directly from the player list

### Deprecated

- started the deprecation of the util functions `isIncapacitated` and `setIncapacitationSymbol`. They will be fully removed in v0.13
- Finished deprecation of `SwadeActor.configureInitiative()`

### Changed

- Upgraded TypeScript to version `3.9.7` (Repo only)
- Adjusted character/NPC sheet layout a bit
- Updated the SVG icons so they can be used on the canvas
- Changed design and makeup of checkboxes as they were causing issues with unlinked actors
- Changed input type of currency field so it accepts non-numeric inputs

### Fixed

- Fixed a bug where actors of the same name would show up as a wildcard in the actor sidebar if any of them was a wildcard
- Fixed a small bug which could occasionally cause errors when handling additional stats for entities in compendiums

## [v0.11.3]

### Fixed

- Fixed a bug that would prevent Item or Actor sheets from opening if they hadn't been migrated

## [v0.11.2]

### Fixed

- Fixed a bug that would prevent non-GMs from opening items in the sidebar

## [v0.11.1]

### Fixed

- Fixed a small bug that would allow observers to open the Armor/Parry edit windows

## [v0.11.0]

### Added

- Added Classification field to Vehicle Sheet
- Added `calcToughness` function to `SwadeActor` class, that calculates the toughness and then returns the value as a number
- Added auto-calculation to toughness if armor is changed or something about the vigor die is changed.
- Added `isWildcard` getter to `SwadeActor` class
- Added Group Rolls for NPC Extras
- Added `currentShots` property to `weapons`. Addjusted sheets accordingly
- Added Setting Configurator in the Settings
- Added Capability to create custom stats.
  - To use custom stats, create them in the Setting Configurator, then enable them in the Actor/Item Tweaks
  - These custom stats are available on the following sheets: Character, NPC, Weapon, Armor, Shield, Gear
  - **Attention**: Due to a quirk in Foundry's update logic I recommend you only edit unlinked actors in the sidebar and then replace existing tokens that exist on the map with new ones from the side bar
- Added ability to automatically calculate toughness, including armor. This is determined by a toggle in the Actor Tweaks and does not work for Vehicles. The Toughness input field is not editable while automatic toughness calculation is active.
- Added Powers Tab back into NPC Sheets
- On character sheets, added quantity notation to most inventory entries
- Added Initiative capability to `vehicle` type actors. Please keep in mind that Conviction extension does not work at this time. It's heavily recommended that you only add the Operator to the Combat Tracker if you use the Conviction setting rule.

### Changed

- Parry and Pace fields now accept non-numerical inputs
- Power sheet now acceptsnon-numerical input for Power Points
- NPC Hindrances now only show the Major keyword, no longer Minor
- Updated german localization (thanks to KarstenW for that one)
- Changed size of status tickbox container from `100px` to `120px` to allow for longer words
- Re-enabled the Arcane Background toggle on Edges, when they are owned

### Deprecated

- Started deprecation of `SwadeActor.configureInitiative()` function. It will be fully removed with v0.12.0

### Removed

- Removed Status icon two-way binding
- Removed Notes column for misc. Items in the character sheet inventory
- Removed Conviction Refresh message as there is no reliable way to get the current active combatant at the top of a round

### Fixed

- Fixed a bug that would remove fatigue of max wounds was set to 0 on NPC sheets
- Fixed a small bug that would prevent item deletion from NPC sheets
- Fixed a small bug which would cause wound penalties on vehicles to register as a bonus instead
- Fixed a small bug which allowed observers to roll Attribute tests

## [v0.10.2]

### Added

- Added Source code option to advancement tracker editor

### Changed

- Removed armor calculation from NPC actors as it is a likely culprit for a bug. Proper solution to follow

## [v0.10.1]

### Fixed

- Fixed a bug that would cause Drag&Drop macros from actor sheets to be cloned, leading to multiple identical macros on the hotbar (identical in ID too), which could lead to players having macros they couldn't interact with properly.

## [v0.10.0]

### Added

- Added Refresh All Bennies option and Message
- Added the Savage Worlds Cone shape which replaces the vanilla Foundry cone shape for rounded cones (thanks to Godna and Moerill for that one)
- `SwadeTemplate` class, which allows the creation of predefined `MeasuredTemplate`s (based on code by errational and Atropos)
- Buttons for predefined Blast and Cone Templates
- Added Vehicles
  - Added Vehicle `Actor` type
  - Added Vehicular flag to `weapon` and `gear` Items
  - Added Vehicle Sheet
    - Drag&Drop an actor to set an operator
    - Roll Maneuvering checks directly from the vehicle sheet
      - Set Maneuvering skill in the `Description` tab
- Added optional Setting Rules for Vehicles using Modslots and Vehicles using Edges/Hindrances
- Added localization options for Vehicles
- Added `makeUnskilledAttempt` method to `SwadeActor` class
- Added `rollManeuveringCheck` method to `SwadeActor` class
- Added Drag&Drop to PC powers

### Fixed

- Fixed a small bug which would cause the Action Cards deck not to reset when combat was ended in a Round in which a Joker was drawn
- Fixed a small bug which would cause Gear descriptions not to enrich properly on `Actor` sheets
- Fixed broken Drag&Drop for NPC sheets

### Changed

- Changed how many Bennies the GM gets on a refresh. The number is now configured in a setting (Default 0);
- Weapon Notes now support inline rolls and Entity linking

## [v0.9.4]

### Added

- Added some more localization options

### Changed

- Changed the card redraw dialog. It now displays the image of the card as well as a redraw button when appropriate
- Reworked the NPC sheet a bit (thanks to U~Man for that)

### Removed

- Removed the Weapons, Gear, Shields, Armor and Powers compendia due to copyright concerns

## [v0.9.3]

### Added

- Added Benny reset function for each user
  - GM Bennies are calculated based on the number of users
- Benny spend/recieve chat messages
- Added a function to calculate the valuer of the worn armor to the `SwadeActor` entity

## [v0.9.2]

### Fixed

- Fixed a bug that would prevent GMs from rerolling initiative for a given combatant

## [v0.9.1]

### Added

- Added a function to the `SwadeActor` class that calculates and sets the proper armor value
- Added checkboxes to the Armor sheets to mark hit locations

### Changed

- Renamed a few classes to make their function more easily apparent
- Changed `Conviction` Setting Rule to be compliant with SWADE 5.5
- Made Skill names multiline

## Removed

- Took away the player's option to draw their own cards, now only the GM can do that

### Fixed

- Fixed a small bug which would prevent NPCs from rolling power damage
- Fixed a small bug that would prevent multiple combat instances to work at the same time

## [v0.9.0]

### Added

- Layout rework (Thanks to U~Man)

  - Added multiple arcane support, filling the Arcane field of power items will sort it in the powers tab and gives it its own PP pool when the filter is enabled
  - Moved sheet config options (initiative, wounds) to a Tweaks dialog in the sheet header
  - Moved Race and Rank fields to the sheet header
  - Moved Size to Derived stats
  - Fixed Issue with rich HTML links not being processed in power and edge descriptions
  - Each inventory item type has relevant informations displayed in the inventory tab
  - Reworked base colors
  - Moved condition toggles and derived stats to the Summary tab
  - For PCs sheet, lists no longer overflows the sheet size.
  - For PCs sheet, power cards have a fixed size
  - Added an Advances text field above the Description
  - Changed the default item icons to stick with the new layout colors
  - Added dice icons to attributes select boxes
  - Weapon damage can be rolled in the inventory
  - Added an item edit control on NPC inventory

- Added drag&drop capability for PCs and NPCs so you can pull weapons and skills into the hotbar and create macros.
- Added a bunch of icons for skills
- Added the ability to choose cards when rerolling a card

### Changed

- Adjusted Weapon/Armor/Gear/Power Item sheets to be more compact

### Fixed

- Fixed a bug which would duplicate core skills when a PC was duplicated

## [v0.8.6] 2020-05-22

### Fixed

- Fixed Compatability with Foundry v0.6.0

## [v0.8.5] 2020-05-21

### Added

- Added Size modifier to sheet
- Added Roll Raise Button to Damage rolls which automatically applies the extra +1d6 bonus damage for a raise
- Player CHaracters will now automatically recieve the core skills.
- Added FAQ (Thanks to Tenuki Go for getting that started);
- Toggling a `npc` Actor between Wildcard and not-wildcard will link/unlink the actor data. Wildcards will become linked and Extras will become unlinked. This can still be overriden manually in the Token config. This functionality also comes with a system setting to enable/disable it
- Actors of the type `npc` will be created with their tokens not actor-linked

### Fixed

- Fixed a small bug which caused ignored wounds to behave oddly.
- Fixed duplicates and false naming in the Gear compendia (Thanks to Tenuki Go for getting that done);
- Fixed Journal image drop again
- Fixed a small bug where in-sheet created items would not have the correct icon

## [v0.8.4] 2020-05-17

### Fixed

- Fixed a small bug that would prevent the population of the Action Cards table

## [v0.8.3] 2020-05-16

### Fixed

- Fixed a small bug that would allow combat initiative to draw multiples of a card

## [v0.8.2] 2020-05-16

### Added

- Added option to turn off chat messages for Initiative
- Made Hindrance section available for Extras as well
- Made PC gear cards more responsive
- Added more i18n strings
- Compendium packs for Core Rulebook equipment (Thanks to Tanuki Go on GitLab for that)
- Added buttons to quickly add skills, equipment etc (Thanks to U~Man for that)

### Changed

- Updated SWADE for FoundryVTT 0.5.6/0.5.7

### Removed

- Removed French translation as it will become a seperate module for easier maintenance.

### Fixed

- Fixed a small bug which would cause the wrong sheet to be update if two character/npc sheets were opened at the same time.

## [v0.8.1] 2020-05-10

### Added

- Powers now have a damage field. If the field is not empty it shows up on the summary tab. Kudos to Adam on Gitlab
- Fixed an issue with Item Sheets that caused checkboxes to no longer show up
- Stat fields for NPC equimpent only show up when they actually have stats.

## [v0.8.0] 2020-05-09

### Added

- Initiative! Supports all Edges (for Quick simply use the reroll option)
- Added localization strings for Conviction
- Fields in weapon cards will now only be shown when the value isn't empty
- Ability to ignore Wounds (for example by being a `Construct` or having `Nerves of Steel`)

## Changed

- Massively changed the UI and all sheets of SWADE to make it more clean and give it more space.
- Changed data type of the `Toughness` field from `Number` to `String` so you can add armor until a better solution can be found
- Updated French translation (thanks to LeRatierBretonnien)

### Fixed

- Fixed a bug that would display a permission error for players when a token they weren't allowed to update got updated
- Status Effect binding now also works for tokens that are not linked to their base actor
- Fixed a small localization error in the Weapon item sheet
- Fixed requirements for the `Sweep` Edge
- Fixed page reference for the `Sound/Silence` Power
- Fixed an issue with Skill descriptions not being saved correctly

## [v0.7.3] 2020-05-01

### Added

- Added the option to view Item artwork by right-clicking the item image in the sheet

### Changed

- Optimnized setup code a bit

### Fixed

- Added missing Bloodthirsty Hindrance
- Fixed a spelling mistake in the `Improved Level Headed` Edge

## [v0.7.2] 2020-04-28

### Fixed

- Fixed a small bug that would cause an error to be displayed when a player opened te sheet of an actor they only had `Limited` permission on

## [v0.7.1] 2020-04-28

### Added

- Status effect penalties will now be factored into rolls made from the sheet (credit to @atomdmac on GitLab)
- Added option to turn Conviction on or off as it is an optional rule

### Fixed

- Fixed a minor spelling mistake in the german translation

## [v0.7.0] 2020-04-20

### Added

- Damage rolls can now take an `@` modifer to automatically add the attribute requested. For example `@str` will resolve to the Strength attribute, which will be added to the damage roll.
- Added Limited Sheet for NPCs. If the viewer has the `Limited` Permission they get a different sheet which only contains the character artwork, the name of the NPC and their description
- Added Confirm Dialogue when deleting items from the inventory of `character` Actors

### Changed

- Changed automated roll formula a bit to make the code more readable.

### Fixed

- Fixed a small bug where the description of an Edge or Hindrance could show up on multiple `character` sheets at once

## [0.6.1] 2020-04-20

### Added

- Trait rolls now take Wound and Fatigue penalties into account
- `Gear` Items can now be marked as equippable

### Fixed

- Added missing Damage roll option for NPC sheets

## [0.6.0] 2020-04-18

### Added

- Rolls for Attributes, Skills and Weapon Damage (kudos to U~man!)
- Checkboxes for Shaken/Distracted/Vulnerable to Character and NPC Actor sheets
- Two-Way-Binding between Token and Actor for the three status effects (Shaken/Distracted/Vulnerable)
- Setting to determine whether NPC Wildcards should be marked as Wildcards for players

### Changed

- Updated hooks to be compatible with Foundry 0.5.4/0.5.5
- More clearly marked Item description fields
- Renamed `Untrained Skill` to simply `Untrained`

### Fixed

- Power descriptions are now rendered with formatting
- Added missing `Arrogant` hindrance

## [0.5.4] 2020-04-13

### Removed

- Removed empty option from skill attribute select as every skill needs to have a linked attribute anyway

### Fixed

- Rank and Advances fields now point to the correct properties. Make sure to write down what Rank and how many advances all characters have before updating to this version

## [v0.5.3] 2020-04-11

## Added

- Added Quantity fields to relevant Item sheets
- Added Localization options for Conviction
- JournalEntry images can now be dragged onto the canvas (credit goes to U~man)

## Changed

- Changed initiative formula to `1d54`. This is temporarily while a proper Initiative system is being developed

## Fixed

- Fixed localization mistake in de.json

## [v0.5.2] 2020-04-07

### Added

- Compendiums! (Thanks to Anathema M for help there)
  - Edges
  - Hindrances
  - Skills
  - Powers
  - Action Cards (no you can't pull them onto the map, but that's gonna come in the future)
- French Localization (Thanks to Leratier Bretonnien & U~Man for that)
- Spanish Localization (Thanks to Jose Lozano for this one)

### Changed

- Upgraded Tabs to `TabsV2`
- Slight improvements to localization

## [v0.5.0] 2020-03-27

### Added

- Wildcards will now be marked with a card symbol next to their name
- Wound/Fatigue/Benny/Conviction tracking on the Wildcard Sheet
- Extra sheets!
- Polish localization. Credit goes to Piteq#5990 on Discord

### Changed

- Moved Icons to assets folder and split them into icons and UI elements
- Character Image now respects aspect ratio
- The Actor types Wildcard and Extra have been changed to Character and NPC. NPCs can be flagged as Wildcards
- Whole bunch of changes to Actor sheets for both Characters and NPCs

### Fixed

- Localization errors that caused field labels on `Weapon` and `Power` Items to disappear

## [v0.4.0] - 2020-03-12

### Added

- Full localization support for the following languages:
  - English
  - Deutsch

## [0.3.0] - 2020-03-10

### Changed

- Completely reworked how Attribute and Skill dice are handled by the data model
- Modified `wildcard` Actor sheet to fit new data model
- Modifed `skill` Item sheet to fit new data model

## [0.2.0] - 2020-03-09

### Added

- Powers support! (The sheet layout for that will be need some adjustment in the future though)
- Fleshed out Inventory tab on the Wildcard sheet
- Items of the type `Edge` can now be designated as a power Edge. If an Actor has a power Edge, the Powers tab will be automatially displayed on the Wildcard sheet
- Equip/Unequip functionality for weapons, armor and shields from the Inventory Tab
- Weapon/Armor/Shield Notes functionality added to Items/Actor Sheet Summary tab

### Changed

- Rolled `Equipment` and `Valuable` Item types into new `Gear` Item type
- Streamlined the `template.json` to better distinguish Wildcards and Extras

### Fixed

- Various code improvements and refactoring
- Finished gear cards on the Summary tab of the Actor sheets

## [0.1.0] - 2020-02-26

### Added

- Wildcard Actor sheet
- Item sheets for the following
  - Skills
  - Edges
  - Hindrances
  - Weapons
  - Armor
  - Shields
  - Powers
  - Equipment
  - Valuables
