import Image from "next/image";
import Chat from './components/Chat';

export default function Home() {
  return (
    <main className="min-h-screen bg-gray-50">
      <div className="container mx-auto py-4 sm:py-8">
        {/* <h1 className="text-2xl sm:text-3xl font-bold text-center mb-4 sm:mb-8 text-gray-900">
          Paragliding AI Assistant 
          <span className="ml-2 text-sm sm:text-base font-normal text-gray-600">α - Alpha</span>
        </h1> */}
        <Chat />
      </div>
    </main>
  );
}
