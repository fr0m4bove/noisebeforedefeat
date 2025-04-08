import React, { useState, useEffect } from 'react';
import { getDatabase, ref, get, set, push, remove, onValue } from 'firebase/database';
import { getAuth } from 'firebase/auth';
import './NoiseBeforeDefeat.css';

export const FriendsList = ({ currentUser }) => {
  const [friends, setFriends] = useState([]);
  const [friendRequests, setFriendRequests] = useState([]);
  const [newFriendEmail, setNewFriendEmail] = useState('');
  const [activeTab, setActiveTab] = useState('friends');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  
  const auth = getAuth();
  const db = getDatabase();
  
  // Load friends and friend requests
  useEffect(() => {
    if (!auth.currentUser) return;
    
    // Get friends list
    const friendsRef = ref(db, `users/${auth.currentUser.uid}/friends`);
    const unsubscribeFriends = onValue(friendsRef, (snapshot) => {
      const data = snapshot.val();
      if (data) {
        // Convert to array format
        const friendsList = Object.keys(data).map(key => ({
          id: key,
          ...data[key]
        }));
        setFriends(friendsList);
      } else {
        setFriends([]);
      }
    });
    
    // Get friend requests
    const requestsRef = ref(db, `users/${auth.currentUser.uid}/friendRequests`);
    const unsubscribeRequests = onValue(requestsRef, (snapshot) => {
      const data = snapshot.val();
      if (data) {
        // Convert to array format
        const requestsList = Object.keys(data).map(key => ({
          id: key,
          ...data[key]
        }));
        setFriendRequests(requestsList);
      } else {
        setFriendRequests([]);
      }
    });
    
    return () => {
      unsubscribeFriends();
      unsubscribeRequests();
    };
  }, [auth.currentUser, db]);
  
  // Send a friend request
  const sendFriendRequest = async () => {
    if (!newFriendEmail.trim() || !newFriendEmail.includes('@')) {
      setError('Please enter a valid email address');
      return;
    }
    
    try {
      setError('');
      
      // Find user by email
      const usersRef = ref(db, 'users');
      const snapshot = await get(usersRef);
      const users = snapshot.val();
      
      if (!users) {
        setError('User not found');
        return;
      }
      
      // Find the user with the matching email
      let targetUserId = null;
      let targetUsername = '';
      
      Object.keys(users).forEach(userId => {
        if (users[userId].email?.toLowerCase() === newFriendEmail.toLowerCase()) {
          targetUserId = userId;
          targetUsername = users[userId].displayName || 'Unknown User';
        }
      });
      
      if (!targetUserId) {
        setError('User not found');
        return;
      }
      
      // Don't allow sending friend request to yourself
      if (targetUserId === auth.currentUser.uid) {
        setError('You cannot add yourself as a friend');
        return;
      }
      
      // Check if already friends
      const friendsRef = ref(db, `users/${auth.currentUser.uid}/friends`);
      const friendsSnapshot = await get(friendsRef);
      const currentFriends = friendsSnapshot.val() || {};
      
      if (Object.values(currentFriends).some(friend => friend.uid === targetUserId)) {
        setError('You are already friends with this user');
        return;
      }
      
      // Check if request already sent
      const sentRequestsRef = ref(db, `users/${auth.currentUser.uid}/sentRequests`);
      const sentRequestsSnapshot = await get(sentRequestsRef);
      const sentRequests = sentRequestsSnapshot.val() || {};
      
      if (Object.values(sentRequests).some(request => request.uid === targetUserId)) {
        setError('Friend request already sent');
        return;
      }
      
      // Send the request
      const newRequestRef = push(ref(db, `users/${targetUserId}/friendRequests`));
      await set(newRequestRef, {
        uid: auth.currentUser.uid,
        displayName: auth.currentUser.displayName || 'Unknown User',
        email: auth.currentUser.email,
        timestamp: new Date().toISOString()
      });
      
      // Store sent request
      const sentRequestRef = push(ref(db, `users/${auth.currentUser.uid}/sentRequests`));
      await set(sentRequestRef, {
        uid: targetUserId,
        displayName: targetUsername,
        email: newFriendEmail,
        timestamp: new Date().toISOString()
      });
      
      setSuccess(`Friend request sent to ${newFriendEmail}`);
      setNewFriendEmail('');
      
      // Clear success message after 3 seconds
      setTimeout(() => {
        setSuccess('');
      }, 3000);
      
    } catch (error) {
      console.error('Error sending friend request:', error);
      setError('Failed to send friend request');
    }
  };
  
  // Accept a friend request
  const acceptFriendRequest = async (request) => {
    try {
      // Add to friends list for both users
      const myFriendRef = push(ref(db, `users/${auth.currentUser.uid}/friends`));
      await set(myFriendRef, {
        uid: request.uid,
        displayName: request.displayName,
        email: request.email,
        timestamp: new Date().toISOString()
      });
      
      const theirFriendRef = push(ref(db, `users/${request.uid}/friends`));
      await set(theirFriendRef, {
        uid: auth.currentUser.uid,
        displayName: auth.currentUser.displayName || 'Unknown User',
        email: auth.currentUser.email,
        timestamp: new Date().toISOString()
      });
      
      // Remove the request
      await remove(ref(db, `users/${auth.currentUser.uid}/friendRequests/${request.id}`));
      
      // Find and remove sent request from other user
      const sentRequestsRef = ref(db, `users/${request.uid}/sentRequests`);
      const snapshot = await get(sentRequestsRef);
      const sentRequests = snapshot.val();
      
      if (sentRequests) {
        Object.keys(sentRequests).forEach(async (key) => {
          if (sentRequests[key].uid === auth.currentUser.uid) {
            await remove(ref(db, `users/${request.uid}/sentRequests/${key}`));
          }
        });
      }
      
      setSuccess(`Friend request from ${request.displayName} accepted`);
      
      // Clear success message after 3 seconds
      setTimeout(() => {
        setSuccess('');
      }, 3000);
      
    } catch (error) {
      console.error('Error accepting friend request:', error);
      setError('Failed to accept friend request');
    }
  };
  
  // Reject a friend request
  const rejectFriendRequest = async (request) => {
    try {
      // Remove the request
      await remove(ref(db, `users/${auth.currentUser.uid}/friendRequests/${request.id}`));
      
      setSuccess(`Friend request from ${request.displayName} rejected`);
      
      // Clear success message after 3 seconds
      setTimeout(() => {
        setSuccess('');
      }, 3000);
      
    } catch (error) {
      console.error('Error rejecting friend request:', error);
      setError('Failed to reject friend request');
    }
  };
  
  // Remove a friend
  const removeFriend = async (friend) => {
    if (!window.confirm(`Are you sure you want to remove ${friend.displayName} from your friends list?`)) {
      return;
    }
    
    try {
      // Remove from both users' friends lists
      await remove(ref(db, `users/${auth.currentUser.uid}/friends/${friend.id}`));
      
      // Find and remove from other user's friends list
      const theirFriendsRef = ref(db, `users/${friend.uid}/friends`);
      const snapshot = await get(theirFriendsRef);
      const theirFriends = snapshot.val();
      
      if (theirFriends) {
        Object.keys(theirFriends).forEach(async (key) => {
          if (theirFriends[key].uid === auth.currentUser.uid) {
            await remove(ref(db, `users/${friend.uid}/friends/${key}`));
          }
        });
      }
      
      setSuccess(`${friend.displayName} removed from friends list`);
      
      // Clear success message after 3 seconds
      setTimeout(() => {
        setSuccess('');
      }, 3000);
      
    } catch (error) {
      console.error('Error removing friend:', error);
      setError('Failed to remove friend');
    }
  };
  
  // Invite a friend to play
  const inviteFriendToPlay = async (friend) => {
    try {
      // Create a new game
      const gameId = `game_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      const gameRef = ref(db, `games/${gameId}`);
      
      // Setup initial game state
      await set(gameRef, {
        id: gameId,
        createdAt: new Date().toISOString(),
        status: 'waiting',
        players: {
          p1: {
            uid: auth.currentUser.uid,
            displayName: auth.currentUser.displayName || 'Unknown User',
            ready: false
          },
          p2: {
            uid: friend.uid,
            displayName: friend.displayName,
            ready: false
          }
        },
        invitedBy: auth.currentUser.uid
      });
      
      // Send game invitation
      const invitationRef = push(ref(db, `users/${friend.uid}/gameInvitations`));
      await set(invitationRef, {
        gameId,
        from: {
          uid: auth.currentUser.uid,
          displayName: auth.currentUser.displayName || 'Unknown User'
        },
        timestamp: new Date().toISOString()
      });
      
      setSuccess(`Game invitation sent to ${friend.displayName}`);
      
      // Clear success message after 3 seconds
      setTimeout(() => {
        setSuccess('');
      }, 3000);
      
    } catch (error) {
      console.error('Error inviting friend to play:', error);
      setError('Failed to send game invitation');
    }
  };
  
  return (
    <div className="friends-list">
      <div className="friends-tabs">
        <button 
          className={`tab-button ${activeTab === 'friends' ? 'active' : ''}`}
          onClick={() => setActiveTab('friends')}
        >
          Friends ({friends.length})
        </button>
        <button 
          className={`tab-button ${activeTab === 'requests' ? 'active' : ''}`}
          onClick={() => setActiveTab('requests')}
        >
          Requests ({friendRequests.length})
        </button>
        <button 
          className={`tab-button ${activeTab === 'add' ? 'active' : ''}`}
          onClick={() => setActiveTab('add')}
        >
          Add Friend
        </button>
      </div>
      
      {error && <div className="error-message">{error}</div>}
      {success && <div className="success-message">{success}</div>}
      
      <div className="friends-content">
        {activeTab === 'friends' && (
          <div className="friends-list-content">
            {friends.length === 0 ? (
              <p className="empty-list">You don't have any friends yet. Add some friends to play with!</p>
            ) : (
              <ul className="friends-items">
                {friends.map(friend => (
                  <li key={friend.id} className="friend-item">
                    <div className="friend-info">
                      <span className="friend-name">{friend.displayName}</span>
                      <span className="friend-email">{friend.email}</span>
                    </div>
                    <div className="friend-actions">
                      <button 
                        className="invite-button"
                        onClick={() => inviteFriendToPlay(friend)}
                      >
                        Invite to Play
                      </button>
                      <button 
                        className="remove-button"
                        onClick={() => removeFriend(friend)}
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
          <div className="friend-requests-content">
            {friendRequests.length === 0 ? (
              <p className="empty-list">No pending friend requests</p>
            ) : (
              <ul className="request-items">
                {friendRequests.map(request => (
                  <li key={request.id} className="request-item">
                    <div className="request-info">
                      <span className="request-name">{request.displayName}</span>
                      <span className="request-email">{request.email}</span>
                    </div>
                    <div className="request-actions">
                      <button 
                        className="accept-button"
                        onClick={() => acceptFriendRequest(request)}
                      >
                        Accept
                      </button>
                      <button 
                        className="reject-button"
                        onClick={() => rejectFriendRequest(request)}
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
        
        {activeTab === 'add' && (
          <div className="add-friend-content">
            <p>Send a friend request by email address:</p>
            <div className="add-friend-form">
              <input
                type="email"
                value={newFriendEmail}
                onChange={(e) => setNewFriendEmail(e.target.value)}
                placeholder="friend@example.com"
                className="friend-email-input"
              />
              <button 
                className="send-request-button"
                onClick={sendFriendRequest}
                disabled={!newFriendEmail.trim() || !newFriendEmail.includes('@')}
              >
                Send Request
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default FriendsList;