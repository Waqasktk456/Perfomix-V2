import { GoogleLogin } from '@react-oauth/google';

const GoogleAuthButton = () => {
  const handleSuccess = async (response) => {
    const googleIdToken = response.credential; 
    
    try {
      const res = await fetch('http://localhost:5000/api/auth/google', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ token: googleIdToken }),
      });
      const data = await res.json();
      console.log('Google Auth Success:', data);
    } catch (error) {
      console.error('Error during Google authentication:', error);
    }
  };
  
  

  const handleError = (error) => {
    console.error('Google Login Error:', error);
  };

  return (
    <GoogleLogin 
      onSuccess={handleSuccess}
      onError={handleError} 
    />
  );
};

export default GoogleAuthButton;
