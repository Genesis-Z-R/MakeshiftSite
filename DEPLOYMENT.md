# Campus Marketplace Deployment Guide (Fly.io)

This application is ready to be deployed to Fly.io. It uses SQLite for data storage and Socket.io for real-time messaging.

## Option 1: Deploying via GitHub (Recommended for automatic updates)

If you have connected your GitHub repository to Fly.io:

1.  **Create the App on Fly.io:**
    *   Go to the [Fly.io Dashboard](https://fly.io/dashboard).
    *   Click **"Launch a new app"** and select your GitHub repository.
    *   Choose a name (e.g., `campus-marketplace`). **Note:** This should match the `app` name in your `fly.toml` if you want to use the existing configuration.

2.  **IMPORTANT: Create a Volume (Required for Database):**
    *   Fly.io won't automatically create the persistent volume required for SQLite.
    *   Once the app is created (even if the first deployment fails), go to the **"Volumes"** tab in your app dashboard on the Fly.io website.
    *   Click **"Create Volume"**.
    *   **Name:** `campus_data` (This MUST match the `source` in `fly.toml`).
    *   **Size:** 1GB (Free tier friendly).
    *   **Region:** Choose the same region as your app.

3.  **Set Secrets:**
    *   Go to the **"Secrets"** tab in your app dashboard.
    *   Add a secret named `JWT_SECRET` with a random string value.
    *   (Optional) Add `ADMIN_PASSWORD` if you want to change the default admin registration password.

4.  **Deploy:**
    *   Push your code to GitHub. Fly.io will automatically build and deploy your app.

## Option 2: Deploying via Fly CLI

1.  **Install Fly CLI:** [Instructions here](https://fly.io/docs/hands-on/install-flyctl/)
2.  **Login:** `fly auth login`
3.  **Create Volume:**
    ```bash
    fly volumes create campus_data --size 1 --region <your-region>
    ```
4.  **Set Secrets:**
    ```bash
    fly secrets set JWT_SECRET=your_random_secret_string
    ```
5.  **Deploy:**
    ```bash
    fly deploy
    ```

## Configuration Details

*   **Dockerfile:** Handles the multi-stage build of the React frontend and the Express backend.
*   **fly.toml:** Configures the HTTP service and mounts the `campus_data` volume to `/data`.
*   **Database:** The application uses PostgreSQL. Ensure the `DATABASE_URL` environment variable is set in your production environment.
