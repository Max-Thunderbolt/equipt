import { auth } from '../main';
import {
    signInWithEmailAndPassword,
    createUserWithEmailAndPassword,
    signOut,
    onAuthStateChanged,
    GoogleAuthProvider,
    signInWithPopup,
} from 'firebase/auth';

export function loginEmail(email, password) {
    return signInWithEmailAndPassword(auth, email, password);
}

export function registerEmail(email, password) {
    return createUserWithEmailAndPassword(auth, email, password);
}

export function logout() {
    return signOut(auth);
}

export function authStateListener(callback) {
    return onAuthStateChanged(auth, callback);
}

export function loginGoogle() {
    const provider = new GoogleAuthProvider();
    return signInWithPopup(auth, provider);
}