import { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { User as FirebaseUser, onAuthStateChanged, signOut as firebaseSignOut } from 'firebase/auth';
import { doc, getDoc, setDoc, serverTimestamp } from 'firebase/firestore';
import { auth, db } from '@/lib/firebase';

// Helper type to map Firebase uid to id for backward compatibility
export interface AuthUser extends FirebaseUser {
  id: string;
}

export interface ProfileData {
  currency?: string;
  country?: string;
  timezone?: string;
  collaborator_ids?: string[];
}

interface AuthContextType {
  user: AuthUser | null;
  session: any | null; // Kept for type compatibility
  loading: boolean;
  isAdmin: boolean;
  profile: ProfileData | null;
  updateProfile: (data: ProfileData) => Promise<void>;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  session: null,
  loading: true,
  isAdmin: false,
  profile: null,
  updateProfile: async () => {},
  signOut: async () => {},
});

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [loading, setLoading] = useState(true);
  const [isAdmin, setIsAdmin] = useState(false);
  const [profile, setProfile] = useState<ProfileData | null>(null);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      if (firebaseUser) {
        // Alias uid as id to maintain compatibility with existing pages
        const compatUser = Object.assign(firebaseUser, { id: firebaseUser.uid }) as AuthUser;
        setUser(compatUser);
        await Promise.all([
          checkAdmin(firebaseUser.uid),
          fetchProfile(firebaseUser.uid)
        ]);
      } else {
        setUser(null);
        setIsAdmin(false);
        setProfile(null);
      }
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  const fetchProfile = async (userId: string) => {
    try {
      const userDocRef = doc(db, 'users', userId);
      const userDocSnap = await getDoc(userDocRef);
      if (userDocSnap.exists()) {
        const data = userDocSnap.data();
        setProfile({
          currency: data.currency || 'USD',
          country: data.country || 'Rwanda',
          timezone: data.timezone || 'Africa/Kigali',
          collaborator_ids: data.collaborator_ids || [],
        });
      } else {
        const defaultProfile = {
          currency: 'USD',
          country: 'Rwanda',
          timezone: 'Africa/Kigali',
          collaborator_ids: [],
        };
        await setDoc(userDocRef, { ...defaultProfile, role: 'user', created_at: serverTimestamp() }, { merge: true });
        setProfile(defaultProfile);
      }
    } catch (error) {
      console.error('Error fetching user profile:', error);
    }
  };

  const updateProfile = async (data: ProfileData) => {
    if (!user) return;
    try {
      const userDocRef = doc(db, 'users', user.id);
      await setDoc(userDocRef, data, { merge: true });
      setProfile(prev => prev ? { ...prev, ...data } : data);
    } catch (error) {
      console.error('Error updating user profile:', error);
      throw error;
    }
  };

  const checkAdmin = async (userId: string) => {
    try {
      const userDocRef = doc(db, 'users', userId);
      const userDocSnap = await getDoc(userDocRef);
      
      if (userDocSnap.exists()) {
        const userData = userDocSnap.data();
        setIsAdmin(userData.role === 'admin');
      } else {
        setIsAdmin(false);
      }
    } catch (error) {
      console.error('Error checking admin role in Firestore:', error);
      setIsAdmin(false);
    }
  };

  const signOut = async () => {
    try {
      await firebaseSignOut(auth);
    } catch (error) {
      console.error('Error signing out:', error);
    }
  };

  // Mock session structure to avoid breaking other files that expect it
  const session = user ? { user } : null;

  return (
    <AuthContext.Provider value={{ user, session, loading, isAdmin, profile, updateProfile, signOut }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);
