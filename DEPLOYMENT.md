# Campus Marketplace Deployment Guide

This project is organized into two main directories for a **Split Architecture** deployment:

-   `/backend`: Contains the Express server, PostgreSQL connection, and Socket.io logic.
-   `/frontend`: Contains the React application, Tailwind CSS, and Vite configuration.

## Option 1: Split Architecture (Recommended)

### 1. Database: Supabase
1.  Create a project on [Supabase](https://supabase.com).
2.  Go to **Project Settings > Database** and copy the **Connection String** (URI).
3.  You will use this as your `DATABASE_URL`.

### 2. Backend: Railway
1.  Connect your GitHub repository to [Railway](https://railway.app).
2.  Add a **New Service** from your repo.
3.  Set the **Root Directory** to `backend`.
4.  In **Variables**, add:
    *   `DATABASE_URL`: (From Supabase)
    *   `JWT_SECRET`: (Random string)
    *   `FRONTEND_URL`: (Your Vercel URL, e.g., `https://your-app.vercel.app`)
    *   `GOOGLE_CLIENT_ID` / `GOOGLE_CLIENT_SECRET`: (From Google Console)
5.  Railway will use the `backend/Dockerfile` to build and deploy.

### 3. Frontend: Vercel
1.  Connect your GitHub repository to [Vercel](https://vercel.com).
2.  Select the project and set the **Root Directory** to `frontend`.
3.  In **Environment Variables**, add:
    *   `VITE_API_URL`: (Your Railway URL, e.g., `https://your-backend.railway.app`)
4.  Vercel will build and deploy the React app.

---

## Option 2: All-in-One (Render.com)

Render.com is the easiest way to deploy this application using the provided `render.yaml` blueprint.

1.  **Connect GitHub:** Connect your GitHub repository to [Render.com](https://render.com).
2.  **Create Blueprint:**
    *   Click **"New +"** and select **"Blueprint"**.
    *   Select your repository.
    *   Render will automatically detect the `render.yaml` file and set up:
        *   A **Web Service** for the application.
        *   A **PostgreSQL Database**.
        *   A **Persistent Disk** for file uploads.
3.  **Configure Environment Variables:**
    *   During setup, Render will prompt you for `APP_URL`, `GOOGLE_CLIENT_ID`, and `GOOGLE_CLIENT_SECRET`.
    *   `JWT_SECRET` will be generated automatically.
    *   `DATABASE_URL` will be linked automatically from the created database.
4.  **Deploy:** Click **"Apply"** to start the deployment.

## Option 2: Deploying to Fly.io

1.  **Install Fly CLI:** [Instructions here](https://fly.io/docs/hands-on/install-flyctl/)
2.  **Login:** `fly auth login`
3.  **Create App & Database:**
    ```bash
    fly launch
    ```
    *   Follow the prompts to create a PostgreSQL database when asked.
4.  **Create Volume (for uploads):**
    ```bash
    fly volumes create campus_data --size 1 --region <your-region>
    ```
5.  **Set Secrets:**
    ```bash
    fly secrets set JWT_SECRET=your_random_secret_string GOOGLE_CLIENT_ID=... GOOGLE_CLIENT_SECRET=... APP_URL=...
    ```
6.  **Deploy:**
    ```bash
    fly deploy
    ```

## Configuration Details

*   **Dockerfile:** Handles the multi-stage build of the React frontend and the Express backend.
*   **render.yaml:** Blueprint for Render.com deployment.
*   **fly.toml:** Configuration for Fly.io deployment.
*   **Database:** The application uses PostgreSQL. Ensure the `DATABASE_URL` environment variable is set in your production environment.
