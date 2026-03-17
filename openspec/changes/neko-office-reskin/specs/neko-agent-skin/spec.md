## ADDED Requirements

### Requirement: Agent cat NPC sprite sheet loader
The system SHALL load the Neko Cafe cat NPC sprite sheet from `dashboard/public/assets/pixel-office/neko-cafe/` and use it to render all Agent characters as cat NPCs instead of human pixel characters.

#### Scenario: Sprite sheet loads successfully
- **WHEN** the Pixel Office page mounts
- **THEN** the Neko Cafe cat NPC sprite sheet PNG SHALL be loaded into an HTMLImageElement and cached

#### Scenario: Sprite sheet missing fallback
- **WHEN** the Neko Cafe cat NPC sprite sheet is not found
- **THEN** the system SHALL fall back to the existing SpriteData human character rendering

### Requirement: Agent palette maps to cat NPC variant
Each Agent SHALL be assigned one of the 3 Neko Cafe cat NPC variants based on their palette index (palette % 3).

#### Scenario: Three agents with different cats
- **WHEN** 3 Agents are active in the office
- **THEN** each Agent SHALL render as a different cat NPC variant from the Neko Cafe pack

#### Scenario: More than 3 agents
- **WHEN** more than 3 Agents are active
- **THEN** the cat variant SHALL cycle (palette % 3), allowing multiple Agents to share the same cat appearance

### Requirement: Agent walk animation using cat NPC walk frames
Agent characters in WALK state SHALL use the cat NPC walk animation frames from the Neko Cafe sprite sheet.

#### Scenario: Agent walking
- **WHEN** an Agent is in WALK state moving in any direction
- **THEN** the renderer SHALL cycle through the cat NPC walk animation frames for that direction

### Requirement: Agent typing/idle animation using cat NPC idle frames
Agent characters in TYPE or IDLE state SHALL use the cat NPC idle animation frames from the Neko Cafe sprite sheet.

#### Scenario: Agent typing at desk
- **WHEN** an Agent is in TYPE state (sitting at desk working)
- **THEN** the renderer SHALL display the cat NPC idle animation frames

#### Scenario: Agent idle
- **WHEN** an Agent is in IDLE state (standing still)
- **THEN** the renderer SHALL display the cat NPC idle frame (standing pose)

### Requirement: Rendering size adjustment
The renderer SHALL correctly handle the 16×16 cat NPC dimensions (vs the previous 16×24 human sprites), adjusting anchor points, sitting offsets, and label positions.

#### Scenario: Cat NPC draw position
- **WHEN** a cat NPC Agent is rendered
- **THEN** the sprite SHALL be anchored at bottom-center and the label SHALL appear above the cat at the correct height
