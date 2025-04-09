// FriendsList.jsx
import React, { useState, useEffect } from 'react';
import { getDatabase, ref, onValue, set, remove, get } from 'firebase/database';
import { getAuth } from 'firebase/auth';
import { logError, createErrorDiagnostic } from './logger';
import './FriendsList.css';

const FriendsList = ({ currentUser, onClose }) => {
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

  // Load current friends list
  useEffect(() => {
    if (!currentUser) return;
    const friendsRef = ref(db, `friends/${currentUser.uid}`);
    const unsubscribe = onValue(friendsRef, (snapshot) => {
      const data = snapshot.val();
      if (data) {
        const list = Object.entries(data).map(([uid, friendData]) => ({
          uid,
          ...friendData,
        }));
        setFriends(list);
      } else {
        setFriends([]);
      }
    }, (error) => {
      const diagnosticInfo = createErrorDiagnostic('FriendsList', 'Friends List Retrieval', error);
      logError({ ...diagnosticInfo, userId: currentUser.uid });
    });
    return () => unsubscribe();
  }, [currentUser, db]);

  // Load current friend requests (pending)
  useEffect(() => {
    if (!currentUser) return;
    const requestsRef = ref(db, `friendRequests/${currentUser.uid}/pending`);
    const unsubscribe = onValue(requestsRef, (snapshot) => {
      const data = snapshot.val();
      if (data) {
        const list = Object.entries(data).map(([uid, requestData]) => ({
          uid,
          ...requestData,
        }));
        setFriendRequests(list);
      } else {
        setFriendRequests([]);
      }
    }, (error) => {
      const diagnosticInfo = createErrorDiagnostic('FriendsList', 'Friend Requests Retrieval', error);
      logError({ ...diagnosticInfo, userId: currentUser.uid });
    });
    return () => unsubscribe();
  }, [currentUser, db]);

  // Handle searching for users by username
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
            ...userData,
          }));
        setSearchResults(filteredUsers);
        if (filteredUsers.length === 0) {
          setErrorMessage('No users found matching that username.');
        }
      } else {
        setErrorMessage('No users found.');
      }
    } catch (error) {
      const diagnosticInfo = createErrorDiagnostic('FriendsList', 'handleSearch', error);
      await logError({ ...diagnosticInfo, searchTerm, userId: currentUser.uid });
      console.error('Search error:', error);
      setErrorMessage('An error occurred while searching.');
    } finally {
      setIsSearching(false);
    }
  };

  // Send friend request to a user
  const sendFriendRequest = async (recipientUid) => {
    if (!currentUser || currentUser.uid === recipientUid) return;
    try {
      const requestRef = ref(db, `friendRequests/${recipientUid}/pending/${currentUser.uid}`);
      await set(requestRef, {
        username: currentUser.displayName || currentUser.email.split('@')[0],
        sentAt: new Date().toISOString(),
      });
      setSuccessMessage('Friend request sent successfully!');
      // Optionally mark the user in searchResults as already requested
      setSearchResults(prev =>
        prev.map(user =>
          user.uid === recipientUid ? { ...user, requestSent: true } : user
        )
      );
    } catch (error) {
      const diagnosticInfo = createErrorDiagnostic('FriendsList', 'sendFriendRequest', error);
      await logError({ ...diagnosticInfo, userId: currentUser.uid });
      console.error('Error sending friend request:', error);
      setErrorMessage('An error occurred while sending the friend request.');
    }
  };

  // Accept an incoming friend request
  const acceptFriendRequest = async (senderUid) => {
    try {
      // Remove pending request
      const requestRef = ref(db, `friendRequests/${currentUser.uid}/pending/${senderUid}`);
      await remove(requestRef);
      // Add as friends for both users
      const friendData = {
        addedAt: new Date().toISOString(),
      };
      const friendRefForSender = ref(db, `friends/${senderUid}/${currentUser.uid}`);
      const friendRefForCurrent = ref(db, `friends/${currentUser.uid}/${senderUid}`);
      await set(friendRefForSender, friendData);
      await set(friendRefForCurrent, friendData);
      setSuccessMessage('Friend request accepted!');
    } catch (error) {
      const diagnosticInfo = createErrorDiagnostic('FriendsList', 'acceptFriendRequest', error);
      await logError({ ...diagnosticInfo, userId: currentUser.uid });
      console.error('Error accepting friend request:', error);
      setErrorMessage('An error occurred while accepting the friend request.');
    }
  };

  // Reject an incoming friend request
  const rejectFriendRequest = async (senderUid) => {
    try {
      const requestRef = ref(db, `friendRequests/${currentUser.uid}/pending/${senderUid}`);
      await remove(requestRef);
      setSuccessMessage('Friend request rejected.');
    } catch (error) {
      const diagnosticInfo = createErrorDiagnostic('FriendsList', 'rejectFriendRequest', error);
      await logError({ ...diagnosticInfo, userId: currentUser.uid });
      console.error('Error rejecting friend request:', error);
      setErrorMessage('An error occurred while rejecting the friend request.');
    }
  };

  // Automatically clear error and success messages after 5 seconds.
  useEffect(() => {
    if (successMessage || errorMessage) {
      const timer = setTimeout(() => {
        setSuccessMessage('');
        setErrorMessage('');
      }, 5000);
      return () => clearTimeout(timer);
    }
  }, [successMessage, errorMessage]);

  return (
    <div className="friends-modal">
      <div className="friends-modal-header">
        <h2>Manage Friends</h2>
        {/* Render the close button if an onClose function is provided */}
        {onClose && (
          <button className="close-button" onClick={onClose}>×</button>
        )}
      </div>
      
      {/* Tabs for Friends and Friend Requests */}
      <div className="friends-tabs">
        <button 
          className={`tab-button ${activeTab === 'friends' ? 'active' : ''}`}
          onClick={() => setActiveTab('friends')}
        >
          Friends {friends.length > 0 && <span className="count">{friends.length}</span>}
        </button>
        <button 
          className={`tab-button ${activeTab === 'requests' ? 'active' : ''}`}
          onClick={() => setActiveTab('requests')}
        >
          Requests {friendRequests.length > 0 && <span className="count">{friendRequests.length}</span>}
        </button>
      </div>
      
      <div className="friends-content">
        {activeTab === 'friends' && (
          <>
            {friends.length > 0 ? (
              <ul className="friends-items">
                {friends.map(friend => (
                  <li key={friend.uid} className="friend-item">
                    <div className="friend-info">
                      <span className="friend-name">{friend.username || friend.uid}</span>
                    </div>
                    <div className="friend-actions">
                      <button
                        className="remove-button"
                        // TODO: Implement remove friend functionality if desired.
                        onClick={() => {}}
                      >
                        Remove
                      </button>
                    </div>
                  </li>
                ))}
              </ul>
            ) : (
              <div className="empty-list">No friends yet.</div>
            )}
          </>
        )}
        {activeTab === 'requests' && (
          <>
            {friendRequests.length > 0 ? (
              <ul className="request-items">
                {friendRequests.map(request => (
                  <li key={request.uid} className="request-item">
                    <div className="request-info">
                      <span className="request-name">{request.username || request.uid}</span>
                    </div>
                    <div className="request-actions">
                      <button 
                        className="accept-button" 
                        onClick={() => acceptFriendRequest(request.uid)}
                      >
                        Accept
                      </button>
                      <button 
                        className="reject-button" 
                        onClick={() => rejectFriendRequest(request.uid)}
                      >
                        Reject
                      </button>
                    </div>
                  </li>
                ))}
              </ul>
            ) : (
              <div className="empty-list">No pending friend requests.</div>
            )}
          </>
        )}
      </div>

      {/* Search users to send friend requests */}
      <div className="search-container">
        <input
          type="text"
          className="friend-email-input"
          placeholder="Search users by username..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
        />
        <button 
          className="send-request-button"
          onClick={handleSearch}
          disabled={isSearching}
        >
          {isSearching ? 'Searching...' : 'Search'}
        </button>
      </div>

      {/* Display search results */}
      {searchResults.length > 0 && (
        <div className="search-results">
          <h3>Search Results:</h3>
          <ul>
            {searchResults.map(user => (
              <li key={user.uid} className="search-result-item">
                <div className="user-info">
                  <span className="user-name">{user.username}</span>
                </div>
                <button 
                  className="send-request-button" 
                  onClick={() => sendFriendRequest(user.uid)}
                  disabled={user.requestSent}
                >
                  {user.requestSent ? 'Request Sent' : 'Add Friend'}
                </button>
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Display error or success messages */}
      {errorMessage && <div className="error-message">{errorMessage}</div>}
      {successMessage && <div className="success-message">{successMessage}</div>}
    </div>
  );
};

export default FriendsList;

