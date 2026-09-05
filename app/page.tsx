export default function Home() {
  return (
    <main className="flex min-h-screen items-center justify-center">
      <div className="text-center">
        <h1 className="text-4xl font-bold">User Authentication Application</h1>

        <p className="mt-4 text-gray-600">Welcome to our app</p>

        <div className="mt-6 flex justify-center gap-4">
          <a
            href="/login"
            className="w-full rounded-lg border border-green-800 bg-transparent px-4 py-2 text-black transition duration-200 hover:bg-green-800 hover:text-white hover:shadow-lg"
          >
            Login
          </a>

          <a
            href="/register"
            className="w-full rounded-lg border border-black-600 bg-blue-400 px-4 py-2 text-black transition duration-200 hover:bg-blue-800 hover:text-white hover:shadow-lg"
          >
            Register
          </a>
        </div>
      </div>
    </main>
  );
}
