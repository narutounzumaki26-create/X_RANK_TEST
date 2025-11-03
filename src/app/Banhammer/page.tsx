// src/app/simple-background/page.tsx
export default function SimpleBackgroundPage() {
  return (
    <div 
      className="min-h-screen flex items-center justify-center"
      style={{
        backgroundImage: "url('https://media.tenor.com/znx_AntI870AAAAM/gorilla-middle-finger.gif')", // Replace with your image path
        backgroundSize: "cover",
        backgroundPosition: "center"
      }}
    >
      {/* Dark overlay */}
      <div className="absolute inset-0 bg-black/50"></div>
      
      {/* Centered text */}
      <div className="relative z-10 text-center text-white space-y-4 p-8">
        <h1 className="text-4xl md:text-6xl font-bold">T&apos;as été ban</h1>
        <p className="text-xl md:text-2xl opacity-90">Celui qui nous trompe n&apos;est pas des notres. Mais si tu as egaré ton chemin alors viens nous mp :3 </p>
        <p className="text-xl md:text-2xl opacity-90">Cordialement X-Rank Team </p>
      </div>
    </div>
  )
}
