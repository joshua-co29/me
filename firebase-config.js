// Firebase & Cloud Database Configuration for moe-app-d6ce9
// Replace the config placeholder with your Firebase Web App credentials from Project Settings

const firebaseConfig = {
    apiKey: "YOUR_API_KEY",
    authDomain: "moe-app-d6ce9.firebaseapp.com",
    projectId: "moe-app-d6ce9",
    storageBucket: "moe-app-d6ce9.appspot.com",
    messagingSenderId: "YOUR_SENDER_ID",
    appId: "YOUR_APP_ID"
};

// Cloud SQL instance parameters (from Firebase Data Connect)
const sqlConnectInfo = {
    location: "Northern Virginia (us-east4)",
    instanceId: "moe-app-d6ce9-instance",
    databaseName: "moe-app-d6ce9-database",
    serviceId: "moe-app-d6ce9-service"
};

window.SENTINEL_FIREBASE_CONFIG = firebaseConfig;
window.SENTINEL_SQL_INFO = sqlConnectInfo;

