import Image from "next/image";
import Chat from './components/Chat';

export default function Home() {
  return (
    <main className="min-h-screen bg-white">
      <div className="container mx-auto py-8">
        <h1 className="text-3xl font-bold text-center mb-8">Paragliding AI Assistant <span style={{ fontSize: 'small' }}> α - Alpha</span></h1>
        <Chat />
      </div>
    </main>
  );
}
