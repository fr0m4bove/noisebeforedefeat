import React, { useState, useEffect, useRef } from 'react';
import './ChatBox.css';

const ChatBox = ({ messages, onSendMessage, currentUser, gameLog }) => {
  const [activeTab, setActiveTab] = useState('chat');
  const [newMessage, setNewMessage] = useState('');
  const messagesEndRef = useRef(null);

  // Auto-scroll to bottom when new messages arrive
  useEffect(() => {
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages, gameLog, activeTab]);

  const handleSend = (e) => {
    e.preventDefault();
    if (newMessage.trim()) {
      onSendMessage(newMessage);
      setNewMessage('');
    }
  };

  const handleKeyPress = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend(e);
    }
  };

  return (
    <div className="chat-box">
      <div className="chat-header">
        <button 
          className={`tab-button ${activeTab === 'chat' ? 'active' : ''}`}
          onClick={() => setActiveTab('chat')}
        >
          Chat
        </button>
        <button 
          className={`tab-button ${activeTab === 'log' ? 'active' : ''}`}
          onClick={() => setActiveTab('log')}
        >
          Game Log
        </button>
      </div>
      
      <div className="chat-messages">
        {activeTab === 'chat' ? (
          messages.length === 0 ? (
            <p className="empty-chat">No messages yet. Say hello!</p>
          ) : (
            messages.map((msg, index) => (
              <div key={index} className={`chat-message ${msg.sender === currentUser ? 'own-message' : 'other-message'}`}>
                <div className="message-header">
                  <span className="message-sender">{msg.sender}</span>
                  <span className="message-time">{new Date(msg.timestamp).toLocaleTimeString()}</span>
                </div>
                <div className="message-content">{msg.text}</div>
              </div>
            ))
          )
        ) : (
          gameLog.map((entry, index) => (
            <div key={index} className="log-entry">
              {entry}
            </div>
          ))
        )}
        <div ref={messagesEndRef} />
      </div>
      
      {activeTab === 'chat' && (
        <div className="chat-input">
          <textarea
            value={newMessage}
            onChange={(e) => setNewMessage(e.target.value)}
            onKeyPress={handleKeyPress}
            placeholder="Type a message..."
            rows={2}
          />
          <button onClick={handleSend} disabled={!newMessage.trim()}>
            Send
          </button>
        </div>
      )}
    </div>
  );
};

export default ChatBox;
