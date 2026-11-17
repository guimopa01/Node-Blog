require("dotenv").config();

const path = require("node:path");
const express = require("express");
const session = require("express-session");
const prisma = require("./src/config/prisma");
const authRoutes = require("./src/routes/authRoutes");
const postRoutes = require("./src/routes/postRoutes");
const adminRoutes = require("./src/routes/adminRoutes");
const { getBlockedEmails, publicPostListQuery, publicPostWhere } = require("./src/utils/contentVisibility");
const { isAuthenticated } = require("./src/middlewares/authMiddleware");
const app = express();

app.set("view engine", "ejs");
app.set("views", path.join(__dirname, "src/views"));
app.use(express.urlencoded({ extended: false }));
app.use(express.json());
app.use(express.static(path.join(__dirname, "public")));

const sessionSecret = process.env.SESSION_SECRET
  || (process.env.NODE_ENV === "production" ? undefined : "node-blog-local-development-secret");

if (!sessionSecret) {
  throw new Error("SESSION_SECRET es obligatorio en producción");
}

if (process.env.NODE_ENV === "production") {
  app.set("trust proxy", 1);
}

app.use(session({
  name: "node-blog.sid",
  secret: sessionSecret,
  resave: false,
  saveUninitialized: false,
  cookie: {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    maxAge: 24 * 60 * 60 * 1000,
  },
}));

app.use(async (request, response, next) => {
  try {
    let user = request.session.user ?? null;
    if (user) {
      user = await prisma.user.findUnique({
        where: { id: user.id },
        select: { id: true, name: true, email: true, role: true, isBlocked: true },
      });

      if (!user || user.isBlocked) {
        await new Promise((resolve, reject) => {
          request.session.destroy((error) => error ? reject(error) : resolve());
        });
        response.clearCookie("node-blog.sid");
        return response.redirect("/auth/login?blocked=1");
      }

      request.session.user = {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
      };
    }

    response.locals.user = user;
    response.locals.currentPath = request.path;
    next();
  } catch (error) {
    next(error);
  }
});

app.get("/", async (_request, response, next) => {
  try {
    const blockedEmails = await getBlockedEmails();
    const posts = await prisma.post.findMany({
      ...publicPostListQuery(blockedEmails),
      take: 6,
    });
    response.render("index", {
      title: "Node Blog — inicio",
      posts,
      recentPosts: posts.slice(0, 5),
    });
  } catch (error) {
    next(error);
  }
});

app.get("/about", (_request, response) => {
  response.render("about", { title: "Node Blog — Sobre nosotros" });
});

app.get("/profiles", async (_request, response, next) => {
  try {
    const profiles = await prisma.user.findMany({
      where: { isBlocked: false },
      select: {
        id: true,
        name: true,
        _count: { select: { posts: true } },
      },
      orderBy: { name: "asc" },
    });
    response.render("profiles", {
      title: "Node Blog — Perfiles",
      profiles,
    });
  } catch (error) {
    next(error);
  }
});

app.get("/profiles/:id", async (request, response, next) => {
  const profileId = Number(request.params.id);
  if (!Number.isSafeInteger(profileId) || profileId < 1) {
    return response.status(404).send("Perfil no encontrado.");
  }

  try {
    const [profile, blockedEmails] = await Promise.all([
      prisma.user.findUnique({
        where: { id: profileId, isBlocked: false },
        select: { id: true, name: true },
      }),
      getBlockedEmails(),
    ]);

    if (!profile) return response.status(404).send("Perfil no encontrado.");

    const posts = await prisma.post.findMany({
      ...publicPostListQuery(blockedEmails),
      where: { AND: [publicPostWhere, { userId: profileId }] },
    });

    response.render("profile", {
      title: `Node Blog — Perfil de ${profile.name}`,
      profile,
      posts,
    });
  } catch (error) {
    next(error);
  }
});

app.get("/blog", async (_request, response, next) => {
  try {
    const blockedEmails = await getBlockedEmails();
    const posts = await prisma.post.findMany(publicPostListQuery(blockedEmails));
    response.render("blog", {
      title: "Node Blog — Blog",
      posts,
      recentPosts: posts.slice(0, 5),
    });
  } catch (error) {
    next(error);
  }
});

app.get("/contact", (request, response) => {
  response.render("contact", {
    title: "Node Blog — Contacta con nosotros",
    contactSent: request.query.sent === "1",
  });
});

app.use("/auth", authRoutes);
app.use("/admin", adminRoutes);
app.use("/", postRoutes);

app.get("/posts", async (_request, response, next) => {
  try {
    const posts = await prisma.post.findMany({
      where: publicPostWhere,
      orderBy: { createdAt: "desc" },
    });
    response.json(posts);
  } catch (error) {
    next(error);
  }
});

app.post("/posts", isAuthenticated, async (request, response, next) => {
  const { title, content } = request.body ?? {};

  if (typeof title !== "string" || !title.trim() || typeof content !== "string" || !content.trim()) {
    return response.status(400).json({ error: "title y content son obligatorios" });
  }

  try {
    const post = await prisma.post.create({
      data: {
        title: title.trim(),
        content: content.trim(),
        user: { connect: { id: request.session.user.id } },
      },
    });
    response.status(201).json(post);
  } catch (error) {
    next(error);
  }
});

app.post("/contact", async (request, response, next) => {
  const { name, lastName, email, message } = request.body ?? {};

  if (
    typeof name !== "string" || !name.trim()
    || typeof lastName !== "string"
    || typeof email !== "string" || !email.trim()
    || typeof message !== "string" || !message.trim()
  ) {
    return response.status(400).send("Completa los campos obligatorios del formulario.");
  }

  try {
    await prisma.contact.create({
      data: {
        name: name.trim(),
        lastName: lastName.trim(),
        email: email.trim(),
        message: message.trim(),
      },
    });
    response.redirect("/contact?sent=1");
  } catch (error) {
    next(error);
  }
});

app.use((error, _request, response, _next) => {
  console.error(error);
  response.status(500).send("Error interno del servidor");
});

const port = Number(process.env.PORT) || 3000;
app.listen(port, () => {
  console.log(`Node-Blog disponible en http://localhost:${port}`);
});