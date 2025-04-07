import React, { useState } from 'react';
import './Feedback.css';

function Feedback() {
  const [feedback, setFeedback] = useState('');
  const [email, setEmail] = useState('');
  const [submitStatus, setSubmitStatus] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
 
  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsSubmitting(true);
   
    try {
      // Here you would typically use a server-side service or API to send the email
      // For now, we'll simulate a successful submission
      await new Promise(resolve => setTimeout(resolve, 1500));
     
      setSubmitStatus('success');
      setFeedback('');
      setEmail('');
    } catch (error) {
      setSubmitStatus('error');
    } finally {
      setIsSubmitting(false);
    }
  };
 
  return (
    <div className="feedback-container">
      <h1 className="title">Feedback</h1>
     
      {submitStatus === 'success' ? (
        <div className="success-message">
          <p>Thank you for your feedback! We appreciate your input.</p>
          <button
            className="submit-another-btn"
            onClick={() => setSubmitStatus('')}
          >
            Submit Another Feedback
          </button>
        </div>
      ) : (
        <div className="feedback-content">
          <p className="feedback-intro">
            We value your thoughts on Noise Before Defeat. Please share any feedback, suggestions, or report issues.
          </p>
         
          <form onSubmit={handleSubmit} className="feedback-form">
            <div className="form-group">
              <label htmlFor="email">Your Email (optional):</label>
              <input
                type="email"
                id="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="your.email@example.com"
                className="form-control"
              />
              <small>We'll only use this to follow up if needed</small>
            </div>
           
            <div className="form-group">
              <label htmlFor="feedback">Your Feedback:</label>
              <textarea
                id="feedback"
                value={feedback}
                onChange={(e) => setFeedback(e.target.value)}
                placeholder="Share your thoughts, ideas, or report issues..."
                className="form-control"
                rows="6"
                required
              />
            </div>
           
            <button
              type="submit"
              className="submit-btn"
              disabled={isSubmitting || !feedback}
            >
              {isSubmitting ? 'Sending...' : 'Submit Feedback'}
            </button>
           
            {submitStatus === 'error' && (
              <p className="error-message">
                There was an error submitting your feedback. Please try again later.
              </p>
            )}
          </form>
        </div>
      )}
    </div>
  );
}

export default Feedback;
