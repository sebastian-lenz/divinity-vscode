# Divinity Engine Script Support for VS Code

This extensions enables language features for the scripting language Osiris found in The Divinity Engine 2 based games.

**New: You can now use LSLib Compiler and Debugger with this extension. This allows you to compile story scripts directly from VS Code and use the debugger of VS Code with story scripts. More info available here: https://gist.github.com/Norbyte/8b7eb35cd17f799ea113636b15e1f967**

## Getting started

### Installation

- Open the extensions tab (usually the last button in the action bar. You can also use the shortcut Ctrl+Shift+X)
- Search for "divinity-vscode"
- On the plugin page, click the "Install", then the "Enable" button

### Open project

- Select "File" > "Open Folder..." and select the data folder of your project. The path usually looks something like this: `../Divinity Original Sin 2/Data/Mods/MyModeName_########-####-####-####-############`
- After a moment the story outline panel should show up beneath your files and you are ready to go.

## Features

### Story outline

The story outline brings you the familiar tree view from the native editor to VS Code. You can add, delete, move and rename goals using it.

![Story outline](resources/features/story-outline.gif)

### Code analysis

The extension analyzes your code while you type and immediately shows you errors and problems.

![Code analysis](resources/features/code-analysis.gif)

### Completion

Code completion shows you matching symbols for your current input, it will show up automatically when typing or by pressing Shift+Space. The suggestions are context sensitive and only show you the symbols that are currently available.

![Code completion](resources/features/completion.gif)

### Find all references and go to definition

Bring up a list of all usages of a procedure, query or database by pressing Shift+F12 or selecting the command `Find All References` from the context menu. You can also jump to the definition by pressing F12 or using the command `Go to Definition`.

![Goto definition and find all references](resources/features/find-references.gif)

### Document structure

Use the outline panel to get a broad overview over your current goal or jump to individial rules using the the shortcut Ctrl+Shift+O.

![Document structure](resources/features/document-structure.gif)

### Hover and signature help

Quickly gain information about the symbols on screen, move your mouse over them and the extension will show you a short info. The signature help shows up everytime you start writing a function call (when pressing `(` or with the shortcut Ctrl+Shift+Space) and shows you a preview of the parameters.

![Hover and signature help](resources/features/hover.gif)

### Rename

You can rename custom procedures, databases and queries as well as variables and GUID references. Press F2 while the cursor is above the symbol you want to rename or use the rename command from the context menu.

![Rename](resources/features/rename.gif)

### API Explorer

Built in browser for the complete API with contents fetched from the Divinity Wiki when available. Open the command palette (e.g. press Ctrl+Shift+P) and search for the command `Show API explorer` to open the API explorer. The "Show definition" command (in the context menu or F12) of the text editor directly shows you to the documentation page of the currently selected system symbol.

![API explorer](resources/features/api-explorer.gif)

### Custom documentation support

The code completion, hovers and the signature help will show you short snippet from the Wiki to assist you. You can add documentation to your own procedures and queries by placing a JSDoc comment above them.

### Osiris log file highlighting

The extensions includes a special syntax highlighting for Osiris log files.

## Compiler and debugger

This extension offers additional features when used together with LSLib Compiler and Debugger. You can install LSLib using the built-in installer. Open the command palette using Ctrl+Shift+P and search for the command `Install LSLib Compiler and Debugger`. The command will ask you for an install location, you must pick an empty folder. Tools installed this way will be automatically kept up-to-date on every launch of VS Code. You can manually check for updates using the command `Update LSLib Compiler and Debugger`.

### Compile

You can compile your story by pressing Ctrl+Shift+B and select one of the compile tasks.

![API explorer](resources/features/compiler.gif)

### Debug

You can setup the debugger like any other debugger in VS Code by creating a launch configuartion, press F5 to create the default launch configuartion. After that you can start the debugger from the debugger panel or by pressing F5 again. The debugger needs modifications to your game or editor directory, follow this guide for a detailed description: https://gist.github.com/Norbyte/8b7eb35cd17f799ea113636b15e1f967

![API explorer](resources/features/debugger.gif)

## Differences to the built in editor

Unlike the built in editor VS Code will not display three different regions when editing story goals. Instead you'll see the complete source file of each goal. The basic file structure looks like this:

```javascript
Version 1
SubGoalCombiner SGC_AND
INITSECTION

// Init section contents go here

KBSECTION

// KB section contents go here

EXITSECTION

// Exit section contents go here

ENDEXITSECTION
ParentTargetEdge "NameOfParentGoal"
```

You can safely ignore the header section, it will be the same for all your goals. The three main sections are self explonary and are the equvalent of the three panels you see in the built in editor. Beneath the exit section you'll notice the command `ParentTargetEdge`, this command tells the game the name of the parent goal. You may use the story outline to move goals around or you can directly edit the structure here.

## Known issues

- The reload commands for the Definitive Edition editor do not work, this is a bug in the editor. The `Compile and reload` tasks
  are disabled till this problem is solved.
- The code examples in the API explorer use a different syntax highlighting, see  
  https://github.com/Microsoft/vscode/issues/56356

## Feedback

All feedback is welcome. Please head over to the GitHub page of this project and start a new issue if you find any problems:  
https://github.com/sebastian-lenz/divinity-vscode/issues

## License

This extension is released under the MIT License.
