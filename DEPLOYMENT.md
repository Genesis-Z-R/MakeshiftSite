# Campus Marketplace Deployment Guide (Fly.io)

This application is ready to be deployed to Fly.io. It uses SQLite for data storage and Socket.io for real-time messaging.

## Prerequisites

1.  [Install the Fly CLI](https://fly.io/docs/hands-on/install-flyctl/)
2.  [Sign up for a Fly.io account](https://fly.io/docs/hands-on/sign-up/)

## Deployment Steps

1.  **Login to Fly.io:**
    ```bash
    fly auth login
    ```

2.  **Initialize the app (if not already done):**
    ```bash
    fly launch
    ```
    *   When prompted, choose a unique name for your app.
    *   Choose your preferred region.
    *   **Important:** When asked if you want to tweak settings, say **Yes**.
    *   In the web dashboard that opens, ensure you have a **Volume** configured (or we will create it in the next step).

3.  **Create a Volume for SQLite:**
    SQLite needs a persistent disk to save your data. Run this command to create a 1GB volume:
    ```bash
    fly volumes create campus_data --size 1 --region <your-region>
    ```
    *(Replace `<your-region>` with the same region you chose in step 2, e.g., `ams` or `lax`)*

4.  **Set Secrets:**
    Set your JWT secret and any other environment variables:
    ```bash
    fly secrets set JWT_SECRET=your_super_secret_key
    ```

5.  **Deploy:**
    ```bash
    fly deploy
    ```

## Configuration Details

*   **Dockerfile:** Handles the multi-stage build of the React frontend and the Express backend.
*   **fly.toml:** Configures the HTTP service and mounts the `campus_data` volume to `/data`.
*   **Database:** The database file is stored at `/data/campus_marketplace.db` inside the container, ensuring it survives redeploys.
