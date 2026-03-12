# Clinical Decision Support System

The Clinical Decision Support System is an advanced healthcare management platform designed to assist medical professionals in diagnosing patients and recommending treatments. It analyzes symptoms, suggests diagnoses, and provides treatment recommendations, integrating seamlessly into the staff dashboard to streamline daily medical operations.

## Features

- **Actionable Dashboard**: Get a bird's-eye view of clinic operations, ongoing consultations, and patient metrics.
- **Decision Support Module**: Analyze symptoms to receive suggested diagnoses and tailored treatment recommendations.
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
   git clone https://github.com/amonayebare07-ship-it/CLINICAL-DECISION-SUPPORT-SYSTEM.git
   ```

2. Navigate directly into the project folder:
   ```bash
   cd CLINICAL-DECISION-SUPPORT-SYSTEM
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
