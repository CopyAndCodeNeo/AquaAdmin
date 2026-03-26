---
description: How to deploy the AquaScan Admin Web Application
---

Here are the step-by-step instructions to deploy the AquaScan Admin Web Application:

### 1. Prerequisites

- **Node.js and npm**: Ensure you have Node.js (LTS version recommended) and npm installed on your deployment server. You can download them from [nodejs.org](https://nodejs.org/).
- **Firebase Project**: You must have an active Firebase project with Firestore and Firebase Authentication enabled.
- **Firebase Service Account Key**: Download the service account key JSON file from your Firebase project settings.

### 2. Project Setup

1.  **Transfer Files**: Copy the entire `admin_web_project` directory to your deployment server.

2.  **Install Dependencies**: Open a terminal in the `admin_web_project` directory and install the required npm packages.
    ```bash
    // turbo
    npm install
    ```

### 3. Configuration

1.  **Firebase Service Account**:
    - Place your downloaded Firebase service account key file into the `config/` directory.
    - Rename the file to `firebaseServiceAccount.json` if it has a different name.
    - **Security Note**: Ensure this file is kept secure and is not publicly accessible.

2.  **Session Secret Key**:
    - Open `server.js`.
    - Locate the `cookieSession` middleware configuration (around line 17).
    - Replace the placeholder `'S_E_C_R_E_T_K_E_Y'` with a strong, unique secret string. For better security, use an environment variable in a production environment.

    ```javascript
    app.use(cookieSession({
        name: 'session',
        keys: [process.env.SESSION_KEY || 'your_super_secret_key_here'], 
        maxAge: 24 * 60 * 60 * 1000
    }));
    ```

### 4. Running the Application

For a production environment, it is recommended to use a process manager like `pm2` to keep the application running continuously.

1.  **Install pm2** (if you don't have it):
    ```bash
    // turbo
    npm install pm2 -g
    ```

2.  **Start the Application**:
    ```bash
    // turbo
    pm2 start server.js --name aquascan-admin
    ```

3.  **Verify**: The application will be running on the specified port (default is 3000). You can access it at `http://<your-server-ip>:3000`.

### 5. (Optional) Using a Reverse Proxy

For production, it is best practice to run the Node.js application behind a reverse proxy like Nginx or Apache. This allows you to handle SSL termination, serve on standard ports (80/443), and manage traffic more effectively.
