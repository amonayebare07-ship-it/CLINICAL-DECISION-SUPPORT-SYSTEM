# Bishop's Health Hub

Bishop's Health Hub is a comprehensive healthcare management and modern clinic administrative platform. Built to streamline day-to-day medical facility operations, this application offers intuitive interfaces for managing patient journeys, staff coordination, and medical inventory.

## Features

- **Actionable Dashboard**: Get a bird's-eye view of clinic operations, ongoing consultations, and patient metrics.
- **Patient Queue Management**: Seamlessly handle checking in patients, tracking waiting times, and triaging.
- **Consultations & Records**: Document patient visits, track histories, and maintain detailed electronic health records.
- **Appointments System**: Schedule, reschedule, and manage upcoming patient appointments.
- **Inventory Management**: Keep track of medical supplies, medications, and general hospital assets.
- **User & Role Management**: Maintain secure access for different personnel (Doctors, Nurses, Admins).
- **Reports & Analytics**: Generate insights into clinic performance, patient demographics, and more.

## Tech Stack

This project is built with modern web technologies:

- **Frontend Framework**: [React](https://reactjs.org/) + [Vite](https://vitejs.dev/) + [TypeScript](https://www.typescriptlang.org/)
- **UI & Styling**: [Tailwind CSS](https://tailwindcss.com/) + [shadcn/ui](https://ui.shadcn.com/)
- **Routing**: [React Router](https://reactrouter.com/)
- **State & Data Fetching**: [React Query (@tanstack/react-query)](https://tanstack.com/query/v5)
- **Forms**: [React Hook Form](https://react-hook-form.com/) + [Zod](https://zod.dev/)
- **Backend & Database**: [Supabase](https://supabase.com/)
- **Charts**: [Recharts](https://recharts.org/)

## Getting Started

### Prerequisites

Ensure you have [Node.js](https://nodejs.org/) installed before proceeding.

### Installation

1. Clone the repository:
   ```bash
   git clone https://github.com/amonayebare07-ship-it/bishop-s-health-hub.git
   ```

2. Navigate directly into the project folder:
   ```bash
   cd bishop-s-health-hub
   ```

3. Install the application dependencies:
   ```bash
   npm install
   ```

### Running the Application

Start the local development server:

```bash
npm run dev
```

The application will be available at `http://localhost:5173` (or the nearest available port as specified in your terminal).

## Deployment

You can build the application for production using:

```bash
npm run build
```

This will create a `dist` folder. The production build can be hosted on platforms like Vercel, Netlify, or any static hosting solution.
