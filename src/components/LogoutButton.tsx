import { useNavigate } from "react-router-dom";

export default function LogoutButton() {
  const navigate = useNavigate();

  function handleLogout() {
    localStorage.removeItem("user"); // clear session
    navigate("/auth", { replace: true }); // back to login
  }

  return (
    <button
      onClick={handleLogout}
      className="
        w-full text-left
        px-4 py-2
        text-sm font-medium
        text-red-400
        hover:bg-red-500/10
        hover:text-red-300
        transition-colors
        rounded-md
      "
    >
      Log out
    </button>
  );
}
