// WebSocket communication for multiplayer games

// Add these imports at the top of your file
import { useEffect, useRef, useState, useCallback } from 'react';

// Constants
const WEBSOCKET_URL = process.env.NODE_ENV === 'production' 
  ? 'wss://your-domain.com/game-ws'  // Update with your production URL
  : 'ws://localhost:8000/game-ws';   // Development WebSocket server

// WebSocket connection setup
const useMultiplayerGame = (gameId, currentUser, onGameUpdate, onGameEnd) => {
  const [connectionStatus, setConnectionStatus] = useState('disconnected');
  const [opponent, setOpponent] = useState(null);
  const websocketRef = useRef(null);
  
  // Initialize WebSocket connection
  useEffect(() => {
    if (!gameId || !currentUser) return;
    
    // Create WebSocket connection
    websocketRef.current = new WebSocket(`${WEBSOCKET_URL}?gameId=${gameId}&userId=${currentUser.uid}`);
    
    // Connection opened
    websocketRef.current.addEventListener('open', (event) => {
      setConnectionStatus('connected');
      console.log('Connected to game server');
      
      // Send initial join message
      sendMessage({
        type: 'join_game',
        gameId,
        userId: currentUser.uid,
        username: currentUser.displayName || 'Player'
      });
    });
    
    // Listen for messages
    websocketRef.current.addEventListener('message', (event) => {
      const message = JSON.parse(event.data);
      
      switch (message.type) {
        case 'game_state':
          // Update game state
          onGameUpdate(message.state);
          break;
          
        case 'player_joined':
          // Opponent joined
          setOpponent({
            uid: message.userId,
            username: message.username
          });
          break;
          
        case 'player_left':
          // Opponent left
          if (message.userId !== currentUser.uid) {
            setOpponent(null);
          }
          break;
          
        case 'game_over':
          // Game ended
          onGameEnd(message.result);
          break;
          
        case 'error':
          // Handle error
          console.error('Game error:', message.error);
          break;
      }
    });
    
    // Connection closed
    websocketRef.current.addEventListener('close', (event) => {
      setConnectionStatus('disconnected');
      console.log('Disconnected from game server');
    });
    
    // Connection error
    websocketRef.current.addEventListener('error', (event) => {
      setConnectionStatus('error');
      console.error('WebSocket error:', event);
    });
    
    // Cleanup on unmount
    return () => {
      if (websocketRef.current) {
        websocketRef.current.close();
      }
    };
  }, [gameId, currentUser, onGameUpdate, onGameEnd]);
  
  // Send message to server
  const sendMessage = useCallback((data) => {
    if (websocketRef.current && websocketRef.current.readyState === WebSocket.OPEN) {
      websocketRef.current.send(JSON.stringify(data));
    }
  }, []);
  
  // Submit a move
  const submitMove = useCallback((move) => {
    sendMessage({
      type: 'submit_move',
      gameId,
      userId: currentUser.uid,
      move
    });
  }, [gameId, currentUser, sendMessage]);
  
  // Submit ready status
  const submitReady = useCallback(() => {
    sendMessage({
      type: 'ready',
      gameId,
      userId: currentUser.uid
    });
  }, [gameId, currentUser, sendMessage]);
  
  // Send chat message
  const sendChatMessage = useCallback((content) => {
    sendMessage({
      type: 'chat',
      gameId,
      userId: currentUser.uid,
      username: currentUser.displayName || 'Player',
      content
    });
  }, [gameId, currentUser, sendMessage]);
  
  return {
    connectionStatus,
    opponent,
    submitMove,
    submitReady,
    sendChatMessage
  };
};

