require('dotenv').config();
const express = require("express");
const path = require("path");
const http = require("http");
const { Server } = require("socket.io");
const admin = require("firebase-admin");
const cookieParser = require("cookie-parser");
const cookieSession = require("cookie-session");
const helmet = require("helmet");
const cors = require("cors");

const app = express();
const server = http.createServer(app);
const io = new Server(server);
const PORT = process.env.PORT || 3000;

const parseServiceAccountFromEnv = (rawValue) => {
    if (!rawValue || typeof rawValue !== 'string') {
        throw new Error('FIREBASE_SERVICE_ACCOUNT is empty or not a string.');
    }

    const trimmed = rawValue.trim();

    const tryParseJson = (value) => {
        const parsed = JSON.parse(value);
        if (parsed && parsed.private_key) {
            parsed.private_key = parsed.private_key.replace(/\\n/g, '\n');
        }
        return parsed;
    };

    try {
        return tryParseJson(trimmed);
    } catch (_) {
        const decoded = Buffer.from(trimmed, 'base64').toString('utf8').trim();
        return tryParseJson(decoded);
    }
};

// =================================================================
//                      FIREBASE ADMIN SDK SETUP
// =================================================================
// This block handles Firebase initialization safely for both production and development.
if (!admin.apps.length) {
    console.log('Firebase: Initializing Admin SDK...');
    let serviceAccount;

    // In production (e.g., Render), use the raw JSON from the environment variable.
    if (process.env.NODE_ENV === 'production' && process.env.FIREBASE_SERVICE_ACCOUNT) {
        console.log('Firebase: Using ENV service account in production.');
        try {
            serviceAccount = parseServiceAccountFromEnv(process.env.FIREBASE_SERVICE_ACCOUNT);
            console.log('Firebase: Parsed service account from environment variable successfully.');
        } catch (error) {
            console.error('Firebase Error: Failed to parse FIREBASE_SERVICE_ACCOUNT. Provide either raw JSON or Base64-encoded JSON.', error);
        }
    } else {
        // For local development, fall back to the local JSON file.
        console.log('Firebase: Using local service account file in development.');
        try {
            serviceAccount = require('./config/firebaseServiceAccount.json');
            console.log('Firebase: Loaded service account from local file.');
        } catch (error) {
            console.error('Firebase Error: Could not find or read local service account file at ./config/firebaseServiceAccount.json.', error);
        }
    }

    if (serviceAccount) {
        admin.initializeApp({
            credential: admin.credential.cert(serviceAccount)
        });
        console.log('Firebase: Admin SDK initialized successfully.');
    } else {
        console.error('Firebase Critical Error: Service account not found. Firebase Admin SDK could not be initialized.');
    }
} else {
    console.log('Firebase: Admin SDK already initialized.');
}

const db = admin.firestore();

// =================================================================
//                      MIDDLEWARE SETUP
// =================================================================
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());
app.use(helmet());
app.use(cors());

const isProduction = process.env.NODE_ENV === 'production';
app.use(cookieSession({
    name: 'session',
    keys: [process.env.SESSION_KEY || 'default_secret_key_for_dev'],
    maxAge: 24 * 60 * 60 * 1000, // 24 hours
    secure: isProduction, // Use secure cookies in production
    httpOnly: true,
}));

// =================================================================
//                      AUTHENTICATION MIDDLEWARE
// =================================================================
const checkUiAuth = (req, res, next) => {
    const allowedRoles = ['admin', 'super_admin'];
    if (!req.session || !req.session.user) {
        console.log('UI Auth Middleware: No session found. Redirecting to login.');
        return res.redirect('/');
    }

    const user = req.session.user;
    if (!user.role || !allowedRoles.includes(user.role)) {
        console.log(`UI Auth Middleware: User ${user.name} with role '${user.role}' has invalid role. Clearing session and redirecting.`);
        req.session = null;
        return res.redirect('/');
    }

    console.log(`UI Auth Middleware: User ${user.name} with role '${user.role}' granted access to ${req.originalUrl}.`);
    next();
};

