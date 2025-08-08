import Image from 'next/image'

export default function Home() {
  return (
    <div className="min-h-screen flex flex-col items-center px-4 py-6">
      {/* Header */}
      <header className="w-full flex justify-between items-center mb-6">
        <div className="flex items-center space-x-3">
          <Image src="/logo.png" alt="SIBI Logo" width={60} height={60} />
        </div>
        <h1 className="text-2xl font-bold text-gold">Should I Buy It</h1>
      </header>

      {/* Upload Section */}
      <section className="w-full max-w-xl bg-gray-800 p-6 rounded-lg flex flex-col items-center border border-gold">
        <input
          type="file"
          accept="image/*"
          className="mb-4 text-white"
        />
        <div className="flex space-x-4">
          <button className="bg-gold text-black px-4 py-2 rounded hover:bg-darkgold">Analyse Image</button>
          <button className="bg-silver text-black px-4 py-2 rounded hover:bg-darksilver">Get eBay Data</button>
        </div>
      </section>

      {/* Lot Overview */}
      <section className="w-full max-w-4xl mt-8">
        <h2 className="text-xl font-semibold mb-2 text-gold">Lot Overview</h2>
        <div className="bg-gray-800 p-4 rounded-lg border border-gold min-h-[80px]">
          <p className="text-gray-400">No data yet.</p>
        </div>
      </section>

      {/* Top 3 Items */}
      <section className="w-full max-w-4xl mt-8">
        <h2 className="text-xl font-semibold mb-2 text-gold">Top 3 Items</h2>
        <div className="bg-gray-800 p-4 rounded-lg border border-gold min-h-[80px]">
          <p className="text-gray-400">No data yet.</p>
        </div>
      </section>

      {/* Item List */}
      <section className="w-full max-w-4xl mt-8">
        <h2 className="text-xl font-semibold mb-2 text-gold">Item List</h2>
        <div className="bg-gray-800 p-4 rounded-lg border border-gold min-h-[120px]">
          <p className="text-gray-400">No data yet.</p>
        </div>
      </section>
    </div>
  )
}
