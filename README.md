# Synapse - Goal-Driven Social Network

<p align="center">
  <img src="https://img.shields.io/badge/Next.js-14-black?style=for-the-badge&logo=next.js" alt="Next.js">
  <img src="https://img.shields.io/badge/FastAPI-009688?style=for-the-badge&logo=fastapi" alt="FastAPI">
  <img src="https://img.shields.io/badge/PostgreSQL-4169E1?style=for-the-badge&logo=postgresql" alt="PostgreSQL">
  <img src="https://img.shields.io/badge/TypeScript-3178C6?style=for-the-badge&logo=typescript" alt="TypeScript">
</p>

A **goal-driven, anti-scroll social network** that connects people based on semantic interests and physical proximity. Replace endless scrolling with meaningful connections around shared goals.

![Synapse Banner](https://via.placeholder.com/800x400/0a0a0f/8b5cf6?text=Synapse)

## 🌟 Features

- **Semantic Matching**: Connect with people who share your goals and interests using AI-powered vector embeddings
- **Proximity Radar**: Discover people nearby who align with your aspirations
- **Impact System**: Replace likes with constructive feedback that matters
- **Focus Mode**: Track your goals with dedicated focus sessions
- **Real-time Updates**: WebSocket-powered instant notifications

## 🏗️ Architecture

```
┌─────────────┐     ┌─────────────┐     ┌─────────────┐
│  Frontend  │────▶│   Backend   │────▶│  Database  │
│  Next.js   │     │  FastAPI    │     │ PostgreSQL │
│   + Vercel │     │   + Render  │     │  + pgvector│
└─────────────┘     └─────────────┘     └─────────────┘
                           │
                           ▼
                    ┌─────────────┐
                    │    Redis    │
                    │   (Cache)   │
                    └─────────────┘
```

## 🚀 Quick Start

### Prerequisites

- Node.js 18+
- Python 3.12+
- Docker & Docker Compose

### Local Development

```bash
# Clone the repository
git clone https://github.com/YOUR_USERNAME/synapse.git
cd synapse

# Start with Docker
docker-compose up -d

# Access the app
# Frontend: http://localhost:3000
# Backend:  http://localhost:8000
# API Docs:  http://localhost:8000/docs
```

### Environment Variables

Create a `.env` file:

```env
# Database
DATABASE_URL=postgresql+asyncpg://user:pass@localhost:5432/db

# JWT
JWT_SECRET=your-secret-key

# OpenAI (optional)
OPENAI_API_KEY=sk-...

# Embedding Provider: "local" or "openai"
EMBEDDING_PROVIDER=local
```

## 📱 Tech Stack

### Frontend

- **Framework**: Next.js 14 (App Router)
- **Language**: TypeScript
- **Styling**: Tailwind CSS + Shadcn UI
- **State**: TanStack Query
- **Icons**: Lucide React

### Backend

- **Framework**: FastAPI
- **Database**: PostgreSQL + pgvector
- **Search**: H3 (Uber's spatial index)
- **Embeddings**: FastEmbed (local) or OpenAI
- **Queue**: TaskIQ/Arq
- **Cache**: Redis

## 🎯 Core Modules

| Module               | Description                                       |
| -------------------- | ------------------------------------------------- |
| **Semantic Profile** | AI-powered goal matching with vector embeddings   |
| **Proximity Radar**  | H3-based spatial indexing for nearby matches      |
| **Impact Engine**    | Constructive feedback system replacing likes      |
| **AI Feed**          | Personalized content based on semantic similarity |

## 📄 API Endpoints

- `POST /api/v1/auth/register` - Create account
- `POST /api/v1/auth/login` - Login
- `POST /api/v1/users/sync-goal` - Update your goal vector
- `POST /api/v1/users/location` - Update location
- `GET /api/v1/matches` - Get nearby semantic matches
- `GET /api/v1/feed` - Get AI-curated feed
- `POST /api/v1/feed/posts/{id}/impact` - Send impact feedback

## 🤝 Contributing

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/amazing`)
3. Commit changes (`git commit -m 'Add amazing feature'`)
4. Push to branch (`git push origin feature/amazing`)
5. Open a Pull Request

## 📝 License

MIT License - see [LICENSE](LICENSE) for details.

## 🔗 Links

- [Demo](https://synapse-demo.vercel.app) _(coming soon)_
- [API Documentation](http://localhost:8000/docs)
- [Report Bug](https://github.com/YOUR_USERNAME/synapse/issues)

---

<p align="center">Built with ❤️ using Next.js + FastAPI</p>
