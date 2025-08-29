# Gemini Code Assistant Report

## Project Overview

This project is a classic 2D space shooter game built with the [Phaser 3](https://phaser.io/) HTML5 game framework. The game features a player-controlled spaceship, different types of enemies, and a scoring system. The code is written in JavaScript (ES6 modules) and follows a component-based architecture.

The game is structured into three main scenes:

*   `BootScene`: Handles the initial loading of assets required for the preloader.
*   `PreloadScene`: Loads all the game assets, including images, sounds, and animation data. It also creates the animations used in the game.
*   `GameScene`: Contains the core gameplay logic, including player and enemy creation, collision detection, and UI management.

The project uses a `config.js` file to store game-specific constants, such as player and enemy stats, which makes it easy to tweak the game's difficulty and balance.

## Building and Running

This project does not have a build process. To run the game, you need to serve the project directory using a local web server.

**Running the game:**

1.  Make sure you have a local web server installed. If you are using Visual Studio Code, you can install the [Live Server](https://marketplace.visualstudio.com/items?itemName=ritwickdey.LiveServer) extension.
2.  Start your local web server and open the `index.html` file in your browser.

## Development Conventions

*   **Code Style**: The code is written in modern JavaScript (ES6) and uses modules to organize the codebase. The code is well-formatted and includes JSDoc comments to describe the purpose of classes and methods.
*   **File Naming**: Files are named using kebab-case (e.g., `game-scene.js`).
*   **Component-Based Architecture**: The game uses a component-based architecture to separate different aspects of the game logic. For example, there are components for input, movement, and weapons. This makes the code more modular and easier to maintain.
*   **Configuration**: Game-specific constants are stored in the `src/config.js` file. This makes it easy to configure the game without having to modify the core game logic.
