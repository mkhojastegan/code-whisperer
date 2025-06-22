import { useState, useEffect } from 'react';
import { GoogleLogin } from '@react-oauth/google';
import axios from 'axios';
import './App.css'

// Set axios to send cookies with every request
axios.defaults.withCredentials = true;

function App() {
  const [user, setUser] = useState(null);
  const [snippets, setSnippets] = useState([]);
  const [code, setCode] = useState('');
  const [language, setLanguage] = useState('javascript');
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [error, setError] = useState(null);

  const checkLoginStatus = async () => {
    try {
      const res = await axios.get('http://localhost:3001/api/auth/me');
      setUser(res.data);
      fetchSnippets(); // If user is logged in, fetch their data
    } catch (err) {
      // This is expected if the user isn't logged in
      console.log("No active session");
      setUser(null);
    }
  }

  // Check if user is already logged in on component mount
  useEffect(() => {
    checkLoginStatus();
  }, []);

  const fetchSnippets = async () => {
    try {
      const res = await axios.get('http://localhost:3001/api/snippets');
      setSnippets(res.data);
    } catch (err) {
      // Dont log user out, show an error
      console.error("Failed to fetch snippets:", err);
      setError("Could not load your snippets. Please try again later.");
    }
  };

  const handleLoginSuccess = async (credentialResponse) => {
    try {
      const res = await axios.post(
        'http://localhost:3001/api/auth/google-signin',
        {
          token: credentialResponse.credential
        }
      );
      setUser(res.data.user);
      fetchSnippets(); // Fetch snippets right after logging in
    } catch (error) {
      console.error("Error logging in with backend:", error);
      setError("Login failed. Please try again.");
    }
  };

  const handleLogout = async () => {
    try {
      await axios.post('http://localhost:3001/api/auth/logout');
      setUser(null);
      setSnippets([]);
    } catch (err) {
      console.error("Logout failed:", err);
    }
  }

  const handleAnalyzeAndSave = async (e) => {
    e.preventDefault();
    setIsAnalyzing(true);
    setError(null);

    try {
      const res = await axios.post('http://localhost:3001/api/ai/analyze', {
        codeContent: code,
        language,
      });

      // Add analysis on top of our snippets list to instantly update UI
      setSnippets([res.data, ...snippets]);

      setCode(''); // Clear the textarea

    } catch (err) {
      console.error("Error analyzing snippet:", err);
      const message = err.response?.data?.message || "Failed to analyze snippet. Please try again";
      setError(message);
    } finally {
      setIsAnalyzing(false); // Stop the loading state
    }
  };

  const handleDeleteSnippet = async (id) => {
    if (window.confirm("Are you sure you want to delete this snippet?")) {
      try {
        await axios.delete(`http://localhost:3001/api/snippets/${id}`);
        fetchSnippets();
      } catch (err) {
        console.error("Error deleting snippet:", err);
        setError("Failed to delete snippet.");
      }
    }
  };

  // --- RENDER LOGIC ---

  if (user === null) {
    // This is the initial loading state or logged-out state
    return (
      <div style={{ padding: '20px' }}>
        <h1>Welcome to Code Whisperer</h1>
        <p>Please sign in to continue.</p>
        <GoogleLogin onSuccess={handleLoginSuccess} onError={() => console.log('Login failed')} />
        {error && <p style={{ color: 'red' }}>{error}</p>}
      </div>
    );
  }

  return (
    <div style={{ padding: '20px', fontFamily: 'sans-serif' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <h1>Code Whisperer Dashboard</h1>
        <button onClick={handleLogout}>Logout</button>
      </div>

      <form onSubmit={handleAnalyzeAndSave} style={{ marginBottom: '20px' }}>
        <h3>Get AI Analysis for a New Snippet</h3>
        <select value={language} onChange={(e) => setLanguage(e.target.value)}>
          <option value="javascript">JavaScript</option>
          <option value="python">Python</option>
          <option value="sql">SQL</option>
          <option value="java">Java</option>
        </select>
        <br />
        <textarea
          value={code}
          onChange={(e) => setCode(e.target.value)}
          placeholder="Paste your code here..."
          rows="10"
          cols="80"
          required
          style={{ display: 'block', margin: '10px 0' }}
        />
        <button type="submit" disabled={isAnalyzing}>
          {isAnalyzing ? 'Analyzing...' : 'Analyze and Save'}
        </button>
        {error && <p style={{ color: 'red' }}>{error}</p>}
      </form>

      <h2>Your Saved Snippets</h2>
      <div id="snippet-list">
        {snippets.length > 0 ? (
          snippets.map((snippet) => (
            <div key={snippet.id} style={{ border: '1px solid #ccc', padding: '10px', marginBottom: '10px', borderRadius: '5px' }}>
              <p><strong>Language:</strong> {snippet.language}</p>
              
              <pre style={{ backgroundColor: '#f4f4f4', padding: '10px', whiteSpace: 'pre-wrap', borderRadius: '5px' }}>
                <code>{snippet.codeContent}</code>
              </pre>

              <div>
                <h4>AI Analysis:</h4>
                {snippet.aiAnalysis && typeof snippet.aiAnalysis === 'object' && Object.keys(snippet.aiAnalysis).length > 0 ? (
                  <div>
                    {snippet.aiAnalysis.bugs && (
                      <div><strong>Potential Bugs:</strong> <p style={{ whiteSpace: 'pre-wrap' }}>{snippet.aiAnalysis.bugs}</p></div>
                    )}
                    {snippet.aiAnalysis.style && (
                      <div><strong>Style & Readability:</strong> <p style={{ whiteSpace: 'pre-wrap' }}>{snippet.aiAnalysis.style}</p></div>
                    )}
                    {snippet.aiAnalysis.explanation && (
                      <div><strong>Explanation:</strong> <p style={{ whiteSpace: 'pre-wrap' }}>{snippet.aiAnalysis.explanation}</p></div>
                    )}
                  </div>
                ) : (
                  <p>No analysis available yet.</p>
                )}
              </div>

              <button onClick={() => handleDeleteSnippet(snippet.id)} style={{ color: 'red', marginTop: '10px' }}>
                Delete
              </button>
            </div>
          ))
        ) : (
          <p>You have no saved snippets.</p>
        )}
      </div>
    </div>
  );
}

export default App;
