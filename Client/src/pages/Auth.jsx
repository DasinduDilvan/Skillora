import { useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import SignIn from "../components/AuthComponents/SignIn/SignIn";
import SignUp from "../components/AuthComponents/SignUp/SignUp";
import ForgotPassword from "../components/AuthComponents/ForgotPassword/ForgotPassword";
import AuthNavbar from "../components/AuthComponents/Navbar/Navbar";

const Auth = () => {
  const { mode } = useParams();
  const { user, loading } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (!loading && user && mode !== "forgot-password") {
      if (user.role === "client") {
        navigate("/client/dashboard", { replace: true });
      } else if (user.role === "freelancer") {
        navigate("/freelancer/dashboard", { replace: true });
      } else if (user.role === "admin") {
        navigate("/admin/dashboard", { replace: true });
      }
    }
  }, [user, loading, navigate, mode]);

  if (loading) {
    return (
      <div style={{ minHeight: "100vh", display: "grid", placeItems: "center" }}>
        Verifying session...
      </div>
    );
  }

  if (mode === "forgot-password") {
    return (
      <div className="auth-page">
        <main className="auth-container">
          <ForgotPassword />
        </main>
      </div>
    );
  }

  return (
    <div className="auth-page">
      <AuthNavbar mode={mode} />
      <main className="auth-container">
        {mode === "signup" ? <SignUp /> : <SignIn />}
      </main>
    </div>
  );
};

export default Auth;