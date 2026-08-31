export default function Home() {
  return (
    <main className="flex min-h-screen items-center justify-center">
      <div className="text-center">
        <h1 className="text-4xl font-bold">User Authentication Application</h1>

        <p className="mt-4 text-gray-600">Welcome to our application</p>

        <div className="mt-6 flex justify-center gap-4">
          <a href="/login" className="rounded-md bg-black px-5 py-2 text-white">
            Login
          </a>

          <a href="/register" className="rounded-md border px-5 py-2">
            Register
          </a>
        </div>
      </div>
    </main>
  );
}
