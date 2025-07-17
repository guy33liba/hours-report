import { useContext } from "react";
import { Navigate } from "react-router-dom";
import { AppContext } from "./AppContext";
import "../styles.css";
const ProtectedRoute = ({ children, allowedRoles }) => {
  const { currentUser } = useContext(AppContext);

  if (!currentUser) {
    return <Navigate to="/login" replace />;
  }

  if (allowedRoles && !allowedRoles.includes(currentUser.role)) {
    return <Navigate to="/" replace />; // Redirect to dashboard or appropriate page
  }

  return children;
};
export default ProtectedRoute;
