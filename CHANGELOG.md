# Changelog

## [1.2.2] - 2026-06-13
- Added automatic localStorage persistence to remember the current project state across browser refreshes.
- Streamlined header actions into a unified "Project Actions" dropdown menu.
- Removed "Reset Preset" button to simplify the interface.
- Added 8px horizontal padding to the Gantt chart section for better visual spacing.

## [1.2.1] - 2026-06-13
- Added "Load from Server" modal to view, load, and delete saved project datasets.
- Implemented automatic timestamped backups (`user1_project-backup-YYYYMMDDHHmmss.json`) before overwriting existing server files.
- Added API endpoints for listing, loading specific files, and deleting server-side project files.

## [1.1.0] 
- Moved dependency visibility toggle to a dropdown menu next to the "Add Task / Group" button.
- Changed default dependency visibility to "None".
- Added clickable logo opening an "About" modal with application details and MIT license information.
- Updated SVG logo integration across the application.

## [1.0.0] 
- Initial release of Project Timeline Generator.
- Added core scheduling engine with dependency resolution and topological sorting.
- Implemented unified spreadsheet and Gantt chart UI.
- Added support for task groups, milestones, and fixed-date tasks.
- Integrated holiday scheduling with USA 2026 federal preset.
- Added server-side persistence for project state.
- Added JSON import/export functionality.
- Updated documentation and compliance with development guidelines.