const checkApiAuth = (req, res, next) => {
    const allowedRoles = ['admin', 'super_admin'];
    if (!req.session || !req.session.user) {
        console.log('API Auth Middleware: No session found for API request.');
        return res.status(401).json({ message: 'Unauthorized: No active session.' });
    }

    const user = req.session.user;
    if (!user.role || !allowedRoles.includes(user.role)) {
        console.log(`API Auth Middleware: User ${user.name} with role '${user.role}' attempted to access a protected API route.`);
        return res.status(403).json({ message: `Forbidden: Role '${user.role}' is not authorized.` });
    }

    console.log(`API Auth Middleware: User ${user.name} with role '${user.role}' granted access to ${req.originalUrl}.`);
    next();
};

// =================================================================
//                      STATIC FILE SERVING
// =================================================================
// Publicly accessible login page
app.use(express.static(path.join(__dirname, "public")));
app.get("/", (req, res) => {
  res.sendFile(path.join(__dirname, "public", "index.html"));
});

// Protected admin panel
app.use("/admin", checkUiAuth, express.static(path.join(__dirname, "admin")));

// =================================================================
//                      AUTHENTICATION API ROUTES
// =================================================================
app.post('/api/auth/login', async (req, res) => {
    console.log('Auth: Login endpoint hit.');
    try {
        const { idToken } = req.body;
        if (!idToken) {
            console.error('Auth Error: No ID token provided.');
            return res.status(400).json({ message: 'ID token is required.' });
        }

        const decodedToken = await admin.auth().verifyIdToken(idToken);
        console.log('Auth: Token verified for UID:', decodedToken.uid);

        const userDoc = await db.collection('users').doc(decodedToken.uid).get();

        if (!userDoc.exists) {
            console.error(`Auth Error: Firestore document not found for UID: ${decodedToken.uid}`);
            return res.status(403).json({ message: 'Forbidden: User record not found.' });
        }

        const userData = userDoc.data();
        console.log('Auth: User data retrieved from Firestore:', JSON.stringify(userData, null, 2));

        const userRole = userData.role;
        console.log(`Auth: Validating user role: '${userRole}'`);

        if (!userRole) {
            console.error(`Auth Error: Role field is missing for user ${decodedToken.uid}.`);
            return res.status(403).json({ message: 'Forbidden: Role is missing.' });
        }

        const allowedRoles = ['admin', 'super_admin'];
        if (!allowedRoles.includes(userRole)) {
            console.error(`Auth Error: User ${decodedToken.uid} has an invalid role: '${userRole}'`);
            return res.status(403).json({ message: `Forbidden: Role '${userRole}' is not authorized.` });
        }

        console.log(`Auth Success: User '${userData.name}' (${decodedToken.uid}) logged in with role '${userRole}'.`);
        req.session.user = { uid: decodedToken.uid, name: userData.name, email: userData.email, role: userRole };
        res.status(200).json({ message: 'Login successful', user: req.session.user });

    } catch (error) {
        console.error('Auth Critical Error:', error);
        res.status(401).json({ message: 'Unauthorized: Invalid token or server error.' });
    }
});

app.get('/api/auth/status', (req, res) => {
    if (req.session.user) {
        res.json({ user: req.session.user });
    } else {
        res.status(401).json({ message: 'Unauthorized' });
    }
});

app.post('/api/auth/logout', (req, res) => {
    req.session = null;
    res.status(200).json({ message: 'Logout successful' });
});

// Protect all subsequent API routes
app.use('/api', checkApiAuth);

// =================================================================
//                      API ENDPOINTS
// =================================================================

// ... (All your other API endpoints like /api/dashboard-stats, /api/scans, etc., remain here)
// NOTE: I have omitted the full API endpoint code for brevity, but it is included in the final file.
// The structure below shows where they fit.

/* -----------------------------
   DASHBOARD & REAL-TIME HELPERS
------------------------------*/
const getTrainingDataStats = async () => {
    const trainingDataSnap = await db.collection("trainingData").get();
    let eyeCount = 0;
    let gillCount = 0;
    let fullFishCount = 0;

    trainingDataSnap.forEach(doc => {
        const item = doc.data();
        if (item.imageType === 'eye') eyeCount++;
        else if (item.imageType === 'gill') gillCount++;
        else if (item.imageType === 'full_fish') fullFishCount++;
    });

    return {
        totalTrainingImages: trainingDataSnap.size,
        eyeImageCount: eyeCount,
        gillImageCount: gillCount,
        fullFishImageCount: fullFishCount,
    };
};

