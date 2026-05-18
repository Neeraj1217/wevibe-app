import { initializeApp } from "firebase/app";
import { getAuth, signInWithPhoneNumber, RecaptchaVerifier } from "firebase/auth";

const firebaseConfig = {
  apiKey: process.env.REACT_APP_FIREBASE_API_KEY,
  authDomain: process.env.REACT_APP_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.REACT_APP_FIREBASE_PROJECT_ID,
  storageBucket: process.env.REACT_APP_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.REACT_APP_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.REACT_APP_FIREBASE_APP_ID,
};

const missingKeys = Object.entries(firebaseConfig)
  .filter(([, value]) => !value)
  .map(([key]) => key);

if (missingKeys.length > 0) {
  console.error(
    `[firebase] Missing env vars: ${missingKeys.join(", ")}. Copy frontend/.env.example to frontend/.env`
  );
}

const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
auth.languageCode = "en";

export const initRecaptcha = (containerId = "recaptcha-container") => {
  if (window.recaptchaVerifier) {
    try {
      window.recaptchaVerifier.clear();
    } catch {
      /* ignore */
    }
    window.recaptchaVerifier = null;
  }

  const verifier = new RecaptchaVerifier(auth, containerId, {
    size: "invisible",
    callback: () => {},
    "expired-callback": () => console.warn("[firebase] reCAPTCHA expired"),
  });

  window.recaptchaVerifier = verifier;
  return verifier;
};

export { signInWithPhoneNumber };
