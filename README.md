# Shaadi Timeline

A wedding-planning timeline and guest-facing experience built with Next.js and Tailwind CSS. The app provides a structured view of events, vendor touchpoints, and guest-specific pages.

## Features

- Timeline-focused planning experience
- Guest links and guest view flows
- Vendor-related views for coordination
- Responsive UI with a modern component library

## Tech Stack

- Next.js (App Router)
- React
- Tailwind CSS
- Prisma
- NextAuth

## Getting Started

Choose one of the following setups.

### Option A: Local Node.js

1) Install dependencies

```bash
npm install
```

2) Configure environment variables

Copy `.env.example` to `.env` and update values for your setup. At minimum:

```bash
DATABASE_URL=
NEXTAUTH_URL=
NEXTAUTH_SECRET=
```

3) Run the development server

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) to view the app.

### Option B: Docker

Build the image and run the container:

```bash
docker build -t shaadi-timeline .
docker run --rm -p 3000:3000 --env-file .env shaadi-timeline
```

### Option C: Docker Compose (App + Postgres)

Start the stack:

```bash
docker compose up --build
```

## Scripts

- `npm run dev` - start the dev server
- `npm run build` - build for production
- `npm run start` - start the production server
- `npm run lint` - run linting

## Project Structure

- `src/app` - Next.js routes and layouts
- `src/components` - shared UI components
- `prisma` - schema and seed data

## Deployment

Build the app and run the production server:

```bash
npm run build
npm run start
```
