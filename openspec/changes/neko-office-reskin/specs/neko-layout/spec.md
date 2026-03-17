## ADDED Requirements

### Requirement: Neko Cafe office layout
The `createDefaultLayout()` function SHALL define a new 21×17 tile layout with a Neko Cafe theme, including distinct zones: counter/service area, seating area, and work area.

#### Scenario: Counter zone
- **WHEN** the layout is initialized
- **THEN** there SHALL be a counter area near the top or side of the room with counter furniture, coffee machine, and pastry display

#### Scenario: Seating zone
- **WHEN** the layout is initialized
- **THEN** there SHALL be a seating area with cafe tables and chairs where Agents can sit

#### Scenario: Work zone
- **WHEN** the layout is initialized
- **THEN** there SHALL be a work area with desks and computers where working Agents are positioned

#### Scenario: Pathfinding compatibility
- **WHEN** Agents and cats navigate the new layout
- **THEN** all walkable tiles SHALL be reachable and furniture footprints SHALL correctly block movement

### Requirement: Floor zone differentiation
Different zones in the layout SHALL use different floor tile types to visually distinguish areas (e.g., wood for seating, tile for counter, carpet for work area).

#### Scenario: Zone-specific flooring
- **WHEN** the layout defines a counter zone and a seating zone
- **THEN** each zone SHALL have a distinct floor tile type from the Neko Cafe tileset
