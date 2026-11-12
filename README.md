# Messagify

A lightweight, real-time messaging platform built with React 19, Node.js, and Socket.IO.

https://github.com/user-attachments/assets/4a07d122-ee96-40c7-9751-37d0431e6ab0
---

## Features

- **Real-Time Messaging:** Instant two-way communication powered by Socket.IO with multi-device presence and live typing indicators.
- **Audio Voice Notes:** In-browser audio recording via HTML5 `MediaRecorder` with inline playback scrubbing.
- **Group Channels:** Multi-user conversation rooms with member management and isolated socket event routing.
- **Message Controls:** In-place message editing, in-site modal confirmation for deletions, and live emoji reactions.
- **Dynamic Theming:** 32 switchable DaisyUI themes synced across the entire application interface.
- **Security:** HTTP-only JWT authentication cookies, brute-force rate limiting, and Helmet HTTP protection.

---

## Tech Stack

- **Frontend:** React 19, Vite, Zustand, Tailwind CSS, DaisyUI, Lucide React
- **Backend:** Node.js, Express 5, Socket.IO 4, MongoDB Atlas (Mongoose), Cloudinary
- **DevOps & Testing:** Docker, Docker Compose, Vitest, Nginx

---

## Getting Started

### Prerequisites

- Node.js >= 18.0.0
- MongoDB instance or Atlas connection string
- Cloudinary credentials

### Quick Start

1. **Clone the repository:**
   ```bash
   git clone https://github.com/KURO-1125/Messagify.git
   cd Messagify
   ```

2. **Configure environment:**
   Create `backend/.env` (reference `backend/.env.example`):
   ```env
   PORT=5001
   MONGODB_URI=your_mongodb_connection_string
   JWT_SECRET=your_jwt_secret
   CLOUDINARY_CLOUD_NAME=your_cloud_name
   CLOUDINARY_API_KEY=your_api_key
   CLOUDINARY_API_SECRET=your_api_secret
   CLIENT_URL=http://localhost:5173
   ```

3. **Install dependencies and run:**
   ```bash
   # Run Backend (http://localhost:5001)
   npm install --prefix backend
   npm run dev --prefix backend

   # Run Frontend (http://localhost:5173)
   npm install --prefix frontend
   npm run dev --prefix frontend
   ```

---

## Docker

Run the entire application stack containerized:

```bash
docker-compose up --build
```

---

## Testing

Execute the automated backend test suite:

```bash
npm run test --prefix backend
```

---

## Deployment

- **Backend (Render):** Deploy as a persistent Node.js Web Service to maintain WebSocket connections (`Root: backend`, `Start: node src/index.js`).
- **Frontend (Vercel / Netlify):** Deploy `frontend/` as a static SPA (`Build: npm run build`, `Publish: dist`). Set `VITE_API_URL` to your backend URL.

---

## License

MIT
