## ADDED Requirements

### Requirement: Tileset PNG loader
The system SHALL load Neko Cafe tileset PNG files from `dashboard/public/assets/pixel-office/neko-cafe/` and provide a `drawTile(ctx, tileId, x, y, zoom)` method to render individual tiles by source rect cropping.

#### Scenario: Tileset image loads successfully
- **WHEN** the Pixel Office page mounts
- **THEN** the tileset PNG SHALL be loaded into an HTMLImageElement and cached for rendering

#### Scenario: Tileset image missing
- **WHEN** the tileset PNG file is not found at the expected path
- **THEN** the system SHALL fall back to the existing SpriteData floor/wall rendering

### Requirement: Floor tiles from tileset
The system SHALL render floor tiles using Neko Cafe tileset PNG instead of SpriteData colorize pipeline. Floor tile types SHALL include at least: wood planks, tile pattern, and carpet variants.

#### Scenario: Wood floor rendering
- **WHEN** a floor cell has tile type 'wood'
- **THEN** the renderer SHALL draw the corresponding 16×16 region from the Neko Cafe tileset PNG, scaled by zoom factor

#### Scenario: Floor tile variety
- **WHEN** the office layout defines multiple floor zones
- **THEN** each zone SHALL use a distinct floor tile type from the tileset

### Requirement: Wall tiles from tileset
The system SHALL render wall tiles using Neko Cafe tileset PNG. The auto-tiling system (4-bit neighbor mask) SHALL map to corresponding tileset wall tile variants.

#### Scenario: Wall auto-tiling with tileset
- **WHEN** a wall cell has neighbors on specific sides
- **THEN** the renderer SHALL select the appropriate wall tile variant from the tileset based on the 4-bit neighbor mask (N=1, E=2, S=4, W=8)

#### Scenario: Wall-floor boundary
- **WHEN** a wall cell is adjacent to a floor cell
- **THEN** the wall tile SHALL visually connect with the floor tile without gaps or misalignment
