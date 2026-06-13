import express from "express";
import path from "path";
import fs from "fs";
import { createServer as createViteServer } from "vite";

async function startServer() {
  const app = express();
  const PORT = parseInt(process.env.PORT || '3141', 10);
  const packageJson = JSON.parse(fs.readFileSync(path.join(process.cwd(), "package.json"), "utf8"));
  const VERSION = packageJson.version || "1.1.0";

  // Middleware to parse JSON request bodies
  app.use(express.json({ limit: "10mb" }));

  // API routes FIRST
  app.get("/api/health", (req, res) => {
    res.json({ status: "ok" });
  });

  // Save project data to ./data/user/projects/[filename].json with backup
  app.post("/api/projects/save", (req, res) => {
    try {
      const { tasks, projectStartDate, workWeekends, holidays, filename } = req.body;

      if (!tasks || typeof projectStartDate !== "string" || typeof workWeekends !== "boolean") {
        return res.status(400).json({ error: "Invalid project dataset structure." });
      }

      // Sanitize filename
      let safeFilename = filename ? filename.trim() : "Sample_0Project";
      if (!safeFilename.endsWith(".json")) {
        safeFilename += ".json";
      }
      // Prevent directory traversal
      safeFilename = path.basename(safeFilename);

      // Ensure directory exists
      const dirPath = path.join(process.cwd(), "data", "user", "projects");
      if (!fs.existsSync(dirPath)) {
        fs.mkdirSync(dirPath, { recursive: true });
      }

      const filePath = path.join(dirPath, safeFilename);
      
      // Create backup if file exists
      if (fs.existsSync(filePath)) {
        const timestamp = new Date().toISOString().replace(/[-:TZ]/g, "").slice(0, 14);
        const nameWithoutExt = path.basename(safeFilename, ".json");
        const backupPath = path.join(dirPath, `${nameWithoutExt}-backup-${timestamp}.json`);
        fs.copyFileSync(filePath, backupPath);
      }
      
      const dataPayload = {
        tasks,
        projectStartDate,
        workWeekends,
        holidays: holidays || [],
        savedAt: new Date().toISOString()
      };

      fs.writeFileSync(filePath, JSON.stringify(dataPayload, null, 2), "utf8");

      return res.json({ success: true, message: `Project saved to ${safeFilename} successfully!` });
    } catch (error: any) {
      console.error("Error saving project:", error);
      return res.status(500).json({ error: "Failed to write project to disk: " + error.message });
    }
  });

  // List available projects
  app.get("/api/projects/list", (req, res) => {
    try {
      const dirPath = path.join(process.cwd(), "data", "user", "projects");
      if (!fs.existsSync(dirPath)) {
        return res.json({ projects: [] });
      }

      const files = fs.readdirSync(dirPath)
        .filter(f => f.endsWith(".json"))
        .map(f => {
          const stats = fs.statSync(path.join(dirPath, f));
          return {
            filename: f,
            isBackup: f.includes("backup"),
            size: stats.size,
            modified: stats.mtime.toISOString()
          };
        })
        .sort((a, b) => {
          // Main files first (alphabetically), then backups (newest first)
          if (!a.isBackup && b.isBackup) return -1;
          if (a.isBackup && !b.isBackup) return 1;
          if (!a.isBackup && !b.isBackup) return a.filename.localeCompare(b.filename);
          return b.filename.localeCompare(a.filename);
        });

      return res.json({ projects: files });
    } catch (error: any) {
      console.error("Error listing projects:", error);
      return res.status(500).json({ error: "Failed to list projects: " + error.message });
    }
  });

  // Load specific project file
  app.get("/api/projects/load", (req, res) => {
    try {
      const filename = (req.query.file as string) || "Sample_0Project.json";
      if (!filename || filename.includes("..") || !filename.endsWith(".json")) {
        return res.status(400).json({ error: "Invalid filename." });
      }

      const filePath = path.join(process.cwd(), "data", "user", "projects", filename);
      if (!fs.existsSync(filePath)) {
        return res.status(404).json({ error: `Project file ${filename} not found.` });
      }

      const fileContent = fs.readFileSync(filePath, "utf8");
      const data = JSON.parse(fileContent);

      return res.json(data);
    } catch (error: any) {
      console.error("Error loading project:", error);
      return res.status(500).json({ error: "Failed to load project from disk: " + error.message });
    }
  });

  // Delete a specific project file
  app.delete("/api/projects/delete/:filename", (req, res) => {
    try {
      const { filename } = req.params;
      if (!filename || filename.includes("..") || !filename.endsWith(".json")) {
        return res.status(400).json({ error: "Invalid filename." });
      }

      const dirPath = path.join(process.cwd(), "data", "user", "projects");
      const filePath = path.join(dirPath, filename);

      if (!fs.existsSync(filePath)) {
        return res.status(404).json({ error: "File not found." });
      }

      fs.unlinkSync(filePath);
      return res.json({ success: true, message: "Project deleted successfully." });
    } catch (error: any) {
      console.error("Error deleting project:", error);
      return res.status(500).json({ error: "Failed to delete project: " + error.message });
    }
  });

  // Vite middleware for development
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Project Timeline Generator v${VERSION} running on http://localhost:${PORT}`);
  });
}

startServer();