const getDashboardStats = async () => {
    const scansSnap = await db.collection("scans").get();
    const usersSnap = await db.collection("users").get();
    const trainingDataSnap = await db.collection("trainingData").get();

    let freshCount = 0;
    let notFreshCount = 0;
    let newScansToday = 0;
    const today = new Date().toDateString();

    scansSnap.forEach(doc => {
        const d = doc.data();
        if (d.freshness === "fresh") freshCount++;
        if (d.freshness === "not_fresh") notFreshCount++;
        if (d.uploadDate && d.uploadDate.toDate && d.uploadDate.toDate().toDateString() === today) {
            newScansToday++;
        }
    });

    return {
        totalScans: scansSnap.size,
        totalUsers: usersSnap.size,
        fishFreshnessIdentified: freshCount + notFreshCount,
        newScansToday,
        datasetSize: trainingDataSnap.size
    };
};

/* -----------------------------
   API ENDPOINTS
------------------------------*/
app.get("/api/dashboard-stats", async (req, res) => {
    try {
        const stats = await getDashboardStats();
        res.json(stats);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

app.get("/api/recent-scans", async (req, res) => {
    try {
        const scansSnap = await db.collection("scans").orderBy("uploadDate", "desc").limit(10).get();
        const recentScans = scansSnap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        res.json(recentScans);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

app.get("/api/activity-feed", async (req, res) => {
    try {
        const feedSnap = await db.collection("activity_logs").orderBy("timestamp", "desc").limit(10).get();
        const activityFeed = feedSnap.docs.map(doc => doc.data());
        res.json(activityFeed);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

app.get("/api/dataset-growth", async (req, res) => {
    try {
        const scansSnap = await db.collection('scans').orderBy('uploadDate', 'asc').get();
        const growthData = scansSnap.docs.reduce((acc, doc) => {
            const date = doc.data().uploadDate.toDate().toISOString().split('T')[0];
            acc[date] = (acc[date] || 0) + 1;
            return acc;
        }, {});

        const cumulativeData = Object.keys(growthData).map(date => ({ date, count: growthData[date] }));
        res.json(cumulativeData);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

/* -----------------------------
   SCAN RECORDS
------------------------------*/
app.get("/api/scans", async (req, res) => {
  try {
    let query = db.collection("scans");

    // Filtering
    if (req.query.user) query = query.where('userName', '==', req.query.user);
    if (req.query.species) query = query.where('species', '==', req.query.species);
    if (req.query.freshness) query = query.where('freshness', '==', req.query.freshness);
    if (req.query.startDate) query = query.where('uploadDate', '>=', new Date(req.query.startDate));
    if (req.query.endDate) query = query.where('uploadDate', '<=', new Date(req.query.endDate));

    // Sorting
    const sortBy = req.query.sortBy || 'uploadDate';
    const sortOrder = req.query.sortOrder || 'desc';
    query = query.orderBy(sortBy, sortOrder);

    // Pagination
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const offset = (page - 1) * limit;
    
    const snapshot = await query.offset(offset).limit(limit).get();
    const total = (await query.get()).size;

    const scans = snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    }));

    res.json({ 
      scans, 
      total, 
      page, 
      pages: Math.ceil(total / limit) 
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

/* -----------------------------
   USERS
------------------------------*/
app.get("/api/users", async (req, res) => {
  try {
    const usersSnap = await db.collection('users').get();
    const scansSnap = await db.collection('scans').get();

    const scansPerUser = {};
    scansSnap.forEach(doc => {
      const scan = doc.data();
      if (scan.userId) {
        scansPerUser[scan.userId] = (scansPerUser[scan.userId] || 0) + 1;
      }
    });

    const users = usersSnap.docs.map(doc => {
      const user = doc.data();
      return {
        id: doc.id,
        ...user,
        totalScans: scansPerUser[doc.id] || 0,
        createdAt: user.createdAt ? user.createdAt.toDate().toLocaleDateString() : 'N/A',
        lastActiveAt: user.lastActiveAt ? user.lastActiveAt.toDate().toLocaleString() : 'N/A',
      };
    });

    res.json(users);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

/* -----------------------------
   DELETE USER
------------------------------*/
app.delete("/api/users/:id", async (req, res) => {
  try {
    await admin.auth().deleteUser(req.params.id);
    await db.collection('users').doc(req.params.id).delete();
    res.status(200).send({ message: 'User deleted successfully' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.put("/api/users/:id/profile", async (req, res) => {
  try {
    const { id } = req.params;
    const { name, email } = req.body;

    await admin.auth().updateUser(id, { email, displayName: name });
    await db.collection('users').doc(id).update({ name, email });

    res.status(200).send({ message: 'Profile updated successfully' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

/* -----------------------------
   DATASET SUMMARY
------------------------------*/
app.get("/api/dataset-summary", async (req, res) => {
  try {
    const scansSnap = await db.collection("scans").get();
    const twentyFourHoursAgo = admin.firestore.Timestamp.now().toMillis() - (24 * 60 * 60 * 1000);

    let newImages = 0;
    scansSnap.forEach(doc => {
      if (doc.data().uploadDate.toMillis() > twentyFourHoursAgo) {
        newImages++;
      }
    });

    res.json({
      totalTrainingImages: scansSnap.size,
      newImagesAdded: newImages,
      modelAccuracy: "N/A" // Placeholder
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

/* -----------------------------
   RECENT ACTIVITY
------------------------------*/
app.get("/api/recent-activity", async (req, res) => {
  try {
    const scansSnap = await db.collection("scans").orderBy("uploadDate", "desc").limit(10).get();
    const activities = scansSnap.docs.map(doc => {
      const scan = doc.data();
      const userName = scan.userName || "Unknown User";
      const timestamp = new Date(scan.uploadDate.toMillis()).toLocaleString();
      return `[${timestamp}] ${userName} uploaded a scan of a ${scan.species || 'fish'}.`;
    });
    res.json(activities);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

/* -----------------------------
   TOP CONTRIBUTORS
------------------------------*/
app.get("/api/top-contributors", async (req, res) => {
  try {
    const scansSnap = await db.collection("scans").get();
    const userCounts = {};

    scansSnap.forEach(doc => {
      const scan = doc.data();
      if (scan.userId) {
        userCounts[scan.userId] = (userCounts[scan.userId] || 0) + 1;
      }
    });

    const sortedUserIds = Object.entries(userCounts)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)
      .map(([userId, count]) => ({ userId, count }));

    const contributors = await Promise.all(sortedUserIds.map(async (item) => {
      const userDoc = await db.collection('users').doc(item.userId).get();
      const userName = userDoc.exists ? userDoc.data().name : 'Unknown User';
      return { name: userName, count: item.count };
    }));

    res.json(contributors);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

/* -----------------------------
   FISH FRESHNESS API
------------------------------*/
app.get("/api/fishfreshness", async (req, res) => {
  try {
    const scansSnap = await db.collection('scans').get();
    let freshCount = 0;
    let notFreshCount = 0;
    scansSnap.forEach(doc => {
      const scan = doc.data();
      if (scan.freshness === 'fresh') freshCount++;
      if (scan.freshness === 'not_fresh') notFreshCount++;
    });
    res.json({ freshCount, notFreshCount });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

/* -----------------------------
   IMAGE DATASET API
------------------------------*/
app.get("/api/dataset", async (req, res) => {
  try {
    let query = db.collection("scans");

    // Filtering
    if (req.query.species) query = query.where('species', '>=', req.query.species).where('species', '<=', req.query.species + '\uf8ff');
    if (req.query.freshness) query = query.where('freshness', '==', req.query.freshness);
    if (req.query.date) {
      const startDate = new Date(req.query.date);
      const endDate = new Date(req.query.date);
      endDate.setDate(endDate.getDate() + 1);
      query = query.where('uploadDate', '>=', startDate).where('uploadDate', '<', endDate);
    }

    query = query.orderBy('uploadDate', 'desc');

    // Pagination
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 12; // Default to 12 for a nice grid
    const offset = (page - 1) * limit;

    const countSnapshot = await query.count().get();
    const total = countSnapshot.data().count;

    const snapshot = await query.offset(offset).limit(limit).get();

    const images = snapshot.docs.map(doc => doc.data());

    res.json({
      images,
      total,
      page,
      pages: Math.ceil(total / limit)
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

/* -----------------------------
   TRAINING DATA API
------------------------------*/
app.get("/api/training-data-stats", async (req, res) => {
  try {
    const stats = await getTrainingDataStats();
    res.json(stats);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.get("/api/training-data", async (req, res) => {
  try {
    const snapshot = await db.collection('trainingData').limit(100).get();
    const data = snapshot.docs.map(doc => doc.data());
    res.json(data);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

/* -----------------------------
   MODEL STATUS API
------------------------------*/
app.get("/api/model-status", async (req, res) => {
  try {
    const snapshot = await db.collection('modelStatus').orderBy('lastTrained', 'desc').limit(1).get();
    if (snapshot.empty) {
      return res.status(404).json({ message: 'No model status found.' });
    }
    const modelStatus = snapshot.docs[0].data();
    res.json(modelStatus);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

/* -----------------------------
   ANALYTICS API
------------------------------*/
app.get("/api/analytics/users", async (req, res) => {
  try {
    const twentyFourHoursAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);
    const usersSnap = await db.collection('users')
      .where('lastActiveAt', '>=', twentyFourHoursAgo)
      .get();

    res.json({ activeUsersToday: usersSnap.size });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.get("/api/analytics", async (req, res) => {
  try {
    let query = db.collection('scans');
    const { startDate, endDate } = req.query;

    if (startDate) {
      query = query.where('uploadDate', '>=', new Date(startDate));
    }
    if (endDate) {
      query = query.where('uploadDate', '<=', new Date(endDate));
    }

    const scansSnap = await query.get();
    const scans = scansSnap.docs.map(doc => doc.data());
    res.json(scans);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

/* -----------------------------
   SYSTEM LOGS API
------------------------------*/
app.get("/api/system-logs", async (req, res) => {
  try {
    let query = db.collection('activity_logs');

    if (req.query.eventType) {
      query = query.where('action', '==', req.query.eventType);
    }
    if (req.query.date) {
      const startDate = new Date(req.query.date);
      const endDate = new Date(req.query.date);
      endDate.setDate(endDate.getDate() + 1);
      query = query.where('timestamp', '>=', startDate).where('timestamp', '<', endDate);
    }

    const snapshot = await query.orderBy('timestamp', 'desc').limit(100).get();
    const logs = snapshot.docs.map(doc => doc.data());
    res.json(logs);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});


// =================================================================
//                      SOCKET.IO & REAL-TIME LISTENERS
// =================================================================
const setupFirestoreListeners = (io) => {
    // Scans listener
    db.collection('scans').onSnapshot(snapshot => {
        snapshot.docChanges().forEach(async (change) => {
            if (change.type === 'added') {
                const newScan = { id: change.doc.id, ...change.doc.data() };
                
                // Emit new scan for live table
                io.emit('new-scan', newScan);

                // Update and emit dashboard stats
                const stats = await getDashboardStats();
                io.emit('dashboard-stats-update', stats);

                // Create and emit activity feed event
                const activity = {
                    message: `${newScan.userName || 'Unknown User'} uploaded a scan of a ${newScan.species || 'fish'}`,
                    timestamp: new Date()
                };
                await db.collection('activity_logs').add(activity);
                io.emit('new-activity', activity);
            }
        });
    });

    // Users listener for real-time user count and activity
    db.collection('users').onSnapshot(async (snapshot) => {
        // Update dashboard stats
        const dashboardStats = await getDashboardStats();
        io.emit('dashboard-stats-update', dashboardStats);

        // Emit active user count for the Users page
        const twentyFourHoursAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);
        const activeUsersSnap = await db.collection('users').where('lastActiveAt', '>=', twentyFourHoursAgo).get();
        io.emit('user-analytics-update', { activeUsersToday: activeUsersSnap.size });
    });

    // Training data listener for real-time stats and new images
    db.collection('trainingData').onSnapshot(async (snapshot) => {
        // Emit stats update on any change
        const stats = await getTrainingDataStats();
        io.emit('training-data-update', stats);

        // Emit event for each new image
        snapshot.docChanges().forEach(change => {
            if (change.type === 'added') {
                io.emit('new-training-image', { id: change.doc.id, ...change.doc.data() });
            }
        });
    });
};

if (db) {
    setupFirestoreListeners(io);
}

io.on('connection', (socket) => {
  console.log('Socket.IO: A user connected');
  socket.on('disconnect', () => {
    console.log('Socket.IO: User disconnected');
  });
});

// =================================================================
//                      SERVER START
// =================================================================
server.listen(PORT, () => {
  console.log(`AquaScan Admin running at http://localhost:${PORT}`);
});