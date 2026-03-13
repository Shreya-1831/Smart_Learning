import React, { createContext, useContext, useEffect, useState, ReactNode } from "react";
import {
  User,
  signInWithEmailAndPassword,
  signOut as firebaseSignOut,
  onAuthStateChanged,
  GoogleAuthProvider,
  signInWithPopup,
} from "firebase/auth";
import {
  doc,
  getDoc,
  setDoc,
  collection,
  query,
  where,
  getDocs,
} from "firebase/firestore";
import { auth, db } from "../config/firebase";
import axios from "axios";

export interface UserData {
  uid: string;
  name: string;
  email: string;
  role: "student" | "parent" | "teacher";
  mentalAge?: number;
  firstLogin?: boolean;
  childUid?: string;
  rollNo?: string;
  childRollNo?: string;
  lastActive?: any;
}

interface AuthContextType {
  currentUser: User | null;
  userData: UserData | null;
  loading: boolean;
  signUp: (
    email: string,
    password: string,
    name: string,
    role: "student" | "parent" | "teacher",
    rollNoOrChildRollNo?: string
  ) => Promise<void>;
  signIn: (emailOrRollNo: string, password: string) => Promise<void>;
  signInWithGoogle: () => Promise<void>;
  signOut: () => Promise<void>;
  updateUserData: (updates: Partial<UserData>) => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) throw new Error("useAuth must be used within AuthProvider");
  return context;
};

export const AuthProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [userData, setUserData] = useState<UserData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      setCurrentUser(user);
      if (user) {
        const userDoc = await getDoc(doc(db, "users", user.uid));
        if (userDoc.exists()) {
          setUserData(userDoc.data() as UserData);
        }
      } else {
        setUserData(null);
      }
      setLoading(false);
    });
    return unsubscribe;
  }, []);

  const signUp = async (
    email: string,
    password: string,
    name: string,
    role: "student" | "parent" | "teacher",
    rollNoOrChildRollNo?: string
  ) => {
    try {
      const response = await axios.post('http://localhost:4000/api/auth/signup', {
        email,
        password,
        name,
        role,
        rollNo: rollNoOrChildRollNo,
      });

      console.log(response.data.message);

      await signInWithEmailAndPassword(auth, email, password);

    } catch (error: any) {
      console.error("Signup error:", error);
      throw new Error(error.response?.data?.error || error.message || "Signup failed");
    }
  };

  const signIn = async (emailOrRollNo: string, password: string) => {
    try {
      let email = emailOrRollNo;

      // If input looks like a roll number (only digits), look up the student
      if (/^\d+$/.test(emailOrRollNo)) {
        console.log('🔍 Looking up student with roll number:', emailOrRollNo);

        const q = query(
          collection(db, "users"),
          where("role", "==", "student"),
          where("rollNo", "==", emailOrRollNo)
        );

        const snapshot = await getDocs(q);

        if (snapshot.empty) {
          console.error('❌ No student found with roll number:', emailOrRollNo);
          throw new Error("Student with this roll number not found");
        }

        const studentData = snapshot.docs[0].data();
        email = studentData.email;
        console.log('✅ Found student email:', email);
      }

      console.log('🔐 Signing in with email:', email);
      const userCredential = await signInWithEmailAndPassword(auth, email, password);

      // Fetch user data from Firestore
      const userDoc = await getDoc(doc(db, "users", userCredential.user.uid));

      if (userDoc.exists()) {
        const userData = userDoc.data() as UserData;
        console.log('✅ Sign in successful! Role:', userData.role);

        // Redirect based on role
        if (userData.role === 'student') {
          if (userData.firstLogin) {
            window.location.href = '/mental-age-test';
          } else {
            window.location.href = '/student-dashboard';
          }
        } else if (userData.role === 'parent') {
          window.location.href = '/parent-dashboard';
        } else if (userData.role === 'teacher') {
          window.location.href = '/teacher-dashboard';
        }
      }

    } catch (error: any) {
      console.error("❌ Sign in error:", error);
      throw error;
    }
  };

  const signInWithGoogle = async () => {
    try {
      const provider = new GoogleAuthProvider();
      const result = await signInWithPopup(auth, provider);
      const user = result.user;

      const userDoc = await getDoc(doc(db, "users", user.uid));

      if (!userDoc.exists()) {
        const newUserData: UserData = {
          uid: user.uid,
          name: user.displayName || "Student",
          email: user.email || "",
          role: "student",
          firstLogin: true,
          lastActive: new Date(),
        };

        await setDoc(doc(db, "users", user.uid), newUserData);
        setUserData(newUserData);
      }
    } catch (error: any) {
      console.error("Google sign in error:", error);
      throw error;
    }
  };

  const signOut = async () => {
    await firebaseSignOut(auth);
    setUserData(null);
  };

  const updateUserData = async (updates: Partial<UserData>) => {
    if (!currentUser) throw new Error("No user logged in");

    const userRef = doc(db, "users", currentUser.uid);
    await setDoc(userRef, updates, { merge: true });
    setUserData((prev) => (prev ? { ...prev, ...updates } : null));
  };

  const value: AuthContextType = {
    currentUser,
    userData,
    loading,
    signUp,
    signIn,
    signInWithGoogle,
    signOut,
    updateUserData,
  };

  return <AuthContext.Provider value={value}>{!loading && children}</AuthContext.Provider>;
};
