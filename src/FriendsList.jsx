// FriendsList.jsx
import React, { useState, useEffect } from 'react';
import { getDatabase, ref, onValue, set, remove, get } from 'firebase/database';
import { getAuth } from 'firebase/auth';
import { logError, createErrorDiagnostic } from './logger';
import './FriendsList.css';

export const FriendsList = ({ currentUser }) => {
  const [activeTab, setActiveTab] = useState('friends');
  const [friends, setFriends] = useState([]);
  const [friendRequests, setFriendRequests] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [isSearching, setIsSearching] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [successMessage, setSuccessMessage] = useState('');
  
  const auth = getAuth();
  const db = getDatabase();
  
  // Load friends list
  useEffect(() => {
    if (!currentUser) return;
    
    const friendsRef = ref(db, `friends/${currentUser.uid}`);
    const unsubscribe = onValue(friendsRef, (snapshot) => {
      const friendsData = snapshot.val();
      if (friendsData) {
        const friendsList = Object.entries(friendsData).map(([uid, friendData]) => ({
          uid,
          ...friendData
        }));
        setFriends(friendsList);
      } else {
        setFriends([]);
      }
    }, (error) => {
      // Log any errors in friends list retrieval
      const diagnosticInfo = createErrorDiagnostic('FriendsList', 'Friends List Retrieval', error);
      logError({
        ...diagnosticInfo,
        userId: currentUser.uid
      });
    });
    
    return () => unsubscribe();
  }, [currentUser, db]);
  
  // Load friend requests
  useEffect(() => {
    if (!currentUser) return;
    
    const requestsRef = ref(db, `friendRequests/${currentUser.uid}/pending`);
    const unsubscribe = onValue(requestsRef, (snapshot) => {
      const requestsData = snapshot.val();
      if (requestsData) {
        const requestsList = Object.entries(requestsData).map(([uid, requestData]) => ({
          uid,
          ...requestData
        }));
        setFriendRequests(requestsList);
      } else {
        setFriendRequests([]);
      }
    }, (error) => {
      // Log any errors in friend requests retrieval
      const diagnosticInfo = createErrorDiagnostic('FriendsList', 'Friend Requests Retrieval', error);
      logError({
        ...diagnosticInfo,
        userId: currentUser.uid
      });
    });
    
    return () => unsubscribe();
  }, [currentUser, db]);
  
  // Search for users
  const handleSearch = async () => {
    if (!searchTerm.trim()) return;
    
    setIsSearching(true);
    setErrorMessage('');
    setSearchResults([]);
    
    try {
      const usersRef = ref(db, 'users');
      const snapshot = await get(usersRef);
      
      if (snapshot.exists()) {
        const usersData = snapshot.val();
        const filteredUsers = Object.entries(usersData)
          .filter(([uid, userData]) => 
            uid !== currentUser.uid && 
            userData.username && 
            userData.username.toLowerCase().includes(searchTerm.toLowerCase())
          )
          .map(([uid, userData]) => ({
            uid,
            ...userData
          }));
        
        setSearchResults(filteredUsers);
        
        if (filteredUsers.length === 0) {
          setErrorMessage('No users found matching that username.');
        }
      } else {
        setErrorMessage('No users found.');
      }
    } catch (error) {
      // Log search error
      const diagnosticInfo = createErrorDiagnostic('FriendsList', 'handleSearch', error);
      await logError({
        ...diagnosticInfo,
        searchTerm,
        userId: currentUser.uid
      });
      
      console.error('Search error:', error);
      setErrorMessage('An error occurred while searching.');
    } finally {
      setIsSearching(false);
    }
  };

  // Remaining methods (sendFriendRequest, acceptFriendRequest, etc.) would be similarly updated

  // Rest of the component remains the same as in the previous version
  return (
    <div className="friends-modal-backdrop">
      {/* Existing render logic */}
    </div>
  );
};
