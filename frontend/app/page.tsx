import Footer from "@/components/Footer";
import Navbar from "@/components/Navbar";
import TodoDashboard from "@/components/TodoDashboard";
import { getTodos } from "@/lib/todos-api";

export const dynamic = "force-dynamic";

export default async function Home() {
  const todos = await getTodos();

  return (
    <div className="site-shell">
      <Navbar />
      <main className="home-main">
        <h1 className="welcome-heading">
          Hello, Aqeel , <span>Start planning today</span>
        </h1>
        <TodoDashboard initialTodos={todos} />
      </main>
      <Footer />
    </div>
  );
}
