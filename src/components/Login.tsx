type LoginProps = {
  teacherName: string;
  setTeacherName: (name: string) => void;
  teacherPassword: string;
  setTeacherPassword: (pw: string) => void;
  handleLogin: () => void;
  error: string | null;
};

const Login = ({
  teacherName,
  setTeacherName,
  teacherPassword,
  setTeacherPassword,
  handleLogin,
  error,
}: LoginProps) => {
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    handleLogin();
  };

  return (
    <div
      className="min-h-screen flex items-center justify-center bg-cover bg-center"
      style={{
        backgroundImage: `url('/church-bg.png')`, // Make sure image is in public/
      }}
    >
      <form
        onSubmit={handleSubmit}
        className="w-80 flex flex-col items-center gap-6"
      >
        {/* Header */}
        <h1 className="text-white text-3xl font-bold mb-2">Teacher Login</h1>

        <input
          type="text"
          placeholder="Username"
          className="w-full bg-transparent border-b border-white placeholder-white text-white px-4 py-2 focus:outline-none"
          value={teacherName}
          onChange={(e) => setTeacherName(e.target.value)}
        />
        <input
          type="password"
          placeholder="Password"
          className="w-full bg-transparent border-b border-white placeholder-white text-white px-4 py-2 focus:outline-none"
          value={teacherPassword}
          onChange={(e) => setTeacherPassword(e.target.value)}
        />
<button
  type="submit"
  className="w-full bg-pink-500 hover:bg-pink-600 text-white font-semibold py-2 rounded-full transition-all duration-300 transform hover:scale-105 shadow-md hover:shadow-lg"
>
  Sign In
</button>

        {error && <p className="text-red-400 text-sm mt-2">{error}</p>}
      </form>
    </div>
  );
};

export default Login;
