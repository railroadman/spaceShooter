# Changelog

## [1.1.0] - 2025-08-29

### Added
- **Fighter Enemy AI:** Fighters now patrol horizontally using a time-based AI, making their movement more dynamic.
- **Player Controls:** The 'Spacebar' is now implemented as the fire key.
- Added a new sound asset.

### Fixed
- **Game Freeze:** Corrected a critical bug that caused the game to freeze upon enemy spawn. The issue was due to an incorrect class initialization order in the base `InputComponent`.
- **Player Movement:** The player ship now stops correctly when movement keys are released and uses direct velocity setting for more responsive control.

### Changed
- **Balancing:**
    - Increased player ship horizontal velocity.
    - Increased fighter enemy patrol range for wider movement.
    - Decreased enemy spawn rates for both Fighters and Scouts.

### Refactored
- **Movement Components:** Unified player and enemy horizontal movement into a single, configurable `HorizontalMovementComponent`, removing duplicated code.
- **Input Components:** Refactored all input components to ensure correct and consistent state initialization, fixing the root cause of the game freeze.
