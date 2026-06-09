import express from "express";
import path from "path";
import fs from "fs";
import { createServer as createViteServer } from "vite";

async function startServer() {
  const app = express();
  const PORT = parseInt(process.env.PORT || '3141', 10);

  // Middleware to parse JSON request bodies
  app.use(express.json({ limit: "10mb" }));

  // API routes FIRST
  app.get("/api/health", (req, res) => {
    res.json({ status: "ok" });
  });

  // Save project data to ./data/user/projects/user1_project.json
  app.post("/api/projects/save", (req, res) => {
    try {
      const { tasks, projectStartDate, workWeekends, holidays } = req.body;

      if (!tasks || typeof projectStartDate !== "string" || typeof workWeekends !== "boolean") {
        return res.status(400).json({ error: "Invalid project dataset structure." });
      }

      // Ensure directory exists
      const dirPath = path.join(process.cwd(), "data", "user", "projects");
      if (!fs.existsSync(dirPath)) {
        fs.mkdirSync(dirPath, { recursive: true });
      }

      const filePath = path.join(dirPath, "user1_project.json");
      const dataPayload = {
        tasks,
        projectStartDate,
        workWeekends,
        holidays: holidays || [],
        savedAt: new Date().toISOString()
      };

      fs.writeFileSync(filePath, JSON.stringify(dataPayload, null, 2), "utf8");

      return res.json({ success: true, message: "Project saved to system server successfully!" });
    } catch (error: any) {
      console.error("Error saving project:", error);
      return res.status(500).json({ error: "Failed to write project to disk: " + error.message });
    }
  });

  // Load project data from ./data/user/projects/user1_project.json
  app.get("/api/projects/load", (req, res) => {
    try {
      const filePath = path.join(process.cwd(), "data", "user", "projects", "user1_project.json");
      if (!fs.existsSync(filePath)) {
        return res.status(404).json({ error: "No saved project found for user1." });
      }

      const fileContent = fs.readFileSync(filePath, "utf8");
      const data = JSON.parse(fileContent);

      return res.json(data);
    } catch (error: any) {
      console.error("Error loading project:", error);
      return res.status(500).json({ error: "Failed to load project from disk: " + error.message });
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
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
