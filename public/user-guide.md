# Project Timeline Generator User Guide

## Overview
The Project Timeline Generator is a professional desktop utility designed to help you create, manage, and visualize project timelines using dependency-based scheduling and Gantt chart chronologies.

## Getting Started
1. **Project Start Date**: In the Global Scheduler Bar, set your project's target start date. (Note: It is recommended to start on a Monday for standard workweek calculations).
2. **Weekend Work**: Toggle the "Work 7 days (incl. weekends)" checkbox if your project operates through weekends.

## Managing Tasks
- **Add Task / Group**: Click the "+ Add Task / Group" button to open the task editor.
  - **Standard Task**: Enter an ID, Name, Duration (in days), and optionally a Dependency (e.g., `T1`) and Offset (weeks after dependency).
  - **Group Folder**: Check "Is Group Folder" to create a collapsible container for organizing related tasks.
  - **Milestone**: Check "Is Milestone" for zero-duration marker tasks.
  - **Fixed Dates**: Check "Has Fixed Dates" to lock a task to specific calendar dates, bypassing the dependency scheduler.
- **Edit Task**: Click on any task row in the timeline sheet to open the editor and modify its properties.
- **Delete Task**: Use the trash icon in the task row or within the task editor to remove a task.

## Dependencies & Scheduling
- **Setting Dependencies**: In the task editor, enter the ID of a predecessor task (e.g., `T1`). The scheduler will automatically calculate the start and end dates based on the predecessor's end date plus any specified offset.
- **Dependency Chains**: You can chain multiple dependencies by separating IDs with commas (e.g., `T1, T2`). The system will prevent circular dependencies.
- **Visualization**: Use the "Show dependencies" dropdown in the toolbar to toggle dependency lines on the Gantt chart (None, All, or Multiple).

## Holidays & Blocked Days
1. Click **Project Actions** > **Manage Holidays...**.
2. **Add Custom**: Enter a name and date to block a specific non-working day.
3. **Presets**: Quickly load the "USA 2026 Federal Holidays" by choosing to *Replace* or *Merge* with your existing list.
4. **Import/Export**: You can import a JSON array of holidays or export your current list.
5. Blocked days are automatically skipped when the scheduler calculates task durations and offsets.

## Saving & Loading Projects
- **Save to Server**: Click **Project Actions** > **Save to Server...**. Enter a filename (e.g., `Sample_0Project`) to save your current state to the backend. If the file exists, a timestamped backup is created automatically.
- **Load from Server**: Click **Project Actions** > **Load from Server...** to view and load previously saved projects or backups.
- **Export/Import JSON**: Use the Export/Import options in the Project Actions menu to download your project as a `.json` file or upload one from your local machine.
- **Auto-Save**: Your work is automatically saved to your browser's local storage, ensuring you don't lose progress on accidental refreshes.

## Keyboard Shortcuts & Tips
- Press `Enter` while typing a filename in the Save modal to quickly confirm.
- Collapsed group folders will hide their child tasks in both the spreadsheet and Gantt views, helping you focus on high-level phases.
- The "Est. Completion" badge in the header updates dynamically to show the latest calculated end date across all tasks.

---
*By Jorge Pereira (35sites.com LLC).*
