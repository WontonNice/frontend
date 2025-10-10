import { useNavigate } from "react-router-dom";

export default function LogoutButton() {
  const navigate = useNavigate();

  function handleLogout() {
    localStorage.removeItem("user"); // clear session
    navigate("/", { replace: true }); // back to login
  }

  return (
    <button
      onClick={handleLogout}
      className="mt-6 rounded-lg bg-gray-700 px-4 py-2 hover:bg-gray-600 transition"
    >
      Log out
    </button>
  );
}
