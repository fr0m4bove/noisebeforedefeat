// FriendsList.jsx
import React, { useState, useEffect } from 'react';
import { getDatabase, ref, onValue, push, set, update, remove, get } from 'firebase/database';
import { getAuth } from 'firebase/auth';
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
        const friendsList = Object.keys(friendsData).map(key => ({
          id: key,
          ...friendsData[key]
        }));
        setFriends(friendsList);
      } else {
        setFriends([]);
      }
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
        const requestsList = Object.keys(requestsData).map(key => ({
          id: key,
          ...requestsData[key]
        }));
        setFriendRequests(requestsList);
      } else {
        setFriendRequests([]);
      }
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
          .filter(([key, userData]) => 
            key !== currentUser.uid && 
            userData.profile && 
            userData.profile.username && 
            userData.profile.username.toLowerCase().includes(searchTerm.toLowerCase())
          )
          .map(([key, userData]) => ({
            uid: key,
            ...userData.profile
          }));
        
        setSearchResults(filteredUsers);
        
        if (filteredUsers.length === 0) {
          setErrorMessage('No users found matching that username.');
        }
      } else {
        setErrorMessage('No users found.');
      }
    } catch (error) {
      console.error('Search error:', error);
      setErrorMessage('An error occurred while searching.');
    } finally {
      setIsSearching(false);
    }
  };
  
  // Send friend request
  const sendFriendRequest = async (recipientId, recipientUsername) => {
    if (!currentUser) return;
    
    try {
      // Add to recipient's pending requests
      const recipientRequestRef = ref(db, `friendRequests/${recipientId}/pending/${currentUser.uid}`);
      await set(recipientRequestRef, {
        uid: currentUser.uid,
        username: currentUser.displayName || 'Unknown User',
        timestamp: new Date().toISOString()
      });
      
      // Add to sender's sent requests
      const senderRequestRef = ref(db, `friendRequests/${currentUser.uid}/sent/${recipientId}`);
      await set(senderRequestRef, {
        uid: recipientId,
        username: recipientUsername,
        timestamp: new Date().toISOString()
      });
      
      setSuccessMessage(`Friend request sent to ${recipientUsername}`);
      setTimeout(() => setSuccessMessage(''), 3000);
    } catch (error) {
      console.error('Error sending friend request:', error);
      setErrorMessage('Failed to send friend request.');
    }
  };
  
  // Accept friend request
  const acceptFriendRequest = async (requesterId, requesterUsername) => {
    if (!currentUser) return;
    
    try {
      // Add to current user's friends list
      const currentUserFriendRef = ref(db, `friends/${currentUser.uid}/${requesterId}`);
      await set(currentUserFriendRef, {
        uid: requesterId,
        username: requesterUsername,
        status: 'friend',
        timestamp: new Date().toISOString()
      });
      
      // Add to requester's friends list
      const requesterFriendRef = ref(db, `friends/${requesterId}/${currentUser.uid}`);
      await set(requesterFriendRef, {
        uid: currentUser.uid,
        username: currentUser.displayName || 'Unknown User',
        status: 'friend',
        timestamp: new Date().toISOString()
      });
      
      // Remove from pending requests
      const pendingRequestRef = ref(db, `friendRequests/${currentUser.uid}/pending/${requesterId}`);
      await remove(pendingRequestRef);
      
      // Remove from sender's sent requests
      const sentRequestRef = ref(db, `friendRequests/${requesterId}/sent/${currentUser.uid}`);
      await remove(sentRequestRef);
      
      setSuccessMessage(`Friend request from ${requesterUsername} accepted`);
      setTimeout(() => setSuccessMessage(''), 3000);
    } catch (error) {
      console.error('Error accepting friend request:', error);
      setErrorMessage('Failed to accept friend request.');
    }
  };
  
  // Reject friend request
  const rejectFriendRequest = async (requesterId) => {
    if (!currentUser) return;
    
    try {
      // Remove from pending requests
      const pendingRequestRef = ref(db, `friendRequests/${currentUser.uid}/pending/${requesterId}`);
      await remove(pendingRequestRef);
      
      // Remove from sender's sent requests
      const sentRequestRef = ref(db, `friendRequests/${requesterId}/sent/${currentUser.uid}`);
      await remove(sentRequestRef);
      
      setSuccessMessage('Friend request rejected');
      setTimeout(() => setSuccessMessage(''), 3000);
    } catch (error) {
      console.error('Error rejecting friend request:', error);
      setErrorMessage('Failed to reject friend request.');
    }
  };
  
  // Remove friend
  const removeFriend = async (friendId, friendUsername) => {
    if (!currentUser) return;
    
    try {
      // Remove from current user's friends list
      const currentUserFriendRef = ref(db, `friends/${currentUser.uid}/${friendId}`);
      await remove(currentUserFriendRef);
      
      // Remove from friend's friends list
      const friendRef = ref(db, `friends/${friendId}/${currentUser.uid}`);
      await remove(friendRef);
      
      setSuccessMessage(`${friendUsername} removed from friends`);
      setTimeout(() => setSuccessMessage(''), 3000);
    } catch (error) {
      console.error('Error removing friend:', error);
      setErrorMessage('Failed to remove friend.');
    }
  };
  
  return (
    <div className="friends-list">
      <div className="friends-tabs">
        <button 
          className={`tab-button ${activeTab === 'friends' ? 'active' : ''}`}
          onClick={() => setActiveTab('friends')}
        >
          Friends
          {friends.length > 0 && <span className="count">{friends.length}</span>}
        </button>
        
        <button 
          className={`tab-button ${activeTab === 'requests' ? 'active' : ''}`}
          onClick={() => setActiveTab('requests')}
        >
          Requests
          {friendRequests.length > 0 && <span className="count">{friendRequests.length}</span>}
        </button>
        
        <button 
          className={`tab-button ${activeTab === 'find' ? 'active' : ''}`}
          onClick={() => setActiveTab('find')}
        >
          Find Friends
        </button>
      </div>
      
      <div className="friends-content">
        {errorMessage && <div className="error-message">{errorMessage}</div>}
        {successMessage && <div className="success-message">{successMessage}</div>}
        
        {activeTab === 'friends' && (
          <div className="friends-tab">
            {friends.length === 0 ? (
              <p className="empty-list">You don't have any friends yet. Add some!</p>
            ) : (
              <ul className="friends-items">
                {friends.map((friend) => (
                  <li key={friend.id} className="friend-item">
                    <div className="friend-info">
                      <div className="friend-name">{friend.username}</div>
                      <div className="friend-status">{friend.status === 'online' ? 'Online' : 'Offline'}</div>
                    </div>
                    <div className="friend-actions">
                      <button 
                        className="invite-button"
                        onClick={() => console.log('Invite to game feature coming soon')}
                      >
                        Invite
                      </button>
                      <button 
                        className="remove-button"
                        onClick={() => removeFriend(friend.id, friend.username)}
                      >
                        Remove
                      </button>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </div>
        )}
        
        {activeTab === 'requests' && (
          <div className="requests-tab">
            {friendRequests.length === 0 ? (
              <p className="empty-list">No pending friend requests</p>
            ) : (
              <ul className="request-items">
                {friendRequests.map((request) => (
                  <li key={request.id} className="request-item">
                    <div className="request-info">
                      <div className="request-name">{request.username}</div>
                      <div className="request-time">
                        {new Date(request.timestamp).toLocaleDateString()}
                      </div>
                    </div>
                    <div className="request-actions">
                      <button 
                        className="accept-button"
                        onClick={() => acceptFriendRequest(request.id, request.username)}
                      >
                        Accept
                      </button>
                      <button 
                        className="reject-button"
                        onClick={() => rejectFriendRequest(request.id)}
                      >
                        Reject
                      </button>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </div>
        )}
        
        {activeTab === 'find' && (
          <div className="find-tab">
            <div className="search-container">
              <input
                type="text"
                className="friend-email-input"
                placeholder="Search by username"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                onKeyPress={(e) => e.key === 'Enter' && handleSearch()}
              />
              <button 
                className="send-request-button"
                onClick={handleSearch}
                disabled={isSearching || !searchTerm.trim()}
              >
                {isSearching ? 'Searching...' : 'Search'}
              </button>
            </div>
            
            {isSearching && <p>Searching...</p>}
            
            {!isSearching && searchResults.length > 0 && (
              <ul className="search-results">
                {searchResults.map((user) => (
                  <li key={user.uid} className="search-result-item">
                    <div className="user-info">
                      <div className="user-name">{user.username}</div>
                    </div>
                    <button 
                      className="send-request-button"
                      onClick={() => sendFriendRequest(user.uid, user.username)}
                    >
                      Add Friend
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>
        )}
      </div>
    </div>
  );
};
