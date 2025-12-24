// frontend/src/firebase.js
import { initializeApp } from "firebase/app";
import { getAuth, signInWithPhoneNumber, RecaptchaVerifier } from "firebase/auth";

const firebaseConfig = {
  apiKey: "AIzaSyAhSke5ep7Me1Fda3J_Q4qwgUd-CAEvrnc",
  authDomain: "wevibe-beac0.firebaseapp.com",
  projectId: "wevibe-beac0",
  storageBucket: "wevibe-beac0.appspot.com",
  messagingSenderId: "973307149108",
  appId: "1:973307149108:web:33ec4fd903da48401f4361",
};

// ✅ Initialize Firebase only once
const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
auth.languageCode = "en";

// ✅ Proper Recaptcha for Firebase v10+
export const initRecaptcha = (containerId = "recaptcha-container") => {
  // Clear any old verifier
  if (window.recaptchaVerifier) {
    try {
      window.recaptchaVerifier.clear();
    } catch {}
    window.recaptchaVerifier = null;
  }

  // ✅ Correct order for v10+: auth first, then containerId
  const verifier = new RecaptchaVerifier(
    auth,
    containerId,
    {
      size: "invisible",
      callback: (response) => console.log("✅ reCAPTCHA solved", response),
      "expired-callback": () => console.warn("⚠️ reCAPTCHA expired, retrying..."),
    }
  );

  window.recaptchaVerifier = verifier;
  return verifier;
};

export { signInWithPhoneNumber };
