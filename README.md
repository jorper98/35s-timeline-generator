# Project Timeline Generator
**Version:** v1.2.0

## Description
A web-based project timeline generator.   It creates a visual Gantt chart to that allows users to create, manage, and visualize project timelines with support for task dependencies, offsets, group folders, milestones, and holiday scheduling.
This is Not intended to as a replacement to a project management but rather as a tool to help you visualize your project timeline and dependencies.   

## Features
- **Task Management**: Add, edit, and delete tasks with customizable properties.
- **Dependencies**: Set dependencies between tasks to automatically calculate start and end dates.
- **Group Folders**: Organize tasks into collapsible group folders.
- **Milestones**: Mark specific tasks as milestones for easy identification.
- **Holiday Scheduling**: block dates, add  custom holidays or load a preset (e.g., USA 2026 Federal Holidays) to ensure accurate scheduling.
- **Visual Timeline**: View tasks in a Gantt chart format with color-coded tasks.
- **Project Metrics**: Display project duration, start date, and end date.
- **Save & Load**: Save your project to local storage or download as a JSON file. Load projects from local storage or upload a JSON file.
- **Responsive Design**: Works on desktop and mobile devices.
- **Ability to toggle dependecy lines** in gannt chart (show none, all, multiple)
- **Adding a Task**: Click the "+ Add Task / Group" button, fill in the details (ID, Name, Duration, Dependencies), and save.
- **Setting Dependencies**: In the task form, select predecessor tasks to automatically calculate start and end dates based on the dependency chain.
- **Managing Holidays**: Expand the "Holidays & Blocked Non-Working Days" section to add custom holidays or load the USA 2026 Federal preset.




## Usage Instructions

### Local Development
1. Clone the repository.
2. Install dependencies: `npm install`
3. Start the development server: `npm run dev`
4. Open your browser and navigate to `http://localhost:3141`

### Docker Deployment
To run the application fully in a Docker container:

1. Ensure Docker and Docker Compose are installed on your system.
2. Build and start the container:
   ```bash
   docker-compose up -d --build
   ```
3. Open your browser and navigate to `http://localhost:3141`
4. To stop the container, run:
   ```bash
   docker-compose down
   ```
*Note: The `docker-compose.yml` file maps the `./data` directory to the container, ensuring your saved projects persist locally.*



## Dependencies / Requirements
- Node.js (v18 or higher recommended)
- npm or yarn

## License
MIT License

Copyright (c) 2026 Jorge Pereira (35sites.com LLC)

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all
copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
SOFTWARE.