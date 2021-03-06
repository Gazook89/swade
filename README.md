# The Official _Savage Worlds_ Game System for Foundry Virtual Tabletop

_by Pinnacle Entertainment Group, Inc._

<div align="center">

[![Supported Foundry VTT versions](https://img.shields.io/endpoint?url=https://foundryshields.com/version?url=https://gitlab.com/peginc/swade/-/raw/develop/src/system.json)](https://foundryvtt.com/releases/)
[![Latest Release](https://gitlab.com/peginc/swade/-/badges/release.svg)](https://gitlab.com/peginc/swade/-/releases)
[![Build Status](https://img.shields.io/gitlab/pipeline-status/peginc/swade?branch=master)](https://gitlab.com/peginc/swade/-/commits/master)

[![Savage Worlds Adventure Edition for Foundry Virtual Tabletop](https://gitlab.com/peginc/swade/-/raw/master/images/logos/SWADE_FVTT.png)](https://foundryvtt.com/packages/swade)

</div>

The SWADE System for Savage Worlds is an official product of Pinnacle Entertainment Group. It’s lead developer and maintainer is FloRad who can be supported at https://ko-fi.com/florad

This game system supports and enhances the play experience of _Savage Worlds Adventure Edition_ in [Foundry VTT](https://foundryvtt.com/).

<div align="center">

![Chat cards in action](https://gitlab.com/peginc/swade/-/raw/master/images/chat-cards.gif)

</div>

Designed to feel at home among the pages of the core rules, the character sheet offers a refreshed design, UI improvements, and additional features to streamline and improve your game.

<div align="center">

![New Character Sheet Design](https://gitlab.com/peginc/swade/-/raw/master/images/new-sheet-design.gif)

</div>

Those who use the popular [_Dice So Nice!_ module](https://foundryvtt.com/packages/dice-so-nice/) will see some additional “benefits” as well.

<div align="center">

![Spending a Benny](https://gitlab.com/peginc/swade/-/raw/master/images/benny.gif)

</div>

Full documentation on how to use the system and sheets as well as a collection of reference items for Hindrances, Edges, and Skills are available on the [repository wiki](https://gitlab.com/peginc/swade/-/wikis).

**Any time. Any place. _Savage Worlds_.**

## Installation Instructions

To install the SWADE system for Foundry Virtual Tabletop, navigate to the **Install System** dialog on the Setup menu and install it from there!

If you wish to manually install the system, extract it into the `Data/systems/swade` folder. You may do this by downloading a zip archive from the [Releases Page](https://gitlab.com/peginc/swade/-/releases).

## Local Build Instructions

To create a local build of the SWADE system for Foundry VTT, follow these steps:

1. If you don't Node.js installed, be sure to install the [latest Node.js LTS version](https://nodejs.org/).
1. [Clone](https://git-scm.com/docs/git-clone) the repository and open a commandline or terminal window in the cloned the directory.
1. Run the `npm ci` command to install all the required node modules, including the type definitions.
1. Set the `dataPath` in `foundryconfig.json` to your FoundryVTT data folder.
1. Run the `link-project` script to link the build artifacts with your foundry install. **Note:** If you use Windows you will need to run this command with admin rights. Don't worry though as it only needs to be run once.
1. Either run `npm run build:watch` in a shell in your cloned directory or run the npm script `build:watch` directly from your IDE, such as [Visual Studio Code](https://code.visualstudio.com/).

_Savage Worlds Adventure Edition_ should now show up in Foundry VTT as an installed game system.

**_Pinnacle Entertainment Group, Inc. is not responsible for any consequences from any modifications made to this code by the user._**

## Community Contribution

Code and content contributions are accepted. Please feel free to submit issues to the issue tracker or submit merge requests for code changes. Approval for such requests involves code and design review by the VTT Team. **Any merge requests submitted must be submitted with `develop` as the target branch. Merge requests that target the `master` branch will be rejected or ignored.**

If you have any qustions please feel free to reach out to us here:

- The `#swade` channel on the [Foundry VTT Discord server](https://discord.gg/foundryvtt)
- The `#swade-dev` channel on the [League of Extraordinary FVTT Developers](https://discord.gg/fvttdevleague)

## FAQ

[Read the FAQ](/FAQ.md) for questions not answered above.

## License Notice

_Savage Worlds_, all unique characters, creatures, and locations, artwork, logos, and the Pinnacle logo are © 2020 Great White Games, LLC; DBA Pinnacle Entertainment Group. Distributed by Studio 2 Publishing, Inc.

Pinnacle Entertainment Group, Inc. reserves the rights for the following assets in this repository and any game system built from it. The assets are only to be used in Foundry VTT for the purpose of playing _Savage Worlds Adventure Edition_. Any removal, alteration, or additions to any logos or other trademarked images or materials is prohibited.

- d4.svg
- d6.svg
- d8.svg
- d10.svg
- d12.svg
- bennie.webp
- char-bg.webp
- circle_fatigue.webp
- circle_wounds.webp
- header_bg.webp
- main_bg.webp
- peg_logo.webp
- sheet_armor.svg
- sheet_parry.svg
- sheet_toughness.svg
- skills_bg.webp
- skills_footer.webp
- skills_header.webp
- swade_logo.webp
- benny-chip-front.png

### License FAQ

**This is a FAQ style of clarifications about what is and what isn’t allowed by our license. To clarify, you may do any of the following in your private games at any point. This specifically applies to publicly distributing, through Github or other means, code to allow others to do this, which falls under “public use.”**

1. Can I sell a module that I have created for swade?

   - _If the module in any way makes use of the protected assets listed in the Gitlab readme, including but not restricted to the trade dress or logos, you may NOT monetize the module. You can only publish monetized modules relating to the swade system through SWAG_.

2. Can I bundle any of the protected assets in my own module?

   - _No, you may NOT redistribute any of the protected assets listed in the readme with your own module_.

3. Can I use the trade dress through the use of the system image paths, instead of bundling it with my own module?

   - _No, placing the protected logos or trade dress anywhere that isn’t explicitly defined by Pinnacle is not allowed, even if you’re not bundling the image with your module_.

4. Can I publish a module that changes the Benny image?

   - _YES! Modules that modify the benny image of the system are totally allowed_.

5. Can I remove the PEG and/or SWADE logos from the official character sheet?

   - _You may not publish a module that removes the PEG and SWADE logo on the official character sheet. You may, however, distribute your own custom sheet, without any of the Pinnacle trade dress or logos_.

6. Can I change the look and feel of the official SWADE sheet with things such as adding a new tab, or modifying existing functionality?

   - _YES, you may use modules to modify the look and feel of the SWADE character sheet._

7. Can I publish a character sheet for a setting such as Deadlands, Weird Wars, Necessary Evil, etc. ?
   - _No, you may NOT use any trademarked names, any official assets or trade dress bundled in your module for settings such as Deadlands, Weird Wars, Necessary Evil, etc). Neither does the license allow works based on licensed properties published by Pinnacle (such as Lankhmar, Flash Gordon, Rifts®, or any other)._
