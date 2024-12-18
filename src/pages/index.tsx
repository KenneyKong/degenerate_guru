import Chat from '../components/Chat';
import Header from '../components/Header';

export default function Home() {
  return (
    <main className="flex flex-col items-center justify-center min-h-screen bg-gradient-to-t from-cyan-900 via-transparent bg-slate-800 bg-auto bg-[3in]">
      <Header />
      <div className="w-full md:w-3/4 lg:w-2/3 xl:w-4/5 mx-auto p-5">
        <div className="flex justify-center items-center mt-0">
          <div className="bg-slate-700 shadow-lg p-6 rounded-lg max-w-[700px] w-full">
            <Chat />
          </div>
        </div>
      </div>
    </main>
  );
}
