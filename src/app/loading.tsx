export default function Loading() {
  return (
    <main className="max-w-[1360px] mx-auto px-4 sm:px-6 lg:px-8 w-full flex-grow space-y-10 pt-8 pb-16">
      <div className="max-w-2xl mx-auto flex flex-col items-center space-y-4 animate-pulse">
        <div className="w-48 h-6 rounded-full bg-[#FAF6E8]" />
        <div className="w-full max-w-xl h-11 rounded-2xl bg-[#F5EED6]" />
        <div className="w-4/5 h-5 rounded-full bg-[#FAF6E8]" />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5 animate-pulse">
        {[0, 1, 2].map((idx) => (
          <div
            key={idx}
            className="h-52 rounded-[28px] bg-[#FAF6E8] p-6 space-y-4"
          >
            <div className="flex items-center gap-3">
              <div className="w-11 h-11 rounded-2xl bg-[#FFFDF4]" />
              <div className="space-y-2 flex-1">
                <div className="w-24 h-3 rounded-full bg-[#FFFDF4]" />
                <div className="w-40 h-4 rounded-full bg-[#F5EED6]" />
              </div>
            </div>
            <div className="w-full h-16 rounded-2xl bg-[#FFFDF4]" />
          </div>
        ))}
      </div>
    </main>
  );
}
