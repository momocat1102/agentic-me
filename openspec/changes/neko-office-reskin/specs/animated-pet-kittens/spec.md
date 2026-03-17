## ADDED Requirements

### Requirement: Last tick sprite sheet integration for pet cats
The system SHALL load the Last tick 32×32 Pixel Kittens sprite sheet from `dashboard/public/assets/pixel-office/cats/` and render pet cats (non-Agent cats) using `ctx.drawImage()` with source rect cropping.

#### Scenario: Sprite sheet loads
- **WHEN** the Pixel Office page mounts
- **THEN** the Last tick sprite sheet PNG SHALL be loaded and cached

#### Scenario: Fallback on missing asset
- **WHEN** the Last tick sprite sheet is not found
- **THEN** the system SHALL fall back to the existing LPC cats sprite sheet

### Requirement: Multi-color pet cat variants
The system SHALL support at least 3 pet cat color variants from the Last tick free pack: gray, white, and ginger (orange).

#### Scenario: Two pet cats with different colors
- **WHEN** the office spawns 2 pet cats
- **THEN** each pet cat SHALL have a distinct color variant

### Requirement: Pet cat walk animation
Pet cats SHALL have walk animations in 4 directions (up, down, left, right) using frames from the Last tick sprite sheet.

#### Scenario: Pet cat walking right
- **WHEN** a pet cat moves in the RIGHT direction
- **THEN** the renderer SHALL cycle through the walk-right animation frames from the Last tick sprite sheet

### Requirement: Pet cat idle and sleep animations
Pet cats SHALL support idle (sitting) and sleep (curled up) animations using dedicated frames from the Last tick sprite sheet.

#### Scenario: Pet cat sitting idle
- **WHEN** a pet cat's behavior is 'sit'
- **THEN** the renderer SHALL display the sit/idle animation frames

#### Scenario: Pet cat sleeping
- **WHEN** a pet cat's behavior is 'sleep'
- **THEN** the renderer SHALL display the sleep animation frame(s)

### Requirement: Rich animation variety
The system SHALL utilize the Last tick sprite sheet's animation variety to provide natural and diverse pet cat behavior.

#### Scenario: Animation frame count
- **WHEN** a pet cat walks in any direction
- **THEN** the walk animation SHALL have at least 4 frames per direction for smooth movement