// Python WebSocket Server Implementation
/*
# game_server.py
import asyncio
import json
import logging
import websockets
import uuid
from datetime import datetime

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# Game state storage
games = {}
# Player connections
connections = {}

# ELO Rating calculation
def calculate_elo_change(winner_elo, loser_elo):
    # K-factor - determines maximum possible adjustment
    k = 32
    
    # Calculate expected outcome
    expected_winner = 1 / (1 + 10 ** ((loser_elo - winner_elo) / 400))
    expected_loser = 1 - expected_winner
    
    # Calculate ELO change
    elo_change = round(k * (1 - expected_winner))
    
    return elo_change

# Game rating calculation
def calculate_game_rating(winner_state, loser_state):
    # Calculate rating based on remaining node health
    winner_health = 0
    total_nodes = 0
    
    for node_type, node in winner_state['nodes'].items():
        winner_health += node['hp'] / node['maxHp']
        total_nodes += 1
    
    avg_health = winner_health / total_nodes
    
    # Determine letter grade
    if avg_health > 0.9:
        return 'A'
    elif avg_health > 0.75:
        return 'B'
    elif avg_health > 0.5:
        return 'C'
    elif avg_health > 0.25:
        return 'D'
    else:
        return 'F'

# Game log recording
def save_game_log(game_id, log_entries, result, p1_elo, p2_elo, p1_uid, p2_uid):
    try:
        # Format for AI training
        game_data = {
            'game_id': game_id,
            'timestamp': datetime.now().isoformat(),
            'players': {
                'p1': {
                    'uid': p1_uid,
                    'elo': p1_elo
                },
                'p2': {
                    'uid': p2_uid,
                    'elo': p2_elo
                }
            },
            'result': result,
            'log': log_entries
        }
        
        # Save to file (append mode)
        with open(f'game_logs/{game_id}.json', 'w') as f:
            json.dump(game_data, f, indent=2)
            
        logger.info(f"Game log saved: {game_id}.json")
        
    except Exception as e:
        logger.error(f"Error saving game log: {str(e)}")

# WebSocket connection handler
async def game_server(websocket, path):
    # Parse query parameters
    query = path.split('?')[1] if '?' in path else ''
    params = dict(param.split('=') for param in query.split('&') if param)
    
    game_id = params.get('gameId')
    user_id = params.get('userId')
    
    if not game_id or not user_id:
        await websocket.close(4000, "Missing gameId or userId")
        return
    
    # Store connection
    connections[user_id] = websocket
    
    # Create or join game
    if game_id not in games:
        # New game
        games[game_id] = {
            'id': game_id,
            'players': {},
            'state': initialize_game_state(),
            'moves': [],
            'chat': [],
            'status': 'waiting'
        }
    
    game = games[game_id]
    
    try:
        async for message in websocket:
            data = json.loads(message)
            message_type = data.get('type')
            
            if message_type == 'join_game':
                # Player joining the game
                username = data.get('username', 'Player')
                player_slot = 'p1' if len(game['players']) == 0 else 'p2'
                
                game['players'][user_id] = {
                    'slot': player_slot,
                    'username': username,
                    'connected': True,
                    'ready': False
                }
                
                # Update game state with player info
                game['state']['players'][player_slot]['username'] = username
                
                # Notify all players
                await broadcast_to_game(game_id, {
                    'type': 'player_joined',
                    'userId': user_id,
                    'username': username,
                    'slot': player_slot
                })
                
                # If game is now full, start it
                if len(game['players']) == 2:
                    game['status'] = 'in_progress'
                    
                    # Send initial game state to both players
                    await broadcast_to_game(game_id, {
                        'type': 'game_state',
                        'state': game['state']
                    })
            
            elif message_type == 'submit_move':
                # Player submitting a move
                move = data.get('move')
                if not move:
                    continue
                
                # Get player slot
                player_slot = game['players'][user_id]['slot']
                
                # Add move to history
                game['moves'].append({
                    'userId': user_id,
                    'playerSlot': player_slot,
                    'move': move,
                    'timestamp': datetime.now().isoformat()
                })
                
                # Apply move to game state
                apply_move(game['state'], player_slot, move)
                
                # Check for game over
                if game['state']['phase'] == 'gameOver':
                    await handle_game_over(game)
                else:
                    # Send updated game state to both players
                    await broadcast_to_game(game_id, {
                        'type': 'game_state',
                        'state': game['state']
                    })
            
            elif message_type == 'ready':
                # Player indicating ready for next turn
                player_slot = game['players'][user_id]['slot']
                game['state']['players'][player_slot]['ready'] = True
                
                # Check if both players are ready
                p1_ready = game['state']['players']['p1']['ready']
                p2_ready = game['state']['players']['p2']['ready']
                
                if p1_ready and p2_ready:
                    # Process end of turn
                    process_turn_end(game['state'])
                    
                    # Reset ready states
                    game['state']['players']['p1']['ready'] = False
                    game['state']['players']['p2']['ready'] = False
                
                # Send updated game state
                await broadcast_to_game(game_id, {
                    'type': 'game_state',
                    'state': game['state']
                })
            
            elif message_type == 'chat':
                # Chat message
                content = data.get('content')
                username = data.get('username', 'Player')
                
                chat_message = {
                    'userId': user_id,
                    'username': username,
                    'content': content,
                    'timestamp': datetime.now().isoformat()
                }
                
                # Add to chat history
                game['chat'].append(chat_message)
                
                # Broadcast to all players
                await broadcast_to_game(game_id, {
                    'type': 'chat_message',
                    'message': chat_message
                })
    
    except websockets.exceptions.ConnectionClosed:
        logger.info(f"Connection closed for user {user_id}")
    finally:
        # Handle disconnection
        if user_id in connections:
            del connections[user_id]
        
        if game_id in games and user_id in game['players']:
            game['players'][user_id]['connected'] = False
            
            # Check if all players disconnected
            all_disconnected = all(not player['connected'] for player in game['players'].values())
            
            if all_disconnected:
                # Clean up the game after a delay (to allow for reconnections)
                asyncio.create_task(cleanup_game(game_id, 300))  # 5 minutes
            else:
                # Notify remaining players
                await broadcast_to_game(game_id, {
                    'type': 'player_left',
                    'userId': user_id
                })

# Initialize empty game state
def initialize_game_state():
    # Create initial game state (similar to the React state)
    return {
        'turn': 1,
        'phase': 'planning',
        'timer': None,
        'activePlayer': 'p1',
        'players': {
            'p1': {
                'username': 'Player 1',
                'intelPoints': 100,
                'nodes': {
                    'core': { 
                        'type': 'core', 
                        'position': { 'x': 0, 'y': -4 }, 
                        'hp': 50, 
                        'maxHp': 50,
                        'defended': False 
                    },
                    # Add other nodes and units
                },
                'infantry': [
                    # Initial infantry units
                ],
                'longRange': {
                    # Long range unit
                },
                'pendingMoves': [],
                'ready': False
            },
            'p2': {
                # Similar structure for player 2
            }
        },
        'gameLog': []
    }

# Apply a move to the game state
def apply_move(state, player_slot, move):
    # Apply the move based on its type
    move_type = move.get('type')
    
    if move_type == 'move':
        # Handle movement
        piece_id = move.get('pieceId')
        new_position = move.get('to')
        
        # Update the piece's position
        # (Logic similar to the React component)
    
    elif move_type == 'attack':
        # Handle attack
        source = move.get('source')
        target = move.get('target')
        
        # Apply damage based on rules
        # (Logic similar to the React component)
    
    elif move_type == 'hack':
        # Handle hack action
        target = move.get('target')
        
        # Apply hack effects
        # (Logic similar to the React component)
    
    # Add to game log
    state['gameLog'].append(f"{state['players'][player_slot]['username']} performed {move_type}")

# Process end of turn
def process_turn_end(state):
    # Apply center square IP bonus and other end-of-turn effects
    # (Logic similar to the React component)
    
    # Increment turn
    state['turn'] += 1
    
    # Toggle active player
    state['activePlayer'] = 'p2' if state['activePlayer'] == 'p1' else 'p1'

# Handle game over
async def handle_game_over(game):
    # Determine winner and loser
    winner_slot = game['state']['winner']
    loser_slot = 'p2' if winner_slot == 'p1' else 'p1'
    
    # Get player IDs and ELO ratings
    winner_id = next(uid for uid, player in game['players'].items() if player['slot'] == winner_slot)
    loser_id = next(uid for uid, player in game['players'].items() if player['slot'] == loser_slot)
    
    # Load player ELO ratings from database
    winner_elo = 500  # Placeholder - would load from database
    loser_elo = 500   # Placeholder - would load from database
    
    # Calculate ELO changes
    elo_change = calculate_elo_change(winner_elo, loser_elo)
    
    # Calculate game rating
    game_rating = calculate_game_rating(
        game['state']['players'][winner_slot],
        game['state']['players'][loser_slot]
    )
    
    # Prepare result
    result = {
        'winner': winner_slot,
        'winnerUsername': game['state']['players'][winner_slot]['username'],
        'eloChange': elo_change,
        'gameRating': game_rating,
        'gameDuration': game['state']['turn']
    }
    
    # Update player ELO ratings in database
    # (Database update code would go here)
    
    # Save game log for AI training
    save_game_log(
        game['id'],
        game['state']['gameLog'],
        result,
        winner_elo,
        loser_elo,
        winner_id,
        loser_id
    )
    
    # Notify players of game result
    await broadcast_to_game(game['id'], {
        'type': 'game_over',
        'result': result
    })
    
    # Mark game as completed
    game['status'] = 'completed'

# Broadcast message to all players in a game
async def broadcast_to_game(game_id, message):
    if game_id not in games:
        return
    
    game = games[game_id]
    
    # Send to all connected players
    for user_id, player in game['players'].items():
        if user_id in connections and player['connected']:
            try:
                await connections[user_id].send(json.dumps(message))
            except Exception as e:
                logger.error(f"Error sending message to {user_id}: {str(e)}")

# Clean up game after a delay
async def cleanup_game(game_id, delay_seconds):
    await asyncio.sleep(delay_seconds)
    
    # Check if the game still exists and all players are still disconnected
    if game_id in games:
        game = games[game_id]
        all_disconnected = all(not player['connected'] for player in game['players'].values())
        
        if all_disconnected:
            # Save game log if not already saved
            if game['status'] != 'completed':
                # Handle as a draw or incomplete game
                pass
            
            # Remove the game
            del games[game_id]
            logger.info(f"Game {game_id} cleaned up after all players disconnected")

# Start the WebSocket server
start_server = websockets.serve(game_server, "localhost", 8000)

if __name__ == "__main__":
    # Start the server
    asyncio.get_event_loop().run_until_complete(start_server)
    logger.info("Game server started on ws://localhost:8000")
    asyncio.get_event_loop().run_forever()
*/

// Chat Feature Implementation
const ChatBox = ({ messages, onSendMessage }) => {
  const [newMessage, setNewMessage] = useState('');
  const messagesEndRef = useRef(null);
  
  // Auto-scroll to bottom when new messages arrive
  useEffect(() => {
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages]);
  
  const handleSend = () => {
    if (newMessage.trim()) {
      onSendMessage(newMessage);
      setNewMessage('');
    }
  };
  
  const handleKeyPress = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };
  
  return (
    <div className="chat-box">
      <div className="chat-header">
        <h3>Chat</h3>
      </div>
      
      <div className="chat-messages">
        {messages.length === 0 ? (
          <p className="empty-chat">No messages yet. Say hello!</p>
        ) : (
          messages.map((msg, index) => (
            <div key={index} className={`chat-message ${msg.isCurrentUser ? 'own-message' : 'other-message'}`}>
              <div className="message-header">
                <span className="message-username">{msg.username}</span>
                <span className="message-time">{new Date(msg.timestamp).toLocaleTimeString()}</span>
              </div>
              <div className="message-content">{msg.content}</div>
            </div>
          ))
        )}
        <div ref={messagesEndRef} />
      </div>
      
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
    </div>
  );
};
