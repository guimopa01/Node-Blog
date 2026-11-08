require("dotenv").config();

const express = require("express");
const { PrismaPg } = require("@prisma/adapter-pg");
const { PrismaClient } = require("@prisma/client");

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL });
const prisma = new PrismaClient({ adapter });
const app = express();

app.use(express.json());

app.get("/", (_request, response) => {
  response.json({
    name: "Node-Blog",
    posts: "GET /posts",
    createPost: "POST /posts",
  });
});

app.get("/posts", async (_request, response, next) => {
  try {
    const posts = await prisma.post.findMany({
      orderBy: { createdAt: "desc" },
    });
    response.json(posts);
  } catch (error) {
    next(error);
  }
});

app.post("/posts", async (request, response, next) => {
  const { title, content } = request.body ?? {};

  if (typeof title !== "string" || !title.trim() || typeof content !== "string" || !content.trim()) {
    return response.status(400).json({ error: "title y content son obligatorios" });
  }

  try {
    const post = await prisma.post.create({
      data: { title: title.trim(), content: content.trim() },
    });
    response.status(201).json(post);
  } catch (error) {
    next(error);
  }
});

app.use((error, _request, response, _next) => {
  console.error(error);
  response.status(500).json({ error: "Error interno del servidor" });
});

const port = Number(process.env.PORT) || 3000;
app.listen(port, () => {
  console.log(`Node-Blog disponible en http://localhost:${port}`);
});