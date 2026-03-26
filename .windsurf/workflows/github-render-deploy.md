---
description: How to deploy the AquaScan Admin Web Application to GitHub and Render
---

This guide provides step-by-step instructions for deploying the AquaScan Admin Web Application using GitHub for version control and Render for hosting.

### Part 1: Pushing Your Project to GitHub

1.  **Initialize a Git Repository**:
    Open a terminal in your project's root directory (`admin_web_project`) and run:
    ```bash
    git init
    git branch -m main
    ```

2.  **Create a Repository on GitHub**:
    - Go to [GitHub](https://github.com) and create a new repository. You can name it `aquascan-admin-panel` or similar.
    - Do **not** initialize it with a README, .gitignore, or license, as you have already created these.

3.  **Add, Commit, and Push Your Code**:
    In your terminal, run the following commands. Replace `<your-github-username>` and `<your-repo-name>` with your actual GitHub username and repository name.
    ```bash
    git add .
    git commit -m "Initial commit: Setup project for deployment"
    git remote add origin https://github.com/<your-github-username>/<your-repo-name>.git
    git push -u origin main
    ```

### Part 2: Deploying on Render

Render is a modern cloud platform that makes it easy to deploy Node.js applications directly from a GitHub repository.

1.  **Sign Up for Render**:
    - Create an account on [Render](https://render.com/) using your GitHub account.

2.  **Create a New Web Service**:
    - From the Render dashboard, click **New +** and select **Web Service**.
    - Connect your GitHub account and select your repository (`aquascan-admin-panel`).

3.  **Configure the Service**:
    - **Name**: Give your service a unique name (e.g., `aquascan-admin`).
    - **Region**: Choose a region closest to your users.
    - **Branch**: Select `main`.
    - **Build Command**: `npm install`
    - **Start Command**: `node server.js`

4.  **Add Environment Variables**:
    This is the most critical step for security. Go to the **Environment** tab and add the following variables:

    - **`SESSION_KEY`**: 
        - **Key**: `SESSION_KEY`
        - **Value**: Generate a long, random, and secure string. You can use a password manager or an online generator for this.

    - **`FIREBASE_SERVICE_ACCOUNT`**:
        - **Key**: `FIREBASE_SERVICE_ACCOUNT`
        - **Value**: This requires a specific format. You need to convert your `firebaseServiceAccount.json` file into a Base64 encoded string.
            - **On Linux/macOS**, you can use the terminal:
              ```bash
              base64 -w 0 config/firebaseServiceAccount.json
              ```
            - **On Windows**, you can use PowerShell:
              ```powershell
              [Convert]::ToBase64String([IO.File]::ReadAllBytes("config\firebaseServiceAccount.json"))
              ```
            - Copy the entire output string and paste it as the value for this environment variable.

5.  **Deploy**:
    - Click **Create Web Service**. Render will automatically pull your code from GitHub, run the build command, and start your application.
    - Your application will be live at the URL provided by Render (e.g., `https://aquascan-admin.onrender.com`).

### Summary of Your Production-Ready Setup

- **Folder Structure**: Your project is organized with `public`, `admin`, and `config` directories, with `server.js` as the entry point.
- **Security**: Secrets are managed via environment variables, and your `.gitignore` file prevents them from being exposed on GitHub.
- **Deployment**: Your backend is deployed as a Node.js service on Render, and your frontend is served securely by the same Express application.
