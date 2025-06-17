import { GoogleLogin } from '@react-oauth/google';
import axios from 'axios';
import './App.css'

function App() {
  const handleLoginSuccess = async (credentialResponse) => {
    console.log("Google Login Success:", credentialResponse);
    // This credentialResponse object contains the JWT ID token from Google.
    // Send this token tot he backend to verify and create a user session.

    try {
      const res = await axios.post(
        'http://localhost:3001/api/auth/google-signin',
        {
          token: credentialResponse.credential
        }
      );

      console.log('Backend response:', res.data);
      // Typically save JWT from backend and update the UI to show
      // that the user is logged in
    } catch (error) {
      console.error("Error logging in with backend:", error);
    }
  };

  const handleLoginError = () => {
    console.log('Login Failed');
  };

  return (
    <div>
      <h1>Code Whisperer</h1>
      {/* This is the main login button */}
      <GoogleLogin
        onSuccess={handleLoginSuccess}
        onError={handleLoginError}
      />
    </div>
  );
}

export default App;
