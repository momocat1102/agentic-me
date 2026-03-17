## ADDED Requirements

### Requirement: Neko Cafe furniture sprites
The system SHALL support rendering furniture items from the Neko Cafe tileset PNG. Each furniture type in the catalog SHALL have either a `spriteData` source (existing SpriteData) or a `tileset` source (PNG rect coordinates).

#### Scenario: Tileset-based furniture rendering
- **WHEN** a furniture item has `spriteSource: 'tileset'` in the catalog
- **THEN** the renderer SHALL draw it using `ctx.drawImage()` with the specified source rect from the tileset PNG

#### Scenario: SpriteData-based furniture rendering preserved
- **WHEN** a furniture item has `spriteSource: 'spriteData'` in the catalog
- **THEN** the renderer SHALL continue using `getCachedSprite()` as before

### Requirement: New cafe furniture types
The furniture catalog SHALL include new Neko Cafe themed items: counter, cafe_table, cafe_chair, display_case, pastry_shelf, coffee_machine, oven, and decorative items (potted_plant_cafe, wall_art).

#### Scenario: Counter placement
- **WHEN** a counter furniture item is placed in the layout
- **THEN** it SHALL render as the Neko Cafe counter sprite with correct footprint dimensions

#### Scenario: Cafe table and chairs
- **WHEN** cafe_table and cafe_chair items are placed
- **THEN** they SHALL render as matching Neko Cafe style furniture

### Requirement: Decorative food items
The system SHALL support decorative food sprites (pastries, coffee cups) from the Neko Cafe asset pack as placeable furniture items.

#### Scenario: Pastry display
- **WHEN** a pastry or coffee decoration is placed on a counter or table
- **THEN** it SHALL render as the corresponding Neko Cafe food sprite at the correct z-order (above the surface)
