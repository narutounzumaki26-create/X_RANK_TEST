// src/app/simple-background/page.tsx
export default function SimpleBackgroundPage() {
  return (
    <div 
      className="min-h-screen flex items-center justify-center"
      style={{
        backgroundImage: "url('https://i.ytimg.com/vi/dQxgV4oD4J4/maxresdefault.jpg')", // Replace with your image path
        backgroundSize: "cover",
        backgroundPosition: "center"
      }}
    >
      {/* Dark overlay */}
      <div className="absolute inset-0 bg-black/50"></div>
      
      {/* Centered text */}
      <div className="relative z-10 text-center text-white space-y-4 p-8">
        <h1 className="text-4xl md:text-6xl font-bold">T&apos;as été ban</h1>
        <p className="text-xl md:text-2xl opacity-90">Celui qui nous trompe n&apos;est pas des notres. Mais si tu t&apos;es egaré ton chemin alors viens nous mp :3 </p>
        <p className="text-xl md:text-2xl opacity-90">Cordialement X-Rank Team </p>
      </div>
    </div>
  )
}
